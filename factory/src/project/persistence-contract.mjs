import { sha256 } from './contracts.mjs';

export const PERSISTENCE_SCHEMA = 'project-game.persistence/v1';

export function createPersistenceContract(input = {}) {
  const schemaVersion = String(input.schemaVersion || '').trim();
  if (!/^\d+\.\d+\.\d+$/.test(schemaVersion)) throw new Error('save schemaVersion must be semantic version');
  const maxBytes = Number(input.maxBytes);
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new Error('save maxBytes must be a positive integer');
  const projection = [...new Set((input.equivalenceProjection || []).map(String))].sort();
  if (!projection.length) throw new Error('save equivalenceProjection is required');
  const contract = {
    schemaVersion: PERSISTENCE_SCHEMA,
    saveSchemaVersion: schemaVersion,
    slots: Number.isInteger(Number(input.slots)) && Number(input.slots) > 0 ? Number(input.slots) : 1,
    maxBytes,
    corruptSaveBehavior: String(input.corruptSaveBehavior || 'quarantine-and-start-safe'),
    migrations: [...new Set((input.migrations || []).map(String))].sort(),
    equivalenceProjection: projection,
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

function pick(source, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], source);
}

export function comparePersistedState(contract, expected, actual) {
  const differences = [];
  for (const field of contract.equivalenceProjection) {
    const left = pick(expected, field);
    const right = pick(actual, field);
    if (JSON.stringify(left) !== JSON.stringify(right)) differences.push({ field, expected: left, actual: right });
  }
  return { pass: differences.length === 0, differences };
}

export async function runSaveReloadProof({ contract, adapter, slot = 0, state } = {}) {
  const serialized = JSON.stringify({ schemaVersion: contract.saveSchemaVersion, state });
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
  return Object.freeze({
    schemaVersion: 'project-game.save-reload-proof/v1',
    saveSchemaVersion: contract.saveSchemaVersion,
    slot,
    pass: comparison.pass,
    differences: comparison.differences,
    expectedStateSha256: sha256(JSON.stringify(state)),
    actualStateSha256: sha256(JSON.stringify(actual))
  });
}
