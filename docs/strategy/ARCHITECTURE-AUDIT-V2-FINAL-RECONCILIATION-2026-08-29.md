# Architecture Audit v2 — Final Reconciliation — 29.08.2026

## Purpose

This document reconciles the revised external Architecture Audit v2 against the current repository and live GitHub governance state after PR #37, PR #40 and repository ruleset activation.

It is deliberately stricter than a closure note: every original finding is classified as either **implemented**, **implemented by an alternative control**, or **implemented with a residual that an external auditor should challenge**.

No paid Product Canary or model-backed benchmark is authorized by this document.

## Verified current state

- authoritative branch: `main`
- current architecture merge commit: `024d90ed43f02691f3581e1c340122d66e25734f`
- PR #40: merged
- exact-main Full Verifier: run `33236733907` = **SUCCESS in all steps**
- Pages: run `33236733914` = **SUCCESS** on the same SHA
- Golden Corpus S2: **34 active cases / 34 independent observations / 0 mismatches / 0 critical false PASS**
- repository ruleset: `Protect main`, id `21788078`, **active**
- ruleset target: exactly `refs/heads/main`
- required check: `selftest` from GitHub Actions
- deletions blocked
- non-fast-forward / force pushes blocked
- pull request required before merge
- bypass list empty; `current_user_can_bypass = never`
- GitHub branch endpoint reports `main` as `protected: true`
- open pull requests: none at reconciliation time
- open repository issue relevant to the current product proof: Issue #17 only; it is **not an Architecture Audit v2 blocker**

## Finding-by-finding reconciliation

| Finding | Current status | Evidence / implementation | Residual for external audit |
|---|---|---|---|
| A-1 | IMPLEMENTED | 34 active cases are executed as 34 independently addressable case-oracle processes; `independentObservationCount` and fail-closed `observationDeficit` are enforced. | Auditor should independently confirm that every case can fail independently and that no hidden shared-pass shortcut remains. |
| A-2 | IMPLEMENTED | Five production-derived failures are explicit `historical-regression` cases with origin-run/fix provenance. | Provider regressions prove request construction only, not live provider compatibility. |
| A-2b | IMPLEMENTED | Lumen regression no longer silently depends on mutable runtime evidence; immutable regression fixture is bound to provenance. | Auditor should verify fixture provenance and absence of conditional skip paths. |
| A-3 | IMPLEMENTED | LLM Experience score is advisory. Binding release is Technical PASS + Product Fidelity PASS + Budget PASS. | Product quality still ultimately requires Owner hands-on acceptance; deterministic release is not the same as market/product success. |
| A-4 | IMPLEMENTED | Flat-frame/content verification no longer depends on guessed source background colors; visual evidence is browser/measurement based. | Auditor should test adversarial animated-but-empty products. |
| B-1 | IMPLEMENTED | Per-model declarative `requestShape` controls token parameter, temperature support and JSON behavior; adapter no longer derives request semantics from provider name. | Unverified request contracts remain unverified until real provider evidence exists. |
| B-2 | IMPLEMENTED | Zero-paid request-contract tests cover registry entries before model-backed execution. | Contract tests do not prove provider-side behavior changes have not occurred. |
| B-3 | IMPLEMENTED | Definitely pre-delivery failures may retry; uncertain delivery is conservatively settled and fails closed. | Availability is intentionally sacrificed when billing state is uncertain; idempotent post-delivery retry is not claimed. |
| B-4 | IMPLEMENTED | S5 configuration pins sampling; result contract reports trial count, variance/stddev and 95% uncertainty intervals. | No real model-backed benchmark winner exists yet. |
| C-1 | IMPLEMENTED | Prompt/Lesson promotion is bound to Candidate SHA, PR reference and merged implementation commit containing the validated artifact. | GitHub identity of a human reviewer is not claimed as cryptographically proven beyond repository/merge evidence. |
| C-2 | IMPLEMENTED WITH RESIDUAL | Automatic analysis imports a safe proposal capability; validation/promotion/deactivation/application receipt live in a separate privileged lifecycle module; capability-boundary tests exist. | This is structural module/caller separation, not an OS/process sandbox. Auditor should attempt indirect/dynamic privileged-call paths. |
| C-3 | IMPLEMENTED / LIVE VERIFIED | Active ruleset `Protect main` targets only `main`, requires PR + `selftest`, blocks deletion/force push, has no bypass; branch reports `protected: true`. | `required approvals = 0` is deliberate for a single-owner repository to avoid self-review deadlock. A future multi-owner/team setup should revisit mandatory independent review. |
| C-4 | IMPLEMENTED | Direct active-Lesson write bypass was removed; active production Lessons require governed lifecycle provenance. | Auditor should search for any alternate write path that can synthesize `active=true`. |
| C-5 | IMPLEMENTED | Runtime-state allowlists, staged-evidence policy, secret scan and main/runtime-state authority split are enforced. | Secret scanning is pattern-based defense in depth, not a substitute for secret management. |
| D-1 | IMPLEMENTED WITH RESIDUAL | Binary evidence is excluded from normal Git state, SHA-manifested and uploaded as GitHub Actions artifacts with explicit bounded retention; staged binaries fail policy. | **Important:** current artifact retention is bounded (30 days), not a permanent evidence archive. The original audit recommendation for durable object storage beyond Actions retention is not literally implemented. External audit should decide whether 30-day retention satisfies the intended audit horizon. |
| D-2 | IMPLEMENTED | Budget ledger is run-scoped via `AsyncLocalStorage`; persistent Memory updates use locking, latest-read-under-lock, atomic replace and concurrency tests. | Not an append-only event store; auditor should stress concurrent crash/recovery behavior. |
| D-3 | IMPLEMENTED | Zero-valued operational limits have explicit typed semantics and regression tests. | None known beyond normal boundary testing. |
| E-1 | IMPLEMENTED | Director repair is bounded, receives structured validation feedback and remains budget constrained. | Does not authorize unbounded self-repair or gate weakening. |
| E-2 | IMPLEMENTED | Generated JS/CSS terminators are escaped to prevent premature host tag closure. | Auditor should retain adversarial XSS corpus coverage. |
| E-3 | IMPLEMENTED BY ALTERNATIVE CONTROL WITH RESIDUAL | Generated game runs in sandboxed `srcdoc` iframe with `allow-scripts` and no `allow-same-origin`, opaque browser origin, host SHA binding and child external-network denial. | This is browser-origin isolation, **not a separately deployed DNS/domain origin**. A stronger physically separate hosting origin remains a defense-in-depth option. |
| E-4 | IMPLEMENTED | Verifier timing authority is typed `probePlan.roundSeconds`; prose timing is ignored; invalid typed values fail. | Missing timing intentionally uses a safe maximum window. |
| F-1 | IMPLEMENTED NARROWER THAN ORIGINAL RECOMMENDATION | Deterministic critical-module style gate is part of Full Verifier. | Repository-wide ESLint/Prettier and migration to `node --test` were **not** adopted. This is a maintainability residual, not a demonstrated control-plane failure. |
| F-2 | IMPLEMENTED BY ALTERNATIVE CONTROL | Central `STATUS-CHAIN.json` + `INDEX.md` define current/superseded authority; unlisted dated snapshots are historical/non-authoritative by default. | Not every historical document carries its own frontmatter. Auditor should confirm the central chain is sufficient and cannot silently conflict with canonical docs. |
| F-3 | IMPLEMENTED FOR CURRENT LEGAL STATE | `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS` exist; root `LICENSE` explicitly states **NO LICENSE GRANTED / All rights reserved**. | A permissive/open-source/commercial redistribution license has not been selected. That is an Owner/legal/business decision, not silently assumed. |
| F-4 | IMPLEMENTED | Production Lessons use typed `learning-lesson/v2`, bounded directive/count limits, promotion provenance and explicit lower-authority serialization beneath immutable governance layers. | Auditor should test prompt-injection attempts through valid-looking Lesson data. |

