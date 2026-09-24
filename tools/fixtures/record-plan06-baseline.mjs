#!/usr/bin/env node
/**
 * PLAN-06 BASELINE — the quantities that move to new primitives when H
 * retires as a front-line constant and the lunisolar precession period
 * becomes the Earth clock (holisticuniverse plan 06, Phase 2b item 1).
 *
 *   node tools/fixtures/record-plan06-baseline.mjs           check (default)
 *   node tools/fixtures/record-plan06-baseline.mjs --write   re-record
 *
 * Recorded from the CURRENT code BEFORE the switch ("capture a baseline
 * before touching shared machinery" — CLAUDE.md), on the grid where the
 * switch can hurt: the ±26-kyr window in which the apsidal period wanders
 * 8× and the of-date precession period wobbles ±2 %, plus the deep-time
 * anchors the falsification legs rest on. Every re-expression of an
 * H-carrying formula onto T_p(t) must leave this fixture bit-identical
 * (plan 06 test T2 made executable); a drift is a hidden physics role
 * under a unit's name — attribute it, never absorb it.
 *
 * Fail-proven: ESSRT_PLAN06_PLANT=1 perturbs one value by 1 ULP.
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'packages/fixtures/regression/plan06-baseline.json');
const require = createRequire(join(ROOT, 'package.json'));

const {
  createModel, createDeepEccChannel, DEEP_MODES_ARTIFACT,
  buildPlanetChainsFromArtifactData, CHAIN_ARTIFACT, computeApsidalSecularDegPerYr,
} = await import('@essrt/physics');
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));
const DOH = require(join(ROOT, 'tools/lib/deep-orbital-history.js'));

// The wander window (2-kyr steps) + the epoch the metronome exhibit labels
// (the +26.8-kyr near-circular pass) + the deep-time anchors (years).
const WANDER_YEARS = Array.from({ length: 27 }, (_, i) => -26000 + i * 2000).concat([28832]);
const DEEP_AGES_MA = [380, 650, 1400, 2460];

/** @param {number} x @returns {number|null} */
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

function measure() {
  /** @type {Record<string, number|null>} */
  const v = {};
  const m = createModel();
  const deep = createDeepEccChannel(DEEP_MODES_ARTIFACT);
  const chains = buildPlanetChainsFromArtifactData(CHAIN_ARTIFACT);
  const oneSource = DOH.createOneSourceMovement();

  /** @param {string} tag @param {number} year */
  const row = (tag, year) => {
    // Every SERIES-backed evaluator (the one-source movement, the
    // one-family year lengths) grows the hybrid's sampler grid outward from
    // J2000 — a deep-age read hangs — so those are read only inside the
    // wander window; the deep anchors use the closed-form surfaces.
    const inWindow = Math.abs(year - 2000) <= 50000;
    // the spin clock and its unit — BOTH of-date precession evaluators
    // (the K-comb Fourier pair in `epoch`, the one-family hybrid route in
    // `yearLengths`; they agree at J2000 only — calculation map chain 2.2)
    const Tp = num(m.epoch.axialPrecessionYearsAtYear(year));
    const H = num(m.epoch.hAtYear(year));
    v[`${tag}.precessionPeriodOfDateYr`] = Tp;
    v[`${tag}.precessionPeriodOneFamilyYr`] = inWindow ? num(m.yearLengths.axialPrecessionYearsAtYear(year)) : null;
    v[`${tag}.siderealYearOneFamilyS`] = inWindow ? num(m.yearLengths.siderealYearSecondsAtYear(year)) : null;
    v[`${tag}.tropicalYearOneFamilyS`] = inWindow ? num(m.yearLengths.tropicalYearSecondsAtYear(year)) : null;
    v[`${tag}.anomalisticYearOneFamilyS`] = inWindow ? num(m.yearLengths.anomalisticYearSecondsAtYear(year)) : null;
    v[`${tag}.siderealYearFourierD`] = num(m.lengths.siderealYearDays(year));
    v[`${tag}.tropicalYearFourierD`] = num(m.lengths.tropicalYearDirectDays(year));
    v[`${tag}.tropicalYearCardinalD`] = num(m.lengths.tropicalYearDays(year));
    v[`${tag}.anomalisticYearFourierD`] = num(m.lengths.anomalisticYearDays(year));
    v[`${tag}.dayLengthKinematicS`] = num(m.lengths.dayLengthSeconds(year));
    v[`${tag}.measuredSolarDayS`] = num(m.lengths.measuredSolarDaySeconds(year));
    v[`${tag}.H`] = H;
    // S5: the composed lunisolar period on the derived J2000 anchor (the retired H/13 identity read 0.086 % slow)
    v[`${tag}.meanPrecessionPeriodYr`] = num(m.lunisolar.meanPeriodYearsAtYear(year));
    // the orbital side, engine D
    const apsRate = num(computeApsidalSecularDegPerYr(year, chains.earth, chains) * 3600);
    const Taps = apsRate ? 1296000 / apsRate : null;
    v[`${tag}.apsidalRateArcsecPerYr`] = apsRate;
    v[`${tag}.apsidalPeriodYr`] = Taps;
    v[`${tag}.nApsPerH`] = H !== null && Taps ? H / Taps : null;
    v[`${tag}.perihelionOfDatePeriodYr`] = Tp && Taps ? 1 / (1 / Tp + 1 / Taps) : null;
    v[`${tag}.nPeriPerH`] = H !== null && Taps ? 13 + H / Taps : null;
    // eccentricity — all three evaluators, named (series inside the window)
    v[`${tag}.eDeepModes`] = num(deep.eccAt(year - 2000));
    v[`${tag}.eLawH3`] = num(m.earth.eccentricity(year));
    v[`${tag}.eOneSource`] = oneSource && inWindow ? num(oneSource.e(year)) : null;
    // obliquity — the one-source hybrid and the K law, named
    v[`${tag}.epsOneSourceDeg`] = oneSource && inWindow ? num(oneSource.epsDeg(year)) : null;
    v[`${tag}.epsLawDeg`] = num(m.earth.obliquityCombDeg(year));   // the K comb (device) — the published ε is the hybrid since S3b
    v[`${tag}.perihelionLongitudeDeg`] = num(m.earth.perihelionLongitudeDeg(year));
    // plan 06 Phase 7 — the planets' spin channel (own torques on the own ζ
    // plane history; null beyond ±10 Myr, so the deep anchors record null)
    for (const p of m.planets.keys) {
      const s = m.planets.spin(p);
      v[`${tag}.spin.${p}.obliquityDeg`] = num(s.obliquityDegAtYear(year));
      v[`${tag}.spin.${p}.precessionRateArcsecPerYr`] = num(s.spinPrecessionRateArcsecPerYrAtYear(year));
    }
  };
  // the spin channel's J2000 constants (the derived α and the derived J2000 obliquity)
  for (const p of m.planets.keys) {
    const s = m.planets.spin(p);
    v[`spin.${p}.alphaArcsecPerYr`] = num(s.alphaArcsecPerYr);
    v[`spin.${p}.obliquityJ2000Deg`] = num(s.obliquityJ2000Deg);
  }

  for (const y of WANDER_YEARS) row(`wander@${y}`, y);
  for (const ma of DEEP_AGES_MA) {
    const year = 2000 - ma * 1e6;
    row(`deep@${ma}Ma`, year);
    v[`deep@${ma}Ma.lodSeconds`] = num(DT.meanLodSecondsAtAge(ma));
    v[`deep@${ma}Ma.HfromDeepTime`] = num(DT.meanHAtAge(ma));
  }

  if (process.env.ESSRT_PLAN06_PLANT === '1') {
    const k = 'wander@2000.precessionPeriodOfDateYr';
    v[k] = /** @type {number} */ (v[k]) * (1 + Number.EPSILON);
  }
  return v;
}

