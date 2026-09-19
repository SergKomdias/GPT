import express from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { DB } from './db';
import { transaction } from './db';
import { auth, hashPassword, validPassword, login, role, hashToken } from './auth';
import {
  snapshot,
  skillsFor,
  evidence,
  chooseDiagnostic,
  diagnosticMetrics,
  publicQuestion,
  selectSubjects,
  subjectSummary,
  requireActive,
} from './domain';
import { validTimezone } from '../shared/learning';
import { AIService } from './ai';
import { eligiblePhysics } from './physics-curriculum';
import { englishAssessmentRoutes } from './english-assessment-routes';
import { pilotRoutes } from './pilot-routes';
import { pilotMode, requireLearning, track, trackSubjects, privacy } from './pilot';
const credentials = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(128),
});
const text = z.object({ en: z.string().min(1).max(3000), uk: z.string().min(1).max(3000) });
const langOf = (req: express.Request) => (req.body?.lang === 'uk' ? 'uk' : 'en');
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
export function createApp(db: DB, provider?: AIService) {
  const app = express();
  const ai = provider || new AIService(db);
  const tx = <T>(fn: () => Promise<T>) => transaction(db, fn);
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', version: '0.3.0' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (process.env.NODE_ENV === 'production')
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      const origin = new URL(req.headers.origin);
      if (process.env.NODE_ENV === 'production' && req.headers.origin !== process.env.APP_ORIGIN)
        return res.status(403).json({ error: 'Origin rejected' });
      if (
        origin.host !== req.headers.host &&
        ![process.env.APP_ORIGIN || 'http://127.0.0.1:5173', 'http://localhost:5173'].includes(
          req.headers.origin,
        )
      )
        return res.status(403).json({ error: 'Origin rejected' });
    }
    next();
  });
  app.use(express.json({ limit: '128kb' }));
  const attempts = new Map<string, { count: number; start: number }>();
  app.use('/api/auth', (req, res, next) => {
    const key = req.ip || 'local';
    let a = attempts.get(key);
    if (!a || Date.now() - a.start > 600000) {
      a = { count: 0, start: Date.now() };
      attempts.set(key, a);
    }
    if (++a.count > 80)
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    next();
  });
  // Only synchronous database phases hold the connection. External routes own short phases.
  const route = (method: 'get' | 'post' | 'put', path: string, ...handlers: any[]) => {
    const fn = handlers.pop();
    app[method](path, ...handlers, (req, res, next) => {
      const external = [
        '/api/speaking',
        '/api/speaking/:id/turn',
        '/api/speaking/:id/transcribe',
        '/api/voice',
        '/api/lesson/:id/hint',
      ].includes(path);
      const run = async () => {
        let payload: any;
        const send = res.json.bind(res);
        res.json = (value: any) => {
          payload = value;
          return res;
        };
        try {
          const learning = /^\/api\/(lesson|diagnostic|speaking|listening|voice)(\/|$)/.test(path);
          const guard = async () => {
            if (learning && res.locals.user?.role === 'student')
              await requireLearning(
                db,
                res.locals.user.id,
                path.includes('speaking') || (path === '/api/voice' && !!req.body.sessionId),
              );
          };
          const perform = async () => {
            await guard();
            await fn(req, res);
          };
          if (external) await perform();
          else await tx(perform);
          if (learning && res.locals.user?.role === 'student') await guard();
          if (payload?.mistakeQuestion) {
            try {
              const explanation = await ai.analyzeMistake(payload.mistakeQuestion, langOf(req));
              payload.feedback.reasoning = {
                ...payload.feedback.reasoning,
                [langOf(req)]: explanation,
              };
            } catch {
              payload.providerWarning = 'AI unavailable; showing authored mistake explanation';
            }
            delete payload.mistakeQuestion;
          }
          await recordRoute(path, req, res, payload);
          // Explanation generation happens after the lesson state has committed.
          if (payload?.stage === 'Explain')
            try {
              await guard();
              payload.explanation = await ai.explainConcept(payload.skill, langOf(req));
              await guard();
            } catch {
              payload.providerWarning =
                'AI unavailable; showing the authored explanation / AI недоступний; показано підготовлене пояснення';
            }
          await guard();
        } catch (e) {
          res.json = send;
          throw e;
        }
        res.json = send;
        if (payload !== undefined) send(payload);
      };
      run().catch(next);
    });
  };

  async function recordRoute(path: string, req: any, res: any, p: any) {
    if (!p) return;
    const user = res.locals.user?.id || p.id;
    if (!user) return;
    if (path === '/api/auth/login' || path === '/api/auth/register') {
      await track(db, user, 'login');
      return;
    }
    const session = p.id || req.params.id;
    let event: string | undefined,
      subject: string | null = null,
      seconds = 0,
      key = session;
    if (path === '/api/diagnostic') {
      event = 'diagnostic_started';
      subject = req.body.subject;
    }
    if (path === '/api/diagnostic/:id/answer' && p.completed) event = 'diagnostic_completed';
    if (path === '/api/lesson') {
      event = 'lesson_started';
      subject = p.skill.subject_id;
    }
    if (path === '/api/lesson/:id/next' && p.completed) {
      event = 'lesson_completed';
      seconds = p.result.seconds;
      subject = p.skill.subject_id;
    }
    if (path === '/api/lesson/:id/hint') {
      event = 'hint_used';
      key = session + ':' + req.body.index + ':' + p.level;
    }
    if (path === '/api/speaking') {
      event = 'speaking_started';
      subject = 'english';
    }
    if (path === '/api/speaking/:id/end') {
      event = 'speaking_completed';
      subject = 'english';
      seconds = Number(
        (
          await db.query(
            'SELECT coalesce(sum(seconds),0) seconds FROM learning_events WHERE session_id=$1',
            [session],
          )
        ).rows[0].seconds,
      );
    }
    if (path === '/api/listening/:id/answer') {
      event = 'listening_completed';
      subject = 'english';
      seconds = p.seconds;
    }
    if (event) {
      if (!subject && path.includes('diagnostic'))
        subject = (
          await db.query('SELECT subject_id FROM diagnostic_sessions WHERE id=$1', [session])
        ).rows[0]?.subject_id;
      if (!subject && path.includes('lesson'))
        subject = (
          await db.query(
            'SELECT s.subject_id FROM lesson_sessions l JOIN skills s ON s.id=l.skill_id WHERE l.id=$1',
            [session],
          )
        ).rows[0]?.subject_id;
      await track(db, user, event, subject, session, key, seconds);
    }
  }
  route('get', '/api/config', async (_req: any, res: any) =>
    res.json({
      ai: ai.provider,
      pilot: pilotMode(),
      invite_required: !!process.env.PILOT_INVITE_CODE,
      demo: process.env.ENABLE_DEMO !== 'false',
      database: process.env.DATABASE_URL ? 'PostgreSQL' : 'PGlite PostgreSQL',
    }),
  );
  route('post', '/api/auth/register', async (req: any, res: any) => {
    const data = credentials
      .extend({ name: z.string().trim().min(1).max(60), role: z.enum(['student', 'parent']) })
      .parse(req.body);
    if (
      pilotMode() &&
      process.env.PILOT_INVITE_CODE &&
      hashToken(String(req.body.invite_code || '')) !== hashToken(process.env.PILOT_INVITE_CODE)
    )
      fail('Valid pilot invitation required', 403);
    const email = data.email.toLowerCase();
    if ((await db.query('SELECT id FROM users WHERE email=$1', [email])).rows.length)
      fail('Email is already registered / Email вже зареєстровано');
    const id = randomUUID();
    await db.query('INSERT INTO users(id,email,password_hash,role,name) VALUES($1,$2,$3,$4,$5)', [
      id,
      email,
      hashPassword(data.password),
      data.role,
      data.name,
    ]);
    await db.query(
      data.role === 'student'
        ? 'INSERT INTO student_profiles(student_id) VALUES($1)'
        : 'INSERT INTO parent_profiles VALUES($1)',
      [id],
    );
    await login(db, res, id);
    res.json({ id, role: data.role });
  });
  route('post', '/api/auth/login', async (req: any, res: any) => {
    const d = credentials.parse(req.body);
    const user = (await db.query('SELECT * FROM users WHERE email=$1', [d.email.toLowerCase()]))
      .rows[0];
    if (!user || !validPassword(d.password, user.password_hash))
      fail('Incorrect email or password / Невірний email або пароль', 401);
    await login(db, res, user.id);
    res.json({ id: user.id, role: user.role });
  });
  route('post', '/api/auth/demo', async (req: any, res: any) => {
    if (process.env.ENABLE_DEMO === 'false') fail('Demo is disabled', 403);
    const r = z.enum(['student', 'parent', 'admin']).parse(req.body.role);
    await login(db, res, 'demo-' + r);
    res.json({ role: r });
  });
  const authenticated = auth(db);
  englishAssessmentRoutes(app, db, ai, authenticated);
  route('get', '/api/me', authenticated, async (_req: any, res: any) => {
    const u = res.locals.user;
    const p = (await db.query('SELECT * FROM student_profiles WHERE student_id=$1', [u.id]))
      .rows[0];
    if (p)
      p.subjects = (
        await db.query('SELECT subject_id FROM student_subjects WHERE student_id=$1 AND active', [
          u.id,
        ])
      ).rows.map((r) => r.subject_id);
    res.json({ ...u, profile: p, privacy: u.role === 'student' ? await privacy(db, u.id) : null });
  });
  route('post', '/api/logout', authenticated, async (req: any, res: any) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((s: string) => s.trim())
      .find((s: string) => s.startsWith('learnmap='))
      ?.slice(9);
    if (token) await db.query('DELETE FROM auth_sessions WHERE token_hash=$1', [hashToken(token)]);
    res.clearCookie('learnmap');
    res.json({ ok: true });
  });
  route('put', '/api/profile', authenticated, role('student'), async (req: any, res: any) => {
    const d = z
      .object({
        name: z.string().trim().min(1).max(60),
        age: z.number().int().min(5).max(100),
        grade: z.number().int().min(1).max(12),
        country: z.string().trim().min(1).max(80),
        physics_curriculum: z.enum(['UA', 'international']).nullable().optional(),
        learning_language: z.enum(['en', 'uk']),
        interface_language: z.enum(['en', 'uk']),
        subjects: z
          .array(z.enum(['math', 'physics', 'english']))
          .min(1)
          .max(3),
        timezone: z.string().refine(validTimezone, 'Invalid timezone').default('Europe/Kyiv'),
        daily_minutes: z.number().int().min(10).max(90).default(25),
      })
      .parse(req.body);
    await db.query('UPDATE users SET name=$2 WHERE id=$1', [res.locals.user.id, d.name]);
    if (d.physics_curriculum !== undefined)
      await db.query('UPDATE student_profiles SET physics_curriculum=$2 WHERE student_id=$1', [
        res.locals.user.id,
        d.physics_curriculum,
      ]);
    const beforeSubjects = (
      await db.query('SELECT subject_id FROM student_subjects WHERE student_id=$1 AND active', [
        res.locals.user.id,
      ])
    ).rows.map((r) => r.subject_id);
    await selectSubjects(db, res.locals.user.id, d.subjects);
    await trackSubjects(db, res.locals.user.id, beforeSubjects);
    await db.query('UPDATE student_profiles SET timezone=$2,daily_minutes=$3 WHERE student_id=$1', [
      res.locals.user.id,
      d.timezone,
      d.daily_minutes,
    ]);
    await db.query(
      'UPDATE student_profiles SET age=$2,grade=$3,country=$4,learning_language=$5,interface_language=$6,onboarded=true WHERE student_id=$1',
      [res.locals.user.id, d.age, d.grade, d.country, d.learning_language, d.interface_language],
    );
    res.json({ ok: true });
  });
  route('put', '/api/subjects', authenticated, role('student'), async (req: any, res: any) => {
    const ids = z
      .array(z.enum(['math', 'physics', 'english']))
      .min(1)
      .max(3)
      .parse(req.body.subjects);
    const beforeSubjects = (
      await db.query('SELECT subject_id FROM student_subjects WHERE student_id=$1 AND active', [
        res.locals.user.id,
      ])
    ).rows.map((r) => r.subject_id);
    await selectSubjects(db, res.locals.user.id, ids);
    await trackSubjects(db, res.locals.user.id, beforeSubjects);
    res.json({ ok: true });
  });
  async function allowedStudent(res: any, id?: string) {
    const u = res.locals.user;
    if (u.role === 'student') {
      if (id && id !== u.id) fail('Access denied', 403);
      return u.id;
    }
    if (!id) fail('Select a child');
    if (
      u.role === 'parent' &&
      !(
        await db.query('SELECT 1 FROM parent_student_links WHERE parent_id=$1 AND student_id=$2', [
          u.id,
          id,
        ])
      ).rows.length
    )
      fail('Access denied', 403);
    if (!(await db.query('SELECT 1 FROM student_profiles WHERE student_id=$1', [id])).rows.length)
      fail('Student not found', 404);
    return id;
  }
  route('get', '/api/snapshot', authenticated, async (req: any, res: any) =>
    res.json(await snapshot(db, await allowedStudent(res, req.query.student))),
  );
  route(
    'get',
    '/api/children',
    authenticated,
    role('parent', 'admin'),
    async (_req: any, res: any) =>
      res.json(
        (
          await db.query(
            'SELECT u.id,u.name,p.grade FROM users u JOIN student_profiles p ON p.student_id=u.id ' +
              (res.locals.user.role === 'parent'
                ? 'JOIN parent_student_links l ON l.student_id=u.id WHERE l.parent_id=$1'
                : ''),
            res.locals.user.role === 'parent' ? [res.locals.user.id] : [],
          )
        ).rows,
      ),
  );
  route('post', '/api/invite', authenticated, role('student'), async (_req: any, res: any) => {
    const token = randomBytes(12).toString('hex');
    await db.query("INSERT INTO parent_invites VALUES($1,$2,now()+interval '24 hours')", [
      hashToken(token),
      res.locals.user.id,
    ]);
    res.json({ code: token });
  });
  route('post', '/api/link', authenticated, role('parent'), async (req: any, res: any) => {
    const code = z.string().length(24).parse(req.body.code);
    const link = (
      await db.query(
        'DELETE FROM parent_invites WHERE token_hash=$1 AND expires_at>now() RETURNING student_id',
        [hashToken(code)],
      )
    ).rows[0];
    if (!link) fail('Invalid or expired invitation / Запрошення недійсне');
    await db.query('INSERT INTO parent_student_links VALUES($1,$2) ON CONFLICT DO NOTHING', [
      res.locals.user.id,
      link.student_id,
    ]);
    res.json({ ok: true });
  });
  route('get', '/api/family/messages', authenticated, async (req: any, res: any) => {
    const student = await allowedStudent(res, req.query.student ? String(req.query.student) : undefined);
    const rows = (
      await db.query(
        'SELECT m.id,m.student_id,m.sender_id,m.body,m.created_at,u.name sender_name,u.role sender_role FROM family_messages m JOIN users u ON u.id=m.sender_id WHERE m.student_id=$1 ORDER BY m.created_at DESC LIMIT 100',
        [student],
      )
    ).rows.reverse();
    res.json(rows);
  });
  route('post', '/api/family/messages', authenticated, async (req: any, res: any) => {
    const student = await allowedStudent(
      res,
      req.body.student ? z.string().parse(req.body.student) : undefined,
    );
    const body = z.string().trim().min(1).max(1000).parse(req.body.body);
    const id = randomUUID();
    await db.query(
      'INSERT INTO family_messages(id,student_id,sender_id,body) VALUES($1,$2,$3,$4)',
      [id, student, res.locals.user.id, body],
    );
    const row = (
      await db.query(
        'SELECT m.id,m.student_id,m.sender_id,m.body,m.created_at,u.name sender_name,u.role sender_role FROM family_messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1',
        [id],
      )
    ).rows[0];
    res.json(row);
  });
  async function question(id: string) {
    const q = (await db.query('SELECT * FROM questions WHERE id=$1', [id])).rows[0];
    if (!q) fail('Question not found', 404);
    if (pilotMode() && q.review_status !== 'approved')
      fail('This question awaits teacher approval', 409);
    return q;
  }
  async function owned(table: string, id: string, user: string) {
    const row = (await db.query(`SELECT * FROM ${table} WHERE id=$1 AND student_id=$2`, [id, user]))
      .rows[0];
    if (!row) fail('Session not found', 404);
    return row;
  }
  route('post', '/api/diagnostic', authenticated, role('student'), async (req: any, res: any) => {
    const subject = z.enum(['math', 'physics', 'english']).parse(req.body.subject);
    await requireActive(db, res.locals.user.id, subject);
    if (subject === 'english')
      fail(
        'English Diagnostic використовує CEFR. Відкрийте /diagnostic/english або API /api/english-diagnostic.',
        409,
      );
    const profile = (
      await db.query(
        'SELECT grade,country,physics_curriculum FROM student_profiles WHERE student_id=$1',
        [res.locals.user.id],
      )
    ).rows[0];
    const curriculum =
      subject === 'physics'
        ? eligiblePhysics(profile.country, profile.grade, profile.physics_curriculum)
        : null;
    const eligible = curriculum?.skills.map((s) => s.id);
    const all = (await skillsFor(db, res.locals.user.id))
      .filter((s) => s.subject_id === subject && (!eligible || eligible.includes(s.id)))
      .map((s) => ({
        ...s,
        grade_level: curriculum?.skills.find((k) => k.id === s.id)?.grade_level || s.grade_level,
      }));
    const qs = (
      await db.query(
        'SELECT q.* FROM questions q ' +
          'JOIN diagnostic_questions dq ON dq.question_id=q.id ' +
          'JOIN skills s ON s.id=q.skill_id WHERE s.subject_id=$1 ' +
          (pilotMode() ? "AND q.review_status='approved' AND s.review_status='approved' " : '') +
          'ORDER BY s.sort_order,q.difficulty,q.id',
        [subject],
      )
    ).rows.filter((q) => all.some((s) => s.id === q.skill_id));
    const baseline = subjectSummary(all);
    if (!all.length) fail('Для цього класу ще немає доступних навичок у вибраній програмі.', 409);
    const state: any = {
      ...(subject === 'math' ? { algorithm: 'math-v3', grade: profile.grade, band: 2 } : {}),
      ...(subject === 'physics'
        ? {
            algorithm: 'physics-v4',
            grade: profile.grade,
            targetGrade: profile.grade,
            startLevel: 3,
            band: 3,
            curriculumFloor: 1,
            eligible,
            curriculum: curriculum!.curriculum,
          }
        : {}),
      previous: (
        await db.query(
          'SELECT DISTINCT question_id FROM diagnostic_answers a JOIN diagnostic_sessions d ON d.id=a.session_id WHERE d.student_id=$1 AND d.subject_id=$2',
          [res.locals.user.id, subject],
        )
      ).rows.map((r) => r.question_id),
      asked: [],
      skill: all[0].id,
      difficulty: 1,
      streak: 0,
      recheck: baseline.coverage >= 0.7 && baseline.confidence >= 0.35,
    };
    const q = chooseDiagnostic(qs, all, state)!;
    if (!q) fail('No approved diagnostic content is available yet', 409);
    state.current = q.id;
    state.started = Date.now();
    const id = randomUUID();
    await db.query(
      'INSERT INTO diagnostic_sessions(id,student_id,subject_id,state) VALUES($1,$2,$3,$4)',
      [id, res.locals.user.id, subject, JSON.stringify(state)],
    );
    res.json({
      id,
      question: publicQuestion(q),
      count: 0,
      metrics: diagnosticMetrics(qs, all, state),
    });
  });
  route(
    'post',
    '/api/diagnostic/:id/answer',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const answer = z.number().int().min(-1).max(3).parse(req.body.answer);
      const session = await owned('diagnostic_sessions', req.params.id, res.locals.user.id);
      if (session.completed) fail('Already completed');
      await requireActive(db, res.locals.user.id, session.subject_id);
      const state = session.state;
      if (req.body.questionId !== state.current) fail('This question has already changed', 409);
      const q = await question(state.current);
      const correct = q.answer === answer;
      await db.query('INSERT INTO diagnostic_answers VALUES($1,$2,$3,$4)', [
        session.id,
        q.id,
        correct,
        answer,
      ]);
      await evidence(
        db,
        res.locals.user.id,
        q.skill_id,
        correct,
        0,
        Math.min(180, Math.max(1, Math.round((Date.now() - state.started) / 1000))),
        'diagnostic',
        session.id,
        q.id,
      );
      state.asked.push(q.id);
      state.streak = correct ? state.streak + 1 : 0;
      state.skill = q.skill_id;
      state.difficulty = q.difficulty;
      const all = (await skillsFor(db, res.locals.user.id)).filter(
        (s) =>
          s.subject_id === session.subject_id && (!state.eligible || state.eligible.includes(s.id)),
      );
      const qs = (
        await db.query(
          'SELECT q.* FROM questions q ' +
            (['math-v3', 'physics-v4'].includes(state.algorithm)
              ? 'JOIN diagnostic_questions dq ON dq.question_id=q.id '
              : '') +
            'JOIN skills s ON s.id=q.skill_id WHERE s.subject_id=$1 ' +
            (pilotMode() ? "AND q.review_status='approved' AND s.review_status='approved' " : '') +
            'ORDER BY s.sort_order,q.difficulty,q.id',
          [session.subject_id],
        )
      ).rows.filter((q) => all.some((s) => s.id === q.skill_id));
      const next = chooseDiagnostic(qs, all, state, correct);
      if (!next && !diagnosticMetrics(qs, all, state).complete)
        state.stopReason = 'content-exhausted';
      state.current = next?.id;
      state.started = Date.now();
      await db.query('UPDATE diagnostic_sessions SET state=$2,completed=$3 WHERE id=$1', [
        session.id,
        JSON.stringify(state),
        !next,
      ]);
      res.json({
        correct,
        reasoning: q.reasoning,
        count: state.asked.length,
        question: next ? publicQuestion(next) : null,
        completed: !next,
        metrics: diagnosticMetrics(qs, all, state),
      });
    },
  );
  async function lessonView(session: any, lang: string) {
    const state = session.state;
    const skill = (await db.query('SELECT * FROM skills WHERE id=$1', [session.skill_id])).rows[0];
    if (session.completed) return { id: session.id, completed: true, result: state.result, skill };
    if (state.index === 2)
      return {
        id: session.id,
        index: 2,
        stage: 'Explain',
        skill,
        explanation: skill.explanation[lang],
        completed: false,
      };
    const q = await question(state.questions[state.index]);
    return {
      id: session.id,
      index: state.index,
      stage:
        state.index < 2
          ? 'Review'
          : state.index === 3
            ? 'Guided practice'
            : state.index < 7
              ? 'Independent practice'
              : 'Mini test',
      skill,
      question: publicQuestion(q),
      hints: state.hints || 0,
      completed: false,
    };
  }
  route('post', '/api/lesson', authenticated, role('student'), async (req: any, res: any) => {
    const skillId = z.string().parse(req.body.skill);
    const skill = (await skillsFor(db, res.locals.user.id)).find((s) => s.id === skillId);
    if (!skill) fail('Unknown skill');
    if (skill.subject_id === 'physics') {
      const profile = (
        await db.query(
          'SELECT grade,country,physics_curriculum FROM student_profiles WHERE student_id=$1',
          [res.locals.user.id],
        )
      ).rows[0];
      if (
        !eligiblePhysics(profile.country, profile.grade, profile.physics_curriculum).skills.some(
          (s) => s.id === skillId,
        )
      )
        fail('Навичка поки не входить до програми вашого класу.', 409);
    }
    if (pilotMode() && skill.review_status !== 'approved')
      fail('This skill awaits teacher approval', 409);
    await requireActive(db, res.locals.user.id, skill.subject_id);
    const qs = (
      await db.query(
        'SELECT q.id FROM questions q LEFT JOIN skill_evidence e ON e.question_id=q.id AND e.student_id=$2 WHERE q.skill_id=$1 ' +
          (pilotMode() ? "AND q.review_status='approved' " : '') +
          'GROUP BY q.id,q.difficulty ORDER BY max(e.created_at) ASC NULLS FIRST,q.difficulty,q.id',
        [skillId, res.locals.user.id],
      )
    ).rows;
    if (qs.length < 5) fail('This skill needs 5 questions before a lesson can start.');
    const review = skill.prerequisites[0]
      ? (
          await db.query(
            'SELECT id FROM questions WHERE skill_id=$1 ' +
              (pilotMode() ? "AND review_status='approved' " : '') +
              'ORDER BY difficulty,id LIMIT 2',
            [skill.prerequisites[0]],
          )
        ).rows
      : qs.slice(0, 2);
    if (review.length < 2) fail('Prerequisite questions await teacher approval', 409);
    const questions = [
      ...review.map((q) => q.id),
      null,
      ...(qs.length >= 8 ? qs.slice(2, 8) : qs).map((q) => q.id),
    ];
    const id = randomUUID();
    const state = {
      questions,
      index: 0,
      hints: 0,
      started: Date.now(),
      before: skill.mastery_score,
    };
    await db.query(
      'INSERT INTO lesson_sessions(id,student_id,skill_id,state) VALUES($1,$2,$3,$4)',
      [id, res.locals.user.id, skillId, JSON.stringify(state)],
    );
    res.json(await lessonView({ id, skill_id: skillId, state }, langOf(req)));
  });
  route(
    'post',
    '/api/lesson/:id/hint',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const read = await tx(async () => {
        const session = await owned('lesson_sessions', req.params.id, res.locals.user.id);
        const skill = (
          await db.query('SELECT subject_id FROM skills WHERE id=$1', [session.skill_id])
        ).rows[0];
        await requireActive(db, res.locals.user.id, skill.subject_id);
        if (
          session.completed ||
          session.state.index === 2 ||
          req.body.index !== session.state.index
        )
          fail('No active question');
        return { session, q: await question(session.state.questions[session.state.index]) };
      });
      const level = Math.min(5, read.session.state.hints + 1);
      let hint, providerWarning;
      try {
        hint = await ai.generateHint(read.q, level, langOf(req));
      } catch {
        hint = read.q.hints[level - 1][langOf(req)];
        providerWarning = 'AI unavailable; showing authored hint';
      }
      await tx(async () => {
        await requireLearning(db, res.locals.user.id);
        const fresh = await owned('lesson_sessions', req.params.id, res.locals.user.id);
        if (
          fresh.completed ||
          fresh.state.index !== read.session.state.index ||
          fresh.state.hints !== read.session.state.hints
        )
          fail('Lesson changed; refresh', 409);
        fresh.state.hints = level;
        await db.query('UPDATE lesson_sessions SET state=$2 WHERE id=$1', [
          fresh.id,
          JSON.stringify(fresh.state),
        ]);
      });
      res.json({ hint, level, providerWarning });
    },
  );
  route(
    'post',
    '/api/lesson/:id/next',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const session = await owned('lesson_sessions', req.params.id, res.locals.user.id);
      if (session.completed) return res.json(await lessonView(session, langOf(req)));
      await requireActive(
        db,
        res.locals.user.id,
        (await db.query('SELECT subject_id FROM skills WHERE id=$1', [session.skill_id])).rows[0]
          .subject_id,
      );
      const state = session.state;
      if (req.body.index !== state.index) fail('Step already submitted', 409);
      let feedback = null,
        mistakeQuestion = null;
      if (state.index !== 2) {
        const answer = z.number().int().min(0).max(3).parse(req.body.answer);
        const q = await question(state.questions[state.index]);
        const correct = q.answer === answer;
        await db.query('INSERT INTO student_answers VALUES($1,$2,$3,$4,$5,$6)', [
          session.id,
          state.index,
          q.id,
          answer,
          correct,
          state.hints,
        ]);
        feedback = { correct, reasoning: q.reasoning };
        if (!correct) mistakeQuestion = q;
      }
      state.index++;
      state.hints = 0;
      if (state.index === state.questions.length) {
        const answers = (
          await db.query(
            'SELECT a.*,q.skill_id FROM student_answers a JOIN questions q ON q.id=a.question_id WHERE a.session_id=$1 ORDER BY position',
            [session.id],
          )
        ).rows;
        const seconds = Math.min(
          3600,
          Math.max(answers.length, Math.round((Date.now() - state.started) / 1000)),
        );
        for (const a of answers)
          await evidence(
            db,
            res.locals.user.id,
            a.skill_id,
            a.correct,
            a.hints,
            Math.floor(seconds / answers.length),
            'answer',
            session.id,
            a.question_id,
          );
        const after = (
          await db.query(
            'SELECT mastery_score FROM student_skill_mastery WHERE student_id=$1 AND skill_id=$2',
            [res.locals.user.id, session.skill_id],
          )
        ).rows[0].mastery_score;
        state.result = {
          before: state.before,
          after,
          correct: answers.filter((a) => a.correct).length,
          total: answers.length,
          seconds,
        };
        await db.query(
          "INSERT INTO learning_events(id,student_id,skill_id,kind,before_score,after_score,seconds) VALUES($1,$2,$3,'lesson',$4,$4,0)",
          [randomUUID(), res.locals.user.id, session.skill_id, after],
        );
      }
      await db.query('UPDATE lesson_sessions SET state=$2,completed=$3 WHERE id=$1', [
        session.id,
        JSON.stringify(state),
        state.index === 9,
      ]);
      res.json({
        ...(await lessonView({ ...session, state, completed: state.index === 9 }, langOf(req))),
        feedback,
        mistakeQuestion,
      });
    },
  );
  const inflight = new Map<string, Promise<any>>();
  async function singleFlight(key: string, fn: () => Promise<any>) {
    const old = inflight.get(key);
    if (old) return old;
    const task = fn();
    inflight.set(key, task);
    try {
      return await task;
    } finally {
      inflight.delete(key);
    }
  }
  route('post', '/api/speaking', authenticated, role('student'), async (req: any, res: any) => {
    const d = z
      .object({
        mode: z.enum(['Conversation', 'Role Play', 'Topic Practice']),
        topic: z.string().min(1).max(80),
      })
      .parse(req.body);
    await tx(async () => {
      await requireLearning(db, res.locals.user.id, true);
      await requireActive(db, res.locals.user.id, 'english');
    });
    const reply = await ai.generateConversationReply('', d.mode + ': ' + d.topic),
      id = randomUUID();
    await tx(async () => {
      await requireLearning(db, res.locals.user.id, true);
      await requireActive(db, res.locals.user.id, 'english');
      await db.query(
        'INSERT INTO speaking_sessions(id,student_id,mode,topic) VALUES($1,$2,$3,$4)',
        [id, res.locals.user.id, d.mode, d.topic],
      );
    });
    res.json({ id, reply, provider: ai.provider });
  });
  route(
    'post',
    '/api/speaking/:id/transcribe',
    authenticated,
    role('student'),
    express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '8mb' }),
    async (req: any, res: any) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length) fail('Empty audio');
      const requestId = z
          .string()
          .uuid()
          .parse(req.headers['x-request-id'] || randomUUID()),
        key = res.locals.user.id + ':transcribe:' + req.params.id + ':' + requestId;
      res.json(
        await singleFlight(key, async () => {
          const cached = await tx(async () => {
            const session = await owned('speaking_sessions', req.params.id, res.locals.user.id);
            if (session.completed) fail('This conversation has ended');
            await requireLearning(db, res.locals.user.id, true);
            await requireActive(db, res.locals.user.id, 'english');
            return (
              await db.query(
                "SELECT result FROM ai_requests WHERE id=$1 AND student_id=$2 AND session_id=$3 AND kind='transcribe'",
                [requestId, res.locals.user.id, session.id],
              )
            ).rows[0]?.result;
          });
          if (cached) return cached;
          const mime = req.headers['content-type'] || 'audio/webm',
            result = await ai.transcribeSpeech(req.body, mime);
          await tx(async () => {
            const fresh = await owned('speaking_sessions', req.params.id, res.locals.user.id);
            if (fresh.completed) fail('This conversation has ended');
            await requireLearning(db, res.locals.user.id, true);
            await requireActive(db, res.locals.user.id, 'english');
            await db.query(
              'INSERT INTO audio_records_metadata(id,session_id,bytes,mime) VALUES($1,$2,$3,$4)',
              [randomUUID(), fresh.id, req.body.length, mime],
            );
            await db.query(
              'INSERT INTO ai_requests(id,student_id,session_id,kind,result) VALUES($1,$2,$3,$4,$5)',
              [requestId, res.locals.user.id, fresh.id, 'transcribe', JSON.stringify(result)],
            );
          });
          return result;
        }),
      );
    },
  );
  route(
    'post',
    '/api/speaking/:id/turn',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const d = z
        .object({ text: z.string().trim().min(3).max(2000), requestId: z.string().uuid() })
        .parse(req.body);
      res.json(
        await singleFlight(
          res.locals.user.id + ':turn:' + req.params.id + ':' + d.requestId,
          async () => {
            const read = await tx(async () => {
              const session = await owned('speaking_sessions', req.params.id, res.locals.user.id);
              const previous = (
                await db.query('SELECT * FROM speaking_turns WHERE id=$1 AND session_id=$2', [
                  d.requestId,
                  session.id,
                ])
              ).rows[0];
              if (previous) return { previous };
              if (session.completed) fail('This conversation has ended');
              await requireLearning(db, res.locals.user.id, true);
              await requireActive(db, res.locals.user.id, 'english');
              const history = (
                await db.query(
                  'SELECT transcript,reply FROM speaking_turns WHERE session_id=$1 ORDER BY created_at DESC LIMIT 6',
                  [session.id],
                )
              ).rows;
              return { session, history };
            });
            if (read.previous) return read.previous;
            const context =
              read.session.mode +
              ': ' +
              read.session.topic +
              '. Previous turns: ' +
              JSON.stringify(read.history!.reverse());
            const feedback = await ai.evaluateSpeaking(d.text, context);
            await requireLearning(db, res.locals.user.id, true);
            const reply = await ai.generateConversationReply(d.text, context);
            return tx(async () => {
              const session = await owned('speaking_sessions', req.params.id, res.locals.user.id);
              if (session.completed) fail('This conversation has ended');
              await requireLearning(db, res.locals.user.id, true);
              await requireActive(db, res.locals.user.id, 'english');
              const previous = (
                await db.query('SELECT * FROM speaking_turns WHERE id=$1 AND session_id=$2', [
                  d.requestId,
                  session.id,
                ])
              ).rows[0];
              if (previous) return previous;
              const last = (
                await db.query(
                  'SELECT created_at FROM speaking_turns WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1',
                  [session.id],
                )
              ).rows[0];
              const seconds = Math.max(
                1,
                Math.min(
                  180,
                  Math.round(
                    (Date.now() - new Date(last?.created_at || session.created_at).getTime()) /
                      1000,
                  ),
                ),
              );
              await db.query(
                'INSERT INTO speaking_turns(id,session_id,transcript,feedback,reply) VALUES($1,$2,$3,$4,$5)',
                [d.requestId, session.id, d.text, JSON.stringify(feedback), reply],
              );
              // Free conversation is activity, not a calibrated proficiency assessment.
              const score =
                (
                  await db.query(
                    "SELECT mastery_score FROM student_skill_mastery WHERE student_id=$1 AND skill_id='speaking'",
                    [res.locals.user.id],
                  )
                ).rows[0]?.mastery_score || 0;
              await db.query(
                "INSERT INTO learning_events(id,student_id,skill_id,kind,before_score,after_score,seconds,xp,session_id) VALUES($1,$2,'speaking','speaking-turn',$3,$3,$4,3,$5)",
                [randomUUID(), res.locals.user.id, score, seconds, session.id],
              );
              await db.query('UPDATE student_profiles SET xp=xp+3 WHERE student_id=$1', [
                res.locals.user.id,
              ]);
              await db.query(
                'INSERT INTO ai_interactions(id,student_id,method,provider) VALUES($1,$2,$3,$4)',
                [randomUUID(), res.locals.user.id, 'evaluateSpeaking', ai.provider],
              );
              return {
                id: d.requestId,
                transcript: d.text,
                feedback,
                reply,
                change: { before: score, after: score },
              };
            });
          },
        ),
      );
    },
  );
  route(
    'post',
    '/api/speaking/:id/end',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const session = await owned('speaking_sessions', req.params.id, res.locals.user.id);
      const turns = (
        await db.query('SELECT count(*) count FROM speaking_turns WHERE session_id=$1', [
          session.id,
        ])
      ).rows[0].count;
      if (!session.completed && Number(turns) > 0) {
        const score =
          (
            await db.query(
              "SELECT mastery_score FROM student_skill_mastery WHERE student_id=$1 AND skill_id='speaking'",
              [res.locals.user.id],
            )
          ).rows[0]?.mastery_score || 0;
        await db.query(
          "INSERT INTO learning_events(id,student_id,skill_id,kind,before_score,after_score,seconds) VALUES($1,$2,'speaking','speaking',$3,$3,0)",
          [randomUUID(), res.locals.user.id, score],
        );
      }
      await db.query('UPDATE speaking_sessions SET completed=true WHERE id=$1', [session.id]);
      res.json({ completed: true, turns: Number(turns) });
    },
  );
  route('post', '/api/voice', authenticated, async (req: any, res: any) => {
    const text = z.string().min(1).max(3000).parse(req.body.text);
    await tx(async () => {
      if (res.locals.user.role === 'student') {
        await requireLearning(db, res.locals.user.id, !!req.body.sessionId);
        await requireActive(db, res.locals.user.id, 'english');
      }
      if (req.body.sessionId) {
        const session = await owned('speaking_sessions', req.body.sessionId, res.locals.user.id);
        if (session.completed) fail('This conversation has ended');
      }
    });
    const audio = await ai.synthesizeSpeech(text);
    if (res.locals.user.role === 'student')
      await requireLearning(db, res.locals.user.id, !!req.body.sessionId);
    if (
      req.body.sessionId &&
      (await owned('speaking_sessions', req.body.sessionId, res.locals.user.id)).completed
    )
      fail('This conversation has ended');
    if (!audio) return res.json({ browserVoice: true, text });
    res.type('audio/mpeg').send(audio);
  });
  const passage =
    'Last Saturday, Sam visited a science museum with a friend. They travelled by train and arrived at ten. The robotics exhibition was their favourite part. After lunch, they joined a workshop and built a small solar-powered car.';
  route('get', '/api/listening', authenticated, role('student'), async (_req: any, res: any) => {
    await requireLearning(db, res.locals.user.id, false);
    await requireActive(db, res.locals.user.id, 'english');
    if (
      pilotMode() &&
      !(await db.query("SELECT 1 FROM skills WHERE id='listening' AND review_status='approved'"))
        .rows.length
    )
      fail('Listening content awaits teacher approval', 409);
    const id = randomUUID();
    await db.query(
      "INSERT INTO lesson_sessions(id,student_id,skill_id,state) VALUES($1,$2,'listening',$3)",
      [id, res.locals.user.id, JSON.stringify({ kind: 'listening', started: Date.now(), hint: 0 })],
    );
    res.json({
      id,
      passage,
      question: {
        en: 'What did they build in the workshop?',
        uk: 'Що вони збудували на майстер-класі?',
      },
      options: ['A solar-powered car', 'A train', 'A robot dog', 'A telescope'],
    });
  });
  route(
    'post',
    '/api/listening/:id/hint',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const s = await owned('lesson_sessions', req.params.id, res.locals.user.id);
      if (s.state.kind !== 'listening' || s.completed) fail('Invalid session');
      await requireLearning(db, res.locals.user.id, false);
      await requireActive(db, res.locals.user.id, 'english');
      s.state.hint = 1;
      await db.query('UPDATE lesson_sessions SET state=$2 WHERE id=$1', [
        s.id,
        JSON.stringify(s.state),
      ]);
      res.json({ passage });
    },
  );
  route(
    'post',
    '/api/listening/:id/answer',
    authenticated,
    role('student'),
    async (req: any, res: any) => {
      const s = await owned('lesson_sessions', req.params.id, res.locals.user.id);
      if (s.state.kind !== 'listening' || s.completed) fail('Already completed');
      await requireLearning(db, res.locals.user.id, false);
      await requireActive(db, res.locals.user.id, 'english');
      const answer = z.number().int().min(0).max(3).parse(req.body.answer);
      const change = await evidence(
        db,
        res.locals.user.id,
        'listening',
        answer === 0,
        s.state.hint,
        Math.min(600, Math.round((Date.now() - s.state.started) / 1000)),
        'listening',
        s.id,
        'museum-workshop',
      );
      await db.query('UPDATE lesson_sessions SET completed=true WHERE id=$1', [s.id]);
      res.json({
        correct: answer === 0,
        change,
        seconds: Math.min(600, Math.max(1, Math.round((Date.now() - s.state.started) / 1000))),
      });
    },
  );
  route('get', '/api/admin', authenticated, role('admin'), async (_req: any, res: any) =>
    res.json({
      english_assessment_items: (
        await db.query('SELECT id,content,review_status FROM english_assessment_items ORDER BY id')
      ).rows,
      skills: await skillsFor(db, 'demo-student'),
      subjects: (await db.query('SELECT * FROM subjects')).rows,
      curricula: (await db.query('SELECT * FROM curricula')).rows,
      topics: (await db.query('SELECT * FROM topics')).rows,
      questions: (await db.query('SELECT * FROM questions ORDER BY skill_id,id')).rows,
      prompts: (await db.query('SELECT * FROM ai_prompts')).rows,
      users: (await db.query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at'))
        .rows,
      stats: (
        await db.query(
          'SELECT (SELECT count(*) FROM users) users,(SELECT count(*) FROM lesson_sessions WHERE completed) lessons,(SELECT count(*) FROM speaking_turns) turns',
        )
      ).rows[0],
    }),
  );
  route(
    'put',
    '/api/admin/english-review',
    authenticated,
    role('admin'),
    async (req: any, res: any) => {
      const d = z
        .object({ id: z.string(), review_status: z.enum(['draft', 'reviewed', 'approved']) })
        .parse(req.body);
      const result = await db.query(
        'UPDATE english_assessment_items SET review_status=$2 WHERE id=$1 RETURNING id',
        [d.id, d.review_status],
      );
      if (!result.rows.length) fail('Матеріал не знайдено', 404);
      res.json({ ok: true });
    },
  );
  route('put', '/api/admin/skill', authenticated, role('admin'), async (req: any, res: any) => {
    const d = z
      .object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        subject_id: z.string(),
        topic_id: z.string(),
        title: text,
        explanation: text,
        prerequisites: z.array(z.string()).max(10),
        sort_order: z.number().int(),
      })
      .parse(req.body);
    const edges = (await db.query('SELECT * FROM skill_dependencies WHERE skill_id<>$1', [d.id]))
      .rows;
    for (const p of d.prerequisites) edges.push({ skill_id: d.id, prerequisite_id: p });
    const visit = (node: string, path: Set<string>) => {
      if (path.has(node)) fail('Dependency cycle is not allowed');
      for (const e of edges.filter((e) => e.skill_id === node))
        visit(e.prerequisite_id, new Set([...path, node]));
    };
    visit(d.id, new Set());
    await db.query(
      'INSERT INTO skills(id,subject_id,topic_id,title,explanation,sort_order) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET title=$4,explanation=$5,subject_id=$2,topic_id=$3,sort_order=$6',
      [
        d.id,
        d.subject_id,
        d.topic_id,
        JSON.stringify(d.title),
        JSON.stringify(d.explanation),
        d.sort_order,
      ],
    );
    await db.query("UPDATE skills SET review_status='draft' WHERE id=$1", [d.id]);
    await db.query('DELETE FROM skill_dependencies WHERE skill_id=$1', [d.id]);
    for (const p of d.prerequisites)
      await db.query('INSERT INTO skill_dependencies VALUES($1,$2)', [d.id, p]);
    res.json({ ok: true });
  });
  route('put', '/api/admin/question', authenticated, role('admin'), async (req: any, res: any) => {
    const d = z
      .object({
        id: z.string().min(1),
        skill_id: z.string(),
        difficulty: z.number().int().min(1).max(5),
        prompt: text,
        options: z.array(z.string().min(1)).length(4),
        answer: z.number().int().min(0).max(3),
        reasoning: text,
        hints: z.array(text).length(5),
      })
      .parse(req.body);
    await db.query(
      'INSERT INTO questions VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET skill_id=$2,difficulty=$3,prompt=$4,options=$5,answer=$6,reasoning=$7,hints=$8',
      [
        d.id,
        d.skill_id,
        d.difficulty,
        JSON.stringify(d.prompt),
        JSON.stringify(d.options),
        d.answer,
        JSON.stringify(d.reasoning),
        JSON.stringify(d.hints),
      ],
    );
    await db.query("UPDATE questions SET review_status='draft' WHERE id=$1", [d.id]);
    await db.query('INSERT INTO diagnostic_questions VALUES($1) ON CONFLICT DO NOTHING', [d.id]);
    res.json({ ok: true });
  });
  route('put', '/api/admin/content', authenticated, role('admin'), async (req: any, res: any) => {
    const d = z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('subject'), id: z.string().min(1), title: text }),
        z.object({
          kind: z.literal('topic'),
          id: z.string().min(1),
          curriculum_id: z.string(),
          title: text,
        }),
        z.object({
          kind: z.literal('curriculum'),
          id: z.string().min(1),
          subject_id: z.string(),
          title: z.string().min(1),
          grade: z.number().int().min(1).max(12).nullable(),
          cefr: z.enum(['A1', 'A2', 'B1', 'B2', 'C1']).nullable(),
        }),
      ])
      .parse(req.body);
    if (d.kind === 'subject')
      await db.query('INSERT INTO subjects VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET title=$2', [
        d.id,
        JSON.stringify(d.title),
      ]);
    if (d.kind === 'topic')
      await db.query(
        'INSERT INTO topics VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET curriculum_id=$2,title=$3',
        [d.id, d.curriculum_id, JSON.stringify(d.title)],
      );
    if (d.kind === 'curriculum')
      await db.query(
        'INSERT INTO curricula VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET subject_id=$2,title=$3,grade=$4,cefr=$5',
        [d.id, d.subject_id, d.title, d.grade, d.cefr],
      );
    res.json({ ok: true });
  });
  route('put', '/api/admin/user', authenticated, role('admin'), async (req: any, res: any) => {
    const d = z
      .object({
        id: z.string(),
        name: z.string().trim().min(1).max(60),
        role: z.enum(['student', 'parent', 'admin']),
      })
      .parse(req.body);
    const old = (await db.query('SELECT * FROM users WHERE id=$1', [d.id])).rows[0];
    if (!old) fail('User not found', 404);
    if (old.role !== d.role)
      fail(
        'Role changes are intentionally disabled to preserve child/parent ownership. Provision administrators server-side.',
      );
    await db.query('UPDATE users SET name=$2 WHERE id=$1', [d.id, d.name]);
    res.json({ ok: true });
  });
  route('put', '/api/admin/prompt', authenticated, role('admin'), async (req: any, res: any) => {
    const content = z.string().min(30).max(6000).parse(req.body.content);
    await db.query("UPDATE ai_prompts SET content=$1 WHERE id='tutor'", [content]);
    res.json({ ok: true });
  });
  pilotRoutes(app, db);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
  app.use(
    (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (res.headersSent) return;
      const status = error.status || (error instanceof z.ZodError ? 400 : 500);
      res.status(status).json({
        error:
          error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : status === 500
              ? 'Unable to complete request. Check server configuration and try again.'
              : error.message,
      });
      if (status === 500) console.error(error.message);
    },
  );
  return app;
}
