# Game Factory — Project Progress Snapshot — S0–S5 CLOSED

Date: 28.08.2026  
Repository: `Bartekkk87/game-factory`  
Status: **FACTORY FOUNDATION + GOLDEN CORPUS S0–S5 IMPLEMENTATION CLOSED**

This document is the current consolidated project-progress snapshot. It supersedes older status statements such as `S4/S5 NOT STARTED` or `runtime migration open`, while preserving those older documents as historical evidence of the path taken.

## 1. Executive summary

The Game Factory has moved from a working autonomous game-production pipeline with deterministic verification and controlled learning into a reproducible **evidence-driven controlled-improvement system** with a Golden Factory Evaluation Corpus and a fully implemented S0–S5 evaluation/benchmark governance layer.

Current justified claims:

- autonomous Production pipeline with deterministic release authority: **implemented and demonstrated**;
- intra-run repair/polish with budget control: **implemented and demonstrated**;
- durable run/review evidence: **implemented**;
- automatic deterministic evidence aggregation, trigger and bounded learning analysis: **implemented and regression-tested**;
- automatic creation of inactive candidates from qualified evidence: **implemented**;
- automatic validation/activation/promotion: **intentionally prohibited**;
- human-gated protected-layer application: **implemented**;
- durable Non-Prompt Application Receipt / `APPLIED-CLOSED`: **implemented in S4**;
- Golden Factory Evaluation Corpus S0–S5: **implemented and closed**;
- zero-paid system-configuration benchmark framework: **implemented in S5**;
- real model-backed S5 benchmark winner: **not executed / not selected**;
- real validated + human-applied learning measurably producing a later Owner-accepted game: **not yet demonstrated**;
- fully self-modifying / self-authorizing Factory: **not claimed and not desired**.

Preferred terminology remains: **evidence-driven controlled improvement**.

## 2. Current Source of Truth and regression evidence

Executable S5 merge baseline:

- PR `#34` — `feat(evaluation): implement S5 system configuration benchmark contracts`
- merge commit: `f999b133e5023fee283c7b257f5968a8f5b5ca94`
- S5 branch Full Verifier: `33201037744` — **SUCCESS in all steps**
- exact-main post-merge Full Verifier: `33201578062` — **SUCCESS in all steps**

The exact-main run proves the merged implementation across:

- Golden Corpus S0, S1a, S1b, S2, S3, S4 and S5;
- Control Kernel / budget / release authority;
- Model / provider router and capability gates;
- Production credential isolation;
- Owner Contract and Titan candidate validation;
- controlled-learning safety, lifecycle, recurrence and automatic orchestration;
- failed-run root-cause diagnosis;
- Production-agent and art-direction runtime integrity;
- Product Fidelity hardening;
- proof/action reachability;
- terminal proof scenarios;
- HUD geometry;
- causality and visual activity controls;
- Good/Bad Product Verifier;
- publishing and XSS gates.

Documentation-only closure commit after that executable proof:

- `4033c0431a1f21757ade635981a11d0231654db2` — `docs(evaluation): close S5 system configuration benchmark framework`

## 3. Factory foundation already closed before S0–S5

### P0 / deterministic production safety

Completed and regression-tested:

- Skill integrity and assembled-prompt CI;
- Product Fidelity hardening;
- deterministic Release Authority guard;
- canonical Model Routing single source of truth;
- budget/cost kernel with fail-closed accounting;
- explicit Owner Contract decomposition and traceability;
- idle/no-input causality proof;
- visual-activity evidence;
- art-direction runtime truth through the canonical prompt assembler.

Binding release logic remains deterministic:

`Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS`

No LLM receives release authority.

### Controlled Improvement v1 — L0–L7

The implemented lifecycle is:

`durable evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis -> inactive candidate -> explicit validation -> human-gated application/promotion -> reversible state`

Safety invariants:

- raw Owner evidence is preserved;
- `/reject` does not create an active lesson;
- Production prompt visibility requires `status=validated && active=true`;
- Learning analysis cannot validate, activate, promote, change authority or weaken gates;
- protected layers remain human-merge gated;
- automatic Learning does not start paid retries;
- candidate state and applied Production state are not conflated.

Protected layers include at least:

- `skill`
- `prompt`
- `owner-contract`
- `verifier`
- `product-fidelity`
- `release-gate`
- `engine-contract`
- `control-plane`

## 4. Real Production evidence that drove Factory improvements

### Titan Core: Reforged / Titan #3

Reference Production evidence:

