# Game Factory — Umsetzungskatalog 27.08.2026

## Aktueller verbindlicher Status

**P0-01 bis P0-05 sind auf `main` vollständig umgesetzt und verifiziert.**

Finaler verifizierter Runtime-Commit:

`69aac9f26d7004aa8be19ed0ec61fc649f3d6565`

Finaler vollständiger Verifier Selftest:

GitHub Actions Run `33060506910` — **SUCCESS**

Detailabnahme:

`docs/strategy/P0-FINAL-ACCEPTANCE-2026-08-27.md`

**Titan Canary #3 wurde nicht gestartet.** Technische Readiness ist erreicht, aber ein Paid Canary darf weiterhin nur nach einer neuen expliziten Owner-Instruktion gestartet werden.

---

## Architekturprinzip

### Production Factory

`Owner Idea -> Owner Contract -> Director -> Engineer -> deterministic Verifier -> Repair/Fresh Rebuild -> Playtester -> Polish -> deterministic Release Gate -> Owner Preview -> Approve/Reject`

Ziel: das aktuelle Spiel robust erzeugen, prüfen und dem Owner vorlegen.

### Improvement Factory

`Run Evidence -> deterministic Aggregation -> Threshold -> Improvement Analysis -> Lesson Candidate -> Validation -> Regression -> human-merged/versioned activation`

Ziel: die Factory selbst evidence-driven verbessern.

