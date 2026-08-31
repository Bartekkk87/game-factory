# Kepler M1 — Closure, Evidence and Next-Chat Handoff — 2026-08-31

Repository: `Bartekkk87/game-factory`

## Executive status

Kepler M1 is now at a **clean handoff boundary**, not at a successful M1 product promotion.

The important distinction is:

- the Factory control plane and autonomous start path are implemented and verified;
- the latest generated M1 candidate was **rejected by mandatory verification** and was never promoted to `main`;
- therefore `main` does not contain a half-working M1 candidate;
- no additional paid retry is authorized by this handoff.

Current technical truth on `main`:

`9d881ef7b1a673077177ea450c199089ccb08427`

Exact-main Branch Verifier:

- run `33417592902` — **SUCCESS**

The next chat must start from this exact repository state unless GitHub shows a newer verified `main`.

## Final owner-authorized M1 attempt

The Owner explicitly authorized one additional bounded retry after the earlier model-response defect was repaired.

Authorization PR:

- PR #103 — `authorize(project): publish bounded Kepler owner retry 2`
- merged into `main` as `9d881ef7b1a673077177ea450c199089ccb08427`
- authorization kind: `owner_retry`
- retry id: `KEPLER-M1-T1-OWNER-RETRY-2`
- project: `kepler-outpost`
- task: `KEPLER-M1-T1`
- provider: `openrouter`
- model: `deepseek/deepseek-chat-v3.1`
- run budget ceiling: `USD 0.05`
- single retry: `true`
- allowed M1 source scope only:
  - `src/play.html`
  - `src/play.mjs`
  - `src/simulation.mjs`
  - `src/state.mjs`

The successful first-attempt exact-main verifier `33417592902` autonomously triggered Kepler workflow run `33418227465`.

No manual workflow dispatch was used.

## Latest M1 outcome

Workflow:

- `Project Kepler Canary M1`
- run `33418227465`
- `autonomous-preflight`: **SUCCESS**
- `canary-m1`: **FAILURE**
- failing step: `Execute bounded low-cost Kepler M1`

The infrastructure and pre-spend controls passed:

- exact verified head checkout — PASS
- owner-retry authorization revalidation — PASS
- dependency setup — PASS
- Chromium setup — PASS
- bounded Engineer adapter selftest — PASS
- exact current `main` recheck — PASS
- local branch materialized as `main` before runner execution — PASS

The DeepSeek request completed:

- actual model: `deepseek/deepseek-chat-v3.1`
- tokens: `9033`
- logged cost: `USD 0.003475`

The candidate then entered independent verification.

Verification result:

| Check | Result |
|---|---|
| `unit-core` | PASS |
| `integration-core` | PASS |
| `regression-core` | PASS |
| `browser-persistence` | **FAIL** |

The browser persistence failure was:

```text
actual:   { power: 0, ore: 0, turn: 0 }
expected: { power: 1, ore: 1, turn: 2 }
```

The Factory therefore returned:

`verification-failed`

and aborted promotion.

This is the correct fail-closed behavior.

## What the failure means

The latest candidate was good enough to pass unit, integration and regression verification, but it did not satisfy the required durable browser persistence contract.

The unmet requirement remains:

`Save -> host reload -> Load -> full durable-state restoration`

The failure should be treated as a **product implementation defect in the rejected candidate**, not as a defect proven to exist in the currently promoted `main` baseline.

No candidate PR was created.

No rejected-candidate workflow artifact was published.

## Important forensic limitation

The Project transaction system intentionally removes the staging workspace after failed verification and rolls back the task Git branch.

That means the rejected generated source itself is no longer available after this run.

The durable evidence currently consists of the GitHub workflow log and the structured rejection payload, including the independent verification results above.

This is safe from a promotion/governance perspective, but it is a forensic limitation for future debugging.

Do **not** weaken rollback or transaction safety merely to retain failed candidates.

If future work wants better rejected-candidate diagnostics, implement a separate bounded evidence/archive mechanism and prove it without changing promotion authority.

## Failure history and repairs completed

### 1. Autonomous launch authority initially placed inside immutable project workspace

Demonstrated defect:

- immutable bootstrap-tree verification rejected the launch record placement.

Repair:

- PR #97 moved launch authority to `factory/src/project/launch-records/...` outside the immutable Kepler project tree.

Result:

- protected bootstrap integrity remained unchanged;
- autonomous null-launch proof succeeded.

### 2. Exact verified checkout entered runner as detached HEAD

Demonstrated defect:

`PG-A0 must start on main, found HEAD`

The failure occurred before the model requester.

Repair:

- PR #99 materialized the exact verified commit as local branch `main` immediately before Project PG-A0 execution;
- stale-main and exact-head checks remained fail-closed;
- a single zero-spend retry mechanism was added and separately authorized by PR #100.

Result:

- detached-HEAD defect is resolved.

