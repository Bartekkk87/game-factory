# Game Factory — Vollständige Architekturanalyse

**Repository:** `bartekkk87/game-factory`
**Analysestand:** 28.08.2026, Branch `claude/factory-architecture-analysis-ah5hwi`, Basis-Commit `8db5b01`
**Analysemethode:** vollständige Quellcode-Lektüre (alle 76 Nicht-Run-Dateien), nicht Dokumentations-Wiedergabe. Wo Code und `ARCHITECTURE.md` auseinanderlaufen, ist der Code maßgeblich und die Abweichung ist markiert.

---

## 0. Wie dieses Dokument zu lesen ist

Dieses Dokument beschreibt **nicht** eine Spiele-Engine. Es beschreibt ein **Produktionssystem mit drei ineinandergreifenden Maschinen**, das zufällig Web-Spiele als Werkstück benutzt. Das Werkstück ist austauschbar; die Architektur ist es nicht.

Die drei Maschinen:

| Maschine | Aufgabe | Autorität | Kostet Geld |
|---|---|---|---|
| **Deterministischer Kern** | misst, entscheidet, verweigert | **hoch** — trifft alle bindenden Entscheidungen | nein |
| **LLM-Agentenschicht** | erzeugt Vorschläge (Design, Code, Kritik) | **null** — produziert nur Behauptungen | ja |
| **Lernsystem** | wandelt Beweise in Hypothesen | **null bis zur menschlichen Freigabe** | nein |

Der zentrale Satz des gesamten Systems:

> **LLM-Output ist ein Claim, keine Wahrheit. Fortschritt entsteht erst durch Evidence.**

Alles andere in dieser Architektur ist eine Konsequenz aus diesem Satz.

---

## 1. Kurzfassung in einem Bild

```text
                  ┌──────────────────────────────────────────────┐
                  │  MENSCH (Owner)                              │
                  │  Idee  ·  /approve /reject /feedback         │
                  │  Human-Merge für geschützte Layer            │
                  └───────┬──────────────────────────┬───────────┘
                          │ Intent                   │ Freigabe
                          ▼                          │
   ┌──────────────────────────────────────────┐      │
   │ DETERMINISTISCHER KERN (kein LLM)        │      │
   │  Owner Contract (immutable, SHA256)      │      │
   │  Traceability-Compiler (MH→AC→PR)        │      │
   │  Proof-Plan-Compiler                     │      │
   │  Verifier (Playwright, 12 Checks)        │      │
   │  Product Fidelity (Anforderungs-Beweis)  │      │
   │  Budget-Kernel (Reservierung vor Call)   │      │
   │  Release Gate (4 Eingänge, sonst Fehler) │      │
   └───┬───────────────────────▲──────────────┘      │
       │ Auftrag + Contract    │ Messung             │
       ▼                       │                     │
   ┌──────────────────────────────────────────┐      │
   │ LLM-AGENTENSCHICHT (Worker)              │      │
   │  Director → Engineer → Playtester        │      │
   │           → Auditor (advisory)           │      │
   │  Router → Model-Reg → Provider-Reg       │      │
   └──────────────────────────────────────────┘      │
                          │ durable Evidence         │
                          ▼                          │
   ┌──────────────────────────────────────────┐      │
   │ LERNSYSTEM (kein LLM, kein Schreibrecht) │      │
   │  Aggregate → Trigger → Analyse/Root-Cause│      │
   │  → INAKTIVER Candidate → Validation ─────┼──────┘
   │  → Promotion → aktive Lesson → Rollback  │
   └──────────────────────────────────────────┘
```

Der Kreis schließt sich **nur über den Menschen**. Das ist kein Umsetzungsdefizit, sondern die Konstruktionsentscheidung (siehe §7.6).

---

## 2. Repository-Landkarte

```text
game-factory/
├── ARCHITECTURE.md              Architektur-Selbstbeschreibung (v2.5 "Studio OS")
├── README.md                    Betriebsanleitung für den Owner
├── package.json                 Node ≥20, ESM, 2 Deps: playwright, pngjs
│
├── ideas/                       ► INTAKE: menschlicher Input
│   ├── _TEMPLATE.md             Vorlage: Kernidee / Muss-Have / No-Gos
│   └── *.md                     konkrete Aufträge (Owner-Briefs)
│
├── factory/                     ► DAS SYSTEM SELBST
│   ├── prompts/                 Rollen-Systemprompts (Verfassung der Agenten)
│   │   ├── director.md          67 Z. — Design + Beweisplan
│   │   ├── engineer.md          48 Z. — Implementierung + Engine-API
│   │   ├── playtester.md        29 Z. — 2 getrennte Reviews
│   │   └── auditor.md           27 Z. — rein advisory
│   └── src/
│       ├── index.mjs            Einstiegspunkt / CLI
│       ├── config.mjs           alle Limits + Pfade, ENV-überschreibbar
│       ├── contract/            Owner Contract + Traceability-Compiler
│       ├── roles/               die 4 LLM-Rollen
│       ├── llm/                 Router, Registries, Client, Adapter
│       ├── control/             Budget, Release Gate, Evidence, Repair-Policy
│       ├── verify/              Harness, Technical Contract, Fidelity, Probes
│       ├── learning/            Aggregate, Trigger, Root-Cause, Lifecycle
│       ├── memory/              Lesson-Store mit Safety-Gate
│       ├── pipeline/run.mjs     547 Z. — die Orchestrierung (Herzstück)
│       ├── publish/             Assemble, Finalize (SHA-Bindung), Site
│       └── util/                fsx, log, skills, slug
│
├── engine/gf-engine.js          470 Z. — Mikro-Engine (Werkstück-Bibliothek)
├── skills/                      ► LERNBARE DIREKTIVEN (Prompt-Anhänge)
│   ├── directing.md             Regeln für den Director
│   ├── engineering.md           Regeln für den Engineer
│   └── art-direction.md         visuelle Standards
│
├── memory/memory.json           ► NUR validierte+aktive Lessons + Produktregister
│
├── learning/                    ► DAS LERNARCHIV (append-only, git-versioniert)
│   ├── evidence/owner-feedback/ Rohes Owner-Feedback, wortgetreu
│   ├── aggregates/              deterministische Verdichtung
│   ├── triggers/                Trigger-Entscheidungen
│   ├── analysis/                begrenzte Hypothesen
│   ├── root-causes/             Failed-Run-Dossiers
│   ├── candidates/              Lernkandidaten (Default: inaktiv)
│   ├── validations/             Validierungsnachweise
│   ├── promotions/              Aktivierungsnachweise
│   └── orchestration/           Idempotenz-Quittungen
│
├── runs/<timestamp>/            ► PRODUKTIONS-EVIDENZ (27 Läufe)
│   ├── owner-contract.json      der eingefrorene Vertrag
│   ├── brief.json               Roh-Input + Budget
│   ├── gdd.json                 Design + Beweisplan
│   ├── attempt-NN/              pro Versuch: index.html, design.json,
│   │                            evidence-tech.json, evidence-fidelity.json,
│   │                            telemetry.json, shots/
│   ├── evidence-exp-N.json      Playtester-Runden
│   ├── RUN-EVIDENCE.json        kanonische Gesamtquittung
│   ├── FAILURE.json             bei fail-closed
│   └── RESULT.json              bei Erfolg
│
├── drafts/<slug>/               Kandidat wartet auf Owner-Review
├── products/<slug>/             veröffentlicht (aktuell leer)
├── archive/<slug>-<stamp>/      abgelehnt
│
├── examples/fixtures/           Gut-/Schlecht-Fixtures für Verifier-Selbsttest
├── docs/strategy/               22 Entscheidungs-/Statusdokumente
└── .github/workflows/           ► DIE AUSFÜHRUNGSEBENE
    ├── produce.yml              Produktionslauf
    ├── review.yml               Owner-Kommando-Gate
    ├── verify.yml               Vollständiger Regressionsselbsttest
    └── pages.yml                Galerie-Deployment
```

**Strukturprinzip der Ablage:** Verzeichnisse sind nach **Autoritätsstufe** getrennt, nicht nach Technologie. `runs/` ist unveränderliche Messung. `learning/` ist unveränderliche Interpretationskette. `memory/` ist der einzige Ort, der Produktionsverhalten beeinflusst. `drafts/ → products/ | archive/` ist der Produktzustandsautomat.

---

## 3. Das Autoritätsmodell — die eigentliche Architektur

Das gesamte System ist um eine **explizite, geordnete Autoritätskette** gebaut:

```text
Control Plane  >  Owner Contract  >  Engine/API Contract  >  Verified Skill  >  Validated Active Memory Lesson
```

Gelesen: Ein aktiver Lerneintrag darf niemals einen Skill überstimmen, ein Skill niemals den Engine-Vertrag, dieser niemals den Owner-Vertrag, und nichts überstimmt die Control Plane.

Daraus abgeleitet, **im Code durchgesetzt**:

| Regel | Durchsetzung im Code |
|---|---|
| Nur 4 Eingänge dürfen Release entscheiden | `release-gate.mjs` wirft `TypeError` bei jedem zusätzlichen Key |
| Owner Contract ist unveränderlich | `Object.freeze` rekursiv + SHA256 über den Vertragsinhalt |
| Kein Call ohne bekannten Preis | `budget.mjs` blockiert bei `UnknownModelPricingError` **vor** dem Transport |
| Kandidat ist nie automatisch aktiv | `lifecycle.mjs`: `active===true` nur bei `status==='validated'` |
| Nur validierte+aktive Lessons in Prompts | `store.mjs → lessonsFor()` filtert hart |
| Kein stiller Provider-Fallback | `provider-registry.mjs`: falsche Lane wirft, statt umzuschalten |
| Auditor kann nichts entscheiden | `auditor.mjs` löscht `verdict` aus der Antwort |

