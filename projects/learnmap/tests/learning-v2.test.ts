import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createDB, transaction, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
import { AIService } from '../server/ai';
import {
  evidence,
  snapshot,
  chooseDiagnostic,
  diagnosticMetrics,
  subjectSummary,
} from '../server/domain';
import { masteryStatus, localDay, weekStart, streakFor, updateScore } from '../shared/learning';
import { seedSkills, sampleQuestion } from '../server/content';
let db: DB, server: Server, base: string;
class SlowAI extends AIService {
  calls = 0;
  wait: Promise<void> | null = null;
  entered: () => void = () => {};
  override async evaluateSpeaking(text: string, context: string) {
    this.calls++;
    this.entered();
    if (this.wait) await this.wait;
    return super.evaluateSpeaking(text, context);
  }
  transcriptions = 0;
  override async transcribeSpeech(bytes: Buffer, mime: string) {
    this.transcriptions++;
    return super.transcribeSpeech(bytes, mime);
  }
}
let ai: SlowAI;
async function req(path: string, method = 'GET', body?: unknown, cookie = '') {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0] || '',
  };
}
async function student(subjects: string[]) {
  const registration = await req('/auth/register', 'POST', {
    email: randomUUID() + '@example.test',
    password: randomUUID(),
    name: 'Fictional learner',
    role: 'student',
  });
  const p = await req(
    '/profile',
    'PUT',
    {
      name: 'Fictional learner',
      age: 15,
      grade: 10,
      country: 'Ukraine',
      learning_language: 'en',
      interface_language: 'en',
      subjects,
      timezone: 'Europe/Kyiv',
      daily_minutes: 30,
    },
    registration.cookie,
  );
  expect(p.status).toBe(200);
  return { id: registration.data.id, cookie: registration.cookie };
}
beforeAll(async () => {
  db = await createDB('memory://');
  await seed(db);
  ai = new SlowAI(db);
  server = createApp(db, ai).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + (server.address() as any).port + '/api';
});
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});
describe.sequential('learning v2 regression', () => {
  it('offers a shorter recheck for a previously well-assessed resumed subject', async () => {
    const s = await student(['physics', 'english']);
    await db.query(
      "INSERT INTO student_skill_mastery(id,student_id,skill_id,mastery_score,confidence_score) SELECT $1||id,$1,id,70,.5 FROM skills WHERE subject_id='physics'",
      [s.id],
    );
    await req('/subjects', 'PUT', { subjects: ['english'] }, s.cookie);
    await req('/subjects', 'PUT', { subjects: ['english', 'physics'] }, s.cookie);
    const diagnostic = await req('/diagnostic', 'POST', { subject: 'physics' }, s.cookie);
    expect(diagnostic.status).toBe(200);
    expect(diagnostic.data.metrics.recheck).toBe(true);
    expect(diagnostic.data.metrics.maxQuestions).toBe(12);
  });
  it('caps one session at +8 and one local day at +12, with replay idempotency', async () => {
    const s = await student(['math']);
    await db.query(
      'INSERT INTO student_skill_mastery(id,student_id,skill_id,mastery_score,confidence_score) VALUES($1,$2,$3,44,.2)',
      [randomUUID(), s.id, 'quadratic'],
    );
    const now = new Date('2026-09-01T10:00:00Z');
    for (let n = 0; n < 8; n++)
      await transaction(db, () =>
        evidence(db, s.id, 'quadratic', true, 0, 10, 'answer', 'lesson1', 'q' + n, now),
      );
    let m = (await db.query('SELECT * FROM student_skill_mastery WHERE student_id=$1', [s.id]))
      .rows[0];
    expect(m.mastery_score).toBe(52);
    expect(m.retention_count).toBe(0);
    expect(masteryStatus(m)).not.toBe('mastered');
    await transaction(db, () =>
      evidence(db, s.id, 'quadratic', true, 0, 10, 'answer', 'lesson1', 'q0', now),
    );
    expect(
      (await db.query('SELECT * FROM skill_evidence WHERE student_id=$1', [s.id])).rows,
    ).toHaveLength(8);
    for (let n = 0; n < 4; n++)
      await transaction(db, () =>
        evidence(db, s.id, 'quadratic', true, 0, 10, 'answer', 'lesson2', 'r' + n, now),
      );
    m = (await db.query('SELECT * FROM student_skill_mastery WHERE student_id=$1', [s.id])).rows[0];
    expect(m.mastery_score).toBe(56);
    expect(m.evidence_days).toBe(1);
  });
  it('requires independent evidence and spaced successful sessions for Mastered/Strong', async () => {
    expect(masteryStatus({ mastery_score: 99, confidence_score: 0.1 })).toBe('developing');
    const s = await student(['math']);
    await db.query(
      'INSERT INTO student_skill_mastery(id,student_id,skill_id,mastery_score,confidence_score) VALUES($1,$2,$3,76,.2)',
      [randomUUID(), s.id, 'linear'],
    );
    for (const [session, day] of [0, 2, 5, 13, 21].entries()) {
      for (let n = 0; n < 3; n++)
        await transaction(db, () =>
          evidence(
            db,
            s.id,
            'linear',
            true,
            0,
            30,
            'answer',
            's' + session,
            'q' + (session * 3 + n),
            new Date(Date.UTC(2026, 8, 1 + day, 10)),
          ),
        );
      const m = (await db.query('SELECT * FROM student_skill_mastery WHERE student_id=$1', [s.id]))
        .rows[0];
      if (session === 0) {
        expect(m.mastery_score).toBe(84);
        expect(masteryStatus(m)).toBe('developing');
      }
      if (session === 2) {
        expect(m.retention_count).toBe(2);
        expect(masteryStatus(m)).toBe('mastered');
      }
      if (session === 4) expect(masteryStatus(m)).toBe('strong');
    }
  });
  it('hints and repeated practice do not manufacture independent confidence', async () => {
    const s = await student(['physics']);
    for (let n = 0; n < 5; n++)
      await transaction(db, () => evidence(db, s.id, 'force', true, 5, 10, 'answer', 's', 'q' + n));
    const m = (await db.query('SELECT * FROM student_skill_mastery WHERE student_id=$1', [s.id]))
      .rows[0];
    expect(m.independent_count).toBe(0);
    expect(m.confidence_score).toBeLessThan(0.1);
    expect(m.mastery_score).toBe(50);
  });
  for (const ids of [['english'], ['physics'], ['math', 'physics'], ['english', 'physics']])
    it('filters every learning surface for ' + ids.join('+'), async () => {
      const s = await student(ids),
        snap = (await req('/snapshot', 'GET', undefined, s.cookie)).data;
      expect(snap.subjects.map((s: any) => s.id).sort()).toEqual([...ids].sort());
      expect(snap.skills.every((s: any) => ids.includes(s.subject_id))).toBe(true);
      expect(snap.plan.every((p: any) => ids.includes(p.subject))).toBe(true);
      expect(snap.report.subjects.map((s: any) => s.id).sort()).toEqual([...ids].sort());
      if (ids.length === 1) expect(snap.plan.length).toBe(1);
      const inactive = ['math', 'physics', 'english'].find((id) => !ids.includes(id));
      if (inactive)
        expect((await req('/diagnostic', 'POST', { subject: inactive }, s.cookie)).status).toBe(
          403,
        );
    });
  it('adds, pauses and resumes a subject without losing its mastery or history', async () => {
    const s = await student(['english']);
    expect((await req('/subjects', 'PUT', { subjects: [] }, s.cookie)).status).toBe(400);
    await req('/subjects', 'PUT', { subjects: ['english', 'physics'] }, s.cookie);
    expect((await req('/diagnostic', 'POST', { subject: 'physics' }, s.cookie)).status).toBe(200);
    await transaction(db, () => evidence(db, s.id, 'force', true, 0, 35, 'answer', 'p', 'force-a'));
    const before = (await req('/snapshot', 'GET', undefined, s.cookie)).data.skills.find(
      (k: any) => k.id === 'force',
    ).mastery_score;
    await req('/subjects', 'PUT', { subjects: ['english'] }, s.cookie);
    let snap = (await req('/snapshot', 'GET', undefined, s.cookie)).data;
    expect(snap.events).toHaveLength(0);
    expect(snap.subjectSelections.find((s: any) => s.id === 'physics').selection_status).toBe(
      'paused',
    );
    expect(snap.plan.every((p: any) => p.subject === 'english')).toBe(true);
    await req('/subjects', 'PUT', { subjects: ['english', 'physics'] }, s.cookie);
    snap = (await req('/snapshot', 'GET', undefined, s.cookie)).data;
    expect(snap.skills.find((s: any) => s.id === 'force').mastery_score).toBe(before);
    expect(snap.events).toHaveLength(1);
  });
  it('parents see not-selected rather than a zero or weak subject', async () => {
    const s = await student(['english']),
      p = await req('/auth/register', 'POST', {
        email: randomUUID() + '@example.test',
        password: randomUUID(),
        name: 'Fictional parent',
        role: 'parent',
      });
    const code = (await req('/invite', 'POST', {}, s.cookie)).data.code;
    await req('/link', 'POST', { code }, p.cookie);
    const snap = (await req('/snapshot?student=' + s.id, 'GET', undefined, p.cookie)).data;
    expect(snap.report.subjects).toHaveLength(1);
    expect(snap.subjectSelections.find((s: any) => s.id === 'math').selection_status).toBe(
      'not-selected',
    );
    expect(snap.subjectSelections.find((s: any) => s.id === 'math').mastery).toBeUndefined();
  });
  it('hides the subject percentage when coverage is low', () => {
    const summary = subjectSummary(
      Array.from({ length: 20 }, (_, i) => ({
        id: '' + i,
        mastery_score: 90,
        confidence_score: i === 0 ? 0.9 : 0,
      })),
    );
    expect(summary.assessed).toBe(1);
    expect(summary.coverage).toBe(0.05);
    expect(summary.mastery).toBeNull();
  });
  it('diagnostic explores all branches and continues beyond eight questions', () => {
    const skills = seedSkills
        .filter((s) => s.subject === 'physics')
        .map((s) => ({ ...s, subject_id: s.subject, topic_id: s.topic, prerequisites: s.pre })),
      qs = skills.flatMap((s) => Array.from({ length: 9 }, (_, n) => sampleQuestion(s.id, n))),
      state: any = { asked: [], skill: skills[0].id, difficulty: 1, streak: 0 };
    let q;
    while ((q = chooseDiagnostic(qs, skills, state, true))) {
      state.asked.push(q.id);
      state.skill = q.skill_id;
      state.difficulty = q.difficulty;
      expect(state.asked.length).toBeLessThanOrEqual(24);
    }
    const metrics = diagnosticMetrics(qs, skills, state);
    expect(state.asked.length).toBeGreaterThan(8);
    expect(metrics.branches).toBe(metrics.totalBranches);
    expect(metrics.coverage).toBeGreaterThanOrEqual(0.7);
    expect(metrics.confidence).toBeGreaterThanOrEqual(0.6);
  });
  it('long but poor speaking is activity only and does not raise mastery', async () => {
    const s = await student(['english']);
    const session = (
      await req('/speaking', 'POST', { mode: 'Conversation', topic: 'Travel' }, s.cookie)
    ).data;
    const before = (
      await db.query(
        "SELECT * FROM student_skill_mastery WHERE student_id=$1 AND skill_id='speaking'",
        [s.id],
      )
    ).rows;
    const r = await req(
      '/speaking/' + session.id + '/turn',
      'POST',
      { text: 'I go to school yesterday and blue blue seven yes yes.', requestId: randomUUID() },
      s.cookie,
    );
    expect(r.status).toBe(200);
    expect(r.data.change.after).toBe(r.data.change.before);
    expect(r.data.feedback.pronunciation).toBe('Not assessed');
    expect(
      (
        await db.query(
          "SELECT * FROM student_skill_mastery WHERE student_id=$1 AND skill_id='speaking'",
          [s.id],
        )
      ).rows,
    ).toEqual(before);
    await req('/speaking/' + session.id + '/end', 'POST', {}, s.cookie);
    const calls = ai.calls;
    expect(
      (
        await req(
          '/speaking/' + session.id + '/turn',
          'POST',
          { text: 'Another long but bad bad blue sentence.', requestId: randomUUID() },
          s.cookie,
        )
      ).status,
    ).toBe(400);
    expect(ai.calls).toBe(calls);
    const audio = await fetch(base + '/speaking/' + session.id + '/transcribe', {
      method: 'POST',
      headers: { Cookie: s.cookie, 'Content-Type': 'audio/webm' },
      body: Buffer.from('fixture'),
    });
    expect(audio.status).toBe(400);
    expect(ai.transcriptions).toBe(0);
  });
  it('slow AI releases the database and duplicate requests share one provider call', async () => {
    const s = await student(['english']),
      other = await student(['physics']),
      session = (
        await req('/speaking', 'POST', { mode: 'Conversation', topic: 'Travel' }, s.cookie)
      ).data;
    let release!: () => void, entered!: () => void;
    ai.wait = new Promise((r) => (release = r));
    const started = new Promise<void>((r) => (entered = r));
    ai.entered = entered;
    const calls = ai.calls,
      body = { text: 'I travelled by train yesterday.', requestId: randomUUID() };
    const first = req('/speaking/' + session.id + '/turn', 'POST', body, s.cookie);
    await started;
    const duplicate = req('/speaking/' + session.id + '/turn', 'POST', body, s.cookie);
    try {
      const read = await Promise.race([
        req('/snapshot', 'GET', undefined, other.cookie),
        new Promise<never>((_, reject) => {
          const t = setTimeout(() => reject(Error('Database blocked by AI')), 1000);
          t.unref();
        }),
      ]);
      expect(read.status).toBe(200);
      expect(
        (await req('/subjects', 'PUT', { subjects: ['physics', 'math'] }, other.cookie)).status,
      ).toBe(200);
    } finally {
      release();
      ai.wait = null;
    }
    expect((await first).status).toBe(200);
    expect((await duplicate).status).toBe(200);
    expect(ai.calls - calls).toBe(1);
    expect(
      (await db.query('SELECT * FROM speaking_turns WHERE session_id=$1', [session.id])).rows,
    ).toHaveLength(1);
  });
  it('rechecks completed state after a slow external call', async () => {
    const s = await student(['english']),
      session = (
        await req('/speaking', 'POST', { mode: 'Conversation', topic: 'Travel' }, s.cookie)
      ).data;
    let release!: () => void, entered!: () => void;
    ai.wait = new Promise((r) => (release = r));
    const started = new Promise<void>((r) => (entered = r));
    ai.entered = entered;
    const pending = req(
      '/speaking/' + session.id + '/turn',
      'POST',
      { text: 'I enjoyed my trip last year.', requestId: randomUUID() },
      s.cookie,
    );
    await started;
    await req('/speaking/' + session.id + '/end', 'POST', {}, s.cookie);
    release();
    ai.wait = null;
    expect((await pending).status).toBe(400);
    expect(
      (await db.query('SELECT * FROM speaking_turns WHERE session_id=$1', [session.id])).rows,
    ).toHaveLength(0);
  });
  it('weekly delta compares start/end on the same assessed cohort', async () => {
    const s = await student(['physics']);
    await transaction(db, () =>
      evidence(
        db,
        s.id,
        'force',
        true,
        0,
        10,
        'answer',
        'before',
        'a',
        new Date('2026-09-13T10:00:00Z'),
      ),
    );
    await transaction(db, () =>
      evidence(
        db,
        s.id,
        'force',
        true,
        0,
        20,
        'answer',
        'after',
        'b',
        new Date('2026-09-15T10:00:00Z'),
      ),
    );
    await transaction(db, () =>
      evidence(
        db,
        s.id,
        'mass',
        true,
        0,
        30,
        'answer',
        'new',
        'c',
        new Date('2026-09-15T10:00:00Z'),
      ),
    );
    const snap = await transaction(db, () => snapshot(db, s.id, new Date('2026-09-17T12:00:00Z')));
    expect(snap.report.subjects[0].delta).toBe(4);
    expect(snap.report.subjects[0].comparable_skills).toBe(1);
    expect(snap.report.seconds).toBe(50);
  });
  it('persists local plan/report dates around UTC midnight', async () => {
    const s = await student(['english']);
    await db.query(
      "UPDATE student_profiles SET timezone='America/Los_Angeles' WHERE student_id=$1",
      [s.id],
    );
    const snap = await transaction(db, () => snapshot(db, s.id, new Date('2026-09-14T01:00:00Z')));
    expect(snap.today).toBe('2026-09-13');
    expect(snap.report.period_start).toBe('2026-09-07');
  });
});
describe('local calendar and bounds', () => {
  it('uses IANA local dates across DST and midnight', () => {
    expect(localDay('2026-03-08T09:59:00Z', 'America/Los_Angeles')).toBe('2026-03-08');
    expect(localDay('2026-03-08T10:01:00Z', 'America/Los_Angeles')).toBe('2026-03-08');
    expect(localDay('2026-09-14T01:00:00Z', 'America/Los_Angeles')).toBe('2026-09-13');
    expect(weekStart('2026-09-13')).toBe('2026-09-07');
    expect(streakFor(new Set(['2026-09-12', '2026-09-13']), '2026-09-14')).toBe(2);
  });
  it('does not reward extra same-session correct answers after the cap', () =>
    expect(updateScore(52, true, 0, 8, 8)).toBe(52));
});
