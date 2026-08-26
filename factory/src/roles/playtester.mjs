import fs from 'node:fs/promises';
import path from 'node:path';
import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt } from '../util/skills.mjs';

function validate(pt) {
  const s = pt.scores ?? {};
  for (const k of ['visuals', 'uiClarity', 'funProxy', 'performance']) {
    if (typeof s[k] !== 'number') throw new Error(`playtester missing score: ${k}`);
  }
  if (typeof pt.overall !== 'number') {
    pt.overall = Math.round(((s.visuals * 0.35 + s.uiClarity * 0.2 + s.funProxy * 0.35 + s.performance * 0.1) / 1) * 10) / 10;
  }
  pt.critique = Array.isArray(pt.critique) ? pt.critique : [];
  pt.priorityFixes = Array.isArray(pt.priorityFixes) ? pt.priorityFixes.slice(0, 3) : [];
  return pt;
}

export async function runPlaytester({ metrics, images }) {
  const system = loadPrompt('playtester');

  const dataUrls = [];
  for (const img of images) {
    if (img?.dataUrl?.startsWith('data:image/')) {
      dataUrls.push(img.dataUrl);
    } else if (typeof img === 'string' && img.startsWith('data:image/')) {
      dataUrls.push(img);
    } else {
      const p = img.path ?? img;
      const buf = await fs.readFile(p);
      dataUrls.push(`data:image/png;base64,${buf.toString('base64')}`);
    }
  }

  const user = [
    'Objective session metrics:',
    JSON.stringify(metrics, null, 2),
    '',
    `Below: ${Math.min(dataUrls.length, 4)} screenshots captured during automated play, in chronological order. Judge them now.`
  ].join('\n');

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await chat({
        role: 'playtester',
        system,
        user,
        images: dataUrls.slice(0, 4),
        json: true,
        temperature: 0.3
      });
      return validate(extractJson(text));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