Das ist der wichtigste übertragbare Gedanke: **Autorität ist ein Datentyp, kein Vorsatz.** Sie wird nicht in Prompts erbeten, sondern in Signaturen erzwungen.

---

## 4. Schichtenmodell L1–L6 mit Datei-Mapping

| Layer | Name | Verantwortung | Dateien |
|---|---|---|---|
| **L6** | Product / Owner | Idee, Review, Approve/Reject/Feedback | `ideas/`, `.github/workflows/review.yml` |
| **L5** | Production Line | Director → Engineer → Repair/Rebuild → Playtester → Polish → Auditor → Draft | `pipeline/run.mjs`, `roles/*` |
| **L4** | Evidence & Quality | Technical Verifier, Product Fidelity, Experience, Budget, Release Gate | `verify/*`, `control/*` |
| **L3** | Improvement Factory | Raw Evidence → Aggregate → Trigger → Analysis → Candidate → Validation → Promotion | `learning/*` |
| **L2** | Model / Provider | Role-Routing, Model-Registry, Provider-Registry, Adapter, Credential Lanes | `llm/*` |
| **L1** | Control Kernel | GitHub Actions, SHA-Bindung, Budgets, Gates, durable Runs | `.github/workflows/*`, `control/*` |

Die Schichten sind **nicht** nur Dokumentationsmetapher: L4 kann L5 verwerfen, L3 kann L5 nicht anfassen, L2 kann nicht selbst entscheiden, welches Modell „besser" ist.

---

# TEIL A — DER DETERMINISTISCHE KERN

Kein LLM. Kein Netzwerk (außer Browserstart). Gleicher Input → gleicher Output.

## 5.1 Owner Contract — Intent-Einfrierung

**Datei:** `factory/src/contract/owner.mjs` (149 Z.)

Das erste, was mit einem menschlichen Auftrag geschieht: er wird **deterministisch zerlegt und eingefroren**.

**Zwei Zerlegungsmodi:**

1. **`explicit-sections`** — der Brief hat `## Muss-Have` / `## No-Gos` Überschriften. Bullets werden direkt übernommen.
2. **`deterministic-freeform-v2`** — Freitext. Jeder Satz wird per Regex klassifiziert, in dieser Prioritätsreihenfolge:

   | Muster | Klasse | Beispiele |
   |---|---|---|
   | Ambiguität | → `unknowns` | maybe, vielleicht, optional, nice to have, ggf. |
   | Verbot | → `noGos` | do not, never, darf nicht, kein/keine, avoid |
   | Kontext | → `unknowns` | inspired by, im Stil von, soll sich anfühlen wie |
   | Verpflichtung | → `mustHaves` | must, shall, muss, soll, has to |
   | Direkter Auftrag | → `mustHaves` | build, create, baue, erstelle |
   | **Rest** | → **`unknowns`** | alles Nicht-Eindeutige |

3. **`system-default`** — leerer Brief → ein generischer Must-Have.

**Die entscheidende Design-Entscheidung:** Der Default-Zweig ist `unknowns`, nicht `mustHaves`. **Uneindeutigkeit wird als Uneindeutigkeit konserviert und nicht wegoptimiert.** Ein System, das rät, verliert Intent still; dieses hier hebt das Nichtwissen sichtbar auf.

**Stabile IDs:** `MH-01`, `MH-02`, `NG-01`, `UN-01` … — jede Anforderung mit `provenance` (Modus + Fragmentindex) und `immutable: true`.

**Zwei Hashes:**
- `ownerBriefSha256` — Hash des **rohen, ungetrimmten** Briefs
- `contractSha256` — Hash der **Zerlegung**

Damit ist nachweisbar: „Dieser Vertrag stammt aus genau diesem Brief" **und** „diese Zerlegung wurde nicht nachträglich verändert".

Der komplette Vertrag wird rekursiv per `Object.freeze` unveränderlich gemacht und als `runs/<id>/owner-contract.json` persistiert.

## 5.2 Traceability-Compiler — von Anforderung zu Beweis

**Datei:** `factory/src/contract/traceability.mjs` (128 Z.)

Der Director liefert Design + Vorschläge für Akzeptanzkriterien und Beweissonden. Der Compiler **normalisiert und erzwingt** daraus eine 1:1:1-Kette:

```text
MH-01  ──►  AC-MH-01  ──►  PR-MH-01
Anforderung  Akzeptanz    Beweissonde
(Owner)      (Director)   (Verifier-lesbar)
```

Erzwungene Invarianten (jede Verletzung → `throw`, **vor** jedem Engineer-Call):

- **Genau eine** Akzeptanz und **genau eine** Sonde pro Anforderung — nicht null, nicht zwei
- IDs sind **abgeleitet, nicht LLM-gewählt**: `AC-${id}` / `PR-${id}`
- Sonden dürfen keine unbekannte Anforderung referenzieren
- Nur 7 zugelassene Beweisarten (`event`, `event_value_change`, `score_change`, `state_reached`, `event_absent`, `started_by_early`, `layout_no_overlap`)

**Anti-Selbstbestätigungs-Umschreibungen** — der Kern der Beweishärtung:

| Was der Director vorschlägt | Wozu der Compiler es zwingt | Warum |
|---|---|---|
| `event: "hud_layout_clear"` | `layout_no_overlap` | Das Spiel darf seine eigene HUD-Qualität nicht bezeugen — der Harness misst Canvas-Geometrie |
| `event_absent: "hud_overlap_detected"` | `layout_no_overlap` | dito |
| `event: "fresh_run_started"` | `restart_after_terminal` | Neustart wird vom Harness beobachtet, nicht behauptet |
| `event` auf einem positiven `MH-xx` | `strength = 'correlated_gameplay'` | Ein Event-Name allein beweist keine Mechanik |

Das ist die schärfste Idee im ganzen System: **Der Erzeuger darf das Beweismittel nicht definieren.** Wo er es versucht, wird sein Vorschlag automatisch in eine unabhängig messbare Form übersetzt.

## 5.3 Proof-Plan-Compiler — Erreichbarkeit vor Ausgabe

**Datei:** `factory/src/verify/proof-plan.mjs` (165 Z.)

Bevor **ein Cent** für den Engineer ausgegeben wird, wird geprüft: *Kann dieser Beweisplan überhaupt eingelöst werden?*

Der Compiler leitet aus den Sonden Beobachtungsszenarien ab:

| Szenario | Eingabemodus | Zweck |
|---|---|---|
| `base` | aktiv + Idle-Kontrolle | Technik, Kausalität, HUD-Geometrie |
| `success-proof` | aktiv, stoppt bei `success` | echter Gewinn, danach Neustartversuch |
| `failure-proof` | **idle**, stoppt bei `failure` | echtes Scheitern — unabhängig vom Erfolgspfad |

Dann validiert er:
- jeder Sonde ist **mindestens ein erreichbares Szenario** zugeordnet (`coverage`)
- verlangte Endzustände haben ein eigenes Szenario, das genau darauf stoppt
- Erfolg und Misserfolg dürfen **nicht dasselbe Szenario** benutzen (sonst wäre eines der beiden nur behauptet)
- `restart_after_terminal` verlangt `restartAtEnd: true` an mindestens einem Terminalszenario

Schlägt die Validierung fehl → `runDirector` wirft → Lauf endet fail-closed. **Ein unbeweisbarer Plan wird nie gebaut.**

## 5.4 Der Verifier-Harness — Messung statt Meinung

**Datei:** `factory/src/verify/harness.mjs` (375 Z.)

Playwright/Chromium, headless, 1280×720. Der Härtungsgrad steckt in vier Details:

**a) Determinismus durch RNG-Kaperung.** Vor jedem Skript des Kandidaten wird `Math.random` durch einen xorshift-PRNG mit festem Seed (`0x47facade`) ersetzt und `window.__GF_VERIFIER_SEED__` schreibgeschützt gesetzt. Zwei Läufe desselben Kandidaten sind identisch. Kein Beweis darf auf Glück beruhen.

**b) Feste Eingabesequenz.** Kein „irgendwie klicken": ein deterministischer Plan aus 10 Tasten (Pfeile, WASD, Space, Enter) alle 190 ms mit 110 ms Haltezeit, 6 Zeigerpositionen alle 450 ms, Klicks alle 1300 ms. Diese Sequenz wird als `inputSequence` in die Evidenz geschrieben — der Beweis ist **reproduzierbar dokumentiert**, nicht nur behauptet.

**c) Die Idle-Kontrollgruppe — das methodisch stärkste Element.**
Jeder Kandidat wird **zweimal** ausgeführt:
- **aktiv** — volle Eingabesequenz
- **idle** — *gleicher Seed*, *gleicher Startimpuls*, **danach keine Eingaben**

Beide bekommen exakt denselben Startimpuls (Enter + ein Klick), damit die Kontrolle misst, ob **Gameplay** auf Eingaben reagiert — nicht, ob überhaupt der Titelbildschirm verlassen wurde. Der Check `input_causality` besteht nur, wenn der aktive Lauf **messbar über** dem Idle-Lauf liegt (Score-Zuwachs, Event-Zuwachs oder anderer Endzustand) **und** die Kontrolle selbst sauber war.

Das ist eine echte Kontrollgruppe im experimentellen Sinn. Es unterscheidet „das Spiel läuft ab" von „das Spiel ist spielbar".

**d) Vier Zeitpunkte.** `start → early → mid → end` als persistierte Snapshots (Zustand, Score, Best, FPS, Zeit, Flags, Fehler, Events, Canvas-Layout). Ein Beweis muss über die Zeitachse kohärent sein, nicht in einem Einzelmoment.

**e) Terminalsichere Eingabe.** Vor jeder injizierten Eingabe prüft der Harness, ob das Spiel bereits in einem Terminalzustand ist — sonst würde die Sequenz versehentlich neu starten und die Terminalmessung zerstören.

