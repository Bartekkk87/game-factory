# Game Factory — Architektur v2.4 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. Ziel ist, Spiele nicht nur zu generieren, sondern reproduzierbar nachzuweisen, dass ein Owner-Brief technisch und produktseitig erfüllt wurde — und die Factory selbst nur kontrolliert aus Evidence zu verbessern.

GitHub Actions ist aktuell die Execution Runtime. GitHub bleibt durable Source of Truth für Code, Evidence, Drafts, Entscheidungen und Lernartefakte. Der aktuelle Public-Repo-Betrieb ist eine PoC-Entscheidung, **kein endgültiges Plattformziel**.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release oder Promotion.
3. **Owner-Intent ist ein Vertrag.** Must-Haves und No-Gos dürfen in späteren Rollen nicht verloren gehen.
4. **Determinismus dort, wo getestet wird.** Kandidat + Seed + Eingabesequenz erzeugen reproduzierbare Verifier-Evidence.
5. **Modelle sind Worker, keine Control Plane.** Budget, Gates, SHA-Binding, Release- und Promotion-Entscheidungen sind Maschinen-/Governance-Logik.
6. **Provider und Modelle bleiben austauschbar.** Kein stiller Cross-Provider- oder Challenger-Fallback in Production.
7. **Lernen braucht Evidence.** Keine unvalidierte Prompt-/Skill-/Contract-Selbstmutation.
8. **Production Factory und Improvement Factory bleiben getrennt.** Produktionsläufe dürfen keine ungeprüften dauerhaften Factory-Regeln aktivieren.
9. **Model Routing ist policy-gesteuert.** Der stärkste oder teuerste Worker ist nicht automatisch die richtige Wahl für jede Aufgabe.
10. **IP/Security ist ein eigener Productionization-Gate.** Ein öffentliches Produkt erfordert keine öffentliche Factory-Kernarchitektur.

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Memory Lesson`

## 2. Schichten

```text
L6 PRODUCT / OWNER
   Idea -> Owner Contract -> Owner Review -> Approve / Reject / Feedback

L5 PRODUCTION LINE
   Director -> Engineer -> Repair/Rebuild -> Playtester -> Polish -> Auditor -> Draft

L4 EVIDENCE & QUALITY
   Technical Verifier -> Product Fidelity -> Experience -> Release Gate

L3 IMPROVEMENT FACTORY
   Raw Evidence -> Aggregation -> Trigger -> Analysis -> Candidate -> Validation -> Promotion

L2 MODEL / PROVIDER LAYER
   Role/Operation Router -> Model Policy -> Provider Adapter -> Capability/Price Registry

L1 CONTROL KERNEL
   GitHub Actions -> fail-closed state -> SHA binding -> budget -> runs/evidence -> durable memory
```

## 3. Current verified Production status — 27.08.2026

Audit-P0-01 through P0-05 are **DONE**.

Reference Production Canary:
- Game: `Titan Core: Reforged`
- GitHub Actions Run: `33069903383`
- Production commit: `6d16e97f6ce7e880323f61408cad704b96bdb120`
- Technical: **PASS**
- Product Fidelity: **PASS**
- Experience: **7.7 / 10**
- Budget: **PASS**
- Deterministic Release Gate: **PASS**
- LLM/API cost: **$0.442821** / `109703` tokens
- Owner hands-on review: **Product Acceptance FAIL**
- `/approve` / `/reject`: **not issued yet by design**

The Owner intentionally has not used `/reject`, because the current legacy reject path still records an immediately usable Director lesson. That behavior is unsafe for controlled cross-run learning and must be disabled by L0 before Titan feedback becomes durable learning input.

Detailed references:
- `docs/strategy/TITAN-CANARY-3-RESULT-2026-08-27.md`
- `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
- `docs/strategy/PLATFORM-MODEL-ARCHITECTURE-DECISION-2026-08-27.md`

## 4. Production Factory — verified process

```text
Owner Idea
  -> immutable Owner Contract (MH/NG IDs + hash)
  -> Director: GDD + Acceptance/Probe traceability
  -> Engineer Build / Repair / Fresh Rebuild / Polish
  -> assemble candidate + bounded probe extension
  -> deterministic headless verifier
       -> fixed seed + input sequence
       -> start/early/mid/end telemetry
       -> runtime/mechanic evidence
       -> Technical PASS/FAIL
       -> Product Fidelity PASS/FAIL
  -> targeted repair / rebuild if needed
  -> Playtester
       -> advisory fidelity review
       -> Experience score + critique
  -> polish from verified baseline only
       -> full reverify
       -> rollback on regression
  -> LLM Auditor (strictly advisory)
  -> deterministic Release Gate
       Technical PASS
       + Product Fidelity PASS
       + Experience >= 6.5
       + Budget PASS
  -> draft + Review Issue
  -> Owner Preview
```

