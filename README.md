# Game Factory

Eine evidence-driven Game Factory für Web-Games auf GitHub. Die Factory führt Idee, Build, deterministische Verifikation, Repair/Polish, Release Gate und Owner Review über durable Git-Evidence zusammen.

> Architektur & Entscheidungen: [ARCHITECTURE.md](ARCHITECTURE.md)  
> Audit-/Umsetzungsstatus: [docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md](docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md)

---

## Production Flow

```text
Owner Idea
  -> Owner Contract (stabile Must-Haves / No-Gos / Unknowns)
  -> Director
  -> Engineer
  -> deterministic Verifier + Product Fidelity
  -> Repair / Rebuild wenn erforderlich
  -> Playtester / Experience
  -> Polish wenn erforderlich
  -> deterministic Release Gate
  -> Owner Preview / Review
```

Der bindende Release Gate verwendet ausschließlich:

```text
Technical PASS
+ Product Fidelity PASS
+ Experience >= Threshold
+ Budget PASS
```

Auditor- und qualitative Playtester-Fidelity-Urteile bleiben advisory und besitzen keine Release Authority.

## Controlled Improvement

Factory-Learning ist bewusst von der Production Authority getrennt:

```text
Durable Run / Owner / Evaluation-Failure Evidence
  -> deterministic Aggregate
  -> deterministic Trigger
  -> wenn erlaubt: bounded Improvement Analysis
  -> maximal ein inaktiver Candidate
  -> separate Validation / Regression
  -> human-gated Promotion bei geschützten Layern
```

Wichtig:

- `/reject` oder `/feedback` erzeugt **keine sofort aktive Production-Lesson**.
- Nur `validated && active` Learning darf in Production-Prompts sichtbar werden.
- Automatische Orchestrierung darf Candidates erzeugen, aber nicht selbst validieren oder aktivieren.
- Wiederkehrende Engineering-Learnings benötigen dieselbe Failure-Signatur über mindestens zwei unabhängige Runs.
- Ein Golden-Corpus-Fehler erhält zunächst nur analysis-only Evidence. Erst dieselbe Signatur in mindestens zwei getrennten Evaluation-Beobachtungen darf genau einen stabilen, inaktiven Candidate erzeugen.
- Die Factory wird deshalb als **evidence-driven controlled improvement** beschrieben, nicht als bereits vollständig self-improving.

## Production Credentials

Der freigegebene GitHub-Actions-Production-Workflow bietet aktuell zwei Provider-Lanes:

| Provider | Production Secret |
|---|---|
| `openai` | `OPENAI_PRODUCTION` |
| `openrouter` | `OPENROUTER_PRODUCTION` |

Für spätere getrennte OpenRouter-Arbeit existieren zusätzlich die isolierten Trust-Lanes:

- `OPENROUTER_BENCHMARK`
- `OPENROUTER_IMPROVEMENT`

Benchmark/Improvement fallen nicht still auf Production Credentials zurück. Secret-Werte gehören ausschließlich in GitHub Actions Secrets und niemals in Code, Issues oder Evidence.

## Model Routing

Der kanonische Routing-Stack liegt unter `factory/src/llm/`:

- `router.mjs`
- `provider-registry.mjs`
- `model-registry.mjs`
- `client.mjs`

Aktuelle OpenAI-Production-Defaults:

| Rolle | Default |
|---|---|
| Director | `gpt-5.6-terra` |
| Engineer | `gpt-5.6-terra` |
| Playtester | `gpt-5.6-terra` |
| Auditor | `gpt-5.6-luna` |

Ein registrierter OpenRouter-Challenger ist `deepseek/deepseek-chat-v3.1`; er ist **kein automatischer Production Default**. Unknown Provider/Model, fehlende Credentials und Capability Mismatches fail closed. Es gibt keinen automatischen Cross-Provider-Fallback.

## Ein Spiel produzieren lassen