## 5.5 Der technische Vertrag — 12 Checks

**Datei:** `factory/src/verify/contract.mjs` (221 Z.)

| # | Check | Was bewiesen wird |
|---|---|---|
| 1 | `probe_present` | Test-Hook `__GF__` existiert |
| 2 | `deterministic_seed` | Seed ist gesetzt und ganzzahlig |
| 3 | `telemetry_timeline` | start/early/mid/end vollständig |
| 4 | `idle_baseline` | Kontrollgruppe mit gleichem Seed vorhanden |
| 5 | `no_runtime_errors` | keine Page-/Console-/Probe-Fehler |
| 6 | `assets_ok` | keine fehlgeschlagenen Requests |
| 7 | `started_playing` | Titelbildschirm wurde verlassen |
| 8 | `interactivity` | Fortschritt in der Telemetrie nachweisbar |
| 9 | `input_causality` | Fortschritt ist **gegenüber Idle** auf Eingaben zurückführbar |
| 10 | `fps_ok` | ≥ 30 FPS (konfigurierbar) |
| 11 | `visual_content` | Screenshots sind nicht schwarz (Pixelanalyse gegen Hintergrundfarbe) |
| 12 | `visual_activity` | Inter-Frame-Delta ≥ 0.2 % geänderte Pixel — das Bild **bewegt sich** |

Checks 11 und 12 dekodieren PNGs pixelweise (`pngjs`). Ein Standbild mit korrekter Telemetrie besteht Check 12 nicht. Der Verifier misst also drei unabhängige Realitätsebenen: **Zustandsmaschine** (Telemetrie), **Kausalität** (Kontrollgruppe), **Erscheinung** (Pixel).

**Alle 12 müssen bestehen.** Kein Teilbestehen, keine Gewichtung.

## 5.6 Product Fidelity — hat der Owner bekommen, was er bestellt hat?

**Datei:** `factory/src/verify/fidelity.mjs` (272 Z.)

Der technische Vertrag prüft „läuft es". Product Fidelity prüft „**ist es das Bestellte**". Für jede `MH-xx`/`NG-xx` wird deren Sonde ausgewertet.

**Beweisquellen und ihre Vertrauensstufe** (`evidenceSource` im Ergebnis):

| Quelle | Bedeutung | Vertrauen |
|---|---|---|
| `harness-observed-canvas-geometry` | Playwright misst echte Canvas-Zeichenbefehle | **höchstes** |
| `harness-observed-terminal-restart` | Harness beobachtet Terminalzustand + Neustart | **höchstes** |
| `harness-observed` | Score/Zustand aus der Telemetrie | hoch |
| `generated-game-event+runtime-correlation` | Event **plus** unabhängige Zeit-/Score-Korrelation | mittel |
| `generated-game-event-dependent` | reines Event vom erzeugten Code | **niedrig** |

Der `correlated_gameplay`-Test (für positive Must-Haves) verlangt kumulativ:
1. Event **nicht** in `title`/`boot`
2. Event-Zeit **≥** dem frühen Beweiszeitpunkt
3. Score zum Eventzeitpunkt **echt größer** als der Startscore

Damit kann ein Init-Event mit passendem Namen eine Mechanik nicht mehr vortäuschen.

**Die HUD-Geometrie-Sonde** (`layout-probe.mjs`, 311 Z.) ist eigenständig bemerkenswert: sie instrumentiert `CanvasRenderingContext2D.prototype` (`fillText`, `strokeText`, `fillRect`, `roundRect`, `fill`, `stroke`, `measureText`), transformiert die Zeichenbereiche über die aktive Matrix und leitet daraus reale Bildschirmregionen ab. Sie prüft: ≥ 3 unterscheidbare HUD-Regionen, keine Überlappung, keine Bereiche außerhalb des Canvas — **und** Score-Fortschritt, damit ein statischer Titelbildschirm kein Gameplay-HUD beweisen kann. Der Kandidat wird also auf einer Ebene vermessen, die er selbst nicht kennt.

**Ehrlicher Geltungsbereich:** Das `coverage`-Objekt schreibt explizit ins Ergebnis, was **nicht** geprüft wurde — beschreibender Brieftext außerhalb strukturierter MH/NG wird nicht bewertet. Das System dokumentiert seine eigenen blinden Flecken maschinenlesbar.

## 5.7 Zustandssemantik — kontrolliertes Vokabular

**Datei:** `factory/src/verify/state-semantics.mjs` (36 Z.)

Eine kleine, aber strukturell wichtige Datei: eine **explizite Alias-Tabelle** für Spielzustände.

```text
boot → boot | title → title | playing → playing
success, won        → success
failure, failed, gameover → failure
```

Unbekannte Zustände liefern `null` → fail closed. Zwei kanonische Terminalfamilien: `success`, `failure`.

Der entscheidende Punkt: **Das Lernsystem importiert diese Datei bewusst nicht.** `learning/root-cause.mjs` definiert eigene diagnostische Terminalfamilien mit dem Kommentar:

> *„Intentionally independent from verify/state-semantics.mjs. The diagnostic layer must be able to falsify a broken verifier vocabulary rather than inheriting it."*

Der Diagnostiker darf den Verifier widerlegen. Würde er dessen Vokabular importieren, könnte er einen Vokabularfehler des Verifiers nie entdecken. **Bewusst in Kauf genommene Redundanz zum Zweck der Falsifizierbarkeit** — eines der übertragbarsten Muster des Repositories.

## 5.8 Budget-Kernel — Kosten als Gate, nicht als Statistik

**Datei:** `factory/src/control/budget.mjs` (167 Z.)

Kein nachträglicher Kostenbericht, sondern eine **Vorab-Reservierungsmaschine**:

```text
openLogicalCall()  → Preis bekannt? Stufenlimit frei?   sonst BLOCK
reserveAttempt()   → maximale Kosten reservieren
                     passt (spent+reserved+reserve) ins Budget? sonst BLOCK
      ↓ HTTP-Request
settleAttempt()    → Reservierung freigeben, echte Kosten buchen
```

Härtungen:

| Situation | Verhalten |
|---|---|
| Preis des Modells unbekannt | **Block vor dem Transport** — kein Call ins Blaue |
| Usage fehlt in der Antwort | konservative Reservierung wird gebucht, `accountingComplete=false`, **alle weiteren bezahlten Calls blockiert** |
| Transport unsicher (Timeout/Abbruch) | `settleUncertainAttempt` → Reservierung gebucht, Verstoß protokolliert, Lauf verliert Budget-PASS |
| Anbieter meldet eigene Kosten | Anbieterwert hat Vorrang vor der Registry-Rechnung |
| Long-Context-Tarif | Multiplikatoren aus der Model-Registry (z. B. ×2 Input, ×1.5 Output über 272k Tokens) |

**Getrennte Stufenbudgets** mit eigenen Call- und USD-Obergrenzen: `repair`, `polish`, `freshRebuild`. Eine Reparaturschleife kann das Gesamtbudget nicht auffressen.

Der Leitsatz: **Fehlende oder unsichere Kosteninformation wird nie als `$0` behandelt.** Unwissen ist teuer, nicht gratis.

## 5.9 Release Gate — vier Eingänge, sonst Fehler

**Datei:** `factory/src/control/release-gate.mjs` (65 Z.)

```javascript
const RELEASE_INPUT_KEYS = new Set(['technical','productFidelity','experienceScore','budget','minExperience']);
const unexpected = Object.keys(input).filter(k => !RELEASE_INPUT_KEYS.has(k));
if (unexpected.length) throw new TypeError(`Release gate received non-authoritative input: ...`);
```

Die Regel:

```text
Technical PASS + Product Fidelity PASS + Experience ≥ Schwelle + Budget PASS
```

Alles andere — Auditor-Urteil, Playtester-Fidelity-Meinung, „sieht gut aus" — kann das Gate **nicht einmal erreichen**: der Aufruf wirft. Die Nicht-Autorität advisorischer Signale ist als Typprüfung implementiert, nicht als Konvention.

## 5.10 Repair-Policy — Fortschritt muss bewiesen werden

**Datei:** `factory/src/control/repair-policy.mjs` (82 Z.)

Ohne diese Datei würde eine Reparaturschleife den jeweils **letzten** Versuch als Basis nehmen — und damit Rückschritte fortschreiben. Stattdessen:

- **Regression** = mehr fehlgeschlagene Checks **oder** ein neuer Laufzeitfehler
- **Verbesserung** = weniger Checks **oder** gleich viele Checks bei weniger Laufzeitfehlern
- Nur eine Verbesserung wird neue „Best-So-Far"-Reparaturbasis
- Bei Regression bleibt der beste Versuch die Basis für die nächste Reparatur

Zusätzlich in `pipeline/run.mjs`: Wenn die **Fehlersignatur** oder der **Kandidaten-SHA** identisch zum Vorgänger bleibt, wird auf **Fresh Rebuild** eskaliert — die Architektur wird verworfen statt weiter repariert. Nach erschöpftem Debug-Budget wird bewusst der *beste* Versuch als Fehlerevidenz behalten, nicht der letzte.

## 5.11 Run-Evidence — die kanonische Quittung

**Datei:** `factory/src/control/evidence.mjs` (70 Z.)

Jeder Lauf endet — erfolgreich oder nicht — mit `RUN-EVIDENCE.json`, Schema `game-factory.run-evidence/v1`, **schemavalidiert beim Schreiben**:

```json
{ "schema": "...", "run": { "id","status","reason","source","candidateSha" },
  "gates": { "technical","productFidelity","experience","budget","release" },
  "costs": { "…cost-ledger/v1, vollständiges Ledger…" },
  "counters": { "attempts","repairCalls","polishRounds","freshRebuilds" },
  "audit": { "advisory": true, … }, "artifacts": { … } }
```

