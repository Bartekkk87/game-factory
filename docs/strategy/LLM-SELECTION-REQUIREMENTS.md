# Game Factory — LLM Selection Requirements

Status: 2026-08-27

## Goal

Model selection is a measurable production decision, not a permanent vendor preference. Each role should use the cheapest model that reaches the required quality and convergence level on factory evidence.

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

- Reference baseline: current approved OpenAI Engineer candidate (GPT-5.6 Terra during hardening/eval).
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

Do NOT switch the next Titan canary to an unbenchmarked DeepSeek model. First complete P0 production hardening and establish one green, reproducible reference lane. Then run DeepSeek against the same stored Titan/eval evidence without changing the surrounding pipeline.

Recommended sequence:

1. P0 hardening + green verifier selftest.
2. One controlled reference Titan canary with the approved baseline model matrix.
3. Freeze the resulting tasks/evidence as eval cases.
4. Benchmark DeepSeek V4 Flash/Pro on the same Engineer tasks.
5. Promote DeepSeek to primary Engineer only if it matches/exceeds quality and materially improves cost or convergence.
6. Repeat the comparison on a second game genre before declaring a durable production default.

## Decision rule

DeepSeek is therefore an explicit **candidate requirement now**, but a **production-default decision later** after evidence exists.
