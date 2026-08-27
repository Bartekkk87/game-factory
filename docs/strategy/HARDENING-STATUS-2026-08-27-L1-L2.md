# Game Factory — Verified Hardening Status after L1 + L2

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Purpose

This document freezes the verified project state after completing the first two layers of the bottom-up Production Hardening plan.

No paid Titan Canary #3 was started during this work.

## Verified technical head

Current verified `main` technical commit:

`38afede9a555373f1eace84aa7f7a6c65302fa67`

Full Verifier Selftest on `main`:

- GitHub Actions Run `33044284014`
- Result: **SUCCESS**
- Covered: syntax, L1 Control Kernel tests, L2 model/provider router tests, verifier green/broken fixtures, publishing gates and gallery escaping.

Earlier verification milestones:

- L1 branch: Run `33043702945` — SUCCESS
- L1 `main`: Run `33043773007` — SUCCESS
- L2 branch: Run `33044218651` — SUCCESS

## L1 — Control Kernel / P0 — DONE

Implemented and verified:

- real model-specific token-price accounting;
- cost evidence per role, model, operation and transport attempt;
- pre-call cost reservation and fail-closed run-budget enforcement;
- no dependence on provider-specific `usage.cost` being present;
- explicit Repair, Polish and Fresh-Rebuild call/USD budgets;
- deterministic release-gate function independent from the LLM Auditor;
- release rule fixed as:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

- unified run-evidence schema;
- conservative fail-closed treatment of uncertain/missing billing evidence.

Important implementation lesson:

A first L1 test exposed a JavaScript null-to-zero accounting bug. It was classified and fixed before proceeding. No paid production rerun was used as a diagnostic tool.

## L2 — Model / Provider Layer — DONE

Implemented and verified:

- fail-closed Role Router;
- provider registry and provider metadata;
- model capability + pricing registry;
- explicit provider/model selection per role and operation;
- no silent cross-provider fallback;
- provider validation occurs before model fallback/resolution;
- capability checks before transport (text, vision, JSON/structured output, reasoning and output limits as applicable);
- price metadata flows into the L1 cost ledger;
- GPT-5.6 long-context pricing behavior is accounted for in the cost model.

Current reference role defaults prepared in the router:

- Director -> OpenAI `gpt-5.6-terra`
- Engineer -> OpenAI `gpt-5.6-terra`
- Playtester -> OpenAI `gpt-5.6-terra`
- Auditor -> OpenAI `gpt-5.6-luna`
- Release verdict -> no LLM

DeepSeek decision remains unchanged:

- current DeepSeek V4 candidates are registered/prepared as later benchmark lanes;
- DeepSeek is **not** the production Engineer default yet;
- no unbenchmarked DeepSeek model may replace the next reference Titan lane;
- benchmark only after P0 and one green reproducible reference Titan, using identical stored eval cases.

## What remains open

The next active layer is **L3 — Verification & Evidence**.

P0 work still required before Canary #3:

1. immutable Owner Contract with stable Must-Have / No-Go IDs;
2. Director acceptance/probe IDs carried into verifier-visible evidence;
3. deterministic verifier RNG seed persisted in evidence;
4. start / early / mid / end or periodic telemetry timeline;
5. gameplay/mechanic events sufficient to prove product requirements;
6. deterministic Product Fidelity PASS/FAIL gate;
7. Playtester integration with Owner Contract + GDD + telemetry + screenshots;
8. alignment of Engineer/verifier wording where stale assumptions remain;
9. full selftest green after all L3/L4 P0 changes;
10. top-down integrity check before any paid Canary #3.

## Working rule

After every meaningful platform change:

`change -> full Verifier Selftest -> only continue when green`

If a test fails:

`classify cause -> repair platform -> selftest -> continue`

Do not use paid Titan runs to discover or repeatedly reproduce platform defects.

## Next entry point

Continue from:

**L3 — Verification & Evidence / P0**

Canonical handoff:

`docs/strategy/NEXT-CHAT-HANDOFF-2026-08-27.md`
