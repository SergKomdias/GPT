# Varta — instructions for Codex

## Scope
`projects/varta/` is an independent observation project. It is not part of the DRT vehicle-control stack.

Varta receives video from IP cameras, records it locally, detects simple visual events, keeps an event journal, provides an operator UI, and may optionally use a cloud model to describe selected event frames or answer questions over journal excerpts.

It is observation-only. Do not add PTZ control, actuators, firing, vehicle control, access-control actuation, or other physical control unless the project owner explicitly changes scope.

## Read first
Before substantial work, read:
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/CURRENT_STATE.md`
- relevant operational instructions in `OFFICE-TEST.md` / `RUNBOOK.md`

## Non-negotiable rules
1. **Local-first.** Camera ingest, recording, event journal, operator access and basic monitoring must keep working without OpenAI API or Internet access.
2. **Cloud is optional enrichment.** Failure, rate limiting or absence of cloud AI must not stop recording or local event handling.
3. **Observation-only semantics.** Do not present simple frame-change detection as person recognition, intrusion confirmation, identity recognition or intent inference.
4. **Conservative descriptions.** Distinguish observed facts from hypotheses. Never invent why an event happened.
5. **Secrets stay local.** Never commit `.env`, RTSP credentials, API keys, operator tokens, private camera addresses, local recordings, snapshots or the live SQLite database.
6. **Operator LAN access remains authenticated.** Do not weaken the existing access checks for convenience. Do not expose port 8765 to the public Internet as a default deployment pattern.
7. **Recording has priority over UI/cloud features.** A browser closing, cloud outage or chat failure must not stop camera ingest/recording.
8. **Do not fabricate hardware details.** Unknown camera/network/HaLow parameters are `TODO/UNKNOWN` until measured or provided.
9. **Diagnostics must avoid secrets.** Logs and diagnostic reports must not print RTSP URLs with credentials or other secrets.
10. **Tests are required.** Preserve existing tests and add regression tests for changed backend behavior, especially authentication, camera reconnects, storage cleanup, event handling and cloud-fallback logic.

## Engineering preferences
- Keep backend modules small and explicit: ingest, storage, service/orchestration, cloud enrichment, API/UI boundary.
- Prefer configuration over hardcoded deployment values.
- Keep Windows deployment working unless a change explicitly targets another OS.
- Preserve a demo/test mode that does not require physical cameras or cloud APIs.
- Treat physical camera tests separately from synthetic/unit tests; do not claim hardware compatibility solely from automated tests.

## Completion rule
After every substantial task:
1. run the relevant automated tests;
2. update `docs/CURRENT_STATE.md` with what changed, tests run, known limitations and next step;
3. add an entry to `docs/DECISIONS.md` when architecture/scope/security semantics change.
