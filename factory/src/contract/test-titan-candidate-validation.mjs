import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createOwnerContract, ownerRequirementIds } from './owner.mjs';
import { evaluateProductFidelity } from '../verify/fidelity.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));
const structuredText = (contract) => [
  ...(contract.mustHaves || []),
  ...(contract.noGos || []),
  ...(contract.unknowns || [])
].map((item) => item.text).join('\n').toLowerCase();

function assertContainsAll(text, fragments, label) {
  const value = String(text).toLowerCase();
  for (const fragment of fragments) {
    assert.ok(value.includes(String(fragment).toLowerCase()), `${label} missing explicit fragment: ${fragment}`);
  }
}

function assertContainsNone(text, fragments, label) {
  const value = String(text).toLowerCase();
  for (const fragment of fragments) {
    assert.ok(!value.includes(String(fragment).toLowerCase()), `${label} unexpectedly contains: ${fragment}`);
  }
}

// CASE A — concrete visual brief. The raw Owner truth is preserved, but descriptive
// visual targets outside explicit Must-Have/No-Go sections are not structured into
// executable requirement IDs today.
const visualTargets = [
  'isometrische Perspektive',
  'klar erkennbarer Spieler-Mech',
  'mechanischer Boss',
  'industrielles Environment',
  'räumliche Tiefe',
  'Material- und Lighting-Anforderungen',
  'Boden-Telegraphen',
  'commercial-indie Quality Bar'
];
const caseABrief = [
  '## Titel',
  'Held-out Visual Target Fixture',
  '',
  '## Kernidee',
  'Eine isometrische Perspektive in einer Sci-Fi-/Mech-Arena.',
  '',
  '## Gefühl & Referenzen',
  'Ein klar erkennbarer Spieler-Mech kämpft gegen einen mechanischer Boss in einem industrielles Environment mit räumliche Tiefe, Material- und Lighting-Anforderungen, Boden-Telegraphen und commercial-indie Quality Bar.',
  '',
  '## Muss-Have',
  '- Produktive Spieleraktion muss den Score verändern.'
].join('\n');
const caseA = createOwnerContract({ idea: caseABrief, source: 'held-out-case-a' });
assertContainsAll(caseA.originalBrief, visualTargets, 'case A originalBrief');
assert.deepEqual(ownerRequirementIds(caseA), ['MH-01']);
assertContainsNone(structuredText(caseA), visualTargets, 'case A structured requirements');

// A deterministic fidelity PASS can therefore occur without any criterion for the
// explicit visual targets above: Product Fidelity only sees ownerRequirementIds().
const caseAFidelity = evaluateProductFidelity({
  ownerContract: caseA,
  gdd: {
    acceptanceCriteria: [
      { id: 'AC-MH-01', ownerRequirementId: 'MH-01', statement: 'Score increases during productive play.' }
    ],
    probePlan: {
      requirementProbes: [
        { id: 'PR-MH-01', acceptanceId: 'AC-MH-01', ownerRequirementId: 'MH-01', kind: 'score_change' }
      ]
    }
  },
  report: {
    timeline: [
      { phase: 'start', snapshot: { state: 'title', score: 0, events: [] } },
      { phase: 'early', snapshot: { state: 'playing', score: 1, events: [] } },
      { phase: 'mid', snapshot: { state: 'playing', score: 2, events: [] } },
      { phase: 'end', snapshot: { state: 'playing', score: 3, events: [] } }
    ]
  }
});
assert.equal(caseAFidelity.pass, true);
assert.deepEqual(caseAFidelity.requirementIds, ['MH-01']);
assert.equal(caseAFidelity.criteria.length, 1);

// CASE B — intentionally vague brief. The factory must not manufacture the concrete
// visual/product details from Case A.
const caseB = createOwnerContract({
  idea: 'Baue ein kleines schnelles Sci-Fi Action Game.',
  source: 'held-out-case-b'
});
assert.equal(caseB.mustHaves.length, 1);
assertContainsNone(caseB.originalBrief, visualTargets, 'case B originalBrief');
assertContainsNone(structuredText(caseB), visualTargets, 'case B structured requirements');

// CASE C — mixed brief. Explicit Must-Have survives, open/ descriptive product truth
// remains in the immutable original brief but is not silently promoted to Owner truth.
const caseCBrief = [
  '## Kernidee',
  'Top-down Sci-Fi combat with an industrial lighting mood.',
  '',
  '## Muss-Have',
  '- Der Angriff des Spielers muss sofort lesbar sein.',
  '',
  '## Offene Punkte',
  'Boss-Form und genaue Arena-Geometrie bleiben offen.'
].join('\n');
const caseC = createOwnerContract({ idea: caseCBrief, source: 'held-out-case-c' });
assert.deepEqual(caseC.mustHaves.map((item) => item.text), ['Der Angriff des Spielers muss sofort lesbar sein.']);
assertContainsAll(caseC.originalBrief, ['Top-down Sci-Fi combat', 'industrial lighting mood', 'Boss-Form und genaue Arena-Geometrie bleiben offen'], 'case C originalBrief');
assertContainsNone(structuredText(caseC), ['Top-down Sci-Fi combat', 'industrial lighting mood', 'Boss-Form und genaue Arena-Geometrie bleiben offen'], 'case C structured requirements');

