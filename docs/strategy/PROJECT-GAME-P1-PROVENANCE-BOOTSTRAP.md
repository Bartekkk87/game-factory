# Project Game P1 — Trusted PR Provenance Bootstrap

## Purpose

This is a one-time bounded governance bootstrap for audit finding F3 (Required Check / PR Provenance).

It establishes a trusted `pull_request_target` control plane on protected `main` before the P1-closure candidate relies on it. The existing required `selftest` remains unchanged and authoritative during this bootstrap.

## Added authority

- `.github/workflows/trusted-project-pr-provenance.yml`
- `factory/src/project/trusted-pr-provenance.mjs`

The new gate:

1. runs from the protected PR base;
2. never executes candidate code as trusted control-plane code;
3. detects PRs changing `projects/**` from GitHub's live changed-file list;
4. binds live PR number, exact head SHA/ref, exact base SHA/ref and repository;
5. validates the existing Project Task PR binding;
6. requires the canonical `project-task/<projectId>/<taskId>` branch identity;
7. rejects Project Task PR files outside the bound `projects/<projectId>/` tree;
8. dispatches `verify.yml` against the exact candidate branch without a helper branch;
9. accepts only a new workflow-dispatch run with the exact expected head ref and SHA;
10. re-fetches the PR after verification and fails closed if head or base changed;
11. preserves a durable provenance evidence artifact.

## Root of trust

After this bootstrap reaches `main`, the gate compares its own workflow and validator against the trusted base and fails if a candidate changes or removes either authority file.

The existing `Trusted PR Selftest Gate` is not modified by this bootstrap. `verify.yml` is not modified. No credential, PAT, GitHub App token or long-lived secret is introduced; the gate uses the scoped per-run `GITHUB_TOKEN` only to read PR state and dispatch the existing verifier.

## Bootstrap limitation

The new `pull_request_target` workflow cannot govern the PR that first introduces it because GitHub executes `pull_request_target` workflows from the PR base. Therefore this bootstrap PR is governed by the already-existing required `selftest`. The P1-closure PR is the first candidate that can be governed by the newly trusted provenance gate.

## Non-goals

- no F1/F2/F4 product-code change;
- no Project Canary;
- no paid model/API call;
- no PG-A1 repair loop;
- no Milestone Engine;
- no Learning promotion;
- no Micro-Game production change.
