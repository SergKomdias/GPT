export type Language = 'en' | 'uk';
export type LocalText = { en: string; uk: string };
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent' | 'admin';
  profile?: {
    onboarded: boolean;
    grade: number;
    age: number;
    country: string;
    learning_language: Language;
    interface_language: Language;
    xp: number;
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
}
export interface Subject {
  id: string;
  title: LocalText;
  mastery: number | null;
  assessed: number;
  total: number;
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
  report: {
    student: string;
    seconds: number;
    completed: number;
    goal: number;
    subjects: (Subject & { delta: number; seconds: number })[];
    strengths: Skill[];
    gaps: Skill[];
    next: Plan[];
  };
}
