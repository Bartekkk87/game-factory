# Game Factory

Evidence-driven Game Factory für Web-Games auf GitHub. Die Factory führt Owner-Idee, Build, deterministische Verifikation, Repair/Polish, Release Gate, Evaluation, Controlled Improvement und Owner Review über durable Git-Evidence zusammen.

> Architektur: [ARCHITECTURE.md](ARCHITECTURE.md)  
> Aktueller Gesamtstand: [docs/strategy/PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md](docs/strategy/PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md)  
> Historischer S0–S5 Closure Checkpoint: [docs/strategy/PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md](docs/strategy/PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md)  
> Kanonische Learning-Architektur mit realem Lumen-Beispiel: [docs/strategy/LEARNING-ARCHITECTURE-EVIDENCE-TO-APPLIED-CHANGE-2026-08-28.md](docs/strategy/LEARNING-ARCHITECTURE-EVIDENCE-TO-APPLIED-CHANGE-2026-08-28.md)

## Aktueller Status — 28.08.2026

**Factory Foundation + Controlled Improvement + Golden Corpus S0–S5 CLOSED. Lumen Learning Repair: `APPLIED-CLOSED`.**

Der erste unabhängige Product Canary `Lumen Current` scheiterte vor Build fail-closed. Der daraus abgeleitete Director-State-Contract-/Learning-Fix wurde über einen realen, evidenzgebundenen `skill` Candidate zero-paid validiert und mit PR `#36` human-reviewed nach `main` gemerged (`7af126e3300b23c19bd088ca32c08c7e81947d8b`). Exact-main Full Verifier `33211092911` = **SUCCESS in all 37 steps**. Der S4 Application Receipt ist `APPLIED-CLOSED`; der Candidate bleibt `validated`, `active=false`. Kein zweiter Paid Lumen Run wurde gestartet.

Damit ist erstmals praktisch belegt:

`real Production failure -> durable evidence -> deterministic root cause -> protected-layer Candidate -> validation/regression -> validated inactive -> human merge -> post-merge regression -> APPLIED-CLOSED`

Der noch ausstehende Product-Meilenstein bleibt Issue `#17`: ein späterer spielbarer unabhängiger Canary mit hands-on Owner ACCEPT/REJECT.

## Production Flow

```text
Owner Idea
  -> Owner Contract
  -> Director
  -> Engineer
  -> deterministic Verifier + Product Fidelity
  -> Repair / Rebuild falls nötig
  -> Playtester / Experience
  -> Polish falls nötig
  -> deterministic Release Gate
  -> Owner Preview / Review
```

Binding Release:

`Technical PASS + Product Fidelity PASS + Experience >= Threshold + Budget PASS`

Auditor und qualitative Fidelity-Urteile bleiben advisory. Kein LLM besitzt Release Authority.

## Controlled Improvement

```text
Durable Run / Owner / Evaluation Evidence
  -> deterministic Aggregate
  -> deterministic Trigger
  -> bounded Analysis / Root Cause
  -> maximal ein inaktiver Candidate
  -> separate Validation / Regression
  -> validated inactive
  -> human-gated Application/Promotion
  -> Post-Merge Regression / Application Closure
```

Nur `validated && active` Learning darf als Memory Lesson in Production-Prompts sichtbar werden. Protected-Layer-Fixes wie Skills/Verifier/Control-Plane können dagegen als human-reviewed Code-/Policy-Anwendung wirksam werden, ohne den Candidate selbst zu aktivieren.

Automatic Learning darf nicht validieren, aktivieren, promoten, Production editieren, Gates schwächen oder einen Paid Retry starten.

S4 ergänzt für Non-Prompt-/Code-/Policy-Verbesserungen einen SHA-gebundenen `APPLIED-CLOSED` Application Receipt. Dieser Receipt aktiviert keinen Candidate.

### Lumen-Beispiel

Der reale Lumen-Fehler war:

```text
PR-MH-03 -> state_reached: restored
PR-MH-04 -> state_reached: glass_breach
```

Beide Werte lagen außerhalb des endlichen Verifier-State-Protokolls. Die Factory blockierte vor Engineer-Spend. Das Learning erkennt diesen Failure-Typ nun deterministisch als `director-verifier-state-contract-mismatch`, mappt ihn auf den Director/`skill` Layer und kann dafür einen inaktiven Candidate erzeugen.

Der generalisierte Skill-Grundsatz lautet: technische `state_reached`-Probes verwenden nur das gelieferte Verifier-Protokoll; thematische Zustände gehören in Gameplay-Events, UI oder World State.

## Golden Factory Evaluation Corpus

Implementiert und Full-Verifier-covered:

