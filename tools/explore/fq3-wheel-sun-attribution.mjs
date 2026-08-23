// FQ-3 W0 — wheel-sun attribution (stop-gate instrument; plan §12i FQ-3).
//
// QUESTION: is the raw wheel Sun's in-window longitude error (the content the
// fitted SUN_LONGITUDE_HARMONICS absorb — 279.0″ annual + 8.96″ semi + 0.13″
// third) EXACTLY the geometric-split composition error (center-offset toward
// the perihelion direction + the sun node's half-EoC, e − base/2 at 2nd
// order, vs true Kepler at full e)?
//
// METHOD (three curves, one difference chain):
//   λ_wheel  — computeSunPositionFast with SUN_HARMONICS_DISABLED=1 (raw
//              wheel), RA/Dec → ecliptic via IAU obliquity;
//   λ_twin   — self-contained reimplementation of _frameworkSunLon (linear
//              tropical rate + Kepler EoC to e⁴ on the framework e(t)/ϖ(t)
//              laws — the analytic truth of the intended wheel physics);
//   λ_split  — the analytic SPLIT MODEL: Earth→Sun = e_law·û(ϖ_g) + û(θs),
//              θs = L + 2·e_h·sin M + 1.25·e_h²·sin 2M, e_h = e_law − base/2
//              (the sun node's _eocDerived branch, scene-graph.js).
// CLOSURE TEST: Δ_meas = wrap(λ_twin − λ_wheel) vs Δ_pred = wrap(λ_twin −
// λ_split). If Δ_pred reproduces Δ_meas (residual ≪ the 279″ signal), the
// mechanism is closed at the formula level; the residual is the named
// remainder (tilt projection / anchor constants).
// STOP-GATE: split share ≥ ~90% of the measured content.
//
// Run: node tools/explore/fq3-wheel-sun-attribution.mjs
// (sets SUN_HARMONICS_DISABLED=1 and E5_WHEEL_SUN=0 itself, before require)

process.env.SUN_HARMONICS_DISABLED = '1';
process.env.E5_WHEEL_SUN = '0';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/constants.js');
const SG = require('../lib/scene-graph.js');

const d2r = Math.PI / 180, r2d = 180 / Math.PI;
const EPS = 23.4392911 * d2r; // IAU mean obliquity J2000 (the twin's conversion)
const wrap180 = (x) => ((((x + 540) % 360) + 360) % 360) - 180;

// ── shared framework-law pieces (identical arithmetic to _frameworkSunLon) ──
const cycles16 = (year) => (year - C.balancedYear) / C.perihelionCycleLength;
function eLaw(year) {
  const ph = 2 * Math.PI * cycles16(year);
  const b = C.eccentricityBase, a = C.eccentricityAmplitude;
  return Math.sqrt(b * b + a * a - 2 * b * a * Math.cos(ph));
}
function periGeoDeg(year) {
  // Sun's geocentric perihelion = Earth helio perihelion + 180, H/16-precessed
  const p0 = (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + 180) % 360;
  return p0 + 360 * (cycles16(year) - cycles16(2000));
}
function meanLonDeg(jd) {
  return 280.46646 + 360 * (jd - C.j2000JD) / C.meanSolarYearDays;
}
const jdToYear = (jd) => 2000 + (jd - C.j2000JD) / C.meanSolarYearDays;

// ── λ_twin: linear rate + Kepler EoC to e⁴ on the framework laws ──────────
function lambdaTwin(jd) {
  const year = jdToYear(jd);
  const L = meanLonDeg(jd);
  const M = (L - periGeoDeg(year)) * d2r;
  const e = eLaw(year), e2 = e * e, e3 = e2 * e, e4 = e3 * e;
  const eoc = ((2 * e - e3 / 4) * Math.sin(M)
    + (1.25 * e2 - (11 / 24) * e4) * Math.sin(2 * M)
    + ((13 / 12) * e3) * Math.sin(3 * M)
    + ((103 / 96) * e4) * Math.sin(4 * M)) * r2d;
  return L + eoc;
}

