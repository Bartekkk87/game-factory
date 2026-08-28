# Game Factory — Architektur v2.7 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. GitHub ist die executable/durable Source of Truth für Code, Runs, Evidence, Learning-Artefakte, Evaluation und Promotionen. Notion spiegelt Entscheidungen und Status.

Stand: **28.08.2026 — Factory Foundation + Controlled Improvement + Golden Corpus S0–S5 CLOSED; realer Failure→Validated Candidate→Human Merge Pfad demonstriert.**

Aktueller Fortschritt:
- `docs/strategy/PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md`
- `docs/strategy/LEARNING-ARCHITECTURE-EVIDENCE-TO-APPLIED-CHANGE-2026-08-28.md`

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release, Learning-Promotion, Benchmark-Promotion oder Provider-Fallback.
3. **Owner Intent ist Vertrag.** Must-Haves/No-Gos und durable Referenzen dürfen downstream nicht still verschwinden.
4. **Modelle sind Worker, keine Control Plane.** Budget, SHA-Binding, Release, Learning und Benchmark-Authority bleiben deterministisch/governed.
5. **Production Factory und Improvement Factory sind getrennt.** Kein ungeprüfter Candidate darf Production beeinflussen.
6. **Provider/Modelle sind austauschbar.** Kein stiller Challenger- oder Cross-Provider-Fallback.
7. **Promotion/Application ist explizit und reversibel.** Geschützte Layer benötigen separaten Human-Review/Merge.
8. **Git-backed Evidence vor unsichtbarer Memory.** Dauerhafte Claims brauchen nachvollziehbare Provenance.
9. **Keine neue Kontrollkomponente ohne reproduzierten Failure Mode.**
10. **Kein Paid Game- oder model-backed Benchmark-Run ohne separate Owner-Freigabe.**
11. **Learning generalisiert Regeln, nicht Einzelfallnamen.** Ein konkreter Fehler darf nur dann zu einer persistenten Regel werden, wenn Ursache, Ziel-Layer und Regression nachvollziehbar belegt sind.

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Validated Active Memory Lesson`

Golden Corpus und Benchmark-Ergebnisse liefern Evidence, aber keine Production-Authority.

## 2. Schichten

```text
L7 PRODUCT / OWNER
   Idea -> Owner Contract -> Owner Review -> Approve / Reject / Feedback

L6 PRODUCTION LINE
   Director -> Engineer -> Repair/Rebuild -> Playtester -> Polish -> Auditor -> Draft

L5 EVIDENCE & QUALITY
   Technical Verifier -> Product Fidelity -> Experience -> Budget -> Release Gate

L4 EVALUATION
   Golden Corpus S0-S3 -> Regression / Quality Delta -> Evaluation Failure Intake
   S4 Application Receipt -> S5 System Configuration Benchmark Contract

L3 IMPROVEMENT FACTORY
   Raw Evidence -> Aggregate -> Trigger -> Root Cause / Analysis -> Candidate
   -> Validation -> Validated Inactive -> Human Application/Promotion -> Audit Closure

L2 MODEL / PROVIDER
   Role/Operation Router -> Model Registry -> Provider Registry -> Adapter -> Credential Lane

L1 CONTROL KERNEL
   GitHub Actions -> SHA binding -> budgets -> gates -> durable runs/evidence
```

## 3. Production Factory

```text
Owner Idea
 -> immutable Owner Contract
 -> Director GDD + requirement/probe mapping
 -> Engineer Build
 -> deterministic Technical + Product Fidelity verification
 -> bounded Repair/Rebuild when needed
 -> independent Playtester Experience review
 -> bounded Polish from verified baseline
 -> full re-verification
 -> advisory Auditor
 -> deterministic Budget + Release Gate
 -> Draft / Review Issue
 -> Owner hands-on review
```

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS`

Auditor und qualitative Playtester Fidelity bleiben advisory. No LLM receives Release Authority.

