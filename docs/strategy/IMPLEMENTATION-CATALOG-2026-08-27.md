# Game Factory — Umsetzungskatalog 27.08.2026

## Current status — corrected final audit view

P0 remains complete. Controlled Improvement v1 plus OpenRouter/model-agnostic infrastructure is implemented and regression-tested.

**Important correction:** this does **not** yet mean the normal Factory runtime has a fully integrated autonomous cross-run learning loop. The learning components exist and Titan #3 proved a real evidence-to-candidate path, but the normal durable Production/Review flow does not yet automatically execute the complete `Aggregate -> Trigger -> bounded Analysis -> inactive Candidate` chain after every applicable run/review.

Current execution backlog: GitHub Issue `#8` — **Final Factory Closure — Learning Orchestration + Secret Migration**.

Durable handoff: `docs/strategy/FINAL-FACTORY-CLOSURE-HANDOFF-2026-08-27.md`.

Runtime baseline before the new documentation-only commits:
- `main`: `cc6dbb4bec60883ec9711ffa0992778090fb0687`
- Post-merge Full Verifier Run `33088856658`: **SUCCESS**

Reference Production Canary remains `Titan Core: Reforged`:
- Production Run `33069903383`
- Technical **PASS**
- Product Fidelity **PASS** after one autonomous repair
- Experience **7.7/10** after one autonomous polish
- Budget / deterministic Release Gate **PASS**
- Cost `$0.442821` / `109703` tokens
- Owner hands-on result **PRODUCT ACCEPTANCE FAIL**

No new paid Game/Titan Canary was started during this documentation/closure preparation.

Owner reports that GitHub Actions repository secrets `OPENAI_PRODUCTION` and `OPENROUTER_PRODUCTION` are now provisioned with the real provider keys. The connector cannot inspect secret values. Current `produce.yml` still uses legacy `GF_LLM_API_KEY` for OpenAI, so runtime Secret Migration remains open.

Detailed Controlled Improvement implementation record:
`docs/strategy/CONTROLLED-IMPROVEMENT-V1-IMPLEMENTATION-2026-08-27.md`

## P0 — complete

- P0-01 Skill Integrity: **PASS**
- P0-02 Skill CI / assembled prompt regression: **PASS**
- P0-03 Product Fidelity hardening: **PASS**
- P0-04 Release Authority structural guard: **PASS**
- P0-05 Model Routing single source of truth: **PASS**

Binding release rule remains:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

Auditor and qualitative Playtester Fidelity remain advisory.

## L0 — Learning Safety Gate — implemented

- `/reject` creates no active Director lesson.
- `/reject` and `/feedback` preserve durable raw Owner evidence.
- raw comment text is unchanged; interpretation is separate metadata.
- `lessonsFor(role)` returns only validated + active lessons.
- legacy lessons fail closed as unvalidated/inactive.
- candidate and validated-inactive learning cannot enter Production prompts.

## L1 — Structured lifecycle — implemented

Candidate records include lifecycle/provenance fields for source runs, feedback IDs, candidate SHA, confidence/evidence count, validation/regression, activation, deactivation, supersession/reversal and promotion reference.

States are explicit:

`candidate -> validated inactive -> active -> deactivated/reversed`

No implicit promotion exists.

## L2 — Owner feedback — implemented

Canonical GitHub comment path:

`learning/evidence/owner-feedback/gh-issue-<issue>-comment-<comment>.json`

Owner feedback captures exact raw body plus issue/comment identity, parsed command/reason, candidate/run provenance and timestamps. `/feedback` can record evidence without approving/rejecting a product.

Classification remains a claim only; it cannot make a lesson globally valid.

## L3 — Deterministic aggregator — component implemented and corrected against real evidence

`factory/src/learning/aggregate.mjs` consumes:
- canonical `runs/**/RUN-EVIDENCE.json` shape;
- relevant attempt evidence;
- Owner feedback evidence.

Outputs include:
- final Technical/Product Fidelity failures;
- attempt-level failure signatures;
- recurring signatures;
- repair/rebuild/polish counts;
- Experience result;
- Owner verdicts/classification claims;
- token/cost by role/model/operation;
- recurring positives where evidence exists.

