import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFailedProductionRun } from '../../learning/root-cause.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const source = fs.readFileSync(path.join(repoRoot, 'factory/src/learning/root-cause.mjs'), 'utf8');
const caseId = caseIdFromArgs();
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-corpus-root-cause-'));

function writeDirectorFailure(runId, error) {
  const runDir = path.join(root, runId);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({
    run: { id: runId, status: 'failed', reason: 'director_failed' },
    gates: { technical: { pass: false }, productFidelity: { pass: false } }
  }, null, 2));
  fs.writeFileSync(path.join(runDir, 'FAILURE.json'), JSON.stringify({ reason: 'director_failed', error }, null, 2));
}

try {
  if (caseId === 'fr-root-cause-diagnostic-independence') {
    assert.doesNotMatch(source, /^import\s+.*state-semantics\.mjs.*$/m);
    writeDirectorFailure('synthetic-state-contract', 'Director proof plan unreachable: probe PR-X uses unsupported verifier state restored');
    const report = analyzeFailedProductionRun({ runId: 'synthetic-state-contract', runsRoot: root });
    assert.equal(report.primaryFindingId, 'director-verifier-state-contract-mismatch');
    assert.match(report.diagnosticIndependence, /do not import verifier state semantics/);
    assert.match(report.findings[0].summary, /restored/);
  } else if (caseId === 'fr-root-cause-success-run-rejected') {
    const runId = 'successful-fixture';
    const runDir = path.join(root, runId);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({ run: { id: runId, status: 'success' } }, null, 2));
    assert.throws(() => analyzeFailedProductionRun({ runId, runsRoot: root }), /only accepts failed production runs/);
  } else if (caseId === 'hr-lumen-director-state-contract') {
    const fixturePath = path.join(repoRoot, 'examples/fixtures/regressions/lumen-director-state-contract.json');
    assert.equal(fs.existsSync(fixturePath), true, 'immutable Lumen regression fixture is required');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    assert.equal(fixture.schemaVersion, 'game-factory.historical-regression-fixture/v1');
    assert.equal(fixture.origin.runId, '20260828-201007');
    const runId = fixture.id;
    const runDir = path.join(root, runId);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify(fixture.runEvidence, null, 2));
    fs.writeFileSync(path.join(runDir, 'FAILURE.json'), JSON.stringify(fixture.failure, null, 2));
    const report = analyzeFailedProductionRun({ runId, runsRoot: root });
    assert.equal(report.primaryFindingId, fixture.expected.primaryFindingId);
    assert.equal(report.findings[0].targetLayer, fixture.expected.targetLayer);
    for (const term of fixture.expected.requiredEvidenceTerms) assert.match(report.findings[0].summary, new RegExp(term));
  } else {
    throw new Error(`unsupported root-cause corpus case: ${caseId}`);
  }

  console.log(JSON.stringify({ caseId, observation: 'PASS' }));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