No Owner requirement may disappear silently between intake and review.

## 5. Production roles

### Director
- receives immutable Owner Contract;
- maps Owner Requirement IDs to stable Acceptance/Probe traceability;
- cannot grant release authority;
- may consume only validated + active learning once L0/L1 is implemented.

### Engineer
- Build / Repair / Rebuild / Polish receive Owner Contract and traceability;
- operations remain independently routable by the model layer;
- repair/rebuild/polish cannot weaken deterministic release contracts.

### Playtester
Returns independent Product Fidelity opinion plus Experience score/critique. Playtester fidelity remains advisory and outside the Release Gate authority surface.

### Auditor
Strictly advisory. Audit/LLM fields cannot enter the binding Release Gate input API.

## 6. Model / Provider Layer — single source of truth

Canonical runtime selection lives in:
- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`

`factory/src/config.mjs` contains no competing routing authority.

Current Production reference defaults:

| Role / Operation | Reference model |
|---|---|
| Director | `gpt-5.6-terra` |
| Engineer Build/Repair/Rebuild/Polish | `gpt-5.6-terra` |
| Playtester | `gpt-5.6-terra` |
| Auditor | `gpt-5.6-luna` |
| Release PASS/FAIL | no LLM |

The router already supports provider/model selection by role and operation. The target is therefore an **extension of the current router**, not a second orchestrator.

### Approved OpenRouter direction

OpenRouter is an approved provider lane for controlled challenger-model experiments such as DeepSeek and later GLM/open-weight models.

Initial rule:
- OpenAI remains reference baseline;
- OpenRouter challengers remain benchmark candidates until separately validated/promoted;
- no silent challenger Production default;
- capability mismatch fails before dispatch;
- requested and actual provider/model evidence remains observable where exposed.

The Factory owns Model Policy. A provider must not become an opaque routing authority.

## 7. Credential boundaries

Do not create one API key per Agent merely for cost attribution. Factory evidence already attributes role/model/operation usage.

Preferred future trust/budget boundaries:

```text
OPENROUTER_PRODUCTION
OPENROUTER_BENCHMARK
OPENROUTER_IMPROVEMENT
```

This isolates Production spend, experimental benchmarking and Improvement Factory activity while keeping credential count bounded.

## 8. Future deterministic Model Policy

Long-term, model choice may differ by role and operation:

```text
Director              -> planning/reasoning
Engineer / Build      -> coding
Engineer / Repair     -> debugging/repair
Engineer / Rebuild    -> stronger escalation
Engineer / Polish     -> implementation/product quality
Playtester            -> multimodal experience review
Auditor               -> economical precise review
Improvement Analysis  -> bounded reasoning
```

This is a capability target, not a fixed assignment.

Model quality must be measured by outcome, not call price alone:

`MODEL x ROLE x OPERATION -> verified outcome + convergence + cost`

Relevant measures include first-pass success, repair success, repair/rebuild count, Technical/Product Fidelity, Experience, Owner acceptance, tokens, cost and regressions.

Primary economic target:

**cost per verified and owner-accepted outcome**.

A future escalation policy such as `economy -> stronger repair -> reference/rescue` is allowed only after benchmark evidence and deterministic regression coverage prove value.

## 9. Verification & Release authority

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

`evaluateReleaseGate(...)` structurally accepts only deterministic release inputs. Auditor disagreement, Playtester fidelity opinions, Improvement Analysis or model-routing preferences cannot alter release authority.

## 10. Durable Production Evidence

Per run the relevant durable evidence includes:

```text
brief.json
owner-contract.json
gdd.json
attempt-XX/
  design.json
  evidence-tech.json
  evidence-fidelity.json
  telemetry.json
  shots/
experience-XX.json
audit.json
RUN-EVIDENCE.json
RESULT.json | FAILURE.json
```

This evidence is the foundation for controlled cross-run improvement.

## 11. Improvement Factory — target lifecycle

Approved lifecycle:

```text
RUN / OWNER REVIEW
  -> RAW LEARNING EVIDENCE
  -> DETERMINISTIC AGGREGATION
  -> DETERMINISTIC TRIGGER
  -> BOUNDED IMPROVEMENT ANALYSIS
  -> SCOPED LEARNING CANDIDATE
  -> VALIDATION
  -> REGRESSION
  -> VALIDATED
  -> HUMAN-GATED ACTIVATION
  -> ACTIVE LESSON / SKILL / RULE / EVAL