A real-schema mismatch was discovered when applying the implementation to Titan #3 and fixed before acceptance. Identical input remains deterministic.

**Open integration gap:** the normal Production/Review path does not yet automatically invoke deterministic aggregation as a complete cross-run learning orchestration step.

## L4 — Deterministic trigger — component implemented

Policy: `controlled-improvement-trigger-v1`.

Current rules:
- Owner negative/feedback evidence -> bounded `product-feedback` analysis may run.
- same engineering failure signature across >=2 independent runs -> bounded engineering analysis may run.
- one isolated engineering failure remains intra-run evidence.

Trigger has `canValidate=false`, `canActivate=false`.

**Open integration gap:** trigger evaluation must be automatically connected to the durable aggregate in the normal learning flow.

## L5 — Bounded Improvement Analysis — implemented guard

Authority:
- MAY propose a scoped candidate.
- MUST NOT activate Production.
- MUST NOT edit Production directly.
- MUST NOT change its own authority.
- MUST NOT weaken release gates.

**Open integration gap:** when a deterministic trigger is allowed, the normal learning flow still needs to invoke bounded analysis and persist at most an inactive candidate.

## L6 — Validation / regression — implemented mechanism

Validation requires explicit validation evidence and all supplied regression results to pass. A model assertion is insufficient. Validated candidates remain inactive until separate promotion.

## L7 — Human-gated promotion — implemented mechanism

Protected layers:
- skill
- prompt
- owner-contract
- verifier
- product-fidelity
- release-gate
- engine-contract
- control-plane

These require separate `human-merge` promotion. Activation is versioned and reversible; deactivation removes the lesson from Production visibility.

## Titan #3 — first real learning case

Durable chain exists from already captured evidence:

`real RUN-EVIDENCE + attempt evidence + Owner result -> Aggregate -> Trigger -> bounded Analysis -> inactive Candidate`

Artifacts:
- `learning/evidence/owner-feedback/titan-canary-3-owner-result-2026-08-27.json`
- `learning/aggregates/titan-canary-3-2026-08-27.json`
- `learning/triggers/titan-canary-3-2026-08-27.json`
- `learning/analysis/titan-canary-3-product-acceptance-analysis-v1.json`
- `learning/candidates/titan-canary-3-visual-target-intake-v1.json`

No Owner GitHub `/reject` comment existed on Issue #6, so no comment was fabricated. The approved handoff's exact Owner-result statement is preserved; richer visual expectations are explicitly marked as summarized context.

The candidate targets protected layer `owner-contract`, remains `status=candidate`, `active=false`, and has no Production effect.

Competing hypotheses remain unresolved: intake/Product Truth, Owner Contract decomposition, Director reinterpretation, Product/Visual Fidelity, Experience evaluation, or combination.

## Acceptance gates L-01 through L-14

| Gate | Result | Evidence |
|---|---|---|
| L-01 reject creates no active lesson | PASS | learning selftest + finalize change |
| L-02 raw Owner feedback unchanged | PASS | exact multiline raw-body regression |
| L-03 candidate absent Production | PASS | `lessonsFor` regression |
| L-04 validated inactive absent | PASS | lifecycle regression |
| L-05 only validated+active injected | PASS | lifecycle/memory regression |
| L-06 candidate provenance/source run | PASS | schema + regression + Titan candidate |
| L-07 aggregator deterministic | PASS | repeated-input regression |
| L-08 trigger deterministic | PASS | repeated trigger regression |
| L-09 analysis cannot activate | PASS | authority/runtime regression |
| L-10 protected promotion human-gated | PASS | protected-layer negative test |
| L-11 deactivate/reversal supported | PASS | lifecycle regression |
| L-12 Titan #3 captured safely | PASS | Git-backed real evidence-to-candidate chain |
| L-13 full Production Verifier remains green | PASS | Runs `33083567504`, `33087199746`, `33087639058`, `33088083507`; post-merge `33088856658` |
| L-14 no new paid Canary | PASS | none started |

These gates prove the components and safety boundary; they do not by themselves prove automatic orchestration inside every normal Factory run/review.

## M0 — OpenRouter clean integration

Infrastructure acceptance: **PASS**.

