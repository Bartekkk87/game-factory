# Game Factory — Production Hardening Plan

Status: 2026-08-27

Purpose: record the process audit before the next paid Titan canary. This document separates the current verified baseline from planned changes. No item below should be treated as implemented until its checkbox is complete and the verifier selftest is green.

## 1. Current verified baseline

The verified platform runtime head is now `52e843bba72bd3fe83ea2b34475a32e2076dcdee` and passed the full Verifier Selftest on `main` in GitHub Actions Run `33046180562` — **SUCCESS**.

The current pipeline is:

`Owner idea -> immutable Owner Contract -> Director acceptance/probe traceability -> Engineer -> technical + fidelity verifier -> repair/fresh rebuild -> Playtester -> polish/reverify -> Auditor -> deterministic release gate -> draft -> owner review -> publish/reject`

Verified hardening state:

- **L1 Control Kernel — DONE**
- **L2 Model / Provider Layer — DONE**
- **L3 Verification & Evidence — DONE**
- **L4 Production Agents — NEXT / P0**

No paid Titan Canary #3 has been started.

## 2. Audit findings

### P0-A — Product contract is machine-enforced end to end through the verifier — DONE in L3

Implemented:

- immutable `ownerContract` from the owner brief;
- stable Must-Have/No-Go IDs;
- Director acceptance/probe traceability;
- verifier-visible owner-contract evidence;
- deterministic Product Fidelity PASS/FAIL;
- release requires both generic technical PASS and owner-contract fidelity PASS.

Remaining L4 work: make Engineer and Playtester consume this contract explicitly end to end.

### P0-B — Playtester product context — OPEN for L4

The deterministic Product Fidelity gate exists, but the Playtester still needs the full product context.

Required change:

- pass `ownerContract` + compact GDD + acceptance/probe mapping + gameplay event timeline to Playtester;
- add a separate playtester `fidelityVerdict` / `missingMustHaves` result;
- keep the experience score as a separate experience metric;
- deterministic Product Fidelity remains authoritative and cannot be overridden by the LLM Playtester.

### P0-C — OpenAI budget gate — DONE in L1

Implemented:

- model price registry with input/cached-input/output rates;
- calculated spend from token categories;
- persisted spend per role/model/operation/attempt;
- conservative pre-call budget reservation;
- fail closed before unaffordable paid transport.

### P0-D — Verifier reproducibility gaps — DONE in L3

Implemented:

- deterministic verifier seed;
- persisted seed + exact deterministic input sequence;
- `start -> early -> mid -> end` telemetry timeline;
- early interactivity/progression evidence;
- bounded runtime/mechanic events;
- Green/Broken fixtures and real assembled runtime fidelity fixture.

## 3. Model strategy

Target OpenAI reference baseline prepared in L2:

| Role | Proposed model | Why |
|---|---|---|
| Director | `gpt-5.6-terra` | One high-leverage planning call; stronger constraint decomposition is worth more than minimizing this small cost. |
| Engineer build/repair/rebuild/polish | `gpt-5.6-terra` | Main coding workload; balance quality and cost. |
| Playtester | `gpt-5.6-terra` initially | Better visual/design judgment can prevent expensive bad polish loops. Benchmark Luna later. |
| Auditor narrative | `gpt-5.6-luna` | Small, bounded evidence-summary task. |
| Deterministic release verdict | no LLM | Machine gates decide PASS/FAIL; an LLM must not be the authority for facts already machine-checkable. |

Before Canary #3, L4 must confirm this matrix is the actual reference production route and remains covered by router/capability tests.

Later optimization after two different games pass end to end:

- benchmark `gpt-5.6-luna` for Director and Playtester;
- optionally use Luna for narrowly scoped repair tasks only if evals show no convergence loss;
- consider a single Sol rescue escalation only when Terra repeatedly proves insufficient and the remaining budget explicitly allows it;
- add open-weight candidates as comparison lanes, not as an unverified automatic fallback.

DeepSeek remains a benchmark candidate, not the reference production default.

## 4. Context and code-size strategy

There is no GitHub or browser reason to make the generated game extremely small. The real problem is LLM amplification: each repair currently receives the full previous game and the full micro-engine source, and then returns the full game again.

Therefore do not introduce a tiny arbitrary hard cap yet. Instead:

1. Record generated JS/CSS/HTML chars, lines and assembled bytes in every attempt.
2. Add a soft complexity warning first. Initial calibration target: keep generated game code roughly in the same order of magnitude as the successful Titan reference, not many times larger.
3. Add a conservative hard ceiling only after at least two successful genres establish real baselines.
4. Replace repeated full engine source with a versioned, machine-checked Engine API Contract/Manifest once that manifest is proven complete.
5. Introduce an incremental repair protocol so targeted repairs return bounded edits instead of rewriting the full JSON every time.
6. Preserve a fresh-rebuild path because patching is the wrong strategy when architecture itself is broken.