- Production Run `33069903383`
- Technical PASS
- Product Fidelity PASS after autonomous repair
- Experience `7.7/10` after autonomous polish
- Budget / deterministic Release Gate PASS
- cost `$0.442821`, `109703` tokens
- Owner hands-on result: **PRODUCT ACCEPTANCE FAIL**

This demonstrated that technical PASS is not equivalent to Owner product acceptance and produced durable real evidence feeding the controlled-learning path.

### Harbor Courier

Harbor Courier exposed multiple concrete Factory reliability defects and was used as evidence rather than as justification for blind architecture expansion.

Canary #1:

- Run `33113644525`
- result `FAILED / debug_exhausted`
- repair trajectory `9 -> 5 -> 2 -> 8 -> 9`
- later repairs regressed after a better intermediate candidate
- new deterministic Canvas runtime error was introduced

Resulting improvement:

- best-evidenced-attempt / repair-regression protection implemented and regression-proven;
- dedicated candidate remained controlled and inactive until validation.

Canary #2:

- Run `33116251376`
- result `debug_exhausted`
- repair trajectory `7 -> 7 -> 7 -> 5 -> 7`
- best-so-far policy worked as designed, proving the prior repair-regression defect was fixed;
- new failure class: proof-plan reachability mismatch between required proof and the actual bounded verifier observation/action window.

That evidence drove deterministic proof-reachability hardening rather than another paid blind rerun.

Subsequent reliability work also hardened terminal semantics, action/observation timing, generic action reachability, independent evidence and visual-activity timing. These demonstrated failures later became Golden Corpus seed families.

## 5. Golden Factory Evaluation Corpus — S0–S5

The Golden Corpus is an **evidence/evaluation layer**, not a second Control Plane and not model-weight training.

### S0 — Corpus Registry + Coverage Baseline — CLOSED

Implemented:

- typed Corpus schema;
- durable registry of demonstrated failure seeds;
- deterministic coverage baseline;
- source/evidence provenance checks;
- Full-Verifier coverage.

Initial S0 baseline:

- 15 active seeds;
- 14 failure classes;
- 12 variance families;
- 10 Game Production / 5 Factory Reliability;
- Tier 0 = 11, Tier 1 = 4;
- 12 Critical-Integrity cases.

S0 measured coverage/provenance, not Factory quality.

### S1a — executable Case / Oracle contract — CLOSED

Implemented executable expected-outcome semantics so a Corpus entry is not merely documentation. Cases bind their expected behavior and evidence contract in a deterministic form.

### S1b — bounded typed sibling variants — CLOSED

Known failure classes were expanded with meaningful neighboring variants rather than a blind Cartesian explosion. Variation families cover brief semantics, timing/lifecycle, runtime state vocabulary, input/reachability, visual evidence, repair trajectories and evidence/review conditions.

### S2 — Evaluation Runner + Quality / Delta — CLOSED

Implemented deterministic whole-Corpus execution and comparison.

Current proven S2 baseline after maturation:

- 29/29 Expected Outcomes = **100%**;
- 0 expected mismatches;
- 0 Critical False PASS;
- Game Production 19/19;
- Factory Reliability 10/10;
- Critical Integrity 23/23;
- Standard 6/6.

Critical-integrity rule remains: **0 tolerated false PASS**. A better aggregate score cannot hide a new critical false PASS.

### S3 — analysis-only Evaluation Failure Intake — CLOSED

Implemented a controlled path from compatible Corpus mismatches into durable Learning evidence.

Properties:

- exact evaluated report/baseline/commit/case provenance;
- deterministic failure signatures;
- known vs `unclassified` failure class;
- Evaluation Failure remains distinct from Production Failure;
- single observations can create evidence/analysis but not spam candidates;
- repeated deterministic cluster/signature evidence is required for the intended candidate threshold;
- resulting candidates remain inactive and cannot self-promote.

### S4 — durable Non-Prompt Application Receipt — CLOSED

S4 closed the propagation/audit gap for protected-layer improvements that are implemented in code/policy rather than activated as prompt lessons.

`learning-application-receipt-v1` binds:

- exact Candidate artifact SHA-256;
- target protected layer and change scope;
- human-reviewed PR / merge commit;
- human approval reference;
- canonical validation artifact;
- SHA-bound post-merge regression evidence;
- SHA-bound Golden Corpus PASS evidence;
- immutable receipt state `APPLIED-CLOSED`.

Important boundary:

`APPLIED-CLOSED` describes the application receipt. It does **not** silently activate the Candidate or turn code changes into prompt lessons.

Historical Candidates were deliberately not retroactively relabeled when their old evidence did not satisfy the new S4 contract.

### S5 — System Configuration Benchmark framework — CLOSED

S5 compares **complete system configurations**, not model names:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

