# Strategy Authority Index

This index prevents dated strategy snapshots from silently competing for authority.

## Current authority

1. `ARCHITECTURE.md` — canonical architecture and current proof boundary.
2. `INDEPENDENT-REAUDIT-REMEDIATION-CLOSURE-2026-08-29.md` — canonical closure record for the independent re-audit residuals, including the trusted required-check root, hardened Learning provenance, repair-budget accounting, transient memory-state handling and exact-main verification.
3. `PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md` — canonical project-progress snapshot for its role until a newer progress snapshot explicitly supersedes it.

Machine-readable status and supersedes links live in `STATUS-CHAIN.json`.

## Current independent audits

`PROJECT-GAME-MODE-V0.1-INDEPENDENT-AUDIT.md` is the independent adversarial audit record for
GitHub PR #64 (`Project Game Mode v0.1: bounded deterministic foundation`, not merged). Verdict:
NO-GO, with three P0 findings reproduced against the exact audited PR head. It is an audit/
evidence record, not project-game architecture authority — the canonical
`PROJECT-GAME-MODE-V0.1-*` documents above are unaffected and unchanged by it. Do not treat it
as superseding them; it evaluates whether their implementation in PR #64 can be trusted, not
their design.

The audit document carries its own revision log (`## 0. Erratum`) rather than being replaced on
correction: two post-publication review passes adjusted severity on secondary findings and
withdrew an unauthoritative AC-PG-numbered scorecard in favor of qualitative control categories.
Neither pass changed the NO-GO verdict or the three P0 findings.

`PROJECT-GAME-MODE-V0.1-REMEDIATION-HANDOFF.md` closes the audit loop by Owner decision and is
the authoritative bounded implementation handoff. It freezes the accepted findings, corrects
the final Tree-SHA interpretation, defines the remediation order and requires executable
negative regression tests before any blocker can be closed. No further broad audit is planned.
This index registration is the final change in the audit PR so the Branch Verifier and trusted
required check bind to the exact handoff head rather than to an earlier documentation commit.

## Current Product experiment

`LUMEN-CURRENT-A-B-CANARY-PLAN-2026-08-29.md` remains the Owner-authorized experiment record for the Lumen Current controlled model comparison. It freezes the canonical Owner brief and comparison controls. Later evidence must not silently change those controls.

`NEMOTRON-FREE-ROLE-TOKEN-CEILINGS-FINDINGS-2026-08-29.md` is the current evidence record for the role-specific completion ceilings, GLM Engineer 12k truncation finding, explicit NVIDIA/OpenRouter free routing, and Nemotron Free Run #53 transport-timeout result. It does not declare a model winner and does not authorize another model-backed run.

Run A startup attempt `33243106384` aborted before the Production pipeline and before any model/API invocation because the merge-trigger idea resolver did not identify the newly merged `ideas/**` file. PR #47 corrected that startup path and the legacy binary-state cleanup boundary without changing the experiment. The successful OpenAI reference and subsequent GLM/Nemotron evidence are preserved in their dedicated run records and current findings document.

## Superseded architecture-hardening documents

The following remain valuable historical implementation evidence but no longer describe current open work:

- `ARCHITECTURE-AUDIT-V2-FINAL-RECONCILIATION-2026-08-29.md`
- `ARCHITECTURE-FINALIZATION-TRACK-2026-08-29.md`
- `ARCHITECTURE-AUDIT-V2-HARDENING-2026-08-28.md`

The Architecture Audit v2 reconciliation is superseded for **current audit status** by `INDEPENDENT-REAUDIT-REMEDIATION-CLOSURE-2026-08-29.md`. The older finalization/hardening documents remain upstream historical evidence in that chain.

`PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md` remains explicitly superseded for project-progress status by the post-Lumen snapshot.

Any strategy document not listed in `STATUS-CHAIN.json` as canonical is historical/non-authoritative by default. A dated snapshot may remain useful evidence without becoming current architectural authority.

## Current verification evidence

The independent re-audit remediation reached protected `main` through PR `#42` and PR `#43`. Its historical closure SHA is `47976eb2cdcf4b3e7dfc0a94de86c4949ffaf39a`.

The later role-token-ceiling / free-route hardening reached `main` through PR `#56` at `c339979eb4cff13bb4ff7c10eee0570956693684`:

- PR #56 branch verifier `33252188281` — **SUCCESS**.
- PR #56 trusted required selftest `33252189410` — **SUCCESS**.
- Exact-main post-merge verifier `33252481657` — **SUCCESS**.

Nemotron Free Production Run #53 (`33252485756`, runtime `20260829-122640`) failed closed in the Director transport after exactly 360 seconds. This is transport/latency evidence, not Product-quality evidence and not authorization for a rerun.

## Fresh-chat handoff

`NEXT-CHAT-HANDOFF-NEMOTRON-FREE-2026-08-29.md` is the current operational handoff for continuing the model/transport evaluation after PR #56 and Nemotron Free Run #53. It is not architectural authority and explicitly requires a live GitHub/Notion re-read before any next model-backed action.

`NEXT-CHAT-HANDOFF-FINAL-ARCHITECTURE-AUDIT-2026-08-29.md` remains a historical operational handoff used to initiate the independent re-audit. It is intentionally not architectural authority; its residuals are now closed by the canonical independent re-audit remediation record above.
