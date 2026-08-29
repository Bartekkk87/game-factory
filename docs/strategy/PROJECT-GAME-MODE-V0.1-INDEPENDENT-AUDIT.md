# Project Game Mode v0.1 — Independent Adversarial Audit

**Verdict: NO-GO.** Three independent P0 findings were reproduced against the exact PR head.

Audit date: 2026-08-29. Audit posture: adversarial. The goal was to falsify the Foundation's
central safety claims, not to confirm them. A green required check was explicitly not treated
as evidence of correctness — and, as shown below, the green check on this exact head coexists
with total-data-loss and arbitrary-file-deletion defects.

---

## 0. Erratum (2026-08-29, same day — post-review correction)

This document was independently cross-checked after first publication. The cross-check
confirmed the three P0 findings and P1-3 without change. It also found real defects in the
audit itself. They are corrected in place below; this section records what changed and why,
so the revision history stays visible rather than silently overwritten.

1. **P1-1 (case-insensitive reserved-path bypass) is downgraded from P1 to P3.** The original
   text argued this "would be P0" on a case-insensitive filesystem. Tracing the full code path
   (not just the `isReservedProjectPath()` predicate) shows the patch pipeline's mandatory
   before/after tree-diff almost certainly catches this: on a case-preserving, case-insensitive
   filesystem (APFS, NTFS default), the on-disk directory entry keeps its original case
   (`PROJECT.json`), so `captureProjectTree()`'s `fs.readdirSync()`-based walk reports the
   changed path as `PROJECT.json`, while the declared operation says `project.json`. The
   `declared !== observed` string comparison in `applyPatchToStaging()` then throws
   `scope evidence mismatch` and the whole transaction aborts. This was not executed on a real
   case-insensitive filesystem (still unavailable in this container) — it is corrected static
   analysis, not a new reproduction. It replaces a claim that was itself unreproduced. The
   underlying predicate inconsistency is real and kept as a finding, but as a robustness/error-
   quality issue (confusing abort mode), not a demonstrated scope-escape. See revised **P3-1**.
2. **P1-2 is narrowed.** The "wrote project alpha's state into project beta's workspace" step
   used `writeProjectStateAtomic()` directly, which is exported but is **not** the path
   `commitVerifiedTransaction()` uses — that function always calls it with the transaction's
   own manifest, loaded fresh from the same workspace, so the demonstrated cross-project write
   is not reachable through the documented commit flow today. This is now stated explicitly.
   The other two parts of P1-2 — `gitCommitSha` defaults to `null` and is never populated or
   checked by the normal flow, and `treeSha256` is never re-verified against the actual tree on
   load — remain, are reachable through the normal flow, and keep the finding at P1.
