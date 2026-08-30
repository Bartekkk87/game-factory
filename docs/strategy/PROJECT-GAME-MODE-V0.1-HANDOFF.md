# Project Game Mode v0.1 — PG-A0 Handoff

## Durable checkpoint

- Historical rejected Foundation: PR #64 at `e8228a7ceca5462161d730880c5093c3c6349dc4`; remains NO-GO and must not be amended.
- Foundation remediation: PR #66 merged to `main` as `8ae9f9f1d0c47f7d9c6c082e9b24bcd007448d8b`.
- PG-A0 implementation branch: `codex/project-game-mode-v0.1-pg-a0`.
- PG-A0 integration PR: #67, `feat(project): add zero-paid PG-A0 task runner`.
- PG-A0 implements one-task deterministic execution plus exact Git/task-PR authority binding.
- Exact final PR review/merge SHA and workflow run IDs are recorded externally in Issue #62 and the canonical Notion progress page because those values do not exist until after the repository document commit is created.
- Existing Micro Game production code, budget/release authority, LLM routing and global Learning governance remain unchanged.
- No Project Canary was started. No paid Project model/API run was made. Issue #63 remains separate.

## Implemented PG-A0

1. Load one Owner-selected immutable Development Task and require its exact Task Contract SHA-256.
2. Build the existing deterministic bounded Project context and preserve selection evidence.
3. Require an explicit Engineer patch requester; no implicit provider/model call exists.
4. Require the Engineer to return scoped operations plus model evidence only.
5. Reject direct Engineer mutation of Git branch/head/index/worktree before transaction execution.
6. Promote only through the existing remediation-hardened Project transaction and verification runner.
7. Revalidate promoted editable tree, Project State and exact evidence immediately before Git staging.
8. Stage only the verified task-scope changes plus exact promoted Project State/evidence.
9. Create a task-only Git commit and non-draft task PR.
10. Persist `project-game.task-pr-binding/v1` in the PR body with Project/Task identity, Task Contract SHA-256, baseline tree SHA-256, evidence SHA-256, base/head refs and exact Git SHAs.
11. Reparse and revalidate the durable authority record against the current PR; moved base/head/ref fails closed.
12. Roll back local branch/commit/worktree on failure; if a branch was pushed before PR creation failed, attempt remote branch deletion.
13. If remote cleanup itself fails, complete the local rollback but expose both the original execution failure and the remote-cleanup failure together; never silently report cleanup success.

## Adversarial evidence

PG-A0 negative coverage is mandatory through `factory/src/project/test-pg-a0-negative.mjs` and the existing architecture-finalization gate. It proves at least:

- direct Engineer workspace mutation is rejected and rolled back;
- staged foreign paths are rejected;
- returned out-of-scope operations are rejected;
- wrong GitHub PR head is rejected;
- wrong GitHub PR base head is rejected;
- failed PR creation after a real push to a local bare remote restores local state and removes the remote task branch;
- failed remote branch deletion is surfaced as an explicit rollback-cleanup failure while local rollback still completes;
- a moved PR head invalidates the durable authority record;
- low-level task Git publication helpers are not exported as caller-controlled APIs.

Falsification found and fixed two additional defects during PG-A0 hardening:

1. rollback previously cleaned new untracked files only below the Project subtree; because PG-A0 requires a clean repository at entry, rollback now restores the repository-wide clean start state;
2. remote task-branch deletion failure was previously ignored; cleanup failure is now explicit and cannot be mistaken for a clean rollback.

## Immutable implementation/falsification checkpoint

The pre-documentation implementation/falsification checkpoint was:

`e1cc7d3652fea37fb98115fd2f6ef6e3875bd0be`

- Branch Verifier run `33301663951`: **SUCCESS**, including the mandatory Foundation/remediation/PG-A0 positive and negative tests plus all existing Factory suites.
- Trusted PR Selftest Gate run `33301664166`: **SUCCESS** on the exact same head.
- No Canary.
- No paid Project model/API run.

Later documentation/review hardening necessarily moved PR #67 beyond this SHA. Therefore these run IDs remain immutable evidence for that implementation checkpoint but are not the final merge evidence. Final exact-head review/merge evidence belongs in Issue #62 and the canonical Notion progress page.

## PR #67 merge gate

Before PR #67 can be treated as integrated, all of the following must be true on one exact final head:

1. canonical Architecture, Implementation Catalog, Falsification and this Handoff are internally consistent;
2. Branch Verifier = SUCCESS;
3. Trusted PR Selftest Gate = SUCCESS on the same candidate head;
4. complete PR diff review has no open P0/P1 finding and no unresolved review thread;
5. merge uses the reviewed exact expected head SHA;
6. protected `main` is verified again after merge.

The authoritative completion record for this gate is external to this file: GitHub Issue #62 plus the canonical Notion progress page.

## Active next actions after the merge gate closes

1. Verify the resulting `main` merge commit with the post-merge Branch Verifier.
2. Prove **one real zero-paid scoped task PR end to end through the merged PG-A0 runner**. This proof is deliberately not the Kepler Outpost Canary.
3. Revalidate the real task PR's durable authority record against its actual GitHub base/head refs and SHAs and record evidence.
4. Only after that real task-PR proof, implement and validate the Web persistence host bridge with schema/slot/size enforcement and browser save→reload→load equivalence.
5. Review/merge the persistence bridge through protected main and verify main again.
6. Only after those gates pass may a separate Owner authorization start Kepler Outpost M1–M2.

## What is deliberately still not proven

- until the active next-action proof is complete, no real GitHub task PR has been generated end to end by the merged runner; current selftests use real local Git and deterministic mocked GitHub PR responses, plus a real local bare remote for push/rollback testing;
- no autonomous multi-task or multi-milestone queue;
- no Project repair loop PG-A1;
- no browser persistence host product bridge;
- no Project Web build/publish adapter;
- no Kepler Outpost execution;
- no Project-specific paid model routing change.

## Canary handoff after the remaining gates

Project: **Kepler Outpost**.

Start with M1 only after separate Owner authorization:

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

The persistence host bridge is infrastructure to validate before Canary progression; it does not authorize the Canary by itself.

## Stop conditions

Stop if protected main would need a bypass, `runtime-state` would become project-code authority, task scope is not exact, an Engineer can bypass the returned-operation contract, verification and Git publication cannot be bound, a moving task PR can retain stale PASS authority, rollback cleanup failure can be hidden, workflow trust must be migrated without an explicit plan, or any paid run lacks a new Owner GO.
