# Lumen Current — GLM/OpenRouter B3 GO

Status: Owner-authorized configured challenger retry.
Date: 2026-08-29.

Execution contract:
- product brief remains `ideas/lumen-current-openai-reference-retry-2026-08-29.md`;
- provider lane: `openrouter` / `production`;
- challenger model: current configured OpenRouter default `z-ai/glm-5.3-flash`;
- hard run budget: `$10`;
- GLM reasoning effort: `low`, reasoning details excluded;
- OpenRouter routing: `throughput`, `require_parameters=true`;
- existing verifier, release gate, repair/polish bounds and Owner Contract semantics remain unchanged;
- no Learning Candidate may be activated or promoted by this authorization.

B1/B2 remain historical evidence. This run is explicitly labelled **configured challenger retry (B3)** rather than a pristine repetition of the untouched A/B experiment.

The dispatcher exists only because the connected GitHub control surface cannot issue a new `workflow_dispatch` request directly. It must verify that the frozen Lumen retry brief is still the latest idea before dispatching `produce.yml` with `provider=openrouter`, `budget_usd=10`, and blank manual idea input.
