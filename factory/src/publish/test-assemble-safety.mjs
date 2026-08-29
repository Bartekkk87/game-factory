import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assemble } from './assemble.mjs';
import { assembleSandboxHost, materializeStaticSandboxHost } from './sandbox-host.mjs';

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

const rawGame = '<!doctype html><html><body><script>window.GF_TEST=true;</script></body></html>';
const candidateSha = createHash('sha256').update(Buffer.from(rawGame, 'utf8')).digest('hex');
const sandboxHost = assembleSandboxHost({ title: 'Portable Fixture', gameHtml: rawGame, candidateSha });
const portable = materializeStaticSandboxHost({ hostHtml: sandboxHost });

assert.ok(portable);
assert.equal(portable.payloadHtml, rawGame);
assert.equal(portable.verifiedPayloadSha256, candidateSha);
assert.match(portable.hostHtml, /sandbox="allow-scripts"/);
assert.equal(portable.hostHtml.includes('allow-same-origin'), false);
assert.match(portable.hostHtml, /src="play\.html"/);
assert.equal(portable.hostHtml.includes('srcdoc='), false);
assert.throws(
  () => materializeStaticSandboxHost({ hostHtml: sandboxHost.replace('GF_TEST', 'GF_TAMPERED') }),
  /payload SHA mismatch/
);

console.log('generated page isolation selftest: PASS');
