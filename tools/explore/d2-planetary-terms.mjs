// STAGE D2 PHASE A2 — derived PLANETARY lunar terms + J2 split
// (plan §12i item 10). Three systems, identical D1-calibrated Moon ICs:
//   base3 (Sun-Earth-Moon) · j2_3 (+Earth J2) · full (8 bodies + J2).
// Differentials (quadratic-detrended): full−j2_3 = planetary signal;
// j2_3−base3 = pure J2. Joint sin+cos LSQ on planetary arguments built
// from the run's own unwrapped longitudes (framework-sourced physics —
// nothing external).
//
// MEASURED RECORD (2026-08-20, 120 yr @ dt 0.01): the bare planetary
// terms DERIVED and CROSS-VALIDATED against the independent JPL fit —
// V−E +0.81″ sin (JPL measured +0.85), E−J −0.56″ (JPL −0.69) — plus
// predicted sidebands 2(V−E) 0.28″, 2(E−Ma) 0.26″, V−E±Mp ~0.4″;
// planetary content ~0.92″ RMS. TWO QUEUED REFINEMENTS before these
// ship: (i) PHASES are lab-convention (all planets start at perihelion
// — amplitudes physical, phases not; epoch-realistic ICs from the
// framework startpos anchors needed); (ii) the mixed/J2 numbers are
// contaminated by argument-rate drift between systems (the apparent
// "Mp 43″ J2 term" is the EoC term's phase drift under the J2-shifted
// apsidal rate, not a real term — per-system argument rates needed).
// Usage: node tools/explore/d2-planetary-terms.mjs [years=120] [dt=0.01]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const D1 = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const AS = 3600, R2D = 180 / Math.PI;

console.log('calibrating Moon ICs via D1...');
const cal = D1.calibrate(undefined, true);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

console.log(`integrating base3 / j2_3 / full — ${YEARS} yr @ dt ${DT} ...`);
const t0 = Date.now();
const base3 = P.runSystem({ planets: false, j2: false }, moonIC, YEARS, DT);
const j2_3 = P.runSystem({ planets: false, j2: true }, moonIC, YEARS, DT);
const full = P.runSystem({ planets: true, j2: true }, moonIC, YEARS, DT);
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s (${base3.t.length} samples each)`);

const dlPl = P.detrended(full, j2_3);    // planetary-only (J2 common to both)
const dlJ2 = P.detrended(j2_3, base3);   // pure J2

// linear-fit angle models from the FULL run's own unwrapped series
const lin = (arr, t) => P.linFit(t, arr);
const T = full.t;
const fLam = lin(full.lam, T), fLamS = lin(full.lamS, T);
const fV = lin(full.lamV, T), fJ = lin(full.lamJ, T), fMa = lin(full.lamMa, T), fSa = lin(full.lamSa, T);
const fW = lin(full.w, T);
const ang = (i) => {
  const t = T[i];
  const lam = fLam.a + fLam.b * t, lamS = fLamS.a + fLamS.b * t;
  return {
    D: lam - lamS,
    Mp: lam - (fW.a + fW.b * t),
    VE: (fV.a + fV.b * t) - lamS,     // geocentric Venus − Sun ≈ (lV−lE) + π-offsets, phase absorbed
    EJ: lamS - (fJ.a + fJ.b * t),
    EMa: lamS - (fMa.a + fMa.b * t),
    ESa: lamS - (fSa.a + fSa.b * t),
  };
};
/** @type {Array<[string,(a:any)=>number]>} */
const CAND = [
  ['V-E', (a) => a.VE], ['2(V-E)', (a) => 2 * a.VE], ['3(V-E)', (a) => 3 * a.VE],
  ['E-J', (a) => a.EJ], ['2(E-J)', (a) => 2 * a.EJ],
  ['E-Ma', (a) => a.EMa], ['2(E-Ma)', (a) => 2 * a.EMa], ['E-Sa', (a) => a.ESa],
  ['V-E+2D', (a) => a.VE + 2 * a.D], ['V-E-2D', (a) => a.VE - 2 * a.D],
  ['E-J+2D', (a) => a.EJ + 2 * a.D], ['E-J-2D', (a) => a.EJ - 2 * a.D],
  ['V-E+Mp', (a) => a.VE + a.Mp], ['V-E-Mp', (a) => a.VE - a.Mp],
  ['E-J+Mp', (a) => a.EJ + a.Mp], ['E-J-Mp', (a) => a.EJ - a.Mp],
];
function jointFit(dl, combos) {
  const K = combos.length * 2, n = T.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    for (let c = 0; c < combos.length; c++) {
      const th = combos[c][1](a);
      row[2 * c] = Math.cos(th); row[2 * c + 1] = Math.sin(th);
    }
    const y = dl[i];
    for (let k = 0; k < K; k++) {
      const rk = row[k]; b[k] += rk * y; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
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
const rms = (v) => Math.sqrt(Array.from(v).reduce((s, x) => s + x * x, 0) / v.length);

console.log(`\nPLANETARY differential (full − j2_3): raw RMS ${(rms(dlPl) * AS).toFixed(2)}″`);
const xs = jointFit(dlPl, CAND);
console.log('  term        cos″     sin″     amp″');
let rssPl = 0;
for (let c = 0; c < CAND.length; c++) {
  const co = xs[2 * c] * AS, si = xs[2 * c + 1] * AS, am = Math.hypot(co, si);
  rssPl += am * am;
  if (am >= 0.05) console.log(`  ${CAND[c][0].padEnd(9)} ${co.toFixed(3).padStart(7)}  ${si.toFixed(3).padStart(7)}  ${am.toFixed(3).padStart(6)}`);
}
console.log(`  planetary content RMS: ${Math.sqrt(rssPl / 2).toFixed(2)}″`);
console.log('  [JPL-measured targets: V−E ≈ +0.85 sin · E−J ≈ −0.69 sin]');

console.log(`\nJ2 differential (j2_3 − base3): raw RMS ${(rms(dlJ2) * AS).toFixed(2)}″ (periodic content after detrend)`);
const LUN = [['2D', (a) => 2 * a.D], ['Mp', (a) => a.Mp], ['2D-Mp', (a) => 2 * a.D - a.Mp], ['2Mp', (a) => 2 * a.Mp]];
const xj = jointFit(dlJ2, LUN);
for (let c = 0; c < LUN.length; c++) {
  const am = Math.hypot(xj[2 * c] * AS, xj[2 * c + 1] * AS);
  if (am >= 0.02) console.log(`  ${LUN[c][0].padEnd(7)} amp ${am.toFixed(3)}″`);
}
