# Game Factory — Reliability / Failure-Mode Audit — 2026-08-28

Scope: zero-paid falsification sweep of `Bartekkk87/game-factory` at `0ce14ab`
(after PR #18 / #19 / #20 / #21).
No paid game run, no OpenRouter/DeepSeek comparison run, no LLM call of any kind
was made for this audit. Every finding below is reproduced deterministically from
the checked-in code, the checked-in durable run evidence, or a browser fixture
driven by the repository's own `factory/src/verify/harness.mjs`.

---

## A. Executive Verdict

### REPAIR BEFORE CANARY #4

Canary #4 with the frozen Harbor Courier brief would almost certainly fail again,
on the same two Owner requirements, for a reason none of the three repairs so far
has touched. This is not a prediction — it was measured: replaying the **real
Canary #3 best candidate** (`runs/20260828-043617/attempt-05/index.html`) through
**today's fully repaired HEAD** turns `MH-04` from FAIL to PASS (PR #20 works, on
real production evidence) and turns `MH-08` from FAIL to PASS, but leaves `MH-06`
(`state_reached: success`) and `MH-07` (`restart_after_terminal`) failing exactly
as before. The `success-proof` scenario ran the full 75 s of deterministic active
input and ended in `gameover` with the win state never approached.

The root cause is upstream of all three repairs: the generic input harness cannot
move a player character. Its key policy presses one key at a time for 110 ms in a
fixed cycle in which every direction is cancelled by its opposite. Measured against
a correctly-built navigate→collect→deliver fixture, 40 seconds of continuous active
input produced a **maximum displacement of 37 px on a 960×540 field**, score 0, and
zero mechanic events — statistically indistinguishable from the idle control. Any
game whose objectives require locomotion is unprovable by construction, no matter
how well the Engineer builds it.

The three canary defects found so far were real and their repairs hold under
regression (verified below). But they were the three defects the existing fixtures
were *able* to express. Every verifier fixture in the repository is an
"any-keydown-scores-and-wins" game; none requires the harness to go anywhere. The
factory has therefore been converging on a test surface that structurally excludes
its own dominant failure mode. That is the honest answer to the meta-question in
§10: the pattern is *mostly healthy stabilisation with one unhealthy blind spot*,
and the blind spot is currently load-bearing.

This is a repair, not a redesign. The information needed to close it already exists
in `INPUT_PLAN` / `POINTER_PATH`; it is simply never propagated into the proof plan,
the Director contract, or the Engineer prompt, and action reachability is never
checked before Engineer spend. No new orchestrator, control plane, agent swarm,
reviewer role, or database is warranted by anything in this audit.

---

## B. Reliability Scorecard

| Component | Verdict | Basis |
|---|---|---|
| Owner Contract | **PASS** | Deterministic decomposition, frozen SHA, unknowns preserved, MH/NG immutable. `test-owner-contract.mjs` + `test-titan-candidate-validation.mjs` cover provenance. |
| Director | **PASS WITH LIMITS** | Exactly-one AC + probe per requirement enforced; unsupported evidence kinds and unsupported verifier states fail closed. Limit: a single malformed Director JSON fail-closes the whole paid run with no re-ask. |
| Engineer Build | **PASS WITH LIMITS** | Fail-closed on invalid output and budget block. Limit: prompt never discloses the actual verifier input policy (D-1). |
| Repair | **PASS** | Best-so-far retention proven on Fixtures 6 & 8 and on real Canary #3 evidence (best = attempt-03 @ 3 checks retained across two regressions to 4). |
| Fresh Rebuild | **FAIL** | Escalation is gated on a failure signature that embeds measured floats; it never matches. `freshRebuilds: 0` on Canary #3 across a 5-attempt plateau (D-2). |
| Verifier (technical) | **PASS WITH LIMITS** | Layered checks work; `input_causality` can be satisfied by "active survived, idle died" with zero score and zero events (D-5). |
| Proof Reachability | **PASS WITH LIMITS** | Structural/terminal reachability is compiled and fail-closed before Engineer spend. Temporal reachability silently degrades for rounds > 120 s and for non-English second declarations (D-3). |
| **Action Reachability** | **FAIL** | Not modelled anywhere. Measured hard bound of ~37 px of player travel per session (D-1). |
| Product Fidelity | **PASS WITH LIMITS** | Harness-owned evidence classes are sound and did the real work on Canary #3. Three self-attestation paths remain unhardened (D-4). |
| Evidence Integrity | **PASS WITH LIMITS** | Schema-validated, fail-closed, candidate SHA bound. Limit: an uncaught throw in verification (Playwright/FS) leaves no `RUN-EVIDENCE.json` and skips learning entirely (D-6). |
| Learning Root Cause | **PASS WITH LIMITS** | Deterministic, no LLM path, correctly silent when evidence is thin. Cannot falsify the verifier vocabulary it duplicates (D-7). |
| Learning Lifecycle | **PASS** | Idempotent across repeated invocation; candidates inactive; activation requires human-merge on protected layers. Verified 3× on two synthetic failed runs. |
| Cost / Budget | **PASS** | Reservation precheck, stage budgets, provider-reported cost preferred, missing usage → `accountingComplete: false` → gate fails and further paid calls are blocked. **Zero LLM imports in `factory/src/learning/`.** |
| GitHub Workflow Reliability | **PASS WITH LIMITS** | 60-minute job cap is adequate for a Harbor-shaped run but is exceeded by a full success path on a game whose round length the regex cannot read (D-8). |
| Cross-Game Generality | **FAIL** | Verifier fixtures are uniformly "keydown = progress". Technical verifier still uses the raw `won`/`gameover` vocabulary while every other layer was migrated to canonical semantics (D-9). |

