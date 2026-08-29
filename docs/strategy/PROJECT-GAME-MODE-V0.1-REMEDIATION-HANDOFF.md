# Project Game Mode v0.1 — Remediation Handoff

Status: Owner-approved next-chat handoff. Audit loop closed. No implementation is authorized by
this document alone beyond the bounded remediation described below.

## 1. Authoritative starting point

- Repository: `Bartekkk87/game-factory`
- Protected base at audit time: `8fdbf2952321f08832a75ba376f28a05594002e3`
- Audited Foundation head: `e8228a7ceca5462161d730880c5093c3c6349dc4`
- Foundation PR: #64 — **NO-GO; do not merge at the audited head**
- Independent audit: PR #65 and
  `PROJECT-GAME-MODE-V0.1-INDEPENDENT-AUDIT.md`
- GitHub Issue #62 remains the coordination record.

The audit is complete. Do not start another broad architecture audit. If prior audit wording
conflicts with this handoff, this handoff and the final Owner-decision section of the audit are
authoritative.

## 2. Findings frozen for remediation

### Merge blockers

1. **P0-1 — Verification is caller-declared, not executed.** Invalid code can be promoted using
   fabricated result objects and invented evidence hashes.
2. **P0-2 — Recovery trusts journal-supplied paths.** A crafted journal can delete outside the
   project and install a foreign tree.
3. **P0-3 — Transactions are not exclusive.** Two normal concurrent tasks can destroy the
   project while both report successful promotion.
4. **P1-3 — Regression identity is semantic-free.** A prior check ID can be repeated with a
   different command or invariant, and capability/regression state is caller supplied.

### Accepted secondary interpretation

P2-7 does not mean that later normal tasks ignore prior tree drift. Each next task captures the
actual pre-patch tree and the commit path compares it with the stored baseline. The remaining
gaps are:

- no final staging-tree re-hash immediately before swap;
- no Git/PR binding step after the local baseline is created;
- no authority-boundary validation that combines loaded state with the actual workspace tree.

## 3. Required implementation sequence

### Work package 1 — Verification trust root

- Replace caller-authored PASS objects with results created by a runner invoked by the control
  plane.
- Resolve checks through a deterministic approved command/invariant registry; do not execute
  arbitrary shell text supplied by an Engineer response.
- Persist stdout, stderr, exit status, timing and artifact identity for every check.
- Re-hash persisted evidence at grading time.
- Bind producer/verifier identity to executed operations rather than unequal free-form strings.
- Bind inherited regression IDs to immutable semantic definitions or definition hashes.
- Derive promoted capabilities and regressions from passed acceptance mappings; do not accept
  them as unconstrained caller input.
- Convert the embedded P0-1 reproduction into an executable negative regression test running in
  the Project Foundation selftest and CI.

### Work package 2 — Transaction and recovery hardening

- Hold an exclusive project lock for the complete prepare→verify→commit/abort lifecycle.
- Derive staging, backup and journal paths from validated transaction IDs inside the expected
  transaction root. Never execute journal-supplied absolute paths.
- Validate journal schema, project root, transaction ID, phase transitions and all containment
  relationships before cleanup or recovery.
- Recovery must distinguish stale transactions from live locked transactions.
- Established non-empty projects must load state fail-closed; do not silently recreate a null
  baseline.
- Re-capture the staging tree immediately before swap and require equality with
  `patchEvidence.candidateAfter`.
- Convert the embedded P0-2 and P0-3 reproductions into executable negative regression tests
  running in CI.

### Work package 3 — Contract closure

- Preserve the exact Owner AC-PG-001…020 definitions in section 6 of this handoff and promote
  them into the formal Project contract/architecture documents on the remediation branch; bare
  IDs are insufficient.
- Map every remediation test to the exact requirement text and immutable task contract.
- Keep Project Memory separate from Factory Learning and preserve all existing governance,
  budget, release and evidence gates.
- Record Git/PR binding as an explicit prerequisite for PG-A0 rather than silently treating a
  local state file as durable authority.

## 4. Branch and PR rules for the next chat

