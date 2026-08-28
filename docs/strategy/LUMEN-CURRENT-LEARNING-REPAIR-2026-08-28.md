# Lumen Current — Learning Repair / Director State Contract — 28.08.2026

## Status

**APPLICATION CLOSED — `APPLIED-CLOSED` / Candidate remains `validated`, `active=false`.**

This is the first real Game Factory case that traversed:

`Production failure -> durable evidence -> deterministic root cause -> protected-layer Candidate -> zero-paid validation -> validated inactive -> human-reviewed merge -> exact-main regression -> SHA-bound application receipt`

No second paid Lumen run was started.

## Source evidence

Real Production Canary:
- Produce Game run: `33207019862`
- durable run: `runs/20260828-201007/`
- failure evidence commit: `70200dce341fc06d0213991ff569481dd99774f6`
- reason: `director_failed`
- settled cost: `$0.050686`
- Engineer / Repair / Polish calls: `0 / 0 / 0`

Exact deterministic failure:
- `PR-MH-03` used unsupported verifier state `restored`
- `PR-MH-04` used unsupported verifier state `glass_breach`

The existing fail-closed proof-plan boundary behaved correctly. The new failure evidence exposed a Director-to-Verifier protocol gap and an early-failure Learning coverage gap.

## Repair scope

PR `#36` (`repair/lumen-learning-contract-20260828`) was intentionally zero-paid and bounded to the proven failure.

Implemented:
1. `verifierStateContract()` exposes the finite verifier state protocol without changing canonical state semantics.
2. Director runtime receives that contract explicitly beside the Owner Contract and action contract.
3. Director prompt requires `state_reached` to use only the supplied protocol values; thematic states belong in events/UI/world state.
4. `skills/directing.md` receives the generalized learned directive from the Lumen post-mortem.
5. failed-run root-cause analysis can classify early `director_failed` unsupported-state errors directly from durable `FAILURE.json`, even when no GDD/attempt exists.
6. automatic controlled-learning orchestration is regression-tested to turn this failure class into an **inactive Director skill candidate**.
7. exact idea-file bytes are preserved on Production ingestion, so the preflight and Production Owner brief can share the same `ownerBriefSha256`; full Contract SHA may still differ intentionally because `source` provenance is part of the Contract digest.

## Learning / governance

Historical artifacts from the failed Canary are not rewritten. The original orchestration receipt correctly records that the old analyzer produced no Candidate.

Deterministic reanalysis Candidate:
`learning/candidates/candidate-production-run-b37ac8d268e8549c.json`

Candidate properties after validation:
- role: `director`
- target layer: `skill`
- source run: `20260828-201007`
- confidence: `1`
- status: `validated`
- active: `false`
- no authority to activate/promote itself, weaken gates or start paid work.

Canonical validation artifact:
`learning/validations/candidate-production-run-b37ac8d268e8549c.json`

`skill`, `prompt`, `verifier` and `evaluation` remain protected layers. The validated Candidate itself remains inactive; the reviewed code/skill repair is applied through GitHub merge authority rather than self-promotion.

## Golden Corpus coverage

The Lumen regression is attached to the existing Golden Corpus root-cause / Learning falsification execution path rather than silently changing the frozen S2 baseline contract:
- seed: `fr-root-cause-diagnostic-independence`
- executable: `factory/src/learning/test-root-cause.mjs`

That executable now proves both:
- independent diagnostic semantics remain separate from verifier state semantics; and
- the real Lumen early Director failure is recognized as `director-verifier-state-contract-mismatch` and maps to the protected `skill` layer.

Because the S2 runner deduplicates and executes the seed script, a regression of the Lumen assertion causes the existing Golden Corpus case to fail. The corpus population/count remains unchanged at `29` until a separately reviewed corpus-baseline revision is warranted.

## Validation evidence

Zero-paid regression evidence before merge:
- Full Verifier `33208519229` — **SUCCESS in all 37 steps**;
- Full Verifier `33209130248` — **SUCCESS in all 37 steps** after real-run Candidate binding;
- Full Verifier `33209616277` — **SUCCESS** with enforced `validated-inactive` Candidate state;
- Golden Corpus S2 stayed **29/29, 0 mismatches, 0 Critical False PASS**;
- API/model-backed Learning/Corpus cost: `$0`.

## Human application

PR `#36` was human-reviewed and merged to `main` after the validated-inactive gate.

Merge commit:
`7af126e3300b23c19bd088ca32c08c7e81947d8b`

Exact-main post-merge Full Verifier:
- run `33211092911`
- result **SUCCESS in all 37 steps**
- evaluated executable merge `7af126e3300b23c19bd088ca32c08c7e81947d8b`
- Golden Corpus 29/29
- Expected Mismatches 0
- Critical False PASS 0
- Corpus API/model-backed cost `$0`.

## S4 application closure

Durable post-merge regression evidence:
`learning/evidence/applications/candidate-production-run-b37ac8d268e8549c-full-verifier.json`

SHA-bound Golden Corpus application evidence:
`evaluation/results/LUMEN-LEARNING-APPLICATION-CORPUS-7af126e.json`

Immutable application receipt:
`learning/applications/candidate-production-run-b37ac8d268e8549c.json`

Receipt state:
`APPLIED-CLOSED`

The receipt binds:
- exact validated Candidate artifact SHA-256;
- canonical validation artifact SHA-256;
- protected target layer `skill`;
- PR `#36`;
- merge commit `7af126e3300b23c19bd088ca32c08c7e81947d8b`;
- human approval reference;
- exact-main Full Verifier `33211092911`;
- SHA-bound compatible Golden Corpus PASS.

Crucial invariant: `APPLIED-CLOSED` describes the **application**. The Candidate itself remains `status=validated`, `active=false`. No autonomous Memory lesson was promoted.

## What the Factory learned

The reusable lesson is not "Lumen must not use restored". It is:

> Product/thematic semantics and verifier protocol semantics are separate. `state_reached` uses only the finite verifier contract; fictional/game-specific states belong in events, UI or world-state data.

That rule is persisted in `skills/directing.md` and supported by the runtime contract so future Directors receive it automatically.

## Proof boundary

Now demonstrated end-to-end at the architecture/application level:

`real Production failure -> Evidence -> Root Cause -> Candidate -> Validation -> Human Application -> Post-Merge Regression -> Audit Receipt`

Still not demonstrated:
- that the learned change produces a later Owner-accepted game;
- that the same architecture transfers unchanged outside Gaming.

A second paid Lumen/independent Product Canary remains separately Owner-gated.

Canonical architecture explanation:
`docs/strategy/LEARNING-ARCHITECTURE-EVIDENCE-TO-APPLIED-CHANGE-2026-08-28.md`
