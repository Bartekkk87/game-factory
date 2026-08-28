# Golden Factory Evaluation Corpus — S3 Learning Intake Integration

Date: 28.08.2026  
Scope: analysis-only `evaluation-failure` intake  
Precondition: S0, S1a, S1b and S2 are closed

## Decision

S3 extends the existing Controlled Improvement orchestration. It does not add a second Control Plane, agent, scheduler, database, or promotion mechanism.

```text
S2 case mismatch
 -> durable evaluation-failure evidence
 -> existing deterministic aggregate
 -> existing deterministic trigger
 -> bounded analysis
 -> optional stable inactive Candidate after reproduction
```

## Minimal implementation

- `factory/src/evaluation/intake-failures.mjs` converts compatible S2 mismatches into `evaluation-failure-evidence-v1`.
- `factory/src/learning/aggregate.mjs` groups admitted evidence by deterministic cluster.
- `factory/src/learning/trigger.mjs` permits analysis for each admitted event but permits a Candidate hypothesis only after a repeated observation.
- `factory/src/learning/orchestrate.mjs` reuses the existing Aggregate → Trigger → Analysis → Candidate path.
- `factory/src/learning/lifecycle.mjs` accepts explicit Evaluation-Failure provenance without inventing Production run IDs.
- `.github/workflows/verify.yml` runs the S3 selftest and preserves S2/S3 evidence as a workflow artifact with read-only repository authority.

## Evidence contract

Every admitted event preserves:

- evidence ID and observation ID;
- exact evaluated commit;
- S2 report and compatible baseline provenance;
- exact corpus case, population, parent seed, domain, severity, source kind and script;
- expected and actual result;
- deterministic failure signature and diagnostic;
- known failure class or explicit `unclassified`;
- analysis-only authority and prohibited actions.

## Classification boundaries

| Signal | S3 treatment |
|---|---|
| Compatible S2 case mismatch | `evaluation-failure` evidence |
| Production `RUN-EVIDENCE` failure | existing `production-run` path |
| Missing/incompatible S2 report | rejected from case-level intake |
| Fixture-backed case | source provenance only; fixture cause is not inferred |
| Single observation | flake status remains unconfirmed; no Candidate |
| Repeated identical cluster/signature | one stable inactive hypothesis Candidate may be created |
| Unknown class | explicit `unclassified`; no invented fix |

## Candidate-spam control

A Candidate requires at least two distinct observation IDs for the same deterministic cluster. Multiple cases in one evaluation observation do not satisfy this rule. The Candidate ID is derived from the cluster, so later matching observations reuse the same inactive Candidate instead of creating one Candidate per run.

## Hard safety boundary

S3 may aggregate, classify, analyze and propose one inactive hypothesis after reproduction.

S3 must not:

- validate, activate or promote a Candidate;
- edit Production code or protected instructions;
- weaken verifier/release gates;
- infer a repair from one synthetic signal;
- label a failure flaky without evidence;
- start a paid API/LLM run;
- start Harbor Canary #4;
- implement S4 application closure or S5 benchmarking.

## Deterministic acceptance

`factory/src/evaluation/test-evaluation-failure-intake.mjs` proves:

- exact case/commit/signature provenance;
- known and `unclassified` intake;
- first observation creates no Candidate;
- duplicate intake is idempotent;
- second separate matching observation creates one inactive Candidate;
- later observations reuse that Candidate;
- incompatible reports and missing signatures fail closed;
- orchestration cannot call validation, promotion or deactivation functions.

S3 is not CLOSED until the branch Full Verifier succeeds, the PR is merged, exact-main Post-Merge Full Verifier succeeds, GitHub Issue #17 is updated, and both Notion Source-of-Truth pages are synchronized.