- existing provider/router stack retained;
- canonical OpenRouter route works in regression tests;
- unknown model/provider and missing credential fail closed;
- Production workflow uses an explicit Production credential lane;
- OpenAI Production defaults unchanged;
- no paid game Canary.

Credential update:
- Owner reports `OPENROUTER_PRODUCTION` is provisioned;
- Owner reports `OPENAI_PRODUCTION` is provisioned;
- connector cannot inspect secret values;
- OpenAI workflow migration from legacy `GF_LLM_API_KEY` to `OPENAI_PRODUCTION` remains open;
- live provider proof is optional only after the safe runtime migration decision and is not a paid Game Canary.

## M1 — Benchmark-safe model infrastructure

Infrastructure acceptance: **PASS**.

Registered challenger:
`openrouter:deepseek/deepseek-chat-v3.1`

Verified 27.08.2026 against official OpenRouter metadata:
- context `163840`
- max output `32768`
- structured outputs supported
- `$0.25/M` input
- `$0.13/M` cache read
- `$0.95/M` output

Credential lanes:
- `OPENROUTER_PRODUCTION`
- `OPENROUTER_BENCHMARK`
- `OPENROUTER_IMPROVEMENT`

Benchmark/Improvement do not fall back silently to Production. Challenger configuration cannot silently replace OpenAI defaults. Role and operation overrides remain available.

## Regression evidence

Successful branch Verifier runs:
- `33083567504` — Learning/OpenRouter base safety
- `33087199746` — all-workflow YAML validation / Produce syntax fix
- `33087639058` — canonical RUN-EVIDENCE regression
- `33088083507` — attempt-evidence aggregation regression
- `33088856658` — final post-merge full Verifier on baseline `cc6dbb4bec60883ec9711ffa0992778090fb0687`

A reproduced invalid `produce.yml` failure led to the minimal additional guard: all GitHub workflow YAML is now parsed in Verifier CI.

## Terminology / proof boundary

Current state:
- Intra-run adaptive repair: **YES — live demonstrated**
- real evidence-to-candidate path: **YES — Titan #3 demonstrated**
- automatically integrated cross-run controlled-learning orchestration: **NOT YET CLOSED**
- real validated + human-promoted learning improving a later Owner-accepted game: **NOT YET DEMONSTRATED**
- fully self-improving Factory: **NO**

Preferred term remains **evidence-driven controlled improvement**.

## Final Factory Closure — required before next real Game run

Canonical checklist: GitHub Issue `#8`.

1. **C1 Production Secret Migration** — OpenAI Production uses `OPENAI_PRODUCTION`; OpenRouter Production uses `OPENROUTER_PRODUCTION`; fail-closed credential isolation regression.
2. **C2 Automatic Controlled-Learning Orchestration** — durable Production/Review evidence automatically and idempotently reaches Aggregate -> Trigger -> if allowed bounded Analysis -> inactive Candidate; never auto-validate/activate.
3. **C3 Owner Contract Decomposition** — free-form multi-requirement Owner briefs produce discrete stable traceable Must-Haves/No-Gos instead of one coarse `MH-01`, while preserving original brief/hash/provenance and avoiding invented details.
4. **C4 Verifier Causality + Visual Activity** — deterministic idle/no-input baseline plus bounded inter-frame/equivalent activity evidence with good/bad fixtures.
5. **C5 Art-Direction Skill Runtime Truth** — wire `art-direction.md` through canonical prompt assembly and test it, or remove/correct false runtime claims.
6. Run the complete relevant regression suite and final Full Verifier.
7. Update GitHub + Notion with final commit/run evidence.
8. Do not start a new paid Game/Titan Canary without new explicit Owner approval.

## Deliberately later / not closure blockers

- positive learning from repeated approved/high-quality games;
- advanced Owner feedback preference taxonomy beyond safe candidate scoping;
- mature Skill stale detection;
- seed rotation / multi-seed spot checks;
- P2-07 Model Outcome Benchmarking;
- deterministic adaptive model policy;
- Productionization / IP & Security Gate;
- private-core migration.

## Non-goals retained

- no automatic best-model router;
- no LLM-owned routing policy;
- no silent provider fallback;
- no automatic DeepSeek/GLM Production default;
- no per-Agent API-key proliferation;
- no unvalidated learning in Production;
- no new paid game/Titan Canary without explicit Owner approval.
