# Architecture Audit v2 — A-1 / A-2 Closure — 29.08.2026

## Scope

This change is architecture hardening only. It performs no paid Product run, no model-backed benchmark and no Production model change.

## A-1 — Corpus independent observations

The old S2 execution model deduplicated 29 registered cases down to 8 shared selftest scripts. Case bookkeeping therefore exceeded independent observation granularity.

The v2 execution contract removes that ambiguity:

- every active Corpus case is addressed by its own case ID;
- `run-corpus-case.mjs --case <case-id>` starts exactly one focused oracle process;
- oracle implementations accept `--case` and execute only the assertion bound to that case;
- S2 starts one case-runner process for every active case instead of deduplicating shared source files;
- `independentObservationCount` is explicit;
- `observationDeficit = totalCases - independentObservationCount`;
- any observation deficit is a Corpus regression and fails closed.

Current contract:

- active cases: **34**;
- independent case observations required: **34**;
- shared oracle implementation files: **9**;
- model-backed cases: **0**;
- API calls: **0**;
- USD cost: **0**.

Sharing an oracle source file does not merge observations: each case executes in a separate Node process with its own `--case` assertion.

## A-2 — Production-derived historical regressions

Five real Production-derived failures are now explicit Tier-2 `historical-regression` Corpus cases rather than implicit history:

1. Harbor Repair Regression — origin run `20260827-203110`, fix `9e07c632bf12b8d117e41c176e200e4e5d15fdd9` / PR #18;
2. Harbor Proof-Plan Unreachability — origin run `20260827-210323`, fix `11a02908b43805dd0e07ccfe7342262b2a6e0349` / PR #19;
3. Lumen Director State Contract — origin run `20260828-201007`, fix `7af126e3300b23c19bd088ca32c08c7e81947d8b` / PR #36;
4. Provider Request Contract / max completion token parameter — origin run `20260827-111826`;
5. Provider Request Contract / unsupported temperature — origin run `20260827-113631`.

The provider regressions are replayed zero-paid by inspecting the generated request body. They do not call a provider and therefore do not invent new compatibility evidence.

The Lumen regression remains bound to the immutable historical fixture and does not depend on a mutable `runs/` directory.

## Frozen-history policy

The original S0 registry and S1 variant manifest remain unchanged. A-1/A-2 add two new pinned contract files:

- `evaluation/corpus/historical-regressions.json`;
- `evaluation/corpus/case-oracles.json`.

The new S2-v2 baseline pins the Git blob SHA of the original registry, original S1 manifest, historical-regression registry and case-oracle manifest. This avoids rewriting historical S0/S1 closure artifacts while making the current evaluation contract explicit.

## Verification

Branch: `audit-v2-a1-a2-20260829`.

Initial executable head `607799e0de9fb7c74b727390305add3202c52aa0` ran Full Verifier `33219316057`.

The critical S2 step completed **SUCCESS** after executing the 34 individual case oracles. The same run also passed the S0/S1/S2 contract tests, S3/S4/S5, action reachability, terminal proof and HUD checks before documentation finalization.

A new exact-head Full Verifier is required after the documentation commits and before merge.

## Remaining Architecture Audit work

A-1 and A-2 are closed by this change once exact-head verification and human merge complete. Architecture is **not yet declared final**. Remaining accepted tracks include:

- C-2 structural learning privilege separation;
- D-2 run-scoped budget + concurrency-safe/append-only Memory;
- D-1 durable binary Evidence storage;
- B-4 S5 sampling / variance / confidence;
- E-3 separate origin for generated code;
- E-4 typed proof duration;
- F-4 typed/bounded Lesson contract;
- F-1 formatter/linter rollout;
- F-2 canonical strategy status/supersedes chain;
- F-3 LICENSE/legal choice;
- C-3 repository-admin protection as a final external enforcement gate.

No Canary is authorized by this closure document. The architecture is finalized first; only after an explicit final architecture audit may a new Canary be proposed to the Owner.
