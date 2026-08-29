# Game Factory — Architektur v3.0 (Studio OS)

Evidence-first Game-Development-Plattform auf GitHub. GitHub ist die executable/durable Source of Truth für Code, Runs, Evidence, Learning-Artefakte, Evaluation und Promotionen. Notion spiegelt Entscheidungen und Status.

Stand: **29.08.2026 — Architecture Audit v2 intern vollständig reconciled; PR #40 auf `main` gemerged und exact-main verifiziert; Repository-Ruleset `Protect main` live aktiv; Factory aus Architektur-/Governance-Sicht Canary-ready, unabhängiger Re-Audit ausdrücklich noch erwünscht.**

Kein Paid Product Canary und kein model-backed Benchmark ist durch diesen Status autorisiert.

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release, Learning-Promotion, Benchmark-Promotion oder Provider-Fallback.
3. **Owner Intent ist Vertrag.** Must-Haves/No-Gos und durable Referenzen dürfen downstream nicht still verschwinden.
4. **Modelle sind Worker, keine Control Plane.** Budget, SHA-Binding, Release, Learning und Benchmark-Authority bleiben deterministisch/governed.
5. **Production Factory und Improvement Factory sind getrennt.** Kein ungeprüfter Candidate darf Production beeinflussen.
6. **Provider/Modelle sind nur innerhalb ihres deklarierten Request-Contracts austauschbar.** Kein stiller Challenger- oder Cross-Provider-Fallback.
7. **Promotion/Application ist explizit und reversibel.** Geschützte Layer benötigen Human Review/Merge und maschinell prüfbare Provenance.
8. **Git-backed Evidence vor unsichtbarer Memory.** Dauerhafte Claims brauchen nachvollziehbare Provenance.
9. **Keine neue Kontrollkomponente ohne reproduzierten Failure Mode.**
10. **Kein Paid Game- oder model-backed Benchmark-Run ohne separate Owner-Freigabe.**
11. **Learning generalisiert Regeln, nicht Einzelfallnamen.**
12. **Code Authority und Runtime State sind getrennt.** `main` ist autoritativ; `runtime-state` ist durable, aber nicht autoritativ.
13. **Corpus-Fälle zählen nur als unabhängige Beobachtungen, wenn jeder Fall einen eigenen adressierbaren Oracle-Lauf besitzt.**
14. **Dokumentation besitzt eine explizite Authority-Kette.** Alte Snapshots dürfen aktuelle Architektur nicht still überschreiben.

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Validated Active Memory Lesson`

Golden Corpus und Benchmark-Ergebnisse liefern Evidence, aber keine Production-Authority.

## 2. Systemschichten

```text
L7 PRODUCT / OWNER
   Idea -> Owner Contract -> Owner Review -> Approve / Reject / Feedback

L6 PRODUCTION LINE
   Director -> Engineer -> Repair/Rebuild -> Playtester -> Polish -> Auditor -> Draft

L5 EVIDENCE & QUALITY
   Technical Verifier -> Product Fidelity -> Advisory Experience -> Budget -> Release Gate

L4 EVALUATION
   Golden Corpus S0-S3 -> Regression / Quality Delta -> Evaluation Failure Intake
   S4 Application Receipt -> S5 System Configuration Benchmark Contract

L3 IMPROVEMENT FACTORY
   Raw Evidence -> Aggregate -> Trigger -> Root Cause / Analysis -> Candidate
   -> Validation -> Validated Inactive -> Human Application/Promotion -> Audit Closure

L2 MODEL / PROVIDER
   Role/Operation Router -> Model Registry -> Request Contract -> Provider Registry -> Adapter -> Credential Lane

L1 CONTROL KERNEL
   protected main authority -> GitHub Actions -> runtime-state evidence -> SHA binding -> budgets -> gates
```

## 3. Production Factory und Release Authority

```text
Owner Idea
 -> immutable Owner Contract
 -> Director GDD + requirement/probe mapping
 -> Engineer Build
 -> deterministic Technical + Product Fidelity verification
 -> bounded Repair/Rebuild when needed
 -> independent Playtester Experience review
 -> bounded Polish from verified baseline
 -> full re-verification
 -> advisory Auditor
 -> deterministic Budget + Release Gate
 -> Draft / Review Issue
 -> Owner hands-on review
