# Game Factory — Platform & Model Architecture Decision — 27.08.2026

## Decision status

**APPROVED TARGET + M0/M1 INFRASTRUCTURE IMPLEMENTED.**

This record does not authorize a paid game Canary and does not authorize automatic challenger promotion.

### Current credential update — 27.08.2026

The Owner reports that GitHub Actions repository secrets `OPENAI_PRODUCTION` and `OPENROUTER_PRODUCTION` have now been created and populated with the corresponding real provider keys. Secret values are not readable through the current GitHub connector and must never be echoed into code, logs, issues, evidence, Notion or chat.

Owner-side provisioning is therefore complete, but **runtime migration is not yet complete**: the current Production workflow still uses legacy `GF_LLM_API_KEY` for OpenAI while OpenRouter already uses `OPENROUTER_PRODUCTION`.

Target Production credential contract after Final Factory Closure:

```text
OpenAI Production     -> OPENAI_PRODUCTION
OpenRouter Production -> OPENROUTER_PRODUCTION
```

This migration plus fail-closed credential isolation is tracked in GitHub Issue `#8` — **Final Factory Closure — Learning Orchestration + Secret Migration**. Legacy `GF_LLM_API_KEY` must not be retired until the new OpenAI path is implemented and regression-proven.

## 1. Platform / repository strategy

The public `Bartekkk87/game-factory` repository remains approved for the current PoC. GitHub remains executable/durable Source of Truth.

After PoC proof, a separate **Productionization / IP & Security Gate** must decide private-core migration. Target separation remains:

```text
PRIVATE — Factory Core
  Control Plane
  Learning / Improvement Factory
  Model Router / Policy
  Skills / Prompts
  Verifier / Evaluation
  Engine/API Contracts
  Governance / Promotion

PRIVATE — Production evidence/projects where appropriate

OPTIONAL PUBLIC
  intentionally released demos/games/showcases
```

Historical public material must be treated as already disclosed.

## 2. Model-agnostic principle

The Factory is not tied to one model vendor. Models are replaceable workers behind stable Factory contracts.

