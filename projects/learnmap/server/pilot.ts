import type { DB } from './db';
import { randomUUID } from 'node:crypto';
import { localDay, shiftDay } from '../shared/learning';
export const CONSENT_VERSION = 'pilot-2026-09-v1';
export const pilotMode = () => process.env.PILOT_MODE === 'true';
export const retentionDays = () => Number(process.env.SPEAKING_RETENTION_DAYS || 30);
export function denied(message: string): never {
  throw Object.assign(new Error(message), { status: 403 });
}
export async function privacy(db: DB, student: string) {
  const row = (await db.query('SELECT * FROM pilot_consent WHERE student_id=$1', [student]))
    .rows[0];
  return {
    consent_version: CONSENT_VERSION,
    granted: !!row?.granted && row.version === CONSENT_VERSION,
    allow_speaking: row ? row.allow_speaking : !pilotMode(),
    granted_at: row?.granted_at || null,
    withdrawn_at: row?.withdrawn_at || null,
    retention_days: retentionDays(),
    pilot: pilotMode(),
  };
}
export async function requireLearning(db: DB, student: string, speaking = false) {
  if (!(await db.query('SELECT 1 FROM users WHERE id=$1', [student])).rows.length)
    denied('Account no longer exists');
  const p = await privacy(db, student);
  if (pilotMode() && !p.granted)
    denied(
      'Parent consent required. Complete onboarding and invite your parent. / Потрібна згода батьків.',
    );
  if (speaking && !p.allow_speaking)
    denied('Speaking is disabled by your parent / Батьки вимкнули Speaking');
}
export const eventNames = [
  'login',
  'diagnostic_started',
  'diagnostic_completed',
  'lesson_started',
  'lesson_completed',
  'lesson_abandoned',
  'hint_used',
  'speaking_started',
  'speaking_completed',
  'listening_completed',
  'subject_added',
  'subject_paused',
  'parent_dashboard_viewed',
  'weekly_report_viewed',
] as const;
export async function track(
  db: DB,
  user: string,
  event: string,
  subject: string | null = null,
  session: string | null = null,
  dedupe: string = randomUUID(),
  seconds = 0,
) {
  if (!eventNames.includes(event as any)) throw new Error('Unknown telemetry event');
  // Telemetry stores IDs and fixed enums, never text, email, IP, audio or browser fingerprints.
  await db.query(
    'INSERT INTO pilot_events(id,user_id,event,subject_id,session_id,dedupe,seconds) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,event,dedupe) DO NOTHING',
    [randomUUID(), user, event, subject, session, dedupe, Math.max(0, Math.min(3600, seconds))],
  );
}
export async function trackSubjects(db: DB, user: string, before: string[]) {
  const after = (
    await db.query('SELECT subject_id FROM student_subjects WHERE student_id=$1 AND active', [user])
  ).rows.map((r) => r.subject_id);
  for (const id of after.filter((id) => !before.includes(id)))
    await track(db, user, 'subject_added', id);
  for (const id of before.filter((id) => !after.includes(id)))
    await track(db, user, 'subject_paused', id);
}
export async function eraseTranscripts(db: DB, student: string) {
  await db.query(
    "UPDATE english_assessment_sessions SET completed=true,state=jsonb_set(jsonb_set(state,'{deleted}','true'),'{observations}','[]') WHERE student_id=$1",
    [student],
  );
  await db.query(
    "DELETE FROM english_assessment_answers WHERE session_id IN(SELECT id FROM english_assessment_sessions WHERE student_id=$1) AND observation->>'kind' IN('writing','speaking')",
    [student],
  );
  // Close sessions first: an in-flight provider response cannot recreate deleted transcripts.
  await db.query('UPDATE speaking_sessions SET completed=true,topic=$2 WHERE student_id=$1', [
    student,
    'Deleted',
  ]);
  await db.query(
    'DELETE FROM speaking_turns WHERE session_id IN (SELECT id FROM speaking_sessions WHERE student_id=$1)',
    [student],
  );
  await db.query(
    'DELETE FROM audio_records_metadata WHERE session_id IN (SELECT id FROM speaking_sessions WHERE student_id=$1)',
    [student],
  );
  await db.query('DELETE FROM ai_requests WHERE student_id=$1', [student]);
}
export async function purgeExpired(db: DB) {
  const cutoff = new Date(Date.now() - retentionDays() * 86400000).toISOString();
  await db.query(
    "UPDATE english_assessment_sessions SET completed=true,state=jsonb_set(jsonb_set(state,'{deleted}','true'),'{observations}','[]') WHERE created_at<$1",
    [cutoff],
  );
  await db.query(
    "DELETE FROM english_assessment_answers WHERE session_id IN(SELECT id FROM english_assessment_sessions WHERE created_at<$1) AND observation->>'kind' IN('writing','speaking')",
    [cutoff],
  );
  await db.query('UPDATE speaking_sessions SET completed=true,topic=$2 WHERE created_at<$1', [
    cutoff,
    'Expired',
  ]);
  await db.query(
    'DELETE FROM speaking_turns WHERE session_id IN (SELECT id FROM speaking_sessions WHERE created_at<$1)',
    [cutoff],
  );
  await db.query(
    'DELETE FROM audio_records_metadata WHERE session_id IN (SELECT id FROM speaking_sessions WHERE created_at<$1)',
    [cutoff],
  );
  await db.query('DELETE FROM ai_requests WHERE created_at<$1', [cutoff]);
  await db.query("DELETE FROM pilot_events WHERE created_at<now()-interval '90 days'");
  await db.query("DELETE FROM pilot_feedback WHERE created_at<now()-interval '90 days'");
  const abandoned = (
    await db.query(
      "SELECT l.id,l.student_id,s.subject_id FROM lesson_sessions l JOIN skills s ON s.id=l.skill_id WHERE NOT l.completed AND l.created_at<now()-interval '24 hours' AND l.state->>'kind' IS DISTINCT FROM 'listening'",
    )
  ).rows;
  for (const l of abandoned)
    await track(db, l.student_id, 'lesson_abandoned', l.subject_id, l.id, l.id);
}
export async function deleteUser(db: DB, id: string) {
  await eraseTranscripts(db, id);
  for (const [answers, sessions] of [
    ['student_answers', 'lesson_sessions'],
    ['diagnostic_answers', 'diagnostic_sessions'],
  ])
    await db.query(
      `DELETE FROM ${answers} WHERE session_id IN (SELECT id FROM ${sessions} WHERE student_id=$1)`,
      [id],
    );
  for (const table of [
    'skill_evidence',
    'learning_events',
    'daily_plans',
    'weekly_reports',
    'ai_interactions',
    'speaking_sessions',
    'lesson_sessions',
    'diagnostic_sessions',
  ])
    await db.query(`DELETE FROM ${table} WHERE student_id=$1`, [id]);
  // Deleting a guardian withdraws their consent; another linked guardian must explicitly consent again.
  await db.query(
    'UPDATE pilot_consent SET granted=false,allow_speaking=false,withdrawn_at=now() WHERE parent_id=$1',
    [id],
  );
  await db.query('DELETE FROM users WHERE id=$1', [id]);
}
export async function exportData(db: DB, id: string) {
  const account = (
    await db.query('SELECT id,name,email,role,created_at FROM users WHERE id=$1', [id])
  ).rows[0];
  const data: Record<string, unknown> = {
    format: 'learnmap-export-v1',
    exported_at: new Date().toISOString(),
    account,
  };
  for (const table of [
    'student_profiles',
    'student_subjects',
    'student_skill_mastery',
    'skill_evidence',
    'learning_events',
    'diagnostic_sessions',
    'lesson_sessions',
    'speaking_sessions',
    'pilot_consent',
    'english_assessment_sessions',
  ])
    data[table] = (await db.query(`SELECT * FROM ${table} WHERE student_id=$1`, [id])).rows;
  for (const [answers, sessions] of [
    ['student_answers', 'lesson_sessions'],
    ['diagnostic_answers', 'diagnostic_sessions'],
    ['speaking_turns', 'speaking_sessions'],
    ['english_assessment_answers', 'english_assessment_sessions'],
  ])
    data[answers] = (
      await db.query(
        `SELECT * FROM ${answers} WHERE session_id IN (SELECT id FROM ${sessions} WHERE student_id=$1)`,
        [id],
      )
    ).rows;
  data.consent_history = (
    await db.query(
      'SELECT version,granted,allow_speaking,created_at FROM consent_history WHERE student_id=$1 OR parent_id=$1',
      [id],
    )
  ).rows;
  data.parent_links = (
    await db.query(
      'SELECT student_id,parent_id FROM parent_student_links WHERE student_id=$1 OR parent_id=$1',
      [id],
    )
  ).rows;
  data.telemetry = (
    await db.query(
      'SELECT event,subject_id,session_id,seconds,created_at FROM pilot_events WHERE user_id=$1',
      [id],
    )
  ).rows;
  data.feedback = (
    await db.query(
      'SELECT screen,context_id,rating,created_at FROM pilot_feedback WHERE user_id=$1',
      [id],
    )
  ).rows;
  return data;
}
export async function metrics(db: DB) {
  const zone = process.env.PILOT_TIMEZONE || 'Europe/Kyiv',
    today = localDay(new Date(), zone);
  const events = (
    await db.query(
      "SELECT e.*,u.role FROM pilot_events e JOIN users u ON u.id=e.user_id WHERE u.id NOT LIKE 'demo-%' ORDER BY e.created_at",
    )
  ).rows;
  const count = (name: string) => events.filter((e) => e.event === name).length;
  const active = new Set(
    events
      .filter((e) => e.role === 'student' && localDay(e.created_at, zone) === today)
      .map((e) => e.user_id),
  ).size;
  const completed = events.filter((e) => e.event === 'lesson_completed'),
    started = count('lesson_started');
  const students = (
    await db.query("SELECT id,created_at FROM users WHERE role='student' AND id NOT LIKE 'demo-%'")
  ).rows;
  const returns = (days: number) => {
    const eligible = students.filter((s) => shiftDay(localDay(s.created_at, zone), days) < today);
    const returned = eligible.filter((s) =>
      events.some(
        (e) =>
          e.user_id === s.id &&
          localDay(e.created_at, zone) === shiftDay(localDay(s.created_at, zone), days),
      ),
    ).length;
    return {
      returned,
      eligible: eligible.length,
      rate: eligible.length ? returned / eligible.length : null,
    };
  };
  return {
    today,
    timezone: zone,
    window: 'Last 90 days; demo accounts excluded',
    active_students_today: active,
    lessons_started: started,
    lessons_completed: completed.length,
    completion_rate: started ? completed.length / started : null,
    average_learning_seconds: completed.length
      ? completed.reduce((n, e) => n + e.seconds, 0) / completed.length
      : null,
    hints_per_lesson: started ? count('hint_used') / started : null,
    speaking_sessions: count('speaking_started'),
    speaking_completed: count('speaking_completed'),
    parent_dashboard_views: count('parent_dashboard_viewed'),
    day1: returns(1),
    day7: returns(7),
    subjects: ['math', 'physics', 'english'].map((id) => ({
      id,
      events: events.filter((e) => e.subject_id === id).length,
      students: new Set(
        events.filter((e) => e.subject_id === id && e.role === 'student').map((e) => e.user_id),
      ).size,
      seconds: events.filter((e) => e.subject_id === id).reduce((n, e) => n + e.seconds, 0),
    })),
    feedback: (
      await db.query(
        'SELECT screen,rating,count(*) count FROM pilot_feedback GROUP BY screen,rating',
      )
    ).rows,
  };
}
