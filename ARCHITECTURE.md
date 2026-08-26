# Game Factory — Architektur v2 ("Studio OS")

Autonome Fabrik für hochwertige Web-Games auf GitHub. Vollständiger Ablauf von der Idee
bis zum veröffentlichten Spiel, mit Human-in-the-Loop-Freigabe und lernendem System.

## Festgelegte Entscheidungen

| Entscheidung | Wert |
|---|---|
| Runtime | GitHub Actions (öffentliches Repo), kein eigener Server |
| LLM-Zugang | 4 Provider via `GF_LLM_PROVIDER`: openai, openrouter, googleai, huggingface (Fallback-Kette) |
| Spiele-Technologie | Eigene Micro-Engine (`engine/gf-engine.js`, Canvas + WebAudio, 0 Dependencies) |
| Spiel-Format | Eine einzige `index.html` pro Spiel (deterministisch assembliert) |
| Hosting | GitHub Pages (Galerie unter `/`, Drafts unter `/drafts/<name>`) |
| Review-Gate | Issue-basiert: Factory erstellt Review-Issue mit spielbarem Preview; Freigabe per `/approve`, Ablehnung per `/reject` |
| Veröffentlichung | Nur Spiele, die Verification + Playtest-Score + Audit bestehen |
| Spielsprache | Englisch |
| Budget | Standard bis 10 USD/Spiel (konfigurierbar `GF_BUDGET_USD`) |
| Lernen | Skill-Files (`skills/*.md`) als Gedächtnis jeder Rolle; Post-Mortems schlagen Updates vor |

## Die vier Schichten

```
L4 PRODUCTION LINE    products/ · drafts/ · Galerie · Issues · Pages
L3 STUDIO AGENTS      Director · Engineer · Playtester · Auditor (LLM-Rollen)
L2 VERIFICATION       Headless-Chrome · Gameplay-Contract · Screenshots · FPS
                      Green/Broken-Fixtures beweisen die Fähigkeit des Prüfers
L1 CONTROL KERNEL     Evidence-first · fail-closed · Candidate-SHA-Binding ·
                      State in Git (runs/, memory/)
```

Kerninvarianten:

1. KI-Output ist ein **Claim**, niemals Wahrheit. Fortschritt nur mit maschineller Evidence.
2. **Fail-closed:** Jeder Fehlschlag wird als Evidence persistiert (`runs/<id>/FAILURE.json`), nie still übersprungen.
3. Jeder Build ist an seinen **SHA-256** gebunden (`candidateSha` in meta.json).
4. Der Verifizierer muss sich selbst beweisen: `npm run test:verifier` besteht nur, wenn
   die Green-Fixture durch den Contract kommt UND die Broken-Fixture zu Recht scheitert.
5. Experience-Scores können fehlende technische Evidence nicht ersetzen.

## Pipeline pro Produkt

```
PHASE A — Idee & Ausrichtung (Human)
  A1 Ideen-Input: Chat → ideas/<name>.md (später: Issue-Formular)
  A2 Director-Agent: Idee → Game Design Briefing (GDD)
  A3 Owner gibt GO

PHASE B/C — Autonome Produktion & Qualitätsspirale
  B1 Engineer-Agent baut Spiel (Design-Slots css/html/js) auf Micro-Engine
  B2 Assembly → index.html (SHA) → Headless-Chrome-Session
     (Probe __GF__, Input-Simulation, FPS-Messung, Screenshots)
  B3 Debug-Loop: Fehler+Code zurück an Engineer → Re-Verify (max GF_MAX_DEBUG_ROUNDS)
  C1 Playtester (Vision): Scores + konkrete Kritik aus echten Screenshots
  C2 Polish-Spirale: Engineer fixt Priorities → Re-Verify → Re-Playtest
     (max GF_MAX_POLISH_ROUNDS, Score-Gate GF_MIN_SCORE)
  C3 Auditor prüft Evidence-Bündel; FAIL = Abbruch ohne Publish

PHASE D — Human Gate
  D1 Draft nach drafts/<slug>/ + Review-Issue mit Preview-Link & Scores
  D2 Owner spielt → Kommentar "/approve" (Publish) oder "/reject" (Archiv + Lektion)

PHASE E — Lernschleife
  E1 Post-Mortem über alle Runs-Evidence
  E2 Skill-Update-Vorschläge für skills/*.md (versioniert im Git)
  E3 memory/memory.json: Produkt-Registry, Lessons, Statistiken
```