Implemented:

- immutable/versioned configuration manifests with canonical configuration SHA-256;
- exact evaluated Git commit and repo-content bindings;
- reference/challenger manifests;
- separate `development-regression` and `holdout-generalization` datasets;
- separate evaluator Oracle bundles;
- worker-visible payload with no holdout Oracle/expected-answer leakage;
- fail-closed split isolation by case ID, source fingerprint, family and provenance identity;
- bounded trial plans;
- separate Owner authorization plus isolated benchmark budget/credential lane before any model-backed execution;
- observable trace contract with exact configuration/case/trial/model/prompt/skill/context/verifier/retry/escalation/evidence attribution;
- cost and latency attribution where applicable;
- rejection of persisted hidden/private reasoning fields;
- explicit `criticalFalsePassCount` with tolerance `0`;
- advisory result authority `human-review-required` only;
- deterministic zero-paid S5 falsification selftest integrated into the Full Verifier.

S5 closure means the **benchmark framework is executable and regressions-green**. It does not mean a real paid/model-backed comparison was run.

## 6. Model / provider architecture — current state

The Factory remains model-agnostic behind one canonical route:

- Router
- Provider Registry
- Model Registry
- Client / provider adapter
- budget ledger and capability checks

Production credential contract is now closed:

- OpenAI Production -> `OPENAI_PRODUCTION`
- OpenRouter Production -> `OPENROUTER_PRODUCTION`

Isolated future lanes remain separate, including benchmark/improvement lanes. Missing or mismatched credentials, unknown providers/models and capability mismatches fail closed. There is no automatic cross-provider fallback.

Production defaults are not automatically changed by benchmark metadata or S5 results.

The S5 manifests currently allow a reference/challenger configuration to be described reproducibly, but **no real benchmark result has authorized or selected a Production winner**.

## 7. What is now closed

The following implementation tracks are closed and should not be reopened without new evidence:

- deterministic release/budget/core verification foundation;
- Owner Contract decomposition and traceability;
- verifier causality / visual activity / reachability hardening;
- art-direction runtime truth;
- Controlled Improvement v1 mechanism and automatic deterministic orchestration;
- deterministic failed-run root-cause diagnosis;
- Golden Corpus S0–S5 implementation;
- Non-Prompt application receipt mechanism;
- zero-paid full-system benchmark governance contract.

## 8. What is explicitly NOT proven / not executed

These are not defects in the closed S0–S5 implementation; they are separate evidence milestones:

1. **No real S5 model-backed benchmark has been executed.**
2. **No Production model winner has been selected by S5.**
3. **No benchmark may automatically mutate Production defaults, prompts, skills or gates.**
4. **A validated + human-applied learning measurably improving a later Owner-accepted game is not yet demonstrated end-to-end.**
5. **The Factory is not claimed to be fully self-modifying or self-authorizing.**
6. **Productionization / IP & Security / private-core migration remains later work.**
7. Positive-learning taxonomy, mature stale-skill detection and broader multi-seed/adaptive model policy remain evidence-driven future topics.

## 9. Open execution track

GitHub Issue `#17` remains intentionally open because it tracks a different proof:

**Post-Repair Independent Game Canary — Owner Acceptance Proof**.

S0–S5 closure does not itself satisfy that product proof. A future paid Production Canary still requires explicit Owner authorization and should be evaluated through the normal Factory path plus hands-on Owner ACCEPT/REJECT.

The next real evidence milestone is therefore not another architecture layer by default. It is a controlled product proof showing whether the now-hardened Factory can produce a materially independent game that reaches Owner review and acceptance.

## 10. Governance state

Authority remains human- and contract-controlled:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Validated Active Memory Lesson`

Additional rules:

- GitHub = executable/durable Source of Truth;
- Notion = architecture/decision/status mirror;
- Golden Corpus = evaluation evidence, not authority;
- Learning = diagnose/propose, not self-authorize;
- protected Production changes = human-reviewed application;
- paid Product/Benchmark runs = separately Owner-authorized;
- benchmark outputs = advisory;
- no hidden chain-of-thought persistence is required or permitted by S5 traces.

## 11. Current decision checkpoint

**S0–S5 are complete.**

Architecture work should now be driven by new evidence, not by adding layers for completeness. The two cleanly separated future proof tracks are:

1. **Independent Product/Owner Acceptance proof** through Issue `#17`, after explicit Owner approval for a paid Canary.
2. **Optional real S5 model-backed system-configuration benchmark**, after a separate Owner authorization specifying configuration SHAs, dataset scope, trial bound, budget and isolated credential lane.

Neither track has authority to silently modify Production.