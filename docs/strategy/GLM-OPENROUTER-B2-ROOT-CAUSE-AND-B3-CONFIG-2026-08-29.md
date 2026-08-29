# GLM / OpenRouter B2 Root Cause and B3 Configuration — 2026-08-29

## Status

B1 and B2 remain durable benchmark evidence. No paid B3 run is executed by this change. A configured challenger retry requires separate Owner authorization.

## Fixed experiment reference

- Product: Lumen Current
- OpenAI reference: workflow run `33243770348`
- OpenRouter challenger: workflow run `33244431992`
- B2 runtime run id: `20260829-092132`
- OpenRouter model: `z-ai/glm-5.3-flash`
- Production run budget: `$10`

## B1

The original OpenRouter challenger failed before producing a game because the Director request reached the Factory's previous 180-second transport timeout. No product-quality conclusion was possible.

## B2

B2 kept the same Lumen Owner brief and OpenRouter challenger but raised only the OpenRouter request timeout to 360 seconds.

Observed trajectory:

1. Director attempt 1 ran for about 192 seconds and settled at exactly 8,192 output tokens, but no usable visible completion was returned (`Empty completion`).
2. Director attempt 2 succeeded. The concept was `Lumen Current: Signal Garden`.
3. Engineer build then ran for exactly the Factory's 360-second request window and was aborted before a complete response was available.
4. No game candidate reached deterministic verification. No Preview or Review Issue was produced.
5. The durable failure was recorded as `engineer_invalid_output`, although the underlying error was a transport timeout (`Invalid JSON response: This operation was aborted`).

The B2 cost ledger recorded `$0.018204` total. The Engineer amount was conservative billing-uncertain reservation because final provider usage was unavailable after abort.

## Wallet and API-key limit are not the cause

The production request was admitted by OpenRouter, no HTTP 402/429 budget-limit response occurred, and the Factory's own run budget remained almost completely unused. The Owner also reports approximately `$30` wallet balance and a `$10` API-key limit. Nothing in B1/B2 evidence indicates that either OpenRouter credit or the key spending limit caused the failures.

## Configuration findings

### 1. GLM reasoning metadata was wrong in the Factory registry

Official OpenRouter model metadata for `z-ai/glm-5.3-flash` reports reasoning as mandatory/default-enabled and supports `max`, `high`, and `low` effort, with `max` as the default effort.

The Factory registry previously declared `reasoning: false` and therefore emitted no explicit reasoning configuration. The challenger was consequently allowed to use the provider/model default reasoning behavior. This is material for large JSON/code generations because reasoning and visible completion consume the completion budget.

Correction for the configured challenger:

```json
"reasoning": {
  "effort": "low",
  "exclude": true
}
```

The purpose is not to weaken product requirements. It bounds hidden reasoning overhead so the requested visible GDD/game JSON has sufficient latency and output headroom.

### 2. OpenRouter default routing optimizes primarily for price, not Factory throughput

OpenRouter can route a model request across multiple upstream providers. Official routing documentation supports explicit `provider.sort = "throughput"`, and `require_parameters = true` can restrict routing to upstream providers that support the request parameters.

GLM-5.3-Flash has substantial throughput variance across available providers. For a Factory Engineer call that may generate thousands of visible code tokens, price-first routing is not the desired optimization objective.

Correction for this GLM challenger:

```json
"provider": {
  "sort": "throughput",
  "require_parameters": true
}
```

This leaves provider failover available while making throughput the routing objective.

### 3. Timeout failure classification was too coarse

The pipeline previously mapped nearly every exception raised while building to `engineer_invalid_output`. A request aborted by the Factory timeout therefore looked like malformed generated code even though no complete content reached `extractJson()` or `validateDesign()`.

The LLM client now marks Factory aborts with `REQUEST_TIMEOUT`, and the pipeline records role-specific terminal reasons such as:

- `director_transport_timeout`
- `engineer_transport_timeout`
- `playtester_transport_timeout`

Actual malformed Engineer output still remains `engineer_invalid_output`.

## B3 configured-challenger contract

A future B3, if separately authorized, should preserve:

- exact Lumen Owner brief and Owner Contract semantics,
- `provider=openrouter`,
- `z-ai/glm-5.3-flash`,
- `$10` hard run budget,
- existing verifier, release gate, repair/polish bounds and product requirements,
- 360-second per-request OpenRouter timeout.

The deliberate API/harness corrections are:

- GLM reasoning capability represented truthfully,
- reasoning effort explicitly `low`, reasoning details excluded from returned payload,
- OpenRouter upstream routing sorted by throughput,
- required-parameter support enforced,
- transport timeout evidence classified accurately.

B3 must be labelled **configured challenger retry**, not a pristine repetition of the original untouched A/B. B1 and B2 remain part of the benchmark because they demonstrate the operational behavior of the original integration.

## Interpretation boundary

B1/B2 do not prove that GLM-5.3-Flash itself is low quality. They prove that the original Factory/OpenRouter configuration was operationally unsuitable for this workload. A configured B3 is needed to separate gateway/routing/reasoning configuration effects from any remaining model-level latency or output-quality limitations.

No learning candidate is activated or promoted by this remediation, and no paid model call is started by this change.
