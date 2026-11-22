// The artifact fingerprint's contract (tools/lib/artifact-inputs.js; doc 111 §1.36 "the price of a comment"):
// a JavaScript source is fingerprinted by its TOKENS — a comment or whitespace edit leaves the fingerprint
// unchanged, any token edit (a literal, an identifier, an operator) moves it — a stamped JSON artifact is
// fingerprinted by its CONTENT minus its own `inputs` stamp and the record-only timing keys (a stamp of a stamp
// re-staled identical content downstream), a data file without a stamp keeps its byte hash, and a RECORDED
// fingerprint is verified in the convention it carries (bytes, tokens or content), so the stamps written before
// either convention stay verifiable and migrate at their next write.
//
// Plant: ESSRT_ARTIFACT_INPUTS_PLANT=1 makes the source fingerprint the byte hash again — this test then FAILS
// on the comment edit (the gate is shown to see what it names).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const AI = require('../tools/lib/artifact-inputs.js');

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failed++; };

// A source text, its comment-and-whitespace twin, and a token-changed twin.
const src = `// a leading comment\nconst a = 1.5e-3; /* block */ function f(x) { return x * a + 'str'; }\nexport const r = /ab+c/gi;\n`;
const commentTwin = `/* a different leading comment */\nconst a   = 1.5e-3;\n\n\nfunction f(x) {\n  // inner comment\n  return x * a + 'str';\n}\nexport const r = /ab+c/gi; // trailing\n`;
const tokenTwin = src.replace('1.5e-3', '1.5e-4');
const stringTwin = src.replace("'str'", "'str2'");
const regexTwin = src.replace('/ab+c/gi', '/ab+c/g');

const h = (t) => AI.hashSourceText('.mjs', t);
check('a source text tokenizes', typeof h(src) === 'string' && h(src).startsWith('sha256-tokens:'), String(h(src)).slice(0, 24));
check('a comment and whitespace edit leaves the fingerprint unchanged', h(src) === h(commentTwin));
check('a numeric literal edit moves it', h(src) !== h(tokenTwin));
check('a string literal edit moves it', h(src) !== h(stringTwin));
check('a regex flag edit moves it', h(src) !== h(regexTwin));
check('a CommonJS text tokenizes under the script goal', typeof AI.hashSourceText('.cjs', "'use strict';\nconst x = require('y');\nmodule.exports = { x };\n") === 'string');
check('an untokenizable text yields null (the bytes then stand)', AI.hashSourceText('.js', 'const s = "unterminated;\n') === null);   // the tokenizer does not parse: only a lexical error refuses

// Real files: a source carries the token convention under the plant-free run, a data file the byte hash.
const srcRel = 'tools/lib/artifact-inputs.js';
const dataRel = 'package.json';
const plant = process.env.ESSRT_ARTIFACT_INPUTS_PLANT === '1';
check('a repository source is fingerprinted by tokens', plant || AI.fingerprint(srcRel).startsWith('sha256-tokens:'), AI.fingerprint(srcRel).slice(0, 24));
check('a data file is fingerprinted by bytes', AI.fingerprint(dataRel).startsWith('sha256:') && AI.fingerprint(dataRel) === AI.hashFile(dataRel));
check('a recorded byte hash of a source is still verified by bytes', AI.matchesRecorded(srcRel, AI.hashFile(srcRel)) === true);
check('a recorded token hash of a source is verified by tokens', AI.matchesRecorded(srcRel, AI.hashSource(srcRel)) === true);
check('a wrong record of either convention is refused', AI.matchesRecorded(srcRel, 'sha256:' + '0'.repeat(64)) === false && AI.matchesRecorded(srcRel, 'sha256-tokens:' + '0'.repeat(64)) === false);
check('a missing file throws (the gate reports it by name)', (() => { try { AI.matchesRecorded('tools/lib/does-not-exist.js', 'sha256:x'); return false; } catch { return true; } })());