// ── λ_split: the wheel's composition, analytically ─────────────────────────
// Earth→Sun = e_law·û(ϖ_g,EARTH-side 102.95°) + 1·û(θs).
// The offset points from Earth TOWARD the perihelion point (ϖ_g ≈ 102.95° at
// J2000 — the doc'd geocentric perihelion-direction convention).
function lambdaSplit(jd) {
  const year = jdToYear(jd);
  const L = meanLonDeg(jd);
  const periSun = periGeoDeg(year);            // Sun-perigee direction (~283°)
  const periEarthDir = periSun - 180;          // Earth→barycenter direction (~103°)
  const M = (L - periSun) * d2r;
  const e = eLaw(year);
  const eh = e - C.eccentricityBase / 2;       // the sun node's _eocDerived EoC
  const thetaS = L * d2r + 2 * eh * Math.sin(M) + 1.25 * eh * eh * Math.sin(2 * M);
  const px = e * Math.cos(periEarthDir * d2r), py = e * Math.sin(periEarthDir * d2r);
  const vx = px + Math.cos(thetaS), vy = py + Math.sin(thetaS);
  return Math.atan2(vy, vx) * r2d;
}

// ── λ_wheel: the raw scene wheel (harmonics off), RA/Dec → ecliptic λ ──────
function lambdaWheel(jd) {
  const s = SG.computeSunPositionFast(jd);
  const ra = SG.thetaToRaDeg(s.ra) * d2r;
  const dec = SG.phiToDecDeg(s.dec) * d2r;
  const sinB_num = Math.sin(dec) * Math.cos(EPS) - Math.cos(dec) * Math.sin(EPS) * Math.sin(ra);
  const lam = Math.atan2(
    Math.sin(ra) * Math.cos(EPS) + Math.tan(dec) * Math.sin(EPS),
    Math.cos(ra)
  ) * r2d;
  return { lam, beta: Math.asin(sinB_num) * r2d };
}

// ── harmonic fit of a series vs the annual argument (mean anomaly M) ───────
function fitHarmonics(rows, nMax) {
  // rows: [{M_rad, val}] — LSQ on [1, sinM, cosM, sin2M, cos2M, ...]
  const k = 1 + 2 * nMax;
  const A = Array.from({ length: k }, () => new Float64Array(k));
  const b = new Float64Array(k);
  const basis = new Float64Array(k);
  for (const { M, val } of rows) {
    basis[0] = 1;
    for (let n = 1; n <= nMax; n++) {
      basis[2 * n - 1] = Math.sin(n * M);
      basis[2 * n] = Math.cos(n * M);
    }
    for (let i = 0; i < k; i++) {
      b[i] += basis[i] * val;
      for (let j = 0; j < k; j++) A[i][j] += basis[i] * basis[j];
    }
  }
  // gaussian elimination
  const M2 = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let rI = c + 1; rI < k; rI++) if (Math.abs(M2[rI][c]) > Math.abs(M2[p][c])) p = rI;
    [M2[c], M2[p]] = [M2[p], M2[c]];
    for (let rI = 0; rI < k; rI++) {
      if (rI === c) continue;
      const f = M2[rI][c] / M2[c][c];
      for (let cc = c; cc <= k; cc++) M2[rI][cc] -= f * M2[c][cc];
    }
  }
  const x = M2.map((row, i) => row[k] / row[i]);
  return x; // [const, sin1, cos1, sin2, cos2, ...]
}
const amp = (x, n) => Math.hypot(x[2 * n - 1], x[2 * n]);
const phs = (x, n) => Math.atan2(x[2 * n], x[2 * n - 1]) * r2d;

