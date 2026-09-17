import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { validateConfig } = await import('./config');
validateConfig();
const { createDB, transaction } = await import('./db');
const { purgeExpired } = await import('./pilot');
const { seed } = await import('./seed');
const { createApp } = await import('./app');
const db = await createDB();
await transaction(db, () => seed(db));
await transaction(db, () => purgeExpired(db));
const cleanup = setInterval(
  () =>
    void transaction(db, () => purgeExpired(db)).catch(() =>
      console.error('Retention cleanup failed'),
    ),
  3600000,
);
cleanup.unref();
const port = Number(process.env.PORT || 3100);
const server = createApp(db).listen(port, process.env.HOST || '127.0.0.1', () =>
  console.log(`LearnMap API http://127.0.0.1:${port} · ${process.env.AI_PROVIDER || 'mock'} AI`),
);
process.on('SIGTERM', () =>
  server.close(() => {
    void db.close();
  }),
);
