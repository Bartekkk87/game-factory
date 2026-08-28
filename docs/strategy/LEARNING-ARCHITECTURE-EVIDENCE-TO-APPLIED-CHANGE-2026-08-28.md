# Game Factory — Learning Architecture: Evidence to Applied Change — 28.08.2026

## Status

The Factory learning architecture is an **evidence-driven controlled-improvement system**. It is not model-weight training and it is not a self-authorizing self-modification loop.

The real Lumen Current case has now demonstrated the architecture/application lifecycle through **`APPLIED-CLOSED`** while the Learning Candidate remains `validated`, `active=false`.

Canonical lifecycle:

`real event -> durable evidence -> deterministic classification/root cause -> bounded inactive candidate -> explicit validation/regression -> validated inactive -> human-reviewed protected-layer application -> post-merge regression -> durable APPLIED-CLOSED application receipt`

The purpose is to convert demonstrated failures into reusable Factory-level improvements while keeping release, protected-layer mutation and paid execution outside autonomous model authority.

## 1. Authority model

Automatic Learning may:
- read durable Production, Owner and Evaluation evidence;
- aggregate deterministic facts;
- classify supported failure signatures;
- create bounded root-cause findings;
- create an inactive candidate when policy permits;
- propose a validation plan.

Automatic Learning may not:
- mark its own candidate validated;
- activate or promote a candidate;
- mutate protected Production layers without the normal reviewed change path;
- weaken verifier/release gates;
- change its own authority;
- start a paid retry.

Protected layers include:

`skill`, `prompt`, `owner-contract`, `verifier`, `product-fidelity`, `release-gate`, `engine-contract`, `control-plane`, `evaluation`.

## 2. Why Skills are part of Learning

Skills are persistent role guidance assembled into future Production prompts. Therefore they are a legitimate Learning target when evidence shows that a role-level behavioral rule is missing.

Current persistent skills include at least:
- `skills/directing.md`
- `skills/engineering.md`
- `skills/art-direction.md`

A failure must be causally attributable before a skill is changed. A Director failure does not justify an Engineering or Art-Direction skill mutation without evidence.

Skill changes remain protected: the Learning system may propose them, but application requires validation/regression and human-reviewed merge.

## 3. Real worked example — Lumen Current Canary #1

### Production event

Owner-authorized Produce Game run:
- GitHub Actions run `33207019862`
- durable run `runs/20260828-201007/`
- failure evidence commit `70200dce341fc06d0213991ff569481dd99774f6`
- Director model `openai:gpt-5.6-terra`
- settled cost `$0.050686`
- tokens `7,883`
- Engineer / Repair / Polish calls `0 / 0 / 0`

The Director emitted:
- `PR-MH-03 -> state_reached: restored`
- `PR-MH-04 -> state_reached: glass_breach`

The verifier supports a finite technical state protocol, including canonical states such as `boot`, `title`, `playing`, `success`, `failure` plus explicitly mapped aliases. The product-specific values above were rejected before Engineer spend.

Classification:

`Director-to-Verifier state contract mismatch`

This was a **Factory Production Failure Before Build**, not an Owner Product Reject, because no playable draft existed.

### Durable evidence

The failure was preserved in `FAILURE.json` and `RUN-EVIDENCE.json`. The first-generation root-cause implementation did not yet recognize this early Director failure and therefore produced no Candidate. That historical receipt remains unchanged as truthful audit evidence.

### Deterministic reanalysis

The Learning root-cause logic was extended to recognize the exact bounded signature:

`director_failed + "uses unsupported verifier state"`

For the real Lumen evidence it now produces:
- finding: `director-verifier-state-contract-mismatch`
- role: `director`
- target layer: `skill`
- confidence: `1`
- evidence values include `PR-MH-03=restored` and `PR-MH-04=glass_breach`.

The root-cause checker intentionally does not import the verifier state vocabulary it is supposed to challenge, preserving diagnostic independence.

### Learning Candidate

Durable candidate:

`learning/candidates/candidate-production-run-b37ac8d268e8549c.json`

Candidate meaning:
- the Director must receive the finite verifier-state protocol explicitly;
- `state_reached` may only use supported protocol values;
- thematic/game-specific semantics such as `restored`, `breached` or `escaped` belong in gameplay events, UI copy or world-state data, not the verifier-state field.

Lifecycle state after validation:

`status=validated`, `active=false`

The Candidate is proven enough for reviewed application but cannot autonomously enter Production as an active Memory lesson.

## 4. Bounded repair derived from the evidence

The repair deliberately did **not** weaken the fail-closed verifier and did **not** add arbitrary aliases such as `restored` or `glass_breach`.

