# Lumen Current — Nemotron Free Challenger GO

Status: Owner-authorized single zero-token-cost configured challenger run.
Date: 2026-08-29.

Execution contract:
- frozen product brief remains `ideas/lumen-current-openai-reference-retry-2026-08-29.md`;
- credential lane: OpenRouter / production;
- Director + Engineer + Auditor: `nvidia/nemotron-3.5-lightning:free`;
- screenshot Playtester: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` because Lightning is text-only;
- both selected endpoints are explicit `:free` routes with registry pricing fixed at $0 input / $0 output;
- no paid fallback model is configured;
- run budget guard remains `$10`, but model pricing for every configured role in this run is `$0`;
- token ceilings: Director 32768, Engineer 65536, Playtester 32768, Auditor 16384;
- prompt-only JSON compatibility is allowed only where provider `response_format` is unsupported; all existing `extractJson`, role validation, Owner Contract, verifier, release gate, repair/polish and fail-closed checks remain authoritative;
- no Learning Candidate may be activated or promoted by this authorization;
- authorization covers exactly one new Production run. No automatic additional Production run is authorized.

Purpose:
1. measure real completion-token consumption when the Factory does not truncate core generation at 8k/12k;
2. compare Lumen technical/product-fidelity outcomes against the OpenAI reference and GLM attempts;
3. validate whether free OpenRouter/NVIDIA endpoints can serve the Factory without weakening deterministic gates.

Privacy note: OpenRouter/NVIDIA free endpoints may log trial traffic under their published free-endpoint terms. This run contains only the public Game Factory/Lumen development context and must not include secrets or personal/confidential data.
