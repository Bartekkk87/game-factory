# Game Factory — Umsetzungskatalog 27.08.2026

## Current status

P0 remains complete. Controlled Improvement v1 plus OpenRouter/model-agnostic infrastructure is now implemented on the controlled-improvement branch and regression-tested.

Reference Production Canary remains `Titan Core: Reforged`:
- Production Run `33069903383`
- Technical **PASS**
- Product Fidelity **PASS** after one autonomous repair
- Experience **7.7/10** after one autonomous polish
- Budget / deterministic Release Gate **PASS**
- Cost `$0.442821` / `109703` tokens
- Owner hands-on result **PRODUCT ACCEPTANCE FAIL**

No new paid Game/Titan Canary was started during this implementation.

Detailed implementation record:
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

## L3 — Deterministic aggregator — implemented and corrected against real evidence

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

## L4 — Deterministic trigger — implemented

Policy: `controlled-improvement-trigger-v1`.

Current rules:
- Owner negative/feedback evidence -> bounded `product-feedback` analysis may run.
- same engineering failure signature across >=2 independent runs -> bounded engineering analysis may run.
- one isolated engineering failure remains intra-run evidence.

Trigger has `canValidate=false`, `canActivate=false`.

## L5 — Bounded Improvement Analysis — implemented

Authority:
- MAY propose a scoped candidate.
- MUST NOT activate Production.
- MUST NOT edit Production directly.
- MUST NOT change its own authority.
- MUST NOT weaken release gates.

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

Durable chain now exists:

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
| L-13 full Production Verifier remains green | PASS | Runs `33083567504`, `33087199746`, `33087639058`, `33088083507` |
| L-14 no new paid Canary | PASS | none started |

## M0 — OpenRouter clean integration

Infrastructure acceptance: **PASS**.

- existing provider/router stack retained;
- canonical OpenRouter route works in regression tests;
- unknown model/provider and missing credential fail closed;
- Production workflow uses Production credential lane;
- OpenAI Production defaults unchanged;
- no paid game Canary.

Live credential status: **not observable through the current GitHub connector**. No API key was requested in chat or stored in repository content. A tiny live non-game smoke test remains optional after a repository secret exists.

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

A reproduced invalid `produce.yml` failure led to the minimal additional guard: all GitHub workflow YAML is now parsed in Verifier CI.

## Terminology / proof boundary

Current state:
- Intra-run adaptive repair: **YES — live demonstrated**
- real cross-run evidence-to-candidate path: **YES — Titan #3 demonstrated**
- real validated + human-promoted learning improving a later Owner-accepted game: **NOT YET DEMONSTRATED**
- fully self-improving Factory: **NO**

Preferred term remains **evidence-driven controlled improvement**.

## Remaining sequence

1. Merge Controlled Improvement v1 after final branch compare/review.
2. Optional: add GitHub secret `OPENROUTER_PRODUCTION` and run a tiny bounded non-game provider smoke test if live OpenRouter proof is desired.
3. P2-07 Model Outcome Benchmarking remains later work.
4. Do not validate/promote the Titan candidate until independent evidence/regression supports it.
5. After PoC proof: Productionization / IP & Security Gate and private-core migration decision.

## Non-goals retained

- no automatic best-model router;
- no LLM-owned routing policy;
- no silent provider fallback;
- no automatic DeepSeek/GLM Production default;
- no per-Agent API-key proliferation;
- no unvalidated learning in Production;
- no new paid game/Titan Canary without explicit Owner approval.
