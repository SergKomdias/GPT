import { createDB } from './db';
import { seed } from './seed';
const db = await createDB();
await seed(db);
await db.close();
console.log('Schema and sample curriculum ready.');
