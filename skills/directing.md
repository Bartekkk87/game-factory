# Directing — learned directives for the Creative Director role.
# Post-mortems append rules here. Owner may edit freely.

- Design mechanics for the factory's fixed deterministic keyboard/pointer input sequence and persisted RNG seed; required gameplay evidence must not depend on lucky collisions, rare spawns or precise aim.
- The core action must be productively interactive by the verifier's early evidence point and remain observable across the persisted start -> early -> mid -> end telemetry timeline.
- Keep arenas single-screen (960x540) unless the mechanic truly needs scrolling; scrolling adds verification risk.
- Design at least one "signature moment" per game (a specific juicy interaction a player would remember).
- Verifier state vocabulary is protocol, not fiction: for state_reached probes use only values supplied by verifierStateContract. Put thematic states such as restored, breached or escaped into gameplay events, UI copy or world-state data instead of inventing custom verifier states.
