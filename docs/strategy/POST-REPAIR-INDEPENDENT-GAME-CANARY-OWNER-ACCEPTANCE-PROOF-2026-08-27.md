# POST-REPAIR INDEPENDENT GAME CANARY — OWNER ACCEPTANCE PROOF

Stand: 27.08.2026

## 0. Decision

The Game Factory architecture-hardening phase is considered complete for the currently evidenced defect set.

Current executable baseline before this decision:

- `main`: `7538ce8c2be96e35e2d7e23ff6fdbefcfcb4b6ae`
- PR #16: independent HUD/layout geometry repair merged
- Post-merge Full Verifier: `33110347639` — SUCCESS
- Open GitHub issues before this milestone decision: 0
- Both Titan learning candidates remain `status=candidate`, `validatedAt=null`, `active=false`

There is currently no proven technical audit blocker that justifies adding more architecture solely for completeness.

The next milestone changes the mode from **architecture hardening** back to **product proof**.

## 1. Next milestone

**Post-Repair Independent Game Canary — Owner Acceptance Proof**

Purpose:

> Prove whether the hardened Factory can transform a clean, explicit, non-Titan Owner brief into a real game that passes the technical Factory gates **and** the Owner hands-on acceptance test.

This is deliberately **not another Titan run**. The new Canary must be independent enough to reduce Titan-specific overfitting risk.

## 2. Why this is the next step

Titan #3 proved that technical PASS and Product Fidelity PASS did not guarantee Owner product acceptance.

Since then the Factory has been hardened in the relevant evidence chain, including:

- event-causal Controlled Learning triggers,
- held-out Candidate validation,
- safer Owner freeform decomposition,
- explicit Product Fidelity evidence authority / scope,
- target-layer-safe Learning promotion semantics,
- independent HUD/layout Canvas geometry verification,
- full Good/Bad regression and publishing regression.

The highest-value remaining PoC question is therefore no longer "can we add another control?" but:

> Does the repaired Factory now produce an Owner-acceptable game from a clean independent brief?

## 3. Mandatory sequence

### Phase A — Independent Canary brief design

Prepare one new game concept that is materially independent from Titan.

The Owner brief must explicitly distinguish:

1. hard Must-Haves,
2. hard No-Gos,
3. concrete perspective / presentation requirements where intended,
4. gameplay identity / core player action,
5. visual / environment direction where intended,
6. HUD/readability requirements where intended,
7. quality / experience target where genuinely intended,
8. deliberately open creative space,
9. unknown / unspecified details.

Do not add requirements merely to make the brief easier for the verifier.
Do not convert references, mood, inspiration or unspecified detail into hard Owner requirements.

### Phase B — Zero-paid-run deterministic preflight

Before any Production Game/API run, inspect the real current `main` and prove that the proposed brief is handled correctly.

At minimum verify:

- raw Owner brief is preserved durably,
- explicit Must-Haves become stable Owner requirements,
- explicit No-Gos become stable constraints,
- vague/mood/reference content is not inflated into hard requirements,
- deliberately open decisions remain open,
- Director receives the complete raw Owner idea plus Owner Contract,
- Acceptance Criteria / Product Fidelity only claim coverage they actually possess,
- HUD/layout requirements that map to supported geometry are independently verifier-owned,
- no historical Titan expectation is imported into the new brief,
- no active Learning Candidate/Lesson silently changes Production behavior.

The preflight should use deterministic fixtures / contract assertions / existing verifier paths where possible.

### Phase C — Owner decision gate

After the preflight, stop and present the Owner with:

- the exact proposed Owner brief,
- the normalized Owner Contract interpretation,
- what is hard requirement vs. direction vs. open,
- what Product Fidelity can verify independently,
- what remains qualitative / Owner-only,
- expected paid-run scope/cost boundary if available from existing budget logic,
- remaining risks.

**No paid Game/API Production run may start without a new explicit Owner approval after this presentation.**

### Phase D — One real Production Canary, only after approval

If and only if the Owner explicitly approves the paid Canary:

- start exactly one independent Production Game run,
- use the normal durable Factory path,
- do not bypass gates,
- retain all run/evidence artifacts,
- do not manually improve the game outside the Factory during the proof,
- do not change architecture mid-run unless a proven blocking defect requires a separately evidenced repair.

### Phase E — Owner hands-on acceptance

After the Factory produces the candidate:

- Owner downloads/plays the delivered artifact,
- Owner returns ACCEPT or REJECT with concrete product feedback,
- technical PASS is not treated as product acceptance,
- Product Fidelity PASS is not treated as Owner acceptance.

## 4. Success / failure interpretation

### If Owner ACCEPTS

This becomes the first strong post-repair end-to-end proof that the hardened Factory can produce an Owner-acceptable game from an independent brief.

It still does **not** by itself prove a fully self-improving Factory.

### If Owner REJECTS

Do not immediately patch architecture.

Use the new clean evidence chain to determine whether the rejection is caused by:

- brief / acceptance-baseline mismatch,
- Owner Contract interpretation defect,
- Director design failure,
- Engineer implementation failure,
- verifier/evaluation blind spot,
- product-quality failure despite correctly followed requirements,
- newly discovered Owner preference.

Only evidenced recurring/systemic failure modes may justify a new Learning Candidate or architecture repair.

## 5. Learning proof after this milestone

The larger missing proof remains:

`Owner Reject -> durable evidence -> bounded analysis -> inactive Candidate -> independent validation -> human promotion -> later independent game -> measurable Owner-accepted improvement`

Only after that chain is demonstrated may the Factory claim evidence stronger than **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

No automatic Candidate validation, activation or protected-layer promotion is authorized.

## 6. Explicit non-goals

This milestone does NOT authorize:

- another broad architecture audit,
- another Titan Canary,
- a paid Production Game/API run before the explicit Phase-C Owner approval,
- automatic Candidate validation or activation,
- automatic protected-layer promotion,
- new Product Truth / control-plane components without a proven failure mode,
- manual Owner terminal work,
- architecture changes merely to improve theoretical completeness.

## 7. Owner role

The Owner remains Sponsor and milestone playtester, not technical operator.

Before the paid run, the only required Owner action is the explicit go/no-go decision on the prepared Canary and its preflight interpretation.

After the run, the Owner's required action is hands-on product acceptance feedback.

## 8. Current decision boundary

**NOW:** prepare independent Canary + deterministic zero-paid preflight.

**STOP BEFORE:** paid Production Game/API execution.

**NEXT HUMAN GATE:** explicit Owner approval of the exact Canary brief and preflight result.

Proof boundary remains:

**EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**
