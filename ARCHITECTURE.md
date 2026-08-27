# Game Factory — Architektur v2.2 (Studio OS)

Autonome, evidence-first Game-Development-Plattform auf GitHub. Ziel ist nicht nur, Spiele zu generieren, sondern reproduzierbar nachzuweisen, dass ein Owner-Brief technisch und produktseitig erfüllt wurde.

Der aktuelle Produktionskern läuft auf GitHub Actions. GitHub bleibt durable Source of Truth für Code, Evidence, Drafts, Entscheidungen und Lernartefakte.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Ein fehlender oder widersprüchlicher Nachweis führt nicht zu Publish.
3. **Owner-Intent ist ein Vertrag.** Explizite Must-Haves und No-Gos dürfen in späteren Rollen nicht verloren gehen.
4. **Determinismus dort, wo getestet wird.** Gleicher Kandidat + gleicher Seed + gleiche Eingaben sollen dieselbe Verifier-Evidence erzeugen.
5. **Modelle sind Worker, keine Control Plane.** Budget, Gates, SHA-Binding und Release-Entscheidungen sind Maschinenlogik.
6. **Provider bleiben austauschbar.** Provider-/Modellfähigkeit wird über Adapter und Capability Registry beschrieben; kein stiller Cross-Provider-Fallback.
7. **Lernen braucht Evidence.** Selbstverbesserung darf keine unvalidierte Prompt-Selbstmutation sein.

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
- **L4 Production Agents — NEXT / P0**

## 3. Ist-Prozess — verifizierter Post-L3-Stand

```text
Owner idea
  -> immutable Owner Contract (MH/NG IDs)
  -> Director: GDD + Acceptance/Probe traceability
  -> Engineer: full game design slots (css/html/js)
  -> Assemble single index.html + bounded probe extension
  -> Headless Chromium verifier
       -> deterministic seed + input sequence
       -> start/early/mid/end telemetry
       -> bounded runtime/mechanic events
       -> Technical PASS/FAIL
       -> deterministic Product Fidelity PASS/FAIL
  -> targeted repair
  -> fresh rebuild when repairs stagnate
  -> Playtester from screenshots + metrics (L4 context expansion still open)
  -> polish + reverify, rollback on technical/fidelity regression
  -> LLM Auditor (advisory)
  -> deterministic Release Gate
  -> draft + Review Issue
  -> Owner /approve or /reject
  -> product or archive
```

Bereits implementiert und verifiziert:

- L1 echtes Kosten-/Budget-Control mit Pre-Call Enforcement;
- L1 deterministisches Release Gate;
- L2 fail-closed Role Router + Provider/Capability/Price Registry;
- immutable Owner Contract mit stabilen `MH-xx` / `NG-xx` IDs;
- deterministischer Contract-Hash;
- Owner-ID -> Director Acceptance-/Probe-ID Traceability;
- deterministischer Verifier-Seed und persistierte Input-Sequenz;
- `start -> early -> mid -> end` Telemetrie;
- frühe Gameplay-Progression als Interaktivitätsnachweis;
- bounded Runtime-/Mechanic-Events;
- deterministisches Product Fidelity PASS/FAIL;
- Green/Broken-Fixtures für neue Hard Checks;
- echter assemblierten Runtime-End-to-End-Test für Gameplay-Wertwechsel vs. Fake-Upgrade;
- Fidelity Enforcement in Build/Repair/Polish;
- Repair-Stagnationserkennung mit Fresh-Rebuild-Eskalation;
- Rückfall auf den letzten technisch und produktseitig verifizierten Stand nach fehlgeschlagenem Polish;
- Draft-/Publish-SHA-Binding;
- Owner-only Review-Kommandos über GitHub Issues.

Verifizierter Runtime-Commit:

`52e843bba72bd3fe83ea2b34475a32e2076dcdee`

Vollständiger Verifier-Selftest auf diesem Runtime-Stand:

GitHub Actions Run `33046180562` — **SUCCESS**.

Spätere reine Dokumentationscommits ändern diesen technischen Nachweis nicht.

## 4. Ziel-Prozess nach L4 P0

