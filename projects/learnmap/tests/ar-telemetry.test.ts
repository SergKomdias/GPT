import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createDB, type DB } from '../server/db';
import { seed } from '../server/seed';
import { createApp } from '../server/app';
import { AIService } from '../server/ai';
import { metrics } from '../server/pilot';

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

describe.sequential('AR Lab telemetry', () => {
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

  it('records a completed five-mission set and voluntary continuation without free text', async () => {
    const password = randomUUID();
    const registered = await req('/auth/register', 'POST', {
      email: randomUUID() + '@example.test',
      name: 'AR pilot student',
      role: 'student',
      password,
    });
    expect(registered.status).toBe(200);
    const cookie = registered.cookie;
    const session = randomUUID();

    for (let index = 0; index < 5; index++) {
      const mission = 'mission-' + index;
      expect(
        (
          await req(
            '/telemetry/ar',
            'POST',
            {
              event: 'ar_mission_started',
              session,
              dedupe: session + ':' + mission + ':start',
              seconds: 0,
            },
            cookie,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await req(
            '/telemetry/ar',
            'POST',
            {
              event: 'mission_completed',
              session,
              dedupe: session + ':' + mission + ':complete',
              seconds: 12,
            },
            cookie,
          )
        ).status,
      ).toBe(200);
    }

    expect(
      (
        await req(
          '/telemetry/ar',
          'POST',
          {
            event: 'voluntary_continue',
            session,
            dedupe: session + ':continue',
            seconds: 0,
          },
          cookie,
        )
      ).status,
    ).toBe(200);

    const rows = (
      await db.query(
        'SELECT event,subject_id,session_id,seconds FROM pilot_events WHERE user_id=$1 ORDER BY created_at',
        [registered.data.id],
      )
    ).rows;
    expect(rows.filter((row) => row.event === 'mission_completed')).toHaveLength(5);
    expect(rows.every((row) => row.subject_id === 'physics')).toBe(true);
    expect(rows.every((row) => row.session_id === session)).toBe(true);

    const aggregate = await metrics(db);
    expect(aggregate.ar_completed_sets).toBeGreaterThanOrEqual(1);
    expect(aggregate.ar_voluntary_continue).toBeGreaterThanOrEqual(1);
    expect(aggregate.ar_continue_rate).toBe(1);
  });

  it('rejects arbitrary event names', async () => {
    const password = randomUUID();
    const registered = await req('/auth/register', 'POST', {
      email: randomUUID() + '@example.test',
      name: 'AR invalid event student',
      role: 'student',
      password,
    });
    const response = await req(
      '/telemetry/ar',
      'POST',
      {
        event: 'camera_frame_uploaded',
        session: randomUUID(),
        dedupe: randomUUID(),
        seconds: 0,
      },
      registered.cookie,
    );
    expect(response.status).toBe(400);
  });
});
