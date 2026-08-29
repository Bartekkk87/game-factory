import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './test-budget-isolation.mjs';
import '../memory/test-store-concurrency.mjs';
import '../learning/test-capability-boundary.mjs';
import { semanticFailureSignature } from './failure-signature.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const runSource = fs.readFileSync(path.join(here, '..', 'pipeline', 'run.mjs'), 'utf8');

const sameSemanticFailure = (fps, diff, timeline) => ({
  failures: [
    { id: 'fps_ok', gate: 'technical', detail: `fps=${fps}` },
    { id: 'visual_activity', gate: 'technical', detail: `${diff}% pixels changed; ${timeline}` }
  ],
  consoleErrors: [], pageErrors: [], probeErrors: []
});

// Repair stagnation: measurement jitter must not defeat stagnation detection, while a
// genuinely different failure class must remain distinguishable.
const sig1 = semanticFailureSignature(sameSemanticFailure(28, 0.31, 'end=playing/4'));
const sig2 = semanticFailureSignature(sameSemanticFailure(29, 0.29, 'end=playing/5'));
const sig3 = semanticFailureSignature(sameSemanticFailure(27, 0.34, 'end=playing/4'));
assert.equal(sig1, sig2);
assert.equal(sig2, sig3);

const differentFailure = semanticFailureSignature({
  failures: [{ id: 'probe_present', gate: 'technical', detail: 'probe missing' }],
  consoleErrors: [], pageErrors: [], probeErrors: []
});
assert.notEqual(sig1, differentFailure);

const runtimeA = semanticFailureSignature({
  failures: [{ id: 'no_runtime_errors', gate: 'technical' }],
  consoleErrors: [],
  pageErrors: ['TypeError: ellipse expected 7 arguments, got 6 at /tmp/run-123/game.js:47:18'],
  probeErrors: []
});
const runtimeAJitter = semanticFailureSignature({
  failures: [{ id: 'no_runtime_errors', gate: 'technical' }],
  consoleErrors: [],
  pageErrors: ['TypeError: ellipse expected 8 arguments, got 5 at /tmp/run-999/game.js:52:21'],
  probeErrors: []
});
const runtimeB = semanticFailureSignature({
  failures: [{ id: 'no_runtime_errors', gate: 'technical' }],
  consoleErrors: [],
  pageErrors: ['ReferenceError: missingFunction is not defined at /tmp/run-123/game.js:47:18'],
  probeErrors: []
});
assert.equal(runtimeA, runtimeAJitter);
assert.notEqual(runtimeA, runtimeB);

assert.doesNotMatch(runSource, /function failureSignature\(/);
assert.match(runSource, /semanticFailureSignature\(bundle\)/);

// Production must have one internal verifyAttempt await, inside the fail-closed
// boundary helper, and every production verification site must use it.
const directVerifyAwaits = [...runSource.matchAll(/await verifyAttempt\(/g)];
assert.equal(directVerifyAwaits.length, 1, `expected only the boundary helper to await verifyAttempt directly, got ${directVerifyAwaits.length}`);
assert.match(runSource, /async function verifyAttemptFailClosed\([\s\S]*?try \{[\s\S]*?await verifyAttempt\([\s\S]*?catch \(e\) \{[\s\S]*?failClosed\(runDir, state, 'verifier_failed'/);
const boundedCalls = [...runSource.matchAll(/await verifyAttemptFailClosed\(/g)];
assert.ok(boundedCalls.length >= 3, `expected all verifier sites to use fail-closed boundary, got ${boundedCalls.length}`);
assert.doesNotMatch(runSource, /\n\s*tech = await verifyAttempt\(\{ runDir, attempt, design, ownerContract, gdd \}\);/);

console.log(`CONTROL RELIABILITY PASS: semantic failure normalization, fail-closed verifier routing, run-scoped budget isolation, transactional memory and learning capability boundaries are enforced.`);
