# Project Game Mode v0.1 — Architecture

Status: **Foundation remediation implemented on a protected-main feature branch; exact-head CI and review are still required. No Project Canary and no paid model run are authorized.**

Baseline analyzed: `main` at `8fdbf2952321f08832a75ba376f28a05594002e3`.
Remediation base: audited Foundation head `e8228a7ceca5462161d730880c5093c3c6349dc4` from PR #64.

## Audit-driven correction

The first Foundation implementation was not safe to merge. Independent audit evidence proved four material defects: callers could declare verification PASS, recovery trusted journal-supplied paths, concurrent tasks had no project lock, and a later task could weaken an inherited regression while retaining its ID. The remediation makes these boundaries executable control-plane responsibilities:

- the transaction invokes an allowlisted direct-Node verification runner itself and re-hashes persisted check evidence before grading;
- callers cannot supply verification results, capabilities or regressions to baseline promotion;
- transaction paths are derived from a validated transaction ID, never read from a journal;
- an exclusive per-project lock covers prepare through commit/abort, including recovery;
- inherited regression definitions are SHA-bound and semantic redefinition fails closed;
- the candidate tree is re-hashed after verification and immediately before swap;
- missing or invalid Project State aborts instead of creating a replacement baseline;
- persisted Manifest and Task contracts reject unknown fields.

These fixes have executable negative regressions in `factory/src/project/test-remediation.mjs`. They do not retroactively turn PR #64 into a merge candidate; remediation is reviewed on its own branch and PR.

## Decision

Project Game Mode is an additional execution layer beside the existing Micro Game pipeline. It does not replace `produceGame()`, the single-HTML Micro Engine, current release authority, budget control, learning governance, or the `runtime-state` split.

The scale mechanism is:

`immutable project/task contracts -> bounded context -> deterministic file operations in staging -> hierarchical verification -> atomic verified-baseline promotion -> task branch/PR`

Project source is authoritative only when it reaches Git through the protected-main PR path. `runtime-state` remains non-authoritative run/evidence state and must not become a second source of project code truth.

## Current-state findings

- `factory/src/pipeline/run.mjs` is a proven Micro Game lifecycle that expects one generated `{title, css, html, js}` object and may use a governed fresh rebuild. It is not a safe project-scale task runner.
- `roles/engineer.mjs` receives the full prior design and engine source. It has no file-operation contract or scope enforcement.
- Current verification is strong for the Micro Engine but centered on one assembled page and the `window.__GF__` protocol.
- `memory/store.mjs` is global Factory/Product memory. Reusing it for project-local decisions would mix project truth with Factory Learning.
- `runtime-state` permits only run, draft, product, archive, memory, learning and evaluation paths. This is correct and remains unchanged.
- Issue #63 proves that artifact SHA, verifier PASS and Pages deployment do not establish Owner-visible boot. Browser delivery is therefore its own deterministic verification level.

## Target layers

