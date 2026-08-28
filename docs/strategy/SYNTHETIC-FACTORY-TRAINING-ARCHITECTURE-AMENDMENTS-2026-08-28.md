# Synthetic Factory Training & Evaluation — Architecture Amendments — 28.08.2026

## Status

**APPROVED ARCHITECTURE REQUIREMENTS / DOCUMENTATION-ONLY CHANGE**

This document supplements `docs/strategy/SYNTHETIC-FACTORY-TRAINING-AND-EVALUATION-ARCHITECTURE-2026-08-28.md` and the S0/S1 handoff. It does not authorize Production mutation, Candidate validation/activation/promotion, gate weakening, paid LLM/API work, or Harbor Canary #4.

The existing authority model remains unchanged: GitHub is executable/durable Source of Truth; Owner Contract remains Product Truth; the Golden Corpus is an Evidence/Evaluation layer, not a second Control Plane; Improvement remains evidence-driven and human-gated for protected layers.

---

## A1. S1 executability/oracle precondition before corpus expansion

Do not generate large sibling-variant families that cannot be automatically and deterministically evaluated.

Before material S1 expansion, define the minimal zero-paid **case execution + oracle contract** required to prove that a proposed sibling variant has:
- an executable source/fixture/selftest,
- a deterministic expected outcome,
- a machine-checkable PASS/FAIL oracle,
- durable provenance to its parent seed and changed variance dimension.

This is an S1 precondition, not the full S2 quality/delta runner. S2 remains responsible for corpus-wide execution, rollups, baseline deltas and quality reporting.

Preferred sequence:

`S0 Registry -> S1a executable/oracle contract -> S1b bounded sibling variants -> S2 corpus runner + quality/delta reporting`

No synthetic case should exist merely as descriptive data if the Factory cannot later execute and grade it reliably.

---

## A2. Development/Regression Corpus and Holdout Corpus must be distinct

The architecture must distinguish two evaluation populations:

1. **Development / Regression Corpus**
   - visible to Factory developers and improvement work,
   - used continuously for regression,
   - may directly influence repairs, prompts, skills and policies after normal validation/governance.

2. **Holdout / Generalization Corpus**
   - must not be exposed to the evaluated Production worker as task context or expected-answer context,
   - must not be used to tune a Candidate before its holdout evaluation,
   - exists to detect overfitting to the known Golden Corpus.

The storage/isolation mechanism can be decided later. A separate repository is **not** required by this decision. If true holdout secrecy cannot be achieved inside the public monorepo, a later security/evaluation decision may choose an isolated private store or other protected mechanism.

A high regression-corpus score must never by itself be claimed as proof of generalization.

---

## A3. Observable execution traces are First-Class Evidence

For model-backed or multi-stage evaluations, outcome evidence alone is insufficient. The Factory should persist an **observable execution trace** sufficient to diagnose where a system configuration failed.

Trace metadata should include where applicable:
- case/variant ID,
- evaluated commit SHA,
- provider/model/version,
- prompt hash/version,
- skill hash/version,
- relevant context/reference hashes,
- tool/action calls and externally observable intermediate states,
- retry count,
- repair/rebuild/polish count,
- verifier/fidelity/review results,
- failure signature and cluster,
- final outcome,
- token/cost/latency metadata,
- evidence references.

This requirement does **not** require or authorize storage of hidden chain-of-thought. Only durable, observable execution metadata and outputs required for reproducibility/evaluation should be captured.

The intended learning question becomes not only `did it fail?` but also `where in the Factory trajectory did the failure originate or propagate?`.

---

## A4. Model-backed evaluation requires repeated trials

Tier-3/model-backed evaluation must not infer capability from one stochastic run.

For each selected model-backed case/configuration, S5 must define a bounded trial count and report at least:
- trial count,
- PASS count/rate,
- critical false-PASS count,
- variance across trials where meaningful,
- cost and latency distribution/summary,
- retry/escalation usage.

Deterministic Tier-0/1 cases can remain single execution when reproducibility is proven.

No arbitrary high-volume paid repetitions are authorized; trial counts remain bounded and Owner-gated through the existing budget model.

---

## A5. S5 becomes a System Configuration Benchmark, not only a Model Benchmark

Rename/extend the future S5 concept from **Model Benchmark** to **System Configuration Benchmark**.

The unit under comparison is the complete bounded execution configuration, for example:

`Model + Prompt/Skill Version + Context Contract + Verifier + Retry Policy + Escalation Policy`

