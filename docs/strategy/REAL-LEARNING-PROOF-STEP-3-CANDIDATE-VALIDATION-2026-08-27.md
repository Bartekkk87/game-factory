# REAL LEARNING PROOF — STEP 3: CANDIDATE VALIDATION

Date: 2026-08-27

## Scope and authority

This step validates or falsifies the two existing Titan learning hypotheses using durable Titan evidence, code/path inspection, deterministic held-out fixtures and the full verifier. It does not start a new paid game run, does not activate a lesson, and does not promote a protected learning layer.

Baseline main: `890582ce9ee2b6c4840b59cfb065e93eda6f5184`.

## Evidence chain

The durable executable Titan brief is `ideas/titan-core-reforged-canary-3.md` and is reproduced in `runs/20260827-120138/brief.json`. The stored Owner Contract preserves that same brief in `originalBrief`. The authorized brief asks for a fast **Top-down** arcade-action prototype, a dark Sci-Fi/Cyberpunk arena with clear neon silhouettes, salvage upgrades and an extract-or-go-deeper risk/reward decision.

The later Owner reject additionally asks for an isometric presentation, recognizable player mech, mechanical boss, industrial environment, spatial depth, textures/lighting, floor telegraphs and a commercial-indie quality bar. Those richer targets are not present in the durable authorized Titan brief.

Therefore the specific late isometric/mech/commercial-quality gap cannot be classified as an Owner requirement that was lost by Owner Contract decomposition, Director prompt assembly or Engineer execution during this run.

## Pipeline root-cause trace

### Brief → Owner Contract

PASS for preservation: the full source brief survives unchanged as `originalBrief`.

PARTIAL for executable decomposition: when explicit `Must-Have`/`No-Go` sections exist, current `owner.mjs` turns those bullet lists into stable Owner requirement IDs, while other explicit descriptive sections remain only in `originalBrief`.

### Owner Contract / Brief → Director context

PASS: `runDirector` passes both the full raw owner idea and the Owner Contract. The canonical system prompt also receives both `directing` and `art-direction` skills. No prompt-assembly loss was found.

### Director → Engineer implementation

No evidence of the late missing requirements being dropped here, because they were not in the authorized brief. The generated Titan design and implementation materially match the actual source direction: dark cyberpunk/neon presentation, boss fight, salvage upgrades and Extract/Descend choice. `Core Cannon`, `Forge Ring` and `Single-Screen Arena` are Director design decisions within the actual broad brief, not evidence that an authorized isometric/mech target disappeared.

### Product Fidelity / Release evaluation

A real systemic coverage gap is reproducible: Product Fidelity evaluates `ownerRequirementIds(ownerContract)`. Explicit product truth that remains only in `originalBrief` has no stable acceptance/probe ID and therefore cannot independently fail Product Fidelity.

Held-out Case A proves this deterministically: a sectioned brief can contain explicit visual targets outside `Must-Have`, yet Product Fidelity can PASS solely on the structured `MH-*` requirement. Cases C and D reproduce the same distinction for mixed and gameplay-identity briefs. Case B proves the factory does not manufacture concrete visual details when the brief is intentionally vague.

## Candidate outcomes

### A — `titan-canary-3-visual-target-intake-v1`

**PARTIALLY CONFIRMED.**

Supported generically: held-out visual briefs demonstrate that concrete visual/presentation targets outside explicit Must-Have/No-Go lists are preserved in the raw brief but do not become stable Product Fidelity requirements.

Falsified as the specific Titan root cause: the richer isometric/mech/commercial-quality expectations in the later reject were not supplied in the durable Titan brief. They cannot be retrospectively attributed to Director or Engineer loss.

Lifecycle state remains `candidate`, `active=false`, `validatedAt=null`.

### B — `candidate-owner-feedback-8e1c9bf738f845cb`

**PARTIALLY CONFIRMED.**

Supported: a deterministic Owner Contract decomposition/downstream Product Fidelity coverage gap exists for explicit descriptive sections outside Must-Have/No-Go.

Not established as the specific Titan cause: the preserved Titan brief lacks the richer late expectations, and the full raw brief reached Director context intact.

Lifecycle state remains `candidate`, `active=false`, `validatedAt=null`.

## Root cause

The best-supported primary explanation for the specific Titan Owner rejection is a **durable Owner-intent / acceptance-baseline mismatch**: the hands-on acceptance criteria became materially richer than the durable executable brief used for production.

A separate secondary factory defect is also proven: **explicit descriptive Product Truth outside structured Owner requirement IDs is not covered by deterministic Product Fidelity**. This defect matters for future briefs when the Owner actually supplies such details, but current evidence does not prove it caused the particular late isometric/mech expectation gap in Titan.

## Changes made in Step 3

No Production runtime semantics were changed. `owner.mjs`, Director behavior, Product Fidelity behavior, prompts and active learning memory remain unchanged.

Step 3 adds only:

- deterministic held-out Candidate Validation fixtures for Cases A-D plus historical Titan assertions;
- a full-verifier step that executes the validation proof;
- durable validation assessment evidence;
- evidence links on both candidates while keeping them inactive.

## Regression

Branch Full Verifier `33103781337` — **SUCCESS** on validation head `14979b40604a6158c982b847c2023f709b0f552f`.

The full suite includes Owner Contract decomposition, Titan Step 3 Candidate Validation, controlled learning lifecycle, cross-run trigger, automatic orchestration, production-agent integrity, art-direction runtime truth, product-fidelity hardening, verifier causality/visual activity, Good/Bad product fixtures and publishing gates.

## Promotion boundary

No candidate is promoted by this step.

A plausible next protected-layer change, if explicitly approved later, would be to give **explicit descriptive Product Truth supplied by the Owner** stable traceability into acceptance/evaluation without converting ambiguity or unspecified details into Owner requirements. The exact schema and affected layers must be designed and regression-tested before any human-merge promotion.

Main risks of such a promotion:

- turning soft references or mood statements into hard requirements;
- overfitting to Titan terminology or visual style;
- creating unverifiable visual requirements with fake telemetry probes;
- duplicating or conflicting with existing Must-Have/No-Go semantics;
- retrospectively treating post-play feedback as if it existed before production.

The factory claim remains **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**, not fully self-improving.