Bemerkenswert: Die Gate-Werte werden **aus dem Release-Gate-Ergebnis übernommen**, nicht separat gesetzt. Es kann keine Evidenz geben, deren Gates dem Gate widersprechen. Der Auditor-Block trägt hart kodiert `advisory: true`.

Diese Datei ist der einzige Eingang ins Lernsystem — Produktions- und Lernwelt sind über **ein versioniertes Schema** gekoppelt, nicht über geteilten Zustand.

## 5.12 Publish — SHA-Bindung als Schutz vor Nachbearbeitung

**Datei:** `factory/src/publish/finalize.mjs` (60 Z.)

Bei `/approve` oder `/reject`:

1. Slug muss `^[a-z0-9-]+$` erfüllen
2. Draft muss `status === 'awaiting-review'` sein
3. **`sha256(index.html)` muss `meta.candidateSha` entsprechen** → sonst `throw`

Damit ist ausgeschlossen, dass zwischen Verifikation und Veröffentlichung eine andere Datei untergeschoben wird. Der Verifier hat *genau dieses Byte-Artefakt* geprüft, und nur genau dieses wird publiziert. Der Verifier-Selbsttest enthält dafür eine eigene Manipulations-Fixture.

`approve` → `products/<slug>/`. `reject` → `archive/<slug>-<stamp>/` **plus** der ausdrückliche Kommentar im Code: *Ablehnung ist Produktzustand, niemals direkte Lernautorität.*

---

# TEIL B — DIE LLM-AGENTENSCHICHT

## 6.1 Die vier Rollen und ihre Grenzen

| Rolle | Input | Output | Autorität | Kann Release beeinflussen? |
|---|---|---|---|---|
| **Director** | Owner Contract, aktive Director-Lessons, bekannte Konzepte | GDD + Akzeptanz + Sondenplan | Design | **nein** (Compiler normalisiert alles) |
| **Engineer** | Contract, GDD, Traceability, Engine-Quelltext | `{title, css, html, js}` | Implementierung | **nein** (Verifier misst) |
| **Playtester** | Screenshots, Telemetrie, Events, Contract, **det. Fidelity-Ergebnis** | 2 getrennte Reviews + Scores | Experience-Score fließt ins Gate | **teilweise** — nur der Zahlenwert |
| **Auditor** | Digest des gesamten Laufs | Konsistenzbewertung | **keine** | **nein** (`verdict` wird gelöscht) |

**Vier Engineer-Operationen**, getrennt geroutet und getrennt budgetiert:

| Operation | Auslöser | Temperatur | Stufenbudget |
|---|---|---|---|
| `build` | erster Versuch | 0.3 | — |
| `repair` | Verifikation fehlgeschlagen | 0.3 | 6 Calls / $4 |
| `rebuild` | Reparatur stagniert | 0.6 | 1 Call / $4 |
| `polish` | Experience unter Schwelle | 0.3 | 3 Runden / $3 |

## 6.2 Prompt-Assembly — wo Lernen den Agenten erreicht

**Datei:** `factory/src/util/skills.mjs` (32 Z.)

```text
Systemprompt = factory/prompts/<rolle>.md          ← Verfassung (Mensch/Repo)
             + skills/<name>.md                     ← Skill-Direktiven (Mensch/Repo)
             + "## Lessons from past post-mortems"  ← nur validated && active
               ← lessonsFor(role), maximal 12
```

Das ist die **einzige** Stelle, an der Gelerntes Produktionsverhalten berührt. Sie ist bewusst schmal, additiv und begrenzt. Und sie ist der Grund, warum das Lern-Safety-Gate (§7.2) genau dort greifen muss.

Zwei weitere Sicherungen im Rollen-Code:

- **Der Engineer bekommt den echten Engine-Quelltext**, nicht dessen Beschreibung. Sein Prompt verbietet ausdrücklich, Engine-Methoden zu erfinden. Halluzinationsrisiko wird durch Bereitstellung der Grundwahrheit gesenkt statt durch Ermahnung.
- **Der Playtester bekommt das deterministische Fidelity-Ergebnis als „machine authority; do not override"** und liefert *zwei getrennte* Urteile: eine unabhängige Fidelity-Meinung (advisory) und eine Experience-Wertung (zählt). Sein `validate()` erzwingt strukturelle Konsistenz: `PASS` mit gelisteten fehlenden Anforderungen wirft; `FAIL` ohne IDs wirft; eine unbekannte Anforderungs-ID wirft.

## 6.3 Der Modell-/Provider-Stack

```text
resolveRoleRoute(role, operation, requirements)
   ├─ ENV-Auflösung: GF_LLM_PROVIDER_<ROLE>_<OP> > _<ROLE> > global > Rollendefault
   ├─ runtimeProvider(provider, credentialLane)   → provider-registry.mjs
   ├─ getModelRecord(provider, model)             → model-registry.mjs
   ├─ requireCapability(text, chatCompletions, [vision|json|structured|reasoning])
   └─ maxOutputTokens-Prüfung
        ↓
   buildOpenAiCompatibleChatRequest()             → adapters/openai-compatible-chat.mjs
        ↓
   chat()                                          → client.mjs (Budget + Retry + Logging)
```

**Model-Registry** (`model-registry.mjs`): 11 eingebaute Modelle, jedes mit eingefrorenen Capabilities, Preisen **mit Quellenangabe** (`source: 'openai-official-2026-08-27'`), `aliasKind` (rolling-alias / stable-id / legacy-alias) und `benchmarkStatus` (reference-candidate / economy-candidate / challenger / legacy). `productionDefault` ist bei **allen** auf `false` — ein Modell wird nicht durch Registrierung zum Standard.

**Produktions-Defaults:**

| Rolle | Modell |
|---|---|
| Director | `openai:gpt-5.6-terra` |
| Engineer (alle Operationen) | `openai:gpt-5.6-terra` |
| Playtester | `openai:gpt-5.6-terra` |
| Auditor | `openai:gpt-5.6-luna` (günstiger — advisorische Rolle) |
| Release PASS/FAIL | **deterministisch, kein LLM** |

**Credential Lanes** (`provider-registry.mjs`) — Vertrauenszonen als eigenes Konzept:

```text
OPENAI_PRODUCTION
OPENROUTER_PRODUCTION | OPENROUTER_BENCHMARK | OPENROUTER_IMPROVEMENT
```

Eine falsche Lane führt **nicht** zu einem Fallback auf Production-Credentials, sondern zu `UnknownProviderError`. Für generische Provider gilt zusätzlich: der generische Schlüssel `GF_LLM_API_KEY` wird nur akzeptiert, wenn `GF_LLM_PROVIDER` exakt diesen Provider benennt.

**Fail-closed-Punkte im Routing:** unbekannter Provider · unbekanntes Modell · fehlende Capability · zu hohe maxOutputTokens · unbekannter Preis · fehlender Schlüssel · unbekannte Lane. Jeder wirft **vor** dem Netzwerkzugriff.

**Kein automatischer Cross-Provider-Fallback.** Ein Ausfall ist ein Ausfall, keine stille Modellsubstitution. Ausdrücklicher Nicht-Zielsetzung: „kein automatischer Best-Model-Router".

## 6.4 Ausgabe-Härtung

- `extractJson` (`llm/json.mjs`): Fenced-Block → Rohtext → Reparatur nachgestellter Kommas. Nur wohlgeformtes JSON darf weiter.
- `validateDesign` (`roles/engineer.mjs`): mindestens 200 Zeichen JS · **muss** `new GF.Game` enthalten · kein literales `</script` · **keine externen URLs** in js/css/html · `hitStop` darf nicht überschrieben werden.
- Retry: 6 Transportversuche mit Backoff, aber **fatale Fehler und Budgetfehler werden nie wiederholt**.

---

# TEIL C — DAS LERNSYSTEM

## 7.1 Die Grundtrennung

> **Production Factory und Improvement Factory sind getrennt. Kein ungeprüfter Candidate darf Production beeinflussen.**

Das Lernsystem ruft `chat()` **nie** auf. Es ist reine deterministische JavaScript-Analyse über JSON-Evidenz. Es kostet keine Tokens; es kostet nur Runner-Zeit.

## 7.2 Das Safety-Gate

**Datei:** `factory/src/memory/store.mjs` (73 Z.)

```javascript
export function lessonsFor(role, limit = 12) {
  return loadMemory().lessons
    .filter(l => l.role === role && l.status === 'validated' && l.active === true)
    .slice(-limit).map(l => `- ${l.text}`);
}
```

**Ein einziger Filter** entscheidet, was Produktionsverhalten beeinflusst. Alles davor ist Archiv.

Zusätzlich normalisiert `normalizeLesson()` jede Alt-Lesson ohne explizite `status`/`active`-Felder **fail-closed** zu `{status:'legacy-unvalidated', active:false}`. Historische Daten werden nicht rückwirkend zu Autorität.

`recordLesson()` ist direkt aufrufbar, kann aber niemals aktivieren — `active` wird hart aus `status==='validated' && metadata.active===true` abgeleitet. Der Codekommentar sagt es explizit: Promotion über `lifecycle.mjs` ist der einzige unterstützte Weg.

## 7.3 Die Lernkette

