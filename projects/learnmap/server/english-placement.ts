import {
  cefrLevels,
  englishPlacementTasks,
  type EnglishTask,
  type Strand,
} from './english-placement-content';
export type EnglishObservation = {
  id: string;
  strand: Strand;
  subskill: string;
  level: number;
  kind: EnglishTask['kind'];
  correct: boolean | null;
  weight: number;
  estimatedLevel?: number | null;
  assisted?: boolean;
  audioVerified?: boolean;
};
export type EnglishState = {
  asked: string[];
  band: number;
  phase: 'placement' | 'gaps' | 'production' | 'complete';
  current?: string;
  observations: EnglishObservation[];
  placementCount: number;
  placementLevel?: number;
  audioReady?: string;
  assisted?: string[];
  skipped?: string[];
  started: number;
  deleted?: boolean;
};
export function normalizeEnglish(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function gradeEnglish(task: EnglishTask, answer: unknown) {
  if (task.kind === 'choice' || task.kind === 'listening')
    return typeof answer === 'number' && answer === task.answer;
  if (task.kind === 'short')
    return (
      typeof answer === 'string' &&
      task.accepted!.some((a) => normalizeEnglish(a) === normalizeEnglish(answer))
    );
  throw Error('Productive proficiency requires structured assessment');
}
export function countsAsProficiency(o: EnglishObservation) {
  if (o.weight <= 0) return false;
  if (o.strand === 'writing') return o.kind === 'writing' && !!o.estimatedLevel;
  if (o.strand === 'speaking')
    return o.kind === 'speaking' && o.audioVerified === true && !!o.estimatedLevel;
  if (o.strand === 'listening') return o.kind === 'listening' && o.audioVerified === true;
  return ['choice', 'short'].includes(o.kind);
}
const receptive: Strand[] = ['grammar', 'vocabulary', 'reading'];
export function strandEstimate(strand: Strand, observations: EnglishObservation[]) {
  const rows = observations.filter((o) => o.strand === strand && countsAsProficiency(o));
  let level: number | null = null;
  if (strand === 'writing' || strand === 'speaking') {
    if (rows.length >= (strand === 'speaking' ? 3 : 1))
      level = Math.min(...rows.map((o) => o.estimatedLevel || 1));
  } else {
    // Establish a level by independent successes at/above that level, never an average of percentages.
    for (let l = 1; l <= 5; l++)
      if (
        rows.filter((o) => o.level >= l && o.correct).reduce((s, o) => s + o.weight, 0) >=
        (strand === 'listening' ? 0.5 : 1.5)
      )
        level = l;
  }
  const weight = rows.reduce((s, o) => s + o.weight, 0);
  const subskills = [
    ...new Set(englishPlacementTasks.filter((t) => t.strand === strand).map((t) => t.subskill)),
  ];
  const coverage = receptive.includes(strand)
    ? subskills.reduce(
        (n, subskill) =>
          n + Math.max(0, ...rows.filter((o) => o.subskill === subskill).map((o) => o.weight)),
        0,
      ) / subskills.length
    : Math.min(1, weight / (strand === 'writing' ? 2 : 3));
  const label = (o: EnglishObservation) => `${o.subskill} (${cefrLevels[o.level - 1]})`;
  return {
    level,
    estimated_cefr: level ? cefrLevels[level - 1] : null,
    confidence: !level ? 'insufficient' : weight >= 5 ? 'medium' : 'low',
    coverage,
    strengths: [...new Set(rows.filter((o) => o.correct || o.estimatedLevel).map(label))],
    gaps: [...new Set(rows.filter((o) => o.correct === false).map(label))],
    evidence: rows.length,
  };
}
export function englishMap(observations: EnglishObservation[]) {
  const strands = Object.fromEntries(
    (['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking'] as Strand[]).map(
      (s) => [s, strandEstimate(s, observations)],
    ),
  );
  const receptiveLevels = receptive
    .map((s) => strands[s].level)
    .filter((l): l is number => l !== null)
    .sort((a, b) => a - b);
  // At least two assessed receptive domains; use the lower of two or the median of three.
  const placement =
    receptiveLevels.length >= 2
      ? receptiveLevels[Math.floor((receptiveLevels.length - 1) / 2)]
      : null;
  const allAssessed = Object.values(strands).every((s) => s.level !== null);
  const overall = allAssessed
    ? Math.min(
        placement!,
        strands.writing.level!,
        strands.listening.level!,
        strands.speaking.level!,
      )
    : null;
  return {
    estimated_cefr: overall ? cefrLevels[overall - 1] : null,
    placement_cefr: placement ? cefrLevels[placement - 1] : null,
    scope: allAssessed ? 'provisional-six-domain' : 'receptive-placement-only',
    confidence: !placement
      ? 'insufficient'
      : allAssessed
        ? 'low'
        : receptive.every((s) => strands[s].confidence === 'medium')
          ? 'medium'
          : 'low',
    coverage: Math.round((Object.values(strands).reduce((s, r) => s + r.coverage, 0) / 6) * 100),
    strands,
    acoustic_fluency: null,
    pronunciation: null,
  };
}
export function nextEnglish(
  state: EnglishState,
  pool = englishPlacementTasks,
  lastCorrect?: boolean,
): EnglishTask | null {
  const remaining = pool.filter(
    (t) => !state.asked.includes(t.id) && !state.skipped?.includes(t.id),
  );
  if (state.phase === 'placement') {
    if (lastCorrect !== undefined)
      state.band = Math.max(1, Math.min(5, state.band + (lastCorrect ? 1 : -1)));
    if (state.placementCount >= 12) {
      const estimate = englishMap(state.observations).placement_cefr;
      state.placementLevel = estimate ? cefrLevels.indexOf(estimate) + 1 : Math.max(1, state.band);
      state.phase = 'gaps';
    } else {
      const strand = receptive[state.placementCount % 3];
      const eligible = remaining.filter(
        (t) => t.strand === strand && ['choice', 'short'].includes(t.kind),
      );
      eligible.sort(
        (a, b) =>
          Math.abs(a.level - state.band) - Math.abs(b.level - state.band) ||
          (state.placementCount >= 3
            ? Number(b.kind === 'short') - Number(a.kind === 'short')
            : 0) ||
          a.id.localeCompare(b.id),
      );
      return eligible[0] || null;
    }
  }
  if (state.phase === 'gaps') {
    const gapCount = state.observations.length - state.placementCount;
    if (gapCount < 6) {
      const strand = receptive[gapCount % 3];
      const failures = state.observations.filter((o) => o.strand === strand && o.correct === false);
      const level = Math.max(
        1,
        Math.min(state.placementLevel || 3, (failures.at(-1)?.level || 6) - 1),
      );
      const eligible = remaining.filter(
        (t) => t.strand === strand && ['choice', 'short'].includes(t.kind),
      );
      eligible.sort(
        (a, b) =>
          Math.abs(a.level - level) - Math.abs(b.level - level) ||
          Number(failures.some((o) => o.subskill === b.subskill)) -
            Number(failures.some((o) => o.subskill === a.subskill)) ||
          a.id.localeCompare(b.id),
      );
      return eligible[0] || null;
    }
    state.phase = 'production';
  }
  if (state.phase === 'production') {
    const level = state.placementLevel || 3;
    for (const strand of ['writing', 'listening', 'speaking'] as Strand[]) {
      const count =
        state.observations.filter((o) => o.strand === strand).length +
        (state.skipped || []).filter((id) => pool.find((t) => t.id === id)?.strand === strand)
          .length;
      if (count < (strand === 'speaking' ? 3 : 1)) {
        const task = remaining.filter((t) => t.strand === strand && t.level === level)[0];
        if (task) return task;
      }
    }
  }
  state.phase = 'complete';
  return null;
}
export function publicEnglishTask(task: EnglishTask) {
  const {
    answer: _answer,
    accepted: _accepted,
    script: _script,
    reason: _reason,
    ...visible
  } = task;
  return { ...visible, cefr: cefrLevels[task.level - 1] };
}
