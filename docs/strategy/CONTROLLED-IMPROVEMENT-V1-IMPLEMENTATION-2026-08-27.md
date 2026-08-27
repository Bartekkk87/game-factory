# Controlled Improvement v1 — Implementation Status — 2026-08-27

## Scope

This document records the implemented state of Evidence-Driven Controlled Improvement v1 plus the OpenRouter/model-agnostic hardening. It supersedes earlier planning wording where those documents still describe L0/M0/M1/L1-L7 as future work.

No new paid game or Titan Canary was started.

## Verified implementation

### L0 — Learning Safety Gate

- `/reject` no longer creates an immediately active Director lesson.
- `/reject` and `/feedback` capture durable Owner evidence before any learning decision.
- raw GitHub Owner comment text is stored unchanged; parsed command/reason are separate fields.
- `lessonsFor(role)` exposes only `status=validated && active=true`.
- legacy lessons are normalized fail-closed as unvalidated/inactive.

### L1-L7 — Controlled lifecycle

Canonical lifecycle:

`raw evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis -> candidate -> validation/regression -> validated inactive -> explicit promotion -> active -> reversible deactivation`

Implementation modules:
- `factory/src/learning/owner-feedback.mjs`
- `factory/src/learning/aggregate.mjs`
- `factory/src/learning/trigger.mjs`
- `factory/src/learning/analysis.mjs`
- `factory/src/learning/lifecycle.mjs`

Hard invariant: candidate or validated-inactive learning cannot enter Production prompts.

Protected target layers require `human-merge` promotion: skill, prompt, owner-contract, verifier, product-fidelity, release-gate, engine-contract and control-plane.

Improvement Analysis may propose a scoped candidate only. It cannot activate Production, edit Production, change its own authority or weaken release gates.

### Real RUN-EVIDENCE support

The deterministic aggregator now consumes the canonical nested production evidence shape (`run.id`, `gates.*.pass`, `gates.experience.score`, `costs.attempts`, stage budgets and role/model/operation cost tables) and explicit relevant attempt evidence. Final gate failures are kept separate from intra-run attempt failures.

This correction was found by applying the new pipeline to the real Titan #3 evidence rather than only synthetic fixtures.

## Titan Canary #3 — first real learning case

Production evidence:
- run evidence: `runs/20260827-120138/RUN-EVIDENCE.json`
- failed attempt evidence: `runs/20260827-120138/attempt-01/evidence-fidelity.json`
- GitHub Actions production run: `33069903383`
- candidate SHA: `0c675f626042c25c49326bca19b9aba95860d54845b02e91bfc600c05884110d`
- final Technical: PASS
- final Product Fidelity: PASS
- final Experience: 7.7/10
- cost: $0.442821 / 109,703 tokens
- Owner result preserved from the approved handoff: PRODUCT ACCEPTANCE FAIL

Durable learning artifacts:
- raw Owner result: `learning/evidence/owner-feedback/titan-canary-3-owner-result-2026-08-27.json`
- aggregate: `learning/aggregates/titan-canary-3-2026-08-27.json`
- trigger: `learning/triggers/titan-canary-3-2026-08-27.json`
- bounded analysis: `learning/analysis/titan-canary-3-product-acceptance-analysis-v1.json`
- inactive candidate: `learning/candidates/titan-canary-3-visual-target-intake-v1.json`

No GitHub Owner `/reject` comment existed for Issue #6, so the evidence backfill explicitly records that fact and does not fabricate one. The exact Owner-result wording from the approved handoff is preserved separately from the richer expectation summary.

The analysis keeps competing hypotheses open: intake/Product Truth loss, Owner Contract decomposition, Director reinterpretation, Product/Visual Fidelity gaps, Experience-evaluation gaps, or a combination. No root cause is promoted as truth.

The candidate is `status=candidate`, `active=false`, targets protected layer `owner-contract`, and therefore cannot affect Production without validation/regression followed by a separate human merge.

## OpenRouter / M0-M1

The existing router remains the only routing authority.

Credential lanes:
- `OPENROUTER_PRODUCTION`
- `OPENROUTER_BENCHMARK`
- `OPENROUTER_IMPROVEMENT`

Benchmark and Improvement lanes do not silently fall back to Production credentials.

OpenAI remains the Production reference default. The explicitly registered OpenRouter challenger is:

`openrouter:deepseek/deepseek-chat-v3.1`

Registry record as verified on 2026-08-27 from OpenRouter official model metadata:
- context: 163,840
- max output: 32,768
- structured outputs: supported
- input: $0.25/M tokens
- cache read: $0.13/M tokens
- output: $0.95/M tokens

The challenger is not a Production default and requires explicit provider/model selection. Unknown models and missing credentials fail closed.

## Regression evidence

Relevant successful Verifier Selftests on the implementation branch:
- Run `33083567504` — initial learning/OpenRouter regression suite PASS
- Run `33087199746` — workflow YAML validation + Produce workflow syntax fix PASS
- Run `33087639058` — canonical RUN-EVIDENCE aggregation PASS
- Run `33088083507` — explicit attempt-evidence aggregation PASS

The Verifier now validates syntax for every `.github/workflows/*.yml|yaml` file because an invalid Produce workflow was reproduced during this implementation.

## Current proof boundary

The real Titan case demonstrates:

`real production evidence + Owner rejection evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis -> inactive scoped candidate`

It does **not** demonstrate a real learning candidate being validated, human-promoted and then improving a later paid game. No such paid Canary was authorized or run.

Therefore the correct claim is: controlled cross-run learning infrastructure and the real evidence-to-candidate path are demonstrated; real validated/published learning impact on a later production game remains unproven.
