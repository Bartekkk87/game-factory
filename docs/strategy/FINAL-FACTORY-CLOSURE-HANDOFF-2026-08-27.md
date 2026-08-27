# HANDOFF — GAME FACTORY
## Final Factory Closure before next real Game run
**Stand: 27.08.2026**

Repository: `Bartekkk87/game-factory`

Canonical execution backlog: GitHub Issue `#8` — **Final Factory Closure — Learning Orchestration + Secret Migration**.

---

## 0. ROLE AND WORKING MODE

Continue development of the existing Game Factory. Read the actual current GitHub state before editing. GitHub is executable/durable Source of Truth; Notion mirrors architecture, decisions, requirements and status.

The Owner is a layperson and must not be used as a technical operator when existing tools can perform the work.

Working principles:
- no blind fixes;
- no architecture claim without code/evidence check;
- after every material change run the full relevant regression/selftest suite;
- do not add a new control component without a demonstrated failure mode;
- do not start a new paid Game/Titan Canary without a new explicit Owner approval;
- do not manually improve Titan Core as part of this closure;
- preserve durable evidence and fail closed where authority is uncertain.

---

## 1. VERIFIED BASELINE

Current verified `main` baseline before this handoff documentation commit:

`cc6dbb4bec60883ec9711ffa0992778090fb0687`

Post-merge Full Verifier:

GitHub Actions Run `33088856658` — **SUCCESS**.

Previously completed and not to be reopened without evidence:
- P0-01 Skill Integrity — PASS
- P0-02 Skill CI / assembled prompt regression — PASS
- P0-03 Product Fidelity hardening — PASS
- P0-04 structural Release Authority guard — PASS
- P0-05 Model Routing single source of truth — PASS
- Controlled Improvement v1 L0-L7 safety/lifecycle mechanisms — implemented and regression-tested
- OpenRouter/model-lane M0/M1 infrastructure — implemented and regression-tested

Reference real learning evidence remains Titan #3:

`real RUN-EVIDENCE + attempt evidence + Owner PRODUCT ACCEPTANCE FAIL -> Aggregate -> Trigger -> bounded Analysis -> inactive Candidate`

No fabricated `/reject` comment was created and no active lesson was produced from the Owner rejection.

---

## 2. CRITICAL STATUS CORRECTION

Do **not** describe the Factory as having a fully integrated autonomous cross-run learning loop yet.

The components exist, but the normal durable Production/Review path does not currently invoke the complete chain automatically after every applicable run/review.

Current reality:

```text
Production -> RUN-EVIDENCE
Review -> durable Owner feedback evidence
```

and separately:

```text
Aggregate -> deterministic Trigger -> bounded Improvement Analysis
          -> inactive Candidate -> Validation/Regression
          -> separate human-gated Promotion -> reversible Active Lesson
```

The primary closure task is to connect these safely while preserving all existing authority boundaries.

Correct terminology:
- intra-run adaptive repair: **YES — live demonstrated**
- real evidence-to-candidate path: **YES — Titan #3 demonstrated**
- automatically integrated cross-run controlled-learning orchestration: **NOT YET CLOSED**
- real validated + human-promoted lesson improving a later Owner-accepted game: **NOT YET DEMONSTRATED**
- fully self-improving Factory: **NO**

Preferred term: **evidence-driven controlled improvement**.

---

## 3. CREDENTIAL STATE

The Owner reports that the following GitHub Actions repository secrets have now been created and populated with the real provider keys:

```text
OPENAI_PRODUCTION
OPENROUTER_PRODUCTION
```

Important evidence boundary:
- GitHub connector cannot read Actions Secrets;
- do not claim their values were inspected;
- never echo actual API keys into chat, code, logs, issues, evidence or Notion;
- the presence/value remains Owner-reported until the configured runtime path is safely exercised.

Current `produce.yml` still uses legacy `GF_LLM_API_KEY` for OpenAI while already using `OPENROUTER_PRODUCTION` for OpenRouter. Therefore Secret provisioning is complete Owner-side, but Runtime Secret Migration is **still open**.

