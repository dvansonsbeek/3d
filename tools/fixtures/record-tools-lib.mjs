/**
 * Record / check the `tools/lib` regression fixture (plan §5b).
 *
 *   node tools/fixtures/record-tools-lib.mjs           check  (exit 1 on drift)
 *   node tools/fixtures/record-tools-lib.mjs --write   re-record
 *
 * These are REGRESSION values — what the engine does today, not what it should
 * do. They must never change unintentionally. Re-record only alongside a
 * deliberate behaviour change, and say so in the commit message.
 *
 * Values are compared EXACTLY. A fixture with a tolerance is a fixture that
 * stops noticing things; if a change is small enough not to matter, it is small
 * enough to re-record deliberately.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'packages/fixtures/regression/tools-lib.json');
const require = createRequire(join(ROOT, 'package.json'));

const C = require(join(ROOT, 'tools/lib/constants.js'));
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));

const AGES_MA = [-5, -1, 0, 1, 5];
const DT_STACK = [
  'bondCycleLodCorrection', 'hallstattCycleLodCorrection',
  'jose5CycleLodCorrection', 'jose4CycleLodCorrection',
  'dtCycleLodCorrectionSum', 'resonatorSwingLodCorrection',
];

function measure() {
  const v = {};

  // Anchors that pin the engine's identity.
  v['anchor.H'] = C.H;
  v['anchor.perihelionAlignmentYear'] = C.perihelionalignmentYear;
  v['anchor.correctionDays'] = C.correctionDays;
  v['anchor.meanSiderealYearSeconds'] = C.meanSiderealYearSeconds;

  // THREE distinct day lengths — never collapse these (CLAUDE.md).
  //   SI 86400 (definition) · LOD_mean (H/13 identity) · LOD_real (physical)
  v['lod.meanKinematicSeconds'] = DT.LOD_NOW_H13_S;
  v['lod.meanAtAge0'] = DT.meanLodSecondsAtAge(0);
  v['lod.realAtAge0'] = DT.meanLodSecondsAtAgeActual(0);

  // Deep-time behaviour away from the anchor — the anchor alone is a tautology.
  for (const t of AGES_MA) {
    v[`deeptime.H@${t}Ma`] = DT.meanHAtAge(t);
    v[`deeptime.lodSeconds@${t}Ma`] = DT.meanLodSecondsAtAge(t);
  }

  for (const fn of DT_STACK) {
    if (typeof DT[fn] === 'function') v[`dtstack.${fn}@0`] = DT[fn](0);
  }

  // ─── Cardinal points — the Phase 7 extraction gate ────────────────────────
  // The §10 + §10g family, ALL FOUR types, on the same deep-year grid the
  // browser fixture uses. These are the values the physics/cardinal package
  // extraction must keep BIT-IDENTICAL (plan §12a Phase 7). The raw
  // integrated-phase primitive (cycles at divisor 1) is pinned too, so a
  // phase-table error shows at the root, not only through its consumers.
  const OE = require(join(ROOT, 'tools/lib/orbital-engine.js'));
  const CP_YEARS = [-302635, -100000, -25000, -2000, 0, 1000, 2000, 3000, 6000, 32682];
  for (const y of CP_YEARS) {
    v[`phase.cycles@${y}`] = DT.cyclesBetweenYears(C.balancedYear, y, 1);
    for (const t of ['SS', 'WS', 'VE', 'AE']) {
      v[`cardinal.jd.${t}@${y}`] = OE.computeSolsticeJD(y, t);
      v[`cardinal.yearLen.${t}@${y}`] = OE.computeSolsticeYearLength(y, t);
      v[`cardinal.ra.${t}@${y}`] = OE.computeSolsticeRA(y, t);
    }
  }

  return v;
}

const measured = measure();
const write = process.argv.includes('--write');

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'REGRESSION fixture — what tools/lib does today. Must never change unintentionally. Regenerate: node tools/fixtures/record-tools-lib.mjs --write',
    _source: 'tools/lib/{constants,deep-time}.js',
    values: measured,
  }, null, 2)}\n`);
  console.log(`recorded ${Object.keys(measured).length} values -> packages/fixtures/regression/tools-lib.json`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(OUT, 'utf8')).values;
} catch {
  console.error(`No fixture at ${OUT}. Record it first:\n  node tools/fixtures/record-tools-lib.mjs --write`);
  process.exit(1);
}

const drift = [];
const missing = [];
for (const [k, want] of Object.entries(expected)) {
  if (!(k in measured)) { missing.push(k); continue; }
  if (!Object.is(measured[k], want)) drift.push({ k, want, got: measured[k] });
}
const added = Object.keys(measured).filter((k) => !(k in expected));

console.log('REGRESSION — tools/lib');
console.log('='.repeat(74));
console.log(`  ${Object.keys(expected).length} fixture values checked`);

for (const { k, want, got } of drift) {
  const rel = want !== 0 ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${k}`);
  console.log(`    expected ${want}`);
  console.log(`    got      ${got}`);
  console.log(`    delta    ${got - want}  (${rel.toExponential(3)} relative)`);
}
for (const k of missing) console.log(`  GONE  ${k} — fixture exists, engine no longer produces it`);
for (const k of added) console.log(`  NEW   ${k} — engine produces it, fixture does not cover it (re-record)`);

if (drift.length || missing.length) {
  console.log(`\nFAIL — ${drift.length} drifted, ${missing.length} missing.`);
  console.log('If the change was intended, re-record with --write and say so in the commit.');
  process.exit(1);
}
console.log(added.length ? `\nPASS (with ${added.length} uncovered new value(s))` : '\nPASS — no drift.');