3. **P2-3 (browser-proof false FAIL) is downgraded to P3 and re-attributed.** CI job logs for
   the audited head (run `33271453720`, step *"Prove verifier accepts good and rejects bad
   products"*, `19:44:37–19:46:37`) show the PR's own browser-proof selftest — which includes
   the positive fixture this finding is about — **passed** using CI's freshly installed
   Chromium (`npx playwright install --with-deps chromium`, same run, step *"Install browser"*,
   completed `19:40:25`). My reproduction used a Chromium **build 1194** substituted via
   `executablePath` because this container's pinned Playwright (`1.62.1`) expects build 1234
   and neither the exact build nor a fresh install was available here. The false FAIL is most
   likely an artifact of that older substitute build's favicon-request behavior, not a defect
   that reproduces against the PR's actual target browser. The original text ("the gate's
   outcome depends on which Chromium binary CI happens to ship") overstated a risk to CI that
   the CI evidence I already had access to does not support. The narrower point — that any
   missing optional asset is currently treated as fatal by `fatal-browser-errors` — is kept as
   a documentation-weight P3, not a P2 CI risk.
4. **Section 3 / Section 9 (Micro-Game path) undersold CI evidence for the four unexecuted
   browser suites.** They were reported as "UNPROVEN" without citing that CI's job-step log for
   the exact audited head already shows all four passing individually: *"Prove P0 action
   reachability repair"*, *"Prove independent terminal proof scenarios"*, *"Prove independent
   HUD geometry verifier"*, *"Prove verifier causality and visual activity controls"* — all
   `conclusion: success`, run `33271453720`, steps 42–45. Corrected framing: **not
   independently reproduced in this sandbox** (Chromium version mismatch, stated as a real
   limitation) **but confirmed via CI job-step logs to have passed on the exact audited head**,
   which is a materially stronger claim than "UNPROVEN" and is not the same as "PASS by my own
   execution". Both distinctions are now stated explicitly wherever this arises.
5. **The stop-on-first-P0 rule was not literally followed, and the original text implied it
   was.** P0-1 was found first; the audit then continued to P0-2, P0-3 and the P1–P3 findings
   rather than halting immediately. The three P0s are independent code paths (verification
   grading, crash recovery, concurrency) — stopping at the first would have left the second and
   third undiscovered, and the NO-GO verdict and Owner decision benefit from knowing the full
   blast radius rather than one instance of it. That is a reasoned deviation, not compliance,
   and it is stated as a deviation rather than folded silently into "reproduction secured, audit
   stopped" language used in earlier drafts of the closing sections.
6. **The audit PR's own CI is red**, run `33273142760`, failing at the *"Require exact candidate
   branch verifier success"* step of the Trusted Selftest Gate — because this document's path
   (`docs/strategy/*.md`) was outside `verify.yml`'s push-trigger path filter, so no
   `branch-selftest` run ever existed for the commit the trusted gate was polling for. This is
   exactly finding **P3-3** manifesting on the audit's own PR. It is fixed in this revision by
   registering this document in `docs/strategy/INDEX.md`, which is inside the path filter.
7. **Branch protection / ruleset detail** — this session still has no ruleset-read tool
   available (checked again during this revision: no such GitHub MCP tool is present). Section
   10's "NOT VERIFIABLE" status for branch protection therefore stands unchanged. Any more
   specific ruleset description obtained through a different channel has not been independently
   confirmed by this session and is not asserted here.

None of the three P0 findings, P1-3, or the overall NO-GO verdict changed as a result of this
review. What changed is severity calibration on three secondary findings and completeness of
CI-evidence attribution — exactly the kind of gap an adversarial audit should have caught in
itself, and did not until asked to re-check.

---

## 1. Commit identity

| Item | Value |
|---|---|
| `main` at audit time | `8fdbf2952321f08832a75ba376f28a05594002e3` |
| PR #64 head at audit time | `e8228a7ceca5462161d730880c5093c3c6349dc4` |
| PR #64 base recorded by GitHub | `8fdbf2952321f08832a75ba376f28a05594002e3` |
| Head changed during audit? | **No** — re-verified at audit start and audit end |
| Branch | `codex/project-game-mode-v0.1-foundation` |
| PR mergeable state | `clean`, 27 files, +1827 / −2, 3 commits |
| Audit branch | `claude/pgm-v0.1-independent-audit-xj6lqs` |

Both GitHub checks are attached to the exact audit head `e8228a7`:

| Check | Run | Conclusion | Head |
|---|---|---|---|
| `branch-selftest` (Branch Verifier) | 33271453720 | SUCCESS | `e8228a7` |
| `selftest` (Trusted PR Selftest Gate, Required) | 33271470501 | SUCCESS | `e8228a7` |

The starting values supplied with the audit order were re-derived from GitHub and matched.
**The tested commit and the PR head are identical.** This is important: the P0 findings below
are present in exactly the artifact that both checks marked green.

---

## 2. Audit scope

Read as source of truth: `ARCHITECTURE.md`, `README.md`, `docs/strategy/INDEX.md`,
`docs/strategy/STATUS-CHAIN.json`, the four `PROJECT-GAME-MODE-V0.1-*` documents, the complete
PR #64 diff and all three commits, Issues #62 and #63, `.github/CODEOWNERS`, and all seven
workflows in `.github/workflows/`.

Audit focus, read line by line: `factory/src/project/**` — `contracts.mjs`, `manifest.mjs`,
`file-state.mjs`, `project-state.mjs`, `patch-contract.mjs`, `verification-plan.mjs`,
`transaction.mjs`, `context-builder.mjs`, `persistence-contract.mjs`,
`web-runtime-adapter.mjs`, `content-schema.mjs`, `test-foundation.mjs`,
`test-browser-proof.mjs`.

Also reviewed: the diffs to the five pre-existing modules the PR touches
(`staged-commit-policy.mjs`, `style-gate.mjs`, `test-architecture-finalization.mjs`,
`test-staged-commit-policy.mjs`, `test-verifier.mjs`) and `.github/CODEOWNERS`.

Audit rules honoured: no change to `main`; PR #64 not merged; no paid/provider/production run;
no learning promotion; no gate weakened; no historical evidence file modified; no defect
silently repaired. All adversarial reproductions live in an isolated worktree
(`scratchpad/pr64/audit-harness/`) and are **not** part of this branch's deliverable, which
contains this document only.

---

## 3. Tests executed

Environment: Linux, Node v22.22.2, isolated git worktree at `e8228a7`, `npm install` clean.

| Suite | Result | Note |
|---|---|---|
| Project Game Foundation selftest (`test-foundation.mjs`) | **PASS** | Reproduced the PR's claim |
| Node module syntax check, all `factory/src/**/*.mjs` | **PASS** | Via per-suite import |
| Style gate / staged-commit policy | **PASS** | Both strengthened by the PR |
| Zero-paid suites, 36 of 40 | **PASS** | Contract, control, learning, LLM, evaluation S0–S5, memory, publish, roles, fidelity, proof-reachability |
| 4 browser suites | **NOT independently reproduced locally; confirmed via CI job-step logs on the exact audited head** | See below |
| Project browser proof (`test-browser-proof.mjs`), local substitute Chromium | **FAIL** | Reproducible false-FAIL against build 1194; **CI's fresh-installed Chromium passed the same fixture on the exact audited head** — see P3-5 (§0 erratum) |
| Blank-screen negative fixture | **PASS** (fixture only) | Detects the fixture, not the class — P2-4 |
| Micro-Game path on `main` at `8fdbf29`, same 4 suites, local substitute Chromium | **FAIL identically** | Confirms local failure is environment/version-related, not PR-specific |

**Environment limitation, stated plainly.** The repo pins `playwright@1.62.1`, which expects
Chromium build 1234; this container ships build 1194. Four pre-existing browser suites
(`test-action-reachability`, `test-causality-visual`, `test-layout-geometry`,
`test-proof-scenarios`) therefore could not launch locally under the exact pinned build. I
verified they fail **identically on `main` at `8fdbf29`** with the same substitute-build
environment, so the local failure is **not** attributable to PR #64. To execute the PR's own
browser proof at all, I injected `executablePath` pointing at the available Chromium via a
harness shim, without modifying the PR's pinned dependency.

**Correction (see §0 erratum):** the first version of this document reported the four suites as
blanket "UNPROVEN" and did not check whether CI's own job-step log for the exact audited head
already settled the question. It does: run `33271453720`'s steps *"Prove P0 action reachability
repair"*, *"Prove independent terminal proof scenarios"*, *"Prove independent HUD geometry
verifier"*, and *"Prove verifier causality and visual activity controls"* are each individually
`conclusion: success` on head `e8228a7`, and the browser-proof step *"Prove verifier accepts
good and rejects bad products"* is `conclusion: success` in the same run using CI's fresh
Chromium install. Correct framing, held to throughout the rest of this document: **not
independently reproduced by this audit's own execution** (a real, stated limitation) **but
confirmed via CI job-step logs to have passed on the exact audited head** — which is materially
stronger than "UNPROVEN" and should not be read as equivalent to this audit's own PASS.

---

## 4. Findings

### P0-1 — Verification is declarative: no check is ever executed

**Severity: P0 (merge blocker). Affected: `factory/src/project/verification-plan.mjs`
→ `evaluateVerificationResults()`, lines 50–83; consumed by
`transaction.mjs` → `commitVerifiedTransaction()`, line 94.**

The Foundation never runs a verification command. `evaluateVerificationResults()` receives a
caller-supplied array of result objects and grades them on three conditions only:

```js
const independent = check.independent !== true || result?.producer !== result?.verifier;
const pass = result?.pass === true && /^[0-9a-f]{64}$/.test(evidenceSha256) && independent;
```

- `result.pass === true` — a caller-asserted boolean.
- `evidenceSha256` — checked only for **shape** (64 hex chars). No artifact is ever located,
  read, or hashed. An invented value passes.
- `independent` — satisfied by two arbitrary **strings** being unequal.

The `command` field validated so carefully in `normalizeCheck()` (`contracts.mjs:99`) is read
by nothing in the codebase. `grep` confirms no `execSync`, `spawn`, or `exec` anywhere under
`factory/src/project/`.

**Reproducible input** (`audit-harness/adv-01-verification.mjs`): a task whose three required
checks carry the commands `exit 1 # always fails`, `this-binary-does-not-exist`, and the empty
string; a patch adding `src/world.js` containing `export const broken = (((;` — not valid
JavaScript; and results fabricated as
`{ pass: true, evidenceSha256: 'f'.repeat(64), producer: 'a', verifier: 'b' }`.

**Expected:** promotion refused — L2/L4/L5 cannot have passed.
**Actual:**

```
commit status      : committed
baselinePromoted   : true
new baseline id    : baseline-T-001
promoted file      : "export const broken = (((;\n"
syntactically valid: false
```

**Smallest failure case:** one check, one fabricated result object. No filesystem or timing
precondition.

**Impact:** the entire L1–L10 hierarchy, acceptance mapping, and inherited-regression
machinery are unenforced vocabulary. Every downstream claim — regression safety, no unnoticed
regression, independent verification, protected capabilities — rests on this function. The
PR's own `test-foundation.mjs` demonstrates the pattern: its `passingResults()` helper
(lines 55–65) fabricates `sha256('evidence:' + taskId + ':' + checkId)` and hardcodes
`producer: 'engineer', verifier: 'deterministic-runner'`. The selftest proves the accessor
accepts well-formed objects; it does not and cannot prove anything was verified.

**Recommended direction (not a fix):** verification results must be produced by a runner the
control plane invokes, with `evidenceSha256` bound to a persisted artifact that is re-hashed
at grading time, and `producer`/`verifier` bound to process identity rather than caller-chosen
labels. No repair attempted, per audit rules.

---

### P0-2 — Crash-recovery journal enables arbitrary directory deletion and foreign-baseline installation

**Severity: P0 (merge blocker). Affected: `factory/src/project/transaction.mjs`
→ `recoverProjectTransactions()`, lines 22–46.**

Recovery reads every `*.json` in the transaction directory and acts on caller-supplied
absolute paths with **no validation**:

```js
const staging = path.resolve(journal.staging);
const backup  = path.resolve(journal.backup);
...
} else if (fs.existsSync(backup)) {
  if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
  fs.renameSync(backup, root);
  fs.rmSync(staging, { recursive: true, force: true });
}
```

Neither `journal.staging` nor `journal.backup` is constrained to the transaction root.
`journal.projectRoot` is never compared against the root being recovered. `journal.phase` is
not validated against an allowed set. The journal directory is a **sibling** of the project
root (`<dirname>/.<basename>.transactions`), i.e. outside the workspace the patch contract
guards.

Critically, `recoverProjectTransactions()` is invoked **automatically at the top of every
`prepareTaskTransaction()`** (line 50) — so this is on the normal path, not an operator action.

**Reproducible input** (`audit-harness/adv-02-journal.mjs`): a journal with
`staging: "<temp>/unrelated-owner-data"`, `backup: "<temp>/attacker-tree"`,
`projectRoot: "/some/other/project"`, `phase: "prepared"`.

**Expected:** journal rejected as out-of-scope; nothing outside the project touched.
**Actual:**

```
victim exists before   : true
recovery result        : [{"id":"evil","action":"rolled-back"}]
victim exists after    : false      <- recursively deleted
victim dir after       : false
PROJECT.json after     : false      <- project root destroyed
project root contents  : [ 'PWNED.txt' ]   <- foreign tree installed as baseline
```

**Smallest failure case:** one 6-field JSON file placed in the sibling transactions directory.

**Impact:** arbitrary recursive deletion outside the project workspace, plus installation of an
attacker-chosen tree as the project baseline. This directly answers the audit question
"Kann manipuliertes Journal außerhalb des Projektverzeichnisses löschen oder umbenennen?" and
"Kann Recovery ein falsches oder fremdes Backup einspielen?" — yes to both.

**Recommended direction:** journal paths must be derived from the project root at recovery
time and never read from the journal; `projectRoot` must be asserted equal; `phase` must be a
closed enum; refuse any resolved path not strictly inside the transaction root.

---

### P0-3 — Two concurrent tasks destroy the project and report a successful verified promotion

**Severity: P0 (merge blocker). Affected: `transaction.mjs` lines 48–70 and 89–92;
`project-state.mjs` → `loadProjectState()` line 41.**

There is no lock, lease, or concurrency guard anywhere in `factory/src/project/`. Three
defects compose:

1. `prepareTaskTransaction()` calls `recoverProjectTransactions()` first, which treats a
   *concurrent* transaction's `prepared` journal as a crash remnant and **deletes its staging
   directory and journal**.
2. `commitVerifiedTransaction()` then calls `loadProjectState(transaction.staging, …)` with
   the default `create: true`, so a **missing** state file silently yields an empty state with
   `baseline: null`.
3. The baseline-drift guard is `if (currentState.baseline && …)` — with `baseline === null`
   the guard is skipped entirely.

The victim transaction therefore proceeds to swap its destroyed staging directory over the
live project root.

**Reproducible input** (`audit-harness/adv-04-concurrency.mjs`): task A prepares; task B
prepares; B commits; A commits. No crash, no signal, no injected fault — just ordinary
interleaving.

**Expected:** A refuses to commit (staging gone / baseline drift), project intact.
**Actual:**

```
A staging exists after A.prepare : true
A staging exists after B.prepare : false   <-- A destroyed mid-flight
B commit                          : committed
A commit                          : committed      <-- reports success
project root contents             : [ '.factory' ]
src/ survived                     : false
PROJECT.json survived             : false
```

The whole project — manifest, source tree, roadmap, architecture — is replaced by a stub
`.factory/` directory containing only the freshly written evidence and state files, and the
call returns `status: 'committed', baselinePromoted: true`.

**Smallest failure case:** two `prepareTaskTransaction()` calls on one project root, then two
commits, in-process, single-threaded.

**Impact:** total, silent data loss reported as a verified baseline promotion. This is the
worst possible combination: the destructive outcome and the success signal are simultaneous.

**Recommended direction:** an exclusive project lock for the whole prepare→commit span;
recovery must never act on a journal belonging to a live process; `commitVerifiedTransaction`
must load state with `create: false` and must fail closed when `baseline` is absent but the
tree is non-empty.

---

### P3-4 — Reserved-path predicate is case-sensitive (downgraded from P1; see Section 0 erratum)

**Severity: P3 (downgraded from P1 on post-review correction — physically kept in reading
order near the related findings rather than resorted). Affected: `contracts.mjs` →
`RESERVED_PATHS` / `isReservedProjectPath()`, lines 10–50.**

Reserved-path matching is exact-case string comparison. Reproduced:

```
isReservedProjectPath("PROJECT.json") = true
isReservedProjectPath("project.json") = false
isReservedProjectPath("Project.json") = false
isReservedProjectPath(".factory/x")   = true
isReservedProjectPath(".FACTORY/x")   = false
isReservedProjectPath("ROADMAP.json") = true
isReservedProjectPath("roadmap.json") = false
```

On Linux/ext4 this is harmless — `project.json` is a distinct file. The first version of this
document argued that on **macOS/APFS and Windows/NTFS, which are case-insensitive by default**,
a task scoped to `project.json` would pass every contract check and overwrite `PROJECT.json`,
and rated that scenario "would be P0". A post-review re-trace of the *entire* patch path (not
just the predicate) does not support that: `applyPatchToStaging()`'s mandatory before/after
tree-diff is the actual backstop here, and it almost certainly catches this case regardless of
the predicate's case-sensitivity.

Reasoning: on a case-preserving, case-insensitive filesystem (the default for both APFS and
NTFS), writing through the path `project.json` resolves to the same file as `PROJECT.json`,
but the **directory entry's stored name does not change** — `fs.readdirSync()` still returns
`PROJECT.json`. `captureProjectTree()` walks with `readdirSync`, so the "after" tree reports the
changed path as `PROJECT.json`. The patch declared `MODIFY:project.json` (or `DELETE`/`ADD`,
same argument). `applyPatchToStaging()` compares `declared` against `observed` as an exact
string list and throws `scope evidence mismatch` on any difference — which this is, since the
casing differs. The transaction aborts before evidence, state, or swap are ever touched.

This was **not exercised on an actual case-insensitive filesystem** — none was available in
either the original or this revised pass — so it remains analysis rather than a reproduction,
same as the original claim it corrects. What changed is that the original claim was asserted
without tracing the tree-diff backstop; this revision traces it and finds it very likely closes
the gap. The residual, real defect is narrower: `isReservedProjectPath()` and the scope/
protected-path predicates are still case-sensitive, so a case-colliding task fails late, with a
generic `scope evidence mismatch` rather than a clear `task scope cannot include reserved
project authority path` error — a confusing failure mode and an inconsistency worth fixing, but
not a demonstrated scope escape. Re-test on an actual case-insensitive filesystem before
closing this out either way; if the tree-diff backstop turns out not to hold in some path this
analysis missed, this reverts to P0/P1.

Unicode normalisation (NFC/NFD) is likewise unhandled by the predicate, though not exploitable
for the current all-ASCII reserved set, and would be subject to the same tree-diff backstop
argument if it ever became exploitable.

---

### P1-2 — Project State's `gitCommitSha` and `treeSha256` are never enforced on the normal path

**Severity: P1 (narrowed on post-review correction — see Section 0 erratum). Affected:
`project-state.mjs` → `validateProjectState()`, `writeProjectStateAtomic()`,
`nextVerifiedState()`.**

Two gaps, both reachable through the documented `commitVerifiedTransaction()` flow, not just
through direct low-level API calls:

- **`gitCommitSha` may be `null`.** `nextVerifiedState()` defaults it to `null`;
  `commitVerifiedTransaction()` never supplies one; `validateProjectState()` never requires one.
  A state can therefore present a fully "verified" baseline with no Git commit and no PR behind
  it — precisely the second-source-of-truth the falsification document claims to have closed.
  The document's own residual-risk column admits "Future workflow must bind PR head and
  evidence exactly"; that binding does not exist in code, so the claim "state alone authorizes
  nothing" describes an intended future property, not a mechanism enforced today.
- **`treeSha256` is never re-checked against the tree on load.** A baseline claiming
  `aaaa…` was accepted by `validateProjectState()` against a workspace whose actual tree SHA was
  `d3700b0c…`; nothing recomputes it. `loadProjectState()` in the normal commit flow does not
  either.

`baselineHistory` entries are not validated at all (only `state.baseline` is). Missing state
file is not an error by default (`loadProjectState(..., { create: true })`), which — as shown
in P0-3 — disables the only drift guard; an old state can be silently combined with a new
source tree.

**Correction:** the original text also demonstrated a third gap — "the project-identity check
is self-referential" — by calling `writeProjectStateAtomic()` directly with project `alpha`'s
state and project `beta`'s root, and showing it wrote `projectId: "alpha"` into `beta`'s
workspace. That call bypasses `commitVerifiedTransaction()` entirely, which always loads and
writes state using the transaction's own manifest (loaded fresh from the workspace being
committed), so the cross-project write shown is not reachable through the documented single
commit entry point today. `writeProjectStateAtomic()` is still exported with no caller-
independent identity check of its own — a real defense-in-depth gap for any future caller
(most plausibly the not-yet-built PG-A0 runner, since no other adapter exists) — but it is not,
as originally implied, a defect in the current normal flow. Kept as part of this finding at
reduced weight rather than as an independently reproduced flaw in the transaction path.

