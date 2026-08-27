# Game Factory — Hardening Status L4 / Production Agents

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`
Branch: `hardening/l4-production-agents`

## Status

L1 Control Kernel, L2 Model / Provider Layer and L3 Verification & Evidence remain completed and verified.

**L4 Production Agents / P0 implementation is materially complete. Final L4 regression integration is still open before L4 can be declared fully DONE.**

No paid `Titan Core: Reforged` Canary #3 has been started.

## L4 changes completed

### CI coverage

- Prompt changes under `factory/prompts/**` now trigger the full `Verifier Selftest` workflow.
- Existing runtime/control/router/verifier/publishing checks therefore run after production-agent prompt changes as well.

### Engineer

- Removed stale random-input / ~15-second verifier wording.
- Prompt now describes the fixed deterministic verifier seed/input behavior and `start -> early -> mid -> end` evidence timeline.
- Product-specific requirements are expected to emit bounded `game.event(type, data)` runtime evidence.
- Build / Repair / Rebuild / Polish explicitly receive the immutable Owner Contract.
- Acceptance Criteria and Probe mappings are explicitly included in Engineer context.
- Engineer fails closed when the immutable Owner Contract or stable Acceptance/Probe traceability is missing.
- Existing targeted repair, Fresh Rebuild escalation and verified-polish rollback behavior remains intact.

### Playtester

- Playtester now receives Owner Contract, compact GDD, Acceptance/Probe mapping, telemetry, bounded runtime events, screenshots, objective metrics and deterministic Product Fidelity results.
- Playtester output separates independent product-fidelity review from Experience scoring/critique.
- Deterministic Product Fidelity remains authoritative; Playtester fidelity is advisory and cannot override the machine gate.

### Auditor

- Auditor is explicitly advisory only.
- Auditor no longer produces a release `PASS/FAIL` verdict.
- Output is `CONSISTENT` / `CONCERNS` style assessment plus findings/summary.
- Auditor receives the relevant Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release Gate state.
- Deterministic `releaseFor(...)` remains the only release authority.

### Reference model lane

Router tests explicitly pin the OpenAI reference lane:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

DeepSeek remains a later benchmark lane, not the unbenchmarked reference-Titan route.

## L4 commit history

- `177a710234c427fce151d92227c2951b5ce47525` — CI triggers full selftest for production prompt changes
- `ac5c97916dae51f572188c713b583c673308fa75` — Engineer aligned with deterministic verifier evidence
- `a7a3e63c5353469e8b0c90a0dc240b4caac2078c` — production contracts passed through agent lanes
- `9261e1a6459620c0e89a76f72988bf92b438b583` — Engineer bound to immutable Owner Contract
- `56fd161c8d7a8a5bc8f41903204b867b0fe4b8f4` — independent Playtester fidelity review
- `d7ffb5c1f9a0a471c70bfc251e7b3164fd27dc31` — full fidelity evidence supplied to Playtester
- `4b7804242b24773b5c5c963fefab1b21ac8198ac` — Auditor prompt made strictly advisory
- `3f5c42c3cd06f71e1138b3da075c613b560de1fd` — Auditor release verdict removed from code
- `46cca8d93bfa3fe8d871bb230e9bc568cc8bf900` — agent review lanes kept non-authoritative in pipeline
- `67a71455c7330e4473130138cffbc72ed0556336` — all production-agent reference routes pinned in router tests
- `b19ac17243326235eebdd8c62079c0df667ca46d` — dedicated L4 production-agent integrity test added

## Full Verifier Selftest history during L4

Each completed production change was followed by a green full workflow before continuing:

- `33048507658` — SUCCESS
- `33048635648` — SUCCESS
- `33048970244` — SUCCESS
- `33049092906` — SUCCESS
- `33049183969` — SUCCESS
- `33049293313` — SUCCESS
- `33049385943` — SUCCESS
- `33049485667` — SUCCESS
- `33049672597` — SUCCESS
- `33049770257` — SUCCESS
- `33049921260` — SUCCESS

Run `33049921260` is the latest full existing workflow run and is green on head `b19ac17243326235eebdd8c62079c0df667ca46d`.

## Important remaining L4 closure item

`factory/src/roles/test-production-agents.mjs` now contains dedicated L4 integrity assertions for:

- stale Engineer verifier wording removal;
- immutable Owner Contract / Acceptance / Probe binding;
- Playtester fidelity/experience separation;
- Auditor advisory-only authority;
- deterministic release authority;
- Terra/Luna reference routing;
- end-to-end Owner Contract -> traceability -> Product Fidelity -> Release Gate integrity.

**This new test file is not yet wired as an explicit execution step in `.github/workflows/verify.yml`.** The latest full workflow validated syntax and all existing checks, but did not execute this dedicated L4 assertion file as a test command.

Therefore the next chat must not mark L4 fully DONE until it:

1. adds an explicit workflow step running `node factory/src/roles/test-production-agents.mjs`;
2. runs the full Verifier Selftest and confirms SUCCESS;
3. performs the top-down integrity check.

## Next work order

1. Wire and execute the dedicated L4 integrity selftest.
2. Require the complete Verifier Selftest to be green.
3. Perform the full top-down integrity check:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> deterministic Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

4. If and only if this is clean, L4/P0 can be declared DONE and the platform becomes eligible for exactly one paid `Titan Core: Reforged` Canary #3.

## Canary rule

Do not start paid Canary #3 before the two remaining closure items above are green. If a later paid canary fails, classify the failure and repair the platform before spending on another run.
