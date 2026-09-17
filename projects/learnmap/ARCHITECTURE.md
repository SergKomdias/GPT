# LearnMap 0.2 architecture

React/TypeScript/Vite → same-origin Express API → PostgreSQL (local PGlite or optional pg connection).

Server modules: db (guarded connection + short transactions), learning (evidence, diagnostics, planner, reports), seed/content (versioned sample bank), auth, AIService, app (HTTP orchestration). shared/learning.ts owns mastery status gates and local-calendar calculations, reused by UI and server.

Each database connection has its own queue. AsyncLocalStorage allows statements inside one transaction to use the reserved connection; unrelated requests cannot observe partial writes. Authentication queries also enter the connection queue. Responses are emitted after a database phase commits.

External flow: read/authorize required state in a short transaction → release the connection → call AI → re-read ownership, active subject and completed state in a short write transaction → save once. Speaking turn retries use request UUIDs and an in-process single-flight map, with a second persisted-turn check at write time. Transcription stores request results for retry. This is not a distributed job queue; multiple server processes require durable coordination.

Lesson explanation generation runs after the step transaction commits; on provider failure the authored explanation is returned with an explicit fallback notice. Hints revalidate the step before writing. Objective grading remains deterministic and requires no external request.

student_subjects is the active-subject boundary. All learning entry points check it. Snapshots expose active data plus selection statuses for the management/parent UI. Pausing never deletes mastery, evidence or session history; reports filter by the current active selection.

Knowledge score, confidence and retention are separate. Evidence stores before/after states. Subject coverage counts leaf skills once; English strand rows aggregate children. Reports compare an unchanged cohort across a local-calendar week and display its size. Profile timezone determines Today, streak, plans and report boundaries, including DST.

Security remains server-side: HttpOnly SameSite sessions, salted scrypt hashes, ownership checks, expiring parent invitations, bounded bodies, origin validation and admin role gates. No real credentials or local data belong in Git. The UI has no direct database access.

See DATABASE.md for migration details, AI_TUTOR.md for evidence rules and docs/QA.md for validation and remaining pilot limitations.
