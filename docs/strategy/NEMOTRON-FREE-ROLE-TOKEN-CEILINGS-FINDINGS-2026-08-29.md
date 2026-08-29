# Nemotron Free / Role Token Ceilings — Findings — 2026-08-29

## Status

This document records the evidence-backed findings from the role-token-ceiling hardening and the first fully free NVIDIA/OpenRouter Production attempt. It does not declare a model winner and does not authorize another model-backed run.

Canonical implementation merge:

- PR #56 — `feat: role token ceilings and Nemotron free challenger`
- main merge SHA: `c339979eb4cff13bb4ff7c10eee0570956693684`
- Branch Verifier: `33252188281` — SUCCESS
- Trusted PR Selftest Gate: `33252189410` — SUCCESS
- exact-main Verifier: `33252481657` — SUCCESS

## 1. Why the Factory token ceilings were changed

The post-repair GLM Lumen run `20260829-115640` / workflow run #52 produced strong evidence that the former Engineer output ceiling was too small for this workload.

GLM Director:

- Director attempt 1: 3,591 output tokens
- Director repair: 2,972 output tokens
- Director role total: 6,563 output tokens
- Director ceiling used: 32,768

GLM Engineer:

- Build input: 14,541 tokens
- Build output: exactly 12,000 tokens
- Configured Engineer ceiling at that time: exactly 12,000
- Result: `engineer_invalid_output`
- Failure payload contains a visibly truncated JSON/code response.

This does not prove that every Engineer call needs more than 12k output tokens. It does prove that the previous fixed 12k ceiling can become the binding constraint for a legitimate large build response.

## 2. New role-specific ceilings

PR #56 replaced the single conservative ceiling with role-specific upper bounds:

- Director: 32,768
- Engineer build / repair / rebuild / polish: 65,536
- Playtester: 32,768
- Auditor: 16,384

These are ceilings, not target consumption. Normal responses may stop far below them. Existing budget, repair, polish, verifier, release and Owner-Contract gates remain authoritative.

## 3. JSON compatibility for models without provider-enforced response_format

The Factory now supports a fail-closed prompt-JSON compatibility path for registered models that do not support provider-enforced `response_format` / JSON object mode.

This is not a verifier relaxation. The response still has to survive the existing JSON extraction, role/schema validation, Owner Contract, proof-plan and deterministic verification layers. Invalid or truncated JSON remains a failure.

## 4. Explicit fully-free NVIDIA/OpenRouter routing

The registry and dispatch path now contain explicit free routes:

- `nvidia/nemotron-3.5-lightning:free` — Director / Engineer / Auditor candidate
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` — screenshot-capable Playtester candidate
- Nemotron Ultra Free is registered as an additional candidate but was not used in the first run.

The one-shot dispatcher pins every role explicitly to an OpenRouter free model so repository-level role variables cannot accidentally introduce an OpenAI or paid-model fallback.

## 5. First Nemotron Free Production run — failure before build

Workflow:

- Produce Game run: `33252485756`
- Run number: #53
- Production run: `20260829-122640`
- main SHA: `c339979eb4cff13bb4ff7c10eee0570956693684`
- frozen idea: `ideas/lumen-current-openai-reference-retry-2026-08-29.md`

Explicit runtime routing:

- Director: OpenRouter / `nvidia/nemotron-3.5-lightning:free`
- Engineer: OpenRouter / `nvidia/nemotron-3.5-lightning:free`
- Playtester: OpenRouter / `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- Auditor: OpenRouter / `nvidia/nemotron-3.5-lightning:free`

Configured ceilings:

- Director 32,768
- Engineer 65,536
- Playtester 32,768
- Auditor 16,384

Observed result:

- Setup / credential lane / browser / frozen idea preparation: PASS
- Phase A Director request started normally
- after exactly 360,000 ms: `director_transport_timeout`
- no Director completion was received
- no Engineer call occurred
- no game candidate was built
- no Playtester or Auditor call occurred
- no Owner preview or review issue was produced
- release remained fail-closed

Cost ledger:

- configured budget: $10
- nominal free endpoint price: $0
- recorded cost/spend: $0
- estimated Director input: 22,316 tokens
- max Director output requested: 32,768
- settled usage tokens: 0 because no provider completion was returned
- accounting is marked incomplete / billing-uncertain due the transport timeout, even though the configured endpoint itself is free.

Durable evidence:

- runtime-state commit: `2437273`
- `runs/20260829-122640/FAILURE.json`
- `runs/20260829-122640/RUN-EVIDENCE.json`
- structured Actions artifact ID: `9714867205`

## 6. What this run proves — and what it does not

### Proven

1. The new architecture is merged and exact-main verified.
2. All four Production roles were actually pinned to free OpenRouter/NVIDIA routes; there was no paid fallback.
3. Credential isolation and dispatch worked.
4. The Factory still fails closed when a free endpoint does not return within its transport budget.
5. The first Nemotron Lightning Free attempt hit the current 360-second transport limit in the Director phase.

### Not proven

1. The 32k Director ceiling was not exercised because no completion arrived.
2. The 65,536 Engineer ceiling was not exercised because Engineer never ran.
3. There is no Nemotron-generated game to compare with OpenAI Lumen or GLM.
4. The failure is not a product-quality result for Nemotron.
5. It is not yet possible to conclude whether Lightning Free is intrinsically too slow, temporarily capacity-constrained, or simply incompatible with the current 360-second Factory timeout for this prompt size.

## 7. Current model evidence hierarchy

- OpenAI Lumen reference: full Production success, deterministic technical + product-fidelity PASS, Playtester 7.1/10; Owner hands-on judgment remains separate.
- GLM: transport configuration now proven viable; Director can return within the enlarged 32k ceiling. The latest post-repair run then exposed the old 12k Engineer ceiling by returning exactly 12,000 output tokens and truncated JSON.
- Nemotron Lightning Free: routing works, but first full-size Director call timed out at 360 seconds before any completion. No quality comparison exists yet.

## 8. Governance boundary

No additional Production/model-backed retry is authorized by this record.

Before another model-backed run, the next decision should explicitly separate:

1. Factory transport policy / timeout design,
2. free-endpoint availability and latency,
3. role-to-model routing,
4. output ceiling adequacy,
5. actual product quality.

Do not infer a model winner from infrastructure failures.