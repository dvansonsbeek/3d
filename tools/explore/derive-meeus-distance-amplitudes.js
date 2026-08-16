#!/usr/bin/env node
/**
 * derive-meeus-distance-amplitudes.js — Stage D1-r: derive the Meeus Ch. 47
 * Σr DISTANCE amplitudes from FIRST PRINCIPLES, the radial companion of
 * derive-meeus-amplitudes.js (Stage D1, which derives the Σl longitude
 * amplitudes at 100.0 ± 0.1%).
 *
 * Same laboratory, same discipline: full inertial 3-body integration (RK4)
 * with framework constants only — GM_(E+M) from the framework's Kepler
 * derivation, the framework AU + sidereal year for the solar field, the
 * framework e_M / i / a_M as mean elements via the D1 IC calibration. No
 * literature series, no fitted values. The geocentric radial series
 * r(t) − r̄ is LSQ-projected onto the Meeus argument combinations with a
 * COSINE basis (the Σr convention; Σl/Σb use sine), and the emergent
 * amplitudes are compared to Table 47.A's distance column
 * (public/input/meeus-lunar-tables.json distanceTerms — shipped since the
 * full-Σr distance replaced the two-term ellipse).
 *
 * The mean distance r̄ itself is a derivation target: Meeus's constant term
 * is 385,000.56 km (the time-averaged center-to-center mean, docs/24's
 * taxonomy) — the integration's mean radial distance must emerge near it
 * with the framework a_M = 384,399.07 km (the LLR/parallax mean) as the
 * only distance input.
 *
 * Usage: node tools/explore/derive-meeus-distance-amplitudes.js [years=40] [dtDays=0.01]
 */

const D1 = require('./derive-meeus-amplitudes');

const YEARS = parseFloat(process.argv[2] || '40');
const DT = parseFloat(process.argv[3] || '0.01');

// Top Σr rows of Table 47.A (units 0.001 km), from the shipped distanceTerms.
const R_TERMS = D1.MT.distanceTerms.terms.filter((r) => r[4] !== 0);
const TOP = R_TERMS.slice().sort((a, b) => Math.abs(b[4]) - Math.abs(a[4])).slice(0, 12);

/** Cosine-basis LSQ projection on the Meeus arguments (Σr convention). */
function projectCos(A, meanAnglesFor, series, terms) {
  const K = terms.length, n = series.length;
  const Bs = Array.from({ length: K }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    const ang = meanAnglesFor(A, i);
    for (let k = 0; k < K; k++) {
      const tr = terms[k];
      Bs[k][i] = Math.cos(tr[0] * ang.D + tr[1] * ang.M + tr[2] * ang.Mp + tr[3] * ang.F);
    }
  }
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K);
  for (let k = 0; k < K; k++) {
    for (let j = k; j < K; j++) {
      let s = 0; for (let i = 0; i < n; i++) s += Bs[k][i] * Bs[j][i];
      G[k][j] = s; G[j][k] = s;
    }
    let s = 0; for (let i = 0; i < n; i++) s += Bs[k][i] * series[i];
    b[k] = s;
  }
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < K; c++) {
    let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
    [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < K; r++) {
      const f = Gm[r][c] / Gm[c][c];
      for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc];
      x[r] -= f * x[c];
    }
  }
  const out = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc];
    out[c] = s / Gm[c][c];
  }
  return out;
}

console.log(`Stage D1-r — Σr distance amplitudes from the 3-body lab (${YEARS} yr, dt ${DT} d)`);
console.log('calibrating lunar ICs (D1 calibration — definition match, not fitting)...');
const cal = D1.calibrate(undefined, true);
console.log(`  ICs: e ${cal.eIC.toFixed(7)}  i ${(cal.iIC * 180 / Math.PI).toFixed(4)}°  a ${cal.aIC.toFixed(1)} km`);

const t0 = Date.now();
const S = D1.integrate(cal.eIC, cal.iIC, cal.aIC, YEARS, DT);
const A = D1.analyzeRun(S);
console.log(`integrated ${S.length} samples in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// Geocentric radial series (km), demeaned.
const rArr = S.map((p) => Math.hypot(p.rx, p.ry, p.rz));
const rMean = rArr.reduce((s, v) => s + v, 0) / rArr.length;
const rSeries = rArr.map((v) => v - rMean);
console.log(`\nemergent mean geocentric distance: ${rMean.toFixed(2)} km`);
console.log(`  Meeus constant term:             385000.56 km  (${((rMean / 385000.56 - 1) * 1e6).toFixed(0)} ppm)`);
console.log(`  framework a_M input:             ${D1.aM.toFixed(2)} km (LLR/parallax mean — different definition)`);

const amps = projectCos(A, D1.meanAnglesFor, rSeries, TOP);
console.log('\nΣr amplitude derivation (km; Meeus 47.A distance column):');
console.log('  D  M  Mp F      derived      Meeus       %');
let wSum = 0, wTot = 0;
for (let k = 0; k < TOP.length; k++) {
  const meeusKm = TOP[k][4] * 1e-3;
  const pct = (amps[k] / meeusKm) * 100;
  wSum += Math.abs(meeusKm) * pct; wTot += Math.abs(meeusKm);
  console.log(`  ${String(TOP[k][0]).padStart(2)} ${String(TOP[k][1]).padStart(2)} ${String(TOP[k][2]).padStart(2)} ${String(TOP[k][3]).padStart(2)}  ` +
    `${amps[k].toFixed(2).padStart(11)}  ${meeusKm.toFixed(2).padStart(10)}  ${pct.toFixed(1).padStart(6)}%`);
}
console.log(`\namplitude-weighted mean recovery: ${(wSum / wTot).toFixed(1)}%`);