Canonical runtime routing remains a **single stack**:
- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`
- `factory/src/llm/client.mjs`
- OpenAI-compatible request adapter

No second router/orchestrator was introduced.

The Factory owns Model Policy. Provider convenience cannot override capability checks, budget, evidence, security or release authority.

## 3. Production reference defaults — unchanged

| Role / Operation | Production reference default |
|---|---|
| Director | `openai:gpt-5.6-terra` |
| Engineer Build | `openai:gpt-5.6-terra` |
| Engineer Repair | `openai:gpt-5.6-terra` |
| Engineer Rebuild | `openai:gpt-5.6-terra` |
| Engineer Polish | `openai:gpt-5.6-terra` |
| Playtester | `openai:gpt-5.6-terra` |
| Auditor | `openai:gpt-5.6-luna` |
| Release decision | deterministic, no LLM |

Experimental configuration cannot silently replace these defaults.

## 4. OpenRouter M0 — implemented

OpenRouter remains an explicit provider lane through the existing canonical router.

Verified behavior in regression tests:
- explicit OpenRouter provider route resolves through the normal router;
- missing lane credential fails closed;
- unknown provider/model fails closed;
- no silent cross-provider model borrowing;
- Production defaults remain OpenAI;
- Production workflow identifies the Production credential lane;
- no paid Game/Titan Canary was run.

The current connector cannot read GitHub Actions secrets. The Owner now reports `OPENROUTER_PRODUCTION` is provisioned, but its value has not been inspected by the connector and no live OpenRouter API proof has yet been run. No key is requested in chat or stored in code/docs/evidence.

## 5. M1 — benchmark-safe challenger infrastructure implemented

Initial explicit OpenRouter challenger:

`openrouter:deepseek/deepseek-chat-v3.1`

Official OpenRouter metadata verified 27.08.2026:
- model slug: `deepseek/deepseek-chat-v3.1`
- context: `163840`
- max completion: `32768`
- structured outputs / JSON Schema: supported
- input: `$0.25 / 1M tokens`
- cache read: `$0.13 / 1M tokens`
- output: `$0.95 / 1M tokens`

Registry flags keep the model a challenger and not a Production default.

Capability mismatch fails before dispatch. Role and operation overrides remain supported. No automatic “best model” selection or automatic DeepSeek Production promotion exists.

## 6. Credential trust boundaries — implemented in runtime policy, Production naming migration open

Approved OpenRouter lanes:

```text
OPENROUTER_PRODUCTION
OPENROUTER_BENCHMARK
OPENROUTER_IMPROVEMENT
```

Production provider target names:

```text
OPENAI_PRODUCTION
OPENROUTER_PRODUCTION
```

Selection is by trust/budget lane rather than per-agent API key.

Security invariants:

> Benchmark or Improvement must not silently use Production credentials when their isolated lane is required.

> OpenAI and OpenRouter Production credentials must remain provider-isolated and fail closed; one provider key must not silently substitute for the other.

Factory evidence continues to attribute consumption by role/model/operation, so separate role keys are not required for accounting.

## 7. Routing and evidence requirements

Material LLM calls remain attributable where available to:
- role;
- operation;
- requested provider/model;
- actual/response model;
- model/version label;
- tokens;
- cost;
- run provenance.

Model evaluation should be outcome-based:

`MODEL x ROLE x OPERATION -> verified quality + convergence + cost`

Primary economic target remains:

> **cost per verified and Owner-accepted outcome**, not cost per call.

## 8. Improvement Factory boundary

A future Improvement Analysis operation may use the `OPENROUTER_IMPROVEMENT` lane, but model access does not grant authority.

Improvement Analysis may only propose scoped candidates. It cannot:
- activate Production;
- edit Production directly;
- change routing/release authority;
- weaken deterministic gates;
- promote its own protected changes.

Learning promotion remains subordinate to the Control Plane and human-gated protected-layer rules.

## 9. Future Model Policy — not implemented

Potential future escalation:

`economy -> stronger repair -> reference/rescue`

This remains P2 work and may only be introduced after deterministic role/operation benchmarking proves a better quality/convergence/cost outcome.

Not implemented:
- LLM-controlled router decisions;
- automatic best-model selection;
- automatic provider/model promotion;
- silent fallback to a challenger;
- self-modifying routing rules.

## 10. Security / provider policy — later Productionization

Mature Production should distinguish:
- Model Policy
- Provider Policy
- Data Policy

Potential controlled dimensions include approved endpoints/providers, fallback restrictions, retention/data-collection policy, proprietary-code exposure, capability requirements and spend ceilings.

## 11. Acceptance status M0/M1 and current credential boundary

| Criterion | Result |
|---|---|
| canonical OpenRouter route | PASS in regression |
| unknown/missing configuration fail closed | PASS |
| OpenAI Production defaults unchanged | PASS |
| challenger cannot silently become default | PASS |
| role/operation overrides retained | PASS |
| capability mismatch before dispatch | PASS |
| OpenRouter Production/Benchmark/Improvement credential separation | PASS in code/regression |
| Owner reports `OPENAI_PRODUCTION` provisioned | OWNER-REPORTED / connector cannot inspect secret |
| Owner reports `OPENROUTER_PRODUCTION` provisioned | OWNER-REPORTED / connector cannot inspect secret |
| Production workflow uses `OPENAI_PRODUCTION` | **OPEN — still legacy `GF_LLM_API_KEY`** |
| no release-authority change | PASS |
| no paid game Canary | PASS |
| live OpenRouter API call | NOT RUN / optional only after safe runtime migration decision |

Relevant Verifier evidence includes Runs `33083567504` and subsequent full green regression Runs documented in `docs/strategy/CONTROLLED-IMPROVEMENT-V1-IMPLEMENTATION-2026-08-27.md`.

Current execution backlog for the remaining Factory closure is GitHub Issue `#8`. Durable handoff: `docs/strategy/FINAL-FACTORY-CLOSURE-HANDOFF-2026-08-27.md`.

## 12. Governance

Authority remains:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Validated Active Memory Lesson`

GitHub is durable/executable Source of Truth; Notion mirrors this decision.

Unvalidated learning may not alter Production, and experimental model configuration may not silently alter Production defaults.
