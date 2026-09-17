# Varta — Architecture

## Goal
Varta is a local-first observation system for an airsoft base. It collects video from up to three IP cameras, keeps local recordings, detects simple visual changes, stores an event journal, exposes a browser-based operator interface, and can optionally enrich selected events with a cloud model.

## Current data flow

```text
IP cameras (Hikvision)
        |
        | RTSP over LAN / HaLow bridge
        v
Base PC (Windows)
  |
  +-- FFmpeg per camera
  |     +-- original video -> segmented MKV recordings
  |     +-- sampled/scaled JPEG frames -> preview + local detector
  |
  +-- CameraWorker
  |     +-- reconnect state
  |     +-- online/offline/restored events
  |     +-- motion/change detector in configured ROI
  |     +-- dark-frame detector
  |
  +-- Service
  |     +-- coordinates camera workers
  |     +-- maintenance / retention
  |     +-- optional cloud queue
  |     +-- chat over recent event journal
  |
  +-- SQLite Store
  |     +-- event journal
  |     +-- review state
  |     +-- cloud queue/call accounting
  |     +-- persistent monitoring-pause state
  |
  +-- FastAPI
  |     +-- operator authentication/session
  |     +-- status/events/frame/recording endpoints
  |     +-- monitoring pause
  |     +-- local/cloud chat
  |
  +-- React/Vite static UI
        +-- camera panels
        +-- event log
        +-- event details/review
        +-- recordings/archive
        +-- chat
```

## Processing model
### Camera ingest
Each configured camera is handled independently. FFmpeg is responsible for RTSP input. The stream is copied to local MKV segments when recording is enabled and simultaneously sampled into JPEG frames for the UI and lightweight analysis.

A camera failure must not stop other cameras or the web application. Camera workers reconnect independently.

### Local detection
The current detector is intentionally simple:
- frame-change ratio inside a configured ROI;
- consecutive-frame confirmation;
- cooldown between motion/change events;
- prolonged very-dark-frame event.

These signals are not semantic recognition. A `motion` event means a meaningful image change crossed the configured threshold, not that a person or threat was identified.

### Event journal
Events are written to SQLite. Events may carry a snapshot. Cloud enrichment, when enabled, works from queued snapshot events and updates their descriptions asynchronously.

### Cloud enrichment
Cloud processing is optional. It must be treated as an enrichment layer, not a dependency of observation or recording. Rate limits, API errors and missing credentials must degrade to local behavior without interrupting camera ingest.

### Operator UI
The operator PC needs only a browser. The base PC remains the system of record and keeps running even when the browser closes.

## Trust boundaries
### Camera network
RTSP credentials are deployment secrets and remain local to the base PC.

### Operator LAN
Remote operator access over LAN requires `VARTA_OPERATOR_TOKEN`. Session state is held in an HTTP-only cookie. Deployment is intended for a trusted LAN; public Internet exposure is not a default architecture.

### Cloud boundary
Only data explicitly selected by the application for cloud enrichment should cross the cloud boundary. Local video archives are not automatically uploaded as part of the current architecture.

## Failure behavior
- **Cloud unavailable:** recording and local journal continue.
- **Browser/operator PC unavailable:** base PC recording and workers continue.
- **One camera unavailable:** that camera emits offline status/events; other cameras continue.
- **Storage constraint:** maintenance manages owned closed recording segments; storage health is surfaced in status.
- **Bad/absent camera configuration:** camera remains unavailable/unconfigured; no invented fallback stream.

## Deployment target
Current primary deployment target is Windows with Python 3.12 on the base PC. The built frontend in `dist/` allows deployment without Node.js on the base station.

## Architectural boundaries
Varta currently does **not** include:
- PTZ/physical actuation;
- weapon or firing control;
- vehicle/UGV control;
- biometric identity recognition;
- confirmed human detection;
- autonomous response to observed events.

Any future expansion across these boundaries requires an explicit architectural decision in `docs/DECISIONS.md` before implementation.