// ── sample ─────────────────────────────────────────────────────────────────
const JD0 = C.j2000JD - 10 * 365.25, JD1 = C.j2000JD + 10 * 365.25;
const meas = [], pred = [], resid = [], wheelRows = [];
for (let jd = JD0; jd <= JD1; jd += 1.0) {
  const year = jdToYear(jd);
  const M = (meanLonDeg(jd) - periGeoDeg(year)) * d2r;
  const w = lambdaWheel(jd);
  const t = lambdaTwin(jd);
  const sp = lambdaSplit(jd);
  const dMeas = wrap180(t - w.lam) * 3600;   // ″: twin − raw wheel
  const dPred = wrap180(t - sp) * 3600;      // ″: twin − split model
  meas.push({ M, val: dMeas });
  pred.push({ M, val: dPred });
  resid.push({ M, val: dMeas - dPred });
  wheelRows.push({ jd, dMeas, dPred, beta: w.beta * 3600 });
}

const fM = fitHarmonics(meas, 3);
const fP = fitHarmonics(pred, 3);
const fR = fitHarmonics(resid, 3);
const sd = (rows) => {
  const m = rows.reduce((a, r) => a + r.val, 0) / rows.length;
  return Math.sqrt(rows.reduce((a, r) => a + (r.val - m) ** 2, 0) / rows.length);
};

console.log('FQ-3 W0 — raw wheel Sun attribution (1990–2010 daily, harmonics OFF)');
console.log('fitted absorber content (registry): 279.0″ @1/yr · 8.96″ @2/yr · 0.13″ @3/yr · const −6.77″');
console.log('');
console.log('Δ_meas = twin − raw wheel:');
console.log(`  const ${fM[0].toFixed(2)}″ · annual ${amp(fM, 1).toFixed(2)}″ @${phs(fM, 1).toFixed(1)}° · semi ${amp(fM, 2).toFixed(2)}″ @${phs(fM, 2).toFixed(1)}° · third ${amp(fM, 3).toFixed(2)}″ · sd ${sd(meas).toFixed(2)}″`);
console.log('Δ_pred = twin − split model (the predicted mechanism):');
console.log(`  const ${fP[0].toFixed(2)}″ · annual ${amp(fP, 1).toFixed(2)}″ @${phs(fP, 1).toFixed(1)}° · semi ${amp(fP, 2).toFixed(2)}″ @${phs(fP, 2).toFixed(1)}° · third ${amp(fP, 3).toFixed(2)}″ · sd ${sd(pred).toFixed(2)}″`);
console.log('closure residual (meas − pred):');
console.log(`  const ${fR[0].toFixed(2)}″ · annual ${amp(fR, 1).toFixed(2)}″ @${phs(fR, 1).toFixed(1)}° · semi ${amp(fR, 2).toFixed(2)}″ · third ${amp(fR, 3).toFixed(2)}″ · sd ${sd(resid).toFixed(2)}″`);
console.log('');
const share = 100 * (1 - sd(resid) / sd(meas));
console.log(`split-mechanism share of the measured content: ${share.toFixed(1)}%  (stop-gate: ≥ ~90%)`);
console.log('');
console.log('first-order hand prediction: (e − base) at J2000 =',
  ((eLaw(2000) - C.eccentricityBase) * r2d * 3600).toFixed(1), '″ annual-class');
console.log('wheel β (tilt family, context): sd',
  (wheelRows.reduce((a, r) => a + r.beta * r.beta, 0) / wheelRows.length) ** 0.5 | 0, '″ rms');

