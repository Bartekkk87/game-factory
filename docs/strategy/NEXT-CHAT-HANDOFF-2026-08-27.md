# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue `Bartekkk87/game-factory` seamlessly from the verified post-L3 hardening state.

**Start directly with L4 — Production Agents / P0.**

L1, L2 and L3 are complete and verified on `main`. Do not reopen them unless a concrete regression test exposes a defect.

**Do not start paid Titan Canary #3 yet.**

## Read these canonical sources first

1. `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
2. `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
3. `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
4. `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
5. `ARCHITECTURE.md`
6. GitHub Issue #3: `Production Hardening before Titan Canary #3`

## Verified technical baseline

Canonical verified `main` runtime head:

`52e843bba72bd3fe83ea2b34475a32e2076dcdee`

Full Verifier Selftest on that runtime head:

- GitHub Actions Run `33046180562` — **SUCCESS**

It verified:

- all Node syntax checks;
- L1 Control Kernel tests;
- L2 Model/Provider router + capability tests;
- L3 deterministic seed/timeline checks;
- immutable Owner Contract stability;
- Director traceability;
- Product Fidelity Green/Broken fixtures;
- real assembled runtime fidelity PASS/FAIL evidence;
- publishing gates and gallery escaping.

Documentation commits after this runtime head do not change the verified platform code.

## Completed — L1 Control Kernel

**DONE and verified.**

- real model/token price accounting;
- cost ledger by role/model/operation/attempt;
- pre-call budget enforcement;
- bounded Repair / Polish / Fresh-Rebuild budgets;
- deterministic release gate;
- unified run evidence.

Binding release rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

## Completed — L2 Model / Provider Layer

**DONE and verified.**

- fail-closed Role Router;
- Provider Registry;
- model capability + price registry;
- no silent cross-provider fallback;
- provider/capability validation before transport;
- OpenAI reference matrix prepared:
  - Director -> `gpt-5.6-terra`
  - Engineer -> `gpt-5.6-terra`
  - Playtester -> `gpt-5.6-terra`
  - Auditor -> `gpt-5.6-luna`
  - Release verdict -> no LLM

DeepSeek remains a later benchmark lane only.

## Completed — L3 Verification & Evidence

**DONE and verified.**

Implemented:

1. Immutable Owner Contract with stable `MH-xx` and `NG-xx` IDs plus deterministic hash.
2. Stable Owner-ID -> Director acceptance/probe traceability.
3. Deterministic verifier RNG seed persisted with every attempt.
4. Persisted deterministic input sequence.
5. `start -> early -> mid -> end` telemetry timeline.
6. Bounded engine/runtime gameplay events for score/state and product-specific mechanic evidence.
7. Deterministic Product Fidelity PASS/FAIL tied to owner IDs.
8. Product Fidelity integrated into build/repair/polish production flow.
9. Green + Broken fixtures for every new hard check.
10. Real end-to-end runtime fixture proving actual gameplay-value change PASS and decorative/fake upgrade FAIL.

L3 verification history:

- `33045193747` — SUCCESS
- `33045457760` — SUCCESS
- `33045637678` — SUCCESS
- `33045912220` — SUCCESS
- `33046078946` — SUCCESS
- final `main` Run `33046180562` — SUCCESS

## Immediate work order — L4 Production Agents / P0

Work autonomously and bottom-up within L4. After every meaningful change, require the **full Verifier Selftest to be green before continuing**.

### 1. Engineer contract alignment

Update `factory/prompts/engineer.md` and Engineer call context:

- remove stale wording about `random input` / `~15 seconds`;
- describe deterministic fixed verifier input + early telemetry evidence accurately;
- pass immutable Owner Contract explicitly;
- pass relevant acceptance/probe mappings explicitly;
- require product-specific runtime evidence via the bounded probe/event interface when an owner requirement cannot be inferred from generic state/score evidence;
- preserve bounded repair, fresh rebuild and verified-polish rollback behavior.

Do **not** implement the P1 incremental patch protocol yet unless required by a concrete P0 regression.

### 2. Playtester product context

The Playtester must receive:

- Owner Contract;
- compact GDD;
- acceptance/probe mapping;
- telemetry timeline;
- bounded runtime/mechanic events;
- screenshots;
- objective metrics.

Its output must separate:

- product-fidelity review (`PASS/FAIL`, missing Must-Haves / suspected No-Go violations);
- experience score and critique.

Important: deterministic Product Fidelity remains the machine authority. The Playtester fidelity result is an independent product-review signal and must not override deterministic evidence.

### 3. Auditor alignment

Auditor remains advisory only.

Align its digest/prompt so it summarizes:

- Technical gate;
- deterministic Product Fidelity gate;
- Playtester fidelity review;
- Experience score;
- Budget gate;
- deterministic release verdict.

It must not become release authority again.

### 4. GPT-5.6 reference lane

Before Canary #3, confirm the intended OpenAI reference matrix is the actual production route for the reference lane and is covered by router/capability tests.

Do not switch to an unbenchmarked DeepSeek model for the reference Titan.

### 5. Full L4 selftest

After all L4 P0 work:

- run/inspect the complete Verifier Selftest;
- require all syntax, L1, L2, L3, verifier and publishing checks to be green;
- do not proceed from a red intermediate state.

## Then perform the top-down integrity check

Prove this entire chain without gaps:

`Owner idea`
`-> immutable Owner Contract`
`-> Director acceptance/probe IDs`
`-> Engineer receives and implements them`
`-> deterministic verifier evidence`
`-> Product Fidelity PASS`
`-> Playtester independent fidelity review`
`-> Experience >= 6.5`
`-> Budget PASS`
`-> deterministic Release Gate`
`-> Owner Preview`

No owner requirement may disappear between layers.

## Canary rule

**Do not start Titan Canary #3 until L4 P0 + full selftest + top-down integrity check are green.**

Then run exactly one paid `Titan Core: Reforged` reference canary.

If it fails:

`classify failure -> repair platform -> full selftest -> only then decide whether another paid run is justified`

Never use repeated paid Titan runs as a debugging loop.

## Branch note

Branch `hardening/l4-production-agents` exists and was created from the verified L3 state. No L4 code commit has been accepted as verified yet. Inspect it first, but treat `main` runtime commit `52e843bba72bd3fe83ea2b34475a32e2076dcdee` as canonical until a new L4 commit passes the full selftest.

## Working style

Communicate briefly and simply. Avoid owner terminal work or micromanagement when GitHub/tools can perform the work autonomously. All work here is Gaming Development only.
