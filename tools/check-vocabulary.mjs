#!/usr/bin/env node
/**
 * RETIRED-VOCABULARY RATCHET — the anti-regression for the naming decision
 * (holisticuniverse plan 06 §7 D3, Phase 2b item 4).
 *
 *   node tools/check-vocabulary.mjs             check (default): no file may
 *                                               GAIN retired terms vs the
 *                                               recorded ratchet; new files
 *                                               must be clean
 *   node tools/check-vocabulary.mjs --write     re-record the ratchet (only
 *                                               ever DOWN — say so in the commit)
 *   node tools/check-vocabulary.mjs --report    per-file counts (the sweep worklist)
 *   node tools/check-vocabulary.mjs --root DIR  scan an extra content root
 *                                               (the website's EN pages)
 *
 * The retired terms leave the PRESENTATION only — docs, README, package
 * READMEs, the simulator's user-facing strings, the website — never the code
 * identifiers (the standing rule). Historical records are allowlisted
 * explicitly. A ratchet, not a hard gate, because the sweep (plan 06 Phases
 * 4–5) is the work; the gate makes sure no site is re-introduced while the
 * counts go to zero. Fail-proven: ESSRT_VOCAB_PLANT=1 adds one phantom hit.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const RATCHET = join(ROOT, 'tools/vocabulary-ratchet.json');

/** The D3 list. Each: [label, regex]. Case handled per term. */
const TERMS = [
  ['Earth Fundamental Cycle', /Earth Fundamental Cycle/g],
  ['Solar System Resonance Cycle', /Solar System Resonance Cycle/g],
  ['8H as a cycle name', /(?<![A-Za-z0-9_/])8H(?![A-Za-z0-9_])/g],
  ['H-lattice', /\bH-lattice\b/g],
  ['Fibonacci', /Fibonacci/gi],
  ['engine K/D as a public name', /\bengine [KD]\b/gi],
];

/** Historical records keep the old vocabulary by design. */
const ALLOW = [
  /^docs\/10-fibonacci-laws\.md$/,
  /^docs\/109-/,
  /^docs\/retired-record\.md$/,
  /^docs\/archive\//,
  /^docs\/1[0-9]-.*(kirkwood|sun-ssb)/,
];

const args = process.argv.slice(2);
const write = args.includes('--write');
const report = args.includes('--report');
const extraRoots = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--root' && args[i + 1]) extraRoots.push(resolve(args[++i]));

/** @param {string} dir @param {RegExp} pick @returns {string[]} */
function walk(dir, pick) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === 'archive') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, pick));
    else if (pick.test(e)) out.push(p);
  }
  return out;
}

/** Presentation surfaces in this repo. */
function surfaces() {
  const files = [
    join(ROOT, 'README.md'), join(ROOT, 'CLAUDE.md'),
    join(ROOT, 'packages/physics/README.md'), join(ROOT, 'packages/model-values/README.md'),
    join(ROOT, 'tools/fit/README.md'),
    ...readdirSync(join(ROOT, 'docs')).filter((f) => /\.md$/.test(f)).map((f) => join(ROOT, 'docs', f)),
  ].filter(existsSync);
  return files;
}

/** The simulator's USER-FACING strings: string literals that contain a
 *  space (labels, tooltips, panel text). Identifiers, import paths and
 *  comments are code, not presentation. */
function scriptJsStrings() {
  const src = readFileSync(join(ROOT, 'src/script.js'), 'utf8');
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let mm;
  while ((mm = re.exec(src))) {
    const s = mm[1] ?? mm[2] ?? mm[3];
    if (s && s.includes(' ')) out.push(s);
  }
  return out.join('\n');
}

/** @param {string} text @returns {Record<string, number>} */
function count(text) {
  /** @type {Record<string, number>} */
  const c = {};
  for (const [label, re] of TERMS) {
    const n = (text.match(re) || []).length;
    if (n) c[label] = n;
  }
  return c;
}

/** @type {Record<string, Record<string, number>>} */
const found = {};
const add = (key, text) => { const c = count(text); if (Object.keys(c).length) found[key] = c; };

for (const f of surfaces()) {
  const rel = relative(ROOT, f);
  if (ALLOW.some((a) => a.test(rel))) continue;
  add(rel, readFileSync(f, 'utf8'));
}
add('src/script.js (user-facing strings)', scriptJsStrings());
for (const r of extraRoots) {
  for (const f of walk(r, /\.mdx?$/)) add(relative(ROOT, f), readFileSync(f, 'utf8'));
}
if (process.env.ESSRT_VOCAB_PLANT === '1') found['README.md'] = { ...(found['README.md'] || {}), 'Fibonacci': (found['README.md']?.Fibonacci || 0) + 1 };

const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);
const grand = Object.values(found).reduce((a, c) => a + total(c), 0);

if (report || write) {
  console.log('RETIRED VOCABULARY — per-file counts (the sweep worklist)');
  console.log('='.repeat(74));
  for (const [f, c] of Object.entries(found).sort((a, b) => total(b[1]) - total(a[1]))) {
    console.log(`  ${String(total(c)).padStart(5)}  ${f}   ${Object.entries(c).map(([k, n]) => `${k}:${n}`).join(' · ')}`);
  }
  console.log(`  ${'-'.repeat(60)}\n  ${String(grand).padStart(5)}  total in ${Object.keys(found).length} file(s)`);
}
if (write) {
  writeFileSync(RATCHET, `${JSON.stringify({ _comment: 'Retired-vocabulary RATCHET (plan 06 D3). Counts may only go DOWN. Regenerate: node tools/check-vocabulary.mjs --write', files: found }, null, 2)}\n`);
  console.log(`\nrecorded ratchet -> tools/vocabulary-ratchet.json (${grand} hits)`);
  process.exit(0);
}
if (report) process.exit(0);

let ratchet;
try { ratchet = JSON.parse(readFileSync(RATCHET, 'utf8')).files; } catch {
  console.error(`No ratchet at ${RATCHET}. Record it first:\n  node tools/check-vocabulary.mjs --write`);
  process.exit(1);
}
const failures = [];
for (const [f, c] of Object.entries(found)) {
  const was = ratchet[f];
  if (!was) { failures.push(`${f}: NEW presentation file with retired terms (${Object.entries(c).map(([k, n]) => `${k}:${n}`).join(', ')})`); continue; }
  for (const [k, n] of Object.entries(c)) {
    if (n > (was[k] || 0)) failures.push(`${f}: "${k}" ${was[k] || 0} → ${n} (retired term re-introduced)`);
  }
}
const remaining = Object.values(ratchet).reduce((a, c) => a + total(c), 0);
console.log('RETIRED VOCABULARY — ratchet');
console.log('='.repeat(74));
console.log(`  ${grand} hit(s) in ${Object.keys(found).length} file(s); ratchet ${remaining} — the sweep's remaining work`);
if (failures.length) {
  console.log('\nFAIL — retired vocabulary re-introduced:');
  for (const x of failures) console.log('  ' + x);
  console.log('  (a retired term belongs only in the allowlisted historical records; see plan 06 §7 D3)');
  process.exit(1);
}
if (grand < remaining) console.log(`  counts went DOWN (${remaining} → ${grand}) — re-record the ratchet: node tools/check-vocabulary.mjs --write`);
console.log('\nPASS — no retired term re-introduced.');
