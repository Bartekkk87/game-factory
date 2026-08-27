# Game Factory — Architektur v2.5 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. GitHub ist die executable/durable Source of Truth für Code, Runs, Evidence, Learning-Artefakte und Promotionen. Notion spiegelt Entscheidungen und Status.

Stand: 27.08.2026 — Controlled Improvement v1 ist technisch implementiert; Titan Canary #3 ist der erste reale Evidence-to-Candidate-Fall.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release, Learning-Promotion oder Provider-Fallback.
3. **Owner Intent ist Vertrag.** Must-Haves/No-Gos und konkrete durable Referenzen dürfen downstream nicht still verschwinden.
4. **Modelle sind Worker, keine Control Plane.** Budget, SHA-Binding, Release und Learning-Promotion bleiben deterministisch/governed.
5. **Production Factory und Improvement Factory sind getrennt.** Kein ungeprüfter Candidate darf Production beeinflussen.
6. **Provider/Modelle sind austauschbar.** Kein stiller Challenger- oder Cross-Provider-Fallback.
7. **Promotion ist explizit und reversibel.** Geschützte Layer benötigen separaten Human-Merge.
8. **Git-backed Evidence vor unsichtbarer Memory.** Dauerhafte Claims müssen nachvollziehbare Provenance haben.
9. **Keine neue Kontrollkomponente ohne reproduzierten Failure Mode.**
10. **Kein Paid Game/Titan Canary ohne neue Owner-Freigabe.**

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Validated Active Memory Lesson`

## 2. Schichten

```text
L6 PRODUCT / OWNER
   Idea -> Owner Contract -> Owner Review -> Approve / Reject / Feedback

L5 PRODUCTION LINE
   Director -> Engineer -> Repair/Rebuild -> Playtester -> Polish -> Auditor -> Draft

L4 EVIDENCE & QUALITY
   Technical Verifier -> Product Fidelity -> Experience -> Budget -> Release Gate

L3 IMPROVEMENT FACTORY
   Raw Evidence -> Aggregate -> Trigger -> Analysis -> Candidate -> Validation -> Promotion

L2 MODEL / PROVIDER
   Role/Operation Router -> Model Registry -> Provider Registry -> Adapter -> Credential Lane

L1 CONTROL KERNEL
   GitHub Actions -> SHA binding -> budgets -> gates -> durable runs/evidence
```

## 3. Verified Production reference

Titan Canary #3 / `Titan Core: Reforged`:
- Production Actions Run: `33069903383`
- Production commit: `6d16e97f6ce7e880323f61408cad704b96bdb120`
- Run evidence: `runs/20260827-120138/RUN-EVIDENCE.json`
- Technical: **PASS**
- Product Fidelity: **PASS** after one autonomous repair
- Experience: **7.7/10** after one autonomous polish
- Budget: **PASS**
- Release Gate: **PASS**
- Cost: **$0.442821 / 109,703 tokens**
- Owner hands-on result: **PRODUCT ACCEPTANCE FAIL**

This proves the Production loop but not that machine gates predict Owner acceptance perfectly.

## 4. Production Factory

```text
Owner Idea
 -> immutable Owner Contract
 -> Director GDD + stable requirement/probe mapping
 -> Engineer Build
 -> deterministic Technical + Product Fidelity verification
 -> bounded Repair/Rebuild when needed
 -> independent Playtester Experience review
 -> bounded Polish from verified baseline
 -> full re-verification
 -> advisory Auditor
 -> deterministic Budget + Release Gate
 -> Draft / Review Issue
 -> Owner milestone review
```

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS`

Playtester-fidelity opinion and Auditor remain advisory; neither has Release Authority.

## 5. Production roles

### Director
Consumes immutable Owner Contract plus only validated+active role learning. Produces GDD/traceability, not release decisions.

### Engineer
Build/Repair/Rebuild/Polish remain separately routable operations. Repairs cannot weaken Owner Contract or deterministic gates.

