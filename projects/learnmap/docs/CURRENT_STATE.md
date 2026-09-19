# Current state — LearnMap 0.3 Pilot

Pilot consent/withdrawal, parent-controlled Speaking, privacy export/deletion, retention cleanup, fixed first-party telemetry, admin aggregates, optional feedback and content approval are implemented. Existing subjects and design remain. Deterministic objective grading is unchanged.

Local QA: 61 unit/API/contract tests and 9 browser scenarios pass, plus build/lint/typecheck. Real OpenAI synthetic smoke passed on 2026-09-18; see LIVE-OPENAI.md. Hosting is deferred by the owner; external PostgreSQL and backup/restore are not verified. This is an alpha candidate with operational gates, not a deployed pilot. See ../PILOT.md and QA-PILOT.md.


## Experimental AR Lab branch

`feature/learnmap-ar-lab` adds the first Physics AR Lab experiment: a camera-backed drone landing mission with five authored kinematics tasks and three bonus tasks. The prototype uses local browser camera video with a LearnMap overlay; no camera frames are uploaded. Fixed first-party events record starts, predictions, completions and voluntary continuation, and pilot aggregates expose AR continuation rate. Snap Camera Kit is intentionally not a runtime dependency yet; the first experiment validates the learning/retention mechanic before provider-specific surface tracking is added.

Two focused tests were added for mission math and AR telemetry. They have not been executed in the connector-only editing environment; existing previously documented QA results refer to `main` before this branch.
