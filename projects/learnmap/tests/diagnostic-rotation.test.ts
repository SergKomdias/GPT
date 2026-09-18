import { it, expect } from 'vitest';
import { chooseDiagnostic } from '../server/learning';
it('prefers a new question over a previously answered question at the exact difficulty', () => {
  const skills = [{ id: 'a', topic_id: 'topic', prerequisites: [] }];
  const questions = [
    { id: 'old', skill_id: 'a', difficulty: 1 },
    { id: 'new', skill_id: 'a', difficulty: 2 },
  ];
  const state = { asked: [], previous: ['old'], skill: 'a', difficulty: 1 };
  expect(chooseDiagnostic(questions, skills, state)?.id).toBe('new');
});
it('uses remaining bank questions without repetition within a diagnostic and falls back when exhausted across sessions', () => {
  const skills = [{ id: 'a', topic_id: 'topic', prerequisites: [] }];
  const questions = [
    { id: 'old', skill_id: 'a', difficulty: 1 },
    { id: 'new', skill_id: 'a', difficulty: 2 },
  ];
  const state = { asked: ['new'], previous: ['old', 'new'], skill: 'a', difficulty: 1 };
  expect(chooseDiagnostic(questions, skills, state)?.id).toBe('old');
  expect(chooseDiagnostic(questions, skills, { ...state, asked: ['old', 'new'] })).toBeNull();
});
