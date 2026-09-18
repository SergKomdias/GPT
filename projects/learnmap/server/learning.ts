import { randomUUID } from 'node:crypto';
import type { DB } from './db';
import { chooseMathDiagnostic } from './math-diagnostic';
import { mathLevels } from './math-content';
import {
  masteryStatus,
  updateScore,
  confidenceFor,
  retentionFor,
  localDay,
  weekStart,
  shiftDay,
  streakFor,
} from '../shared/learning';
export { updateScore } from '../shared/learning';
export const status = masteryStatus;
export function priority(s: any, all: any[], now = Date.now()) {
  if (
    all.some(
      (p) => s.prerequisites.includes(p.id) && p.confidence_score > 0 && p.mastery_score < 60,
    )
  )
    return 15;
  if (s.next_review_at && new Date(s.next_review_at).getTime() <= now) return 300;
  if (s.confidence_score > 0 && s.mastery_score < 60) return 260 - s.mastery_score;
  return !s.confidence_score ? 90 : 150 - s.mastery_score;
}
export async function skillsFor(db: DB, id: string) {
  const { rows } = await db.query(
    `SELECT s.*,coalesce(m.mastery_score,0) mastery_score,coalesce(m.confidence_score,0) confidence_score,coalesce(m.attempts_count,0) attempts_count,coalesce(m.correct_count,0) correct_count,coalesce(m.incorrect_count,0) incorrect_count,coalesce(m.hints_used,0) hints_used,coalesce(m.time_spent_seconds,0) time_spent_seconds,coalesce(m.independent_count,0) independent_count,coalesce(m.evidence_days,0) evidence_days,coalesce(m.retention_count,0) retention_count,coalesce(m.long_retention_count,0) long_retention_count,m.last_practiced_at,m.next_review_at FROM skills s LEFT JOIN student_skill_mastery m ON m.skill_id=s.id AND m.student_id=$1 ORDER BY sort_order`,
    [id],
  );
  const edges = (await db.query('SELECT * FROM skill_dependencies')).rows;
  return rows.map((s) => ({
    ...s,
    status: masteryStatus(s),
    prerequisites: edges.filter((e) => e.skill_id === s.id).map((e) => e.prerequisite_id),
  }));
}
export async function requireActive(db: DB, student: string, subject: string) {
  if (
    !(
      await db.query(
        'SELECT 1 FROM student_subjects WHERE student_id=$1 AND subject_id=$2 AND active',
        [student, subject],
      )
    ).rows.length
  )
    throw Object.assign(new Error('Subject is not active / Предмет не активний'), { status: 403 });
}
export async function selectSubjects(db: DB, student: string, ids: string[]) {
  if (!ids.length)
    throw Object.assign(new Error('Choose at least one subject / Обери щонайменше один предмет'), {
      status: 400,
    });
  await db.query(
    'UPDATE student_subjects SET active=false,paused_at=CASE WHEN active THEN now() ELSE paused_at END WHERE student_id=$1 AND NOT(subject_id=ANY($2::text[]))',
    [student, ids],
  );
  for (const id of new Set(ids))
    await db.query(
      'INSERT INTO student_subjects(student_id,subject_id) VALUES($1,$2) ON CONFLICT(student_id,subject_id) DO UPDATE SET active=true,paused_at=null',
      [student, id],
    );
}
export function subjectSummary(group: any[]) {
  const leaves = group.filter((s) => !group.some((c) => c.strand_id === s.id)),
    assessed = leaves.filter((s) => s.confidence_score > 0);
  const coverage = leaves.length ? assessed.length / leaves.length : 0;
  const confidence = assessed.length
    ? assessed.reduce((n, s) => n + s.confidence_score, 0) / assessed.length
    : 0;
  const estimate = assessed.length
    ? assessed.reduce((n, s) => n + s.mastery_score, 0) / assessed.length
    : null;
  return {
    assessed: assessed.length,
    total: leaves.length,
    coverage,
    confidence,
    mastery: coverage >= 0.6 && confidence >= 0.35 ? Math.round(estimate!) : null,
    estimate: estimate === null ? null : Math.round(estimate),
    provisional: coverage < 0.6 || confidence < 0.35,
  };
}
export function buildPlan(skills: any[], subjects: any[], minutes: number, now: number) {
  const leaves = skills.filter((s) => !skills.some((c) => c.strand_id === s.id));
  const result: any[] = [];
  let remaining = minutes;
  const add = (s: any) => {
    const duration = Math.min(remaining, s.subject_id === 'english' ? 12 : 15);
    if (duration < 5) return;
    result.push({
      subject: s.subject_id,
      skill: s,
      minutes: duration,
      reason: !s.confidence_score
        ? 'new'
        : s.next_review_at && new Date(s.next_review_at).getTime() <= now
          ? 'review'
          : s.mastery_score < 60
            ? 'foundation'
            : 'develop',
    });
    remaining -= duration;
  };
  for (const sub of subjects) {
    const s = leaves
      .filter((k) => k.subject_id === sub.id)
      .sort((a, b) => priority(b, skills, now) - priority(a, skills, now))[0];
    if (s) add(s);
  }
  for (const s of leaves
    .filter((s) => s.confidence_score > 0 && !result.some((p) => p.skill.id === s.id))
    .sort((a, b) => priority(b, skills, now) - priority(a, skills, now))) {
    if (remaining < 8 || result.length >= 4) break;
    if (s.mastery_score < 80 || (s.next_review_at && new Date(s.next_review_at).getTime() <= now))
      add(s);
  }
  return result;
}
export async function snapshot(db: DB, id: string, now = new Date()) {
  const allSkills = await skillsFor(db, id);
  const profile = (
    await db.query(
      'SELECT u.id,u.name,p.* FROM users u JOIN student_profiles p ON p.student_id=u.id WHERE u.id=$1',
      [id],
    )
  ).rows[0];
  const selections = (
    await db.query(
      "SELECT s.*,ss.active,ss.started_at,ss.paused_at FROM subjects s LEFT JOIN student_subjects ss ON ss.subject_id=s.id AND ss.student_id=$1 ORDER BY CASE s.id WHEN 'math' THEN 0 WHEN 'physics' THEN 1 ELSE 2 END",
      [id],
    )
  ).rows;
  const subjectSelections = selections.map((s) => ({
    ...s,
    selection_status: s.active ? 'active' : s.started_at ? 'paused' : 'not-selected',
  }));
  const active = new Set(subjectSelections.filter((s) => s.active).map((s) => s.id));
  const skills = allSkills.filter((s) => active.has(s.subject_id));
  for (const s of skills) {
    const children = skills.filter((c) => c.strand_id === s.id);
    if (children.length) {
      const summary = subjectSummary(children);
      s.mastery_score = summary.estimate || 0;
      s.confidence_score = summary.confidence;
      s.status = 'developing';
    }
  }
  const subjects = subjectSelections
    .filter((s) => s.active)
    .map((s) => ({ ...s, ...subjectSummary(skills.filter((k) => k.subject_id === s.id)) }));
  const today = localDay(now, profile.timezone),
    start = weekStart(today);
  const events = (
    await db.query(
      'SELECT e.*,s.title,s.subject_id FROM learning_events e JOIN skills s ON s.id=e.skill_id JOIN student_subjects ss ON ss.student_id=e.student_id AND ss.subject_id=s.subject_id AND ss.active WHERE e.student_id=$1 AND e.created_at<=$2 ORDER BY e.created_at DESC,e.event_order DESC',
      [id, now],
    )
  ).rows;
  const week = events.filter((e) => localDay(e.created_at, profile.timezone) >= start);
  const plan = buildPlan(skills, subjects, profile.daily_minutes, now.getTime());
  await db.query(
    'INSERT INTO daily_plans VALUES($1,$2,$3) ON CONFLICT(student_id,day) DO UPDATE SET plan=excluded.plan',
    [
      id,
      today,
      JSON.stringify(
        plan.map((p) => ({ skill: p.skill.id, reason: p.reason, minutes: p.minutes })),
      ),
    ],
  );
  const observations = (
    await db.query(
      'SELECT * FROM skill_evidence WHERE student_id=$1 AND created_at<=$2 ORDER BY created_at,evidence_order',
      [id, now],
    )
  ).rows;
  const reports = subjects.map((s) => {
    const group = skills.filter(
      (k) => k.subject_id === s.id && !skills.some((c) => c.strand_id === k.id),
    );
    const comparable = group
      .map((k) => {
        const obs = observations.filter((e) => e.skill_id === k.id),
          prior = obs.filter((e) => localDay(e.created_at, profile.timezone) < start).at(-1),
          inWeek = obs.filter((e) => localDay(e.created_at, profile.timezone) >= start);
        return {
          before: prior?.after_state || inWeek[0]?.before_state || k,
          after: obs.at(-1)?.after_state || k,
        };
      })
      .filter((k) => k.before.confidence_score > 0 && k.after.confidence_score > 0);
    const startEstimate = comparable.length
      ? comparable.reduce((a, k) => a + k.before.mastery_score, 0) / comparable.length
      : null;
    const endEstimate = comparable.length
      ? comparable.reduce((a, k) => a + k.after.mastery_score, 0) / comparable.length
      : null;
    return {
      ...s,
      start_estimate: startEstimate,
      end_estimate: endEstimate,
      comparable_skills: comparable.length,
      delta: startEstimate === null ? null : Math.round((endEstimate! - startEstimate) * 10) / 10,
      seconds: week.filter((e) => e.subject_id === s.id).reduce((a, e) => a + e.seconds, 0),
      activity: week.filter((e) => e.subject_id === s.id).length,
    };
  });
  const report = {
    student: profile.name,
    period_start: start,
    period_end: today,
    timezone: profile.timezone,
    seconds: week.reduce((a, e) => a + e.seconds, 0),
    completed: week.filter((e) => ['lesson', 'speaking', 'listening'].includes(e.kind)).length,
    goal: 5,
    subjects: reports,
    strengths: skills.filter((s) => ['mastered', 'strong'].includes(masteryStatus(s))),
    gaps: skills.filter((s) => s.confidence_score > 0 && s.mastery_score < 60),
    next: plan,
  };
  await db.query(
    'INSERT INTO weekly_reports VALUES($1,$2,$3) ON CONFLICT(student_id,week) DO UPDATE SET report=excluded.report',
    [id, start, JSON.stringify(report)],
  );
  const activity = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return {
      day,
      seconds: events
        .filter((e) => localDay(e.created_at, profile.timezone) === day)
        .reduce((a, e) => a + e.seconds, 0),
    };
  });
  return {
    profile,
    skills,
    subjects,
    subjectSelections,
    plan,
    events: events.slice(0, 500),
    report,
    activity,
    today,
    streak: streakFor(new Set(events.map((e) => localDay(e.created_at, profile.timezone))), today),
  };
}
export async function evidence(
  db: DB,
  student: string,
  skill: string,
  correct: boolean,
  hints: number,
  seconds: number,
  kind: string,
  sessionId: string = randomUUID(),
  questionId: string = randomUUID(),
  now = new Date(),
) {
  const previous = (
    await db.query(
      'SELECT * FROM skill_evidence WHERE student_id=$1 AND session_id=$2 AND question_id=$3',
      [student, sessionId, questionId],
    )
  ).rows[0];
  if (previous)
    return {
      before: previous.before_state.mastery_score,
      after: previous.after_state.mastery_score,
    };
  const old = (
    await db.query('SELECT * FROM student_skill_mastery WHERE student_id=$1 AND skill_id=$2', [
      student,
      skill,
    ])
  ).rows[0] || { mastery_score: 0, confidence_score: 0 };
  const profile = (
    await db.query('SELECT timezone FROM student_profiles WHERE student_id=$1', [student])
  ).rows[0];
  const day = localDay(now, profile.timezone),
    history = (
      await db.query(
        'SELECT * FROM skill_evidence WHERE student_id=$1 AND skill_id=$2 ORDER BY created_at,evidence_order',
        [student, skill],
      )
    ).rows;
  const gain = (rows: any[]) =>
    rows.reduce(
      (n, r) =>
        n +
        Math.max(
          0,
          r.after_state.mastery_score -
            (r.before_state.confidence_score ? r.before_state.mastery_score : 50),
        ),
      0,
    );
  const independent = hints === 0;
  const score = updateScore(
    old.confidence_score ? old.mastery_score : 50,
    correct,
    hints,
    gain(history.filter((r) => r.session_id === sessionId)),
    gain(history.filter((r) => localDay(r.created_at, profile.timezone) === day)),
  );
  const independentRows = history.filter((e) => e.independent),
    unique = new Set(independentRows.map((e) => e.question_id));
  if (independent) unique.add(questionId);
  const days = new Set(independentRows.map((e) => localDay(e.created_at, profile.timezone)));
  if (independent) days.add(day);
  const retention = retentionFor([
    ...history,
    { session_id: sessionId, correct, independent, created_at: now, local_day: day },
  ]);
  const retained = retention.retention_count > (old.retention_count || 0),
    longRetained = retention.long_retention_count > (old.long_retention_count || 0);
  const next = {
    mastery_score: score,
    confidence_score: Math.max(0.05, confidenceFor(unique.size, days.size)),
    independent_count: unique.size,
    evidence_days: days.size,
    ...retention,
  };
  const reviewDays = !correct ? 1 : next.retention_count >= 2 ? 7 : next.retention_count ? 3 : 1;
  await db.query(
    `INSERT INTO student_skill_mastery(id,student_id,skill_id,mastery_score,confidence_score,attempts_count,correct_count,incorrect_count,hints_used,time_spent_seconds,last_practiced_at,next_review_at,independent_count,evidence_days,retention_count,long_retention_count) VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(student_id,skill_id) DO UPDATE SET mastery_score=$4,confidence_score=$5,attempts_count=student_skill_mastery.attempts_count+1,correct_count=student_skill_mastery.correct_count+$6,incorrect_count=student_skill_mastery.incorrect_count+$7,hints_used=student_skill_mastery.hints_used+$8,time_spent_seconds=student_skill_mastery.time_spent_seconds+$9,last_practiced_at=$10,next_review_at=$11,independent_count=$12,evidence_days=$13,retention_count=$14,long_retention_count=$15,updated_at=$10`,
    [
      randomUUID(),
      student,
      skill,
      score,
      next.confidence_score,
      correct ? 1 : 0,
      correct ? 0 : 1,
      hints,
      seconds,
      now,
      new Date(now.getTime() + reviewDays * 86400000),
      unique.size,
      days.size,
      next.retention_count,
      next.long_retention_count,
    ],
  );
  const evidenceId = randomUUID();
  await db.query('INSERT INTO skill_evidence VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [
    evidenceId,
    student,
    skill,
    sessionId,
    questionId,
    correct,
    independent,
    day,
    retained,
    longRetained,
    JSON.stringify(old),
    JSON.stringify(next),
    now,
  ]);
  await db.query(
    'INSERT INTO learning_events(id,student_id,skill_id,kind,before_score,after_score,seconds,xp,session_id,evidence_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [
      randomUUID(),
      student,
      skill,
      kind,
      old.mastery_score,
      score,
      seconds,
      correct ? 10 : 3,
      sessionId,
      evidenceId,
      now,
    ],
  );
  await db.query('UPDATE student_profiles SET xp=xp+$2 WHERE student_id=$1', [
    student,
    correct ? 10 : 3,
  ]);
  return { before: old.mastery_score, after: score };
}
export function diagnosticMetrics(questions: any[], skills: any[], state: any) {
  const leaves = skills.filter((s) => !skills.some((c) => c.strand_id === s.id)),
    asked = questions.filter((q) => state.asked.includes(q.id)),
    counts = leaves.map((s) => asked.filter((q) => q.skill_id === s.id).length),
    covered = counts.filter((n) => n > 0).length;
  const confidence = counts.length
      ? counts.reduce((a, n) => a + Math.min(1, n / 2), 0) / counts.length
      : 0,
    branch = (s: any) => s.diagnostic_branch || s.strand_id || s.topic_id || s.id,
    branches = new Set(leaves.map(branch)),
    testedBranches = new Set(
      leaves.filter((s) => asked.some((q) => q.skill_id === s.id)).map(branch),
    );
  const maxQuestions = state.recheck ? 12 : 24;
  const coverage = counts.length ? covered / counts.length : 0,
    enough =
      asked.length >= Math.min(6, leaves.length * 2) &&
      coverage >= (state.recheck ? 0.35 : 0.7) &&
      confidence >= (state.recheck ? 0.2 : 0.6) &&
      testedBranches.size === branches.size;
  return {
    coverage,
    confidence,
    assessed: covered,
    total: leaves.length,
    branches: testedBranches.size,
    totalBranches: branches.size,
    recheck: !!state.recheck,
    maxQuestions,
    complete: !!state.stopReason || enough || state.asked.length >= maxQuestions,
    reason:
      state.stopReason ||
      (enough
        ? 'coverage-confidence'
        : state.asked.length >= maxQuestions
          ? 'question-limit'
          : null),
  };
}
export function chooseDiagnostic(questions: any[], skills: any[], state: any, correct?: boolean) {
  if (diagnosticMetrics(questions, skills, state).complete) return null;
  if (state.algorithm === 'math-v3') return chooseMathDiagnostic(questions, skills, state, correct);
  const leaves = skills.filter((s) => !skills.some((c) => c.strand_id === s.id)),
    remaining = questions.filter(
      (q) => !state.asked.includes(q.id) && leaves.some((s) => s.id === q.skill_id),
    );
  if (!remaining.length) return null;
  const asked = questions.filter((q) => state.asked.includes(q.id)),
    count = (id: string) => asked.filter((q) => q.skill_id === id).length,
    branch = (s: any) => s.strand_id || s.topic_id || s.id,
    testedBranches = new Set(leaves.filter((s) => count(s.id) > 0).map(branch));
  let candidates = leaves.filter((s) => remaining.some((q) => q.skill_id === s.id));
  const current = skills.find((s) => s.id === state.skill),
    prerequisite =
      correct === false
        ? candidates.find((s) => current?.prerequisites.includes(s.id) && count(s.id) < 2)
        : null,
    unseenBranch = candidates.filter((s) => !testedBranches.has(branch(s)));
  if (unseenBranch.length) candidates = unseenBranch;
  else if (prerequisite) candidates = [prerequisite];
  candidates.sort((a, b) => count(a.id) - count(b.id));
  const freshSkills = candidates.filter((s) =>
    remaining.some((q) => q.skill_id === s.id && !(state.previous || []).includes(q.id)),
  );
  if (freshSkills.length) candidates = freshSkills;
  const skill = candidates[0];
  const difficulty =
    skill.id === state.skill
      ? Math.max(1, Math.min(3, (state.difficulty || 1) + (correct ? 1 : -1)))
      : count(skill.id)
        ? 2
        : 1;
  const forSkill = remaining.filter((q) => q.skill_id === skill.id);
  const fresh = forSkill.filter((q) => !(state.previous || []).includes(q.id));
  const pool = fresh.length ? fresh : forSkill;
  return pool.find((q) => q.difficulty === difficulty) || pool[0] || remaining[0];
}
export const publicQuestion = (q: any) => ({
  id: q.id,
  skill_id: q.skill_id,
  prompt: q.prompt,
  options: q.options,
  difficulty: q.difficulty,
  ...(q.id.startsWith('math-v3-')
    ? { cognitive_level: mathLevels[q.difficulty - 1], max_difficulty: 5 }
    : {}),
});
