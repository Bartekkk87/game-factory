# Architecture Audit v2 — Hardening Implementation — 28.08.2026

## Status

This document records the implementation response to the independently revised Architecture Audit v2.

Change branch: `audit-v2-hardening-20260828`

The change set is intentionally split into:

1. **pre-Canary / immediate safety hardening** — implemented in this branch;
2. **repository-admin enforcement** — requires GitHub settings outside the executable repository;
3. **medium-term scaling / architecture tracks** — deliberately not mixed into this safety PR.

## Implemented in this change set

### C-3 / C-5 — workflow write boundary + runtime-state isolation

`main` is now designed as the authoritative code / policy branch. Automated Production and Review state is routed to the separate `runtime-state` branch. The branch was initialized from current `main` and currently has no independent changes.

Production and Review workflows now:

- explicitly check out authoritative code from `main`;
- fetch `runtime-state` only as durable Runtime/Evidence input;
- reject any changes unique to `runtime-state` that are outside the allowed state paths;
- merge the permitted Runtime/Evidence state locally into the current `main` tree;
- verify that the resulting tree differs from `main` only under allowed Runtime/Evidence paths;
- use explicit commit allow-lists instead of repository-wide staging;
- scan staged evidence for common secret-key formats;
- push only `HEAD:runtime-state`, never to `main`.

Allowed Runtime/Evidence paths are bounded to:

- `runs/**`
- `drafts/**`
- `products/**`
- `archive/**`
- `memory/**`
- `learning/**`
- `evaluation/results/**`

Production and Review also share the repository-wide concurrency group `game-factory-runtime-state`, preventing those two workflows from racing each other while writing the same state branch.

GitHub Pages likewise executes the current code from `main`, validates `runtime-state`, merges only permitted state locally, and builds the gallery from that combined read-only tree. Pages redeploys on relevant `main` or `runtime-state` changes.

Additional defense in depth:

- a deterministic runtime guard rejects protected-path modifications during Production/Review;
- `.github/CODEOWNERS` assigns protected code/policy paths to the repository owner.

**Remaining boundary:** GitHub still reports `main` as unprotected. The repository-level part of C-3 remains open until branch protection/rulesets are enabled with required human review and without an Actions bypass. The runtime-state split removes the previous technical need for Actions to push Runtime/Evidence commits to `main`; repository protection can therefore be enabled without disabling Production/Review persistence.

### C-1 — SHA/PR/merge-bound prompt promotion

`promoteCandidate()` now requires:

- validated + inactive prompt candidate;
- `human-merge` approval kind;
- GitHub PR reference;
- full merge commit SHA that is contained in current `HEAD`;
- SHA-256 of the validated Candidate artifact;
- proof that exactly that Candidate artifact exists in the named merge commit.

A free-form `promotionRef` / `human-merge` claim is no longer sufficient.

### B-1 / B-2 — declarative provider request contract

Every model record now declares `requestShape`:

- token parameter;
- temperature policy;
- JSON request mode;
- contract source / verification state.

The OpenAI-compatible adapter consumes this contract rather than branching on the provider name.

A zero-paid selftest builds and validates the request for every model registry entry. Provider routes whose exact request semantics have not been confirmed by real evidence remain explicitly marked `unverified`; no new compatibility claim was invented.

### A-3 — Experience becomes advisory

Binding release authority is now:

`Technical PASS + Product Fidelity PASS + Budget PASS`

The LLM Experience score remains available for critique and Polish but carries:

- `advisory: true`
- `authoritative: false`

This makes the release rule consistent with the architecture principle that LLM output is a claim rather than deterministic truth.

### E-1 — bounded Director repair

Director output now receives bounded deterministic repair when its generated GDD fails schema/traceability/proof-plan validation.

- first attempt: Director generation;
- bounded repair attempts receive the invalid output and exact deterministic validation error;
- repair instructions explicitly forbid weakening Owner requirements or verifier criteria;
- transport/provider failures still fail closed and do not become semantic repair attempts.

### A-2b — historical regression is unconditional

The real Lumen Director-state-contract failure is no longer tested conditionally from a mutable `runs/` directory.

An immutable regression fixture now binds:

- origin run `20260828-201007`;
- evidence commit `70200dce341fc06d0213991ff569481dd99774f6`;
- original Git blob SHAs;
- the exact unsupported-state failure text;
- the expected root-cause class and target layer.

