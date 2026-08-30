# Project Game Mode v0.1 — Architecture

Status: **Foundation remediation is merged to `main` via PR #66. PG-A0 zero-paid one-task runner and durable task-PR Git binding are implemented in PR #67 and are awaiting final documentation-head CI/review. No Project Canary and no paid Project model/API run are authorized.**

Foundation baseline analyzed: `main` at `8fdbf2952321f08832a75ba376f28a05594002e3`.
Audited rejected Foundation head: `e8228a7ceca5462161d730880c5093c3c6349dc4` from historical PR #64.
Merged remediation base for PG-A0: `8ae9f9f1d0c47f7d9c6c082e9b24bcd007448d8b`.

## Audit-driven correction

The first Foundation implementation was not safe to merge. Independent audit evidence proved four material defects: callers could declare verification PASS, recovery trusted journal-supplied paths, concurrent tasks had no project lock, and a later task could weaken an inherited regression while retaining its ID. The remediation made these boundaries executable control-plane responsibilities:

- the transaction invokes an allowlisted direct-Node verification runner itself and re-hashes persisted check evidence before grading;
- callers cannot supply verification results, capabilities or regressions to baseline promotion;
- transaction paths are derived from a validated transaction ID, never read from a journal;
- an exclusive per-project lock covers prepare through commit/abort, including recovery;
- inherited regression definitions are SHA-bound and semantic redefinition fails closed;
- the candidate tree is re-hashed after verification and immediately before swap;
- missing or invalid Project State aborts instead of creating a replacement baseline;
- persisted Manifest and Task contracts reject unknown fields.

These fixes have executable negative regressions in `factory/src/project/test-remediation.mjs`. PR #64 remains historical NO-GO; remediation PR #66 was reviewed independently and merged.

## PG-A0 correction and execution boundary

The Foundation deliberately stopped before Git/PR orchestration. PR #67 adds only the bounded PG-A0 layer needed to execute one Owner-approved Development Task without creating a new agent or an implicit paid call.

`runPgA0Task()` now owns the execution sequence:

`exact Owner task SHA -> evidenced context -> scoped Engineer operations -> verified transaction -> promoted baseline revalidation -> exact task commit -> durable task-PR authority record`

The important trust rules are:

- low-level task branch/commit/PR write helpers are private to the runner rather than caller-controlled public APIs;
- the Engineer requester is explicit and receives a deep-frozen cloned request; no model/provider call is implicit;
- after the Engineer returns, current branch, Git head, index and worktree must still equal the clean PG-A0 start state;
- the existing Project transaction remains the only baseline promotion mechanism;
- immediately before Git staging, the runner re-captures the promoted editable tree, Project State and exact evidence artifact and requires them to equal the verified promotion;
- the task commit stages only the verified task-scope paths plus the exact promoted Project State and task evidence;
- the task PR carries a durable machine-readable authority record binding Project ID, Task ID, Task Contract SHA-256, promoted baseline tree SHA-256, verification evidence SHA-256, base/head refs and exact Git SHAs;
- a moved base/head/ref invalidates the binding;
- failure rolls back the local task branch/commit and restores the clean repository start state; if the task branch was already pushed before PR creation failed, remote deletion is attempted as part of rollback;
- `projects/` is never added to `runtime-state`.

The adversarial tests live in `factory/src/project/test-pg-a0-negative.mjs` and run through the already-required architecture-finalization gate.

## Decision

Project Game Mode is an additional execution layer beside the existing Micro Game pipeline. It does not replace `produceGame()`, the single-HTML Micro Engine, current release authority, budget control, learning governance, or the `runtime-state` split.

The scale mechanism is:

`immutable project/task contracts -> bounded context -> deterministic file operations in staging -> hierarchical verification -> atomic verified-baseline promotion -> exact task Git commit -> durable task-PR authority binding`

Project source is authoritative only when it reaches Git through the protected-main PR path. `runtime-state` remains non-authoritative run/evidence state and must not become a second source of project code truth.

## Current-state findings

- `factory/src/pipeline/run.mjs` remains a proven Micro Game lifecycle that expects one generated `{title, css, html, js}` object and may use a governed fresh rebuild. It is not reused as the Project task runner.
- `roles/engineer.mjs` still serves the Micro path. PG-A0 instead accepts an explicit scoped Engineer requester that must return file operations; a later production adapter can connect the governed Engineer role without changing task authority.
- Current verification is strong for the Micro Engine and the Project Foundation adds independent task-level checks and browser proof beside it.
- `memory/store.mjs` remains global Factory/Product memory. Project-local decisions remain in the project workspace/state.
- `runtime-state` permits only run, draft, product, archive, memory, learning and evaluation paths. This remains unchanged.
- Issue #63 proves that artifact SHA, verifier PASS and Pages deployment do not establish Owner-visible boot. Browser delivery remains its own deterministic verification level.
- PG-A0 now solves the previously explicit promoted-baseline-to-task-PR identity gap, but a real GitHub task PR generated through the merged runner has not yet been proven end to end.

