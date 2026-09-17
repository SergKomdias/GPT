import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const { createDB } = await import('./db');
const { seed } = await import('./seed');
const { createApp } = await import('./app');
const db = await createDB();
await seed(db);
const port = Number(process.env.PORT || 3100);
const server = createApp(db).listen(port, '127.0.0.1', () =>
  console.log(`LearnMap API http://127.0.0.1:${port} · ${process.env.AI_PROVIDER || 'mock'} AI`),
);
process.on('SIGTERM', () =>
  server.close(() => {
    void db.close();
  }),
);
