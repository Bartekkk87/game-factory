# Game Factory — Umsetzungskatalog 27.08.2026

## FINAL UPDATE — Audit-P0 abgeschlossen

**P0-01 bis P0-05 sind vollständig implementiert und auf `main` verifiziert.**

Finaler Runtime-Commit:

`69aac9f26d7004aa8be19ed0ec61fc649f3d6565`

Finaler vollständiger Verifier-Selftest:

GitHub Actions Run `33060506910` — **SUCCESS**

Final Acceptance:

`docs/strategy/P0-FINAL-ACCEPTANCE-2026-08-27.md`

Next Chat Handoff:

`docs/strategy/NEXT-CHAT-HANDOFF-2026-08-27.md`

Notion mirrors:

- Final Acceptance: `https://app.notion.com/p/3c98920148bd81f58073f0b1b6a9c1d3?pvs=204`
- Final Handoff: `https://app.notion.com/p/3c98920148bd81dab4eec377384025ea?pvs=204`

**Titan Canary #3 wurde nicht gestartet. Technische Readiness: JA. Operative Freigabe: NEIN bis zu einer neuen expliziten Owner-Anweisung.**

---

## Architekturprinzip

Die Factory besteht künftig aus zwei klar getrennten Schleifen:

### Production Factory

`Owner Idea -> Owner Contract -> Director -> Engineer -> Verifier -> Repair/Rebuild -> Playtester -> Polish -> deterministic Release Gate -> Owner Preview`

Ziel: **das aktuelle Spiel verbessern und sicher freigeben.**

### Improvement Factory

`Run Evidence -> deterministic Aggregation -> Threshold -> Improvement Analysis -> Lesson Candidate -> Validation -> Regression -> versionierte Aktivierung`

Ziel: **die Factory von Run zu Run verbessern.**

Die Production Factory darf nicht von ungeprüften Learning-/Improvement-Ergebnissen verändert werden.

---

# P0 — ABGESCHLOSSEN

## P0-01 — Skill Integrity — PASS

- Veraltete Random-/15s-Regeln aus aktiven Director-/Engineer-Skills entfernt.
- Skills an fixed deterministic seed/input und `start -> early -> mid -> end` angepasst.
- Regression prüft aktive Skills auf widersprüchliche Verifier-Regeln.

Evidence: Run `33059358311` — SUCCESS.

## P0-02 — Skill CI / Assembled Prompt Regression — PASS

- `skills/**` löst den vollständigen Verifier-Selftest aus.
- Director und Engineer verwenden zentrale Runtime-Systemprompt-Assembly.
- Base Prompt + Skill + Lessons werden als tatsächlich assembliertes System getestet.
- Skill-/Lesson-Injection ist explizit regressionsgetestet.

Evidence: Run `33059654534` — SUCCESS.

## P0-03 — Product Fidelity Hardening — PASS

- Positive komplexe Must-Have-Events können nicht mehr allein durch Event-Namenspräsenz PASS erhalten.
- Positive Event-Evidence muss mit relevantem Playing-State/Timing nach Early-Evidence und unabhängigem Gameplay-Progress korrelieren.
- Adversarial Fixture `fake boss_entered event, no mechanic/progress` => deterministisch Product Fidelity FAIL.
- Positive Runtime-Control mit post-early Event + realem Progress => PASS.

Zwischenlauf `33059960409` war rot, obwohl der neue Hardening-Test PASS war. Klassifikation: **Fixture-Defekt, kein Produktionsdefekt**; das alte Green-Fixture emittierte selbst zu früh. Nach Korrektur vollständiger Run `33060152626` — SUCCESS. Kein Blind-Rerun.

## P0-04 — Release Authority Structural Guard — PASS

`evaluateReleaseGate()` akzeptiert nur:

- Technical
- Product Fidelity
- Experience
- Budget
- Threshold/Policy

Audit-/Playtester-Fidelity-/sonstige LLM-Felder werden als nicht autoritative Inputs strukturell abgewiesen.

Evidence: Run `33060326700` — SUCCESS.

