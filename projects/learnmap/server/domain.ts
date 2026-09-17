import { randomUUID } from 'node:crypto';
import type { DB } from './db';
export const status = (score: number) =>
  score < 40
    ? 'gap'
    : score < 60
      ? 'learning'
      : score < 80
        ? 'developing'
        : score < 95
          ? 'mastered'
          : 'strong';
export function updateScore(old: number, correct: boolean, hints: number) {
  const weight = Math.max(0.15, 1 - hints * 0.17);
  return Math.round(
    Math.max(0, Math.min(100, old + (correct ? (100 - old) * 0.2 * weight : -(8 + old * 0.07)))),
  );
}
export function priority(s: any, all: any[], now = Date.now()) {
  const weak = all.some((p) => s.prerequisites.includes(p.id) && p.mastery_score < 60);
  const isPrerequisite = all.some((p) => p.prerequisites.includes(s.id) && p.mastery_score < 80);
  if (weak) return 15;
  if (s.confidence_score > 0 && s.mastery_score < 60 && isPrerequisite)
    return 400 - s.mastery_score;
  if (s.next_review_at && new Date(s.next_review_at).getTime() <= now) return 250;
  if (s.confidence_score > 0 && s.mastery_score < 80) return 200 - s.mastery_score;
  return s.confidence_score === 0 ? 80 : 20;
}
export async function skillsFor(db: DB, id: string) {
  const { rows } = await db.query(
    `SELECT s.*,coalesce(m.mastery_score,0) mastery_score,coalesce(m.confidence_score,0) confidence_score,coalesce(m.attempts_count,0) attempts_count,coalesce(m.correct_count,0) correct_count,coalesce(m.incorrect_count,0) incorrect_count,coalesce(m.hints_used,0) hints_used,coalesce(m.time_spent_seconds,0) time_spent_seconds,m.last_practiced_at,m.next_review_at FROM skills s LEFT JOIN student_skill_mastery m ON m.skill_id=s.id AND m.student_id=$1 ORDER BY sort_order`,
    [id],
  );
  const edges = (await db.query('SELECT * FROM skill_dependencies')).rows;
  return rows.map((s) => ({
    ...s,
    prerequisites: edges.filter((e) => e.skill_id === s.id).map((e) => e.prerequisite_id),
  }));
}
export async function snapshot(db: DB, id: string) {
  const skills = await skillsFor(db, id);
  const profile = (
    await db.query(
      'SELECT u.id,u.name,p.* FROM users u JOIN student_profiles p ON p.student_id=u.id WHERE u.id=$1',
      [id],
    )
  ).rows[0];
  const events = (
    await db.query(
      'SELECT e.*,s.title,s.subject_id FROM learning_events e JOIN skills s ON s.id=e.skill_id WHERE student_id=$1 ORDER BY created_at DESC,event_order DESC LIMIT 500',
      [id],
    )
  ).rows;
  const subjects = (
    await db.query(
      "SELECT * FROM subjects ORDER BY CASE id WHEN 'math' THEN 0 WHEN 'physics' THEN 1 ELSE 2 END",
    )
  ).rows.map((sub) => {
    const group = skills.filter((s) => s.subject_id === sub.id);
    const known = group.filter((s) => s.confidence_score > 0);
    return {
      ...sub,
      mastery: known.length
        ? Math.round(known.reduce((a, s) => a + s.mastery_score, 0) / known.length)
        : null,
      assessed: known.length,
      total: group.length,
    };
  });
  const plan = subjects
    .filter((sub) => skills.some((s) => s.subject_id === sub.id))
    .map((sub) => {
      const candidates = skills.filter((s) => s.subject_id === sub.id);
      const skill = candidates.sort((a, b) => priority(b, skills) - priority(a, skills))[0];
      return {
        subject: sub.id,
        skill,
        minutes: sub.id === 'english' ? 12 : 15,
        reason:
          skill.confidence_score === 0
            ? 'new'
            : skill.mastery_score < 60
              ? 'foundation'
              : skill.next_review_at && new Date(skill.next_review_at) <= new Date()
                ? 'review'
                : 'develop',
      };
    });
  await db.query(
    'INSERT INTO daily_plans VALUES($1,CURRENT_DATE,$2) ON CONFLICT(student_id,day) DO UPDATE SET plan=excluded.plan',
    [
      id,
      JSON.stringify(
        plan.map((p) => ({ skill: p.skill.id, reason: p.reason, minutes: p.minutes })),
      ),
    ],
  );
  const week = events.filter((e) => Date.now() - new Date(e.created_at).getTime() < 7 * 86400000);
  const completed = week.filter((e) => ['lesson', 'speaking', 'listening'].includes(e.kind)).length;
  const days = new Set(events.map((e) => new Date(e.created_at).toISOString().slice(0, 10)));
  let streak = 0;
  const date = new Date();
  if (!days.has(date.toISOString().slice(0, 10))) date.setUTCDate(date.getUTCDate() - 1);
  while (days.has(date.toISOString().slice(0, 10))) {
    streak++;
    date.setUTCDate(date.getUTCDate() - 1);
  }
  const report = {
    student: profile?.name,
    seconds: week.reduce((a, e) => a + e.seconds, 0),
    completed,
    goal: 5,
    subjects: subjects.map((s) => ({
      ...s,
      delta:
        week
          .filter((e) => e.subject_id === s.id)
          .reduce((a, e) => a + e.after_score - e.before_score, 0) /
        Math.max(1, skills.filter((k) => k.subject_id === s.id && k.confidence_score > 0).length),
      seconds: week.filter((e) => e.subject_id === s.id).reduce((a, e) => a + e.seconds, 0),
    })),
    strengths: skills.filter((s) => s.confidence_score > 0 && s.mastery_score >= 80),
    gaps: skills.filter((s) => s.confidence_score > 0 && s.mastery_score < 60),
    next: plan,
  };
  await db.query(
    "INSERT INTO weekly_reports VALUES($1,date_trunc('week',CURRENT_DATE)::date,$2) ON CONFLICT(student_id,week) DO UPDATE SET report=excluded.report",
    [id, JSON.stringify(report)],
  );
  return { profile, skills, subjects, plan, events, report, streak };
}
export async function evidence(
  db: DB,
  student: string,
  skill: string,
  correct: boolean,
  hints: number,
  seconds: number,
  kind: string,
) {
  const old = (
    await db.query('SELECT * FROM student_skill_mastery WHERE student_id=$1 AND skill_id=$2', [
      student,
      skill,
    ])
  ).rows[0];
  const before = old?.mastery_score || 0;
  const score = updateScore(before, correct, hints);
  const confidence = Math.min(1, (old?.confidence_score || 0) + 0.06);
  const days = correct ? Math.max(1, Math.round(score / 15)) : 1;
  await db.query(
    `INSERT INTO student_skill_mastery(id,student_id,skill_id,mastery_score,confidence_score,attempts_count,correct_count,incorrect_count,hints_used,time_spent_seconds,last_practiced_at,next_review_at) VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9,now(),now()+$10*interval '1 day') ON CONFLICT(student_id,skill_id) DO UPDATE SET mastery_score=$4,confidence_score=$5,attempts_count=student_skill_mastery.attempts_count+1,correct_count=student_skill_mastery.correct_count+$6,incorrect_count=student_skill_mastery.incorrect_count+$7,hints_used=student_skill_mastery.hints_used+$8,time_spent_seconds=student_skill_mastery.time_spent_seconds+$9,last_practiced_at=now(),next_review_at=now()+$10*interval '1 day',updated_at=now()`,
    [
      randomUUID(),
      student,
      skill,
      score,
      confidence,
      correct ? 1 : 0,
      correct ? 0 : 1,
      hints,
      seconds,
      days,
    ],
  );
  await db.query(
    'INSERT INTO learning_events(id,student_id,skill_id,kind,before_score,after_score,seconds,xp) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [randomUUID(), student, skill, kind, before, score, seconds, correct ? 10 : 3],
  );
  await db.query('UPDATE student_profiles SET xp=xp+$2 WHERE student_id=$1', [
    student,
    correct ? 10 : 3,
  ]);
  return { before, after: score };
}
export function chooseDiagnostic(questions: any[], skills: any[], state: any, correct?: boolean) {
  const remaining = questions.filter((q) => !state.asked.includes(q.id));
  if (!remaining.length || state.asked.length >= 8) return null;
  let skill = state.skill;
  let difficulty = state.difficulty || 1;
  if (correct === false) {
    const current = skills.find((s) => s.id === skill);
    skill = current?.prerequisites[0] || skill;
    difficulty = Math.max(1, difficulty - 1);
  }
  if (correct === true) {
    difficulty = Math.min(3, difficulty + 1);
    if (state.streak >= 2) {
      const dependent = skills.find((s) => s.prerequisites.includes(skill));
      skill =
        dependent?.id || skills[(skills.findIndex((s) => s.id === skill) + 1) % skills.length]?.id;
    }
  }
  return (
    remaining.find((q) => q.skill_id === skill && q.difficulty === difficulty) ||
    remaining.find((q) => q.skill_id === skill) ||
    remaining[0]
  );
}
export const publicQuestion = (q: any) => ({
  id: q.id,
  skill_id: q.skill_id,
  prompt: q.prompt,
  options: q.options,
  difficulty: q.difficulty,
});
