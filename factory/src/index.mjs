import fs from 'node:fs';
import { LIMITS } from './config.mjs';
import { log } from './util/log.mjs';
import { produceGame } from './pipeline/run.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

log.step('GAME FACTORY - autonomous production run');

let idea = arg('--idea') || '';
const ideaFile = arg('--idea-file');
if (ideaFile) {
  idea = fs.readFileSync(ideaFile, 'utf8').trim();
}
const source = arg('--source') || (ideaFile ? 'ideas-folder' : 'chat');
const budgetUsd = Number(arg('--budget')) || LIMITS.budgetUsd;

log.info(`idea source: ${source} | budget: $${budgetUsd} | gate: score>=${LIMITS.minOverallScore}`);

try {
  const result = await produceGame({ idea, source, budgetUsd });
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
