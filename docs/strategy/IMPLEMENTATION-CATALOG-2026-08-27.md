# Game Factory — Umsetzungskatalog 27.08.2026

> Status update 27.08.2026: Audit-P0 is complete and Titan Canary #3 has passed the full production chain. The detailed Canary result is recorded in `docs/strategy/TITAN-CANARY-3-RESULT-2026-08-27.md`. The Owner has now completed the hands-on review and considers the current candidate a **Product Acceptance FAIL**, but has intentionally **not** issued `/reject` because the current legacy reject path would immediately write an unvalidated Director lesson into Production memory.

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
- Owner hands-on review: **Product Acceptance FAIL**
- `/approve` / `/reject`: **intentionally not issued yet**
- Review issue: `#6 [Review] Titan Core: Reforged`
- Next architecture priority: **Learning Safety Gate L0 before durable Titan feedback/reject**

## Architecture decision

Production Factory:

`Owner Idea -> Immutable Owner Contract -> Director -> Engineer Build/Repair/Rebuild/Polish -> Deterministic Verifier Evidence -> Technical + Product Fidelity -> Independent Playtester -> Budget -> deterministic Release Gate -> Owner Preview`

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

Auditor and Playtester Fidelity remain advisory and outside the binding release-gate API.

Improvement Factory target:

`Run Evidence -> deterministic Aggregation -> deterministic Trigger -> bounded Improvement Analysis -> scoped Learning Candidate -> Validation -> Regression -> Validated -> human-gated activation`

Hard invariant:

> Candidate and otherwise unvalidated learning outputs must never enter Production prompts or directly alter Production Factory rules.

## Approved platform & model architecture decision

Detailed decision record:

`docs/strategy/PLATFORM-MODEL-ARCHITECTURE-DECISION-2026-08-27.md`

### Repository / platform direction

- The current public repository remains acceptable for the active PoC.
- After PoC proof, a dedicated **Productionization / IP & Security Gate** must evaluate migration of the proprietary Factory core to a private repository/platform boundary.
- The Factory core — Control Plane, Improvement Factory, model policy/router, skills/prompts, verifier/evaluation, contracts and governance — is not intended to remain fully public in a mature proprietary platform.
- Public games/showcases may remain intentionally public while the Factory core is private.
- Historical material already published publicly must be treated as previously disclosed.
- Do not mix repository/platform migration into the current learning-system refactor unless a concrete security incident requires it.

### Model-agnostic direction

The Factory is explicitly **model-agnostic**. Models are replaceable workers behind stable contracts; the strongest model is not automatically the best model for every task.

The existing Role Router + Provider Registry + Model Registry remain the single canonical runtime routing stack. No second orchestrator/router stack is introduced.

OpenRouter becomes an approved provider lane for controlled challenger-model experiments such as DeepSeek and later GLM/open-weight models while OpenAI remains the initial reference baseline.

The Factory owns model policy. OpenRouter is an inference/provider layer, not an opaque routing authority.

### Credential direction

Do **not** create one API key per Agent/Role merely for cost attribution.

Preferred future trust/budget boundaries:

- `OPENROUTER_PRODUCTION`
- `OPENROUTER_BENCHMARK`
- `OPENROUTER_IMPROVEMENT`

Role/model/operation consumption remains attributable through Factory evidence. Trust-boundary keys provide stronger budget isolation, incident containment and Production-vs-Improvement separation than per-Agent keys.

### Future routing objective

Long-term Model Policy may choose models by role and operation using verified capability/outcome/cost evidence, for example Director planning vs Engineer Build/Repair/Rebuild/Polish vs Playtester vs Auditor vs Improvement Analysis.

Primary economic benchmark:

> **cost per verified and owner-accepted outcome**, not cost per API call.

A future model-strength escalation policy may be evaluated only after evidence exists, e.g. economy model -> stronger repair model -> reference/rescue model. LLMs must not self-promote models or change routing policy autonomously.

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

This remains the first strong current-version reference Canary demonstrating a complete Idea -> Build -> Verify -> Repair -> Playtest -> Polish -> Release-Gate -> Owner-Review chain.

### Owner-review learning significance

The Owner's richer hands-on expectation and the executable Titan source brief are not identical. Current evidence therefore does **not** justify hard-coding a single root cause such as "Director failed" or "Owner Contract lost an existing isometric reference".

The first controlled learning case must evaluate competing evidence-based hypotheses including:
- upstream intake / Product Truth loss;
- Owner Contract decomposition weakness;
- Director reinterpretation;
- Visual/Product Fidelity evaluation weakness;
- Experience evaluation weakness.

The current unsafe legacy `/reject -> recordLesson('director') -> Production prompt` path must be disabled before this feedback is durably processed as learning evidence.

## L0-L7 — Evidence-Driven Controlled Improvement v1

### L0 — Learning Safety Gate — FIRST

1. `/reject` must no longer create an immediately active Director lesson.
2. Reject/review stores immutable raw feedback / learning evidence.
3. `lessonsFor(role)` returns only `status=validated AND active=true`.
4. Legacy lessons migrate to `legacy-unvalidated` or candidate state.
5. Candidate lessons are absent from Production prompts.
6. Validated but inactive lessons are absent from Production prompts.
7. Only validated + active lessons are injectable.

