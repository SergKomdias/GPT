import { randomBytes } from 'node:crypto';
const testPassword = randomBytes(24).toString('hex');
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { Server } from 'node:http';
import { createDB, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
let db: DB, server: Server, base: string;
let student = '',
  parent = '',
  other = '',
  admin = '',
  studentId = '',
  lessonId = '';
async function request(path: string, method = 'GET', body?: unknown, cookie = '') {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0] || '',
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
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});
describe.sequential('API integration with real PostgreSQL engine', () => {
  it('requires login and rejects self-registering as admin', async () => {
    expect((await request('/snapshot')).status).toBe(401);
    expect(
      (
        await request('/auth/register', 'POST', {
          email: 'bad@example.test',
          password: testPassword,
          name: 'Fictional',
          role: 'admin',
        })
      ).status,
    ).toBe(400);
  });
  it('registers a student with hashed password and saves onboarding', async () => {
    const r = await request('/auth/register', 'POST', {
      email: 'learner@example.test',
      password: testPassword,
      name: 'Test Student',
      role: 'student',
    });
    student = r.cookie;
    studentId = r.data.id;
    expect(r.status).toBe(200);
    const stored = (await db.query('SELECT password_hash FROM users WHERE id=$1', [studentId]))
      .rows[0];
    expect(stored.password_hash).not.toContain(testPassword);
    expect(
      (
        await request(
          '/profile',
          'PUT',
          {
            name: 'Test Student',
            age: 15,
            grade: 10,
            country: 'Ukraine',
            learning_language: 'en',
            interface_language: 'uk',
          },
          student,
        )
      ).status,
    ).toBe(200);
    const snap = await request('/snapshot', 'GET', undefined, student);
    expect(snap.data.skills.every((s: any) => s.confidence_score === 0)).toBe(true);
    expect(snap.data.profile.onboarded).toBe(true);
  });
  it('prevents unauthorized parent access and uses single-use invitations', async () => {
    const r = await request('/auth/register', 'POST', {
      email: 'parent@example.test',
      password: testPassword,
      name: 'Test Parent',
      role: 'parent',
    });
    parent = r.cookie;
    expect((await request('/snapshot?student=' + studentId, 'GET', undefined, parent)).status).toBe(
      403,
    );
    const code = (await request('/invite', 'POST', {}, student)).data.code;
    expect((await request('/link', 'POST', { code }, parent)).status).toBe(200);
    expect((await request('/link', 'POST', { code }, parent)).status).toBe(400);
    expect((await request('/snapshot?student=' + studentId, 'GET', undefined, parent)).status).toBe(
      200,
    );
    other = (
      await request('/auth/register', 'POST', {
        email: 'other@example.test',
        password: testPassword,
        name: 'Other Student',
        role: 'student',
      })
    ).cookie;
    expect((await request('/snapshot?student=' + studentId, 'GET', undefined, other)).status).toBe(
      403,
    );
  });
  it('runs adaptive diagnosis without exposing answer keys', async () => {
    let s = (await request('/diagnostic', 'POST', { subject: 'math' }, student)).data;
    for (let i = 0; i < 8; i++) {
      expect(s.question.answer).toBeUndefined();
      expect(s.question.hints).toBeUndefined();
      const q = (await db.query('SELECT answer FROM questions WHERE id=$1', [s.question.id]))
        .rows[0];
      const out = await request(
        `/diagnostic/${s.id}/answer`,
        'POST',
        { answer: q.answer, questionId: s.question.id },
        student,
      );
      expect(out.status).toBe(200);
      s = { ...out.data, id: s.id };
    }
    expect(s.completed).toBe(true);
    expect(
      (await request(`/diagnostic/${s.id}/answer`, 'POST', { answer: 0 }, student)).status,
    ).toBe(400);
    expect(
      (await request('/snapshot', 'GET', undefined, student)).data.skills.some(
        (s: any) => s.attempts_count > 0,
      ),
    ).toBe(true);
  });
  it('completes every lesson stage, persists hints and updates parent data', async () => {
    let s = (await request('/lesson', 'POST', { skill: 'quadratic' }, student)).data;
    lessonId = s.id;
    const before = (await request('/snapshot', 'GET', undefined, student)).data.skills.find(
      (s: any) => s.id === 'quadratic',
    ).mastery_score;
    let count = 0;
    while (!s.completed) {
      const q = s.question
        ? (await db.query('SELECT answer FROM questions WHERE id=$1', [s.question.id])).rows[0]
        : null;
      if (count === 0) {
        const hint = await request(
          `/lesson/${s.id}/hint`,
          'POST',
          { index: s.index, lang: 'en' },
          student,
        );
        expect(hint.data.level).toBe(1);
      }
      const out = await request(
        `/lesson/${s.id}/next`,
        'POST',
        { index: s.index, answer: q?.answer, lang: 'en' },
        student,
      );
      expect(out.status).toBe(200);
      s = out.data;
      count++;
      expect(count).toBeLessThan(11);
    }
    expect(count).toBe(9);
    expect(s.result.after).toBeGreaterThan(before);
    const snap = (await request('/snapshot?student=' + studentId, 'GET', undefined, parent)).data;
    expect(snap.report.completed).toBe(1);
    expect(snap.skills.find((k: any) => k.id === 'quadratic').mastery_score).toBe(s.result.after);
    const events = snap.events.length;
    await request(`/lesson/${lessonId}/next`, 'POST', { index: 8, answer: 0 }, student);
    expect((await request('/snapshot', 'GET', undefined, student)).data.events.length).toBe(events);
    expect(
      (await request(`/lesson/${lessonId}/next`, 'POST', { index: 0, answer: 0 }, other)).status,
    ).toBe(404);
  });
  it('persists a speaking dialogue and deduplicates repeated turn submission', async () => {
    const s = (await request('/speaking', 'POST', { mode: 'Role Play', topic: 'Café' }, student))
      .data;
    const body = { text: 'I go to school yesterday.', requestId: crypto.randomUUID() };
    const result = await request(`/speaking/${s.id}/turn`, 'POST', body, student);
    expect(result.data.feedback.correction).toBe('I went to school yesterday.');
    expect(result.data.feedback.pronunciation).toBe('Not assessed');
    await request(`/speaking/${s.id}/turn`, 'POST', body, student);
    expect(
      (await db.query('SELECT * FROM speaking_turns WHERE session_id=$1', [s.id])).rows,
    ).toHaveLength(1);
    const audio = await fetch(base + `/speaking/${s.id}/transcribe`, {
      method: 'POST',
      headers: { Cookie: student, 'Content-Type': 'audio/webm' },
      body: Buffer.from('synthetic-test-audio'),
    });
    expect((await audio.json()).example).toBe(true);
    expect(
      (await db.query('SELECT * FROM audio_records_metadata WHERE session_id=$1', [s.id])).rows[0]
        .source_deleted,
    ).toBe(true);
  });
  it('keeps listening evidence separate and prevents replay credit', async () => {
    const s = (await request('/listening', 'GET', undefined, student)).data;
    await request(`/listening/${s.id}/hint`, 'POST', {}, student);
    const r = await request(`/listening/${s.id}/answer`, 'POST', { answer: 0 }, student);
    expect(r.data.correct).toBe(true);
    expect(
      (await request(`/listening/${s.id}/answer`, 'POST', { answer: 0 }, student)).status,
    ).toBe(400);
    const snap = (await request('/snapshot', 'GET', undefined, student)).data;
    expect(snap.skills.find((s: any) => s.id === 'listening').hints_used).toBe(1);
  });
  it('protects curriculum administration and rejects cyclic dependencies', async () => {
    expect((await request('/admin', 'GET', undefined, student)).status).toBe(403);
    admin = (await request('/auth/demo', 'POST', { role: 'admin' })).cookie;
    const a = (await request('/admin', 'GET', undefined, admin)).data;
    const skill = a.skills.find((s: any) => s.id === 'arithmetic');
    expect(
      (await request('/admin/skill', 'PUT', { ...skill, prerequisites: ['linear'] }, admin)).status,
    ).toBe(400);
    expect(
      (
        await request(
          '/admin/prompt',
          'PUT',
          {
            content: 'Educational tutor. Teach safely and progressively; give one hint at a time.',
          },
          admin,
        )
      ).status,
    ).toBe(200);
  });
  it('invalidates logout and rejects invalid answer input', async () => {
    expect((await request('/lesson', 'POST', { skill: 'unknown' }, student)).status).toBe(400);
    expect((await request('/logout', 'POST', {}, other)).status).toBe(200);
    expect((await request('/me', 'GET', undefined, other)).status).toBe(401);
  });
});
