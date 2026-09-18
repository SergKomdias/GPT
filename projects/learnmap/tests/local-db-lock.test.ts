import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { lockLocalDatabase } from '../server/local-db-lock';

test('a second writer is rejected and a released database can be reopened', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'learnmap-lock-'));
  let release: (() => Promise<void>) | undefined;
  try {
    release = await lockLocalDatabase(directory);
    await expect(lockLocalDatabase(join(directory, '.'))).rejects.toThrow(
      'Another LearnMap process',
    );
    await release();
    release = undefined;
    release = await lockLocalDatabase(directory);
  } finally {
    await release?.();
    await rm(directory, { recursive: true });
  }
});
