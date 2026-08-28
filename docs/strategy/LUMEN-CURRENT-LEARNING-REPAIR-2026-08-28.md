# Lumen Current — Learning Repair / Director State Contract — 28.08.2026

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

PR `#36` (`repair/lumen-learning-contract-20260828`) is intentionally zero-paid and bounded to the proven failure.

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

A new inactive reanalysis Candidate is stored as:
`learning/candidates/candidate-production-run-b37ac8d268e8549c.json`

Candidate properties:
- role: `director`
- target layer: `skill`
- source run: `20260828-201007`
- confidence: `1`
- active: `false`
- no authority to validate itself, activate, promote, weaken gates or start paid work.

`skill`, `prompt`, `verifier` and `evaluation` remain protected layers. The repair is only effective after deterministic regression evidence and human merge.

## Golden Corpus coverage

The Lumen regression is attached to the existing Golden Corpus root-cause / Learning falsification execution path rather than silently changing the frozen S2 baseline contract:
- seed: `fr-root-cause-diagnostic-independence`
- executable: `factory/src/learning/test-root-cause.mjs`

That executable now proves both:
- independent diagnostic semantics remain separate from verifier state semantics; and
- the real Lumen early Director failure is recognized as `director-verifier-state-contract-mismatch` and maps to the protected `skill` layer.

Because the S2 runner deduplicates and executes the seed script, a regression of the Lumen assertion causes the existing Golden Corpus case to fail. The corpus population/count remains unchanged at `29` until a separately reviewed corpus-baseline revision is warranted.

## Validation evidence

First complete zero-paid repair verifier:
- commit: `b826bf67bd1cf98517ed315fac8bdb0ee5cac6b3`
- Full Verifier: `33208519229`
- result: **SUCCESS in all 37 steps**
- Golden Corpus S2: PASS on the frozen 29-case baseline
- API / model-backed corpus cost: `$0`

Further validation after orchestration/candidate binding is required before merge. No second paid Production Canary is authorized by this document.
