# Game Factory

**Eine vollautonome Fabrik für Web-Games auf GitHub.** Von der Idee über Programmierung,
automatisches Testen und Debugging bis zur Veröffentlichung – du entscheidest nur, welche
Spiele live gehen.

> Architektur & Entscheidungen: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## So funktioniert es (Kreislauf)

```
Idee → Director schreibt Spielkonzept → Engineer baut das Spiel
     → Headless-Browser testet es objektiv (Fehler, FPS, Fortschritt)
     → Debug-Schleife bis es läuft → Vision-Playtester bewertet Optik
     → Polish-Runden bis Qualitäts-Gate → Audit
     → Du bekommst ein Review-Issue mit spielbarem Link
     → /approve = veröffentlicht  ·  /reject = archiviert + System lernt
```

## Setup (einmalig, ~10 Minuten)

1. **Repo anlegen:** Neues öffentliches GitHub-Repo erstellen und diesen Projektordner hochladen
2. **API-Key hinterlegen:**
   - **OpenAI (empfohlen):** platform.openai.com → API Keys
   - **OpenRouter:** openrouter.ai → Keys
   - **Google AI Studio:** aistudio.google.com → Get API key
   - **Hugging Face:** huggingface.co → Settings → API Tokens
   - Im Repo: **Settings → Secrets and variables → Actions → New repository secret**
     - Name: `GF_LLM_API_KEY` · Wert: dein Key
3. **Pages aktivieren:** Settings → Pages → Build and deployment → Source: **GitHub Actions**

## Ein Spiel produzieren lassen

1. Repo → Tab **Actions** → links **Produce Game** → **Run workflow**
2. Optional eine Idee eintragen (oder leer lassen = freie Konzeption)
3. Provider wählen (Standard: `openai`)
4. Budget bestätigen (Standard: $10)
5. Nach ~5–15 Minuten erscheint automatisch ein **Review-Issue** mit:
   - spielbarem Preview-Link
   - Screenshots, Scores, Kosten des Laufs

### Deine Entscheidung im Review-Issue

| Kommentar | Wirkung |
|---|---|
| `/approve` | Spiel wandert in die Game Library |
| `/reject Grund...` | Spiel wird archiviert, der Grund fließt als Lektion ein |

## Die vier LLM-Provider

Das System unterstützt dynamische Provider-Auswahl:

| Provider | Modell (Standard) | Endpoint |
|---|---|---|
| `openai` | `gpt-4o-mini` | `api.openai.com/v1` |
| `openrouter` | `google/gemini-2.5-flash` | `openrouter.ai/api/v1` |
| `googleai` | `gemini-1.5-flash` | `generativelanguage.googleapis.com/v1beta/openai` |
| `huggingface` | `meta-llama/Llama-3.3-70B-Instruct` | `router.huggingface.co/v1` |

**Fallback-Kette:** `openai` → `googleai` → `huggingface` → `openrouter`

## Ideen einreichen

- **Datei:** `ideas/meine-idee.md` (Vorlage: `ideas/_TEMPLATE.md`)
- **Workflow:** Beim Run-Start als Text einfügen oder leer lassen

## Konfiguration (Umgebungsvariablen)

| Variable | Default | Bedeutung |
|---|---|---|
| `GF_LLM_API_KEY` | – (Pflicht) | API-Key des Providers |
| `GF_LLM_PROVIDER` | `openai` | Provider: openai/openrouter/googleai/huggingface |
| `GF_MODEL` | providerabhängig | Modell für alle Rollen |
| `GF_MODEL_ENGINEER` | `GF_MODEL` | Override: Engineer nutzt gpt-4o |
| `GF_MIN_SCORE` | `6.5` | Playtest-Score-Gate (0–10) |
| `GF_MAX_DEBUG_ROUNDS` | `4` | max. automatische Reparaturrunden |
| `GF_MAX_POLISH_ROUNDS` | `3` | max. visuelle Polish-Runden |
| `GF_BUDGET_USD` | `10` | Kostenlimit pro Spiel |

## Was kostet was?

| Posten | Kosten |
|---|---|
| GitHub Actions + Chain (öffentliche Repo) | 0 € |
| LLM-API mit gpt-4o-mini | ~$0.50–2 pro Spiel |
| LLM-API mit gpt-4o (Engineer) | ~$0.30–1 pro Spiel |

## Die Lernschleife

Jede Rolle hat Skill-Dateien unter [`skills/`](skills/) – das ist das Gedächtnis der Fabrik.
Bei jeder Ablehnung werden daraus neue Regeln abgeleitet.

## Troubleshooting

- **Run scheitert sofort** → Prüfe Secret `GF_LLM_API_KEY`
- **Provider-Fehler** → System fällt automatisch auf nächsten Provider zurück
- **Review-Link tot** → Warte auf Deploy-Workflow; Pages-Source muss auf "GitHub Actions" stehen
