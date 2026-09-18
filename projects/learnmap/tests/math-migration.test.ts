import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDB } from '../server/db';

it('upgrades an existing 1–3 difficulty database to 1–5 and preserves its rows', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'learnmap-math-migration-'));
  const path = join(directory, 'db');
  try {
    const legacy = new PGlite(path);
    try {
      const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
      await legacy.exec(schema.split('ALTER TABLE skills ADD COLUMN IF NOT EXISTS grade_level')[0]);
      await legacy.exec(`
        INSERT INTO subjects VALUES('math','{"uk":"Математика"}');
        INSERT INTO curricula VALUES('math-sample','math','Legacy',10,NULL);
        INSERT INTO topics VALUES('algebra','math-sample','{"uk":"Алгебра"}');
        INSERT INTO skills(id,subject_id,topic_id,title,explanation,sort_order)
          VALUES('linear','math','algebra','{"uk":"Рівняння"}','{"uk":"Пояснення"}',0);
        INSERT INTO questions(id,skill_id,difficulty,prompt,options,answer,reasoning,hints)
          VALUES('linear-0','linear',3,'{"uk":"Старе запитання"}','["1","2","3","4"]',0,'{"uk":"Стара відповідь"}','[]');
      `);
      await expect(
        legacy.query("UPDATE questions SET difficulty=5 WHERE id='linear-0'"),
      ).rejects.toThrow();
    } finally {
      await legacy.close();
    }
    const upgraded = await createDB(path);
    try {
      expect(
        (await upgraded.query("SELECT difficulty,prompt FROM questions WHERE id='linear-0'"))
          .rows[0],
      ).toEqual({ difficulty: 3, prompt: { uk: 'Старе запитання' } });
      await upgraded.query("UPDATE questions SET difficulty=5 WHERE id='linear-0'");
      await expect(
        upgraded.query("UPDATE questions SET difficulty=6 WHERE id='linear-0'"),
      ).rejects.toThrow();
      expect(
        (
          await upgraded.query(
            "SELECT id FROM schema_migrations WHERE id='math-difficulty-five-levels'",
          )
        ).rows,
      ).toHaveLength(1);
    } finally {
      await upgraded.close();
    }
  } finally {
    // Only this test's mkdtemp directory, after both database instances close.
    await rm(directory, { recursive: true, force: true });
  }
});
