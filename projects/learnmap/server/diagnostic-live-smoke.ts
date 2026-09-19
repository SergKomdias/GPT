// Explicit, paid operator check: fictional text and synthetic audio only; isolated DB.
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.OPENAI_API_KEY) throw Error('Configure OPENAI_API_KEY on the server first');
process.env.AI_PROVIDER = 'openai';
delete process.env.DATABASE_URL;
const { createDB } = await import('./db');
const { AIService } = await import('./ai');
const { englishPlacementTasks } = await import('./english-placement-content');
const db = await createDB('memory://');
try {
  const ai = new AIService(db);
  const writing =
    'I suggest starting a science club after school. It would help us understand our lessons and learn to work together. We could meet on Wednesday in the laboratory. For the first meeting, I would ask a teacher to help us build paper bridges. Each group could test its bridge and explain why it worked. We would only need paper, tape and some small weights. Students could bring ideas for future meetings. I think the club would be enjoyable because we could discover things ourselves instead of only reading about them.';
  const task = englishPlacementTasks.find((t) => t.kind === 'writing' && t.level === 3)!;
  const assessment = await ai.evaluateEnglishProduction('writing', task.prompt, 'B1', writing);
  if (assessment.status !== 'assessed' || !assessment.dimensions.coherence)
    throw Error('Writing schema failed');
  console.log(
    JSON.stringify({
      check: 'writing structured assessment',
      status: 'passed',
      dimensions: Object.keys(assessment.dimensions),
      at: new Date().toISOString(),
    }),
  );
  const audio = await ai.synthesizeSpeech(
    englishPlacementTasks.find((t) => t.kind === 'listening' && t.level === 3)!.script!,
  );
  if (!audio || audio.length < 100) throw Error('Empty audio');
  console.log(
    JSON.stringify({ check: 'diagnostic listening TTS', status: 'passed', bytes: audio.length }),
  );
  const transcript = await ai.transcribeSpeech(audio, 'audio/mpeg');
  if (transcript.example || transcript.text.length < 30) throw Error('Transcription failed');
  console.log(JSON.stringify({ check: 'synthetic audio transcription', status: 'passed' }));
  const spoken = await ai.evaluateEnglishProduction(
    'speaking',
    'Tell a visitor about the museum workshop arrangements.',
    'B1',
    transcript.text,
  );
  if (spoken.status !== 'assessed' || spoken.pronunciation !== null || spoken.fluency !== null)
    throw Error('Acoustic guard failed');
  console.log(
    JSON.stringify({
      check: 'transcribed speaking language dimensions',
      status: 'passed',
      acoustic_evidence: spoken.acoustic_evidence,
      at: new Date().toISOString(),
    }),
  );
} finally {
  await db.close();
}
