# Golden Factory Evaluation Corpus — S5 System Configuration Benchmark Design

Date: 28.08.2026  
Status: S5 design-first; zero-paid benchmark contract only  
Base: `main` `856e82c5bdda0ecddadeb3d1bec949d9abd75585` (S4 CLOSED)

## Decision

S5 compares **complete, explicitly versioned system configurations**, not isolated model names.

Canonical benchmark unit:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

S5 extends the existing Evaluation/Evidence layer. It does not introduce another orchestrator, scheduler, autonomous architecture agent, model router, promotion path or Control Plane.

The first S5 implementation is deliberately **zero-paid**: it defines configuration, dataset separation, trial bounds, trace/evidence and result contracts plus deterministic falsification tests. A model-backed Tier-3 execution remains a later, separately Owner-authorized action.

## Authority boundary

S5 may:
- version and validate benchmark configurations;
- version development/regression and holdout/generalization datasets;
- prove holdout isolation structurally;
- define bounded trial plans;
- emit comparable result/trace schemas;
- calculate quality/integrity/cost/latency metrics from supplied benchmark observations;
- support a human configuration decision.

S5 must not:
- call a paid/model-backed benchmark without separate Owner authorization;
- change Production model defaults or router policy;
- change prompts or skills;
- validate, activate or promote Learning Candidates;
- weaken gates;
- expose holdout oracle/expected results to the evaluated worker;
- persist hidden chain-of-thought;
- start Harbor Canary #4.

## Complete configuration contract

Each configuration is immutable and versioned. It must bind all six required components:

1. **Model** — exact provider/model identity and model-registry reference.
2. **Prompt/Skill** — exact prompt and skill refs plus content hashes.
3. **Context Contract** — exact context-input contract refs plus content hashes; this describes what context is supplied, not hidden reasoning.
4. **Verifier** — exact verifier/evaluator refs plus content hashes.
5. **Retry** — exact retry/repair policy refs and bounded settings.
6. **Escalation** — exact escalation/release/budget authority refs and bounded settings.

A configuration also binds the evaluated Git commit and its own canonical SHA-256. Missing one required component makes the configuration invalid.

Production defaults are observed as inputs only. Creating a benchmark configuration does not mutate them.

## Dataset split and holdout isolation

S5 uses two logically separate populations:

- **development-regression** — cases usable for implementation/debugging and ordinary regression;
- **holdout-generalization** — cases reserved for comparative generalization measurement.

The holdout dataset must be separately versioned and must not overlap development by case ID, source/fixture fingerprint or declared family/provenance identity.

Worker-visible case payload and evaluator oracle are separate objects. Holdout expected outcomes/oracles are never included in the worker-visible payload. The evaluator may access them only after the worker output exists.

The existing Golden Corpus remains authoritative regression evidence; S5 does not relabel current development/regression cases as holdout evidence.

## Trial plan

Deterministic zero-paid contract tests use one deterministic observation per fixture because no stochastic worker is involved.

Any future stochastic/model-backed configuration must carry an explicit bounded trial plan before execution. The plan must specify a finite trial count and seed/run identity policy. Unbounded retries or silent repeated paid attempts are invalid.

A model-backed trial plan is not executable unless a separate benchmark authorization record and isolated benchmark budget/credential lane are present.

## Observable trace contract

Every benchmark observation must be attributable to one configuration and one run/trial and record at least:

- evaluated Git commit;
- configuration ID/version/SHA;
- dataset split and case ID;
- provider/model identity;
- prompt refs/hashes;
- skill refs/hashes;
- context-contract refs/hashes;
- verifier refs/hashes;
- retry/repair actions and count;
- escalation actions/decision;
- tool/action calls as observable structured events;
- evaluator outcome;
- normalized failure signature where applicable;
- token/cost observations when applicable;
- latency observation when applicable;
- explicit evidence/source refs.

The trace stores observable execution evidence only. It must reject fields intended to persist private/hidden reasoning or chain-of-thought.

## Result contract

Comparison results are advisory and bind the exact compared configuration SHAs and dataset versions.

Report separately:
- expected-outcome quality;
- critical-integrity false PASS;
- robustness across bounded trials/cases;
- cost where applicable;
- latency where applicable;
- failures by class/signature.

Critical false PASS is a load-bearing metric and must never be hidden inside an aggregate score. A configuration with a new critical false PASS cannot be presented as an unqualified winner even if another aggregate metric improves.

A result may recommend `human-review-required`; it has no authority to edit the Production router/default, prompts, skills, gates or Candidate state.

## Zero-paid S5 start

Initial executable work will add only:
- typed validators/builders under the existing `factory/src/evaluation/` layer;
- versioned benchmark configuration/dataset manifests under `evaluation/benchmark/`;
- deterministic zero-paid falsification selftests;
- a Full-Verifier step proving S5 contracts and mutation boundaries.

No provider call is necessary to prove this contract.

## Explicit falsification cases

S5 is not acceptable unless deterministic tests prove all of the following:

1. configuration missing any of Model / Prompt-Skill / Context / Verifier / Retry / Escalation -> reject;
2. unversioned configuration or missing configuration SHA binding -> reject;
3. unknown provider/model or registry mismatch -> reject;
4. missing/mutable repo reference or content-hash mismatch -> reject;
5. configuration commit does not match the evaluated commit contract -> reject;
6. development and holdout overlap by case ID -> reject;
7. development and holdout overlap by source/fixture fingerprint -> reject;
8. development and holdout overlap by declared family/provenance identity -> reject;
9. holdout expected/oracle data present in worker-visible payload -> reject;
10. missing dataset version/SHA -> reject;
11. stochastic/model-backed plan without finite trial bound -> reject;
12. model-backed execution authorization absent -> fail closed before provider invocation;
13. isolated benchmark budget/credential lane absent -> fail closed before provider invocation;
14. trace missing exact config SHA, commit, model, prompt/skill/context/verifier refs, retry/escalation, evaluator result or evidence ref -> reject;
15. trace contains hidden-reasoning/chain-of-thought storage field -> reject;
16. cost or latency observation cannot be attributed to exact config + case + trial -> reject;
17. critical false PASS omitted or collapsed into aggregate-only reporting -> reject;
18. result compares configurations against different/unpinned dataset versions as though directly comparable -> reject;
19. benchmark result attempts to mutate model router/default -> reject/prove unchanged;
20. benchmark result attempts prompt/skill/gate mutation -> reject/prove unchanged;
21. benchmark result attempts Candidate validation/activation/promotion -> reject/prove unchanged;
22. zero-paid contract selftest performs any provider/API/LLM call -> reject;
23. existing Golden Corpus / S0-S4 gates remain unchanged and Full Verifier stays green.

## S5 start acceptance

The zero-paid start is complete when:
- configuration and dataset contracts are versioned/reproducible;
- holdout isolation and oracle separation are executable and falsifiable;
- trial bounds and model-backed authorization boundary fail closed;
- trace/result contracts preserve exact attribution and critical false-PASS reporting;
- tests prove no Production mutation;
- Full Verifier remains green.

This does **not** constitute a model benchmark result. A real model-backed comparison begins only after a separate Owner authorization identifying the benchmark scope/budget/lane.