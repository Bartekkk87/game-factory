# Project Game Mode v0.1 — Slice B Browser Persistence Host Bridge

Status: **IMPLEMENTED ON PR BRANCH / FINAL EXACT-HEAD EVIDENCE PENDING**

Base: protected `main` at `ab44c119732ddee7046abd62ae7f417300b7085f`.

This slice begins only after the real PG-A0 GitHub Reality Proof was closed as PASS in Issue #62 and the canonical Notion progress page. It implements the next bounded infrastructure gate only. It does not start Kepler Outpost, a paid Project model/API run, a Project publisher, a repair loop, or higher autonomy.

## Decision

Browser persistence remains **host-owned**. Generated Project Game code runs inside an opaque-origin iframe using exactly `sandbox="allow-scripts"`. The child cannot receive `allow-same-origin`. Save/load requests cross the boundary through the existing versioned `project-game.persistence-bridge/v1` `postMessage` contract.

The host bridge accepts a request only when all of the following are true:

- the message source is the exact bound iframe `contentWindow`;
- the child event origin is opaque (`null`);
- protocol and request type are supported;
- the request has the exact allowed field set;
- Project ID equals the host-bound Project ID;
- slot is an integer inside the persistence contract's slot range;
- save schema equals the active save schema exactly;
- state is JSON-serializable;
- serialized `{ schemaVersion, state }` stays within the persistence byte limit.

Storage keys are host-owned and partitioned by Project ID and slot. The child never receives direct `localStorage` authority.

## Implementation

### `factory/src/project/persistence-host-bridge.mjs`

Browser-compatible host module with no Node-only imports. It:

- installs the exact-frame `message` listener;
- validates Project ID, request shape, slot, schema and size before storage;
- writes versioned host-owned persistence records;
- returns bounded structured responses through `postMessage`;
- rejects a non-opaque child origin even when the source frame is otherwise correct;
- quarantines an invalid/corrupt stored record to a host-owned quarantine key and removes it from the active slot before returning a `safeStart` signal;
- exposes only bridge installation and deterministic storage-key construction.

### `factory/src/project/web-runtime-adapter.mjs`

Adds `runBrowserPersistenceProof()`. The proof uses real Chromium and the existing Web Runtime Adapter contract. The trusted verifier itself sends a save request from inside the opaque child frame, reloads the host document, sends a load request from the newly loaded child frame, then compares the persistence contract's declared equivalence projection.

The proof records:

- host page load;
- exact opaque iframe sandbox;
- save response;
- load-after-browser-reload response;
- declared state-equivalence projection;
- fatal console/page errors;
- expected and actual state SHA-256 digests.

This is a real browser transport/storage/reload proof, not the deterministic in-memory adapter used by the Foundation contract selftest.

### `factory/src/project/test-browser-persistence.mjs`

Real Chromium positive and negative evidence. Required negative cases:

1. wrong Project ID → `project-mismatch`;
2. slot outside contract → `slot-invalid`;
3. wrong save schema → `schema-mismatch`;
4. oversized save → `size-limit`;
5. corrupt stored record → active slot removed, raw record quarantined, `safeStart=true`;
6. iframe with `allow-same-origin` → `origin-rejected`.

The positive case performs actual Save → host-page Reload → Load and requires the declared projection to remain equivalent.

### Existing gates

- `factory/src/verify/test-verifier.mjs` imports the new browser persistence selftest after Chromium is installed.
- `factory/src/control/style-gate.mjs` treats the host bridge as a critical Project control module.
- Required-check workflows are unchanged.

## Trust boundaries preserved

This slice does **not**:

- add `projects/` to `runtime-state`;
- alter `.github/workflows/verify.yml`;
- alter `.github/workflows/trusted-selftest.yml`;
- modify LLM client/router/provider/model authority;
- modify Budget Gate, Release Gate or Learning authority;
- modify the Micro Game production pipeline;
- create a paid model/API call;
- start Kepler Outpost or another Project Canary.

## Acceptance gate

Slice B may be recorded as PASS only after all of the following are true on one exact PR head:

- Node/module and critical-style checks PASS;
- real Chromium positive Save → Reload → Load proof PASS;
- all adversarial persistence cases PASS;
- complete Branch Verifier SUCCESS;
- Trusted PR Selftest Gate SUCCESS on the same head;
- no unresolved material review issue;
- protected-main merge succeeds with expected head SHA;
- post-merge Branch Verifier succeeds on the exact resulting `main` SHA;
- Issue #62 and canonical Notion progress page are updated with exact evidence.

Until then this document describes an implementation candidate, not a completed Slice-B authority record.
