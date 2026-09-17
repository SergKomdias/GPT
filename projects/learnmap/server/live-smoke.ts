// Explicit operator command. Uses fictional content and synthetic speech, never learner records.
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.OPENAI_API_KEY)
  throw new Error('Set OPENAI_API_KEY in the server environment first');
process.env.AI_PROVIDER = 'openai';
const { AIService } = await import('./ai');
const { createDB } = await import('./db');
const { seed } = await import('./seed');
// Always isolate smoke fixtures from staging/production.
delete process.env.DATABASE_URL;
process.env.ENABLE_DEMO = 'false';
const db = await createDB('memory://');
try {
  await seed(db);
  const ai = new AIService(db);
  const skill = (await db.query("SELECT * FROM skills WHERE id='linear'")).rows[0];
  const q = (await db.query("SELECT * FROM questions WHERE skill_id='linear' ORDER BY id LIMIT 1"))
    .rows[0];
  const check = async (name: string, fn: () => Promise<unknown>) => {
    const value = await fn();
    if (!value) throw new Error(name + ' empty');
    console.log(JSON.stringify({ check: name, status: 'passed', at: new Date().toISOString() }));
    return value;
  };
  await check('lesson explanation', () => ai.explainConcept(skill));
  for (let level = 1; level <= 5; level++)
    await check('hint level ' + level, () => ai.generateHint(q, level));
  await check('mistake explanation', () => ai.analyzeMistake(q));
  await check('speaking feedback', () =>
    ai.evaluateSpeaking('I go to the museum yesterday.', 'Discuss a museum visit'),
  );
  await check('contextual reply', () =>
    ai.generateConversationReply('I saw a robot at the museum.', 'Ask about the museum visit'),
  );
  const audio = (await check('TTS', () =>
    ai.synthesizeSpeech('Yesterday I visited a science museum.'),
  )) as Buffer;
  await check('transcription', () => ai.transcribeSpeech(audio, 'audio/mpeg'));
  console.log(
    'Synthetic smoke completed; teacher review and real-device listening remain required.',
  );
} finally {
  await db.close();
}
