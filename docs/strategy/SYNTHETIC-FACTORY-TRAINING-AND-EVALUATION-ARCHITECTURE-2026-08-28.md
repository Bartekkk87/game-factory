# Synthetic Factory Training & Evaluation Architecture — 2026-08-28

## Status

**ARCHITECTURE CONCEPT — PROPOSED / NOT IMPLEMENTED**

This document defines the intended architecture for a synthetic training and evaluation foundation for Game Factory. It does not authorize a paid Game/API run, Candidate activation, automatic promotion, gate weakening, or Harbor Canary #4.

Current executable baseline at conception time:
- `main`: `ed1587cd4370871d0e5ac26d7c6312b5deed5445`
- Controlled Improvement v1 exists and is fail-closed.
- Autonomous failed-Production-run root-cause analysis exists.
- Existing browser fixtures already cover action reachability, general green/broken behavior, fidelity, fast-success activity and static-live activity.
- Existing Learning selftests already use synthetic evidence to test aggregation, triggers, candidate lifecycle and orchestration.

The architecture therefore extends existing evidence / verifier / learning mechanisms. It does **not** introduce a second control plane or a self-authorizing meta-agent.

---

## 1. Problem statement

The Factory has repeatedly improved through the following pattern:

`real Production failure -> evidence analysis -> specific repair -> regression fixture -> continue`

This has produced real improvements, but it remains reactive. A new game or new brief can expose a neighboring variable that was not represented by the previous single regression case.

The desired shift is:

`known failure class -> synthetic variance family -> repeatable evaluation corpus -> measured Factory quality -> controlled improvement`

and for previously unknown failures:

`real/synthetic unknown failure -> durable evidence -> root cause / cluster -> new seed case -> generated sibling variants -> regression corpus -> controlled improvement`

The goal is not 100% prediction of every future defect. The goal is broad, measurable coverage of common and important failure classes while continuously adding genuinely new classes when they appear.

---

## 2. Terminology: “training” means Factory training, not model fine-tuning

In v1, **training does not modify LLM weights**.

The trained object is the Factory system:
- prompts and skills where appropriate,
- deterministic verifier behavior,
- control / repair policy,
- Owner Contract handling,
- Product Fidelity and review policy,
- Learning classification and propagation,
- model selection later if benchmark evidence justifies it.

The primary mechanism is evaluation-driven system improvement:

`cases -> execution -> expected outcome comparison -> failure clustering -> candidate -> validation -> human-gated application -> rerun corpus`

Model fine-tuning may be researched later, but is outside this architecture decision.

---

## 3. Core architectural decision

Add a **Golden Factory Evaluation Corpus** as an evidence-producing dataset, not as a new authority layer.

The corpus supplies controlled variance to the existing Factory layers.

### Existing authority remains unchanged

- Owner Contract remains Product Truth.
- Verifier / Product Fidelity remain evidence gates.
- Learning may diagnose and propose only.
- Candidate validation remains evidence + regression based.
- Protected-layer changes remain human-gated.
- Paid Production runs remain Owner-gated.

### New responsibility

The corpus answers:

> “Across a broad set of known and neighboring situations, how reliably does the Factory behave as expected, and did this proposed change make the Factory measurably better or worse?”

---

## 4. Two training domains

### A. Game Production Training

Purpose: improve the Factory’s ability to design, build, repair and review games.

Example classes:
- proof-critical mechanic is theoretically present but unreachable under generic input,
- movement plus action is required,
- success and failure require independent paths,
- short round / long round / fast terminal state,
- upgrade is decorative rather than mechanically effective,
- boss exists visually but is mechanically meaningless,
- HUD becomes unreadable or overlaps,
- static gameplay vs animated gameplay,
- animated gameplay followed by a static terminal screen,
- important Owner requirement exists only in descriptive/freeform brief text,
- optional wording must not become a mandatory requirement.

Primary affected layers:
- Director,
- Engineer,
- Proof Planner,
- Verifier,
- Product Fidelity,
- Playtester / Experience Review.

### B. Factory Reliability Training

Purpose: improve the Factory itself as an autonomous production system.

Example classes:
- best attempt is followed by a worse repair,
- later repair introduces a new runtime error,
- failure signatures drift although the underlying failure is unchanged,
- durable evidence is missing or contradictory,
- terminal vocabulary differs between Director / verifier / runtime,
- unsupported terminal alias appears,
- reviewer receives insufficient independent evidence,
- generated-game self-attestation conflicts with harness evidence,
- Learning creates a candidate but the applied/closed state is not durable,
- an already fixed failure class reappears after another architecture change.

