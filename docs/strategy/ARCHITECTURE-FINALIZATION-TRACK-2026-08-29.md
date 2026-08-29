# Architecture Finalization Track — 29.08.2026

## Status

**IMPLEMENTING / NOT FINAL / NO CANARY AUTHORIZED**

This track exists to close the accepted Architecture Audit v2 findings before any further paid Product Canary or model-backed benchmark is considered.

The binding order is:

1. implement the repository-internal findings;
2. prove each new boundary with zero-paid deterministic regression evidence;
3. obtain an exact-head Full Verifier SUCCESS;
4. human-review and merge the protected-layer changes;
5. enable and verify repository-level protection for `main`;
6. run a final Architecture Audit v2 reconciliation;
7. only if that reconciliation has no Canary-blocking architecture finding, describe the architecture as **final and Canary-ready**;
8. still require a new explicit Owner GO before any paid Canary.

## Implemented in this track

### C-2 — structural learning capability separation

Automatic analysis imports only the Proposal Capability. Candidate validation, promotion, deactivation and Application Receipt closure live in a separate privileged lifecycle module. A compatibility facade exists for legacy callers, but automatic orchestration is regression-tested not to import it.

### D-2 — run-scoped budget and transactional Memory

The cost ledger is scoped with `AsyncLocalStorage`, so parallel async runs cannot overwrite one module-global budget state. Memory updates use a lock, re-read under the lock, atomic replace and entity-aware compatibility merge.

### D-1 — binary evidence retention

Binary screenshots/media are not durable Git state. Production and Review create SHA-bound manifests, upload binary evidence to GitHub Actions Artifact object storage with explicit bounded retention, purge the binary files, and only then stage runtime Git state. The staged-state policy independently rejects binary evidence.

### B-4 — S5 sampling and uncertainty

S5 configurations pin operation-level sampling parameters. Trace attribution includes the exact sampling contract. Aggregate results expose variance/standard deviation and 95% uncertainty intervals rather than relying on mean/pass-rate values alone.

### E-3 — generated-code browser isolation

Owner-preview/published game payloads are wrapped in a sandboxed `srcdoc` iframe with scripts enabled but `allow-same-origin` absent. Generated code therefore executes in an opaque browser origin. The host binds the verified candidate SHA. This is runtime origin separation, not a claim of a separate DNS domain.

### E-4 — typed proof duration

Proof timing no longer parses prose with a regex. Only `probePlan.roundSeconds` has timing authority. Missing timing uses a safe maximum observation window; invalid typed timing fails validation.

### F-4 — typed, bounded lower-authority Lessons

Only validated, active, prompt-targeted Lessons with promotion provenance may enter Production prompts. Production Lesson data is typed, directive length/count bounded and serialized below a fixed authority boundary. Free-form/unproven Memory remains inactive.

### F-1 — critical-module style gate

A deterministic style gate covers the critical control/evaluation/learning/isolation modules and is part of Full Verifier. It is deliberately narrower than a repository-wide formatter rollout.

### F-2 — strategy status/supersedes chain

`docs/strategy/STATUS-CHAIN.json` and `docs/strategy/INDEX.md` make strategy-document authority and supersession explicit. Unlisted dated snapshots are historical/non-authoritative by default.

### F-3 — explicit repository license state

The repository records the current restrictive default as **NO LICENSE GRANTED / All rights reserved**. No open-source license has been invented or selected on the Owner's behalf.

## Already implemented in earlier Audit v2 hardening

The prior hardening track covers A-3, A-4, B-1/B-2/B-3, C-1/C-4/C-5, D-3, E-1/E-2 and the code-side C-3 runtime-state split. A-1/A-2 are handled by the separate independent Corpus / historical-regression track.

## External boundary still required

Repository code cannot truthfully replace GitHub repository administration. `main` still requires repository-level branch protection/ruleset enforcement with the required verifier and blocked direct protected-layer pushes. This remains a pre-Canary condition.

## Proof boundary

Nothing in this document authorizes:

- a Product Canary;
- a model-backed S5 benchmark;
- automatic model/prompt/skill promotion;
- self-authorizing protected-layer changes;
- a claim that the architecture is final before exact-head verification, human merge and repository-level protection are complete.
