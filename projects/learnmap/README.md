# LearnMap 0.1

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

- Email/password registration, login, logout, server sessions and Student/Parent/Admin authorization.
- Minimal onboarding: nickname, age, grade, country, learning and interface language. English and Ukrainian UI.
- Mathematics (15 skills), Physics (18 skills), English B1 (6 strands), 351 sample questions, stored prerequisite graph. Seed averages: Math 68%, Physics 54%; English strands 72/65/81/61/58/54.
- Eight-question adaptive diagnostics: rising difficulty, prerequisite fallback, persisted responses and evidence. Unchecked skills stay unassessed.
- Interactive knowledge graph with skill inspector, confidence, attempts, hints and review date.
- Daily priority plan, updated from actual evidence: weak prerequisites, review dates, developing skills and new material.
- Lessons: 2 review questions, explanation, 1 guided question, 3 independent questions, 2 mini-test questions, saved result. Five progressive hints; independent work has more weight.
- Separate XP, learning level, streak and weekly goal. No invented activity history.
- Speaking: three modes, scenarios/topics, microphone start/stop, 60-second bound, transcription review, typed fallback, feedback, voice reply, persisted dialogue and completion. Finishing a conversation counts one session; individual turns contribute evidence and time.
- Listening: narrated passage, comprehension question, optional transcript counted as a hint, separate mastery.
- Parent: multiple linked children, access checks, activity, actual time, subject/skill trends, strengths, gaps, recommendations, weekly report and print action. Dashboard refreshes every 15 seconds.
- Admin: JSON editor for subjects, curricula/grades/CEFR, topics, skills/dependencies, question bank and prompts; user display-name editing and platform statistics. Dependency cycles are rejected. Role changes require server provisioning.

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

`pnpm db:seed` initializes the schema/content idempotently. Restart preserves local users, sessions and learning history. Normal seed does not overwrite admin edits; the versioned distractor migration fixes initial sample content once. For remote PostgreSQL, the database must already exist and the configured role must be allowed to create/update the application schema. Remote PostgreSQL connectivity is implemented but was not available for verification here.

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

## Limitations

- Sample content is a testing curriculum, not a full country/grade-aligned program. Grade selection is stored, but this release shares the grade-10/B1 sample across students. Several English reading/listening questions reuse a sample scenario.
- Mastery/confidence use transparent heuristics, not a validated psychometric model. They need calibration with real learning evidence. Speaking mastery is conservative text-practice evidence, not a complete proficiency or pronunciation measurement.
- Mock AI is intentionally limited. Live API credentials, model availability, voice quality and real-device microphone/audio playback still need an operator check. Browser voice availability varies.
- The local database uses a serialized transaction queue for correctness; provider calls currently hold the transaction queue. Use background jobs and short transactions before concurrent family-scale deployment.
- Weekly reports derive from the latest 500 events; historical archives and large-scale analytics require pagination/aggregation work.
- No email verification, password recovery, account deletion/export UI, consent workflow or public hosting. Raw audio is not persisted, but transcripts remain in the learning database. Plan retention/consent operations before enrolling real children.
- Admin editing is functional structured JSON, not a rich authoring studio. No self-service privilege changes or content deletion, which could invalidate learning history.

## Next 10 tasks, in priority order

1. Configure and validate a staging PostgreSQL database, backups and restore.
2. Verify real OpenAI transcription, feedback and synthesis against live account access.
3. Add consent, transcript retention, account export and deletion workflows.
4. Add verified email, password reset and secure invitation management/revocation.
5. Review sample questions with teachers; expand distinct reading/listening material.
6. Add country/grade curricula and diagnostic coverage for all skills.
7. Calibrate mastery/confidence and hint weights; track uncertainty and delayed retention.
8. Shorten database transactions, queue AI work and test concurrent families.
9. Test physical iOS/Android microphones, Safari, accessibility and voice playback.
10. Deploy an HTTPS pilot for 20–50 families and measure retention, learning time and parent-report usage.