```

Binding release rule:

`Technical PASS + Product Fidelity PASS + Budget PASS`

Der LLM-basierte Experience-Score bleibt qualitative Product-Evidence und kann Polish steuern, ist aber **advisory / non-authoritative**. Auditor und qualitative Playtester-Fidelity sind ebenfalls advisory. Kein LLM kann allein Release-Authority ausüben.

Ein technischer Release-PASS ist nicht identisch mit Owner Product Acceptance.

## 4. Owner Contract / Product Truth

`factory/src/contract/owner.mjs` bewahrt Rohbrief, SHA/Provenance und stabile Owner-Anforderungen.

- explizite Must-Haves -> stabile `MH-*` Requirements;
- explizite No-Gos -> stabile `NG-*` Constraints;
- mehrdeutige/freeform Inhalte werden konservativ bewahrt;
- Director erhält Raw Owner Idea + Owner Contract;
- Traceability verlangt Acceptance Criterion und unterstützte Verifier-Probe je harter Owner-Anforderung;
- Idea-File-Ingestion bewahrt exakte Bytes für `ownerBriefSha256`.

## 5. Verifier / Product Fidelity

Implementiert und regressionsgeprüft:

- Technical Verification;
- Product Fidelity Evidence Authority;
- Proof-Plan Reachability vor Engineer-Spend;
- Generic Action Reachability;
- endliches Verifier-State-Protokoll über `verifierStateContract()`;
- Terminal-State Proof und Restart Observation;
- unabhängige HUD/Layout-Geometrie;
- Active-vs-Idle Causality Control;
- Inter-Frame Visual Activity;
- Flat-Frame/visuelle Varianzprüfung ohne geratene Background-Farbe;
- Good/Bad Product Negative Controls;
- Publishing Integrity und XSS Gates.

Generated self-attestation ist keine ausreichende unabhängige Evidence. Product-spezifische semantische Labels sind nicht automatisch technische Verifier-States.

Proof-Dauer besitzt nur über das typisierte Feld `probePlan.roundSeconds` Autorität. Prosa wird dafür nicht geparst. Ungültige typisierte Werte scheitern fail-closed; fehlende Werte verwenden einen sicheren Maximalrahmen.

## 6. Controlled Improvement / Protected Layers

Lifecycle:

`durable evidence -> deterministic aggregate -> deterministic trigger -> bounded analysis/root cause -> inactive candidate -> explicit validation -> validated inactive -> human-gated application/promotion -> reversible/auditable state`

Safety invariants:

- `/reject` und `/feedback` erzeugen keine aktiven Lessons;
- Production Prompt Memory benötigt `status=validated && active=true`;
- automatische Analyse darf nicht validieren, aktivieren, promoten, Production editieren oder Gates schwächen;
- automatische Learning-Pfade starten keine Paid Retries;
- Candidate-State und angewandter Production-Code/Policy-State bleiben getrennt.

Protected Layers:

`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`, `evaluation`.

### Capability split

Automatic Analysis importiert nur die sichere Proposal Capability:

- Candidate lesen;
- inaktiven Candidate erzeugen.

Privilegierte Lifecycle-Fähigkeiten liegen separat:

- validate;
- promote;
- deactivate;
- Application Receipt schließen.

Diese Trennung ist auf Modul-/Caller-Ebene strukturell und regressionsgeprüft. Sie ist **kein OS-/Prozess-Sandbox-Versprechen**.

### Prompt/Lesson Promotion

Promotion akzeptiert nicht nur die Behauptung `approvalKind=human-merge`. Der Lifecycle bindet:

- gültigen GitHub-PR-Ref;
- vollständigen Git-Commit-SHA im aktuellen History-Pfad;
- SHA-256 des validierten Candidate-Artefakts;
- Nachweis, dass exakt dieses Candidate-Artefakt im angegebenen Commit enthalten ist.

Direktes Erzeugen aktiver Lessons über `memory/store.mjs` ist entfernt.

Production Lessons verwenden `learning-lesson/v2`, sind in Anzahl und Direktivenlänge begrenzt und werden explizit unterhalb höherer Prompt-/Governance-Authority serialisiert.

## 7. Git Authority / Runtime State

Die Git-seitige Authority ist zweigeteilt:

- `main` = autoritativer Code-, Prompt-, Skill-, Verifier-, Control- und Policy-Stand;
- `runtime-state` = nicht-autoritative durable Runs, Drafts, Products, Archive, Memory, Learning-Evidence und Evaluation-Resultate.

Production und Review:

1. checken explizit `main` aus;
2. validieren `runtime-state` gegen erlaubte State-Pfade;
3. laden erlaubten State lokal in den autoritativen Main-Code;
4. führen Production/Review mit Code aus `main` aus;
5. stage'n nur explizit erlaubte Runtime-/Evidence-Pfade;
6. prüfen staged Evidence auf bekannte Secret-Formate;
7. pushen ausschließlich `HEAD:runtime-state`.

Erlaubte State-Pfade:

`runs/`, `drafts/`, `products/`, `archive/`, `memory/`, `learning/`, `evaluation/results/`.

Production und Review teilen die Concurrency-Gruppe `game-factory-runtime-state`.

### Repository enforcement

C-3 ist live geschlossen.

Ruleset `Protect main`:

- id `21788078`;
- enforcement `active`;
- target exakt `refs/heads/main`;
- Pull Request vor Merge erforderlich;
- GitHub Actions Check `selftest` erforderlich;
- Deletions blockiert;
- Non-fast-forward/Force Pushes blockiert;
- Bypass-Liste leer;
- `current_user_can_bypass = never`;
- GitHub meldet `main` als `protected: true`.

`required approving reviews = 0` ist im aktuellen Single-Owner-Modell bewusst gesetzt, um keinen Self-Review-Deadlock zu erzeugen. Dieser Governance-Trade-off ist für den externen Re-Audit ausdrücklich sichtbar.

## 8. Budget und persistenter State

Der Cost Ledger ist run-scoped über `AsyncLocalStorage`; parallel laufende async Runs dürfen Budgetzustand nicht überschreiben.

Memory-Updates verwenden Locking, Re-Read unter Lock, atomaren Replace und Recovery-/Concurrency-Tests. Dies ist ein transactional/concurrency-safe Store, **kein behaupteter append-only Event Store**.

Unklare Provider-Zustellung bleibt bei Kosten konservativ fail-closed.

## 9. Golden Factory Evaluation Corpus — S0–S5

Golden Corpus ist Evaluation/Evidence, keine zweite Control Plane und kein Weight Training.

### S0/S1

Typed Registry, Provenance, executable Expected Outcomes und bounded sibling variants.

### S2

Aktueller Contract:

- **34 aktive Corpus-Fälle**;
- **34 unabhängige fallbezogene Beobachtungen**;
- **9 Oracle-Implementierungsdateien**;
- `independentObservationCount` ist bindend;
- `observationDeficit > 0` scheitert fail-closed;
- 5 reale Production-derived `historical-regression`-Fälle mit Origin-/Fix-Provenance.

Historical Regressions:

1. Harbor Repair Regression;
2. Harbor Proof-Plan Unreachability;
3. Lumen Director State Contract;
4. Provider token-parameter request failure;
5. Provider unsupported-temperature request failure.

Provider-Regressions replayen Request Construction und sind **kein** Live-Kompatibilitätsnachweis.

### S3/S4

Evaluation Failures können analysis-only in Controlled Improvement einfließen. S4 Application Receipts binden Candidate, Human Application, Merge, Validation und Post-Merge Regression. `APPLIED-CLOSED` aktiviert keinen Candidate.

### S5

Vergleichseinheit:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation + Sampling`

