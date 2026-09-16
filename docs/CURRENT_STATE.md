# DRT Control Platform — Current State

## Repository state
Initial architecture scaffold created. No production control code has been implemented yet.

## Implemented
- Codex working instructions in `AGENTS.md`.
- High-level reusable control architecture in `docs/ARCHITECTURE.md`.
- Persistent architectural decisions in `docs/DECISIONS.md`.

## Not yet implemented
- project source tree;
- common data models;
- Vehicle interface;
- simulated vehicle;
- Safety Supervisor;
- Command Gateway;
- telemetry/event logging;
- Network Supervisor;
- Hilux Vehicle Adapter;
- operator UI;
- video subsystem;
- mission/autonomy layer;
- AI agent integration.

## Known unknowns / required hardware facts
Before implementing a real Hilux adapter, obtain and verify as applicable:
- exact Hilux model/year/trim used as reference vehicle;
- steering actuation method;
- throttle/brake control method;
- transmission/gear control method;
- ignition/start-stop interface;
- CAN buses used and verified messages, if any;
- actuator ranges and safe limits;
- emergency-stop hardware path;
- on-board PC/DRT Core interfaces;
- camera topology;
- current communications topology.

Do not guess missing values.

## Recommended next task
Create the software skeleton and a fully simulated first vertical slice:

`Operator command -> Command Gateway -> Safety Supervisor -> Simulated Vehicle -> Telemetry/Event Log`

Acceptance target:
- project runs without physical hardware;
- command is accepted or rejected deterministically;
- emergency stop has highest priority;
- simulated telemetry reflects accepted commands;
- automated tests cover core safety behavior.

## Update discipline
After each substantial Codex task, replace/update this document with the new implementation status, tests run, unresolved issues, and next recommended step.
