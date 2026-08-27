# Game Factory — Architektur v2.3 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. Ziel ist, Spiele nicht nur zu generieren, sondern reproduzierbar nachzuweisen, dass ein Owner-Brief technisch und produktseitig erfüllt wurde.

GitHub Actions ist die Execution Runtime. GitHub bleibt durable Source of Truth für Code, Evidence, Drafts, Entscheidungen und Lernartefakte.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release.
3. **Owner-Intent ist ein Vertrag.** Must-Haves und No-Gos dürfen in späteren Rollen nicht verloren gehen.
4. **Determinismus dort, wo getestet wird.** Kandidat + Seed + Eingabesequenz erzeugen reproduzierbare Verifier-Evidence.
5. **Modelle sind Worker, keine Control Plane.** Budget, Gates, SHA-Binding und Release-Entscheidungen sind Maschinenlogik.
6. **Provider bleiben austauschbar.** Kein stiller Cross-Provider-Fallback.
7. **Lernen braucht Evidence.** Keine unvalidierte Prompt-Selbstmutation.
8. **Production Factory und Improvement Factory bleiben getrennt.** Produktionsläufe dürfen keine ungeprüften dauerhaften Factory-Regeln aktivieren.

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Memory Lesson`

## 2. Schichten

```text
L5 PRODUCT / OWNER
   Idee -> Owner Contract -> Review -> Approve / Reject

L4 PRODUCTION LINE
   Director -> Engineer -> Repair/Rebuild -> Playtester -> Polish -> Auditor -> Draft

L3 EVIDENCE & QUALITY
   Technical Verifier -> Product Fidelity -> Experience -> Release Gate

L2 MODEL / PROVIDER LAYER
   Role Router -> Provider Adapter -> Capability/Price Registry

L1 CONTROL KERNEL
   GitHub Actions -> fail-closed state -> SHA binding -> budget -> runs/evidence -> memory
```

Verifizierter Schichtstatus 27.08.2026 nach externem Falsification Audit und normalisiertem P0-Hardening:

- **L1 Control Kernel — DONE**
- **L2 Model / Provider Layer — DONE**
- **L3 Verification & Evidence — DONE**
- **L4 Production Agents — DONE**
- **Audit-P0-01 bis P0-05 — DONE**

Finaler verifizierter Runtime-Commit:

`69aac9f26d7004aa8be19ed0ec61fc649f3d6565`

Finaler vollständiger `main` Verifier Selftest:

GitHub Actions Run `33060506910` — **SUCCESS**

Detailabnahme:

`docs/strategy/P0-FINAL-ACCEPTANCE-2026-08-27.md`

**Kein paid Titan Canary #3 wurde gestartet.**

## 3. Production Factory — verifizierter Prozess

```text
Owner Idea
  -> immutable Owner Contract (MH/NG IDs + hash)
  -> Director: GDD + Acceptance/Probe traceability
  -> Engineer Build / Repair / Fresh Rebuild / Polish
       receives Owner Contract + traceability
  -> Assemble single index.html + bounded probe extension
  -> Headless Chromium verifier
       -> fixed deterministic seed + input sequence
       -> start/early/mid/end telemetry
       -> bounded runtime/mechanic events
       -> Technical PASS/FAIL
       -> deterministic Product Fidelity PASS/FAIL
  -> targeted repair or fresh rebuild on stagnation
  -> Playtester
       -> independent advisory fidelity review
       -> Experience score + critique
  -> polish only from verified baseline
       -> full reverify
       -> rollback on technical/fidelity regression
  -> LLM Auditor (strictly advisory)
  -> deterministic Release Gate
       Technical PASS
       + Product Fidelity PASS
       + Experience >= 6.5
       + Budget PASS
  -> draft + Review Issue
  -> Pages preview
  -> Owner /approve or /reject
  -> product or archive
```

No Owner requirement may disappear between intake and review.

## 4. Production roles

### Director

- receives immutable Owner Contract;
- maps each Owner Requirement ID to one stable Acceptance ID and Probe ID;
- invalid, missing or duplicate traceability fails closed;
- selects machine-observable evidence kinds;
- positive Must-Have `event` probes are normalized by deterministic code to stronger correlated gameplay evidence.

### Engineer

- Build / Repair / Rebuild / Polish receive immutable Owner Contract and traceability;
- prompt and active skill use the fixed deterministic verifier semantics;
- required gameplay events may not be emitted at startup merely to satisfy a probe name;
- positive Must-Have events must correspond to the real mechanic after early gameplay evidence and gameplay progress;
- targeted repair, Fresh Rebuild escalation and verified-polish rollback remain intact.

### Playtester

Receives Owner Contract, GDD/traceability, telemetry, runtime events, screenshots, objective metrics and deterministic Product Fidelity.

Returns separately:

```text
Independent Product Fidelity Review
Experience Score + Critique
```

Playtester fidelity is advisory. It cannot override deterministic Product Fidelity and is structurally excluded from the Release Gate input API.

### Auditor

- strictly advisory;
- no release PASS/FAIL authority;
- output is consistency assessment/findings/summary;
- any stray `verdict` field is sanitized;
- audit fields are structurally excluded from the Release Gate input API.

## 5. Model / Provider Layer — single source of truth

Canonical runtime selection lives in:

- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`

`factory/src/config.mjs` contains no competing LLM/model-routing table.

