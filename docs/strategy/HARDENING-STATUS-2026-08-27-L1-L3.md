# Game Factory — Verified Hardening Status after L1 + L2 + L3

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Purpose

This document freezes the verified project state after completing L1 Control Kernel, L2 Model / Provider Layer and L3 Verification & Evidence of the bottom-up Production Hardening plan.

**No paid Titan Canary #3 was started during this work.**

## Verified technical head

Current verified `main` technical commit:

`52e843bba72bd3fe83ea2b34475a32e2076dcdee`

Full Verifier Selftest on `main`:

- GitHub Actions Run `33046180562`
- Result: **SUCCESS**
- Covered: Node syntax, L1 Control Kernel, L2 Role Router/capabilities, verifier Green/Broken fixtures including L3 hard checks and runtime fidelity evidence, publishing gates and gallery escaping.

L3 verification milestones:

- seed + telemetry branch Run `33045193747` — SUCCESS
- Owner Contract + deterministic fidelity Run `33045457760` — SUCCESS
- Director traceability Run `33045637678` — SUCCESS
- production fidelity gate Run `33045912220` — SUCCESS
- bounded runtime fidelity end-to-end Run `33046078946` — SUCCESS
- final `main` Run `33046180562` — SUCCESS

Earlier milestones remain valid:

- L1 branch Run `33043702945` — SUCCESS
- L1 `main` Run `33043773007` — SUCCESS
- L2 branch Run `33044218651` — SUCCESS
- L2 final `main` Run `33044284014` — SUCCESS

## L1 — Control Kernel / P0 — DONE

Implemented and verified:

- real model-specific token-price accounting;
- cost evidence per role, model, operation and transport attempt;
- pre-call cost reservation and fail-closed run-budget enforcement;
- explicit Repair, Polish and Fresh-Rebuild call/USD budgets;
- deterministic release gate independent from the LLM Auditor;
- unified run-evidence schema.

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

## L2 — Model / Provider Layer — DONE

Implemented and verified:

- fail-closed Role Router;
- provider registry;
- model capability + pricing registry;
- explicit provider/model routing per role and operation;
- no silent cross-provider fallback;
- provider validation before model resolution;
- capability checks before transport;
- price metadata connected to L1 accounting.

Prepared OpenAI reference matrix:

- Director -> `gpt-5.6-terra`
- Engineer -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release verdict -> no LLM

DeepSeek remains a benchmark lane only until reference evidence exists.

## L3 — Verification & Evidence / P0 — DONE

Implemented and verified:

1. **Immutable Owner Contract**
   - stable `MH-xx` Must-Have IDs;
   - stable `NG-xx` No-Go IDs;
   - deep-frozen contract;
   - deterministic contract hash.

2. **Director traceability**
   - every owner requirement maps to stable acceptance/probe IDs;
   - unknown, missing or duplicate mappings fail closed;
   - traceability becomes verifier-visible evidence.

3. **Deterministic verifier execution**
   - fixed verifier RNG seed;
   - persisted exact seed and deterministic input sequence;
   - engine test RNG no longer depends on wall-clock time during verification.

4. **Telemetry timeline**
   - persisted `start -> early -> mid -> end` snapshots;
   - interactivity can pass from verified early progress instead of only mid -> end.

5. **Bounded gameplay/mechanic events**
   - engine/runtime emits bounded machine-readable events;
   - score/state changes are recorded;
   - product-specific mechanics can emit evidence without unbounded payload growth.

6. **Deterministic Product Fidelity gate**
   - owner requirement IDs are evaluated from traceability + runtime evidence;
   - a technically green game still fails release when Must-Haves are not evidenced or No-Gos are violated;
   - decorative/fake mechanics cannot satisfy a required gameplay-value change merely by claiming an upgrade exists.

7. **Green + Broken selftest coverage**
   - hard verifier checks have explicit failure fixtures;
   - Owner Contract stability is self-tested;
   - Product Fidelity has Green/Broken fixtures;
   - a real assembled runtime fixture proves true gameplay-value change PASS and fake upgrade FAIL.

8. **Production path integration**
   - build/repair/polish candidates must preserve both Technical PASS and Product Fidelity PASS;
   - failed polish cannot bypass fidelity by restoring only technical state.

## What remains open — L4 Production Agents / P0

The next active layer is **L4 — Production Agents**.

Required before Canary #3:

1. Align `factory/prompts/engineer.md` with the deterministic verifier. Remove stale `random input / ~15 seconds` wording and describe the fixed early-evidence contract.
2. Ensure Engineer Build / Repair / Rebuild / Polish receive the immutable Owner Contract plus relevant acceptance/probe contract, not only the raw owner brief/GDD.
3. Pass Owner Contract + compact GDD + telemetry/runtime events + screenshots into the Playtester.
4. Make Playtester output two separate concerns:
   - `fidelityVerdict` / missing owner requirements;
   - Experience scores / critique.
   Deterministic Product Fidelity remains authoritative; Playtester fidelity is an independent product-review signal, not a machine-gate override.
5. Keep Auditor advisory only and align its prompt/digest with the deterministic release authority.
6. Complete/verify the intended GPT-5.6 reference role matrix before the paid reference canary; do not silently switch to DeepSeek.
7. Run the full Verifier Selftest after every meaningful L4 change.
8. After L4 is green, perform the top-down integrity check.

## Top-down integrity check before Canary #3

Prove the complete chain:

`Owner idea`
`-> immutable Owner Contract`
`-> Director acceptance/probe IDs`
`-> Engineer implementation`
`-> deterministic verifier evidence`
`-> Product Fidelity PASS`
`-> Playtester independent fidelity review + Experience >= 6.5`
`-> Budget PASS`
`-> deterministic Release Gate`
`-> Owner Preview`

No owner requirement may disappear between layers.

## Canary rule

**Do not start Titan Canary #3 yet.**

Only after L4 P0 is implemented, the full selftest is green and the top-down integrity check passes, run exactly one paid `Titan Core: Reforged` reference canary.

If it fails:

`classify cause -> repair platform -> full selftest -> only then decide on another paid run`

## Current branch note

Branch `hardening/l4-production-agents` was created from the verified L3 `main` state. No L4 code commit has been accepted as verified yet. Treat `main` commit `52e843bba72bd3fe83ea2b34475a32e2076dcdee` as the canonical technical baseline.

## Working rule

After every meaningful platform change:

`change -> full Verifier Selftest -> only continue when green`

Owner terminal work and micromanagement should be avoided when GitHub/tools can perform the work autonomously.