```text
   ROHEVIDENZ                            Was passiert                     Autorität
   ──────────────────────────────────────────────────────────────────────────────────
1  runs/*/RUN-EVIDENCE.json          Produktionsmessung                   Fakt
   runs/*/attempt-*/evidence-*.json  Versuchsdetails                      Fakt
   learning/evidence/owner-feedback/ Owner-Wortlaut, unverändert          Fakt
        ↓
2  learning/aggregates/              deterministische Verdichtung         Fakt
        ↓
3  learning/triggers/                Darf analysiert werden?              nur Analyse-Erlaubnis
        ↓
4  learning/root-causes/             Failed-Run-Dossier (nur bei failed)  Diagnose
   learning/analysis/               begrenzte Hypothese                  Behauptung
        ↓
5  learning/candidates/              status=candidate, active=FALSE       keine
        ↓  ← Validierungsnachweis + bestandene Regression erforderlich
6  learning/validations/             status=validated, active=FALSE       keine
        ↓  ← MENSCHLICHER MERGE bei geschützten Layern
7  learning/promotions/              status=validated, active=TRUE        Prompt-Injektion
        ↓
8  memory/memory.json                aktive Lesson im Systemprompt        wirksam
        ↓  ← jederzeit
9  deactivateCandidate()             active=FALSE, Grund protokolliert    zurückgenommen
```

### Stufe 1 — Rohevidenz

`learning/owner-feedback.mjs` bewahrt Owner-Kommentare **wortgetreu**: `rawText` unverändert, daneben getrennt `parsedCommand` und `parsedReason`. Kanonischer Pfad: `learning/evidence/owner-feedback/gh-issue-<n>-comment-<id>.json`. Die Issue-/Comment-ID ist die unveränderliche Identität; ein Wiederaufruf mit abweichendem Text löst eine **Identitätskollision** aus statt still zu überschreiben.

**Rohdaten und Interpretation sind physisch getrennte Felder.** Wer später die Interpretation anzweifelt, kann auf den Wortlaut zurückgehen.

### Stufe 2 — Aggregation

`aggregate.mjs` (190 Z.) verdichtet **alle** durablen Läufe: Fehlersignaturen (mit Zugehörigkeit zu Läufen, um Wiederholung über *unabhängige* Läufe zu erkennen), Technical-/Fidelity-Fehler getrennt nach final vs. Versuchsebene, Repair-/Rebuild-/Polish-Zähler, Experience-Werte, Owner-Verdikte, Kosten nach Rolle/Modell/Operation.

Determinismus wird aktiv hergestellt: alle Eingaben werden vor der Verarbeitung sortiert, alle Ausgabeobjekte alphabetisch geordnet, Zeitstempel bleiben außerhalb der Aggregatsemantik. Gleiche Eingabe → byteidentische Ausgabe.

### Stufe 3 — Trigger

`trigger.mjs`, Policy `controlled-improvement-trigger-v2`. Drei Regeln:

| Auslöser | Erlaubter Scope |
|---|---|
| Owner-`/reject` oder `/feedback` | `product-feedback` |
| fehlgeschlagener Produktionslauf | `case-root-cause` |
| **gleiche Fehlersignatur in ≥ 2 unabhängigen Läufen** | `engineering` |

Die Schwelle ist bewusst: ein einzelner Fehlschlag ist ein Ereignis; **erst Wiederholung über unabhängige Läufe ist ein Muster**. Bei `engineering` wird geprüft, dass `count ≥ 2` **und** `runCount ≥ 2` — dieselbe Signatur zweimal im selben Lauf zählt nicht.

Der Trigger gibt hart zurück: `authority: 'analysis-only'`, `canValidate: false`, `canActivate: false`.

> **Doku-Abweichung:** `ARCHITECTURE.md` §7 nennt `controlled-improvement-trigger-v1` mit zwei Regeln. Der Code führt v2 mit der zusätzlichen `case-root-cause`-Regel. Der Code ist neuer.

### Stufe 4 — Root-Cause-Diagnose

`root-cause.mjs` (277 Z.), das anspruchsvollste Modul des Lernsystems. Es liest ausschließlich durable Lauf-/Versuchsevidenz und prüft fünf begrenzte Fehlerklassen:

| Befund | Konfidenz | Ziel-Layer |
|---|---|---|
| `repair-regression-after-best-attempt` | 1.0 | control-plane |
| `new-runtime-error-after-repair` | 1.0 | control-plane |
| `terminal-proof-scenario-gap` | 1.0 | verifier |
| `terminal-state-vocabulary-mismatch` | 0.95 | verifier |
| `terminal-action-reachability-unresolved` | 0.7 | verifier |

Jeder Befund trägt **Evidenzreferenzen und einen Validierungsplan** — nicht „das ist der Fehler", sondern „das ist die Hypothese und **so** würde man sie falsifizieren".

Autoritätsblock, im Ausgabedokument mitgeschrieben:

```json
"authority": {
  "may":   ["diagnose-evidence","rank-hypotheses","propose-validation"],
  "mustNot":["edit-production","validate-candidate","activate-candidate",
             "weaken-gates","start-paid-run"]
}
```

Ohne Befund über der Schwelle: *„No bounded root-cause hypothesis crossed the deterministic evidence threshold"* — **kein erzwungenes Ergebnis**. Das System darf ergebnislos bleiben.

### Stufe 5 — Analyse und Kandidat

`analysis.mjs` (13 Z.) ist absichtlich winzig — sie ist ein Torwächter:

```javascript
if (!trigger?.allowed)                              throw ...
if (!trigger.allowedScopes?.includes(proposal.scope)) throw ...
if (proposal.active === true || proposal.status === 'validated') throw ...
return createCandidate({ ...proposal, status: 'candidate', active: false });
```

Der Kandidatentext ist immer als **Hypothese** formuliert, nie als Befund. Beispiel aus dem Orchestrator:

> *„Hypothesis only: Owner feedback … may indicate an intake or Owner Contract decomposition gap. Validate … before changing Production. Do not infer or invent missing requirements from this feedback alone."*

### Stufe 6/7 — Validierung und Promotion

`lifecycle.mjs` (55 Z.):

- **Validierung** verlangt eine nichtleere `validationEvidence` **und** `regressionResults`, bei denen **jeder** Eintrag `passed === true` ist. Ein Modell, das etwas „validiert" nennt, genügt nicht.
- Ergebnis: `status='validated'`, **`active=false`**. Validiert ≠ aktiv.
- **Promotion** verlangt `approvedBy` + `promotionRef`; geschützte Layer zusätzlich `approvalKind === 'human-merge'`.
- Geschützte Layer: `skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`.
- Aktivierung ist **versioniert und reversibel**; `deactivateCandidate` aktualisiert Kandidat **und** Memory-Repräsentation.

### Stufe 8 — Orchestrierung

`orchestrate.mjs` (330 Z.) verbindet die Kette und wird an **zwei** Stellen aufgerufen:

1. `index.mjs` nach jedem Produktionslauf → `eventKind: 'production-run'`
2. `review.yml` nach jedem Owner-Kommando → `eventKind: 'owner-feedback'`

Idempotenz über eine SHA-abgeleitete Quittung pro Ereignis. Existiert die Quittung, wird nicht erneut analysiert — und **beim Wiedereinlesen wird geprüft, ob der referenzierte Kandidat noch inaktiv ist**; ist er es nicht, wirft der Orchestrator. Ein aktiv gewordener Kandidat kann sich nicht hinter einer alten Quittung verstecken.

Ohne durable Herkunft wird bewusst **kein** Kandidat erzeugt: fehlt einem Owner-Feedback der Rückbezug auf einen Lauf, endet die Analyse mit `blocked: 'owner feedback has no durable source-run provenance'`.

## 7.4 Der zweite Regelkreis — Owner Review

`.github/workflows/review.yml`:

```text
Issue-Kommentar
  → nur wenn Autor == repository_owner
  → nur /approve | /reject | /feedback
  → Slug aus [slug:...]-Marker im Issue-Body
  → 1. Owner-Evidenz wortgetreu erfassen      ← IMMER, vor allem anderen
  → 2. Controlled-Learning-Orchestrierung
  → 3. Produktverdikt (nur approve/reject; /feedback ändert Produktzustand NICHT)
  → 4. Alles committen und pushen
  → 5. Issue kommentieren + schließen
```

Die Reihenfolge ist bedeutungstragend: **Evidenz wird gesichert, bevor irgendetwas interpretiert oder entschieden wird.** `/feedback` existiert als dritter Weg — Signal geben, ohne eine Produktentscheidung zu erzwingen.

## 7.5 Realer Zustand des Lernsystems

| Artefakt | Anzahl | Status |
|---|---|---|
| Kandidaten | 8 | **alle inaktiv** |
| Validierungen | 6 | validiert, inaktiv |
| Promotionen | **0** | — |
| Aktive Lessons in `memory.json` | **0** | `lessons: []` |
| Produktionsläufe (Zähler) | 34 | 25 failed, 1 rejected, 0 published |

Das Sicherheitsdesign ist also nicht theoretisch: **das System hat sich bisher tatsächlich nichts selbst beigebracht.**

## 7.6 Struktureller Befund: der Kreis ist per Konstruktion offen

Aus dem Code direkt ableitbar, in `ARCHITECTURE.md` nicht als solches benannt:

```javascript
export const LESSON_PROMOTION_TARGET_LAYER = 'prompt';
// promoteCandidate:
if (c.targetLayer !== LESSON_PROMOTION_TARGET_LAYER) throw ...
if (PROTECTED_LAYERS.has(c.targetLayer) && approvalKind !== 'human-merge') throw ...
```

Da `'prompt'` selbst in `PROTECTED_LAYERS` liegt, ist **jede** Lesson-Promotion zwingend `human-merge`.

Und: **kein automatisch erzeugter Kandidat zielt jemals auf `prompt`.** Der Orchestrator vergibt `owner-contract` (Produkt-Feedback), `skill` (Engineering) oder `control-plane`/`verifier` (Root-Cause). Folge:

> **Automatisch erzeugte Kandidaten können mit dem aktuellen Code nicht zu aktiven Lessons werden — auch nicht nach Validierung.** Sie sind ausschließlich Eingabe für menschliche Code- und Prompt-Änderungen.