## 4. Owner Contract / Product Truth

`factory/src/contract/owner.mjs` preserves the raw brief, SHA/provenance and stable Owner requirements.

- explicit Must-Haves -> stable `MH-*` requirements;
- explicit No-Gos -> stable `NG-*` constraints;
- ambiguous/freeform material is preserved conservatively rather than inflated into hard requirements;
- Director receives both the raw Owner idea and the Owner Contract;
- traceability requires exactly one acceptance criterion and one supported verifier probe per hard Owner requirement;
- idea-file ingestion preserves exact bytes so preflight and Production can bind the same `ownerBriefSha256`; full Contract SHA may still differ intentionally through source provenance.

## 5. Verifier / Product Fidelity

Implemented and regression-covered:

- Technical verification;
- Product Fidelity evidence authority;
- proof-plan reachability before Engineer spend;
- generic action reachability;
- finite verifier-state protocol exposed through `verifierStateContract()`;
- terminal-state proof and restart observation;
- independent HUD/layout geometry;
- idle/no-input causality control;
- inter-frame visual activity;
- Good/Bad Product negative controls;
- publishing integrity and XSS gates.

The verifier must not treat generated self-attestation as sufficient independent evidence.

Product-specific fiction/semantic labels are not automatically technical verifier states.

## 6. Controlled Improvement v1 — L0–L7 CLOSED

Lifecycle:

`durable evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis/root cause -> inactive candidate -> explicit validation -> validated inactive -> human-gated application/promotion -> reversible/auditable state`

Safety invariants:

- `/reject` and `/feedback` preserve Owner evidence but do not directly create active lessons;
- Production prompt Memory visibility requires `status=validated && active=true`;
- automatic analysis cannot validate, activate, promote, edit Production, change its own authority or weaken gates;
- protected layers remain human-gated;
- automatic Learning does not start paid retries;
- Candidate state and applied Production code/policy state remain separate.

Protected layers:

`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`, `evaluation`.

### Skill learning

Persistent role guidance lives in `skills/*.md`. A Skill is changed only when evidence causally points to a role-level guidance defect.

For example, a Director failure does not justify an Engineering or Art-Direction skill change without evidence.

## 7. Real Learning Proof — Lumen Current

Paid Production Canary #1 (`33207019862`) failed before Build because the Director produced:

```text
PR-MH-03 -> state_reached: restored
PR-MH-04 -> state_reached: glass_breach
```

The verifier correctly failed closed before Engineer spend. Cost was `$0.050686`; no Draft existed.

The first historical Learning pass preserved the evidence but could not classify this early `director_failed` signature. The repair then extended deterministic root cause to recognize:

`director-verifier-state-contract-mismatch`

The real failure maps to:
- role `director`;
- target layer `skill`;
- Candidate `learning/candidates/candidate-production-run-b37ac8d268e8549c.json`;
- status `validated`;
- active `false`.

The generalized learned rule is persisted in `skills/directing.md`:

**`state_reached` uses only the finite verifier protocol supplied by the runtime contract. Thematic states belong in events/UI/world-state data.**

Zero-paid validation:
- Full Verifier `33208519229` SUCCESS;
- Full Verifier `33209130248` SUCCESS;
- Full Verifier `33209616277` SUCCESS;
- Golden Corpus 29/29, 0 mismatches, 0 Critical False PASS.

Human application:
- PR `#36`;
- merge `7af126e3300b23c19bd088ca32c08c7e81947d8b`;
- exact-main post-merge verifier `33211092911`.

This is the first real demonstrated chain through:

`Production failure -> durable evidence -> deterministic root cause -> protected-layer Candidate -> validation -> validated inactive -> human merge`

The Candidate is not self-promoted to active Memory.

## 8. Golden Factory Evaluation Corpus — S0–S5 CLOSED