const measured = measure();
const write = process.argv.includes('--write');

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'PLAN-06 BASELINE fixture — the H-carrying quantities as the code computes them today, on the wander window + the deep-time anchors. Must never change unintentionally across the lunisolar-clock restatement. Regenerate: node tools/fixtures/record-plan06-baseline.mjs --write',
    _source: '@essrt/physics createModel/deep channel/chain + tools/lib/{deep-time,deep-orbital-history}.js',
    values: measured,
  }, null, 2)}\n`);
  console.log(`recorded ${Object.keys(measured).length} values -> packages/fixtures/regression/plan06-baseline.json`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(OUT, 'utf8')).values;
} catch {
  console.error(`No fixture at ${OUT}. Record it first:\n  node tools/fixtures/record-plan06-baseline.mjs --write`);
  process.exit(1);
}

const drift = [];
const missing = [];
for (const [k, want] of Object.entries(expected)) {
  if (!(k in measured)) { missing.push(k); continue; }
  if (!Object.is(measured[k], want)) drift.push({ k, want, got: measured[k] });
}
const added = Object.keys(measured).filter((k) => !(k in expected));

console.log('PLAN-06 BASELINE — the H-carrying quantities');
console.log('='.repeat(74));
console.log(`  ${Object.keys(expected).length} fixture values checked`);
for (const { k, want, got } of drift.slice(0, 40)) {
  const rel = typeof want === 'number' && want !== 0 && typeof got === 'number' ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${k}\n    expected ${want}\n    got      ${got}\n    delta    ${typeof got === 'number' && typeof want === 'number' ? got - want : 'n/a'}  (${rel.toExponential(3)} relative)`);
}
for (const k of missing) console.log(`  GONE  ${k}`);
for (const k of added) console.log(`  NEW   ${k} — not covered (re-record)`);
if (drift.length || missing.length) {
  console.log(`\nFAIL — ${drift.length} drifted, ${missing.length} missing.`);
  console.log('If the change was intended, re-record with --write and say so in the commit.');
  process.exit(1);
}
console.log(added.length ? `\nPASS (with ${added.length} uncovered new value(s))` : '\nPASS — no drift.');