### Playtester
Provides independent experience/fidelity critique. Experience score may enter the deterministic threshold; qualitative fidelity remains advisory.

### Auditor
Advisory only. Cannot alter binding release inputs.

## 6. Learning Safety Gate — implemented

Canonical rule in `factory/src/memory/store.mjs`:

> Production prompt injection is allowed only for lessons with `status === "validated"` **and** `active === true`.

Consequences:
- legacy lessons are normalized fail-closed as unvalidated/inactive;
- candidates are absent from Production prompts;
- validated but inactive learning is absent from Production prompts;
- `/reject` no longer writes an active Director lesson;
- raw Owner feedback is captured before interpretation.

Canonical GitHub-comment evidence path:

`learning/evidence/owner-feedback/gh-issue-<issue>-comment-<comment>.json`

The record preserves exact `rawText` plus separate parsed metadata/provenance.

## 7. Controlled Improvement v1 — implemented lifecycle

```text
RAW EVIDENCE
 -> deterministic aggregate
 -> deterministic trigger
 -> bounded analysis
 -> scoped candidate (inactive)
 -> validation evidence + regression
 -> validated inactive
 -> explicit promotion
 -> active learning
 -> optional deactivation / rollback / supersession
```

Implementation:
- `factory/src/learning/owner-feedback.mjs`
- `factory/src/learning/aggregate.mjs`
- `factory/src/learning/trigger.mjs`
- `factory/src/learning/analysis.mjs`
- `factory/src/learning/lifecycle.mjs`

### Candidate schema

Required core fields include:
`id`, `status`, `role`, `scope`, `targetLayer`, `text`, `sourceRunIds`, `sourceKind`, `ownerFeedbackIds`, `candidateSha`, `confidence`, `evidenceCount`, timestamps, validation/regression evidence, `active`, promotion and reversal provenance.

### Deterministic aggregate

The aggregator consumes canonical `RUN-EVIDENCE.json`, explicit relevant attempt evidence, and Owner feedback. It preserves:
- final Technical/Product Fidelity failure counts;
- attempt-level failure signatures separately;
- repair/rebuild/polish counts;
- Experience result;
- Owner verdicts/classification claims;
- role/model/operation costs and tokens;
- recurring failures/positive patterns where evidence exists.

Identical inputs produce deterministic output; generated timestamps are excluded from aggregate semantics.

### Trigger

Policy version: `controlled-improvement-trigger-v1`.

Current bounded rules:
- Owner negative/feedback evidence may allow `product-feedback` analysis.
- the same engineering failure signature across >=2 independent runs may allow `engineering` analysis.
- trigger only authorizes analysis; it cannot validate or activate.

### Improvement Analysis authority

May:
- propose a scoped Learning Candidate.

Must not:
- activate Production;
- edit Production directly;
- change its own authority;
- weaken release gates.

### Validation / promotion

A candidate becomes validated only with explicit validation evidence plus passing regression results. A model calling something “validated” is insufficient.

Protected layers:
`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`.

Protected promotion requires a separate `human-merge`. Activation is versioned/reversible; deactivation updates both candidate and active-memory representation.

## 8. Titan #3 — first real controlled learning case

Raw backfill evidence:

`learning/evidence/owner-feedback/titan-canary-3-owner-result-2026-08-27.json`

No Owner GitHub `/reject` comment existed on Review Issue #6. The backfill therefore does **not** fabricate one; it preserves the exact Owner-result wording from the approved implementation handoff and separately labels the richer expectation context as a handoff summary.

Durable chain:
- aggregate: `learning/aggregates/titan-canary-3-2026-08-27.json`
- trigger: `learning/triggers/titan-canary-3-2026-08-27.json`
- analysis: `learning/analysis/titan-canary-3-product-acceptance-analysis-v1.json`
- candidate: `learning/candidates/titan-canary-3-visual-target-intake-v1.json`

The analysis keeps multiple root-cause hypotheses open: intake/Product Truth, Owner Contract decomposition, Director reinterpretation, Product/Visual Fidelity, Experience evaluation, or combination.

