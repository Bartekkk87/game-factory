# Strategy Authority Index

This index prevents dated strategy snapshots from silently competing for authority.

## Current authority

1. `ARCHITECTURE.md` — canonical architecture and current proof boundary.
2. `INDEPENDENT-REAUDIT-REMEDIATION-CLOSURE-2026-08-29.md` — canonical closure record for the independent re-audit residuals, including the trusted required-check root, hardened Learning provenance, repair-budget accounting, transient memory-state handling and exact-main verification.
3. `PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md` — canonical project-progress snapshot for its role until a newer progress snapshot explicitly supersedes it.

Machine-readable status and supersedes links live in `STATUS-CHAIN.json`.

## Current Product experiment

`LUMEN-CURRENT-A-B-CANARY-PLAN-2026-08-29.md` is the Owner-authorized experiment record for the current Lumen Current controlled model comparison. It freezes the already canonical Owner brief and orders the Product runs as OpenAI reference first, followed by the identical OpenRouter/GLM-5.3-Flash challenger, with no learning promotion or configuration mutation between runs. It does not supersede architecture authority.

## Superseded architecture-hardening documents

The following remain valuable historical implementation evidence but no longer describe current open work:

- `ARCHITECTURE-AUDIT-V2-FINAL-RECONCILIATION-2026-08-29.md`
- `ARCHITECTURE-FINALIZATION-TRACK-2026-08-29.md`
- `ARCHITECTURE-AUDIT-V2-HARDENING-2026-08-28.md`

The Architecture Audit v2 reconciliation is superseded for **current audit status** by `INDEPENDENT-REAUDIT-REMEDIATION-CLOSURE-2026-08-29.md`. The older finalization/hardening documents remain upstream historical evidence in that chain.

`PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md` remains explicitly superseded for project-progress status by the post-Lumen snapshot.

Any strategy document not listed in `STATUS-CHAIN.json` as canonical is historical/non-authoritative by default. A dated snapshot may remain useful evidence without becoming current architectural authority.

## Current verification evidence

The independent re-audit remediation reached protected `main` through PR `#42` and PR `#43`. Final main SHA: `47976eb2cdcf4b3e7dfc0a94de86c4949ffaf39a`.

- PR #42 full verifier `33240573571` — **SUCCESS**.
- PR #43 branch verifier `33240599476` — **SUCCESS**.
- PR #43 trusted required `selftest` `33240842212` — **SUCCESS**.
- Exact-main post-merge branch verifier `33240855969` — **SUCCESS in all steps**.

No paid Product Canary and no model-backed S5 benchmark were started by this closure.

## Fresh-chat audit handoff

`NEXT-CHAT-HANDOFF-FINAL-ARCHITECTURE-AUDIT-2026-08-29.md` remains a historical operational handoff used to initiate the independent re-audit. It is intentionally not architectural authority; its residuals are now closed by the canonical independent re-audit remediation record above.
