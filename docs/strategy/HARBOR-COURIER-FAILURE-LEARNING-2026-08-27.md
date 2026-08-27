# Harbor Courier — Failure Learning Case — 2026-08-27

## Source

- Production run: `33113644525`
- Durable run id: `20260827-203110`
- Result: `debug_exhausted`
- Provider/model: OpenAI / `gpt-5.6-terra`
- Cost: `$0.540282`
- Tokens: `121157`
- Existing automatic controlled-learning candidate: `candidate-production-run-c5d297b05cb1a0da`
- Specific evidence candidate: `candidate-harbor-courier-repair-regression-20260827`

## Observed repair trajectory

Verification failed-check count by attempt:

1. Attempt 1: 9
2. Attempt 2: 5
3. Attempt 3: 2
4. Attempt 4: 8
5. Attempt 5: 9

The best evidenced intermediate candidate was Attempt 3. The current repair loop nevertheless continued from the latest failed design, allowing later repairs to regress substantially.

## Concrete deterministic defect introduced by repair

Attempt 5 introduced a browser runtime error:

`CanvasRenderingContext2D.ellipse` was called with 6 arguments although the API requires 7.

The generated line was effectively:

`ctx.ellipse(1,11,24,8,0,Math.PI*2)`

This is direct evidence of an Engineer repair regression, not an Owner Brief ambiguity.

## Root-cause hypothesis

Current Phase-B logic detects stagnation only when the failure signature is identical or the candidate SHA is identical. It does not treat a materially worse verifier result or a newly introduced runtime error as a repair regression. Repairs are therefore based on the latest failed design rather than the best evidenced prior design.

## Candidate improvement to validate

Validate a regression-aware repair-base policy:

- retain the best evidenced failed design during Phase B;
- when a later repair worsens the verifier result, do not use that regressed design as the next repair base;
- if a repair introduces a new runtime error that was absent in the best prior candidate, roll back the repair base before the next attempt;
- keep this as a candidate until deterministic tests prove the policy and the full regression suite passes.

## Safety boundary

This document does not authorize automatic validation, activation, skill promotion, protected-layer changes, or another paid production run.