// ── frame-free offset-direction probe ──────────────────────────────────────
// δ = angle(bary−earth) − angle(sun−bary), both world-frame — the scene's
// frame rotation cancels in the difference. Model prediction for the same
// quantity: δ_model = (ϖ_g − 180°) − (L + EoC(e_h)). A constant gap between
// the two = the realized offset-direction anchor vs the assumed law ϖ — the
// candidate carrier of the 12.8° annual-phase rotation.
console.log('\noffset-direction probe (graph vs model, deg):');
for (const y of [1995, 2000, 2005, 2010]) {
  const jd = C.j2000JD + (y - 2000) * C.meanSolarYearDays;
  SG.computeSunPositionFast(jd);
  const g = SG._getGraphForProbe();
  const eWP = g.earthNodes.rotAxis.getWorldPosition();
  const bWP = g.barycenter.pivot.getWorldPosition();
  const sWP = g.sunNodes.pivot.getWorldPosition();
  const dirOff = Math.atan2(bWP[2] - eWP[2], bWP[0] - eWP[0]) * r2d;
  const dirSun = Math.atan2(sWP[2] - bWP[2], sWP[0] - bWP[0]) * r2d;
  const dGraph = wrap180(dirOff - dirSun);
  const year = jdToYear(jd);
  const L = meanLonDeg(jd);
  const periSun = periGeoDeg(year);
  const M = (L - periSun) * d2r;
  const e = eLaw(year), eh = e - C.eccentricityBase / 2;
  const thetaS = L + (2 * eh * Math.sin(M) + 1.25 * eh * eh * Math.sin(2 * M)) * r2d;
  const dModel = wrap180((periSun - 180) - thetaS);
  const dOffMag = Math.hypot(bWP[0] - eWP[0], bWP[2] - eWP[2]) / 100;
  // HANDEDNESS: the scene world XZ angle runs OPPOSITE to ecliptic longitude
  // (y-up, atan2(z,x)); the comparable quantity is −δ_graph.
  const gap = wrap180(-dGraph - dModel);
  console.log(`  ${y}: −graph δ ${(-dGraph).toFixed(4)}  model δ ${dModel.toFixed(4)}  gap ${gap.toFixed(4)}°  |d|_graph ${dOffMag.toFixed(6)} AU  e_law ${eLaw(year).toFixed(6)}`);
}

// ── closure verdict ────────────────────────────────────────────────────────
// The realized offset DIRECTION (the wobble composition: base·û(ϖ-chain) +
// the two amp vectors at their own phases) sits `gap`° from the law's ϖ
// direction. Predicted annual-quadrature residual = d[rad-as-″]·sin(gap).
{
  const jd = C.j2000JD;
  SG.computeSunPositionFast(jd);
  const g = SG._getGraphForProbe();
  const eWP = g.earthNodes.rotAxis.getWorldPosition();
  const bWP = g.barycenter.pivot.getWorldPosition();
  const sWP = g.sunNodes.pivot.getWorldPosition();
  const dGraph = wrap180(Math.atan2(bWP[2] - eWP[2], bWP[0] - eWP[0]) * r2d
    - Math.atan2(sWP[2] - bWP[2], sWP[0] - bWP[0]) * r2d);
  const year = jdToYear(jd);
  const L = meanLonDeg(jd), periSun = periGeoDeg(year);
  const M = (L - periSun) * d2r;
  const e = eLaw(year), eh = e - C.eccentricityBase / 2;
  const thetaS = L + (2 * eh * Math.sin(M) + 1.25 * eh * eh * Math.sin(2 * M)) * r2d;
  const dModel = wrap180((periSun - 180) - thetaS);
  const gapDeg = wrap180(-dGraph - dModel);
  const quadPred = e * r2d * 3600 * Math.sin(Math.abs(gapDeg) * d2r);
  console.log('\nCLOSURE: realized-offset-direction gap at J2000 =', gapDeg.toFixed(3),
    '° → predicted annual quadrature', quadPred.toFixed(1),
    `″ vs measured residual annual ${amp(fR, 1).toFixed(1)}″ @${phs(fR, 1).toFixed(1)}°`);
  const closedShare = 100 * (1 - Math.sqrt(Math.max(0, sd(resid) ** 2 - (quadPred / Math.SQRT2) ** 2)) / sd(meas));
  console.log(`combined mechanism share (split + direction term): ~${closedShare.toFixed(1)}%`);
}
