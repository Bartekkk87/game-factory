# Next Chat Handoff — Game Factory — Final P0 Acceptance

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue `Bartekkk87/game-factory` seamlessly from the **final verified external-audit P0 closure** on `main`.

**L1, L2, L3, L4 and audit P0-01 through P0-05 are complete and verified.**

Do not reopen them unless a concrete regression exposes a defect.

**No paid Titan Canary #3 has been started. Do not start it without a new explicit Owner instruction.**

## Canonical sources

1. `docs/strategy/P0-FINAL-ACCEPTANCE-2026-08-27.md`
2. `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
3. `docs/strategy/HARDENING-STATUS-2026-08-27-L4.md`
4. `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
5. `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
6. `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
7. `ARCHITECTURE.md`
8. GitHub Issue #3 — `Production Hardening before Titan Canary #3`

## Final verified runtime state

Final runtime commit on `main`:

`69aac9f26d7004aa8be19ed0ec61fc649f3d6565`

Final full Verifier Selftest:

GitHub Actions Run `33060506910` — **SUCCESS**.

Per-gate verification:

- P0-01 Skill Integrity — Run `33059358311` — SUCCESS
- P0-02 Skill CI / Assembled Prompt Regression — Run `33059654534` — SUCCESS
- P0-03 Product Fidelity Hardening — Run `33060152626` — SUCCESS
- P0-04 Structural Release Authority Guard — Run `33060326700` — SUCCESS
- P0-05 Model Routing Single Source of Truth + final Full Selftest — Run `33060506910` — SUCCESS

## P0-01 — Skill Integrity — DONE

- stale `random key mash`, `random input` and `~15 seconds` verifier guidance removed from active Director/Engineer skills;
- active skills aligned to fixed deterministic RNG/input behavior and `start -> early -> mid -> end` telemetry;
- regression test rejects stale guidance in active skill text.

## P0-02 — Skill CI / Assembled Prompt Regression — DONE

- `skills/**` now triggers the full Verifier Selftest;
- runtime system-prompt assembly is centralized;
- Director and Engineer use the same assembly function tested by CI;
- Base Prompt + Skill + Lessons are tested as actually assembled;
- Lesson injection is explicitly regression-tested.

## P0-03 — Product Fidelity Hardening — DONE

Positive Must-Have `event` probes can no longer PASS on event-name presence alone.

For positive event evidence, deterministic Product Fidelity now requires correlated gameplay evidence, including relevant playing state/timing after the Early evidence boundary and independent engine-observed progress.

Adversarial proof:

`fake boss_entered event + no mechanic/progress -> Product Fidelity FAIL`

Positive control:

`post-early event + real gameplay progress -> Product Fidelity PASS`

Director and Engineer prompts were aligned to these strengthened semantics.

### Important P0-03 failure classification

Run `33059960409` passed the new P0-03 adversarial hardening test but failed later in the existing runtime-green verifier fixture.

Root cause: the old green fixture itself emitted `boss_entered` before the newly enforced Early evidence boundary.

Classification: **fixture defect, not production defect**.

The fixture was corrected. Full Run `33060152626` then passed. No blind rerun was used.

## P0-04 — Structural Release Authority Guard — DONE

`evaluateReleaseGate(...)` now accepts only the deterministic release-relevant surface:

- `technical`
- `productFidelity`
- `experienceScore`
- `budget`
- `minExperience` / deterministic threshold policy

Unexpected fields are rejected.

Therefore `audit`, `playtesterFidelity` or other LLM/advisory fields cannot enter the release-gate API and cannot affect release authority.

## P0-05 — Model Routing Single Source of Truth — DONE

- removed the competing legacy `LLM` / provider-role configuration from `factory/src/config.mjs`;
- canonical runtime routing remains in Role Router + Provider/Model Registries;
- router remains fail-closed;
- regression prevents a second apparent routing authority from returning to `config.mjs`.

Reference route remains:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

DeepSeek/Open-Weight remains a later benchmark lane.

## Final top-down integrity check — PASS

Verified chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity -> Playtester -> Experience -> Budget -> deterministic Release Gate -> Owner Preview`

Key authority properties:

- Owner Contract stays immutable and traceable.
- Engineer Build/Repair/Rebuild/Polish receives Owner Contract + normalized traceability.
- Verifier uses fixed deterministic seed/input and persisted `start -> early -> mid -> end` evidence.
- Positive mechanic events cannot be proven by event-name presence alone.
- Playtester fidelity remains advisory.
- Auditor remains advisory.
- Release Gate accepts no advisory/LLM fields.
- Model routing has exactly one canonical runtime source.
- Only deterministic release PASS may advance the verified candidate toward Owner Preview.

Result: **PASS**.

## Current decision point

Technical readiness for exactly one controlled paid `Titan Core: Reforged` Canary #3: **YES**.

Operational authorization: **NO until the Owner gives a new explicit instruction**.

**STOP. Do not start Canary #3 automatically.**

If the Owner explicitly authorizes Canary #3 in the next chat, run exactly one controlled paid reference Canary.

If it fails:

`classify cause -> repair platform -> full Verifier Selftest -> only then decide whether another paid run is justified`

No blind paid reruns.

## Deferred P1 / P2 scope

After reference Canary evidence, continue with the already recorded sequence, including:

- Owner Contract decomposition for complex unstructured briefs;
- idle-baseline causality proof;
- stronger inter-frame visual activity proof;
- art-direction skill wiring cleanup;
- structured lesson schema;
- candidate vs validated lessons;
- self-modification guard;
- deterministic Improvement aggregation + threshold triggers;
- controlled evidence-driven learning;
- multi-seed / alternate deterministic input robustness;
- model-outcome benchmarking by cost per verified release and convergence quality.

Until the controlled Improvement layer is actually built and proven, do **not** describe the Factory as fully self-improving.

Target principle remains: **evidence-driven controlled improvement**.

## Working style

Brief, simple status communication. No unnecessary Owner terminal work or micromanagement when GitHub/tools can do it. Gaming Development only.