- **S0** Registry + Coverage Baseline
- **S1a** executable Case / Oracle Contract
- **S1b** bounded typed sibling variants
- **S2** Evaluation Runner + Quality/Delta
- **S3** analysis-only Evaluation Failure Intake
- **S4** durable Non-Prompt Application Receipt
- **S5** zero-paid System Configuration Benchmark Governance

Aktueller bewiesener Corpus-Stand: **29/29 Expected Outcomes, 0 Mismatches, 0 Critical False PASS**.

S5 vergleicht vollständige Systemkonfigurationen:

`Model + Prompt/Skill + Context Contract + Verifier + Retry + Escalation`

Ein echter model-backed S5 Vergleich wurde noch nicht ausgeführt und kann Production nicht automatisch verändern.

## Production Credentials

| Provider | Production Secret |
|---|---|
| `openai` | `OPENAI_PRODUCTION` |
| `openrouter` | `OPENROUTER_PRODUCTION` |

Separate OpenRouter Trust-Lanes:

- `OPENROUTER_BENCHMARK`
- `OPENROUTER_IMPROVEMENT`

Kein stiller Credential- oder Cross-Provider-Fallback.

## Model Routing

Kanonischer Stack:

- `factory/src/llm/router.mjs`
- `factory/src/llm/provider-registry.mjs`
- `factory/src/llm/model-registry.mjs`
- `factory/src/llm/client.mjs`

Für den nächsten unabhängigen Product Proof bleiben die aktuellen OpenAI-Referenzdefaults bewusst unverändert:

| Rolle | Default |
|---|---|
| Director | `gpt-5.6-terra` |
| Engineer | `gpt-5.6-terra` |
| Playtester | `gpt-5.6-terra` |
| Auditor | `gpt-5.6-luna` |

OpenRouter ist als explizite Provider-Lane implementiert, aber kein Challenger ersetzt automatisch die Production Defaults.

## Budget / Cost Gate

Das Run-Budget ist fail-closed. Kosten werden vor Paid Calls reserviert und anhand Provider-Usage oder expliziter Registry-Pricing-Daten abgerechnet. Unbekannte Preise oder unsichere Usage können weitere Paid Calls blockieren.

Der Production-Workflow verwendet standardmäßig ein maximales Run-Budget von `$10`, sofern der Owner keinen anderen Wert setzt.

## Full Verifier

`.github/workflows/verify.yml` prüft unter anderem:

- Workflow YAML + Node Syntax
- Golden Corpus S0–S5
- Budget / Release Gate
- Provider-/Model-Routing und Credential Isolation
- Owner Contract
- Controlled Learning + Cross-Run Trigger + Orchestration
- Failed-Run Root Cause
- Production-Agent-/Art-Direction-Integrity
- Product Fidelity
- Proof-/Action-Reachability
- Terminal Proof
- HUD Geometry
- Causality / Visual Activity
- Good/Bad Product Controls
- Publishing / XSS

## Independent Product Proof — Issue #17

Lumen Canary #1 wurde nach Owner-GO ausgeführt, erzeugte aber keinen Draft. Daher wurde hands-on Owner ACCEPT/REJECT nicht erreicht. Der daraus folgende zero-paid Learning-/Contract-Fix ist jetzt vollständig `APPLIED-CLOSED`.

Vor einem **zweiten** Paid Lumen/Independent Production Run gilt zwingend:

1. exakten Owner Brief + Verifier Coverage + Risiken + Kostenrahmen erneut vorlegen;
2. **STOP für neue explizite Owner-Freigabe**;
3. danach höchstens einen weiteren Paid Production Canary;
4. Owner hands-on ACCEPT/REJECT.

## Portability hypothesis

Die aktuelle Architektur enthält einen möglicherweise domänenübergreifend wiederverwendbaren Control Pattern:

`Intent/Contract -> Worker -> Observable Evidence -> Deterministic/Governed Gate -> Failure Taxonomy -> Candidate Improvement -> Validation Corpus -> Human Application -> Audit Trail`

Das ist aktuell eine **zu prüfende Hypothese**, keine außerhalb Gaming bewiesene Produktbehauptung. Die Cross-Domain-Analyse ist bewusst als nächster separater Diskussions-/Research-Track vorgesehen.

## Proof Boundary

Aktuell gerechtfertigt: **evidence-driven controlled improvement**.

Zusätzlich praktisch demonstriert: ein realer Production Failure wurde in einen deterministisch klassifizierten, zero-paid validierten, weiterhin inaktiven Protected-Layer Candidate und anschließend in eine human-reviewed, post-merge regressionsgeprüfte `APPLIED-CLOSED` Skill/Contract-Anwendung überführt.

Noch nicht bewiesen:

- realer model-backed S5 Benchmark-Gewinner;
- automatische Modellpromotion;
- dass der Lumen-Fix ein späteres Owner-accepted Game verbessert;
- Cross-Domain-Portabilität außerhalb Gaming;
- fully self-modifying / self-authorizing Factory.
