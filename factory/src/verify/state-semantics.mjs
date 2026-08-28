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
