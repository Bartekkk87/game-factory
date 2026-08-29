# Lumen OpenAI vs GLM-5.3-Flash — benchmark findings (2026-08-29)

## Status

This document records the first directly comparable successful Lumen production runs across the OpenAI reference lane and the OpenRouter `z-ai/glm-5.3-flash` challenger lane. It is benchmark evidence, not a permanent model-selection decision.

The frozen product brief and Owner Contract were kept constant. Existing Technical Verifier, Product Fidelity, Budget, Release Authority, repair bounds and Learning governance remained fail-closed.

## Runs compared

### OpenAI reference — run `20260829-084228`

- Result: SUCCESS / awaiting Owner review
- Draft: `drafts/lumen-current/index.html`
- Release Gate: PASS
- Technical: PASS
- Product Fidelity: PASS
- Playtester overall: 7.1 / 10
- Attempts: 1
- Debug repair rounds: 0
- Polish rounds: 0
- Cost: `$0.246244`
- Tokens: 76,870 total
  - input: 66,286
  - output: 10,584
- Production roles:
  - Director: `gpt-5.6-terra`
  - Engineer: `gpt-5.6-terra`
  - Playtester: `gpt-5.6-terra`
  - Auditor: `gpt-5.6-luna`

### GLM challenger — run `20260829-140002` / GitHub workflow `33256401858`

- Result: SUCCESS / awaiting Owner review
- Draft: `drafts/lumen-current-signal-garden/index.html`
- Release Gate: PASS
- Technical: PASS, 13/13 checks
- Product Fidelity: PASS, all 10 structured MH/NG requirements
- Playtester fidelity: PASS
- Playtester overall: 8.0 / 10
- Auditor: CONSISTENT
- Attempts: 2
- Debug repair rounds: 1
- Polish rounds: 0
- Cost: `$0.037381`
- Tokens: 166,199 total
  - input: 128,252
  - output: 37,947
- All model-backed roles used `z-ai/glm-5.3-flash` through the OpenRouter production lane.

## Critical token-ceiling finding

The GLM run provides direct evidence that the previous Engineer output cap could truncate this workload.

The initial GLM Engineer build consumed **19,461 output tokens**. The previous Engineer cap was **12,000 output tokens**. Therefore this successful workload could not have fit inside the old ceiling.

The current role ceilings used for the successful run were:

- Director: 32,768
- Engineer: 65,536
- Playtester: 32,768
- Auditor: 16,384

These values are ceilings, not token targets. The successful run did not require the roles to fill them.

Observed GLM output by role across all calls:

- Director including Director repair: 5,847 output tokens
- Engineer including build + repair: 31,203 output tokens
- Playtester: 597 output tokens
- Auditor: 300 output tokens

Conclusion: the expanded Engineer ceiling materially improved the validity of the GLM evaluation. The old 12k ceiling must not be used as evidence that GLM itself cannot complete the workload.

## Repair-loop finding

GLM's first generated build reached the verifier but failed exactly one Product Fidelity check: `MH-03`, because the success state was not reached in the verifier scenarios.

The Factory then executed the intended autonomous repair loop:

1. Director + Director repair completed.
2. Engineer produced a full initial build.
3. Technical/Product verification identified the concrete `MH-03` failure.
4. Engineer repair ran with verifier feedback.
5. Attempt 2 passed Technical + Product Fidelity.
6. Playtester scored the result 8/10.
7. Auditor returned CONSISTENT.
8. Deterministic Release Gate passed.
9. Draft and Review issue were created for Owner review.

This is the first successful GLM run in this comparison series that demonstrates the full repair-and-verification production path rather than failing before a valid game candidate.

## Cost and efficiency finding

GLM spend was `$0.037381` versus `$0.246244` for the OpenAI reference.

- GLM cost is approximately **15.18%** of the OpenAI reference cost.
- Equivalent reduction is approximately **84.82%**.

However, GLM used more total tokens and required an additional build/repair attempt. Cost efficiency therefore does not imply lower compute work or lower latency.

## Product-quality finding

Automatic evidence currently favors the GLM candidate on the advisory experience score (`8.0` vs `7.1`), while both candidates pass the authoritative Technical, Product Fidelity and Budget gates.

This must **not** be promoted to a permanent model-quality conclusion before Owner hands-on review. The two games must be played directly and compared on gameplay feel, responsiveness, visual coherence, readability, atmosphere, challenge, replayability and fidelity to the frozen Lumen brief.

## Current model-selection interpretation

`z-ai/glm-5.3-flash` is now a credible candidate for a primary Game Factory production role because it has demonstrated:

- a complete production run,
- deterministic Technical + Product Fidelity PASS after autonomous repair,
- advisory experience score above the configured threshold,
- consistent audit evidence,
- materially lower measured API spend than the OpenAI reference on this case.

But one successful challenger run is insufficient to declare a permanent winner. The correct next evidence is Owner hands-on comparison of both games, followed by additional frozen-case runs if the Owner experience supports the automated result.

## Governance / Learning

The successful GLM run generated controlled-learning candidate `candidate-production-run-63c55d700880c1da` with confidence `0.4`. It remains `active: false`; no automatic skill activation or promotion occurred.

Historical B1/B2/B3/Nemotron failures remain immutable evidence and are not overwritten by this successful run.
