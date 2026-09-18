import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createDB, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
import { fixtureAnswer, mathSkills } from './fixtures/math-students';
let db: DB, server: Server, base: string;
async function post(path: string, body: unknown, cookie = '') {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get('set-cookie')?.split(';')[0] || '',
  };
}
beforeAll(async () => {
  db = await createDB('memory://');
  await seed(db);
  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as any).port}/api`;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});
async function student(grade = 10) {
  const user = await post('/auth/register', {
    name: 'Synthetic fixture',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
    role: 'student',
  });
  expect(user.status).toBe(200);
  await db.query('UPDATE student_profiles SET grade=$2,onboarded=true WHERE student_id=$1', [
    user.data.id,
    grade,
  ]);
  await db.query("INSERT INTO student_subjects(student_id,subject_id) VALUES($1,'math')", [
    user.data.id,
  ]);
  return user;
}
describe.sequential('mathematics diagnostic API and migration', () => {
  for (const profile of ['weak', 'average', 'strong'] as const)
    it(`grades the ${profile} grade-10 fixture deterministically through the real API`, async () => {
      const user = await student();
      let response = await post(
        '/diagnostic',
        { subject: 'math', grade: 5, difficulty: 1 },
        user.cookie,
      );
      expect(response.status).toBe(200);
      const id = response.data.id;
      const trace: any[] = [];
      while (!response.data.completed) {
        const q = response.data.question;
        expect(q).not.toHaveProperty('answer');
        expect(q).not.toHaveProperty('reasoning');
        const stored = (await db.query('SELECT * FROM questions WHERE id=$1', [q.id])).rows[0];
        const correct = fixtureAnswer(profile, stored);
        trace.push(q);
        response = await post(
          `/diagnostic/${id}/answer`,
          { questionId: q.id, answer: correct ? stored.answer : (stored.answer + 1) % 4 },
          user.cookie,
        );
        expect(response.status).toBe(200);
        expect(response.data.correct).toBe(correct);
        expect(trace.length).toBeLessThanOrEqual(24);
      }
      expect(mathSkills.find((s) => s.id === trace[0].skill_id)!.grade_level).toBe(9);
      if (profile === 'strong') {
        expect(trace.slice(0, 4).map((q) => q.difficulty)).toEqual([2, 3, 4, 5]);
        expect(trace.every((q) => q.difficulty >= 2)).toBe(true);
      } else if (profile === 'weak') {
        expect(mathSkills.find((s) => s.id === trace[0].skill_id)!.prerequisites).toContain(
          trace[1].skill_id,
        );
      }
      const answers = (await db.query('SELECT * FROM diagnostic_answers WHERE session_id=$1', [id]))
        .rows;
      expect(answers).toHaveLength(trace.length);
    });
  it('retains legacy question meaning, answers and session state while retiring only its diagnostic entry', async () => {
    const user = await student();
    const legacy = 'linear-0',
      session = randomUUID();
    await db.query(
      "INSERT INTO questions(id,skill_id,difficulty,prompt,options,answer,reasoning,hints) VALUES($1,'linear',1,$2,$3,0,$4,$5)",
      [
        legacy,
        JSON.stringify({ uk: 'Старе незмінне запитання' }),
        JSON.stringify(['1', '2', '3', '4']),
        JSON.stringify({ uk: 'Старе пояснення' }),
        JSON.stringify([]),
      ],
    );
    await db.query('INSERT INTO diagnostic_questions VALUES($1)', [legacy]);
    const state = { asked: [legacy], current: legacy, skill: 'linear', difficulty: 1 };
    await db.query(
      "INSERT INTO diagnostic_sessions(id,student_id,subject_id,state) VALUES($1,$2,'math',$3)",
      [session, user.data.id, JSON.stringify(state)],
    );
    await db.query('INSERT INTO diagnostic_answers VALUES($1,$2,true,0)', [session, legacy]);
    const old = (await db.query('SELECT * FROM questions WHERE id=$1', [legacy])).rows[0];
    await db.query("DELETE FROM schema_migrations WHERE id='math-diagnostic-v3'");
    await seed(db);
    expect((await db.query('SELECT * FROM questions WHERE id=$1', [legacy])).rows[0]).toEqual(old);
    expect(
      (await db.query('SELECT * FROM diagnostic_answers WHERE session_id=$1', [session])).rows,
    ).toHaveLength(1);
    expect(
      (await db.query('SELECT state FROM diagnostic_sessions WHERE id=$1', [session])).rows[0]
        .state,
    ).toEqual(state);
    expect(
      (await db.query('SELECT * FROM diagnostic_questions WHERE question_id=$1', [legacy])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("SELECT grade_level,diagnostic_branch FROM skills WHERE id='systems'"))
        .rows[0],
    ).toEqual({ grade_level: 9, diagnostic_branch: 'algebra' });
    await db.query("UPDATE questions SET review_status='approved' WHERE id='math-v3-systems-2'");
    await db.query("UPDATE skills SET review_status='approved' WHERE id='systems'");
    await seed(db);
    expect(
      (await db.query("SELECT review_status FROM questions WHERE id='math-v3-systems-2'")).rows[0]
        .review_status,
    ).toBe('approved');
    expect(
      (await db.query("SELECT review_status FROM skills WHERE id='systems'")).rows[0].review_status,
    ).toBe('approved');
    expect(
      (
        await db.query(
          "SELECT q.id FROM diagnostic_questions d JOIN questions q ON q.id=d.question_id JOIN skills s ON s.id=q.skill_id WHERE s.subject_id='math'",
        )
      ).rows,
    ).toHaveLength(200);
  });
  it('pilot never falls back to draft or retired elementary questions', async () => {
    const user = await student();
    vi.stubEnv('PILOT_MODE', 'true');
    await db.query(
      "UPDATE questions SET review_status='draft' WHERE skill_id IN (SELECT id FROM skills WHERE subject_id='math')",
    );
    await db.query(
      "INSERT INTO pilot_consent(student_id,version,granted,allow_speaking,granted_at) VALUES($1,'test',true,false,now())",
      [user.data.id],
    );
    // Use the current version enforced by the actual consent gate.
    const { CONSENT_VERSION } = await import('../server/pilot');
    await db.query('UPDATE pilot_consent SET version=$2 WHERE student_id=$1', [
      user.data.id,
      CONSENT_VERSION,
    ]);
    const unavailable = await post('/diagnostic', { subject: 'math' }, user.cookie);
    expect(unavailable.status).toBe(409);
    await db.query("UPDATE questions SET review_status='approved' WHERE id='math-v3-systems-2'");
    const allowed = await post('/diagnostic', { subject: 'math' }, user.cookie);
    expect(allowed.status).toBe(200);
    expect(allowed.data.question.id).toBe('math-v3-systems-2');
    vi.unstubAllEnvs();
  });
});
