# Project Game Mode v0.1 — Remediation Handoff

## Current checkpoint

- Source `main`: `8fdbf2952321f08832a75ba376f28a05594002e3`.
- Audited, rejected Foundation head: `e8228a7ceca5462161d730880c5093c3c6349dc4` (PR #64; remains NO-GO and must not be amended).
- Remediation branch: `codex/project-game-mode-v0.1-remediation`.
- Remediation implements the verification trust root, safe recovery, transaction locking and immutable regression semantics requested by the audit.
- Existing Micro Game production code, budget/release authority, LLM routing and Learning governance are unchanged.
- No paid model/API run was made. No Project Canary was started. Issue #63 remains separate.

## Implemented remediation

1. The control plane executes allowlisted direct-Node checks and grades newly re-hashed persisted evidence. Caller-declared results/capabilities/regressions are rejected.
2. Recovery journals contain identity only. Staging/backup paths are derived from a validated transaction ID and bound to project/manifest/tree SHAs.
3. An exclusive per-project lock covers preparation through commit/abort and recovery.
4. Inherited regression definitions are SHA-bound; reuse of an ID with changed semantics fails closed.
5. Candidate source is re-hashed after verification immediately before swap.
6. Missing Project State and unknown Manifest/Task fields fail closed.
7. Every above correction is covered by executable negative regression tests in the required architecture-finalization gate.

## Evidence before push

- syntax, diff and critical style gates: PASS;
- Project Foundation selftest: PASS;
- Project remediation adversarial selftest: PASS;
- architecture-finalization selftest: PASS;
- 30/30 browser-free existing workflow suites: PASS;
- browser suites: not locally runnable because the Playwright Chromium download endpoint timed out; exact-head GitHub CI is required;
- no historical evidence was changed and no fake PASS fixture was added.

## Required next actions

1. Push reviewable commits to the remediation branch and open a new PR against current `main`.
2. Require both branch verifier and Trusted Gate success on the exact PR head.
3. Review the transaction trust boundary and confirm the negative tests fail against `e8228a7` and pass on the remediation head.
4. Update Issue #62 and the canonical Notion page with exact head SHA, PR and workflow evidence.
5. Merge only the remediation PR after review. Leave PR #64 and its historical evidence untouched.
6. Only after merge, implement the zero-paid PG-A0 runner with task-PR Git-head binding. Do not start the Canary yet.

## Canary handoff after PG-A0 runner approval

Project: **Kepler Outpost**.

Start with M1 only:

- real multi-file Web shell;
- small grid world;
- explicit Web Runtime Adapter contract;
- host/opaque-child boundary;
- deterministic ready/root/visible/interaction browser proof;
- source/build separation;
- no economy beyond one static resource display.

Then M2:

- deterministic resource tick;
- conservation invariant;
- one unit test, one integration test and inherited M1 browser regression;
- no save system yet.

M8 remains the save/load milestone, but the persistence host bridge should be implemented and validated before autonomous progression beyond early milestones.

## Stop conditions

Stop if protected main would need a bypass, `runtime-state` would become project-code authority, scope is not exact, verification and baseline promotion cannot be separated, workflow trust must be migrated without an explicit plan, or any paid run lacks a new Owner GO.