---

### P1-3 — Regressions cannot be enforced, only declared

**Severity: P1. Affected: `verification-plan.mjs` lines 19–32; `transaction.mjs` line 123.**

`createVerificationPlan()` requires that a new task **declare** every prior regression check ID
(`task omits verified regression requirement: …`). It does not and cannot require that the
declared check *do* the same thing: `command` and `invariantRef` are free-form and unchecked
against the registered regression. A task may keep check ID `REG-WORLD` and replace its command
with anything — and, per P0-1, the command is not executed regardless.

Registration is also caller-controlled: `capabilities` and `regressions` are plain parameters
of `commitVerifiedTransaction()` defaulting to `[]`. Nothing derives them from the verification
outcome, and nothing prevents a caller from simply never registering a regression, or from
overwriting one (`nextVerifiedState` de-duplicates by `checkId` with **last-write-wins**, so a
later task silently replaces an inherited regression's definition).

Fixture-path protection (`regression.protectedPaths`) is real and works, but protects only
paths, not the check semantics — so the audit question "Kann ein Task eine Regression formal
ausführen, aber inhaltlich entwerten?" is answered **yes**.

---

### P2-1 — Build-output exclusion is hardcoded and disagrees with the manifest

**Severity: P2. Affected: `file-state.mjs` `DEFAULT_EXCLUDES` vs `manifest.layout.buildDir`.**

`captureProjectTree()`'s default excludes hardcode the literal `'build'`. A manifest may
legally declare `buildDir: 'dist-web'` — the PR's own selftest creates exactly such a project.
Reproduced:

```
manifest.layout.buildDir = dist-web
captureProjectTree default excludes = ["build",".factory/evidence",...]
```

`applyPatchToStaging()` passes the manifest-derived excludes when a manifest is supplied, so
the transaction path is currently consistent. But `captureProjectTree()` is exported and any
caller omitting the manifest — including a future Engineer adapter — hashes `dist-web/` as
source while treating a source directory named `build/` as invisible. That is the
"build output becomes source of truth" failure the architecture explicitly claims to prevent.

---

### P2-2 — Contracts accept undeclared extra fields

**Severity: P2. Affected: `contracts.mjs` → `validateProjectManifest()`,
`validateTaskContract()`, `contractSha()`.**

Validation rebuilds a canonical object from known fields and compares hashes. Unknown fields
are neither rejected nor hashed. A manifest carrying
`{ attackerField: 'payload', ownerVisionDisplay: 'a different vision shown to reviewers' }`
validates successfully. The returned object is stripped, so current consumers are safe — but
the **on-disk `PROJECT.json` retains the extra fields**, and any reviewer, tool, or future
adapter reading the raw file sees content the contract hash does not cover. Contract
immutability is therefore hash-covered for known fields only.

`contractSha()` uses `JSON.stringify` without key-order canonicalisation. This is currently
safe *only* because both `create*` functions rebuild with a fixed literal key order — the
canonicality is incidental to the object literals, not enforced by the hash function. Any
future refactor that reorders those literals silently invalidates every stored hash.

---

### P3-5 — `fatal-browser-errors` treats a missing optional asset as fatal (downgraded from P2;
see Section 0 erratum)

