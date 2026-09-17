export type Language = 'en' | 'uk';
export type LocalText = { en: string; uk: string };
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent' | 'admin';
  privacy?: { pilot: boolean; granted: boolean; allow_speaking: boolean };
  profile?: {
    onboarded: boolean;
    grade: number;
    age: number;
    country: string;
    learning_language: Language;
    interface_language: Language;
    xp: number;
    timezone: string;
    daily_minutes: number;
    subjects: string[];
  };
}
export interface Skill {
  id: string;
  title: LocalText;
  subject_id: string;
  topic_id: string;
  explanation: LocalText;
  prerequisites: string[];
  mastery_score: number;
  confidence_score: number;
  attempts_count: number;
  correct_count: number;
  incorrect_count: number;
  hints_used: number;
  time_spent_seconds: number;
  next_review_at: string | null;
  last_practiced_at: string | null;
  sort_order: number;
  strand_id: string | null;
  independent_count: number;
  evidence_days: number;
  retention_count: number;
  long_retention_count: number;
}
export interface Subject {
  id: string;
  title: LocalText;
  mastery: number | null;
  assessed: number;
  total: number;
  confidence: number;
  coverage: number;
  provisional: boolean;
}
export interface Plan {
  subject: string;
  skill: Skill;
  minutes: number;
  reason: string;
}
export interface LearningEvent {
  id: string;
  skill_id: string;
  title: LocalText;
  subject_id: string;
  kind: string;
  before_score: number;
  after_score: number;
  seconds: number;
  created_at: string;
}
export interface Snapshot {
  profile: User['profile'] & { name: string };
  skills: Skill[];
  subjects: Subject[];
  plan: Plan[];
  events: LearningEvent[];
  streak: number;
  today: string;
  activity: { day: string; seconds: number }[];
  subjectSelections: (Subject & { active: boolean; selection_status: string })[];
  report: {
    student: string;
    seconds: number;
    completed: number;
    goal: number;
    period_start: string;
    period_end: string;
    timezone: string;
    subjects: (Subject & {
      delta: number | null;
      seconds: number;
      comparable_skills: number;
      start_estimate: number | null;
      end_estimate: number | null;
    })[];
    strengths: Skill[];
    gaps: Skill[];
    next: Plan[];
  };
}
