# REAL LEARNING PROOF — STEP 4 INTEGRITY REPAIR

Stand: 27.08.2026

## Status

Step 4 implements the smallest protected Production correction justified by the independent falsification audit and direct code/evidence verification. It is **not** a promotion of either Titan learning candidate and it does not start a new Game/Titan run.

Claim boundary remains: **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

## Why Step 4 exists

Step 3 correctly rejected the claim that the late Titan isometric/mech/commercial-indie expectations were lost during Production: those expectations were not in the durable authorized brief. The independent audit then found three separate Factory-level integrity defects:

1. Headingless freeform prose could inflate mood/reference text into hard Must-Haves.
2. Product Fidelity could rely on generated-game event instrumentation without making that evidence authority visible; `hud_layout_clear` is the concrete historical example.
3. `targetLayer` could say `owner-contract` while `promoteCandidate()` actually activated the candidate as a prompt-memory lesson.

These are ordinary architecture/integrity corrections. They are not evidence that either Titan Candidate should be promoted.

## Correction 1 — Safe freeform Owner Contract

`factory/src/contract/owner.mjs` now uses `deterministic-freeform-v2`.

For headingless freeform briefs:

- direct build requests remain Must-Haves;
- explicit obligation language (`must`, `muss`, `shall`, etc.) remains Must-Have;
- explicit negative constraints remain No-Gos;
- ambiguity remains Unknown;
- mood/reference language such as `inspiriert von`, `feels like`, `soll sich anfühlen wie` remains Unknown/context;
- other descriptive prose is preserved as Unknown/context instead of being silently promoted to a hard obligation.

Explicit `Must-Have` / `No-Go` section behavior is unchanged.

This deliberately rejects the audit shortcut of making **all** freeform prose Unknown: the current traceability compiler requires at least one Owner requirement, and explicit natural-language obligations must not be lost merely because the Owner did not write a Markdown heading.

## Correction 2 — Honest Product Fidelity evidence authority

`factory/src/verify/fidelity.mjs` keeps the existing PASS/FAIL logic unchanged but adds evidence authority and coverage metadata.

Each criterion now identifies whether its evidence is:

- `harness-observed`,
- `generated-game-event+runtime-correlation`, or
- `generated-game-event-dependent`.

The Fidelity result also explicitly records:

- which requirement IDs were evaluated;
- which were harness-observed;
- which depend on generated-game events;
- which correlated event claims additionally have independent timing/state/score correlation;
- that unstructured `originalBrief` content is **not** evaluated by Product Fidelity.

This coverage is propagated into the pipeline, Playtester/Auditor input, durable result metadata, and Owner `REVIEW.md`.

Therefore `Product Fidelity = PASS` remains a useful blocking technical signal, but it no longer silently presents itself as proof that the entire product or entire Owner brief has been independently verified.

### Important residual boundary

Step 4 does **not** pretend that `hud_layout_clear` is now independently measured. It remains generated-event-dependent evidence. A genuine DOM/canvas bounding-box overlap measurement would be a separate Technical Verifier correction with its own evidence and regression proof.

## Correction 3 — Learning target-layer integrity

The existing lesson activation mechanism stores active lessons in memory and injects them into a role prompt. Therefore it is a **prompt promotion adapter**, not a generic code-layer promotion mechanism.

`factory/src/learning/lifecycle.mjs` now fails closed unless `targetLayer === "prompt"` before the adapter performs any mutation.

Consequences:

- a `targetLayer: owner-contract` Candidate cannot accidentally become a Director prompt lesson;
- verifier/product-fidelity/control-plane Candidates cannot be activated through the prompt adapter;
- protected prompt promotion still requires `human-merge`;
- code-layer corrections remain ordinary reviewed code changes rather than Learning Theater.

No new promotion engine, entity, role, state or gate was added.

## What did not change

- immutable `originalBrief` preservation;
- Owner brief and contract hashing;
- Director receives raw Owner idea plus Owner Contract;
- AC/PR stable traceability schema;
- correlated gameplay strengthening;
- Engineer architecture and prompts;
- Release Gate logic;
- Owner `awaiting-review` authority;
- Titan historical evidence;
- Titan Candidate activation state;
- no Product Truth classification layer;
- no PT identifiers;
- no subjective visual score;
- no new reviewer role;
- no extra gate.

## Deterministic proof

The Step 4 test set covers:

1. direct freeform build request remains executable Owner obligation;
2. explicit `must/muss` freeform constraint remains executable Owner obligation;
3. Hotline Miami mood text is not promoted to a hard requirement;
4. Blade Runner inspiration is not promoted to a hard requirement;
5. ambiguous Boss/meta-progression language remains Unknown;
6. non-combat Monument Valley puzzle fixture does not inherit Titan/combat requirements;
7. explicit section decomposition remains stable;
8. fake early event still fails correlated gameplay;
9. a later correlated event can pass but remains labeled generated-event-dependent;
10. `score_change` is labeled harness-observed;
11. coverage metadata reaches the Owner-facing review path;
12. `owner-contract` Candidate promotion through the prompt adapter fails closed without memory mutation;
13. normal protected prompt promotion still requires human merge and remains reversible;
14. Titan Step 3 evidence/candidate state regression remains green;
15. full verifier Good/Bad and publishing regressions remain green.

Branch code SHA tested: `067f21f99dbc6fca467d8d14f2cef577b4f2aaeb`  
GitHub Actions: `33108373075` — **SUCCESS**.

## Candidate decision

Neither Titan learning candidate is promoted or activated.

- `titan-canary-3-visual-target-intake-v1`: remains `candidate`, `validatedAt = null`, `active = false`.
- `candidate-owner-feedback-8e1c9bf738f845cb`: remains `candidate`, `validatedAt = null`, `active = false`.

The Step 4 corrections are supported by independently reproduced code/evaluation defects and are implemented as protected architecture corrections, not as prompt lessons.

## Residual risks / future evidence targets

1. **HUD layout measurement:** the concrete `hud_layout_clear` claim is still not independent geometry evidence. A true measurement may be worth a separate focused repair.
2. **Zero-requirement freeform edge:** a headingless brief containing only ambiguous/context prose can still produce zero Owner requirements and fail closed. This is safer than inventing requirements; change only if a real failure mode justifies it.
3. **Subjective visual/product quality:** remains Playtester/Owner territory; no fake deterministic visual precision is introduced.
4. **Late feedback:** remains new preference discovery, never retroactive historical Product Truth.

## Decision

The minimal safe architecture after Step 4 is:

`Durable Owner Brief → conservative Owner obligations → Director/Engineer → scoped Product Fidelity evidence → Playtester → Owner awaiting-review`

Learning can discover and investigate defects, but only a promotion mechanism whose actual mutation matches its declared target layer may activate a lesson. Code-layer repairs stay human-reviewed code changes.
