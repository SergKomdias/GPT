# LearnMap 0.2 QA

## Scope and environment

Flow under test: register → choose active subjects/timezone → adaptive diagnostic → lesson → knowledge map/progress → add/pause/resume → linked-parent report. Separate fixtures cover recording, permissions, speaking completion and slow providers.

Browser plugin not available (no Browser skill listed). Used the existing Playwright/Edge workflow with synthetic audio and fictional accounts. API 3101, Vite 5174, isolated `.data/e2e`; unit/API tests use in-memory PostgreSQL/PGlite. Windows, Node 24, pnpm 11. No personal audio or external AI calls were used.

## Verification

- TypeScript, ESLint and production build pass.
- 40 unit/API/domain tests cover score caps, independent confidence, retention, status gates, diagnostic coverage and short rechecks, subject combinations, add/pause/resume, parent isolation, sparse coverage, local dates/DST, comparable weekly cohorts, completion checks and concurrency.
- 6 Playwright scenarios pass: original learning/parent flow, synthetic audio/listening, permission denial/typed fallback, admin authorization, English-only subject management/mobile map, and Mathematics + Physics parent reporting.
- Existing fixed-eight-question assertions were updated for the requested adaptive stopping behavior; original learning/auth/lesson/audio/admin assertions remain.
- Curriculum validation checks all 585 questions have four distinct answer options and five hints, plus valid prerequisite references. This is structural validation, not independent teacher validation.
- A blocked fake AI request allows another student's snapshot and subject update to finish. Concurrent identical turn IDs issue one feedback call and persist one turn. Ending a conversation during the provider call prevents its late write; ended conversations trigger no new feedback/transcription calls.
- Score progression is reproduced against the database by `tests/progression.test.ts`; see [PROGRESSION.md](PROGRESSION.md).

## Visual/interaction evidence

Reviewed rendered screenshots with `view_image`: English-only Today has one subject/one initial diagnostic; no Math/Physics cards. English Map preserves six strand tabs and shows real prerequisite subskills. Parent selection rows distinguish Active and Not selected. Mobile subject controls wrap without horizontal document overflow. The graph intentionally scrolls horizontally inside its panel.

Screenshots (1280×900 desktop, 390×844 mobile):

- [English subjects](screenshots/v2-english-subjects.png)
- [English-only Today](screenshots/v2-english-today.png)
- [English Knowledge Map](screenshots/v2-english-map.png)
- [Add/pause/resume mobile](screenshots/v2-subjects-mobile.png)
- [Mathematics + Physics](screenshots/v2-math-physics.png)
- [Parent subject selection](screenshots/v2-parent.png)

The original concept's palette, sidebar, lime Today panel and graph treatment are retained. Added selection controls and confidence/coverage labels intentionally change information density. No new design concept or pixel-identical claim is made. Earlier v0.1 screenshots remain historical; their inflated mastery example is not the current algorithm.

## Issues resolved and remaining limits

Fixed duplicate choices in sentence-completion fixtures, an asynchronous diagnostic-test race after early completion, a multi-element parent assertion, and deterministic evidence ordering for tied timestamps. Final tests show no page errors in the exercised flows; framework output contained only benign Node NO_COLOR/FORCE_COLOR warnings.

Not verified: live OpenAI/model access, external PostgreSQL, real device microphones/Safari, audible voice quality, multi-process deduplication, large-history performance, or real-user pedagogy. Content contains deliberately small/reused contexts and some English-only rationale. Teacher review, calibration, consent/data lifecycle, recovery, backups and deployment/device QA remain pilot blockers. See README.md.
