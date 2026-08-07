#!/usr/bin/env node
/**
 * §2f PYTHON PHYSICS BOUNDARY GATE.
 *
 * THE RULE (§2f, decided at §13.4): Python is *analysis only*. It may READ
 * the JSON sources of truth — via `tools/lib/python/constants_scripts.py`,
 * which loads them — but it must never DEFINE model physics. Any Python that
 * hardcodes a model constant has forked that constant, and there is no
 * compiler and no single-language pressure keeping the two in step. This is
 * the same duplication that produced the four-way drift in §1c.
 *
 * WHY A LEDGER RATHER THAN A BAN. A frozen analysis that pins `H = 335317`
 * is *recording* the value its results were computed at, which is legitimate
 * provenance — rewriting it to read live JSON would silently change published
 * numbers the next time H moves. So each known site is listed below with a
 * reason, and the gate asserts something stronger than "don't hardcode":
 *
 *   1. NEW hardcoding, in a file not on the ledger      -> FAIL
 *   2. A ledger entry whose pinned value no longer      -> FAIL (drift alarm)
 *      matches the live constant
 *   3. A ledger entry that no longer hardcodes anything -> FAIL (stale entry)
 *
 * Rule 2 is the point. Today every pin equals the live value, so the risk is
 * latent; the moment H or the tilt is recalibrated this gate goes red and
 * forces an explicit decision on all 16 files at once, instead of leaving
 * them quietly describing a world that no longer exists.
 *
 * Usage:  node tools/check-python-physics.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const model = rd('public/input/model-parameters.json');
const astro = rd('public/input/astro-reference.json');

/**
 * The model-DEFINED quantities. Deliberately excludes universal constants
 * (86400 SI seconds, JD 2451545.0) and published external references (IAU
 * obliquity, IAU perihelion longitude) — hardcoding those is not a fork of
 * OUR physics, it is quoting a standard.
 */
const GUARDED = [
  // NB: only comma-free forms. `335,317` cannot be a Python numeric literal,
  // so every such match is prose in a docstring — not a definition.
  { name: 'H (holisticyearLength)', live: model.foundational.holisticyearLength,
    patterns: [/\b335317\b/] },
  { name: 'earthtiltMean', live: model.earth.earthtiltMean,
    patterns: [/\b23\.413\d{2,}\b/] },
  { name: 'balancedYear', live: -302635, patterns: [/\b-302635\b/] },
  // DELIBERATELY NOT GUARDED: eccentricityBase (~0.01539) and correctionSun
  // (~0.49688). Both are small decimals whose leading digits collide with
  // ordinary fitted values — `-0.4968017323` is term 2025 of a 2,421-term
  // ML coefficient array, not the Sun correction. A pattern that fires on
  // coincidence trains people to ignore the gate. H, the tilt and the
  // balanced year are distinctive enough to match only real pins.
];

/**
 * Known sites, each with the reason it is allowed to pin. A frozen analysis
 * records the world it ran in; a live tool must read the JSON instead.
 * Remove an entry when its file starts importing from constants_scripts.
 */
const LEDGER = {
  'scripts/action_closure_test.py': 'frozen analysis — pins H at run time',
  'scripts/eight_h_derivation_test.py': 'frozen analysis — derives 8H from H',
  'scripts/eight_h_history.py': 'frozen analysis — H_NOW is the anchor of a history plot',
  'scripts/framework_vs_laskar_models.py': 'frozen comparison against Laskar',
  'scripts/h_multiple_scan.py': 'frozen scan over H multiples',
  'scripts/hallstatt_cheng_speleothem.py': 'frozen archive comparison',
  'scripts/hallstatt_epica_co2.py': 'frozen archive comparison',
  'scripts/hallstatt_steinhilber_amplitude.py': 'frozen archive comparison',
  'scripts/laplace_lagrange_first_principles.py': 'frozen LL derivation',
  'scripts/lattice_harmonic_scan.py': 'pipeline-adjacent scan; H annotated with its factorisation',
  'scripts/lod_oscillation_signature_test.py': 'frozen signature test',
  'scripts/lod_residual_lattice_fit.py': 'frozen residual fit',
  'scripts/paleo_l1_renumbering.py': 'frozen L1 renumbering',
  'scripts/paleo_lod_comparison.py': 'frozen paleo comparison',
  'scripts/precession_band_disambiguation.py': 'frozen band disambiguation',
  'scripts/test_evolving_8h_climate_formula.py': 'frozen climate-formula test',
  // predict_tilt_from_eccentricity.py was here until its label was made
  // dynamic — this gate's drift rule caught it pinned at 23.41357 after the
  // IAU 2006 refit moved earthtiltMean to 23.41353. First live catch.
};

