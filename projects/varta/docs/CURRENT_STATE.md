# Varta — Current State

Baseline reviewed: commit `841743e` from 2026-09-17.

## Implemented
- Up to three configured IP cameras.
- RTSP ingest through FFmpeg.
- Independent camera reconnect loops.
- Original video recording into segmented MKV files without audio.
- Sampled/scaled JPEG frames for preview and local analysis.
- Simple ROI frame-change detector with consecutive-frame confirmation and cooldown.
- Prolonged dark-frame event.
- Online/offline/restored camera status and events.
- SQLite event journal and persistent monitoring-pause state.
- Event snapshots, filtering/review workflow and recording archive endpoints.
- React/Vite operator interface served by FastAPI.
- Operator authentication for LAN access through `VARTA_OPERATOR_TOKEN` and HTTP-only session cookie.
- Optional cloud descriptions/chat with queueing, retries and hourly call limit.
- Local fallback chat over recent journal entries when cloud AI is not configured.
- Demo mode without external API calls.
- RTSP diagnostics designed not to print secrets.
- Windows deployment instructions and office-test profile.

## Automated verification
At the reviewed baseline the repository reports **14 automated tests passing**. The project also reports a local test with real FFmpeg processing of synthetic video.

This verifies software paths only; it does not yet prove physical Hikvision/HaLow operation.

## Unresolved deployment issue
During the office test, camera 1 did not deliver video into Varta even though video was reportedly visible in another viewer. The exact cause is not yet confirmed.

The repository already contains RTSP diagnostics that attempt TCP and UDP and classify failures without exposing credentials. The next engineering action should be driven by the diagnostic report from the actual base PC rather than by speculative code changes.

Camera 2 was also not yet fully configured in the captured office-test state.

## Not yet validated
- Stable physical ingest from both office cameras.
- Recording and reconnection across the actual HaLow/radio bridge.
- Cloud event descriptions with the production API configuration.
- Long-duration three-camera operation.
- Approximately 8-hour endurance/storage behavior under real streams.
- Final tuning of ROI, motion threshold and cooldown for the deployment site.
- OS service/autostart behavior.

## Recommended next sequence
1. Run `python -m backend.diagnose` on the actual base PC with camera 1 configured.
2. Save/review `data/diagnostics.txt` and identify the confirmed failure category.
3. Fix only the evidenced RTSP/FFmpeg/network issue and add a regression test where practical.
4. Validate camera 1 live preview and recording.
5. Configure and validate camera 2 over the radio/HaLow path.
6. Test reconnect behavior by intentionally interrupting/restoring the camera/network link.
7. Enable cloud AI only after the local two-camera path is stable.
8. Run a long-duration test and then add Windows autostart/service deployment.

## Development rule for next task
Do not redesign the application before the physical RTSP diagnostic is resolved. The current architecture is sufficient for the next validation step; prioritize evidence from the actual camera path.