S5 should compare configurations on:
- expected-outcome quality,
- critical-integrity false-PASS behavior,
- robustness across repeated trials,
- cost,
- latency,
- retries/escalations,
- domain/cluster performance.

This explicitly enables the strategy of using a cheaper/weaker model with stronger verification/retry/escalation when the measured system result is better than simply switching to a larger model.

No configuration may silently become Production default. Production model/configuration changes remain explicit and governed.

---

## A6. Owner Experience Calibration becomes a separate quality dimension

Technical/Fidelity/Experience gate success is not identical to real Owner acceptance. The Factory already has evidence that a machine-approved game can still receive Owner Product Acceptance FAIL.

Add a future **Owner Experience Calibration Set** using durable historical Owner review outcomes plus the machine review/evidence available for those games.

Purpose:
- measure how well automated Experience/Playtester assessments predict Owner acceptance,
- detect systematic blind spots in product quality judgment,
- calibrate reviewer policy without turning subjective Owner preferences into an unreviewed hard technical gate.

At minimum, preserve:
- game/run identity,
- Owner ACCEPT/REJECT/feedback evidence,
- automated Experience result,
- Product Fidelity result,
- relevant visual/gameplay evidence refs,
- classification/reason where durably supported.

Owner calibration remains advisory/evaluation evidence unless a later explicit architecture decision changes release authority.

---

## A7. Define a Factory Unit Contract inside the monorepo

The architectural idea of self-contained units is useful, but this Factory should **not** split Director, Engineer, Playtester, Verifier, etc. into separate repositories merely for conceptual purity.

A standard **Factory Unit Contract** should instead be defined inside the existing monorepo. A unit definition should make machine-readable/traceable where applicable:
- identity and version,
- purpose/responsibility,
- inputs,
- outputs,
- allowed tools/actions,
- authority boundary,
- context sources,
- prompt/skill/version references,
- default model/routing requirements,
- retry/escalation policy if applicable,
- relevant eval suites/corpus domains,
- quality/cost metrics.

Repository separation remains a future deployment/ownership/security decision only if a real need is proven. Avoid cross-repository complexity, SHA drift and duplicated control surfaces in the current Game Factory.

---

## A8. Root architecture/documentation must expose the Evaluation layer

The repository root documentation must eventually make the current architecture discoverable to both humans and coding agents.

`README.md` and `ARCHITECTURE.md` should be synchronized so a new agent can discover at least:
- Production Factory,
- Evidence & Quality,
- Golden Evaluation Corpus,
- Improvement Factory,
- Model/Provider layer,
- Control Kernel,
- current S0-S5/S1a-S1b status and proof boundaries.

This is documentation synchronization, not permission to redesign Production behavior.

---

## A9. No per-unit repository split in the current project

For avoidance of doubt: the podcast-inspired idea of one repository per organizational unit is **not a current Game Factory requirement**.

The relevant principle being adopted is **AI-readable, versioned, testable context and capability boundaries**, not repository proliferation.

The monorepo remains the preferred current topology unless evidence later proves a security, ownership, deployment or scaling reason to split it.

---

## A10. Future product portability is a design constraint, not an S1 refactor

The Game Factory may later serve as a reference architecture for factories that build other products. Therefore new Evaluation/Improvement mechanisms should keep clean boundaries between:
- reusable Factory control/evidence/learning concepts, and
- game-specific production/verifier/product-fidelity logic.

This does **not** authorize a generic multi-product platform rewrite during S1. No abstraction should be introduced without a concrete current use or demonstrated duplication/failure mode.

---

## Revised architecture sequence

Current conceptual sequence becomes:

`S0 Corpus Registry + Coverage Baseline` — CLOSED

`S1a Minimal executable case/oracle contract` — required before material variant expansion

`S1b Bounded Failure Variance Families` — current implementation focus

`S2 Evaluation Runner + Quality/Delta Report` — later

`S3 evaluation-failure analysis-only Learning Intake` — later

`S4 Application Receipt / APPLIED-CLOSED Closure` — later

`S5 System Configuration Benchmark + repeated trials + holdout/generalization evaluation` — later, model-backed work Owner-gated

Cross-cutting future requirements: observable traces, Owner Experience Calibration, Factory Unit Contract, and regression-vs-holdout separation.

## Safety boundary

Nothing in these amendments authorizes:
- paid LLM/API execution,
- Harbor Canary #4,
- automatic Candidate validation/activation/promotion,
- automatic prompt/skill mutation,
- release/verifier gate weakening,
- self-authorizing meta-learning,
- per-unit repository splitting,
- generic multi-product platform refactoring.
