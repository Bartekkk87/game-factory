# Project Game Mode v0.1 — Implementation Catalog

Baseline: `main` at `8fdbf2952321f08832a75ba376f28a05594002e3`.

## Implemented Foundation

| Component | File | Responsibility | Acceptance |
|---|---|---|---|
| Contract kernel | `factory/src/project/contracts.mjs` | Immutable Project Manifest and Development Task contracts, safe paths, reserved authority paths and contract SHAs | AC-PG-002, 003, 019 |
| Workspace | `factory/src/project/manifest.mjs` | Create/load persistent multi-file workspace and separate editable source/build output | AC-PG-002, 014 |
| File state | `factory/src/project/file-state.mjs` | Deterministic file/tree SHAs, symlink rejection and whole-tree diffs | AC-PG-006 |
| Patch contract | `factory/src/project/patch-contract.mjs` | Exact ADD/MODIFY/DELETE scope, protected paths, count bound and observed-diff equality | AC-PG-004, 005, 006 |
| Context builder | `factory/src/project/context-builder.mjs` | Bounded deterministic target/dependency/test/project-memory selection with evidence | AC-PG-008 |
| Project State | `factory/src/project/project-state.mjs` | Atomic local state file and verified capability/regression history | AC-PG-007, 009, 011 |
| Verification plan | `factory/src/project/verification-plan.mjs` | L1–L10 vocabulary, task checks, acceptance coverage, inherited regressions, protected fixtures and independent results | AC-PG-010, 011, 019 |
| Persistence | `factory/src/project/persistence-contract.mjs` | Versioned saves, slot/size/migration/corrupt behavior and save→reload→load equivalence | AC-PG-012, 013 |
| Content schemas | `factory/src/project/content-schema.mjs` | Versioned data records and deterministic validation | Data-driven content requirement |
| Transaction | `factory/src/project/transaction.mjs` | Staging, verification-gated state/evidence, atomic swap journal, abort and crash recovery | AC-PG-017, 018, 020 |
| Web adapter | `factory/src/project/web-runtime-adapter.mjs` | Explicit Web contract and real browser boot/interaction/error proof | AC-PG-015, 016 |
| Deterministic tests | `factory/src/project/test-foundation.mjs` | Positive and adversarial Foundation tests | AC-PG-002–015, 017–020 |
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

1. PG-A0 task runner: load an Owner-approved task, build evidenced context, request a scoped Engineer patch, execute checks, then create a non-draft task PR.
2. Web persistence host: implement the validated `postMessage` protocol with schema/slot/size enforcement and browser reload proof.
3. Project Web build/publish adapter: reproducible build output plus deployed browser proof before review eligibility.
4. Canary M1–M2 only after the above runner is independently reviewed and merged.

No slice may add `projects/` to `runtime-state`. Verified project changes use protected-main task PRs.
