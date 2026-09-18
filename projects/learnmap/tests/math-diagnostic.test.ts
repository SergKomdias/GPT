import { describe, expect, it } from 'vitest';
import { mathBank, mathPracticeBank, mathDefinitions, mathQuestion } from '../server/math-content';
import { chooseDiagnostic, diagnosticMetrics, publicQuestion } from '../server/learning';
import { mathSkills, mathQuestions, simulateMath } from './fixtures/math-students';

describe('grade-aware mathematics diagnostic', () => {
  it('strong grade 10 reaches levels 4 and 5 on questions 3 and 4 without elementary detours', () => {
    const { trace, state } = simulateMath('strong');
    expect(trace[0].grade).toBe(9);
    expect(trace.slice(0, 4).map((q) => q.difficulty)).toEqual([2, 3, 4, 5]);
    expect(trace.every((q) => q.grade >= 8 && q.difficulty >= 2)).toBe(true);
    expect(trace.slice(3, 12).every((q) => q.difficulty === 5)).toBe(true);
    expect(trace.slice(3).every((q) => q.difficulty === 5)).toBe(true);
    expect(state.stopReason).toBe('challenge-exhausted');
    expect(new Set(trace.map((q) => q.id)).size).toBe(trace.length);
    expect(trace.length).toBeLessThanOrEqual(24);
    expect(diagnosticMetrics(mathQuestions, mathSkills, state).branches).toBe(5);
  });
  it('weak grade 10 follows actual prerequisite edges after mistakes', () => {
    const { trace } = simulateMath('weak');
    expect(trace[0].grade).toBe(9);
    expect(trace[0].correct).toBe(false);
    expect(trace[1].route).toBe('prerequisite-after-error');
    expect(mathSkills.find((s) => s.id === trace[0].skill)!.prerequisites).toContain(
      trace[1].skill,
    );
    expect(trace.some((q) => q.grade <= 7)).toBe(true);
    for (let i = 1; i < trace.length; i++) {
      if (trace[i].route === 'prerequisite-after-error') {
        expect(trace[i - 1].correct).toBe(false);
        expect(mathSkills.find((s) => s.id === trace[i - 1].skill)!.prerequisites).toContain(
          trace[i].skill,
        );
      }
    }
  });
  it('average grade 10 attempts multi-step work and adapts down after a transfer error', () => {
    const { trace } = simulateMath('average');
    expect(trace.slice(0, 3).map((q) => q.difficulty)).toEqual([2, 3, 4]);
    expect(trace.some((q) => q.correct)).toBe(true);
    expect(trace.some((q) => !q.correct)).toBe(true);
    const error = trace.findIndex((q) => !q.correct);
    expect(trace[error + 1].route).toBe('prerequisite-after-error');
    expect(trace[error + 1].difficulty).toBeLessThan(trace[error].difficulty);
    const mean = (profile: 'weak' | 'average' | 'strong') => {
      const t = simulateMath(profile).trace;
      return t.reduce((sum, q) => sum + q.difficulty, 0) / t.length;
    };
    expect(mean('average')).toBeGreaterThan(mean('weak'));
    expect(mean('strong')).toBeGreaterThan(mean('average'));
  });
  it('rotates equally suitable anchors without lowering demand on a repeated diagnostic', () => {
    const first = simulateMath('strong');
    const second = simulateMath('strong', first.state.asked);
    expect(second.trace[0].id).not.toBe(first.trace[0].id);
    expect(second.trace[0].grade).toBe(9);
    expect(second.trace[0].difficulty).toBe(2);
  });
  it('uses curriculum grade separately from cognitive demand and handles an empty approved pool', () => {
    for (const grade of [6, 8, 10, 11]) {
      const q = chooseDiagnostic(mathQuestions, mathSkills, {
        algorithm: 'math-v3',
        grade,
        asked: [],
      });
      expect(mathSkills.find((s) => s.id === q.skill_id)!.grade_level).toBe(grade - 1);
      expect(q.difficulty).toBe(2);
    }
    expect(
      chooseDiagnostic([], mathSkills, { algorithm: 'math-v3', grade: 10, asked: [] }),
    ).toBeNull();
  });
});

describe('authored mathematics content', () => {
  it('has five distinct cognitive tasks and deterministic choices for every skill, with an acyclic map', () => {
    expect(mathDefinitions).toHaveLength(25);
    expect(mathQuestions).toHaveLength(200);
    const visit = (id: string, stack: string[]) => {
      expect(stack).not.toContain(id);
      const skill = mathSkills.find((s) => s.id === id);
      expect(skill).toBeDefined();
      skill!.prerequisites.forEach((pre) => visit(pre, [...stack, id]));
    };
    for (const skill of mathSkills) {
      visit(skill.id, []);
      const qs = mathQuestions.filter((q) => q.skill_id === skill.id);
      expect(qs.map((q) => q.difficulty)).toEqual([1, 2, 3, 4, 5, 2, 3, 4]);
      expect(new Set(qs.map((q) => q.prompt.uk)).size).toBe(8);
      for (const q of qs) {
        expect(new Set(q.options).size).toBe(4);
        expect(q.options[q.answer]).toBe(
          q.id.includes('-practice-')
            ? mathPracticeBank[skill.id][q.difficulty - 2][1]
            : mathBank[skill.id][q.difficulty - 1][1],
        );
        expect(publicQuestion(q)).not.toHaveProperty('answer');
        expect(publicQuestion(q)).not.toHaveProperty('reasoning');
      }
    }
  });
  it('checks computed keys independently on multi-step and boundary-sensitive items', () => {
    const answer = (skill: string, level: number) => {
      const q = mathQuestion(skill, level - 1)!;
      return q.options[q.answer];
    };
    expect(answer('expressions', 3)).toBe(String(7 ** 2 - 2 * 10));
    expect(answer('triangles', 3)).toBe(String(Math.sqrt(13 ** 2 - 5 ** 2)));
    expect(answer('circles', 3)).toBe(String(2 * Math.sqrt(13 ** 2 - 5 ** 2)));
    expect(answer('volume', 3)).toBe(String(Math.sqrt(2 ** 2 + 3 ** 2 + 6 ** 2)));
    expect(answer('sequences', 3)).toBe(
      String(Array.from({ length: 8 }, (_, i) => 1 + 3 * i).reduce((a, b) => a + b, 0)),
    );
    expect(answer('statistics', 3)).toBe(String((10 * 6 + 20 * 9) / 30));
    expect(answer('probability', 5)).toBe('1/3');
    expect(['HH', 'HT', 'TH', 'TT'].filter((x) => x.includes('H'))).toHaveLength(3);
    expect(answer('rational-expressions', 5)).toBe('Жодного');
    expect(answer('quadratic', 5)).toBe('m>1');
    for (const m of [-2, 0, 1, 1.01, 3]) expect(m - 1 > 0 && m + 1 > 0).toBe(m > 1);
    expect(answer('polynomials', 5)).toBe('a=−2, b=−1; третій корінь 2');
    for (const x of [-1, 1, 2]) expect(x ** 3 - 2 * x ** 2 - x + 2).toBe(0);
  });
});
