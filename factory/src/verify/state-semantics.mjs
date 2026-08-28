const NORMALIZED_STATE_ALIASES = new Map([
  ['boot', 'boot'],
  ['title', 'title'],
  ['playing', 'playing'],
  ['success', 'success'],
  ['won', 'success'],
  ['failure', 'failure'],
  ['failed', 'failure'],
  ['gameover', 'failure']
]);

const TERMINAL_STATES = new Set(['success', 'failure']);
const CANONICAL_STATES = Object.freeze(['boot', 'title', 'playing', 'success', 'failure']);
const STATE_REACHED_ALLOWED = Object.freeze([...NORMALIZED_STATE_ALIASES.keys()]);

function stateText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function canonicalVerifierState(value) {
  const text = stateText(value);
  return NORMALIZED_STATE_ALIASES.get(text) || null;
}

export function canonicalTerminalState(value) {
  const canonical = canonicalVerifierState(value);
  return TERMINAL_STATES.has(canonical) ? canonical : null;
}

export function isSupportedVerifierState(value) {
  return canonicalVerifierState(value) !== null;
}

export function verifierStatesMatch(observed, expected) {
  const observedCanonical = canonicalVerifierState(observed);
  const expectedCanonical = canonicalVerifierState(expected);
  return observedCanonical !== null && expectedCanonical !== null && observedCanonical === expectedCanonical;
}

export function verifierStateContract() {
  return {
    protocol: 'factory-verifier-state-v1',
    canonicalStates: [...CANONICAL_STATES],
    stateReachedAllowed: [...STATE_REACHED_ALLOWED],
    terminalCanonical: ['success', 'failure'],
    aliases: {
      won: 'success',
      failed: 'failure',
      gameover: 'failure'
    },
    rule: 'state_reached probes must use only stateReachedAllowed values; thematic or game-specific state names belong in events/UI, not verifier state fields'
  };
}