### L1 — Structured Learning Schema

Separate raw evidence, candidate, validated and active lifecycle states with provenance, scope, source run IDs, feedback IDs, confidence/evidence count, validation evidence, regression results, supersession/deactivation and activation state.

### L2 — Owner Feedback Evidence

Preserve raw feedback unchanged and allow classification claims including bug, unmet product requirement, visual-reference mismatch, gameplay-identity mismatch, one-off preference, genre preference, generalizable Factory learning, positive preference and process/Factory failure.

LLM classification is a claim, not global truth.

### L3 — Deterministic Aggregator

Aggregate durable run/review evidence including failure signatures, technical/fidelity failures, repair/rebuild/polish counts, experience, Owner decisions/feedback, cost by role/model/operation, tokens, recurring errors and positive patterns. Do not rely solely on loose memory counters.

### L4 — Deterministic Trigger

Trigger decides whether bounded improvement analysis is allowed/needed. It does not decide whether a proposed learning is true.

### L5 — Bounded Improvement Analysis

Triggered analysis consumes scoped evidence and may propose learning candidates for owner-contract/intake, Director, Engineer, Verifier, Product/Visual Fidelity, Playtester/eval, skill, prompt, engine-contract or process/governance layers. The model has no activation authority.

### L6 — Validation / Regression

Candidate -> proposed change/evidence -> CI -> adversarial regression -> validation -> validated inactive.

### L7 — Human-gated Promotion

Skills, prompts, Owner Contract, Verifier, Release Gate, Engine Contract and Control Plane changes cannot be activated by the same learning process that proposed them. Promotion must be versioned, reviewable and reversible.

## Model Infrastructure insertion — M0/M1

After L0 and before continuing the broader L1-L7 implementation, insert a bounded model-infrastructure block.

### M0 — OpenRouter clean integration

- prove canonical OpenRouter credential/provider path;
- keep current Production defaults unchanged;
- no paid game Canary;
- preserve fail-closed behavior.

### M1 — Benchmark-safe model infrastructure

- register challenger models safely;
- keep OpenAI as reference baseline until separately promoted;
- preserve role/operation overrides;
- test capability mismatch before dispatch;
- retain requested and actual provider/model evidence where exposed;
- keep experimental models out of Production defaults;
- prepare Production / Benchmark / Improvement credential boundaries;
- do not implement automatic "best model" selection yet.

## Acceptance gates L-01 through L-14

- L-01 reject no active lesson
- L-02 raw Owner feedback unchanged
- L-03 candidate no prompt injection
- L-04 validated inactive no injection
- L-05 validated + active injected
- L-06 provenance/source run
- L-07 aggregator deterministic
- L-08 trigger deterministic
- L-09 Improvement Analysis cannot activate Production
- L-10 skill/prompt/verifier/contract needs separate versioned promotion
- L-11 candidate can deactivate/supersede
- L-12 Titan #3 feedback can be captured without legacy direct-learning
- L-13 full existing Production Verifier Selftest green
- L-14 no new paid Canary

## P1/P2 items retained

Still deferred / not blocking the first learning milestone unless evidence elevates them:
- Owner Contract Decomposition
- Verifier Causality / Idle Baseline
- Visual Activity Proof
- Art-Direction Skill Wiring
- Verifier Robustness / multi-seed

Controlled continuous improvement remains the architectural objective.

## P2-07 — Model Outcome Benchmarking

Model comparison must be evidence-driven by role/operation, including quality, convergence, verifier results, Owner outcome, token/cost and repair/rebuild behavior.

OpenRouter/DeepSeek/GLM/open-weight challengers belong in a **Benchmark lane first**, not in silent Production fallback.

Future deterministic model policy may only be promoted after benchmark evidence and regression coverage demonstrate benefit.

## Terminology

Current state:
- Intra-run adaptive repair: **YES — demonstrated in live Canary evidence**
- Cross-run learning: **limited / partial**
- Self-improving Factory: **NOT YET**
- Model-agnostic routing foundation: **PARTIALLY IMPLEMENTED / READY TO EXTEND**

Preferred target term: **evidence-driven controlled improvement**.

## Active implementation order

1. **L0 Learning Safety Gate**
2. **M0 OpenRouter clean integration**
3. **M1 Benchmark-safe model infrastructure**
4. **L1-L7 Controlled Improvement implementation**
5. **Titan Canary #3 Owner feedback as first real learning evidence case**
6. **P2-07 Model Outcome Benchmarking**
7. Later: deterministic adaptive Model Policy / escalation routing
8. After PoC proof: **Productionization / IP & Security Gate** and private-core migration decision

## Non-goals for the next implementation chat

- no automatic best-model router;
- no LLM-owned routing policy;
- no silent provider fallback;
- no automatic DeepSeek/GLM Production default;
- no per-Agent API-key proliferation;
- no private-platform migration during the learning refactor;
- no new paid game/Titan Canary.

## Next decision point

Proceed with the approved implementation order above. Titan #3 feedback must be made durable only through the new safe evidence path. No `/reject` should be used until L0 proves that rejection cannot inject unvalidated learning into Production.