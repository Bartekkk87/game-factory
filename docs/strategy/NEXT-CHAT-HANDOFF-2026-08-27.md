# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue `Bartekkk87/game-factory` seamlessly from the current post-L4 implementation state.

**Start directly with final L4 closure: wire the dedicated L4 integrity test into the Verifier Selftest workflow, prove the full workflow green, then perform the top-down integrity check.**

L1, L2 and L3 are fully complete and verified. L4 implementation is materially complete, but one regression-integration item remains before L4 can be declared DONE.

**Do not start paid Titan Canary #3 yet.**

## Canonical sources

1. `docs/strategy/HARDENING-STATUS-2026-08-27-L4.md`
2. `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
3. `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
4. `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
5. `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
6. `ARCHITECTURE.md`
7. GitHub Issue #3 — `Production Hardening before Titan Canary #3`

## Current branch and verified code state

Working branch: `hardening/l4-production-agents`

Latest L4 code head before documentation commits:

`b19ac17243326235eebdd8c62079c0df667ca46d`

Latest full existing Verifier Selftest on that head:

GitHub Actions Run `33049921260` — **SUCCESS**.

Important nuance: `factory/src/roles/test-production-agents.mjs` was added at that head, but it is **not yet executed explicitly by `.github/workflows/verify.yml`**. The workflow checked the file syntactically and all existing tests passed, but the dedicated L4 assertions themselves still need to be wired and run.

Documentation commits after `b19ac...` do not alter runtime behavior.

## Completed

- **L1 Control Kernel — DONE**
- **L2 Model / Provider Layer — DONE**
- **L3 Verification & Evidence — DONE**
- **L4 Production Agents — implementation complete; final regression integration pending**

## What L4 changed

### Engineer

- stale random-input / ~15s verifier wording removed;
- aligned with fixed deterministic seed/input behavior and `start -> early -> mid -> end` evidence;
- bounded runtime `game.event(type, data)` evidence required for product-specific mechanics;
- immutable Owner Contract explicitly passed to Build / Repair / Rebuild / Polish;
- Acceptance/Probe mapping explicitly supplied;
- fail-closed when Owner Contract or stable traceability is missing;
- repair, Fresh Rebuild and verified-polish rollback behavior preserved.

### Playtester

Now receives:

- Owner Contract;
- compact GDD;
- Acceptance/Probe mapping;
- telemetry;
- bounded runtime events;
- screenshots;
- objective metrics;
- deterministic Product Fidelity result.

Returns separate independent product-fidelity review and Experience score/critique. Playtester fidelity is advisory; deterministic Product Fidelity remains authoritative.

### Auditor

- strictly advisory only;
- no own release PASS/FAIL;
- returns `CONSISTENT` / `CONCERNS` assessment plus findings/summary;
- sees Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release Gate;
- release authority remains exclusively deterministic `releaseFor(...)`.

### Reference lane

Router tests pin:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

No unbenchmarked DeepSeek for the reference Titan.

### CI

`factory/prompts/**` changes now trigger the full Verifier Selftest workflow.

## L4 verification history

All these full existing workflow runs succeeded after the respective production changes:

- `33048507658`
- `33048635648`
- `33048970244`
- `33049092906`
- `33049183969`
- `33049293313`
- `33049385943`
- `33049485667`
- `33049672597`
- `33049770257`
- `33049921260`

## Immediate next work — do this first

### 1. Wire the dedicated L4 integrity test

File already exists:

`factory/src/roles/test-production-agents.mjs`

Add an explicit workflow step in `.github/workflows/verify.yml`, e.g. execute:

`node factory/src/roles/test-production-agents.mjs`

The test asserts:

- Engineer deterministic-verifier wording and immutable Owner Contract binding;
- stable Acceptance/Probe traceability;
- Playtester Fidelity/Experience separation;
- Auditor advisory-only boundary;
- deterministic release authority independent of Auditor/Playtester fidelity disagreement;
- Terra/Luna reference routes;
- Owner Contract -> Director Traceability -> Product Fidelity -> Release Gate integrity.

### 2. Full Verifier Selftest

After wiring the step, require the entire workflow to finish **SUCCESS** before doing anything else.

If it fails: fix the platform/test issue, rerun the full selftest, and continue only when green.

### 3. Top-down integrity check

Then prove the complete chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> deterministic Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

No Owner requirement may disappear or be downgraded between layers.

After this check is clean, update the canonical status/catalog/Issue #3 and mark L4/P0 DONE.

## Canary rule

**No Titan Canary #3 until:**

1. dedicated L4 integrity test is wired and actually executed;
2. full Verifier Selftest is green;
3. top-down integrity check is complete.

Only then run exactly one paid `Titan Core: Reforged` reference Canary #3.

If that canary fails:

`classify -> repair platform -> full selftest -> only then decide on another paid run`

## Working style

Brief, simple status communication. No unnecessary Owner terminal work or micromanagement when GitHub/tools can do it. Gaming Development only.
