# Game Factory

Evidence-driven Game Factory für Web-Games auf GitHub. Die Factory führt Owner-Idee, Build, deterministische Verifikation, Repair/Polish, Release Gate, Evaluation, Controlled Improvement und Owner Review über durable Git-Evidence zusammen.

> Architektur: [ARCHITECTURE.md](ARCHITECTURE.md)  
> Aktueller Gesamtstand: [docs/strategy/PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md](docs/strategy/PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md)

## Aktueller Status — 28.08.2026

**Factory Foundation + Controlled Improvement + Golden Corpus S0–S5 IMPLEMENTATION CLOSED.**

Der nächste PoC-Meilenstein ist kein weiterer Architektur-Layer, sondern der unabhängige Product Proof aus GitHub Issue `#17`.

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
  -> bounded Analysis
  -> maximal ein inaktiver Candidate
  -> separate Validation / Regression
  -> human-gated Application/Promotion
```

Nur `validated && active` Learning darf in Production-Prompts sichtbar werden. Automatic Learning darf nicht validieren, aktivieren, promoten, Production editieren oder Gates schwächen.

S4 ergänzt für Non-Prompt-/Code-/Policy-Verbesserungen einen SHA-gebundenen `APPLIED-CLOSED` Application Receipt. Dieser Receipt aktiviert keinen Candidate.

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

Vor dem nächsten Paid Production Run gilt zwingend:

1. unabhängigen Owner Brief vorbereiten;
2. zero-paid deterministic Preflight durchführen;
3. Brief + normalisierte Interpretation + Verifier Coverage + Risiken + Kostenrahmen dem Owner vorlegen;
4. **STOP für explizite Owner-Freigabe**;
5. danach genau einen Paid Production Canary;
6. Owner hands-on ACCEPT/REJECT.

Ein Brief für diesen Preflight darf nicht unter `ideas/**` committed werden, bevor der Paid Run autorisiert ist, weil der Production-Workflow auf Änderungen in `ideas/**` reagieren kann.

## Proof Boundary

Aktuell gerechtfertigt: **evidence-driven controlled improvement**.

Noch nicht bewiesen:

- realer model-backed S5 Benchmark-Gewinner;
- automatische Modellpromotion;
- ein validierter + human-applied Learning Candidate, der nachweislich ein späteres Owner-accepted Game verbessert;
- fully self-modifying / self-authorizing Factory.