1. Repo -> **Actions** -> **Produce Game** -> **Run workflow**.
2. Optional eine Idee eingeben oder die vorhandene Idea-Quelle verwenden.
3. Freigegebenen Production Provider wählen: `openai` oder `openrouter`.
4. Run-Budget festlegen.
5. Nach erfolgreicher Pipeline entsteht ein Review-Issue mit Preview und Evidence.

### Owner Review

| Kommentar | Wirkung |
|---|---|
| `/approve` | verifizierten Kandidaten veröffentlichen |
| `/reject Grund...` | Produkt ablehnen und immutable Owner-Evidence erfassen |
| `/feedback Text...` | Evidence erfassen, ohne Produktentscheidung zu erzwingen |

## Budget / Cost Gate

`GF_BUDGET_USD` ist ein fail-closed Run-Budget und nicht nur eine nachträgliche Anzeige.

Der Cost-Kernel:

- erfasst Input-, Cached-Input- und Output-Tokens getrennt;
- nutzt provider-reported Cost, wenn belastbar vorhanden;
- berechnet andernfalls Kosten aus expliziten versionierten Model-Rates;
- unterstützt explizite Pricing-Overrides für konfigurierte OpenAI-kompatible/self-hosted Modelle;
- reserviert die maximal erwartbaren Kosten **vor** einem Paid Call;
- blockiert einen Call, wenn er nicht mehr ins verbleibende Budget passt;
- blockiert bei unbekannter Model-Pricing-Information vor Transport;
- behandelt fehlende/unsichere Usage niemals als `$0`: die konservative Reservation wird angesetzt, Accounting wird unvollständig markiert und weitere Paid Calls werden blockiert.

Provider-seitige Spend-/Credit-Limits bleiben trotzdem die **letzte externe Sicherheitsgrenze**, weil lokale Budget-Logik einen Provider- oder Billing-Fehler nicht kontrollieren kann.

Relevante optionale Limits umfassen außerdem getrennte Repair-, Polish- und Fresh-Rebuild-Budgets/Call-Caps.

## Ideen einreichen

- Datei: `ideas/meine-idee.md` (Vorlage: `ideas/_TEMPLATE.md`)
- oder als Input im `Produce Game` Workflow

## Zentrale Konfiguration

| Variable | Default / Bedeutung |
|---|---|
| `GF_LLM_PROVIDER` | Production Provider; Workflow erlaubt `openai` / `openrouter` |
| `GF_MODEL` | optionaler globaler Model Override |
| `GF_MODEL_<ROLE>` | optionaler Role Override |
| `GF_MODEL_ENGINEER_<OPERATION>` | optionaler Engineer-Operation Override |
| `GF_MIN_SCORE` | Experience Threshold, default `6.5` |
| `GF_BUDGET_USD` | Run-Budget, default `$10` |
| `GF_MAX_POLISH_ROUNDS` | maximale Polish-Runden |

Model-/Provider-/Pricing-Konfiguration bleibt fail closed und wird über die Registry-/Router-Tests abgesichert.

## Verifikation

`.github/workflows/verify.yml` führt den vollständigen Selftest aus, darunter:

- Control Kernel / Budget / Release Gate
- Provider-/Model-Routing und Credential-Isolation
- Owner Contract Decomposition
- Controlled-Learning Lifecycle + Cross-Run Trigger + Orchestration
- Golden Corpus S0–S3: Registry, Case Contract, Quality/Delta und analysis-only Evaluation-Failure Intake
- Production-Agent-/Prompt-Integrity
- Product Fidelity
- deterministische Idle-Control, Input-Kausalität und Visual Activity
- Good/Bad Verifier Fixtures
- Publishing Safety

## Proof Boundary

Technisch implementiert und regressionsgeprüft ist **evidence-driven controlled improvement**. Noch nicht nachgewiesen ist die stärkere Aussage, dass ein realer Candidate nach unabhängiger Validation und Human Promotion ein späteres Owner-accepted Game messbar verbessert. Diese Behauptung darf erst nach einem entsprechenden Real-World-Proof erhoben werden.
