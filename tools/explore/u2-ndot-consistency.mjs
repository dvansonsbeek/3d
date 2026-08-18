// THE ṅ SELF-CONSISTENCY CHECK — the root cause of the −135 Babylon
// residual (plan §12i queue item 0; the campaign's founding measurement).
//
// The model holds two statements of the Moon's tidal deceleration:
//  PART 1 — Driver 1's recession DERIVES ṅ = −(3/2)(ȧ/a)·n. With the
//     shipped ȧ = 3.82 cm/yr this computes to −25.83″/cy² — the
//     canonical LLR value, from our own physics.
//  PART 2 — the chain's fitted lunar anchors BEHAVE as an effective ṅ,
//     measured as the quadratic drift of our Moon's longitude against
//     DE441 across 27 centuries (19 epochs, fetched 2026-08 from JPL
//     Horizons, TLIST embedded below with the returned ObsEcLon/Lat —
//     re-fetch to reproduce; DE441's own ṅ ≈ −25.85 from its LLR-fitted
//     tidal model).
// FIRST-RUN RESULT: effective ≈ −24.0″/cy² (DE441 route; −24.8 via the
// ELP-canon route) → CONSISTENCY GAP 1.0–1.8″/cy² (~9σ), predicting
// 230–416″ of lunar longitude error at −135 — the MEASURED value there
// is +427″ (β clean at 13″). The gap × ½T² IS the ancient along-track
// error. Fix = derivation, not fitting: make the argument secular obey
// Driver 1 (campaign steps in the plan; pre-registration required).
//
//   node tools/explore/u2-ndot-consistency.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';

const model = createModel(DEFAULT_CONSTANTS);
const K = DEFAULT_CONSTANTS;
const D2R = Math.PI / 180;

// ── PART 1: Driver-1-implied ndot ────────────────────────────────────────
const a0 = model.epoch.moonDistanceKmAtYear(2000);
const adot = (model.epoch.moonDistanceKmAtYear(2050) - model.epoch.moonDistanceKmAtYear(1950)) / 100;
const nArcsecPerYr = (360 / K.moonReference.moonSiderealMonthInput) * 365.25 * 3600;
const ndotImplied = -1.5 * (adot / a0) * nArcsecPerYr * 1e4;
console.log(`PART 1 — Driver-1 recession: ȧ = ${(adot * 1e5).toFixed(2)} cm/yr, a = ${a0.toFixed(1)} km`);
console.log(`  IMPLIED ṅ = −(3/2)(ȧ/a)n = ${ndotImplied.toFixed(2)} ″/cy²  (canonical LLR: −25.8)\n`);

// ── PART 2: effective ndot vs DE441 ─────────────────────────────────────
// epochs (jd UT) and the JPL Horizons DE441 ObsEcLon/Lat returned for them
// (QUANTITIES='31', CENTER='500@399', fetched 2026-08):
const EPOCHS = [
  [1465380.762, 325.4432382], [1520167.092, 59.1095878], [1574953.422, 143.0441068],
  [1629739.753, 221.2778966], [1684526.083, 316.3393373], [1739312.413, 46.0815902],
  [1794098.744, 123.4587503], [1848885.074, 205.7989945], [1903671.404, 305.0786624],
  [1958457.735, 28.4428947], [2013244.065, 106.7151320], [2068030.395, 196.8948611],
  [2122816.726, 289.2881769], [2177603.056, 7.8274795], [2232389.386, 93.2652764],
  [2287175.717, 189.5464809], [2341962.047, 271.9896084], [2396748.377, 349.0010125],
  [2451534.708, 82.4269957],
];
const LP = K.moon.moonMeeusLpCorrection;
const BRIDGE = K.earthOrbital.deltaTStart / 86400;
const N = K.physicalConstants.nutationLeadingTermsArcsec;

const pts = [];
for (const [jd, jplLonTrue] of EPOCHS) {
  const jb = jd + BRIDGE;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / K.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  const fw = model.moon.lonDegAtJD(jb) + LP;
  let d = fw - (jplLonTrue - dPsiDeg);
  d = ((d + 540) % 360) - 180;
  pts.push({ T: (jb - 2451545.0) / 36525, dArc: d * 3600 });
}
// quadratic least squares
const S = [0, 0, 0, 0, 0], Y = [0, 0, 0];
for (const p of pts) {
  const t = p.T;
  S[0] += 1; S[1] += t; S[2] += t * t; S[3] += t ** 3; S[4] += t ** 4;
  Y[0] += p.dArc; Y[1] += p.dArc * t; Y[2] += p.dArc * t * t;
}
const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
const b = [...Y];
for (let c = 0; c < 3; c++) {
  let piv = c;
  for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
  [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
  for (let r = c + 1; r < 3; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc < 3; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; }
}
const x = [0, 0, 0];
for (let c = 2; c >= 0; c--) { let s = b[c]; for (let cc = c + 1; cc < 3; cc++) s -= A[c][cc] * x[cc]; x[c] = s / A[c][c]; }
const resid = pts.map((p) => p.dArc - (x[0] + x[1] * p.T + x[2] * p.T * p.T));
const rms = Math.sqrt(resid.reduce((s, v) => s + v * v, 0) / pts.length);
console.log(`PART 2 — fit: dλ = ${x[0].toFixed(1)} + ${x[1].toFixed(2)}·T + ${x[2].toFixed(3)}·T² ″ (T in cy) | resid RMS ${rms.toFixed(1)}″`);
const ndotDE = -25.85;
const eff = ndotDE + 2 * x[2];
console.log(`  Δṅ vs DE441 = 2c = ${(2 * x[2]).toFixed(2)} ″/cy² → EFFECTIVE ṅ(ours) = ${eff.toFixed(2)} ″/cy²`);
console.log(`\nCONSISTENCY GAP = ${(eff - ndotImplied).toFixed(2)} ″/cy²`);
console.log(`predicted −135 longitude error from the gap: ${(0.5 * Math.abs(eff - ndotImplied) * 21.35 ** 2).toFixed(0)}″  (measured vs DE441: +427″)`);
