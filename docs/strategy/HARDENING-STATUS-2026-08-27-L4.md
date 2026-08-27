# Game Factory — Hardening Status L4 / Production Agents

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Status

**L4 Production Agents / P0 — DONE and verified on `main`.**

L1 Control Kernel, L2 Model / Provider Layer and L3 Verification & Evidence remain completed and verified.

No paid `Titan Core: Reforged` Canary #3 has been started.

## Final verification

L4 was merged through PR #5.

Verified runtime merge commit on `main`:

`f7b5e2ebd75e405d857b3bec19d85231e02eaef8`

Full merged `main` Verifier Selftest:

GitHub Actions Run `33051402235` — **SUCCESS**.

Verified steps:

- Node syntax checks — PASS
- L1 Control Kernel budgets + deterministic release gate — PASS
- L2 model/provider router + capability gates — PASS
- explicit L4 Production-Agent integrity test — PASS
- browser installation — PASS
- Verifier Green/Broken product fixtures — PASS
- publishing gates + gallery escaping — PASS

Documentation-only commits after this merge do not alter the verified runtime.

## L4 closure history

The dedicated L4 test was added at `factory/src/roles/test-production-agents.mjs` and is now executed explicitly by `.github/workflows/verify.yml`:

`node factory/src/roles/test-production-agents.mjs`

Initial explicit Run `33050802610` exposed an overly strict selftest assertion: it rejected the literal `audit.verdict` even though production code only used that field to sanitize/remove a non-authoritative LLM output.

This was a **test-definition defect, not a production release-authority defect**.

The assertion was corrected at code commit:

`ce0d061cbad98e8f2f5948e0910fd300dbd0b573`

Branch Run `33050867522` then passed the complete workflow before merge.

## Engineer — verified

- deterministic verifier wording replaces stale random-input / ~15-second wording;
- Build / Repair / Rebuild / Polish receive immutable Owner Contract;
- Acceptance/Probe mappings are explicit in Engineer context;
- bounded `game.event(type, data)` evidence is required for product-specific mechanics;
- missing/invalid contract traceability fails closed;
- targeted repair, Fresh Rebuild escalation and verified-polish rollback remain intact.

## Playtester — verified

Playtester receives:

- Owner Contract;
- compact GDD;
- Acceptance/Probe mapping;
- telemetry;
- bounded runtime events;
- screenshots;
- objective metrics;
- deterministic Product Fidelity result.

It returns separately:

- independent product-fidelity review;
- Experience score and critique.

Playtester fidelity remains advisory and cannot override deterministic Product Fidelity.

## Auditor — verified

- strictly advisory;
- no release PASS/FAIL authority;
- output is consistency assessment/findings/summary;
- any stray `verdict` field is sanitized;
- receives Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release state.

Deterministic `releaseFor(...)` remains sole release authority.

## Reference model route — verified

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

DeepSeek remains a later benchmark lane.

## Top-down integrity check — PASS

Verified chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

### Owner Idea -> Owner Contract

`produceGame(...)` creates and persists the immutable Owner Contract before Director execution.

### Owner Contract -> Director IDs

Director receives the Owner Contract and stable Owner Requirement -> Acceptance/Probe traceability is compiled and validated.

### Director IDs -> Engineer

Build / Repair / Rebuild / Polish receive Owner Contract and the GDD carrying traceability.

### Engineer -> Verifier Evidence

Every candidate is checked with deterministic seed/input sequence, `start -> early -> mid -> end` telemetry, runtime events, technical checks and candidate SHA evidence.

### Verifier Evidence -> Product Fidelity

`evaluateProductFidelity(...)` binds runtime evidence to Owner Contract requirements and Director traceability. Candidate progression requires Technical PASS and deterministic Product Fidelity PASS.

### Product Fidelity -> Playtester Review

Playtester receives the contract/evidence context and independently reviews product fidelity while keeping Experience separate.

### Experience >= 6.5 + Budget PASS

Production uses the 6.5 Experience threshold and L1's fail-closed cost report.

### deterministic Release Gate

Binding rule:

`Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS`

Auditor or Playtester opinions cannot override it.

### Release Gate -> Owner Preview

Only after deterministic release PASS is the verified candidate written to `drafts/<slug>/index.html`. The Production workflow commits draft/evidence and creates the Review Issue; Pages exposes the preview on `main`; Owner can then `/approve` or `/reject`.

**No Owner requirement disappears between intake and review.**

## Decision

**L4 Production Agents / P0 is fully DONE on `main`.**

The hardening prerequisite for exactly one controlled paid `Titan Core: Reforged` Canary #3 is satisfied.

**That canary was not started in this closure task and requires a new explicit Owner instruction.**

If it later fails:

`classify cause -> repair platform -> full Verifier Selftest -> only then decide whether another paid run is justified`.