E-5 from the revised audit was explicitly withdrawn and is not an active finding.

## Reconciliation result

### Accepted Architecture Audit v2 measures

All **25 active findings** have a concrete closure treatment in the current architecture:

- 19 are implemented directly;
- 3 are implemented through an alternative control whose security objective is materially equivalent for the current deployment model;
- 3 are implemented but retain an explicit residual that should be challenged by the independent audit.

The important residuals are not hidden:

1. **D-1 retention horizon:** GitHub Actions artifacts are bounded-retention evidence, not permanent archive storage.
2. **C-2 privilege boundary depth:** module/capability separation exists, but no process/OS sandbox is claimed.
3. **E-3 deployment isolation depth:** opaque browser-origin sandbox exists, but no separate DNS/domain deployment is claimed.
4. **F-1 maintainability scope:** critical modules are style-gated; the whole repository is not standardized with ESLint/Prettier/`node --test`.
5. **C-3 review model:** PR + required verifier is enforced, but independent approving review count is zero because the repository currently has one Owner.
6. **F-3 license choice:** legal status is explicit but broader distribution/reuse licensing remains undecided.

These are the correct topics for a fresh external audit to dispute. They are not being represented as silently solved.

## Architecture vs. evidence still open

The following are **not unfinished Architecture Audit v2 implementation items**, but they remain unproven outcomes:

- no real model-backed S5 benchmark winner has been demonstrated;
- live compatibility of every configured provider/model contract is not proven by zero-paid request-shape tests;
- no post-finalization independent game Canary has yet produced a playable draft and received hands-on Owner ACCEPT/REJECT;
- Learning impact has not yet been demonstrated by a later Owner-accepted game;
- Cross-Domain portability remains a hypothesis;
- the Factory is not self-authorizing and protected-layer changes remain human-governed.

Issue #17 remains open specifically for the independent Product/Owner proof. It must not be reclassified as an architecture defect merely because the product proof is incomplete.

## Internal closure statement

From the repository's current evidence, the accepted implementation program is **internally closed and Canary-ready from an architecture/governance perspective**.

That statement is deliberately conditional on independent re-audit: the next auditor is asked to try to falsify it, especially around D-1, C-2, E-3, F-1, C-3 review semantics and stale/document-authority handling.

A paid Product Canary or model-backed benchmark still requires a separate fresh explicit Owner GO.
