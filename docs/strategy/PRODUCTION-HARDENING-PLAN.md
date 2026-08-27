# Game Factory — Production Hardening Plan

Status: 2026-08-27

Purpose: record the process audit before the next paid Titan canary and distinguish completed hardening from later optimization work.

## 1. Current verified baseline

Verified hardening state:

- **L1 Control Kernel — DONE**
- **L2 Model / Provider Layer — DONE**
- **L3 Verification & Evidence — DONE**
- **L4 Production Agents / P0 — DONE**

Final L4 code head before documentation-only commits:

`ce0d061cbad98e8f2f5948e0910fd300dbd0b573`

Full Verifier Selftest with the dedicated L4 integrity test executed explicitly:

- GitHub Actions Run `33050867522`
- Result: **SUCCESS**

Top-down integrity check:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

Result: **PASS**.

No paid Titan Canary #3 has been started.

## 2. P0 hardening findings — completed

### P0-A — Product contract machine-enforced end to end — DONE

Implemented:

- immutable `ownerContract` from the owner brief;
- stable Must-Have/No-Go IDs;
- Director acceptance/probe traceability;
- verifier-visible owner-contract evidence;
- deterministic Product Fidelity PASS/FAIL;
- release requires generic technical PASS and owner-contract fidelity PASS;
- Engineer Build/Repair/Rebuild/Polish explicitly consume the immutable contract and traceability.

### P0-B — Playtester product context — DONE

Implemented:

- Playtester receives `ownerContract`, compact GDD, acceptance/probe mapping, telemetry, runtime events, screenshots, objective metrics and deterministic Product Fidelity;
- separate `fidelityVerdict` / missing-requirement review;
- Experience score remains a separate metric;
- deterministic Product Fidelity remains authoritative and cannot be overridden by the LLM Playtester.

### P0-C — OpenAI budget gate — DONE

Implemented:

- model price registry with input/cached-input/output rates;
- calculated spend from token categories;
- persisted spend per role/model/operation/attempt;
- conservative pre-call budget reservation;
- fail closed before unaffordable paid transport.

### P0-D — Verifier reproducibility — DONE

Implemented:

- deterministic verifier seed;
- persisted seed + exact deterministic input sequence;
- `start -> early -> mid -> end` telemetry timeline;
- early interactivity/progression evidence;
- bounded runtime/mechanic events;
- Green/Broken fixtures and real assembled runtime fidelity fixture.

### P0-E — Production-agent authority alignment — DONE

Implemented:

- Engineer prompt aligned with deterministic verifier behavior;
- Auditor strictly advisory and unable to own release PASS/FAIL;
- stray Auditor `verdict` output sanitized;
- deterministic `releaseFor(...)` remains sole authority;
- reference OpenAI role matrix pinned and router-tested;
- dedicated `factory/src/roles/test-production-agents.mjs` wired into `.github/workflows/verify.yml` and executed successfully.

## 3. Reference model strategy

Verified reference route for the controlled Titan canary:

| Role | Reference model |
|---|---|
| Director | `gpt-5.6-terra` |
| Engineer build/repair/rebuild/polish | `gpt-5.6-terra` |
| Playtester | `gpt-5.6-terra` |
| Auditor narrative | `gpt-5.6-luna` |
| Deterministic release verdict | no LLM |

DeepSeek remains a benchmark candidate, not the unbenchmarked reference production default.

Later optimization after reference evidence exists:

- benchmark `gpt-5.6-luna` for Director and Playtester;
- optionally use Luna for narrowly scoped repair tasks only if evals show no convergence loss;
- consider a single Sol rescue escalation only when Terra repeatedly proves insufficient and remaining budget explicitly allows it;
- add open-weight candidates as comparison lanes, not as an unverified automatic fallback.

## 4. Context and code-size strategy — P1

Do not introduce an arbitrary tiny code cap. The real risk is LLM amplification from repeated full-engine/full-game context.

Planned:

1. Record generated JS/CSS/HTML chars, lines and assembled bytes in every attempt.
2. Add a soft complexity warning first.
3. Add a conservative hard ceiling only after at least two successful genres establish real baselines.
4. Replace repeated full engine source with a versioned, machine-checked Engine API Contract/Manifest.
5. Introduce bounded incremental repair output where practical.
6. Preserve Fresh Rebuild for architecture-level failure.

`maxTokens` remains a cost/truncation guard, not a code-complexity policy.

## 5. Verifier evolution