### 3. First model-reaching retry produced invalid/incomplete JSON

Failed workflow:

- run `33403550650`
- job `99525536760`
- logged model cost: `USD 0.005247`
- failure: `No valid JSON found in LLM response`

Repair:

- PR #101 changed the OpenRouter adapter contract so JSON-object requests also send `provider.require_parameters=true`;
- model, provider, budget and Kepler task remained unchanged.

Result:

- the next owner-authorized attempt returned a parseable candidate and reached independent product verification.

### 4. Owner-retry support and execution

- PR #102 added a distinct fail-closed `owner_retry` authorization type but no retry record.
- exact-main verification and automatic null-run proved the support path before spend.
- PR #103 added exactly one `OWNER-RETRY-2` authorization record.
- exact-main run `33417592902` succeeded.
- workflow `33418227465` consumed that authorization exactly once.

The authorization is now spent and must not be replayed.

## Autonomous Factory status

The original manual-start autonomy gap is closed.

Kepler M1 can be started repository-natively only after:

1. an authorization record is newly published on `main`;
2. the first automatic push Branch Verifier attempt succeeds;
3. the verified SHA is still current `main`;
4. the authorization passes the relevant fail-closed gate;
5. pre-spend adapter and exact-main checks pass.

The Owner does **not** need to perform routine GitHub actions such as:

- clicking `Run workflow`;
- creating dummy commits;
- deleting task branches;
- manually starting verifier runs.

The Owner remains responsible for decisions that change authority, such as approving another paid retry, changing provider/model/budget, or expanding scope.

## Current code status

`main` is a clean, verified Factory baseline.

The rejected M1 candidate was not promoted, so there is no partial M1 implementation to revert from `main`.

Do not describe Kepler M1 as complete.

Do not describe the latest candidate as lost production code. It was a rejected staging candidate by design.

## Hard boundaries still in force

- M1 source scope remains limited to the four approved files.
- Project tests and host-owned persistence remain protected.
- No M2 work is authorized by this handoff.
- No generic task queue is authorized.
- No unbounded repair loop is authorized.
- No Project-to-Factory learning promotion is authorized.
- No new model/provider or higher spend is authorized.
- Trusted gates and exact-head binding must not be weakened.
- No paid retry is authorized by this document.

## Recommended next technical decision

The next chat should **not** immediately re-run DeepSeek.

First choose one bounded path:

### Path A — product repair without another model retry

Use the immutable M1 task and protected browser persistence test as the source of truth, inspect the current Kepler baseline, and implement the persistence behavior directly in the allowed source scope. Then run all zero-paid verification before deciding whether a candidate is ready.

### Path B — improve rejected-candidate evidence retention first

Add a bounded, non-promoting artifact/evidence path that preserves the rejected candidate or patch before transaction cleanup, while leaving rollback, promotion authority and project-tree integrity unchanged. Prove this zero-paid before any further model attempt.

### Path C — another paid model attempt

Requires a **new explicit Owner authorization** and a new separately bound authorization record. Do not reuse or replay `OWNER-RETRY-2`.

## Next-chat starting instructions

A follow-up chat should begin with:

1. read this file first;
2. read live `main` and confirm its current SHA;
3. confirm whether exact-main verifier `33417592902` is still the latest verifier for `9d881ef7...` or whether later verified changes exist;
4. read the immutable task `projects/kepler-outpost/.factory/tasks/KEPLER-M1-T1.json`;
5. read the protected persistence verification under the Kepler project tests;
6. do not start a paid model run unless the Owner explicitly authorizes it;
7. preserve the Owner role as decision maker/milestone tester, not GitHub operator.

## Canonical references

- `ARCHITECTURE.md`
- `docs/strategy/P0-FINAL-ACCEPTANCE-2026-08-27.md`
- `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
- `docs/strategy/NEXT-CHAT-HANDOFF-2026-08-27.md` — historical pre-Kepler handoff only
- PR #94 — bounded low-cost Kepler route
- PR #96 — repository-native autonomous start
- PR #97 — launch-authority placement repair
- PR #98 — original bounded launch authorization
- PR #99 — detached-HEAD repair and zero-spend retry gate
- PR #100 — zero-spend retry authorization
- PR #101 — OpenRouter JSON parameter support repair
- PR #102 — owner-retry support
- PR #103 — single owner-retry authorization
- Branch Verifier run `33417592902`
- Kepler M1 workflow run `33418227465`

## Handoff verdict

**HANDOFF-READY WITH KNOWN M1 PRODUCT DEFECT.**

The Factory control plane is in a clean verified state. The autonomous launch defect and the two demonstrated infrastructure/request-contract defects are repaired. The latest M1 candidate was correctly rejected on browser persistence and never entered `main`.

The next owner decision is whether to repair persistence directly, improve rejected-candidate evidence retention, or authorize a new bounded paid attempt.