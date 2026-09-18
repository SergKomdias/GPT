import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, realpath } from 'node:fs/promises';

// An OS-owned listener is released even after a crash. Acquire it before PGlite
// touches the directory: PGlite itself does not exclude another Node process.
export async function lockLocalDatabase(directory: string): Promise<() => Promise<void>> {
  await mkdir(directory, { recursive: true });
  const canonical = await realpath(directory);
  const identity = process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  const hash = createHash('sha256').update(identity).digest('hex');
  const lock = createServer((socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    lock.once('error', () =>
      reject(
        new Error(
          'Cannot lock the local LearnMap database. Another LearnMap process may be running. Close it before starting again.',
        ),
      ),
    );
    if (process.platform === 'win32') {
      lock.listen('\\\\.\\pipe\\learnmap-db-' + hash, resolve);
    } else {
      // Port collisions fail closed; they must never allow concurrent writers.
      lock.listen(
        {
          host: '127.0.0.1',
          port: 20000 + (parseInt(hash.slice(0, 8), 16) % 40000),
          exclusive: true,
        },
        resolve,
      );
    }
  });
  lock.unref();
  return () =>
    new Promise<void>((resolve, reject) =>
      lock.close((error) => (error ? reject(error) : resolve())),
    );
}
