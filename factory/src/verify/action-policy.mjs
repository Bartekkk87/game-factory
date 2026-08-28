export const VERIFIER_ACTION_POLICY = Object.freeze({
  schemaVersion: 'verifier-action-policy-v1',
  mode: 'bounded-deterministic-directional-sweeps',
  guarantees: Object.freeze([
    'deterministic',
    'seeded',
    'game-agnostic',
    'no-target-knowledge',
    'no-auto-pathfinding',
    'no-teleport',
    'no-hidden-test-hook',
    'terminal-safe'
  ]),
  startImpulse: Object.freeze(['Enter', 'pointer@640,400']),
  directionalSweeps: Object.freeze([
    Object.freeze({ id: 'right', keys: Object.freeze(['ArrowRight', 'KeyD']) }),
    Object.freeze({ id: 'down', keys: Object.freeze(['ArrowDown', 'KeyS']) }),
    Object.freeze({ id: 'left', keys: Object.freeze(['ArrowLeft', 'KeyA']) }),
    Object.freeze({ id: 'up', keys: Object.freeze(['ArrowUp', 'KeyW']) })
  ]),
  movementSegmentMs: 3200,
  movementGapMs: 160,
  actionKeys: Object.freeze(['Space', 'Enter']),
  actionEveryMs: 1200,
  pointerPath: Object.freeze([
    Object.freeze([420, 300]),
    Object.freeze([640, 280]),
    Object.freeze([820, 360]),
    Object.freeze([700, 480]),
    Object.freeze([480, 460]),
    Object.freeze([560, 350])
  ]),
  pointerEveryMs: 450,
  clickEveryMs: 1300,
  idleControl: 'shared-start-impulse-only'
});

function normalizeSeed(seed) {
  const n = Number(seed);
  return Number.isFinite(n) ? (Math.trunc(n) >>> 0) : 0;
}

export function directionSweepsForSeed(seed) {
  const sweeps = VERIFIER_ACTION_POLICY.directionalSweeps;
  const normalized = normalizeSeed(seed);
  const offset = ((normalized >>> 12) % sweeps.length + sweeps.length) % sweeps.length;
  return sweeps.map((_, index) => sweeps[(index + offset) % sweeps.length]);
}

export function verifierActionContract() {
  return {
    schemaVersion: VERIFIER_ACTION_POLICY.schemaVersion,
    mode: VERIFIER_ACTION_POLICY.mode,
    guarantees: [...VERIFIER_ACTION_POLICY.guarantees],
    startImpulse: [...VERIFIER_ACTION_POLICY.startImpulse],
    controls: {
      directionalAliases: VERIFIER_ACTION_POLICY.directionalSweeps.map((sweep) => ({
        direction: sweep.id,
        keys: [...sweep.keys]
      })),
      movementSegmentMs: VERIFIER_ACTION_POLICY.movementSegmentMs,
      movementGapMs: VERIFIER_ACTION_POLICY.movementGapMs,
      actionKeys: [...VERIFIER_ACTION_POLICY.actionKeys],
      actionEveryMs: VERIFIER_ACTION_POLICY.actionEveryMs,
      pointerPath: VERIFIER_ACTION_POLICY.pointerPath.map((point) => [...point]),
      pointerEveryMs: VERIFIER_ACTION_POLICY.pointerEveryMs,
      clickEveryMs: VERIFIER_ACTION_POLICY.clickEveryMs
    },
    idleControl: VERIFIER_ACTION_POLICY.idleControl,
    designBoundary: 'Required deterministic gameplay must be reachable under generic bounded directional sweeps and ordinary action/pointer input; do not depend on hidden routes, target coordinates, precision-only aim, or verifier-specific backdoors.'
  };
}
