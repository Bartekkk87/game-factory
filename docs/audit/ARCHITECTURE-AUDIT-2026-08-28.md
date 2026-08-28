# Game Factory — Unabhängiges Architektur-Audit

**Version:** 2.0 — überarbeitet nach Owner-Gegenprüfung
**Datum:** 28.08.2026 (v1) / 28.08.2026 (v2)
**Auditierter Stand:** `origin/main` @ `7af126e` (155 Commits)
**Auditiertes Objekt:** Game Factory Studio OS v2.6 — Control Kernel, Production Line, Verifier, Controlled Improvement, Golden Corpus S0–S5, Model/Provider Layer, CI-Workflows
**Rolle des Auditors:** extern, nicht am Entwurf beteiligt
**Charakter:** strenges Audit. Der Bericht ist bewusst auf Schwachstellen ausgerichtet. Abschnitt 9 nennt die Stärken, damit das Gesamturteil nicht verzerrt.

> **Revisionshinweis v2.** Der Owner hat v1 vollständig gegengeprüft — gegen den Code, gegen die GitHub-Repository-Konfiguration und gegen den Notion-Stand. Das Ergebnis hat den Bericht an sechs Stellen korrigiert, an vier Stellen die Schwere gesenkt, einen Befund **zurückgezogen** und einen **neuen Befund hervorgebracht** (A-2b), der ohne den Widerspruch nicht gefunden worden wäre.
>
> Wesentliche Änderungen gegenüber v1:
> - **C-3 ist jetzt Priorität 1.** Der Owner konnte belegen, was dem Audit verwehrt war: `main` meldet `protected: false`, Repository-Rulesets sind leer. Der Befund ist damit bestätigt offen, nicht mehr konditional.
> - **A-1 von KRITISCH auf HOCH.** Die Vergabe vermischte zwei Schweremaße (Abschnitt 2.1).
> - **A-2 sachlich korrigiert** — die Regressionsabdeckung existiert. Dabei wurde **A-2b** entdeckt.
> - **E-5 zurückgezogen.** Die Begründung war faktisch falsch.
> - **C-2 auf MITTEL, D-1 auf MITTEL**, Empfehlungen zu B-3, E-2, E-3, F-1, F-4 überarbeitet.
> - Abschnitt 10 folgt jetzt der Priorisierung des Owners, nicht der des Auditors.

---

## 1. Prüfumfang und Methode

Geprüft wurde durch Quelltextanalyse, Ausführung der zero-paid Testsuiten auf frischem Checkout, Auswertung der durable Evidence unter `runs/`, sowie gezielte Reproduktion einzelner Defekte in isolierten Node-Läufen.

| Prüfschritt | Ergebnis |
|---|---|
| Zero-paid Testsuiten (11 Suiten, ohne `node_modules`) | alle PASS |
| Node-Syntax über alle 44 `.mjs`-Module | sauber |
| Auswertung `runs/*/RUN-EVIDENCE.json` (7 Runs mit Unified Schema) | 1 `release-eligible`, 6 `failed` |
| Auswertung `runs/*/FAILURE.json` | 3× `director_failed`, 3× `debug_exhausted` |
| Reproduktion Farbreferenz-Defekt (F-A4) | bestätigt |
| Analyse Corpus-Ausführungssemantik (F-A1) | bestätigt |
| Sekret-Sichtung in committeter Evidence | keine echten Treffer |

Codeumfang: 9.789 Zeilen (6.104 Produktiv / 3.685 Test), 2 Laufzeitabhängigkeiten (`playwright`, `pngjs`), 0 TODO/FIXME-Marker.

**Nicht geprüft:** GitHub Branch-Protection-Konfiguration (nicht einsehbar), Secret-Werte, tatsächliche Provider-Abrechnung, Playwright-abhängige Suiten (Browser im Auditumfeld nicht installiert).

---

## 2. Gesamturteil

Die Kontrollarchitektur ist **konzeptionell überdurchschnittlich** und in weiten Teilen sauber implementiert. Das zentrale Versprechen — Fortschritt entsteht nur durch unabhängige Evidence — ist an den meisten Stellen tatsächlich im Code verankert und nicht nur dokumentiert.

Das Audit findet jedoch **vier Defekte, die genau dieses Versprechen unterlaufen** — geordnet nach akuter Gefährdung:

1. **Die Protected-Layer-Grenze ist auf Git-Ebene nicht durchgesetzt.** `main` ist unprotected, Rulesets sind leer, und zwei Workflows mit `contents: write` committen per `git add -A` den gesamten Arbeitsbaum direkt auf `main`. Damit kann der automatisierte Pfad genau die Ebenen verändern, die die Architektur als human-gated bezeichnet. **Das ist keine Hypothese mehr, sondern bestätigt.** (C-3)
2. **Der Pfad, der Production-Prompts aktiviert, prüft schwächer als der Pfad, der Code quittiert** — obwohl der stärkere Mechanismus 40 Zeilen tiefer in derselben Datei liegt. (C-1)
3. **Die Request-Form hängt an einem Providernamen statt an einer Capability.** Zwei evidenzierte Produktionsausfälle waren genau das, und der registrierte S5-Challenger reproduziert die Konstellation. (B-1/B-2)
4. **Ein LLM-Urteil steht bindend im Release Gate** eines Systems, das LLM-Claims sonst überall misstraut. (A-3)

Hinzu kommt ein Mess- und Kommunikationsdefekt: die meistzitierte Qualitätszahl (**29/29, 0 Critical False PASS**) beruht auf 8 Skriptausführungen (A-1). Der beschädigt keine Sicherheitsgrenze, aber die Glaubwürdigkeit aller übrigen Zahlen.

Keiner dieser Punkte ist unreparierbar. Alle sind mit überschaubarem Aufwand behebbar, und drei davon mit Mitteln, die im Repository bereits vorhanden sind.

### 2.1 Zwei Schwereachsen — Korrektur des Bewertungsmodells

v1 hatte einen methodischen Fehler: eine einzige Schwereskala für zwei unterschiedliche Risikoarten. A-1 erhielt „kritisch", weil die *Aussagekraft* der Hauptmetrik beschädigt ist — nicht, weil eine Sicherheitsgrenze fällt. C-3 erhielt „hoch", obwohl dort tatsächlich eine Grenze offen ist. Das ist inkonsistent.

v2 trennt deshalb:

| Achse | Frage | Höchster Befund |
|---|---|---|
| **S — Sicherheit / Autoritätsgrenze** | Kann eine Grenze umgangen oder unbemerkt verletzt werden? | **C-3** (bestätigt offen) |
| **M — Messgültigkeit / Glaubwürdigkeit** | Behauptet eine Zahl mehr, als sie belegt? | **A-1** |

Ein M-Befund kann geschäftlich teurer sein als ein S-Befund — eine widerlegte Kennzahl kostet Vertrauen, das schwerer zurückzugewinnen ist als eine geschlossene Lücke. Für die Reihenfolge der Abarbeitung ist die S-Achse aber maßgeblich, weil dort ein Schaden **entstehen** kann, während der M-Schaden bereits eingetreten und durch Korrektur der Kommunikation sofort begrenzbar ist. Die Priorisierung des Owners folgt genau dieser Logik und ist der v1-Reihenfolge überlegen.

### Befundübersicht

| Schwere | Achse | Anzahl | IDs |
|---|---|---|---|
| **Kritisch** | S | 1 | **C-3** (bestätigt offen) |
| **Hoch** | S | 5 | C-1, B-1, B-2, E-1, C-5 |
| **Hoch** | M | 3 | A-1, A-3, A-2b |
| **Mittel** | S | 7 | A-4, B-3, C-2, C-4, D-2, E-2, E-3 |
| **Mittel** | M | 4 | A-2, B-4, D-1, F-2 |
| **Niedrig** | — | 5 | D-3, E-4, F-1, F-3, F-4 |
| **Zurückgezogen** | — | 1 | ~~E-5~~ |

Gesamt: 25 aktive Befunde (24 aus v1 + A-2b, − E-5).

---

## 3. Befunde — Evidenz und Messgültigkeit

### A-1 — HOCH (M): Der Golden Corpus misst 8 Ausführungen und berichtet 29 Fälle

**Ort:** `factory/src/evaluation/run-corpus.mjs:138-141`, `evaluation/corpus/s1-cases.json`, `evaluation/baselines/S2-S1-CLOSURE-REFERENCE-2026-08-28.json`

**Beobachtung**

Der Corpus-Runner dedupliziert vor der Ausführung:

```js
const scripts = [...new Set(catalog.map((entry) => entry.script))].sort();   // → 8
const executions = new Map(scripts.map((script) => [script, runScript(script)]));
// jeder der 29 Fälle liest anschließend das Ergebnis seines geteilten Skripts
```

Die Baseline bestätigt das explizit: `seedCases: 15`, `variants: 14`, `totalCases: 29`, **`uniqueExecutionScripts: 8`**. Das `executionEvidenceKind` lautet wörtlich `"supporting-full-verifier-over-shared-selftests"`.

**Konsequenz**

- Ein Seed-Fall und seine „Sibling-Variante" teilen sich **einen Exit-Code**. Sie können per Konstruktion niemals voneinander abweichen. `gp-action-reachability-active-vs-idle` und `gp-action-legacy-pulse-unreachable` binden beide auf `test-action-reachability.mjs`.
- `expectedOutcomePassRate: 1` über 29 Fälle ist arithmetisch identisch mit „die 8 Selftests sind grün" — eine Aussage, die der Full Verifier ohnehin schon trifft. Der Corpus fügt an dieser Stelle **keine zusätzliche Evidenz** hinzu, nur zusätzliche Buchhaltung.
- `criticalFalsePassCount: 0` bei einer Toleranz von 0 ist damit ebenfalls über 8 Beobachtungen erhoben, nicht über 29.
- Die S1b-Eigenschaft „nachgewiesene Fehlerklassen haben aussagekräftige Nachbarvarianten" ist auf Ebene der Fallakten dokumentiert, aber **nicht auf Ebene der Ausführung realisiert**. Eine Variante mit abweichendem Erwartungswert würde fehlschlagen, weil sie denselben Exit-Code erbt — nicht, weil ein Systemverhalten beobachtet wurde.

**Schwere — Korrektur gegenüber v1.** v1 vergab „kritisch". Der Owner widerspricht zu Recht: die acht zugrunde liegenden Selftests sind nicht wertlos, und das System verliert durch diesen Befund keine Sicherheitsgrenze. Nach dem Modell aus Abschnitt 2.1 ist das ein **M-Befund, HOCH** — die Zahl behauptet mehr, als sie belegt, aber es entsteht kein neuer Schaden, solange sie nicht extern zitiert wird. Der Owner hat zusätzlich bestätigt, dass der vorhandene `--case`-Runner den Befund **nicht** entschärft: auch er führt am Ende dasselbe geteilte Selftest-Skript aus. Die Fallgranularität bleibt Buchhaltung.

**Zur Fairness:** Der Runner selbst ist ehrlich — er berichtet `uniqueScriptsExecuted: 8` in seinem Report (`run-corpus.mjs:190`). Der Defekt liegt in der Kommunikationsschicht: `README.md` und `ARCHITECTURE.md` §7 zitieren „29/29" ohne diese Qualifikation, und genau diese Zahl wäre die erste, die ein Kunde, Investor oder Auditor prüft. Ein externer Prüfer, der den Runner liest, wird die Zahl in Frage stellen — und damit implizit auch alle anderen Zahlen des Projekts.

**Empfehlung (Priorität 1)**

