// FQ-3 W1 — verification: the exact-Kepler wheel Sun (moveModel path).
//
// With FQ3_EXACT_SUN on (default) the raw wheel should realize the twin
// (full Kepler on the framework laws) — the W0-measured 279.0″ annual +
// 8.93″ semi content should collapse to the W2 acceptance bar (≤ ~5″
// annual sd). E5_WHEEL_SUN=0 so the δ overlay does not mask the raw wheel.
// Legacy control: FQ3_EXACT_SUN=0 (plus SUN_HARMONICS_DISABLED=1) must
// reproduce the W0 numbers.
//
// Run: node tools/explore/fq3-w1-verify.mjs            (exact-sun path)
//      FQ3_EXACT_SUN=0 SUN_HARMONICS_DISABLED=1 node tools/explore/fq3-w1-verify.mjs   (W0 control)

process.env.E5_WHEEL_SUN = '0';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/constants.js');
const SG = require('../lib/scene-graph.js');

const d2r = Math.PI / 180, r2d = 180 / Math.PI;
const EPS = 23.4392911 * d2r;
const wrap180 = (x) => ((((x + 540) % 360) + 360) % 360) - 180;

const cycles16 = (year) => (year - C.balancedYear) / C.perihelionCycleLength;
function eLaw(year) {
  const ph = 2 * Math.PI * cycles16(year);
  const b = C.eccentricityBase, a = C.eccentricityAmplitude;
  return Math.sqrt(b * b + a * a - 2 * b * a * Math.cos(ph));
}
function periGeoDeg(year) {
  const p0 = (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + 180) % 360;
  return p0 + 360 * (cycles16(year) - cycles16(2000));
}
const meanLonDeg = (jd) => 280.46646 + 360 * (jd - C.j2000JD) / C.meanSolarYearDays;
const jdToYear = (jd) => 2000 + (jd - C.j2000JD) / C.meanSolarYearDays;
function lambdaTwin(jd) {
  const year = jdToYear(jd);
  const L = meanLonDeg(jd);
  const M = (L - periGeoDeg(year)) * d2r;
  const e = eLaw(year), e2 = e * e, e3 = e2 * e, e4 = e3 * e;
  return L + ((2 * e - e3 / 4) * Math.sin(M)
    + (1.25 * e2 - (11 / 24) * e4) * Math.sin(2 * M)
    + ((13 / 12) * e3) * Math.sin(3 * M)
    + ((103 / 96) * e4) * Math.sin(4 * M)) * r2d;
}

// moveModel-path wheel λ: animate the internal graph at pos(jd), then the
// same rotAxis-frame extraction computeSunPositionFast uses.
SG.computeSunPositionFast(C.j2000JD); // init the internal graph
const g = SG._getGraphForProbe();
function lambdaWheelMove(jd) {
  const pos = (jd - C.startmodelJD) / C.meanSolarYearDays;
  SG.moveModel(g, pos);
  g.root.updateWorldMatrix();
  const sWP = g.sunNodes.pivot.getWorldPosition();
  const local = g.earthNodes.rotAxis.worldToLocal(sWP[0], sWP[1], sWP[2]);
  const sph = SG.cartesianToSpherical(local[0], local[1], local[2]);
  const ra = SG.thetaToRaDeg(sph.theta) * d2r;
  const dec = SG.phiToDecDeg(sph.phi) * d2r;
  return Math.atan2(Math.sin(ra) * Math.cos(EPS) + Math.tan(dec) * Math.sin(EPS), Math.cos(ra)) * r2d;
}

function fitHarmonics(rows, nMax) {
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
  const M2 = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
    [M2[c], M2[p]] = [M2[p], M2[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = M2[r][c] / M2[c][c];
      for (let cc = c; cc <= k; cc++) M2[r][cc] -= f * M2[c][cc];
    }
  }
  return M2.map((row, i) => row[k] / row[i]);
}
const amp = (x, n) => Math.hypot(x[2 * n - 1], x[2 * n]);
const sd = (rows) => {
  const m = rows.reduce((a, r) => a + r.val, 0) / rows.length;
  return Math.sqrt(rows.reduce((a, r) => a + (r.val - m) ** 2, 0) / rows.length);
};

const rows = [];
for (let jd = C.j2000JD - 10 * 365.25; jd <= C.j2000JD + 10 * 365.25; jd += 1.0) {
  const year = jdToYear(jd);
  const M = (meanLonDeg(jd) - periGeoDeg(year)) * d2r;
  rows.push({ M, val: wrap180(lambdaTwin(jd) - lambdaWheelMove(jd)) * 3600 });
}
const f = fitHarmonics(rows, 3);
console.log(`FQ3_EXACT_SUN=${process.env.FQ3_EXACT_SUN ?? '(default on)'}  SUN_HARMONICS_DISABLED=${process.env.SUN_HARMONICS_DISABLED ?? '(unset)'}`);
console.log('twin − wheel (moveModel path, 1990–2010 daily):');
console.log(`  const ${f[0].toFixed(2)}″ · annual ${amp(f, 1).toFixed(2)}″ · semi ${amp(f, 2).toFixed(2)}″ · third ${amp(f, 3).toFixed(2)}″ · sd ${sd(rows).toFixed(2)}″`);

// deep-time spot checks (bounded behavior; raw wheel vs twin)
console.log('deep-time spot checks (twin − wheel, ″):');
for (const y of [-135, -3000, 20000]) {
  const jd = C.j2000JD + (y - 2000) * C.meanSolarYearDays;
  console.log(`  year ${y}: ${(wrap180(lambdaTwin(jd) - lambdaWheelMove(jd)) * 3600).toFixed(1)}`);
}
