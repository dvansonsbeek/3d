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

/** sha256 of a repo-relative file's BYTES, `sha256:<hex>` — the fingerprint of a data file. */
function hashFile(relPath) {
  const bytes = fs.readFileSync(path.join(ROOT, relPath));
  return 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
}

/** The JavaScript sources are fingerprinted by their TOKENS (doc 111 §1.36, "the price of a comment": a one-word
 *  comment in a fit-hashed source cost 2.2 h of bit-identical bank regeneration plus a by-hand re-close of the
 *  governed fit — the byte hash cannot tell a comment from physics). acorn's tokenizer drops comments and
 *  whitespace and keeps every literal, identifier and operator; a string or regex edit still moves the hash. */
const SOURCE_EXT = new Set(['.js', '.mjs', '.cjs']);
const acorn = require('acorn');

/** The canonical token stream of a source text, or null where acorn cannot tokenize it (then the bytes stand). */
function tokenStream(ext, text) {
  const read = (sourceType) => {
    const out = [];
    for (const t of acorn.tokenizer(text, { ecmaVersion: 'latest', sourceType, allowHashBang: true, locations: false })) {
      const v = t.value === undefined ? '' : typeof t.value === 'object' && t.value !== null ? JSON.stringify(t.value) : String(t.value);
      out.push(t.type.label + '\u0001' + v);
    }
    return out;
  };
  for (const sourceType of ext === '.cjs' ? ['script', 'module'] : ['module', 'script']) {
    try { return read(sourceType); } catch { /* the other goal symbol */ }
  }
  return null;
}

/** sha256 of a source TEXT's tokens, `sha256-tokens:<hex>`; null where it cannot be tokenized. */
function hashSourceText(ext, text) {
  const tokens = tokenStream(ext, text);
  if (!tokens) return null;
  return 'sha256-tokens:' + crypto.createHash('sha256').update(tokens.join('\n')).digest('hex');
}

/** The token fingerprint of a repo-relative source file (the byte hash where it cannot be tokenized). */
function hashSource(relPath) {
  if (process.env.ESSRT_ARTIFACT_INPUTS_PLANT === '1') return hashFile(relPath);   // the gate's plant: bytes again
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  return hashSourceText(path.extname(relPath), text) || hashFile(relPath);
}

/** A JSON artifact that carries its own `inputs` stamp is fingerprinted by its CONTENT minus the stamp (a stamp of a
 *  stamp: hashed by bytes, an upstream artifact regenerated with identical content re-staled everything downstream
 *  through its re-written stamp — the governed ΔT fit pair read stale at the stamp migration because the climate
 *  coefficients' stamp had moved, and an ordinary cascade re-ran the banks on identical content) and minus the
 *  record-only keys a generator writes about its own run, which no consumer reads (checked: only the writers name
 *  them). A JSON file without a stamp (a cited input, a registry) keeps the byte hash. The text is the parsed
 *  object's canonical JSON.stringify, so formatting cannot move it while any value or key can. */
const RECORD_ONLY_KEYS = ['runtime_sec', 'generatedAtWalkSeconds'];
const RECORD_ONLY_PARENTS = ['meta', 'metadata'];

/** The canonical content text of a stamped JSON artifact, or null where the text is not one. */
function jsonContentText(text) {
  let j;
  try { j = JSON.parse(text); } catch { return null; }
  if (!j || typeof j !== 'object' || Array.isArray(j) || !j.inputs) return null;
  const c = { ...j };
  delete c.inputs;
  for (const k of RECORD_ONLY_KEYS) delete c[k];
  for (const parent of RECORD_ONLY_PARENTS) {
    if (c[parent] && typeof c[parent] === 'object' && !Array.isArray(c[parent])) {
      c[parent] = { ...c[parent] };
      for (const k of RECORD_ONLY_KEYS) delete c[parent][k];
    }
  }
  return JSON.stringify(c);
}

/** sha256 of a stamped JSON text's content, `sha256-json:<hex>`; null where the text is not a stamped artifact. */
function hashJsonText(text) {
  const content = jsonContentText(text);
  if (content === null) return null;
  return 'sha256-json:' + crypto.createHash('sha256').update(content).digest('hex');
}

/** The content fingerprint of a repo-relative JSON file (the byte hash where it carries no stamp). */
function hashJson(relPath) {
  if (process.env.ESSRT_ARTIFACT_INPUTS_PLANT === '1') return hashFile(relPath);   // the gate's plant: bytes again
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  return hashJsonText(text) || hashFile(relPath);
}

/** The fingerprint a NEW stamp records: tokens for a JavaScript source, the content for a stamped JSON artifact,
 *  bytes for everything else. */
function fingerprint(relPath) {
  const ext = path.extname(relPath);
  if (SOURCE_EXT.has(ext)) return hashSource(relPath);
  if (ext === '.json') return hashJson(relPath);
  return hashFile(relPath);
}

/** Does the file still match a RECORDED fingerprint? Compared in the convention the record carries, so a byte-hash
 *  stamp written before the token or the content convention stays verifiable and migrates at the artifact's next
 *  write (the Python twin stamps bytes only). Throws where the file is absent, like hashFile. */
function matchesRecorded(relPath, recorded) {
  if (typeof recorded !== 'string') return false;
  if (recorded.startsWith('sha256-tokens:')) return hashSource(relPath) === recorded;
  if (recorded.startsWith('sha256-json:')) return hashJson(relPath) === recorded;
  return hashFile(relPath) === recorded;
}

/** Build the `inputs` block for a generator invocation + its input files. */
function buildInputsBlock(generatorCommand, relPaths) {
  const files = {};
  for (const rel of [...relPaths].sort()) files[rel] = fingerprint(rel);
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

module.exports = { ROOT, hashFile, hashSource, hashSourceText, hashJson, hashJsonText, fingerprint, matchesRecorded, buildInputsBlock, modelSourceFiles, modelSourceFilesExcluding };