---

## C. Failure-Mode Matrix

| Failure mode | Reproduced | Current protection | Result | Severity |
|---|---|---|---|---|
| **A. Production pipeline** | | | | |
| Normal build → verify | yes (fixture) | contract + fidelity | correct | — |
| Repair improves (8→3) | yes | `evaluateRepairProgress` | best updated | — |
| Worse repair after better (3→6) | yes | best-so-far | best held at 3 | — |
| New runtime error with *fewer* failures | yes | `newRuntimeErrors` → regressed | not accepted as base | — |
| Same error over several attempts | yes (real run) | signature escalation | **never fires** | **P1** |
| Slightly different signature, same problem | yes (T2) | signature escalation | **never fires** | **P1** |
| Polish regression | code-read | stable candidate restored | correct | — |
| Debug exhaustion | yes (real run) | fail-closed + best retained | correct | — |
| Budget exhaustion / stage limit | code-read | precheck + `BudgetError` | fail-closed | — |
| Provider 429/5xx | code-read | 6 attempts, backoff | correct | — |
| Incomplete usage response | code-read | `accountingComplete=false`, gate fails | fail-closed | — |
| Run abort between phases (verifier throw) | code-read | none | **no evidence, no learning** | **P1** |
| **B. Repair stagnation** | | | | |
| Semantic stagnation detection | yes | raw JSON signature incl. floats | **absent in practice** | **P1** |
| Identical candidate SHA | code-read | `sameCandidate` | works, but rare | — |
| **C. Proof reachability** | | | | |
| Success + failure both required | yes (fixture) | independent scenarios | correct | — |
| 30–120 s rounds | yes | declared + 5 s | correct | — |
| Round > 120 s | yes (T5) | regex caps at 120 | **silently under-windowed, plan passes** | **P1** |
| Round declared in German | yes (T5) | regex is English-only | **falls back to 125 s** | **P2** |
| Unknown state (`dead`, `completed`, `timeout`) | yes (T4) | canonical map | **fail-closed correctly** | — |
| Restart proof without terminal scenario | yes | `routeProbe` → empty coverage | fail-closed | — |
| **D. Action reachability** | | | | |
| WASD/arrow navigation to a target | **yes (fixture + real replay)** | **none** | **unreachable** | **P0** |
| Navigate → collect → deliver | **yes (fixture)** | **none** | **0 events in 40 s** | **P0** |
| Space / Enter / click-anywhere | yes | fixed cycle | reachable | — |
| Click a specific on-screen target | code-read | 6 fixed pointer points | reachable only by luck | P2 |
| Sequential multi-objective | implied by above | none | unreachable | P0 |
| **E. Terminal / restart** | | | | |
| `won`/`gameover`/`failed` aliasing | yes | `state-semantics.mjs` | correct | — |
| Terminal held, then restart proven separately | yes (fixture + replay) | `restartAtEnd` after terminal | correct | — |
| Post-terminal input leaks and restarts the game | **not reproduced** (0/6 sessions) | `activeInputAllowed()` guard | guard held | P3 (see Known Limits) |
| Unknown terminal state | yes | fail-closed at plan compile | correct | — |
| **F. Evidence integrity** | | | | |
| Missing `RUN-EVIDENCE.json` | yes (synthetic) | `analyzeFailedProductionRun` throws | fail-closed | — |
| Technical PASS + fidelity FAIL | yes (real run) | release gate | correct | — |
| Partial run without run evidence | code-read | none | silent gap | P2 |
| **G. Product fidelity spoofing** | | | | |
| MH + `event` emitted on title screen | yes | forced `correlated_gameplay` | **rejected** | — |
| MH + `event_value_change` at t=0.05 s | **yes** | none | **accepted** | **P2** |
| MH + `event_absent` (vacuous) | **yes** | none | **accepted** | **P2** |
| NG + `event` self-attested | **yes** | none | **accepted** | **P2** |
| `hud_clear` claimed while overlapping | code-read | independent canvas probe | rejected | — |
| **H. Owner contract / Director boundary** | | | | |
| MH/NG preserved, unknowns not invented | yes | frozen contract + SHA | correct | — |
| Illegal probe kind | yes | `EVIDENCE_KIND_SET` | fail-closed | — |
| **I–L. Learning** | | | | |
| Failed run → dossier + one inactive candidate | yes (synthetic) | orchestration | correct | — |
| Learning run twice/three times | yes | receipt + candidate reuse | **1 candidate, no flood** | — |
| Verifier wrong, runtime right | **yes (synthetic)** | duplicated alias map | **misdiagnosed as reachability** | **P2** |
| Real failure, no determinable cause | yes (synthetic) | confidence threshold | **no invented cause, no candidate** | — |
| **M. Cost/budget** | | | | |
| Hidden `chat()` in learning | yes (grep) | none needed | **no LLM import exists** | — |
| **N. Workflow** | | | | |
| Worst-case wallclock vs 60-min cap | computed from real ledger | `timeout-minutes: 60` | **exceeded on undetected round length** | **P1** |
| Concurrent push to `main` | code-read | no pull/rebase/retry | evidence commit can fail | P2 |

---

## D. Defects found

Only reproducible findings are listed. Each carries the evidence needed to re-run it.

---

### D-1 — Generic input harness cannot produce locomotion — **P0**

