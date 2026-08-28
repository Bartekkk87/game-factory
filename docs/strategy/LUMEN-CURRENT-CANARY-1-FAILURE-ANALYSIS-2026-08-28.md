# Lumen Current — Production Canary #1 Failure Analysis

Date: 28.08.2026  
Issue: `#17` — Post-Repair Independent Game Canary — Owner Acceptance Proof  
Production run: `33207019862`  
Durable run: `runs/20260828-201007/`  
Trigger commit: `141a015cc67d32272fd2e84934e37461eafaa633`  
Evidence commit: `70200dc`  
Status: **PRODUCTION CANARY ATTEMPTED / FAILED FAIL-CLOSED IN DIRECTOR PHASE / NO DRAFT PRODUCED**

## 1. Authorized experiment

The Owner explicitly authorized exactly one paid Production Canary for **Lumen Current** with:

- provider: `openai`;
- Production lane: `production`;
- Director reference model: `gpt-5.6-terra`;
- unchanged OpenAI reference configuration;
- hard run budget: `$10`;
- no automatic second paid run.

The pushed Production idea file is byte-identical to the canonical preflight brief at the repository blob level:

- `ideas/lumen-current-independent-canary-2026-08-28.md`
- `evaluation/preflight/independent-canary-owner-brief-2026-08-28.md`
- both Git blob SHA: `508392f6d5691a4f68c1e620f9b0728ab5df1792`

## 2. Exact outcome

GitHub Actions Produce Game run `33207019862` concluded **FAILURE**.

The failure occurred in **PHASE A — DIRECTING** before Engineer execution.

The OpenAI Director call itself completed successfully at the provider/transport/accounting layer:

- provider: `openai`;
- model: `gpt-5.6-terra`;
- input tokens: `4,391`;
- output tokens: `3,492`;
- total tokens: `7,883`;
- settled cost: `$0.050686`;
- accounting complete: `true`;
- budget violations: none;
- remaining budget: `$9.949314`.

No Engineer, Repair, Polish or Fresh Rebuild call occurred.

No playable draft was produced and the Review Issue stage was correctly skipped.

## 3. Immediate deterministic failure cause

`FAILURE.json` records:

`Director proof plan unreachable: probe PR-MH-03 uses unsupported verifier state restored; probe PR-MH-04 uses unsupported verifier state glass_breach`

The Owner Contract requires a clear success state for `MH-03` and a clear failure state for `MH-04`.

The Director mapped those requirements to custom semantic state names:

- `PR-MH-03` -> `restored`
- `PR-MH-04` -> `glass_breach`

The canonical verifier state vocabulary only accepts:

- `boot`
- `title`
- `playing`
- `success` / alias `won`
- `failure` / aliases `failed`, `gameover`

Therefore `compileProofPlan(...)` rejected the GDD before Engineer spend.

### Classification

**Primary failure class: Director-to-Verifier terminal-state contract mismatch.**

This is not an API outage, budget failure, credential failure, runtime game failure, Product Fidelity failure, or Owner rejection.

## 4. Safety behavior that worked correctly

The Factory behaved fail-closed as designed:

1. invalid proof semantics were rejected before code generation;
2. no unsupported state was silently accepted;
3. no Engineer cost was incurred;
4. no draft was mislabeled as reviewable;
5. Release Authority remained closed;
6. durable `FAILURE.json` and `RUN-EVIDENCE.json` were committed;
7. budget accounting remained complete;
8. Controlled Learning did not activate or promote anything;
9. no second paid run was started.

This is positive evidence for deterministic pre-spend protection, even though the Product Canary itself failed.

## 5. New evidence-backed gaps

### Gap A — Director prompt does not enumerate the canonical state vocabulary

The Director prompt says that `state_reached` requires a `state`, but it does not state the finite supported verifier vocabulary. It also tells the Director to define expected states.

The observed model therefore chose product-semantic names (`restored`, `glass_breach`) that are meaningful to the game concept but invalid for the verifier contract.

This is a bounded prompt/context-contract reliability gap exposed by the real Production run.

### Gap B — Early Director contract failures are not yet converted into a bounded Learning finding

Controlled Learning triggered for the failed Production run, but the deterministic root-cause dossier contains no findings and concludes that no bounded hypothesis crossed threshold.

The durable `FAILURE.json` contains an explicit, highly specific Director proof-plan error, but the current root-cause path primarily reasons over attempt/runtime evidence. Because the run failed before Engineer attempts existed, the learning analysis produced:

- `candidateId: null`;
- no bounded finding;
- no validation proposal.

This is an observability/classification gap for pre-build Director failures. No Candidate was automatically created, which remains safe.

### Gap C — Preflight hash is not an exact Production-path cryptographic binding

The preflight brief and Production idea files are byte-identical in Git, but `factory/src/index.mjs` reads `--idea-file` and applies `.trim()` before `createOwnerContract(...)`.

Consequently:

- preflight `ownerBriefSha256`: `c439dcb495facc0075d27b6ffbca188073d332cffb3332e1916dab3f2bbff881`;
- Production `ownerBriefSha256`: `ddfe2c6fbd28011c1ce8717f8955459aa97977712fa519d5b22b7054ec8e1d49`.

The semantic Owner content is unchanged; the mismatch is caused by Production-path normalization of surrounding whitespace. In addition, the full Owner Contract SHA differs because `source` is part of the contract digest (`independent-canary-preflight-2026-08-28` vs `ideas-folder`).

Therefore the preflight's SHA values are evidence for the preflight artifact, but they are not an exact cryptographic binding to the later Production Owner Contract. For audit-grade preflight-to-run binding this should be made explicit or normalized identically.

## 6. Controlled Learning result

The automatic learning path ran without an additional LLM call.

Result:

- trigger: `YES`;
- root-cause dossier: created;
- bounded finding: none;
- Candidate: none;
- validation: not authorized;
- activation/promotion: not authorized;
- paid retry: not authorized.

This is safe but incomplete for this newly observed early-stage failure class.

## 7. Owner Acceptance status

The hands-on Owner ACCEPT/REJECT stage was **NOT REACHED** because no playable draft exists.

This run must not be counted as Product ACCEPT or Product REJECT. It is a **Factory Production failure before build**.

Issue `#17` therefore remains open.

## 8. Recommended next action — zero-paid only

Before any second paid Lumen Current attempt, perform a narrow deterministic repair/validation package focused only on the evidence above:

1. make the canonical verifier state vocabulary explicit in the Director runtime contract/prompt;
2. add regression coverage proving product-semantic terminal labels cannot escape as unsupported verifier `state_reached` values;
3. decide whether to canonicalize known semantic terminal aliases or require strict canonical output — fail-closed must remain;
4. extend early-failure root-cause intake so explicit `director_failed` proof-plan errors can become bounded diagnostic evidence without an LLM call;
5. align preflight and Production Owner-brief hashing/normalization so the preflight can bind exactly to the Production payload, while preserving raw source provenance separately;
6. run Full Verifier and Golden Corpus zero-paid;
7. stop for Owner authorization before any second paid Production Canary.

No second paid run is authorized by this document.