Missing regression evidence is therefore a hard test failure rather than a silent skip.

### C-4 — direct active-Lesson bypass removed

The direct `recordLesson()` write path was removed from `memory/store.mjs`. Active Production lessons can only be materialized through the governed promotion path.

### A-4 — visual-content evidence hardened

The verifier no longer parses a guessed background color from generated source code.

Visual-content evidence now detects flat frames from image data itself by measuring dominant-color versus non-dominant visual content. This removes the confirmed `parseInt`/hex false-PASS class.

### B-3 — conservative transport retry

Only transport failures that are clearly pre-delivery (selected DNS/connect/TLS failures) may release the reservation and retry.

Unknown delivery state remains unchanged:

- conservative reservation settlement;
- `accountingComplete=false`;
- no further paid call.

Timeout/Abort and `ECONNRESET` remain fail-closed because delivery/billing status is ambiguous.

### D-3 — zero-valued limits

Count-style controls now accept `0`; positive-only controls still reject it. Invalid operator values produce a visible warning instead of silently falling back.

### E-2 / E-3 — generated-code isolation

- generated JavaScript cannot terminate its host `<script>` tag via `</script>`;
- generated CSS cannot terminate `<style>` via `</style>`;
- raw HTML is not escaped because markup is intentional;
- generated pages receive a restrictive Content Security Policy blocking external network/resource access by default.

A separate origin for untrusted generated code remains the long-term isolation target.

### A-1 — communication corrected immediately

The implementation does **not** claim that the existing S2 runner already supplies 29 independent observations.

Current truth is documented as:

- 29 registered Corpus cases;
- 8 unique executable selftest scripts in the current S2 runner.

README and Architecture no longer present isolated `29/29` as if it were 29 independent measurements.

## Full Verifier additions

The verifier now explicitly covers:

- zero-valued limit semantics;
- workflow path allow-list / protected-path policy;
- runtime-state path isolation and workflow routing to `runtime-state`;
- deterministic authoritative release gate;
- every model request contract;
- transport retry / billing-uncertainty boundary;
- generated-page CSP and tag isolation;
- flat-frame and external-network verifier behavior;
- SHA/PR/merge-bound prompt promotion;
- unconditional Lumen historical regression.

## Still open before the next paid Product Canary

### Repository-level C-3 admin enforcement

The code-side architecture is now compatible with a protected `main`: Runtime/Evidence persistence no longer requires bot pushes to the authoritative branch.

GitHub branch protection/rulesets must still be enabled for `main` with required human review and without an Actions bypass for protected changes.

This setting cannot be truthfully replaced by repository code. Until it is enabled and the protected-layer PR is human-reviewed/merged, no further paid Product Canary should be authorized.

## Deliberately separate medium-term tracks

These findings are accepted but are not mixed into this pre-Canary safety PR because they require larger data-model, infrastructure or governance decisions:

- **A-1:** true case-specific oracles / independent observations for all Corpus cases;
- **A-2:** reclassify real failures as `historical-regression` in the frozen Corpus inventory;
- **D-1:** durable binary Evidence migration to LFS/object storage and retention policy;
- **C-2:** structural read/privileged lifecycle module split;
- **D-2:** instance-scoped budget ledger and concurrent/append-only memory persistence; the shared Production/Review concurrency group is only a bounded race-prevention measure, not a replacement for this refactor;
- **B-4:** S5 sampling parameters and variance/confidence reporting;
- **E-3:** separate origin for generated code;
- **E-4:** explicit proof-duration field instead of prose fallback;
- **F-4:** typed Lesson schema and immutable prompt hierarchy;
- **F-1:** formatter/linter rollout on critical modules;
- **F-2:** strategy-document supersedes/status chain;
- **F-3:** repository LICENSE remains an explicit Owner/legal choice. `SECURITY.md`, `CONTRIBUTING.md` and `CODEOWNERS` are added in this change set.

These tracks should be implemented as separately reviewable PRs after the safety boundary above is merged and repository branch protection is active.

## Proof boundary

This change set does not claim:

- that C-3 is fully closed before GitHub admin protection is enabled;
- that `runtime-state` is an authority branch — it is explicitly non-authoritative durable state only;
- that 29 Corpus cases are 29 independent observations;
- that unverified provider request contracts are production-compatible;
- that CSP is equivalent to a separate untrusted-code origin;
- that medium-term scaling findings are already resolved.
