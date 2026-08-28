# Independent Canary — Lumen Current — Zero-Paid Preflight

Date: 28.08.2026  
Issue: `#17` — Post-Repair Independent Game Canary — Owner Acceptance Proof  
Status: **PHASE A COMPLETE / PHASE B PASS / PHASE C OWNER DECISION GATE**  
Paid Production execution: **NOT STARTED**

## 1. Purpose

This checkpoint prepares the first independent post-repair Product Proof without changing the Production model configuration and without invoking a paid LLM/API run.

The experiment intentionally isolates the Factory architecture from model-selection changes:

- Production reference remains OpenAI;
- no OpenRouter switch is part of this Canary preparation;
- no Candidate validation/activation/promotion occurs;
- no Production gate is weakened;
- the Owner brief is stored outside `ideas/**` so the preparation cannot trigger the Production workflow.

## 2. Exact Owner brief

Canonical preflight brief:

`evaluation/preflight/independent-canary-owner-brief-2026-08-28.md`

Brief title: **Lumen Current**

### Product intent

Create a compact, high-quality top-down real-time action-puzzle set inside a dark bioluminescent conservatory. The player controls a living current of light and restores a failing signal garden by activating energy nodes while environmental pressure rises.

The game should feel immediately readable, responsive and replayable in short sessions. The atmosphere should be elegant and luminous rather than militaristic: flowing light, botanical circuitry, water/glass reflections and clear motion feedback.

### Hard Must-Haves

1. `MH-01` — top-down real-time playfield; Arrow/WASD movement; Space/Enter primary gameplay action.
2. `MH-02` — activate three signal nodes; every activation visibly changes objective progress and score/equivalent measurable run value.
3. `MH-03` — clear success state after completing the required signal-node objective.
4. `MH-04` — clear failure state when a visible pressure resource such as storm pressure, stability or time is exhausted.
5. `MH-05` — after terminal success/failure, Enter starts a fresh run with objective progress reset.
6. `MH-06` — HUD shows node progress, active pressure resource and score/equivalent without obscuring the central play area.
7. `MH-07` — pressure escalates meaningfully through gameplay behavior rather than cosmetic change alone.

### Hard No-Gos

1. `NG-01` — no weapons, shooting or enemy-combat loop.
2. `NG-02` — no shop, inventory, equipment or persistent meta-progression system.
3. `NG-03` — no automatic victory or idle-only objective progression without player input.

### Direction — intentionally not hard requirements

- dark, clean bioluminescent botanical circuitry;
- glass/water-like surfaces and readable luminous pulses;
- clear visual separation of player, nodes, hazards and objective feedback;
- pure top-down or restrained pseudo-isometric presentation may be selected by the Factory;
- short, readable, increasingly tense runs;
- node activation should feel consequential;
- polished/replayable browser-game quality;
- a successful run may be roughly one to two minutes, but duration is not binding.

### Deliberate creative freedom

The Factory chooses exact node layout, hazard type, scoring formula, palette details within the art direction, narrative framing, particle treatment, audio design and exact representation of pressure.

### Unknown / unspecified

- touch/mobile controls;
- audio availability;
- exact difficulty curve;
- scoring weights;
- number of non-objective hazards;
- narrative text.

## 3. Deterministic normalized Owner Contract

Preflight result:

- raw brief preserved verbatim: **PASS**;
- `ownerBriefSha256`: `c439dcb495facc0075d27b6ffbca188073d332cffb3332e1916dab3f2bbff881`;
- `ownerContractSha256`: `7bf0e509b40f37fc298990725234c67a1e90af43ae78794cde5bcf3001719af6`;
- decomposition: `explicit-sections`;
- Must-Haves: **7**;
- No-Gos: **3**;
- hard Fidelity claim IDs: **10**;
- presentation/quality/open/unspecified sections inflated into hard requirements: **NO**.

The brief is materially independent from prior Titan/Harbor product vocabulary and does not import those product expectations.

## 4. Verifier / Product Fidelity coverage

### Deterministically representable / verifier-owned

- movement/action contract and generic action reachability;
- node activation as event/value-change evidence;
- success state;
- failure state;
- restart after terminal state;
- HUD no-overlap geometry;
- pressure escalation as observable event/value change;
- absence of forbidden combat/meta/idle-progression behavior where mapped to supported evidence.

The preflight explicitly proved:

- `MH-06` maps to independent `layout_no_overlap` geometry authority;
- `MH-05` maps to independent `restart_after_terminal` observation;
- each of the 10 hard Owner requirements can be represented by exactly one supported acceptance/probe contract;
- Product Fidelity does not receive authority over the non-binding presentation/open sections merely because they are present in the brief.

