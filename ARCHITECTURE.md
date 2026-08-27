# Game Factory — Architektur v2.1 (Studio OS)

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
   Director -> Engineer -> Repair/Rebuild -> Playtester -> Polish -> Draft

L3 EVIDENCE & QUALITY
   Technical Verifier -> Product Fidelity -> Experience Score -> Release Gate

L2 MODEL / PROVIDER LAYER
   Role Router -> Provider Adapter -> Capability/Price Registry

L1 CONTROL KERNEL
   GitHub Actions -> fail-closed state -> SHA binding -> budget -> runs/ evidence -> memory
```

## 3. Ist-Prozess (verifiziert)

```text
Owner idea
  -> Director: GDD
  -> Engineer: full game design slots (css/html/js)
  -> Assemble single index.html
  -> Headless Chromium verifier
  -> targeted repair
  -> fresh rebuild when repairs stagnate
  -> Playtester from screenshots + metrics
  -> polish + reverify, rollback on regression
  -> LLM Auditor
  -> draft + Review Issue
  -> Owner /approve or /reject
  -> product or archive
```

Bereits implementiert:

- deterministische Auswahl der durch einen Push geänderten Idee;
- providerabhängige Rollenmodelle;
- deterministische Input-Sequenz im Verifier;
- Green/Broken-Verifier-Selftest;
- Evidence pro Attempt und Candidate SHA;
- Repair-Stagnationserkennung mit Fresh-Rebuild-Eskalation;
- Rückfall auf den letzten technisch grünen Stand nach fehlgeschlagenem Polish;
- Draft-/Publish-SHA-Binding;
- Owner-only Review-Kommandos über GitHub Issues.

Der Plattformstand `84eb3ab` hat den vollständigen Verifier-Selftest bestanden. Spätere reine Dokumentationscommits ändern diesen technischen Nachweis nicht.

## 4. Ziel-Prozess nach Production Hardening

```text
A  INTAKE / CONTRACT
   Owner idea
     -> immutable Owner Contract
        - mustHave IDs
        - noGo IDs
        - success criteria
     -> Director GDD
     -> machine-readable acceptance/probe plan

B  BUILD / REPAIR
   Engineer
     -> build
     -> static output validation
     -> assemble
     -> technical verifier
        -> PASS
        -> or bounded repair
        -> or fresh rebuild on stagnation

C  PRODUCT QUALITY
   Owner-contract evidence + GDD + telemetry + screenshots
     -> Product Fidelity gate
     -> Experience Playtester
     -> polish only from a verified baseline
     -> reverify after every change

D  RELEASE
   deterministic Release Gate:
     technical PASS
     + owner fidelity PASS
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

OpenAI-Benchmarkziel nach dem Hardening:

| Rolle | Zielmodell | Startpunkt |
|---|---|---|
| Director | `gpt-5.6-terra` | wenige Calls, hoher Einfluss auf Produktdefinition |
| Engineer Build/Repair/Rebuild/Polish | `gpt-5.6-terra` | Haupt-Coding-Worker, Balance aus Qualität und Kosten |
| Playtester | `gpt-5.6-terra` zunächst | visuelle/produktseitige Kritik beeinflusst teure Polish-Loops |
| Auditor-Zusammenfassung | `gpt-5.6-luna` | begrenzte Evidence-Zusammenfassung |
| Release PASS/FAIL | kein LLM | deterministische Control-Plane-Entscheidung |

Später werden Luna/Terra je Rolle auf gespeicherten Eval-Cases verglichen. Ein Sol-Rescue darf nur explizit, budgetbewusst und nach nachgewiesener Terra-Stagnation eingesetzt werden. Open-Weight-Modelle werden später als Vergleichslane ergänzt, nicht als ungeprüfter automatischer Fallback.

## 6. LLM / Provider Layer

Aktuell nutzt die Factory einen OpenAI-kompatiblen Chat-Completions-Pfad für:

- OpenAI
- OpenRouter
- Google AI
- Hugging Face Router

Ziel ist eine Capability-basierte Adapterstruktur:

```text
Role Request
  -> Model Router
  -> Provider Adapter
       - portable chat/json adapter
       - OpenAI Responses adapter
  -> Structured Result + Usage
  -> Cost Accounting
```

Adapter-Metadaten:

- Modell-ID und Snapshot/Alias;
- Text-/Vision-Fähigkeit;
- Structured Outputs / JSON Schema;
- Reasoning-Einstellungen;
- Kontext-/Output-Limits;
- Input/Cached-Input/Output-Preise;
- Cache-/Continuation-Fähigkeit.

Kein Provider darf stillschweigend gewechselt werden, weil damit Qualität, Datenschutz, Verfügbarkeit und Kosten geändert würden.

## 7. Code- und Kontextstrategie

Das veröffentlichte Spiel bleibt eine einzelne `index.html`. Das bedeutet aber nicht, dass jeder LLM-Schritt den kompletten Quelltext neu erzeugen muss.