Reference route:

| Role | Model |
|---|---|
| Director | `gpt-5.6-terra` |
| Engineer Build/Repair/Rebuild/Polish | `gpt-5.6-terra` |
| Playtester | `gpt-5.6-terra` |
| Auditor | `gpt-5.6-luna` |
| Release PASS/FAIL | no LLM |

Routing remains fail-closed. DeepSeek/Open-Weight remains a later benchmark lane, not a silent production fallback.

## 6. Verification & Product Fidelity

Technical verifier requires:

- `__GF__` present;
- no runtime/probe errors;
- no failed assets/requests;
- game starts;
- deterministic gameplay progress;
- FPS gate;
- visible gameplay activity.

Evidence is persisted across:

`start -> early -> mid -> end`

The probe extension machine-captures bounded runtime events including event type, sequence, runtime time, game state and score.

Deterministic Product Fidelity binds evidence to:

- immutable Owner Contract IDs;
- stable Director Acceptance/Probe traceability;
- persisted deterministic seed/input sequence;
- telemetry timeline;
- bounded gameplay/mechanic events.

For positive Must-Have `event` probes, event-name presence alone is insufficient. The event is treated as `correlated_gameplay` evidence and must occur in active gameplay no earlier than the early evidence boundary after independent engine-observed gameplay progress. The adversarial `fake boss_entered event, no mechanic/progress` fixture deterministically fails Product Fidelity.

A technically green but product-wrong game cannot release.

## 7. Release authority

Binding rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

`evaluateReleaseGate(...)` accepts structurally only:

- Technical
- Product Fidelity
- Experience score
- Budget
- deterministic threshold/policy

Unexpected advisory/LLM fields are rejected as non-authoritative input. Auditor disagreement and Playtester fidelity disagreement may be surfaced, but cannot enter or alter the release result.

## 8. Prompt / Skill integrity

Runtime system prompt assembly for Director and Engineer is centralized and regression-tested as:

`Base Prompt + Active Skill + Lessons`

CI explicitly tests Skill- and Lesson-Injection. `skills/**` triggers the full Verifier Selftest. Reintroducing stale random-input/~15-second verifier guidance into an active assembled prompt causes deterministic CI failure.

## 9. Owner Preview path

Only after deterministic release PASS:

1. verified candidate is written to `drafts/<slug>/index.html`;
2. candidate SHA, Product Fidelity, Experience, audit and cost evidence are persisted;
3. Production workflow commits draft/evidence;
4. GitHub Review Issue is opened;
5. Pages exposes the preview on `main`;
6. Owner reviews and responds with `/approve` or `/reject`.

Published/Draft metadata remains bound to the verified candidate SHA.

## 10. Durable Evidence

Per run the platform preserves the relevant set of:

```text
brief.json
owner-contract.json
gdd.json
attempt-XX/
  design.json
  evidence-tech.json
  evidence-fidelity.json
  telemetry.json
  shots/
experience-XX.json
audit.json
RUN-EVIDENCE.json
RESULT.json | FAILURE.json
```

## 11. Improvement Factory — not yet complete

Target:

`Run Evidence -> deterministic Aggregation -> Threshold -> Improvement Analysis -> scoped Lesson Candidate -> Validation -> Regression -> human-merged/versioned activation`

Not allowed:

`Failure -> LLM -> Prompt Edit -> Production`

Current terminology:

- Intra-run adaptive repair: **YES**
- Cross-run learning: **limited / partial**
- Self-healing: only cautiously for bounded intra-run recovery
- Self-improving Factory: **NOT YET**

Target term: **evidence-driven controlled improvement**.

## 12. Deferred P1/P2 hardening

After a separately authorized reference Canary, planned work includes:

- Owner Contract decomposition for complex unstructured briefs;
- idle-baseline causality proof;
- stronger inter-frame visual activity proof;
- art-direction skill wiring cleanup;
- structured memory schema and candidate-vs-validated lessons;
- self-modification guard for skills/prompts/verifier/contracts;
- deterministic improvement aggregation and triggers;
- controlled evidence-driven improvement loop;
- multi-seed / alternate deterministic input robustness;
- model outcome benchmarking by quality, convergence and cost per verified release.

## 13. Repo layout

```text
engine/                    Micro-Engine + future API Contract/Manifest
factory/src/contract/      Owner Contract + Traceability
factory/src/control/       Budget / Release Authority / Unified Evidence
factory/src/llm/           Role Router / Provider / Capability / Price Registry
factory/src/roles/         Director / Engineer / Playtester / Auditor
factory/src/verify/        Harness / Technical Contract / Product Fidelity
factory/prompts/           role prompts
skills/                    versioned role lessons
ideas/                     Owner inputs
drafts/                    verified candidates before Owner gate
products/                  published games
runs/                      run/attempt evidence
memory/                    registry, lessons, stats
docs/strategy/             architecture/hardening/product strategy
examples/fixtures/         verifier Green/Broken/adversarial regression cases
.github/workflows/         Produce, Verify, Review, Pages
```

## 14. Current priority / Canary rule

P0 hardening and final top-down integrity check are **PASS**.

Technical readiness for exactly one controlled `Titan Core: Reforged` Canary #3: **YES**.

Operational authorization: **NO until a new explicit Owner instruction is given**.

Current required action:

**STOP and inform Owner. Do not start Titan Canary #3 automatically.**
