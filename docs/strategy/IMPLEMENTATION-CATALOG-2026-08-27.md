# Game Factory — Umsetzungskatalog (27.08.2026)

Ja. **Notion ist nachgezogen** – auf der bestehenden Seite **„Game Development as a Service — Opportunity Validation“** gibt es jetzt den Abschnitt **„Production Hardening & LLM-Auswahl — 27.08.2026“** mit Qualitätslogik, DeepSeek-Entscheidung, Architekturänderungen und Reihenfolge bis zum nächsten Titan-Test.

Jetzt würde ich tatsächlich **von unten nach oben** durch die Architektur gehen und danach einmal **von oben nach unten gegenprüfen**. So vermeiden wir, dass wir oben schöne Agenten bauen, während unten die Control Plane noch unsauber ist.

### L1 — Control Kernel / Fundament

Das ist für mich **jetzt zuerst dran**.

**Behalten:** GitHub Actions als Execution Runtime, Git als Source of Truth, Fail-Closed, Candidate-SHA, serialisierte Produktionsläufe, Fresh-Rebuild bei Stagnation und Rollback nach schlechtem Polish. Diese Teile sind inzwischen sinnvoll.

**Anpassen müssen wir:**

- echtes Kosten-Tracking statt des heutigen unzuverlässigen `$10`-Pseudo-Gates;
- Kosten **pro Modell, Rolle und Attempt**;
- vor jedem neuen LLM-Aufruf prüfen, ob das Restbudget reicht;
- klare maximale Repair-/Polish-/Rebuild-Budgets;
- Release-PASS als **deterministische Maschinenlogik**, nicht als Entscheidung des Auditors;
- ein einheitliches Evidence-Schema pro Run.

Ziel:

> Die Factory selbst entscheidet zuverlässig: „Darf ich noch weiterarbeiten?“, „Ist dieser Kandidat wirklich grün?“ und „Darf er zum Owner?“

**Priorität: P0.**

---

### L2 — Model & Provider Layer

Hier kommt deine DeepSeek-Idee hinein.

Heute ist das noch relativ simpel: Provider + Modellnamen. Künftig brauchen wir einen richtigen **Role Router**.

Beispielsweise:

```text
Director
   → Modell A

Engineer Build
   → DeepSeek / Referenzmodell

Engineer Repair
   → ggf. anderes Modell

Playtester
   → Vision-Modell

Audit Summary
   → günstiges Modell

Release Verdict
   → kein LLM
```

Dazu gehören:

- Modellregister;
- Preisregister;
- Fähigkeiten: Coding, Vision, Structured Output etc.;
- Context-/Output-Limits;
- Provideradapter;
- **keine stillen Providerwechsel**;
- Modell und Version immer in der Evidence speichern.

DeepSeek wird hier als **priorisierter Coding-Kandidat** vorgesehen, aber erst nach Referenz-Eval zum Standard. Das haben wir bereits als Requirement im Repo festgeschrieben.

**Priorität: Teile P0, Benchmark P2.**

---

### L3 — Verification & Evidence

Hier sehe ich momentan den **wichtigsten funktionalen Ausbau**.

Aktuell kann der Verifier beweisen:

> „Das Spiel läuft.“

Er kann aber noch nicht ausreichend beweisen:

> „Das ist tatsächlich das Spiel, das Bartosz bestellt hat.“

Deshalb brauchen wir drei verschiedene Gates:

**Technical**
→ läuft, keine Errors, FPS, Interaktion usw.

**Product Fidelity**
→ Titan existiert, Salvage existiert, Upgrade verändert Gameplay, Risk/Reward existiert usw.

**Experience**
→ sieht vernünftig aus, UI lesbar, Gameplay wirkt attraktiv.

Dafür müssen wir:

- festen Verifier-Seed speichern;
- nicht nur Mid → End messen, sondern Start → Early → Mid → End;
- Gameplay-Events sammeln;
- Director-`probePlan` wirklich verwenden;
- Owner-Must-Haves als prüfbare IDs durchreichen;
- Visual Smoke Test später verbessern.

Das ist aus meiner Sicht ein wesentlicher Bestandteil unseres möglichen **Burggrabens**: Nicht nur Code erzeugen, sondern nachweisen, dass das Ergebnis funktioniert.

**Priorität: P0.**

---

### L4 — Production Agents

Erst jetzt kommen Director, Engineer, Playtester und Auditor.

