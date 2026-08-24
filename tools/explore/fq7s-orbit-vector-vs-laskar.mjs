// FQ-7-SUN / option C — the Earth-orbit VECTOR view: model laws vs La2004.
//
// Dynamically e and ϖ are one complex variable z = e·e^{iϖ}; the model
// currently asserts three e-laws (H/16 beat law; the Moon's H/3 line; the
// Sun's H/16 + H/3 sum) and one ϖ law (H/16 of-date + lattice harmonics).
// This compares each against Laskar 2004 (data/la2004-earth-51myr-back.asc:
// t [kyr, ≤ 0], e, ε [rad], ϖ [rad, from the moving equinox]) over the
// last 250 kyr — the cross-validation done in ONE place — and at J2000
// (value, slope, curvature from the 0…−3 kyr rows).
//
// Usage: node tools/explore/fq7s-orbit-vector-vs-laskar.mjs [kyrBack=250]

import { readFileSync } from 'node:fs';
const { createModel } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const model = createModel();
const deps = model.eclipse.frameworkSunDeps;
const KYR = parseFloat(process.argv[2] || '250');
const R2D = 180 / Math.PI;

const rows = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8')
  .split('\n').map((l) => l.trim().replace(/D/g, 'E').split(/\s+/).map(Number)).filter((r) => r.length >= 4 && Number.isFinite(r[0]) && -r[0] <= KYR);

const e16 = (y) => model.earth.eccentricity(y);
const e16_2000 = e16(2000);
const eSun = (y) => deps.eccentricityAt(y);
const eLine = (y) => e16_2000 + (eSun(y) - e16(y));   // the Moon's H/3 line (variable part identical to the Sun's imprint)
const wModel = (y) => model.earth.perihelionLongitudeDeg(y);
const epsModel = (y) => model.earth.obliquityDeg(y);
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

const stats = { e16: [], eSun: [], eLine: [], w: [], eps: [], zSun: [], zLine: [] };
for (const [tk, eL, epsL, wL] of rows) {
  const y = 2000 + tk * 1000;
  stats.e16.push(e16(y) - eL); stats.eSun.push(eSun(y) - eL); stats.eLine.push(eLine(y) - eL);
  stats.w.push(wrap(wModel(y) - wL * R2D));
  stats.eps.push(epsModel(y) - epsL * R2D);
  const zL = [eL * Math.cos(wL), eL * Math.sin(wL)];
  const wm = wModel(y) / R2D;
  stats.zSun.push(Math.hypot(eSun(y) * Math.cos(wm) - zL[0], eSun(y) * Math.sin(wm) - zL[1]));
  stats.zLine.push(Math.hypot(eLine(y) * Math.cos(wm) - zL[0], eLine(y) * Math.sin(wm) - zL[1]));
}
const rms = (v) => Math.sqrt(v.reduce((s, q) => s + q * q, 0) / v.length);
const mean = (v) => v.reduce((s, q) => s + q, 0) / v.length;
console.log(`La2004 vs model over the last ${KYR} kyr (n ${rows.length}, 1-kyr steps):`);
console.log(`  e  — H/16 law:        RMS ${rms(stats.e16).toExponential(2)}  (mean ${mean(stats.e16).toExponential(2)})`);
console.log(`  e  — Sun (H/16+H/3):  RMS ${rms(stats.eSun).toExponential(2)}  (mean ${mean(stats.eSun).toExponential(2)})`);
console.log(`  e  — Moon H/3 line:   RMS ${rms(stats.eLine).toExponential(2)}  (mean ${mean(stats.eLine).toExponential(2)})`);
console.log(`  e  — Laskar itself sd: ${Math.sqrt(rows.reduce((s, r) => s + (r[1] - mean(rows.map((q) => q[1]))) ** 2, 0) / rows.length).toExponential(2)}  (the signal to explain)`);
console.log(`  ϖ  — of-date:         RMS ${rms(stats.w).toFixed(2)}°  (mean ${mean(stats.w).toFixed(2)}°)`);
console.log(`  ε  — obliquity:       RMS ${rms(stats.eps).toFixed(3)}°  (Laskar sd ${Math.sqrt(rows.reduce((s, r) => s + (r[2] * R2D - mean(rows.map((q) => q[2] * R2D))) ** 2, 0) / rows.length).toFixed(3)}°)`);
console.log(`  |Δz| e·e^{iϖ}:       Sun-law ${rms(stats.zSun).toExponential(2)} · Moon-line ${rms(stats.zLine).toExponential(2)}`);

// J2000 derivatives from Laskar rows 0, −1, −2, −3 kyr (finite differences) vs the laws
const at = (k) => rows.find((r) => r[0] === -k);
if (at(0) && at(1) && at(2)) {
  const eL = [at(0)[1], at(1)[1], at(2)[1]];
  const edotL = (eL[0] - eL[1]) / 10;          // per century (1 kyr = 10 cy)
  const eddL = (eL[0] - 2 * eL[1] + eL[2]) / 100;
  const d = (f) => (f(2000) - f(1000)) / 10, dd = (f) => (f(2000) - 2 * f(1000) + f(0)) / 100;
  console.log('\nJ2000 slope / curvature (per cy, per cy²) from the −1/−2 kyr rows:');
  console.log(`  ė   Laskar ${edotL.toExponential(3)} · H/16 ${d(e16).toExponential(3)} · Sun ${d(eSun).toExponential(3)} · Moon line ${d(eLine).toExponential(3)}`);
  console.log(`  ë   Laskar ${eddL.toExponential(3)} · H/16 ${dd(e16).toExponential(3)} · Sun ${dd(eSun).toExponential(3)} · Moon line ${dd(eLine).toExponential(3)}`);
  const wL = [at(0)[3], at(1)[3]].map((v) => v * R2D);
  console.log(`  ϖ̇   Laskar ${(wrap(wL[0] - wL[1]) / 10 * 3600).toFixed(1)}″/cy · model ${(wrap(wModel(2000) - wModel(1000)) / 10 * 3600).toFixed(1)}″/cy`);
}