### Generic technical contract — verified

- probe present;
- no runtime errors;
- no failed external requests/assets;
- game starts;
- deterministic gameplay progress;
- FPS gate;
- visual smoke test.

### L3/L4 additions — verified

- deterministic RNG seed;
- persisted deterministic input sequence;
- `start / early / mid / end` telemetry;
- immutable owner-contract IDs;
- Director acceptance/probe traceability;
- engine-generated score/state events;
- bounded product-specific mechanic events;
- deterministic Product Fidelity PASS/FAIL;
- Engineer/Playtester contract propagation;
- dedicated Production-Agent integrity test;
- Green/Broken fixtures and real assembled runtime fidelity fixture.

### Still P1

- engine/version/API-manifest SHA in evidence;
- stronger visual activity check.

## 6. LLM adapter evolution — later

Keep provider portability. Do not hard-wire the platform to a single vendor.

Already verified in L2:

- provider registry and fail-closed role routing;
- capability registry;
- price registry;
- no silent cross-provider fallback.

Later:

- JSON Schema/Structured Outputs where useful;
- role-specific reasoning effort tuning;
- prompt/context caching optimization;
- identical recorded benchmark lanes across providers.

## 7. Learning pipeline — P2

Planned safe loop:

`evidence -> lesson candidate -> deterministic/repeated support -> approved machine-readable lesson -> role context`

A single LLM opinion must not rewrite core rules.

## 8. Execution checklist before Canary #3

### P0 — required before the next paid Titan canary

- [x] Real OpenAI token-price accounting and enforceable per-run budget.
- [x] Engineer prompt aligned with deterministic verifier behavior; stale `random input / ~15 seconds` wording removed.
- [x] Interactivity evidence covers the early telemetry timeline.
- [x] Deterministic verifier RNG seed persisted with evidence.
- [x] Immutable Owner Contract with stable Must-Have / No-Go IDs.
- [x] Director acceptance criteria mapped into verifier-visible contract evidence.
- [x] Bounded gameplay/mechanic events and deterministic Product Fidelity PASS/FAIL.
- [x] Playtester receives Owner Contract/GDD/acceptance mapping/telemetry/events/screenshots and returns separate fidelity review.
- [x] Engineer Build/Repair/Rebuild/Polish receives immutable Owner Contract + acceptance/probe mapping.
- [x] Auditor digest/prompt aligned with deterministic release authority and new fidelity evidence.
- [x] OpenAI GPT-5.6 reference role matrix is the router-tested reference lane.
- [x] Dedicated `test-production-agents.mjs` executed explicitly in the Verifier workflow.
- [x] Full Verifier Selftest green after all L4 P0 changes — Run `33050867522`.
- [x] Top-down integrity check complete — PASS.

### P1 — after P0, preferably before the second genre

- [ ] Add Engine API Contract/Manifest and validate it against `gf-engine.js` in selftest.
- [ ] Add generated-code/context metrics to evidence.
- [ ] Add incremental/bounded repair protocol or equivalent token-amplification reduction.
- [ ] Strengthen visual smoke/activity detection.
- [x] Deterministic release verdict independent from LLM Auditor.
- [x] Cost/token stats persisted by role + attempt.

### P2 — after Titan + second genre both pass

- [ ] Benchmark Luna vs Terra per non-engineer role using recorded eval cases.
- [ ] Evaluate selective Sol rescue escalation.
- [ ] Add open-weight / DeepSeek comparison lane.
- [ ] Automate evidence-backed learning candidates.
- [ ] Add multi-game regression suite from accepted products.

## 9. Canary gate

From a P0 hardening perspective, the platform is now eligible for exactly one controlled `Titan Core: Reforged` Canary #3 **after the L4 branch is merged to `main` and the `main` Verifier Selftest is green**.

This closure task must **not** start that paid canary.

Canary success requires:

- exact owner idea selected;
- immutable owner contract and traceability preserved;
- budget accounting real;
- technical contract PASS;
- deterministic Product Fidelity PASS;
- independent Playtester fidelity review present;
- experience score >= 6.5;
- repair/fresh-rebuild/polish paths converge within budgets;
- audit/release evidence consistent;
- draft and evidence persisted;
- review issue created;
- preview playable.

If Canary #3 later fails, do not blindly rerun it. Classify the failure as product-generation, verifier, model-routing, budget, workflow or architecture failure; fix the platform; run the full selftest; then decide whether another paid run is justified.
