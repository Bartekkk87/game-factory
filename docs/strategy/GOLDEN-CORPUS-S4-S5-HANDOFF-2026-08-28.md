# Golden Factory Evaluation Corpus — S4/S5 Handoff

Date: 28.08.2026  
Status: planned, not started  
Precondition: S0, S1a, S1b, S2 and S3 are closed on `main` at `277a509f77055237019d354a25452e7d3ede346a`.

## Purpose

This document is the bounded handoff for the next implementation discussion. It does **not** authorize implementation, a paid run, Production mutation, candidate validation/activation/promotion, Harbor Canary #4, or a model-default change.

## S4 — durable Application Receipt / APPLIED-CLOSED

### Problem addressed

The current lifecycle can retain a Candidate as validated and inactive after a human-reviewed protected-layer implementation. Without a durable application receipt, the repository cannot prove which implementation closed that Candidate.

### Scope

S4 adds a separate, durable closure record for a **separately authorized and human-reviewed** application of a non-prompt protected-layer improvement.

Required provenance:

- candidate ID and immutable candidate SHA;
- target layer and bounded change scope;
- human-reviewed implementation reference (PR and merged commit);
- exact validation and regression evidence references;
- corpus/regression result;
- applied timestamp and accountable human approval reference;
- reversal or supersession reference when applicable.

Terminal status:

`validated candidate -> human-reviewed implementation -> required regression/corpus PASS -> APPLIED/CLOSED`

### Boundaries

- S4 does not invent a repair or select a Candidate.
- S4 does not validate, activate or promote a Candidate automatically.
- S4 does not turn protected code/verifier/skill/control-plane changes into prompt lessons.
- A missing approval, merged commit or required evidence leaves the record open/fail-closed.
- Existing promotion and active-memory rules remain unchanged.

### Minimum acceptance

1. Application receipt schema is deterministic and validated.
2. Receipt cannot reference an unvalidated Candidate or an unmerged/unknown implementation.
3. Required evidence references are complete and SHA-bound.
4. Duplicate application events are idempotent; conflicting application references fail closed.
5. Reversal/supersession keeps prior provenance rather than overwriting it.
6. Full Verifier proves happy path and all fail-closed paths.
7. No Production change, prompt/skill mutation, paid API/LLM call or Canary is part of S4 itself.

## S5 — System Configuration Benchmark

### Purpose

S5 compares complete, explicitly versioned system configurations rather than claiming that a model alone is better.

Benchmark unit:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

### Scope

S5 is planned after S4 and must include:

- development/regression corpus vs logically separated holdout/generalization corpus;
- bounded repeated trials for stochastic/model-backed evaluations;
- observable execution traces: SHA, model, prompt/skill/context references, tool/action calls, retries/repairs, evaluator result, failure signature, cost and latency;
- comparative results for quality, critical false PASS, robustness, cost and latency;
- optional Owner Experience Calibration Set, advisory only.

### Boundaries

- no hidden chain-of-thought storage;
- holdout expectations are not exposed to the evaluated worker;
- no automatic production-default, model-router or prompt/skill change;
- no automatic candidate activation/promotion;
- paid/model-backed benchmark execution requires separate Owner authorization and isolated benchmark credentials/budget;
- no Harbor Canary #4 as part of S5.

### Minimum acceptance

1. Configurations, datasets and baselines are versioned and reproducible.
2. Holdout isolation and trial bounds are demonstrable.
3. Critical false PASS remains a separate load-bearing metric.
4. Costs and latency are attributed to the exact configuration/run.
5. Results support a human decision only; they do not mutate Production policy.

## Recommended next-chat sequence

1. Verify current `main`, S3 closure, Issue #17 and both Notion pages.
2. Inspect the existing learning lifecycle, candidate schema, validations, promotions and current protected-layer changes.
3. Produce a minimal S4 design with explicit falsification cases before implementation.
4. Do not start S5, any paid run or a Canary while working on S4.
5. After S4 is independently closed, request separate Owner authorization before designing or running S5.

## Non-goals

- no second Control Plane, scheduler, agent, database or model router;
- no generic multi-product refactor;
- no retroactive claim that existing repairs are APPLIED/CLOSED without an explicit receipt;
- no weakening of verifier or release gates.
