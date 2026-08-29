# Project Game Mode v0.1 — Independent Adversarial Audit

**Verdict: NO-GO.** Three independent P0 findings were reproduced against the exact PR head.

Audit date: 2026-08-29. Audit posture: adversarial. The goal was to falsify the Foundation's
central safety claims, not to confirm them. A green required check was explicitly not treated
as evidence of correctness — and, as shown below, the green check on this exact head coexists
with total-data-loss and arbitrary-file-deletion defects.

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
| 4 browser suites | **NOT EXECUTABLE** | See below — environment, not PR |
| Project browser proof (`test-browser-proof.mjs`) | **FAIL under full Chromium** | Reproducible false-FAIL, F-10 |
| Blank-screen negative fixture | **PASS** (fixture only) | Detects the fixture, not the class — F-11 |
| Micro-Game path on `main` at `8fdbf29`, same 4 suites | **FAIL identically** | Confirms pre-existing/environmental |

**Environment limitation, stated plainly.** The repo pins `playwright@1.62.1`, which expects
Chromium build 1234; this container ships build 1194. Four pre-existing browser suites
(`test-action-reachability`, `test-causality-visual`, `test-layout-geometry`,
`test-proof-scenarios`) therefore could not launch. I verified these fail **identically on
`main` at `8fdbf29`** with the same environment, so they are **not** attributable to PR #64.
To execute the PR's own browser proof I injected `executablePath` pointing at the available
Chromium via a harness shim, without modifying the PR's pinned dependency.

Per audit rule 3 ("no PASS statement where a relevant test could not be executed"), the
following are reported as **UNPROVEN, not PASS**: the full Micro-Game browser regression set,
and any claim that the browser proof behaves correctly on the CI headless-shell binary beyond
what run 33271470501 asserts.

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

### P1-1 — Reserved-path protection is case-sensitive and fails on the Owner's own platforms

**Severity: P1. Affected: `contracts.mjs` → `RESERVED_PATHS` / `isReservedProjectPath()`,
lines 10–50.**

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

On Linux/ext4 this is harmless — `project.json` is a distinct file. On **macOS/APFS and
Windows/NTFS, which are case-insensitive by default**, a task scoped to `project.json`
passes every contract check and then overwrites `PROJECT.json`: the immutable project
manifest, the Owner Vision, the requirements and the contract hash. Issue #63 establishes that
the Owner's devices are an iPhone and a laptop, and PR #61 addressed Safari specifically, so a
macOS developer path is a realistic assumption rather than a theoretical one.

I classify this **P1 rather than P0** only because I could not execute the filesystem-level
overwrite in this Linux container; the predicate defect is confirmed, the exploitation is
inferred. On a case-insensitive filesystem it is a scope escape onto project authority files
and would be P0. It should be re-tested on macOS before any severity is settled.

Unicode normalisation (NFC/NFD) is likewise unhandled, though not exploitable for the current
all-ASCII reserved set.

---

### P1-2 — Project State is not bound to Git, to the tree it describes, or to its own project

**Severity: P1. Affected: `project-state.mjs` → `validateProjectState()`,
`writeProjectStateAtomic()`, `nextVerifiedState()`.**

Four separate gaps, all reproduced (`audit-harness/adv-03-misc.mjs`):

- **The project-identity check is self-referential.** `writeProjectStateAtomic()` calls
  `validateProjectState(state, state.projectId)` — comparing the state's own field to itself.
  I wrote project `alpha`'s state, carrying a forged baseline, into project `beta`'s workspace
  root; it was accepted and persisted with `projectId: "alpha"`.
- **`gitCommitSha` may be `null`.** `nextVerifiedState()` defaults it to `null` and
  `validateProjectState()` never requires it. A state can therefore present a fully "verified"
  baseline with no Git commit and no PR behind it — precisely the second-source-of-truth the
  falsification document claims to have closed. The document's own residual-risk column admits
  "Future workflow must bind PR head and evidence exactly"; that binding does not exist, so the
  claim "state alone authorizes nothing" is **structurally true only by convention**, since
  nothing consumes `gitCommitSha`.
- **`treeSha256` is never re-checked against the tree.** A baseline claiming
  `aaaa…` was accepted against a workspace whose actual tree SHA was `d3700b0c…`. Nothing
  recomputes on load.
- **Missing state file is not an error by default.** `loadProjectState(..., { create: true })`
  is the default and returns `baseline: null`, which — as shown in P0-3 — disables the only
  drift guard. An old state can be silently combined with a new source tree.

`baselineHistory` entries are not validated at all (only `state.baseline` is).

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

### P2-3 — Browser proof produces a reproducible false FAIL on benign asset 404s

**Severity: P2. Affected: `web-runtime-adapter.mjs` → `runBrowserBootProof()`, line 65.**

`fatal-browser-errors` fails if `consoleErrors.length !== 0`, where `consoleErrors` captures
**every** console message of type `error` — including a missing-favicon 404 the browser
requests on its own.

Running the PR's own positive fixture under full Chromium:

```
AssertionError: [{"id":"fatal-browser-errors","pass":false,
  "detail":"Failed to load resource: the server responded with a status of 404 (Not Found)"}]
```

