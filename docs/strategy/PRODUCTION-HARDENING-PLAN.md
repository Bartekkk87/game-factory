# Game Factory — Production Hardening Plan

Status: 2026-08-27

Purpose: record the process audit before the next paid Titan canary. This document separates the current verified baseline from planned changes. No item below should be treated as implemented until its checkbox is complete and the verifier selftest is green.

## 1. Current verified baseline

The latest platform commit `84eb3ab` passed the full Verifier Selftest. The current pipeline is:

`Owner idea -> Director -> Engineer build -> technical verifier -> repair/fresh rebuild -> Playtester -> polish/reverify -> Auditor -> draft -> owner review -> publish/reject`

Already present:

- deterministic idea selection from the triggering Git commit;
- provider-aware model selection;
- deterministic simulated verifier input;
- fail-closed evidence on failed production runs;
- candidate SHA binding;
- repair-stagnation detection and fresh rebuild escalation;
- polish rollback to the last technically verified candidate;
- issue-based owner approval/rejection gate.

## 2. Audit findings

### P0-A — Product contract is not machine-enforced end to end

The Director creates a `probePlan`, but the technical verifier currently checks only generic properties such as runtime errors, score/state change, FPS and visible pixels. It does not consume the GDD `probePlan` and cannot prove that owner Must-Haves such as a Titan, salvage, upgrades or a risk/reward choice actually exist.

Planned change:

- create an immutable `ownerContract` from the owner brief;
- give every explicit Must-Have/No-Go a stable ID;
- Director maps the game design to observable acceptance criteria;
- verifier receives the contract and records contract-specific evidence;
- release requires both generic technical PASS and owner-contract PASS.

### P0-B — Playtester currently judges screenshots without the product brief

The Playtester receives session metrics and screenshots, but not the owner idea or GDD. It can judge presentation, but not whether the requested game was actually built.

Planned change:

- pass `ownerContract` + compact GDD + gameplay event timeline to Playtester;
- add a separate `fidelityVerdict` / `missingMustHaves` result;
- keep the experience score as an experience metric instead of hiding product fidelity inside the number;
- release gate becomes `technical PASS + fidelity PASS + experience >= threshold`.

### P0-C — OpenAI budget gate is not a real hard gate

`costReport()` currently increments dollars only if a provider returns `usage.cost`. OpenAI token usage does not provide a reliable per-request dollar amount in that field, so a nominal `$10` run budget can remain at `$0` internally while tokens are consumed.

Planned change:

- model price registry with input/cached-input/output rates;
- calculate spend from returned token categories;
- persist spend per role and per attempt;
- before a new LLM call, derive a conservative maximum affordable output budget from remaining dollars;
- fail closed before a call that cannot fit the remaining budget;
- keep the external OpenAI project limit as a second safety layer.

### P0-D — Verifier still has reproducibility gaps

Input is deterministic now, but the game engine defaults its RNG seed from current time. Also, the interactivity check compares only the mid-session score to the final score. A game that scores correctly before the mid snapshot can therefore fail if the score is unchanged afterwards.

Planned change:

- deterministic verifier seed while keeping random seeds for normal players;
- capture start/early/mid/end snapshots or a periodic telemetry timeline;
- interactivity passes when verified gameplay progress occurs anywhere in the required early window;
- persist the exact seed and input sequence with evidence.

## 3. Model strategy

The current OpenAI defaults are `gpt-4o-mini` for Director/Playtester/Auditor and `gpt-4o` for Engineer. They work, but they are no longer the preferred production baseline.

Target baseline to benchmark:

| Role | Proposed model | Why |
|---|---|---|
| Director | `gpt-5.6-terra` | One high-leverage planning call; stronger constraint decomposition is worth more than minimizing this small cost. |
| Engineer build/repair/rebuild/polish | `gpt-5.6-terra` | Main coding workload; balance quality and cost. |
| Playtester | `gpt-5.6-terra` initially | Better visual/design judgment can prevent expensive bad polish loops. Benchmark Luna later. |
| Auditor narrative | `gpt-5.6-luna` | Small, bounded evidence-summary task. |
| Deterministic release verdict | no LLM | Machine gates decide PASS/FAIL; an LLM must not be the authority for facts already machine-checkable. |

