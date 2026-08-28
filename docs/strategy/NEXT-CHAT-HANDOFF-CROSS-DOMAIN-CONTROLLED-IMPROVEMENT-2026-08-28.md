# NEXT CHAT HANDOFF — Cross-Domain Controlled Improvement Architecture

Date: 28.08.2026  
Source project: `Bartekkk87/game-factory`  
Next-chat purpose: **analyze whether the evidence-driven controlled-improvement architecture built for the Game Factory can be generalized to non-gaming use cases.**

## 0. Mandatory start procedure

Before making claims, the next chat must verify the live current state in GitHub and Notion.

Primary GitHub sources:
- `ARCHITECTURE.md`
- `README.md`
- `docs/strategy/PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md`
- `docs/strategy/LEARNING-ARCHITECTURE-EVIDENCE-TO-APPLIED-CHANGE-2026-08-28.md`
- `docs/strategy/LUMEN-CURRENT-LEARNING-REPAIR-2026-08-28.md`
- GitHub Issue `#17`

Primary Notion sources:
- `📍 Game Factory — Projektfortschritt S0–S5 CLOSED — 28.08.2026`
- `🧭 Game Factory — Umsetzungskatalog 27.08.2026`
- `🧠 Game Factory — Platform & Model Architecture Decision — 27.08.2026`
- `🧠 Game Factory — Learning Architecture: Evidence → Applied Change — 28.08.2026`

Do not rely on older handoffs when they conflict with those current sources. Preserve historical documents as audit evidence rather than rewriting history.

## 1. Current proven Game Factory state

Preferred architectural claim:

**EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**

The Factory is not claimed to be fully self-modifying or self-authorizing.

Factory Foundation + Golden Corpus S0–S5 are closed.

Binding control principles:
- LLM output is a claim, not truth;
- Owner intent is a contract;
- observable/durable evidence precedes promotion;
- deterministic/governed gates retain release authority;
- Production and Improvement authority are separated;
- protected-layer mutation is human-gated;
- no paid Product/Benchmark retry is started automatically;
- GitHub is executable/durable source of truth;
- Notion is architecture/status mirror.

## 2. Real Lumen learning proof

Paid Canary #1:
- Produce Game run `33207019862`
- durable run `runs/20260828-201007/`
- cost `$0.050686`
- tokens `7,883`
- no Engineer/Repair/Polish calls
- no playable draft.

Failure:
- `PR-MH-03 -> state_reached: restored`
- `PR-MH-04 -> state_reached: glass_breach`

The verifier rejected these non-protocol states before Engineer spend.

Failure class:
`director-verifier-state-contract-mismatch`

Generalized learning:

**Product/thematic semantics and technical verifier protocol semantics are separate. Technical verifier fields use only their finite contract; domain-specific semantic labels belong in domain events/data/UI unless explicitly part of that contract.**

## 3. Real Candidate lifecycle demonstrated

Candidate:
`learning/candidates/candidate-production-run-b37ac8d268e8549c.json`

State:
- role `director`
- scope `case-root-cause`
- target layer `skill`
- source run `20260828-201007`
- confidence `1`
- status `validated`
- active `false`.

Canonical validation:
`learning/validations/candidate-production-run-b37ac8d268e8549c.json`

Pre-merge zero-paid evidence:
- Full Verifier `33208519229` — SUCCESS 37/37
- Full Verifier `33209130248` — SUCCESS 37/37
- Full Verifier `33209616277` — SUCCESS with validated-inactive enforcement
- Golden Corpus 29/29, 0 mismatches, 0 Critical False PASS.

Human-reviewed application:
- PR `#36`
- merge commit `7af126e3300b23c19bd088ca32c08c7e81947d8b`.

Exact-main post-merge proof:
- Full Verifier `33211092911`
- SUCCESS all 37 steps
- Golden Corpus 29/29
- 0 mismatches
- 0 Critical False PASS
- Corpus API/model cost `$0`.

S4 audit closure:
- regression evidence `learning/evidence/applications/candidate-production-run-b37ac8d268e8549c-full-verifier.json`
- Corpus evidence `evaluation/results/LUMEN-LEARNING-APPLICATION-CORPUS-7af126e.json`
- receipt `learning/applications/candidate-production-run-b37ac8d268e8549c.json`
- terminal state **`APPLIED-CLOSED`**.

Important invariant:

**`APPLIED-CLOSED` does not activate the Candidate. Candidate remains `validated`, `active=false`.**

The merged protected-layer Skill/Contract files are Production truth through human-reviewed Git authority; active Memory lesson promotion is a distinct mechanism.

## 4. Canonical Learning architecture

```text
REAL EVENT
  -> DURABLE EVIDENCE
  -> DETERMINISTIC AGGREGATE / TRIGGER
  -> DETERMINISTIC ROOT CAUSE / FAILURE CLASS
  -> INACTIVE CANDIDATE
  -> TARGETED VALIDATION
  -> FULL REGRESSION + GOLDEN CORPUS
  -> VALIDATED / ACTIVE=false
  -> HUMAN REVIEW / MERGE
  -> POST-MERGE REGRESSION
  -> APPLICATION RECEIPT / APPLIED-CLOSED
```

Automatic Learning may:
- read durable evidence;
- aggregate facts;
- classify supported signatures;
- generate bounded findings;
- create inactive candidates;
- propose validation.

Automatic Learning may not:
- validate itself;
- activate/promote itself;
- weaken gates;
- mutate its own authority;
- start paid work;
- silently modify protected Production layers.

