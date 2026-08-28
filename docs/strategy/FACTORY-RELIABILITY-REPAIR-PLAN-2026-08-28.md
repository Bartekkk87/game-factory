# Factory Reliability Repair Plan — 28.08.2026

## Decision

Source audit: `RELIABILITY-AUDIT-2026-08-28.md` (external zero-paid falsification sweep, current code baseline after PR #18/#19/#20/#21).

Audit verdict: **REPAIR BEFORE CANARY #4**.

No architecture redesign is authorized or warranted by the audit. The factory remains **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.

No Harbor Canary #4, no alternative paid Game/API run, no OpenRouter/DeepSeek comparison and no automatic protected-layer promotion are authorized by this plan.

## Why the next step is repair, not another canary

The audit reproduced one load-bearing P0 blind spot and several bounded reliability defects. The prior Canary repairs remain valid and did not regress, but the verifier test surface was too weak: existing fixtures largely model `any keydown = progress` and therefore did not prove that the generic verifier can actually navigate a game world.

The critical P0 is **Action Reachability**: the current deterministic key cycle alternates opposing directions in short pulses, so locomotion largely cancels itself. The audit measured ~37 px maximum displacement over 40 seconds in a real navigate→collect→deliver fixture and replayed the real Canary #3 candidate against current HEAD: Failure/HUD now pass, while Success/Restart still fail because the verifier never reaches success.

Therefore another paid Harbor run now would be confounded and is not a meaningful experiment.

## Repair sequence

### Package 1 — Action Reachability (P0, blocks Canary #4)

Close D-1 as a class, not just the Harbor instance.

Required outcome:
- make the verifier action policy explicit/durable in the proof contract and role context;
- make the generic deterministic harness capable of meaningful locomotion across the playfield;
- keep it game-agnostic, deterministic and seeded;
- no Harbor-specific route, no teleport, no target knowledge, no self-attestation or hidden test backdoor;
- add a real navigation regression fixture in which a player must travel at least ~300 px to reach a target;
- prove the idle control remains unchanged and independent.

Preferred implementation principle: publish the action contract **and** improve the generic action policy. Publishing the current limitation alone is not sufficient for a general-purpose Game Factory.

### Package 2 — Control Reliability (P1)

Close D-2 and D-6.

D-2 Repair Stagnation / Fresh Rebuild:
- stop comparing raw jitter-heavy failure details as the stagnation signature;
- use stable/bucketed failure classes or stable failed-check IDs;
- preserve Best-So-Far;
- trigger Fresh Rebuild only after bounded repeated semantic stagnation;
- add regression: same failed checks with different FPS/pixel detail must still count as stagnation; a genuinely different failure set must not.

D-6 Durable Failure Evidence:
- verifier/infrastructure exceptions must fail closed into durable `RUN-EVIDENCE.json` + `FAILURE.json` when possible;
- controlled learning must still run when a durable failed-run receipt exists;
- add deterministic injected-verifier-failure test.

### Package 3 — Verifier Integrity (P2 hardening before trusting new-game PASS)

Close D-4, D-5 and D-9.

D-4 Product Fidelity self-attestation gaps:
- extend correlated gameplay requirements to positive `event_value_change` Must-Haves and positive No-Go event evidence where appropriate;
- do not accept `event_absent` as sole evidence for a positive Must-Have;
- preserve legitimate negative No-Go use cases;
- add adversarial title-screen spoof fixtures.

D-5 Input Causality:
- do not treat `active survived while idle died` with score+0/events+0 as sufficient gameplay causality;
- require an actual positive gameplay advance/effect.

D-9 State semantics:
- migrate `factory/src/verify/contract.mjs` away from hard-coded `playing/gameover/won` checks to the existing canonical state semantics;
- preserve raw runtime states in evidence.

### Package 4 — Learning Falsification (P2)

Close D-7.

Required outcome:
- autonomous root-cause learning must be able to flag an **unknown raw terminal state** as possible verifier-vocabulary incompleteness;
- it must not merely duplicate the verifier alias table under another name;
- add synthetic `completed`-style fixture proving the dossier names the raw state and targets verifier vocabulary;
- remain advisory/inactive, with no autonomous validation/promotion.

### Package 5 — Cross-game readiness before first non-Harbor game

Close D-3 and D-8 before expanding beyond Harbor.

D-3 Temporal Proof Reachability:
- replace prose/regex round-duration inference with an explicit typed GDD field such as `roundSeconds` where terminal timing matters;
- fail closed if a required terminal proof cannot fit inside configured proof limits;
- do not silently clamp an unreachable round and report `pass=true`.

D-8 Wallclock Envelope:
- calculate worst-case verification/run wallclock from the compiled proof plan and configured attempt/polish budgets;
- fail closed before Engineer spend if the plan cannot fit the allowed execution envelope;
- GitHub workflow timeout must be consistent with the configured envelope, not an unrelated flat guess.

## Validation discipline

For every repair package:
1. reproduce the original audit defect with a deterministic fixture;
2. implement the minimal class-level repair;
3. prove the new fixture passes/fails as intended;
4. run all relevant focused regressions;
5. run the complete Full Verifier;
6. only merge after branch PASS;
7. run the complete Full Verifier again on real `main`;
8. persist evidence and update the corresponding learning/validation record where applicable.

No package may weaken Product Fidelity, replace independent evidence with generated-game claims, or introduce a new control component without a newly proven failure mode.

## Canary #4 re-entry gate

Harbor Canary #4 remains **NO-GO** until Packages 1–4 are green on `main`.

Before any paid run, perform a zero-paid replay of the frozen Harbor Courier candidate/brief against the repaired current verifier.

Required evidence before requesting Owner approval for Canary #4:
- locomotion/navigation fixture PASS;
- Harbor replay can genuinely reach the success path under the generic harness;
- MH-04 Failure proof PASS;
- MH-06 Success proof PASS;
- MH-07 Restart-after-terminal proof PASS;
- MH-08 layout/HUD proof PASS;
- no regression in Best-So-Far, proof reachability, terminal semantics, Product Fidelity, learning lifecycle or cost/budget safety;
- Full Verifier PASS on branch and on `main`.

Only then may the Owner be asked for a fresh explicit authorization for exactly one paid Harbor Courier Canary #4 using the same frozen brief and the OpenAI production baseline.

## Architecture conclusion

The audit indicates **mostly healthy stabilisation with one load-bearing blind spot**, not a failed architecture. The corrective principle for this repair cycle is:

> Repair the whole failure class and add a fixture from a game shape the Factory has not previously relied on — do not merely harden the exact instance that the last canary exposed.