Sampling ist gepinnt. Resultate berichten Trials, Varianz/Standardabweichung und 95%-Unsicherheit. Ein model-backed S5 Run benötigt separate Owner-Autorisierung. Ein realer Benchmark-Gewinner ist aktuell **nicht** nachgewiesen.

## 10. Model / Provider Layer

Canonical Runtime Stack:

- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`
- `factory/src/llm/adapters/openai-compatible-chat.mjs`
- `factory/src/llm/client.mjs`

Die Request-Form wird pro Modell deklarativ über `requestShape` definiert:

- Token-Parameter;
- Temperature-Support;
- JSON-Mode;
- Herkunft/Verifikationsstatus des Contracts.

Der Adapter darf diese Semantik nicht aus `provider.id` ableiten. Ein zero-paid Contract-Test läuft über Registry-Einträge.

Nicht live verifizierte Provider-Contracts werden nicht als bestätigte Kompatibilität dargestellt.

Transport-Retry:

- eindeutig pre-delivery DNS/Connect/TLS -> Reservation freigeben, Retry erlaubt;
- Timeout/Abort, `ECONNRESET` und unklare Zustellung -> konservatives Settlement, `accountingComplete=false`, kein weiterer Paid Call.

## 11. Binary Evidence

Binary Screenshots/Media werden nicht als gewöhnlicher Runtime-Git-State fortgeschrieben.

- SHA-Manifest bindet Pfad, Hash und Bytes;
- GitHub Actions Artifact ist der aktuelle Binärspeicher;
- Retention ist explizit begrenzt, aktuell 30 Tage;
- Binary Evidence wird vor Runtime-State-Git-Staging entfernt;
- staged-state policy lehnt Binärdateien ab.

**Wichtige Boundary:** Das ist bounded-retention object storage, kein permanentes Archiv. Ob 30 Tage den gewünschten Audit-Horizont erfüllen, ist eine offene Residual-Risk-Frage für den unabhängigen Auditor.

## 12. Generated-Code Isolation

Generated Code ist gegen Tag-Terminator-Injection geschützt und wird für Preview/Publishing in einen Host-Wrapper gebunden.

Der Game-Payload läuft in einem sandboxed `srcdoc` iframe:

- `sandbox="allow-scripts"`;
- kein `allow-same-origin`;
- dadurch opaque browser origin;
- restriktive Child-CSP / externe Netzwerkverbindungen blockiert;
- Host bindet verifizierten Candidate SHA.

**Boundary:** Das ist Browser-Origin-Isolation, nicht ein separat deploytes DNS/Domain. Eine physisch getrennte Hosting-Origin bleibt Defense-in-Depth-Option.

## 13. Maintainability und Dokument-Authority

Critical Control/Evaluation/Learning/Isolation Modules unterliegen einem deterministischen Style Gate im Full Verifier.

**Boundary:** Es gibt keinen Anspruch, dass das gesamte Repository mit ESLint/Prettier formatiert oder auf `node --test` migriert ist.

Strategie-Dokumente besitzen eine zentrale Authority-/Supersedes-Kette:

- `docs/strategy/STATUS-CHAIN.json`;
- `docs/strategy/INDEX.md`.

Unlisted dated snapshots sind standardmäßig historical/non-authoritative.

Canonical Audit-Reconciliation:

`docs/strategy/ARCHITECTURE-AUDIT-V2-FINAL-RECONCILIATION-2026-08-29.md`

## 14. Legal Status

Repository enthält `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS` und Root `LICENSE`.

Aktueller Lizenzstatus:

**NO LICENSE GRANTED / All rights reserved.**

Es wurde keine permissive/Open-Source-Lizenz auf Owner-Seite erfunden. Eine spätere Distribution-/Reuse-Lizenz ist eine separate Owner-/Legal-/Business-Entscheidung.

## 15. Real Learning Proof — Lumen Current

Paid Production Canary #1 (`33207019862`) scheiterte vor Build an einem Director-to-Verifier State Contract Mismatch.

Der Verifier blockierte vor Engineer-Spend. Die generalisierte Regel lautet:

**`state_reached` verwendet nur das endliche Verifier-Protokoll; thematische Zustände gehören in Events/UI/World-State-Daten.**

Der reale Fehler ist als immutable Historical Regression gebunden.

Historical Application Closure:

- PR `#36`;
- Merge `7af126e3300b23c19bd088ca32c08c7e81947d8b`;
- Post-Merge Verifier `33211092911` SUCCESS;
- Application Receipt = `APPLIED-CLOSED`;
- Candidate bleibt `validated`, `active=false`.

