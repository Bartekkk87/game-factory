import assert from 'node:assert/strict';
import { createInitialState } from '../src/state.mjs';
import { applyAction } from '../src/simulation.mjs';

const first = createInitialState();
const second = createInitialState();
assert.notEqual(first, second, 'initial state instances must be independent');
assert.deepEqual(first, second);

const blockedMine = applyAction(first, 'MINE_ORE');
assert.deepEqual(blockedMine, { power: 0, ore: 0, turn: 0 }, 'mining without power must not advance durable state');
assert.notEqual(blockedMine, first, 'simulation must return a new state object');

assert.throws(() => applyAction(first, 'UNKNOWN_ACTION'), /unknown action/i);

console.log('Kepler M1 regression: PASS');