Target Production credential contract:

```text
OpenAI Production     -> OPENAI_PRODUCTION
OpenRouter Production -> OPENROUTER_PRODUCTION
```

Existing isolated future OpenRouter lanes remain:

```text
OPENROUTER_BENCHMARK
OPENROUTER_IMPROVEMENT
```

Benchmark/Improvement must not silently fall back to Production credentials.

Do not ask the Owner to delete legacy `GF_LLM_API_KEY` until the new OpenAI path is implemented and proven green. After proof, tell the Owner it can be retired from GitHub UI; the connector cannot delete/read Secrets.

---

## 4. REQUIRED CLOSURE BLOCK — ISSUE #8

### C1 — Production Secret Migration

Implement and prove:
- replace Production OpenAI workflow dependency on `GF_LLM_API_KEY` with `OPENAI_PRODUCTION`;
- keep OpenRouter Production on `OPENROUTER_PRODUCTION`;
- preserve fail-closed provider/lane isolation;
- no silent cross-provider credential fallback;
- add/update regression proving both Production credential paths are distinct;
- no real key contents in tests or documentation.

### C2 — Automatic Controlled-Learning Orchestration

Implement the smallest safe orchestration that connects durable Factory evidence to the existing learning components.

Required behavior:
1. Production/review writes durable evidence first.
2. Deterministic aggregator consumes the durable corpus in a reproducible/idempotent way.
3. Existing deterministic trigger policy is evaluated automatically.
4. Trigger = NO -> stop; evidence only.
5. Trigger = YES -> allow only bounded Improvement Analysis for the permitted scope.
6. Analysis may create an **inactive candidate only**.
7. No auto-validation.
8. No auto-activation/promotion.
9. Protected layers remain human-merge gated.
10. Repeated Engineer failure candidates require the existing cross-run threshold; a single isolated failure remains an intra-run repair signal.

Do not introduce a second orchestrator/control plane if the existing run/review workflow plus a small deterministic learning entrypoint can satisfy the demonstrated gap.

### C3 — Owner Contract Decomposition

Current demonstrated weakness:
- free-form Owner text without recognized Must-Have/No-Go sections is compacted into one coarse `MH-01`.

Required closure:
- decompose ordinary natural-language Owner briefs into discrete stable requirements where multiple requirements are actually present;
- preserve original Owner brief verbatim plus hash/provenance;
- do not invent unsupported requirements;
- unknown/ambiguous details remain unknown;
- stable Owner requirement IDs must continue through acceptance/probe traceability;
- add good and adversarial regressions.

This is especially relevant to Titan #3 because an unresolved hypothesis is that visual/product intent was lost before executable Product Truth / Owner Contract decomposition.

### C4 — Verifier Causality / Idle Baseline + Visual Activity Proof

Required:
- deterministic no-input/idle control evidence;
- gameplay advancement that occurs without required synthetic input must not be credited as input-caused evidence;
- bounded deterministic inter-frame comparison or equivalent visual-activity evidence so static large surfaces/screenshots are insufficient proof of active gameplay;
- preserve fixed seed/input reproducibility;
- positive and intentionally broken fixtures;
- full regression after change.

Do not replace Product Fidelity with image aesthetics or an LLM opinion. This is deterministic evidence hardening.

### C5 — Art-Direction Skill Runtime Truth

Current evidence:
- `skills/art-direction.md` exists;
- active Director prompt assembly uses `skillName: 'directing'` and does not currently load `art-direction.md`.

Required:
- either wire `art-direction.md` into the intended role(s) through the canonical prompt assembler and regression-test the assembled prompt;
- or remove/correct claims that it affects runtime.

Do not create a second prompt assembly path.

---

## 5. LEARNING SAFETY INVARIANTS — MUST SURVIVE

Hard invariant:

```text
Production prompt injection only when lesson.status === 'validated' && lesson.active === true
```

