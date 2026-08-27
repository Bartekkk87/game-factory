# Game Factory — Architektur v2.2 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. Ziel ist nicht nur, Spiele zu generieren, sondern reproduzierbar nachzuweisen, dass ein Owner-Brief technisch und produktseitig erfüllt wurde.

GitHub Actions ist die Execution Runtime. GitHub bleibt durable Source of Truth für Code, Evidence, Drafts, Entscheidungen und Lernartefakte.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Ein fehlender oder widersprüchlicher Nachweis führt nicht zu Release.
3. **Owner-Intent ist ein Vertrag.** Must-Haves und No-Gos dürfen in späteren Rollen nicht verloren gehen.
4. **Determinismus dort, wo getestet wird.** Gleicher Kandidat + gleicher Seed + gleiche Eingaben sollen dieselbe Verifier-Evidence erzeugen.
5. **Modelle sind Worker, keine Control Plane.** Budget, Gates, SHA-Binding und Release-Entscheidungen sind Maschinenlogik.
6. **Provider bleiben austauschbar.** Kein stiller Cross-Provider-Fallback.
7. **Lernen braucht Evidence.** Keine unvalidierte Prompt-Selbstmutation.

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

Verifizierter Schichtstatus 27.08.2026:

- **L1 Control Kernel — DONE**
- **L2 Model / Provider Layer — DONE**
- **L3 Verification & Evidence — DONE**
- **L4 Production Agents / P0 — DONE**

L4 wurde über PR #5 nach `main` gemergt.

Verifizierter Runtime-Merge-Commit:

`f7b5e2ebd75e405d857b3bec19d85231e02eaef8`

Vollständiger gemergter `main` Verifier-Selftest:

GitHub Actions Run `33051402235` — **SUCCESS**.

Der Run enthält den expliziten Schritt:

`node factory/src/roles/test-production-agents.mjs`

Top-down-Integritätscheck — **PASS**.

No paid Titan Canary #3 has been started.

## 3. Verifizierter Post-L4-Prozess

```text
Owner idea
  -> immutable Owner Contract (MH/NG IDs + hash)
  -> Director: GDD + Acceptance/Probe traceability
  -> Engineer Build / Repair / Fresh Rebuild / Polish
       receives Owner Contract + traceability
  -> Assemble single index.html + bounded probe extension
  -> Headless Chromium verifier
       -> deterministic seed + input sequence
       -> start/early/mid/end telemetry
       -> bounded runtime/mechanic events
       -> Technical PASS/FAIL
       -> deterministic Product Fidelity PASS/FAIL
  -> targeted repair or fresh rebuild on stagnation
  -> Playtester
       receives Owner Contract + GDD + traceability
       + telemetry + runtime events + screenshots + metrics
       -> independent fidelity review
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

## 4. Production roles — L4 verified

### Director

- receives immutable Owner Contract;
- maps Owner Requirement IDs to stable Acceptance/Probe IDs;
- invalid, missing or duplicate traceability fails closed.

### Engineer

- Build / Repair / Rebuild / Polish receive immutable Owner Contract and traceability;
- prompt matches deterministic verifier behavior;
- product-specific mechanics use bounded `game.event(type, data)` evidence;
- targeted repair, Fresh Rebuild escalation and verified-polish rollback remain intact.

### Playtester

Receives:

- Owner Contract;
- compact GDD;
- Acceptance/Probe mapping;
- telemetry;
- bounded runtime events;
- screenshots;
- objective metrics;
- deterministic Product Fidelity result.

Returns separate concerns:

```text
Independent Product Fidelity Review
Experience Score + Critique
```

Playtester fidelity is an independent advisory signal. It cannot override deterministic Product Fidelity.

### Auditor

- strictly advisory;
- output is consistency assessment/findings/summary;
- no release authority;
- any stray `verdict` field is sanitized;
- sees Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release state.

## 5. Reference model route — verified

| Role | Model |
|---|---|
| Director | `gpt-5.6-terra` |
| Engineer Build/Repair/Rebuild/Polish | `gpt-5.6-terra` |
| Playtester | `gpt-5.6-terra` |
| Auditor | `gpt-5.6-luna` |
| Release PASS/FAIL | no LLM |

DeepSeek remains a later benchmark lane, not an unverified automatic fallback.

## 6. Verification & Product Fidelity

Technical verifier requires:

- `__GF__` present;
- no runtime/probe errors;
- no failed assets/requests;
- game starts;
- deterministic gameplay progress;
- FPS gate;
- visible gameplay activity.

Deterministic Product Fidelity additionally binds runtime evidence to:

- immutable Owner Contract IDs;
- Director Acceptance/Probe traceability;
- bounded gameplay/mechanic events;
- persisted seed/input sequence;
- `start / early / mid / end` telemetry.

A technically green but product-wrong game cannot release.

## 7. Release authority

Binding rule:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

Implemented by deterministic control-plane code, not an LLM.

Auditor disagreement and Playtester fidelity disagreement may be surfaced to the Owner but cannot alter the deterministic release result.

## 8. Owner Preview path

Only after the deterministic release gate passes:

1. verified candidate is written to `drafts/<slug>/index.html`;
2. candidate SHA, Product Fidelity, Experience, audit and cost evidence are persisted;
3. Production workflow commits draft/evidence;
4. GitHub Review Issue is opened;
5. on `main`, Pages deploys draft/product changes;
6. Owner reviews Preview and responds with `/approve` or `/reject`.

Published/Draft metadata remains bound to the verified candidate SHA.

## 9. L4 closure lesson

The first explicit L4-test Run `33050802610` failed because the selftest assertion was too strict: it rejected the literal `audit.verdict` even when production code only deleted/sanitized a stray non-authoritative LLM verdict.

This was a **test-definition defect**, not a release-authority defect. The assertion was corrected to require sanitization. Full branch Run `33050867522` then passed, followed by full merged `main` Run `33051402235` — **SUCCESS**.

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

## 11. Code/context strategy — P1

Current risk remains LLM amplification from repeated full-engine/full-game context.

Next optimization layer:

- generated code-size/context metrics per attempt;
- versioned Engine API Contract/Manifest;
- bounded incremental repair protocol;
- stronger visual smoke/activity detection;
- preserve Fresh Rebuild for architecture failure.

Output-token limits and code-complexity limits remain separate concepts.

## 12. Learning — P2

Safe learning target:

`Evidence -> Candidate Lesson -> Validation -> Accepted Lesson -> Regression Test`

A single LLM statement may not autonomously rewrite core rules.

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
examples/fixtures/         verifier Green/Broken regression cases
.github/workflows/         Produce, Verify, Review, Pages
```

## 14. Current priority

1. L1 — **DONE**
2. L2 — **DONE**
3. L3 — **DONE**
4. L4 / P0 — **DONE**
5. `main` merge + complete Verifier Selftest — **DONE / Run 33051402235 SUCCESS**
6. Top-down integrity check — **PASS**
7. Exactly one controlled `Titan Core: Reforged` Canary #3 is technically eligible, but requires a new explicit Owner instruction and was not started during hardening closure
8. After reference evidence: second genre, then P1/P2 optimization
