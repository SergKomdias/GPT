import { it, expect } from 'vitest';
import { createDB } from '../server/db';
import { seed } from '../server/seed';
import { physicsDefinitions } from '../server/physics-curriculum';
import { englishPlacementTasks } from '../server/english-placement-content';
it('physics migration preserves legacy meaning; repeated seeding preserves reviewed content', async () => {
  const db = await createDB('memory://');
  try {
    await seed(db);
    await db.query(
      'INSERT INTO questions(id,skill_id,difficulty,prompt,options,answer,reasoning,hints) VALUES(\'force-0\',\'force\',1,\'{"uk":"Legacy wording"}\',\'["1","2","3","4"]\',2,\'{}\',\'[]\')',
    );
    await db.query("INSERT INTO diagnostic_questions(question_id) VALUES('force-0')");
    await db.query("DELETE FROM schema_migrations WHERE id='physics-diagnostic-v4'");
    await seed(db);
    expect(
      (await db.query("SELECT prompt,answer FROM questions WHERE id='force-0'")).rows[0],
    ).toEqual({ prompt: { uk: 'Legacy wording' }, answer: 2 });
    expect(
      (await db.query("SELECT * FROM diagnostic_questions WHERE question_id='force-0'")).rows,
    ).toHaveLength(0);
    await db.query("UPDATE questions SET review_status='approved' WHERE id='physics-v4-force-1'");
    await db.query(
      "UPDATE english_assessment_items SET review_status='approved' WHERE id='en-v4-writing-3'",
    );
    await seed(db);
    expect(
      (await db.query("SELECT review_status FROM questions WHERE id='physics-v4-force-1'")).rows[0]
        .review_status,
    ).toBe('approved');
    expect(
      (
        await db.query(
          "SELECT review_status FROM english_assessment_items WHERE id='en-v4-writing-3'",
        )
      ).rows[0].review_status,
    ).toBe('approved');
    expect((await db.query('SELECT * FROM english_assessment_items')).rows).toHaveLength(
      englishPlacementTasks.length,
    );
    expect(
      (
        await db.query(
          "SELECT q.id FROM questions q JOIN diagnostic_questions d ON d.question_id=q.id JOIN skills s ON s.id=q.skill_id WHERE s.subject_id='physics'",
        )
      ).rows,
    ).toHaveLength(physicsDefinitions.length * 5);
  } finally {
    await db.close();
  }
});
