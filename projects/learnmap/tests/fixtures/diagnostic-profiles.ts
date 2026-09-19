import { physicsDefinitions, eligiblePhysics } from '../../server/physics-curriculum';
import { physicsQuestion } from '../../server/physics-content';
import { chooseDiagnostic } from '../../server/learning';
import { englishPlacementTasks, type EnglishTask } from '../../server/english-placement-content';
import { nextEnglish, englishMap, type EnglishState } from '../../server/english-placement';
export const physicsSkills = physicsDefinitions.map(([id, , grade, branch, pre], sort_order) => ({
  id,
  subject_id: 'physics',
  grade_level: grade,
  diagnostic_branch: branch,
  topic_id: branch,
  prerequisites: pre,
  sort_order,
}));
export const physicsQuestions = physicsDefinitions.flatMap(([id]) =>
  Array.from({ length: 5 }, (_, i) => physicsQuestion(id, i + 1)!),
);
export function simulatePhysics(profile: 'weak' | 'average' | 'strong') {
  const eligible = eligiblePhysics('Ukraine', 10).skills.map((s) => s.id);
  const skills = physicsSkills.filter((s) => eligible.includes(s.id));
  const state: any = {
    algorithm: 'physics-v4',
    grade: 10,
    targetGrade: 10,
    startLevel: 3,
    band: 3,
    curriculumFloor: 1,
    asked: [],
  };
  const trace: any[] = [];
  let question = chooseDiagnostic(physicsQuestions, skills, state);
  while (question) {
    const skill = skills.find((s) => s.id === question.skill_id)!;
    const ceiling =
      profile === 'strong'
        ? 5
        : profile === 'average'
          ? skill.grade_level >= 10
            ? 3
            : 4
          : skill.grade_level >= 9
            ? 1
            : 2;
    const correct = question.difficulty <= ceiling;
    trace.push({
      id: question.id,
      skill: skill.id,
      level: question.difficulty,
      grade: skill.grade_level,
      route: state.routeReason,
      correct,
    });
    state.asked.push(question.id);
    state.skill = skill.id;
    state.difficulty = question.difficulty;
    if (trace.length > 24) throw Error('Physics failed to stop');
    question = chooseDiagnostic(physicsQuestions, skills, state, correct);
  }
  return { trace, state };
}
export const englishProfiles = ['A2', 'weakB1', 'strongB1', 'B2'] as const;
export type EnglishProfile = (typeof englishProfiles)[number];
export function syntheticCorrect(profile: EnglishProfile, task: EnglishTask) {
  const ceiling =
    profile === 'A2'
      ? 2
      : profile === 'B2'
        ? 4
        : profile === 'weakB1' && task.strand === 'vocabulary'
          ? 2
          : 3;
  return task.level <= ceiling;
}
export function simulateEnglish(profile: EnglishProfile) {
  const state: EnglishState = {
    asked: [],
    observations: [],
    band: 3,
    phase: 'placement',
    placementCount: 0,
    started: 0,
  };
  const trace: { id: string; level: number; strand: string; correct: boolean; phase: string }[] =
    [];
  let task = nextEnglish(state);
  while (task && state.phase !== 'production') {
    const correct = syntheticCorrect(profile, task);
    trace.push({
      id: task.id,
      level: task.level,
      strand: task.strand,
      correct,
      phase: state.phase,
    });
    state.asked.push(task.id);
    state.observations.push({
      id: task.id,
      strand: task.strand,
      subskill: task.subskill,
      level: task.level,
      kind: task.kind,
      correct,
      weight: 1,
    });
    if (state.phase === 'placement') state.placementCount++;
    task = nextEnglish(state, englishPlacementTasks, correct);
    if (trace.length > 24) throw Error('English failed to place');
  }
  return { state, trace, map: englishMap(state.observations), next: task };
}
