import { describe, it, expect } from 'vitest';
import { retentionFor, validTimezone, localDay, masteryStatus } from '../shared/learning';
describe('retention integrity', () => {
  const row = (session_id: string, day: number, correct = true, independent = true) => ({
    session_id,
    correct,
    independent,
    created_at: new Date(Date.UTC(2026, 8, day, 10)),
    local_day: '2026-09-' + String(day).padStart(2, '0'),
  });
  it('requires at least two independent delayed successes', () => {
    expect(retentionFor([row('a', 1), row('a', 1), row('b', 3)]).retention_count).toBe(0);
    expect(retentionFor([row('a', 1), row('a', 1), row('b', 3), row('b', 3)]).retention_count).toBe(
      1,
    );
  });
  it('a failed or assisted review cannot establish retained proficiency', () => {
    const prior = [row('a', 1), row('a', 1)];
    expect(
      retentionFor([...prior, row('b', 3), row('b', 3), row('b', 3, false), row('b', 3, false)])
        .retention_count,
    ).toBe(0);
    expect(
      retentionFor([...prior, row('b', 3, true, false), row('b', 3, true, false)]).retention_count,
    ).toBe(0);
  });
  it('same-day sessions do not count as spaced checks and high score alone is insufficient', () => {
    expect(retentionFor([row('a', 1), row('a', 1), row('b', 1), row('b', 1)]).retention_count).toBe(
      0,
    );
    expect(
      masteryStatus({
        mastery_score: 100,
        confidence_score: 0.95,
        independent_count: 9,
        evidence_days: 5,
        retention_count: 0,
      }),
    ).toBe('developing');
  });
  it('validates zones and distinguishes a UTC midnight from a local day boundary', () => {
    expect(validTimezone('Europe/Kyiv')).toBe(true);
    expect(validTimezone('not-a-timezone')).toBe(false);
    expect(localDay('2026-09-17T23:50:00Z', 'America/Los_Angeles')).toBe(
      localDay('2026-09-18T00:10:00Z', 'America/Los_Angeles'),
    );
  });
});
