# Kepler M1 — Status, Autonomy Finding and Continuation Handoff (2026-08-31)

## Purpose and authority

This record captures the live, evidence-backed position after the first Kepler Outpost M1 attempts. It is an operational status and handoff, not a change to the Project Game Mode architecture.

GitHub is the technical source of truth. Notion mirrors this record for decision and continuity use. Earlier status statements are historical only where they conflict with the exact PRs, commits, or workflow runs listed here.

## Owner expectation

The Owner is a decision maker and milestone tester, not a GitHub operator.

Routine work must be autonomous: creating branches and pull requests, starting normal verification, reading failures, applying bounded repairs, merging only after all required checks pass, and recording evidence. The Owner is involved only for a material boundary: a new paid-cost ceiling, a new secret or external account, a temporary security bypass, or a product decision that changes the agreed scope.

A request to click **Run workflow**, create a dummy commit, delete a routine branch, or fill routine workflow fields is an autonomy defect, not normal operating procedure.

## Current position

- Protected branch: `main`.
- Current live `main` commit: `1076cc8f2bb958a12d503f4e2cf28f0240a7ad29`.
- Current main commit is the merge of [PR #92](https://github.com/Bartekkk87/game-factory/pull/92), which adds fail-closed rejection evidence for a Kepler M1 promotion.
- Exact-main Branch Verifier after PR #92: [run 33369543598](https://github.com/Bartekkk87/game-factory/actions/runs/33369543598) — **SUCCESS**.
- Kepler bootstrap is merged through [PR #91](https://github.com/Bartekkk87/game-factory/pull/91). It creates the bounded `kepler-outpost` workspace and its immutable M1 contract.
- The current M1 task may change exactly four files: `src/play.html`, `src/play.mjs`, `src/simulation.mjs`, and `src/state.mjs`. Tests and persistence authority are protected.
- The M1 acceptance target remains: deterministic power/mining loop, visible browser interaction, and full durable state restored after Save -> host reload -> Load.

## What has been proven

### Governance and bootstrap

1. [PR #90](https://github.com/Bartekkk87/game-factory/pull/90) rotated the verifier trigger authority under a one-time owner-authorized bypass. It added `projects/**` to the verifier push paths and pinned the resulting verifier hash. The bypass was then removed.
2. [PR #91](https://github.com/Bartekkk87/game-factory/pull/91) established Kepler's initial Project workspace through the normal protected path.
3. The bootstrap was merged at `c13dceba42a1713c45ac43786eebe98a54fe6b30`; its Exact-main verifier [run 33367066540](https://github.com/Bartekkk87/game-factory/actions/runs/33367066540) was successful.

### M1 failure evidence

1. The first free-route M1 attempt produced no promoted code. The runner failed closed after the generated proposal did not pass required verification. No M1 pull request was created.
2. [PR #92](https://github.com/Bartekkk87/game-factory/pull/92) was merged to ensure a future rejection emits the exact failure evidence instead of a generic abort.
3. The second free-route attempt did not receive a model response within its configured window. It produced no code, no M1 pull request, and no promoted change.
4. [PR #93](https://github.com/Bartekkk87/game-factory/pull/93), which proposed only a longer free-route response window, is closed and unmerged. It must not be revived implicitly.

### Low-cost route

- The Owner approved replacing the unreliable free route with the existing OpenRouter production lane and the registered model `deepseek/deepseek-chat-v3.1`.
- [PR #94](https://github.com/Bartekkk87/game-factory/pull/94) limits the M1 route to **USD 0.05 total per run** and does not weaken any game, governance, or verification gate.
- PR #94 head: `c43ba694faf21fbb0f5b3b62271a3cbc2c5388bc`.
- PR #94 base: `1076cc8f2bb958a12d503f4e2cf28f0240a7ad29`.
- All currently recorded PR #94 workflows are successful:
  - [Branch Verifier 33378893957](https://github.com/Bartekkk87/game-factory/actions/runs/33378893957)
  - [Trusted PR Selftest 33378896684](https://github.com/Bartekkk87/game-factory/actions/runs/33378896684)
  - [Trusted PR Provenance 33378896569](https://github.com/Bartekkk87/game-factory/actions/runs/33378896569)

## Open gap: autonomous start

The Kepler workflow remains defined only with `workflow_dispatch`. That means the workflow expects a manual start button.

This is the remaining autonomy gap. It is not a missing Owner code approval and it must not be disguised by dummy commits or routine manual clicks. The Factory needs a controlled repository-native start path that can be invoked from the normal project lifecycle and leaves durable evidence of the trigger, task, head, base, model route, and budget cap.

This does **not** authorize an unbounded repair loop, task queue, multi-milestone engine, or Project-to-Factory learning promotion.

## Required next work

1. Re-read the live state of PR #94. Merge it only if its head/base binding remains unchanged and all required checks are still successful.
2. Verify the resulting exact `main` commit with the existing branch verifier.
3. Replace the routine manual M1 start with a bounded, repository-native trigger for the already approved Kepler M1 contract. The trigger must:
   - be bound to `kepler-outpost` and `KEPLER-M1-T1`;
   - use only the already approved DeepSeek/OpenRouter route;
   - enforce the existing USD 0.05 cap;
   - create no fallback to a paid or unregistered model;
   - record an explicit trigger/evidence record;
   - remain fail-closed;
   - preserve the trusted gates and protected-main process.
4. Prove that normal Factory publication starts the verification chain without an Owner GitHub action.
5. Only then run the bounded M1 task. On any failure, retain the evidence and repair only the demonstrated defect.

## Explicit exclusions

- No M2 materialization.
- No autonomous task queue, milestone engine, or generic repair loop.
- No relaxation of F1-F4, trusted provenance, exact-head binding, protected tests, or host-owned persistence.
- No new provider, model, secret, or spend above USD 0.05 without a new Owner decision.
- No rewriting or deleting historical failure evidence, including PR #88, PR #93, or earlier workflow records.

## Fresh-chat instruction

Start with a live GitHub read. Treat this document, PR #94, the current `main` commit, workflow runs, and the Kepler task contract as the required evidence set. Do not ask the Owner to perform routine GitHub steps. Do not start a model call until PR #94 is safely merged and the autonomous-start path is proven.