```text
A  INTAKE / CONTRACT
   Owner idea
     -> immutable Owner Contract
        - mustHave IDs
        - noGo IDs
        - deterministic contract hash
     -> Director GDD
     -> machine-readable Acceptance/Probe IDs

B  BUILD / REPAIR
   Engineer receives Owner Contract + Acceptance/Probe mapping
     -> build
     -> static output validation
     -> assemble
     -> technical + fidelity verifier
        -> PASS
        -> or targeted repair
        -> or fresh rebuild on stagnation

C  PRODUCT QUALITY
   Owner Contract + GDD + Acceptance/Probe mapping
   + telemetry + runtime events + screenshots
     -> deterministic Product Fidelity gate
     -> independent Playtester fidelity review
     -> Experience score
     -> polish only from a verified baseline
     -> reverify after every change

D  RELEASE
   deterministic Release Gate:
     technical PASS
     + deterministic owner fidelity PASS
     + experience >= threshold
     + real budget within limit
     + evidence consistency
     -> optional LLM audit narrative
     -> draft + Review Issue

E  OWNER
   /approve -> immutable published product
   /reject -> archive + owner feedback evidence

F  LEARNING
   run evidence
     -> lesson candidate
     -> validate against repeated evidence/regression tests
     -> accepted role/platform lesson
```

## 5. Rollen und Modellstrategie

Vorbereitete OpenAI-Referenzmatrix:

| Rolle | Zielmodell | Rolle im System |
|---|---|---|
| Director | `gpt-5.6-terra` | Produktdefinition + Constraint Decomposition |
| Engineer Build/Repair/Rebuild/Polish | `gpt-5.6-terra` | Haupt-Coding-Worker |
| Playtester | `gpt-5.6-terra` zunächst | unabhängige Fidelity-/Experience-Kritik |
| Auditor-Zusammenfassung | `gpt-5.6-luna` | begrenzte Evidence-Zusammenfassung |
| Release PASS/FAIL | kein LLM | deterministische Control-Plane-Entscheidung |

L4 bestätigt vor Canary #3, dass diese Matrix tatsächlich die Referenzroute ist und mit Router-/Capability-Tests abgedeckt bleibt.

Später werden Luna/Terra je Rolle auf gespeicherten Eval-Cases verglichen. Ein Sol-Rescue darf nur explizit, budgetbewusst und nach nachgewiesener Terra-Stagnation eingesetzt werden. Open-Weight-/DeepSeek-Modelle werden als Vergleichslane ergänzt, nicht als ungeprüfter automatischer Fallback.

## 6. LLM / Provider Layer — L2 verifiziert

Die Factory besitzt jetzt eine Capability-basierte Provider-/Model-Schicht:

```text
Role Request
  -> fail-closed Role Router
  -> Provider Registry
  -> Capability / Price Registry
  -> Provider Adapter
  -> Structured Result + Usage
  -> Cost Accounting
```

Metadaten umfassen:

- Modell-ID;
- Text-/Vision-Fähigkeit;
- Structured/JSON Capability;
- Reasoning Capability;
- Kontext-/Output-Limits;
- Input/Cached-Input/Output-Preise.

Kein Provider darf stillschweigend gewechselt werden.

## 7. Code- und Kontextstrategie

Das veröffentlichte Spiel bleibt eine einzelne `index.html`. Das bedeutet aber nicht, dass jeder LLM-Schritt den kompletten Quelltext neu erzeugen muss.

Aktuelles Risiko:

```text
full engine source
+ owner contract
+ full GDD
+ full previous game
+ failure evidence
-> Engineer
-> full game JSON again
```

Bei mehreren Repairs entsteht Token-Amplifikation.

P1-Ziel:

- Codegröße je Attempt messen und als Evidence speichern;
- zunächst Soft-Warnungen statt willkürlicher Hard Caps;
- Engine API als versioniertes, gegen die Engine getestetes Manifest;
- gezielte Repairs als bounded edits/patches;
- Full Rebuild bleibt für echte Architekturfehler erhalten;
- Output-Token-Limit und Code-Komplexitätslimit bleiben getrennte Konzepte.

## 8. Verification — L3 verifiziert

### Generischer technischer Contract

Verpflichtend:

- `__GF__` vorhanden;
- keine Runtime-/Probe-Fehler;
- keine fehlgeschlagenen Requests/Assets;
- Spiel verlässt Titelzustand;
- Gameplay reagiert deterministisch auf Testeingaben;
- FPS-Gate;
- sichtbarer Gameplay-Content.

### Verifizierte L3-Erweiterungen

- fixer Test-Seed;
- persistierte deterministische Input-Sequenz;
- `start / early / mid / end` Telemetrie;
- Owner-Contract-IDs in der Evidence;
- Director Acceptance-/Probe-Traceability;
- Engine-generierte State-/Score-Events;
- bounded mechanic events für produktspezifische Anforderungen;
- deterministisches Product Fidelity PASS/FAIL;
- Green/Broken-Fixtures für neue Hard Checks;
- echter Runtime-End-to-End-Fidelity-Test.