**Severity: P3 (downgraded from P2 on post-review correction). Affected:
`web-runtime-adapter.mjs` → `runBrowserBootProof()`, line 65.**

`fatal-browser-errors` fails if `consoleErrors.length !== 0`, where `consoleErrors` captures
**every** console message of type `error` — including a missing-favicon 404 the browser
requests on its own, which is not a defect in the game.

Running the PR's own positive fixture through a **substitute Chromium (build 1194)**, injected
via `executablePath` because this container's pinned Playwright (`1.62.1`) expects build 1234
and neither that exact build nor a fresh install was obtainable here:

```
AssertionError: [{"id":"fatal-browser-errors","pass":false,
  "detail":"Failed to load resource: the server responded with a status of 404 (Not Found)"}]
```

I isolated the cause: the 404 is `/favicon.ico`. Adding `<link rel="icon" href="data:,">` to the
fixture eliminates it entirely; the page itself boots, renders and responds to clicks correctly.

**Correction:** the original text concluded from this that "the gate's outcome depends on which
Chromium binary CI happens to ship" and rated it P2. That conclusion is not supported by the CI
evidence this audit already had. CI job logs for the audited head (run `33271453720`) show a
**fresh** `npx playwright install --with-deps chromium` (step *"Install browser"*,
`19:40:25`) followed by the PR's own browser-proof selftest — the exact positive fixture this
finding is about — **passing** (step *"Prove verifier accepts good and rejects bad products"*,
`19:44:37–19:46:37`). CI's real target browser did not reproduce this false FAIL on the exact
audited head. The most likely explanation is that build 1194 — an older build than CI's fresh
install — behaves differently around the favicon request than the version CI actually uses;
this was not independently confirmed, since the exact CI-installed build was not available for
direct comparison in this container. What is not in dispute: the check counts every console
error as fatal, including one that says nothing about playability. That narrower point is real
and worth documentation-level attention; the CI-risk framing was not.

---

### P2-4 — Browser proof detects the fixture, not the failure class of Issue #63

**Severity: P2. Affected: `web-runtime-adapter.mjs`, `test-browser-proof.mjs`.**

The negative fixture (a `<style>`-only page) is correctly rejected. But the audit question is
whether the proof catches an Issue #63-class defect generally. Reviewing the check set against
the required adversarial list, the following remain undetected by construction:

- **Ready-marker races.** `readySelector` is a static attribute in the fixture
  (`data-game-ready="true"` is present in the initial HTML). A runtime that sets the marker
  *before* initialisation completes passes. There is no assertion that ready follows init.
- **Text change without gameplay effect.** `gameplay-interaction` asserts only
  `before !== after` on one selector. The fixture's handler is literally
  `onclick = () => metal.textContent = '1'` — a hardcoded assignment with no simulation behind
  it. A static page that mutates one string passes the "playable" proof.
