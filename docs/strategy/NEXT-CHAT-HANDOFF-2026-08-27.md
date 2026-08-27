# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission

Continue `Bartekkk87/game-factory` seamlessly from the verified L4/P0 closure state.

**L1, L2, L3 and L4/P0 are complete.**

Do not reopen them unless a regression exposes a concrete defect.

**No paid Titan Canary #3 has been started.**

## Canonical sources

1. `docs/strategy/HARDENING-STATUS-2026-08-27-L4.md`
2. `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
3. `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
4. `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
5. `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
6. `ARCHITECTURE.md`
7. GitHub Issue #3 — `Production Hardening before Titan Canary #3`

## Verified L4 code state

Working branch used for L4:

`hardening/l4-production-agents`

Final L4 code head before documentation-only commits:

`ce0d061cbad98e8f2f5948e0910fd300dbd0b573`

The dedicated production-agent test is now an explicit step in `.github/workflows/verify.yml`:

`node factory/src/roles/test-production-agents.mjs`

Final full branch Verifier Selftest:

GitHub Actions Run `33050867522` — **SUCCESS**.

This run includes:

- Node syntax checks;
- L1 Control Kernel budgets/release gate;
- L2 Role Router/capability gates;
- L4 Production-Agent integrity;
- browser verifier;
- Green/Broken verifier fixtures;
- publishing gates/gallery escaping.

## L4 closure result

**L4 Production Agents / P0 — DONE.**

Implemented and verified:

### Engineer

- deterministic verifier wording;
- immutable Owner Contract in Build / Repair / Rebuild / Polish;
- Acceptance/Probe traceability passed explicitly;
- bounded runtime mechanic evidence;
- fail-closed contract handling;
- Repair, Fresh Rebuild and verified-polish rollback preserved.

### Playtester

Receives Owner Contract, compact GDD, Acceptance/Probe mapping, telemetry, runtime events, screenshots, objective metrics and deterministic Product Fidelity.

Returns separate:

- independent Product Fidelity review;
- Experience score + critique.

Playtester fidelity remains advisory.

### Auditor

- strictly advisory;
- no release PASS/FAIL authority;
- stray `verdict` fields sanitized;
- sees Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release state.

### Reference lane

- Director -> `gpt-5.6-terra`
- Engineer Build / Repair / Rebuild / Polish -> `gpt-5.6-terra`
- Playtester -> `gpt-5.6-terra`
- Auditor -> `gpt-5.6-luna`
- Release Verdict -> no LLM

DeepSeek remains a later benchmark lane.

## Top-down integrity check — PASS

Verified chain:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

No Owner requirement disappears between intake and review.

Owner Preview path is gated correctly:

- only deterministic release PASS writes the draft;
- Production workflow commits draft/evidence and opens the Review Issue;
- on `main`, Pages deploys the preview;
- Owner then uses `/approve` or `/reject`.

## Immediate operational next step

Merge `hardening/l4-production-agents` to `main` and require the full `main` Verifier Selftest to remain green.

After that, the hardening prerequisite for exactly one controlled paid `Titan Core: Reforged` Canary #3 is satisfied.

**Do not start that paid canary without a new explicit Owner instruction.**

If the later Canary #3 fails:

`classify cause -> repair platform -> full selftest -> only then decide whether another paid run is justified`

## Working style

Brief, simple status communication. No unnecessary Owner terminal work or micromanagement when GitHub/tools can do it. Gaming Development only.
