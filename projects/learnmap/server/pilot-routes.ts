import type { Express } from 'express';
import { z } from 'zod';
import { auth, role, validPassword } from './auth';
import { transaction, type DB } from './db';
import {
  CONSENT_VERSION,
  privacy,
  denied,
  eraseTranscripts,
  exportData,
  deleteUser,
  metrics,
  track,
  purgeExpired,
  requireLearning,
} from './pilot';
export function pilotRoutes(app: Express, db: DB) {
  const a = auth(db);
  const run = (fn: any) => (req: any, res: any, next: any) =>
    transaction(db, async () => {
      await purgeExpired(db);
      return fn(req, res);
    })
      .then((result) => res.json(result))
      .catch(next);
  async function target(req: any, res: any) {
    const user = res.locals.user,
      id = req.body?.student || req.query.student || user.id;
    if (id === user.id) return id;
    if (
      user.role !== 'parent' ||
      !(
        await db.query('SELECT 1 FROM parent_student_links WHERE parent_id=$1 AND student_id=$2', [
          user.id,
          id,
        ])
      ).rows.length
    )
      denied('Access denied');
    return id;
  }
  app.get(
    '/api/privacy',
    a,
    run(async (req: any, res: any) => privacy(db, await target(req, res))),
  );
  app.put(
    '/api/consent',
    a,
    role('parent'),
    run(async (req: any, res: any) => {
      const d = z
        .object({
          student: z.string(),
          granted: z.boolean(),
          allow_speaking: z.boolean(),
          version: z.literal(CONSENT_VERSION),
        })
        .parse(req.body);
      const id = await target(req, res);
      if (id === res.locals.user.id) denied('Select your linked child');
      await db.query(
        'INSERT INTO pilot_consent(student_id,parent_id,version,granted,allow_speaking,granted_at,withdrawn_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $4 THEN now() ELSE NULL END,CASE WHEN $4 THEN NULL ELSE now() END) ON CONFLICT(student_id) DO UPDATE SET parent_id=$2,version=$3,granted=$4,allow_speaking=$5,granted_at=CASE WHEN $4 THEN now() ELSE pilot_consent.granted_at END,withdrawn_at=CASE WHEN $4 THEN NULL ELSE now() END',
        [id, res.locals.user.id, d.version, d.granted, d.granted && d.allow_speaking],
      );
      await db.query(
        'INSERT INTO consent_history(student_id,parent_id,version,granted,allow_speaking) VALUES($1,$2,$3,$4,$5)',
        [id, res.locals.user.id, d.version, d.granted, d.granted && d.allow_speaking],
      );
      if (!d.granted || !d.allow_speaking)
        await db.query('UPDATE speaking_sessions SET completed=true WHERE student_id=$1', [id]);
      return privacy(db, id);
    }),
  );
  app.get(
    '/api/privacy/export',
    a,
    run(async (req: any, res: any) => exportData(db, await target(req, res))),
  );
  app.delete(
    '/api/privacy/transcripts',
    a,
    run(async (req: any, res: any) => {
      await eraseTranscripts(db, await target(req, res));
      return { ok: true };
    }),
  );
  app.delete(
    '/api/privacy/account',
    a,
    run(async (req: any, res: any) => {
      const password = z.string().min(1).max(128).parse(req.body.password);
      const user = (
        await db.query('SELECT password_hash FROM users WHERE id=$1', [res.locals.user.id])
      ).rows[0];
      if (!validPassword(password, user.password_hash))
        denied('Confirm with your current password');
      const id = await target(req, res);
      if (res.locals.user.role === 'admin') denied('Administrator deletion requires an operator');
      await deleteUser(db, id);
      if (id === res.locals.user.id) res.clearCookie('learnmap');
      return { ok: true };
    }),
  );
  app.get(
    '/api/admin/pilot',
    a,
    role('admin'),
    run(() => metrics(db)),
  );
  app.post(
    '/api/telemetry/view',
    a,
    run(async (req: any, res: any) => {
      const d = z
        .object({
          event: z.enum(['parent_dashboard_viewed', 'weekly_report_viewed']),
          student: z.string(),
        })
        .parse(req.body);
      if (res.locals.user.role !== 'parent') denied('Parent view required');
      await target(req, res);
      // One view per screen, child and UTC hour avoids render/reload inflation.
      await track(
        db,
        res.locals.user.id,
        d.event,
        null,
        null,
        d.student + ':' + new Date().toISOString().slice(0, 13),
      );
      return { ok: true };
    }),
  );
  app.post(
    '/api/telemetry/ar',
    a,
    role('student'),
    run(async (req: any, res: any) => {
      const d = z
        .object({
          event: z.enum([
            'ar_mission_started',
            'prediction_submitted',
            'prediction_correct',
            'mission_completed',
            'next_mission_clicked',
            'voluntary_continue',
          ]),
          session: z.string().min(1).max(120),
          dedupe: z.string().min(1).max(240),
          seconds: z.number().int().min(0).max(3600).default(0),
        })
        .parse(req.body);
      const user = res.locals.user;
      await requireLearning(db, user.id);
      await track(db, user.id, d.event, 'physics', d.session, d.dedupe, d.seconds);
      return { ok: true };
    }),
  );
  app.post(
    '/api/feedback',
    a,
    run(async (req: any, res: any) => {
      const d = z
        .object({
          screen: z.enum(['lesson', 'parent_report']),
          context_id: z.string().min(1).max(120),
          rating: z.enum(['up', 'neutral', 'down']),
        })
        .parse(req.body);
      const u = res.locals.user;
      if (d.screen === 'lesson') {
        if (
          u.role !== 'student' ||
          !(
            await db.query(
              'SELECT 1 FROM lesson_sessions WHERE id=$1 AND student_id=$2 AND completed',
              [d.context_id, u.id],
            )
          ).rows.length
        )
          denied('Completed lesson required');
        if (
          Number(
            (
              await db.query(
                'SELECT count(*) n FROM lesson_sessions WHERE student_id=$1 AND completed',
                [u.id],
              )
            ).rows[0].n,
          ) < 3
        )
          denied('Feedback starts after three lessons');
      } else {
        if (u.role !== 'parent' || d.rating === 'neutral') denied('Parent feedback required');
        await target({ ...req, body: { student: d.context_id } }, res);
      }
      await db.query(
        'INSERT INTO pilot_feedback(user_id,screen,context_id,rating) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,screen,context_id) DO UPDATE SET rating=$4',
        [u.id, d.screen, d.context_id, d.rating],
      );
      return { ok: true };
    }),
  );
  app.get(
    '/api/feedback/eligible',
    a,
    run(async (_req: any, res: any) => ({
      eligible:
        Number(
          (
            await db.query(
              'SELECT count(*) n FROM lesson_sessions WHERE student_id=$1 AND completed',
              [res.locals.user.id],
            )
          ).rows[0].n,
        ) >= 3,
    })),
  );
  app.put(
    '/api/admin/review',
    a,
    role('admin'),
    run(async (req: any, _res: any) => {
      const d = z
        .object({
          kind: z.enum(['skills', 'questions']),
          id: z.string(),
          status: z.enum(['draft', 'reviewed', 'approved']),
        })
        .parse(req.body);
      const rows = (
        await db.query(`UPDATE ${d.kind} SET review_status=$2 WHERE id=$1 RETURNING id`, [
          d.id,
          d.status,
        ])
      ).rows;
      if (!rows.length) denied('Content not found');
      return { ok: true };
    }),
  );
}