const SCOPES = ['scripts', 'tools/lib/python', 'tools/fit/python'];

function walkPy(dir, out = []) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = join(dir, name);
    // `coefficients/` holds GENERATED per-planet arrays (Steps 4c/4d). They
    // are artifacts, covered by the constants/fixture gates — and their
    // thousands of fitted decimals guarantee coincidental matches here.
    if (name === '__pycache__' || name === 'archive' || name === 'coefficients') continue;
    if (statSync(join(ROOT, rel)).isDirectory()) walkPy(rel, out);
    else if (name.endsWith('.py')) out.push(rel);
  }
  return out;
}

/** strip comments and docstring bodies — prose may name a value freely */
function codeOnly(src) {
  return src.split('\n')
    .map(l => l.replace(/#.*$/, ''))
    .join('\n');
}

const unlisted = [];   // hardcodes but not on the ledger
const drifted = [];    // on the ledger, but the pinned value no longer matches live
const stale = [];      // on the ledger, no longer hardcodes anything

const files = SCOPES.flatMap(s => walkPy(s));
const hits = new Map();

for (const file of files) {
  const code = codeOnly(readFileSync(join(ROOT, file), 'utf8'));
  const found = [];
  for (const g of GUARDED) {
    for (const re of g.patterns) {
      const m = code.match(re);
      if (!m) continue;
      found.push({ constant: g.name, literal: m[0], live: g.live });
      break;
    }
  }
  if (found.length) hits.set(file, found);
}

for (const [file, found] of hits) {
  if (!(file in LEDGER)) { unlisted.push({ file, found }); continue; }
  for (const f of found) {
    // Drift alarm: does the pinned literal still describe the live constant?
    const lit = parseFloat(String(f.literal).replace(/,/g, ''));
    const live = Number(f.live);
    if (!Number.isFinite(lit) || !Number.isFinite(live)) continue;
    // compare at the literal's own precision — a pin of 23.41357 is "current"
    // only while the live value rounds to it
    const decimals = (String(f.literal).split('.')[1] || '').length;
    if (Math.abs(lit - Number(live.toFixed(decimals))) > Number.EPSILON * 100) {
      drifted.push({ file, ...f, rounded: live.toFixed(decimals) });
    }
  }
}
for (const file of Object.keys(LEDGER)) {
  if (!hits.has(file)) stale.push(file);
}

const line = '='.repeat(74);
console.log(line);
console.log('  §2f PYTHON PHYSICS BOUNDARY  (Python may read the JSON, never define physics)');
console.log(line);
console.log(`  ${files.length} Python files scanned · ${hits.size} pin a model constant · ${Object.keys(LEDGER).length} on the ledger`);

if (unlisted.length) {
  console.log(`\n  ${unlisted.length} UNLISTED file(s) hardcoding model physics:`);
  for (const u of unlisted) {
    console.log(`    ${u.file}`);
    for (const f of u.found) console.log(`       ${f.constant} = ${f.literal}`);
  }
  console.log('    -> import it from tools/lib/python/constants_scripts.py, or add a');
  console.log('       ledger entry in this file saying why the pin is deliberate.');
}
if (drifted.length) {
  console.log(`\n  ${drifted.length} DRIFTED pin(s) — the model moved, these files did not:`);
  for (const d of drifted) {
    console.log(`    ${d.file}: ${d.constant} pinned at ${d.literal}, live value is ${d.rounded}`);
  }
  console.log('    -> decide per file: re-pin (frozen record of a new run) or port to');
  console.log('       constants_scripts (should track the model).');
}
if (stale.length) {
  console.log(`\n  ${stale.length} STALE ledger entry(ies) — no longer hardcode anything:`);
  for (const s of stale) console.log(`    ${s}  (remove from LEDGER)`);
}

const failures = unlisted.length + drifted.length + stale.length;
console.log(`\n${line}`);
if (failures) {
  console.log(`FAIL — ${unlisted.length} unlisted, ${drifted.length} drifted, ${stale.length} stale.`);
  console.log(line);
  process.exit(1);
}
console.log('PASS — no Python defines model physics outside the acknowledged ledger,');
console.log('       and every acknowledged pin still matches the live model.');
console.log(line);
