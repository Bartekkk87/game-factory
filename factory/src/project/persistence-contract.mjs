import { isDeepStrictEqual } from 'node:util';
import { normalizeProjectPath, sha256 } from './contracts.mjs';

export const PERSISTENCE_SCHEMA = 'project-game.persistence/v1';
const CANONICAL_STRATEGY = 'full-state-minus-transient/v1';

function normalizeTransientPaths(values) {
  if (!Array.isArray(values)) throw new Error('save transientStatePaths must be an array');
  return [...new Set(values.map((value) => normalizeProjectPath(value, 'save transientStatePaths')))].sort();
}

function deletePath(target, dottedPath) {
  const parts = dottedPath.split('.');
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!current || typeof current !== 'object') return;
    current = current[parts[index]];
  }
  if (current && typeof current === 'object') delete current[parts.at(-1)];
}

export function createPersistenceContract(input = {}) {
  const schemaVersion = String(input.schemaVersion || '').trim();
  if (!/^\d+\.\d+\.\d+$/.test(schemaVersion)) throw new Error('save schemaVersion must be semantic version');
  const maxBytes = Number(input.maxBytes);
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new Error('save maxBytes must be a positive integer');
  if (Object.hasOwn(input, 'equivalenceProjection')) {
    throw new Error('save equivalenceProjection is forbidden; declare transientStatePaths instead');
  }
  const transientStatePaths = normalizeTransientPaths(input.transientStatePaths || []);
  const contract = {
    schemaVersion: PERSISTENCE_SCHEMA,
    saveSchemaVersion: schemaVersion,
    slots: Number.isInteger(Number(input.slots)) && Number(input.slots) > 0 ? Number(input.slots) : 1,
    maxBytes,
    corruptSaveBehavior: String(input.corruptSaveBehavior || 'quarantine-and-start-safe'),
    migrations: [...new Set((input.migrations || []).map(String))].sort(),
    canonicalDurableState: {
      strategy: CANONICAL_STRATEGY,
      transientStatePaths
    },
    browserReloadProofRequired: input.browserReloadProofRequired !== false,
    bridge: {
      protocol: 'project-game.persistence-bridge/v1',
      transport: 'postMessage',
      childOrigin: 'opaque',
      hostAuthority: true,
      allowSameOrigin: false
    }
  };
  return Object.freeze({ ...contract, contractSha256: sha256(JSON.stringify(contract)) });
}

export function deriveCanonicalDurableState(contract, state) {
  if (contract?.canonicalDurableState?.strategy !== CANONICAL_STRATEGY) {
    throw new Error('canonical durable-state strategy invalid');
  }
  const canonical = structuredClone(state);
  for (const transientPath of contract.canonicalDurableState.transientStatePaths) {
    deletePath(canonical, transientPath);
  }
  return canonical;
}

export function comparePersistedState(contract, expected, actual) {
  const expectedCanonical = deriveCanonicalDurableState(contract, expected);
  const actualCanonical = deriveCanonicalDurableState(contract, actual);
  const pass = isDeepStrictEqual(actualCanonical, expectedCanonical);
  return {
    pass,
    differences: pass ? [] : [{ field: '$canonical', expected: expectedCanonical, actual: actualCanonical }]
  };
}

export async function runSaveReloadProof({ contract, adapter, slot = 0, state } = {}) {
  const expectedCanonical = deriveCanonicalDurableState(contract, state);
  const serialized = JSON.stringify({ schemaVersion: contract.saveSchemaVersion, state: expectedCanonical });
  if (Buffer.byteLength(serialized) > contract.maxBytes) throw new Error('save exceeds persistence size limit');
  const first = await adapter.createSession();
  await first.setState(state);
  await first.save(slot);
  await first.close();
  const reloaded = await adapter.reloadSession();
  await reloaded.load(slot);
  const actual = await reloaded.getState();
  await reloaded.close();
  const comparison = comparePersistedState(contract, state, actual);
  const actualCanonical = deriveCanonicalDurableState(contract, actual);
  return Object.freeze({
    schemaVersion: 'project-game.save-reload-proof/v1',
    saveSchemaVersion: contract.saveSchemaVersion,
    slot,
    pass: comparison.pass,
    differences: comparison.differences,
    expectedStateSha256: sha256(JSON.stringify(expectedCanonical)),
    actualStateSha256: sha256(JSON.stringify(actualCanonical))
  });
}
