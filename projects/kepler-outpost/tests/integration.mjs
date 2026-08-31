import assert from 'node:assert/strict';
import { createInitialState } from '../src/state.mjs';
import { applyAction } from '../src/simulation.mjs';

let state = createInitialState();
for (const action of ['GENERATE_POWER', 'MINE_ORE']) state = applyAction(state, action);

assert.equal(state.power, 1);
assert.equal(state.ore, 1);
assert.equal(state.turn, 2);
assert.deepEqual(Object.keys(state).sort(), ['ore', 'power', 'turn']);

console.log('Kepler M1 integration: PASS');
