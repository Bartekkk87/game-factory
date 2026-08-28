# Game Factory — Architektur v2.6 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. GitHub ist die executable/durable Source of Truth für Code, Runs, Evidence, Learning-Artefakte, Evaluation und Promotionen. Notion spiegelt Entscheidungen und Status.

Stand: **28.08.2026 — Factory Foundation + Controlled Improvement + Golden Corpus S0–S5 IMPLEMENTATION CLOSED.**

Kanonischer Fortschrittssnapshot: `docs/strategy/PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md`.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release, Learning-Promotion, Benchmark-Promotion oder Provider-Fallback.
3. **Owner Intent ist Vertrag.** Must-Haves/No-Gos und durable Referenzen dürfen downstream nicht still verschwinden.
4. **Modelle sind Worker, keine Control Plane.** Budget, SHA-Binding, Release, Learning und Benchmark-Authority bleiben deterministisch/governed.
5. **Production Factory und Improvement Factory sind getrennt.** Kein ungeprüfter Candidate darf Production beeinflussen.
6. **Provider/Modelle sind austauschbar.** Kein stiller Challenger- oder Cross-Provider-Fallback.
7. **Promotion ist explizit und reversibel.** Geschützte Layer benötigen separaten Human-Review/Merge.
8. **Git-backed Evidence vor unsichtbarer Memory.** Dauerhafte Claims brauchen nachvollziehbare Provenance.
9. **Keine neue Kontrollkomponente ohne reproduzierten Failure Mode.**
10. **Kein Paid Game- oder model-backed Benchmark-Run ohne separate Owner-Freigabe.**

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
   Raw Evidence -> Aggregate -> Trigger -> Analysis -> Candidate -> Validation -> Human Application/Promotion

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

Auditor and qualitative Playtester Fidelity remain advisory. No LLM receives Release Authority.

## 4. Owner Contract / Product Truth

`factory/src/contract/owner.mjs` preserves the raw brief, SHA/provenance and stable Owner requirements.

- explicit Must-Haves -> stable `MH-*` requirements;
- explicit No-Gos -> stable `NG-*` constraints;
- ambiguous/freeform material is preserved conservatively rather than inflated into hard requirements;
- Director receives both the raw Owner idea and the Owner Contract;
- traceability requires exactly one acceptance criterion and one supported verifier probe per hard Owner requirement.

## 5. Verifier / Product Fidelity

Implemented and regression-covered:

- Technical verification;
- Product Fidelity evidence authority;
- proof-plan reachability before Engineer spend;
- generic action reachability;
- terminal-state proof and restart observation;
- independent HUD/layout geometry;
- idle/no-input causality control;
- inter-frame visual activity;
- Good/Bad Product negative controls;
- publishing integrity and XSS gates.

The verifier must not treat generated self-attestation as sufficient independent evidence.

## 6. Controlled Improvement v1 — L0–L7 CLOSED

Lifecycle:

`durable evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis -> inactive candidate -> explicit validation -> human-gated application/promotion -> reversible state`

Safety invariants:

- `/reject` and `/feedback` preserve Owner evidence but do not directly create active lessons;
- Production prompt injection is allowed only for `status=validated && active=true`;
- automatic analysis cannot validate, activate, promote, edit Production, change its own authority or weaken gates;
- protected layers remain human-gated;
- automatic Learning does not start paid retries;
- candidate state and applied Production state remain separate.

Protected layers include:

`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`.

## 7. Golden Factory Evaluation Corpus — S0–S5 CLOSED

The Golden Corpus is an Evaluation/Evidence layer, not a second Control Plane and not LLM weight training.

### S0 — Registry + Coverage
Typed case schema, durable seed registry, provenance validation and deterministic coverage baseline.

### S1a/S1b — executable cases + bounded sibling variance
Expected outcomes are executable; demonstrated failure classes have meaningful neighboring variants without blind Cartesian expansion.

### S2 — Evaluation Runner + Quality Delta
Deterministic whole-Corpus execution. Current proven baseline: **29/29 expected outcomes, 0 mismatches, 0 Critical False PASS**. Critical false-PASS tolerance remains `0`.

### S3 — Evaluation Failure Intake
Compatible Corpus mismatches can enter Controlled Improvement as analysis-only durable evidence. Repeated deterministic observations are required before candidate creation; candidates remain inactive.

### S4 — Non-Prompt Application Receipt
`learning-application-receipt-v1` binds Candidate SHA, protected target layer/scope, human-reviewed PR/merge, approval, validation, post-merge regression and Golden-Corpus PASS. Receipt state `APPLIED-CLOSED` does not activate the Candidate or convert code changes into prompt lessons.

### S5 — System Configuration Benchmark
Comparison unit:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

S5 provides versioned configuration SHAs, Development/Holdout isolation, separate evaluator Oracles, bounded trials, trace attribution, cost/latency attribution, `criticalFalsePassCount` tolerance `0`, and advisory `human-review-required` results.

A model-backed S5 run requires separate Owner authorization, bounded budget and an isolated benchmark credential lane. S5 cannot mutate Production automatically.

## 8. Model / Provider layer

Canonical runtime stack:

- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`
- `factory/src/llm/client.mjs`

Current Production reference defaults remain intentionally unchanged for the next independent Product Proof:

| Role / Operation | Reference default |
|---|---|
| Director | `openai:gpt-5.6-terra` |
| Engineer Build/Repair/Rebuild/Polish | `openai:gpt-5.6-terra` |
| Playtester | `openai:gpt-5.6-terra` |
| Auditor | `openai:gpt-5.6-luna` |
| Release | deterministic / no LLM |

Production credentials are provider-isolated:

- OpenAI -> `OPENAI_PRODUCTION`
- OpenRouter -> `OPENROUTER_PRODUCTION`

Separate OpenRouter trust lanes exist for later benchmark/improvement work. There is no silent cross-provider fallback.

The registered OpenRouter challenger remains metadata/explicit-route only and is **not** a Production default. No model switch is authorized by this architecture sync.

## 9. Real Production evidence

Titan #3 proved the Production loop but ended in Owner **PRODUCT ACCEPTANCE FAIL**, showing that technical PASS is not Owner acceptance.

Harbor Courier exposed and helped repair concrete reliability failures including repair regression and proof-plan reachability. These failures were converted into deterministic regression/evaluation coverage instead of endless paid reruns.

The stronger end-to-end claim — validated/human-applied learning measurably improving a later Owner-accepted game — remains unproven.

## 10. Current execution milestone

Architecture hardening for the currently evidenced defect set is complete. The next milestone is **Issue #17 — Post-Repair Independent Game Canary / Owner Acceptance Proof**.

Mandatory order:

1. independent non-Titan Owner brief;
2. deterministic zero-paid preflight against current `main`;
3. present exact brief, normalized interpretation, verifier coverage, risks and cost boundary;
4. **STOP for explicit Owner approval**;
5. only then exactly one paid Production Canary;
6. Owner hands-on ACCEPT/REJECT;
7. classify evidence before any new architecture change.

## 11. Explicitly later / not PoC-Canary blockers

- real model-backed S5 comparison and model optimization;
- adaptive model policy based on benchmark evidence;
- positive-learning taxonomy;
- mature stale-skill detection;
- broader multi-seed policies;
- Productionization / IP & Security / private-core migration.

These are future evidence-driven tracks, not missing architecture required before the independent PoC Product Proof.

## 12. Proof boundary

Current justified claim: **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

Not justified yet:

- fully self-modifying/self-authorizing Factory;
- model benchmark winner;
- automatic Production model promotion;
- proven learning impact on a later Owner-accepted game.
