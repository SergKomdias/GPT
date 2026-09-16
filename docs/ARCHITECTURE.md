# DRT Control Platform — Architecture

## Goal
Create a reusable control platform for remotely operated and semi-autonomous vehicles. Toyota Hilux is the first reference vehicle, not a one-off architecture.

## High-level stack

```text
Operator UI / Mission UI
        |
        v
Command Gateway / Control API
        |
        +-------------------+
        |                   |
        v                   v
Mission / Autonomy      Telemetry / Video
        |
        v
Safety Supervisor
        |
        v
Vehicle Abstraction Layer
        |
        v
Vehicle Adapter (Hilux first)
        |
        v
DRT Core / CAN / Actuators / ECUs
```

## Priority model
1. Emergency / hard safety
2. Operator override
3. Deterministic automation / autopilot
4. AI agent / LLM layer

No lower-priority layer may bypass a higher-priority layer.

## Edge vs cloud
### On-board / edge
- safety supervisor;
- watchdogs;
- command validation;
- vehicle interface;
- actuator control;
- CAN and local buses;
- minimum telemetry;
- minimum perception required for safe stop;
- communications failover state machine.

### Cloud / remote services
May provide:
- AI agent / LLM;
- mission planning;
- analytics;
- fleet management;
- long-term storage;
- non-critical video analysis.

Loss of cloud connectivity must not make the vehicle unsafe.

## Vehicle abstraction
Shared code should depend on an abstract vehicle contract, for example:

```text
Vehicle
- setSteering(...)
- setThrottle(...)
- setBrake(...)
- setGear(...)
- setIgnition(...)
- emergencyStop()
- getState()
```

Exact signatures are implementation decisions; no real CAN IDs or actuator ranges are assumed yet.

## Communications abstraction
The application sees logical links rather than bearer-specific logic.
Possible bearers include:
- private LTE / Volodar;
- commercial LTE;
- Starlink;
- HaLow / Mesh;
- radio / other backup links.

The Network Supervisor should track at minimum:
- availability;
- latency;
- packet loss;
- jitter if available;
- effective bitrate;
- last successful heartbeat.

Failover policy must be configuration-driven.

## Safety supervisor
The Safety Supervisor validates all motion-affecting commands and owns the final permission to apply them.
It should support deterministic state transitions such as:

```text
DISARMED
READY
REMOTE_CONTROL
AUTONOMOUS
DEGRADED
SAFE_STOP
EMERGENCY_STOP
FAULT
```

Exact transitions will be specified incrementally.

## Telemetry
Common telemetry schema should support:
- speed;
- steering angle;
- throttle / brake request and actual values;
- gear;
- RPM;
- power / battery / fuel status where available;
- GNSS / heading / IMU where available;
- network state;
- software state;
- faults and alarms.

Vehicle-specific telemetry extensions are allowed but should not pollute the common schema.

## Video
Video transport is independent from vehicle control logic. The implementation may use WebRTC, SRT, RTSP or another transport depending on latency/reliability needs.

## Simulation
Every hardware-facing service should have a fake/simulation implementation where practical. The initial system must be testable without a connected Hilux.

## Configuration
Expected configuration groups:

```text
config/
  vehicle.yaml
  safety.yaml
  network.yaml
  cameras.yaml
  telemetry.yaml
```

Secrets must not be committed to the repository.

## Logging
Log at minimum:
- operator commands;
- autonomy/AI requests;
- accepted/rejected vehicle commands;
- safety state transitions;
- network transitions;
- faults;
- emergency events;
- software version/build information.

## Initial development sequence
1. Define interfaces and data models.
2. Implement simulator/fake vehicle.
3. Implement Safety Supervisor state machine.
4. Implement basic Command Gateway.
5. Implement telemetry/event logging.
6. Implement Network Supervisor.
7. Add Hilux adapter once verified hardware/CAN/actuator information is available.
8. Add mission/autonomy/AI above the deterministic control layers.