## Target layers

```text
Existing Factory control plane
Owner authority | budget | release | learning | evidence
                    |
Project execution layer
Manifest | Task | Context | Patch | Transaction | Project State | PG-A0 Runner
                    |
Git/PR authority layer
Task commit | durable Task/Baseline/Evidence/Head binding
                    |
Runtime adapter contract
                    |
Web v0.1
Browser boot | gameplay interaction | host persistence bridge
```

No new LLM agent is introduced. Director owns decomposition into milestones/tasks; Engineer supplies scoped operations; Playtester and Auditor keep their current responsibilities. Deterministic Project components enforce the boundary.

## KEEP / EXTEND / NEW / DO NOT TOUCH

| Classification | Module | Decision |
|---|---|---|
| KEEP | `factory/src/pipeline/run.mjs` | Existing Micro Game path remains the default Micro lifecycle. No Project branching added to it in v0.1. |
| EXTEND later | `factory/src/roles/director.mjs` | Future Project entry point may propose Roadmap/Milestone/Task contracts; deterministic validators remain authoritative. |
| EXTEND later | `factory/src/roles/engineer.mjs` | Future production Project adapter may supply scoped operations to PG-A0; it must never receive direct publication authority. |
| KEEP | `factory/src/roles/playtester.mjs` | Reuse only after deterministic Project verification; Project screenshots/telemetry need an adapter-specific digest later. |
| KEEP | `factory/src/roles/auditor.mjs` | Advisory only; cannot promote a baseline. |
| KEEP | `factory/src/contract/owner.mjs`, `traceability.mjs` | Micro contracts unchanged. Project contracts are separate because their lifetime and hierarchy differ. |
| DO NOT TOUCH | `factory/src/control/budget.mjs`, `release-gate.mjs`, `evidence.mjs`, repair/learning authority | Existing governance remains binding. Future Project orchestration must call it, not duplicate or weaken it. |
| EXTEND | `factory/src/control/staged-commit-policy.mjs`, `.github/CODEOWNERS` | Project control code and future `projects/` source are explicitly protected. Runtime-state allowlists are unchanged. |
| KEEP | `factory/src/verify/**` | Micro verifier remains intact. Project verification composes independent level-specific checks beside it. |
| KEEP | `factory/src/memory/store.mjs` | Global memory remains global. Project State is stored under each project and never auto-promoted into Factory Learning. |
| KEEP | `factory/src/learning/**` | No Project decision becomes a global candidate automatically. A later explicit evidence-intake adapter is required. |
| EXTEND later | `factory/src/publish/**` | A Project Web publisher must consume the Web Runtime Adapter and browser proof. Issue #63 remains separate. |
| DO NOT TOUCH | `factory/src/llm/client.mjs`, router/model/provider registries | PG-A0 introduces no routing or paid-run change. |
| KEEP | `.github/workflows/produce.yml`, `review.yml`, `pages.yml`, `trusted-selftest.yml` | No Project production workflow and no required-check migration in this bounded implementation. |
| NEW | `factory/src/project/**` | Deterministic Project contracts, state, scoped patching, context, verification, persistence, transactions, PG-A0 execution/Git binding and Web adapter proof. |

## Durable project layout

```text
projects/<project-id>/
  PROJECT.json
  ROADMAP.json
  ARCHITECTURE.md
  decisions/
  milestones/
  src/
  data/
  assets/
  tests/
  persistence/
  build/
  .factory/
    tasks/
    evidence/
    project-state.json
```

Editable inputs are not build output. The manifest-declared build directory is reproducible, cannot be targeted by a normal task, and is excluded from the verified source-tree hash even when a non-default layout is used.

## Contracts and authority

### Project Manifest

`PROJECT.json` binds project ID, Owner Vision hash, durable Project Contract, layout, runtime adapter, module graph, test map and content-schema references. Its `contractSha256` makes silent mutation detectable.

### Development Task

A `project-game.task/v1` contract contains immutable Task ID, Milestone ID, explicit ADD/MODIFY/DELETE path sets, protected paths, `maxFilesChanged`, Acceptance Criteria, verification checks and context bounds. `PROJECT.json`, `ROADMAP.json`, `ARCHITECTURE.md` and `.factory/**` are reserved authority paths and cannot be changed by normal patch operations.

### Patch Contract

Every operation carries path, operation, before SHA, after SHA and the candidate content when applicable. The control layer validates exact scope, protected paths, file count, observed whole-tree diff and SHA agreement. Undeclared changes fail closed.

### Task-PR Authority Record

`project-game.task-pr-binding/v1` binds the immutable task and verified promotion to the Git review surface. It records:

- Project ID and Task ID;
- Task Contract SHA-256;
- promoted baseline tree SHA-256;
- verification evidence SHA-256;
- base ref and exact base Git SHA;
- head ref and exact task-commit Git SHA.

The record is serialized into the task PR body in a deterministic parseable form. Revalidation compares the current PR base/head refs and SHAs to this record. A moved PR is no longer considered the same verified PG-A0 execution and must be regenerated/re-executed rather than silently reusing the old PASS.

## State model

`project-state.json` records only the last verified baseline and project-local history:

- baseline ID, task, tree SHA and evidence SHA;
- milestone history;
- verified capabilities and their regression checks;
- known regressions, technical debt and relevant local lessons;
- save-schema and build versions;
- last successful regression baseline.

It is not Factory Learning. Promotion of a project lesson into global Learning requires a future, separately governed intake with cross-project evidence.

Git commit is the durable repository authority. The state file intentionally does not self-reference its containing Git commit. PG-A0 binds source, Project State and text evidence externally to the exact task commit/PR through the Task-PR Authority Record.

## Atomic task lifecycle and recovery

1. Recover any prior transaction journal.
2. Load the exact Owner-selected immutable task and require its provided contract SHA.
3. Build deterministic evidenced bounded context.
4. Create the task Git branch only from a clean exact base branch/head.
5. Obtain scoped Engineer operations; direct Git/worktree mutation by the requester is rejected.
6. Copy the verified baseline into an isolated sibling staging directory.
7. Validate and apply only declared operations.
8. Compare whole editable trees and build SHA evidence.
9. Execute allowlisted checks directly from the control plane, without a shell, and persist their output.
10. Re-hash and grade persisted check evidence against the immutable plan.
11. Derive capabilities and regression records from the verified task/plan; do not accept them from a caller.
12. Write task evidence and the next Project State in staging only after PASS.
13. Re-hash the complete editable candidate tree after checks have run.
14. Swap baseline directories under an exclusive project lock and recovery journal.
15. Revalidate the installed promoted tree, state and exact evidence immediately before Git staging.
16. Stage only verified task paths plus exact promoted state/evidence; commit on the task branch.
17. Create a non-draft task PR and persist the durable Task-PR Authority Record binding the exact Git head.

A failed check deletes staging and leaves the prior baseline unchanged. A crash before the journal reaches `committed` rolls back to the SHA-validated backup. A crash after `committed` validates the installed candidate before cleanup. Journal filenames and workspace identities are validated before recovery touches a derived transaction path.

At the PG-A0 Git boundary, an execution error restores the task branch to the exact base, cleans repository changes back to the required clean start state and deletes the local task branch. If the task branch was pushed before PR creation failed, the runner also attempts remote branch deletion. External remote-cleanup failure remains a visible operational failure and is not treated as successful publication.

## Bounded context

Selection is deterministic and evidenced:

- global: `PROJECT.json`, project `ARCHITECTURE.md`;
- task: milestone and immutable task file;
- code: targets plus manifest-declared dependency closure;
- tests: explicit task tests plus manifest test mappings;
- memory: tagged project-local ADRs and lessons;
- limits: maximum files and bytes.

Each included file carries reason, SHA and byte count; optional exclusions record `missing` or `bound-exceeded`. Required global/task authority may never be dropped to satisfy a bound: the builder fails closed instead. v0.1 has no mandatory vector database or opaque RAG.

## Verification model

| Level | Purpose | v0.1 Foundation |
|---|---|---|
| L1 | Syntax/build | Contract/plumbing present |
| L2 | Unit | Required per task |
| L3 | Simulation invariants | Supported as typed invariant checks |
| L4 | Module integration | Required per task |
| L5 | Project regression | Required; prior verified checks are inherited |
| L6 | Browser boot | Web adapter executes a real browser proof |
| L7 | Gameplay contract | Adapter/task check type supported |
| L8 | Playtest | Existing role remains advisory/product evidence |
| L9 | Audit | Existing role remains advisory |
| L10 | Owner acceptance | Human authority; never auto-promoted |

Each executable v0.1 check is an exact `node tests/<script>.js|mjs` command. The control runner uses `spawnSync` with `shell: false`, a bounded timeout/output buffer and a sanitized environment. It writes the artifact itself; grading then re-reads and re-hashes that artifact and verifies plan, task, check and definition identity. Candidate-controlled test logic is not treated as an independent acceptance authority: immutable Acceptance Criteria remain Owner-controlled, and inherited L5 regression definitions and their protected test paths are SHA-bound. A later task cannot retain a regression ID while changing its semantics.

The Foundation runner currently implements deterministic command checks. Other typed levels remain contract vocabulary until a level-specific trusted runner is connected; unsupported kinds fail closed. L10 remains human Owner authority.

