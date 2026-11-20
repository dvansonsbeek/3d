/**
 * Campaign-artifact input fingerprinting (§12h follow-up work, Phase 1).
 *
 * A generated artifact in data/ records WHAT it was computed from: an
 * `inputs` block mapping each input file (and the generator script itself)
 * to a sha256 of its bytes. The freshness gate
 * (tools/verify/artifact-freshness.js) re-hashes those paths on every
 * `npm run check` and FAILS when any input moved without the artifact being
 * regenerated — which is what makes a hand-stale campaign number
 * structurally impossible without paying the generator's runtime per check.
 *
 * Convention (shared with the Python twin tools/fit/python/artifact_inputs.py):
 *   "inputs": {
 *     "generator": "node tools/explore/cassini-moontilt.js --write",
 *     "files": { "<repo-relative path>": "sha256:<hex>", ... }
 *   }
 * The generator script itself MUST be one of the files — an edited generator
 * with an un-regenerated artifact is stale by definition.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** sha256 of a repo-relative file, formatted for the inputs block. */
function hashFile(relPath) {
  const bytes = fs.readFileSync(path.join(ROOT, relPath));
  return 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
}

/** Build the `inputs` block for a generator invocation + its input files. */
function buildInputsBlock(generatorCommand, relPaths) {
  const files = {};
  for (const rel of [...relPaths].sort()) files[rel] = hashFile(rel);
  return { generator: generatorCommand, files };
}

/**
 * The package model's source files — the composer `packages/physics/src/model.js` and every slice
 * in `packages/physics/src/model/` (plan 15). A generator that runs on the assembled model lists
 * these in place of the one monolith it hashed before the split. The set is read from the
 * directory, and it is complete by construction: a slice the composer does not import is not part
 * of the model, and adding one edits the composer, which is in the set.
 * @returns {string[]} repo-relative paths
 */
function modelSourceFiles() {
  const dir = 'packages/physics/src/model';
  const slices = fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js')).sort();
  return ['packages/physics/src/model.js', ...slices.map((f) => `${dir}/${f}`)];
}

/**
 * The model's source files MINUS the named slices — for a generator whose recorded tables never read
 * them (the lunar cumulative bank: its chain counts, carriers, channel prefixes and the Sun's mean-
 * longitude table are assembled before the eclipse tier, the cardinal instants and the published
 * surface; plan 33's close-out rider, built in the plan-34 cascade). A slice that is NOT named stays
 * an input by default, so a new slice is hashed until someone proves the generator never reads it; a
 * named slice is refused if it does not exist (a renamed file would silently widen the set).
 * @param {string[]} excludedSlices file names inside packages/physics/src/model/
 * @returns {string[]} repo-relative paths
 */
function modelSourceFilesExcluding(excludedSlices) {
  const dir = 'packages/physics/src/model';
  for (const f of excludedSlices) if (!fs.existsSync(path.join(ROOT, dir, f))) throw new Error(`modelSourceFilesExcluding: ${dir}/${f} does not exist`);
  return modelSourceFiles().filter((p) => !excludedSlices.some((f) => p === `${dir}/${f}`));
}

module.exports = { ROOT, hashFile, buildInputsBlock, modelSourceFiles, modelSourceFilesExcluding };
