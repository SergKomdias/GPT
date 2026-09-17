import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { createDB, transaction } = await import('./db');
const { purgeExpired } = await import('./pilot');
const db = await createDB();
try {
  await transaction(db, () => purgeExpired(db));
  console.log('Retention cleanup completed');
} finally {
  await db.close();
}
