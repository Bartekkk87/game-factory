# Autonomous Learning Architecture & Cost Model — 28.08.2026

## Status

The current Factory claim remains **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

Executable baseline:
- PR #21 merged to `main`
- merge SHA `6fad388806be9302c1037367df69595ea8f6aff8`
- branch Full Verifier `33144740293` — PASS
- post-merge Full Verifier `33144896102` — PASS

A failed Production run now enters the learning path automatically:

`Production Run -> Durable Evidence -> deterministic aggregation -> failed-run root-cause dossier -> ranked evidence-backed hypothesis -> inactive candidate -> validation plan -> human-gated validation/promotion`

Cross-run recurrence remains an additional signal, but is no longer required before a single failed run can receive a case-specific diagnosis.

## Learning execution layers

### 1. Evidence generation

Sources include deterministic browser/runtime telemetry, Technical Verifier results, Product Fidelity results, Owner feedback, run metadata and attempt history.

Execution: normal Node.js / Playwright / GitHub Actions compute.

LLM/API use: **none for the evidence evaluation itself**.

### 2. Failed-run root-cause diagnosis

`factory/src/learning/root-cause.mjs` reads durable run/attempt evidence and deterministically checks bounded failure classes such as:
- best-attempt vs final-attempt repair regression
- newly introduced runtime errors
- terminal probe vs proof-scenario gaps
- Director/runtime terminal-state vocabulary mismatches
- unresolved terminal action reachability

The diagnostic terminal families are intentionally independent from verifier state semantics so Learning can falsify a verifier vocabulary defect rather than inherit it.

Execution: local JavaScript on the workflow runner.

LLM/API use: **none**.

### 3. Aggregation, triggers and candidate creation

`factory/src/learning/orchestrate.mjs`, trigger/aggregation code and the candidate lifecycle operate on durable JSON evidence. A failed run can create at most a bounded hypothesis candidate. Automatic candidates remain inactive.

Execution: local JavaScript + JSON/Git persistence.

LLM/API use: **none**.

### 4. Candidate validation / promotion lifecycle

Validation requires explicit validation evidence and passing regressions. Promotion remains human-gated. Protected code layers cannot be silently converted into active prompt lessons.

Execution: lifecycle logic + regression tests + GitHub review/merge process.

LLM/API use: **none by the lifecycle itself**. A future validation experiment could of course include a separately authorized Production run; that run would be billed normally as a Production LLM run.

### 5. Active lessons in future Production runs

Only lessons with the correct role, `status=validated` and `active=true` are returned by `lessonsFor(...)`. The memory adapter currently limits this to the latest 12 lessons per role.

Director and Engineer assemble those active lessons into their normal system prompt before calling the Production LLM.

Therefore:
- there is **no separate Learning API call** for using a lesson;
- active lesson text can slightly increase the **input-token count of the normal Director/Engineer LLM call**;
- this indirect token cost is automatically captured by the existing run cost ledger because it is part of the ordinary prompt sent through `chat()`.

## Where actual LLM/API cost is incurred

Paid/model-billed work happens only when Factory code calls `factory/src/llm/client.mjs -> chat()`.

That path:
1. resolves provider/model/credential lane,
2. reserves budget before the request,
3. calls the provider endpoint,
4. reads provider token usage / provider-reported cost when available,
5. otherwise calculates cost from the model registry,
6. records cost/tokens by role, model and operation,
7. fails closed if accounting becomes uncertain or the next request does not fit the remaining budget.

Current Production LLM roles/operations include Director, Engineer build/repair/rebuild/polish, Playtester and Auditor where applicable.

The autonomous Learning analysis added in PR #21 does **not** call `chat()` and therefore does not consume OpenAI/OpenRouter tokens by itself.

## Infrastructure cost boundary

The Learning architecture still consumes ordinary workflow resources:
- GitHub Actions runner time
- repository/artifact storage
- CPU/RAM for Node.js, Playwright and deterministic analysis

These are **separate from LLM API billing** and follow the GitHub plan/Actions usage rules. They are not charged through the OpenAI/OpenRouter API key.

## Safety / cost boundary

Automatic Learning may:
- analyze durable evidence
- rank bounded hypotheses
- persist a root-cause dossier
- create an inactive candidate
- propose a validation plan

Automatic Learning may not:
- mutate Production code
- mark its own candidate validated
- activate/promote a candidate
- weaken verifier/release gates
- start a paid retry

A new paid Product/Game canary remains owner-gated.

## Architecture consequence

The current design deliberately separates **reasoning cost** from **learning control**:

- Production creativity / coding / visual review can use paid LLM calls.
- Evidence aggregation, learning triggers, root-cause pattern checks, candidate lifecycle and promotion control remain deterministic and cheap.
- Validated lessons influence later paid LLM calls only as additional prompt context.

If a future version introduces an LLM-based meta-analyst for root-cause reasoning, that must be an explicit new architecture decision and must route through the same provider/model router and cost ledger rather than bypassing Production budget accounting.
