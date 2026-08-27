# Game Factory — Platform & Model Architecture Decision — 27.08.2026

## Decision status

**APPROVED AS TARGET DIRECTION.** This document records the Owner-approved platform and model strategy. It does not authorize a new paid game Canary and does not by itself change runtime defaults.

## 1. Platform / repository strategy

### PoC phase

The current public `Bartekkk87/game-factory` repository remains acceptable for the active PoC and early architecture validation.

Rationale:
- current work is still proving the Factory architecture and execution chain;
- GitHub remains the durable executable Source of Truth;
- changing hosting/visibility during the active PoC would mix platform migration with learning-system implementation.

### Post-PoC target

The Factory core is **not intended to remain fully public once the PoC is proven**. A dedicated Productionization / IP & Security Gate must evaluate migration to a private platform/repository boundary before the Factory is treated as a commercial or durable proprietary platform.

Target separation:

```text
PRIVATE — Factory Core
  Control Plane
  Improvement / Learning Factory
  Model Router / Policy
  Skills / Prompts
  Verifier / Evaluation
  Engine/API contracts
  Governance / promotion logic

PRIVATE — Production Evidence / Game Projects where appropriate

OPTIONAL PUBLIC — intentionally released showcases
  public demos
  selected games
  deliberately published artifacts
```

Security/IP principle:

> The product may be public without making the machine that produces the product public.

Important caveat: anything already published in a public repository must be treated as previously disclosed. A later visibility change protects future work; it does not retroactively make historical public copies unknown.

### Migration timing

Do **not** migrate platforms in the middle of the current Learning Safety / Improvement Factory implementation unless a concrete security incident requires it.

Preferred order:

`PoC proof -> Learning/Improvement foundation -> Productionization/IP-Security Gate -> private-core migration`

## 2. Model-agnostic Factory principle

The Game Factory is not an "OpenAI Factory". Models are replaceable workers behind stable contracts.

Target principle:

> The Factory chooses models based on task capability, verified outcomes, cost and policy. The strongest model is not automatically the correct model for every task.

The existing architecture already provides the correct foundation:
- Role Router
- Provider Registry
- Model Registry
- OpenAI-compatible provider adapter
- role-level and operation-level route overrides
- budget/cost evidence

Therefore this decision **extends the existing router**. It does not create a second model-routing stack.

## 3. OpenRouter direction

OpenRouter becomes an approved provider lane for controlled model experiments and later production routing.

Initial purpose:
- allow challengers such as DeepSeek and later GLM/open-weight models to be evaluated without redesigning the Factory;
- keep OpenAI models as reference baseline during early comparisons;
- preserve explicit model/provider evidence and fail-closed capability checks.

OpenRouter must not become an opaque decision authority. The Factory owns model policy; OpenRouter is an inference/provider layer.

Preferred authority flow:

```text
Task / Role / Operation
  -> Factory Model Policy
  -> allowed model + capability requirements
  -> OpenRouter / direct provider adapter
  -> concrete inference endpoint
  -> evidence + outcome
```

Not approved:

```text
Task -> opaque provider auto-selection -> unknown model/provider -> Production
```

Any provider routing/fallback used through OpenRouter must remain observable and policy-controlled where material to evidence, security or cost.

## 4. Roles and operations

Current LLM-consuming production roles:
- Director
- Engineer
- Playtester
- Auditor

The Engineer already represents multiple operational task classes and should remain routable at operation level, for example:
- Build
- Repair
- Fresh Rebuild
- Polish

Future Improvement Factory roles may add bounded analysis operations without granting production-write or activation authority.

Long-term routing may therefore differentiate:

```text
Director                    -> planning/reasoning model
Engineer / Build            -> coding model
Engineer / Repair           -> debugging/repair model
Engineer / Rebuild          -> stronger escalation model
Engineer / Polish           -> implementation/product-quality model
Playtester                  -> multimodal/experience-review model
Auditor                     -> economical precise review model
Improvement Analysis        -> bounded reasoning model
```

This mapping is a target capability model, not a hard-coded model assignment.

## 5. Credential strategy

### Rejected default

Do **not** create one API key per Agent/Role merely for cost attribution.

Reasons:
- the Factory already records consumption by role/model/operation;
- per-role keys increase credential count, rotation burden and secret surface;
- role identity is not the strongest security boundary.

### Approved target

Credentials should be separated by **trust/budget boundary**, not primarily by role.

Target lanes:

```text
OPENROUTER_PRODUCTION
  production roles and approved production models

OPENROUTER_BENCHMARK
  experimental/challenger model evaluation

OPENROUTER_IMPROVEMENT
  Improvement Factory / bounded learning analysis
```

