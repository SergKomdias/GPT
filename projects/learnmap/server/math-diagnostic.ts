// Grade selects curriculum content; difficulty selects cognitive demand within a skill.
// This routing heuristic is not a calibrated ability score.
export function chooseMathDiagnostic(
  questions: any[],
  skills: any[],
  state: any,
  correct?: boolean,
) {
  const asked = new Set<string>(state.asked);
  const count = (id: string) =>
    questions.filter((q) => asked.has(q.id) && q.skill_id === id).length;
  const remaining = questions.filter((q) => !asked.has(q.id) && count(q.skill_id) < 2);
  if (!remaining.length) return null;
  const target = state.targetGrade || Math.max(1, Math.min(11, (state.grade || 10) - 1));
  const branch = (s: any) => s.diagnostic_branch || s.topic_id;
  const tested = new Set(skills.filter((s) => count(s.id)).map(branch));
  const band =
    state.asked.length && correct !== undefined
      ? Math.max(1, Math.min(5, (state.band || state.difficulty || 2) + (correct ? 1 : -1)))
      : state.startLevel || 2;
  state.band = band;
  let candidates = skills.filter((s) => remaining.some((q) => q.skill_id === s.id));
  const current = skills.find((s) => s.id === state.skill);
  let reason = 'grade-anchor';
  if (correct === false && current) {
    const prerequisites = candidates.filter((s) => current.prerequisites.includes(s.id));
    if (prerequisites.length) {
      candidates = prerequisites;
      reason = 'prerequisite-after-error';
    } else if (candidates.some((s) => s.id === current.id)) {
      candidates = [current];
      reason = 'lower-demand-after-error';
    }
  }
  if (reason === 'grade-anchor') {
    const ageAppropriate = candidates.filter(
      (s) =>
        (s.grade_level || 7) >= (state.curriculumFloor || target - 1) &&
        (s.grade_level || 7) <= target + 1,
    );
    if (ageAppropriate.length) candidates = ageAppropriate;
    // Stay briefly to confirm an increased demand; do not descend after a correct answer.
    if (
      correct === true &&
      current &&
      count(current.id) < 2 &&
      candidates.some((s) => s.id === current.id) &&
      remaining.some((q) => q.skill_id === current.id && q.difficulty === band)
    ) {
      candidates = [current];
      reason = 'increase-demand';
    } else {
      const atBand = candidates.filter((s) =>
        remaining.some((q) => q.skill_id === s.id && q.difficulty >= band),
      );
      if (!atBand.length && correct === true) {
        state.stopReason = 'challenge-exhausted';
        return null;
      }
      if (atBand.length) candidates = atBand;
      const newBranches = candidates.filter((s) => !tested.has(branch(s)));
      if (newBranches.length) candidates = newBranches;
      reason = state.asked.length ? 'branch-at-current-demand' : 'grade-anchor';
    }
  }
  candidates.sort(
    (a, b) =>
      count(a.id) - count(b.id) ||
      Math.abs((a.grade_level || 7) - target) - Math.abs((b.grade_level || 7) - target) ||
      a.sort_order - b.sort_order ||
      a.id.localeCompare(b.id),
  );
  // Rotate equivalent anchors across repeated sessions without choosing easier questions.
  const minimumCount = count(candidates[0].id);
  const minimumDistance = Math.abs((candidates[0].grade_level || 7) - target);
  const equivalent = candidates.filter(
    (s) =>
      count(s.id) === minimumCount && Math.abs((s.grade_level || 7) - target) === minimumDistance,
  );
  const fresh = equivalent.find((s) =>
    remaining.some(
      (q) => q.skill_id === s.id && q.difficulty === band && !(state.previous || []).includes(q.id),
    ),
  );
  const skill = fresh || candidates[0];
  const pool = remaining.filter((q) => q.skill_id === skill.id);
  pool.sort(
    (a, b) =>
      Math.abs(a.difficulty - band) - Math.abs(b.difficulty - band) ||
      Number((state.previous || []).includes(a.id)) -
        Number((state.previous || []).includes(b.id)) ||
      b.difficulty - a.difficulty ||
      a.id.localeCompare(b.id),
  );
  state.routeReason = reason;
  return pool[0];
}