**1. Symptom.** A correctly built game whose objectives require moving a player
character can never reach its own success state under the verifier, so
`state_reached: success`, `restart_after_terminal`, `score_change` and every
`correlated_gameplay` event tied to a movement mechanic fail for the entire life of
the run. The repair loop then burns all attempts on an unwinnable verification.

**2. Reproducible evidence.**

*(a) Purpose-built fixture.* A navigate→collect→deliver game built on the real
`engine/gf-engine.js` via the real `assemble()`, driven by the real `runSession()`,
960×540 field, 240 px/s player, pickup ~370 px from spawn, 40 s round:

```
states.end        : { state: "gameover", score: 0, maxDistFromSpawn: 37 }
idleEnd           : { state: "gameover", score: 0, maxDistFromSpawn: 0 }
events            : state_changed, state_changed, state_changed, game_over@40.015s
technicalFailures : input_causality: active(score+0,events+0,end=gameover)
                    vs idle(score+0,events+0,end=gameover)
```

Zero `cargo_picked_up`, zero `delivery_completed` in 40 s of continuous active
input. The player never left a 37 px radius around its spawn point.

*(b) Real production candidate, replayed against today's HEAD.* Canary #3's
attempt-05 candidate re-verified with a freshly compiled proof plan:

```
success-proof : inputMode=active, seconds=75, stopStates=[success]
                endState = "gameover"          <-- ran the full window, never won
MH-04 state_reached  PASS  (state failure reached, observed=gameover)   <- PR #20 works
MH-08 layout         PASS                                               <- PR #20 works
MH-06 state_reached  FAIL  (state success not reached in verifier scenarios)
MH-07 restart        FAIL  (success-proof did not reach success (end=gameover))
```

**3. Root cause.** `factory/src/verify/harness.mjs`:

```js
const PLAY_KEYS = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
                   'Space','KeyW','KeyA','KeyS','KeyD','Enter'];
keyEveryMs: 190, keyHoldMs: 110
```

One key is held at a time for 110 ms, then released, then the next key in the cycle
is held. `ArrowLeft` is cancelled by `ArrowRight`, `ArrowUp` by `ArrowDown`, `KeyA`
by `KeyD`, `KeyW` by `KeyS`. Net displacement per full cycle is zero, and the
instantaneous bound is one key-hold: 240 px/s × 0.110 s = 26.4 px (37 px observed,
from diagonal accumulation). The pointer follows six fixed screen coordinates, so
click-a-target games are reachable only by coincidence. Nothing in the factory
models this constraint: `compileProofPlan` validates *structural* and *temporal*
reachability but never *action* reachability, and neither `factory/prompts/director.md`
nor `factory/prompts/engineer.md` nor `skills/*.md` discloses the input policy — they
warn only against "lucky collisions, rare spawns or precise aim".

**4. Affected components.** `factory/src/verify/harness.mjs` (`INPUT_PLAN`,
`POINTER_PATH`); `factory/src/verify/proof-plan.mjs`; `factory/prompts/director.md`;
`factory/prompts/engineer.md`; `skills/directing.md`; `skills/engineering.md`.

**5. Why existing tests did not catch it.** Every verifier fixture in the repository
is an "any-keydown = progress" game. `test-proof-scenarios.mjs` reaches `won` in
350 ms because `keydown` sets `score = 10` unconditionally; `examples/fixtures/green`
scores on any key or click; `test-verifier.mjs`, `test-causality-visual.mjs` and
`test-layout-geometry.mjs` follow the same shape. **No fixture in the repository
requires the harness to travel anywhere**, so the suite cannot express the failure
regardless of how many times it runs.

**6. Minimal fix (no new component).** Two options, in ascending order of scope; both
stay inside existing files and neither weakens a gate:

- **Fix A — publish the constraint (smallest).** Serialise `INPUT_PLAN` /
  `POINTER_PATH` into `gdd.proofPlan.actionPolicy`, include it verbatim in the
  Director and Engineer prompts, and state the derived bound ("the verifier cannot
  translate the player more than ~1 key-hold from spawn; required evidence must not
  depend on the player reaching a position"). This makes the constraint contractual
  instead of hidden, without touching the harness.
- **Fix B — make the policy capable of locomotion.** Replace the single-key cycle
  with a bounded deterministic *sweep* — e.g. hold one direction for N consecutive
  ticks before switching, deterministic and seeded, still game-agnostic and still
  free of any game-specific hook or test backdoor. This is a change to
  `INPUT_PLAN`/the key scheduler only.

Fix A is mandatory and sufficient to unblock a *meaningful* Canary #4; Fix B is what
actually widens the class of games the factory can produce. Neither introduces a new
architectural layer.

**7. Regression fixture.** `factory/src/verify/test-action-reachability.mjs`: the
courier fixture above, asserting either (Fix A) that the compiled proof plan carries
an explicit `actionPolicy` and that a probe depending on player translation is
rejected before Engineer spend, or (Fix B) that the harness reaches a target
≥ 300 px from spawn within the base window. Must sit in `verify.yml` next to the
existing proof-scenario job.

**8. Risk of the fix.** Fix A: near zero — additive contract metadata plus prompt
text; the risk is that the Director now legitimately rejects Harbor-shaped Must-Haves
that the Owner cares about, which is the correct fail-closed behaviour and must be
surfaced to the Owner rather than silently relaxed. Fix B: moderate — a directional
sweep changes every existing verifier baseline, so `test-verifier`,
`test-causality-visual` and `test-layout-geometry` must be re-proven; it must not be
allowed to weaken the idle control (both sessions must keep the same seed and the
same start impulse).

**9. Blocks Canary #4.** **Yes.** With the frozen Harbor brief this defect is proven
to reproduce on today's HEAD.

---

### D-2 — Repair-stagnation escalation never fires — **P1**

**1. Symptom.** The factory can spend all five attempts producing variants of the
same unsolved problem. Fresh rebuild is never triggered.

**2. Reproducible evidence.** *Synthetic:* two attempts with identical failed-check
sets differing only in `fps=57` vs `fps=58` and `3.41%` vs `3.44%` pixel diff produce
different signatures → `sameFailure === false`. *Real:* `runs/20260828-043617` has
trajectory `10 → 6 → 3 → 4 → 4` with `"freshRebuilds": 0` and an `escalations` array
containing only regression notes, no stagnation trigger. Canary #2's `7→7→7→5→7` is
the same pattern.

**3. Root cause.** `factory/src/pipeline/run.mjs:failureSignature()` hashes
`[f.id, f.detail]` verbatim. `detail` carries measured floats from `fps_ok`
(`fps=57`), `visual_content` (`3.42% diff`), `interactivity`/`telemetry_timeline`
(full per-phase score/state string) and `layout_no_overlap` (`regions=7/3`). Two runs
of the same broken build essentially never produce byte-identical details, so
`sameFailure` is dead in practice and `sameCandidate` (byte-identical HTML) is the
only surviving trigger. Notably, `factory/src/learning/aggregate.mjs` already has the
right idea — `failureSignature(kind, failure)` there buckets the detail through
`detailClass()` into `missing` / `runtime` / `correlated-too-early` / `failed`. The
robust signature exists in the learning layer and was never brought back into the
live control loop.

**4. Affected components.** `factory/src/pipeline/run.mjs` (`failureSignature`,
`sameFailure`, `forceFreshRebuild`).

**5. Why existing tests did not catch it.** `test-repair-policy.mjs` and
`test-control.mjs` cover `evaluateRepairProgress` (best-so-far) only. No test
exercises `failureSignature` or the escalation branch at all.

**6. Minimal fix.** Reuse the existing bucketing: build the pipeline signature from
`f.id` plus `detailClass(f.detail)` (or simply from the sorted set of failed check
ids), not from the raw detail string. One function, no new component.

**7. Regression fixture.** Fixture 7 as specified: three consecutive bundles with an
identical failed-check id set and jittered details must set `forceFreshRebuild` on
the third; a bundle with a genuinely different id set must not.

**8. Risk.** Low, but real in one direction: a coarser signature could escalate to
fresh rebuild too eagerly and discard a converging architecture. Bound it by keeping
the existing best-so-far retention (a fresh rebuild that comes back worse is already
rejected as the repair base) and by requiring two consecutive identical signatures,
as the current code already does.

**9. Blocks Canary #4.** Not on its own — but it guarantees that when D-1 or any
other plateau occurs, all five paid attempts are spent on the same dead end. It
should be fixed in the same pass.

---

### D-3 — Temporal proof reachability degrades silently above 120 s — **P1**

**1. Symptom.** A game with a round longer than 120 s gets a proof window shorter
than its own round, and the plan reports `pass: true`. A timeout-based failure proof
is then structurally unreachable — the exact Canary #2 defect class — but is not
stopped before Engineer spend.

**2. Reproducible evidence.**

```
declared=75    window=80    pass=true   <- "Each round lasts 75 seconds..."
declared=null  window=125   pass=true   <- "Each round lasts 150 seconds. Enemies spawn every 3 seconds."
declared=null  window=125   pass=true   <- "Each round lasts 180 seconds."
declared=null  window=125   pass=true   <- "Jede Runde dauert 90 Sekunden."
declared=null  window=125   pass=true   <- "Survive as long as you can. No timer."
declared=45    window=50    pass=true   <- "The player has 3 lives and a 45 second bonus phase."
```

**3. Root cause.** `factory/src/verify/proof-plan.mjs:inferDeclaredSeconds()` filters
matches to `n >= 5 && n <= 120`, so the *longest* declaration — the one that matters —
is the first to be discarded; the regex `(?:seconds?|secs?|s)\b` does not match
`Sekunden`; and `validateProofPlan` only checks `seconds > 0`, never that the window
covers the declared round. The last line above also shows the heuristic silently
picking an incidental "45 second bonus phase" as the round length.

**4. Affected components.** `factory/src/verify/proof-plan.mjs`.

**5. Why existing tests did not catch it.** `test-proof-reachability.mjs` asserts the
structural rules (missing scenario, unsupported state, uncovered probe). It contains
no case where the declared round exceeds `maxProofSeconds` and no non-English case.

**6. Minimal fix.** Have the Director emit `roundSeconds` as a typed field in the
GDD instead of inferring it from prose, and make `validateProofPlan` fail closed when
a terminal proof window is shorter than the declared round or when the round length
is undeterminable while a timeout-based terminal probe exists. Keep `maxProofSeconds`
as the ceiling but make hitting it an error, not a silent clamp.

**7. Regression fixture.** Fixture 9 extended: `roundSeconds: 150` with a
`state_reached: failure` probe must fail closed before Engineer spend; `roundSeconds: 60`
must pass with a ≥ 65 s window.

**8. Risk.** Low; it converts a silent under-window into an explicit pre-spend stop.
It does make the Director responsible for one more typed field, which is a fail-closed
failure mode if the model omits it — acceptable, and consistent with the existing
`probePlan.scoreEvents` requirement.

**9. Blocks Canary #4.** No — Harbor declares 70 s and lands inside the working band.
It blocks *cross-game* generality and should be fixed before any non-Harbor game.

---

### D-4 — Three self-attestation paths remain outside `correlated_gameplay` — **P2**

**1. Symptom.** A generated game can satisfy an Owner Must-Have or No-Go by emitting
an event, or by emitting nothing, without any harness-observed gameplay.

**2. Reproducible evidence.** Against a report where every event is emitted at
`t = 0.05 s`, on the title screen, with `score = 0`:

```
MH + event               strength=correlated_gameplay  FAIL  (correctly rejected)
MH + event_value_change  strength=undefined            PASS  (self-attestation accepted)
MH + event_absent        strength=undefined            PASS  (vacuously accepted)
NG + event               strength=undefined            PASS  (self-attestation accepted)
```

This is not hypothetical: Canary #3's `MH-03` passed on all of attempts 3–5 through
the `event_value_change` path (`event obstacle_contact_count_changed changed gameplay
value`), with no harness correlation of any kind.

**3. Root cause.** `factory/src/contract/traceability.mjs` forces
`strength = 'correlated_gameplay'` only for `kind === 'event' && requirementId.startsWith('MH-')`.
`event_value_change` is not covered; `event_absent` is a negative that any silent game
satisfies; No-Go requirements are excluded from the forcing rule entirely.

**4. Affected components.** `factory/src/contract/traceability.mjs`,
`factory/src/verify/fidelity.mjs` (`evaluateProbe`, `evidenceSource`).

**5. Why existing tests did not catch it.** `test-fidelity-hardening.mjs` proves the
`event` + `correlated_gameplay` path specifically — it was written for the one path
that was hardened, and asserts nothing about the three that were not.

**6. Minimal fix.** Extend the existing forcing rule rather than adding machinery:
apply `correlated_gameplay` to `event_value_change` on MH requirements and to `event`
on NG requirements, and require `event_absent` on an MH requirement to be paired with
a harness-observed positive (the compiler can reject `event_absent` as the sole
evidence for a Must-Have, which is what it already does for unsupported kinds).

**7. Regression fixture.** The four-case table above, asserted as
`test-fidelity-hardening.mjs` cases: all four must FAIL on the title-screen spoof
report.

**8. Risk.** Moderate — this *tightens* fidelity, so previously passing shapes will
start failing; `event_absent` is legitimately the right probe for many No-Gos and must
keep working there. Restrict the change to MH positives and NG positives only.

**9. Blocks Canary #4.** No. It does not make a run fail; it makes a PASS weaker than
it reads. Fix before trusting a green Product Fidelity on a new game.

---

### D-5 — `input_causality` is satisfiable without any gameplay effect — **P2**

**1. Symptom.** The check advertised as proof that progress is attributable to input
can pass on `score +0`, `events +0`.

**2. Reproducible evidence.** Active session ends `playing`, idle control ends
`gameover`, both with score 0 and no events:

```
pass  input_causality  active(score+0,events+0,end=playing) vs idle(score+0,events+0,end=gameover)
FAIL  interactivity
```

**3. Root cause.** `factory/src/verify/contract.mjs:causalityEvidence()` accepts
`stateEffect = activeEnd !== idleEnd && ['playing','gameover','won'].includes(activeEnd)`.
"The active session did not die" is treated as causal gameplay evidence.

**4. Affected components.** `factory/src/verify/contract.mjs`.

**5. Why existing tests did not catch it.** `test-causality-visual.mjs` proves the
positive and the flat-idle negative; it has no case where the *idle* control is the
one that reaches a terminal state.

**6. Minimal fix.** Require `stateEffect` to be an *advance* (active reached a
terminal state the idle control did not) rather than any difference, or require
`scoreEffect || eventEffect` for a Must-Have-bearing run.

**7. Regression fixture.** The report above must fail `input_causality`.

**8. Risk.** Low; it only tightens. Note it interacts with D-1: under the current
input policy, many honest games would then fail `input_causality`, which is the
correct signal, not a reason to keep the loophole.

**9. Blocks Canary #4.** No. Product Fidelity is the layer that actually caught the
Canary #3 problem, and it held.

---

### D-6 — A verification-layer throw destroys the run's durable evidence — **P1**

**1. Symptom.** A Playwright launch failure, page crash, or filesystem error inside
`verifyAttempt()` propagates out of `produceGame()`. No `RUN-EVIDENCE.json` and no
`FAILURE.json` are ever written, and — because learning is invoked *after*
`produceGame()` returns in `factory/src/index.mjs` — the autonomous failed-run learning
path never runs. A paid run is lost with no receipt.

**2. Reproducible evidence.** Code read: `factory/src/pipeline/run.mjs` wraps
`runDirector`, `buildGame`, `repairGame`, `rebuildGame`, `polishGame`, `runPlaytester`
in `try/catch → failClosed`, but `tech = await verifyAttempt(...)` (three call sites)
is unguarded, as are `assemble()` and the draft-writing block.
`factory/src/index.mjs` calls `orchestrateControlledLearning` only on the success path
of the outer `try`; the `catch` exits 1. Same shape applies when the 60-minute job cap
(D-8) kills the process mid-attempt.

**3. Root cause.** Fail-closed coverage was built around LLM roles (the failure mode
that was observed) and not extended to the deterministic infrastructure.

**4. Affected components.** `factory/src/pipeline/run.mjs`, `factory/src/index.mjs`.

**5. Why existing tests did not catch it.** No test injects a verifier-layer
exception; `test-control.mjs` covers budget/release-gate fail-closed paths only.

**6. Minimal fix.** Wrap `verifyAttempt` in the same `try/catch → failClosed(runDir,
state, 'verification_infrastructure_failed', ...)` used everywhere else, and move the
learning invocation in `index.mjs` so it also runs when `produceGame` throws, provided
a `RUN-EVIDENCE.json` exists.

**7. Regression fixture.** Stub `runSession` to throw; assert that
`RUN-EVIDENCE.json` and `FAILURE.json` exist with `reason:
verification_infrastructure_failed`.

**8. Risk.** Low; strictly additive fail-closed coverage.

**9. Blocks Canary #4.** Not by itself, but it converts any infrastructure hiccup
during a paid run into an unlearnable loss. Cheap enough to fix in the same pass.

---

### D-7 — The learning falsifier duplicates the vocabulary it is meant to falsify — **P2**

**1. Symptom.** When the *verifier* is wrong and the runtime evidence is right, the
learning layer cannot name the verifier as the cause — it blames game/harness
reachability instead.

**2. Reproducible evidence.** Synthetic failed run in which the game genuinely
reaches a terminal state named `completed` (score 42) while the probe requests
`success`. The generated dossier:

```
observedStates : ["completed"]
stateProbes    : [{ id: PR-MH-01, state: success, diagnosticFamily: success }]
findings       : [terminal-action-reachability-unresolved @0.7, targetLayer: verifier]
conclusion     : "...no observed runtime state entered diagnostic terminal family
                  success; the generic action policy may be insufficient..."
```

The correct diagnosis — "the verifier's alias table does not know `completed`" — is
never produced.

**3. Root cause.** `factory/src/learning/root-cause.mjs` carries its own
`DIAGNOSTIC_TERMINAL_FAMILIES` map with an explicit comment that it is "intentionally
independent from `verify/state-semantics.mjs`". It is *structurally* independent (no
import) but *semantically identical* — the same five aliases. `diagnosticTerminalFamily('completed')`
returns `null`, so the `terminal-state-vocabulary-mismatch` finding can only ever fire
for aliases the verifier already handles, i.e. for cases that cannot fail.