#### Director

Er soll nicht nur ein kreatives GDD schreiben.

Neu:

```text
Owner Idea
↓
Owner Contract
↓
Director GDD
↓
Acceptance Criteria
```

Beispielsweise:

```text
MH-01 Titan boss
MH-02 collect salvage
MH-03 upgrades affect gameplay
MH-04 real risk/reward choice
NG-01 no decorative fake upgrades
```

Damit kann später jede Rolle diese Anforderungen verfolgen.

#### Engineer

Hier sitzt vermutlich unser größtes Kostenproblem.

Heute passiert vereinfacht:

```text
Engine komplett
+ GDD komplett
+ Game komplett
+ Fehler
→ LLM
→ komplettes Game neu
```

Und das bei jedem Repair.

Das wollen wir später eher in:

```text
Engine API Contract
+ relevante Codebereiche
+ Fehler
→ bounded patch
```

umbauen.

**Aber:** Full Rebuild behalten wir ausdrücklich. Wenn die Architektur Mist ist, soll die Factory nicht 15-mal denselben kaputten Code flicken.

Außerdem erfassen wir künftig Codegröße und Tokenmenge. Erst danach entscheiden wir über echte Größenlimits.

#### Playtester

Große Änderung:

Er bekommt künftig:

- Screenshots;
- Telemetrie;
- Owner Contract;
- GDD.

Und liefert zwei getrennte Aussagen:

```text
Fidelity: PASS/FAIL
Experience: 0–10
```

#### Auditor

Der Auditor darf gern erklären:

> „Warum ist dieses Game freigabereif?“

Aber er soll **nicht mehr entscheiden**, ob es technisch freigabereif ist.

**Priorität: Director/Playtester P0, Engineer-Kontextoptimierung teilweise P1.**

---

### L5 — Owner / Product Layer

Ganz oben bleibt deine Rolle erstaunlich klein:

```text
Idee eingeben
↓
Factory arbeitet
↓
Preview
↓
Approve / Reject
```

Und genau so sollte es bleiben.

Später für eine echte Plattform kommen:

- Briefing UI;
- Login;
- Projekte;
- Versionshistorie;
- Quoten;
- Credits/Billing;
- sichere Sandboxes;
- Source Export.

**Das ist derzeit ausdrücklich nicht P0.**

Wir sollten nicht anfangen, ein SaaS-Frontend zu bauen, bevor der Produktionskern zuverlässig zwei verschiedene Games herstellen kann.

---

## Top-down-Gegencheck

Wenn wir anschließend wieder **von oben nach unten** schauen, muss dieselbe Kette vollständig erhalten bleiben:

```text
Owner sagt:
„Titan + Salvage + Upgrades + Risk/Reward“

↓ Owner Contract

Director:
„So wird daraus ein Game.“

↓ Acceptance Criteria

Engineer:
„Ich implementiere genau diese Anforderungen.“

↓ Code

Verifier:
„Ich habe Evidence für diese Anforderungen.“

↓ PASS

Playtester:
„Ja, das verlangte Produkt ist vorhanden
und Experience = 7.3.“

↓ Release Gate

Factory:
Technical PASS
Fidelity PASS
Experience PASS
Budget PASS

↓
Owner erhält Preview
```

**Kein Teil darf unterwegs deine ursprüngliche Anforderung verlieren.**

### Damit ist unsere Reihenfolge jetzt aus meiner Sicht:

**1. L1 Control Kernel härten**  
→ Kosten + Budget + deterministisches Release Gate.

**2. L2 Model Layer sauber machen**  
→ Role Router + Preis-/Capability-Registry; DeepSeek vorbereiten, aber noch nicht produktiv wechseln.

**3. L3 Verification erweitern**  
→ Owner Contract + Telemetrie + Fidelity-Evidence.

**4. L4 Agents entsprechend umbauen**  
→ Director, Engineer, Playtester und Auditor sauber an die neuen Contracts anbinden.

**5. Selftest komplett grün.**

**6. Titan Canary #3.**

Das ist jetzt auch weitgehend deckungsgleich mit unserem bereits festgehaltenen Production-Hardening-Plan und Issue #3.

**Ich würde deshalb als Nächstes ganz konkret bei L1 anfangen und den Control Kernel Punkt für Punkt gegen den aktuellen Code prüfen und anschließend die notwendigen Änderungen umsetzen.**