```

Hard invariant:

> Candidate must NEVER enter Production prompts. Only validated + active learning may be injected.

Not allowed:

`Failure -> LLM -> Prompt Edit -> Production`

Current terminology:
- Intra-run adaptive repair: **YES**
- Cross-run learning: **limited / partial**
- Self-improving Factory: **NOT YET**
- Target: **evidence-driven controlled improvement**

## 12. Learning Safety Gate L0

L0 is the next implementation priority and must prove:
1. `/reject` does not create an active lesson.
2. raw Owner feedback is preserved as durable evidence.
3. candidates do not enter Production prompts.
4. validated + inactive learning does not enter Production prompts.
5. only validated + active learning can be injected.
6. legacy untyped lessons are treated as unvalidated/inactive.

Titan #3 feedback must not be processed through the unsafe legacy learning path before this gate passes.

## 13. Model Infrastructure M0/M1

Immediately after L0, before the broader L1-L7 build:

### M0 — OpenRouter clean integration
- prove canonical OpenRouter credential/provider path;
- keep Production defaults unchanged;
- preserve fail-closed routing and budgets;
- no paid game Canary.

### M1 — Benchmark-safe model infrastructure
- safely register challenger models;
- preserve role/operation overrides;
- preserve capability checks;
- preserve provider/model/token/cost evidence;
- keep experimental models out of Production defaults;
- prepare Production / Benchmark / Improvement credential boundaries;
- no automatic best-model selection.

## 14. Controlled Improvement L1-L7

After L0 + M0/M1:
- structured learning lifecycle and provenance;
- immutable Owner feedback evidence;
- deterministic aggregator;
- deterministic trigger;
- bounded analysis with no write/activation authority;
- validation and regression;
- human-gated, versioned, reversible promotion.

Changes to skills, prompts, Owner Contracts, Verifier, Release Gate, Engine Contract or Control Plane require a separate reviewable promotion path.

## 15. Titan #3 — first real learning evidence case

After L0-L7 foundation is available, Titan #3 Owner feedback becomes the first real controlled learning case.

The system must evaluate competing hypotheses rather than hard-code a root cause. Current evidence leaves open at least:
- upstream intake/Product Truth loss;
- Owner Contract decomposition weakness;
- Director reinterpretation;
- Visual/Product Fidelity evaluation weakness;
- Experience evaluation weakness.

Learning analysis may propose scoped candidates, but cannot activate them.

## 16. Platform / repository strategy

The current public repository remains acceptable during the PoC.

Post-PoC target:
- private proprietary Factory core;
- private Production evidence/projects where appropriate;
- optional public games/showcases by deliberate choice.

The public-to-private move is a separate **Productionization / IP & Security Gate**, not part of the active learning refactor.

Anything already published publicly must be treated as previously disclosed.

Security principle:

> The product may be public without making the Factory that produces it public.

## 17. Provider / data security hardening — later

Mature Production must distinguish:
- Model Policy
- Provider Policy
- Data Policy

Potential policy dimensions include approved endpoints/providers, controlled fallbacks, data-retention/collection requirements, source-code exposure constraints, capability requirements and hard spend ceilings.

Provider convenience cannot override Factory evidence, IP policy or production security constraints.

## 18. Repo layout

```text
engine/                    Micro-Engine + API Contract/Manifest
factory/src/contract/      Owner Contract + Traceability
factory/src/control/       Budget / Release Authority / Unified Evidence
factory/src/llm/           Role Router / Provider / Capability / Price Registry
factory/src/roles/         Director / Engineer / Playtester / Auditor
factory/src/verify/        Harness / Technical Contract / Product Fidelity
factory/src/improvement/   planned controlled improvement modules
factory/prompts/           role prompts
skills/                    versioned role guidance
ideas/                     Owner inputs
drafts/                    verified candidates before Owner gate
products/                  published games
runs/                      run/attempt evidence
memory/                    registry / active validated learning state
docs/strategy/             architecture / decisions / hardening
examples/fixtures/         deterministic regression/adversarial cases
.github/workflows/         Produce / Verify / Review / Pages / future gated improvement actions
```

## 19. Active implementation order

```text
1. L0 Learning Safety Gate
2. M0 OpenRouter clean integration
3. M1 Benchmark-safe model infrastructure
4. L1-L7 Evidence-Driven Controlled Improvement v1
5. Titan #3 feedback as first real learning evidence case
6. P2-07 Model Outcome Benchmarking
7. Later: deterministic adaptive Model Policy / escalation routing
8. After PoC proof: Productionization / IP & Security Gate + private-core migration decision
```

## 20. Explicit non-goals for the next implementation milestone

- no new paid Titan/game Canary;
- no automatic best-model router;
- no LLM-owned routing policy;
- no silent cross-provider fallback;
- no automatic DeepSeek/GLM Production default;
- no per-Agent API-key proliferation without demonstrated need;
- no private-platform migration during the learning refactor;
- no weakening of deterministic release authority;
- no unvalidated learning in Production.
