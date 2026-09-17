# Varta — Architectural Decisions

This file records project-level decisions that Codex must preserve unless the owner explicitly changes them.

## VARTA-001 — Varta is observation-only
**Status:** accepted

Varta receives and analyzes camera video but does not control PTZ, actuators, vehicles, weapons or other physical mechanisms.

Reason: the current product is an observation/operator-assistance system. Keeping observation separate from physical control makes scope, safety, testing and deployment clearer.

---

## VARTA-002 — Local-first operation
**Status:** accepted

Camera ingest, recording, local event detection, event journal and operator UI must function without Internet access or OpenAI API access.

Cloud AI is optional enrichment and must not become a single point of failure.

---

## VARTA-003 — Preserve original recording stream; use sampled frames for preview/analysis
**Status:** accepted

When recording is enabled, FFmpeg stores the source video stream in segmented MKV files while also producing lower-rate/lower-resolution JPEG frames for the operator preview and lightweight local detector.

Reason: preview/analysis efficiency must not unnecessarily reduce archive quality.

---

## VARTA-004 — Event semantics must remain conservative
**Status:** accepted

The current motion detector reports image change in a configured ROI. A dark event reports a prolonged very dark frame. Neither may be described as confirmed human presence, intrusion, sabotage, intent or identity unless a future explicitly validated semantic detector is added.

Cloud prompts/descriptions must distinguish observations from hypotheses and must not invent causes.

---

## VARTA-005 — Operator access is LAN-oriented and authenticated
**Status:** accepted

Remote access from the operator computer is intended for a trusted LAN and requires the operator token/session mechanism. Public Internet exposure of the FastAPI port is not a default deployment model.

Credentials, RTSP URLs and API keys remain local deployment secrets and are not committed to Git.

---

## VARTA-006 — Camera workers fail independently
**Status:** accepted

Loss or bad configuration of one camera must not terminate other camera workers, the event store or operator UI. Camera status and reconnect events are surfaced independently.

---

## VARTA-007 — Automated tests do not prove physical camera compatibility
**Status:** accepted

Synthetic/unit/integration tests validate software behavior only. Hikvision/RTSP/HaLow compatibility is considered confirmed only after an explicit physical deployment test.

At baseline commit `841743e`, physical camera ingest remained under diagnosis.

---

## VARTA-008 — Current deployment target is Windows base PC
**Status:** accepted

Primary deployment target is Windows with Python 3.12. The built frontend in `dist/` must remain usable without requiring Node.js on the deployed base PC.

Cross-platform support may be added later but must not silently break the Windows path.
