/**
 * v4-i-theorem.js — the Hill–Brown i-theorem, established by m-scaling
 * ("The Derived Moon" appendix candidate).
 *
 * CANDIDATE THEOREM:  sinF-coefficient = mean-osculating-i × (1 − m²),
 * m = n′/n. Numerology check at the real m (0.0748013): 1 − m² = 0.994405,
 * vs the lab compression 0.994452 and the real Moon's 0.994351 (E3c) —
 * both within 5e-5. Inverse: Meeus 5.128122/(1−m²) = 5.15698 vs the E3c
 * measured mean-osc 5.15725 (0.005%).
 *
 * METHOD: vary the solar year in the base3 lab (opts.yearSeconds → m scan),
 * measure compression(m) = sinF-coeff / mean-osc-i IN-RUN (both from the
 * run's own fits — self-normalizing, no calibration needed), and fit
 *   1 − compression = c · m^k .
 * THEOREM CONFIRMED if k → 2 and c → 1.00 (the O(m²) coefficient is unity).
 *
 * The catalog-vs-dynamical rectification (+0.0119°) then follows
 * arithmetically: catalog(ELP convention, factor 0.996648) vs dynamical
 * mean-osc = coeff/(1−m²).
 *
 * Also measured for free: the forced inclination-oscillation amplitude
 * (classical (3/8)·m·i — half-range 0.145° at the real m) vs its m-scaling.
 *
 * Usage: node tools/explore/v4-i-theorem.js
 */

const C = require('../lib/constants');
const DT = require('../lib/deep-time');
const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const d2r = Math.PI / 180;
const T_YR = DT.MEAN_SIDEREAL_YEAR_J2000_S;

console.log('v4 i-theorem — m-scaling of the latitude compression');
console.log('candidate: sinF-coeff = mean-osc-i × (1 − m²)\n');
console.log('calibrating lunar ICs (D1, real m)...');
const cal = D1.calibrate(undefined, false);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

function latMain(S) {
  const fLam = LAB.linFit(S.t, S.lam), fOm = LAB.linFit(S.t, S.Om);
  let ss = 0, sc = 0, scs = 0, bs = 0, bc = 0;
  for (let i = 0; i < S.t.length; i++) {
    const F = (fLam.a + fLam.b * S.t[i]) - (fOm.a + fOm.b * S.t[i]);
    const si = Math.sin(F), co = Math.cos(F);
    ss += si * si; sc += co * co; scs += si * co;
    bs += S.beta[i] * si; bc += S.beta[i] * co;
  }
  const det = ss * sc - scs * scs;
  return { coeff: Math.hypot((bs * sc - bc * scs) / det, (bc * ss - bs * scs) / det) / d2r, n: fLam.b };
}

const SCALES = [1, 1.4, 2, 2.83];
const rows = [];
console.log('  s      m         m²          coeff(°)    mean-osc i(°)   1−compression   (1−f)/m²   forced amp(°)  [(3/8)m·i]');
for (const s of SCALES) {
  const yearS = T_YR * s;
  const nodalYr = 18.6 * s * s;
  const years = Math.max(150, Math.ceil(4 * nodalYr));
  const t0 = Date.now();
  const S = LAB.runSystem({ planets: false, j2: false, recordInc: true, yearSeconds: yearS }, moonIC, years, 0.04);
  const { coeff, n } = latMain(S);
  const nPrime = 2 * Math.PI / (yearS / 86400);          // rad/day
  const m = nPrime / n;
  let meanI = 0, minI = Infinity, maxI = -Infinity;
  for (const v of S.inc) { meanI += v; if (v < minI) minI = v; if (v > maxI) maxI = v; }
  meanI = meanI / S.inc.length / d2r;
  const f = coeff / meanI;
  const forced = (maxI - minI) / d2r / 2;
  rows.push({ m, oneMinusF: 1 - f, c2: (1 - f) / (m * m) });
  console.log(`  ${s.toFixed(2)}  ${m.toFixed(6)}  ${(m * m).toExponential(3)}  ${coeff.toFixed(6).padStart(9)}   ${meanI.toFixed(6).padStart(11)}   ${(1 - f).toExponential(4).padStart(11)}   ${((1 - f) / (m * m)).toFixed(4).padStart(7)}   ${forced.toFixed(4).padStart(9)}   [${(0.375 * m * meanI).toFixed(4)}]   (${((Date.now() - t0) / 1000).toFixed(0)} s, ${years} yr)`);
}

// exponent fit: ln(1−f) = ln c + k·ln m
let sx = 0, sy = 0, sxx = 0, sxy = 0;
for (const r of rows) {
  const x = Math.log(r.m), y = Math.log(r.oneMinusF);
  sx += x; sy += y; sxx += x * x; sxy += x * y;
}
const nR = rows.length;
const k = (nR * sxy - sx * sy) / (nR * sxx - sx * sx);
const c = Math.exp((sy - k * sx) / nR);
console.log(`\n  power-law fit: 1 − compression = ${c.toFixed(4)} · m^${k.toFixed(4)}`);
console.log(`  O(m²) coefficient by extrapolation m→0: c₂ = ${rows[rows.length - 1].c2.toFixed(4)} (smallest m) … ${rows[0].c2.toFixed(4)} (real m)`);
console.log('\n  THEOREM TEST: k ≈ 2 and c₂ → 1.00 confirm  sinF-coeff = mean-osc-i × (1 − m²).');
console.log('\n  Real-Moon closure with the theorem:');
console.log(`    Meeus 5.128122 / (1 − m²) = ${(5.128122 / (1 - 0.0748013 ** 2)).toFixed(5)}°  vs E3c measured mean-osc 5.15725° (Δ ${((5.128122 / (1 - 0.0748013 ** 2) - 5.15725) * 3600).toFixed(1)}″)`);
console.log(`    rectification: dynamical − catalog = ${(5.128122 / (1 - 0.0748013 ** 2) - 5.1453964).toFixed(4)}° (measured +0.0119°)`);