Protected layers include:
`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`, `evaluation`.

## 5. Golden Corpus / Evaluation role

Golden Corpus is Evidence/Evaluation, not a second Control Plane.

Current frozen S2 proof:
- total 29 cases
- Game Production 19
- Factory Reliability 10
- Critical Integrity 23
- Standard 6
- 0 Expected Mismatches
- 0 Critical False PASS
- Critical False-PASS tolerance 0.

S3 can intake compatible Evaluation failures as analysis-only Learning evidence.
S4 provides immutable application receipts.
S5 compares complete System Configurations rather than model names:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

No real paid/model-backed S5 winner has been selected.

## 6. Current Gaming boundary

GitHub Issue `#17` remains open because no playable independent Lumen draft reached hands-on Owner ACCEPT/REJECT.

The Lumen architecture/Learning repair is complete and `APPLIED-CLOSED`, but **no second paid Lumen/independent Product run is authorized**.

Do not trigger a paid Gaming run in the cross-domain discussion.

## 7. Cross-domain question to investigate

The key hypothesis is that the architecture may be abstracted as:

```text
Intent / Contract
  -> Worker
  -> Observable Evidence
  -> Deterministic / Governed Gate
  -> Failure Taxonomy
  -> Candidate Improvement
  -> Validation Corpus / Oracle
  -> Human Application
  -> Audit Trail / Rollback
```

The next chat should test this hypothesis critically rather than assume it is universally valid.

## 8. Required analysis questions

### A. What is truly domain-independent?
Separate generic control primitives from Gaming-specific implementation details.

Candidate generic primitives:
- intent/contract decomposition;
- worker/agent execution;
- independent observable evidence;
- explicit gates;
- failure classification;
- improvement candidates;
- protected layers;
- regression corpus;
- human approval;
- application receipt and rollback;
- cost/permission boundaries.

Gaming-specific elements to replace include:
- Game Owner Brief;
- Game Director/Engineer roles;
- Game telemetry;
- Product Fidelity probes;
- Experience score;
- browser/game verifier;
- Game Golden Corpus cases.

### B. What replaces each Game Factory component in another domain?
For each candidate domain map:

| Game Factory concept | Cross-domain equivalent to identify |
|---|---|
| Owner Contract | intent/specification/policy/requirements contract |
| Director/Engineer | domain workers/agents/tools |
| Game telemetry | observable operational evidence |
| Technical Verifier | deterministic/domain validator |
| Product Fidelity | requirement/policy fidelity oracle |
| Experience Gate | qualitative/business-quality gate where applicable |
| Release Gate | decision/execution authority |
| Skills | role-specific persistent instructions/policies |
| Golden Corpus | regression/evaluation case library |
| Learning Candidate | proposed process/prompt/policy/tool improvement |
| S4 Receipt | audit proof of reviewed application |

### C. Where is strong enough truth available?
Prioritize domains where outputs can be independently checked.

Potential domains to evaluate, not assume:
- software engineering / CI/CD;
- data pipelines / analytics / BI;
- document processing / structured back-office workflows;
- compliance evidence preparation;
- customer-support operations;
- research/evidence synthesis pipelines;
- creative production with explicit human acceptance;
- enterprise agent orchestration.

Regulated/high-stakes domains require stricter human authority and may not tolerate the same automation boundary.

### D. What fails when the oracle is weak?
Analyze specifically:
- Goodharting / optimizing the verifier rather than the real goal;
- evaluator/model self-confirmation;
- hidden feedback loops;
- false confidence from deterministic but incomplete gates;
- non-stationary domain truth;
- stale Skills/Policies;
- permission creep;
- contaminated Learning evidence;
- adversarial or manipulated evidence;
- correlation mistaken for root cause;
- over-generalization from a single incident.

### E. Is this a reusable product/platform?
Evaluate whether the architecture should be understood as a reusable **Controlled Improvement OS / Harness** rather than a Game-specific factory.

Do not jump directly to productization. First establish:
1. invariant control kernel;
2. pluggable domain contracts;
3. pluggable evidence/verifier layer;
4. pluggable worker/skill layer;
5. common Candidate/Validation/Application lifecycle;
6. audit/security/permission model;
7. domains where ROI and truth quality justify the architecture.

## 9. Desired output of the next chat

Produce an evidence-informed architecture assessment with:
1. domain-independent core;
2. Gaming-specific adapters;
3. 3–5 concrete non-Gaming reference architectures;
4. suitability matrix by domain;
5. failure/risk analysis;
6. minimum architecture changes required for generalization;
7. recommendation whether to keep this as Game Factory only, extract a generic core, or create a separate reusable Controlled Improvement platform.

If current external standards/products/research are used, browse/research them and clearly distinguish repository-proven facts from external comparison or inference.

## 10. Guardrails for next chat

- Do not alter Game Factory Production architecture merely to make it look generic.
- Do not start a paid run.
- Do not change Production models/providers.
- Do not claim universal applicability without domain-specific oracle analysis.
- Do not conflate deterministic verification with real-world truth.
- Preserve GitHub/Notion audit history.
- Treat Gaming as the first reference implementation/evidence source, not automatically as the final generic product boundary.

## 11. Initial thesis to challenge

A plausible thesis is:

> The most reusable asset may not be the game-generation pipeline itself, but the governed improvement loop around AI workers: contract-bound execution, independent evidence, deterministic/gated quality control, bounded learning candidates, regression validation, human-reviewed protected-layer application and durable audit closure.

The next chat must actively try to falsify this thesis and identify where it does **not** work.
