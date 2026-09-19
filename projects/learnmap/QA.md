# LearnMap 0.3 QA

Physics / English Diagnostic verification, 2026-09-18: **107 unit/API/contract tests and 19 browser scenarios passed**, including the original Mathematics and Speaking Practice regressions. **Build, lint and typecheck passed.** Physics checks all 74 numerical results and SI dimensions, curriculum prerequisites and three grade-10 profiles. English checks four CEFR profiles, receptive/productive separation, transcript weighting, AI failures, live-adapter network contracts, consent/withdrawal, concurrency, deletion/export and draft gates. Migration checks preserve old meaning and approvals. See [diagnostic examples and limits](docs/DIAGNOSTICS.uk.md).

Browser checks use Playwright with Microsoft Edge because a Browser skill/plugin was unavailable. E2E uses an isolated in-memory database and mock AI; screenshots cover four English maps, a physical graph and mixed circuit, Math L5, parent controls and admin screens. Screenshots and local test outputs contain fictional accounts only.

Live OpenAI synthetic smoke passed on 2026-09-18; hosting is explicitly deferred. See [live verification](docs/LIVE-OPENAI.md). External PostgreSQL, Docker execution, HTTPS, backup/restore and physical-device audio remain unverified. Complete the [pilot checklist](PILOT.md) before enrolling real children.
