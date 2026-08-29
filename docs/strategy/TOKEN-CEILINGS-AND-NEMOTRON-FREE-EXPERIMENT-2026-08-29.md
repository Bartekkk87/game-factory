# Token Ceilings + Nemotron Free Experiment — 2026-08-29

## Why this change exists

Lumen GLM evidence showed that hard output ceilings can create false model-quality failures by truncating otherwise valid work:

- Run `33249791249`: repeated 8192-token Director completions ended as empty completion.
- Run `33251258474`: after Director ceiling was raised to 32768, Director completed with 3591 output tokens and Director repair completed with 2972 output tokens.
- In the same run, Engineer still had the old 12000 ceiling and consumed exactly 12000 output tokens before the JSON/code was truncated, producing `engineer_invalid_output`.

Conclusion: output ceilings should be generous safety ceilings, not artificial target lengths. Spend remains controlled by the existing global/stage budgets, call counts and model capability gate.

## New default role ceilings

- Director / Director repair: 32768
- Engineer build / repair / rebuild / polish: 65536
- Playtester: 32768
- Auditor: 16384

All remain configurable through `GF_*_MAX_TOKENS` and workflow-dispatch inputs. A model whose verified maximum is lower fails capability resolution before the API call.

## JSON compatibility rule

Models with provider-enforced JSON continue to use `response_format`.

Models whose OpenRouter endpoint does not support `response_format` may use `jsonMode=prompt` only when explicitly registered. The adapter then adds a strict machine-output contract requiring exactly one complete JSON object. The Factory still applies `extractJson` plus deterministic role/schema/Owner Contract/verifier validation and fails closed on malformed or incomplete output. This is compatibility, not a relaxation of validation.

## Registered NVIDIA/OpenRouter free routes

### Nemotron 3.5 Lightning Free

Slug: `nvidia/nemotron-3.5-lightning:free`

Pinned OpenRouter metadata at 2026-08-29:
- price: $0 input / $0 output
- context: 1,000,000
- max completion: 65,536
- tools supported
- `response_format` unsupported
- text-only for Factory capability purposes
- first planned core challenger because it is optimized for high-throughput agentic workloads.

### Nemotron 3 Ultra Free

Slug: `nvidia/nemotron-3-ultra-550b-a55b:free`

Pinned OpenRouter metadata at 2026-08-29:
- price: $0 input / $0 output
- context: 1,000,000
- max completion: 65,536
- tools supported
- `response_format` unsupported
- long-running reasoning/orchestration/coding positioning
- model-specific request timeout: 900 seconds because current free-endpoint throughput/availability is materially weaker than Lightning.

Ultra is registered but is not the first automatic challenger.

### Nemotron 3 Nano Omni Free

Slug: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`

Pinned OpenRouter metadata at 2026-08-29:
- price: $0 input / $0 output
- context: 256,000
- max completion: 65,536
- image input supported
- `response_format` unsupported
- role in first free experiment: screenshot Playtester only.

## Free endpoint quota

OpenRouter's published free-model policy at 2026-08-29 states:
- below $10 purchased credits: 50 free-model requests/day;
- $10 or more purchased credits: 1,000 free-model requests/day;
- 20 requests/minute in either case.

Failed/retried requests can still consume request quota even when token price is $0. Factory retry/call bounds therefore remain important.

## First controlled run

Frozen product: Lumen Current.

Routing:
- Director: Nemotron 3.5 Lightning Free
- Engineer: Nemotron 3.5 Lightning Free
- Playtester: Nemotron 3 Nano Omni Free
- Auditor: Nemotron 3.5 Lightning Free

No paid fallback is configured. The `$10` run budget remains as a generic fail-closed guard but every configured route in this run has registry pricing $0/$0.

The experiment is not a pristine replay of the original OpenAI-vs-GLM A/B. It is a new token-ceiling/free-model challenger experiment. Owner hands-on product judgment remains separate from deterministic technical/product-fidelity PASS.

## Source references

Official OpenRouter model pages and rate-limit/free-inference documentation were verified on 2026-08-29 before registration. Registry `contractSource` fields pin that verification date and endpoint-specific assumptions.