**4. Affected components.** `factory/src/learning/root-cause.mjs`.

**5. Why existing tests did not catch it.** `test-root-cause.mjs` proves that the
module does not *import* the verifier semantics (and `b32781d` even added a test
distinguishing the import from documentation text). Independence of *reference* was
tested; independence of *content* was not.

**6. Minimal fix.** Have the diagnostic layer reason about *unrecognised* terminal
evidence rather than about a fixed family list: when a probe's terminal family is
never observed **and** the run ended in a state the verifier could not canonicalise,
emit a `verifier-state-vocabulary-incomplete` finding naming the raw observed state.
This needs no new component — it is one additional finding in the existing
`analyzeFailedProductionRun`.

**7. Regression fixture.** Fixture 13 (the synthetic run above): the dossier must
contain a finding that names `completed` and targets the verifier vocabulary.

**8. Risk.** Low; it only adds a hypothesis to an advisory, non-activating layer.

**9. Blocks Canary #4.** No. It bounds how much the learning layer can be trusted to
find the *next* unknown defect on its own — which is directly relevant to the
meta-question, but not to whether Canary #4 should run.

---

### D-8 — Worst-case wallclock exceeds the 60-minute job cap on the success path — **P1**

**1. Symptom.** The longest run is the *successful* one, and it is the one most
likely to be killed by `timeout-minutes: 60`.