## 16. Current Gaming Milestone

Issue `#17` bleibt offen, weil der post-repair unabhängige Product Proof noch keinen spielbaren Draft für hands-on Owner ACCEPT/REJECT erreicht hat.

Das ist **kein offener Architecture Audit v2 Finding**.

Vor einem weiteren Paid Canary:

1. unabhängigen Re-Audit auswerten;
2. falls kein Canary-blocking Finding entsteht: Brief, Coverage, Risiken und Kostenrahmen vorlegen;
3. **STOP für frische explizite Owner-Freigabe**;
4. höchstens den autorisierten Paid Run ausführen;
5. Owner hands-on ACCEPT/REJECT;
6. Evidence vor weiteren Architekturänderungen klassifizieren.

## 17. Cross-Domain Portability Hypothesis

Potenziell wiederverwendbares Pattern:

`Intent/Contract -> Worker -> Observable Evidence -> Deterministic/Governed Gate -> Failure Taxonomy -> Candidate Improvement -> Validation Corpus -> Human Application -> Audit Trail`

Cross-Domain-Portabilität bleibt eine begründete Hypothese, keine gemessene Kennzahl.

## 18. Proof Boundary und Rest-Risiken

Intern gerechtfertigt:

- **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**;
- 34/34 unabhängige zero-paid Corpus-Beobachtungen;
- fünf explizite historische Production-Regressionsfälle;
- repository-internes Audit-v2 Hardening auf `main` exact-main grün;
- `main` live durch aktives Ruleset geschützt;
- Architektur-/Governance-Programm intern Canary-ready.