Preserve:
- `/reject` does not directly create an active lesson;
- `/feedback` records raw Owner feedback without changing product state;
- raw Owner feedback is immutable evidence; interpretation/classification is separate;
- lifecycle: evidence/observation -> candidate -> validated inactive -> active -> deactivated/reversed;
- Improvement Analysis cannot validate, activate, edit Production, change its own authority or weaken release gates;
- protected layers require separate human-merge promotion;
- activation is versioned/reversible;
- no LLM receives release authority.

Protected layers:
- `skill`
- `prompt`
- `owner-contract`
- `verifier`
- `product-fidelity`
- `release-gate`
- `engine-contract`
- `control-plane`

---

## 6. TITAN #3 — DO NOT OVER-INTERPRET

Reference run:
- GitHub Actions Production Run `33069903383`
- internal run `runs/20260827-120138/RUN-EVIDENCE.json`
- Technical PASS
- final Product Fidelity PASS after one autonomous repair
- Experience `7.7/10` after one polish
- Budget/release PASS
- Cost `$0.442821`, `109703` tokens
- Owner hands-on result: **PRODUCT ACCEPTANCE FAIL**

Real learning artifacts already exist under:
- `learning/evidence/owner-feedback/`
- `learning/aggregates/`
- `learning/triggers/`
- `learning/analysis/`
- `learning/candidates/`

Titan candidate remains protected `owner-contract`, `status=candidate`, `active=false`.

Competing root-cause hypotheses remain unresolved:
- intake/Product Truth loss;
- Owner Contract decomposition too coarse;
- Director reinterpretation;
- Product/Visual Fidelity insufficient;
- Experience evaluation insufficient;
- multi-layer combination.

Do not promote one hypothesis to truth without new evidence.

---

## 7. DELIBERATELY LATER — NOT CLOSURE BLOCKERS

Do not expand the scope merely because these were historical P2 ideas:
- positive learning from repeated approved/high-quality games;
- advanced Owner preference taxonomy beyond safe candidate scoping;
- mature Skill stale-detection;
- seed rotation / multi-seed spot checks;
- P2-07 Model Outcome Benchmarking;
- adaptive deterministic model selection;
- Productionization / IP & Security Gate;
- private-core migration.

These remain evidence-driven follow-ups.

---

## 8. ACCEPTANCE FOR THIS HANDOFF

Do not report closure until all are true:

1. OpenAI Production uses `OPENAI_PRODUCTION`; OpenRouter Production uses `OPENROUTER_PRODUCTION`.
2. Credential isolation/fail-closed regressions pass without exposing keys.
3. Normal durable run/review evidence automatically reaches deterministic Aggregate + Trigger.
4. Triggered analysis can create only inactive candidates and cannot validate/activate them.
5. Free-form Owner ideas can produce multiple stable traceable requirements where appropriate.
6. Idle causality control and visual activity proof have positive/broken regression evidence.
7. Art-direction runtime truth is corrected and regression-tested.
8. Full existing Verifier suite passes after all material changes.
9. Final `main` commit and Actions Run IDs are recorded in GitHub and Notion.
10. No new paid Game/Titan Canary was started.

After closure, still use the proof boundary:

> Controlled-learning orchestration is implemented and tested; real learning impact on a subsequent Owner-accepted game remains unproven until a later separately authorized real test.

---

## 9. REQUIRED DOCUMENTATION TARGETS

At completion update at minimum:
- GitHub Issue `#8` checklist/evidence;
- `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`;
- `docs/strategy/PLATFORM-MODEL-ARCHITECTURE-DECISION-2026-08-27.md` where credential/runtime status changed;
- Notion page `Game Factory — Umsetzungskatalog 27.08.2026` (`3c989201-48bd-8134-9421-f869e1b74dd8`);
- Notion page `Game Factory — Platform & Model Architecture Decision — 27.08.2026` (`3c989201-48bd-81de-b6ff-eb44209ad0af`).

GitHub must remain the executable/durable source of truth.
