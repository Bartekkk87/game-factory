import assert from 'node:assert/strict';
import { assemble } from './assemble.mjs';

const output = assemble({
  title: 'Safety Fixture',
  css: 'body::after{content:"</style><style>body{display:none}"}',
  html: '<main id="game"></main>',
  js: 'const payload = "</script><script>globalThis.__escaped = false</script>";'
});

assert.match(output, /Content-Security-Policy/);
assert.match(output, /default-src 'none'/);
assert.match(output, /connect-src 'none'/);
assert.match(output, /object-src 'none'/);
assert.equal(output.includes('"</script><script>globalThis.__escaped'), false);
assert.equal(output.includes('"</style><style>body{display:none}'), false);
assert.match(output, /<\\\/script/);
assert.match(output, /<\\\/style/);
assert.match(output, /<main id="game"><\/main>/);

console.log('generated page isolation selftest: PASS');
