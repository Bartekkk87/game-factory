# Game Factory — LLM Selection Requirements

Status: 2026-08-27

## Goal

Model selection is a measurable production decision, not a permanent vendor preference. Each role should use the cheapest model that reaches the required quality and convergence level on factory evidence.

## Current verified reference state

The L4/P0 production-agent hardening is complete on `main`.

Verified runtime merge commit:

`f7b5e2ebd75e405d857b3bec19d85231e02eaef8`

Full merged `main` Verifier Selftest:

GitHub Actions Run `33051402235` — **SUCCESS**.

The reference role matrix is explicitly router-tested:

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

No paid Titan Canary #3 has been started yet.

## Core requirements

1. Models are selected per role, not globally.
2. No model becomes the production default only because it is described as strong at coding; it must pass the same recorded factory eval cases.
3. Coding quality is measured by end-to-end convergence: technical PASS, owner-product fidelity PASS, repair convergence, experience quality, tokens, cost and latency.
4. Provider/model identifiers must remain configurable through the role router. No silent cross-provider fallback.
5. The platform must persist model ID, provider, token usage, estimated/actual cost and attempt number in run evidence.
6. Model changes must not weaken deterministic release gates.

## Engineer / Coding model requirement

DeepSeek is a priority coding candidate because its current model family is explicitly positioned for coding/agent workflows and has a strong cost profile. However, `deepseek/deepseek-chat` must NOT be hard-coded as the permanent Engineer model.

Reason: the OpenRouter slug `deepseek/deepseek-chat` currently represents the older DeepSeek V3 generation, while DeepSeek's current first-party API exposes newer V4 Flash and V4 Pro models. The factory must benchmark current pinned model IDs rather than depend on an ambiguous moving/legacy alias.

### Benchmark candidates

- Reference baseline: verified OpenAI Engineer reference lane using `gpt-5.6-terra`.
- DeepSeek cost/performance candidate: current stable DeepSeek V4 Flash model.
- DeepSeek quality candidate: current stable DeepSeek V4 Pro model.
- Optional later rescue model: higher-capability model only when evidence shows the normal Engineer lane is stuck and budget allows it.

### Engineer benchmark scorecard

For identical recorded tasks, compare:

- first-build technical PASS rate;
- repair convergence rate;
- fresh-rebuild recovery rate;
- owner-contract fidelity;
- runtime/API hallucinations;
- generated code size/complexity;
- input/output tokens;
- total estimated cost;
- latency;
- final experience score after polish.

The winner is not the model with the highest generic coding benchmark. The winner is the model with the best factory-specific quality/cost/convergence profile.

## Timing

Do NOT switch the next Titan canary to an unbenchmarked DeepSeek model. P0 production hardening is now complete and the reference lane is verified on `main`; the next step, only after new explicit Owner approval, is exactly one controlled paid `Titan Core: Reforged` Canary #3 using the verified reference matrix.

Recommended sequence:

1. P0 hardening + green verifier selftest — **DONE**.
2. One controlled reference Titan canary with the approved baseline model matrix — **NEXT only after explicit Owner approval**.
3. Freeze the resulting tasks/evidence as eval cases.
4. Benchmark DeepSeek V4 Flash/Pro on the same Engineer tasks.
5. Promote DeepSeek to primary Engineer only if it matches/exceeds quality and materially improves cost or convergence.
6. Repeat the comparison on a second game genre before declaring a durable production default.

## Decision rule

DeepSeek is therefore an explicit **candidate requirement now**, but a **production-default decision later** after evidence exists.
