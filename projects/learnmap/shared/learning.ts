export type EvidenceState = {
  mastery_score: number;
  confidence_score: number;
  independent_count?: number;
  evidence_days?: number;
  retention_count?: number;
  long_retention_count?: number;
};
export function masteryStatus(s: EvidenceState) {
  if (!s.confidence_score) return 'unknown';
  if (
    s.mastery_score >= 95 &&
    s.confidence_score >= 0.85 &&
    (s.independent_count || 0) >= 9 &&
    (s.evidence_days || 0) >= 5 &&
    (s.retention_count || 0) >= 3 &&
    (s.long_retention_count || 0) >= 1
  )
    return 'strong';
  if (
    s.mastery_score >= 80 &&
    s.confidence_score >= 0.65 &&
    (s.independent_count || 0) >= 6 &&
    (s.evidence_days || 0) >= 3 &&
    (s.retention_count || 0) >= 2
  )
    return 'mastered';
  return s.mastery_score < 40 ? 'gap' : s.mastery_score < 60 ? 'learning' : 'developing';
}
export function validTimezone(zone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
export function localDay(date: Date | string | number, zone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  return ['year', 'month', 'day'].map((k) => parts.find((p) => p.type === k)!.value).join('-');
}
export function shiftDay(day: string, n: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekStart(day: string) {
  return shiftDay(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7));
}
export function streakFor(days: Set<string>, today: string) {
  let day = days.has(today) ? today : shiftDay(today, -1),
    count = 0;
  while (days.has(day)) {
    count++;
    day = shiftDay(day, -1);
  }
  return count;
}
export function updateScore(
  old: number,
  correct: boolean,
  hints: number,
  sessionGain = 0,
  dayGain = 0,
) {
  const gain = correct
    ? Math.min(
        4 * Math.max(0, 1 - hints / 3),
        Math.max(0, 8 - sessionGain),
        Math.max(0, 12 - dayGain),
      )
    : -4;
  return Math.round(Math.max(0, Math.min(100, old + gain)) * 10) / 10;
}
export function confidenceFor(uniqueQuestions: number, days: number) {
  return Math.min(0.95, uniqueQuestions * 0.05 + Math.min(days, 6) * 0.12);
}
export function retentionFor(
  rows: {
    session_id: string;
    correct: boolean;
    independent: boolean;
    created_at: Date | string;
    local_day: string;
  }[],
) {
  const sessions = [...new Set(rows.map((r) => r.session_id))]
    .map((id) => {
      const items = rows
        .filter((r) => r.session_id === id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        id,
        items,
        start: new Date(items[0].created_at).getTime(),
        end: new Date(items.at(-1)!.created_at).getTime(),
      };
    })
    .sort((a, b) => a.start - b.start);
  const retainedDays = new Set<string>(),
    longDays = new Set<string>();
  for (let i = 1; i < sessions.length; i++) {
    const s = sessions[i],
      gap = s.start - sessions[i - 1].end,
      independent = s.items.filter((r) => r.independent);
    if (
      independent.length >= 2 &&
      independent.filter((r) => r.correct).length / independent.length >= 0.8 &&
      s.items.filter((r) => r.correct).length / s.items.length >= 0.8 &&
      gap >= 86400000
    ) {
      const day = String(s.items[0].local_day).slice(0, 10);
      retainedDays.add(day);
      if (gap >= 7 * 86400000) longDays.add(day);
    }
  }
  return { retention_count: retainedDays.size, long_retention_count: longDays.size };
}
