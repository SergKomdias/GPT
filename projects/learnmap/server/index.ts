import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { validateConfig } = await import('./config');
validateConfig();
const { createDB, transaction } = await import('./db');
const { purgeExpired } = await import('./pilot');
const { seed } = await import('./seed');
const { createApp } = await import('./app');
const db = await createDB();
try {
  await transaction(db, () => seed(db));
  await transaction(db, () => purgeExpired(db));
} catch (error) {
  await db.close();
  throw error;
}
const cleanup = setInterval(
  () =>
    void transaction(db, () => purgeExpired(db)).catch(() =>
      console.error('Retention cleanup failed'),
    ),
  3600000,
);
cleanup.unref();
const port = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 3100 : 3110));
const server = createApp(db).listen(port, process.env.HOST || '127.0.0.1', () =>
  console.log(`LearnMap API http://127.0.0.1:${port} · ${process.env.AI_PROVIDER || 'mock'} AI`),
);
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanup);
  server.close(() => {
    void db.close().catch(() => {
      console.error('LearnMap database could not close cleanly.');
      process.exitCode = 1;
    });
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('error', () => {
  console.error('LearnMap could not listen on its configured port.');
  clearInterval(cleanup);
  void db.close().finally(() => {
    process.exitCode = 1;
  });
});
