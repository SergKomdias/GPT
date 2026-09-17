import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createDB, transaction, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
import { AIService } from '../server/ai';
import { CONSENT_VERSION, purgeExpired, metrics, track } from '../server/pilot';
import { validateConfig } from '../server/config';
let db: DB, server: Server, base: string, ai: AIService;
const realFetch = globalThis.fetch;
async function req(path: string, method = 'GET', body?: unknown, cookie = '') {
  const r = await realFetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0] || '',
    headers: r.headers,
  };
}
async function account(role = 'student') {
  const password = randomUUID();
  const r = await req('/auth/register', 'POST', {
    email: randomUUID() + '@example.test',
    name: 'Pilot fixture',
    role,
    password,
  });
  expect(r.status).toBe(200);
  return { id: r.data.id, cookie: r.cookie, password };
}
async function family() {
  const student = await account(),
    parent = await account('parent');
  await db.query(
    "INSERT INTO student_subjects(student_id,subject_id) VALUES($1,'math'),($1,'english')",
    [student.id],
  );
  const invite = await req('/invite', 'POST', {}, student.cookie);
  expect((await req('/link', 'POST', { code: invite.data.code }, parent.cookie)).status).toBe(200);
  return { student, parent };
}
async function consent(f: Awaited<ReturnType<typeof family>>, granted = true, speaking = true) {
  return req(
    '/consent',
    'PUT',
    { student: f.student.id, granted, allow_speaking: speaking, version: CONSENT_VERSION },
    f.parent.cookie,
  );
}
beforeAll(async () => {
  process.env.PILOT_MODE = 'true';
  db = await createDB('memory://');
  await seed(db);
  ai = new AIService(db);
  server = createApp(db, ai).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + (server.address() as any).port + '/api';
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.PILOT_INVITE_CODE;
  delete process.env.NODE_ENV;
});
afterAll(async () => {
  delete process.env.PILOT_MODE;
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});
describe.sequential('Pilot privacy and governance', () => {
  it('concurrent live-network routes do not block another learner and deduplicate speaking turns', async () => {
    const first = await family(),
      second = await family();
    await consent(first);
    await consent(second);
    const prior = ai.provider;
    const priorKey = process.env.OPENAI_API_KEY;
    (ai as any).provider = 'openai';
    process.env.OPENAI_API_KEY = randomUUID();
    let release!: () => void, entered!: () => void;
    const blocked = new Promise<void>((r) => (release = r)),
      ready = new Promise<void>((r) => (entered = r));
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: any, init: any) => {
        const body = JSON.parse(init.body);
        if (body.text) {
          if (++calls === 2) entered();
          await blocked;
        }
        const text = body.text
          ? JSON.stringify({
              correction: 'I visited a museum.',
              explanation: 'Past tense.',
              grammar: 'Correct',
              vocabulary: 'Museum',
              relevance: 'Relevant',
              sentence_complexity: 'Simple clause',
            })
          : 'What did you see?';
        return new Response(
          JSON.stringify({
            status: 'completed',
            output: [{ content: [{ type: 'output_text', text }] }],
          }),
        );
      }),
    );
    try {
      const a = await req(
          '/speaking',
          'POST',
          { mode: 'Conversation', topic: 'Museum' },
          first.student.cookie,
        ),
        b = await req(
          '/speaking',
          'POST',
          { mode: 'Conversation', topic: 'Museum' },
          second.student.cookie,
        );
      const body = { text: 'I visited a museum.', requestId: randomUUID() };
      const one = req('/speaking/' + a.data.id + '/turn', 'POST', body, first.student.cookie),
        duplicate = req('/speaking/' + a.data.id + '/turn', 'POST', body, first.student.cookie),
        two = req(
          '/speaking/' + b.data.id + '/turn',
          'POST',
          { ...body, requestId: randomUUID() },
          second.student.cookie,
        );
      await ready;
      expect((await req('/me', 'GET', undefined, second.student.cookie)).status).toBe(200);
      release();
      expect((await Promise.all([one, duplicate, two])).map((r) => r.status)).toEqual([
        200, 200, 200,
      ]);
      expect(calls).toBe(2);
      expect(
        (await db.query('SELECT * FROM speaking_turns WHERE session_id=$1', [a.data.id])).rows,
      ).toHaveLength(1);
    } finally {
      release?.();
      (ai as any).provider = prior;
      if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = priorKey;
    }
  });
  it('records lesson completion, hints and subject changes and accepts eligible lesson feedback', async () => {
    const f = await family();
    await consent(f);
    await db.query("UPDATE skills SET review_status='approved'");
    await db.query("UPDATE questions SET review_status='approved'");
    let last = '';
    for (let i = 0; i < 3; i++) {
      let lesson = (await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie)).data;
      last = lesson.id;
      expect(
        (await req('/lesson/' + last + '/hint', 'POST', { index: 0 }, f.student.cookie)).status,
      ).toBe(200);
      while (!lesson.completed) {
        const answer = lesson.question
          ? (await db.query('SELECT answer FROM questions WHERE id=$1', [lesson.question.id]))
              .rows[0].answer
          : undefined;
        lesson = (
          await req(
            '/lesson/' + last + '/next',
            'POST',
            { index: lesson.index, answer },
            f.student.cookie,
          )
        ).data;
        expect(lesson.id).toBe(last);
      }
    }
    expect(
      (
        await req(
          '/feedback',
          'POST',
          { screen: 'lesson', context_id: last, rating: 'neutral' },
          f.student.cookie,
        )
      ).status,
    ).toBe(200);
    await req('/subjects', 'PUT', { subjects: ['english', 'physics'] }, f.student.cookie);
    const events = (
      await db.query('SELECT event FROM pilot_events WHERE user_id=$1', [f.student.id])
    ).rows.map((r) => r.event);
    expect(events.filter((e) => e === 'lesson_completed')).toHaveLength(3);
    expect(events.filter((e) => e === 'hint_used')).toHaveLength(3);
    expect(events).toContain('subject_added');
    expect(events).toContain('subject_paused');
  });
  it('requires consent before learning, speaking and provider calls; still allows profile and linking', async () => {
    const f = await family();
    const spy = vi.spyOn(ai, 'generateConversationReply');
    expect((await req('/me', 'GET', undefined, f.student.cookie)).status).toBe(200);
    for (const [path, body] of [
      ['/lesson', { skill: 'linear' }],
      ['/diagnostic', { subject: 'math' }],
      ['/speaking', { mode: 'Conversation', topic: 'Museum' }],
      ['/voice', { text: 'Hello' }],
    ] as const)
      expect((await req(path, 'POST', body, f.student.cookie)).status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
    expect((await consent(f)).data.granted).toBe(true);
    expect(
      (await db.query('SELECT * FROM consent_history WHERE student_id=$1', [f.student.id])).rows[0]
        .version,
    ).toBe(CONSENT_VERSION);
  });
  it('requires approved content and invalidates approval on admin edit', async () => {
    await db.query("UPDATE skills SET review_status='draft' WHERE id='linear'");
    const f = await family();
    await consent(f);
    expect((await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie)).status).toBe(409);
    await db.query("UPDATE skills SET review_status='approved'");
    await db.query("UPDATE questions SET review_status='approved'");
    expect((await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie)).status).toBe(200);
    const admin = await req('/auth/demo', 'POST', { role: 'admin' });
    const q = (await db.query("SELECT * FROM questions WHERE skill_id='linear' LIMIT 1")).rows[0];
    expect((await req('/admin/question', 'PUT', q, admin.cookie)).status).toBe(200);
    expect(
      (await db.query('SELECT review_status FROM questions WHERE id=$1', [q.id])).rows[0]
        .review_status,
    ).toBe('draft');
    await db.query("UPDATE questions SET review_status='approved' WHERE id=$1", [q.id]);
  });
  it('withdrawal and separate Speaking toggle block calls', async () => {
    const f = await family();
    await consent(f, true, false);
    expect((await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie)).status).toBe(200);
    expect(
      (await req('/speaking', 'POST', { mode: 'Conversation', topic: 'Museum' }, f.student.cookie))
        .status,
    ).toBe(403);
    await consent(f, true, true);
    const s = await req(
      '/speaking',
      'POST',
      { mode: 'Conversation', topic: 'Museum' },
      f.student.cookie,
    );
    expect(s.status).toBe(200);
    await consent(f, false, false);
    expect((await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie)).status).toBe(403);
    expect(
      (await db.query('SELECT completed FROM speaking_sessions WHERE id=$1', [s.data.id])).rows[0]
        .completed,
    ).toBe(true);
  });
  it('prevents unrelated parent consent/export/deletion', async () => {
    const f = await family(),
      other = await account('parent');
    expect(
      (
        await req(
          '/consent',
          'PUT',
          { student: f.student.id, granted: true, allow_speaking: true, version: CONSENT_VERSION },
          other.cookie,
        )
      ).status,
    ).toBe(403);
    expect(
      (await req('/privacy/export?student=' + f.student.id, 'GET', undefined, other.cookie)).status,
    ).toBe(403);
    expect(
      (await req('/privacy/transcripts', 'DELETE', { student: f.student.id }, other.cookie)).status,
    ).toBe(403);
  });
  it('exports learning data without credentials, erases transcripts/cache, and deletes account atomically', async () => {
    const f = await family();
    await consent(f);
    const s = await req(
      '/speaking',
      'POST',
      { mode: 'Conversation', topic: 'Museum' },
      f.student.cookie,
    );
    await req(
      '/speaking/' + s.data.id + '/turn',
      'POST',
      { text: 'I go to school yesterday.', requestId: randomUUID() },
      f.student.cookie,
    );
    const exp = await req(
      '/privacy/export?student=' + f.student.id,
      'GET',
      undefined,
      f.parent.cookie,
    );
    expect(exp.data.speaking_turns).toHaveLength(1);
    expect(JSON.stringify(exp.data)).not.toMatch(/password_hash|token_hash/);
    expect((await req('/privacy/transcripts', 'DELETE', {}, f.student.cookie)).status).toBe(200);
    expect(
      (await req('/privacy/export', 'GET', undefined, f.student.cookie)).data.speaking_turns,
    ).toHaveLength(0);
    expect(
      (await req('/privacy/account', 'DELETE', { password: randomUUID() }, f.student.cookie))
        .status,
    ).toBe(403);
    expect(
      (await req('/privacy/account', 'DELETE', { password: f.student.password }, f.student.cookie))
        .status,
    ).toBe(200);
    expect((await req('/me', 'GET', undefined, f.student.cookie)).status).toBe(401);
    expect(
      (await db.query('SELECT 1 FROM pilot_events WHERE user_id=$1', [f.student.id])).rows,
    ).toHaveLength(0);
  });
  it('AI failures fall back to authored hints and explanations without changing deterministic grading', async () => {
    const f = await family();
    await consent(f);
    const s = await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie);
    vi.spyOn(ai, 'generateHint').mockRejectedValue(new Error('Provider down'));
    vi.spyOn(ai, 'analyzeMistake').mockRejectedValue(new Error('Provider down'));
    vi.spyOn(ai, 'explainConcept').mockRejectedValue(new Error('Provider down'));
    const hint = await req(
      '/lesson/' + s.data.id + '/hint',
      'POST',
      { index: 0 },
      f.student.cookie,
    );
    expect(hint.status).toBe(200);
    expect(hint.data.providerWarning).toContain('authored');
    const q = (await db.query('SELECT answer FROM questions WHERE id=$1', [s.data.question.id]))
      .rows[0];
    const result = await req(
      '/lesson/' + s.data.id + '/next',
      'POST',
      { index: 0, answer: (q.answer + 1) % 4 },
      f.student.cookie,
    );
    expect(result.data.feedback.correct).toBe(false);
    expect(result.data.providerWarning).toContain('authored');
    const next = await req(
      '/lesson/' + s.data.id + '/next',
      'POST',
      { index: 1, answer: 0 },
      f.student.cookie,
    );
    expect(next.data.stage).toBe('Explain');
    expect(next.data.explanation).toBeTruthy();
    expect(next.data.providerWarning).toBeTruthy();
  });
  it('blocks late writes after consent withdrawal during a provider request', async () => {
    const f = await family();
    await consent(f);
    const s = await req(
      '/speaking',
      'POST',
      { mode: 'Conversation', topic: 'Museum' },
      f.student.cookie,
    );
    let release!: () => void, entered!: () => void;
    const waiting = new Promise<void>((r) => (release = r)),
      started = new Promise<void>((r) => (entered = r));
    const original = ai.evaluateSpeaking.bind(ai);
    vi.spyOn(ai, 'evaluateSpeaking').mockImplementation(async (t, c) => {
      entered();
      await waiting;
      return original(t, c);
    });
    const pending = req(
      '/speaking/' + s.data.id + '/turn',
      'POST',
      { text: 'Yesterday I visited a museum.', requestId: randomUUID() },
      f.student.cookie,
    );
    await started;
    expect((await consent(f, false, false)).status).toBe(200);
    release();
    expect((await pending).status).toBe(403);
    expect(
      (await db.query('SELECT * FROM speaking_turns WHERE session_id=$1', [s.data.id])).rows,
    ).toHaveLength(0);
  });
  it('records session telemetry idempotently and exposes only aggregate metrics', async () => {
    const f = await family();
    await consent(f);
    const s = await req(
      '/speaking',
      'POST',
      { mode: 'Conversation', topic: 'Museum' },
      f.student.cookie,
    );
    await req('/speaking/' + s.data.id + '/end', 'POST', {}, f.student.cookie);
    await req('/speaking/' + s.data.id + '/end', 'POST', {}, f.student.cookie);
    await req(
      '/telemetry/view',
      'POST',
      { event: 'parent_dashboard_viewed', student: f.student.id },
      f.parent.cookie,
    );
    expect(
      (
        await db.query(
          "SELECT * FROM pilot_events WHERE user_id=$1 AND event='speaking_completed'",
          [f.student.id],
        )
      ).rows,
    ).toHaveLength(1);
    const m = await metrics(db);
    expect(m.speaking_sessions).toBeGreaterThan(0);
    expect(m.parent_dashboard_views).toBeGreaterThan(0);
    expect(JSON.stringify(m)).not.toContain(f.student.id);
    expect((await req('/admin/pilot', 'GET', undefined, f.student.cookie)).status).toBe(403);
  });
  it('retains transcripts for at most the configured session lifetime and detects abandoned lessons', async () => {
    const f = await family();
    await consent(f);
    const s = await req(
      '/speaking',
      'POST',
      { mode: 'Conversation', topic: 'Museum' },
      f.student.cookie,
    );
    await req(
      '/speaking/' + s.data.id + '/turn',
      'POST',
      { text: 'I visited a museum yesterday.', requestId: randomUUID() },
      f.student.cookie,
    );
    await db.query("UPDATE speaking_sessions SET created_at=now()-interval '31 days' WHERE id=$1", [
      s.data.id,
    ]);
    const l = await req('/lesson', 'POST', { skill: 'linear' }, f.student.cookie);
    await db.query("UPDATE lesson_sessions SET created_at=now()-interval '25 hours' WHERE id=$1", [
      l.data.id,
    ]);
    await transaction(db, () => purgeExpired(db));
    expect(
      (await db.query('SELECT * FROM speaking_turns WHERE session_id=$1', [s.data.id])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "SELECT * FROM pilot_events WHERE session_id=$1 AND event='lesson_abandoned'",
          [l.data.id],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('enforces invite-only registration and production secure cookies', async () => {
    process.env.PILOT_INVITE_CODE = randomUUID();
    expect(
      (
        await req('/auth/register', 'POST', {
          name: 'Test',
          email: randomUUID() + '@example.test',
          password: randomUUID(),
          role: 'student',
        })
      ).status,
    ).toBe(403);
    delete process.env.PILOT_INVITE_CODE;
    const s = await account();
    process.env.NODE_ENV = 'production';
    const email = (await db.query('SELECT email FROM users WHERE id=$1', [s.id])).rows[0].email;
    const login = await req('/auth/login', 'POST', { email, password: s.password });
    expect(login.headers.get('set-cookie')).toMatch(/Secure/);
    expect(login.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(login.headers.get('set-cookie')).toMatch(/SameSite=Strict/);
  });
  it('validates production settings without silently using demo or local database', () => {
    expect(() => validateConfig({ NODE_ENV: 'production' })).toThrow();
    expect(() =>
      validateConfig({
        NODE_ENV: 'production',
        ENABLE_DEMO: 'false',
        DATABASE_URL: 'postgresql://localhost/pilot',
        APP_ORIGIN: 'https://learnmap.example.test',
      }),
    ).not.toThrow();
  });
  it('return indicators use eligible cohorts and not all new registrations', async () => {
    const s = await account();
    await db.query("UPDATE users SET created_at=now()-interval '9 days' WHERE id=$1", [s.id]);
    await track(db, s.id, 'login');
    const m = await metrics(db);
    expect(m.day7.eligible).toBeGreaterThan(0);
    expect(m.day7.returned).toBeLessThanOrEqual(m.day7.eligible);
  });
});