Das ist konsistent mit den Prinzipien, aber es bedeutet: Der Lernkreis schließt sich **nicht über eine Datenpipeline, sondern über einen Menschen, der Code ändert**. Die Pipeline ist ein hochstrukturierter Vorschlagsapparat für menschliche Arbeit, kein Selbstlerner. Der `docs/strategy`-Ordner mit 22 Entscheidungsdokumenten ist der sichtbare Beleg dafür: **dort** schließt sich der Kreis.

---

## 8. End-to-End-Ablauf

```text
 1  ideas/*.md oder Workflow-Input
 2  createOwnerContract()        → MH/NG/UN mit stabilen IDs, eingefroren, SHA256
 3  beginRunBudget()             → Gesamt- und Stufenbudgets scharf
 4  runDirector()      [LLM $]   → GDD
    compileDirectorTraceability()→ 1:1:1 MH→AC→PR erzwungen, IDs normalisiert
    compileProofPlan()           → Szenarien; unerreichbar ⇒ ABBRUCH vor Engineer
 5  ┌── buildGame()    [LLM $]   → {title, css, html, js}
    │   assemble()               → Engine + Probe-Extension + Kandidat = 1 HTML
    │   runSession()             → AKTIV + IDLE + Proof-Szenarien (Playwright)
    │   evaluateContract()       → 12 technische Checks
    │   evaluateProductFidelity()→ jede MH/NG gegen ihre Sonde
    │   bestanden? → weiter
    │   sonst: retainBestFailed() → beste Basis behalten
    │          Stagnation? → rebuildGame() [LLM $]
    │          sonst      → repairGame()  [LLM $]
    └── max. maxDebugRounds+1 Versuche, sonst FAIL-CLOSED 'debug_exhausted'
 6  ┌── runPlaytester() [LLM $]  → Fidelity-Meinung (advisory) + Experience-Score
    │   Score ≥ Schwelle? → weiter
    │   sonst: polishGame() [LLM $] → erneut verifizieren
    │          regressiert? → verifizierte Baseline WIEDERHERSTELLEN, Notiz führen
    └── max. maxPolishRounds
 7  runAuditor()       [LLM $]   → Konsistenzurteil, ADVISORY, Ausfall unkritisch
 8  evaluateReleaseGate()        → 4 Eingänge; alles andere wirft
 9  drafts/<slug>/ + meta.json + REVIEW.md ; RUN-EVIDENCE.json ; RESULT.json
10  orchestrateControlledLearning('production-run', runId)   ← IMMER
11  GitHub Actions: commit + push + Artefakte + Review-Issue
12  Owner: /approve | /reject | /feedback
      → Owner-Evidenz wortgetreu
      → orchestrateControlledLearning('owner-feedback', id)
      → finalize.mjs mit SHA-Prüfung → products/ | archive/
```

**Jeder Fehlerpfad endet in `failClosed()`** — mit `RUN-EVIDENCE.json` (Status `failed`), `FAILURE.json` und Statistik. Scheitern erzeugt Evidenz, kein Schweigen.

---

## 9. Persistenz- und Schemamodell

| Artefakt | Schema | Autorität | Veränderbarkeit |
|---|---|---|---|
| `owner-contract.json` | `game-factory.owner-contract/1.0` | Owner Intent | eingefroren, SHA-gebunden |
| `attempt-NN/evidence-tech.json` | — | Messung | append-only |
| `attempt-NN/evidence-fidelity.json` | — | Messung | append-only |
| `telemetry.json` | — | Messung | append-only |
| `RUN-EVIDENCE.json` | `game-factory.run-evidence/v1` | **kanonische Quittung** | schemavalidiert beim Schreiben |
| Kostenteil darin | `game-factory.cost-ledger/v1` | Buchhaltung | — |
| Release-Ergebnis | `game-factory.release-gate/v1` | **bindend** | — |
| `owner-feedback/*.json` | `owner-feedback-v1` | Rohevidenz | identitätsgeschützt |
| `aggregates/*.json` | `learning-aggregate-v1` | abgeleiteter Fakt | deterministisch reproduzierbar |
| `triggers/*.json` | `learning-trigger-v1` | Erlaubnis | — |
| `root-causes/*.json` | `failed-run-root-cause-v1` | Diagnose | — |
| `analysis/*.json` | `improvement-analysis-v1` | Behauptung | — |
| `candidates/*.json` | `learning-candidate-v1` | **keine, bis promoted** | Zustandsautomat |
| `validations/*.json` | `learning-validation-v1` | Nachweis | — |
| `promotions/*.json` | `learning-promotion-v1` | Aktivierung | reversibel |
| `orchestration/*.json` | `controlled-learning-orchestration-v1` | Quittung | idempotent |
| `memory/memory.json` | — | **produktionswirksam** | nur über Lifecycle |

Jede Stufe ist **versioniert**, **benannt** und **einzeln nachvollziehbar**. Es gibt keine Datei, die gleichzeitig Rohdaten und Interpretation enthält.

---

## 10. Gate-Übersicht

| Gate | Typ | Zeitpunkt | Autorität | Ort |
|---|---|---|---|---|
| Contract-Zerlegung | deterministisch | Intake | einfrierend | `contract/owner.mjs` |
| Traceability 1:1:1 | deterministisch | nach Director | **blockierend** | `contract/traceability.mjs` |
| Proof-Plan-Erreichbarkeit | deterministisch | vor Engineer | **blockierend** | `verify/proof-plan.mjs` |
| Preis bekannt | deterministisch | vor jedem Call | **blockierend** | `control/budget.mjs` |
| Budget-Precheck | deterministisch | vor jedem Call | **blockierend** | `control/budget.mjs` |
| Stufenbudget | deterministisch | vor Repair/Polish/Rebuild | **blockierend** | `control/budget.mjs` |
| Technical (12 Checks) | deterministisch | pro Versuch | **bindend** | `verify/contract.mjs` |
| Product Fidelity | deterministisch | pro Versuch | **bindend** | `verify/fidelity.mjs` |
| Repair-Fortschritt | deterministisch | pro Fehlversuch | steuernd | `control/repair-policy.mjs` |
| Experience-Schwelle | **LLM-Zahl** | nach Playtest | **bindend (nur Zahl)** | `pipeline/run.mjs` |
| Playtester-Fidelity | LLM | nach Playtest | **advisory** | `roles/playtester.mjs` |
| Auditor | LLM | vor Release | **advisory** | `roles/auditor.mjs` |
| Release Gate | deterministisch | final | **bindend** | `control/release-gate.mjs` |
| Kandidaten-SHA | deterministisch | bei Publish | **blockierend** | `publish/finalize.mjs` |
| Learning-Trigger | deterministisch | nach Ereignis | erlaubend | `learning/trigger.mjs` |
| Kandidaten-Validierung | deterministisch | manuell | erlaubend | `learning/lifecycle.mjs` |
| **Human-Merge** | **Mensch** | vor Aktivierung | **bindend** | `learning/lifecycle.mjs` + GitHub |
| Lesson-Injektion | deterministisch | pro Prompt | filternd | `memory/store.mjs` |

**Fünfzehn deterministische Gates. Ein menschliches. Zwei advisorische LLM-Signale. Eine LLM-Zahl im bindenden Pfad.**

---

## 11. Ausführungsebene: GitHub als Laufzeit

Es gibt keinen Server, keinen Scheduler, keine Datenbank. Der ausdrückliche Nicht-Zielsatz lautet: *„kein neuer Scheduler/Supervisor/keine Datenbank ohne bewiesenen Failure Mode."*

| Workflow | Auslöser | Funktion |
|---|---|---|
| `produce.yml` | manuell (Idee, Budget, Provider) oder Push auf `ideas/**` | Produktionslauf; prüft Credentials **bevor** Node startet; committet Ergebnisse + Evidenz **immer** (`if: always()`); lädt Evidenzartefakte hoch; öffnet das Review-Issue |
| `review.yml` | `issue_comment` | Owner-Gate; strenge Bedingung: kein PR, Autor == Repo-Owner, Kommando-Präfix |
| `verify.yml` | Push auf Code-/Prompt-/Skill-/Workflow-Pfade | vollständiger Regressionsselbsttest |
| `pages.yml` | Push auf Produkte, oder nach erfolgreichem `produce.yml` | Galerie-Deployment |

Wichtige Detailhärtungen:
- `concurrency: game-factory-production` — Produktionsläufe können nicht kollidieren
- Idee wird **base64-transportiert** — verhindert Shell-Injection über den Freitext
- `verify.yml` parst **jede** Workflow-YAML — dieser Guard wurde erst nach einem reproduzierten realen Fehler eingebaut, gemäß Prinzip *„keine neue Kontrollkomponente ohne reproduzierten Failure Mode"*
- Der Publishing-Test baut eine echte Manipulations-Fixture und verlangt, dass die Veröffentlichung **fehlschlägt**; ein XSS-Fixture beweist die Escaping-Sicherheit der Galerie

---

## 12. Regressionsschutz — Tests als Invariantenbeweise

18 Testdateien, jede an eine **benannte Invariante** gebunden, nicht an eine Funktion:

