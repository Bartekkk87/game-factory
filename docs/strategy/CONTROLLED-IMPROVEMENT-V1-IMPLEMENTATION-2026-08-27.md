# Controlled Improvement v1 — Implementation Status — updated 28.08.2026

## Scope

This document records the implemented state of Evidence-Driven Controlled Improvement v1 plus the model/provider hardening and the first real Production-failure path that reached a validated protected-layer Candidate and human-reviewed application.

Preferred claim: **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

No automatic self-validation, self-promotion or paid retry authority is granted by this architecture.

## Canonical lifecycle

`raw durable evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis/root cause -> inactive candidate -> validation/regression -> validated inactive -> explicit human application/promotion -> post-application regression -> reversible/auditable state`

Protected target layers include:

`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`, `evaluation`.

Hard invariants:
- `/reject` and `/feedback` preserve durable Owner evidence but do not directly create active lessons;
- `lessonsFor(role)` exposes only `status=validated && active=true`;
- legacy lessons normalize fail-closed as unvalidated/inactive;
- analysis may propose but not validate, activate, promote, edit Production, weaken gates, change authority or start paid work;
- Candidate state and applied code/policy state remain separate concepts.

## Implementation modules

Core learning path:
- `factory/src/learning/owner-feedback.mjs`
- `factory/src/learning/aggregate.mjs`
- `factory/src/learning/trigger.mjs`
- `factory/src/learning/analysis.mjs`
- `factory/src/learning/orchestrate.mjs`
- `factory/src/learning/root-cause.mjs`
- `factory/src/learning/lifecycle.mjs`

Persistent role guidance:
- `skills/directing.md`
- `skills/engineering.md`
- `skills/art-direction.md`

Evaluation/closure support:
- Golden Corpus S0–S5
- `learning-validation-v1`
- `learning-application-receipt-v1` / `APPLIED-CLOSED` mechanism for eligible protected non-prompt applications.

## Real RUN-EVIDENCE support

The deterministic aggregator consumes the canonical nested Production evidence shape (`run.id`, `gates.*`, `costs.attempts`, stage budgets and role/model/operation cost tables) plus explicit relevant attempt evidence.

Failed-run root cause can also inspect early durable `FAILURE.json` signatures when no GDD or Engineer attempt exists. This closes the gap exposed by Lumen Current Canary #1.

## Real learning case 1 — Titan Canary #3

Production evidence:
- run `33069903383`
- Technical PASS
- Product Fidelity PASS after autonomous repair
- Experience `7.7/10` after polish
- cost `$0.442821` / `109,703` tokens
- Owner hands-on: **PRODUCT ACCEPTANCE FAIL**.

Durable learning artifacts preserved the Owner result, aggregate, trigger, bounded analysis and an inactive candidate. Competing hypotheses remained open because the evidence did not justify a single causal root cause.

This demonstrated:

`real Production/Owner evidence -> deterministic aggregate/trigger -> bounded analysis -> inactive candidate`

It did not yet demonstrate validation + human application.

## Real learning case 2 — Lumen Current Canary #1

### Production failure

Owner-authorized run:
- Produce Game run `33207019862`
- durable run `runs/20260828-201007/`
- evidence commit `70200dce341fc06d0213991ff569481dd99774f6`
- cost `$0.050686`
- tokens `7,883`
- Engineer / Repair / Polish calls `0 / 0 / 0`.

Director proof-plan values:
- `PR-MH-03 -> restored`
- `PR-MH-04 -> glass_breach`.

Both were unsupported `state_reached` verifier states. The fail-closed proof-plan compiler stopped before Engineer spend.

### First learning result

The historical automatic Learning run safely triggered analysis but produced no Candidate because early `director_failed` signatures were not yet a recognized root-cause family. Those old artifacts remain unchanged as truthful audit evidence.

### Evidence-backed repair

The real failure justified exactly three bounded repair themes:
1. make the finite verifier-state protocol explicit to Director runtime/prompt/skill;
2. recognize early unsupported-state Director failures deterministically in root cause;
3. bind exact Owner brief bytes across preflight and Production ingestion.

The repair deliberately did **not** weaken fail-closed verification and did not accept arbitrary product-specific aliases.

### Candidate

Durable Candidate:
`learning/candidates/candidate-production-run-b37ac8d268e8549c.json`

Current state:
- role `director`
- scope `case-root-cause`
- target layer `skill`
- source run `20260828-201007`
- confidence `1`
- `status=validated`
- `active=false`.

Canonical validation:
`learning/validations/candidate-production-run-b37ac8d268e8549c.json`

The Candidate remains inactive because a protected skill/code application is not the same as an active Memory lesson.

### Validation evidence

Zero-paid pre-merge Full Verifiers:
- `33208519229` — SUCCESS, all 37 steps;
- `33209130248` — SUCCESS, all 37 steps after real Candidate binding;
- `33209616277` — SUCCESS with validated-inactive enforcement.

Golden Corpus remained:
- 29/29 Expected Outcomes;
- 0 mismatches;
- 0 Critical False PASS;
- API/model-backed validation cost `$0`.

### Human-reviewed application

PR `#36` was merged after validation.

Merge commit:
`7af126e3300b23c19bd088ca32c08c7e81947d8b`

The application updates the Director runtime contract, Director prompt and `skills/directing.md` while keeping the Candidate inactive. Exact-main post-merge Full Verifier is run `33211092911`.

This demonstrates, for the first time in this Factory, the real sequence:

`real Production failure -> durable evidence -> deterministic failure class -> protected-layer Candidate -> zero-paid validation -> validated inactive -> human merge`

## What is actually learned

The learned rule is generalized rather than game-name-specific:

**Verifier protocol semantics are separate from product fiction. `state_reached` must use only the finite protocol supplied by the verifier contract; thematic states belong in events, UI or world-state data.**

This rule is persisted in `skills/directing.md` and reinforced by the runtime/prompt contract.

## Golden Corpus relationship

The Lumen regression is attached to the existing root-cause diagnostic execution path so the frozen S2 baseline is not silently rewritten. A failure of the new Lumen assertions causes the existing executable seed path to fail.

Golden Corpus provides regression evidence; it has no authority to apply Production changes.

## Model/provider boundary

The existing router remains the only model-routing authority. OpenAI remains the Production reference; the Lumen evidence did not justify a model/provider switch because the failure was a contract/Learning defect.

OpenRouter lanes remain isolated. Benchmark or improvement work cannot silently fall back to Production credentials or mutate Production defaults.

## Cost boundary

Automatic Learning analysis/root-cause/candidate lifecycle is deterministic Node/Git logic and does not call `chat()`.

Paid/model-billed work occurs only through the normal LLM client/router path. A future paid retry must be separately Owner-authorized.

## Current proof boundary

Now demonstrated:
- real Owner/Production evidence into controlled learning;
- deterministic single-run failed-root-cause classification for supported classes;
- inactive Candidate creation;
- zero-paid Candidate validation/regression;
- validated-inactive protected-layer Candidate;
- human-reviewed application through GitHub merge.

Still unproven:
- that this learning improves a later Owner-accepted game;
- that the same architecture transfers unchanged outside Gaming;
- fully self-modifying/self-authorizing operation.

Canonical explanation:
`docs/strategy/LEARNING-ARCHITECTURE-EVIDENCE-TO-APPLIED-CHANGE-2026-08-28.md`
