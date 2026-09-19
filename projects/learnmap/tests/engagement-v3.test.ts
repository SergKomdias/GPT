import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createDB, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
import { AIService } from '../server/ai';

let db: DB;
let server: Server;
let base = '';

async function req(path: string, method = 'GET', body?: unknown, cookie = '') {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
  };
}

async function account(role: 'student' | 'parent' = 'student') {
  const response = await req('/auth/register', 'POST', {
    email: randomUUID() + '@example.test',
    name: role === 'student' ? 'Student' : 'Parent',
    role,
    password: randomUUID(),
  });
  expect(response.status).toBe(200);
  return { ...response.data, cookie: response.cookie };
}

describe.sequential('LearnMap v3 engagement safeguards', () => {
  beforeAll(async () => {
    process.env.PILOT_MODE = 'false';
    db = await createDB('memory://');
    await seed(db);
    server = createApp(db, new AIService(db)).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + (server.address() as any).port + '/api';
  });

  afterAll(async () => {
    delete process.env.PILOT_MODE;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  });

  it('accepts I-dont-know as explicit non-guessing evidence in Physics diagnostic', async () => {
    const student = await account();
    await db.query("INSERT INTO student_subjects(student_id,subject_id) VALUES($1,'physics')", [
      student.id,
    ]);
    await db.query(
      "UPDATE student_profiles SET grade=10,country='Ukraine',physics_curriculum='UA' WHERE student_id=$1",
      [student.id],
    );
    const start = await req('/diagnostic', 'POST', { subject: 'physics' }, student.cookie);
    expect(start.status).toBe(200);
    const answer = await req(
      '/diagnostic/' + start.data.id + '/answer',
      'POST',
      { questionId: start.data.question.id, answer: -1 },
      student.cookie,
    );
    expect(answer.status).toBe(200);
    expect(answer.data.correct).toBe(false);
    const saved = (
      await db.query(
        'SELECT answer,correct FROM diagnostic_answers WHERE session_id=$1 AND question_id=$2',
        [start.data.id, start.data.question.id],
      )
    ).rows[0];
    expect(saved.answer).toBe(-1);
    expect(saved.correct).toBe(false);
  });

  it('resumes the same active English diagnostic and accepts I-dont-know', async () => {
    const student = await account();
    await db.query("INSERT INTO student_subjects(student_id,subject_id) VALUES($1,'english')", [
      student.id,
    ]);
    const first = await req('/english-diagnostic', 'POST', {}, student.cookie);
    expect(first.status).toBe(200);
    const resumed = await req('/english-diagnostic', 'POST', {}, student.cookie);
    expect(resumed.status).toBe(200);
    expect(resumed.data.id).toBe(first.data.id);
    expect(resumed.data.task.id).toBe(first.data.task.id);
    expect(['choice', 'short']).toContain(first.data.task.kind);
    if (first.data.task.kind === 'choice') {
      const result = await req(
        '/english-diagnostic/' + first.data.id + '/answer',
        'POST',
        { taskId: first.data.task.id, answer: -1 },
        student.cookie,
      );
      expect(result.status).toBe(200);
      expect(result.data.correct).toBe(false);
    }
  });

  it('returns a selected-word translation without exposing answer keys', async () => {
    const student = await account();
    await db.query("INSERT INTO student_subjects(student_id,subject_id) VALUES($1,'english')", [
      student.id,
    ]);
    const translated = await req(
      '/english-diagnostic/translate',
      'POST',
      { word: 'however' },
      student.cookie,
    );
    expect(translated.status).toBe(200);
    expect(translated.data).toEqual({ word: 'however', translation: 'однак' });
  });

  it('allows linked family messaging and blocks an unrelated parent', async () => {
    const student = await account();
    const parent = await account('parent');
    const stranger = await account('parent');
    await db.query('INSERT INTO parent_student_links(parent_id,student_id) VALUES($1,$2)', [
      parent.id,
      student.id,
    ]);

    const sentByStudent = await req(
      '/family/messages',
      'POST',
      { body: 'Як пройшов тест?' },
      student.cookie,
    );
    expect(sentByStudent.status).toBe(200);

    const parentView = await req(
      '/family/messages?student=' + student.id,
      'GET',
      undefined,
      parent.cookie,
    );
    expect(parentView.status).toBe(200);
    expect(parentView.data.at(-1).body).toBe('Як пройшов тест?');

    const reply = await req(
      '/family/messages',
      'POST',
      { student: student.id, body: 'Бачу, дякую!' },
      parent.cookie,
    );
    expect(reply.status).toBe(200);

    const studentView = await req('/family/messages', 'GET', undefined, student.cookie);
    expect(studentView.data.map((row: any) => row.body)).toEqual([
      'Як пройшов тест?',
      'Бачу, дякую!',
    ]);

    const forbidden = await req(
      '/family/messages?student=' + student.id,
      'GET',
      undefined,
      stranger.cookie,
    );
    expect(forbidden.status).toBe(403);
  });
});
