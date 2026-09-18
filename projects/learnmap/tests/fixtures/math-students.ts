import { mathDefinitions, mathQuestion } from '../../server/math-content';
import { chooseDiagnostic } from '../../server/learning';

export const mathSkills = mathDefinitions.map(([id, , grade, branch, pre], i) => ({
  id,
  subject_id: 'math',
  grade_level: grade,
  diagnostic_branch: branch,
  topic_id: branch,
  prerequisites: pre,
  sort_order: i,
}));
export const mathQuestions = mathSkills.flatMap((s) =>
  Array.from({ length: 8 }, (_, n) => mathQuestion(s.id, n)!),
);

// Synthetic knowledge profiles, not predictions of real pupils or calibrated ability scores.
// Each threshold is a cognitive ceiling for a curriculum band, independent of route order.
export const grade10Profiles = {
  weak: { grade: 10, ceilings: { foundation: 2, middle: 1, upper: 0 } },
  average: { grade: 10, ceilings: { foundation: 4, middle: 3, upper: 2 } },
  strong: { grade: 10, ceilings: { foundation: 5, middle: 5, upper: 5 } },
};
export function fixtureAnswer(
  profile: keyof typeof grade10Profiles,
  q: (typeof mathQuestions)[number],
) {
  const skill = mathSkills.find((s) => s.id === q.skill_id)!;
  const band = skill.grade_level <= 7 ? 'foundation' : skill.grade_level <= 9 ? 'middle' : 'upper';
  return q.difficulty <= grade10Profiles[profile].ceilings[band];
}
export function simulateMath(profile: keyof typeof grade10Profiles, previous: string[] = []) {
  const state: any = {
    algorithm: 'math-v3',
    grade: grade10Profiles[profile].grade,
    asked: [],
    previous,
    band: 2,
  };
  const trace: {
    id: string;
    skill: string;
    grade: number;
    difficulty: number;
    correct: boolean;
    route: string;
  }[] = [];
  let q = chooseDiagnostic(mathQuestions, mathSkills, state);
  while (q) {
    const correct = fixtureAnswer(profile, q);
    trace.push({
      id: q.id,
      skill: q.skill_id,
      grade: mathSkills.find((s) => s.id === q.skill_id)!.grade_level,
      difficulty: q.difficulty,
      correct,
      route: state.routeReason,
    });
    if (trace.length > 24) throw new Error('Diagnostic did not stop');
    state.asked.push(q.id);
    state.skill = q.skill_id;
    state.difficulty = q.difficulty;
    q = chooseDiagnostic(mathQuestions, mathSkills, state, correct);
  }
  return { trace, state };
}
