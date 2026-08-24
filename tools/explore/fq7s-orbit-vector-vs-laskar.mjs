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

// ── C-large steps (1)+(2): the DERIVED law (LL eigenvectors + framework
// N-body g5, fq7s-ll-orbital-elements.local.json) against La2004 —
// correlations per e-law over the cardinal window, the cardinal-timing
// scale of the law differences, and ϖ_of-date = arg z + p·t ────────────
{
  const LLd = JSON.parse(readFileSync(new URL('./fq7s-ll-orbital-elements.local.json', import.meta.url), 'utf8')).data;
  const byYear = new Map(LLd.map((r) => [r.year, r]));
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
  const eL = [], e16v = [], eSunv = [], eLinev = [], eDer = [], wLv = [], wDerOfDate = [], wModelv = [];
  const P_ASPY = 1296000 / (H_YEARS() / 13);   // framework mean general precession ″/yr (H/13 cycle)
  for (const [tk, e, , wL] of rows) {
    const y = 2000 + tk * 1000, d = byYear.get(tk * 1000);
    if (!d) continue;
    eL.push(e); e16v.push(e16(y)); eSunv.push(eSun(y)); eLinev.push(eLine(y)); eDer.push(d.eccentricity);
    wLv.push(wL * R2D);
    wDerOfDate.push(d.perihelionLong + P_ASPY * (tk * 1000) / 3600);   // arg z (fixed J2000 ecliptic) + accumulated precession (t < 0 → less)
    wModelv.push(wModel(y));
  }
  console.log(`\nC-LARGE (1): e-law vs La2004 over the last ${KYR} kyr — correlation / RMS:`);
  for (const [nm, v] of [['H/16 law (cardinal path)', e16v], ['Sun H/16+H/3 (pre-C-small)', eSunv], ['H/3 line (Moon; eclipse Sun now)', eLinev], ['DERIVED |z| (LL + N-body g5)', eDer]]) {
    const dd = v.map((q, i) => q - eL[i]);
    console.log(`   ${nm.padEnd(34)} corr ${corr(v, eL).toFixed(3)}   RMS ${rms(dd).toExponential(2)}`);
  }
  // cardinal-point timing scale: an equation-of-centre difference 2·δe (rad) at a cardinal point shifts its instant by 2δe/(2π) years
  const maxDe = Math.max(...eDer.map((q, i) => Math.abs(q - e16v[i])));
  console.log(`   cardinal-timing scale of (derived − H/16) over the window: max |δe| ${maxDe.toExponential(2)} → EoC ${(2 * maxDe * R2D).toFixed(2)}° → cardinal instants shift up to ${(2 * maxDe / (2 * Math.PI) * 365.25).toFixed(1)} days (the Step-6d fit resolves 0.3 min — engine-vs-runtime, not truth)`);
  console.log(`\nC-LARGE (2): ϖ_of-date vs La2004 over the last ${KYR} kyr:`);
  const wrapv = (v) => v.map((q, i) => wrap(q - wLv[i]));
  console.log(`   model ϖ law (H/16 + harmonics)            RMS ${rms(wrapv(wModelv)).toFixed(2)}°`);
  console.log(`   DERIVED arg z + framework precession p·t   RMS ${rms(wrapv(wDerOfDate)).toFixed(2)}°`);
  // the mean of-date period each implies over the window (unwrapped)
  const unwrapCycles = (v) => { let off = 0, prev = v[0], tot = 0; for (let i = 1; i < v.length; i++) { let dlt = v[i] - v[i - 1]; if (dlt > 180) dlt -= 360; else if (dlt < -180) dlt += 360; tot += dlt; } return tot / 360; };
  console.log(`   mean of-date period over the window: La2004 ${(KYR * 1000 / Math.abs(unwrapCycles(wLv))).toFixed(0)} yr · model ${(KYR * 1000 / Math.abs(unwrapCycles(wModelv))).toFixed(0)} yr · derived ${(KYR * 1000 / Math.abs(unwrapCycles(wDerOfDate))).toFixed(0)} yr   (H/16 = 20,957)`);
}
function H_YEARS() { return 335317; }

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
