/**
 * v4-step-ladder.js — U1 of the v4 campaign (IP-v4-lab.md): step-size
 * validation for the long-window (6k/18k yr) A2-multiplet runs.
 *
 * Runs full + base3 at 600 yr for dt = 0.02 (reference) / 0.04 / 0.08 d and
 * compares: mean motion, apsidal/nodal periods, A2 single-argument amplitude
 * on the differential, and the RK4 energy drift. Acceptance (per spec):
 * largest dt whose amplitudes stay within 0.1% of the dt=0.02 reference and
 * whose energy drift < 1e-9/century.
 *
 * Usage: node tools/explore/v4-step-ladder.js [years=600]
 */

const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const YEARS = parseFloat(process.argv[2] || '600');
console.log(`v4 U1 — step ladder at ${YEARS} yr: dt 0.02 (ref) / 0.04 / 0.08`);

console.log('calibrating lunar ICs (D1)...');
const cal = D1.calibrate(undefined, true);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

function metrics(dt) {
  const t0 = Date.now();
  const full = LAB.runSystem({ planets: true, j2: true }, moonIC, YEARS, dt);
  const b3 = LAB.runSystem({ planets: false, j2: false }, moonIC, YEARS, dt);
  const fLam = LAB.linFit(full.t, full.lam), fW = LAB.linFit(full.t, full.w), fOm = LAB.linFit(full.t, full.Om);
  const fJ = LAB.linFit(full.t, full.lamJ);
  const dl = LAB.detrended(full, b3);
  const a2 = LAB.ampAt(dl, full.t, i => (fLam.a + fLam.b * full.t[i]) + (fW.a + fW.b * full.t[i]) - 2 * (fJ.a + fJ.b * full.t[i]));
  return {
    dt, n: fLam.b, Taps: 2 * Math.PI / fW.b, Tnod: -2 * Math.PI / fOm.b,
    a2e6: a2 * 1e6, drift: full.energyDrift, secs: (Date.now() - t0) / 1000,
  };
}

const ref = metrics(0.02);
const rows = [ref, metrics(0.04), metrics(0.08)];
console.log('\n  dt(d)   n dev(ppm)   Taps dev(%)   Tnod dev(%)   A2(e-6°) dev(%)   E-drift/cy   time(s)');
for (const r of rows) {
  console.log(`  ${r.dt.toFixed(2)}   ${((r.n / ref.n - 1) * 1e6).toFixed(3).padStart(9)}   ${((r.Taps / ref.Taps - 1) * 100).toFixed(4).padStart(10)}   ${((r.Tnod / ref.Tnod - 1) * 100).toFixed(4).padStart(10)}`
    + `   ${r.a2e6.toFixed(1).padStart(7)} ${((r.a2e6 / ref.a2e6 - 1) * 100).toFixed(3).padStart(7)}   ${r.drift.toExponential(2).padStart(9)}   ${r.secs.toFixed(0).padStart(5)}`);
}
console.log('\nacceptance: amplitude/period devs ≤ 0.1% AND energy drift < 1e-9/cy.');
