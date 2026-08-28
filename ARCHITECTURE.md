# Game Factory — Architektur v2.8 (Studio OS)

Evidence-first Game-Development-Plattform auf GitHub. GitHub ist die executable/durable Source of Truth für Code, Runs, Evidence, Learning-Artefakte, Evaluation und Promotionen. Notion spiegelt Entscheidungen und Status.

Stand: **28.08.2026 — Factory Foundation + Controlled Improvement + Golden Corpus S0–S5 CLOSED; realer Failure → Validated Candidate → Human Application Pfad `APPLIED-CLOSED` demonstriert; Audit-v2 Hardening als separater Change-Track umgesetzt.**

## 1. Architekturprinzipien

1. **LLM-Output ist ein Claim, keine Wahrheit.** Fortschritt entsteht erst durch Evidence.
2. **Fail closed.** Fehlende oder widersprüchliche Nachweise führen nicht zu Release, Learning-Promotion, Benchmark-Promotion oder Provider-Fallback.
3. **Owner Intent ist Vertrag.** Must-Haves/No-Gos und durable Referenzen dürfen downstream nicht still verschwinden.
4. **Modelle sind Worker, keine Control Plane.** Budget, SHA-Binding, Release, Learning und Benchmark-Authority bleiben deterministisch/governed.
5. **Production Factory und Improvement Factory sind getrennt.** Kein ungeprüfter Candidate darf Production beeinflussen.
6. **Provider/Modelle sind austauschbar, soweit ihr deklarierter Request-Contract verifiziert ist.** Kein stiller Challenger- oder Cross-Provider-Fallback.
7. **Promotion/Application ist explizit und reversibel.** Geschützte Layer benötigen separaten Human-Review/Merge und maschinell prüfbare Provenance.
8. **Git-backed Evidence vor unsichtbarer Memory.** Dauerhafte Claims brauchen nachvollziehbare Provenance.
9. **Keine neue Kontrollkomponente ohne reproduzierten Failure Mode.**
10. **Kein Paid Game- oder model-backed Benchmark-Run ohne separate Owner-Freigabe.**
11. **Learning generalisiert Regeln, nicht Einzelfallnamen.**

Authority Order:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Validated Active Memory Lesson`

Golden Corpus und Benchmark-Ergebnisse liefern Evidence, aber keine Production-Authority.

## 2. Schichten

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
   GitHub Actions -> SHA binding -> budgets -> gates -> durable runs/evidence
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

Der LLM-basierte Experience-Score bleibt als qualitative Product-Evidence sichtbar und kann Polish steuern, ist aber **advisory / non-authoritative**. Auditor und qualitative Playtester-Fidelity sind ebenfalls advisory. Kein LLM kann allein einen Release freigeben.

## 4. Owner Contract / Product Truth

`factory/src/contract/owner.mjs` bewahrt Rohbrief, SHA/Provenance und stabile Owner-Anforderungen.

- explizite Must-Haves -> stabile `MH-*` Requirements;
- explizite No-Gos -> stabile `NG-*` Constraints;
- mehrdeutige/freeform Inhalte werden konservativ bewahrt;
- Director erhält Raw Owner Idea + Owner Contract;
- Traceability verlangt genau ein Acceptance Criterion und eine unterstützte Verifier-Probe je harter Owner-Anforderung;
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

### Prompt-Lesson Promotion

Prompt-Lesson-Promotion akzeptiert nicht mehr nur die Behauptung `approvalKind=human-merge`. Der Lifecycle verlangt:

- einen gültig geformten GitHub-PR-Ref;
- einen vollständigen Git-Commit-SHA, der in aktuellem `HEAD` enthalten ist;
- SHA-256 des validierten Candidate-Artefakts;
- Nachweis, dass exakt dieses Candidate-Artefakt im angegebenen Commit enthalten ist.

Direktes Erzeugen aktiver Lessons über `memory/store.mjs` ist entfernt.

### Git-seitige Protected-Path-Grenze

Production- und Review-Workflows:

- verwenden explizite Commit-Allow-Lists statt pauschalem `git add -A`;
- prüfen vor Commit, dass kein Protected Path verändert wurde;
- prüfen staged Evidence auf bekannte Secret-Formate;
- besitzen `CODEOWNERS` für geschützte Pfade.

**Wichtig:** Diese Code-seitige Schranke ersetzt keine GitHub-Branch-Protection. Solange `main` repository-seitig nicht protected ist und Pflichtreview ohne Actions-Bypass erzwingt, bleibt C-3 administrativ offen.

## 7. Real Learning Proof — Lumen Current

Paid Production Canary #1 (`33207019862`) scheiterte vor Build, weil der Director produzierte:

```text
PR-MH-03 -> state_reached: restored
PR-MH-04 -> state_reached: glass_breach
```

Der Verifier blockierte vor Engineer-Spend. Der reparierte Learning-Pfad klassifiziert deterministisch:

`director-verifier-state-contract-mismatch`

Die generalisierte Regel lautet:

**`state_reached` verwendet nur das endliche Verifier-Protokoll; thematische Zustände gehören in Events/UI/World-State-Daten.**

Der reale Fehler ist zusätzlich als unveränderliche Historical-Regression-Fixture gebunden. Die Fixture enthält Origin-Run, Evidence-Commit und Git-Blob-SHAs. Der Test hängt nicht mehr konditional von einem später löschbaren `runs/`-Verzeichnis ab.

Historische Application Closure:

- PR `#36`;
- Merge `7af126e3300b23c19bd088ca32c08c7e81947d8b`;
- Post-Merge Verifier `33211092911` SUCCESS;
- Receipt `learning/applications/candidate-production-run-b37ac8d268e8549c.json` = `APPLIED-CLOSED`.

