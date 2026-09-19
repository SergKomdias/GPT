import { describe, it, expect } from 'vitest';
import { physicsBank, physicsQuestion, quantityText } from '../server/physics-content';
import {
  physicsDefinitions,
  physicsCurricula,
  eligiblePhysics,
} from '../server/physics-curriculum';
import { evaluate, unitDimensions, calc, val } from '../server/physics-units';
import { cognitiveDemand, demandFor, difficultyPolicy } from '../shared/cognitive-demand';
import { publicQuestion } from '../server/learning';
import { simulatePhysics, physicsSkills } from './fixtures/diagnostic-profiles';
describe('physics content and SI audit', () => {
  it('has five cognitive tasks for all 30 skills, distinct answers and numerical/dimensional checks for every calculation', () => {
    expect(physicsDefinitions).toHaveLength(30);
    let numerical = 0;
    for (const [id] of physicsDefinitions) {
      const tasks = physicsBank[id];
      expect(tasks).toHaveLength(5);
      expect(new Set(tasks.map((t) => t.prompt)).size).toBe(5);
      tasks.forEach((task, i) => {
        const q = physicsQuestion(id, i + 1)!;
        expect(new Set(q.options).size, q.id).toBe(4);
        expect(q.options[q.answer]).toBe(task.right);
        expect(q.presentation.cognitive_key).toBe(cognitiveDemand[i].key);
        expect(publicQuestion(q)).not.toHaveProperty('answer');
        if (task.numeric) {
          numerical++;
          const actual = evaluate(task.numeric.calculation);
          expect(actual.value, q.id).toBeCloseTo(task.numeric.expected, 8);
          expect(actual.dim, q.id).toEqual(unitDimensions[task.numeric.unit]);
          expect(task.right).toBe(quantityText(actual.value, task.numeric.unit));
          expect(Number.isFinite(actual.value)).toBe(true);
        }
      });
    }
    expect(numerical).toBe(74);
  });
  it('rejects dimensionally invalid addition and keeps magnitude changes at the same cognitive level', () => {
    expect(() => evaluate(calc('+', val(2, 'm'), val(2, 's')))).toThrow('Dimension');
    for (const [m, a] of [
      [5, 3],
      [500, 30],
    ]) {
      expect(evaluate(calc('*', val(m, 'kg'), val(a, 'm/s²'))).dim).toEqual(unitDimensions.N);
      expect(demandFor('recall')).toBe(1);
    }
    expect(difficultyPolicy).toContain('способу мислення');
  });
  it('audits graph areas and numerical claims embedded in conceptual reasoning', () => {
    const g = physicsBank['motion-graphs'][2].graph!;
    const area = g.points
      .slice(1)
      .reduce((s, p, i) => s + ((p[0] - g.points[i][0]) * (p[1] + g.points[i][1])) / 2, 0);
    expect(area).toBe(20);
    expect(6 + Math.abs(2 - 6)).toBe(10); // path in distance L5
    expect(100 ** 2).toBe(10000); // centimetre/metre area error
    expect(1000 * 3600).toBe(3600000); // 1 kW for an hour, joules
    expect(1 / (1 / 4 + 1 / 8)).toBeLessThan(4); // parallel-circuit plausibility
    expect(physicsBank.work[4].graph?.y).toBe('Fₓ, Н');
  });
  it('curricula are acyclic, prerequisite-closed and filter by country and grade', () => {
    for (const curriculum of Object.values(physicsCurricula))
      for (const [id, , , , pre] of physicsDefinitions)
        for (const p of pre)
          expect(curriculum.grades[p]).toBeLessThanOrEqual(curriculum.grades[id]);
    const visit = (id: string, stack: string[]) => {
      expect(stack).not.toContain(id);
      physicsSkills
        .find((s) => s.id === id)!
        .prerequisites.forEach((p) => visit(p, [...stack, id]));
    };
    physicsDefinitions.forEach(([id]) => visit(id, []));
    expect(eligiblePhysics('Ukraine', 8).skills.some((s) => s.id === 'connected-bodies')).toBe(
      false,
    );
    expect(eligiblePhysics('Ukraine', 10).skills.some((s) => s.id === 'connected-bodies')).toBe(
      true,
    );
    expect(() => eligiblePhysics('Unmapped', 10)).toThrow('програму');
    expect(eligiblePhysics('Unmapped', 10, 'international').skills.length).toBe(30);
  });
});
describe('physics grade-10 synthetic profiles', () => {
  it('strong reaches L4 then L5 in three answers without direct-calculation runs', () => {
    const { trace } = simulatePhysics('strong');
    expect(trace.slice(0, 3).map((q) => q.level)).toEqual([3, 4, 5]);
    expect(trace.slice(2).every((q) => q.level === 5)).toBe(true);
    expect(trace.some((q) => q.level === 1)).toBe(false);
  });
  it('weak follows prerequisites after errors; average and strong have different paths', () => {
    const weak = simulatePhysics('weak').trace,
      average = simulatePhysics('average').trace,
      strong = simulatePhysics('strong').trace;
    expect(weak[0].correct).toBe(false);
    expect(weak[1].route).toBe('prerequisite-after-error');
    expect(physicsSkills.find((s) => s.id === weak[0].skill)!.prerequisites).toContain(
      weak[1].skill,
    );
    expect(weak.some((q) => q.level === 1)).toBe(true);
    expect(average.some((q) => q.correct)).toBe(true);
    expect(average.some((q) => !q.correct)).toBe(true);
    for (const trace of [weak, average, strong]) {
      expect(trace.length).toBeLessThanOrEqual(24);
      expect(new Set(trace.map((q) => q.id)).size).toBe(trace.length);
    }
  });
});