Explizite Residuals für unabhängigen Re-Audit:

1. D-1: Binär-Evidence-Retention ist bounded (30 Tage), nicht permanent;
2. C-2: Privilege Split ist Modul-/Capability-Trennung, kein OS-Sandbox;
3. E-3: opaque Browser-Origin, keine separate DNS/Domain;
4. F-1: Critical-Module Style Gate, kein repo-weites ESLint/Prettier/`node --test`;
5. C-3: Required Approvals = 0 im Single-Owner-Modell;
6. F-3: breitere Distribution-/Reuse-Lizenz nicht gewählt.

Nicht gerechtfertigt:

- fully self-modifying/self-authorizing Factory;
- realer model-backed Benchmark-Gewinner;
- automatische Production-Model-Promotion;
- Live-Kompatibilität jeder registrierten Provider/Model-Kombination;
- nachgewiesener Learning-Impact auf ein später Owner-akzeptiertes Spiel;
- bewiesene Cross-Domain-Portabilität;
- Behauptung, dass ein unabhängiger externer Audit bereits bestanden wurde.

Der nächste Audit soll diese interne Closure ausdrücklich zu widerlegen versuchen.

## 19. Project Game Mode v0.1 — parallele Foundation

Der bestehende Micro-Game-Pfad bleibt unverändert autoritativ für one-shot Spiele. Project Game Mode ersetzt ihn nicht, sondern ergänzt eine getrennte Ausführungsschicht für persistente Multi-File-Projekte:

`Project/Task Contract -> bounded Context -> scoped Operations in Staging -> hierarchical Verification -> atomic verified Baseline -> protected Git PR`

Binding Grenzen:

- Projektquellcode wird durch Git und den protected-main PR-Pfad autoritativ, niemals durch `runtime-state`.
- normale Tasks dürfen `PROJECT.json`, `ROADMAP.json`, `ARCHITECTURE.md`, `.factory/**`, Build Output oder geerbte Regression-Fixtures nicht verändern;
- Project Memory bleibt projektlokal und wird nicht automatisch zu Factory Learning;
- ein Project PASS benötigt deterministische Evidence; LLM-Urteile ersetzen weder Invariants noch Unit-/Integration-/Regression-/Browser-Checks;
- Web ist der erste Runtime Adapter. Owner Authority, Budget, Evidence, Learning und Task Governance bleiben runtime-unabhängig;
- kein autonomer Milestone-Lauf und kein Paid Project Run ist durch die Foundation autorisiert.

Die scoped Architektur, Falsifikation, Implementierungsgrenze und der nächste Handoff sind kanonisch dokumentiert in:

- `docs/strategy/PROJECT-GAME-MODE-V0.1-ARCHITECTURE.md`;
- `docs/strategy/PROJECT-GAME-MODE-V0.1-IMPLEMENTATION-CATALOG.md`;
- `docs/strategy/PROJECT-GAME-MODE-V0.1-FALSIFICATION.md`;
- `docs/strategy/PROJECT-GAME-MODE-V0.1-HANDOFF.md`.
