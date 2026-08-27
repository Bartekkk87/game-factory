# Next Chat Handoff — Game Factory Production Hardening

Date: 2026-08-27
Repository: `Bartekkk87/game-factory`

## Mission
Continue `Bartekkk87/game-factory` seamlessly from the verified post-L3 hardening state.

**Start directly with L4 — Production Agents / P0.**

L1, L2 and L3 are complete and verified. Do not reopen them unless a regression test exposes a concrete defect. **Do not start paid Titan Canary #3 yet.**

## Canonical sources
1. `docs/strategy/HARDENING-STATUS-2026-08-27-L1-L3.md`
2. `docs/strategy/IMPLEMENTATION-CATALOG-2026-08-27.md`
3. `docs/strategy/PRODUCTION-HARDENING-PLAN.md`
4. `docs/strategy/LLM-SELECTION-REQUIREMENTS.md`
5. `ARCHITECTURE.md`
6. GitHub Issue #3 — `Production Hardening before Titan Canary #3`

## Verified baseline
Runtime commit: `52e843bba72bd3fe83ea2b34475a32e2076dcdee`

Full Verifier Selftest: GitHub Actions Run `33046180562` — **SUCCESS**.

Documentation-only commits after this runtime commit do not change the verified platform code.

## Completed
- **L1 Control Kernel — DONE**
- **L2 Model / Provider Layer — DONE**
- **L3 Verification & Evidence — DONE**

L3 now provides immutable Owner Contract IDs (`MH-xx` / `NG-xx`), Director Acceptance/Probe traceability, deterministic seed and input sequence, `start -> early -> mid -> end` telemetry, bounded runtime/mechanic events, deterministic Product Fidelity PASS/FAIL, production-path fidelity enforcement, and Green/Broken/end-to-end runtime fixtures.

L3 verification runs `33045193747`, `33045457760`, `33045637678`, `33045912220`, `33046078946`, and final `main` Run `33046180562` all succeeded.

## L4 — immediate work order
After every meaningful change: **full Verifier Selftest -> continue only when green**.

### Engineer
- remove stale `random input / ~15 seconds` wording;
- align prompt with deterministic fixed verifier input + early evidence;
- pass immutable Owner Contract explicitly to Build/Repair/Rebuild/Polish;
- pass Acceptance/Probe mappings explicitly;
- require bounded runtime evidence for product-specific mechanics;
- preserve repair, fresh rebuild and verified-polish rollback behavior.

### Playtester
Pass Owner Contract, compact GDD, Acceptance/Probe mapping, telemetry, runtime events, screenshots and metrics.

Return separate:
- independent Product Fidelity review;
- Experience score + critique.

Deterministic Product Fidelity remains machine authority.

### Auditor
Remain advisory. Summarize Technical, deterministic Fidelity, Playtester fidelity, Experience, Budget and deterministic Release Verdict without becoming release authority.

### Reference lane
Confirm Director/Engineer/Playtester -> `gpt-5.6-terra`, Auditor -> `gpt-5.6-luna`, Release Verdict -> no LLM is the actual reference route and router-tested. Do not use unbenchmarked DeepSeek for the reference Titan.

## Then top-down integrity check
`Owner idea -> Owner Contract -> Director IDs -> Engineer -> deterministic verifier evidence -> Product Fidelity PASS -> Playtester fidelity review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

No Owner requirement may disappear.

## Canary rule
**No Titan Canary #3 before L4 P0 + full green selftest + top-down integrity check.**

Then exactly one paid `Titan Core: Reforged` reference canary. If it fails: classify -> repair platform -> full selftest -> only then decide on another paid run.

## Branch note
`hardening/l4-production-agents` exists from the verified L3 state. No L4 code commit has been accepted as verified. Treat runtime commit `52e843bba72bd3fe83ea2b34475a32e2076dcdee` as canonical until a new L4 commit passes the full selftest.

## Working style
Brief, simple status communication. Avoid owner terminal work and micromanagement when GitHub/tools can do the work. Gaming Development only.
