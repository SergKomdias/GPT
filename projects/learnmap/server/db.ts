import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { lockLocalDatabase } from './local-db-lock';
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
    const unlock = path === 'memory://' ? async () => {} : await lockLocalDatabase(path);
    try {
      const local = new PGlite(path);
      await local.waitReady;
      db = {
        query: (sql, params) => local.query(sql, params),
        exec: (sql) => local.exec(sql),
        close: async () => {
          try {
            await local.close();
          } finally {
            await unlock();
          }
        },
      };
    } catch (error) {
      await unlock();
      throw error;
    }
  }
  try {
    await db.exec('BEGIN');
    await db.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
    await db.exec('COMMIT');
  } catch (e) {
    try {
      await db.exec('ROLLBACK');
    } finally {
      await db.close();
    }
    throw e;
  }
  return guarded(db);
}
const transactions = new WeakMap<DB, <T>(fn: () => Promise<T>) => Promise<T>>();
function guarded(raw: DB): DB {
  let queue: Promise<unknown> = Promise.resolve();
  const scope = new AsyncLocalStorage<boolean>();
  const enqueue = <T>(fn: () => Promise<T>) => {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  };
  const db: DB = {
    query: (s, p) => (scope.getStore() ? raw.query(s, p) : enqueue(() => raw.query(s, p))),
    exec: (s) => (scope.getStore() ? raw.exec(s) : enqueue(() => raw.exec(s))),
    close: () => enqueue(() => raw.close()),
  };
  transactions.set(db, (fn) =>
    scope.getStore()
      ? fn()
      : enqueue(() =>
          scope.run(true, async () => {
            await raw.exec('BEGIN');
            try {
              const value = await fn();
              await raw.exec('COMMIT');
              return value;
            } catch (e) {
              await raw.exec('ROLLBACK');
              throw e;
            }
          }),
        ),
  );
  return db;
}
export function transaction<T>(db: DB, fn: () => Promise<T>): Promise<T> {
  const tx = transactions.get(db);
  if (!tx) throw new Error('Use createDB for transactional access');
  return tx(fn);
}