The Golden Corpus is an Evaluation/Evidence layer, not a second Control Plane and not LLM weight training.

### S0 — Registry + Coverage
Typed case schema, durable seed registry, provenance validation and deterministic coverage baseline.

### S1a/S1b — executable cases + bounded sibling variance
Expected outcomes are executable; demonstrated failure classes have meaningful neighboring variants without blind Cartesian expansion.

### S2 — Evaluation Runner + Quality Delta
Deterministic whole-Corpus execution. Proven baseline: **29/29 expected outcomes, 0 mismatches, 0 Critical False PASS**. Critical false-PASS tolerance remains `0`.

### S3 — Evaluation Failure Intake
Compatible Corpus mismatches can enter Controlled Improvement as analysis-only durable evidence. Repeated deterministic observations are required before the intended Evaluation candidate threshold; candidates remain inactive.

### S4 — Non-Prompt Application Receipt
`learning-application-receipt-v1` can bind Candidate SHA, protected target layer/scope, human-reviewed PR/merge, approval, validation, post-merge regression and Golden-Corpus PASS. Receipt state `APPLIED-CLOSED` does not activate the Candidate or convert code changes into prompt lessons.

### S5 — System Configuration Benchmark
Comparison unit:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

S5 provides versioned configuration SHAs, Development/Holdout isolation, separate evaluator Oracles, bounded trials, trace attribution, cost/latency attribution, `criticalFalsePassCount` tolerance `0`, and advisory `human-review-required` results.

A model-backed S5 run requires separate Owner authorization, bounded budget and an isolated benchmark credential lane. S5 cannot mutate Production automatically.

## 9. Model / Provider layer

Canonical runtime stack:

- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`
- `factory/src/llm/client.mjs`

Current Production reference defaults remain unchanged:

| Role / Operation | Reference default |
|---|---|
| Director | `openai:gpt-5.6-terra` |
| Engineer Build/Repair/Rebuild/Polish | `openai:gpt-5.6-terra` |
| Playtester | `openai:gpt-5.6-terra` |
| Auditor | `openai:gpt-5.6-luna` |
| Release | deterministic / no LLM |

Production credentials are provider-isolated:
- OpenAI -> `OPENAI_PRODUCTION`
- OpenRouter -> `OPENROUTER_PRODUCTION`.

No model/provider switch is inferred from the Lumen failure because the evidence identified a contract/Learning defect rather than provider/model superiority.

## 10. Current Gaming milestone

Issue `#17` remains open. Lumen Canary #1 did not reach a playable Draft, so hands-on Owner ACCEPT/REJECT remains unproven.

Before a second paid Production Canary:
1. complete post-merge zero-paid regression/application closure;
2. present exact brief, coverage, risks and cost boundary again;
3. **STOP for fresh explicit Owner approval**;
4. run at most one paid Canary;
5. Owner hands-on ACCEPT/REJECT;
6. classify evidence before further architecture change.

## 11. Cross-domain portability hypothesis

The current architecture exposes a potentially reusable deeper pattern:

`Intent/Contract -> Worker -> Observable Evidence -> Deterministic/Governed Gate -> Failure Taxonomy -> Candidate Improvement -> Validation Corpus -> Human Application -> Audit Trail`

This is **not yet a proven non-gaming claim**. Transfer to another use case requires replacing the domain-specific contracts, evidence, verifier/oracles, protected layers and decision authority while preserving the control invariants.

This portability question is deliberately reserved for the next analysis/handoff.

## 12. Proof boundary

Current justified claim: **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

Demonstrated beyond the earlier baseline:
- real Production failure to deterministic protected-layer Candidate;
- zero-paid validated-inactive state;
- human-reviewed application of the learned Director rule.

Not justified yet:
- fully self-modifying/self-authorizing Factory;
- model benchmark winner;
- automatic Production model promotion;
- proven learning impact on a later Owner-accepted game;
- proven cross-domain portability.
