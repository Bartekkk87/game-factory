import assert from 'node:assert/strict';
import { createInitialState } from '../src/state.mjs';
import { applyAction } from '../src/simulation.mjs';

const initial = createInitialState();
assert.deepEqual(initial, { power: 0, ore: 0, turn: 0 });

const generated = applyAction(initial, 'GENERATE_POWER');
assert.deepEqual(generated, { power: 2, ore: 0, turn: 1 });
assert.deepEqual(initial, { power: 0, ore: 0, turn: 0 }, 'actions must not mutate their input state');

const mined = applyAction(generated, 'MINE_ORE');
assert.deepEqual(mined, { power: 1, ore: 1, turn: 2 });

console.log('Kepler M1 unit: PASS');
