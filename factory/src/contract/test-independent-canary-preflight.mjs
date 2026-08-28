import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createOwnerContract, ownerFidelityClaimIds, ownerRequirementIds } from './owner.mjs';
import { compileDirectorTraceability } from './traceability.mjs';
import { lessonsFor, loadMemory } from '../memory/store.mjs';
import { roleDefaultsSnapshot } from '../llm/router.mjs';
import { isSupportedVerifierState, verifierStateContract } from '../verify/state-semantics.mjs';

const root = process.cwd();
const briefPath = path.join(root, 'evaluation/preflight/independent-canary-owner-brief-2026-08-28.md');
const productionBriefPath = path.join(root, 'ideas/lumen-current-independent-canary-2026-08-28.md');
const directorPath = path.join(root, 'factory/src/roles/director.mjs');
const indexPath = path.join(root, 'factory/src/index.mjs');
const workflowPath = path.join(root, '.github/workflows/produce.yml');

assert.equal(fs.existsSync(briefPath), true, 'independent Canary brief must exist');
assert.equal(briefPath.includes(`${path.sep}ideas${path.sep}`), false, 'preflight brief must not live under ideas/** before paid-run approval');

const brief = fs.readFileSync(briefPath, 'utf8');
const directorSource = fs.readFileSync(directorPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');
const workflowSource = fs.readFileSync(workflowPath, 'utf8');

let providerCalls = 0;
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => {
  providerCalls += 1;
  throw new Error('PRE-FLIGHT MUST NOT CALL A PROVIDER');
};

try {
  // Independence: the brief itself must not import prior product-specific expectations.
  assert.equal(/\b(?:titan|mech|salvage|harbor|courier|dungeon|delivery)\b/i.test(brief), false, 'Canary brief must be materially independent from prior Titan/Harbor product vocabulary');

  const contract = createOwnerContract({ idea: brief, source: 'independent-canary-preflight-2026-08-28' });

  assert.equal(contract.originalBrief, brief, 'raw Owner brief must be preserved verbatim');
  assert.equal(contract.ownerBriefSha256, crypto.createHash('sha256').update(brief).digest('hex'));
  assert.equal(contract.decomposition.version, 'explicit-sections');
  assert.equal(Object.isFrozen(contract), true);

  const expectedMustHaves = [
    'The game must use a top-down real-time playfield with player movement on Arrow keys or WASD and Space or Enter as the primary gameplay action.',
    'The player must activate three signal nodes during a run, and each activation must visibly change objective progress and increase score or an equivalent measurable run value.',
    'The game must reach a clear success state after the required signal-node objective is completed.',
    'The game must reach a clear failure state when a visible pressure resource such as storm pressure, stability or time is exhausted.',
    'After a terminal success or failure state, Enter must start a fresh run with objective progress reset.',
    'The HUD must show signal-node progress, the active pressure resource and score or equivalent run value without obscuring the central play area.',
    'Pressure must escalate meaningfully during the run through gameplay behavior such as faster hazard motion, stronger environmental pulses or a decreasing safe margin rather than through cosmetic change alone.'
  ];
  const expectedNoGos = [
    'No weapons, shooting or enemy-combat loop.',
    'No shop, inventory, equipment or persistent meta-progression system.',
    'No automatic victory or idle-only objective progression without player input.'
  ];

  assert.deepEqual(contract.mustHaves.map((item) => item.text), expectedMustHaves);
  assert.deepEqual(contract.noGos.map((item) => item.text), expectedNoGos);
  assert.deepEqual(contract.mustHaves.map((item) => item.id), ['MH-01','MH-02','MH-03','MH-04','MH-05','MH-06','MH-07']);
  assert.deepEqual(contract.noGos.map((item) => item.id), ['NG-01','NG-02','NG-03']);
  assert.equal(contract.unknowns.length, 0, 'explicit direction/open sections must not be inflated into hard Owner requirements');

  const hardTexts = [...contract.mustHaves, ...contract.noGos].map((item) => item.text).join('\n');
  assert.equal(/bioluminescent botanical circuitry|one to two minutes|Touch\/mobile|audio availability/i.test(hardTexts), false, 'presentation, quality guidance and unspecified details must not become hard requirements');

  // Product Fidelity may only claim the hard Owner requirement set for this explicit-section brief.
  const hardIds = ownerRequirementIds(contract);
  assert.deepEqual(ownerFidelityClaimIds(contract), hardIds);
  assert.equal(hardIds.length, 10);

  // Prove that each hard requirement can be represented by one supported traceability probe,
  // including independent HUD geometry and terminal/restart semantics.
  const probeById = {
    'MH-01': { kind: 'event', eventType: 'primary_action_used' },
    'MH-02': { kind: 'event_value_change', eventType: 'signal_node_activated', beforeField: 'nodesBefore', afterField: 'nodesAfter' },
    'MH-03': { kind: 'state_reached', state: 'success' },
    'MH-04': { kind: 'state_reached', state: 'failure' },
    'MH-05': { kind: 'event', eventType: 'fresh_run_started' },
    'MH-06': { kind: 'event', eventType: 'hud_layout_clear', minRegions: 3 },
    'MH-07': { kind: 'event_value_change', eventType: 'pressure_escalated', beforeField: 'before', afterField: 'after' },
    'NG-01': { kind: 'event_absent', eventType: 'weapon_fired' },
    'NG-02': { kind: 'event_absent', eventType: 'meta_progression_opened' },
    'NG-03': { kind: 'event_absent', eventType: 'idle_objective_progress' }
  };
  const gddFixture = {
    acceptanceCriteria: hardIds.map((id) => ({ ownerRequirementId: id, statement: `Preflight acceptance for ${id}` })),
    probePlan: { requirementProbes: hardIds.map((id) => ({ ownerRequirementId: id, ...probeById[id] })) }
  };
  const compiled = compileDirectorTraceability(gddFixture, contract);
  assert.equal(compiled.acceptanceCriteria.length, 10);
  assert.equal(compiled.probePlan.requirementProbes.length, 10);
  assert.equal(compiled.probePlan.requirementProbes.find((p) => p.ownerRequirementId === 'MH-06').kind, 'layout_no_overlap', 'HUD requirement must map to independent layout geometry authority');
  assert.equal(compiled.probePlan.requirementProbes.find((p) => p.ownerRequirementId === 'MH-05').kind, 'restart_after_terminal', 'fresh-run requirement must map to independent restart observation');

  // Director runtime truth: complete raw idea + Owner Contract + finite verifier state contract are separately supplied.
  assert.match(directorSource, /ownerIdea:\s*idea\s*\|\|/);
  assert.match(directorSource, /\n\s*ownerContract,\n/);
  assert.match(directorSource, /verifierStateContract:\s*verifierStateContract\(\)/);
  assert.match(directorSource, /skillNames:\s*\['directing',\s*'art-direction'\]/);
  const states = verifierStateContract();
  assert(states.stateReachedAllowed.includes('success'));
  assert(states.stateReachedAllowed.includes('failure'));
  assert.equal(isSupportedVerifierState('restored'), false);
  assert.equal(isSupportedVerifierState('glass_breach'), false);

  // Exact preflight -> Production brief binding: idea-file ingestion must preserve bytes verbatim.
  assert.match(indexSource, /idea\s*=\s*fs\.readFileSync\(ideaFile,\s*'utf8'\);/);
  assert.doesNotMatch(indexSource, /readFileSync\(ideaFile,\s*'utf8'\)\.trim\(\)/);
  if (fs.existsSync(productionBriefPath)) {
    const productionBrief = fs.readFileSync(productionBriefPath, 'utf8');
    assert.equal(productionBrief, brief, 'approved Production idea file must remain byte-identical to the preflight Owner brief');
    const productionContract = createOwnerContract({ idea: productionBrief, source: 'ideas-folder' });
    assert.equal(productionContract.ownerBriefSha256, contract.ownerBriefSha256, 'preflight and Production must bind the same exact Owner brief bytes');
    assert.notEqual(productionContract.contractSha256, contract.contractSha256, 'full Contract SHA intentionally includes source provenance and therefore may differ by lane');
  }

  // Learning isolation: no validated+active lesson currently changes this Production run.
  const memory = loadMemory();
  assert.equal(memory.lessons.filter((l) => l.status === 'validated' && l.active === true).length, 0, 'preflight requires no active Production lesson');
  assert.deepEqual(lessonsFor('director'), []);
  assert.deepEqual(lessonsFor('engineer'), []);

  // Point 2: freeze the known OpenAI reference route for the first independent Product Proof.
  const defaults = roleDefaultsSnapshot();
  assert.deepEqual(defaults.director, { provider: 'openai', model: 'gpt-5.6-terra' });
  assert.deepEqual(defaults.engineer, { provider: 'openai', model: 'gpt-5.6-terra' });
  assert.deepEqual(defaults.playtester, { provider: 'openai', model: 'gpt-5.6-terra' });
  assert.deepEqual(defaults.auditor, { provider: 'openai', model: 'gpt-5.6-luna' });
  assert.match(workflowSource, /default:\s*'openai'/, 'Produce workflow must still default to OpenAI');

  assert.equal(providerCalls, 0, 'preflight must execute with zero provider/API calls');

  console.log(JSON.stringify({
    status: 'PASS',
    executionClass: 'zero-paid-deterministic-preflight',
    ownerBriefSha256: contract.ownerBriefSha256,
    ownerContractSha256: contract.contractSha256,
    mustHaves: contract.mustHaves.length,
    noGos: contract.noGos.length,
    fidelityClaims: ownerFidelityClaimIds(contract).length,
    activeProductionLessons: 0,
    providerCalls,
    verifierStateProtocol: states.protocol,
    productionReference: defaults
  }, null, 2));
  console.log('Independent Canary zero-paid preflight: PASS');
} finally {
  globalThis.fetch = previousFetch;
}
