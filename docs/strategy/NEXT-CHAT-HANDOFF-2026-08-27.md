# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue the `game-factory` project from the current hardened baseline. Do not start another paid Titan production canary yet. Work through the canonical implementation catalog bottom-up, starting at L1 Control Kernel, then L2 Model/Provider Layer, L3 Verification & Evidence, L4 Production Agents, followed by a top-down integrity check.

Canonical requirements:

- `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
- `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
- `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
- `ARCHITECTURE.md`
- GitHub Issue #3: `Production Hardening before Titan Canary #3`

## Current verified technical baseline

The platform commit `84eb3abd6e6b522ba8890f9870c690918d3de6a6` (`feat: escalate stalled repairs to fresh rebuild`) passed the full Verifier Selftest in GitHub Actions Run `33040144465`.

Already implemented before the documentation commits:

- deterministic idea selection from the triggering Git commit;
- provider-aware role model defaults;
- deterministic simulated verifier input sequence;
- syntax/runtime selftests with green/broken fixtures;
- fail-closed evidence;
- candidate SHA binding;
- repair stagnation detection;
- fresh rebuild escalation;
- polish rollback to last verified candidate;
- safe `game.currentScene` getter;
- issue-based Owner `/approve` / `/reject` gate.

Existing reference:

- Gemini-produced `Titan Core: Salvage`: technical PASS, Experience 7.5/10, Audit PASS.
- OpenAI `Titan Core: Reforged` canaries have not reached final success.
- One OpenAI run achieved technical PASS but only Experience 4.1/10; later polish regressed.
- Another OpenAI run stalled in repair on a hallucinated engine-state/API pattern; the platform was subsequently hardened.

## Critical decisions already made

1. No blind paid reruns. Platform defects are fixed before another canary.
2. Release quality must become four explicit gates:
   - Technical PASS
   - Product Fidelity PASS
   - Experience >= 6.5
   - Budget PASS
3. Deterministic machine logic decides release eligibility. An LLM Auditor may summarize evidence but must not overrule machine-verifiable facts.
4. Owner intent becomes an immutable machine-readable Owner Contract with stable Must-Have / No-Go IDs.
5. The Director's acceptance/probe plan must flow into verifier-visible evidence.
6. The Playtester must receive Owner Contract + compact GDD + telemetry + screenshots; Product Fidelity and Experience must be distinct outputs.
7. Verifier evidence needs a deterministic test seed and a start/early/mid/end or periodic telemetry timeline rather than only mid->end comparison.
8. Cost accounting must become real and model-specific; the current `$10` budget is not a reliable hard limit because OpenAI usage does not reliably return `usage.cost`.
9. Engineer context amplification must be reduced later through measured code/context size, an Engine API Contract/Manifest and bounded repairs. Full Rebuild remains available for architectural failures.
10. Do not add an arbitrary tiny game-code hard cap yet. Measure first, calibrate on at least two successful genres, then decide limits.

## Model selection decision

Model selection is role-specific and evidence-driven.

DeepSeek is a prioritized Engineer/coding candidate, but `deepseek/deepseek-chat` must not be hard-coded as the permanent default. A current pinned DeepSeek model should later be benchmarked against the approved reference model on identical recorded factory tasks.

Planned order:

1. finish P0 hardening;
2. full selftest green;
3. exactly one reference `Titan Core: Reforged` canary;
4. freeze the tasks/evidence as eval cases;
5. benchmark current DeepSeek coding candidates on the same Engineer tasks;
6. promote DeepSeek only if quality/fidelity/convergence are at least as good and cost materially improves;
7. repeat on a second game genre before declaring a durable production default.

Do not change the next reference Titan to an unbenchmarked DeepSeek model.

## Immediate work order — start here

### L1 — Control Kernel / P0

Inspect the current code and implement, with tests:

- real token-price accounting for OpenAI/model registry;
- cost evidence per role/model/attempt;
- enforceable per-run budget before subsequent LLM calls;
- explicit limits/budgets for repair, polish and fresh rebuild paths;
- deterministic release-gate function independent of the LLM Auditor;
- unified run evidence schema.

After every meaningful control-kernel change, run/inspect the full GitHub Verifier Selftest. Do not progress on an unverified base.

### Then L2

Build/prepare the role router + provider/model capability and price registry. Preserve provider portability and no silent cross-provider fallback. Prepare DeepSeek as a later benchmark lane, not production default.

### Then L3

Implement Owner Contract + acceptance IDs + deterministic verifier seed + telemetry timeline + contract-specific evidence + Product Fidelity gate.

### Then L4

Adapt Director, Engineer, Playtester and Auditor to the new contracts/gates. Keep deterministic release authority outside LLMs.

### Final integrity check

Walk the flow top-down and prove no Owner requirement can disappear:

`Owner idea -> Owner Contract -> Director acceptance criteria -> Engineer implementation -> verifier evidence -> Fidelity PASS -> Experience PASS -> Budget PASS -> deterministic Release Gate -> Owner preview`.

## Canary rule

Only after all P0 requirements are implemented and the full selftest is green, run exactly one `Titan Core: Reforged` paid canary.

Canary success requires:

- exact owner idea selected;
- real budget accounting;
- technical PASS;
- product fidelity PASS;
- experience >= 6.5;
- repair/fresh-rebuild convergence if needed;
- evidence consistency;
- draft persisted;
- review issue created;
- preview playable.

If the canary fails, classify the failure, fix the platform, selftest, and only then decide whether another paid run is justified.

## Working style

The Owner is a layperson and wants simple status communication, minimal micromanagement and autonomous execution. Do not ask for terminal work or unnecessary confirmation when the repo/tools provide enough information. Keep explanations short and concrete. All work in this context is Gaming Development only.