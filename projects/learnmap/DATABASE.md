# Database

Schema: server/schema.sql. Runtime migration is idempotent. Local PGlite and remote PostgreSQL use the same schema and SQL. Foreign keys, unique constraints and owner/time indexes enforce relationships.

Identity: users, auth_sessions, student_profiles, parent_profiles, parent_student_links, parent_invites.
Content: subjects, curricula, topics, skills, skill_dependencies, questions, diagnostic_questions, lessons, lesson_steps, ai_prompts.
Evidence: student_skill_mastery, diagnostic_sessions, diagnostic_answers, lesson_sessions, student_answers, learning_events, daily_plans, weekly_reports, ai_interactions, speaking_sessions, speaking_turns, audio_records_metadata.

Mastery fields: student_id, skill_id, mastery_score, confidence_score, attempts_count, correct_count, incorrect_count, hints_used, time_spent_seconds, last_practiced_at, next_review_at, updated_at. Unknown skills start at zero confidence; score is not presented as established knowledge.

Statuses: gap <40, learning <60, developing <80, mastered <95, strong ≥95. Hint-weighted learning evidence updates mastery with conservative bounded steps. Confidence grows with evidence. Review dates extend with mastery and shorten after mistakes.

All migrations and seed content are checked in. Audio bytes are never stored in database or filesystem; metadata stores duration/size/mime only. Session and invitation tokens are stored as SHA-256 digests. Database credentials stay on the server. External PostgreSQL deployment needs a least-privilege role and encrypted connection configured by its operator.
