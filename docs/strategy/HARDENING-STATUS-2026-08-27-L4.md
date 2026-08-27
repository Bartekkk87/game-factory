# Game Factory — Hardening Status L4 / Production Agents

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`
Branch: `hardening/l4-production-agents`

## Status

L1 Control Kernel, L2 Model / Provider Layer and L3 Verification & Evidence remain completed and verified.

**L4 Production Agents / P0 — DONE and verified.**

The dedicated L4 integrity selftest is now an explicit step in `.github/workflows/verify.yml`, the complete Verifier Selftest is green, and the full top-down integrity check passed.

No paid `Titan Core: Reforged` Canary #3 has been started.

## L4 changes completed

### CI coverage

- Prompt changes under `factory/prompts/**` trigger the full `Verifier Selftest` workflow.
- `factory/src/roles/test-production-agents.mjs` is executed explicitly by the workflow.
- Existing runtime/control/router/verifier/publishing checks continue to run in the same job.

### Engineer

- Removed stale random-input / ~15-second verifier wording.
- Prompt describes the fixed deterministic verifier seed/input behavior and `start -> early -> mid -> end` evidence timeline.
- Product-specific requirements are expected to emit bounded `game.event(type, data)` runtime evidence.
- Build / Repair / Rebuild / Polish explicitly receive the immutable Owner Contract.
- Acceptance Criteria and Probe mappings are explicitly included in Engineer context.
- Engineer fails closed when the immutable Owner Contract or stable Acceptance/Probe traceability is missing.
- Existing targeted repair, Fresh Rebuild escalation and verified-polish rollback behavior remains intact.

### Playtester

- Playtester receives Owner Contract, compact GDD, Acceptance/Probe mapping, telemetry, bounded runtime events, screenshots, objective metrics and deterministic Product Fidelity results.
- Playtester output separates independent product-fidelity review from Experience scoring/critique.
- Deterministic Product Fidelity remains authoritative; Playtester fidelity is an independent advisory product-review signal and cannot override the machine gate.

### Auditor

- Auditor is explicitly advisory only.
- Auditor does not own release PASS/FAIL.
- Output is `CONSISTENT` / `CONCERNS` style assessment plus findings/summary.
- Any stray `verdict` field from an LLM response is stripped before returning the audit result.
- Auditor receives Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release Gate state.
- Deterministic `releaseFor(...)` remains the only release authority.

### Reference model lane

Router tests explicitly pin the OpenAI reference lane:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

DeepSeek remains a later benchmark lane, not the unbenchmarked reference-Titan route.

## L4 verification closure

### CI integration

Commit `7478b32d4b690d9c1909c544cb889dbd554cdfe7` wired the dedicated L4 test into `.github/workflows/verify.yml`.

The first explicit execution, GitHub Actions Run `33050802610`, correctly failed on an overly strict selftest assertion: the test rejected the literal `audit.verdict` even though production code only referenced it to delete/sanitize a non-authoritative LLM field.

Commit `ce0d061cbad98e8f2f5948e0910fd300dbd0b573` corrected the test to require that sanitization behavior instead of falsely rejecting it.

### Final full Verifier Selftest

GitHub Actions Run `33050867522` — **SUCCESS**.

Verified steps:

- Node syntax checks — PASS
- L1 Control Kernel budgets + release gate — PASS
- L2 model/provider router + capability gates — PASS
- L4 Production-Agent integrity — PASS
- Browser installation — PASS
- Verifier Green/Broken product fixtures — PASS
- Publishing gates + gallery escaping — PASS

This is the final L4/P0 branch verification evidence before documentation-only commits.

## Top-down integrity check — PASS

Verified chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

### 1. Owner Idea -> immutable Owner Contract — PASS

`produceGame(...)` creates and persists the immutable Owner Contract before Director execution. Stable Must-Have / No-Go IDs and the contract hash remain the binding product source.

### 2. Owner Contract -> Director IDs — PASS

Director receives the Owner Contract. Director traceability compiles stable Owner Requirement -> Acceptance / Probe IDs and fails closed on missing/invalid mappings.

### 3. Director IDs -> Engineer — PASS

Build / Repair / Rebuild / Polish receive the immutable Owner Contract and the GDD carrying Acceptance/Probe traceability. Engineer context explicitly exposes the contract and mappings.

### 4. Engineer -> deterministic Verifier Evidence — PASS

Every assembled candidate is verified with deterministic seed/input sequence, `start -> early -> mid -> end` telemetry, bounded runtime events, technical checks and candidate SHA evidence.

### 5. Verifier Evidence -> Product Fidelity PASS — PASS

`evaluateProductFidelity(...)` binds runtime evidence back to Owner Contract requirements and Director traceability. A candidate proceeds only when both Technical and deterministic Product Fidelity pass.

### 6. Product Fidelity -> independent Playtester Fidelity Review — PASS

Playtester receives Owner Contract, GDD, telemetry, runtime events, deterministic fidelity result, screenshots and objective metrics. Its fidelity review remains separate from Experience.

### 7. Experience >= 6.5 — PASS

The production configuration uses `GF_MIN_SCORE=6.5`; the deterministic release gate independently checks that the final numeric Experience score meets the threshold.

### 8. Budget PASS — PASS

`releaseFor(state)` uses the fail-closed cost report from L1 as the Budget gate. A release cannot pass without budget PASS.

### 9. deterministic Release Gate — PASS

Release authority is machine logic only:

`Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS`

Auditor and Playtester fidelity cannot override this gate.

### 10. Release Gate -> Owner Preview — PASS

Only after `finalRelease.pass` does the pipeline write the verified candidate to `drafts/<slug>/index.html` and create review metadata. The production workflow commits the draft/evidence and opens a GitHub Review Issue. On `main`, the Pages workflow deploys draft/product changes so the Owner can open the preview and approve or reject via the Review Issue.

**No Owner requirement disappears between intake and review.**

## L4 commit history

- `177a710234c427fce151d92227c2951b5ce47525` — CI triggers full selftest for production prompt changes
- `ac5c97916dae51f572188c713b583c673308fa75` — Engineer aligned with deterministic verifier evidence
- `a7a3e63c5353469e8b0c90a0dc240b4caac2078c` — production contracts passed through agent lanes
- `9261e1a6459620c0e89a76f72988bf92b438b583` — Engineer bound to immutable Owner Contract
- `56fd161c8d7a8a5bc8f41903204b867b0fe4b8f4` — independent Playtester fidelity review
- `d7ffb5c1f9a0a471c70bfc251e7b3164fd27dc31` — full fidelity evidence supplied to Playtester
- `4b7804242b24773b5c5c963fefab1b21ac8198ac` — Auditor prompt made strictly advisory
- `3f5c42c3cd06f71e1138b3da075c613b560de1fd` — Auditor release verdict removed from code
- `46cca8d93bfa3fe8d871bb230e9bc568cc8bf900` — agent review lanes kept non-authoritative in pipeline
- `67a71455c7330e4473130138cffbc72ed0556336` — all production-agent reference routes pinned in router tests
- `b19ac17243326235eebdd8c62079c0df667ca46d` — dedicated L4 production-agent integrity test added
- `7478b32d4b690d9c1909c544cb889dbd554cdfe7` — dedicated L4 integrity test wired into Verifier workflow
- `ce0d061cbad98e8f2f5948e0910fd300dbd0b573` — auditor sanitization assertion corrected; final L4 code head

## Decision

**L4 Production Agents / P0 is DONE.**

The platform is now eligible, from a hardening perspective, for exactly one paid `Titan Core: Reforged` Canary #3.

**Do not start that paid canary as part of this closure task.**

If the later paid canary fails:

`classify cause -> repair platform -> full Verifier Selftest -> only then decide whether another paid run is justified`.
