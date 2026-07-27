/**
 * v4-i-theorem-escan.js — i-theorem part 2: the e_M-scan.
 *
 * The m-scan refuted pure-m² scaling: 1−compression has an m-independent
 * floor ≈ 5.5e-3 ≈ (3/2)e_M² + sin²i/8 (0.13% at the real parameters).
 * Physical candidate: the solar torque ∝ r² → eccentric-orbit average
 * ⟨(r/a)²⟩ = 1 + (3/2)e². This scan varies e_M at the real m and fits
 *   1 − compression = A·e² + B      →  test A ≈ 3/2.
 * A companion i-scan (2 points) tests the sin²i/8 term.
 *
 * Usage: node tools/explore/v4-i-theorem-escan.js
 */

const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');
const d2r = Math.PI / 180;

console.log('v4 i-theorem — e_M-scan at real m (candidate: 1−f = (3/2)e² + sin²i/8 + O(m²))\n');
const cal = D1.calibrate(undefined, false);

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
  return Math.hypot((bs * sc - bc * scs) / det, (bc * ss - bs * scs) / det) / d2r;
}

function measure(e, iRad, label) {
  const S = LAB.runSystem({ planets: false, j2: false, recordInc: true }, { a: cal.aIC, e, i: iRad }, 150, 0.04);
  const coeff = latMain(S);
  let meanI = 0;
  for (const v of S.inc) meanI += v;
  meanI = meanI / S.inc.length / d2r;
  // measure the run's own mean osculating e for the fit axis (free e ≠ IC e)
  // approximate with IC e for the scan axis; the trend slope is what matters
  const f = coeff / meanI;
  console.log(`  ${label.padEnd(18)} coeff ${coeff.toFixed(6)}   mean-osc i ${meanI.toFixed(6)}   1−f ${(1 - f).toExponential(4)}`);
  return { e, oneMinusF: 1 - f };
}

console.log('── e_M-scan (i = calibrated 5.157°) ──');
const rows = [];
for (const e of [0.015, 0.0549, 0.085, 0.11]) rows.push(measure(e, cal.iIC, `e = ${e}`));

// linear fit 1−f vs e²
let sx = 0, sy = 0, sxx = 0, sxy = 0;
for (const r of rows) { const x = r.e * r.e; sx += x; sy += r.oneMinusF; sxx += x * x; sxy += x * r.oneMinusF; }
const n = rows.length;
const A = (n * sxy - sx * sy) / (n * sxx - sx * sx);
const B = (sy - A * sx) / n;
console.log(`\n  fit: 1 − f = ${A.toFixed(4)}·e² + ${B.toExponential(4)}     ← candidate slope 3/2 = 1.5000`);
console.log(`  intercept vs sin²i/8 = ${(Math.sin(cal.iIC) ** 2 / 8).toExponential(4)} (+ O(m²) bits)`);

console.log('\n── i-scan (e = 0.0549) ──');
const i1 = measure(0.0549, cal.iIC, `i = ${(cal.iIC / d2r).toFixed(3)}°`);
const i2 = measure(0.0549, cal.iIC / 2, `i = ${(cal.iIC / 2 / d2r).toFixed(3)}°`);
const dSin2 = (Math.sin(cal.iIC) ** 2 - Math.sin(cal.iIC / 2) ** 2) / 8;
console.log(`\n  Δ(1−f) between i and i/2: ${(i1.oneMinusF - i2.oneMinusF).toExponential(4)}   vs Δ(sin²i/8) = ${dSin2.toExponential(4)}`);
console.log('\nTHEOREM (if slopes confirm): sinF-coeff = mean-osc-i × [1 − (3/2)e_M² − sin²i/8 − O(m², m²e²…)]');
console.log('with the real-Moon numbers: (3/2)e² + sin²i/8 ≈ m² is a parameter coincidence of our Moon.');
