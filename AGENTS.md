# AGENTS.md

## Purpose
This repository is the working software base for DRT remote-control and autonomous vehicle projects.
The first reference platform is Toyota Hilux, but architecture must remain reusable for other UGV/USV platforms.

## Read first
Before making significant changes, read:
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/CURRENT_STATE.md`

## Core rules
1. Do not hardcode vehicle-specific behavior into shared modules.
2. Use a Vehicle Adapter / Hardware Abstraction Layer for each platform.
3. Safety-critical logic must run locally and must not depend on cloud/LLM availability.
4. AI/LLM components must not directly command physical actuators; commands pass through deterministic validation and the Safety Supervisor.
5. Operator and emergency controls have priority over autonomy/AI.
6. Every communications channel is a transport; application logic must not depend on one specific bearer such as LTE, Starlink, HaLow, or radio.
7. Unknown CAN IDs, pinouts, ECU protocols, credentials, addresses, and hardware parameters must be marked `TODO/UNKNOWN`; never invent them.
8. Prefer configuration files over hardcoded values.
9. Add simulation/mocking paths for hardware-dependent modules where practical.
10. Add tests for safety logic, state machines, command validation, failover, and vehicle adapters.

## Expected structure
```text
src/
  core/
  safety/
  comms/
  telemetry/
  video/
  mission/
  ai/
  vehicle/
    base/
    hilux/
config/
tests/
docs/
```

## Completion rule
After a substantial task, update `docs/CURRENT_STATE.md` with:
- what was implemented;
- important files changed;
- tests run and their result;
- known limitations / TODOs;
- recommended next step.

If a new architectural decision is introduced, add it to `docs/DECISIONS.md` before or together with the implementation.