### Runtime fail-closed boundary

The future Director must still generate a valid GDD at Production time. `runDirector(...)` receives both the complete raw Owner idea and immutable Owner Contract, then compiles exact traceability and proof-plan reachability before Engineer spend. An invalid/incomplete mapping fails rather than silently proceeding.

### Qualitative / Owner-only judgment remains

The deterministic Factory cannot fully certify:

- whether the art feels elegant or beautiful;
- whether the game is genuinely fun or compelling;
- whether the visual finish meets the Owner's subjective quality bar;
- whether the chosen creative interpretation is desirable despite satisfying all hard requirements.

These remain part of the final hands-on Owner ACCEPT/REJECT.

## 5. Learning isolation

Current Production memory check:

- validated + active Production lessons: **0**;
- Director active lessons: **0**;
- Engineer active lessons: **0**.

Therefore no historical Titan/Harbor Learning Candidate or inactive lesson can silently modify this Canary's Production prompts.

## 6. Production model reference — frozen for this proof

The first independent Product Proof keeps the known reference configuration unchanged:

- Director: `openai:gpt-5.6-terra`
- Engineer: `openai:gpt-5.6-terra`
- Playtester: `openai:gpt-5.6-terra`
- Auditor: `openai:gpt-5.6-luna`
- Production workflow default provider: `openai`

This avoids changing Factory architecture and model configuration in the same experiment. Model optimization/OpenRouter comparison remains a separate S5 evidence track.

## 7. Zero-paid execution evidence

Implementation branch head used for the complete preflight Full Verifier:

`d3245473fdda2265e3f0f8a65b1e115b69c56f9b`

GitHub Actions Full Verifier:

`33205030033` — **SUCCESS in all steps**

The dedicated Canary preflight produced:

```text
status: PASS
executionClass: zero-paid-deterministic-preflight
Must-Haves: 7
No-Gos: 3
Fidelity claims: 10
Active Production lessons: 0
Provider/API calls: 0
```

The same Full Verifier also proved:

- S0/S1/S1a/S2/S3/S4/S5;
- Control / Budget / Release Gate;
- Router / capability gates / credential isolation;
- Owner Contract;
- Controlled Learning and orchestration;
- root-cause diagnosis;
- Production-agent/art-direction integrity;
- Product Fidelity;
- proof-plan reachability;
- Golden Corpus 29/29, 0 mismatches, 0 Critical False PASS, API calls 0, model-backed cases 0, USD cost 0;
- Action Reachability;
- Terminal Proof;
- HUD Geometry;
- Causality / Visual Activity;
- Good/Bad Product Verifier;
- Publishing / XSS.

## 8. Paid-run cost boundary

The Production workflow's normal default hard budget cap is `$10` unless the Owner explicitly selects another value.

Historical reference only — not a guarantee for Lumen Current:

- Titan #3: `$0.442821`;
- Harbor Courier Canary #1: `$0.540282`;
- Harbor Courier Canary #2: `$0.486036`.

These prior runs suggest an observed historical order of magnitude around `$0.44–$0.54` for comparable Factory executions, but Lumen Current may require different Director/Engineer/Repair/Polish work. The only enforceable boundary is the selected fail-closed run budget. Unused budget is not itself a charge.

Recommended experiment setting for comparability: retain the normal `$10` hard cap while keeping all existing repair/polish bounds. This is a ceiling, not an expected spend.

## 9. Remaining risks before paid execution

1. LLM generation remains non-deterministic; a correct contract does not guarantee a strong game.
2. Technical/Product Fidelity PASS is not equivalent to Owner acceptance — this is precisely what the Canary tests.
3. Ten hard requirements create a meaningful but bounded traceability burden for the Director.
4. Art quality, elegance, fun and replayability remain partly qualitative.
5. The approximate one-to-two-minute target is deliberately non-binding.
6. External OpenAI availability/provider behavior is outside deterministic Factory control.
7. This single Canary can provide strong product evidence but cannot alone prove universal Factory quality or complete self-improvement.

## 10. Decision gate

**Phase A — Independent brief:** COMPLETE.  
**Phase B — deterministic zero-paid preflight:** PASS.  
**Phase C — Owner decision:** READY / STOP.  
**Phase D — paid Production Canary:** NOT STARTED.  
**Phase E — Owner hands-on ACCEPT/REJECT:** NOT STARTED.

No paid Production execution is authorized by this document. The next action requires a new explicit Owner GO for the exact Lumen Current brief, OpenAI reference configuration and selected budget boundary.
