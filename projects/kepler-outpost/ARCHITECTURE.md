# Kepler Outpost — Bounded Project Canary

Kepler Outpost is the smallest concrete Project Game fixture chosen to exercise the approved Project Canary proof objective. M1 is intentionally limited to a deterministic power-and-mining loop and host-owned persistence.

## M1 — persistent playable core

The Engineer may modify only the four scoped files under `src/`. Verification files and persistence authority are read-only.

Required behavior:

- initial durable state: `power=0`, `ore=0`, `turn=0`;
- `GENERATE_POWER` adds two power and advances one turn;
- `MINE_ORE` consumes one power, adds one ore and advances one turn;
- mining without power does not advance durable state;
- the browser UI exposes Generate, Mine, Save and Load controls;
- Save uses `project-game.persistence-bridge/v1`;
- after a host-page reload, Load restores the full durable state.

A later milestone is not defined here. It may be contracted only after M1 has produced a real verified baseline, durable evidence and regression records.
