import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runSource = fs.readFileSync(path.join(here, '..', 'pipeline', 'run.mjs'), 'utf8');

// D-2 baseline: production currently includes raw verifier details and runtime error
// strings in the stagnation signature. Semantically identical failures therefore
// produce distinct signatures when measurements jitter.
assert.match(runSource, /failures:\s*bundle\.failures\.map\(\(f\) => \[f\.id, f\.detail \|\| ''\]\)/);
assert.match(runSource, /consoleErrors:\s*bundle\.consoleErrors\.slice\(0, 3\)/);

const legacyFailureSignature = (bundle) => JSON.stringify({
  failures: bundle.failures.map((f) => [f.id, f.detail || '']),
  consoleErrors: bundle.consoleErrors.slice(0, 3),
  pageErrors: bundle.pageErrors.slice(0, 3),
  probeErrors: bundle.probeErrors.slice(0, 3)
});

const sameSemanticFailure = (fps, diff, timeline) => ({
  failures: [
    { id: 'fps_ok', detail: `fps=${fps}` },
    { id: 'visual_activity', detail: `${diff}% pixels changed; ${timeline}` }
  ],
  consoleErrors: [], pageErrors: [], probeErrors: []
});
const sig1 = legacyFailureSignature(sameSemanticFailure(28, 0.31, 'end=playing/4'));
const sig2 = legacyFailureSignature(sameSemanticFailure(29, 0.29, 'end=playing/5'));
const sig3 = legacyFailureSignature(sameSemanticFailure(27, 0.34, 'end=playing/4'));
assert.notEqual(sig1, sig2);
assert.notEqual(sig2, sig3);

const differentFailure = legacyFailureSignature({
  failures: [{ id: 'probe_present', detail: 'probe missing' }],
  consoleErrors: [], pageErrors: [], probeErrors: []
});
assert.notEqual(sig1, differentFailure);

// D-6 baseline: the build/repair LLM call is caught, but the immediately following
// verifier call is outside that fail-closed try/catch. The same unguarded pattern
// also exists after polish/repair verification.
const unguardedVerifyCalls = [...runSource.matchAll(/\n\s*tech = await verifyAttempt\(\{ runDir, attempt, design, ownerContract, gdd \}\);/g)];
assert.ok(unguardedVerifyCalls.length >= 3, `expected multiple unguarded verifier calls, got ${unguardedVerifyCalls.length}`);
assert.match(runSource, /catch \(e\) \{\n\s*return failClosed\([^\n]+engineer_invalid_output[\s\S]*?\n\s*\}\n\n\s*tech = await verifyAttempt/);

console.log(`PACKAGE 2 BASELINE REPRODUCED: D-2 raw jitter yields 3 distinct signatures for one semantic failure set; D-6 has ${unguardedVerifyCalls.length} verifier calls outside the surrounding fail-closed LLM catches.`);