Der Candidate bleibt `validated`, `active=false`.

## 8. Golden Factory Evaluation Corpus — S0–S5

Golden Corpus ist Evaluation/Evidence, keine zweite Control Plane und kein Weight Training.

### S0 — Registry + Coverage
Typed Case Schema, durable Seed Registry, Provenance-Prüfung und Coverage Baseline.

### S1a/S1b — Executable Cases + bounded sibling variance
Fallakten besitzen executable Expected-Outcome-Semantik und dokumentierte Nachbarvarianten.

### S2 — Evaluation Runner + Quality Delta
Der aktuelle Runner führt **29 registrierte Fälle über 8 eindeutige Selftest-Skripte** aus. Deshalb gilt:

- `29 Fälle` beschreibt die Fall-/Buchhaltungsgranularität;
- `8 unabhängige Skriptausführungen` beschreibt die aktuelle unabhängige Messgranularität;
- `29/29` darf nicht isoliert als 29 unabhängige Beobachtungen kommuniziert werden.

Fallspezifische Oracles für alle Fälle bleiben ein separater Corpus-Hardening-Track.

### S3 — Evaluation Failure Intake
Kompatible Corpus-Mismatches können analysis-only in Controlled Improvement eingehen; Candidates bleiben inaktiv.

### S4 — Non-Prompt Application Receipt
`learning-application-receipt-v1` bindet Candidate SHA, Target Layer/Scope, Human Approval, PR/Merge, Validation, Post-Merge Regression und Corpus-Evidence. `APPLIED-CLOSED` aktiviert keinen Candidate.

### S5 — System Configuration Benchmark
Vergleichseinheit:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

S5 liefert gepinnte Config-SHAs, Development/Holdout-Isolation, separate Oracles, bounded Trials, Trace Attribution, Kosten/Latenz und advisory `human-review-required` Authority. Ein model-backed S5 Run benötigt separate Owner-Autorisierung.

## 9. Model / Provider Layer

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

Der Adapter darf diese Semantik nicht mehr aus `provider.id` ableiten. Ein zero-paid Contract-Test läuft über jeden Registry-Eintrag. Nicht real verifizierte Provider-Contracts werden als `unverified` markiert und nicht als bestätigte Kompatibilität dargestellt.

Transport-Retry:

- eindeutig pre-delivery DNS/Connect/TLS -> Reservation freigeben, Retry erlaubt;
- Timeout/Abort, `ECONNRESET` und unklare Zustellung -> konservatives Settlement, `accountingComplete=false`, kein weiterer Paid Call.

## 10. Generated-Code Isolation

`assemble.mjs` schützt gegen vorzeitiges Schließen von `<script>` und `<style>` durch generierte Inhalte. Die Produktseite trägt eine restriktive CSP mit blockierten externen Verbindungen und Fremdressourcen.

Langfristiges Zielbild bleibt eine **separate Origin für untrusted generated code**. CSP ist die sofort wirksame Schutzschicht, auch bei direkter Navigation zur Produkt-URL.

## 11. Current Gaming Milestone

Issue `#17` bleibt offen. Lumen Canary #1 erreichte keinen spielbaren Draft; hands-on Owner ACCEPT/REJECT bleibt für einen unabhängigen Post-Repair-Canary offen.

Vor einem zweiten Paid Production Canary:

1. exakten Brief, Coverage, Risiken und Kostenrahmen erneut vorlegen;
2. `main` repository-seitig als protected erzwingen;
3. **STOP für frische explizite Owner-Freigabe**;
4. höchstens einen Paid Canary ausführen;
5. Owner hands-on ACCEPT/REJECT;
6. Evidence klassifizieren, bevor weitere Architekturänderungen folgen.

## 12. Cross-Domain Portability Hypothesis

Potenziell wiederverwendbares Pattern:

`Intent/Contract -> Worker -> Observable Evidence -> Deterministic/Governed Gate -> Failure Taxonomy -> Candidate Improvement -> Validation Corpus -> Human Application -> Audit Trail`

Cross-Domain-Portabilität bleibt eine begründete Hypothese, keine gemessene Kennzahl und keine außerhalb Gaming bewiesene Produktbehauptung.

## 13. Proof Boundary

Aktuell gerechtfertigt: **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

Nicht gerechtfertigt:

- vollständige GitHub Protected-Branch-Enforcement, solange die Admin-Einstellung nicht aktiviert ist;
- 29 voneinander unabhängige Corpus-Beobachtungen;
- fully self-modifying/self-authorizing Factory;
- realer model-backed Benchmark-Gewinner;
- automatische Production-Model-Promotion;
- nachgewiesener Learning-Impact auf ein später Owner-akzeptiertes Spiel;
- bewiesene Cross-Domain-Portabilität.