Primary affected layers:
- Control,
- Evidence,
- Learning Root Cause,
- Aggregation / Trigger,
- Candidate Lifecycle,
- Improvement propagation and closure.

---

## 5. Corpus case types

The architecture deliberately separates cheap deterministic cases from expensive Production-model cases.

### Tier 0 — Pure deterministic data cases

No browser and no LLM.

Examples:
- Owner Contract decomposition inputs,
- state alias tables,
- failure signatures,
- synthetic RUN-EVIDENCE / attempt evidence,
- repair trajectories,
- Learning lifecycle transitions.

Expected cost: **0 API calls**.

### Tier 1 — Deterministic browser fixtures

HTML / micro-engine fixtures executed by the current Playwright verifier.

Examples:
- action reachability,
- visual activity,
- HUD geometry,
- terminal / restart behavior,
- input causality,
- static-vs-live visual controls.

Expected cost: **0 API calls**.

### Tier 2 — Pipeline simulations

Synthetic brief + known fixture/evidence, exercising multiple Factory stages without invoking paid creative generation where possible.

Examples:
- Owner Brief -> Owner Contract -> traceability -> proof plan,
- evidence -> aggregate -> root cause -> inactive candidate,
- candidate -> validation receipt -> application/closure receipt.

Expected cost: **0 API calls unless explicitly configured otherwise**.

### Tier 3 — Model-backed Production benchmark cases

A selected subset invokes Director / Engineer / Playtester to measure actual generation quality against the same Golden Corpus.

Use cases:
- compare model generations,
- test whether an engineering skill/prompt improves real build quality,
- compare cost / quality / latency,
- validate a major Production-role change.

This tier is **not automatic** and remains separately Owner-authorized because it can consume API budget.

---

## 6. Synthetic variance model

A corpus seed is not a single fixture. Each important failure class may define typed variation axes.

### Initial variation axes

#### Brief / Product Truth
- explicit MH / NG,
- descriptive mandatory UN claim,
- optional / maybe wording,
- semantic Markdown heading context,
- important requirement embedded in freeform text,
- multiple similar requirements without merging them.

#### Time / lifecycle
- fast terminal (<5 s),
- base verifier-window terminal,
- delayed terminal,
- long round,
- restart after success,
- restart after failure.

#### Runtime state vocabulary
- canonical `success` / `failure`,
- proven aliases `won` / `gameover` / `failed`,
- unknown alias that must fail closed rather than be guessed.

#### Input / reachability
- short movement,
- long-distance navigation,
- movement + action,
- pointer interaction,
- direction changes,
- active vs idle causality.

#### Visual evidence
- visible moving gameplay,
- static live gameplay,
- moving gameplay + static result screen,
- HUD overlap,
- out-of-bounds HUD,
- low but valid visual movement.

#### Repair trajectory
- monotonic improvement,
- improvement then regression,
- same failure with changed volatile text,
- new runtime error after improvement,
- stagnation requiring fresh rebuild.

#### Evidence / review
- complete independent evidence,
- generated event only,
- screenshot only,
- harness telemetry only,
- contradictory evidence,
- missing durable evidence.

These axes should be combinable only where the combination represents a meaningful system scenario. The corpus must avoid a blind Cartesian explosion.

---

## 7. Initial known failure clusters

The first corpus should be seeded from failures already demonstrated by the Factory rather than invented speculative controls.

Initial clusters:

1. `repair-regression-after-best-attempt`
   - best-so-far repair base must survive later regression.

2. `new-runtime-error-after-repair`
   - a later candidate with a new runtime error must not replace the better prior candidate.

3. `proof-reachability-mismatch`
   - Director proof requirements must be reachable under the real observation/action model before Engineer spend.

4. `terminal-state-semantics`
   - proven aliases are canonicalized; unknown states remain fail-closed; raw state evidence is preserved.

5. `terminal-action-observation-race`
   - periodic input must not erase a terminal state before observation; restart remains independently observed.

6. `generic-action-reachability`
   - navigation and proof-critical progress must be achievable with generic bounded action policy without target knowledge or hidden hooks.

7. `repair-stagnation-signature`
   - semantic stagnation must not be hidden by volatile failure text.

8. `durable-failure-evidence`
   - verifier/infrastructure failure must remain durable and fail-closed.

9. `owner-contract-heading-context`
   - headed freeform Owner intent must retain semantic context without headings inventing requirements.

10. `full-brief-fidelity-coverage`
    - concrete mandatory descriptive claims must not disappear merely because they are not MH/NG.

11. `independent-review-evidence`
    - mandatory descriptive claim PASS requires screenshot and/or harness evidence; game-generated event alone is insufficient.