```text
Existing Factory control plane
Owner authority | budget | release | learning | evidence
                    |
Project execution layer
Manifest | Task | Context | Patch | Transaction | Project State
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
| KEEP | `factory/src/pipeline/run.mjs` | Existing Micro Game path remains the default Micro lifecycle. No Project branching added in v0.1. |
| EXTEND later | `factory/src/roles/director.mjs` | Future Project entry point may propose Roadmap/Milestone/Task contracts; deterministic validators remain authoritative. |
| EXTEND later | `factory/src/roles/engineer.mjs` | Future Project entry point returns file operations, never a whole-project JSON replacement during a normal task. |
| KEEP | `factory/src/roles/playtester.mjs` | Reuse only after deterministic Project verification; Project screenshots/telemetry need an adapter-specific digest later. |
| KEEP | `factory/src/roles/auditor.mjs` | Advisory only; cannot promote a baseline. |
| KEEP | `factory/src/contract/owner.mjs`, `traceability.mjs` | Micro contracts unchanged. Project contracts are separate because their lifetime and hierarchy differ. |
| DO NOT TOUCH | `factory/src/control/budget.mjs`, `release-gate.mjs`, `evidence.mjs`, repair/learning authority | Existing governance remains binding. Future Project orchestration must call it, not duplicate or weaken it. |
| EXTEND | `factory/src/control/staged-commit-policy.mjs`, `.github/CODEOWNERS` | New Project control code and future `projects/` source are explicitly protected. Runtime-state allowlists are unchanged. |
| KEEP | `factory/src/verify/**` | Micro verifier remains intact. Project verification composes independent level-specific checks beside it. |
| KEEP | `factory/src/memory/store.mjs` | Global memory remains global. Project State is stored under each project and never auto-promoted into Factory Learning. |
| KEEP | `factory/src/learning/**` | No Project decision becomes a global candidate automatically. A later explicit evidence-intake adapter is required. |
| EXTEND later | `factory/src/publish/**` | A Project Web publisher must consume the Web Runtime Adapter and browser proof. Issue #63 remains separate. |
| DO NOT TOUCH | `factory/src/llm/client.mjs`, router/model/provider registries | No routing or paid-run change is necessary for Foundation v0.1. |
| KEEP | `.github/workflows/produce.yml`, `review.yml`, `pages.yml`, `trusted-selftest.yml` | No Project workflow and no required-check migration in this bounded implementation. |
| NEW | `factory/src/project/**` | Deterministic Project contracts, file state, scoped patching, context, verification, persistence, transactions and Web adapter proof. |

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

## State model

`project-state.json` records only the last verified baseline and project-local history:

- baseline ID, task, tree SHA and evidence SHA;
- milestone history;
- verified capabilities and their regression checks;
- known regressions, technical debt and relevant local lessons;
- save-schema and build versions;
- last successful regression baseline.

It is not Factory Learning. Promotion of a project lesson into global Learning requires a future, separately governed intake with cross-project evidence.

Git commit is the durable authority. The state file intentionally does not self-reference its containing Git commit. A task branch/PR binds the source, state and text evidence together; the external Git commit supplies repository identity.

## Atomic task lifecycle and recovery

1. Recover any prior transaction journal.
2. Copy the verified baseline into an isolated sibling staging directory.
3. Validate and apply only declared operations.
4. Compare whole editable trees and build SHA evidence.
5. Execute allowlisted checks directly from the control plane, without a shell, and persist their output.
6. Re-hash and grade persisted check evidence against the immutable plan.
7. Derive capabilities and regression records from the verified task/plan; do not accept them from a caller.
8. Write task evidence and the next Project State in staging only after PASS.
9. Re-hash the complete editable candidate tree after checks have run.
10. Swap baseline directories under an exclusive project lock and recovery journal.
11. Create a task commit/PR only from the promoted baseline.

A failed check deletes staging and leaves the prior baseline unchanged. A crash before the journal reaches `committed` rolls back to the SHA-validated backup. A crash after `committed` validates the installed candidate before cleanup. Journal filenames and workspace identities are validated before recovery touches a derived transaction path. An uncertain swap therefore loses at most a valid candidate and never silently promotes it.

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
| PG-A0 | Owner selects one task; deterministic Foundation executes it | Foundation ACs pass; owner approves task/contract and PR |
| PG-A1 | One task including bounded repair | repeated scope/transaction/regression proofs; repair never edits contract/tests outside scope; cost bound approved |
| PG-A2 | One complete milestone | every task baseline committed; milestone regression + browser proof + audit; no unresolved high-risk debt |
| PG-A3 | Multiple pre-approved milestones | at least one Canary has completed multiple milestones without capability loss; rollback drill passes |
| PG-A4 | Project continuation | Owner-approved roadmap envelope, bounded task queue, stable context metrics, save migrations and long-run regression evidence |

Promotion is an Owner decision supported by evidence. No level advances itself.

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

## Scale boundary

The architecture can support vertical slices toward EXODUS, Helios Industries and Space Colonia because simulation, data, persistence, project state and runtime adaptation are separate. It does not prove that Web v0.1 can deliver their full scale.

- EXODUS first stresses realtime-with-pause determinism, combat scenario coverage, asset/content growth and long-running tactical save migrations.
- Helios first stresses continuous simulation performance, offline catch-up determinism and economic reconciliation.
- Space Colonia first stresses world-state volume, physical logistics pathfinding, multi-layer simulation and content/migration breadth.
- A later Godot adapter would replace build, runtime launch, persistence transport and engine-specific browser checks. Owner authority, task contracts, scoped changes, context evidence, budget, learning governance and baseline promotion remain reusable.

## Sources

- GitHub Issue [#62](https://github.com/Bartekkk87/game-factory/issues/62)
- GitHub Issue [#63](https://github.com/Bartekkk87/game-factory/issues/63)
- [Project EXODUS](https://app.notion.com/p/3b58920148bd8154a979e1fd9bfc8712)
- [Helios Industries](https://app.notion.com/p/3b48920148bd81b8a973fd734f23b24f)
- [Space Colonia](https://app.notion.com/p/3b58920148bd81c681c9ef7132e602a4)
