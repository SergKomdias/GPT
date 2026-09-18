# LearnMap 0.3 deployment runbook

Deployment preparation has resumed. No staging/production URL or external PostgreSQL has been verified. A proposed Render configuration is in `render.yaml`; see [українська інструкція розгортання](deploy/RENDER.uk.md). Account access and paid resources are not provisioned. The Docker/Caddy configuration remains an alternative starting point. Docker is not installed in the verification environment, so image build and certificate issuance remain staging checks.

## One-process alpha deployment

Use one application instance for the 3–5 learner alpha. `compose.pilot.yaml` exposes only Caddy on 80/443; the app is reachable only on the internal container network. Point a real DNS hostname at the server and allow certificate issuance. Caddy terminates HTTPS and forwards to the app. `TRUST_PROXY=1` is safe only with this single trusted proxy and no direct public app port.

Create `.env.production` outside source control using the hosting secret store. Set:

```dotenv
NODE_ENV=production
PILOT_MODE=true
ENABLE_DEMO=false
AI_PROVIDER=openai
APP_ORIGIN=https://your-real-hostname
DATABASE_URL=
OPENAI_API_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
PILOT_INVITE_CODE=
SPEAKING_RETENTION_DAYS=30
PILOT_TIMEZONE=Europe/Kyiv
```

Blank values must be provisioned, not deployed literally. Use a dedicated PostgreSQL database/role, encrypted transport with certificate verification (for example `sslmode=verify-full` with your provider CA), a project-scoped OpenAI key and a randomly generated invite code. Never use `VITE_*` for server secrets. Do not disable PostgreSQL certificate verification. Set an OpenAI project spend budget/alerts before testing.

Export `PUBLIC_HOST` in the operator shell (hostname only), then from `projects/learnmap`:

```sh
docker compose -f compose.pilot.yaml up -d --build
```

Production startup rejects demo mode, missing PostgreSQL and a non-HTTPS origin. Session cookies are HttpOnly, Secure and SameSite=Strict; production mutation origins must match APP_ORIGIN. The app sets HSTS. No advertising analytics or payments are included.

## Migration and startup

Startup loads environment, validates configuration, creates the database connection, applies the additive idempotent schema inside a transaction, seeds bundled content inside a short transaction, purges expired transcripts and then listens. Schema migration IDs include `pilot-v3`. Existing content is initially draft; no teacher approvals are fabricated. Run only one migration/startup instance at a time. Never run old application code against a restored newer schema without compatibility review.

`pnpm db:migrate` performs the same schema/seed process without opening HTTP. `pnpm privacy:purge` performs retention cleanup. The server also cleans at startup and hourly; monitor failures. `/health` checks database connectivity and returns 200/503 with no configuration secrets. Readiness does not prove live AI, consent or content approval readiness.

Deployment acceptance: check HTTPS/cookie headers, `/health`, invitation-only registration, linked-parent consent/withdrawal, approved-content lesson, synthetic AI smoke and database persistence after restart. Use a separate staging database and fictional accounts first.

## Backup and restore

Use the managed PostgreSQL provider's encrypted daily backups and point-in-time recovery if available. For the alpha, retain backups no more than 7 days, restrict operator access and verify a restore before inviting children. Backups contain personal data even after a live-table delete; tell families the backup expiry window.

For an operator-controlled snapshot, configure `PGSERVICE`/`PGPASSFILE` or the provider's secure connection mechanism; do not put passwords in command arguments or repository files:

```sh
pg_dump --format=custom --no-owner --file=learnmap-backup.dump
# Target a NEW isolated restore database, never the running production database.
pg_restore --no-owner --no-privileges --dbname=learnmap_restore learnmap-backup.dump
```

Encrypt/archive the dump in restricted storage; `.dump` files are gitignored. Restore into an isolated database, apply current migrations and retention cleanup, replay deletion/withdrawal requests made since the backup, then verify counts, consent state, a fictional login/lesson and `/health`. Keep the original database until the restore is accepted. Pause traffic during a real recovery; switch DATABASE_URL through the secret store only after verification. Record recovery time and last recoverable timestamp. Do not restore deleted accounts to service inadvertently. Backup scheduling, encryption and this restore drill are operator tasks not executed here.

## Live OpenAI verification

Set OPENAI_API_KEY locally in `.env` and run `pnpm pilot:smoke`. This explicitly calls the paid provider using an isolated in-memory database, fictional text and TTS-generated synthetic speech. It checks explanations, hint levels 1–5, mistake explanations, structured feedback, contextual replies, TTS and transcription. It prints check names/statuses, not credentials or learner data. It never reads production learner records. Human review of mathematical explanations, hint disclosure, relevance and audible voice remains necessary even after transport smoke passes.

API contracts: [Responses](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create), [Audio](https://developers.openai.com/api/reference/typescript/resources/audio). Provider data handling is separate from LearnMap's local transcript retention; `store:false` is not a promise of zero provider retention.
