import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
export interface DB {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}
export async function createDB(path = process.env.DATA_DIR || '.data/learnmap'): Promise<DB> {
  let db: DB;
  if (process.env.DATABASE_URL) {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    db = {
      query: (s, p) => client.query(s, p),
      exec: (s) => client.query(s),
      close: () => client.end(),
    };
  } else {
    if (path !== 'memory://') await mkdir(dirname(path), { recursive: true });
    db = new PGlite(path) as unknown as DB;
  }
  await db.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  return db;
}
// Serialize mutations so embedded and pooled PostgreSQL have identical atomic semantics.
let queue: Promise<unknown> = Promise.resolve();
export function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn);
  queue = next.catch(() => {});
  return next;
}
