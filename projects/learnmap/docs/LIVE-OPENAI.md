# Live OpenAI verification — 2026-09-18

Command: pnpm pilot:smoke. Exit code: 0. Real OpenAI requests, not mocked network.

| Check | Result | UTC time |
| --- | --- | --- |
| Lesson explanation | Passed | 10:37:17 |
| Hint level 1 | Passed | 10:37:20 |
| Hint level 2 | Passed | 10:37:23 |
| Hint level 3 | Passed | 10:37:24 |
| Hint level 4 | Passed | 10:37:25 |
| Hint level 5 | Passed | 10:37:27 |
| Mistake explanation | Passed | 10:37:29 |
| Speaking grammar/vocabulary/relevance feedback | Passed | 10:37:31 |
| Contextual conversation reply | Passed | 10:37:34 |
| TTS | Passed | 10:37:36 |
| Transcription of synthetic TTS audio | Passed | 10:37:37 |

The script used an isolated in-memory database, a fictional museum conversation and generated speech. It validated successful nonempty results and the adapter's structured feedback/transcription schemas. The local app configuration was switched to AI_PROVIDER=openai. No key, actual learner record or microphone recording is included in this report. Objective Math/Physics grading remains deterministic server-side; no grading code changed.

Limits: this is integration smoke, not a semantic audit of every explanation or hint, teacher approval, real-device microphone verification, subjective TTS listening or production load testing. The unit/API/contract and browser results remain those documented in QA-PILOT.md; this documentation-only update does not rerun them. Hosting remains deferred; external PostgreSQL, HTTPS deployment and backup/restore are still unverified. Restart a running local app to load the updated provider setting.