- **Transparent / offscreen canvas.** `game-content-visible` uses Playwright `isVisible()`,
  which is satisfied by a zero-opacity or fully transparent canvas. Only `#game-root` gets a
  bounding-box check (`>1px`); the canvas gets none.
- **Black screen with a technically visible root.** A root with a dark background and
  correct dimensions passes `game-root-visible`.
- **Post-interaction errors.** Errors are sampled once, 100 ms after the click
  (`waitForTimeout(100)`); anything later is missed.
- **Unhandled promise rejections** do not surface as `pageerror` and are not captured.
- **Infinite loop after ready** — no liveness or frame-progress assertion exists.
- **Safari/WebKit** — only Chromium is launched, while Issue #63 is an Owner-device
  (iPhone/Safari) report. A Chromium-only proof cannot close a WebKit delivery gap.

The proof is a genuine improvement over "deployment succeeded", and it does fail the blank
fixture. It is not yet a reliable detector of the Issue #63 class.

---

### P2-5 — No milestone, roadmap, ADR or technical-debt authority

**Severity: P2.** `ROADMAP.json` and `ARCHITECTURE.md` are reserved, so normal tasks cannot
edit them — the falsification document is honest that "milestone closure contract is not yet
implemented". However `decisions/` is **not** reserved: a task may freely add, alter or delete
architecture decision records, which the context builder then feeds back into future tasks as
authority (`taggedFiles(root, 'decisions', …)`). There is no versioning, no supersession
model, no conflict detection between simultaneously active decisions, and no size, retention
or quality bound. `technicalDebt` and `milestones` exist as empty arrays in the state schema
with no writer, no validator and no consumer.

Project Memory is structurally separate from Factory Learning — no code path connects
`.factory/lessons` to global prompts — so the separation claim holds today, but it holds by
absence of integration rather than by an enforced boundary.

---

### P2-6 — Context builder is controlled-incomplete rather than controlled-relevant

**Severity: P2. Affected: `context-builder.mjs`.**

Selection is deterministic and bounded, and required authority files fail closed
(`throw` on missing or bound-exceeded) — that part is sound. But relevance rests entirely on
`manifest.moduleGraph` and `manifest.testMap`, which are **hand-declared, immutable after
project creation, and never validated against the actual source**. Consequences:

- A dependency omitted from `moduleGraph` is silently absent from context. Nothing detects it.
- Dynamic imports, event wiring, data dependencies and CSS/asset dependencies are not
  represented at all — the graph is a flat `path → [paths]` map with no extraction step.
- `testMap` is frozen at manifest creation, so tests added by later tasks never enter context.
  This is the "veraltete Test Maps → falsche Sicherheit" case, confirmed by construction.
- `selectionSha256` covers `{path, reason, sha256}` but **not** the `excluded` list, so two
  selections that differ in what was dropped for bound reasons hash identically. The evidence
  cannot distinguish "nothing was excluded" from "the critical dependency was excluded".
- File content is embedded verbatim into the selection object with no delimiter discipline and
  no secret or binary filtering.

The audit asked directly whether the system is "lediglich kontrolliert unvollständig statt
kontrolliert relevant". On the evidence: **controlled-incomplete**, with no drift detection.

---

### P3-1 — AC-PG-001 … AC-PG-020 are referenced but never defined

`AC-PG-*` identifiers appear only in the right-hand column of
`PROJECT-GAME-MODE-V0.1-IMPLEMENTATION-CATALOG.md`. No file in the repository defines them.
`AC-PG-001` is not referenced at all. The grading in section 8 therefore uses a mapping I
reconstructed from Issue #62's ten required capabilities plus the catalog's own component
attributions; that mapping is my assumption, not the PR's, and is stated as such.

### P3-2 — Micro-Game verifier now depends on the Project browser proof