### P1 verbleibend

- Engine-Version + API-Manifest-SHA in Evidence;
- robusterer Visual-Activity-Test statt nur Vergleich mit einer Hintergrundfarbe.

## 9. Product Fidelity vs Experience

Die Qualitätsarten sind getrennt:

**Deterministic Product Fidelity** beantwortet:
> Gibt es maschinenlesbare Evidence dafür, dass der Owner Contract erfüllt wurde?

Beispiele:
- Titan/Boss-Evidence;
- Salvage gesammelt;
- Upgrade verändert einen echten Gameplay-Wert;
- Risk/Reward erzeugt eine echte Wahl mit unterscheidbaren Outcomes;
- No-Go wird nicht verletzt.

**Independent Playtester Fidelity Review** beantwortet künftig in L4:
> Ist das bestellte Produkt in Screenshots, Telemetrie und Events als Produkt plausibel und vollständig erkennbar?

**Experience** beantwortet:
> Ist das umgesetzte Spiel lesbar, attraktiv und wahrscheinlich spaßig?

Ein hübsches Spiel kann fehlende Must-Haves nicht kompensieren. Der Playtester kann die deterministische Fidelity-Authority nicht überschreiben.

## 10. Budget Control — L1 verifiziert

`GF_BUDGET_USD` ist ein echtes Control-Plane-Gate:

- Preisregister je Modell;
- Tokenkategorien aus Usage werden in Kosten übersetzt;
- Kosten je Rolle/Modell/Operation/Attempt werden persistiert;
- vor bezahltem Transport wird Budget reserviert/geprüft;
- bei Unsicherheit oder Überschreitung fail closed;
- externes Provider-Projektlimit bleibt zusätzliche Sicherung.

## 11. Durable Evidence

Pro Run sollen mindestens erhalten bleiben:

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
cost.json
RUN-EVIDENCE.json
RESULT.json | FAILURE.json
```

Published/Draft-Metadaten bleiben an den SHA des geprüften `index.html` gebunden.

## 12. Learning

Lernen bleibt eine spätere Evidence-basierte Pipeline:

```text
Evidence -> Candidate Lesson -> Validation -> Accepted Lesson -> Regression Test
```

Owner-Rejections, wiederholte technische Fehlermuster, Verifier-Fehler und erfolgreiche Reparaturen können Kandidaten erzeugen. Eine einzelne LLM-Aussage darf keine Kernregel autonom überschreiben.

## 13. Repo-Layout

```text
engine/                    Micro-Engine + künftig API Contract/Manifest
factory/src/contract/      Owner Contract + Traceability
factory/src/control/       Budget / Release Authority / Unified Evidence
factory/src/llm/           Role Router / Provider / Capability / Price Registry
factory/src/roles/         Director / Engineer / Playtester / Auditor
factory/src/verify/        Harness / Technical Contract / Product Fidelity
factory/prompts/           Rollen-Prompts
skills/                    versionierte Rollen-Lektionen
ideas/                     Owner-Inputs
drafts/                    geprüfte Kandidaten vor Owner-Gate
products/                  veröffentlichte Spiele
runs/                      vollständige Run-/Attempt-Evidence
memory/                    Registry, Lessons, Stats
docs/strategy/             Architektur-/Hardening-/Produktstrategie
examples/fixtures/         Verifier Green/Broken Regression Cases
.github/workflows/         Produce, Verify, Review, Pages
```

## 14. Aktuelle Prioritäten

Die ausführliche Arbeitsliste steht in `docs/strategy/PRODUCTION-HARDENING-PLAN.md`.

Reihenfolge ab dem aktuellen Stand:

1. **L1 Control Kernel — DONE**
2. **L2 Model / Provider Layer — DONE**
3. **L3 Verification & Evidence — DONE**
4. **L4 Production Agents — JETZT / P0**
   - Engineer Owner Contract / deterministic prompt alignment;
   - Playtester Owner Contract + GDD + telemetry/events + independent fidelity review;
   - Auditor advisory alignment;
   - GPT-5.6 reference route confirm + test.
5. vollständiger Selftest nach L4;
6. Top-down-Integritätscheck;
7. genau ein `Titan Core: Reforged` Canary #3;
8. erst nach Referenz-PASS zweites Genre und P1/P2 Optimierungen.

Bis L4 P0, Full Selftest und Top-down-Gegencheck grün sind, wird **kein weiterer bezahlter Titan-Canary gestartet**.