// A stamped JSON artifact is fingerprinted by its CONTENT minus its own `inputs` stamp and minus the record-only
// timing keys (a stamp of a stamp: the governed fit pair read stale at the migration because an upstream's stamp
// moved with its content identical); a JSON file without a stamp keeps the byte hash.
const art = '{\n  "value": 1.5,\n  "meta": { "note": "n", "generatedAtWalkSeconds": 249.6 },\n  "runtime_sec": 2.3,\n  "inputs": { "generator": "node x --write", "files": { "a.js": "sha256:aa" } }\n}\n';
const stampTwin = art.replace('"sha256:aa"', '"sha256-tokens:bb"').replace(/\n {2}/g, '\n      ');
const timingTwin = art.replace('249.6', '12.0').replace('2.3', '9.9');
const valueTwin = art.replace('"value": 1.5', '"value": 1.6');
const keyTwin = art.replace('"note": "n"', '"note": "m"');
const hj = AI.hashJsonText;
check('a stamped JSON text carries the content convention', typeof hj(art) === 'string' && hj(art).startsWith('sha256-json:'), String(hj(art)).slice(0, 22));
check('a stamp edit and a re-formatting leave the content fingerprint unchanged', hj(art) === hj(stampTwin));
check('the record-only timing keys leave it unchanged', hj(art) === hj(timingTwin));
check('a value edit moves it', hj(art) !== hj(valueTwin));
check('any other key edit moves it', hj(art) !== hj(keyTwin));
check('a JSON text without a stamp yields null (the bytes then stand)', hj('{"value": 1}') === null && hj('[1,2]') === null && hj('not json') === null);
const jsonRel = 'data/deltaT-4flag-fit.json';
check('a stamped repository artifact is fingerprinted by content', plant || AI.fingerprint(jsonRel).startsWith('sha256-json:'), AI.fingerprint(jsonRel).slice(0, 22));
check('a recorded byte hash of a JSON artifact is still verified by bytes', AI.matchesRecorded(jsonRel, AI.hashFile(jsonRel)) === true);
check('a recorded content hash of a JSON artifact is verified by content', AI.matchesRecorded(jsonRel, AI.hashJson(jsonRel)) === true);
check('a wrong content record is refused', AI.matchesRecorded(jsonRel, 'sha256-json:' + '0'.repeat(64)) === false);
// The plant on a real file: with ESSRT_ARTIFACT_INPUTS_PLANT=1 the JSON fingerprint is the byte hash — a stamp edit
// then changes what a downstream generator would record.
const tmpJsonRel = 'test/.artifact-inputs-plant-probe.json';
try {
  fs.writeFileSync(path.join(AI.ROOT, tmpJsonRel), art);
  const before = AI.fingerprint(tmpJsonRel);
  fs.writeFileSync(path.join(AI.ROOT, tmpJsonRel), stampTwin);
  const after = AI.fingerprint(tmpJsonRel);
  check('a stamp edit of a repository artifact leaves its content fingerprint unchanged', before === after, `${before.slice(0, 20)} vs ${after.slice(0, 20)}`);
} finally { try { fs.unlinkSync(path.join(AI.ROOT, tmpJsonRel)); } catch { /* absent */ } }

// The comment-insensitivity on a real file: a copy with an extra comment line, in the OS temp dir, hashed as text.
const text = fs.readFileSync(path.join(AI.ROOT, srcRel), 'utf8');
check('a real source with one comment line added keeps its token fingerprint', h(text) === h('// one more comment\n' + text));

// The plant: with ESSRT_ARTIFACT_INPUTS_PLANT=1 the source fingerprint is the byte hash — a comment edit then changes
// what a generator would stamp. Assert the contract through the exported fingerprint on a temp copy under ROOT.
const tmpRel = 'test/.artifact-inputs-plant-probe.mjs';
try {
  fs.writeFileSync(path.join(AI.ROOT, tmpRel), src);
  const before = AI.fingerprint(tmpRel);
  fs.writeFileSync(path.join(AI.ROOT, tmpRel), commentTwin);
  const after = AI.fingerprint(tmpRel);
  check('a comment edit of a repository source leaves its stamp fingerprint unchanged', before === after, `${before.slice(0, 20)} vs ${after.slice(0, 20)}`);
} finally { try { fs.unlinkSync(path.join(AI.ROOT, tmpRel)); } catch { /* absent */ } }

console.log(failed ? `\nartifact-inputs: ${failed} FAILED` : '\nartifact-inputs: all PASS');
process.exit(failed ? 1 : 0);
