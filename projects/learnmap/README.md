# LearnMap 0.2

**Your personal map of knowledge.** A working learning application for students and parents. All features are free; there are no payments, subscriptions, paywalls or locked analytics.

## Run locally

Requires Node.js 22+ and pnpm 10+. From this directory:

```sh
pnpm install
pnpm dev
```

Open **http://127.0.0.1:5173**. The API runs on **http://127.0.0.1:3100**. The first startup initializes the database and sample content. No cloud account or API key is needed for the local demo. Keep the terminal running.

The login page has **Student demo**, **Parent demo**, and **Admin demo**. Their data is fictional. Alternatively register separate student and parent accounts. A student generates a one-time invitation under **Parent connection**; a parent redeems it in their dashboard. No child's email or password is shared.

Use the demo buttons for fictional local accounts. Their passwords are randomly generated during seeding and are not published. Demo logins disappear when `ENABLE_DEMO=false`. Never expose demo administration on a public deployment.

Production build / local build preview:

```sh
pnpm build
pnpm start
```

Open http://127.0.0.1:3100 after stopping any existing dev API. `pnpm start` serves both API and built frontend. For deployment behind HTTPS set `NODE_ENV=production`, `APP_ORIGIN` to the exact public origin, provision an administrator using server environment variables, and disable demo mode. Hosting/deployment was not performed.

## Project structure

```text
projects/learnmap/
  src/
    components/          Shell, graph, shared UI
    features/learning/   Question interaction
    features/progress/   Evidence-based analytics
    pages/               Student, Parent, Admin and auth screens
    hooks/               Auth, snapshot, microphone lifecycle
    services/            Same-origin API and audio client
    data/                Non-sensitive display-data boundary
    types/               Shared frontend types
    utils/               Formatting and mastery statuses
  server/
    app.ts               Authorized API routes and transactions
    auth.ts              Password hashing and sessions
    db.ts                Local / remote PostgreSQL adapters
    domain.ts            Mastery, planner, diagnostics and reports
    ai.ts                AIService with mock and OpenAI implementations
    content.ts           Bilingual sample curricula and question bank
    seed.ts              Idempotent seed and content migration
    schema.sql           Relational database schema
  tests/                 Domain, API and browser regression tests
  docs/screenshots/      Verified screens
  REQUIREMENTS.md         Original supplied specification
  PRODUCT.md
  ARCHITECTURE.md
  DATABASE.md
  AI_TUTOR.md
  SPEAKING.md
  DESIGN_SYSTEM.md
```

## Implemented functionality

- Student/Parent/Admin accounts, persistent server sessions, parent invitations and role authorization.
- Onboarding selects one or more subjects, an IANA timezone and a daily learning goal. Subjects can be added, paused and resumed without deleting history or mastery.
- Mathematics: 15 sample skills; Physics: 18; English B1: 6 strands and 26 subskills. There are 65 stored nodes and 585 questions (59 assessed leaf skills). Math/Physics include conceptual and error/transfer checks alongside calculations. English includes contextual choice, sentence completion and rule checks.
- Mastery estimate, confidence and retention are separate. Positive growth is capped at 8 points per session and 12 per local day. Mastered/Strong require independent evidence and delayed successful checks, not just a high score.
- Subject summaries show assessed/total skills, coverage and confidence. A subject percentage is withheld below 60% coverage or 35% mean assessed-skill confidence.
- Diagnostics sample different graph branches and adapt difficulty. They finish at sufficient coverage/confidence or a 24-question safety limit; reaching the limit reports remaining uncertainty.
- Today, map, progress and parent reports use active subjects only. The planner responds to prerequisites, review dates, weak skills and the daily minute goal; it does not force three sessions.
- Nine-stage lessons retain answer/hint evidence; least-recently-tested questions rotate into lessons. Five hints progressively reduce positive credit; hint-assisted answers never count as independent evidence.
- Speaking saves activity and qualitative dimensions (grammar, vocabulary, relevance, complexity). Neither word count nor completing a conversation changes proficiency. Pronunciation and acoustic fluency remain Not assessed.
- Listening includes an audio passage task; English listening subskills explicitly describe text-based strategy checks, not an acoustic proficiency test.
- Local-day plans/streaks and Monday-to-current-local-day weekly reports. Weekly change compares start/end estimates on the same assessed cohort; newly assessed skills are not silently inserted into the delta denominator.
- Short database phases surround external AI calls. Duplicate concurrent speaking requests share one provider call in one server process and one persisted turn. Completed conversations are checked before and after provider work.
- Parent summaries separate learning time, activity, estimates, confidence and coverage; inactive subjects have Paused/Not selected labels without zero-percent cards.

## What is real, what is mock

