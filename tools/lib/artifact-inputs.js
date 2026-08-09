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

module.exports = { ROOT, hashFile, buildInputsBlock };
