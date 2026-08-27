# Controlled Learning Trigger Causality Fix — 27.08.2026

## Context

The first real post-closure Owner `/reject` for Titan Core: Reforged successfully flowed through the Review Gate into immutable Owner evidence, deterministic aggregation, trigger evaluation, bounded analysis and an inactive candidate.

The read-only follow-up audit found one learning-quality defect in the trigger evidence:

- the Owner-feedback trigger receipt also reported `recurring-engineering-failure-across-runs` from global historical evidence;
- old technical contract failures without explicit `failureSignature` / `errorCode` were collapsed to the generic signature `technical:failed` because the stable verifier check `id` was not preserved;
- production trigger evaluation did not require the current production event to participate in the recurring signature;
- engineering candidate provenance used global aggregate run IDs instead of the run IDs that actually carried the recurring signature.

This did not activate a lesson or change Production, but it could create noisy/stale Engineering learning candidates from unrelated historical evidence.

## Fix

1. Derived failure signatures now retain stable verifier check IDs (`failure.id` / `checkId`) before falling back to detail classification.
2. Recurring failure records persist the exact sorted `runIds` that carry each signature.
3. Trigger evaluation is event-causal:
   - Owner-feedback events evaluate only the current Owner verdict for Product Feedback scope.
   - Production-run events may trigger Engineering only when the current run is one of at least two independent runs carrying the same recurring signature.
4. Engineering candidate provenance is built only from the run IDs attached to the relevant recurring signatures.
5. A successful/unrelated later production run cannot re-trigger an old historical recurrence.

## Candidate classification

The historical Titan visual-target candidate and the new automatic Owner-feedback candidate are intentionally kept separate. They are related but not identical hypotheses:

- historical candidate: concrete hypothesis that explicit visual/presentation targets should be captured in executable Product Truth before Director design;
- automatic candidate: bounded hypothesis that the rejection may indicate an intake / Owner Contract decomposition gap and must be validated before any Production change.

Both remain inactive. No semantic auto-deduplication is introduced because collapsing non-identical hypotheses would discard evidence and could hide competing root causes.

## Safety boundary

- no automatic validation;
- no automatic activation;
- no Production prompt injection from candidates;
- no paid Game/Titan run;
- no new control component;
- full regression required before merge.
