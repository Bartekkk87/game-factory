# Game Factory

**Eine vollautonome Fabrik für Web-Games auf GitHub.** Von der Idee über Programmierung,
automatisches Testen und Debugging bis zur Veröffentlichung – du entscheidest nur, welche
Spiele live gehen.

> Architektur & Entscheidungen: siehe [ARCHITECTURE.md](ARCHITECTURE.md)

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
   (am einfachsten gemeinsam im Chat mit deinem KI-Assistenten – Git wird einmalig benötigt).
2. **API-Key hinterlegen:**
   - *OpenRouter:* Konto auf openrouter.ai → **Keys** → Key erstellen.
   - *Alternativ Google Gemini:* aistudio.google.com → **Get API key** (kostenloser Einstieg möglich).
   - Im Repo: **Settings → Secrets and variables → Actions → New repository secret**
     - Name: `GF_LLM_API_KEY` · Wert: dein Key
3. **Optional (Repo-*Variables*, gleiche Seite):**
   - `GF_MODEL` – z.B. `google/gemini-2.5-flash` (Default), später z.B. ein stärkeres Modell
   - `GF_LLM_BASE_URL` – nur nötig, wenn nicht OpenRouter genutzt wird
4. **Pages aktivieren:** Settings → Pages → Build and deployment → Source: **GitHub Actions**

## Ein Spiel produzieren lassen

1. Repo → Tab **Actions** → links **Produce Game** → **Run workflow**
2. Optional eine Idee eintragen (oder leer lassen = freie Konzeption) und Budget bestätigen
3. Nach ~5–15 Minuten erscheint automatisch ein **Review-Issue** mit:
   - spielbarem Preview-Link (`…/drafts/<name>/index.html`)
   - Screenshots, Scores, Kosten des Laufs

### Deine Entscheidung im Review-Issue

| Kommentar | Wirkung |
|---|---|
| `/approve` | Spiel wandert in die Game Library (Galerie) |
| `/reject Grund...` | Spiel wird archiviert, der Grund fließt als Lektion in künftige Läufe ein |

## Ideen einreichen

- **Chat:** Idee dem Assistenten nennen → landet als Datei unter `ideas/`
- **Datei:** `ideas/meine-idee.md` (Vorlage: `ideas/_TEMPLATE.md`) → beim Workflow-Start als Text einfügen oder leer lassen

## Was kostet was?

| Posten | Kosten |
|---|---|
| GitHub Actions + Pages (öffentliches Repo) | 0 € |
| Engine, Verifikation, alle Tools | 0 € (Open Source) |
| LLM-API pro fertigen Spiel | ~0 € mit Gratis-Tier (Gemini) · typ. $1–5 mit starken Modellen · Hartlimit via `budget_usd` |

## Konfiguration (Übersicht)

| Variable | Art | Default | Bedeutung |
|---|---|---|---|
| `GF_LLM_API_KEY` | Secret | – (Pflicht) | API-Key des Anbieters |
| `GF_LLM_BASE_URL` | Variable | OpenRouter | beliebiger OpenAI-kompatibler Endpoint |
| `GF_MODEL` | Variable | `google/gemini-2.5-flash` | Modell für alle Rollen |
| `GF_MODEL_ENGINEER` etc. | Variable | `GF_MODEL` | Override je Rolle (Director/Engineer/Playtester/Auditor) |
| `GF_MIN_SCORE` | Env | `7` | Playtest-Gate 0–10 |
| `GF_MAX_DEBUG_ROUNDS` | Env | `4` | max. automatische Reparaturrunden |
| `GF_MAX_POLISH_ROUNDS` | Env | `2` | max. visuelle Polish-Runden |

## Die Lernschleife

Jede Rolle hat Skill-Dateien unter [`skills/`](skills/) – das ist das Gedächtnis der Fabrik.
Bei jeder Ablehnung/Fehlfahrt werden daraus neue Regeln abgeleitet (Post-Mortem, Meilenstein M5
vollautomatisch). Du kannst jede Regel jederzeit selbst bearbeiten – alles ist normales,
versioniertes Markdown.

## Sicherheit & Selbsttest

Der Verifizierer beweist sich selbst: Workflow **Verifier Selftest** spielt zwei Testspiele –
ein korrektes (muss bestehen) und ein absichtlich kaputtes (muss scheitern). Nur wenn beide
Erwartungen erfüllt sind, ist die Prüfstelle vertrauenswürdig.

## Troubleshooting

- **Run scheitert sofort** → Prüfe Secret `GF_LLM_API_KEY`
- **`debug_exhausted` in runs/** → Alles normal dokumentiert unter `runs/<lauf>/FAILURE.json`; Modell-Stärke erhöhen oder Idee präzisieren
- **Review-Link tot** → Warte bis der *Deploy Site*-Workflow fertig ist; Pages-Source muss auf "GitHub Actions" stehen