The candidate targets protected layer `owner-contract`, is `status=candidate`, `active=false`, and has **no Production effect**.

Proof boundary:

> Real `Evidence -> Aggregate -> Trigger -> Analysis -> inactive Candidate` is demonstrated. A real candidate being validated, human-promoted, then improving a later Owner-accepted production game is **not yet demonstrated**.

## 9. Model / Provider layer — one router

Canonical runtime stack:
- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`
- `factory/src/llm/client.mjs`

There is no second Model Router.

Production reference defaults remain:

| Role / Operation | Default |
|---|---|
| Director | `openai:gpt-5.6-terra` |
| Engineer Build/Repair/Rebuild/Polish | `openai:gpt-5.6-terra` |
| Playtester | `openai:gpt-5.6-terra` |
| Auditor | `openai:gpt-5.6-luna` |
| Release PASS/FAIL | deterministic, no LLM |

## 10. OpenRouter M0/M1 — implemented infrastructure

Explicit challenger:

`openrouter:deepseek/deepseek-chat-v3.1`

Verified registry properties on 27.08.2026:
- context 163,840;
- max output 32,768;
- structured outputs supported;
- price $0.25/M input, $0.13/M cache read, $0.95/M output.

The challenger is `benchmarkStatus=challenger`, `productionDefault=false`. It cannot silently replace OpenAI defaults. Unknown provider/model and capability mismatch fail before dispatch.

Credential trust lanes:

```text
OPENROUTER_PRODUCTION
OPENROUTER_BENCHMARK
OPENROUTER_IMPROVEMENT
```

Benchmark/Improvement do not silently fall back to Production credentials. `GF_LLM_LANE` selects the trust lane. The Produce workflow uses `production`.

A live OpenRouter API smoke test is not required for the code acceptance and has not been run because repository-secret availability cannot be read through the current connector. No key is stored in code/docs/issues/artifacts.

## 11. Regression / CI evidence

Successful implementation-branch Verifier runs:
- `33083567504` — learning/OpenRouter safety suite
- `33087199746` — all-workflow YAML syntax validation after reproduced Produce YAML failure
- `33087639058` — canonical production `RUN-EVIDENCE` aggregation
- `33088083507` — relevant attempt-evidence aggregation

The Verifier now parses every `.github/workflows/*.yml|yaml`; this guard was added only after a real invalid-workflow failure was reproduced.

## 12. Durable evidence layout

```text
runs/<run>/                       production evidence
learning/evidence/owner-feedback/ raw owner evidence
learning/aggregates/              deterministic aggregates
learning/triggers/                deterministic trigger decisions
learning/analysis/                bounded claims/hypotheses
learning/candidates/              inactive/validated candidate records
learning/validations/             validation records
learning/promotions/              activation records
memory/                           only production-visible validated+active lessons
```

## 13. Repository strategy

Current public repository remains the approved PoC location. After PoC proof, a separate Productionization / IP & Security Gate should decide private-core migration. Historical public disclosure cannot be undone by later privacy changes.

## 14. Next architecture work

1. Finish PR/merge and documentation sync for Controlled Improvement v1.
2. If OpenRouter Production execution is desired, provision `OPENROUTER_PRODUCTION` through GitHub Secrets and run only a tiny bounded non-game smoke test.
3. P2-07 Model Outcome Benchmarking remains later work.
4. Validate learning candidates only when evidence/reproducibility justify it; do not promote Titan candidate merely because it exists.
5. After PoC proof: Productionization / IP & Security Gate.

## 15. Explicit non-goals

- no automatic best-model router;
- no LLM-owned routing or release policy;
- no silent provider/model promotion;
- no unvalidated learning in Production;
- no new scheduler/supervisor/database without proven failure mode;
- no new paid game/Titan Canary without explicit Owner approval.

Detailed implementation status: `docs/strategy/CONTROLLED-IMPROVEMENT-V1-IMPLEMENTATION-2026-08-27.md`.
