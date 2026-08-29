# Project Game Mode v0.1 — Handoff

## Current checkpoint

- Source baseline analyzed: `main` `8fdbf2952321f08832a75ba376f28a05594002e3`.
- Project Game Foundation is implemented on branch `codex/project-game-mode-v0.1-foundation`.
- Existing Micro Game pipeline is unchanged.
- No paid model/API run was made.
- No Project Canary, EXODUS, Helios or Space Colonia implementation was started.
- Issue #63 remains a separate delivery bug.

## Continue from GitHub truth

1. Re-read current `main`, Issue #62, Issue #63 and this PR before changing anything.
2. Confirm branch/trusted `selftest` on the exact PR head.
3. Review the transaction, reserved-path and regression-inheritance logic independently.
4. Do not merge if the blank-screen negative fixture passes or any existing Micro regression fails.

## Next bounded task: PG-A0 Runner

Build a zero-paid deterministic runner around the existing Foundation. It must:

- load one Owner-approved Project Manifest and Development Task;
- persist the immutable task before Engineer execution;
- call the existing budget/router stack only after an explicit Owner budget authorization;
- give Engineer only the context-builder output;
- accept only the typed patch-operation JSON contract;
- verify in staging;
- promote the baseline only after all required checks PASS;
- create a task branch/PR, never push Project source to `runtime-state` or `main`;
- attach evidence containing task/model/operation/context/files/SHAs/tests/result/baselines;
- stop after one task.

Do not add a new agent. Do not build the Canary in the runner PR.

## Canary handoff after runner approval

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
