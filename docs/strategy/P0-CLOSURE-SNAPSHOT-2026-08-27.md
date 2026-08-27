# Game Factory — P0 Closure Snapshot

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Status

**Production Hardening P0 is complete and verified on `main`.**

- L1 Control Kernel — DONE
- L2 Model / Provider Layer — DONE
- L3 Verification & Evidence — DONE
- L4 Production Agents / P0 — DONE
- L4 merged via PR #5
- verified runtime merge commit: `f7b5e2ebd75e405d857b3bec19d85231e02eaef8`
- final full `main` Verifier Selftest: Run `33051402235` — SUCCESS
- paid `Titan Core: Reforged` Canary #3 — **NOT STARTED**

## Consolidated findings

### 1. Control Kernel

The control plane now owns cost and release authority:

- model-aware cost tracking;
- cost attribution by role/model/operation/attempt;
- fail-closed budget checks before paid calls;
- bounded Repair / Polish / Fresh Rebuild budgets;
- deterministic release gate;
- unified run evidence.

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

No LLM owns the final release verdict.

### 2. Model / Provider Layer

Reference route is explicit and fail-closed:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

No silent cross-provider fallback is allowed. DeepSeek remains a later benchmark lane, not the verified reference route.

### 3. Verification & Evidence

The runtime chain is bound to owner intent through evidence:

- immutable Owner Contract;
- stable Owner Requirement IDs;
- Director Acceptance / Probe traceability;
- deterministic seed and stored input sequence;
- `start -> early -> mid -> end` telemetry;
- bounded runtime/mechanic events;
- candidate SHA evidence;
- deterministic Product Fidelity PASS/FAIL.

Technical PASS alone is insufficient. Candidate progression requires deterministic Product Fidelity PASS as well.

### 4. Production Agents

#### Engineer

- receives Owner Contract + traceability for Build / Repair / Rebuild / Polish;
- uses deterministic verifier expectations instead of stale random-input / ~15-second wording;
- emits bounded `game.event(type, data)` evidence for product-specific mechanics;
- fails closed on missing/invalid contract traceability;
- preserves targeted Repair, Fresh Rebuild escalation and verified-polish rollback.

#### Playtester

Receives Owner Contract, compact GDD, Acceptance/Probe mapping, telemetry, runtime events, screenshots, metrics and deterministic Product Fidelity result.

Returns separately:

- independent Product Fidelity review;
- Experience score + critique.

Playtester Fidelity is advisory relative to deterministic Product Fidelity.

#### Auditor

- strictly advisory;
- no release PASS/FAIL authority;
- produces consistency assessment/findings/summary;
- sanitizes any stray LLM `verdict` field;
- sees Technical, deterministic Fidelity, Playtester Fidelity, Experience, Budget and deterministic release state.

`releaseFor(...)` remains sole release authority.

## L4 acceptance lesson

The first explicit L4 test run, `33050802610`, failed because the selftest assertion rejected any literal `audit.verdict` usage. Production only used that field to sanitize/delete an unauthorized LLM verdict.

This was **a test-definition defect, not a production release-authority defect**.

The assertion was corrected at commit:

`ce0d061cbad98e8f2f5948e0910fd300dbd0b573`

Then:

- branch full selftest Run `33050867522` — SUCCESS
- merged `main` full selftest Run `33051402235` — SUCCESS

## Top-down integrity — PASS

Verified chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

Key conclusion:

**No Owner requirement may disappear between intake and review, and the current chain preserves and verifies that traceability.**

## Restart rule

Exactly one controlled paid `Titan Core: Reforged` Canary #3 is technically eligible after P0 closure.

**Do not start it without a new explicit Owner instruction.**

If a later canary fails:

`classify cause -> repair platform -> full Verifier Selftest -> only then decide whether another paid run is justified`

## Canonical sources

- `docs/strategy/HARDENING-STATUS-2026-08-27-L4.md`
- `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
- `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
- `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
- `docs/strategy/NEXT-CHAT-HANDOFF-2026-08-27.md`
- `ARCHITECTURE.md`
- GitHub Issue #3 — Production Hardening before Titan Canary #3

## Notion mirror

Consolidated Notion snapshot:

`https://app.notion.com/p/3c98920148bd819ba458c5a05037cdb6?pvs=204`
