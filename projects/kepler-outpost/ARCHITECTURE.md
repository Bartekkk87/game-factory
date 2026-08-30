# Kepler Outpost — Bounded Project Canary

Kepler Outpost is the smallest concrete Project Game fixture chosen to exercise the already approved Project Canary proof objective. The source material does not define richer Kepler gameplay; this fixture therefore intentionally limits M1 to a deterministic power-and-mining loop and host-owned persistence.

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

## M2 — bounded evolution

M2 is intentionally not materialized as a task before M1 completes. Its contract must inherit the real M1 regression evidence and baseline identity. M2 will add one interacting system without rewriting the M1 core.
