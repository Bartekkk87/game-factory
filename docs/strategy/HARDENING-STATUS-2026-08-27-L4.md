# Game Factory — Hardening Status — Final P0 / Production Agents

Date: 2026-08-27  
Repository: `Bartekkk87/game-factory`

## Status

**L1-L4 plus normalized external-audit P0-01 through P0-05 are DONE and verified on `main`.**

Final verified runtime commit:

`69aac9f26d7004aa8be19ed0ec61fc649f3d6565`

Final full `main` Verifier Selftest:

GitHub Actions Run `33060506910` — **SUCCESS**

No paid `Titan Core: Reforged` Canary #3 has been started.

Technical Canary readiness: **YES**.  
Operational authorization: **NO until a new explicit Owner instruction is given**.

Detailed final acceptance:

`docs/strategy/P0-FINAL-ACCEPTANCE-2026-08-27.md`

## P0-01 — Skill Integrity — PASS

- `skills/directing.md` and `skills/engineering.md` contain no stale random-input/~15-second verifier rules.
- Both use fixed deterministic keyboard/pointer input, persisted seed semantics and `start -> early -> mid -> end` evidence expectations.
- Production-agent integrity regression checks active skill content.

Evidence: Run `33059358311` — SUCCESS.

## P0-02 — Skill CI / Assembled Prompt Regression — PASS

- `skills/**` triggers the complete Verifier Selftest.
- Director and Engineer use centralized `assembleSystemPrompt(...)`.
- CI tests the actual assembled runtime system prompt: Base Prompt + Skill + Lessons.
- Skill injection and Lesson injection are explicitly exercised.
- A stale random/~15s rule reintroduced into an active prompt causes deterministic failure.

Evidence: Run `33059654534` — SUCCESS.

## P0-03 — Product Fidelity Hardening — PASS

- Positive Must-Have `event` probes are normalized to `correlated_gameplay` evidence.
- Event-name presence alone cannot satisfy a complex positive Must-Have.
- The verifier checks engine-captured event state/time/score against the persisted telemetry timeline.
- A qualifying event must occur in active gameplay no earlier than Early evidence and after independent engine-observed score progress.
- Dedicated adversarial fixture proves `fake boss_entered event, no mechanic/progress` => Product Fidelity FAIL.
- Positive control fixture proves genuine post-Early gameplay evidence => PASS.

Run `33059960409` initially exposed an obsolete runtime-green fixture that emitted its Boss event before the new Early boundary. Classification: **fixture defect**, not production defect. The fixture was corrected without a blind rerun.

Final Evidence: Run `33060152626` — SUCCESS.

## P0-04 — Structural Release Authority Guard — PASS

`evaluateReleaseGate(...)` structurally accepts only:

- Technical
- Product Fidelity
- Experience score
- Budget
- deterministic threshold/policy

Unexpected fields are rejected as non-authoritative input.

Regression explicitly proves `audit` and `playtesterFidelity` cannot enter the Release Gate API.

Evidence: Run `33060326700` — SUCCESS.

## P0-05 — Model Routing Single Source of Truth — PASS

- Removed legacy competing `LLM` / provider model table from `factory/src/config.mjs`.
- Canonical runtime selection remains in Role Router + Provider Registry + Model Registry.
- Router regression guards against reintroducing a second `LLM`/`roleModels` configuration in `config.mjs`.
- Routing remains fail-closed.

Reference route:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

Evidence: Run `33060506910` — SUCCESS.

## Final full verification

Final runtime proof Run `33060506910` completed successfully:

- Node syntax checks — PASS
- L1 Control Kernel budgets + deterministic Release Gate — PASS
- L2 Model/Provider Router + capability gates — PASS
- Production-Agent / assembled-prompt integrity — PASS
- P0-03 adversarial Product Fidelity hardening — PASS
- browser install — PASS
- Verifier Green/Broken + runtime fidelity fixtures — PASS
- publishing gates + gallery escaping — PASS

Documentation commits after `69aac9f26d7004aa8be19ed0ec61fc649f3d6565` do not alter this verified runtime proof.

## Top-down integrity check — PASS

Verified chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity -> Playtester -> Experience -> Budget -> deterministic Release Gate -> Owner Preview`

### Owner Idea -> Owner Contract

The pipeline creates the immutable Owner Contract before Director execution. Stable MH/NG IDs and contract hash persist the Owner intent.

### Owner Contract -> Director IDs

Director receives the immutable contract. Traceability compilation requires exactly one stable Acceptance ID and Probe ID for every Owner requirement and fails closed on missing/duplicate/unknown mappings.

### Director IDs -> Engineer

Build, Repair, Fresh Rebuild and Polish receive Owner Contract plus normalized Acceptance/Probe mapping.

### Engineer -> Verifier Evidence

Every candidate is checked with deterministic seed/input, persisted `start -> early -> mid -> end` telemetry, bounded runtime events, technical checks and candidate-SHA evidence.

### Verifier Evidence -> Product Fidelity

Deterministic Product Fidelity binds runtime evidence back to Owner requirements. Positive event probes require correlated gameplay evidence rather than an event-name claim.

### Product Fidelity -> Playtester

Playtester receives deterministic evidence and provides an independent advisory fidelity review plus Experience score/critique. Its fidelity opinion has no release authority.

### Experience + Budget -> Release Gate

Experience threshold and fail-closed budget report remain deterministic release inputs.

### deterministic Release Gate

Binding rule:

`Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS`

Audit/LLM or Playtester-fidelity fields are structurally rejected from the gate input surface.

### Release Gate -> Owner Preview

Only deterministic release PASS permits the verified candidate to advance to draft/review/preview for Owner `/approve` or `/reject`.

Result: **PASS**.

## Remaining risks / deferred scope

These are intentionally deferred to P1/P2 and are not P0 blockers:

- Owner Contract decomposition for complex unstructured briefs;
- idle-baseline causality proof;
- stronger inter-frame visual activity proof;
- art-direction skill wiring cleanup;
- structured memory schema;
- candidate-vs-validated lesson governance;
- self-modification guard for skills/prompts/verifier/contracts;
- deterministic improvement aggregation and triggers;
- controlled evidence-driven improvement loop;
- multi-seed / alternate deterministic input robustness;
- outcome-based model benchmarking including DeepSeek/Open-Weight lanes.

Therefore the Factory must still **not** be described as fully self-improving.

## Decision

**Normalized pre-Canary P0 hardening is fully DONE on `main`.**

The technical prerequisite for exactly one controlled paid Titan Canary #3 is satisfied.

**STOP. Do not start that Canary until the Owner gives a new explicit instruction.**