| Area                               | Implementation                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Authentication and role checks     | Real server-side sessions and salted scrypt hashes                                            |
| Persistence                        | Real PostgreSQL engine: PGlite locally, optional remote PostgreSQL                            |
| Grading and mastery                | Real server-side deterministic rules; browser cannot assign scores                            |
| Planning, graph and analytics      | Computed from database evidence                                                               |
| Speech recording                   | Real browser MediaRecorder; raw bytes processed in memory, not retained                       |
| AI without credentials             | Explicit mock adapter; example transcript, limited grammar correction, authored lessons/hints |
| Mock voice                         | Browser speech synthesis, dependent on installed voices/browser support                       |
| OpenAI adapter                     | Implemented server-side; real account/API verification not performed                          |
| Pronunciation and acoustic fluency | Not assessed; never inferred from transcript                                                  |

## Environment and database

Copy `.env.example` to `.env` only if configuration is needed. Server variables:

| Variable                        | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `PORT`                          | API port, default 3100                                    |
| `DATA_DIR`                      | Local database directory, default `.data/learnmap`        |
| `DATABASE_URL`                  | Standard PostgreSQL connection string; unset uses PGlite  |
| `ENABLE_DEMO`                   | Defaults to enabled locally; set `false` for a real pilot |
| `APP_ORIGIN`                    | Exact allowed browser origin for a reverse proxy          |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Provision an administrator without public registration    |
| `AI_PROVIDER`                   | `mock` (default) or `openai`                              |
| `OPENAI_API_KEY`                | Server-only OpenAI credential                             |
| `OPENAI_MODEL`                  | Text model, default `gpt-4.1-mini`                        |
| `OPENAI_TRANSCRIBE_MODEL`       | Default `gpt-4o-mini-transcribe`                          |
| `OPENAI_SPEECH_MODEL`           | Default `gpt-4o-mini-tts`                                 |

Never put a secret into `VITE_*` variables. To use live AI, configure the server variables and restart; the frontend does not change. Provider errors are surfaced instead of pretending to succeed. Requests use Responses (`store:false`), Audio Transcriptions and Speech endpoints. See [official audio reference](https://developers.openai.com/api/reference/typescript/resources/audio).

`pnpm db:seed` initializes the schema/content idempotently. Restart preserves local users, sessions and learning history. Normal seed does not overwrite admin edits; versioned sample migrations update bundled questions once. The learning-v2 migration keeps existing learners’ subjects/history and lowers unsupported legacy confidence; it never invents retention evidence. For remote PostgreSQL, the database must already exist and the configured role must be allowed to create/update the application schema. Remote PostgreSQL connectivity is implemented but was not available for verification here.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Browser tests start their own API on 3101, Vite on 5174 and a separate database `.data/e2e`. They use only fictional accounts and synthetic microphone audio. Install Playwright Chromium with `pnpm exec playwright install chromium`, or use installed Edge on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
pnpm test:e2e
```

Verification results, screenshot index and design comparison: [docs/QA.md](docs/QA.md).

## Limitations and pilot blockers

- This is a limited testing curriculum, not a complete country/grade program. Some sample prompts/rationales remain in English even with Ukrainian navigation. Teacher review, better distractors and distinct transfer tasks are needed before a real-user pilot. Legacy strand-level questions remain for compatibility; diagnostics and coverage use subskills.
- Mastery/confidence are transparent heuristics, not a calibrated psychometric or CEFR measurement. See [docs/PROGRESSION.md](docs/PROGRESSION.md). Free speaking cannot yet earn proficiency credit.
- Real OpenAI calls, paid-account/model availability, external PostgreSQL and physical device audio have not been verified. Local/mock operation is verified.
- Short transactions fix the provider-blocking problem. A multi-worker deployment still needs durable jobs, distributed provider deduplication, request quotas, timeouts/recovery and a load test. History shown in the UI is capped at 500; report aggregation reads the full history and needs database-side aggregation for larger datasets.
- Consent, verified email/password recovery, retention/export/deletion, HTTPS hosting and backup/restore drills are still required before enrolling real children. No public deployment is included.
- Legacy v0.1 evidence did not store confidence snapshots. New weekly comparisons are reliable from the v0.2 evidence boundary; older records are preserved rather than retroactively assigned fabricated confidence/retention.

## Next steps

1. Review and improve the focused Math/Physics/B1 content with teachers.
2. Calibrate mastery, confidence, retention and diagnostic stopping thresholds on held-out learner evidence.
3. Validate real text AI with spend controls before enabling voice charges.
4. Add consent, account recovery and transcript retention/export/deletion workflows.
5. Verify staging PostgreSQL, backup/restore, HTTPS, multi-worker concurrency and physical browser/device accessibility/audio.

Returning to a previously well-assessed subject automatically uses a short diagnostic recheck (up to 12 questions); sparse subjects keep the full 24-question limit.
