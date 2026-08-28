# Golden Factory Evaluation Corpus — S4 Application Receipt Design

Date: 28.08.2026  
Status: S4 design only; implementation follows only inside the existing Learning lifecycle  
Base: `main` `e7b406204460e52c0cd751a5f0999dfa306a8eed` (S3 code parent `277a509f77055237019d354a25452e7d3ede346a`)

## Decision

S4 adds one durable, immutable **Application Receipt** for a separately authorized, human-reviewed application of a **validated, inactive, non-prompt protected-layer Candidate**.

It extends `factory/src/learning/lifecycle.mjs` and writes under the existing `learning/` durable state. It does not introduce another orchestrator, scheduler, agent, database, promotion path or Control Plane.

The receipt records closure only. It never applies the fix itself and never calls Candidate validation, activation, promotion or deactivation.

## Terminal meaning

`validated + inactive Candidate -> separately authorized human-reviewed merge -> SHA-bound regression/corpus PASS -> Application Receipt -> APPLIED/CLOSED`

`APPLIED/CLOSED` is receipt state, not Candidate activation. The existing Candidate remains `status=validated` and `active=false`.

## Protected-layer boundary

S4 accepts only Candidates whose `targetLayer` is already in the existing `PROTECTED_LAYERS` set and is not `prompt`.

Prompt lessons remain governed exclusively by the existing `promoteCandidate()` path. S4 must not convert code/verifier/control/evaluation/skill/contract changes into prompt lessons.

## Receipt identity and candidate SHA

One Candidate may have at most one application closure receipt.

Receipt path:

`learning/applications/<candidate-id>.json`

The receipt contains two distinct SHA concepts so existing provenance cannot be confused:

- `candidateArtifactSha256`: SHA-256 of the exact validated Learning Candidate JSON bytes at receipt creation. This is the immutable S4 Candidate-SHA binding.
- `sourceCandidateSha`: the existing optional `candidate.candidateSha` value, preserved only as upstream product/source provenance.

The caller must supply the expected `candidateArtifactSha256`; a mismatch fails closed.

## Required receipt schema

Logical schema `learning-application-receipt-v1`:

- receipt ID / schema version / terminal state `APPLIED-CLOSED`;
- Candidate ID;
- `candidateArtifactSha256` and optional `sourceCandidateSha`;
- target layer and bounded `changeScope`;
- implementation PR reference;
- merged commit SHA;
- accountable human approval reference;
- canonical validation artifact ref + SHA-256;
- exact additional regression-evidence refs + SHA-256;
- exact Golden Corpus report ref + SHA-256;
- corpus evaluated commit SHA and PASS result;
- `appliedAt`;
- optional `supersedesReceiptId` or `reversalOfReceiptId`.

Every repo-relative evidence ref must resolve inside the repository, exist, and match its supplied SHA-256.

## Implementation proof

The merged implementation commit is validated locally and deterministically through Git:

1. commit SHA must be a full hexadecimal Git SHA;
2. the commit must exist in the current repository;
3. the commit must be an ancestor of current `HEAD`.

This proves the receipt cannot close against an unknown or unmerged implementation without any GitHub/API/LLM call. The PR and human approval remain explicit accountable references in the durable receipt.

## Validation and regression proof

The canonical validation artifact is not caller-selected. It is derived as:

`learning/validations/<candidate-id>.json`

It must exist, identify the same Candidate, have `outcome=validated-inactive`, and contain only passing regression results. Its exact bytes are SHA-bound in the receipt.

Additional regression evidence is represented by one or more repo-relative JSON evidence refs supplied with SHA-256. S4 validates presence and byte hash; it does not execute or authorize a repair.

## Corpus proof

The receipt requires one SHA-bound Golden Corpus evaluation report with schema `game-factory.golden-corpus-evaluation-report/v1`.

It must prove:

- `evaluatedCommitSha` equals the merged implementation commit;
- baseline compatibility is true;
- no corpus regression;
- no critical false-PASS regression;
- no expected mismatch;
- no critical false PASS.

No model-backed or paid evaluation is needed or authorized by S4.

## Idempotence and history

If the exact same closure is recorded again for the same Candidate, S4 returns the existing receipt as idempotent (`created=false`).

If any closure field conflicts with an existing receipt for that Candidate, S4 fails closed and does not overwrite it.

Supersession and reversal are represented by a **new Candidate's immutable receipt** referencing a prior receipt through `supersedesReceiptId` or `reversalOfReceiptId`. The referenced prior receipt must already exist. The prior receipt is never rewritten, so its provenance remains durable.

## Explicit falsification cases

S4 is not acceptable unless deterministic tests prove all of the following:

1. missing Candidate -> reject;
2. unvalidated Candidate -> reject;
3. active Candidate -> reject;
4. prompt-layer Candidate -> reject and leave prompt promotion semantics unchanged;
5. non-protected target layer -> reject;
6. wrong Candidate artifact SHA -> reject;
7. missing or inconsistent canonical validation artifact -> reject;
8. validation artifact containing a failed regression -> reject;
9. missing human approval reference -> reject;
10. missing PR reference -> reject;
11. malformed, unknown or non-ancestor merge commit -> reject;
12. missing regression evidence -> reject;
13. missing evidence file or evidence SHA mismatch -> reject;
14. corpus report evaluated against a different commit -> reject;
15. incompatible corpus baseline -> reject;
16. corpus regression, expected mismatch or critical false PASS -> reject;
17. exact duplicate application -> idempotent and no rewrite;
18. conflicting second application for the same Candidate -> reject and preserve the original receipt;
19. missing superseded/reversed prior receipt -> reject;
20. valid supersession/reversal reference -> new receipt may be created while the prior receipt remains byte-identical;
21. successful receipt creation leaves Candidate JSON byte-identical and leaves active memory byte-identical;
22. existing `promoteCandidate()` protected/prompt behavior remains unchanged;
23. Full Verifier remains green.

## Out of scope / hard boundaries

- no S5 implementation or benchmark;
- no paid/API/LLM run;
- no Harbor Canary #4;
- no automatic Candidate validation, activation or promotion;
- no automatic protected-layer application;
- no prompt, skill or Production mutation as part of S4;
- no gate weakening;
- no model-default change;
- no retroactive APPLIED/CLOSED claim for historical fixes without an explicit receipt.