Benefits:
- independent spend ceilings;
- benchmark experiments cannot consume production budget;
- Improvement Factory credentials remain separated from Production Factory credentials;
- clearer incident containment and revocation boundary.

Role/operation cost attribution continues inside Factory evidence.

## 6. Evidence requirements for model routing

Every material LLM call should remain attributable to at least:
- role;
- operation;
- requested provider;
- requested model;
- actual/response model where exposed;
- model/version identifier where available;
- tokens;
- cost;
- run/candidate provenance;
- outcome context.

Model quality must be evaluated on outcomes, not call price alone.

Preferred benchmark unit:

`MODEL x ROLE x OPERATION -> verified outcome + convergence + cost`

Useful measures include:
- first-pass success;
- repair success;
- repair/rebuild count;
- Technical result;
- Product Fidelity result;
- Experience score;
- Owner acceptance where available;
- token usage;
- cost;
- latency where reliable;
- regressions.

Primary economic target:

> **cost per verified and owner-accepted outcome**, not cost per API call.

## 7. Future deterministic Model Policy / Router

A future adaptive router may choose the cheapest eligible model that has demonstrated sufficient capability for a task.

Conceptual example:

```text
Task: engineer/repair
Requirements:
  code generation
  JSON capability if required
  context capacity
  max task budget
  minimum verified benchmark score

Eligible models:
  Model A -> score 0.87 / lower cost
  Model B -> score 0.82 / lowest cost
  Reference -> score 0.94 / highest cost

Policy:
  choose cheapest model above validated threshold
```

Model strength may later be used as an **escalation resource**:

`economy attempt -> stronger repair model -> reference/rescue model`

This may only be introduced after evidence proves it improves quality/cost and after deterministic regression tests exist.

No LLM may autonomously decide its own model-policy rules or promote a challenger into Production.

## 8. Security / provider policy

Later production hardening must separate:
- Model Policy
- Provider Policy
- Data Policy

Examples of policy-controlled concerns:
- approved providers/endpoints;
- controlled fallbacks;
- data-retention requirements;
- data-collection restrictions;
- proprietary source-code exposure;
- budget ceilings;
- capability requirements.

Provider convenience must never override Factory evidence, IP policy or production security constraints.

## 9. Immediate implementation sequence

The active implementation order is now:

```text
L0  Learning Safety Gate
    disable unsafe legacy direct learning

M0  OpenRouter clean credential/provider path
    prove configured OpenRouter route without changing Production defaults

M1  Benchmark-safe model infrastructure
    register challenger models safely
    preserve role/operation routing
    preserve capability checks and fail-closed behavior
    preserve requested/actual provider-model evidence
    keep experimental models out of Production defaults

L1-L7  Evidence-Driven Controlled Improvement v1
    structured learning lifecycle
    owner feedback evidence
    deterministic aggregation + trigger
    bounded improvement analysis
    validation/regression
    human-gated activation

FIRST REAL LEARNING CASE
    Titan Canary #3 Owner feedback

P2-07  Model Outcome Benchmarking
    evidence-based role/operation comparisons

LATER
    deterministic adaptive Model Policy / escalation routing
    private-core Productionization/IP-Security Gate
```

## 10. Immediate non-goals

Do not implement during M0/M1:
- automatic "best model" selection;
- LLM-controlled routing policy;
- silent cross-provider fallback;
- automatic DeepSeek/GLM Production default;
- per-Agent API keys without a demonstrated need;
- automatic paid game Canary;
- private-repository/platform migration during the active learning refactor.

## 11. Acceptance criteria for M0/M1

M0/M1 is complete only when:
1. OpenRouter can be configured through the canonical provider path.
2. Provider/model selection remains fail-closed.
3. OpenAI remains the reference Production default unless separately promoted.
4. Experimental models cannot silently become Production defaults.
5. Role and operation route overrides are regression-tested.
6. Capability mismatch fails before dispatch.
7. Model/provider/token/cost evidence remains attributable.
8. Credential design supports separate Production / Benchmark / Improvement trust boundaries without requiring one key per Agent.
9. No release authority changes.
10. No paid game Canary is started by this implementation.

## 12. Governance

GitHub remains executable/durable Source of Truth. Notion mirrors this architecture decision.

Authority order remains:

`Control Plane > Owner Contract > Engine/API Contract > Verified Skill > Memory Lesson`

Model routing is subordinate to deterministic Factory policy, budget controls, capability checks and verification.

This decision does not weaken the rule:

> Unvalidated learning may not alter Production.