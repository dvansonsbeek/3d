#!/usr/bin/env node
/**
 * ΔT-SLOPE ≡ DISPLAYED DAY — the one-day-basis gate.
 *
 * The pane's Solar Day row (LOD_real: the kinematic day of date + the ecliptic
 * missing-motion term + the ΔT cycle stack) and the ΔT the eclipse chain
 * integrates must be the SAME day: d(ΔT)/dt per day of calendar time is the
 * day's excess over 86,400 s. Before plan 09 they were not — the integrand ran
 * on the physics base (meanLodSecondsAtAge, 86,399.9997 s at J2000) while the
 * pane ran on the kinematic base (86,400.0001 s), a constant 0.43 ms/day
 * split across 1700–2100 (hu TODO, measured 2026-10-04). Plan 09 step 4c made
 * the kinematic day of date the Layer-0 tidal mean, exactly ω₀ at J2000, and
 * the split closed; re-measured: < 1 µs/day at every 25-yr sample. A closed
 * gap gets a gate (CLAUDE.md), so the two bases cannot part again unseen.
 *
 * Checks, 1700 → 2100 every 25 yr:
 *   1. |(LOD_real − 86400) − dΔT/dt ÷ 365.25| ≤ 2 µs/day   (the display vs the integrand)
 *   2. |physics-base twin − LOD_real| ≤ 0.1 µs/day            (the two bases are one)
 * Fail-proven: ESSRT_DT_SLOPE_PLANT=1 adds 0.43 ms/day to the implied slope (the historical split).
 */
'use strict';

const path = require('path');
const dtl = require(path.resolve(__dirname, '..', 'lib', 'deep-time.js'));

const PLANT = process.env.ESSRT_DT_SLOPE_PLANT === '1' ? 0.43e-3 : 0;
const TOL_DISPLAY_VS_INTEGRAND_S = 2e-6;
const TOL_BASES_S = 1e-7;
const H_YR = 5;

const failures = [];
const rows = [];
for (let y = 1700; y <= 2100; y += 25) {
  const tMa = (2000 - y) / 1e6;
  const real = dtl.computeLodRealSecondsAtEpoch(y) - 86400;
  const phys = dtl.meanLodSecondsAtAge(tMa) + dtl.h5Correction(y) + dtl.dtCycleLodCorrectionSum(y) - 86400;
  const dDTdt = (dtl.meanDeltaTSecondsAtAge((2000 - (y + H_YR)) / 1e6) - dtl.meanDeltaTSecondsAtAge((2000 - (y - H_YR)) / 1e6)) / (2 * H_YR);
  const implied = dDTdt / 365.25 + PLANT;
  rows.push({ y, real, phys, implied });
  if (!(Math.abs(real - implied) <= TOL_DISPLAY_VS_INTEGRAND_S)) failures.push(`${y}: LOD_real − 86400 = ${(real * 1e3).toFixed(4)} ms/day but the ΔT the chain integrates implies ${(implied * 1e3).toFixed(4)} ms/day (Δ ${((real - implied) * 1e6).toFixed(2)} µs/day > ${TOL_DISPLAY_VS_INTEGRAND_S * 1e6} µs/day)`);
  if (!(Math.abs(phys - real) <= TOL_BASES_S)) failures.push(`${y}: the physics-base twin ${(phys * 1e3).toFixed(4)} ms/day ≠ the displayed base ${(real * 1e3).toFixed(4)} ms/day — two day bases again`);
}

console.log('ΔT-slope ≡ displayed day (1700–2100, every 25 yr)');
console.log('  year   LOD_real−86400   ΔT-implied   physics twin   (ms/day)');
for (const r of rows) console.log(`  ${r.y}   ${(r.real * 1e3).toFixed(3).padStart(10)}   ${(r.implied * 1e3).toFixed(3).padStart(10)}   ${(r.phys * 1e3).toFixed(3).padStart(10)}`);
if (PLANT) console.log(`  (ESSRT_DT_SLOPE_PLANT=1: +${PLANT * 1e3} ms/day planted on the implied slope)`);
if (failures.length) {
  for (const f of failures) console.log('  FAIL  ' + f);
  console.log(`FAIL — ${failures.length} row(s): the pane's day and the ΔT integrand's day have parted.`);
  process.exit(1);
}
console.log(`PASS — ${rows.length} rows: the displayed day IS the day the ΔT integrates (≤ ${(TOL_DISPLAY_VS_INTEGRAND_S * 1e6).toFixed(1)} µs/day), and the two bases are one (≤ ${(TOL_BASES_S * 1e6).toFixed(1)} µs/day).`);
