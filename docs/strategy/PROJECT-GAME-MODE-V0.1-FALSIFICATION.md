# Project Game Mode v0.1 — Falsification

## Result

The original direction survives after two material corrections:

1. **Project source and milestone baseline cannot live as mutable `runtime-state`.** They are Git/PR-authoritative; `runtime-state` remains evidence/state support, not project-code truth.
2. **A verified promoted baseline is not enough by itself.** PG-A0 must bind the immutable task, promoted source tree, verification evidence and exact Git task-PR identity durably and fail closed when that identity moves.

Foundation remediation PR #66 is merged. PG-A0 runner implementation is under review in PR #67. No Project Canary and no paid Project model/API run were executed.

## Adversarial findings

| Hypothesis attacked | Failure mode | Resolution in v0.1 / PG-A0 | Residual risk |
|---|---|---|---|
| Project State can be a convenient second truth | State claims M4 while Git contains M3 | Baseline tree SHA plus protected Git commit/PR authority; state alone authorizes nothing | Repository-level protected-branch administration remains external governance |
| Milestone status can be written independently | Partial milestone completion or stale roadmap | Normal tasks cannot edit `ROADMAP.json`; milestone closure requires a separate governed operation | Milestone closure contract is not yet implemented |
| Multiple file writes are safe enough | Crash produces mixed old/new project | Verify in staging; journaled whole-directory swap; uncertain swaps roll back | Filesystem recovery is tested locally, not under OS-level kill injection |
| Allowed file list is sufficient | Symlink/path traversal or undeclared side effect | Reject unsafe paths/symlinks; compare complete before/after editable tree | Very large projects need a more efficient Merkle/index strategy |
| Passing new tests protects old behavior | Agent rewrites implementation and its own tests | Immutable task/acceptance; SHA-bound inherited regressions; protected regression fixture paths | A future registry still needs ownership/migration rules for deliberate fixture replacement |
| More context is always safer | Context drift and cost growth after many tasks | Deterministic dependency/test/tag selection with hard file/byte bounds and exclusion evidence | Manifest graph can become stale and needs a drift check |
| A successful task can mark itself complete | Agent changes acceptance or state | `.factory/**` and project authority files are reserved; control plane writes state only after PASS | Future Project decomposition must keep Owner approval semantics explicit |
| Save compatibility can be added later | Schema break loses long-running games | Version, migrations, corrupt behavior, size and equivalence are first-class | Real browser host bridge is designed but not yet product-integrated |
| Deploy success proves playability | Blank screen after Pages PASS | Real page/root/ready/visible/interaction/error proof; blank fixture fails | Device/browser matrix and deployed-URL proof remain future work |
| Repair can freely modify tests | Implementation and tests collude | Explicit path scope, immutable acceptance, independent regression inheritance | A future task may legitimately add tests; those cannot be sole regression authority |
| Rollback means Git revert only | Interrupted local task corrupts working baseline | Transaction recovery restores last baseline; PG-A0 also restores clean Git working state and task branch | Automated post-merge Git revert/PR flow is not implemented |
| Web is engine-neutral by default | Control plane learns DOM/browser assumptions | Web logic is behind an explicit runtime adapter | Browser gameplay semantics remain Web-specific |
| Existing agents need more specialist agents | Agent proliferation adds coordination without authority | No new agent; deterministic components carry project control duties | Director task decomposition quality must later be measured |
| Caller can construct Git publication context | Caller publishes unverified/mismatched state | Git write helpers are private to `runPgA0Task()`; publication is downstream of verified promotion | Real GitHub task-PR execution is still to be proven end to end |
| Engineer callback can touch workspace directly | Callback changes/stages/commits outside returned operations | Deep-frozen cloned request plus post-callback branch/head/index/worktree invariants; mutation fails closed | OS-level side channels are outside this in-process runner model |
| Verification PASS means Git commit is safe | Workspace changes between verification and commit | Re-capture promoted tree, state and evidence immediately before staging; exact staged set enforced | Very large trees may later need incremental hashing |
| PR body is only explanatory text | Head moves after process exits and old in-memory binding is gone | Machine-readable durable authority record is serialized in PR body and reparsed against current PR refs/SHAs | A future workflow may automate continuous revalidation on every task-PR update |
| Rollback can clean only project files | Engineer leaves foreign untracked repo file | PG-A0 requires clean start and rollback cleans untracked repository state after hard reset | Ignored files are intentionally outside normal Git cleanliness semantics |
| PR creation failure after push is harmless | Orphan remote task branch survives | Runner records push state and deletes remote task branch best-effort during rollback | Remote deletion can itself fail due external Git/network permissions and must remain visible |