Instead:
1. `verifierStateContract()` exposes the finite state protocol from verifier truth.
2. Director runtime receives `verifierStateContract` beside Owner Contract and action contract.
3. `factory/prompts/director.md` requires `state_reached` to use only allowed protocol values.
4. `skills/directing.md` contains the generalized role-level rule separating verifier protocol from fiction/product semantics.
5. root-cause analysis recognizes this early failure class from durable `FAILURE.json` even without GDD/Engineer attempts.
6. automatic orchestration is regression-tested to produce an inactive Director skill candidate for this failure class.
7. Production idea-file ingestion preserves exact Owner brief bytes so preflight and Production share the same `ownerBriefSha256`; full Contract SHA may still differ intentionally because source provenance is part of the contract digest.

## 5. Validation architecture

Learning is not accepted because a patch "looks right".

The candidate must survive:
- exact failure reproduction/diagnosis tests;
- Owner Contract/preflight tests;
- Controlled Learning lifecycle/orchestration tests;
- proof-plan reachability tests;
- Golden Corpus regression;
- terminal/HUD/causality/browser verification;
- publishing integrity tests.

Evidence completed before human merge:
- Full Verifier `33208519229` — SUCCESS, all 37 steps;
- Full Verifier `33209130248` — SUCCESS, all 37 steps;
- validated-inactive enforcement Full Verifier `33209616277` — SUCCESS;
- frozen Golden Corpus remains `29/29`, `0` mismatches, `0` Critical False PASS;
- Learning/Corpus validation API/model cost `$0`.

## 6. Human application and S4 closure

PR `#36` — `fix(learning): close Lumen director-state contract gap` — was merged after the validated-inactive evidence gate.

Merge commit:

`7af126e3300b23c19bd088ca32c08c7e81947d8b`

Exact-main post-merge Full Verifier:
- run `33211092911`
- result **SUCCESS in all 37 steps**
- evaluated executable merge `7af126e3300b23c19bd088ca32c08c7e81947d8b`.

Golden Corpus on that executable merge:
- 29/29 Expected Outcomes
- 0 mismatches
- 0 Critical False PASS
- 0 model/API cost for Corpus execution.

Durable application evidence:
- `learning/evidence/applications/candidate-production-run-b37ac8d268e8549c-full-verifier.json`
- `evaluation/results/LUMEN-LEARNING-APPLICATION-CORPUS-7af126e.json`
- `learning/applications/candidate-production-run-b37ac8d268e8549c.json`.

Application terminal state:

**`APPLIED-CLOSED`**

The receipt binds the exact validated Candidate, validation artifact, protected `skill` target, PR `#36`, merge SHA, human approval reference, exact-main verifier and compatible Golden Corpus PASS.

Crucial invariant: this application closure does **not** set the Candidate to `active=true`. The Candidate remains `validated`, `active=false`. The merged skill/runtime/contract files are Production truth through the human-reviewed Git path; this is distinct from active Memory-lesson promotion.

## 7. Golden Corpus role

The Lumen regression is attached to the existing root-cause/learning falsification execution path used by the Golden Corpus seed `fr-root-cause-diagnostic-independence`.

The frozen S2 population remains 29 cases; the baseline is not silently rewritten merely to make a new failure appear green. If the Lumen assertions regress, the executable seed script fails and the Corpus evaluation becomes non-green.

Golden Corpus is therefore **regression evidence**, not mutation authority.

## 8. The reusable architecture pattern

The domain-specific pieces in this example are the game brief, game verifier probes and game skills. The deeper control pattern is more general:

`Intent/Contract -> Worker -> Observable Evidence -> Deterministic/Governed Gate -> Failure Taxonomy -> Candidate Improvement -> Validation Corpus -> Human Application -> Audit Trail`

This suggests a potentially reusable architecture beyond Gaming, but that portability is a **hypothesis for the next analysis**, not a claim proven by this repository. Any transfer must separately define domain truth, deterministic/independent evidence, protected layers, release/decision authority, validation corpus and human approval boundaries.

## 9. Current proof boundary

Now demonstrated:
- a real paid Production failure generated durable evidence;
- the Factory can deterministically recognize this early failure class;
- the failure maps to a bounded protected-layer Learning Candidate;
- the Candidate can be validated zero-paid while remaining inactive;
- the validated repair can pass the human-reviewed merge boundary;
- exact-main post-merge regression proves the merged implementation;
- an immutable SHA-bound S4 application receipt closes the application as `APPLIED-CLOSED`;
- the learned Director rule is persistent in the verified skill/runtime contract.

Still not demonstrated:
- that this Lumen-derived improvement produces a later playable Lumen retry or Owner-accepted game;
- that the architecture transfers unchanged to non-gaming domains;
- that the Factory is self-authorizing or fully self-modifying.

No second paid Lumen run is authorized by this document.