Aktuelles Risiko:

```text
full engine source
+ owner idea
+ full GDD
+ full previous game
+ failure evidence
-> Engineer
-> full game JSON again
```

Bei mehreren Repairs entsteht dadurch Token-Amplifikation.

Ziel:

- Codegröße je Attempt messen und als Evidence speichern;
- zunächst Soft-Warnungen statt willkürlicher kleiner Hard Caps;
- Engine API als versioniertes, gegen die Engine getestetes Manifest;
- gezielte Repairs als bounded edits/patches;
- Full Rebuild bleibt für echte Architekturfehler erhalten;
- Output-Token-Limit und Code-Komplexitätslimit bleiben getrennte Konzepte.

Ein sehr großes Kontextfenster ist kein Grund, unnötig große Artefakte in jeder Runde erneut zu senden.

## 8. Verification

### Generischer technischer Contract

Bleibt verpflichtend:

- `__GF__` vorhanden;
- keine Runtime-/Probe-Fehler;
- keine fehlgeschlagenen Requests/Assets;
- Spiel verlässt Titelzustand;
- Gameplay reagiert auf Eingaben;
- FPS-Gate;
- sichtbarer Gameplay-Content.

### Geplante Erweiterung

- fixer Test-Seed und persistierte Input-Sequenz;
- Start/Early/Mid/End bzw. periodische Telemetrie;
- Engine-Version + API-Manifest-SHA in Evidence;
- Owner-Contract-IDs in der Evidence;
- Engine-generierte State-/Score-Events;
- bounded mechanic events für produktspezifische Anforderungen;
- robusterer Visual-Activity-Test statt nur Vergleich mit einer Hintergrundfarbe.

Jeder neue harte Check braucht zuerst eine Green- und Broken-Fixture.

## 9. Product Fidelity vs Experience

Diese beiden Qualitätsarten werden getrennt:

**Product Fidelity** beantwortet:
> Wurde das versprochene Spiel gebaut?

Beispiele:
- Titan tatsächlich vorhanden;
- Salvage tatsächlich sammelbar;
- Upgrade verändert Spielverhalten;
- Risk/Reward ist eine echte Wahl;
- No-Go wurde eingehalten.

**Experience** beantwortet:
> Ist das umgesetzte Spiel lesbar, attraktiv und wahrscheinlich spaßig?

Der bisherige Playtest-Score bleibt ein Experience-Signal. Ein hübsches Spiel kann fehlende Must-Haves nicht kompensieren.

## 10. Budget Control

`GF_BUDGET_USD` soll zu einem echten Control-Plane-Gate werden.

Ziel:

- Preisregister je Modell;
- tatsächliche Tokenkategorien aus Usage berechnen;
- Kosten je Rolle/Attempt persistieren;
- vor dem nächsten Call prüfen, ob dessen erlaubtes Maximum ins Restbudget passt;
- bei Budgetüberschreitung fail closed;
- externes Provider-Projektlimit bleibt zusätzliche Sicherung.

Der aktuelle Fallback auf `usage.cost` allein ist für OpenAI nicht als harte Kostenkontrolle ausreichend.

## 11. Durable Evidence

Pro Run sollen mindestens erhalten bleiben:

```text
brief.json
owner-contract.json
gdd.json
attempt-XX/
  design.json
  evidence-tech.json
  shots/
  telemetry.json
experience-XX.json
audit.json
cost.json
RESULT.json | FAILURE.json
```

Published/Draft-Metadaten bleiben an den SHA des geprüften `index.html` gebunden.

## 12. Learning

Lernen wird als Pipeline behandelt:

```text
Evidence -> Candidate Lesson -> Validation -> Accepted Lesson -> Regression Test
```

Owner-Rejections, wiederholte technische Fehlermuster, Verifier-Fehler und erfolgreiche Reparaturen können Kandidaten erzeugen. Eine einzelne LLM-Aussage darf keine Kernregel autonom überschreiben.

## 13. Repo-Layout

```text
engine/                    Micro-Engine + künftig API Contract/Manifest
factory/src/               Control Plane, Rollen, Provider, Verifier
factory/prompts/           Rollen-Prompts
skills/                    versionierte, validierte Rollen-Lektionen
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

Reihenfolge:

1. echte Kostenkontrolle;
2. Verifier-Determinismus vollständig machen;
3. Owner Contract + Fidelity Gate end-to-end;
4. GPT-5.6 Rollenbenchmark als neuer OpenAI-Baseline;
5. Selftest;
6. genau ein neuer Titan Canary;
7. erst nach Titan-PASS ein zweites Genre;
8. danach Kontext-/Patch-/Learning-Optimierungen und Open-Weight-Vergleich.

Bis diese P0-Punkte grün sind, wird kein weiterer bezahlter Titan-Canary gestartet.
