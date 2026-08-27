import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assembleSystemPrompt } from '../util/skills.mjs';

const root = process.cwd();
const directorSource = fs.readFileSync(path.join(root, 'factory', 'src', 'roles', 'director.mjs'), 'utf8');
assert.match(directorSource, /skillNames:\s*\['directing',\s*'art-direction'\]/);

const assembled = assembleSystemPrompt({
  promptName: 'director',
  skillNames: ['directing', 'art-direction'],
  lessons: []
});
assert.match(assembled, /## Learned skill directives \(directing\)/);
assert.match(assembled, /## Learned skill directives \(art-direction\)/);
assert.match(assembled, /Backgrounds need life:/);
assert.match(assembled, /Strong contrast between gameplay entities and background/);
assert.match(assembled, /fixed deterministic keyboard\/pointer input sequence/i);

console.log('art-direction runtime prompt selftest: PASS');
