# Architecture Audit v2 — Hardening Implementation

## Status — 29.08.2026

This document is the current implementation ledger for the revised Architecture Audit v2. All work remains architecture hardening only unless a separate Owner decision explicitly authorizes a Product or model-backed run.

No Canary is authorized by this document. The Owner decision is: **finalize the architecture first; only then consider a new Canary.**

## Merged pre-Canary hardening — PR #37

PR #37 merged to `main` as `3740483a9b95c14689f249761d86f3c92c417724`. Exact-main Full Verifier `33217538397` completed SUCCESS.

Implemented there:

- **C-3/C-5 code-side:** authoritative `main` separated from non-authoritative `runtime-state`; Production/Review no longer push runtime evidence to `main`; staged allow-lists, secret scan and runtime-state history/tree guards added.
- **C-1:** prompt promotion bound to Candidate artifact SHA, PR ref and merged commit containing exactly that artifact.
- **B-1/B-2:** declarative per-model request contracts plus zero-paid request-contract tests.
- **A-3:** binding Release = Technical PASS + Product Fidelity PASS + Budget PASS; Experience is advisory.
- **E-1:** bounded Director semantic repair on deterministic validation errors.
- **A-2b:** immutable Lumen Director-state historical regression; no conditional dependency on a mutable `runs/` directory.
- **C-4:** direct active-Lesson write bypass removed.
- **A-4:** screenshot-pixel flat-frame/content evidence replaces guessed source background parsing.
- **B-3:** only definitely pre-delivery transport failures may release a reservation and retry; uncertain delivery remains fail-closed.
- **D-3:** zero-valued operational limits use explicit typed semantics.
- **E-2/E-3 immediate:** generated script/style terminator isolation and restrictive CSP.
- **F-3 partial:** `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`; LICENSE remains a separate Owner/legal decision.

Repository-level C-3 protection remains an external GitHub-admin enforcement boundary. The available connector can read but cannot create rulesets/branch protection. It is intentionally deferred as a final gate rather than blocking architecture work the assistant can complete itself.

## A-1 / A-2 — independent Corpus observations + historical regressions

Branch: `audit-v2-a1-a2-20260829`.

Detailed closure evidence: `docs/strategy/ARCHITECTURE-AUDIT-V2-A1-A2-CLOSURE-2026-08-29.md`.

### A-1 — closed in implementation pending merge

The previous S2 architecture had 29 registered cases but deduplicated them to 8 shared selftest executions. That state is no longer the current design.

The v2 execution contract now requires:

- one addressable `--case <case-id>` execution per active Corpus case;
- one focused case assertion per observation;
- one Node process per case from the S2 runner;
- explicit `independentObservationCount`;
- explicit `observationDeficit`;
- fail-closed regression whenever `observationDeficit > 0`.

Current contract:

- **34 active cases**;
- **34 required independent case observations**;
- **9 shared oracle implementation files**;
- **0 model-backed cases / 0 API calls / $0 cost**.

Shared source files do not collapse observation count because each case is independently invoked and can independently fail.

### A-2 — closed in implementation pending merge

Five real Production-derived failures are now explicit Tier-2 `historical-regression` Corpus cases with origin-run and fix-commit provenance:

1. Harbor Repair Regression — run `20260827-203110`, fix `9e07c632bf12b8d117e41c176e200e4e5d15fdd9` / PR #18;
2. Harbor Proof-Plan Unreachability — run `20260827-210323`, fix `11a02908b43805dd0e07ccfe7342262b2a6e0349` / PR #19;
3. Lumen Director State Contract — run `20260828-201007`, fix `7af126e3300b23c19bd088ca32c08c7e81947d8b` / PR #36;
4. Provider request token-parameter failure — run `20260827-111826`;
5. Provider unsupported-temperature failure — run `20260827-113631`.

The two provider cases replay only request construction; they make no provider call and therefore do not invent new provider-compatibility evidence.

The original S0 registry and S1 variant manifest remain untouched. New A-1/A-2 contract files are pinned separately in the S2-v2 baseline, avoiding a rewrite of historical closure artifacts.

Initial executable-head Full Verifier `33219316057` proved the new 34-case S2 evaluation step SUCCESS. A fresh exact-head Full Verifier is required after final documentation and before merge.

## Remaining accepted architecture tracks

These remain open and are to be worked before any Canary proposal:

- **C-2 — structural privilege separation:** automatic proposal/read code must not import validation/promotion/deactivation capability.
- **D-2 — concurrent state model:** replace module-global Budget state with run-scoped ledger instances; make Memory updates append-only or transactionally concurrency-safe.
- **D-1 — durable binary Evidence:** keep screenshots/binary proof from growing ordinary Git history indefinitely; bind durable external/LFS evidence by SHA and retention contract.
- **B-4 — S5 statistics:** pin sampling parameters and report trial count plus variance/confidence before interpreting model-backed differences.
- **E-3 — separate generated-code origin:** CSP is immediate defense, not equivalent to origin isolation.
- **E-4 — typed proof duration:** remove semantic dependence on prose regex inference.
- **F-4 — typed bounded Lessons:** immutable authority hierarchy above Lessons and bounded typed prompt injection contract.
- **F-1 — maintainability:** formatter/linter coverage on critical modules without behavioral change.
- **F-2 — strategy status chain:** canonical current/superseded index across GitHub with mirrored Notion status.
- **F-3 — LICENSE:** explicit Owner/legal choice; not silently invented.
- **C-3 repository enforcement:** final GitHub-admin gate once architecture work is otherwise complete.

## Proof boundary

Current claims must remain bounded:

- the Factory is an **evidence-driven controlled-improvement system**, not a self-authorizing self-modifying system;
- protected-layer application remains human-reviewed;
- Release remains deterministic/governed;
- A-1/A-2 now support 34 independent zero-paid Corpus observations and five explicit historical Production regressions once merged;
- no real model-backed S5 benchmark winner exists;
- unverified provider contracts are not claimed compatible;
- CSP is not claimed equivalent to separate-origin isolation;
- architecture is **not final yet** while the remaining accepted tracks above are open;
- no further paid Product Canary is authorized before a final architecture audit and fresh explicit Owner GO.
