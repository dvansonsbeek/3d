// FQ-7-SUN — the annual-channel attribution (planets-free).
//
// The 150-yr Sun residual carries a 0.72″ annual sin(M) term that the
// modern window does not show. EoC ≈ 2e·sin M, so on the certified Sun
// (finder + v3 completion, fuller nutation) the family fit reads:
//   sinM   → δe (= coef/2)          cosM   → e·δϖ (phase of perihelion)
//   T·sinM → δė per century         T·cosM → e·δϖ̇ per century
//   T²·…   → curvature of the same laws
// Those are the framework's DERIVED e(t)/ϖ(t) laws measured against
// JPL over 1900–2100. We measure and record; nothing is tuned.
//
// Usage: node tools/explore/fq7s-annual-channel.mjs

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const { createModel, DEFAULT_CONSTANTS: C } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const { createSunPlanetaryCompletion } = require('../../packages/physics/src/eclipse/sun-planetary-completion.cjs');
const model = createModel();
const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const NU = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

const H = C.foundational.holisticyearLength;
const meanSolarYearDays = Math.round(C.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
const embWobbleArcsec = (C.moonReference.moonDistance / (C.physicalConstants.MASS_RATIO_EARTH_MOON + 1) / C.physicalConstants.currentAUDistance) * (648000 / Math.PI);
const degPerCy = (cpd) => 360 * 36525 * cpd;
const carrierRatesDegPerCy = {
  planets: ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'].map((k) => k ? degPerCy(1 / C.planetOrbitalElements[k].solarYearInput) : degPerCy(1 / meanSolarYearDays)),
  moonElongation: degPerCy(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
};
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy });

const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
const rows = [];
for (const [jd, jplLon] of cache.rows) {
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const om = (NU.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const Dm = (297.8501921 + 445267.1114034 * T) * D2R;
  const F = (93.2720950 + 483202.0175233 * T) * D2R;
  // --leading-nutation: subtract only the leading −17.2″ sinΩ term (the E4/E5
  // measurement convention) — discriminates whether the fitted +1.42″ sin2lE
  // compensates the −1.32″ sin(2F−2D+2Ω) semiannual nutation term
  const LEAD = process.argv.includes('--leading-nutation');
  const dPsi = (NU.psiOmega * Math.sin(om) + (LEAD ? 0 : (0.2062 * Math.sin(2 * om) - 1.3187 * Math.sin(2 * F - 2 * Dm + 2 * om) - 0.2274 * Math.sin(2 * F + 2 * om)))) / 3600;
  const ship = model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T);
  const M = (357.5291092 + 35999.0502909 * T) * D2R;   // instrument mean anomaly (label only)
  rows.push({ T, M, y: wrap(ship - (jplLon - dPsi)) * AS });
}
const n = rows.length;

// basis
const NAMES = ['1', 'T', 'T²', 'T³', 'sinM', 'cosM', 'T·sinM', 'T·cosM', 'T²·sinM', 'T²·cosM', 'sin2M', 'cos2M', 'T·sin2M', 'T·cos2M'];
const basis = (r) => [1, r.T, r.T ** 2, r.T ** 3, Math.sin(r.M), Math.cos(r.M), r.T * Math.sin(r.M), r.T * Math.cos(r.M),
  r.T ** 2 * Math.sin(r.M), r.T ** 2 * Math.cos(r.M), Math.sin(2 * r.M), Math.cos(2 * r.M), r.T * Math.sin(2 * r.M), r.T * Math.cos(2 * r.M)];
const K = NAMES.length;
const G = Array.from({ length: K }, () => new Float64Array(K));
const b = new Float64Array(K);
for (const r of rows) {
  const v = basis(r);
  for (let k = 0; k < K; k++) { b[k] += v[k] * r.y; for (let j = k; j < K; j++) G[k][j] += v[k] * v[j]; }
}
for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
for (let c = 0; c < K; c++) {
  let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
  [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
  for (let r = c + 1; r < K; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
}
const co = new Float64Array(K);
for (let c = K - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * co[cc]; co[c] = s / Gm[c][c]; }
const sd = (v) => { const m = v.reduce((a, q) => a + q, 0) / v.length; return Math.sqrt(v.reduce((a, q) => a + (q - m) ** 2, 0) / v.length); };
const y0 = rows.map((r) => r.y);
const res = rows.map((r) => r.y - basis(r).reduce((s, v, k) => s + v * co[k], 0));
console.log(`certified Sun − JPL, 1900–2100 (n ${n}): raw sd ${sd(y0).toFixed(3)}″ → post-family ${sd(res).toFixed(3)}″`);
console.log('family coefficients (″):');
NAMES.forEach((nm, k) => console.log(`  ${nm.padEnd(8)} ${co[k] >= 0 ? ' ' : ''}${co[k].toFixed(3)}`));

// physical reading — e and ϖ, framework laws vs the implied corrections
const e0 = model.earth.eccentricity(2000);
const eRate = (model.earth.eccentricity(2050) - model.earth.eccentricity(1950)) / 1;   // per century
const wRate = (model.earth.perihelionLongitudeDeg(2050) - model.earth.perihelionLongitudeDeg(1950)) / 1;
const rad2as = 206264.806;
console.log('\nREADING (EoC ≈ 2e·sinM; sign: residual = ours − JPL, so a +sinM coef means OUR e is too large by coef/2):');
console.log(`  δe  at J2000 = ${(co[4] / 2 / rad2as).toExponential(2)}  (framework e(2000) = ${e0.toFixed(7)})`);
console.log(`  δϖ  at J2000 = ${(-co[5] / (2 * e0)).toFixed(2)}″  (cosM coef / (2e))`);
console.log(`  δė  per cy   = ${(co[6] / 2 / rad2as).toExponential(2)}/cy   framework ė = ${eRate.toExponential(3)}/cy   [Simon-94 ref ≈ −4.204e-5/cy]`);
console.log(`  δϖ̇  per cy   = ${(-co[7] / (2 * e0)).toFixed(2)}″/cy  framework ϖ̇ = ${(wRate * 3600).toFixed(1)}″/cy  [ref of-date ≈ 6190″/cy = 1.7195°/cy]`);
console.log(`  T²·sinM ${co[8].toFixed(3)}″ / T²·cosM ${co[9].toFixed(3)}″ — law curvature over the window`);
console.log(`  2M family: ${Math.hypot(co[10], co[11]).toFixed(3)}″ const, ${Math.hypot(co[12], co[13]).toFixed(3)}″/cy drift (e²-class EoC term ≈ 1.25e²·sin2M)`);
