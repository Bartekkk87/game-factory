# Project Game Mode v0.1 — Falsification

## Result

The original direction survives only after one material correction: **Project source and milestone baseline cannot live as mutable `runtime-state`.** They must be Git/PR-authoritative. `runtime-state` remains evidence/state support, not project-code truth.

## Adversarial findings

| Hypothesis attacked | Failure mode | Resolution in v0.1 | Residual risk |
|---|---|---|---|
| Project State can be a convenient second truth | State claims M4 while Git contains M3 | Baseline tree SHA plus protected Git commit/PR authority; state alone authorizes nothing | Future workflow must bind PR head and evidence exactly |
| Milestone status can be written independently | Partial milestone completion or stale roadmap | Normal tasks cannot edit `ROADMAP.json`; milestone closure requires a separate governed operation | Milestone closure contract is not yet implemented |
| Multiple file writes are safe enough | Crash produces mixed old/new project | Verify in staging; journaled whole-directory swap; uncertain swaps roll back | Filesystem recovery is tested locally, not under runner termination injection |
| Allowed file list is sufficient | Symlink/path traversal or undeclared side effect | Reject unsafe paths/symlinks; compare complete before/after editable tree | Very large projects need a more efficient Merkle/index strategy |
| Passing new tests protects old behavior | Agent rewrites implementation and its own tests | Immutable task/acceptance; inherited regression IDs; independent evidence identity; registered regression fixture paths are protected from later task scope | A future registry still needs ownership/migration rules for deliberate fixture replacement |
| More context is always safer | Context drift and cost growth after many tasks | Deterministic dependency/test/tag selection with hard file/byte bounds and exclusion evidence | Manifest graph can become stale and needs a drift check |
| A successful task can mark itself complete | Agent changes acceptance or state | `.factory/**` and project authority files are reserved; control plane writes state only after PASS | Future LLM adapter must accept operations only, never direct workspace access |
| Save compatibility can be added later | Schema break loses long-running games | Version, migrations, corrupt behavior, size and equivalence are first-class | Real browser host bridge is designed but not yet product-integrated |
| Deploy success proves playability | Blank screen after Pages PASS | Real page/root/ready/visible/interaction/error proof; blank fixture fails | Device/browser matrix and deployed-URL proof remain future work |
| Repair can freely modify tests | Implementation and tests collude | Explicit path scope, immutable acceptance, independent regression inheritance | A future task may legitimately add tests; those cannot be sole regression authority |
| Rollback means Git revert only | Interrupted local task corrupts working baseline | Transaction recovery restores last baseline before commit; Git provides post-commit rollback | Automated Git revert/PR flow is not implemented |
| Web is engine-neutral by default | Control plane learns DOM/browser assumptions | Web logic is behind an explicit runtime adapter | Browser gameplay semantics remain Web-specific |
| Existing agents need more specialist agents | Agent proliferation adds coordination without authority | No new agent; deterministic components carry project management/control duties | Director task decomposition quality must later be measured |

## Architecture entropy after many tasks

The current Foundation prevents silent file drift, but it does not by itself prevent poor architecture after many individually valid patches. The required future controls are:

- architecture budget per milestone: dependency-edge growth, cyclic dependency detection and module-size thresholds;
- mandatory ADR for changes that cross declared module boundaries;
- periodic architecture regression task owned by deterministic tooling;
- task scope small enough that one change has a reviewable causal story;
- refactoring milestones that preserve capability regressions rather than bypassing them.

This is the first likely control gap after the Canary, not a reason to add an Architect Agent now.

## Stress-reference falsification

### Project EXODUS

The Foundation can represent energy, systems, crew, combat and events as modules/tasks with deterministic invariants. It will first break at rich realtime-with-pause scenario exploration: one generic browser interaction is not enough to cover tactical state combinations. A scenario runner and seeded combat replay format are required before an EXODUS vertical slice.

### Helios Industries

The clean simulation/view split, content schemas and persistence contract fit. It will first break at continuous/offline simulation reconciliation and performance. The verifier needs fixed-step replay, time-jump proofs and economy conservation checks over long horizons.

### Space Colonia

The hierarchy, data schemas and physical-goods invariants fit. It will first break at state volume, pathfinding/logistics scenarios and save migrations across large content graphs. Incremental snapshots, schema migration matrices and performance budgets become mandatory.

## Rejected hypotheses

1. Put project source on `runtime-state` for easy autonomous commits — rejected because it creates non-authoritative code state and bypass pressure.
2. Extend `produceGame()` with a `projectMode` switch now — rejected because it couples two different lifecycle/state models and risks Micro regressions.
3. Let Engineer edit the workspace directly — rejected because scope evidence becomes post-hoc and non-deterministic.
4. Make a vector database mandatory — rejected because deterministic dependency/test/tag selection is auditable and sufficient for v0.1.
5. Add Project Manager/Architect agents — rejected because contracts, task state, context and promotion are deterministic responsibilities.
6. Use `allow-same-origin` for browser saves — rejected because it weakens the established generated-code isolation boundary.
7. Treat browser deployment or a screenshot alone as boot PASS — rejected because Issue #63 demonstrates the gap.

## Go/no-go

**GO for Foundation v0.1 and a later PG-A0 Canary task. NO-GO for autonomous multi-milestone execution today.**

The next evidence must prove one real scoped task PR end to end without paid retries, then a browser persistence bridge. Only after those pass should Kepler Outpost M1 begin.
