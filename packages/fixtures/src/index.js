/**
 * @hum/fixtures — golden masters.
 *
 * Two tiers that answer different questions; see README.md.
 *   regression/  what the tree does today  — must stay green
 *   targets/     what attempt 1 achieved   — expected red until Phases 6-7
 *
 * JSON is read at call time rather than imported, so consumers do not need
 * import-attributes support and a stale fixture cannot be baked into a bundle.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../', import.meta.url));

const read = (/** @type {string} */ rel) =>
  JSON.parse(readFileSync(join(DIR, rel), 'utf8'));

/** @returns {Record<string, number>} what `tools/lib` produces today. */
export const toolsLibRegression = () => read('regression/tools-lib.json').values;

/** @returns {Record<string, number>} what `src/script.js` produces today, at J2000. */
export const scriptJsRegression = () => read('regression/script-js.json').values;

/** @returns {Array<object>} attempt-1 acceptance targets. Expected red. */
export const attempt1Targets = () => read('targets/attempt1.json').targets;
