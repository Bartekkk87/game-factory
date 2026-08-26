import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../config.mjs';

export function loadSkill(name) {
  const file = path.join(PATHS.skills, `${name}.md`);
  try {
    const text = fs.readFileSync(file, 'utf8').trim();
    return text ? `\n\n## Learned skill directives (${name})\n${text}` : '';
  } catch {
    return '';
  }
}

export function loadPrompt(name) {
  return fs.readFileSync(path.join(PATHS.prompts, `${name}.md`), 'utf8');
}