1. **Fälle einzeln ausführbar machen.** Jeder Case erhält einen eigenen Einstiegspunkt — entweder `node <script> --case <id>` mit fallbezogener Assertion, oder ein exportiertes Case-Objekt pro Datei. Erst dann ist ein Case eine Messung.
2. **Bis dahin: jede publizierte Metrik führt beide Zahlen.** Format: `29 Fälle / 8 unabhängige Ausführungen — 8/8 erwartete Ergebnisse`. Nie „29/29" allein.
3. **`independentObservationCount` als Pflichtfeld** in `game-factory.golden-corpus-s2-baseline/v1` aufnehmen und im Quality-Delta gegen die Fallzahl abgleichen. Ein Delta zwischen beiden Zahlen ist ein Corpus-Qualitätsmangel und sollte als solcher berichtet werden.
4. `README.md` und `ARCHITECTURE.md` §7 entsprechend korrigieren. Das kostet nichts und schützt die Glaubwürdigkeit aller übrigen Zahlen.

---

### A-2 — MITTEL (M): Reale Produktionsfehler sind regressionswirksam, aber nicht als solche klassifiziert

> **Korrigiert gegenüber v1.** v1 behauptete, der Corpus enthalte keinen Fall aus einem realen Produktionsfehler, und schloss daraus, die Kernthese der Improvement Factory sei aus dem Corpus nicht nachweisbar. Der Owner widerspricht, und die Nachprüfung gibt ihm recht. Die Schlussfolgerung war zu weitgehend; die Schwere sinkt von HOCH auf MITTEL.

**Ort:** `evaluation/baselines/S0-2026-08-28.json`, `factory/src/learning/test-root-cause.mjs:109-135`

**Was v1 richtig sah**

`sourceKinds: { fixture: 3, selftest: 12, historical-regression: 0 }` — die Kategorie für aus Produktionsfehlern abgeleitete Fälle ist unbesetzt, ebenso Tier 2 (`tiers: {0: 11, 1: 4, 2: 0}`).

**Was v1 falsch schloss**

Die Regressionsabdeckung *existiert*, sie ist nur anders abgelegt. `test-root-cause.mjs` bindet direkt an den realen Produktionslauf `runs/20260828-201007` und assertiert dessen exakte Fehlersignatur:

```js
const lumen = analyzeFailedProductionRun({ runId: '20260828-201007', … });
assert.equal(lumen.primaryFindingId, 'director-verifier-state-contract-mismatch');
assert.match(lumen.findings[0].summary, /restored/);
assert.match(lumen.findings[0].summary, /glass_breach/);
```

Dieses Skript ist über den Case `fr-root-cause-diagnostic-independence` Teil des Corpus. Der reale Lumen-Fehler ist also dauerhaft regressionswirksam geworden — genau wie `ARCHITECTURE.md` §9 es beschreibt. Die These ist belegt, nur nicht in der Kategorie, in der man sie suchen würde.

**Was tatsächlich fehlt**

Provenance-Klassifikation, nicht Abdeckung. Ein Dritter, der den Corpus prüft, sieht `historical-regression: 0` und zieht denselben falschen Schluss wie v1. Der Nachweis existiert und ist unsichtbar.

**Empfehlung**

Die real gewordenen Fehler nachträglich als `historical-regression`-Fälle registrieren — mit Verweis auf den auslösenden Run und den schließenden Commit. Kandidaten: Lumen Director-State-Contract (`20260828-201007`), Harbor-Courier Repair-Regression, Proof-Plan-Unreachability, die beiden Provider-Request-Ausfälle aus B-1. Das ist Buchhaltung, kein neuer Test — und erzeugt die in Abschnitt 9 empfohlene Wirksamkeitskennzahl fast als Nebenprodukt.

---

### A-2b — HOCH (M): Die einzige reale Produktionsregression wird still übersprungen, wenn ihr Evidence-Verzeichnis fehlt

> **Neuer Befund in v2.** Er wurde erst durch den Widerspruch des Owners zu A-2 sichtbar — beim Nachprüfen seiner Korrektur.

**Ort:** `factory/src/learning/test-root-cause.mjs:110`

**Beobachtung**

Die unter A-2 zitierten Assertions stehen hinter einer Existenzprüfung:

```js
const lumenRunDir = path.join(repoRoot, 'runs', '20260828-201007');
if (fs.existsSync(path.join(lumenRunDir, 'RUN-EVIDENCE.json'))) {
  …   // sämtliche Lumen-Assertions
}
```

Fehlt das Verzeichnis, wird der Block übersprungen. Der Test **besteht trotzdem**, meldet PASS, und der Corpus-Fall `fr-root-cause-diagnostic-independence` meldet `PASS` — ohne dass die reale Fehlersignatur je geprüft wurde.

**Konsequenz**

Zwei Wirkungen, die zweite ist die gefährliche:

1. Die Abdeckung des einzigen dokumentierten realen Produktionsfehlers ist **konditional und degradiert lautlos**. Ein grüner Corpus beweist an dieser Stelle möglicherweise nichts.
2. **Direkte Kollision mit der D-1-Behebung.** D-1 empfiehlt, `runs/` zu bereinigen und Binärevidenz aus Git zu nehmen. Wer das umsetzt und dabei `runs/20260828-201007` entfernt oder verschiebt, **deaktiviert stillschweigend die Lumen-Regression** — und der Full Verifier bleibt grün. Ein Aufräumvorgang, der eine Sicherheitsprüfung abschaltet, ohne dass irgendetwas rot wird, ist die unangenehmste Klasse von Regression.

Damit ist v1s Schlussfolgerung im Ergebnis doch teilweise zutreffend — aber aus einem anderen und schlechteren Grund als angenommen: die Abdeckung existiert, ist aber nicht garantiert.

**Empfehlung**

1. `if (fs.existsSync(...))` durch eine harte Assertion ersetzen. Fehlt das Evidence-Verzeichnis, muss der Test **fehlschlagen**, nicht bestehen.
2. Die Evidenz, an der ein Test hängt, gehört als unveränderliche Fixture in den Testbaum — nicht in ein Laufzeitverzeichnis, das einer Retention-Policy unterliegt. Konkret: den relevanten Ausschnitt von `RUN-EVIDENCE.json` als `examples/fixtures/regressions/lumen-director-state-contract.json` ablegen, per SHA an den Originallauf gebunden.
3. Generelle Regel für den Corpus: **kein Case darf konditional sein.** Ein zero-paid Meta-Test sollte alle Corpus-Skripte auf `if (fs.existsSync` / `if (!…) return` vor Assertions prüfen und solche Muster ablehnen. Diese Klasse ist mit hoher Wahrscheinlichkeit nicht auf diese eine Stelle beschränkt.

---

### A-3 — HOCH (M): Ein LLM-Urteil ist bindendes Release-Kriterium

**Ort:** `factory/src/control/release-gate.mjs:1` (`RELEASE_RULE`), `factory/src/roles/playtester.mjs:99`

**Beobachtung**

Die bindende Release-Regel lautet:

```
Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS
```

Drei der vier Kriterien sind deterministisch. `experienceScore` stammt aus `runPlaytester()` — also aus einem LLM — und wird bei fehlendem `overall` sogar aus vier weiteren LLM-Teilurteilen gewichtet errechnet:

```js
pt.overall = Math.round(((s.visuals*0.35 + s.uiClarity*0.2 + s.funProxy*0.35 + s.performance*0.1)) * 10) / 10;
```

`ARCHITECTURE.md` §3 stellt korrekt fest, dass Auditor und *qualitative* Playtester-Fidelity advisory bleiben. Der **numerische** Experience-Score ist davon ausgenommen und bindend.

**Konsequenz**

Architekturprinzip 1 („LLM-Output ist ein Claim, keine Wahrheit") und Prinzip 4 („Modelle sind Worker, keine Control Plane") sind an genau einer Stelle durchbrochen — und zwar an der, die dem Produktwert am nächsten liegt. Das erklärt das dokumentierte Titan-#3-Ergebnis (`ARCHITECTURE.md` §9): alle Gates PASS, Owner-Urteil `PRODUCT ACCEPTANCE FAIL`. Nicht die Gates haben versagt; das eine nicht-verifizierte Gate hat getan, wofür es gebaut wurde — es hat geschätzt. Eine 6,5-Schwelle auf einer LLM-Skala ohne Kalibrierung gegen Owner-Urteile ist eine Zahl ohne nachgewiesene Aussagekraft.

**Empfehlung**

Zwei konsistente Optionen, die dritte (Status quo) ist die schwächste:

- **Option A (empfohlen, sofort umsetzbar):** Experience wird advisory. Das Release Gate besteht dann ausschließlich aus deterministischer Evidence; das Produkt geht ohne Experience-Schwelle in den Owner Review. Die Architektur ist danach widerspruchsfrei, und der Owner Review ist ohnehin die reale Akzeptanzinstanz.
- **Option B (mittelfristig):** Experience bleibt bindend, wird aber durch deterministische Proxies ersetzt oder ergänzt — Session-Länge bis Terminal, Score-Varianz über mehrere Seeds, Input-Wirksamkeitsrate, Anteil erreichter Zustände, Frame-Aktivitätsdichte. Diese Größen sind mit dem vorhandenen Harness bereits messbar.
- **In jedem Fall:** Sobald ≥10 Owner-Urteile vorliegen, den LLM-Experience-Score gegen sie kalibrieren und die Korrelation als Evidence ablegen. Ohne diesen Nachweis ist die Schwelle 6,5 nicht begründbar.

---

### A-4 — MITTEL (S): `visual_content` kann bei fehlerhafter Farbreferenz falsch PASSen

**Ort:** `factory/src/verify/contract.mjs:3-33`, `factory/src/pipeline/run.mjs:86-92`

**Beobachtung**

Die Hintergrundfarbe wird per Regex aus dem generierten Code geraten und dann als Hex geparst:

```js
const bgMatch = design.js?.match(/background\s*:\s*['"`]([^'"`]+)['"`]/);
// …
const bigint = parseInt(hex.replace('#',''), 16);
return { r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255 };
```

`parseInt` ist tolerant, und `NaN & 255 === 0`. Reproduziert:

| Extrahierter Wert | Referenzfarbe wird zu |
|---|---|
| `#101010` | rgb(16,16,16) ✓ korrekt |
| `#fff` | **rgb(0,15,255)** — leuchtendes Blau statt Weiß |
| `black` | rgb(0,0,11) |
| `linear-gradient(180deg,#001,#013)` | rgb(0,0,0) |
| `rgb(10,10,10)` | rgb(0,0,0) |

**Konsequenz**

Der Check zählt Pixel, die sich von einer möglicherweise falschen Referenz unterscheiden. Bei `#fff` ist die Referenz Blau — ein **vollständig weißer, also kaputter Screenshot** ergibt dann eine Abweichungsrate von 100 % und besteht `visual_content`. Die Verzerrung geht also Richtung **False PASS**, was für ein System mit erklärter `criticalFalsePassCount`-Toleranz von 0 die falsche Richtung ist.

**Mildernd:** Ein statisches Bild wird von `visual_activity` (Inter-Frame-Delta) abgefangen. Die Verteidigung in der Tiefe funktioniert hier. Der Einzelcheck bleibt dennoch unsolide, und bei animiertem, aber inhaltsleerem Rendering greift die Absicherung nicht zuverlässig.

**Empfehlung**

1. Die Referenzfarbe nicht raten. Der Verifier kann sie **messen**: `getComputedStyle` des Canvas/Body zur Laufzeit über die Playwright-Session, oder die dominante Farbe des Titelbild-Screenshots per Histogramm.
2. `hexToRgb` fail-closed machen: nur `/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i` akzeptieren, 3-stellige Kurzform korrekt expandieren, andernfalls Check als `inconclusive` markieren statt stillschweigend eine falsche Referenz zu verwenden.
3. Ein `inconclusive`-Ergebnis muss im Evidence-Schema von `pass:false` unterscheidbar sein — sonst erzeugt die Härtung neue Falschmeldungen.

---

## 4. Befunde — Provider- und Modell-Layer

### B-1 — HOCH (S): Request-Form ist providernamens-hartcodiert statt als Capability modelliert

**Ort:** `factory/src/llm/adapters/openai-compatible-chat.mjs:36-46`, `factory/src/llm/model-registry.mjs`

**Beobachtung**

Die Unterscheidung, welche Request-Form ein Modell verlangt, wird aus einem Providernamen abgeleitet:

```js
const openAiReasoning = route.provider.id === 'openai' && route.model.capabilities?.reasoning === true;
if (openAiReasoning) body.max_completion_tokens = maxTokens;
else body.max_tokens = maxTokens;
if (!openAiReasoning && temperature != null) body.temperature = Number(temperature);
```

Zwei der drei evidenzierten `director_failed`-Runs waren exakt dieser Defekt, bevor der Sonderfall eingebaut wurde:

- `runs/20260827-111826`: `HTTP 400: Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`
- `runs/20260827-113631`: `HTTP 400: Unsupported value: 'temperature' does not support 0.9 with this model.`

**Konsequenz**

Der Fix behebt den Symptomfall, nicht die Klasse. Die Registry führt bereits **zwei** Modelle mit `reasoning: true` bei anderem Provider:

- `deepseek:deepseek-v4-flash` (`reasoning: true`) → erhält `max_tokens` **und** `temperature`
- `openrouter:deepseek/deepseek-chat-v3.1` (`reasoning: true`) → ebenso

Letzteres ist der registrierte S5-Challenger. Ein model-backed S5-Benchmark läuft damit in denselben HTTP-400 wie im August — beim ersten bezahlten Aufruf, mit Owner-Freigabe und reserviertem Budget. Architekturprinzip 6 („Provider/Modelle sind austauschbar") ist derzeit **nicht erfüllt**: ein Modellwechsel ist kein Konfigurationsvorgang, sondern eine Codeänderung im Adapter.

**Empfehlung**

Request-Form deklarativ in die Capabilities heben:

```js
requestShape: {
  tokenParam: 'max_completion_tokens' | 'max_tokens',
  temperature: 'free' | 'fixed-default' | 'unsupported',
  jsonMode:    'response_format' | 'none'
}
```

Der Adapter liest ausschließlich diese Felder; `provider.id` darf die Request-Form nicht mehr beeinflussen. Für jeden Registry-Eintrag ist `requestShape` Pflichtfeld — ein neues Modell ohne dieses Feld ist nicht routebar (fail closed, konsistent mit dem Umgang mit unbekanntem Pricing).

---

### B-2 — HOCH (S): Es gibt keinen Contract-Test für die eigene Provider-Schnittstelle

**Ort:** `.github/workflows/verify.yml`, `factory/src/llm/test-openrouter.mjs`

**Beobachtung**

Der Full Verifier prüft mit erheblichem Aufwand die *Produkte* der Fabrik. Die Schnittstelle, über die die Fabrik selbst mit ihren Providern spricht, ist nicht vertragsgeprüft. Beide Ausfälle aus B-1 waren dadurch für den gesamten Verifier- und Corpus-Apparat unsichtbar — sie traten erst im bezahlten Produktionslauf auf.

**Konsequenz**

Systematische Lücke: der Corpus deckt die Ausgabeschicht ab, nicht die Eingangsschicht. Ein Zero-Paid-Test hätte beide Produktionsausfälle zum Preis von null verhindert.

**Empfehlung**

Neuer Test `factory/src/llm/test-request-contract.mjs`, in `verify.yml` vor allen anderen LLM-Tests:

- Für **jeden** Eintrag in `modelRegistrySnapshot()`: `buildOpenAiCompatibleChatRequest()` aufrufen und den erzeugten Body gegen die dokumentierte `requestShape` des Modells assertieren.
- Negativfälle: Modell mit `temperature: 'unsupported'` darf kein `temperature`-Feld erzeugen; Modell mit `tokenParam: 'max_completion_tokens'` darf kein `max_tokens` erzeugen.
- Snapshot-Test über die vollständige Body-Struktur pro Modell, damit eine Adapteränderung nicht still alle Routen verändert.

Ergänzend: die Registry-Einträge tragen `pricing.source: 'openai-official-2026-08-27'` — ein Freitext ohne Ablaufdatum. Ein Test, der bei Pricing-Daten älter als N Tage warnt, verhindert stille Kostenfehlkalkulation.

---

### B-3 — MITTEL (S): Transportfehler werden nie wiederholt und vergiften den gesamten Run

**Ort:** `factory/src/llm/client.mjs:26`

**Beobachtung**

```js
catch(e){
  lastErr=e;
  if(reservationId && !reservationClosed){ settleUncertainAttempt(reservationId,e); reservationClosed=true; e.fatal=true; }
  if(e instanceof BudgetError || e.fatal) throw e;
  …
}
```

HTTP-Statusfehler schließen ihre Reservierung vorher über `releaseAttempt` und werden korrekt wiederholt. **Transportfehler** — Timeout nach 180 s, `ECONNRESET`, DNS, Abort — lassen die Reservierung offen. Folge: `settleUncertainAttempt` bucht den vollen reservierten Betrag, setzt `accountingComplete = false` und markiert den Fehler als `fatal`.

**Konsequenz**

- Die Schleife mit `maxAttempts = 6` ist für die häufigste Fehlerklasse in verteilten Systemen **totes Kapital**.
- Eine einzelne Netzwerkstörung beendet nicht nur den Aufruf, sondern über `accountingComplete=false` **alle weiteren bezahlten Aufrufe des Runs**. Ein 40-Minuten-Produktionslauf stirbt an einem TCP-Reset in Minute 35.
- Die Absicht ist erkennbar und im Kern richtig (unklare Abrechnung ⇒ fail closed). Sie ist aber zu grob: ein Abbruch **vor Zustellung** der Anfrage hat kein Abrechnungsrisiko.

**Empfehlung — überarbeitet in v2**

> v1 empfahl, auch nach unklarer Zustellung einen begrenzten Retry zu erlauben. Der Owner widerspricht: ohne belastbare Idempotenz ist ein Retry nach möglicherweise zugestelltem Request eine potenzielle Doppelabrechnung, und das Budget-Kernel verlöre genau die Eigenschaft, die es auszeichnet. Der Einwand ist berechtigt; die Empfehlung wird zurückgenommen und ersetzt.

Gestaffelt, in dieser Reihenfolge:

1. **Pre-Delivery-Fehler wiederholen** (Verbindungsaufbau, DNS, TLS-Handshake, Abort vor gesendetem Body). Kein Billing-Risiko, `releaseAttempt` statt `settleUncertainAttempt`. Das ist der sichere und größte Teil des Gewinns und sollte allein umgesetzt werden.
2. **Unklare Zustellung bleibt fail-closed.** Keine Wiederholung, konservative Belastung, `accountingComplete=false`. Unverändert.
3. **Erst danach, falls Verfügbarkeit weiter stört:** Idempotenz aufbauen (`Idempotency-Key` je logischem Call, sofern der Provider ihn führt) und Post-Delivery-Retry **nur für Routen freischalten, deren Provider Idempotenz zusichert** — als deklaratives Feld in derselben `requestShape`, die B-1 einführt. Ohne diese Zusicherung kein Retry.
4. Unabhängig davon: `accountingComplete=false` sollte zwischen „Run darf nichts mehr bezahlen" und „Run ist beendet" unterscheiden. Aktuell ist beides dasselbe, und der Run stirbt auch dann, wenn alle verbleibenden Schritte unbezahlt wären.

---

### B-4 — MITTEL (M): Nichtdeterministische Sampling-Parameter ohne Varianzausweis im Benchmark

**Ort:** `factory/src/llm/client.mjs:10` (`temperature=0.7`), `factory/src/roles/director.mjs` (`temperature: 0.9`), `evaluation/benchmark/configurations/*.json` (`trialsPerCase: 3`)

**Beobachtung**

Die S5-Vergleichseinheit ist als Systemkonfiguration sauber definiert und SHA-gebunden. Die Trials laufen aber mit nichtdeterministischem Sampling bei drei Wiederholungen pro Fall, und das Konfigurationsschema führt weder den `temperature`-Wert als Teil der Konfiguration noch eine Varianz-, Streuungs- oder Konfidenzangabe im Ergebnis.

**Konsequenz**

Bei n=3 und Temperatur 0,7–0,9 ist der Unterschied zwischen zwei Konfigurationen ohne Streuungsmaß nicht interpretierbar. Ein S5-„Gewinner" wäre unter diesen Bedingungen nicht belastbar — und das Projekt hat die richtige Vorsicht bereits eingebaut (`human-review-required`, keine automatische Promotion). Die Statistik fehlt trotzdem.

**Empfehlung**

1. `sampling: { temperature, topP, seed }` als Pflichtfeld in `game-factory.s5-system-configuration/v1` aufnehmen — es ist Teil der Konfiguration und gehört in den `configurationSha256`.
2. Ergebnisse mit `trials`, `mean`, `stdDev` und einem einfachen Konfidenzintervall berichten. Ein Vergleich ohne überlappungsfreie Intervalle ist als „kein Unterschied nachgewiesen" auszuweisen, nicht als Rangfolge.
3. Mindest-Trialzahl im Schema erzwingen (Vorschlag: ≥5), oder Temperatur für Benchmarkläufe auf 0 zwingen, wo das Modell es zulässt.

---

## 5. Befunde — Governance und Autorität

### C-1 — HOCH (S): Der Promotion-Pfad prüft schwächer als der Application-Receipt-Pfad

**Ort:** `factory/src/learning/lifecycle.mjs:54-64` vs. `:101-113`

**Beobachtung**

Zwei Pfade in derselben Datei, mit deutlich unterschiedlicher Beweisstrenge.

Der **Application Receipt** (S4, Code/Policy-Änderungen) beweist den Merge:

```js
const ancestor = spawnSync('git',['merge-base','--is-ancestor',value,'HEAD'],…);
if (ancestor.status !== 0) throw new Error(`application merge commit is not merged into current HEAD`);
// zusätzlich: assertPrRef(), bindEvidence() mit SHA-Abgleich, normalizeRepoJsonRef()
```

Die **Lesson Promotion** (aktiviert Production-Prompts) glaubt einem String:

```js
if(!approvedBy || !promotionRef) throw new Error('promotion requires approvedBy and promotionRef');
if(PROTECTED_LAYERS.has(c.targetLayer) && approvalKind !== 'human-merge') throw new Error(…);
```

`approvalKind: 'human-merge'` ist eine vom Aufrufer gelieferte Zeichenkette. `promotionRef` wird **überhaupt nicht validiert** — im Test genügt `'pr-test'`. Es gibt keine Prüfung, dass ein Merge, ein PR oder ein menschlicher Reviewer tatsächlich existiert.

**Konsequenz**

Der schwächer abgesicherte Pfad ist derjenige, der Text in Production-System-Prompts einspeist. Wer `promoteCandidate` aufrufen kann, kann durch Übergabe von `{approvedBy:'owner', approvalKind:'human-merge', promotionRef:'x'}` einen Kandidaten aktivieren. Die Behauptung „Protected Layers bleiben human-gated" ist damit auf Ebene der Funktionssignatur eine **Konvention**, kein Beweis. Der stärkere Mechanismus existiert 40 Zeilen weiter unten.

**Empfehlung**

`promoteCandidate` auf denselben Beweisstandard heben:

```js
promotionRef  → assertPrRef(promotionRef)                     // bereits vorhanden
mergeCommitSha→ assertMergedImplementationCommit(sha)          // bereits vorhanden
approvedBy    → gegen GitHub-Login des Merge-Commits prüfen
```

Alle drei Bausteine liegen im selben Modul. Der Aufwand ist gering, der Gewinn strukturell: die Aussage „nur human-merged Lessons werden aktiv" wäre danach maschinell nachweisbar statt zugesichert.

---

### C-2 — MITTEL (S): Die Verbotsregel für privilegierte Aufrufe ist textuell, nicht strukturell

**Ort:** `factory/src/learning/test-orchestration.mjs:19`, `factory/src/evaluation/test-evaluation-failure-intake.mjs:58-59`

**Beobachtung**

Die Invariante „automatische Analyse darf nicht validieren, aktivieren oder promoten" wird so geprüft:

```js
assert.doesNotMatch(orchestrationSource, /\bvalidateCandidate\b|\bpromoteCandidate\b|\bdeactivateCandidate\b/);
```

Ein Textmuster über den Quelltext von **zwei namentlich genannten Dateien**.

**Korrektur gegenüber v1.** v1 formulierte, die Invariante werde „per Regex erzwungen". Das war überzogen, und der Owner weist es zu Recht zurück. Daneben existieren **echte Verhaltenstests**: `test-orchestration.mjs` führt die Orchestrierung in einem temporären Repository tatsächlich aus und assertiert anschließend, dass die erzeugten Kandidaten `status: 'candidate'`, `active: false` tragen und **nicht** in `lessonsFor()` auftauchen. Das ergebnisseitige Verhalten ist damit für die heutigen Codepfade belegt. Schwere entsprechend von HOCH auf MITTEL.

Der Regex ist also nicht die einzige Absicherung — aber er ist die einzige Absicherung gegen **neue** Aufrufstellen, und in dieser Rolle ist er schwach.

**Konsequenz**

Als Schutz gegen künftige Codepfade ist es eine Lint-Regel im Gewand eines Tests. Sie bricht in mehreren realistischen Fällen lautlos:

- ein neues Automationsmodul, das nicht in der Liste steht, ist ungeprüft
- dynamischer Zugriff (`lifecycle['promote'+'Candidate']`) wird nicht erfasst
- ein indirekter Aufruf über ein Hilfsmodul wird nicht erfasst
- der Test prüft *Abwesenheit eines Namens*, nicht *Abwesenheit einer Fähigkeit*

Die Verhaltenstests fangen das nicht auf, weil sie die *heutigen* Pfade prüfen. Ein morgen hinzugefügtes Automationsmodul ist von beidem nicht erfasst.

**Empfehlung**

Strukturelle statt textuelle Trennung:

1. `lifecycle.mjs` aufteilen in `lifecycle-read.mjs` (Abfrage, frei importierbar) und `lifecycle-privileged.mjs` (`validate`/`promote`/`deactivate`).
2. `lifecycle-privileged.mjs` verweigert die Ausführung, wenn es nicht aus einem dedizierten CLI-Einstiegspunkt geladen wurde (explizites Argument/Env-Gate, das im automatischen Orchestrierungspfad nicht gesetzt ist).
3. Der Regex-Test bleibt als zweites Netz erhalten, wird aber auf **alle** Dateien unter `factory/src/learning/` und `factory/src/evaluation/` ausgeweitet, mit einer expliziten Allow-List statt einer Deny-List.

---

### C-3 — KRITISCH (S): Die Protected-Layer-Grenze ist auf Git-Ebene nicht durchgesetzt — bestätigt offen

**Ort:** `.github/workflows/produce.yml` (Step „Commit results and evidence"), `.github/workflows/review.yml`

**Beobachtung**

Der Produktionslauf committet und pusht direkt auf `main`:

```yaml
permissions:
  contents: write
# …
git add -A
git commit -m "factory: run ${{ github.run_id }} (${{ job.status }})"
git push
```

Damit besitzt der Workflow-Token Schreibrecht auf das gesamte Repository — einschließlich `factory/prompts/**`, `skills/**`, `factory/src/verify/**`, `factory/src/control/**` und `.github/workflows/**`. Genau die Menge, die `ARCHITECTURE.md` §6 als `PROTECTED_LAYERS` definiert.

**Bestätigung in v2 — der Befund ist nicht mehr konditional**

v1 musste offenlassen, ob eine Branch Protection die Lücke schließt; die Repository-Konfiguration war dem Audit nicht zugänglich. Der Owner hat das nachgeprüft:

- **`main` meldet `protected: false`.**
- **Repository-Rulesets sind leer.**

Damit existiert **keine** Git-seitige Schranke. Die Voraussetzung, unter der v1 diesen Befund als möglicherweise entschärft eingestuft hatte, trifft nicht zu. Der Befund steigt von HOCH auf **KRITISCH** und ist der einzige Befund des Berichts, bei dem eine Autoritätsgrenze **heute nachweislich offen** ist.

**Konsequenz**

Die Trennung „Production Factory darf Protected Layers nicht verändern" ist auf Anwendungsebene sauber implementiert und auf Git-Ebene **gar nicht** durchgesetzt. Ein Fehler in einem Skript, das im Produktionsjob läuft — oder eine unerwartete Dateiänderung durch ein Werkzeug im Workspace — verändert Prompts, Verifier oder Gates und wird durch `git add -A && git push` automatisch nach `main` geschrieben. Es gibt keinen Reviewer und keinen Merge dazwischen.

Damit ist die zentrale Governance-Aussage der Architektur — „geschützte Layer benötigen separaten Human-Review/Merge" — auf der einzigen Ebene, auf der sie technisch wirken müsste, eine Konvention. Sie hält, solange kein Fehler auftritt. Genau das ist die Annahme, die das übrige System an keiner anderen Stelle macht.

In Verbindung mit C-5 (`git add -A` ohne Allow-List) und C-1 (schwache Promotion-Prüfung) ergibt sich eine zusammenhängende Kette: der automatisierte Pfad kann geschützte Dateien verändern, verändert sie unbemerkt mit, und der Aktivierungspfad für Prompts verlangt keinen Beweis, dass ein Mensch zugestimmt hat.

**Empfehlung**

1. Evidence nicht auf `main` schreiben. Entweder auf einen dedizierten `evidence/*`-Branch, oder in ein separates Evidence-Repository, oder ausschließlich als Actions-Artefakt mit anschließendem PR.
2. Branch Protection auf `main` mit *Include administrators* und ohne Bypass für den Actions-Token.
3. `CODEOWNERS` für `factory/prompts/**`, `skills/**`, `factory/src/control/**`, `factory/src/verify/**`, `.github/**` mit Pflichtreview.
4. Ein Workflow-Schritt, der nach dem Lauf prüft, dass keine Datei unter einem Protected Path verändert wurde, und den Job sonst fehlschlagen lässt — das ist die billigste Sofortmaßnahme und heute in zehn Zeilen umsetzbar.

---

### C-4 — MITTEL (S): Toter Code mit Privilegienpfad in einem sicherheitskritischen Modul

**Ort:** `factory/src/memory/store.mjs:38-53`

**Beobachtung**

Der Kommentar sagt: *„Direct calls are fail-closed. Promotion through learning/lifecycle.mjs is the only supported way to create an active production lesson."* Der Code darunter enthält jedoch:

```js
status: metadata.status === 'validated' ? 'validated' : 'candidate',
active: metadata.status === 'validated' && metadata.active === true
```

Ein Aufruf mit `{status:'validated', active:true}` erzeugt eine **aktive Production-Lesson** — ohne Candidate, ohne Validation Evidence, ohne Regression, ohne Human Merge. `lessonsFor()` liefert sie unmittelbar an Director und Engineer aus.

Die Funktion hat **null Aufrufer** im gesamten Repository.

**Konsequenz**

Kein aktueller Schaden, aber ein latenter Bypass in genau dem Modul, dessen Kommentar seine Unmöglichkeit behauptet. Der nächste Entwickler, der eine Lesson „schnell setzen" will, findet die Funktion und den ermutigenden Namen.

**Empfehlung**

Funktion ersatzlos entfernen. Falls ein Schreibpfad benötigt wird: Parameter `active` streichen und `active: false` hart verdrahten, sodass Aktivierung ausschließlich über `promoteCandidate` möglich ist. Ergänzend ein Test, der assertiert, dass keine Lesson mit `active:true` in `memory.json` existiert, die keinen zugehörigen Promotion-Record unter `learning/promotions/` hat.

---

### C-5 — HOCH (S): `git add -A` ohne Pfad-Allow-List in einem öffentlichen Repository

**Ort:** `.github/workflows/produce.yml`, `.github/workflows/review.yml`

**Beobachtung**

Beide Workflows committen den gesamten Arbeitsbaum. Was ein generierter Build-Schritt, ein Tool oder ein fehlgeschlagener Prozess in das Verzeichnis geschrieben hat, wird mitgenommen. `.gitignore` deckt `node_modules/`, `*.log`, `.env`, `tmp/` ab — das ist eine Deny-List, keine Allow-List.

Eine Stichprobensuche in der bereits committeten Evidence ergab **keine** echten Secret-Treffer. Das Risiko ist strukturell, nicht akut.

**Empfehlung**

`git add -A` durch eine explizite Liste ersetzen:

```bash
git add runs/ drafts/ memory/ learning/ evaluation/results/
```

Zusätzlich ein Secret-Scan-Schritt (`gitleaks protect --staged` o. ä.) vor dem Commit, der den Job fehlschlagen lässt. In einem öffentlichen Repository, das automatisiert von einer LLM-Pipeline befüllt wird, ist das keine Härtung, sondern Grundausstattung.

---

## 6. Befunde — Betrieb und Skalierung

### D-1 — MITTEL (M): Evidence im Git ohne Retention

**Ort:** `runs/` (25 MB, 812 Dateien, 309 PNG bei 28 Runs), `.git` 15 MB

**Beobachtung**

Rund 0,9 MB pro Run wandern dauerhaft in die Git-Historie, überwiegend Screenshots. Es gibt keine Retention-, Archivierungs- oder Kompressionsstrategie.

**Konsequenz**

Für den PoC ist „Git als durable Evidence Store" eine elegante und richtige Entscheidung — sie liefert Unveränderlichkeit, Provenance und Nachvollziehbarkeit kostenlos. Sie skaliert aber linear und ohne Obergrenze: bei 1.000 Runs sind es ~900 MB reine Binärhistorie, bei 10.000 Runs ist das Repository für Klone praktisch unbrauchbar. Da Git-Historie nicht rückwirkend beschnitten werden kann, ohne alle SHA-Bindungen zu brechen — und SHA-Bindungen sind das Fundament des gesamten Evidence-Modells — wird die Migration mit jedem Run teurer.

**Empfehlung**

Vor dem nächsten Skalierungsschritt, nicht danach:

1. Screenshots aus Git herausnehmen — **in einen dauerhaften Objektspeicher oder Git LFS, nicht in Actions-Artefakte.** *(v1 nannte Actions-Artefakte als Option; der Owner weist das zu Recht zurück: sie verfallen nach Ablauf der Retention und sind als durable Evidence ungeeignet. Empfehlung korrigiert.)* Im Run-Evidence nur SHA-256 plus URI behalten — das erhält die Beweiskette vollständig und entfernt ~90 % des Volumens.
2. `RUN-EVIDENCE.json`, `FAILURE.json`, `owner-contract.json` bleiben im Git — sie sind klein, textuell und der eigentliche Beweis.
3. Retention-Policy definieren: welche Runs bleiben dauerhaft (Owner-Urteil, Corpus-Quelle, Application Receipt), welche verfallen.
4. **Zwingende Reihenfolge: A-2b vor D-1.** Solange Testcode konditional an Laufzeitverzeichnisse unter `runs/` gebunden ist, deaktiviert jede Bereinigung stillschweigend Regressionsabdeckung, ohne dass der Verifier rot wird. Erst die Fixture-Bindung aus A-2b herstellen, dann aufräumen.

**Schwere — Korrektur gegenüber v1.** v1 vergab HOCH. Der Owner setzt zu Recht auf MITTEL: für den aktuellen Proof-Stand ist Git ein bewusst einfacher durable Store, und die Grenze ist eine Skalierungsgrenze, keine akute Gefährdung. Die Dringlichkeit entsteht erst durch die Kopplung an A-2b.

---

### D-2 — MITTEL (S): Ein Run pro Prozess, ohne dass dies dokumentiert oder erzwungen wäre

**Ort:** `factory/src/control/budget.mjs:16` (`let state = null`), `factory/src/memory/store.mjs` (`loadMemory`/`saveMemory`)

**Beobachtung**

Das Budget-Kernel hält seinen Zustand in einer Modulvariablen. `beginRunBudget()` überschreibt sie bedingungslos. Der Memory-Store macht Read-Modify-Write auf einer einzelnen JSON-Datei ohne Sperre.

**Konsequenz**

- Zwei parallele Runs im selben Prozess teilen sich ein Budget; der zweite `beginRunBudget()`-Aufruf setzt Ledger und Verstöße des ersten stillschweigend zurück.
- Zwei parallele Prozesse verlieren Schreibvorgänge in `memory.json` (Lost Update).
- Die `concurrency`-Gruppe in `produce.yml` verdeckt das heute vollständig — die Einschränkung ist real, aber unsichtbar. Sie steht in keinem Dokument.

**Empfehlung**

1. Kurzfristig: `beginRunBudget()` wirft, wenn bereits ein aktiver Run existiert und dieser nicht explizit geschlossen wurde. Das macht die Einschränkung zu einem lauten Fehler statt zu einer stillen Datenverfälschung.
2. Mittelfristig: Budget-Ledger als übergebenes Objekt statt Modulzustand (`createRunBudget()` → Instanz, die durch die Pipeline gereicht wird). Das ist eine mechanische Refaktorierung und die Voraussetzung für jeden Mehrmandantenbetrieb.
3. `memory.json` durch Append-only-Records pro Datei ersetzen oder mit Dateisperre versehen.

---

### D-3 — NIEDRIG (S): Der Wert 0 lässt sich für keinen Limit-Regler setzen

**Ort:** `factory/src/config.mjs:6-9`

**Beobachtung**

```js
const num = (k, d) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};
```

`GF_MAX_REPAIR_CALLS=0` ergibt 6. `GF_MAX_POLISH_ROUNDS=0` ergibt 3. `GF_MIN_SCORE=0` ergibt 6,5.

**Konsequenz**

Genau der Wert, den ein Operator vor einem kontrollierten Canary setzen würde — „keine Repairs, keine Polish-Runden, ein Versuch" — wird verworfen und durch den **größeren** Default ersetzt. Ohne Warnung, ohne Logeintrag. In einem budgetnahen Regler ist das ein Fail-Open: die Konfiguration erlaubt mehr Ausgaben, als der Operator angeordnet hat.

**Empfehlung**

`v >= 0` für Zähler-Limits (`maxDebugRounds`, `maxRepairCalls`, `maxPolishRounds`, `maxFreshRebuilds`, `minOverallScore`), `v > 0` nur für Größen, bei denen 0 sinnlos ist (`budgetUsd`, `playSeconds`, `minFps`). Jede verworfene Umgebungsvariable **muss** eine Warnung loggen — eine still ignorierte Operatoranweisung ist in einem Kontrollsystem ein eigener Defekt.

---

## 7. Befunde — Produktionslinie und Zuverlässigkeit

### E-1 — HOCH (S): Der Director hat keinen Reparaturpfad, ist aber die häufigste Fehlerquelle

**Ort:** `factory/src/roles/director.mjs:44-66`, `factory/src/pipeline/run.mjs:250-256`

**Beobachtung**

Asymmetrie in der Fehlerbehandlung:

| Rolle | Retries | Budget | Eskalation |
|---|---|---|---|
| Engineer | 6 Repair Calls | 4 USD | + 1 Fresh Rebuild (4 USD) |
| **Director** | **0** | — | — |

Der Director läuft bei `temperature: 0.9` und muss drei aufeinanderfolgende harte Validierungen bestehen: Feldvollständigkeit, `compileDirectorTraceability`, `compileProofPlan`. Jeder Fehlschlag wirft und beendet den Run.

Empirisch (7 Runs mit Unified Evidence): **3 × `director_failed` = 43 % aller Ausfälle.** Der jüngste (`runs/20260828-201007`) war ein reiner Vokabularverstoß:

```
Director proof plan unreachable: probe PR-MH-03 uses unsupported verifier state restored;
probe PR-MH-04 uses unsupported verifier state glass_breach
```

Das ist exakt die Fehlerklasse, für die der Engineer eine Repair-Schleife mit strukturiertem Failure-Summary besitzt — hier existiert sie nicht.

**Konsequenz**

Der Run stirbt nach dem teuersten Einzelschritt der Vorphase. Wichtiger als die 0,05 USD ist der Verlust des gesamten Laufs und, bei einem autorisierten Canary, der Verlust des Zeitfensters und der Owner-Freigabe.

**Empfehlung**

Die im Engineer bereits bewährte Mechanik übertragen:

1. Bounded Director Repair: bei Validierungsfehler die konkreten Fehler (`missing`, Traceability-Fehler, `proofPlan.errors`) als strukturiertes Feedback zurück an den Director, maximal 2 Versuche.
2. Eigenes Stage-Budget `director: { maxCalls: 3, maxUsd: 1 }` in `beginRunBudget` — die Infrastruktur dafür existiert bereits vollständig.
3. Temperatur für den Director senken. 0,9 ist der höchste Wert im System an der Stelle mit den strengsten Schemaanforderungen. Kreativität ist hier erwünscht, aber die Kosten der Nichtkonformität sind zu hoch für diesen Wert.
4. Das erlaubte Zustandsvokabular nicht nur im Prompt beschreiben, sondern als Enum in die JSON-Antwortstruktur zwingen (`structuredOutputs` ist bei allen Produktionsmodellen `true` und wird bisher nicht genutzt).

---

### E-2 — MITTEL (S): Ein `</script>` im generierten Code zerstört die Seite

**Ort:** `factory/src/publish/assemble.mjs:88-93`

**Beobachtung**

```js
<script>
${js}
</script>
```

`js` ist LLM-generiert und wird roh eingebettet. Enthält der generierte Code irgendwo die Zeichenfolge `</script>` — in einem String, einem Template-Literal, einem Kommentar, einem eingebetteten HTML-Schnipsel — beendet der Parser das Skript-Tag vorzeitig.

**Konsequenz**

Die Seite wird strukturell zerstört. Der Verifier meldet `probe_present: false` („Test-Hook `__GF__` vorhanden: FAIL"). Das an den Engineer zurückgespielte Failure-Summary beschreibt also ein fehlendes Test-Hook, während die tatsächliche Ursache eine Zeichenfolge im eigenen Output ist. Der Engineer kann diesen Fehler aus der Rückmeldung **nicht diagnostizieren** und wird plausibel in eine Repair-Schleife laufen, die nichts verbessert — bis `debug_exhausted`. Von den drei `debug_exhausted`-Runs war dies nicht die Ursache, aber die Fehlerklasse ist real und der Diagnosepfad ist irreführend.

**Empfehlung**

```js
const safeJs  = String(js).replace(/<\/script/gi, '<\\/script');
const safeCss = String(css).replace(/<\/style/gi,  '<\\/style');
```

**Ergänzung in v2 (Owner):** Für CSS gilt dasselbe über `</style>` — v1 hatte das übersehen. Für den `html`-Fragmentteil ist Escaping dagegen **nicht** die richtige Antwort: dort ist Markup der Zweck, und Escaping würde das Produkt zerstören. Der HTML-Anteil gehört über Isolation behandelt (E-3), nicht über Zeichenersetzung.

Zusätzlich ein Verifier-Check, der bei `probe_present: false` prüft, ob die zusammengesetzte Seite überhaupt syntaktisch intakt ist, und in diesem Fall eine eindeutige Diagnose statt „Hook fehlt" liefert.

---

### E-3 — MITTEL (S): Generierte Produkte laufen same-origin mit Galerie und Drafts

**Ort:** `factory/src/publish/assemble.mjs`, `.github/workflows/pages.yml`

**Beobachtung**

Veröffentlichte Spiele, noch nicht reviewte Drafts und die Galerie liegen auf derselben GitHub-Pages-Origin. Die zusammengesetzte Seite enthält keine Content Security Policy; die Einbettung erfolgt nicht in einem sandboxed iframe.

**Konsequenz**

Jedes generierte Spiel teilt `localStorage`, `sessionStorage` und Cookie-Scope mit allen anderen Artefakten derselben Origin, kann beliebige externe Ressourcen laden und beliebige Netzwerkanfragen stellen. Bei LLM-generiertem, öffentlich gehostetem Code ist das eine echte, wenn auch derzeit niedrig-schwere Isolationslücke. Der Verifier prüft `requestFailed` und Konsolenfehler, aber nicht ausgehende Netzwerkziele.

**Empfehlung**

1. CSP-Meta-Tag in `assemble()`: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:` — passend zur Tatsache, dass die Spiele ohnehin keine externen Ressourcen benötigen. **Das ist die einzige Maßnahme, die auch bei direkter Navigation zur Produkt-URL wirkt**, und deshalb die wichtigste.
2. Verifier-Check: keine ausgehenden Anfragen an Fremd-Origins während der Session. Der Report enthält die Daten bereits (`requestFailed`, `response`-Handler) — es fehlt nur die Regel.
3. **Zielbild: getrennte Origin für untrusted generated code.** *(Ergänzung des Owners; v1 hatte hier zu kurz gegriffen.)* Ein `<iframe sandbox>` in der Galerie schützt nur den Galerie-Kontext — Drafts und Produkte werden in dieselbe Pages-Site kopiert und direkt verlinkt, und wer die Produkt-URL direkt aufruft, umgeht die Sandbox vollständig. Sauber ist erst eine separate Origin (eigenes Pages-Repository oder Subdomain) für generierten Code. Der Sandbox-iframe bleibt als Zusatz sinnvoll, ist aber keine Lösung.

---

### E-4 — NIEDRIG: Verifier-Szenariodauer wird aus Prosa geraten

**Ort:** `factory/src/verify/proof-plan.mjs:4-12`

`inferDeclaredSeconds` regext `JSON.stringify(gdd)` nach `\b(\d{1,3})\s*(?:seconds?|secs?|s)\b` und nimmt das Maximum aus dem Bereich 5–120. Eine beliebige GDD-Erwähnung („30s Cooldown", „läuft 90 Sekunden") beeinflusst damit die Dauer der Beweis-Szenarien und die Laufzeitkosten der Verifikation. Der Bereich ist begrenzt, der Schaden also gedeckelt — aber ein beweiskritischer Parameter sollte aus einem deklarierten Feld stammen, nicht aus Freitext. **Empfehlung:** `proofDurationSeconds` als Pflichtfeld im GDD-Schema; Regex nur als Fallback mit Logwarnung.

### ~~E-5 — `no_runtime_errors` ist zu streng~~ — ZURÜCKGEZOGEN

> **In v2 zurückgezogen. Der Owner widerspricht, und er hat recht.**

v1 behauptete, die Absolutheit von `no_runtime_errors` erzeuge Falsch-FAIL durch „Browser-Warnungen, Autoplay-Policy-Meldungen und Drittanbieter-Rauschen", und empfahl eine Allow-List. Die Begründung ist **faktisch falsch**. Die Nachprüfung ergibt:

- `harness.mjs:75-77` trennt Warnungen und Fehler sauber: `if (m.type() === 'error') consoleErrors.push(…) else if (m.type() === 'warning') consoleWarnings.push(…)`.
- `contract.mjs:166-167` speist ausschließlich `pageErrors` und `consoleErrors` in das Gate. **`consoleWarnings` wird nirgends im Verifier verwendet** — es wird nur im Report mitgeführt.
- Chromium startet bereits mit `--autoplay-policy=no-user-gesture-required` und `--mute-audio`; die genannte Autoplay-Meldung kann gar nicht auftreten.

Der beschriebene Fehlermodus existiert nicht. Damit entfällt auch die Empfehlung: eine Allow-List würde ein fail-closed Gate aufweichen, ohne dass ein Fall vorliegt, der das rechtfertigt.

**Bemerkenswert:** Der Befund verstieß gegen Architekturprinzip 9 des auditierten Systems — *„Keine neue Kontrollkomponente ohne reproduzierten Failure Mode."* In der Umkehrung gilt dasselbe: **keine Aufweichung einer Kontrolle ohne reproduzierten False FAIL.** Der Owner hat diesen Maßstab korrekt gegen das Audit angewandt.

Der Befund bleibt als zurückgezogener Eintrag stehen, damit die Revision nachvollziehbar bleibt. Sollte später ein reproduzierter Falsch-FAIL auftreten, ist er neu und mit Beleg zu eröffnen.

---

## 8. Befunde — Wartbarkeit und Projektreife

### F-1 — NIEDRIG: Die kritischsten Module sind die am schwersten lesbaren

| Datei | Verantwortung | max. Zeilenlänge |
|---|---|---|
| `llm/model-registry.mjs` | Pricing, Capabilities | **788 Zeichen** |
| `llm/client.mjs` | Retry, Billing, Settlement | **533 Zeichen** |
| `llm/router.mjs` | Provider-/Modellwahl, Credential Lane | **356 Zeichen** |
| `learning/lifecycle.mjs` | Promotion, Protected Layers | **309 Zeichen** |

Das sind exakt die vier Module, in denen Geld, Zugangsdaten und Autoritätsgrenzen entschieden werden — und die vier, in denen ein Review-Diff am wenigsten aussagekräftig ist. Eine einzeilige Änderung an `client.mjs:26` verändert das Abrechnungsverhalten des gesamten Systems und ist in der Diff-Ansicht praktisch nicht prüfbar. Befund B-3 ist genau in dieser Zeile versteckt.

Es existieren weder Linter noch Formatter noch Test-Runner; die Tests sind handgeschriebene Assertion-Skripte (von hoher inhaltlicher Qualität, siehe Abschnitt 9).

**Empfehlung:** ESLint + Prettier mit `max-len: 120`, angewandt zuerst auf `control/`, `llm/` und `learning/`.

**Korrektur gegenüber v1.** v1 stellte `node --test` als Voraussetzung für die Behebung von A-1 dar. Der Owner widerspricht zu Recht: entscheidend für A-1 sind **fallspezifische Oracles**, nicht der Test-Runner. Ein Corpus-Fall braucht eine eigene, isoliert prüfbare Aussage — ob die in einem `node --test`-Block, einem Skript mit `--case`-Argument oder einem exportierten Case-Objekt steht, ist zweitrangig. `node --test` bleibt eine sinnvolle Aufräumarbeit, ist aber kein Blocker für A-1 und gehört deshalb in diese Kategorie, nicht auf den kritischen Pfad.

### F-2 — MITTEL (M): 34 datierte Strategie-Snapshots ohne Supersedes-Kette

`docs/strategy/` enthält 34 Dokumente, überwiegend Statusaufnahmen mit Datum im Dateinamen. `ARCHITECTURE.md` ist gepflegt und aktuell; die Snapshots sind es teilweise nicht mehr (z. B. beschreibt `PLATFORM-MODEL-ARCHITECTURE-DECISION-2026-08-27.md` eine Credential-Migration als offen, die inzwischen abgeschlossen ist). Ohne `supersededBy`-Feld ist für einen Dritten nicht erkennbar, welches Dokument gilt. **Empfehlung:** Frontmatter mit `status: current|superseded`, `supersededBy:`; ein Index in `docs/strategy/README.md`; ein Verifier-Schritt, der Dokumente ohne Status ablehnt.

### F-3 — NIEDRIG: Keine LICENSE, SECURITY.md, CODEOWNERS, CONTRIBUTING

Öffentliches Repository ohne Lizenz bedeutet: alle Rechte vorbehalten, keine Nutzungsrechte für Dritte, und gleichzeitig keine Haftungsbegrenzung für vom System generierte Artefakte. Vor jeder externen Präsentation zu schließen. `CODEOWNERS` ist zusätzlich Teil der Abhilfe zu C-3.

### F-4 — NIEDRIG: Lesson-Texte werden ungeprüft in System-Prompts injiziert

`util/skills.mjs:assembleSystemPrompt` hängt Lesson-Texte roh an den System-Prompt. Diese Texte stammen ursprünglich aus LLM-Vorschlägen (`persistImprovementClaim` → `proposal.text`). Der Human-Merge-Gate ist die einzige Kontrolle; es gibt kein Schema, keine Längenbegrenzung und keine Prüfung, dass ein Lesson-Text den übrigen Prompt nicht widerruft. **Empfehlung — überarbeitet in v2.** v1 empfahl unter anderem eine Wort-Blockliste. Der Owner weist das zu Recht zurück: Blocklisten sind trivial umgehbar und erzeugen ein falsches Sicherheitsgefühl. Stattdessen:

1. **Typisiertes Lesson-Schema** bei `createCandidate`: Pflichtfelder für Scope, Rolle und Geltungsbereich, harte Längenbegrenzung, nur beschreibende Feldstruktur statt freier Prosa (z. B. `situation` / `preferredBehaviour` / `rationale` als getrennte Felder).
2. **Unveränderliche Prompt-Hierarchie oberhalb der Lesson.** Der Basis-Prompt muss ausdrücklich festlegen, dass nachfolgende Lesson-Abschnitte Verifier-, Gate- und Contract-Regeln nicht außer Kraft setzen können, und Lessons müssen strukturell unterhalb dieser Ebene eingehängt sein — nicht als gleichrangiger angehängter Text.
3. Eine Blockliste ist allenfalls als nachrangiges Signal in einem Review-Hinweis brauchbar, nie als Kontrolle.

---

## 9. Was das System richtig macht

Ein Audit, das nur Defekte auflistet, ist unbrauchbar. Die folgenden Eigenschaften sind überdurchschnittlich und sollten bei jeder Umbaumaßnahme erhalten bleiben.

**Der Verifier ist echtes Experimentaldesign.** `harness.mjs` fährt jede Verifikation zweimal — `active` und `idle` — mit identischem Startimpuls und identischem Seed, und leitet Spielerkausalität aus der Differenz ab. Dazu kommen deterministisches `Math.random` per `addInitScript`, eine unabhängige Canvas-Layout-Probe über Playwright statt Selbstauskunft des Spiels, Inter-Frame-Delta-Messung, Good/Bad-Product-Negativkontrollen und separate Terminal-/Restart-Beweisszenarien. Das ist die Kernkompetenz des Systems und der am schwersten reproduzierbare Teil.

**Das Budget-Kernel ist Produktionsqualität.** Reservierung vor dem Aufruf, Settlement gegen Provider-Usage mit Rückfall auf Registry-Pricing, Stage-Budgets, Long-Context-Preisstufen, und — der entscheidende Punkt — `accountingComplete: false` bei unklarer Abrechnung blockiert **alle** weiteren bezahlten Aufrufe. Unbekanntes Pricing blockiert den Aufruf, statt ihn ungezählt durchzulassen. Das ist strenger als das, was in den meisten produktiven LLM-Systemen implementiert ist. (Befund B-3 kritisiert die Granularität dieses Mechanismus, nicht seine Existenz.)

**Die Testqualität ist inhaltlich hoch.** `test-learning.mjs` prüft nicht den Erfolgspfad, sondern die Verbotspfade: dass ein validierter Kandidat *nicht* aktiv wird, dass eine Promotion mit `approvalKind: 'model'` wirft, dass ein Kandidat mit falschem `targetLayer` auch bei menschlicher Freigabe keine Prompt-Lesson erzeugt, und dass die Zahl der Lessons dabei unverändert bleibt. Das ist die richtige Art, Sicherheitsinvarianten zu testen.

**Provenance-Disziplin.** Owner-Contract-SHA, Candidate-SHA, Git-Blob-SHAs in den S5-Konfigurationen, `assertMergedImplementationCommit` mit echter `git merge-base --is-ancestor`-Prüfung, `bindEvidence` mit SHA-Abgleich gegen die Datei auf Platte, Pfad-Traversal-Schutz in `normalizeRepoJsonRef`. Evidenz lässt sich hier nicht nachträglich behaupten. (Befund C-1 kritisiert, dass dieser Standard nicht überall gilt — nicht, dass er fehlt.)

**Das Publikations-Gate ist integritätsgeprüft.** `finalize.mjs` verweigert die Veröffentlichung bei SHA-Abweichung zwischen `meta.candidateSha` und der tatsächlichen `index.html`, und der Full Verifier testet diesen Negativfall mit einer manipulierten Fixture. Der XSS-Test der Galerie prüft ebenfalls den Angriffsfall, nicht nur den Gutfall.

**Intellektuelle Ehrlichkeit.** `ARCHITECTURE.md` §12 „Proof Boundary" benennt explizit, was **nicht** bewiesen ist. Diese Haltung ist selten und erhöht die Glaubwürdigkeit des gesamten Projekts. Sie ist zugleich der Grund, warum Befund A-1 so schwer wiegt: eine Zahl, die mehr behauptet als sie misst, steht im Widerspruch zu dem Standard, den das Projekt sonst an sich anlegt.

**Der Kernel ist weitgehend domänenfrei — Richtung belegt, Umfang nicht gemessen.** In `control/`, `learning/`, `llm/` und `contract/` erscheint „game" praktisch nur in Schemanamen (`game-factory.cost-ledger/v1`) plus einem einzigen Default-String in `owner.mjs:122`. Die Domänenkopplung konzentriert sich sichtbar auf `engine/`, `verify/`, `roles/` und `prompts/`.

> **Korrektur gegenüber v1.** v1 bezifferte das mit „60–70 % des Systems". Der Owner weist zu Recht darauf hin, dass diese Zahl im Repository nicht methodisch hergeleitet ist — sie beruhte auf einem Grep über Schemanamen, was ein schwacher Stellvertreter für Domänenkopplung ist. Die Zahl wird zurückgenommen; die qualitative Aussage bleibt.
>
> Falls die Portabilität belastbar beziffert werden soll, ist die Messung einfach und sollte durchgeführt werden, bevor sie extern behauptet wird: Anteil der Module ohne jeden Import aus `verify/`, `roles/`, `engine/` und ohne domänenspezifische Feldnamen, gewichtet nach Codezeilen — und als Verifier-Schritt festgeschrieben, damit die Zahl nicht driftet. Ohne diese Messung ist Cross-Domain-Portabilität eine begründete Hypothese, keine Kennzahl.

---

## 10. Priorisierte Maßnahmenliste

> **v2: Diese Reihenfolge stammt vom Owner und ersetzt die des Auditors.** v1 sortierte nach Aufwand und stellte A-1 an die Spitze. Der Owner sortiert nach akuter Gefährdung und stellt C-3 an die Spitze. Nach der Bestätigung, dass `main` tatsächlich ungeschützt ist, ist seine Reihenfolge die richtige: A-1 ist ein bereits eingetretener, durch Kommunikation sofort begrenzbarer Schaden; C-3 ist eine offene Tür.

### Vor dem nächsten bezahlten Production Canary

| Rang | Maßnahme | Befund | Achse | Aufwand |
|---|---|---|---|---|
| **1** | `main` schützen (Branch Protection inkl. Administratoren, kein Actions-Bypass); direkte Bot-Pushes auf Protected Paths unterbinden; `git add -A` durch Allow-List + Secret-Scan ersetzen | **C-3**, C-5 | S | 2–4 h |
| **2** | Prompt-Promotion auf den PR-/Merge-/SHA-Beweisstandard von S4 heben (`assertPrRef`, `assertMergedImplementationCommit` — beide existieren bereits im Modul) | **C-1** | S | 0,5 Tag |
| **3** | Deklarativer `requestShape` pro Registry-Eintrag + zero-paid Contract-Test über **jeden** Eintrag | **B-1, B-2** | S | 0,5–1 Tag |
| **4** | Experience aus dem bindenden Release Gate nehmen, als advisory/Polish-Signal führen; Owner bleibt Produktakzeptanzinstanz | **A-3** | M | 2–4 h |
| **5** | Bounded Director Repair mit strukturiertem Fehlerfeedback + eigenem Stage-Budget; `structuredOutputs` für das Zustands-Enum | **E-1** | S | 0,5 Tag |

**Ergänzung des Auditors zu Rang 1:** Vor der Branch Protection, als Sofortmaßnahme in einer Stunde umsetzbar, ein Workflow-Schritt, der nach jedem Lauf `git diff --name-only` gegen die Protected Paths prüft und den Job fehlschlagen lässt. Das schließt die Lücke nicht, macht ihre Verletzung aber sichtbar — und ist unabhängig von Repository-Administrationsrechten.

**Ergänzung des Auditors zu Rang 4:** Der Owner setzt A-3 auf Rang 4. Das ist vertretbar, weil der Owner ohnehin hands-on prüft und der Score damit heute keine echte Autorität ausübt. Wichtig ist die begleitende Textkorrektur: solange `experienceScore` bindend ist, ist die Formulierung „Kein LLM besitzt Release Authority" in `README.md` und `ARCHITECTURE.md` §3 unzutreffend. Falls Rang 4 verschoben wird, muss die Aussage **sofort** korrigiert werden — eine falsche Governance-Aussage ist teurer als das Gate selbst.

### Direkt danach — Hardening

| Maßnahme | Befund | Achse |
|---|---|---|
| A-2b vor D-1: konditionale Assertions in Corpus-Skripten hart machen, Lumen-Evidenz als unveränderliche Fixture binden, Meta-Test gegen `if (fs.existsSync(` vor Assertions | **A-2b** | M |
| Farbreferenz messen statt raten; `hexToRgb` fail-closed; `inconclusive` als eigener Zustand | A-4 | S |
| `recordLesson` entfernen; Test gegen aktive Lessons ohne Promotion-Record | C-4 | S |
| `</script>`- und `</style>`-Escaping in `assemble()` | E-2 | S |
| CSP im generierten Produkt (wirkt auch bei direkter Navigation) | E-3 | S |
| Pre-Delivery-Transportfehler wiederholen; unklare Zustellung bleibt fail-closed | B-3 | S |
| `num()` erlaubt 0 für Zähler-Limits; verworfene Env-Variablen werden geloggt | D-3 | S |

### Mittelfristig — vor Skalierung oder externer Vorführung

| Maßnahme | Befund |
|---|---|
| Corpus-Fälle mit fallspezifischen Oracles; `independentObservationCount` als Pflichtmetrik; Kommunikation auf „Fälle / unabhängige Ausführungen" umstellen | A-1 |
| Reale Fehler als `historical-regression` klassifizieren | A-2 |
| Evidence-Binaries aus Git in dauerhaften Objektspeicher (**nicht** Actions-Artefakte) | D-1 |
| `lifecycle.mjs` in Read/Privileged trennen; Regex-Guard auf Allow-List umstellen | C-2 |
| Budget-Ledger als Instanz statt Modulzustand; `memory.json` sperren oder append-only | D-2 |
| S5-Schema um `sampling` und Streuungsmaße erweitern | B-4 |
| Getrennte Origin für untrusted generated code | E-3 |
| Typisiertes Lesson-Schema + unveränderliche Prompt-Hierarchie | F-4 |
| ESLint/Prettier auf `control/`, `llm/`, `learning/` | F-1 |
| Supersedes-/Status-Kette in `docs/strategy/` (auch Notion-seitig) | F-2 |
| LICENSE, SECURITY.md, CODEOWNERS, CONTRIBUTING | F-3 |

---

## 11. Die aus meiner Sicht drei stärksten Anwendungsfälle

> **Statusklärung in v2.** Dieser Abschnitt ist **Meinung des Auditors, kein Auditbefund.** Der Owner weist zu Recht darauf hin, dass v1 hier Marktaussagen mit einer Bestimmtheit formulierte, die weder aus dem Repository noch aus Notion belegbar ist — die Projektdokumentation bezeichnet Cross-Domain-Portabilität selbst korrekt als Hypothese. Alle Aussagen unten sind entsprechend als **begründete Hypothesen** zu lesen, nicht als geprüfte Ergebnisse. Insbesondere ist nicht belegt, dass diese Domänen kommerziell besser tragen oder welcher Markt dafür zahlt.

Die Auswahl folgt einem Kriterium: **der Wert dieser Architektur ist proportional zur Verifizierbarkeit der Zielgröße.** Wo sich das gewünschte Ergebnis deterministisch und unabhängig beobachten lässt, ist der Kernel unmittelbar wertvoll. Wo nicht, degeneriert er zu einer teuren Workflow-Engine mit Audit-Log.

**Zur Frage „Games als Zieldomäne" — Position gegenüber v1 präzisiert.**

v1 schrieb, Games seien „ein hervorragendes Testbett und eine schwache Zieldomäne", und führte den Titan-#3-Reject als Beleg an. Der Owner widerspricht, und der Einwand trifft einen echten Fehler in der Beweisführung: Der Titan-Reject zeigt **nicht**, dass die Domäne falsch ist. Er zeigt, dass automatischer technischer Release und menschliche Produktakzeptanz nicht gleichgesetzt werden dürfen — und dass die Architektur genau diese Trennung inzwischen sauber zieht. Als Beleg gegen die Domäne taugt er nicht; als Beleg dafür, dass die Trennung funktioniert, sehr wohl.

Die These, die ich nach dieser Korrektur weiter vertrete, ist enger und rein ökonomisch: In Domänen, in denen die Zielgröße selbst verifizierbar ist, garantiert der Kernel **das, wofür der Käufer zahlt**. Bei Spielen garantiert er „technisch nicht kaputt" — was notwendig, aber Grundvoraussetzung ist und nicht das Kaufargument. Der Wertbeitrag der Kontrollmaschinerie ist dort also geringer, obwohl die Maschinerie selbst korrekt arbeitet. Das ist eine Aussage über den Grenznutzen, nicht über die Eignung — und sie bleibt eine Hypothese, solange kein Owner-akzeptiertes Produkt aus dieser Fabrik existiert, an dem sich das prüfen ließe.

---

### 1. Legacy-Migration und Schnittstellen-Modernisierung mit Äquivalenznachweis

**Warum das der stärkste Fall ist:** Die Zielgröße ist „verhält sich das Neue auf identischem Input wie das Alte" — und das ist keine Ermessensfrage, sondern eine Messung. Damit ist genau die Größe verifizierbar, die den Auftraggeber interessiert. Kein anderer Anwendungsfall hat diese Eigenschaft so sauber.

**Warum diese Architektur besonders passt:** Die `active`/`idle`-Kontrolle aus `harness.mjs` ist in ihrer allgemeinen Form Differential Testing — zwei Ausführungen unter identischen Bedingungen, Aussage aus der Differenz. Für eine Migration ist die Verallgemeinerung direkt: Alt- und Neuimplementierung auf demselben Eingabekorpus, Differenz als Evidence. Der Owner Contract mit `MH-*`/`NG-*`-Traceability bildet ab, welche Verhaltensweisen erhalten bleiben müssen und welche ausdrücklich nicht; die Regel „genau ein Akzeptanzkriterium und eine Probe pro harter Anforderung" verhindert die typische Migrationskatastrophe, dass eine Anforderung zwischen Analyse und Abnahme unbemerkt verschwindet.

**Konkrete Zuschnitte:** COBOL/PL-I → Java oder Kotlin; Monolith-Modul → Service; API v1 → v2 mit Verhaltensparität; Datenmigration zwischen Schemata; Report-Portierung zwischen BI-Werkzeugen; Stored Procedures → Anwendungslogik.

**Was dafür zu bauen wäre:** Ein Verifier-Adapter, der beide Implementierungen gegen einen Eingabekorpus fährt und Ausgabe, Seiteneffekte und Fehlerverhalten vergleicht. Der Kernel — Budget, Evidence, Release Gate, Repair-Schleife, Corpus — bleibt unverändert. Realistisch zwei bis drei Wochen für einen belastbaren Prototyp.

**Hypothese zur Zahlungsbereitschaft (unbelegt):** Migrationsprojekte scheitern erfahrungsgemäß seltener an der Übersetzung als am Nachweis. Ein System, das für jede migrierte Einheit ein SHA-gebundenes Äquivalenzprotokoll liefert, würde das Projektrisiko messbar verschieben. Ob daraus Zahlungsbereitschaft folgt, ist **nicht geprüft** und wäre vor jeder Investition in Kundengesprächen zu validieren — nicht aus dem Repository ableitbar.

---

### 2. Governance-Layer über Coding-Agents im regulierten Konzernumfeld

**Warum:** Das ist der Anwendungsfall, für den das System bereits gebaut ist — nur mit vertauschten Rollen. Statt selbst zu produzieren, kontrolliert und protokolliert der Kernel, was fremde Agents produzieren. Unternehmen haben Copilot, Claude Code und Cursor ausgerollt und besitzen in der Regel keine belastbare Antwort auf die Frage, wie sie deren Einsatz nachweisen.

**Was der Kernel unverändert mitbringt:** deterministisches Release Gate ohne LLM-Autorität; fail-closed Budget mit Rollen- und Stufenzuordnung und vollständigem Kostenledger pro Aufruf; SHA-gebundene Evidence pro Änderung; Protected Layers mit menschlichem Gate; nachweisbare Reversibilität jeder Aktivierung; getrennte Credential-Lanes ohne stillen Provider-Fallback. Das ist im Kern eine Compliance-Artefakt-Maschine, die nebenbei Software baut.

**Regulatorischer Rückenwind:** Nachvollziehbarkeit, Protokollierung und wirksame menschliche Aufsicht sind für Hochrisiko-Systeme unter dem EU AI Act verpflichtend. Die meisten Anbieter liefern Observability — Traces, Token, Latenz. Dieses System liefert etwas anderes und Seltenes: eine **Autoritätsgrenze**, die maschinell nachweisbar ist. Das ist der Unterschied zwischen „wir können zeigen, was der Agent getan hat" und „wir können zeigen, was der Agent nicht tun konnte".

**Voraussetzungen:** C-1, C-2 und C-3 sind hier keine Aufräumarbeiten, sondern das Produkt selbst. Ein Governance-Layer, dessen zentrale Invariante per Regex über Quelltext erzwungen wird und dessen CI-Identität Schreibrecht auf die geschützten Pfade hat, überlebt das erste Kundenaudit nicht. Diese drei Befunde zu schließen ist die Eintrittskarte.

**Einschränkung:** Der Markt ist noch nicht klar konturiert, und der Vertriebsweg führt über Plattform- und Enablement-Teams, nicht über Entwickler. Das ist ein längerer Zyklus als bei Fall 1.

---

### 3. Regulatorische und prüfpflichtige Dokumentenproduktion mit Anforderungs-Traceability

**Warum:** Der überraschendste, aber sehr tragfähige Fall. Die Zielgröße ist hier nicht „gut geschrieben", sondern „vollständig, konsistent und belegt" — und das ist prüfbar, ohne dass ein Modell darüber urteilen muss.

**Was direkt wiederverwendbar ist:** `contract/owner.mjs` mit `MH-*`/`NG-*`-Zerlegung, konservativer Behandlung mehrdeutiger Formulierungen, Provenance je Fragment und SHA-Bindung an den Rohtext ist praktisch eins zu eins auf „Anforderungen aus einer Verordnung, einem Prüfkatalog oder einer Ausschreibung" übertragbar. `contract/traceability.mjs` mit der Regel „genau ein Akzeptanzkriterium und eine Probe pro harter Anforderung" ist exakt die Matrix, die ein Prüfer sehen will. Die Eigenschaft, die das System schützt — *keine Anforderung verschwindet still zwischen Eingabe und Ergebnis* — ist in diesem Feld der eigentliche Wertbeitrag.

**Konkrete Zuschnitte:** Fördermittel- und Zuwendungsanträge mit formalem Kriterienkatalog; Lieferanten- und ISO-Auditberichte; DSGVO-Verarbeitungsverzeichnisse und Löschkonzepte; Ausschreibungsantworten gegen Vergabekriterien; regulatorische Meldungen mit fester Feldstruktur; technische Dokumentation nach Norm.

**Verifier-Adapter:** deterministische Prüfungen statt Browser — Abdeckung jedes Pflichtkriteriums durch mindestens einen Beleg, Konsistenz von Zahlen und Querverweisen, Schemakonformität, Terminologie- und Verbotslisten, Vollständigkeit gegen den Kriterienkatalog. Alles ohne LLM-Urteil.

**Wichtige Grenze:** Die *Qualität der Argumentation* bleibt unverifizierbar — das ist derselbe Fehlermodus wie A-3. Das System sollte hier ausdrücklich Vollständigkeit und Nachweisbarkeit garantieren und Überzeugungskraft dem Menschen überlassen. Genau diese Abgrenzung sauber zu ziehen, ist die Stärke der Architektur — sie ist bereits darauf ausgelegt, zwischen „bewiesen" und „advisory" zu unterscheiden.

---

### Nicht empfohlen

**Marketing- und Content-Produktion, kreatives Schreiben, Design-Generierung.** Kein deterministischer Verifier für die Zielgröße möglich. Der Kernel würde denselben Fehler reproduzieren, der bei Titan #3 aufgetreten ist: alle prüfbaren Gates grün, das Ergebnis trotzdem unbrauchbar. In diesen Feldern ist der Aufwand der Kontrollarchitektur nicht durch messbaren Nutzen gedeckt.

---

## 12. Abweichende Bewertungen und ihre Auflösung

Die Gegenprüfung des Owners hat den Bericht an folgenden Stellen verändert. Die Tabelle ist Teil des Auditergebnisses: sie zeigt, welche Aussagen einer unabhängigen Nachprüfung standgehalten haben und welche nicht.

| ID | Einwand des Owners | Auflösung |
|---|---|---|
| **C-3** | Priorität 1 statt 3; `main` ist nachweislich `protected: false`, Rulesets leer | **Übernommen und verschärft.** Von HOCH auf KRITISCH. Der Owner konnte belegen, was dem Audit verwehrt war. Einziger Befund mit heute nachweislich offener Autoritätsgrenze. |
| **A-1** | HOCH statt KRITISCH; die 8 Selftests sind nicht wertlos | **Übernommen.** Die v1-Vergabe vermischte Sicherheits- und Messgültigkeitsschwere. Führte zur Einführung der Zwei-Achsen-Bewertung (2.1) — eine methodische Verbesserung des Berichts. |
| **A-2** | Die Lumen-Regression *ist* dauerhaft wirksam, nur nicht klassifiziert | **Übernommen, Schwere gesenkt.** Nachprüfung bestätigt: `test-root-cause.mjs` bindet an den realen Run und assertiert die exakte Signatur. Die Nachprüfung förderte dabei **A-2b** zutage — der Befund ist im Ergebnis schwerer als v1 annahm, aber aus einem anderen Grund. |
| **B-3** | Post-Delivery-Retry ohne Idempotenz ist zu aggressiv | **Übernommen.** Empfehlung zurückgenommen und durch eine gestaffelte ersetzt: Pre-Delivery ja, unklare Zustellung bleibt fail-closed, Retry erst mit Idempotenzzusicherung. |
| **C-2** | Es existieren zusätzlich Verhaltenstests | **Übernommen.** v1 formulierte überzogen. Von HOCH auf MITTEL. Der strukturelle Vorschlag bleibt, weil der Regex die einzige Absicherung gegen *neue* Aufrufstellen ist. |
| **D-1** | MITTEL statt HOCH; Actions-Artefakte sind kein durabler Ersatz | **Beides übernommen.** Zusätzlich Reihenfolgeabhängigkeit zu A-2b ergänzt. |
| **E-2** | `</style>` fehlt; HTML nicht escapen, sondern isolieren | **Übernommen.** Beides ergänzt. |
| **E-3** | Sandbox-iframe reicht nicht, da direkte Navigation möglich | **Übernommen.** CSP als primäre Maßnahme hochgestuft, getrennte Origin als Zielbild ergänzt. |
| **E-5** | Begründung passt nicht zum Code | **Befund zurückgezogen.** Warnungen sind sauber getrennt und erreichen das Gate nie; Autoplay ist per Startflag ausgeschlossen. Der Auditor hat gegen das Prinzip verstoßen, das er dem System sonst attestiert: keine Änderung an einer Kontrolle ohne reproduzierten Fall. |
| **F-1** | `node --test` ist keine Voraussetzung für A-1 | **Übernommen.** Entscheidend sind fallspezifische Oracles; F-1 vom kritischen Pfad genommen. |
| **F-4** | Blockliste ist zu leicht umgehbar | **Übernommen.** Ersetzt durch typisiertes Schema und unveränderliche Prompt-Hierarchie. |
| **§9** | „60–70 % domänenfrei" ist nicht methodisch hergeleitet | **Übernommen.** Zahl zurückgenommen, Messverfahren vorgeschlagen. |
| **§11** | Titan-Reject belegt nicht, dass Games die falsche Domäne sind | **Übernommen.** Die Beweisführung war fehlerhaft. Die verbleibende These ist auf eine Grenznutzenaussage verengt und als Hypothese gekennzeichnet. |
| **§11** | Marktaussagen sind nicht belegt | **Übernommen.** Abschnitt 11 vollständig als Meinung/Hypothese gekennzeichnet. |
| **D-3** | Nicht derselbe Parser für alle Parameter | **Deckungsgleich** mit der v1-Empfehlung (`v >= 0` für Zähler, `v > 0` für Budget/Dauer/FPS). Keine Änderung nötig. |

**Bilanz:** 13 Einwände übernommen, 1 Befund zurückgezogen, 1 neuer Befund entstanden. Kein Einwand des Owners musste zurückgewiesen werden.

Das ist das inhaltlich wichtigste Ergebnis dieser Revision: die Gegenprüfung war nicht nur korrigierend, sondern **produktiv**. A-2b — die stillschweigend übersprungene Regressionsprüfung mit direkter Kollision zur D-1-Behebung — wäre ohne den Widerspruch des Owners unentdeckt geblieben, und der Befund ist gefährlicher als der, den er korrigiert hat.

---

## 13. Fazit

Das System ist konzeptionell stärker als seine aktuelle Anwendung. Die Kontrollarchitektur — deterministisches Release Gate, fail-closed Budget, SHA-gebundene Evidence, human-gated Protected Layers — ist überdurchschnittlich durchdacht und in weiten Teilen sauber gebaut.

Nach der Revision ordnet sich der Befundkatalog anders, als v1 ihn sortiert hatte. Die schwerwiegendste Feststellung ist nicht ein Messfehler, sondern eine **offene Tür**: `main` ist ungeschützt, während zwei Workflows mit Schreibrechten pauschal den gesamten Arbeitsbaum committen. Die Aussage „geschützte Layer benötigen separaten Human-Review/Merge" hat auf Git-Ebene derzeit keine technische Entsprechung. Das ist vor jedem weiteren bezahlten Lauf zu schließen.

Darunter liegt ein wiederkehrendes Muster, das alle vier Hauptbefunde verbindet: **Das System besitzt die stärkeren Mechanismen bereits und wendet sie inkonsistent an.** `assertMergedImplementationCommit` beweist Merges — aber nicht im Promotion-Pfad (C-1). Die Capability-Struktur beschreibt Modelle deklarativ — aber nicht ihre Request-Form (B-1). Das Release Gate verlangt unabhängige Evidence — außer beim Experience-Score (A-3). Der Corpus zählt Fälle — aber misst Skripte (A-1). Es fehlt keine Architektur; es fehlt die konsequente Anwendung der vorhandenen Standards auf die Stellen, an denen sie noch nicht gelten.

Die Revision selbst ist dafür ein Beleg in die andere Richtung. Von vierzehn Einwänden des Owners war keiner zurückzuweisen, einer hat einen Befund des Auditors widerlegt, und einer hat einen neuen, gefährlicheren Befund freigelegt. Ein Bericht, der eine solche Gegenprüfung übersteht und dabei besser wird, ist belastbarer als einer, der unwidersprochen bleibt — und das gilt für das auditierte System genauso wie für dieses Dokument.

---

*v1 erstellt im Rahmen eines unabhängigen Architektur-Reviews. Alle Befunde wurden am Quelltext des Stands `7af126e` verifiziert; die reproduzierten Defekte sind in Abschnitt 1 gekennzeichnet. Der Auditor war nicht am Entwurf des Systems beteiligt.*

*v2 überarbeitet nach vollständiger Gegenprüfung durch den Owner gegen Code, GitHub-Repository-Konfiguration und Notion-Stand. Die Repository-Konfigurationsbefunde in C-3 stammen aus der Nachprüfung des Owners und waren dem Auditor nicht zugänglich. Abschnitt 12 dokumentiert alle Abweichungen und ihre Auflösung. Abschnitt 11 ist Meinung, kein Auditbefund.*

*Offen und ausdrücklich nicht geprüft: die Behauptung, das Muster aus A-2b (konditionale Assertions vor Corpus-Zusicherungen) sei auf die eine gefundene Stelle beschränkt. Der empfohlene Meta-Test sollte das klären, bevor der Corpus weiter als Evidenzquelle zitiert wird.*
