# Lumen Current — GLM/OpenRouter post-repair retry GO

Status: Owner-authorized single paid configured challenger retry.
Date: 2026-08-29.

Execution contract:
- product brief remains `ideas/lumen-current-openai-reference-retry-2026-08-29.md`;
- provider lane: `openrouter` / `production`;
- challenger model: current configured OpenRouter default `z-ai/glm-5.3-flash`;
- hard run budget: `$10`;
- GLM reasoning effort: `low`, reasoning details excluded;
- OpenRouter routing: `throughput`, `require_parameters=true`;
- includes merged PR #53 probe-contract satisfiability protection on main (`7323a6ebca1b4d1dcf54ea77742617a47a1b3ec1`);
- existing verifier, release gate, repair/polish bounds and Owner Contract semantics remain unchanged;
- no Learning Candidate may be activated or promoted by this authorization;
- authorization covers exactly one new paid Production run. No automatic additional retry is authorized.

B1/B2/B3 remain immutable historical evidence. This run is explicitly labelled **post-repair configured challenger retry** and is not a pristine repetition of the untouched A/B experiment.

The dispatcher exists only because the connected GitHub control surface cannot issue a new `workflow_dispatch` request directly. It must verify that the frozen Lumen retry brief is still the latest idea before dispatching `produce.yml` with `provider=openrouter`, `budget_usd=10`, and blank manual idea input.
