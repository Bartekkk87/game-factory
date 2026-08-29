# Strategy Authority Index

This index prevents dated strategy snapshots from silently competing for authority.

## Current authority

1. `ARCHITECTURE.md` — canonical architecture and current proof boundary.
2. `ARCHITECTURE-AUDIT-V2-FINAL-RECONCILIATION-2026-08-29.md` — canonical finding-by-finding Architecture Audit v2 closure and residual-risk ledger.
3. `PROJECT-PROGRESS-SNAPSHOT-POST-LUMEN-LEARNING-2026-08-28.md` — canonical project-progress snapshot for its role until a newer progress snapshot explicitly supersedes it.

Machine-readable status and supersedes links live in `STATUS-CHAIN.json`.

## Superseded architecture-hardening documents

The following remain valuable historical implementation evidence but no longer describe current open work:

- `ARCHITECTURE-FINALIZATION-TRACK-2026-08-29.md`
- `ARCHITECTURE-AUDIT-V2-HARDENING-2026-08-28.md`

Both are superseded for current audit status by `ARCHITECTURE-AUDIT-V2-FINAL-RECONCILIATION-2026-08-29.md`.

`PROJECT-PROGRESS-SNAPSHOT-S0-S5-CLOSED-2026-08-28.md` remains explicitly superseded for project-progress status by the post-Lumen snapshot.

Any strategy document not listed in `STATUS-CHAIN.json` as canonical is historical/non-authoritative by default. A dated snapshot may remain useful evidence without becoming current architectural authority.

## Fresh-chat audit handoff

`NEXT-CHAT-HANDOFF-FINAL-ARCHITECTURE-AUDIT-2026-08-29.md` is an operational handoff for an independent re-audit. It is intentionally not architectural authority; the auditor must verify its claims against the canonical files and executable repository state.
