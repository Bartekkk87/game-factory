# Lumen Current — GLM/OpenRouter 32k Director token-budget experiment GO

Status: Owner-authorized single paid diagnostic Production run.
Date: 2026-08-29.

Execution contract:
- product brief remains `ideas/lumen-current-openai-reference-retry-2026-08-29.md`;
- provider lane: `openrouter` / `production`;
- challenger model: current configured OpenRouter default `z-ai/glm-5.3-flash`;
- hard run budget: `$10`;
- Director and Director-repair max output budget: `32768` tokens (previous run: `8192`);
- all other role token budgets remain unchanged;
- GLM reasoning effort: `low`, reasoning details excluded;
- OpenRouter routing: `throughput`, `require_parameters=true`;
- existing verifier, release gate, repair/polish bounds, probe-contract satisfiability guard and Owner Contract semantics remain unchanged;
- no Learning Candidate may be activated or promoted by this authorization;
- authorization covers exactly one new paid Production run. No automatic additional retry is authorized.

Purpose: isolate the hypothesis that GLM-5.3-Flash exhausted the prior 8192-token Director/repair completion budget before emitting usable visible JSON. This run changes only the Director/Director-repair output ceiling to 32768 while preserving model, brief, provider, routing, budget and product gates.

Historical B1/B2/B3/post-repair failures remain immutable evidence. This run is explicitly labelled **32k Director token-budget experiment** and is not a pristine repetition of the original A/B experiment.
