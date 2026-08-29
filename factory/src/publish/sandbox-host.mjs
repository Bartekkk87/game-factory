import { createHash } from 'node:crypto';

function escapeAttr(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function unescapeAttr(value) {
  return String(value ?? '')
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function sha256Text(value) {
  return createHash('sha256').update(Buffer.from(String(value), 'utf8')).digest('hex');
}

export function assembleSandboxHost({ title, gameHtml, candidateSha }) {
  const safeTitle = String(title || 'Game').replace(/[<>&"]/g, '');
  const verifiedSha = String(candidateSha || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(verifiedSha)) throw new Error('sandbox host requires verified candidate SHA-256');
  const srcdoc = escapeAttr(gameHtml);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; object-src 'none'">
<title>${safeTitle}</title>
<style>html,body,iframe{margin:0;width:100%;height:100%;border:0;background:#000}body{overflow:hidden}</style>
</head>
<body data-verified-candidate-sha="${verifiedSha}">
<iframe title="${escapeAttr(safeTitle)}" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${srcdoc}"></iframe>
</body>
</html>
`;
}

export function materializeStaticSandboxHost({ hostHtml, payloadFilename = 'play.html' }) {
  const source = String(hostHtml ?? '');
  const filename = String(payloadFilename || '').trim();
  if (!/^[A-Za-z0-9._/-]+$/.test(filename) || filename.startsWith('/') || filename.includes('..')) {
    throw new Error('static sandbox payload filename must be a safe relative path');
  }

  const shaMatch = source.match(/data-verified-candidate-sha="([0-9a-f]{64})"/i);
  const iframeMatch = source.match(/<iframe\b[^>]*\ssrcdoc="[^"]*"[^>]*><\/iframe>/i);
  if (!shaMatch || !iframeMatch) return null;

  if (!/\ssandbox="allow-scripts"(?:\s|>)/i.test(iframeMatch[0])) {
    throw new Error('static sandbox materialization requires exact sandbox="allow-scripts" isolation');
  }
  if (/allow-same-origin/i.test(iframeMatch[0])) {
    throw new Error('static sandbox materialization refuses allow-same-origin');
  }

  const srcdocMatch = iframeMatch[0].match(/\ssrcdoc="([^"]*)"/i);
  if (!srcdocMatch) return null;
  const payloadHtml = unescapeAttr(srcdocMatch[1]);
  const expectedSha = shaMatch[1].toLowerCase();
  const actualSha = sha256Text(payloadHtml);
  if (actualSha !== expectedSha) {
    throw new Error(`static sandbox payload SHA mismatch: expected ${expectedSha}, got ${actualSha}`);
  }

  const rewrittenIframe = iframeMatch[0].replace(
    /\ssrcdoc="[^"]*"/i,
    ` src="${escapeAttr(filename)}"`
  );
  const rewrittenHostHtml = source.replace(iframeMatch[0], rewrittenIframe);

  return Object.freeze({
    hostHtml: rewrittenHostHtml,
    payloadHtml,
    payloadFilename: filename,
    verifiedPayloadSha256: actualSha
  });
}

export function sandboxHostPolicy() {
  return Object.freeze({
    generatedCodeOrigin: 'opaque-origin-via-sandboxed-srcdoc',
    sandboxTokens: Object.freeze(['allow-scripts']),
    allowSameOrigin: false,
    externalNetworkInChild: false
  });
}
