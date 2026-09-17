import { beforeAll, afterAll, afterEach, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDB, type DB } from '../server/db';
import { AIService } from '../server/ai';
import { seed } from '../server/seed';
let db: DB, ai: AIService, skill: any, q: any;
const feedback = {
  correction: 'I went yesterday.',
  explanation: 'Use Past Simple.',
  grammar: 'Past tense corrected',
  vocabulary: 'Appropriate museum vocabulary',
  relevance: 'Relevant to the question',
  sentence_complexity: 'One simple clause',
};
const output = (text: string) =>
  new Response(
    JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text }] }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
beforeAll(async () => {
  db = await createDB('memory://');
  await seed(db);
  vi.stubEnv('AI_PROVIDER', 'openai');
  vi.stubEnv('OPENAI_API_KEY', randomUUID());
  ai = new AIService(db);
  skill = (await db.query("SELECT * FROM skills WHERE id='linear'")).rows[0];
  q = (await db.query("SELECT * FROM questions WHERE skill_id='linear' LIMIT 1")).rows[0];
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  vi.unstubAllEnvs();
  await db.close();
});
it('contracts explanations, five progressive hints and mistake explanations with Responses store:false', async () => {
  const mock = vi.fn(async () => output('Authored-compatible explanation'));
  vi.stubGlobal('fetch', mock);
  await ai.explainConcept(skill);
  for (let i = 1; i <= 5; i++) await ai.generateHint(q, i);
  await ai.analyzeMistake(q);
  expect(mock).toHaveBeenCalledTimes(7);
  for (const call of mock.mock.calls as any[]) {
    expect(call[0]).toBe('https://api.openai.com/v1/responses');
    const b = JSON.parse(call[1].body);
    expect(b.store).toBe(false);
    expect(b.model).toBeTruthy();
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
  }
  const calls = mock.mock.calls as any[];
  expect(JSON.parse(calls[1][1].body).input).toContain('level 1');
  expect(JSON.parse(calls[5][1].body).input).toContain('level 5');
});
it('validates structured Speaking dimensions while keeping pronunciation unassessed and conversation contextual', async () => {
  const mock = vi.fn(async (_url: any, init: any) =>
    JSON.parse(init.body).text
      ? output(JSON.stringify(feedback))
      : output('What did you see at the museum?'),
  );
  vi.stubGlobal('fetch', mock);
  const f = await ai.evaluateSpeaking('I go yesterday.', 'Museum visit');
  expect(f.grammar).toBe(feedback.grammar);
  expect(f.pronunciation).toBe('Not assessed');
  expect(f.correct).toBeNull();
  expect(JSON.parse(mock.mock.calls[0][1].body).text.format.strict).toBe(true);
  expect(
    await ai.generateConversationReply(
      'A robot.',
      'Museum visit, previous question: what exhibit?',
    ),
  ).toContain('museum');
  expect(JSON.parse(mock.mock.calls[1][1].body).input).toContain('previous question');
});
it('contracts multipart transcription and binary TTS without persisting audio', async () => {
  const mock = vi.fn(async (url: any) =>
    url.endsWith('transcriptions')
      ? new Response(JSON.stringify({ text: 'Yesterday I visited a museum.' }))
      : new Response(new Uint8Array([73, 68, 51])),
  );
  vi.stubGlobal('fetch', mock);
  const result = await ai.transcribeSpeech(Buffer.from('synthetic'), 'audio/mpeg');
  expect(result.example).toBe(false);
  const calls = mock.mock.calls as any[];
  expect(calls[0][1].body).toBeInstanceOf(FormData);
  expect(calls[0][1].headers['Content-Type']).toBeUndefined();
  expect(calls[0][1].body.get('file').name).toBe('speech.mp3');
  expect(await ai.synthesizeSpeech('Hello')).toEqual(Buffer.from([73, 68, 51]));
});
it('rejects provider failures, malformed feedback and incomplete output', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('private provider details', { status: 429 })),
  );
  await expect(ai.explainConcept(skill)).rejects.toThrow('429');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => output('not JSON')),
  );
  await expect(ai.evaluateSpeaking('Hello', 'Museum')).rejects.toThrow();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ status: 'incomplete', output: [] }))),
  );
  await expect(ai.explainConcept(skill)).rejects.toThrow('incomplete');
});
it('objective grading never calls the live network', async () => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  expect(await ai.evaluateAnswer(q, q.answer)).toEqual({ correct: true });
  expect(await ai.evaluateAnswer(q, (q.answer + 1) % 4)).toEqual({ correct: false });
  expect(mock).not.toHaveBeenCalled();
});
it('simultaneous live adapter calls allow unrelated database work while network waits', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((r) => (release = r));
  let count = 0;
  let entered!: () => void;
  const started = new Promise<void>((r) => (entered = r));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (++count === 2) entered();
      await blocked;
      return output('Explanation');
    }),
  );
  const first = ai.explainConcept(skill),
    second = ai.generateHint(q, 1);
  await started;
  expect((await db.query('SELECT 1 value')).rows[0].value).toBe(1);
  release();
  expect(await Promise.all([first, second])).toEqual(['Explanation', 'Explanation']);
});