12. `visual-activity-terminal-timing`
    - visual activity must be measured from proven live gameplay, not accidentally from two identical terminal frames.

13. `static-live-negative-control`
    - score/input progress with a truly static rendered canvas must still fail visual activity.

The corpus may include other already-proven cases (e.g. HUD geometry) where durable evidence exists.

---

## 8. Case manifest and durable evidence

Each corpus case should have a small typed manifest. Proposed logical shape:

```json
{
  "id": "visual-activity-fast-terminal-v1",
  "domain": "game-production",
  "tier": 1,
  "cluster": "visual-activity-terminal-timing",
  "severity": "high",
  "fixture": "examples/fixtures/fast-success-activity/index.html",
  "variation": {
    "terminalTimingMs": 2600,
    "liveVisualMotion": true,
    "terminalVisualMotion": false
  },
  "expected": {
    "visual_activity": "PASS"
  },
  "sourceEvidence": ["PR #27", "Verifier run 33168166465"],
  "status": "golden"
}
```

Case definitions are durable Git data. Evaluation outputs are durable JSON evidence with:
- evaluated commit SHA,
- case / variant ID,
- expected outcome,
- actual outcome,
- pass/fail,
- failure signature,
- cluster,
- severity,
- evidence references,
- runtime / cost metadata where relevant.

No case can silently change its expected answer. A changed expected result is itself a reviewed corpus change.

---

## 9. Quality metrics

Do **not** use one undifferentiated “95% accuracy” number.

Recommended reporting:

### Factory Evaluation Pass Rate

`passed expected outcomes / total evaluated cases`

Target for the broad standard corpus after maturation: **>=95%**.

### Critical Integrity False-Pass Rate

Cases where the Factory incorrectly certifies a result that should fail.

Target: **0 tolerated false PASS for critical integrity cases**.

Examples:
- missing Owner Must-Have certified PASS,
- game-generated self-attestation accepted as independent evidence,
- unknown terminal semantics silently guessed,
- missing evidence treated as success.

### Domain scores

Report separately:
- Game Construction,
- Proof / Reachability,
- Product Fidelity,
- Evidence Integrity,
- Repair Convergence,
- Learning Capture,
- Improvement Propagation.

### Change delta

Every proposed material Factory improvement should be evaluated against a baseline:

`baseline corpus result -> candidate change corpus result -> delta by cluster/domain/severity`

A higher aggregate score does not excuse a new critical regression.

---

## 10. Unknown-failure learning loop

The most important behavior is what happens when the corpus does **not** already contain the error.

### Required loop

1. Real Production or synthetic evaluation produces durable failure evidence.
2. Existing root-cause / aggregation mechanisms attempt to map it to a known failure cluster.
3. If known:
   - attach the new case/evidence to the existing cluster,
   - determine whether it is a new useful variant,
   - keep it as regression evidence if it expands coverage.
4. If unknown:
   - create an `unclassified` root-cause dossier / inactive hypothesis only,
   - do not invent a fix,
   - validate the failure class,
   - create one minimal reproducible seed case,
   - generate a bounded set of sibling variants along relevant typed axes,
   - add the validated family to the Golden Corpus.
5. Any proposed improvement is tested against:
   - the target cluster,
   - sibling variants,
   - the full relevant corpus,
   - critical integrity controls.
6. Only after validation and explicit human approval may a protected Production layer change.

This converts each genuinely new failure into future coverage rather than another isolated patch.

---

## 11. Improvement propagation and the current closure gap

The 28.08 propagation audit showed a real lifecycle gap:
- executable code can be repaired and merged,
- a Learning Candidate can remain `validated / active=false`,
- non-prompt protected-layer improvements have no equivalent durable “applied/closed” receipt.

The Synthetic Training architecture requires this gap to be closed before claiming full self-improvement.

### Proposed application receipt

Do **not** force verifier/control/skill learnings into prompt lessons.

Add a separate durable concept for human-applied improvements, logically:

`validated candidate -> human-reviewed implementation -> corpus/regression PASS -> application receipt -> APPLIED/CLOSED`

Possible receipt fields:
- candidate ID,
- target layer,
- application kind (`code-merge`, `skill-merge`, `prompt-promotion`),
- PR / merge SHA,
- validation runs,
- corpus baseline result,
- corpus post-change result,
- affected clusters,
- appliedAt,
- reversible / rollback reference.

Existing `learning/promotions/` remains appropriate for active prompt lessons. Code/skill/verifier/control changes should receive their own durable application receipt rather than being misrepresented as a prompt lesson.

---

## 12. Skill propagation rule

Synthetic findings must not automatically become skill text.