**2. Reproducible evidence.** Measured, not estimated:

- One `verifyAttempt` = active base + idle control + every proof scenario, run
  sequentially, each with its own browser launch. Measured on the real Canary #3
  candidate with a freshly compiled plan (12 s base + 12 s idle + 75 s success-proof
  + early-terminating failure-proof): **113 s**.
- Real Canary #3 ledger: 13.2 min total for 5 attempts and 6 LLM calls; LLM wallclock
  279 s (director 33 s, build 56 s, repairs 43–54 s each). Verification therefore
  accounted for ~8.6 min of it.
- A full success path is up to 14 verifications (5 build + 3 polish rounds × up to 3)
  and ~14 LLM calls.

| Round length declared | Proof window | Per attempt | 14 attempts | + LLM (~14 calls) | + setup | Total |
|---|---|---|---|---|---|---|
| 70 s (Harbor) | 75 s | ~113 s | 26 min | ~12 min | ~3 min | **~41 min** |
| undetectable (D-3) | 125 s | ~284 s | 66 min | ~12 min | ~3 min | **~81 min — exceeds cap** |

The 429/5xx retry ladder (`10 s × attempt`, up to 6 attempts, 180 s request timeout)
can add several more minutes per call.

**3. Root cause.** Proof scenarios are run strictly sequentially with a fresh browser
per scenario, the polish loop can multiply verifications by 3×, and the job cap is a
flat 60 minutes with no relationship to the compiled proof-plan cost.

**4. Affected components.** `.github/workflows/produce.yml` (`timeout-minutes`),
`factory/src/verify/harness.mjs` (`runSession` sequencing), `factory/src/config.mjs`
(`maxPolishRounds`).

**5. Why existing tests did not catch it.** `verify.yml` runs 1.5 s / 0.8 s fixture
scenarios; nothing in CI measures the production wallclock envelope, and Canary #3
ended early at `debug_exhausted` before the polish phase, so the long path has never
been executed.

**6. Minimal fix.** Compute the proof-plan's worst-case wallclock at Director time
(the numbers are all known: scenario seconds × attempt budget × polish budget) and
fail closed before Engineer spend if it does not fit a configured wallclock budget;
raise `timeout-minutes` to a value derived from that budget. No new component — the
compiled plan already contains every input.

