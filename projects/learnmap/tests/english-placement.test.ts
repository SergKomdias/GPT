import { describe, it, expect } from 'vitest';
import { englishProfiles, simulateEnglish } from './fixtures/diagnostic-profiles';
import {
  englishPlacementTasks,
  readingPassages,
  cefrLevels,
} from '../server/english-placement-content';
import {
  countsAsProficiency,
  englishMap,
  gradeEnglish,
  publicEnglishTask,
  strandEstimate,
  type EnglishObservation,
} from '../server/english-placement';
describe('CEFR routing and profile maps', () => {
  for (const profile of englishProfiles)
    it(`places ${profile} with twelve placement questions and six targeted gap checks`, () => {
      const result = simulateEnglish(profile);
      expect(result.state.placementCount).toBe(12);
      expect(result.trace).toHaveLength(18);
      expect(result.trace[0].level).toBe(3);
      expect(result.map.placement_cefr).toBe(
        profile === 'A2' ? 'A2' : profile === 'B2' ? 'B2' : 'B1',
      );
      expect(result.map.estimated_cefr).toBeNull();
      for (const strand of ['writing', 'listening', 'speaking'])
        expect(result.map.strands[strand].estimated_cefr).toBeNull();
      expect(new Set(result.trace.map((t) => t.id)).size).toBe(18);
    });
  it('strong escalates to B2/C1 immediately while weak falls back and weak B1 exposes vocabulary gaps', () => {
    expect(
      simulateEnglish('B2')
        .trace.slice(0, 3)
        .map((t) => t.level),
    ).toEqual([3, 4, 5]);
    expect(simulateEnglish('B2').trace.every((t) => t.level >= 3)).toBe(true);
    expect(simulateEnglish('A2').trace[1].level).toBe(2);
    expect(simulateEnglish('weakB1').map.strands.vocabulary.estimated_cefr).toBe('A2');
    expect(simulateEnglish('strongB1').map.strands.vocabulary.estimated_cefr).toBe('B1');
    expect(simulateEnglish('B2').map.strands.grammar.estimated_cefr).toBe('B2');
  });
});
const observation = (
  strand: any,
  kind: any,
  extra: Partial<EnglishObservation> = {},
): EnglishObservation => ({
  id: 'fixture',
  strand,
  kind,
  subskill: 'fixture',
  level: 4,
  correct: true,
  weight: 1,
  ...extra,
});
describe('modality-specific evidence', () => {
  it('recognition cannot establish Writing or Speaking, nor text-only Listening', () => {
    for (const strand of ['writing', 'speaking', 'listening']) {
      const rows = Array.from({ length: 20 }, (_, i) =>
        observation(strand, 'choice', { id: String(i), estimatedLevel: 5 }),
      );
      expect(rows.some(countsAsProficiency)).toBe(false);
      expect(strandEstimate(strand as any, rows).level).toBeNull();
    }
  });
  it('a transcript hint reduces listening weight and cannot independently certify the level', () => {
    const independent = observation('listening', 'listening', { audioVerified: true });
    const assisted = { ...independent, weight: 0.25, assisted: true };
    expect(strandEstimate('listening', [independent]).estimated_cefr).toBe('B2');
    expect(strandEstimate('listening', [assisted]).estimated_cefr).toBeNull();
    expect(strandEstimate('listening', [assisted]).coverage).toBeLessThan(
      strandEstimate('listening', [independent]).coverage,
    );
  });
  it('requires three actual voice responses and keeps acoustics unassessed even with transcript AI', () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      observation('speaking', 'speaking', {
        id: String(i),
        correct: null,
        estimatedLevel: 4,
        audioVerified: true,
      }),
    );
    expect(strandEstimate('speaking', rows.slice(0, 2)).estimated_cefr).toBeNull();
    expect(strandEstimate('speaking', rows).estimated_cefr).toBe('B2');
    expect(englishMap(rows).pronunciation).toBeNull();
    expect(englishMap(rows).acoustic_fluency).toBeNull();
  });
});
describe('English content', () => {
  it('has authentic passages of the specified lengths and all five reading purposes at every level', () => {
    const limits = [
      [50, 120],
      [50, 120],
      [150, 300],
      [250, 500],
      [250, 500],
    ];
    readingPassages.forEach((passage, i) => {
      const count = passage.trim().split(/\s+/).length;
      expect(count).toBeGreaterThanOrEqual(limits[i][0]);
      expect(count).toBeLessThanOrEqual(limits[i][1]);
      expect(
        englishPlacementTasks
          .filter((t) => t.strand === 'reading' && t.level === i + 1)
          .map((t) => t.subskill),
      ).toEqual(['gist', 'detail', 'inference', 'meaning-context', 'author-intention']);
    });
  });
  it('covers A1–C1, contextual language, transformations and productive tasks; never leaks scripts or keys', () => {
    for (let level = 1; level <= cefrLevels.length; level++)
      for (const strand of ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking'])
        expect(englishPlacementTasks.some((t) => t.strand === strand && t.level === level)).toBe(
          true,
        );
    expect(
      englishPlacementTasks.filter((t) => t.kind === 'short' && t.level >= 4).length,
    ).toBeGreaterThanOrEqual(3);
    for (const task of englishPlacementTasks) {
      expect(publicEnglishTask(task)).not.toHaveProperty('answer');
      expect(publicEnglishTask(task)).not.toHaveProperty('accepted');
      expect(publicEnglishTask(task)).not.toHaveProperty('script');
      if (task.options) expect(new Set(task.options).size).toBe(4);
      if (task.accepted) expect(gradeEnglish(task, task.accepted[0].toUpperCase())).toBe(true);
      if (task.strand === 'writing') expect(task.kind).toBe('writing');
      if (task.strand === 'speaking') expect(task.kind).toBe('speaking');
    }
  });
});
