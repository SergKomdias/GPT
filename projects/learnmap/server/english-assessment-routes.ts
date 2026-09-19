import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction, type DB } from './db';
import { role } from './auth';
import { requireLearning, pilotMode, track } from './pilot';
import { requireActive } from './learning';
import type { AIService } from './ai';
import { cefrLevels, type EnglishTask } from './english-placement-content';
import {
  englishMap,
  gradeEnglish,
  nextEnglish,
  publicEnglishTask,
  type EnglishObservation,
  type EnglishState,
} from './english-placement';
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
export function englishAssessmentRoutes(
  app: express.Express,
  db: DB,
  ai: AIService,
  authenticated: express.RequestHandler,
) {
  const prefix = '/api/english-diagnostic';
  const tx = <T>(fn: () => Promise<T>) => transaction(db, fn);
  const busy = new Set<string>();
  app.use(prefix, authenticated, role('student'));
  const guard = async (student: string, speaking = false) => {
    await requireLearning(db, student, speaking);
    await requireActive(db, student, 'english');
  };
  const pool = async () =>
    (
      await db.query(
        'SELECT content FROM english_assessment_items ' +
          (pilotMode() ? "WHERE review_status='approved'" : '') +
          ' ORDER BY id',
      )
    ).rows.map((r) => r.content as EnglishTask);
  async function session(student: string, id: string) {
    const row = (
      await db.query('SELECT * FROM english_assessment_sessions WHERE id=$1 AND student_id=$2', [
        id,
        student,
      ])
    ).rows[0];
    if (!row) fail('Сесію не знайдено', 404);
    if (row.completed || row.state.deleted) fail('Діагностику завершено', 409);
    return row as { id: string; state: EnglishState };
  }
  async function current(student: string, id: string, taskId: string) {
    const s = await session(student, id);
    await guard(student);
    if (s.state.current !== taskId) fail('Запитання вже змінилося. Оновіть сторінку.', 409);
    const task = (await pool()).find((t) => t.id === taskId);
    if (!task) fail('Матеріал очікує перевірки викладача', 409);
    return { s, task: task! };
  }
  function view(id: string, state: EnglishState, task?: EnglishTask | null) {
    return {
      id,
      phase: state.phase,
      count: state.asked.length,
      placement_count: state.placementCount,
      placement_level: state.placementLevel ? cefrLevels[state.placementLevel - 1] : null,
      task: task ? publicEnglishTask(task) : null,
      completed: state.phase === 'complete',
      map: englishMap(state.observations),
    };
  }
  async function save(id: string, state: EnglishState) {
    await db.query('UPDATE english_assessment_sessions SET state=$2,completed=$3 WHERE id=$1', [
      id,
      JSON.stringify(state),
      state.phase === 'complete',
    ]);
  }
  app.post(prefix + '/translate', async (req, res) => {
    const student = res.locals.user.id;
    await guard(student);
    const word = z.string().trim().min(1).max(40).parse(req.body.word);
    res.json({ word, translation: await ai.translateEnglishWord(word) });
  });

  app.post(prefix, async (_req, res) => {
    const out = await tx(async () => {
      const student = res.locals.user.id;
      await guard(student);
      const existing = (
        await db.query(
          'SELECT * FROM english_assessment_sessions WHERE student_id=$1 AND NOT completed ORDER BY created_at DESC LIMIT 1',
          [student],
        )
      ).rows[0];
      if (existing && !existing.state?.deleted) {
        const task = (await pool()).find((item) => item.id === existing.state.current);
        if (!task) fail('Поточний матеріал очікує перевірки викладача', 409);
        return view(existing.id, existing.state, task);
      }
      const state: EnglishState = {
        asked: [],
        observations: [],
        band: 3,
        phase: 'placement',
        placementCount: 0,
        started: Date.now(),
      };
      const task = nextEnglish(state, await pool());
      if (!task) fail('Немає затверджених матеріалів English Diagnostic', 409);
      state.current = task!.id;
      const id = randomUUID();
      await db.query(
        'INSERT INTO english_assessment_sessions(id,student_id,state) VALUES($1,$2,$3)',
        [id, student, JSON.stringify(state)],
      );
      await track(db, student, 'diagnostic_started', 'english', id, id);
      return view(id, state, task);
    });
    res.json(out);
  });
  app.get(prefix + '/:id', async (req, res) => {
    const row = (
      await db.query('SELECT * FROM english_assessment_sessions WHERE id=$1 AND student_id=$2', [
        String(req.params.id),
        res.locals.user.id,
      ])
    ).rows[0];
    if (!row) fail('Сесію не знайдено', 404);
    await guard(res.locals.user.id);
    res.json(
      view(
        row.id,
        row.state,
        (await pool()).find((t) => t.id === row.state.current),
      ),
    );
  });
  app.get(prefix + '/:id/results', async (req, res) => {
    await guard(res.locals.user.id);
    const rows = (
      await db.query(
        "SELECT a.task_id,a.original_answer,a.assessment,a.observation FROM english_assessment_answers a JOIN english_assessment_sessions s ON s.id=a.session_id WHERE s.id=$1 AND s.student_id=$2 AND a.observation->>'kind' IN('writing','speaking') ORDER BY a.created_at",
        [String(req.params.id), res.locals.user.id],
      )
    ).rows;
    res.json({ answers: rows });
  });
  async function submit(
    student: string,
    id: string,
    taskId: string,
    answer: unknown,
    voice = false,
  ) {
    const key = id + ':' + taskId;
    if (busy.has(key)) fail('Відповідь уже обробляється. Зачекайте.', 409);
    busy.add(key);
    try {
      const read = await tx(async () => {
        const r = await current(student, id, taskId);
        if (r.task.kind === 'speaking') await guard(student, true);
        return r;
      });
      const { task } = read;
      if (task.kind === 'speaking' && !voice)
        fail('Speaking Assessment потребує голосової відповіді. Текст не є доказом говоріння.');
      let assessment: any = null,
        correct: boolean | null = null,
        weight = 1,
        estimatedLevel: number | null = null;
      if (task.kind === 'writing' || task.kind === 'speaking') {
        const text = z.string().trim().min(1).max(16000).parse(answer);
        try {
          assessment = await ai.evaluateEnglishProduction(
            task.kind,
            task.prompt,
            cefrLevels[task.level - 1],
            text,
          );
        } catch {
          await tx(async () => {
            await current(student, id, taskId);
            await guard(student, task.kind === 'speaking');
            await db.query(
              'INSERT INTO english_assessment_answers VALUES($1,$2,$3,NULL,$4,now()) ON CONFLICT(session_id,task_id) DO UPDATE SET original_answer=$3,assessment=NULL,observation=$4',
              [
                id,
                task.id,
                text,
                JSON.stringify({
                  id: task.id,
                  strand: task.strand,
                  kind: task.kind,
                  subskill: task.subskill,
                  level: task.level,
                  correct: null,
                  weight: 0,
                }),
              ],
            );
          });
          fail(
            'AI тимчасово недоступний. Відповідь збережено без оцінки; повторіть або пропустіть завдання.',
            503,
          );
        }
        estimatedLevel =
          assessment.status === 'assessed' && assessment.estimated_cefr
            ? cefrLevels.indexOf(assessment.estimated_cefr) + 1
            : null;
        const words = text.split(/\s+/).length;
        if (task.kind === 'writing' && words < (task.words?.[0] || 40) / 2) estimatedLevel = null;
        if (task.kind === 'speaking' && words < 8) estimatedLevel = null;
        weight = estimatedLevel ? 1 : 0;
      } else {
        if (task.kind === 'listening' && read.s.state.audioReady !== task.id)
          fail('Спочатку прослухайте аудіо.');
        if (task.kind === 'short') z.string().trim().min(1).max(1000).parse(answer);
        else
          z.number()
            .int()
            .min(-1)
            .max((task.options?.length || 4) - 1)
            .parse(answer);
        correct = gradeEnglish(task, answer);
        if (task.kind === 'listening' && read.s.state.assisted?.includes(task.id)) weight = 0.25;
      }
      return await tx(async () => {
        const { s } = await current(student, id, taskId);
        await guard(student, task.kind === 'speaking');
        if (task.kind === 'listening' && s.state.assisted?.includes(task.id)) weight = 0.25;
        const observation: EnglishObservation = {
          id: task.id,
          strand: task.strand,
          subskill: task.subskill,
          level: task.level,
          kind: task.kind,
          correct,
          weight,
          estimatedLevel,
          audioVerified: voice || task.kind === 'listening',
          assisted: s.state.assisted?.includes(task.id) || false,
        };
        await db.query(
          'INSERT INTO english_assessment_answers VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(session_id,task_id) DO UPDATE SET original_answer=$3,assessment=$4,observation=$5',
          [
            id,
            task.id,
            String(answer),
            assessment ? JSON.stringify(assessment) : null,
            JSON.stringify(observation),
          ],
        );
        s.state.asked.push(task.id);
        s.state.observations.push(observation);
        if (s.state.phase === 'placement') s.state.placementCount++;
        const taskNext = nextEnglish(s.state, await pool(), correct ?? undefined);
        if (!taskNext) s.state.phase = 'complete';
        s.state.current = taskNext?.id;
        s.state.audioReady = undefined;
        await save(id, s.state);
        if (s.state.phase === 'complete')
          await track(db, student, 'diagnostic_completed', 'english', id, id);
        return { ...view(id, s.state, taskNext), assessment, correct };
      });
    } finally {
      busy.delete(key);
    }
  }
  app.post(prefix + '/:id/answer', async (req, res) =>
    res.json(
      await submit(
        res.locals.user.id,
        String(req.params.id),
        z.string().parse(req.body.taskId),
        req.body.answer,
      ),
    ),
  );
  app.post(prefix + '/:id/skip', async (req, res) => {
    res.json(
      await tx(async () => {
        const { s, task } = await current(
          res.locals.user.id,
          String(req.params.id),
          z.string().parse(req.body.taskId),
        );
        if (!['writing', 'listening', 'speaking'].includes(task.kind))
          fail('Це завдання потрібно виконати для placement.');
        s.state.skipped = [...(s.state.skipped || []), task.id];
        const next = nextEnglish(s.state, await pool());
        if (!next) s.state.phase = 'complete';
        s.state.current = next?.id;
        await save(s.id, s.state);
        if (!next)
          await track(db, res.locals.user.id, 'diagnostic_completed', 'english', s.id, s.id);
        return view(s.id, s.state, next);
      }),
    );
  });
  app.post(prefix + '/:id/transcript', async (req, res) => {
    res.json(
      await tx(async () => {
        const { s, task } = await current(
          res.locals.user.id,
          String(req.params.id),
          z.string().parse(req.body.taskId),
        );
        if (task.kind !== 'listening') fail('Це не завдання аудіювання.');
        s.state.assisted = [...new Set([...(s.state.assisted || []), task.id])];
        await save(s.id, s.state);
        return { transcript: task.script, weight: 0.25 };
      }),
    );
  });
  app.post(prefix + '/:id/listen', async (req, res) => {
    const student = res.locals.user.id,
      id = String(req.params.id),
      taskId = z.string().parse(req.body.taskId);
    const { task } = await tx(() => current(student, id, taskId));
    if (task.kind !== 'listening') fail('Це не аудіювання.');
    const bytes = await ai.synthesizeSpeech(task.script!);
    if (!bytes)
      fail(
        'Аудіооцінювання потребує реального аудіо. У демо цей розділ можна пропустити без оцінки.',
        503,
      );
    await tx(async () => {
      const { s } = await current(student, id, taskId);
      s.state.audioReady = taskId;
      await save(id, s.state);
    });
    res.type('audio/mpeg').send(bytes);
  });
  app.post(
    prefix + '/:id/record',
    express.raw({
      type: ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg'],
      limit: '8mb',
    }),
    async (req, res) => {
      const student = res.locals.user.id,
        id = String(req.params.id),
        taskId = z.string().parse(req.headers['x-task-id']);
      const { task } = await tx(async () => {
        await guard(student, true);
        return current(student, id, taskId);
      });
      if (task.kind !== 'speaking') fail('Це не Speaking Assessment.');
      if (!Buffer.isBuffer(req.body) || req.body.length < 100)
        fail('Потрібен непорожній голосовий запис.');
      const transcript = await ai.transcribeSpeech(
        req.body,
        String(req.headers['content-type']).split(';')[0],
      );
      if (transcript.example)
        fail('Демонстраційна транскрипція не встановлює Speaking proficiency.', 503);
      await tx(async () => {
        await guard(student, true);
        await current(student, id, taskId);
      });
      res.json(await submit(student, id, taskId, transcript.text, true));
    },
  );
}
