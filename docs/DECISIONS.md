# DRT Control Platform — Architecture Decisions

This file records decisions that should remain stable across chats and Codex sessions.

## DEC-001 — Platform, not a Hilux-only application
**Status:** Accepted

Toyota Hilux is the first reference implementation. Shared modules must remain reusable for other vehicles and future UGV/USV platforms.

## DEC-002 — Safety is local and deterministic
**Status:** Accepted

Safety-critical logic, watchdogs, command validation, emergency stop handling, and final actuator permission run locally on the vehicle-side compute and do not depend on cloud services or an LLM.

## DEC-003 — AI cannot directly drive actuators
**Status:** Accepted

AI/LLM modules may propose goals, missions, trajectories, or high-level commands. They may not bypass deterministic control and the Safety Supervisor to command steering, throttle, brake, gear, or other safety-critical actuators directly.

## DEC-004 — Control priority
**Status:** Accepted

Priority order:
1. Emergency / hard safety
2. Operator override
3. Deterministic automation / autopilot
4. AI agent / LLM

## DEC-005 — Communication bearer abstraction
**Status:** Accepted

Private LTE/Volodar, commercial LTE, Starlink, HaLow/Mesh, radio and future links are treated as transport bearers. Higher-level control logic must not be tied to one bearer.

## DEC-006 — Vehicle Adapter pattern
**Status:** Accepted

Hardware- and vehicle-specific details are implemented behind a Vehicle Adapter. Shared control, telemetry, safety, network and mission code operates on common interfaces.

## DEC-007 — Unknown hardware data must remain explicit
**Status:** Accepted

CAN IDs, ECU protocols, actuator limits, pinouts and other unverified parameters must be marked TODO/UNKNOWN and must never be invented to make code appear complete.

## DEC-008 — Simulation is a first-class target
**Status:** Accepted

Core functionality must be runnable and testable using simulated vehicle and network components before connection to real hardware.

## DEC-009 — Repository is the shared source of truth
**Status:** Accepted

Architecture, accepted decisions, current implementation state, tests and known gaps are recorded in this repository rather than depending on chat history. ChatGPT and Codex should both work from these files when reviewing or implementing the system.

## Template for new decisions

```text
## DEC-XXX — Short title
Status: Proposed | Accepted | Superseded

Context:
...

Decision:
...

Consequences:
...
```