A learning belongs in a role skill only when it changes **how that role should reason or build**, for example:
- Engineer should preserve a best-evidenced repair base,
- Director should design proof-critical behavior against the published generic action contract.

A learning belongs in authoritative code/policy instead when it is a system invariant, for example:
- terminal canonicalization,
- failure-signature normalization,
- visual activity frame selection,
- independent reviewer evidence requirements.

Every validated learning must therefore be classified to exactly one primary target layer, with optional explicit secondary documentation links. Avoid duplicating the same rule in multiple operational authorities.

---

## 13. Cost model

### Default corpus

Tiers 0–2 should be designed for **zero LLM/API cost** and use:
- Node.js,
- deterministic JSON fixtures,
- Playwright,
- existing GitHub Actions/selftests.

### Model-backed benchmark subset

Tier 3 may consume normal Production-model/API cost and must:
- use the existing provider/model router,
- use the existing budget ledger,
- be explicitly Owner-authorized,
- never silently expand into repeated paid runs.

The corpus therefore provides a large amount of Factory training without requiring real games or paid model calls.

---

## 14. Proposed implementation stages

### Stage S0 — Corpus Registry + Baseline

No behavior change.

- define case schema,
- register existing fixtures and Learning synthetic tests,
- map them to known failure clusters,
- generate one baseline report on current `main`.

Exit criterion: current Factory quality is measurable without changing Production behavior.

### Stage S1 — Known Failure Variance Families

- add bounded sibling variants for the demonstrated clusters,
- especially temporal, input, state, brief semantics, repair trajectory and evidence variants,
- keep all cases zero-paid.

Exit criterion: every demonstrated major failure class has more than one meaningful case shape where appropriate.

### Stage S2 — Evaluation Runner + Quality Report

- run corpus deterministically,
- emit per-case results plus domain/cluster/severity rollups,
- compare current commit to a stored baseline,
- fail closed for critical false-pass regression.

Exit criterion: a Factory change can be objectively compared with its predecessor.

### Stage S3 — Learning Intake Integration

Extend controlled learning to accept a new evidence event kind such as `evaluation-failure` in addition to `production-run` / `owner-feedback`.

Authority remains analysis-only:
- may aggregate,
- may classify/cluster,
- may create inactive candidate,
- must not validate, activate, edit Production or start paid work.

Exit criterion: a synthetic failure can enter the same controlled Learning lifecycle as a real run without bypassing governance.

### Stage S4 — Improvement Application Closure

- add durable application receipts for non-prompt protected-layer improvements,
- require corpus/regression evidence before APPLIED/CLOSED status,
- keep explicit human merge authority.

Exit criterion: `learning discovered -> validated -> implemented -> corpus proven -> applied/closed` is durably traceable.

### Stage S5 — Optional Model Benchmark Track

Only after S0–S4 are stable:
- use a carefully selected Tier-3 subset to compare Production models/prompts/skills,
- measure quality, critical errors, cost, token usage and latency,
- no automatic Production model change.

---

## 15. Explicit non-goals

This architecture does **not** authorize:
- LLM weight training or fine-tuning,
- an autonomous architecture-writing agent,
- automatic skill/prompt mutation,
- automatic Candidate validation,
- automatic Candidate activation/promotion,
- automatic code merge,
- automatic gate weakening,
- unlimited combinatorial fuzzing,
- paid synthetic game generation by default,
- Harbor Canary #4.

---

## 16. Architecture verdict

**Recommendation: ADOPT THE CONCEPT AND IMPLEMENT IN STAGES S0–S4 BEFORE USING IT AS A CLAIMED SELF-IMPROVEMENT FOUNDATION.**

Why it fits the current Factory:
- it reuses existing fixtures, verifier and controlled-learning machinery;
- it directly addresses the repeated reactive patch cycle demonstrated by Harbor and the Reliability packages;
- it converts real failures into reusable failure classes and neighboring synthetic variants;
- it gives a measurable answer to “did the Factory become better?”;
- it closes the gap between executable repair and durable Improvement-layer learning;
- most training/evaluation can remain zero-paid;
- governance remains human-gated where Production authority is involved.

The desired mature loop is:

`Golden Corpus + Real Runs -> Evidence -> Cluster / Root Cause -> Inactive Improvement Candidate -> Validation -> Human Application -> Full Corpus Regression -> Applied/Closed -> Future Production`

The Factory should aim for broad >=95% standard-corpus pass rate while maintaining zero tolerated false-PASS behavior for critical integrity controls. New real failures become new validated corpus families, allowing the system’s coverage to grow over time instead of repeatedly relearning isolated failures.
