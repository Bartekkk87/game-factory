// Pages gallery builder. This comment also records the 2026-08-29 benchmark-preview refresh; runtime behavior is unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PATHS } from '../config.mjs';
import { log } from '../util/log.mjs';
import { readJson, ensureDir } from '../util/fsx.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function scan(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const items = [];
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const meta = readJson(path.join(baseDir, entry.name, 'meta.json'));
    if (meta) items.push({ ...meta, slug: entry.name });
  }
  return items.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}

function card(item, badge, accent) {
  const shots = ['shot-2-gameplay.png', 'shot-3-gameplay.png', 'shot-1-title.png'];
  const safeSlug = encodeURIComponent(String(item.slug));
  let img = null;
  for (const s of shots) {
    const diskRel = `${badge.dirPrefix}/${item.slug}/${s}`;
    if (fs.existsSync(path.join(outDir(), diskRel))) {
      img = `${badge.dirPrefix}/${safeSlug}/${s}`;
      break;
    }
  }
  const scoreColor = item.overall >= 8 ? '#7dffb2' : item.overall >= 7 ? '#ffd166' : '#ff9db0';
  return `
  <a class="card" href="${badge.dirPrefix}/${safeSlug}/index.html">
    <div class="thumb">${img ? `<img loading="lazy" src="${img}" alt="">` : `<div class="noimg">${escapeHtml(item.genre ?? 'game')}</div>`}</div>
    <div class="body">
      <div class="row"><h3>${escapeHtml(item.title)}</h3><span class="chip" style="color:${scoreColor};border-color:${scoreColor}">${escapeHtml(item.overall ?? '?')}&#9733;</span></div>
      <p>${escapeHtml(item.tagline ?? '')}</p>
      <div class="row small"><span class="badge" style="background:${accent}">${escapeHtml(badge.label)}</span><span>${escapeHtml(String(item.date ?? '').slice(0, 10))}</span></div>
    </div>
  </a>`;
}

let OUT = null;
function outDir() {
  return OUT;
}

function page({ drafts, products }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Game Factory</title>
<style>
:root{--bg:#0b0e1a;--panel:#131829;--text:#e8ecf8;--muted:#93a0c4;--acc:#7c5cff}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#1c1440 0%,var(--bg) 55%);color:var(--text);font-family:system-ui,sans-serif;min-height:100vh}
header{padding:56px 24px 12px;text-align:center}
header h1{margin:0;font-size:44px;letter-spacing:-1px}
header h1 span{background:linear-gradient(90deg,#7c5cff,#00e0ff,#ff5c8a);-webkit-background-clip:text;background-clip:text;color:transparent}
header p{color:var(--muted);margin:10px 0 0}
main{max-width:1200px;margin:0 auto;padding:24px}
section h2{margin:40px 0 6px;font-size:22px}
section .sub{color:var(--muted);font-size:14px;margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.card{display:flex;flex-direction:column;background:var(--panel);border:1px solid #232b47;border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .15s ease,border-color .15s ease}
.card:hover{transform:translateY(-3px);border-color:var(--acc)}
.thumb{aspect-ratio:16/9;background:#0e1220;display:flex;align-items:center;justify-content:center;color:#39415c;font-size:13px;letter-spacing:1px;text-transform:uppercase}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.row h3{margin:0;font-size:17px}
.row.small{font-size:12px;color:var(--muted)}
.body p{margin:0;color:var(--muted);font-size:13px;line-height:1.45;min-height:36px}
.chip{font-size:13px;font-weight:700;border:1px solid;border-radius:999px;padding:2px 10px}
.badge{color:#08101f;font-weight:700;font-size:11px;padding:3px 8px;border-radius:6px;letter-spacing:.5px}
footer{text-align:center;color:#4b5578;font-size:12px;padding:40px 0 28px}
.empty{grid-column:1/-1;color:var(--muted);border:1px dashed #2a3357;border-radius:12px;padding:26px;text-align:center;font-size:14px}
</style>
</head>
<body>
<header>
  <h1>GAME <span>FACTORY</span></h1>
  <p>autonomously produced web games &middot; human-approved releases</p>
</header>
<main>
  <section>
    <h2>Review Queue</h2>
    <p class="sub">Fresh drafts awaiting owner verdict. Play them, then /approve or /reject on their review issue.</p>
    <div class="grid">${drafts.length ? drafts.map((d) => card(d, { label: 'DRAFT', dirPrefix: 'drafts' }, '#ffd166')).join('') : '<div class="empty">Queue is empty - trigger a new run in the Actions tab.</div>'}</div>
  </section>
  <section>
    <h2>Game Library</h2>
    <p class="sub">Approved releases.</p>
    <div class="grid">${products.length ? products.map((p) => card(p, { label: 'PLAY', dirPrefix: 'products' }, '#7dffb2')).join('') : '<div class="empty">No approved games yet.</div>'}</div>
  </section>
</main>
<footer>built autonomously by game-factory v0.1 &middot; every release passed technical contract, vision playtest and audit</footer>
</body>
</html>
`;
}

OUT = path.resolve(ROOT, arg('--out') || '_site');
fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

const drafts = scan(PATHS.drafts);
const products = scan(PATHS.products);

for (const prefix of [PATHS.drafts, PATHS.products]) {
  if (fs.existsSync(prefix)) fs.cpSync(prefix, path.join(OUT, path.basename(prefix)), { recursive: true });
}

fs.writeFileSync(path.join(OUT, 'index.html'), page({ drafts, products }));
log.info(`site generated: ${drafts.length} draft(s), ${products.length} published -> ${OUT}`);