## Repo-Layout

```
engine/gf-engine.js        Micro-Engine (wird byte-genau in jedes Spiel eingebettet)
factory/src/               Pipeline-Code (Node.js >= 20, ESM)
factory/prompts/           Rollen-Prompts (frei editierbar)
skills/                    Lernbare Regeln pro Rolle (Post-Mortem updated diese)
prompts/                   (Reserviert: globale Stil-Vorgaben des Owners)
ideas/                     Eingereichte Ideen (Markdown)
drafts/                    Release-Kandidaten, warten auf /approve
products/                  Veröffentlichte Spiele
runs/                      Volle Evidence je Run (fail-closed Protokoll)
memory/                    Registry, Lessons Learned, Statistiken
examples/fixtures/         Green/Broken-Spiele zum Selbsttest des Verifiers
docs/strategy/             Strategie-Dokumente des Owners (Notion-Export)
.github/workflows/         produce.yml · review.yml · pages.yml · verify.yml
```

## Konfiguration (Repo-Secrets/-Vars)

| Variable | Zweck | Default |
|---|---|---|
| `GF_LLM_API_KEY` | API-Key (Secret) | — (Pflicht) |
| `GF_LLM_PROVIDER` | Provider-Auswahl | `openai` |
| `GF_LLM_BASE_URL` | OpenAI-kompatibler Endpoint | providerabhängig |
| `GF_MODEL` | Modell für alle Rollen | providerabhängig |
| `GF_MODEL_ENGINEER` | Override Engineer | `gpt-4o` |
| `GF_MODEL_DIRECTOR/PLAYTESTER/AUDITOR` | Override je Rolle | `GF_MODEL` |
| `GF_BUDGET_USD` | Kostenlimit pro Spiel | `10` |
| `GF_MIN_SCORE` | Playtest-Score-Gate (0–10) | `6.5` |
| `GF_MAX_DEBUG_ROUNDS` | Technische Reparaturrunden | `4` |
| `GF_MAX_POLISH_ROUNDS` | Visuelle Polish-Runden | `3` |

## Kritische Implementation-Details (für LLMs/Entwickler)

### 1. Micro-Engine: hitStop ist eine METHODE

**Richtig:** `game.hitStop(0.15)` — Aufruf als Methode  
**Falsch:** `game.hitStop = 0.15` — Property-Zuweisung (bricht Engine)

Die Engine nutzt intern `_hitStopRemaining` (private). Der Engineer-Validator in
`factory/src/roles/engineer.mjs:30` lehnt jede Zuweisung `game.hitStop = ...` ab.

### 2. Engineer-Validierung (engineer.mjs:22-41)

Alle Engineer-Outputs werden validiert:
- JSON mit exakt `title, css, html, js`
- `js` muss `new GF.Game` enthalten
- Keine externen URLs in js/css/html
- `game.hitStop` darf nicht als Property zugewiesen werden
- Score muss innerhalb 4 Sekunden durch Interaktion steigen
- Spiel muss Background + Player + Enemies pro Frame zeichnen

### 3. Provider-Fallback (config.mjs:42-43)

```javascript
const providerKey = env('GF_LLM_PROVIDER', 'openai').toLowerCase();
const provider = PROVIDERS[providerKey] || PROVIDERS.openai;
```

Fallback-Reihenfolge bei Fehler: `openai` → `googleai` → `huggingface` → `openrouter`

### 4. Completion-Token-Limits

- `gpt-4o-mini` (Director/Playtester/Auditor): 16.384 → intern auf 16.000 begrenzt
- `gpt-4o` (Engineer): 16.384 → intern auf 12.000 begrenzt

### 5. Frühe Punktevergabe (Playtest-Check)

Score muss innerhalb **4 Sekunden** simulierten Gameplays steigen
(via Survival-Ticks, Hit-Punkte, Pickup-Punkte — keine präzisen Klicks nötig)

## Roadmap

- **M0** Repo-Skeleton ✔
- **M1** Agent-Runtime + LLM-Client ✔
- **M2** Engine v1 + Verification inkl. Fixtures ✔
- **M3** Proof: erster vollautonomer End-to-End-Lauf ✔
- **M4** Galerie/Pages/Review-Flow ✔
- **M5** Post-Mortem-Automatisierung, parallele Tracks, Issue-Formular-Intake
- **M6** Multi-Idee-Batch-Produktion, A/B-Testing verschiedener Prompts