## P0-05 — Single Source of Truth für Model Routing — PASS

- Legacy/konkurrierende `LLM`-Konfiguration aus `config.mjs` entfernt.
- Kanonische Runtime-Routing-Quelle bleibt Role Router + Provider-/Model-Registry.
- Router bleibt fail-closed.
- Regression schützt gegen zweite scheinbar autoritative Routing-Tabelle in `config.mjs`.

Evidence: Run `33060506910` — SUCCESS.

---

# P0 Canary Gate — ERFÜLLT

Technische Readiness für genau einen kontrollierten bezahlten Titan Canary #3: **JA**.

Operative Freigabe: **NEIN bis der Owner einen neuen expliziten Startauftrag gibt**.

**Keinen Canary automatisch starten.**

Falls ein später autorisierter Canary scheitert:

`classify cause -> repair platform -> full Verifier Selftest -> decide whether another paid run is justified`

Keine blinden Paid-Reruns.

---

# P1 — Nach Referenz-Canary, vor Multi-Genre-Validierung

## P1-01 — Owner Contract Decomposition

Unstrukturierte Owner-Ideen müssen deterministisch/evidenzbasiert in diskrete Must-Haves/No-Gos zerlegt werden. Eine komplexe Idee darf nicht stillschweigend in ein einziges grobes `MH-01` kollabieren.

Abnahme:

- Jede eigenständig prüfbare Owner-Anforderung erhält eine eigene stabile Requirement-ID.
- Traceability bleibt Requirement -> Acceptance -> Probe -> Runtime Evidence.

## P1-02 — Verifier Causality / Idle Baseline

- zusätzlicher Kontrolllauf ohne synthetische Inputs;
- Progress/Score darf dort nicht künstlich steigen;
- Input-getriebene Interaktivität muss gegenüber Idle unterscheidbar sein.

## P1-03 — Visual Activity Proof

- Gameplay-Frames zusätzlich untereinander vergleichen;
- statische große Fläche darf nicht als ausreichende Gameplay-Aktivität zählen.

## P1-04 — Art-Direction Skill Wiring

`art-direction.md` entweder:

- tatsächlich in die passenden Rollen verdrahten und testen,

oder

- entfernen/umbenennen, sodass keine falsche Runtime-Behauptung existiert.

## P1-05 — Structured Memory Schema

Freitext-Lessons durch strukturiertes Schema ergänzen, mindestens:

- `id`
- `role`
- `scope`
- `text`
- `sourceRunIds`
- `sourceKind`
- `confidence`
- `evidenceCount`
- `createdAt`
- `validatedAt`
- `expiresAfter`
- `supersedes`

## P1-06 — Candidate vs Validated Lesson

- neue Lessons starten immer als `candidate`;
- Candidate Lessons dürfen **nicht** in Produktionsprompts injiziert werden;
- erst `validated` Lessons dürfen aktiv genutzt werden.

## P1-07 — Self-Modification Guard

- Daten-/Evidence-Writes dürfen weiterhin automatisiert versioniert werden;
- Änderungen an `skills/`, `factory/prompts/`, Verifier-/Release-Code oder Engine-Contracts dürfen nicht direkt aus einem Produktions-/Improvement-Bot-Run nach `main` gehen;
- solche Änderungen benötigen einen separaten PR und menschlichen Merge.

## P1-08 — Deterministic Improvement Aggregator

Nach jedem Run ohne LLM-Kosten aggregieren:

- Failure Reasons
- Failure Signatures
- Repair-/Rebuild-Zahlen
- Cost by Role/Model
- Experience/Fidelity Outcomes
- Owner Feedback

## P1-09 — Improvement Trigger

Deterministische Trigger definieren, z. B.:

- gleiche Failure-Klasse >= definierter Schwelle;
- mehrere Runs seit letzter validierter Lesson;
- Owner Rejection;
- wiederkehrendes Playtester-Muster.

Trigger startet höchstens eine budgetierte Analyse — keine direkte Änderung.

## P1-10 — Engineer Learning Candidates

