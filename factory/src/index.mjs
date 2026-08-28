import fs from 'node:fs';
import path from 'node:path';
import { LIMITS, PATHS } from './config.mjs';
import { log } from './util/log.mjs';
import { readJson, writeJson } from './util/fsx.mjs';
import { produceGame } from './pipeline/run.mjs';
import { orchestrateControlledLearning } from './learning/orchestrate.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

log.step('GAME FACTORY - autonomous production run');

let idea = arg('--idea') || '';
const ideaFile = arg('--idea-file');
if (ideaFile) {
  // Preserve the exact Owner brief bytes used for preflight/Production binding.
  // Parsing may trim internally, but ownerBriefSha256 must bind the original file verbatim.
  idea = fs.readFileSync(ideaFile, 'utf8');
}
const source = arg('--source') || (ideaFile ? 'ideas-folder' : 'chat');
const budgetUsd = Number(arg('--budget')) || LIMITS.budgetUsd;

log.info(`idea source: ${source} | budget: $${budgetUsd} | gate: score>=${LIMITS.minOverallScore}`);

try {
  const result = await produceGame({ idea, source, budgetUsd });
  const runId = path.basename(result.runDir || '');
  if (!runId) throw new Error('production pipeline returned no durable run id');

  if (result.status === 'success' && result.slug) {
    const metaFile = path.join(PATHS.drafts, result.slug, 'meta.json');
    const meta = readJson(metaFile, null);
    if (!meta) throw new Error(`draft meta missing after successful production: ${result.slug}`);
    if (meta.runId !== runId) {
      meta.runId = runId;
      writeJson(metaFile, meta);
      result.meta = meta;
    }
  }

  const learning = orchestrateControlledLearning({ eventKind: 'production-run', eventId: runId });
  log.info(`controlled learning: trigger=${learning.triggerAllowed ? 'YES' : 'NO'} candidate=${learning.candidateId || 'none'} active=${learning.candidateActive ?? 'n/a'}`);

  if (result.status === 'success') {
    log.step('RUN COMPLETE');
    console.log(`
  Draft : drafts/${result.slug}/index.html   (status: awaiting-review)
  Score : ${result.meta.overall}/10
  Cost  : $${result.meta.costUsd} | tokens ${result.meta.tokens}
  Next  : open the Review issue and play the preview, then /approve or /reject
`);
    process.exit(0);
  } else {
    log.error(`run ended with failure status: ${result.reason}`);
    process.exit(2);
  }
} catch (e) {
  log.error(e.stack || e.message);
  process.exit(1);
}
