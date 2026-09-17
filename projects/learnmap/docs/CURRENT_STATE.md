# LearnMap current state

Version 0.2 replaces single-session mastery inflation with independent/confidence/retention gates, adds active subject selection and English subskills, adaptive diagnostic stopping, local-calendar reporting and short AI database phases.

Important files: shared/learning.ts, server/learning.ts, server/db.ts, server/app.ts, server/schema.sql, server/seed.ts, server/english-content.ts, server/concept-content.ts, the updated onboarding/subjects/map/analytics screens and tests/learning-v2.test.ts.

Verification and artifacts: [QA.md](QA.md), [PROGRESSION.md](PROGRESSION.md). Build, lint, typecheck, 40 unit/API tests and 6 browser scenarios are the release checks.

Known limits: calibrated knowledge measurement, teacher-reviewed content/localization, live API/external PostgreSQL, durable distributed provider jobs, child consent/data lifecycle, recovery, backups, HTTPS deployment and physical device QA remain unfinished.

Recommended next step: review the sample question bank and measurement thresholds with teachers before a small real-user pilot; verify real text AI with usage controls separately.
