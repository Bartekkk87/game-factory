# Game Factory — Umsetzungskatalog 27.08.2026

## Final Audit Recheck — normalized status

The full audit/closure catalog was re-checked against the executable `main` runtime after Final Factory Closure C1-C5.

Runtime baseline before this documentation/test-housekeeping branch:

- `main`: `5d8ca9194877b788c9941ca445d1f1e96b163760`
- Post-merge Full Verifier Run `33097463622`: **SUCCESS**
- GitHub Issue `#8` Final Factory Closure: **CLOSED / COMPLETED**
- No new paid Game/Titan Canary was run during closure or this recheck.

## Recheck conclusion

**No additional architecture or mandatory learning component is missing from the audit closure scope.**

One stale audit issue and stale documentation were found during the recheck:

1. GitHub Issue `#2` (`GF_BUDGET_USD` fail-closed cost gate) remained open although the cost kernel had already been implemented. This housekeeping branch adds the remaining explicit edge-case regression evidence required by the issue: below-budget, exact-budget, above-budget, unknown-price, explicit pricing override, and uncertain/missing-usage fail-closed behavior.
2. `README.md` still described the legacy `GF_LLM_API_KEY`, old provider/model defaults, direct rejection-to-lesson behavior and contradictory fallback semantics. It is corrected to the verified runtime contract.
3. GitHub Issue `#3` still displayed historical P1/P2 items as unchecked even though many are now implemented. Its status must be normalized after this branch passes full regression.

This is **audit housekeeping / evidence closure**, not a new Factory architecture layer.

---

# P0 — complete

## P0 cost/budget guard — complete after final edge-case regression

The current Cost Kernel in `factory/src/control/budget.mjs` provides:

- separate input / cached-input / output token accounting;
- provider-reported cost when available;
- explicit model-registry cost calculation otherwise;
- explicit pricing overrides through `GF_MODEL_PRICING_JSON`;
- fail-closed unknown pricing before transport;
- conservative pre-call reservation against `GF_BUDGET_USD`;
- exact-budget allowance and projected-overspend rejection;
- conservative non-zero accounting when usage is missing/uncertain;
- `accountingComplete=false` plus fail-closed refusal of subsequent paid calls after uncertain billing;
- per-role/model/operation cost evidence;
- separate Repair/Polish/Fresh-Rebuild call/USD caps.

Provider-side spend/credit limits remain the final external safety net and are now stated in `README.md`.

## External audit P0-01 through P0-05 — complete

- **P0-01 Skill Integrity:** PASS
- **P0-02 Skill CI / assembled prompt regression:** PASS
- **P0-03 Product Fidelity hardening:** PASS
- **P0-04 Release Authority structural guard:** PASS
- **P0-05 Model Routing single source of truth:** PASS

Binding release rule remains:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

Auditor and qualitative Playtester Fidelity remain advisory and have no release authority.

---

# Controlled Improvement v1 — complete mechanism set

## L0 — Learning Safety Gate — PASS

- `/reject` creates no active Director lesson.
- `/reject` and `/feedback` preserve durable raw Owner evidence.
- raw feedback is preserved; interpretation is separate metadata.
- Production prompt visibility is restricted to `validated && active` learning.
- legacy/unvalidated/inactive learning fails closed.

## L1 — Structured lifecycle — PASS

Explicit lifecycle/provenance exists for candidate, validation, activation, deactivation/reversal, supersession and promotion reference.

`candidate -> validated inactive -> active -> deactivated/reversed`

No implicit promotion exists.

## L2 — Owner feedback evidence — PASS

Owner feedback is stored durably with exact raw body, source identity, parsed command/reason, candidate/run provenance and timestamps. Feedback classification remains a claim and cannot self-promote to Production truth.

## L3 — Deterministic aggregation — PASS and automatically integrated

The normal durable Factory flow now automatically reaches deterministic aggregation from Production/Owner evidence through the canonical controlled-learning orchestration path.

## L4 — Deterministic trigger — PASS and automatically integrated

Current trigger policy includes:

- negative/feedback Owner evidence -> bounded `product-feedback` analysis may run;
- same engineering failure signature across at least two independent runs -> bounded engineering analysis may run;
- one isolated engineering failure remains intra-run repair evidence.

Trigger authority remains `canValidate=false`, `canActivate=false`.

## L5 — Bounded Improvement Analysis — PASS and automatically integrated

An allowed trigger may produce only bounded analysis plus at most an **inactive candidate**. Automatic orchestration cannot validate, activate, promote, weaken gates or change its own authority.

## L6 — Validation / regression mechanism — PASS

Validation requires explicit evidence and supplied regression results to pass. A model assertion is insufficient. Validated candidates remain inactive until separate promotion.

## L7 — Human-gated promotion — PASS

Protected layers include:

- skill
- prompt
- owner-contract
- verifier
- product-fidelity
- release-gate
- engine-contract
- control-plane

Protected changes require separate human-merge promotion. Activation is versioned/reversible; deactivation removes Production visibility.

---

# Final Factory Closure C1-C5 — complete

