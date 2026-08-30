import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/value.mjs', import.meta.url), 'utf8');
if (!source.includes('value = 2')) throw new Error('reality fixture value is not two');
