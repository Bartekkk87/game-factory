export const PERSISTENCE_BRIDGE_PROTOCOL = 'project-game.persistence-bridge/v1';
export const PERSISTENCE_RECORD_SCHEMA = 'project-game.persistence-record/v1';

const PERSISTENCE_CONTRACT_SCHEMA = 'project-game.persistence/v1';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAVE_KEYS = Object.freeze(['protocol', 'type', 'requestId', 'projectId', 'slot', 'schemaVersion', 'state']);
const LOAD_KEYS = Object.freeze(['protocol', 'type', 'requestId', 'projectId', 'slot', 'schemaVersion']);

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertPlainObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`);
  return value;
}

function assertExactKeys(value, allowed, field) {
  const actual = Object.keys(assertPlainObject(value, field)).sort();
  const expected = [...allowed].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${field} fields invalid`);
  }
}

function normalizeProjectId(value) {
  const projectId = String(value || '').trim();
  if (!SAFE_ID.test(projectId)) throw new Error('persistence host projectId invalid');
  return projectId;
}

function validatePersistenceContract(contract) {
  if (contract?.schemaVersion !== PERSISTENCE_CONTRACT_SCHEMA) throw new Error('persistence host contract schema invalid');
  if (!/^\d+\.\d+\.\d+$/.test(String(contract.saveSchemaVersion || ''))) {
    throw new Error('persistence host save schema invalid');
  }
  if (!Number.isInteger(contract.slots) || contract.slots < 1) throw new Error('persistence host slots invalid');
  if (!Number.isInteger(contract.maxBytes) || contract.maxBytes < 1) throw new Error('persistence host maxBytes invalid');
  if (contract.corruptSaveBehavior !== 'quarantine-and-start-safe') {
    throw new Error('persistence host corrupt-save behavior unsupported');
  }
  if (contract.bridge?.protocol !== PERSISTENCE_BRIDGE_PROTOCOL) throw new Error('persistence host bridge protocol invalid');
  if (contract.bridge?.transport !== 'postMessage') throw new Error('persistence host bridge transport invalid');
  if (contract.bridge?.childOrigin !== 'opaque') throw new Error('persistence host requires opaque child origin');
  if (contract.bridge?.hostAuthority !== true) throw new Error('persistence host authority missing');
  if (contract.bridge?.allowSameOrigin !== false) throw new Error('persistence host must forbid allow-same-origin');
  return structuredClone(contract);
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function serializeState(contract, state) {
  let serialized;
  try {
    serialized = JSON.stringify({ schemaVersion: contract.saveSchemaVersion, state });
  } catch {
    throw new Error('state is not JSON serializable');
  }
  if (typeof serialized !== 'string' || !serialized.includes('"state"')) throw new Error('state is not JSON serializable');
  if (byteLength(serialized) > contract.maxBytes) throw new Error('save exceeds persistence size limit');
  return serialized;
}

function validateSlot(contract, value) {
  if (!Number.isInteger(value) || value < 0 || value >= contract.slots) throw new Error('slot outside persistence contract');
  return value;
}

function validateRequestEnvelope(request, projectId, contract) {
  assertPlainObject(request, 'persistence request');
  if (request.protocol !== PERSISTENCE_BRIDGE_PROTOCOL) throw new Error('bridge protocol mismatch');
  if (!['save', 'load'].includes(request.type)) throw new Error('bridge request type invalid');
  assertExactKeys(request, request.type === 'save' ? SAVE_KEYS : LOAD_KEYS, 'persistence request');
  if (!SAFE_REQUEST_ID.test(String(request.requestId || ''))) throw new Error('requestId invalid');
  if (request.projectId !== projectId) throw new Error('projectId mismatch');
  validateSlot(contract, request.slot);
  if (request.schemaVersion !== contract.saveSchemaVersion) throw new Error('save schema mismatch');
  if (request.type === 'save' && !own(request, 'state')) throw new Error('save state missing');
  return request;
}

function storageKey(projectId, slot) {
  return `project-game:persistence:${encodeURIComponent(projectId)}:${slot}`;
}

function quarantineKey(projectId, slot) {
  return `${storageKey(projectId, slot)}:quarantine`;
}

function validateStoredRecord(record, projectId, slot, contract) {
  assertExactKeys(record, ['schemaVersion', 'projectId', 'slot', 'saveSchemaVersion', 'state'], 'stored persistence record');
  if (record.schemaVersion !== PERSISTENCE_RECORD_SCHEMA) throw new Error('stored persistence record schema invalid');
  if (record.projectId !== projectId) throw new Error('stored persistence project mismatch');
  if (record.slot !== slot) throw new Error('stored persistence slot mismatch');
  if (record.saveSchemaVersion !== contract.saveSchemaVersion) throw new Error('stored persistence save schema mismatch');
  serializeState(contract, record.state);
  return record;
}

function classifyRequestError(error) {
  const message = String(error?.message || error);
  if (message.includes('projectId mismatch')) return 'project-mismatch';
  if (message.includes('slot outside')) return 'slot-invalid';
  if (message.includes('save schema mismatch')) return 'schema-mismatch';
  if (message.includes('size limit')) return 'size-limit';
  if (message.includes('JSON serializable')) return 'state-invalid';
  if (message.includes('protocol')) return 'protocol-invalid';
  if (message.includes('request type')) return 'type-invalid';
  if (message.includes('requestId')) return 'request-id-invalid';
  if (message.includes('fields invalid')) return 'request-shape-invalid';
  return 'request-invalid';
}

function responseBase(request) {
  return {
    protocol: PERSISTENCE_BRIDGE_PROTOCOL,
    type: 'response',
    requestId: typeof request?.requestId === 'string' ? request.requestId : null
  };
}

function safePost(target, payload) {
  if (!target || typeof target.postMessage !== 'function') return;
  target.postMessage(payload, '*');
}

function quarantineCorruptRecord(storage, projectId, slot, raw) {
  try {
    storage.setItem(quarantineKey(projectId, slot), raw);
    storage.removeItem(storageKey(projectId, slot));
    return true;
  } catch {
    return false;
  }
}

export function persistenceHostStorageKey(projectId, slot) {
  return storageKey(normalizeProjectId(projectId), Number(slot));
}

export function installPersistenceHostBridge({ hostWindow, frame, projectId, contract, storage } = {}) {
  if (!hostWindow || typeof hostWindow.addEventListener !== 'function') throw new Error('persistence host window invalid');
  if (!frame || !('contentWindow' in frame)) throw new Error('persistence host frame invalid');
  const checkedProjectId = normalizeProjectId(projectId);
  const checkedContract = validatePersistenceContract(contract);
  const checkedStorage = storage || hostWindow.localStorage;
  if (!checkedStorage || typeof checkedStorage.getItem !== 'function' || typeof checkedStorage.setItem !== 'function') {
    throw new Error('persistence host storage invalid');
  }

  const onMessage = (event) => {
    if (!frame.contentWindow || event.source !== frame.contentWindow) return;
    const request = event.data;
    if (event.origin !== 'null') {
      safePost(event.source, { ...responseBase(request), ok: false, code: 'origin-rejected' });
      return;
    }

    let checkedRequest;
    try {
      checkedRequest = validateRequestEnvelope(request, checkedProjectId, checkedContract);
    } catch (error) {
      safePost(event.source, {
        ...responseBase(request),
        ok: false,
        code: classifyRequestError(error)
      });
      return;
    }

    if (checkedRequest.type === 'save') {
      let serialized;
      try {
        serialized = serializeState(checkedContract, checkedRequest.state);
      } catch (error) {
        safePost(event.source, {
          ...responseBase(checkedRequest),
          ok: false,
          code: classifyRequestError(error)
        });
        return;
      }
      const record = {
        schemaVersion: PERSISTENCE_RECORD_SCHEMA,
        projectId: checkedProjectId,
        slot: checkedRequest.slot,
        saveSchemaVersion: checkedContract.saveSchemaVersion,
        state: checkedRequest.state
      };
      try {
        checkedStorage.setItem(storageKey(checkedProjectId, checkedRequest.slot), JSON.stringify(record));
      } catch {
        safePost(event.source, { ...responseBase(checkedRequest), ok: false, code: 'storage-write-failed' });
        return;
      }
      safePost(event.source, {
        ...responseBase(checkedRequest),
        ok: true,
        operation: 'save',
        slot: checkedRequest.slot,
        bytes: byteLength(serialized)
      });
      return;
    }

    let raw;
    try {
      raw = checkedStorage.getItem(storageKey(checkedProjectId, checkedRequest.slot));
    } catch {
      safePost(event.source, { ...responseBase(checkedRequest), ok: false, code: 'storage-read-failed' });
      return;
    }
    if (raw === null) {
      safePost(event.source, {
        ...responseBase(checkedRequest),
        ok: true,
        operation: 'load',
        slot: checkedRequest.slot,
        found: false,
        state: null
      });
      return;
    }

    let record;
    try {
      record = validateStoredRecord(JSON.parse(raw), checkedProjectId, checkedRequest.slot, checkedContract);
    } catch {
      const quarantined = quarantineCorruptRecord(checkedStorage, checkedProjectId, checkedRequest.slot, raw);
      safePost(event.source, {
        ...responseBase(checkedRequest),
        ok: false,
        code: quarantined ? 'corrupt-save' : 'corrupt-save-quarantine-failed',
        safeStart: quarantined
      });
      return;
    }

    safePost(event.source, {
      ...responseBase(checkedRequest),
      ok: true,
      operation: 'load',
      slot: checkedRequest.slot,
      found: true,
      state: structuredClone(record.state)
    });
  };

  hostWindow.addEventListener('message', onMessage);
  return Object.freeze({
    protocol: PERSISTENCE_BRIDGE_PROTOCOL,
    projectId: checkedProjectId,
    dispose() {
      hostWindow.removeEventListener('message', onMessage);
    }
  });
}