| Test | Bewiesene Invariante |
|---|---|
| `control/test-control.mjs` | Budget-Reservierung, Stufenlimits, Release-Gate-Autorität |
| `control/test-repair-policy.mjs` | Best-So-Far bleibt bei Regression erhalten |
| `llm/test-router.mjs` | Routing, Capability-Gates, Fail-closed |
| `llm/test-openrouter.mjs` | Credential-Isolation, Challenger ≠ Default |
| `contract/test-owner-contract.mjs` | Zerlegung, Provenance, Unveränderlichkeit |
| `contract/test-titan-candidate-validation.mjs` | realer Kandidatenfall |
| `learning/test-learning.mjs` | Lifecycle + Safety-Gate |
| `learning/test-cross-run-trigger.mjs` | ≥2-unabhängige-Läufe-Schwelle |
| `learning/test-orchestration.mjs` | Idempotenz, Inaktivität |
| `learning/test-root-cause.mjs` | Diagnose ist **verifier-unabhängig** |
| `learning/test-autonomous-orchestration.mjs` | Failed-Run erzeugt inaktiven Kandidaten |
| `roles/test-production-agents.mjs` | Prompt-Integrität |
| `roles/test-art-direction-runtime.mjs` | Skill wird zur Laufzeit tatsächlich geladen |
| `verify/test-fidelity-hardening.mjs` | Event-Selbstbestätigung wird abgewiesen |
| `verify/test-proof-reachability.mjs` | unerreichbarer Plan blockiert **vor** Engineer-Ausgaben |
| `verify/test-proof-scenarios.mjs` | Erfolg und Misserfolg unabhängig beweisbar |
| `verify/test-layout-geometry.mjs` | HUD-Geometrie unabhängig messbar |
| `verify/test-causality-visual.mjs` | Kausalität + visuelle Aktivität |
| `verify/test-verifier.mjs` | gute Fixture PASS, kaputte Fixture FAIL |

Der Test `test-root-cause.mjs` mit dem Commit-Titel *„test: distinguish verifier import from documentation text"* ist bezeichnend: hier wird eine **Architekturregel** getestet (das Lernsystem darf die Verifier-Semantik nicht importieren), nicht ein Verhalten.

---

## 13. Realer Betriebsstand

| Kennzahl | Wert |
|---|---|
| Produktionsläufe (`memory.stats`) | 34 |
| davon gescheitert | 25 |
| Produkt veröffentlicht | **0** |
| Produkt abgelehnt | 1 (`Titan Core: Reforged`) |
| Run-Verzeichnisse | 27 (6 mit kanonischer `RUN-EVIDENCE.json`) |
| Erfolgreicher Referenzlauf | `20260827-120138` — alle Gates PASS, Experience 7.7, **$0.442821 / 109 703 Tokens** |
| Letzte Fehlerursachen | 3× `debug_exhausted`, 2× `director_failed` |
| Aktive Lessons | 0 |

**Der aufschlussreichste Datenpunkt:** Der einzige Lauf, der alle Maschinengates bestand, wurde vom Menschen abgelehnt (*Product Acceptance FAIL*). Genau dieser Fall erzeugte den Kandidaten `titan-canary-3-visual-target-intake-v1`, der auf `owner-contract` zielt und inaktiv bleibt.

Das System hat seine eigene wichtigste Erkenntnis dokumentiert: **Maschinengates sagen Owner-Akzeptanz nicht zuverlässig voraus.** Die dazugehörige Analyse hält bewusst mehrere Ursachenhypothesen offen (Intake, Vertragszerlegung, Director-Reinterpretation, Fidelity, Experience-Bewertung, Kombination), statt vorschnell eine zu wählen.

---

## 14. Die zehn Architekturprinzipien und ihre Code-Verankerung

| # | Prinzip | Wo im Code verankert |
|---|---|---|
| 1 | LLM-Output ist ein Claim, keine Wahrheit | gesamte `verify/`-Schicht |
| 2 | Fail closed | jedes `throw` vor Netzwerk/Release/Promotion |
| 3 | Owner Intent ist Vertrag | `Object.freeze` + SHA + Traceability-Zwang |
| 4 | Modelle sind Worker, keine Control Plane | `release-gate.mjs` TypeError; `auditor.mjs` löscht `verdict` |
| 5 | Production und Improvement getrennt | `learning/` ruft `chat()` nie auf |
| 6 | Provider/Modelle austauschbar, kein stiller Fallback | `provider-registry.mjs` Lane-Fehler |
| 7 | Promotion explizit und reversibel | `promoteCandidate` / `deactivateCandidate` |
| 8 | Git-backed Evidence vor unsichtbarer Memory | `runs/` + `learning/` als Dateisystem |
| 9 | Keine Kontrollkomponente ohne reproduzierten Failure Mode | Workflow-YAML-Guard nach realem Fehler |
| 10 | Kein bezahlter Lauf ohne Owner-Freigabe | `produce.yml` nur `workflow_dispatch` / `ideas/**` |

**Explizite Nicht-Ziele:** kein automatischer Best-Model-Router · keine LLM-eigene Routing-/Release-Policy · keine stille Provider-/Modell-Promotion · kein unvalidiertes Lernen in Production · kein neuer Scheduler/Supervisor/keine DB ohne bewiesenen Failure Mode · kein neues bezahltes Canary ohne Owner-Freigabe.

Die Nicht-Ziele sind für die Architektur so aussagekräftig wie die Ziele: sie halten das System **klein und prüfbar**.

---

## 15. Die zwölf übertragbaren Muster

*Dies ist der Abschnitt für den Abgleich mit einer anderen Wissens- oder Systemarchitektur. Jedes Muster ist hier vom Spiel-Kontext gelöst.*

**M1 — Immutable Intake Contract.**
Der Auftrag wird beim Eingang deterministisch zerlegt, mit stabilen IDs versehen, gehasht und eingefroren. Alles Spätere referenziert diese IDs. *Übertragung: Jede Anforderung/Frage/Entscheidung bekommt beim Eingang eine unveränderliche ID und einen Hash ihres Wortlauts.*

**M2 — Unknowns sind erstklassige Bürger.**
Uneindeutiges wird als `unknown` bewahrt, nicht in eine der beiden bequemen Kategorien gezwungen. Der Default-Zweig ist Nichtwissen. *Übertragung: Eine Wissensbasis braucht neben „gilt" und „gilt nicht" eine sichtbare dritte Kategorie „ungeklärt" — und sie muss der Default sein.*

**M3 — Traceability als Compiler, nicht als Konvention.**
`Anforderung → Akzeptanz → Beweis` ist 1:1:1, IDs werden abgeleitet statt gewählt, jede Lücke bricht den Lauf. *Übertragung: Wenn eine Kette wichtig ist, muss sie erzwungen werden — sonst zerfällt sie unbemerkt.*

**M4 — Der Erzeuger darf das Beweismittel nicht definieren.**
Wo ein Agent seine eigene Qualität bezeugen wollte, wird der Beweis automatisch in eine unabhängig messbare Form übersetzt. *Übertragung: Selbstauskunft ist keine Evidenz. Für jede wichtige Behauptung braucht es eine Beobachtung von außerhalb des Behauptenden.*

**M5 — Die Kontrollgruppe.**
Jeder Kandidat läuft zusätzlich ohne Eingaben, mit identischem Seed. Wirkung = aktiv minus idle. *Übertragung: „Es funktioniert" ist erst nachgewiesen, wenn man weiß, was ohne den Wirkstoff passiert wäre.*

**M6 — Erreichbarkeit vor Ausgaben.**
Bevor teure Arbeit beginnt, wird geprüft, ob ihr Erfolg überhaupt nachweisbar wäre. *Übertragung: Vor Aufwand die Frage stellen — „woran würde ich erkennen, dass das gelungen ist?" Wenn es keine Antwort gibt, nicht anfangen.*

**M7 — Autorität als Typ, nicht als Bitte.**
Nicht-autoritative Eingaben können das Entscheidungsgate nicht erreichen; der Aufruf wirft. Advisorische Rollen bekommen ihr Urteilsfeld gelöscht. *Übertragung: Wer nicht entscheiden darf, sollte gar keinen Kanal zur Entscheidung haben.*

**M8 — Bewusste Redundanz zur Falsifizierbarkeit.**
Das Diagnosemodul definiert seine Semantik absichtlich doppelt, um den Verifier widerlegen zu können. *Übertragung: Ein Prüfsystem, das die Definitionen des Geprüften übernimmt, kann dessen Definitionsfehler nicht finden. Manche Dopplung ist Funktion.*

**M9 — Der Kandidatenlebenszyklus.**
`vorgeschlagen → validiert (inaktiv) → befördert (aktiv) → deaktiviert/ersetzt` mit getrennten Nachweisartefakten pro Übergang. Validiert ≠ aktiv. *Übertragung: Ein Erkenntnis-Item in einer Wissensbasis braucht einen expliziten Reifegrad und eine Aktivierungsentscheidung — plus die Möglichkeit, es zurückzunehmen.*

**M10 — Geschützte Ebenen mit menschlichem Tor.**
Bestimmte Ebenen (Regeln, Prompts, Verträge, Gates) sind gelistet und ändern sich nur über explizite menschliche Freigabe. *Übertragung: Definieren, welche Teile der eigenen Wissensarchitektur „Verfassungsrang" haben — und für die einen anderen Änderungsweg vorschreiben.*

**M11 — Rohdaten und Interpretation physisch getrennt.**
`rawText` neben `parsedCommand`/`parsedReason`; Aggregat neben Analyse neben Hypothese, jeweils eigene Datei, eigenes Schema, eigene Autoritätsstufe. *Übertragung: Nie Beobachtung und Deutung in dasselbe Feld schreiben. Nur so bleibt eine Deutung revidierbar.*

**M12 — Wiederholung als Musterschwelle.**
Ein einzelnes Ereignis darf analysiert werden. Eine Regeländerung verlangt dieselbe Signatur über **unabhängige** Fälle. *Übertragung: Zwischen „notiert" und „daraus folgt eine Regel" gehört eine explizite, gezählte Schwelle.*

---

## 16. Bewertung: Stärken, Schwächen, Grenzen

### Stärken

