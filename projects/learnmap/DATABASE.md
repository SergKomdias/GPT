# LearnMap 0.2 database

Schema: server/schema.sql. Both PGlite and optional PostgreSQL use the same SQL. Initialization and seed migrations are idempotent; back up the database before upgrading real data.

Identity remains users, auth_sessions, student_profiles, parent_profiles, parent_student_links and parent_invites. Profile adds validated IANA timezone (legacy default Europe/Kyiv) and daily_minutes (10–90).

student_subjects stores student_id, subject_id, active, started_at, paused_at with a composite primary key and active-owner index. New onboarding must select at least one subject; updates are transactional. Existing onboarded learners retain their original subjects. Pausing changes only active/paused_at, and resuming restores access to the same history.

Content retains subjects/curricula/topics/skills/dependencies/questions. skills.strand_id groups English subskills under six strands. Coverage counts 59 leaf skills: Math 15, Physics 18, English 26. Root English rows and old answers are retained for compatibility, not counted twice.

student_skill_mastery adds independent_count, evidence_days, retention_count, long_retention_count to score/confidence/time/attempt fields. skill_evidence records student, skill, session, question, independence, correctness, local day, retention flags, full before/after states and timestamp. A unique student/session/question key prevents repeated evidence credit; owner/skill/time indexes support reconstruction.

learning_events retains activity/time and adds session_id/evidence_id. Speaking activity has equal before/after scores. ai_requests stores transcription retry results keyed by request UUID with owner/session/kind. No audio bytes are stored; audio metadata contains byte count, MIME, source-deleted status and timestamp (not measured acoustic duration).

The learning-v2 seed migration updates the bundled sample questions once, adds subskills/selections and caps unsupported v0.1 confidence at 0.15. It does not rewrite old scores or invent independent/retention counts. New subskills start unassessed. New before/after snapshots support honest weekly deltas going forward; pre-migration confidence cannot be reconstructed faithfully.

daily_plans uses the student’s local date. weekly_reports uses their local Monday. UI history returns up to 500 events; analytics computes over all relevant history. Before/after weekly estimates use the same skills with evidence at both boundaries; newly assessed skills affect coverage, not a misleading gain.

Foreign keys, unique constraints and ownership checks remain active. External PostgreSQL connection setup, encrypted transport, backup/restore, long-history aggregation and multi-worker load behavior still require staging verification.