Wiederkehrende Coding-/Runtime-Failure-Signaturen müssen Cross-Run-Lesson-Candidates für den Engineer erzeugen können.

Single-run Failure bleibt weiterhin nur Intra-Run-Repair-Signal.

---

# P2 — Controlled Continuous Improvement

## P2-01 — Improvement Analysis

Nur nach deterministischem Trigger:

`Aggregated Evidence -> LLM Root Cause Analysis -> scoped Lesson Candidates`

Kein direkter Prompt-/Skill-Write.

## P2-02 — Validation & Regression

Vor Promotion:

- Scope prüfen;
- unabhängige Evidence-Quellen verlangen;
- bestehende Regression Suite PASS;
- wenn möglich held-out frühere Run-Evidence prüfen.

## P2-03 — Positive Learning

Nicht nur Fehler lernen.

Aus mehreren erfolgreichen/approved Spielen können Kandidaten entstehen, z. B. auf Basis von:

- Owner Approval
- hoher Experience
- niedriger Repair Count
- niedriger Kosten
- stabiler Performance

Ein einzelner Erfolg darf keine globale Regel erzeugen.

## P2-04 — Owner Feedback Classification

Owner-Feedback klassifizieren als z. B.:

- Bug
- Produktanforderung
- einmalige Präferenz
- Genre-Präferenz
- generalisierbares Design-Learning
- positive Präferenz

Nur ausreichend validierte/generaliserbare Signale dürfen zu Skills aufsteigen.

## P2-05 — Skill Governance

Ein Skill ist künftig:

> eine validierte, wiederverwendbare Cross-Game-Erkenntnis für eine Rolle, die nicht sinnvoll stärker als deterministische Machine Rule/Engine Contract ausgedrückt werden kann.

Skills müssen:

- versioniert;
- evidence-linked;
- regression-getestet;
- stale-detectable;
- PR-gated;
- scoped sein, wenn nicht global gültig.

Autoritätsreihenfolge:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Memory Lesson`

## P2-06 — Verifier Robustness

- Seed pro Run rotierbar und gespeichert oder Multi-Seed-Spot-Check;
- alternative deterministische Input-Sequenz als Robustheitscheck evaluieren.

## P2-07 — Model Outcome Benchmarking

Modelle künftig anhand von **cost per verified release** und Qualitäts-/Konvergenzmetriken vergleichen, nicht nur cost per call.

DeepSeek/Open-Weight bleibt bis dahin Benchmark-Lane.

---

# Terminologie

Bis die P2-Learning-Architektur existiert, gilt:

- **Intra-run adaptive repair:** JA
- **Self-healing im begrenzten Run-Sinn:** nur vorsichtig verwenden
- **Cross-run learning:** sehr begrenzt / teilweise vorhanden
- **Self-improving Factory:** NOCH NICHT

Zielterminologie nach vollständiger Learning-Governance:

**evidence-driven controlled improvement**

Jede dauerhafte Verbesserung muss:

- observable
- traceable
- scoped
- versioned
- testable
- reversible

sein.

---

# Reihenfolge ab jetzt

1. **STOP — auf explizite Owner-Freigabe warten**
2. Falls freigegeben: genau ein kontrollierter Titan Canary #3
3. Canary-Outcome klassifizieren und evidenzbasiert behandeln
4. P1 nach belastbarer Referenz-Canary-Evidence
5. P2 Controlled Continuous Improvement nach belastbarer Multi-Run-Evidence

---

## Source / Audit Decision

Grundlage: externer `Game Factory: Architecture Falsification Audit` vom 27.08.2026, geprüft gegen die damalige Baseline `main @ f7b5e2e` und 28 Run-Artefakte.

Audit Overall: `47/100`.

Normalisierte Architekturentscheidung:

**YES, WITH MATERIAL CHANGES.**

Die material pre-Canary changes P0-01 bis P0-05 sind jetzt abgeschlossen und vollständig verifiziert. Der deterministische Kern bleibt die Grundlage; P1/P2 folgen kontrolliert nach neuer Referenz-Evidence.
