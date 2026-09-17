import { describe, it, expect } from 'vitest';
import { updateScore, status, priority, chooseDiagnostic } from '../server/domain';
import { seedSkills, sampleQuestion } from '../server/content';
describe('learning evidence', () => {
  it('independent work earns more mastery than five hints', () =>
    expect(updateScore(44, true, 0)).toBeGreaterThan(updateScore(44, true, 5)));
  it('mistakes reduce mastery, with boundaries at 0 and 100', () => {
    expect(updateScore(40, false, 0)).toBeLessThan(40);
    expect(updateScore(0, false, 0)).toBe(0);
    expect(updateScore(100, true, 0)).toBe(100);
  });
  it('implements every exact mastery status boundary', () => {
    expect([0, 39, 40, 59, 60, 79, 80, 94, 95, 100].map(status)).toEqual([
      'gap',
      'gap',
      'learning',
      'learning',
      'developing',
      'developing',
      'mastered',
      'mastered',
      'strong',
      'strong',
    ]);
  });
  it('prioritizes a weak prerequisite over its dependent', () => {
    const a = { id: 'a', mastery_score: 30, confidence_score: 0.2, prerequisites: [] };
    const b = { id: 'b', mastery_score: 40, confidence_score: 0.2, prerequisites: ['a'] };
    expect(priority(a, [a, b])).toBeGreaterThan(priority(b, [a, b]));
  });
  it('returns to a prerequisite after an incorrect diagnostic answer', () => {
    const skills = [
      { id: 'base', prerequisites: [] },
      { id: 'advanced', prerequisites: ['base'] },
    ];
    const qs = [
      { id: 'a', skill_id: 'advanced', difficulty: 2 },
      { id: 'b', skill_id: 'base', difficulty: 1 },
    ];
    expect(
      chooseDiagnostic(
        qs,
        skills,
        { skill: 'advanced', difficulty: 2, asked: ['a'], streak: 0 },
        false,
      )?.id,
    ).toBe('b');
  });
  it('raises difficulty and stops after eight diagnostic questions', () => {
    const qs = [
      { id: 'a', skill_id: 'base', difficulty: 1 },
      { id: 'b', skill_id: 'base', difficulty: 2 },
    ];
    const skills = [{ id: 'base', prerequisites: [] }];
    expect(
      chooseDiagnostic(qs, skills, { skill: 'base', difficulty: 1, asked: ['a'], streak: 1 }, true)
        ?.id,
    ).toBe('b');
    expect(chooseDiagnostic(qs, skills, { asked: Array(8).fill('x') })).toBeNull();
  });
  it('has a valid acyclic curriculum with nine answerable questions per skill', () => {
    const ids = new Set(seedSkills.map((s) => s.id));
    for (const s of seedSkills) {
      for (const pre of s.pre) expect(ids.has(pre)).toBe(true);
      for (let n = 0; n < 9; n++) {
        const q = sampleQuestion(s.id, n);
        expect(q.options).toHaveLength(4);
        expect(q.options[q.answer]).toBeTruthy();
        expect(new Set(q.options).size, q.id + JSON.stringify(q.options)).toBe(4);
        expect(q.hints).toHaveLength(5);
      }
    }
  });
});
