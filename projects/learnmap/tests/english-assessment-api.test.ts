import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createDB, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
import { AIService } from '../server/ai';
import { englishTaskById } from '../server/english-placement-content';
import {
  englishProfiles,
  syntheticCorrect,
  type EnglishProfile,
} from './fixtures/diagnostic-profiles';
import { eraseTranscripts, exportData, deleteUser, CONSENT_VERSION } from '../server/pilot';
let db: DB, server: Server, base: string, ai: AIService;
async function req(path: string, body?: unknown, cookie = '', method = 'POST') {
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
async function account(grade = 10) {
  const user = await req('/auth/register', {
    name: 'Synthetic learner',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
    role: 'student',
  });
  await db.query('UPDATE student_profiles SET grade=$2,onboarded=true WHERE student_id=$1', [
    user.data.id,
    grade,
  ]);
  await db.query(
    "INSERT INTO student_subjects(student_id,subject_id) VALUES($1,'english'),($1,'physics')",
    [user.data.id],
  );
  return user;
}
async function placed(profile: EnglishProfile = 'strongB1', grade = 10) {
  const user = await account(grade);
  let response = await req('/english-diagnostic', {}, user.cookie);
  expect(response.status).toBe(200);
  const trace: any[] = [];
  while (response.data.phase !== 'production' && !response.data.completed) {
    const task = englishTaskById(response.data.task.id)!;
    const correct = syntheticCorrect(profile, task);
    trace.push(response.data.task);
    expect(response.data.task).not.toHaveProperty('answer');
    expect(response.data.task).not.toHaveProperty('accepted');
    const answer =
      task.kind === 'short'
        ? correct
          ? task.accepted![0]
          : 'This is not a valid answer'
        : correct
          ? task.answer
          : (task.answer! + 1) % 4;
    response = await req(
      `/english-diagnostic/${response.data.id}/answer`,
      { taskId: task.id, answer },
      user.cookie,
    );
    expect(response.status).toBe(200);
    if (trace.length > 24) throw Error('Placement loop');
  }
  return { user, data: response.data, trace };
}
const writing =
  'I would like to suggest a school science club because it could help students discover how everyday objects work. We could meet on Wednesday afternoons in the laboratory. During our first meeting, we would build a simple bridge using paper and compare the results. Working in small groups would give everyone a chance to explain an idea and listen to other suggestions. The club would need a teacher and some inexpensive materials. I think it would be both useful and enjoyable, especially for students who are curious but sometimes find lessons too theoretical.';
const assessment = (level = 'B1') =>
  ({
    status: 'assessed',
    estimated_cefr: level,
    dimensions: Object.fromEntries(
      [
        'task_completion',
        'relevance',
        'grammar',
        'vocabulary',
        'coherence',
        'sentence_complexity',
        'interaction',
      ].map((k) => [k, { score: 3, comment: 'Синтетична перевірка контракту' }]),
    ),
    summary: 'Синтетична оцінка, не live.',
    fluency: null,
    pronunciation: null,
    acoustic_evidence: false,
    rubric_version: 'cefr-pilot-v1',
  }) as any;
beforeAll(async () => {
  db = await createDB('memory://');
  await seed(db);
  ai = new AIService(db);
  server = createApp(db, ai).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as any).port}/api`;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});
describe.sequential('English assessment HTTP flows', () => {
  for (const profile of englishProfiles)
    it(`${profile}: CEFR placement ignores school grade and persists the map`, async () => {
      const f = await placed(profile, profile === 'B2' ? 6 : 10);
      expect(f.data.placement_count).toBe(12);
      expect(f.trace).toHaveLength(18);
      expect(f.data.map.placement_cefr).toBe(
        profile === 'B2' ? 'B2' : profile === 'A2' ? 'A2' : 'B1',
      );
      expect(f.data.map.strands.writing.estimated_cefr).toBeNull();
      if (profile === 'B2') expect(f.trace.slice(0, 3).map((t) => t.level)).toEqual([3, 4, 5]);
      const snapshot = await req('/snapshot', undefined, f.user.cookie, 'GET');
      expect(snapshot.data.englishAssessment).toEqual(f.data.map);
    });
  it('stores original productive writing and structured dimensions; failure keeps zero evidence and permits retry', async () => {
    const f = await placed(),
      id = f.data.id,
      taskId = f.data.task.id;
    const evaluator = vi
      .spyOn(ai, 'evaluateEnglishProduction')
      .mockRejectedValueOnce(new Error('provider failed'));
    const failed = await req(
      `/english-diagnostic/${id}/answer`,
      { taskId, answer: writing },
      f.user.cookie,
    );
    expect(failed.status).toBe(503);
    let row = (
      await db.query(
        'SELECT * FROM english_assessment_answers WHERE session_id=$1 AND task_id=$2',
        [id, taskId],
      )
    ).rows[0];
    expect(row.original_answer).toBe(writing);
    expect(row.observation.weight).toBe(0);
    expect(row.assessment).toBeNull();
    evaluator.mockResolvedValue(assessment());
    const saved = await req(
      `/english-diagnostic/${id}/answer`,
      { taskId, answer: writing },
      f.user.cookie,
    );
    expect(saved.status).toBe(200);
    expect(saved.data.map.strands.writing.estimated_cefr).toBe('B1');
    row = (
      await db.query(
        'SELECT * FROM english_assessment_answers WHERE session_id=$1 AND task_id=$2',
        [id, taskId],
      )
    ).rows[0];
    expect(row.original_answer).toBe(writing);
    expect(Object.keys(row.assessment.dimensions)).toContain('coherence');
    const ownResults = await req(
      `/english-diagnostic/${id}/results`,
      undefined,
      f.user.cookie,
      'GET',
    );
    expect(ownResults.data.answers[0].original_answer).toBe(writing);
    const unrelated = await account();
    expect(
      (await req(`/english-diagnostic/${id}/results`, undefined, unrelated.cookie, 'GET')).data
        .answers,
    ).toHaveLength(0);
    expect(
      (await req(`/english-diagnostic/${id}/answer`, { taskId, answer: writing }, f.user.cookie))
        .status,
    ).toBe(409);
  });
  it('serves audio without exposing the transcript, requires delivered audio and discounts transcript-assisted answers', async () => {
    const f = await placed();
    let data = (
      await req(`/english-diagnostic/${f.data.id}/skip`, { taskId: f.data.task.id }, f.user.cookie)
    ).data;
    const task = englishTaskById(data.task.id)!;
    expect(task.kind).toBe('listening');
    expect(data.task).not.toHaveProperty('script');
    expect(
      (
        await req(
          `/english-diagnostic/${data.id}/answer`,
          { taskId: task.id, answer: 0 },
          f.user.cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (await req(`/english-diagnostic/${data.id}/listen`, { taskId: task.id }, f.user.cookie))
        .status,
    ).toBe(503); // mock cannot certify audio
    vi.spyOn(ai, 'synthesizeSpeech').mockResolvedValue(
      Buffer.from('synthetic-audio-for-network-contract'),
    );
    const audio = await fetch(base + `/english-diagnostic/${data.id}/listen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: f.user.cookie },
      body: JSON.stringify({ taskId: task.id }),
    });
    expect(audio.status).toBe(200);
    expect(audio.headers.get('content-type')).toContain('audio/mpeg');
    const transcript = await req(
      `/english-diagnostic/${data.id}/transcript`,
      { taskId: task.id },
      f.user.cookie,
    );
    expect(transcript.data.transcript).toBe(task.script);
    expect(transcript.data.weight).toBe(0.25);
    data = (
      await req(
        `/english-diagnostic/${data.id}/answer`,
        { taskId: task.id, answer: task.answer },
        f.user.cookie,
      )
    ).data;
    const row = (
      await db.query(
        'SELECT observation FROM english_assessment_answers WHERE session_id=$1 AND task_id=$2',
        [data.id, task.id],
      )
    ).rows[0];
    expect(row.observation.weight).toBe(0.25);
    expect(row.observation.audioVerified).toBe(true);
    expect(data.map.strands.listening.estimated_cefr).toBeNull();
  });
  it('rejects typed speaking; three server-transcribed voice responses establish only provisional textual dimensions', async () => {
    const f = await placed();
    let data = f.data;
    for (let i = 0; i < 2; i++)
      data = (
        await req(`/english-diagnostic/${data.id}/skip`, { taskId: data.task.id }, f.user.cookie)
      ).data;
    expect(
      (
        await req(
          `/english-diagnostic/${data.id}/answer`,
          { taskId: data.task.id, answer: 'Typed recognition is not speaking' },
          f.user.cookie,
        )
      ).status,
    ).toBe(400);
    vi.spyOn(ai, 'transcribeSpeech').mockResolvedValue({ text: writing, example: false });
    vi.spyOn(ai, 'evaluateEnglishProduction').mockResolvedValue(assessment());
    for (let i = 0; i < 3; i++) {
      const r = await fetch(base + `/english-diagnostic/${data.id}/record`, {
        method: 'POST',
        headers: { Cookie: f.user.cookie, 'Content-Type': 'audio/webm', 'X-Task-ID': data.task.id },
        body: Buffer.alloc(300, 1),
      });
      expect(r.status).toBe(200);
      data = await r.json();
      expect(data.map.strands.speaking.estimated_cefr).toBe(i < 2 ? null : 'B1');
    }
    expect(data.completed).toBe(true);
    expect(data.map.pronunciation).toBeNull();
    expect(data.map.acoustic_fluency).toBeNull();
    const exported = await exportData(db, f.user.data.id);
    expect(
      (exported.english_assessment_answers as any[]).filter(
        (a) => a.observation.kind === 'speaking',
      ),
    ).toHaveLength(3);
    await eraseTranscripts(db, f.user.data.id);
    expect(
      (
        await db.query(
          "SELECT * FROM english_assessment_answers WHERE session_id=$1 AND observation->>'kind'='speaking'",
          [data.id],
        )
      ).rows,
    ).toHaveLength(0);
    await deleteUser(db, f.user.data.id);
    expect(
      (
        await db.query('SELECT * FROM english_assessment_sessions WHERE student_id=$1', [
          f.user.data.id,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it('rechecks consent and deletion after a slow assessment, without blocking another request', async () => {
    const f = await placed();
    let release!: (a: any) => void, entered!: () => void;
    const started = new Promise<void>((r) => {
      entered = r;
    });
    vi.spyOn(ai, 'evaluateEnglishProduction').mockImplementation(async () => {
      entered();
      return new Promise((r) => {
        release = r;
      });
    });
    const pending = req(
      `/english-diagnostic/${f.data.id}/answer`,
      { taskId: f.data.task.id, answer: writing },
      f.user.cookie,
    );
    await started;
    expect((await req('/snapshot', undefined, f.user.cookie, 'GET')).status).toBe(200);
    await eraseTranscripts(db, f.user.data.id);
    release(assessment());
    expect((await pending).status).toBe(409);
    expect(
      (
        await db.query(
          'SELECT * FROM english_assessment_answers WHERE session_id=$1 AND task_id=$2',
          [f.data.id, f.data.task.id],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('pilot requires consent and approved materials; parent speaking toggle blocks recording', async () => {
    const f = await placed();
    let data = f.data;
    for (let i = 0; i < 2; i++)
      data = (
        await req(`/english-diagnostic/${data.id}/skip`, { taskId: data.task.id }, f.user.cookie)
      ).data;
    vi.stubEnv('PILOT_MODE', 'true');
    expect((await req('/english-diagnostic', {}, f.user.cookie)).status).toBe(403);
    await db.query(
      'INSERT INTO pilot_consent(student_id,version,granted,allow_speaking,granted_at) VALUES($1,$2,true,false,now())',
      [f.user.data.id, CONSENT_VERSION],
    );
    expect((await req('/english-diagnostic', {}, f.user.cookie)).status).toBe(409);
    await db.query("UPDATE english_assessment_items SET review_status='approved'");
    expect((await req('/english-diagnostic', {}, f.user.cookie)).status).toBe(200);
    const r = await fetch(base + `/english-diagnostic/${data.id}/record`, {
      method: 'POST',
      headers: { Cookie: f.user.cookie, 'Content-Type': 'audio/webm', 'X-Task-ID': data.task.id },
      body: Buffer.alloc(300, 1),
    });
    expect(r.status).toBe(403);
    await db.query('UPDATE pilot_consent SET granted=false WHERE student_id=$1', [f.user.data.id]);
    expect(
      (await req(`/english-diagnostic/${data.id}/skip`, { taskId: data.task.id }, f.user.cookie))
        .status,
    ).toBe(403);
  });
  it('physics starts at L3, falls back through prerequisites and enforces country/grade access', async () => {
    const user = await account();
    const first = await req('/diagnostic', { subject: 'physics' }, user.cookie);
    expect(first.status).toBe(200);
    expect(first.data.question.difficulty).toBe(3);
    const q = (await db.query('SELECT * FROM questions WHERE id=$1', [first.data.question.id]))
      .rows[0];
    const next = await req(
      `/diagnostic/${first.data.id}/answer`,
      { questionId: q.id, answer: (q.answer + 1) % 4 },
      user.cookie,
    );
    expect(next.status).toBe(200);
    const pre = (
      await db.query('SELECT prerequisite_id FROM skill_dependencies WHERE skill_id=$1', [
        q.skill_id,
      ])
    ).rows.map((r) => r.prerequisite_id);
    expect(pre).toContain(next.data.question.skill_id);
    await db.query('UPDATE student_profiles SET grade=8 WHERE student_id=$1', [user.data.id]);
    expect((await req('/lesson', { skill: 'connected-bodies' }, user.cookie)).status).toBe(409);
    const snapshot = (await req('/snapshot', undefined, user.cookie, 'GET')).data;
    expect(snapshot.skills.some((s: any) => s.id === 'connected-bodies')).toBe(false);
    await db.query("UPDATE student_profiles SET country='Unmapped' WHERE student_id=$1", [
      user.data.id,
    ]);
    expect((await req('/diagnostic', { subject: 'physics' }, user.cookie)).status).toBe(409);
  });
  it('withdrawal during live evaluation blocks late writes and concurrent duplicates', async () => {
    const f = await placed();
    vi.stubEnv('PILOT_MODE', 'true');
    await db.query("UPDATE english_assessment_items SET review_status='approved'");
    await db.query(
      'INSERT INTO pilot_consent(student_id,version,granted,allow_speaking,granted_at) VALUES($1,$2,true,true,now())',
      [f.user.data.id, CONSENT_VERSION],
    );
    let release!: (a: any) => void, entered!: () => void;
    const started = new Promise<void>((r) => {
      entered = r;
    });
    const spy = vi.spyOn(ai, 'evaluateEnglishProduction').mockImplementation(async () => {
      entered();
      return new Promise((r) => {
        release = r;
      });
    });
    const body = { taskId: f.data.task.id, answer: writing };
    const pending = req(`/english-diagnostic/${f.data.id}/answer`, body, f.user.cookie);
    await started;
    expect((await req(`/english-diagnostic/${f.data.id}/answer`, body, f.user.cookie)).status).toBe(
      409,
    );
    await db.query(
      'UPDATE pilot_consent SET granted=false,withdrawn_at=now() WHERE student_id=$1',
      [f.user.data.id],
    );
    release(assessment());
    expect((await pending).status).toBe(403);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(
      (
        await db.query(
          'SELECT * FROM english_assessment_answers WHERE session_id=$1 AND task_id=$2',
          [f.data.id, f.data.task.id],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('historical recognition cannot appear as productive proficiency in maps or weekly comparisons', async () => {
    const user = await account();
    const skill = (
      await db.query("SELECT id FROM skills WHERE strand_id='writing' ORDER BY id LIMIT 1")
    ).rows[0].id;
    const state = { mastery_score: 95, confidence_score: 0.9 };
    await db.query(
      'INSERT INTO student_skill_mastery(id,student_id,skill_id,mastery_score,confidence_score) VALUES($1,$2,$3,95,0.9)',
      [randomUUID(), user.data.id, skill],
    );
    await db.query(
      "INSERT INTO skill_evidence(id,student_id,skill_id,session_id,question_id,correct,independent,local_day,before_state,after_state,retained,long_retained,created_at) VALUES($1,$2,$3,'legacy','legacy-writing-recognition',true,true,$4,$5,$5,false,false,now())",
      [
        randomUUID(),
        user.data.id,
        skill,
        new Date().toISOString().slice(0, 10),
        JSON.stringify(state),
      ],
    );
    const snap = (await req('/snapshot', undefined, user.cookie, 'GET')).data;
    expect(snap.skills.find((s: any) => s.id === skill).confidence_score).toBe(0);
    expect(snap.englishAssessment.strands.writing.estimated_cefr).toBeNull();
    expect(snap.report.subjects.find((s: any) => s.id === 'english').comparable_skills).toBe(0);
  });
});
