# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue `Bartekkk87/game-factory` seamlessly from the verified post-L3 hardening state.

**Start directly with L4 — Production Agents / P0.**

L1, L2 and L3 are complete and verified on `main`. Do not reopen them unless a concrete regression test exposes a defect.

**Do not start paid Titan Canary #3 yet.**

## Read these canonical sources first

1. `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
2. `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
3. `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
4. `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
5. `ARCHITECTURE.md`
6. GitHub Issue #3: `Production Hardening before Titan Canary #3`

## Verified technical baseline

Canonical verified `main` runtime head:

`52e843bba72bd3fe83ea2b34475a32e2076dcdee`

Full Verifier Selftest on that runtime head:

- GitHub Actions Run `33046180562` — **SUCCESS**

Documentation commits after this runtime head do not change the verified platform code.

## Completed

### L1 Control Kernel — DONE

Real cost accounting, pre-call budget enforcement, bounded repair/polish/rebuild budgets, deterministic release gate and unified evidence are implemented and verified.

### L2 Model / Provider Layer — DONE

Fail-closed Role Router, provider/capability/price registries and no silent cross-provider fallback are implemented and verified. Reference matrix: Director/Engineer/Playtester `gpt-5.6-terra`, Auditor `gpt-5.6-luna`, Release Verdict no LLM. DeepSeek remains benchmark-only.

### L3 Verification & Evidence — DONE

Implemented and verified:

- immutable Owner Contract with stable `MH-xx` / `NG-xx` IDs and hash;
- Owner-ID -> Director acceptance/probe traceability;
- deterministic verifier seed + persisted input sequence;
- `start -> early -> mid -> end` telemetry;
- bounded runtime/mechanic events;
- deterministic Product Fidelity PASS/FAIL;
- Technical + Fidelity integration in build/repair/polish;
- Green/Broken fixtures for all new hard checks;
- end-to-end runtime proof that real gameplay-value change passes and fake decorative upgrade fails.

L3 verification runs: `33045193747`, `33045457760`, `33045637678`, `33045912220`, `33046078946`, final `main` `33046180562` — all **SUCCESS**.

## Immediate work order — L4 Production Agents / P0

After every meaningful change, the **full Verifier Selftest must be green before continuing**.

### Engineer

- remove stale `random input / ~15 seconds` wording from `factory/prompts/engineer.md`;
- describe deterministic fixed verifier input + early evidence accurately;
- pass immutable Owner Contract explicitly into Build / Repair / Rebuild / Polish;
- pass relevant acceptance/probe mappings explicitly;
- require bounded runtime evidence for product-specific mechanics when generic score/state cannot prove them;
- preserve repair, fresh rebuild and verified-polish rollback behavior.

### Playtester

Pass Owner Contract, compact GDD, acceptance/probe mapping, telemetry, runtime/mechanic events, screenshots and objective metrics.

Return separate outputs for independent product-fidelity review and Experience score/critique. Deterministic Product Fidelity remains machine authority.

### Auditor

Remain advisory only. Summarize Technical, deterministic Fidelity, Playtester fidelity review, Experience, Budget and deterministic Release Verdict without becoming release authority.

### Reference model lane

Confirm the prepared GPT-5.6 matrix is the actual reference route and covered by router/capability tests. Do not use unbenchmarked DeepSeek for the reference Titan.

## After L4

Run the full selftest, then perform the top-down integrity check:

`Owner idea -> Owner Contract -> Director Acceptance/Probe IDs -> Engineer -> deterministic verifier evidence -> Product Fidelity PASS -> Playtester fidelity review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

No Owner requirement may disappear between layers.

## Canary rule

**No Titan Canary #3 before L4 P0 + full green selftest + top-down integrity check.**

Then run exactly one paid `Titan Core: Reforged` reference canary. If it fails: classify -> repair platform -> full selftest -> only then decide on another paid run.

## Branch note

`hardening/l4-production-agents` exists from the verified L3 state. No L4 code commit is accepted as verified yet. Treat runtime commit `52e843bba72bd3fe83ea2b34475a32e2076dcdee` as canonical until a new L4 commit passes the full selftest.

## Working style

Communicate briefly and simply. Avoid owner terminal work or micromanagement when GitHub/tools can perform the work autonomously. Gaming Development only.