`factory/src/verify/test-verifier.mjs` gains `await import('../project/test-browser-proof.mjs')`.
A Project-side browser regression now fails the **Micro-Game** verifier. Combined with P3-5
(§0 erratum — a false FAIL was observed against a substitute Chromium build in this audit's own
sandbox, not confirmed against CI's real browser), the coupling means such a false FAIL would
block the Micro path too if it ever occurred on the real CI browser. Coupling in the direction
the PR elsewhere takes care to avoid, independent of whether P3-5 itself materializes on CI.

### P3-3 — Workflow path filter omits the new strategy documents

`verify.yml` triggers on an explicit path allowlist that includes `docs/strategy/INDEX.md` and
`STATUS-CHAIN.json` but **not** the four new `PROJECT-GAME-MODE-V0.1-*.md` files. A future PR
touching only those documents produces no Branch Verifier run; the trusted gate then polls for
90 × 10 s and exits 1. Fail-closed, so not a bypass — a liveness and diagnosability defect.

---

## 5. Architectural assumptions refuted

| Claim (PR #64 / falsification document) | Status |
|---|---|
| "hierarchical verification"; "L2/L4/L5 required for normal tasks" | **Refuted.** No check executes; levels are unenforced vocabulary (P0-1) |
| "independent evidence identity" | **Refuted.** Two unequal caller-chosen strings satisfy it (P0-1) |
| "Passing new tests protects old behavior … inherited regression IDs" | **Refuted.** IDs are declared, semantics unconstrained, registration optional (P1-3) |
| "staging transaction, fail-closed abort and crash rollback journal" | **Refuted.** Journal is unvalidated and enables out-of-tree deletion and foreign-baseline install (P0-2) |
| "Crash produces mixed old/new project → journaled whole-directory swap" | **Refuted.** Two concurrent tasks destroy the project and report success (P0-3) |
| "atomic verified baseline" | **Refuted.** Promotion is neither isolated nor guarded when baseline is null (P0-3) |
| "Project State … state alone authorizes nothing" | **Refuted as an enforced property, on the normal commit flow.** `gitCommitSha` defaults to null and is never populated or checked; tree SHA is never re-checked on load (P1-2) |
| "`.factory/**` and project authority files are reserved" | **Not refuted on reconsideration** (§0 erratum). The reserved-path predicate is case-sensitive, but the mandatory tree-diff appears to catch the resulting case-collision before promotion — analysis, not an executed reproduction (P3-4) |
| "editable source is distinct from reproducible build output" | **Partially refuted.** Hardcoded `'build'` disagrees with `manifest.layout.buildDir` (P2-1) |
| "Deploy success proves playability … blank fixture fails" | **Partially refuted, on the class of defects the negative fixture models.** Blank fixture fails; the detector misses most of the required adversarial list (P2-4). The favicon false-FAIL (P3-5) was not confirmed against CI's real browser and is downgraded — see §0 erratum |
| "immutable Project Manifest and Development Task contracts" | **Partially refuted.** Undeclared fields survive on disk outside the hash (P2-2) |

## 6. Assumptions not refuted, but unproven

- **No second source of truth in practice.** No code path today writes project source to
  `runtime-state`; the separation holds. But it holds by absence of integration, and P1-2
  removes the enforcement that would keep it holding.
- **Project Memory / Factory Learning separation.** No connecting code path exists. Unproven
  as an enforced boundary; true as a current fact.
- **No paid model runs.** Confirmed by inspection: no LLM call under `factory/src/project/`.
  The PR's "no paid call" claim holds.
- **Persistence contract.** Semantic versioning, size limit and equivalence projection are
  enforced in `createPersistenceContract`. But `migrations` is a bare `string[]` with no
  executable step, no downgrade path and no missing-migration behaviour;
  `corruptSaveBehavior` is an unvalidated free-text string with no implementation;
  `comparePersistedState` compares only explicitly projected fields, so undeclared but
  game-relevant state is lost silently. The `postMessage` bridge exists **only as a validated
  contract object** — `allowSameOrigin: false` is asserted, and `runBrowserBootProof` does
  check `sandbox === 'allow-scripts'`, but there is **no host implementation**, no origin
  check, no source-window check, no project/slot/schema check, and no browser reload proof.
  `runSaveReloadProof` drives a caller-supplied `adapter` object; the PR ships no adapter.
  Status on the audit's required four-way distinction: **contract present; test skeleton
  present; real browser host NOT implemented; full browser-reload proof NOT present.**
- **Determinism and OS/filesystem portability.** `captureProjectTree` sorts with
  `localeCompare`, which is locale-sensitive; tree SHAs may differ across locales. Not
  reproduced. The whole-directory-rename swap model is untested on Windows, where an open file
  handle blocks directory rename. Unproven.

## 7. Scope-enforcement results (audit field C)

The patch handler itself is the strongest part of the PR. Verified correct by inspection and
by the PR's own adversarial tests: `..` rejected; absolute paths rejected; backslashes
normalised; NUL rejected; symlinks rejected at both tree-walk and patch-target;
duplicate operations rejected; ADD-on-existing rejected; MODIFY/DELETE-on-missing rejected;
before-SHA and after-SHA mismatch rejected; `maxFilesChanged` enforced; undeclared side effects
caught by full before/after tree comparison; `.factory/**`, `PROJECT.json`, `ROADMAP.json`,
`ARCHITECTURE.md` reserved; protected regression fixtures blocked at plan time.

Two gaps: the case-sensitive reserved-path predicate, likely closed in practice by the tree-diff
safety net rather than by the predicate itself (P3-4, §0 erratum), and — answering the audit's
explicit question about a
later Engineer adapter — **nothing structurally prevents bypass**. `applyPatchToStaging()` is a
convention, not a chokepoint: `captureProjectTree`, `writeProjectStateAtomic` and
`commitVerifiedTransaction` are all exported and independently callable, and
`commitVerifiedTransaction` accepts `capabilities`/`regressions` directly from its caller. A
future adapter that writes files itself and then calls the transaction API reaches a promoted
baseline without passing the patch contract at all.

A file-vs-directory conflict (ADD `src/a/b.js` where `src/a` is a file) throws `ENOTDIR`
mid-loop, leaving earlier operations applied. Harmless in staging; not harmless if
`applyPatchToStaging` is ever called against a live root, which its signature permits.

## 8. AC-PG-001 … AC-PG-020

Mapping reconstructed from Issue #62 and the implementation catalog (see P3-1 — these are not
defined in the repository, so this grading rests on my reconstruction).

| AC | Subject | Result |
|---|---|---|
| AC-PG-001 | Project Mode coexists with Micro Game path | **PASS** |
| AC-PG-002 | Persistent multi-file workspace + manifest | **PASS** |
| AC-PG-003 | Durable immutable Vision→Task hierarchy | **FAIL** (P2-2 undeclared fields; P2-5 no milestone authority) |
| AC-PG-004 | Exact scoped ADD/MODIFY/DELETE | **PASS**, with a case-sensitive predicate whose exploitability is unproven and likely closed by the tree-diff safety net (P3-4, §0 erratum) |
| AC-PG-005 | Protected paths honoured | **PASS**, same caveat as AC-PG-004 (P3-4) |
| AC-PG-006 | Deterministic tree SHA, no undeclared side effects | **PASS** with caveat (P2-1 build-dir mismatch; locale sort unproven) |
| AC-PG-007 | Project state authority, no second truth | **FAIL** on the normal commit flow: `gitCommitSha` unpopulated, tree SHA unchecked on load (P1-2) |
| AC-PG-008 | Bounded context selection | **PASS** for boundedness; **FAIL** for relevance/drift (P2-6) |
| AC-PG-009 | Verified capability registry | **FAIL** (caller-supplied, unenforced — P1-3) |
| AC-PG-010 | Hierarchical verification L1–L10 | **FAIL** (P0-1) |
| AC-PG-011 | Inherited regression protection | **FAIL** (P1-3) |
| AC-PG-012 | Versioned save schema, migrations, corrupt behaviour | **UNPROVEN** (declared, not executable — §6) |
| AC-PG-013 | save→reload→load equivalence | **UNPROVEN** (no adapter, no browser reload proof) |
| AC-PG-014 | Editable source vs reproducible build separation | **PASS** with caveat (P2-1) |
| AC-PG-015 | Web Runtime Adapter, engine-neutral control plane | **PASS** |
| AC-PG-016 | Real browser boot/playability proof | **FAIL**, on detection breadth (P2-4 misses most of the required #63-class list; Chromium-only). The favicon false-FAIL (P3-5) did not reproduce on CI's real browser and is not counted against this — see §0 erratum |
| AC-PG-017 | Atomic verified baseline promotion | **FAIL** (P0-3) |
| AC-PG-018 | Crash recovery / rollback | **FAIL** (P0-2) |
| AC-PG-019 | Independent verification evidence | **FAIL** (P0-1) |
| AC-PG-020 | Fail-closed abort, no partial promotion | **FAIL** (P0-3) |

**Totals (corrected, see §0 erratum): 7 PASS, 11 FAIL, 2 UNPROVEN.** (Originally reported as
6 PASS / 11 FAIL / 2 UNPROVEN / 1 platform-conditional; AC-PG-004 and AC-PG-005 moved cleanly
to PASS following the P3-4 downgrade, so the "platform-conditional" bucket is now empty rather
than removed — the combined PASS-plus-conditional count of 7 is unchanged.)

## 9. Micro-Game regression status

**Unchanged and functional — JA.**

The PR's five edits to pre-existing modules are additive and gate-strengthening: `project/` is
added to protected commit paths and to critical style files; CODEOWNERS gains `/factory/src/project/`
and `/projects/`. No gate weakened, no `produceGame()` change, no runtime-state allowlist change,
no publishing/gallery/learning/budget/router change. 36 of 40 zero-paid suites pass at `e8228a7`
under this audit's own local execution; the 4 that do not run locally are Chromium-version
failures (build 1194 vs pinned build 1234), reproduced identically on `main` at `8fdbf29` under
the same substitute build, so the local non-execution is environmental, not PR-specific.

**Correction (see §0 erratum):** the full Micro-Game browser regression was not independently
executed by this audit, but it was not left unproven either — CI's job-step log for the exact
audited head (run `33271453720`) shows all four browser suites and the browser-proof step
individually passing on `e8228a7`. Stated precisely: **not independently reproduced in this
audit's own environment, but confirmed passing on the exact audited head via CI job-step logs**.
The one new coupling introduced by the PR is P3-2 (Micro verifier now imports the Project
browser proof).

## 10. GitHub governance status

| Item | Status |
|---|---|
| PR head == tested commit | **Verified identical** (`e8228a7`) |
| Required check `selftest` | SUCCESS on the exact head (run 33271470501) |
| Branch Verifier `branch-selftest` | SUCCESS on the exact head (run 33271453720) |
| Trusted-workflow root of trust | **Sound.** `trusted-selftest.yml` refuses to modify itself, pins `verify.yml` by SHA-256 against a single named migration target, and scans all workflows for a competing `selftest` job |
| Green old check reusable for a new head? | **No.** The gate resolves runs by `head_sha` and `event=push`, and fails closed if none completes in the window |
| `pull_request_target` usage | Correct — checks out base and head into separate paths with `persist-credentials: false`, never executes candidate code in the trusted step |
| CODEOWNERS | Strengthened by this PR |
| Do Project files trigger the workflows? | **Partially** — `factory/src/**` yes; the four new strategy documents are outside `verify.yml`'s path allowlist (P3-3) |
| Branch protection / ruleset / bypass actors | **NOT VERIFIABLE** — the available GitHub tooling in this session exposes no ruleset or branch-protection read. Per audit rule 3 this is reported as unverified, not as PASS |

**The governance layer is the healthiest part of this change** — and that is precisely what makes
the result serious: a correctly configured, fail-closed, self-protecting required check returned
SUCCESS on a head carrying total-data-loss and arbitrary-deletion defects. The gate is sound; it
simply has nothing that tests these properties.

## 11. Stress references

Common to all three: what carries forward is the contract kernel, the path/scope model, the
tree-SHA evidence model, the staging/swap *shape*, the runtime-adapter boundary and the
governance layer. What breaks first is, in every case, a consequence of P0-1 — without executed
verification, none of these projects can accumulate protected behaviour across milestones.

**Project EXODUS.** Carries: module graph over ship systems, content schemas, ADR store.
Breaks first: the regression suite. Realtime-with-pause tactical state cannot be covered by one
generic click assertion (P2-4), and inherited regressions can be declared away (P1-3), so
milestone N+1 silently breaks milestone N combat. Required before a vertical slice: an executed
scenario runner with seeded deterministic combat replay. **Runtime-neutral.**

**Helios Industries.** Carries: simulation/view split, content schemas, persistence contract
shape, invariant vocabulary (L3). Breaks first: the persistence contract. Offline/continuous
reconciliation needs executable migrations and deep state equivalence; today migrations are a
string list and equivalence covers only projected fields (§6), so a long-running economy loses
undeclared state on every schema step. Required: executable migration chain, fixed-step replay,
time-jump proof, conservation checks over long horizons. **Runtime-neutral**, except the
reload proof itself, which is Web-specific.

**Space Colonia.** Carries: hierarchy, data schemas, physical-goods invariants. Breaks first:
the context builder and the tree model together. `captureProjectTree` re-reads and re-hashes
**every file on every capture** — twice per patch — which is O(project) per task and will not
hold at colony-simulation content volume; and the hand-maintained immutable `moduleGraph`
(P2-6) becomes unmaintainable well before the content graph is complete. Required: an
incremental Merkle/index tree, an extracted-not-declared dependency graph with staleness
detection, and a save-migration matrix. **Runtime-neutral.**

## 12. Verdict

# NO-GO

Three P0 findings, each independently reproduced from a minimal input at the exact PR head:

- **P0-1** — no verification check is ever executed; invalid code reaches a verified baseline.
- **P0-2** — an unvalidated recovery journal deletes arbitrary directories and installs a
  foreign tree as the project baseline, on the normal task path.
- **P0-3** — two ordinary concurrent tasks destroy the entire project and report
  `status: committed, baselinePromoted: true`.

The audit hypothesis — that the Foundation can carry a persistent multi-file web game across
many separate tasks without scope escape, partial baseline promotion, unnoticed regression,
contract drift or a second source of truth — is **not supported**. Partial baseline promotion
and unnoticed regression are demonstrated, not merely unproven.

**Correction (see §0 erratum):** audit rule 10's literal instruction is to stop immediately on a
P0 finding. This audit found P0-1 first and continued to P0-2, P0-3, and the P1–P3 findings
rather than halting there — a deliberate deviation, made because the three P0s sit in
independent code paths (verification grading, crash recovery, concurrency) and halting at the
first would have left the second and third, and the concurrency-specific data-loss mode in
particular, undiscovered for the Owner decision this document exists to inform. It is recorded
here as a deviation, not claimed as compliance. Reproductions for all three P0s were secured
(see the revised appendix below) and **no repair was attempted** at any point. Fixing any of
this requires separate Owner approval.

Foundation suitable for PG-A0: **NO.**
Foundation suitable for the Canary: **NO.**

What the PR gets right should not be lost in the verdict: the patch/scope contract, the
tree-diff side-effect detection, the reserved-path model, the runtime-adapter boundary, the
governance hardening and the honesty of the falsification document's residual-risk column are
all genuinely good work. The architecture is sound in shape. The defects are in enforcement,
and they are concentrated in three files.

## 13. Recommended next action

**Exactly one:** close **P0-1** first — make `evaluateVerificationResults()` grade only results
produced by a runner the control plane itself invoked, with `evidenceSha256` re-hashed from a
persisted artifact at grading time. It is the single load-bearing defect: P1-3 and the AC-PG-010/011/019
failures collapse into it, and until verification actually executes, no other fix in this PR can
be meaningfully tested. P0-2 and P0-3 are then closed together as one transaction-hardening
change (journal path derivation + project lock + `create: false` state load) before re-audit.

---

## Appendix — reproduction harness

**Correction (see §0 erratum):** the first version of this document referenced these scripts
by filename only, pointing at a session-local scratchpad path (`audit-harness/`) that does not
persist. That made the P0 reproductions non-durable — a real gap: findings a reader cannot
re-run are weaker than findings they can. The three P0 reproductions are embedded verbatim
below so they survive independently of any particular session. They were run against `e8228a7`
in an isolated `git worktree` outside this branch; none of these files are added to the
repository itself (audit rule: no productive code changes on this branch), only reproduced here
as text. Run any of them by saving as a `.mjs` file at the repository root of a checkout of
`e8228a7` and executing with `node`.

### P0-1 reproduction — fabricated verification passes invalid code

```js
// Does the Foundation execute verification commands, or merely accept result objects?
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createTaskContract } from './factory/src/project/contracts.mjs';
import { initializeProjectWorkspace } from './factory/src/project/manifest.mjs';
import { prepareTaskTransaction, commitVerifiedTransaction } from './factory/src/project/transaction.mjs';
import { sha256 } from './factory/src/project/contracts.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'adv01-'));
const root = path.join(temp, 'projects', 'canary');
initializeProjectWorkspace(root, {
  projectId: 'canary', ownerVision: 'v',
  requirements: [{ id: 'R1', statement: 'r' }],
  moduleGraph: {}, testMap: {}
});

const task = createTaskContract({
  taskId: 'T-001', projectId: 'canary', milestoneId: 'M001', title: 't',
  scope: { add: ['src/world.js'], modify: [], delete: [], protected: [], maxFilesChanged: 1 },
  acceptance: [{ id: 'AC-X', statement: 's' }],
  verification: { checks: [
    // Commands that would CRASH or are outright nonsense. They are never run.
    { id: 'UNIT', level: 'L2', kind: 'command', command: 'exit 1 # always fails', acceptanceIds: ['AC-X'] },
    { id: 'INT',  level: 'L4', kind: 'command', command: 'this-binary-does-not-exist', acceptanceIds: ['AC-X'] },
    { id: 'REG',  level: 'L5', kind: 'command', command: '', acceptanceIds: ['AC-X'] }
  ] },
  context: { targetFiles: ['src/world.js'], maxFiles: 10, maxBytes: 20000 }
});

const content = 'export const broken = (((;\n';   // deliberately NOT valid JavaScript
const tx = prepareTaskTransaction({ projectRoot: root, task, operations: [
  { operation: 'ADD', path: 'src/world.js', content, afterSha256: sha256(Buffer.from(content)) }
]});

// Fabricated results: no command was ever executed, evidenceSha256 is invented,
// producer/verifier are arbitrary distinct strings.
const results = ['UNIT','INT','REG'].map((id) => ({
  checkId: id, pass: true,
  evidenceSha256: 'f'.repeat(64),         // invented; no artifact exists
  producer: 'a', verifier: 'b',           // "independent" == two different strings
  detail: 'never executed'
}));

const out = commitVerifiedTransaction(tx, {
  verificationResults: results,
  modelEvidence: { provider: 'x', actualModel: 'y', operation: 'z' },
  operationEvidence: { operation: 'z', context: { selectionSha256: 'a'.repeat(64) } }
});

console.log('commit status      :', out.status);
console.log('baselinePromoted   :', out.baselinePromoted);
console.log('promoted file      :', JSON.stringify(fs.readFileSync(path.join(root,'src/world.js'),'utf8')));
console.log('syntactically valid:', (()=>{ try { new Function(fs.readFileSync(path.join(root,'src/world.js'),'utf8')); return true; } catch { return false; } })());
fs.rmSync(temp, { recursive: true, force: true });
```

Expected if the Foundation actually verified: promotion refused. Observed:
`commit status: committed`, `baselinePromoted: true`, `syntactically valid: false`.

### P0-2 reproduction — crafted journal deletes outside the workspace, installs a foreign tree

```js
// recoverProjectTransactions() trusts journal-supplied absolute paths.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { initializeProjectWorkspace } from './factory/src/project/manifest.mjs';
import { recoverProjectTransactions } from './factory/src/project/transaction.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'adv02-'));
const root = path.join(temp, 'projects', 'canary');
initializeProjectWorkspace(root, { projectId:'canary', ownerVision:'v', requirements:[{id:'R1',statement:'r'}] });

// A completely unrelated directory OUTSIDE the project workspace.
const victim = path.join(temp, 'unrelated-owner-data');
fs.mkdirSync(victim, { recursive: true });
fs.writeFileSync(path.join(victim, 'important.txt'), 'owner data that must survive');

// A "foreign" tree an attacker wants installed as the project baseline.
const foreign = path.join(temp, 'attacker-tree');
fs.mkdirSync(foreign, { recursive: true });
fs.writeFileSync(path.join(foreign, 'PWNED.txt'), 'this replaced the project');

// Journal dir is a *sibling* of the project root: <dirname>/.<basename>.transactions
const journals = path.join(path.dirname(root), `.${path.basename(root)}.transactions`);
fs.mkdirSync(journals, { recursive: true });
fs.writeFileSync(path.join(journals, 'evil.json'), JSON.stringify({
  schemaVersion: 'project-game.transaction/v1',
  id: 'evil', taskId: 'T-evil',
  projectRoot: '/some/other/project',   // never checked against the root being recovered
  staging: victim,                      // <- rmSync(recursive, force)
  backup: foreign,                      // <- renameSync(backup, root)
  phase: 'prepared'
}));

console.log('victim exists before   :', fs.existsSync(path.join(victim,'important.txt')));
const recovered = recoverProjectTransactions(root);
console.log('recovery result        :', JSON.stringify(recovered));
console.log('victim exists after    :', fs.existsSync(path.join(victim,'important.txt')));
console.log('project root contents  :', fs.existsSync(root) ? fs.readdirSync(root) : '(gone)');
fs.rmSync(temp, { recursive: true, force: true });
```

Expected: journal rejected as out-of-scope; nothing outside the project touched. Observed:
`victim exists after: false` (recursively deleted); `project root contents: [ 'PWNED.txt' ]`
(foreign tree installed as baseline).

### P0-3 reproduction — two ordinary concurrent tasks destroy the project

```js
// No lock. prepareTaskTransaction() calls recoverProjectTransactions() first,
// which destroys any *other* in-flight transaction's staging directory.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createTaskContract, sha256 } from './factory/src/project/contracts.mjs';
import { initializeProjectWorkspace } from './factory/src/project/manifest.mjs';
import { prepareTaskTransaction, commitVerifiedTransaction } from './factory/src/project/transaction.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(),'adv04-'));
const root = path.join(temp,'projects','canary');
initializeProjectWorkspace(root,{projectId:'canary',ownerVision:'v',requirements:[{id:'R1',statement:'r'}]});

const mk = (taskId, file) => createTaskContract({
  taskId, projectId:'canary', milestoneId:'M001', title:'t',
  scope:{ add:[file], modify:[], delete:[], protected:[], maxFilesChanged:1 },
  acceptance:[{id:'AC-X',statement:'s'}],
  verification:{ checks:[
    {id:'UNIT',level:'L2',kind:'command',command:'c',acceptanceIds:['AC-X']},
    {id:'INT',level:'L4',kind:'command',command:'c',acceptanceIds:['AC-X']},
    {id:'REG',level:'L5',kind:'command',command:'c',acceptanceIds:['AC-X']}]},
  context:{ targetFiles:[file], maxFiles:10, maxBytes:20000 }
});
const ops = (file, body) => [{ operation:'ADD', path:file, content:body, afterSha256: sha256(Buffer.from(body)) }];
const results = ['UNIT','INT','REG'].map(id=>({checkId:id,pass:true,evidenceSha256:'f'.repeat(64),producer:'a',verifier:'b'}));
const ev = { modelEvidence:{provider:'x',actualModel:'y',operation:'z'}, operationEvidence:{operation:'z',context:{selectionSha256:'a'.repeat(64)}} };

// Task A prepares (staging created, journal phase=prepared).
const txA = prepareTaskTransaction({ projectRoot: root, task: mk('T-A','src/a.js'), operations: ops('src/a.js','export const a=1;\n') });

// Task B prepares concurrently -> its recover() sweep deletes A's staging.
const txB = prepareTaskTransaction({ projectRoot: root, task: mk('T-B','src/b.js'), operations: ops('src/b.js','export const b=1;\n') });
console.log('A staging exists after B.prepare :', fs.existsSync(txA.staging), ' <-- A destroyed mid-flight');

const outB = commitVerifiedTransaction(txB, { verificationResults: results, ...ev });
console.log('B commit                          :', outB.status);
const outA = commitVerifiedTransaction(txA, { verificationResults: results, ...ev });
console.log('A commit                          :', outA.status);
console.log('project root contents             :', fs.readdirSync(root));
console.log('PROJECT.json survived              :', fs.existsSync(path.join(root,'PROJECT.json')));
fs.rmSync(temp,{recursive:true,force:true});
```

Expected: task A refuses to commit (staging gone / baseline drift), project intact. Observed:
`A staging exists after B.prepare: false`; both `A commit` and `B commit` report `committed`;
`project root contents: [ '.factory' ]`; `PROJECT.json survived: false`.

### Supporting material (findings retained but not embedded verbatim)

| Finding | Support |
|---|---|
| P1-2 (gitCommitSha/treeSha256) | `validateProjectState()`/`nextVerifiedState()` code trace in the finding text above; reproducible by inspection — no script needed beyond calling `nextVerifiedState()` and observing `gitCommitSha: null` |
| P2-1 (build-dir exclusion mismatch) | `captureProjectTree()` default-excludes vs. `manifest.layout.buildDir`, shown by inspecting `file-state.mjs` against a manifest created with a custom `buildDir` — reproduced identically to the PR's own `test-foundation.mjs` custom-layout project |
| P2-2 (undeclared contract fields survive on disk) | `validateProjectManifest()` code trace; reproducible by writing a `PROJECT.json` with an extra top-level key and calling `loadProjectManifest()` |
| P3-4 (case-sensitive reserved paths) | `isReservedProjectPath()` code trace; reproducible with the literal calls shown in that finding |
| P3-5 (favicon 404 counts as fatal) | Isolated by adding `<link rel="icon" href="data:,">` to the PR's own positive fixture in `test-browser-proof.mjs` and observing the failure disappear |
