# Golden Factory Evaluation Corpus — S1a/S1b — 28.08.2026

## Status

**IMPLEMENTATION PACKAGE — S1a MINIMAL EXECUTABLE CASE/ORACLE CONTRACT + S1b BOUNDED FAILURE VARIANCE FAMILIES**

This package implements only the approved S1 scope after S0. It does not implement S2 corpus-wide evaluation, quality scoring, baseline-vs-candidate delta reporting, domain rollups, S3 learning intake, S4 application closure or S5 system-configuration benchmarking.

Base before implementation: `ac81b93c1380c0a9480c7b9f7869c1a55920154d`.

## Preserve S0 as a frozen baseline

S1 deliberately leaves these S0 artifacts unchanged:
- `evaluation/corpus/schema.json`
- `evaluation/corpus/registry.json`
- `evaluation/baselines/S0-2026-08-28.json`
- the existing S0 registry selftest

The 15 historical seeds therefore retain their original IDs, schema and exact S0 coverage projection. S1 does not rewrite the baseline in order to make the new corpus look larger.

## S1a — Minimal executable case/oracle contract

`evaluation/corpus/s1-cases.json` adds a small S1 manifest:
- one execution contract for every existing S0 seed;
- bounded S1 sibling definitions with parent and changed-variance provenance;
- one explicit corpus population: `development-regression`.

The only supported execution contract is:

`node-selftest + repo-relative script + exit-code-zero oracle`

`factory/src/evaluation/run-corpus-case.mjs --case <case-id>` executes exactly one requested active seed or sibling. It has no `--all` mode, no quality score, no delta calculation and no aggregate report. Those remain S2 responsibilities.

The runner is bounded to existing deterministic repository selftests. It does not invoke the Production Director, Engineer or Playtester and has no LLM/API execution path.

## S1b — Bounded sibling variants

S1b adds exactly one development/regression sibling per registered S0 failure class. These siblings expose already-existing deterministic assertions as first-class evaluation cases instead of inventing new Production behavior.

| Variant | Parent seed | Changed dimension | Control |
| --- | --- | --- | --- |
| `gp-action-legacy-pulse-unreachable` | `gp-action-reachability-active-vs-idle` | input-policy timing | negative |
| `gp-input-causality-active-delta-pass` | `gp-input-causality-autonomous-reject` | active-vs-idle differentiation | positive |
| `gp-visual-duplicate-activity-evidence-reject` | `gp-visual-static-live-reject` | captured-frame equality | negative |
| `gp-proof-plan-restart-coverage` | `gp-proof-plan-terminal-reachability` | restart coverage topology | positive |
| `gp-terminal-unknown-dead-reject` | `gp-terminal-alias-fidelity` | unsupported terminal vocabulary | negative |
| `gp-generated-event-correlated-progress-pass` | `gp-generated-event-self-attestation-reject` | runtime correlation strength | positive |
| `gp-full-brief-optional-claim-excluded` | `gp-full-brief-independent-review` | optional vs concrete review obligation | negative |
| `gp-owner-heading-unknown-context-preserved` | `gp-owner-heading-context` | heading context on unknown claims | positive |
| `gp-owner-style-reference-no-inflation` | `gp-owner-ambiguous-no-inflation` | style-reference wording | negative |
| `fr-repair-signature-different-check-distinct` | `fr-repair-signature-jitter-normalization` | failure-check identity | negative |
| `fr-runtime-error-jitter-normalized` | `fr-runtime-error-signature-distinct` | runtime path/numeric jitter | positive |
| `fr-verifier-exception-failclosed-boundary` | `fr-verifier-failure-durable-fail-closed` | verifier exception routing | positive |
| `fr-learning-validated-inactive-not-consumed` | `fr-learning-lifecycle-human-gated` | validated-inactive consumption state | negative |
| `fr-root-cause-success-run-rejected` | `fr-root-cause-diagnostic-independence` | run-status intake boundary | negative |

No holdout/generalization population is claimed or implemented in S1.

## Why the variants are executable without duplicating Production logic

The current repository selftests already contain the relevant bounded adversarial or positive assertions: legacy action pulses versus repaired sweeps, active-versus-idle causality, duplicated activity frames, restart proof topology, supported versus unsupported terminal vocabulary, correlated versus self-attested game events, optional versus concrete Owner claims, heading-context preservation, failure-signature jitter, runtime-error class separation, fail-closed verifier routing, learning activation boundaries and failed-run diagnostic authority.

S1b makes those existing failure shapes visible as typed evaluation cases with durable parent/variance provenance. Their semantics remain in the existing authoritative verifier/control/contract/learning code and tests.

## Integrity checks

The new S1 selftest proves:
- all 15 frozen S0 seeds have exactly one executable S1a contract;
- every S1 variant resolves to an existing parent seed;
- parent and sibling stay in the same domain, failure class and variance family;
- every registered failure class and variance family has bounded sibling coverage;
- all source/test paths exist and the selected execution script is a durable source reference;
- all S1 variants are zero-paid development/regression cases;
- no holdout/generalization claim is introduced.

The case-execution selftest runs existing game-production and factory-reliability cases through the one-case runner and confirms unknown IDs fail closed.

## Boundaries retained

This package does not:
- run paid LLM/API work;
- start Harbor Canary #4;
- mutate Production prompts or skills;
- weaken verifier/release gates;
- validate, activate or promote Learning Candidates;
- create a corpus-wide S2 runner or quality score;
- claim holdout/generalization performance;
- create a second Control Plane;
- split Factory units into repositories;
- refactor the Game Factory into a generic multi-product platform.

Root `README.md` / `ARCHITECTURE.md` synchronization is left as an explicit later documentation task because it is not required for the S1 executable/oracle and sibling-variance proof.
