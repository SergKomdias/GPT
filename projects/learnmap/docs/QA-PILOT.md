# LearnMap 0.3 Pilot QA

## Verified locally

- Lint, TypeScript and Vite production build pass.
- 61 tests pass: 40 existing regressions plus 21 pilot/provider/client-bundle tests.
- All 9 Playwright/Edge scenarios pass: the original six flows plus parent consent/privacy/mobile, admin metrics/content approval, and account deletion/logout.
- The new tests cover consent before provider calls, separate Speaking permission, withdrawal during an in-flight provider call, linked-family isolation, exports without credential hashes, transcript/cache removal, account deletion, retention/abandonment cleanup, invite codes, production cookie attributes/config validation, subject/lesson/hint telemetry and feedback eligibility.
- OpenAI adapter tests mock fetch at the network boundary and verify Responses store:false, five hint levels, structured feedback validation, contextual replies, multipart transcription, binary TTS, provider errors/incomplete output and deterministic grading with zero network calls.
- Concurrent HTTP speaking requests through the OpenAI adapter (mocked network) allow another learner's database request to complete. Duplicate request IDs issue one feedback call and persist one turn. Withdrawal prevents the late write.
- The client-secret test builds actual Vite assets in memory with random server-secret sentinels and verifies their absence. No real key is embedded in fixtures.
- Browser plugin not available (no Browser skill listed); used the existing Playwright/Edge workflow. Fictional accounts, in-memory PostgreSQL/PGlite for unit/API tests, isolated .data/e2e for browser tests. No child data or personal microphone samples.

## Screens

- [Pilot admin aggregates](screenshots/v3-admin-metrics.png)
- [Parent consent and privacy](screenshots/v3-parent-consent.png)
- [Mobile privacy controls](screenshots/v3-privacy-mobile.png)

Screenshots were visually inspected. Existing palette/sidebar/layout are retained. Controls and metrics are additions, not a redesign. Desktop 1280×900, mobile 390×844; privacy screenshots capture the complete panel. No document horizontal overflow or page errors in the exercised privacy flow. Fixed the controlled checkbox's asynchronous visual update and a test race against loaded consent state. Earlier v0.1/v0.2 screenshots are historical.

## External verification status

**Live OpenAI synthetic smoke passed on 2026-09-18**, using the locally configured key, fictional text and synthetic speech. All 11 checks completed successfully; see [LIVE-OPENAI.md](LIVE-OPENAI.md). This verifies provider access and the exercised integration paths. It is not teacher validation, a real-microphone test or a subjective audio-quality review.

**Hosting is deferred by the owner.** No deployed URL, external PostgreSQL connection, Docker image execution, HTTPS certificate issuance, backup/restore drill or physical device microphone QA was performed. Docker is not installed in this environment. Configuration is provided in DEPLOYMENT.md; deployment acceptance remains mandatory.

Teacher approval, guardian verification, output review, spend controls and the remaining checklist in PILOT.md are required before the first real child. All seeded curriculum starts draft; test fixtures explicitly approve their own isolated copies and do not approve production content.
