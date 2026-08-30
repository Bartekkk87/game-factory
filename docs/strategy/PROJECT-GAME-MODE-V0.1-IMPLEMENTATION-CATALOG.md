# Project Game Mode v0.1 — Implementation Catalog

Foundation baseline: `main` at `8fdbf2952321f08832a75ba376f28a05594002e3`.
Audited rejected Foundation head: `e8228a7ceca5462161d730880c5093c3c6349dc4` (historical PR #64; NO-GO).
Remediation PR #66: merged to `main` as `8ae9f9f1d0c47f7d9c6c082e9b24bcd007448d8b`.
PG-A0 implementation: PR #67 on `codex/project-game-mode-v0.1-pg-a0`.

## Implemented Foundation

| Component | File | Responsibility | Acceptance |
|---|---|---|---|
| Contract kernel | `factory/src/project/contracts.mjs` | Immutable Project Manifest and Development Task contracts, safe paths, reserved authority paths and contract SHAs | AC-PG-002, 003, 019 |
| Workspace | `factory/src/project/manifest.mjs` | Create/load persistent multi-file workspace and separate editable source/build output | AC-PG-002, 014 |
| File state | `factory/src/project/file-state.mjs` | Deterministic file/tree SHAs, symlink rejection and whole-tree diffs | AC-PG-006 |
| Patch contract | `factory/src/project/patch-contract.mjs` | Exact ADD/MODIFY/DELETE scope, protected paths, count bound and observed-diff equality | AC-PG-004, 005, 006 |
| Context builder | `factory/src/project/context-builder.mjs` | Bounded deterministic target/dependency/test/project-memory selection with evidence | AC-PG-008 |
| Project State | `factory/src/project/project-state.mjs` | Atomic local state file and verified capability/regression history | AC-PG-007, 009, 011 |
| Verification plan | `factory/src/project/verification-plan.mjs` | L1–L10 vocabulary, acceptance coverage, SHA-bound inherited regressions and derivation of verified records | AC-PG-010, 011, 019 |
| Verification runner | `factory/src/project/verification-runner.mjs` | Allowlisted direct-Node execution, persisted output, SHA revalidation and plan/check identity grading | AC-PG-010, 011, 017, 020 |
| Persistence | `factory/src/project/persistence-contract.mjs` | Versioned saves, slot/size/migration/corrupt behavior and save→reload→load equivalence | AC-PG-012, 013 |
| Content schemas | `factory/src/project/content-schema.mjs` | Versioned data records and deterministic validation | Data-driven content requirement |
| Transaction | `factory/src/project/transaction.mjs` | Exclusive project lock, derived transaction paths, identity-checked recovery, final candidate re-hash and verification-gated swap | AC-PG-017, 018, 020 |
| Web adapter | `factory/src/project/web-runtime-adapter.mjs` | Explicit Web contract and real browser boot/interaction/error proof | AC-PG-015, 016 |
| Deterministic tests | `factory/src/project/test-foundation.mjs` | Positive Foundation contract, scope, context, state, persistence and transaction tests | AC-PG-002–015, 017–020 |
| Remediation tests | `factory/src/project/test-remediation.mjs` | Executable negative regressions for fabricated PASS, evidence tampering, hostile journals, concurrency, semantic regression weakening, final candidate drift and missing state | AC-PG-003–006, 010, 011, 017–020 |
| Browser tests | `factory/src/project/test-browser-proof.mjs` | Visible playable fixture passes; blank iframe fixture fails | AC-PG-016 |

## Implemented PG-A0 task runner — PR #67

| Component | File | Responsibility | Evidence boundary |
|---|---|---|---|
| PG-A0 runner | `factory/src/project/runner.mjs` | Load exact Owner-approved task, build evidenced context, obtain scoped Engineer operations, execute the existing verified transaction, create task-only Git commit and non-draft PR | No implicit paid call; caller must inject the Engineer requester |
| Task-PR authority binding | `factory/src/project/git-task-pr.mjs` | Bind Project/Task contract, promoted baseline SHA-256, evidence SHA-256, base/head refs and Git SHAs; serialize/parse durable PR authority record and reject moved refs/heads | Persistent binding can be revalidated after process restart |
| Positive PG-A0 selftest | `factory/src/project/test-pg-a0.mjs` | Real temporary Git repository, deterministic zero-paid Engineer fixture, verified promotion, exact staged-file set and PR binding | Required architecture-finalization gate |
| PG-A0 adversarial selftest | `factory/src/project/test-pg-a0-negative.mjs` | Engineer workspace/index mutation, out-of-scope patch, PR head/base mismatch, failed PR creation after push, remote/local rollback and staged foreign-path rejection | Required architecture-finalization gate |

### PG-A0 trust-boundary rules

- Git branch/commit/PR write helpers are private to the runner; callers cannot supply a fabricated low-level Git context to a public publish function.
- The Engineer receives a deep-frozen cloned request and may return only operations plus model evidence. Any direct Git/index/worktree mutation before transaction preparation fails closed.
- Before Git commit, the runner re-derives the promoted editable tree, Project State and exact task evidence and compares them to the verified promotion.
- Only task-scope paths plus the exact promoted Project State and evidence artifact are staged.
- PR authority records include `projectId`, `taskId`, Task Contract SHA-256, promoted baseline tree SHA-256, evidence SHA-256, base/head refs and base/head Git SHAs.
- A moved PR head/base/ref invalidates the authority record.
- Failed execution restores the clean repository start state; if a task branch was pushed before PR creation failed, the remote branch is deleted best-effort and the local task branch is removed.
- `projects/` remains outside `runtime-state`.

## Existing modules changed

| File | Change | Governance effect |
|---|---|---|
| `factory/src/control/staged-commit-policy.mjs` | Adds `factory/src/project/` to protected runtime paths | Strengthens protection; runtime-state allowlists unchanged |
| `factory/src/control/style-gate.mjs` | Adds Project control modules including PG-A0 runner/binding to critical style checks | Strengthens quality gate |
| `factory/src/control/test-staged-commit-policy.mjs` | Verifies Project control protection | Regression coverage |
| `factory/src/control/test-architecture-finalization.mjs` | Runs deterministic Foundation, remediation and PG-A0 selftests | Uses an already-required workflow step; no workflow trust migration |
| `factory/src/verify/test-verifier.mjs` | Runs the real browser boot/blank-screen Project proof after Chromium installation | Adds regression without weakening Micro tests |
| `.github/CODEOWNERS` | Owner covers Project control and project sources | Strengthens human ownership |

## Owner Acceptance Criteria and evidence status

The original twenty Foundation criteria remain satisfied by the remediated implementation. Remediation PR #66 was merged only after exact-head CI/review. The PG-A0 runner adds the previously missing task-PR Git identity layer without changing those criteria or weakening the Micro pipeline.

The final pre-documentation PG-A0 falsification checkpoint was:

- exact head `e1cc7d3652fea37fb98115fd2f6ef6e3875bd0be`;
- Branch Verifier run `33301663951`: **SUCCESS**, all required steps;
- Trusted PR Selftest Gate run `33301664166`: **SUCCESS** on the same head;
- no Canary and no paid model/API run.

Because this catalog update moves the PR head, these run IDs are evidence for the implementation/negative-test checkpoint, not the final merge head. PR #67 still requires fresh exact-head Branch Verifier + Trusted Gate success after all documentation changes.

## Deliberately not implemented

- no implicit or autonomous paid Project LLM call;
- no Project Canary execution;
- no autonomous multi-task/multi-milestone queue;
- no real GitHub end-to-end task PR generated by the runner yet; the current runner selftest uses a real local Git repository and a deterministic mocked GitHub PR response;
- no browser persistence host bridge product integration;
- no Project Web build/publish adapter;
- no Project publisher/gallery integration;
- no change to current Micro build/repair/rebuild behavior;
- no Project Learning intake or global Learning promotion;
- no Godot adapter;
- no Issue #63 payload repair;
- no workflow modification or Required Check migration.

## Next implementation slices

1. Finalize PR #67: canonical documentation, Issue #62 and Notion checkpoint; then require fresh exact-head Branch Verifier + Trusted Gate, review and merge. Do not amend historical PR #64.
2. After #67 merge, prove **one real zero-paid scoped task PR end to end through the merged runner**, with exact durable task-contract/baseline/evidence/Git-head binding. This is not the Kepler Canary.
3. Web persistence host bridge: implement the validated `postMessage` protocol with schema/slot/size enforcement and browser reload proof.
4. Project Web build/publish adapter: reproducible build output plus deployed browser proof before review eligibility.
5. Only after the real task-PR proof and host bridge are reviewed/merged may Kepler Outpost M1–M2 begin under a separate explicit Owner authorization.

No slice may add `projects/` to `runtime-state`. Verified project changes use protected-main task PRs.