**7. Regression fixture.** Assert that a compiled plan whose worst-case exceeds the
configured budget fails closed, and that Harbor's 70 s plan passes.

**8. Risk.** Low. Raising the cap alone would be the wrong fix on its own (it hides
the cost); pairing it with a pre-spend budget check keeps the run fail-closed.

**9. Blocks Canary #4.** No — Harbor lands at ~41 min with ~30 % headroom. It blocks
confident cross-game operation.

---

### D-9 — Technical verifier still uses the pre-PR#20 raw state vocabulary — **P2**

**1. Symptom.** A game whose runtime states are named with the *canonical* names —
`success` / `failure` / `failed`, all of which the Director may legitimately request
and the fidelity layer treats as first-class — fails the technical gate on
`started_playing` for a reason unrelated to its quality.

**2. Reproducible evidence.**

```
endState=won       canonical=success  started_playing=pass
endState=gameover  canonical=failure  started_playing=pass
endState=success   canonical=success  started_playing=FAIL
endState=failure   canonical=failure  started_playing=FAIL
endState=failed    canonical=failure  started_playing=FAIL
```

**3. Root cause.** PR #20 introduced `state-semantics.mjs` and migrated
`harness.mjs`, `fidelity.mjs` and `proof-plan.mjs` to it, but
`factory/src/verify/contract.mjs` still hardcodes `['playing','gameover','won']` in
`started_playing`, `progressObserved()` and `causalityEvidence()`. The bundled engine
happens to emit `won`/`gameover`, which is why this has never surfaced — but the
Engineer is free to define its own `window.__GF__` (as several repository fixtures do),
and the Director's probe vocabulary explicitly includes `success`/`failed`.

**4. Affected components.** `factory/src/verify/contract.mjs`.

**5. Why existing tests did not catch it.** Every fixture uses the engine's
`won`/`gameover` vocabulary. `test-verifier.mjs` and `test-causality-visual.mjs`
never exercise a game that names its terminal states canonically.

**6. Minimal fix.** Replace the three hardcoded arrays with
`canonicalVerifierState()` / `canonicalTerminalState()` from the module that already
exists. Keep raw states in the evidence detail, as PR #20 established.

**7. Regression fixture.** The five-row table above, asserted against
`evaluateContract`.

**8. Risk.** Very low; it makes two layers agree on one vocabulary and removes a
duplicated alias list.

**9. Blocks Canary #4.** No. Harbor's engine uses `won`/`gameover`.

---

## E. Known Limits (not blockers)

- **Post-terminal input race — not reproduced.** The `activeInputAllowed()` guard is a
  check-then-act pair, not atomic: `page.evaluate` reads the state, then a key is
  pressed, and `gf-engine.js:287` auto-restarts on any keydown once `this.time > 0.8`
  (and `this.time` freezes at the terminal transition, so the guard is armed
  immediately). A 6-session probe against a fixture that terminates at t = 3 s under
  full active input recorded **0/6 leaked inputs**. Per the audit's own rule, no fix is
  recommended without reproducible evidence: this is logged as a residual, not a defect.
- **A single malformed Director JSON fail-closes a paid run** with no re-ask. Correct
  and safe, but it means one bad completion costs the whole run.
- **`failure-proof` is always `inputMode: 'idle'`.** This is right for timeout games and
  for most arena/survival games, but a puzzle or collectathon with no timer and no
  idle-death path can never reach a failure state under idle. Cross-game limit.
- **`loadDurableEvidence()` reads every attempt's evidence in the repository** on every
  learning invocation. 28 run directories today, unbounded growth.
- **Evidence commit uses a bare `git push`** with no pull/rebase and no retry; a
  concurrent push to `main` loses the durable commit (the artifact upload still runs).
- **`test-titan-candidate-validation.mjs` is pinned to `runs/20260827-120138` and to
  specific idea filenames** — a maintenance liability, though it tests real mechanisms.
- **`scoreChanged()` and `correlatedGameplayEvent()` compare snapshots across scenario
  boundaries** (base's `start`/`early` against another scenario's events). Not
  currently exploitable, but the merged timeline is treated as one sequence.

---

## F. Canary Readiness

### Would I spend my own money on Canary #4 right now? **NO.**

Not because the factory is unsound — it is in better shape than the canary record
suggests — but because the run's outcome is already known. Replaying Canary #3's real
best candidate against today's HEAD shows PR #20 genuinely repaired `MH-04` and
`MH-08`, and PR #18's best-so-far retention demonstrably held through two regressions
in the real run (`bestAttempt: 3` kept across `4, 4`). Those repairs are regression-safe
and did not come back. But `MH-06` and `MH-07` still fail, and the `success-proof`
scenario burns its full 75-second window without the win state ever being approached.
A Canary #4 on the frozen brief would spend real money to re-derive a result this audit
obtained for zero, and D-2 guarantees all five attempts would be spent on the same dead
end.

**Fix D-1 (at minimum Fix A: publish the input policy into the proof plan and both role
prompts) and D-2, add the missing regression fixtures, re-run the full suite — then
Canary #4 with the identical frozen brief becomes a genuine experiment.** D-6 is cheap
enough to include in the same pass. D-3, D-4, D-5, D-7, D-8, D-9 do not block a Harbor
canary but should be closed before the first non-Harbor game.

---

## Meta-question: young-factory stabilisation, or structural architecture problem?

**Mostly healthy stabilisation, with one unhealthy blind spot that is currently
load-bearing. Not an architecture problem — no architecture review is warranted.**

