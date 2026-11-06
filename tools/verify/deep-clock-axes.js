#!/usr/bin/env node
/**
 * THE DEEP CLOCK'S AXES — the UT day is the chain's day, the count year is the tropical year
 * of date (plan 27 §8 J; doc 111 §1.31: gate a clock against ANOTHER tier's quantity).
 *
 * The scene's clock is three functions of one position: the TT instant (the position table),
 * the UT instant (TT minus the full ΔT) and the count itself (tropical years of date). Each
 * was built with its own reading of "the age", and three of those readings were another
 * axis's — every one invisible to the gates that read the clock against itself:
 *
 *   J1  the raw ΔT integrand counted solar days per TROPICAL year of date on an age axis of
 *       JULIAN years: the UT day (dTT/dUT of the bridge) parted from the chain's LOD by
 *       1.0e-6 at 100 Ma, 4.4e-5 at 1 Ga, 5.8e-4 at 4 Ga, 8.3 % at the genesis edge.
 *   J2  the position table read its integrand at the COUNT as if it were the age: the SI days
 *       per count year parted from the tropical year of date by 8.5e-5 at 4.4 Ga, 6.5e-3 at
 *       4,425 Ma, 11 % at the edge.
 *   J3  the bridge read the raw integral's age off the CIVIL year, which is Gregorian ahead
 *       of today: 2.05e-5 of the span — the UT day 1.2e-6 off at +100 Myr, 1.5e-5 at +990 Myr.
 *
 * Rows (the differences taken over ±50 count years: Julian Days of 1e10 carry 1e-5 d of
 * granularity, a one-year span reads noise):
 *   day   |UT day / LOD_real − 1|            UT day = 86,400 · ΔTT/ΔUT across the span
 *   year  |SI days per count year / tropical year of date − 1|   beyond the one-family window
 * Tolerances are the measured residuals with a margin, by depth — the residual is the ΔT
 * table's partial-cell quadrature on the cited history's interpolation and the table's own
 * 10-kyr trapezoid where the year changes fast (the last Myr before the genesis).
 * Fail-proven: ESSRT_DEEP_CLOCK_PLANT=1 puts J1's year unit back into the measured day,
 * ESSRT_DEEP_CLOCK_PLANT=2 stretches the count year by 1e-6.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('../lib/artifact-inputs');

const PLANT = process.env.ESSRT_DEEP_CLOCK_PLANT || '';
const H_YEARS = 50;
const J2000_JD = 2451545.0;

/** The day's tolerance by |age| (years). @param {number} a */
const tolDay = (a) => (a <= 1e9 ? 2e-7 : a <= 4e9 ? 2e-6 : 5e-5);
/** The year's tolerance by |age| (years); `edge` = the row beside the genesis edge. @param {number} a @param {boolean} edge */
const tolYear = (a, edge) => (edge ? 2e-6 : a <= 4.41e9 ? 5e-8 : 1e-7);

async function main() {
  const { createModel } = await import('../../packages/physics/src/index.js');
  const read = (/** @type {string} */ f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')); } catch { return undefined; } };
  // seated where the banks are on disk: the rows read no bank-seated table, the seats only keep
  // the one-source sampler's deep tier from walking if a year law reaches for it
  const m = createModel(undefined, { secularSeriesArtifact: read('nbody-secular-series.json'), spinCheckpointsArtifact: read('spin-axis-checkpoints.json'), lunarCheckpointsArtifact: read('lunar-cumulative-checkpoints.json') });
  const rng = m.time.navigableYearRange();
  const edgeAge = 2000.5 - rng.yearMin - 20000;   // 20 kyr inside the genesis edge
  const ages = [1e8, 4e8, 1e9, 2e9, 4e9, 4.4e9, 4.425e9, edgeAge, -1e8, -9.9e8];
  const failures = [];
  console.log('the deep clock against the chain (±50 count years)');
  console.log('  age (yr, + = past)   UT day / LOD − 1   tol      count year / tropical year − 1   tol');
  for (const a of ages) {
    const y = 2000.5 - a, edge = a === edgeAge;
    const tt = [y - H_YEARS, y, y + H_YEARS].map((q) => m.time.yearToJDTT(q));
    const ut = [y - H_YEARS, y + H_YEARS].map((q) => m.time.yearToJDUT(q));
    if (tt.some((v) => v === null) || ut.some((v) => v === null)) { failures.push(`${a}: the clock is undefined at this position`); continue; }
    const E = 2000 + (/** @type {number} */ (tt[1]) - J2000_JD) / 365.25;   // the engine year of the instant
    const lod = m.epoch.lodRealSecondsAtYear(E), tropDays = m.epoch.tropicalYearSecondsAtYear(E) / 86400;
    const siPerCount = (/** @type {number} */ (tt[2]) - /** @type {number} */ (tt[0])) / (2 * H_YEARS);
    let utDaysPerSiDay = (/** @type {number} */ (ut[1]) - /** @type {number} */ (ut[0])) / (/** @type {number} */ (tt[2]) - /** @type {number} */ (tt[0]));
    if (PLANT === '1') utDaysPerSiDay = 1 + (utDaysPerSiDay - 1) * (tropDays / 365.25);   // J1: solar days per tropical year on a Julian-year axis
    const day = 86400 / utDaysPerSiDay / lod - 1;
    const yr = siPerCount * (PLANT === '2' ? 1 + 1e-6 : 1) / tropDays - 1;
    const td = tolDay(Math.abs(a)), ty = tolYear(Math.abs(a), edge);
    console.log(`  ${String(Math.round(a)).padStart(13)}${edge ? ' (edge)' : '       '}   ${day.toExponential(2).padStart(10)}   ${td.toExponential(0)}   ${yr.toExponential(2).padStart(10)}                   ${ty.toExponential(0)}`);
    if (!(Math.abs(day) <= td)) failures.push(`${Math.round(a)} yr: the UT day (the bridge's dTT/dUT) is ${(86400 / utDaysPerSiDay).toFixed(4)} s where the chain's LOD is ${lod.toFixed(4)} s — ${day.toExponential(2)} > ${td.toExponential(0)}: the raw ΔT is integrating on another year than the age axis's`);
    if (!(Math.abs(yr) <= ty)) failures.push(`${Math.round(a)} yr: a count year is ${siPerCount.toFixed(6)} SI days where the tropical year of date is ${tropDays.toFixed(6)} — ${yr.toExponential(2)} > ${ty.toExponential(0)}: the position table is reading its integrand at another age than the instant's`);
  }
  if (PLANT) console.log(`  (ESSRT_DEEP_CLOCK_PLANT=${PLANT}: ${PLANT === '1' ? "J1's year unit planted on the measured day" : 'the count year stretched by 1e-6'})`);
  if (failures.length) {
    for (const f of failures) console.log('  FAIL  ' + f);
    console.log(`FAIL — ${failures.length} row(s): the deep clock has parted from the chain.`);
    process.exit(1);
  }
  console.log(`PASS — ${ages.length} positions from +990 Myr to the genesis edge: the UT day IS the chain's day and the count year IS the tropical year of date.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
