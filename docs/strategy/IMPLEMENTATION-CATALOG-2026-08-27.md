# Game Factory — Umsetzungskatalog 27.08.2026

## Status

L1, L2, L3 und L4/P0 wurden vor dem externen Falsification Audit auf `main` technisch verifiziert.

Verifizierter Runtime-Baseline-Commit:

`f7b5e2ebd75e405d857b3bec19d85231e02eaef8`

Finaler vollständiger Runtime-Selftest auf `main`:

GitHub Actions Run `33051402235` — **SUCCESS**

Der externe Architecture Falsification Audit vom 27.08.2026 bestätigt den deterministischen Kern grundsätzlich, identifiziert aber konkrete verbleibende Beweislücken vor dem nächsten bezahlten Titan Canary.

**Wichtig:** Die Priorisierung des Audits wird normalisiert. Insbesondere bleibt das Product-Fidelity-Event-Probe-Hardening ein P0 vor Canary, obwohl es in der späteren Action-Liste des Audits inkonsistent unter P1 auftauchte.

**Titan Canary #3 wurde nicht gestartet und darf weiterhin nur nach neuer expliziter Owner-Freigabe gestartet werden.**

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

# P0 — Zwingend vor Titan Canary #3

## P0-01 — Skill Integrity

### Problem

`skills/directing.md` und `skills/engineering.md` enthalten noch veraltete Aussagen zu `random key mashing` und `~15 seconds`, obwohl der aktuelle Verifier mit festem Seed/Input und `start -> early -> mid -> end` arbeitet.

### Anforderung

- Veraltete Random-/15s-Regeln entfernen.
- Skills an die aktuelle deterministische Verifier-Architektur anpassen.
- Keine Skill-Regel darf deterministischen Control-/Verifier-Regeln widersprechen.

### Abnahme

- Kein veraltetes `random key mash` / `random input` / `~15 seconds` Verhalten mehr in aktiven Skills.
- Vollständig zusammengesetzter Runtime-Systemprompt ist widerspruchsfrei.

---

## P0-02 — Skill CI / Assembled Prompt Regression

### Problem

Aktuelle Tests prüfen vor allem rohe Prompt-Dateien, nicht zwingend den tatsächlich zusammengesetzten Systemprompt aus Prompt + Skill + Lessons. `skills/**` muss außerdem zuverlässig CI auslösen.

### Anforderung

- `skills/**` in den Verifier-CI-Trigger aufnehmen.
- Regressionstest gegen den tatsächlich assemblierten Prompt ausführen.
- Skill-/Lesson-Injection explizit testen.

### Abnahme

- Änderung an `skills/**` startet den vollständigen relevanten Selftest.
- Test würde eine erneute Random-/15s-Regel im aktiven Runtime-Prompt nachweislich erkennen und FAIL erzeugen.

---

## P0-03 — Product Fidelity Hardening

### Problem

Ein einfacher `event`-Probe kann aktuell semantisch zu schwach sein: das Auftreten eines Event-Namens allein kann eine komplexe Mechanik scheinbar beweisen, ohne dass diese Mechanik wirklich existiert.

Beispiel:

`game.event('boss_entered', {})`

könnte nicht ausreichen, um einen echten Boss-Encounter zu beweisen.

### Anforderung

- Komplexe Owner-Must-Haves dürfen nicht allein durch das bloße Auftreten eines Event-Namens PASS erhalten.
- Event-Probes müssen mindestens mit relevantem Runtime-State/Timing und einem unabhängigen beobachtbaren Zustands- oder Wertwechsel korreliert werden, wenn die Requirement-Komplexität dies verlangt.
- Director/Traceability muss Probe-Stärke passend zur Requirement-Komplexität wählen.
- Adversarial Fixture `fake event, no mechanic` ergänzen.

### Abnahme

Ein Game, das nur das erwartete Event emittiert, aber die Mechanik nicht implementiert, muss deterministisch **Product Fidelity FAIL** ergeben.

---

## P0-04 — Release Authority Structural Guard

### Problem

Die Advisory-only-Auditor-Regel ist aktuell funktional korrigiert, soll aber strukturell stärker abgesichert werden.

### Anforderung

`evaluateReleaseGate()` darf ausschließlich release-relevante deterministische Inputs akzeptieren:

- Technical
- Product Fidelity
- Experience
- Budget
- Threshold/Policy

Audit-/LLM-Felder dürfen nicht Teil der Release-Gate-Eingabeoberfläche sein.

### Abnahme

- Auditor kann den Release-Gate-Input weder direkt noch indirekt befüllen.
- Regressionstest beweist, dass Audit-/Playtester-Fidelity-Meinungen den Release-Verdict nicht verändern.

---

## P0-05 — Single Source of Truth für Model Routing

### Problem

Neben dem aktiven Router existiert eine zweite tote/konkurrierend wirkende Model-Konfiguration in `config.mjs`.

### Anforderung

- Unbenutzte `LLM`-Konfiguration aus `config.mjs` entfernen.
- Genau eine kanonische Runtime-Routing-Quelle behalten.
- Dokumentation verweist nur auf diese Quelle.

### Abnahme

- Kein zweites scheinbar autoritatives Model-Routing-Config-Objekt existiert.
- Role Router bleibt fail-closed.

---

# P0 Canary Gate

Titan Canary #3 ist erst technisch freigabefähig, wenn **P0-01 bis P0-05** implementiert und durch den vollständigen Verifier auf `main` nachweislich PASS sind.

Danach gilt weiterhin:

**Keinen bezahlten Canary ohne neue explizite Owner-Freigabe starten.**

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

1. P0-01 Skill Integrity
2. P0-02 Skill CI / Assembled Prompt Regression
3. P0-03 Product Fidelity Hardening
4. P0-04 Release Authority Structural Guard
5. P0-05 Model Config Cleanup
6. Full Verifier Selftest auf `main`
7. Top-down Gegencheck der veränderten Kette
8. **STOP — Owner-Freigabe einholen**
9. Erst danach optional genau ein kontrollierter Titan Canary #3
10. P1 nach dem Referenz-Canary
11. P2 Controlled Continuous Improvement nach belastbarer Multi-Run-Evidence

---

## Source / Audit Decision

Grundlage: externer `Game Factory: Architecture Falsification Audit` vom 27.08.2026, geprüft gegen `main @ f7b5e2e` und 28 Run-Artefakte.

Audit Overall: `47/100`.

Normalisierte Architekturentscheidung:

**YES, WITH MATERIAL CHANGES.**

Der deterministische Kern bleibt die Grundlage. Es ist kein L1-L3-Redesign vorgesehen. Die verbleibenden P0-Beweislücken werden vor dem nächsten Paid Canary geschlossen; die Learning-/Improvement-Schicht wird danach kontrolliert und evidence-driven aufgebaut.