- Do not modify `main` directly.
- Do not change or force-push the audited PR #64 head; its exact identity is audit evidence.
- Create a new remediation branch from `e8228a7` and open a new PR against `main` containing the
  Foundation plus bounded fixes.
- Keep commits reviewable: verification trust root first, transaction hardening second, contract
  documentation last.
- No paid model/provider run, Project Canary, PG-A0 run, learning promotion, publisher change or
  unrelated Issue #63 repair.
- Do not weaken, skip or replace existing Micro-Game, Golden Corpus, Trusted Gate, budget,
  release, repair or evidence controls.

## 5. Definition of done

Remediation is not complete until all of the following hold on the exact remediation PR head:

- Each of the three P0 reproductions exists as an executable negative regression test.
- The tests fail against the audited head and pass against the remediation head.
- Fabricated verification results cannot promote a baseline.
- Journal recovery cannot read, delete, rename or install paths outside its validated project
  transaction root.
- Concurrent task preparation/commit fails closed without source loss or false promotion.
- A staging mutation after patch evidence capture fails the final pre-swap SHA check.
- Regression definitions cannot be weakened while retaining an inherited check ID.
- The exact Owner acceptance criteria are present in GitHub and mapped to evidence.
- Existing Micro-Game tests, Golden Corpus, Branch Verifier and Trusted PR Selftest Gate pass.
- No half-verified Project State becomes the baseline after abort, crash or failed verification.

After these conditions pass, perform one bounded blocker-closure review. Do not reopen the broad
architecture debate unless the fixes require weakening governance or reveal a new P0.

## 6. Canonical Owner acceptance criteria

These definitions are authoritative. They replace every earlier audit reconstruction of the
bare IDs:

- **AC-PG-001:** The existing Micro-Game pipeline remains green.
- **AC-PG-002:** A Project Manifest can be created, validated and loaded deterministically.
- **AC-PG-003:** A Development Task has an immutable Task ID, scope and acceptance mapping.
- **AC-PG-004:** A task can modify only allowed project files.
- **AC-PG-005:** A scope escape fails closed.
- **AC-PG-006:** Before/after file state is SHA-evidenced.
- **AC-PG-007:** Project State can be loaded again after process restart.
- **AC-PG-008:** The Context Builder returns bounded, relevant context and records its selection.
- **AC-PG-009:** Project Memory is separated from global Factory Learning.
- **AC-PG-010:** Unit, integration and regression verification can be assigned to a Project Task.
- **AC-PG-011:** A previously verified capability can be protected as a regression requirement
  for later tasks.
- **AC-PG-012:** The persistence contract supports a versioned save schema.
- **AC-PG-013:** A save→reload→load verification scenario exists architecturally and in tests.
- **AC-PG-014:** Editable source and build output are separated.
- **AC-PG-015:** The Web Runtime Adapter is modelled as an explicit adapter.
- **AC-PG-016:** Browser Boot Proof can detect a blank-screen-class failure.
- **AC-PG-017:** An interrupted or failed task cannot mark a half-verified Project State as the
  new baseline.
- **AC-PG-018:** Rollback to the last verified Project Baseline is defined.
- **AC-PG-019:** A Project Task cannot modify its acceptance criteria or Project Contract on its
  own authority.
- **AC-PG-020:** Audit evidence explains task, model, operation, context, changed files, SHAs,
  tests, result and baseline before/after.

No aggregate PASS/FAIL score is authorized until these exact definitions are mapped to tests and
evidence on the remediation PR head.

## 7. Next-chat execution prompt

Work in `Bartekkk87/game-factory`. Read Issue #62, PR #64 at audited head `e8228a7`, PR #65 and
this handoff first. Treat the frozen findings and implementation order above as authoritative.
Create a new remediation branch from the audited Foundation head. Implement Work package 1,
verify it with a durable negative regression test, then implement Work package 2 with the two
remaining adversarial regression tests. Add the exact Owner acceptance definitions and evidence
mapping. Preserve the Micro-Game path and every existing governance gate. Do not run paid models,
do not run a Canary, do not merge, and stop if deterministic enforcement or atomic project state
cannot be achieved without weakening an existing gate. Report the exact base/head SHAs, files,
commits, tests, check runs, remaining failures and whether PG-A0 is still blocked.
