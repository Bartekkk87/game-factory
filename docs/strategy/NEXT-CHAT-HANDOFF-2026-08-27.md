# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue `Bartekkk87/game-factory` seamlessly from the verified post-L1/L2 hardening state.

**Start directly with L3 — Verification & Evidence / P0.**

Do not start another paid Titan production canary yet. L1 and L2 are complete and verified; do not redesign them unless a concrete regression test exposes a defect.

## Canonical project sources

Read first:

- `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L2.md`
- `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
- `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
- `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
- `ARCHITECTURE.md`
- GitHub Issue #3: `Production Hardening before Titan Canary #3`

## Verified current technical state

The verified technical `main` head after L1 + L2 is:

`38afede9a555373f1eace84aa7f7a6c65302fa67`

The full Verifier Selftest on that technical head passed in:

- GitHub Actions Run `33044284014` — **SUCCESS**

It verified:

- all Node syntax checks;
- L1 Control Kernel tests;
- L2 Model/Provider router and capability tests;
- verifier green/broken fixtures;
- publishing gates;
- gallery escaping.

Documentation commits after that technical head do not change the tested runtime/platform code.

## Completed — L1 Control Kernel

L1 is **DONE**.

Implemented:

- real model-specific cost accounting;
- cost ledger per role/model/operation/transport attempt;
- enforceable run-budget reservation before paid LLM transport;
- explicit Repair / Polish / Fresh-Rebuild call and USD budgets;
- conservative fail-closed handling when billing evidence is uncertain;
- deterministic release gate independent from the LLM Auditor;
- unified run-evidence schema.

Release logic is binding:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

The Auditor may summarize evidence but cannot decide or override release eligibility.

L1 verification history:

- branch Run `33043702945` — SUCCESS
- `main` Run `33043773007` — SUCCESS

## Completed — L2 Model / Provider Layer

L2 is **DONE**.

Implemented:

- fail-closed Role Router;
- provider registry;
- model capability + pricing registry;
- explicit provider/model routing per role and operation;
- no silent cross-provider fallback;
- provider validation before model resolution;
- capability checks before transport;
- price metadata connected to the L1 budget ledger;
- GPT-5.6 long-context pricing behavior included in cost accounting.

Prepared reference role matrix:

- Director -> OpenAI `gpt-5.6-terra`
- Engineer -> OpenAI `gpt-5.6-terra`
- Playtester -> OpenAI `gpt-5.6-terra`
- Auditor -> OpenAI `gpt-5.6-luna`
- Release PASS/FAIL -> no LLM

DeepSeek remains a **benchmark candidate only**. Current DeepSeek V4 lanes may be registered, but must not become the production Engineer default before the approved reference Titan and identical recorded eval comparison.

L2 verification history:

- branch Run `33044218651` — SUCCESS
- final `main` Run `33044284014` — SUCCESS

## Immediate work order — L3 Verification & Evidence / P0

Inspect the current verifier, Director output contract, runtime probe/evidence path and existing fixtures, then implement bottom-up with tests.

Required outcomes:

### 1. Immutable Owner Contract

Convert the original Owner idea into a machine-readable immutable contract with stable IDs, for example:

- `MH-01`, `MH-02`, ... for Must-Haves;
- `NG-01`, `NG-02`, ... for No-Gos;
- explicit success criteria where useful.

Owner intent must not disappear or be silently weakened downstream.

### 2. Acceptance / probe traceability

Director acceptance criteria and `probePlan` must carry stable IDs and become verifier-visible evidence.

Required chain:

`Owner requirement ID -> Director acceptance/probe ID -> implementation/evidence -> fidelity verdict`

### 3. Deterministic verifier seed

Persist a deterministic RNG/test seed in every relevant attempt/run evidence object.

Same candidate + same seed + same test sequence should be reproducible.

### 4. Telemetry timeline

Replace the insufficient mid -> end-only view with at least:

`start -> early -> mid -> end`

or a compact periodic timeline that proves early interaction and progression.

Persist relevant state, score and runtime data.

### 5. Gameplay / mechanic events

Collect bounded machine-readable events that can prove owner requirements, for example:

- boss/Titan spawned or entered encounter;
- salvage collected;
- upgrade selected/applied;
- gameplay value actually changed;
- risk/reward choice made;
- distinct outcome occurred.

Do not rely on an LLM simply claiming these mechanics exist.

### 6. Product Fidelity gate

Add deterministic, evidence-driven Product Fidelity PASS/FAIL logic tied to Owner Contract IDs.

A game may be technically green but must fail release if required product mechanics are not evidenced.

### 7. Fixtures before hard checks

Every new deterministic verifier check requires:

- at least one Green fixture that must PASS;
- at least one Broken fixture that must FAIL for the intended reason.

### 8. Selftest discipline

After every meaningful L3 change:

1. full GitHub Verifier Selftest;
2. inspect result;
3. continue only if green.

If red:

`classify cause -> repair platform -> selftest -> continue`

Do not advance on an unverified intermediate state.

## Then L4 — Production Agents

Only after L3 is green:

- Director produces/consumes the Owner Contract and acceptance IDs correctly;
- Engineer sees the immutable owner requirements and relevant acceptance contract;
- Playtester receives Owner Contract + compact GDD + telemetry + screenshots and returns distinct Fidelity/Experience outputs as designed;
- Auditor remains advisory only;
- align stale Engineer/verifier wording with deterministic verifier behavior;
- preserve bounded repair / fresh rebuild / polish rollback behavior.

## Final top-down integrity check

Before Canary #3 prove this complete path:

`Owner idea`
`-> immutable Owner Contract`
`-> Director acceptance/probe IDs`
`-> Engineer implementation`
`-> deterministic verifier evidence`
`-> Product Fidelity PASS`
`-> Experience >= 6.5`
`-> Budget PASS`
`-> deterministic Release Gate`
`-> Owner Preview`

No Owner requirement may disappear between layers.

## Canary rule

**Do not start Titan Canary #3 yet.**

Only after all remaining P0 work in L3/L4 is implemented, the full selftest is green, and the top-down integrity check passes, run exactly one paid `Titan Core: Reforged` reference canary.

Canary success requires:

- exact Owner idea selected;
- immutable contract traceability;
- real budget accounting;
- Technical PASS;
- Product Fidelity PASS;
- Experience >= 6.5;
- evidence consistency;
- convergence within bounded repair/rebuild/polish limits;
- draft persisted;
- review issue created;
- preview playable.

If it fails: classify the failure, fix the platform, run the full selftest, then decide whether another paid run is justified.

## Model benchmark rule

Do not switch the reference Titan to an unbenchmarked DeepSeek model.

After one green reproducible reference Titan:

1. freeze relevant Engineer tasks/evidence as eval cases;
2. benchmark current DeepSeek V4 coding candidates against the same tasks;
3. compare technical convergence, product fidelity, hallucinations, code complexity, tokens, cost, latency and final experience;
4. promote only if evidence supports it;
5. repeat on a second game genre before declaring a durable production default.

## Working style

The Owner is a layperson. Communicate status and decisions briefly and simply. Avoid Owner terminal work and unnecessary micromanagement when GitHub/tools can do the work autonomously.

All work in this chat context is Gaming Development only.