## Persistence and Web runtime

The save contract defines semantic schema version, slots, maximum bytes, migration references, corrupt-save behavior and a deterministic equivalence projection.

The Web adapter keeps generated code in an opaque-origin `sandbox="allow-scripts"` child. Persistence is host-owned and uses a versioned `postMessage` bridge; `allow-same-origin` remains forbidden. The host validates project ID, slot, schema version and size before storage. A save proof creates state, saves, closes/reloads the runtime, loads and compares the declared projection.

The contract is implemented, but the real browser persistence host bridge is still the next bounded infrastructure slice after one real merged-runner task-PR proof.

Browser boot proof requires all of the following in a real Chromium session:

- successful page response;
- exact opaque-origin sandbox policy when framed;
- ready selector visible;
- game root with non-zero layout;
- visible gameplay element;
- defined interaction changes observable state;
- no fatal console/page errors.

The included negative fixture is deliberately blank and must fail.

## Autonomy levels

| Level | Scope | Promotion criteria |
|---|---|---|
| PG-A0 | Owner selects one task; deterministic Foundation + runner execute it | exact task contract; verified baseline; durable exact task-PR binding; Owner approves task/contract and PR |
| PG-A1 | One task including bounded repair | repeated scope/transaction/regression proofs; repair never edits contract/tests outside scope; cost bound approved |
| PG-A2 | One complete milestone | every task baseline committed; milestone regression + browser proof + audit; no unresolved high-risk debt |
| PG-A3 | Multiple pre-approved milestones | at least one Canary has completed multiple milestones without capability loss; rollback drill passes |
| PG-A4 | Project continuation | Owner-approved roadmap envelope, bounded task queue, stable context metrics, save migrations and long-run regression evidence |

Promotion is an Owner decision supported by evidence. No level advances itself. PR #67 implements the PG-A0 mechanics; PG-A0 is not considered operationally proven on GitHub until one real zero-paid scoped task PR is produced end to end through the merged runner.

## Project Canary

Working title: **Kepler Outpost**. It is a small deterministic sci-fi survival/economy game, not Lumen 2.

1. M1 Runtime shell, grid world and browser boot.
2. M2 Resources and deterministic tick invariant.
3. M3 Production recipes and data schemas.
4. M4 Storage limits and loss accounting.
5. M5 One visible logistics route.
6. M6 One meaningful upgrade.
7. M7 One seeded random event with replay evidence.
8. M8 Save schema, host bridge, reload/load equivalence and corrupt-save behavior.
9. M9 Persistent meta unlock without simulation-core mutation.
10. M10 regression hardening, accessibility/polish, audit and Owner acceptance.

Each milestone is split into reviewable Development Tasks. The Canary question is whether later tasks preserve every earlier verified capability, not how many features fit into one run.

**Kepler Outpost does not start directly after PR #67.** Required order is: merge PG-A0 after final exact-head review → prove one real zero-paid scoped task PR through the merged runner → implement/validate the browser persistence host bridge → only then seek separate Owner authorization for Kepler M1–M2.

## Scale boundary

The architecture can support vertical slices toward EXODUS, Helios Industries and Space Colonia because simulation, data, persistence, project state and runtime adaptation are separate. It does not prove that Web v0.1 can deliver their full scale.

- EXODUS first stresses realtime-with-pause determinism, combat scenario coverage, asset/content growth and long-running tactical save migrations.
- Helios first stresses continuous simulation performance, offline catch-up determinism and economic reconciliation.
- Space Colonia first stresses world-state volume, physical logistics pathfinding, multi-layer simulation and content/migration breadth.
- A later Godot adapter would replace build, runtime launch, persistence transport and engine-specific browser checks. Owner authority, task contracts, scoped changes, context evidence, budget, learning governance and baseline promotion remain reusable.

## Evidence checkpoint

The final pre-documentation PG-A0 falsification head was `e1cc7d3652fea37fb98115fd2f6ef6e3875bd0be`:

- Branch Verifier run `33301663951`: **SUCCESS**;
- Trusted PR Selftest Gate run `33301664166`: **SUCCESS** on the same head;
- no Canary;
- no paid Project model/API run.

Because the canonical documentation changes move PR #67's head, these runs remain the implementation/falsification checkpoint. Fresh exact-head checks are required again before merge.

## Sources

- GitHub Issue [#62](https://github.com/Bartekkk87/game-factory/issues/62)
- GitHub Issue [#63](https://github.com/Bartekkk87/game-factory/issues/63)
- [Project EXODUS](https://app.notion.com/p/3b58920148bd8154a979e1fd9bfc8712)
- [Helios Industries](https://app.notion.com/p/3b48920148bd81b8a973fd734f23b24f)
- [Space Colonia](https://app.notion.com/p/3b58920148bd81c681c9ef7132e602a4)