Later optimization after two different games pass end to end:

- benchmark `gpt-5.6-luna` for Director and Playtester;
- optionally use Luna for narrowly scoped repair tasks only if evals show no convergence loss;
- consider a single Sol rescue escalation only when Terra repeatedly proves insufficient and the remaining budget explicitly allows it;
- add open-weight candidates as comparison lanes, not as an unverified automatic fallback.

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

### Generic technical contract — keep

- probe present;
- no runtime errors;
- no failed external requests/assets;
- game starts;
- deterministic gameplay progress;
- FPS gate;
- visual smoke test.

### Add

- deterministic RNG seed for test runs;
- telemetry timeline;
- engine/version/API-manifest SHA in evidence;
- owner-contract acceptance IDs;
- engine-generated events for score/state changes;
- bounded product events for mechanics that cannot be inferred from generic engine state;
- stronger visual activity check using more than only distance from one guessed background color.

The verifier must remain self-tested with known-green and known-broken fixtures. New checks require matching fixtures before they become release gates.

## 6. LLM adapter evolution

Current provider portability is useful and should remain. Do not hard-wire the whole platform to an OpenAI-only architecture.

Planned interface:

- common role-level API (`generateStructured`, usage, model, capability metadata);
- baseline OpenAI-compatible Chat Completions adapter for portable providers;
- OpenAI Responses adapter for GPT-5.6 capabilities where useful;
- JSON Schema/Structured Outputs instead of only generic `json_object` where supported;
- role-specific reasoning effort;
- prompt/context caching accounting;
- provider/model capability registry and price registry;
- no silent cross-provider fallback.

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

This Evidence -> Repair -> Learning loop is a core platform differentiator and should be treated as first-class architecture, not prompt text.

## 8. Execution checklist before Canary #3

### P0 — required before the next paid Titan canary

- [ ] Add real OpenAI token-price accounting and enforceable per-run budget.
- [ ] Align Engineer prompt wording with deterministic verifier behavior (remove stale "random input / ~15 seconds" wording).
- [ ] Fix interactivity evidence to observe progress across the early gameplay timeline, not only mid -> end.
- [ ] Make verifier RNG seed deterministic and persist it.
- [ ] Pass owner contract/GDD context into Playtester and add fidelity gate.
- [ ] Compile or map Director acceptance criteria into verifier-visible contract evidence.
- [ ] Update OpenAI role defaults from GPT-4o generation to the benchmark GPT-5.6 matrix.
- [ ] Run full Verifier Selftest after every P0 code change.

### P1 — after P0, preferably before the second genre

- [ ] Add Engine API Contract/Manifest and validate it against `gf-engine.js` in selftest.
- [ ] Add generated-code/context metrics to evidence.
- [ ] Add incremental repair output protocol or equivalent token-amplification reduction.
- [ ] Strengthen visual smoke/activity detection.
- [ ] Make deterministic release verdict independent from LLM Auditor.
- [ ] Persist cost/token stats by role and attempt.

### P2 — after Titan + second genre both pass

- [ ] Benchmark Luna vs Terra per non-engineer role using recorded eval cases.
- [ ] Evaluate selective Sol rescue escalation.
- [ ] Add open-weight comparison lane.
- [ ] Automate evidence-backed learning candidates.
- [ ] Add multi-game regression suite from accepted products.

## 9. Canary gate

The next paid `Titan Core: Reforged` canary starts only after all P0 items are implemented and the full selftest is green.

Success means:

- exact owner idea selected;
- budget accounting is real;
- technical contract PASS;
- owner-product fidelity PASS;
- experience score >= 6.5;
- repair/fresh-rebuild paths converge if needed;
- audit/release evidence consistent;
- draft and evidence persisted;
- review issue created;
- preview playable.

If Canary #3 fails, do not blindly rerun it. Classify the failure as product-generation, verifier, model-routing, budget, workflow or architecture failure; fix the platform; selftest; then decide whether another paid run is justified.
