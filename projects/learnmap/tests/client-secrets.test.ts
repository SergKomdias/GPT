import { it, expect } from 'vitest';
import { build } from 'vite';
import { randomUUID } from 'node:crypto';
it('does not expose server credentials or invite secrets in production client assets', async () => {
  const names = ['OPENAI_API_KEY', 'DATABASE_URL', 'ADMIN_PASSWORD', 'PILOT_INVITE_CODE'];
  const before = names.map((n) => process.env[n]),
    sentinels = names.map(() => randomUUID());
  try {
    names.forEach((n, i) => (process.env[n] = sentinels[i]));
    const result = await build({ logLevel: 'silent', build: { write: false } });
    const builds = Array.isArray(result) ? result : [result];
    const text = builds
      .flatMap((r) =>
        'output' in r ? r.output.map((o) => (o.type === 'chunk' ? o.code : String(o.source))) : [],
      )
      .join('\n');
    expect(text.length).toBeGreaterThan(1000);
    for (const secret of sentinels) expect(text).not.toContain(secret);
  } finally {
    names.forEach((n, i) => {
      if (before[i] === undefined) delete process.env[n];
      else process.env[n] = before[i];
    });
  }
});
