# Game Factory — Architektur v2 ("Studio OS")

Autonome Fabrik für hochwertige Web-Games auf GitHub. Vollständiger Ablauf von der Idee
bis zum veröffentlichten Spiel, mit Human-in-the-Loop-Freigabe und lernendem System.

## Festgelegte Entscheidungen

| Entscheidung | Wert |
|---|---|
| Runtime | GitHub Actions (öffentliches Repo), kein eigener Server |
| LLM-Zugang | Konfigurierbarer OpenAI-kompatibler Endpoint (OpenRouter / Gemini / beliebig) via `GF_LLM_BASE_URL` + `GF_LLM_API_KEY` |
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

Kerninvarianten (aus dem Canary-Projekt übernommen):

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
| `GF_LLM_BASE_URL` | OpenAI-kompatibler Endpoint | `https://openrouter.ai/api/v1` |
| `GF_MODEL` | Modell für alle Rollen | `google/gemini-2.5-flash` |
| `GF_MODEL_ENGINEER/DIRECTOR/...` | Override je Rolle | `GF_MODEL` |
| `GF_BUDGET_USD` | Kostenlimit pro Spiel | `10` |
| `GF_MIN_SCORE` | Playtest-Score-Gate (0–10) | `7` |
| `GF_MAX_DEBUG_ROUNDS` | Technische Reparaturrunden | `4` |
| `GF_MAX_POLISH_ROUNDS` | Visuelle Polish-Runden | `2` |

## Roadmap

- **M0** Repo-Skeleton ✔ (dieses Commit)
- **M1** Agent-Runtime + LLM-Client
- **M2** Engine v1 + Verification inkl. Fixtures
- **M3** Proof: erster vollautonomer End-to-End-Lauf (Gratis-Tier möglich)
- **M4** Galerie/Pages/Review-Flow
- **M5** Post-Mortem-Automatisierung, parallele Tracks, Issue-Formular-Intake