- **C1 Production Secret Migration:** PASS — OpenAI Production -> `OPENAI_PRODUCTION`; OpenRouter Production -> `OPENROUTER_PRODUCTION`; approved Production paths are fail-closed isolated.
- **C2 Automatic Controlled-Learning Orchestration:** PASS — durable Production/Owner evidence automatically and idempotently reaches Aggregate -> Trigger -> if allowed bounded Analysis -> inactive Candidate; no auto-validation/activation.
- **C3 Owner Contract Decomposition:** PASS — free-form briefs produce stable `MH-*` / `NG-*`; ambiguities remain `UN-*`; original brief/hash/provenance preserved.
- **C4 Verifier Causality + Visual Activity:** PASS — deterministic same-seed idle control, input-causality comparison and inter-frame activity evidence with good/bad regression.
- **C5 Art-Direction Runtime Truth:** PASS — Director loads `directing` + `art-direction` through the canonical prompt assembler; runtime regression proves the path.

Final C1-C5 proof before this housekeeping branch:

- PR `#11`: merged
- `main`: `5d8ca9194877b788c9941ca445d1f1e96b163760`
- Final branch Full Verifier `33097190173`: SUCCESS
- Post-merge Full Verifier `33097463622`: SUCCESS

---

# Historical P1/P2 backlog — normalized against current implementation

The old Issue `#3` list mixed already completed implementation with deliberately later evidence-driven work. The correct status is:

## Completed from the old P1/P2 list

- Owner Contract decomposition into stable requirements — **DONE (C3)**
- deterministic idle/no-input control — **DONE (C4)**
- inter-frame visual activity proof — **DONE (C4)**
- `art-direction.md` runtime truth — **DONE (C5)**
- structured learning lifecycle/provenance — **DONE (L1-L7)**
- candidates absent from Production until validated+active — **DONE (L0/L1)**
- protected skill/prompt/verifier/release/engine/control changes human-gated — **DONE (L7)**
- deterministic zero-LLM aggregation in normal durable flow — **DONE (C2/L3)**
- explicit deterministic trigger rules — **DONE (C2/L4)**
- Engineer candidate only after repeated cross-run failure signatures — **DONE (C2/L4)**
- triggered bounded analysis producing scoped inactive candidates only — **DONE (C2/L5)**
- candidate validation/regression mechanism — **DONE (L6)**

## Deliberately later — not current audit/closure blockers

These remain valid future improvement topics, but the audit catalog explicitly does **not** require them before the next normal Factory step:

- positive learning from repeated approved/high-quality games without homogenizing output;
- advanced Owner-feedback preference taxonomy beyond safe candidate scoping;
- mature Skill stale-detection policy;
- verifier seed rotation / multi-seed spot checks / alternate deterministic input schedules;
- P2-07 Model Outcome Benchmarking (`cost per verified + owner-accepted outcome`);
- deterministic adaptive model policy based on benchmark evidence;
- Productionization / IP & Security Gate;
- private-core migration after PoC evidence.

These are future evidence-driven roadmap items, **not unresolved defects in the current audit closure**.

---

# Model / Provider infrastructure — current status

- one canonical Router / Provider Registry / Model Registry / Client stack;
- OpenAI Production defaults remain reference defaults;
- OpenRouter challenger is registered but cannot silently become Production default;
- Production credential lanes: `OPENAI_PRODUCTION`, `OPENROUTER_PRODUCTION`;
- isolated later OpenRouter lanes: `OPENROUTER_BENCHMARK`, `OPENROUTER_IMPROVEMENT`;
- unknown Provider/Model, missing credentials and capability mismatch fail closed;
- no automatic cross-provider fallback;
- no LLM-owned routing/promotion authority.

---

# Reference real case

`Titan Core: Reforged` remains the reference Production/Owner-evidence case:

- Production Run `33069903383`
- Technical PASS
- Product Fidelity PASS after autonomous repair
- Experience `7.7/10` after autonomous polish
- Budget / deterministic Release Gate PASS
- Cost `$0.442821` / `109703` tokens
- Owner hands-on result: **PRODUCT ACCEPTANCE FAIL**

Existing evidence produced the real controlled-learning chain:

`RUN-EVIDENCE + attempt evidence + Owner result -> Aggregate -> Trigger -> bounded Analysis -> inactive Candidate`

No paid rerun was used to build the learning evidence.

---

# Proof boundary

Current justified terminology:

- intra-run adaptive repair: **YES — live demonstrated**
- real evidence-to-candidate path: **YES — demonstrated**
- automatic controlled cross-run orchestration: **YES — implemented and regression-tested**
- automatic candidate validation/activation: **NO — intentionally prohibited**
- real validated + human-promoted candidate measurably improving a later Owner-accepted game: **NOT YET DEMONSTRATED**
- fully self-improving Factory: **NOT YET JUSTIFIED**

Preferred term remains **evidence-driven controlled improvement**.

---

# Audit closure decision

After the final recheck, there are **no further mandatory audit-catalog implementation items** beyond the small test/documentation housekeeping in this branch.

Final acceptance of this housekeeping change requires:

1. full Verifier SUCCESS on the branch;
2. merge to `main`;
3. post-merge Full Verifier SUCCESS;
4. close stale Issues `#2` and `#3` with the final evidence;
5. update Notion to the same normalized status;
6. no paid Game/Titan Canary without new explicit Owner authorization.
