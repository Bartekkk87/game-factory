import fs from 'node:fs';
import { PATHS } from '../config.mjs';

let cachedEngine = null;

export function assemble({ title, css = '', html = '', js = '' }) {
  if (!cachedEngine) cachedEngine = fs.readFileSync(PATHS.engineFile, 'utf8');
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
html,body{margin:0;height:100%;background:#000;display:grid;place-items:center;overflow:hidden}
canvas{image-rendering:auto}
${css}
</style>
</head>
<body>
${html}
<script>
${cachedEngine}
</script>
<script>
${js}
</script>
</body>
</html>
`;
}

export function resetEngineCache() {
  cachedEngine = null;
}
