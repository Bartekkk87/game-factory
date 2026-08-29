# Lumen Current — GLM/OpenRouter expanded role token ceilings GO

Status: Owner-authorized single paid diagnostic Production run.
Date: 2026-08-29.

Execution contract:
- product brief remains `ideas/lumen-current-openai-reference-retry-2026-08-29.md`;
- provider lane: `openrouter` / `production`;
- challenger model: current configured OpenRouter default `z-ai/glm-5.3-flash`;
- hard run budget: `$10`;
- Director and Director-repair max output ceiling: `32768` tokens;
- Engineer Build/Repair/Rebuild/Polish max output ceiling: `65536` tokens;
- Playtester max output ceiling: `32768` tokens;
- Auditor max output ceiling: `16384` tokens;
- these values are ceilings, not target consumption;
- GLM reasoning effort: `low`, reasoning details excluded;
- OpenRouter routing: `throughput`, `require_parameters=true`;
- existing verifier, release gate, repair/polish bounds, probe-contract satisfiability guard and Owner Contract semantics remain unchanged;
- no Learning Candidate may be activated or promoted by this authorization;
- authorization covers exactly one new paid Production run. No automatic additional retry is authorized.

Purpose: test GLM-5.3-Flash on the frozen Lumen comparison case with the expanded role-specific token ceilings now implemented on current `main`, giving the model sufficient output headroom while preserving the comparison conditions and all quality/governance gates.

Historical B1/B2/B3/post-repair failures remain immutable evidence. This run is explicitly labelled **expanded role token ceilings experiment** and must be evaluated separately from the historical runs.