// CASE D — gameplay identity. Explicit gameplay/fantasy identity in another section
// reaches the raw Director input but is not represented by a stable Owner requirement ID.
const caseDBrief = [
  '## Gameplay Identity',
  'Der Spieler zerlegt Maschinen-Titanen, übernimmt deren Komponenten und verstärkt damit unmittelbar den eigenen Core.',
  'Der Run dreht sich um Salvage statt um eine stationäre Forge-Station.',
  '',
  '## Muss-Have',
  '- Upgrades müssen einen realen Gameplay-Wert verändern.'
].join('\n');
const caseD = createOwnerContract({ idea: caseDBrief, source: 'held-out-case-d' });
assert.deepEqual(ownerRequirementIds(caseD), ['MH-01']);
assertContainsAll(caseD.originalBrief, ['zerlegt Maschinen-Titanen', 'übernimmt deren Komponenten', 'Salvage statt um eine stationäre Forge-Station'], 'case D originalBrief');
assertContainsNone(structuredText(caseD), ['zerlegt Maschinen-Titanen', 'übernimmt deren Komponenten', 'Salvage statt um eine stationäre Forge-Station'], 'case D structured requirements');

// Prompt assembly/root-cause boundary: the Director receives both the full raw idea and
// the Owner Contract. This rules out loss between intake storage and Director user context.
const directorSource = read('factory/src/roles/director.mjs');
assert.match(directorSource, /ownerIdea:\s*idea/);
assert.match(directorSource, /ownerContract,/);
assert.match(directorSource, /skillNames:\s*\['directing',\s*'art-direction'\]/);

// Historical Titan evidence: the durable executable brief exactly matches the source idea,
// and it explicitly asked for top-down/cyberpunk/neon — not the richer isometric target
// first stated in the later Owner reject.
const titanIdea = read('ideas/titan-core-reforged-canary-3.md').trim();
const titanBrief = readJson('runs/20260827-120138/brief.json');
const titanContract = readJson('runs/20260827-120138/owner-contract.json');
const titanGdd = readJson('runs/20260827-120138/gdd.json');
const titanResult = readJson('runs/20260827-120138/RESULT.json');
const ownerFeedback = readJson('learning/evidence/owner-feedback/gh-issue-6-comment-5443073595.json');
const candidateA = readJson('learning/candidates/titan-canary-3-visual-target-intake-v1.json');
const candidateB = readJson('learning/candidates/candidate-owner-feedback-8e1c9bf738f845cb.json');

assert.equal(titanBrief.idea.trim(), titanIdea);
assert.equal(titanContract.originalBrief.trim(), titanIdea);
assertContainsAll(titanIdea, ['Top-down-Arcade-Action-Prototyp', 'Sci-Fi-/Cyberpunk-Arena', 'Neon-Silhouetten', 'Salvage-/Upgrade-Mechanik', 'extrahieren oder tiefer gehen'], 'Titan executable brief');
const lateRejectTargets = ['isometrische', 'industriellem environment', 'räumlicher tiefe', 'texturen/beleuchtung', 'boden-telegraphen', 'commercial-indie'];
assertContainsAll(ownerFeedback.rawText, lateRejectTargets, 'Titan Owner reject');
assertContainsNone(titanIdea, lateRejectTargets, 'Titan executable brief');

// The Director and Engineer output is substantially aligned with the actually authorized
// Titan brief: cyberpunk/neon, boss, salvage upgrades and extract/descend. The named design
// choices may still be disliked, but they are not evidence that the later missing targets
// were lost from the authorized brief.
assertContainsAll(JSON.stringify(titanGdd), ['dark cyberpunk foundry', 'Core Cannon', 'Forge Ring Upgrades', 'Extraction Gamble', 'single-screen arena'], 'Titan GDD');
assert.equal(titanResult.meta.productFidelity.pass, true);
assert.deepEqual(
  titanResult.meta.productFidelity.criteria.map((item) => item.requirementId),
  ownerRequirementIds(titanContract)
);
assert.equal(candidateA.active, false);
assert.equal(candidateB.active, false);

console.log(JSON.stringify({
  test: 'Titan Step 3 candidate validation',
  result: 'PASS',
  candidateA: 'falsified-as-specific-Titan-root-cause',
  candidateB: 'partially-supported-systemic-decomposition-and-fidelity-coverage-gap',
  promptAssemblyLoss: false,
  productionOwnerContractChanged: false,
  candidatesRemainInactive: true
}, null, 2));
