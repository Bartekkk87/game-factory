# Project Game Mode v0.1 — Implementation Catalog

Baseline: `main` at `8fdbf2952321f08832a75ba376f28a05594002e3`.
Remediation base: audited Foundation head `e8228a7ceca5462161d730880c5093c3c6349dc4`.

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

## Existing modules changed

| File | Change | Governance effect |
|---|---|---|
| `factory/src/control/staged-commit-policy.mjs` | Adds `factory/src/project/` to protected runtime paths | Strengthens protection; runtime-state allowlists unchanged |
| `factory/src/control/style-gate.mjs` | Adds Project control modules to critical style checks | Strengthens quality gate |
| `factory/src/control/test-staged-commit-policy.mjs` | Verifies Project control protection | Regression coverage |
| `factory/src/control/test-architecture-finalization.mjs` | Runs deterministic Project Foundation selftest | Uses an already-required workflow step; no workflow trust migration |
| `factory/src/verify/test-verifier.mjs` | Runs the real browser boot/blank-screen Project proof after Chromium installation | Adds regression without weakening Micro tests |
| `.github/CODEOWNERS` | Owner covers Project control and project sources | Strengthens human ownership |

## Owner Acceptance Criteria and evidence status

These definitions are copied from the Owner assignment and are authoritative. `LOCAL PASS` means the deterministic test ran in the remediation worktree. It is not a merge decision. Browser and complete Micro-Game status remain `CI REQUIRED` until checks pass on the exact pushed head.

| ID | Authoritative requirement | Status on remediation worktree | Primary evidence |
|---|---|---|---|
| AC-PG-001 | Existing Micro-Game pipeline remains green | CI REQUIRED | 30/30 browser-free existing suites pass locally; exact-head browser/Golden Corpus workflow pending |
| AC-PG-002 | Project Manifest can be deterministically created, validated and loaded | LOCAL PASS | `test-foundation.mjs`; strict unknown-field rejection in `test-remediation.mjs` |
| AC-PG-003 | Development Task has immutable Task ID, scope and Acceptance Mapping | LOCAL PASS | contract hash/shape and mapping tests |
| AC-PG-004 | Task can change only allowed project files | LOCAL PASS | patch scope positive/negative tests |
| AC-PG-005 | Scope escape fails closed | LOCAL PASS | undeclared/protected mutation tests |
| AC-PG-006 | Before/after file state is SHA-evidenced | LOCAL PASS | patch/tree evidence assertions |
| AC-PG-007 | Project State reloads after process restart | LOCAL PASS | durable state reload test; missing state now fails closed |
| AC-PG-008 | Context is bounded/relevant and selection is documented | LOCAL PASS | bounded context and selection-SHA tests |
| AC-PG-009 | Project Memory is separate from global Factory Learning | LOCAL PASS | project-local paths/state; global Learning modules unchanged |
| AC-PG-010 | Unit, Integration and Regression verification map to a task | LOCAL PASS | required L2/L4/L5 plan plus direct runner execution |
| AC-PG-011 | Earlier verified capability is a later regression requirement | LOCAL PASS | inherited L5 definition SHA and semantic-redefinition rejection |
| AC-PG-012 | Persistence Contract supports versioned Save Schema | LOCAL PASS | persistence contract tests |
| AC-PG-013 | Save→reload→load verification scenario exists architecturally/in tests | LOCAL PASS | deterministic equivalence/reload test skeleton |
| AC-PG-014 | Editable Source and Build Output are separate | LOCAL PASS | manifest/layout and build-scope rejection tests |
| AC-PG-015 | Web Runtime Adapter is explicit | LOCAL PASS | adapter contract tests |
| AC-PG-016 | Browser Boot Proof detects a blank-screen-like failure | CI REQUIRED | positive/blank Playwright fixtures exist; exact-head Chromium run pending |
| AC-PG-017 | Interrupted/failed task cannot promote a half-verified baseline | LOCAL PASS | failing check, final candidate drift, crash recovery tests |
| AC-PG-018 | Rollback to last verified baseline is defined | LOCAL PASS | identity-checked journal recovery and concurrency tests |
| AC-PG-019 | Task cannot alter Acceptance Criteria or Project Contract | LOCAL PASS | reserved authority paths, hashes and exact-shape validation |
| AC-PG-020 | Audit Evidence explains task/model/operation/context/files/SHAs/tests/result/baselines | LOCAL PASS | transaction evidence assertions; caller-supplied records rejected |

Final Foundation PASS requires AC-PG-001 and AC-PG-016 to become PASS on the exact remediation PR head, with all other checks remaining green.

## Deliberately not implemented

- no Project LLM orchestration or paid call;
- no full Project Canary;
- no automatic task branch, commit or PR creation;
- no Project publisher or gallery integration;
- no change to current Micro build/repair/rebuild behavior;
- no Project Learning intake or global Learning promotion;
- no Godot adapter;
- no Issue #63 payload repair;
- no workflow modification or Required Check migration.

## Next implementation slices

1. Merge the remediation only after exact-head CI and review; do not merge or amend PR #64.
2. PG-A0 task runner: load an Owner-approved task, build evidenced context, request a scoped Engineer patch, bind the promoted baseline to the task-PR Git head, then create a non-draft task PR.
3. Web persistence host: implement the validated `postMessage` protocol with schema/slot/size enforcement and browser reload proof.
4. Project Web build/publish adapter: reproducible build output plus deployed browser proof before review eligibility.
5. Canary M1–M2 only after the runner and host bridge are reviewed and merged.

No slice may add `projects/` to `runtime-state`. Verified project changes use protected-main task PRs.