**Evidence for the healthy pattern:**

- **Old defects do not come back.** PR #18's best-so-far retention was exercised for
  real in Canary #3 (`10 → 6 → 3 → 4 → 4`, `bestAttempt: 3`, `bestFailedChecks: 3`,
  two regressions correctly refused as repair base). PR #20's terminal semantics were
  verified against the real Canary #3 candidate in this audit and turn `MH-04` from
  FAIL to PASS. Neither repair has regressed.
- **The failure surface genuinely narrowed.** The same candidate that failed 8 of 12
  criteria under the Canary #3 code fails 2 of 12 under today's code. Canary #3's
  trajectory (best = 3 failed checks, technical PASS) is materially better than Canary
  #1's.
- **Test coverage grew with the defects,** not after them: 19 test files / ~2,180 test
  lines against 41 source files / ~4,580 lines, with a dedicated CI job per hardening.
- **The layering held under adversarial probing.** Product Fidelity — not the technical
  gate — is what correctly caught the real Canary #3 problem. The learning layer stayed
  silent when evidence was thin (Fixture 12), stayed idempotent under repeated
  invocation (Fixture 11), and has **zero LLM imports** — the "no hidden `chat()` path"
  claim is literally true. Unknown terminal states fail closed. The budget kernel refuses
  to continue on uncertain billing. The `EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT` claim
  boundary is accurate and not overstated.

**Evidence for the unhealthy element — and it is one specific thing, not a pattern of
sprawl:**

- **Each repair hardened exactly the path the failing canary exercised, and left its
  siblings open.** PR #20 canonicalised states in `harness`, `fidelity` and `proof-plan`
  but not in `contract.mjs` (D-9). The `correlated_gameplay` hardening covered
  `event` on MH and left `event_value_change`, `event_absent` and NG untouched (D-4) —
  and Canary #3 immediately passed a Must-Have through one of the gaps. The robust
  failure-bucketing was written in `learning/aggregate.mjs` and never brought back into
  the live control loop that needs it (D-2). Root-cause "independence from the verifier"
  was implemented as *not importing* the verifier while copying its contents (D-7).
- **The regression suite grew along the axis the last canary failed on, and that axis
  is not where the risk is.** Every verifier fixture in the repository is an
  "any-keydown = progress" game. This is the mechanism by which a P0 survived three
  canaries and four PRs: it is not that the defect was missed, it is that the test
  surface structurally cannot express it.

**What this predicts.** The concern in the brief — "are we just repairing single
symptoms and will each new game reveal another fundamental defect?" — is half right.
The specific fixes are sound and durable. What is being under-repaired is the
*generality* of each fix: hardening lands on the instance rather than the class, and
the fixture family cannot distinguish the two. The correction is not a new architecture;
it is a change of habit — when a defect is repaired, harden every sibling path in the
same commit, and add a fixture that would have caught it in a game the factory has never
built. D-1 is the first and most expensive instance of that habit not having been
applied.

**Why not ARCHITECTURE REVIEW REQUIRED.** None of the five triggers is met. Generated
game and verifier truth are *not* fundamentally coupled — the harness-owned evidence
classes (layout geometry, terminal state, restart, score) are genuinely independent and
did the real work. The generic harness is *not* unsuitable in principle — it is
under-specified: its action policy is a constant in one file that is never published to
the roles that must design against it, and making it capable of locomotion is a change
to one object literal. The repair lifecycle *is* convergent — its escalation trigger is
simply keyed on the wrong field. The learning layer *can* be made to falsify its own
architecture without redesign: it already reasons over raw runtime states and only needs
one more finding. And the execution model is stable — its wallclock envelope just needs
to be computed from the plan the factory already compiles.

---

## Appendix — Reproduction

All experiments are zero-paid and require only `npm ci` plus a Chromium available to
Playwright.

| # | What | How |
|---|---|---|
| 1 | Action-reachability wall | Build a navigate→collect→deliver game on `engine/gf-engine.js` via `assemble()`, drive it with `runSession({ seconds: 40 })`, record max displacement from spawn. Observed: 37 px, score 0, no mechanic events. |
| 2 | Canary #3 replay | `runs/20260828-043617/attempt-05/index.html` + `compileProofPlan(runs/20260828-043617/gdd.json)` → `runSession` → `evaluateContract` + `evaluateProductFidelity(owner-contract.json)`. Observed: MH-04/MH-08 now PASS, MH-06/MH-07 still FAIL. |
| 3 | Stagnation signature | Two bundles identical except `fps=57`/`fps=58` → `failureSignature` differs. Cross-check `runs/20260828-043617/FAILURE.json`: `freshRebuilds: 0`. |
| 4 | Proof-window inference | `compileProofPlan` over six GDD prose variants (table in D-3). |
| 5 | Fidelity spoofing | `compileDirectorTraceability` + `evaluateProductFidelity` over the four probe shapes against a title-screen/t=0.05 s event report. |
| 6 | Technical state vocabulary | `evaluateContract` over synthetic reports ending in `won`/`gameover`/`success`/`failure`/`failed`. |
| 7 | Causality loophole | `evaluateContract` with active end `playing`, idle end `gameover`, score 0. |
| 8 | Learning idempotency / no-cause / falsification | Two synthetic failed run directories (`alias`, `nocause`), `orchestrateControlledLearning` invoked 3× each. |
| 9 | Post-terminal input race | Fixture terminating at t = 3 s counting keydowns after the terminal transition; 6 active sessions, 0 leaks. |
