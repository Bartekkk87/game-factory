# Game Factory — Umsetzungskatalog 27.08.2026

> Status update 27.08.2026: Audit-P0 is complete and Titan Canary #3 has now passed the full production chain. The detailed Canary result is recorded in `docs/strategy/TITAN-CANARY-3-RESULT-2026-08-27.md`.

## Current status

- P0-01 through P0-05: **PASS**
- Full Verifier Selftest before final Canary retry: Run `33069438003` — **SUCCESS**
- Titan Canary #3 final controlled retry: Run `33069903383` — **SUCCESS**
- Production result: `Titan Core: Reforged`
- Deterministic Release Gate: **PASS**
- Technical: **PASS**
- Product Fidelity: **PASS**
- Experience: **7.7 / 10** (threshold 6.5)
- Playtester Fidelity: **PASS** (advisory)
- Budget: **PASS** — `$0.442821` LLM/API cost, `109703` tokens
- Review status: **awaiting Owner review**
- Review issue: `#6 [Review] Titan Core: Reforged`

## Architecture decision

Production Factory:

`Owner Idea -> Immutable Owner Contract -> Director -> Engineer Build/Repair/Rebuild/Polish -> Deterministic Verifier Evidence -> Technical + Product Fidelity -> Independent Playtester -> Budget -> deterministic Release Gate -> Owner Preview`

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

Auditor and Playtester Fidelity remain advisory and outside the binding release-gate API.

Improvement Factory target:

`Run Evidence -> deterministic Aggregation -> Threshold -> Improvement Analysis -> Lesson Candidate -> Validation -> Regression -> versioned/human-gated activation`

Unverified learning outputs must not alter the Production Factory.

## P0 — complete

### P0-01 Skill Integrity — PASS
Deterministic keyboard/pointer sequence and persisted RNG seed are aligned with active skills; no luck-dependent verifier contract remains.

### P0-02 Skill CI / Assembled Prompt Regression — PASS
`skills/**` and `factory/src/**` trigger relevant verification and the assembled runtime prompt is covered by regression tests.

### P0-03 Product Fidelity Hardening — PASS
Complex Must-Have event probes require correlated gameplay evidence; fake/too-early events do not satisfy the gate.

### P0-04 Release Authority Structural Guard — PASS
Release authority is structurally restricted to Technical, Product Fidelity, Experience and Budget inputs.

### P0-05 Model Routing Single Source of Truth — PASS
Runtime role/model routing is canonical in the router; competing role-model configuration was removed.

## Titan Canary #3 — reference evidence

Final retry run `33069903383` exercised the intended autonomous loop:

1. Director completed successfully with `gpt-5.6-terra`.
2. Initial Engineer build was generated.
3. Verification detected two Product Fidelity timing failures.
4. Engineer repair corrected them autonomously.
5. Technical + Product Fidelity then passed.
6. Initial playtest scored `3.4 / 10`.
7. One autonomous Polish round preserved verification contracts.
8. Second playtest scored `7.7 / 10` and advisory Playtester Fidelity passed.
9. Auditor completed with advisory `CONCERNS` only.
10. Deterministic Release Gate passed.
11. Draft and evidence were committed automatically and Review Issue #6 was opened.

This is the first strong current-version reference Canary demonstrating a complete Idea -> Build -> Verify -> Repair -> Playtest -> Polish -> Release-Gate -> Owner-Review chain.

## P1 — next, after Owner review

- P1-01 Owner Contract Decomposition
- P1-02 Verifier Causality / Idle Baseline
- P1-03 Visual Activity Proof
- P1-04 Art-Direction Skill Wiring
- P1-05 Structured Memory Schema
- P1-06 Candidate vs Validated Lesson
- P1-07 Self-Modification Guard
- P1-08 Deterministic Improvement Aggregator
- P1-09 Improvement Trigger
- P1-10 Engineer Learning Candidates

Owner review of `Titan Core: Reforged` is intentionally pending. Owner feedback should be captured before deciding whether this Canary evidence changes P1 prioritization.

## P2 — Controlled Continuous Improvement

- P2-01 Improvement Analysis
- P2-02 Validation & Regression
- P2-03 Positive Learning
- P2-04 Owner Feedback Classification
- P2-05 Skill Governance
- P2-06 Verifier Robustness / multi-seed
- P2-07 Model Outcome Benchmarking by cost per verified release

## Terminology

Current state:
- Intra-run adaptive repair: **YES — now demonstrated in live Canary evidence**
- Cross-run learning: **limited / partial**
- Self-improving Factory: **NOT YET**

Preferred target term: **evidence-driven controlled improvement**.

## Next decision point

No new paid Canary is authorized by this document. The immediate next input is the Owner's hands-on review of `Titan Core: Reforged`. After that feedback, decide whether to approve/reject the candidate and how to sequence P1 work.