Die Improvement Factory ist noch nicht vollständig implementiert. Production darf nicht durch ungeprüfte Learning-Signale direkt selbstmodifiziert werden.

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Memory Lesson`

---

# P0 — VOR TITAN CANARY #3 — DONE

## P0-01 — Skill Integrity — PASS

- Veraltete `random key mash` / `random input` / `~15 seconds` Regeln aus aktiven Skills entfernt.
- Director-/Engineer-Skills an fixed deterministic Seed/Input und `start -> early -> mid -> end` angepasst.
- Regression prüft aktive Skill-Inhalte.

Evidence: Run `33059358311` — SUCCESS.

## P0-02 — Skill CI / Assembled Prompt Regression — PASS

- `skills/**` triggert vollständigen Verifier Selftest.
- Runtime-Systemprompt wird zentral über `assembleSystemPrompt(...)` zusammengesetzt.
- Director und Engineer verwenden exakt diesen Assembly-Pfad.
- Test prüft Base Prompt + Skill + Lessons sowie explizite Lesson-Injection.
- Rückfall auf stale Random-/15s-Regeln führt deterministisch zu FAIL.

Evidence: Run `33059654534` — SUCCESS.

## P0-03 — Product Fidelity Hardening — PASS

- Positive Must-Have-`event`-Probes werden als `correlated_gameplay` kompiliert.
- Event-Name allein genügt nicht mehr.
- Event muss mit relevantem Runtime-State/Timing nach Early-Evidence und unabhängiger engine-observed Gameplay-Progression korrelieren.
- Adversarial Fixture `fake boss_entered event, no mechanic/progress` ergibt Product Fidelity FAIL.
- Positive Control Fixture ergibt PASS.
- Director-/Engineer-Prompts wurden auf die stärkere Evidence-Semantik angepasst.

Zwischenbefund: Run `33059960409` deckte ein altes Runtime-Green-Fixture auf, das selbst vor dem neuen Early-Grenzwert emittierte. Klassifikation: **fixture defect**, nicht production defect. Fixture korrigiert; kein Blind-Rerun.

Final Evidence: Run `33060152626` — SUCCESS.

## P0-04 — Structural Release Authority Guard — PASS

`evaluateReleaseGate(...)` akzeptiert nur:

- `technical`
- `productFidelity`
- `experienceScore`
- `budget`
- `minExperience`

Andere Inputs werden als nicht autoritativ strukturell abgewiesen.

Regression beweist explizit, dass `audit` und `playtesterFidelity` nicht in die Release-Gate-Oberfläche gelangen können.

Evidence: Run `33060326700` — SUCCESS.

## P0-05 — Model Routing Single Source of Truth — PASS

- konkurrierende Legacy-`LLM`-/Provider-Konfiguration aus `factory/src/config.mjs` entfernt;
- kanonische Runtime-Route liegt ausschließlich im Role Router + Provider/Model Registries;
- Router-Test schützt gegen Wiederauftauchen eines zweiten `LLM`-/`roleModels`-Objekts in `config.mjs`;
- fail-closed Routing bleibt erhalten.

Referenzroute:

- Director -> `gpt-5.6-terra`
- Engineer Build/Repair/Rebuild/Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release -> kein LLM

Evidence: Run `33060506910` — SUCCESS.

---

# Finaler P0-Gegencheck — PASS

Top-down geprüft:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity -> Playtester -> Experience -> Budget -> deterministic Release Gate -> Owner Preview`

Ergebnis: **PASS**.

Finaler vollständiger Runtime-Proof ist Run `33060506910` auf Commit `69aac9f26d7004aa8be19ed0ec61fc649f3d6565`.

---

# Harte Canary-Regel

Technische Readiness für genau einen kontrollierten Titan Canary #3: **YES**.

Automatische/operative Freigabe: **NO**.

Es gilt weiterhin:

**Keinen bezahlten Canary ohne neue explizite Owner-Instruktion starten.**

Falls ein später freigegebener Canary scheitert:

`classify cause -> repair platform -> full verifier selftest -> Entscheidung über weiteren paid run`

Kein Blind-Rerun.

---

# P1 — Nach Referenz-Canary

P1 nicht vorziehen, sofern kein zwingender P0-/Canary-Defekt dies erforderlich macht.

## P1-01 — Owner Contract Decomposition

Komplexe unstrukturierte Owner-Ideen deterministisch/evidenzbasiert in diskrete Must-Haves/No-Gos zerlegen. Jede eigenständig prüfbare Anforderung benötigt eine eigene stabile Requirement-ID.

## P1-02 — Verifier Causality / Idle Baseline

Zusätzlicher Kontrolllauf ohne synthetische Inputs. Score/Progress darf dort nicht künstlich steigen; Input-getriebene Interaktivität muss gegenüber Idle unterscheidbar sein.

## P1-03 — Visual Activity Proof

Gameplay-Frames zusätzlich untereinander vergleichen. Eine statische große Fläche darf nicht als ausreichende Gameplay-Aktivität zählen.

## P1-04 — Art Direction Skill Wiring

`art-direction.md` entweder tatsächlich verdrahten und testen oder die falsche Runtime-Behauptung entfernen/umbenennen.

## P1-05 — Structured Memory Schema

Lessons mindestens mit:

- `id`
- `role`
- `scope`
- `text`
- `sourceRunIds`
- `sourceKind`
- `confidence/status`
- `evidenceCount`
- `createdAt`
- `validatedAt`
- `expiresAfter`
- `supersedes`

## P1-06 — Candidate vs Validated Lesson

Neue Lessons starten als `candidate`. Candidate Lessons dürfen nicht in Produktionsprompts gelangen. Nur `validated` Lessons dürfen aktiv genutzt werden.

## P1-07 — Self-Modification Guard

Automatische Data/Evidence Writes bleiben möglich. Änderungen an `skills/`, `factory/prompts/`, Verifier, Release Gate oder Engine Contracts benötigen separaten PR + human merge.

## P1-08 — Deterministic Improvement Aggregator

Nach jedem Run ohne LLM-Kosten aggregieren:

- Failure Signatures
- Failure Reasons
- Repair/Rebuild Counts
- Cost by Role/Model
- Experience Outcomes
- Fidelity Outcomes
- Owner Feedback

## P1-09 — Improvement Trigger

Explizite deterministische Schwellen definieren. Nur nach Überschreitung darf eine spätere Improvement Analysis laufen.

## P1-10 — Engineer Lesson Candidates

Wiederkehrende Failure Signatures können Cross-Run Engineer Lesson Candidates erzeugen. Ein einzelner Fehler bleibt nur intra-run Repair Signal.

---

# P2 — Controlled Continuous Improvement

Zielarchitektur:

`Production Run -> RUN-EVIDENCE -> deterministic Aggregation -> Threshold -> Improvement Analysis -> scoped Lesson Candidate -> Validation -> Regression -> human-merged/versioned activation -> next Production Run`

Nicht erlaubt:

`Failure -> LLM -> Prompt Edit -> Production`

Jede dauerhafte Verbesserung muss observable, traceable, scoped, versioned, testable und reversible sein.

## P2-01 — Improvement Analysis

Nur nach deterministischem Trigger: `Aggregated Evidence -> LLM Root Cause Analysis -> scoped Lesson Candidates`.

## P2-02 — Validation & Regression

Vor Promotion: Scope prüfen, unabhängige Evidence verlangen, Regression Suite PASS und wenn möglich frühere/held-out Evidence prüfen.

## P2-03 — Positive Learning

Auch erfolgreiche/approved Runs als Kandidatensignale nutzen, aber kein einzelner Erfolg darf eine globale Regel erzeugen.

## P2-04 — Owner Feedback Classification

Owner Feedback klassifizieren, z. B. Bug, Product Requirement, One-off Preference, Genre Preference, Generalizable Lesson, Positive Preference.

## P2-05 — Skill Governance

Skill = validierte wiederverwendbare Cross-Game-Erkenntnis für eine Rolle, die nicht sinnvoll stärker als deterministische Machine Rule/Engine Contract ausgedrückt werden kann.

## P2-06 — Verifier Robustness

Seed pro Run rotierbar und gespeichert oder Multi-Seed-Spot-Check; alternative deterministische Input-Sequenz als Robustheitscheck evaluieren.

## P2-07 — Model Outcome Benchmarking

Modelle anhand `cost per verified release`, Qualität und Konvergenz vergleichen. DeepSeek/Open-Weight bleibt Benchmark-Lane, kein stiller Production-Fallback.

---

# Terminologie

Aktuell:

- Intra-run adaptive repair: **JA**
- Cross-run learning: **begrenzt / teilweise**
- Self-healing: nur vorsichtig für bounded intra-run recovery
- Self-improving Factory: **NOCH NICHT**

Bevorzugter Zielbegriff:

**evidence-driven controlled improvement**

---

## Audit Decision

Externer Falsification Audit vom 27.08.2026: `47/100`, Verdict **YES, WITH MATERIAL CHANGES**.

Der deterministische L1-L3-Kern wurde nicht neu designt. Die normalisierten Audit-P0-Lücken sind jetzt geschlossen und durch den finalen vollständigen Verifier nachgewiesen.

Nächster zulässiger Schritt: **STOP / Owner informieren.** Erst nach neuer expliziter Owner-Instruktion darf genau ein kontrollierter Titan Canary #3 gestartet werden.
