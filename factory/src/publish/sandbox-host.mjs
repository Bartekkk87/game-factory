function escapeAttr(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
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

export function sandboxHostPolicy() {
  return Object.freeze({
    generatedCodeOrigin: 'opaque-origin-via-sandboxed-srcdoc',
    sandboxTokens: Object.freeze(['allow-scripts']),
    allowSameOrigin: false,
    externalNetworkInChild: false
  });
}