1. **Beweisbarkeit ist im Typsystem verankert**, nicht in Prompts. Prompt-Regeln können durch Modellwechsel erodieren; ein `TypeError` nicht.
2. **Kosten sind ein Gate, kein Bericht.** Die Reservierungsmechanik mit konservativer Buchung bei Unsicherheit ist die konservativste vernünftige Auslegung.
3. **Die Idle-Kontrollgruppe** ist echtes experimentelles Design und in dieser Form ungewöhnlich in LLM-Pipelines.
4. **Die Anti-Selbstbestätigungs-Umschreibungen** lösen ein Kernproblem agentischer Systeme: der Erzeuger kann seine Beweismittel nicht wählen.
5. **Ehrlichkeit als Artefakt.** `coverage` schreibt die eigenen blinden Flecken maschinenlesbar mit; Analysen dürfen ergebnislos enden; die Proof Boundary ist explizit benannt.
6. **Reversibilität.** Jede Aktivierung ist versioniert und rücknehmbar; Rücknahme aktualisiert beide Repräsentationen.

### Schwächen und Spannungen

1. **Der Lernkreis ist per Konstruktion offen** (§7.6). Automatische Kandidaten können nie aktiv werden. Das ist verteidigbar, sollte aber als Entscheidung ausgesprochen sein — sonst wird „Lernsystem" überlesen als „lernt".
2. **Experience ist eine LLM-Zahl im bindenden Pfad.** Der einzige nicht-deterministische Eingang ins Release Gate. Sauber isoliert, aber es ist eine subjektive Bewertung mit Torwirkung.
3. **Doku-Drift.** `ARCHITECTURE.md` nennt Trigger-v1 (Code: v2), listet `learning/root-causes/` nicht im Evidenzlayout, und §12 ist gegenüber dem Code veraltet. Bei einem System, dessen Kernthese Evidenztreue ist, ist Doku-Drift teurer als anderswo.
4. **Ein Erfolg auf 34 Läufe.** Die Gates sind streng, die Erzeugung hält nicht mit. Der aktuelle Reparaturplan benennt als P0 genau das: Die generische Eingabesequenz wechselt Richtungen so schnell, dass sich die Bewegung weitgehend aufhebt (~37 px in 40 s gemessen) — der Verifier kann Spielwelten nicht navigieren. Ein methodisch bemerkenswerter Befund: **das Messinstrument war die Ursache**, und das System hat das durch eigene Falsifikation entdeckt.
5. **Öffentliches Repository.** In `ARCHITECTURE.md` §13 korrekt vermerkt: historische öffentliche Offenlegung ist durch spätere Privatschaltung nicht rückgängig zu machen.
6. **Ein einziger Adapter.** Alle Provider laufen über `openai-compatible-chat`. Sauber, aber jeder nicht-kompatible Anbieter erfordert neue Adapterarbeit.

### Die Proof Boundary — vom System selbst gezogen

> Technisch implementiert und regressionsgeprüft ist **evidence-driven controlled improvement**.
> **Nicht** nachgewiesen ist: dass ein realer Kandidat nach unabhängiger Validierung und menschlicher Promotion ein späteres, vom Owner akzeptiertes Produkt messbar verbessert.

Dass diese Grenze im Repository selbst steht und nicht überschrieben wurde, ist das stärkste Einzelsignal für die Qualität der Architektur.

---

## 17. In einem Absatz

Die Game Factory ist ein **evidenzgetriebenes Produktionssystem mit dreifach getrennter Autorität**. Ein deterministischer Kern friert menschlichen Intent als gehashten, unveränderlichen Vertrag ein, erzwingt eine 1:1:1-Kette von jeder Anforderung zu einem maschinell beobachtbaren Beweis, prüft vor jeder Ausgabe die Beweisbarkeit, misst das Ergebnis in einem echten Browser gegen eine seed-identische Kontrollgruppe und entscheidet über Freigabe aus genau vier Eingängen — wobei jeder weitere Eingang einen Typfehler auslöst. Eine austauschbare LLM-Schicht liefert Design, Code und Kritik, besitzt aber **keine** Entscheidungsautorität; ihr einziger bindender Beitrag ist eine Experience-Zahl, und ihre Vorschläge werden dort automatisch in unabhängig messbare Beweisformen umgeschrieben, wo sie sich sonst selbst bezeugen würde. Ein drittes, vollständig LLM-freies Lernsystem verwandelt durable Evidenz über eine versionierte Kette — Aggregat, Trigger, Root-Cause-Dossier, Hypothese, Kandidat, Validierung, Promotion — in Vorschläge, die **niemals von selbst wirksam werden**: geschützte Ebenen verlangen einen menschlichen Merge, und faktisch kann derzeit kein automatisch erzeugter Kandidat je zu einer aktiven Lesson werden. Der Regelkreis schließt sich damit bewusst über den Menschen, GitHub ist die einzige Laufzeit, das Dateisystem ist die Datenbank, und die stärkste Eigenschaft des Systems ist, dass es seine eigenen Grenzen — bis hin zu „Maschinengates sagen Owner-Akzeptanz nicht voraus" und „unser Messinstrument war die Ursache" — als versionierte Artefakte mitschreibt, statt sie zu überschreiben.

---

## Anhang A — Konfigurationsvariablen

| Variable | Default | Wirkung |
|---|---|---|
| `GF_MAX_DEBUG_ROUNDS` | 4 | Reparaturrunden (+1 Build) |
| `GF_MAX_REPAIR_CALLS` | 6 | Repair-Call-Obergrenze |
| `GF_MAX_POLISH_ROUNDS` | 3 | Polish-Runden |
| `GF_MAX_FRESH_REBUILDS` | 1 | Architektur-Neubauten |
| `GF_MIN_SCORE` | 6.5 | Experience-Schwelle im Release Gate |
| `GF_BUDGET_USD` | 10 | Gesamtbudget (fail-closed) |
| `GF_REPAIR_BUDGET_USD` | 4 | Stufenbudget Repair |
| `GF_POLISH_BUDGET_USD` | 3 | Stufenbudget Polish |
| `GF_FRESH_REBUILD_BUDGET_USD` | 4 | Stufenbudget Rebuild |
| `GF_PLAY_SECONDS` | 12 | Basis-Beobachtungsfenster |
| `GF_MAX_PROOF_SECONDS` | 125 | Terminalszenario-Obergrenze |
| `GF_MIN_FPS` | 30 | Performance-Check |
| `GF_LLM_PROVIDER` | `openai` | Provider (global) |
| `GF_LLM_PROVIDER_<ROLE>[_<OP>]` | — | Provider je Rolle/Operation |
| `GF_MODEL` / `GF_MODEL_<ROLE>[_<OP>]` | — | Modell-Overrides |
| `GF_LLM_LANE[_<ROLE>[_<OP>]]` | `production` | Credential-Vertrauenszone |
| `GF_MODEL_REGISTRY_JSON` | — | eigene Modelle (Preis + Capabilities Pflicht) |
| `GF_PROVIDER_REGISTRY_JSON` | — | eigene Provider |
| `OPENAI_PRODUCTION` | — | Secret |
| `OPENROUTER_PRODUCTION` / `_BENCHMARK` / `_IMPROVEMENT` | — | isolierte Secrets |

## Anhang B — Modulinventar

| Modul | Z. | Rolle |
|---|---|---|
| `pipeline/run.mjs` | 547 | Orchestrierung aller Phasen |
| `engine/gf-engine.js` | 470 | Mikro-Engine (Werkstück) |
| `verify/harness.mjs` | 375 | Playwright, aktiv + idle + Szenarien |
| `learning/orchestrate.mjs` | 330 | Lernkette, idempotent |
| `verify/layout-probe.mjs` | 311 | Canvas-Geometrie-Instrumentierung |
| `learning/root-cause.mjs` | 277 | Failed-Run-Diagnose |
| `verify/fidelity.mjs` | 272 | Anforderungsbeweis |
| `verify/contract.mjs` | 221 | 12 technische Checks |
| `learning/aggregate.mjs` | 190 | deterministische Verdichtung |
| `control/budget.mjs` | 167 | Kostenkernel |
| `roles/engineer.mjs` | 166 | 4 Bau-Operationen |
| `verify/proof-plan.mjs` | 165 | Erreichbarkeitsprüfung |
| `contract/owner.mjs` | 149 | Vertragszerlegung |
| `roles/playtester.mjs` | 133 | 2 getrennte Reviews |
| `publish/site.mjs` | 130 | Galerie (escaped) |
| `contract/traceability.mjs` | 128 | 1:1:1-Compiler |
| `llm/provider-registry.mjs` | 103 | Provider + Lanes |
| `publish/assemble.mjs` | 102 | HTML + Probe-Extension |
| `control/repair-policy.mjs` | 82 | Best-So-Far |
| `memory/store.mjs` | 73 | **Safety-Gate** |
| `control/evidence.mjs` | 70 | Run-Evidence-Schema |
| `control/release-gate.mjs` | 65 | **4 Eingänge** |
| `llm/adapters/openai-compatible-chat.mjs` | 63 | einziger Adapter |
| `publish/finalize.mjs` | 60 | SHA-Bindung |
| `learning/owner-feedback.mjs` | 58 | Rohevidenz |
| `learning/lifecycle.mjs` | 55 | Kandidatenzustandsautomat |
| `roles/director.mjs` | 55 | Design + Kompilierung |
| `learning/trigger.mjs` | 48 | Analyse-Erlaubnis |
| `verify/state-semantics.mjs` | 36 | kanonisches Vokabular |
| `llm/model-registry.mjs` | 35 | Modelle + Preise |
| `llm/router.mjs` | 34 | Rollen-Routing |
| `config.mjs` | 34 | Limits + Pfade |
| `util/skills.mjs` | 32 | **Prompt-Assembly** |
| `roles/auditor.mjs` | 31 | advisory, `verdict` gelöscht |
| `llm/client.mjs` | 31 | Transport + Budgetbindung |
| `llm/json.mjs` | 28 | JSON-Extraktion |
| `learning/analysis.mjs` | 13 | Torwächter |