I isolated the cause: the 404 is `/favicon.ico`. Adding `<link rel="icon" href="data:,">` to the
fixture eliminates it entirely. The page itself boots, renders and responds to clicks correctly.

The CI headless-shell binary does not request a favicon, which is why run 33271470501 is green.
**The gate's outcome depends on which Chromium binary CI happens to ship, not on the game.**
Any real project with one missing optional asset fails a gate that has nothing to say about
playability — the standard precondition for a gate being weakened or bypassed later.

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
A Project-side browser regression now fails the **Micro-Game** verifier. Combined with P2-3,
a favicon-class false FAIL in the Project fixture blocks the Micro path. Coupling in the
direction the PR elsewhere takes care to avoid.

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
| "Project State … state alone authorizes nothing" | **Refuted as an enforced property.** `gitCommitSha` may be null, tree SHA never re-checked, project identity check self-referential (P1-2) |
| "`.factory/**` and project authority files are reserved" | **Refuted on case-insensitive filesystems** (P1-1) |
| "editable source is distinct from reproducible build output" | **Partially refuted.** Hardcoded `'build'` disagrees with `manifest.layout.buildDir` (P2-1) |
| "Deploy success proves playability … blank fixture fails" | **Partially refuted.** Blank fixture fails, but the detector misses most of the class and false-FAILs on a favicon (P2-3, P2-4) |
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

Two gaps: case-insensitivity (P1-1), and — answering the audit's explicit question about a
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
| AC-PG-004 | Exact scoped ADD/MODIFY/DELETE | **PASS** on case-sensitive FS; **FAIL** on case-insensitive (P1-1) |
| AC-PG-005 | Protected paths honoured | **FAIL** (P1-1) |
| AC-PG-006 | Deterministic tree SHA, no undeclared side effects | **PASS** with caveat (P2-1 build-dir mismatch; locale sort unproven) |
| AC-PG-007 | Project state authority, no second truth | **FAIL** (P1-2) |
| AC-PG-008 | Bounded context selection | **PASS** for boundedness; **FAIL** for relevance/drift (P2-6) |
| AC-PG-009 | Verified capability registry | **FAIL** (caller-supplied, unenforced — P1-3) |
| AC-PG-010 | Hierarchical verification L1–L10 | **FAIL** (P0-1) |
| AC-PG-011 | Inherited regression protection | **FAIL** (P1-3) |
| AC-PG-012 | Versioned save schema, migrations, corrupt behaviour | **UNPROVEN** (declared, not executable — §6) |
| AC-PG-013 | save→reload→load equivalence | **UNPROVEN** (no adapter, no browser reload proof) |
| AC-PG-014 | Editable source vs reproducible build separation | **PASS** with caveat (P2-1) |
| AC-PG-015 | Web Runtime Adapter, engine-neutral control plane | **PASS** |
| AC-PG-016 | Real browser boot/playability proof | **FAIL** (P2-3 false FAIL; P2-4 misses the #63 class; Chromium-only) |
| AC-PG-017 | Atomic verified baseline promotion | **FAIL** (P0-3) |
| AC-PG-018 | Crash recovery / rollback | **FAIL** (P0-2) |
| AC-PG-019 | Independent verification evidence | **FAIL** (P0-1) |
| AC-PG-020 | Fail-closed abort, no partial promotion | **FAIL** (P0-3) |

**Totals: 6 PASS, 11 FAIL, 2 UNPROVEN, 1 platform-conditional.**

## 9. Micro-Game regression status

**Unchanged and functional — JA, with one stated limitation.**

The PR's five edits to pre-existing modules are additive and gate-strengthening: `project/` is
added to protected commit paths and to critical style files; CODEOWNERS gains `/factory/src/project/`
and `/projects/`. No gate weakened, no `produceGame()` change, no runtime-state allowlist change,
no publishing/gallery/learning/budget/router change. 36 of 40 zero-paid suites pass at `e8228a7`;
the 4 that do not are Chromium-version failures reproduced identically on `main` at `8fdbf29`.

Limitation: the full Micro-Game browser regression could not be executed in this environment,
so it is reported **UNPROVEN**, not PASS. The one new coupling is P3-2.

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

Per audit rule 10, the audit was stopped on P0 discovery, reproductions were secured, and **no
repair was attempted**. Fixing any of this requires separate Owner approval.

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

Adversarial scripts, run against `e8228a7` in an isolated worktree, deliberately **not**
committed to this branch (audit rule: no productive code changes; findings must not be
concealed by fixture edits):

| Script | Finding |
|---|---|
| `adv-01-verification.mjs` | P0-1 |
| `adv-02-journal.mjs` | P0-2 |
| `adv-04-concurrency.mjs` | P0-3 |
| `adv-03-misc.mjs` | P1-1, P1-2, P2-1, P2-2 |
| `probe-proof404.mjs` | P2-3 |
| `pw-shim.mjs` | Chromium 1194/1234 mismatch shim |

Each is self-contained, uses only `node:` builtins plus the modules under audit, creates its own
`mkdtemp` workspace, and cleans up. They can be re-created from the reproduction steps recorded
in each finding above.