## Findings discovered after the first Foundation implementation

The first Foundation branch falsified its own GO conclusion. It accepted caller-declared verification results, trusted recovery paths from mutable journals, allowed concurrent transactions, and identified regressions only by mutable IDs. Remediation PR #66 added executable negative tests for those defects and was merged only after exact-head CI/review.

The Foundation also left one explicit design gap: `project-state.json` stored a promoted tree SHA but did not bind that promotion to the later task PR. PR #67 implements that missing PG-A0 layer. The binding includes Project ID, Task ID, immutable Task Contract SHA-256, promoted baseline tree SHA-256, verification evidence SHA-256, base/head refs and exact Git SHAs. It is persisted in the task PR authority record and can be revalidated after process restart.

## PG-A0 falsification checkpoint

The PG-A0 implementation was attacked through the public `runPgA0Task()` path, not merely through isolated helpers. Required negative coverage now proves:

1. direct Engineer worktree mutation fails closed and rolls back;
2. Engineer staging outside the Project boundary fails closed and rolls back;
3. an out-of-scope returned patch is rejected;
4. a GitHub PR response with the wrong head is rejected;
5. a GitHub PR response with the wrong base head is rejected;
6. a PR-creation failure after a real push to a local bare remote rolls back the local commit/branch and removes the remote task branch;
7. a staged foreign path cannot enter the verified task commit;
8. a durable authority record rejects a subsequently moved PR head;
9. low-level Git publication helpers are not exported as caller-controlled APIs.

During this falsification, one real rollback defect was found and corrected: untracked files outside `projects/<id>` could survive a failed task. Because PG-A0 requires a clean repository at entry, rollback now restores that repository-wide clean start state rather than cleaning only the Project subtree.

The final pre-documentation falsification head is `e1cc7d3652fea37fb98115fd2f6ef6e3875bd0be`:

- Branch Verifier `33301663951`: **SUCCESS**;
- Trusted PR Selftest Gate `33301664166`: **SUCCESS** on the same head.

Documentation changes necessarily move the PR head, so final merge eligibility still requires new exact-head checks on the completed documentation head.

## Architecture entropy after many tasks

The current Foundation and PG-A0 boundaries prevent silent file drift and unbound task publication, but they do not by themselves prevent poor architecture after many individually valid patches. Future controls remain:

- architecture budget per milestone: dependency-edge growth, cyclic dependency detection and module-size thresholds;
- mandatory ADR for changes that cross declared module boundaries;
- periodic architecture regression task owned by deterministic tooling;
- task scope small enough that one change has a reviewable causal story;
- refactoring milestones that preserve capability regressions rather than bypassing them.

This is a later scale-control problem, not a reason to add an Architect Agent now.

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
8. Treat a successful local promotion as sufficient Git authority — rejected because the exact task PR identity must be bound durably.

## Go/no-go

**CONDITIONAL GO for merge review of PG-A0 PR #67 after final documentation and fresh exact-head CI. NO-GO for Kepler Outpost Canary or autonomous multi-milestone execution.**

After PR #67 merges, the next required proof is **one real zero-paid scoped task PR end to end through the merged runner**. Only after that proof should the browser persistence host bridge be implemented/validated. Kepler Outpost M1–M2 begins only after those gates pass and under a separate explicit Owner authorization.
