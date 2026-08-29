# Lumen Current — Controlled A/B Product Canary Plan

Date: 29.08.2026  
Status: OWNER AUTHORIZED / RUN A READY  
Canonical Owner brief: `evaluation/preflight/independent-canary-owner-brief-2026-08-28.md`

## Purpose

Execute the already prepared Lumen Current Product Canary as a controlled model comparison without changing the product brief, Owner Contract, verification rules, repair/polish bounds, or learning state between runs.

## Frozen product identity

- Product: **Lumen Current**
- Owner brief SHA-256: `c439dcb495facc0075d27b6ffbca188073d332cffb3332e1916dab3f2bbff881`
- Owner Contract SHA-256: `7bf0e509b40f37fc298990725234c67a1e90af43ae78794cde5bcf3001719af6`
- Hard Must-Haves: **7**
- Hard No-Gos: **3**
- Hard Fidelity claims: **10**

The Owner brief must remain byte-for-byte semantically unchanged for both model runs. No requirement may be added, removed, softened, or reinterpreted between A and B.

## Controlled experiment order

### Run A — OpenAI reference

Frozen reference configuration:

- Director: `openai:gpt-5.6-terra`
- Engineer: `openai:gpt-5.6-terra`
- Playtester: `openai:gpt-5.6-terra`
- Auditor: `openai:gpt-5.6-luna`
- Provider lane: `openai / production`
- Hard budget ceiling: **USD 10**

Run A is the Product Reference and must execute first.

### Run B — OpenRouter challenger

After Run A completes, execute the identical Lumen Current Owner brief through the OpenRouter production lane using the current registered OpenRouter default `z-ai/glm-5.3-flash`, unless a role-specific immutable routing rule applies by design.

- Provider lane: `openrouter / production`
- Challenger: `z-ai/glm-5.3-flash`
- Hard budget ceiling: **USD 10**

## Isolation rules

Between Run A and Run B:

1. No Product brief change.
2. No Owner Contract change.
3. No prompt, skill, verifier, gate, retry, repair, polish, budget, or routing-policy change.
4. No Learning Candidate may be validated, activated, promoted, or consumed as new Production knowledge from Run A before Run B finishes.
5. Evidence from Run A may be stored, but must not alter Run B execution behavior.
6. No manual product repair is permitted between A and B.

## Comparison dimensions

Both runs will be compared on at least:

- Production pipeline completion / fail state;
- first-pass build success;
- repair/rebuild/polish rounds;
- deterministic verifier and audit result;
- hard Owner-Contract fidelity;
- actual API/token cost;
- runtime/latency;
- critical failures;
- final hands-on Owner assessment of playability, fun, readability, visual quality, fidelity and replayability.

A technical PASS does not equal Product acceptance.

## Decision boundary

No model is promoted to a Production winner merely because one Canary is cheaper or technically green. The A/B result is evidence for a later Owner decision and, if warranted, a model-backed S5 comparison.

## Authorization

On 29.08.2026 the Owner explicitly authorized recording this plan and executing it. Run A is therefore authorized under the existing Production controls and USD 10 hard cap. Run B is also authorized as the second half of this frozen comparison, but must not run before Run A completes and the isolation conditions above are preserved.