Important: the current `maxTokens: 12000` is not the desired code-size policy. Output-token ceilings protect cost/truncation; code complexity must be measured separately.

## 5. Verifier evolution

### Generic technical contract — verified

- probe present;
- no runtime errors;
- no failed external requests/assets;
- game starts;
- deterministic gameplay progress;
- FPS gate;
- visual smoke test.

### L3 additions — verified

- deterministic RNG seed for test runs;
- persisted deterministic input sequence;
- `start / early / mid / end` telemetry timeline;
- immutable owner-contract IDs;
- Director acceptance/probe traceability;
- engine-generated score/state events;
- bounded product-specific mechanic events;
- deterministic Product Fidelity PASS/FAIL;
- Green/Broken fixtures for new hard checks;
- real assembled runtime fidelity fixture.

### Still P1

- engine/version/API-manifest SHA in evidence;
- stronger visual activity check using more than only distance from one guessed background color.

## 6. LLM adapter evolution

Current provider portability is useful and should remain. Do not hard-wire the whole platform to an OpenAI-only architecture.

Implemented in L2:

- provider registry and fail-closed role routing;
- capability registry;
- price registry;
- no silent cross-provider fallback.

Later evolution remains:

- JSON Schema/Structured Outputs where supported and useful;
- role-specific reasoning effort tuning;
- prompt/context caching optimization;
- identical recorded benchmark lanes across providers.

## 7. Learning pipeline

Current memory records product history and owner rejection lessons, but technical failures do not yet become validated reusable learning.

Planned safe learning loop:

`evidence -> lesson candidate -> deterministic/repeated support -> approved machine-readable lesson -> role context`

Rules:

- a single LLM opinion must not rewrite core rules;
- repeated repair failures should become candidates automatically;
- lessons carry source run IDs / candidate SHAs;
- obsolete lessons can be superseded;
- learning changes must pass the verifier selftest before production.

This Evidence -> Repair -> Learning loop remains a core platform differentiator and is P2 after reference validation.

## 8. Execution checklist before Canary #3

### P0 — required before the next paid Titan canary

- [x] Add real OpenAI token-price accounting and enforceable per-run budget.
- [ ] Align Engineer prompt wording with deterministic verifier behavior; remove stale `random input / ~15 seconds` wording.
- [x] Fix interactivity evidence to observe progress across the early gameplay timeline, not only mid -> end.
- [x] Make verifier RNG seed deterministic and persist it.
- [x] Add immutable Owner Contract with stable Must-Have / No-Go IDs.
- [x] Compile/map Director acceptance criteria into verifier-visible contract evidence.
- [x] Add bounded gameplay/mechanic events and deterministic Product Fidelity PASS/FAIL.
- [ ] Pass Owner Contract/GDD/acceptance mapping/telemetry/events into Playtester and add separate Playtester fidelity review.
- [ ] Pass immutable Owner Contract + acceptance/probe mapping explicitly into Engineer build/repair/rebuild/polish context.
- [ ] Align Auditor digest/prompt with deterministic release authority and new fidelity evidence.
- [ ] Confirm OpenAI GPT-5.6 reference role matrix is the actual production route for the reference lane.
- [x] Full Verifier Selftest green after L3 P0 changes — Run `33046180562`.
- [ ] Full Verifier Selftest green after all L4 P0 changes.
- [ ] Top-down integrity check complete.

### P1 — after P0, preferably before the second genre

- [ ] Add Engine API Contract/Manifest and validate it against `gf-engine.js` in selftest.
- [ ] Add generated-code/context metrics to evidence.
- [ ] Add incremental repair output protocol or equivalent token-amplification reduction.
- [ ] Strengthen visual smoke/activity detection.
- [x] Make deterministic release verdict independent from LLM Auditor.
- [x] Persist cost/token stats by role and attempt.

### P2 — after Titan + second genre both pass

- [ ] Benchmark Luna vs Terra per non-engineer role using recorded eval cases.
- [ ] Evaluate selective Sol rescue escalation.
- [ ] Add open-weight / DeepSeek comparison lane.
- [ ] Automate evidence-backed learning candidates.
- [ ] Add multi-game regression suite from accepted products.

## 9. Canary gate

The next paid `Titan Core: Reforged` canary starts only after all remaining L4 P0 items are implemented, the full selftest is green and the top-down integrity check passes.

Success means:

- exact owner idea selected;
- immutable owner contract and traceability preserved;
- budget accounting is real;
- technical contract PASS;
- deterministic Product Fidelity PASS;
- Playtester independently confirms product fidelity;
- experience score >= 6.5;
- repair/fresh-rebuild/polish paths converge within budgets;
- audit/release evidence is consistent;
- draft and evidence persisted;
- review issue created;
- preview playable.

If Canary #3 fails, do not blindly rerun it. Classify the failure as product-generation, verifier, model-routing, budget, workflow or architecture failure; fix the platform; selftest; then decide whether another paid run is justified.
