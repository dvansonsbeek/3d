// FQ-7-SUN / option C — the Earth-orbit VECTOR view: model laws vs La2004.
//
// Dynamically e and ϖ are one complex variable z = e·e^{iϖ}. Since the
// eccentricity unification the model asserts ONE e-law (the H/3 line,
// `model.earth.eccentricity`, which the eclipse chain reads through
// `frameworkSunDeps.eccentricityAt` — checked identical here) and one ϖ
// law (H/16 of-date + lattice harmonics). This compares both against
// Laskar 2004 (data/la2004-earth-51myr-back.asc: t [kyr, ≤ 0], e, ε [rad],
// ϖ [rad, from the moving equinox]) over the last 250 kyr — the
// cross-validation done in ONE place — and at J2000 (value, slope,
// curvature from the 0…−3 kyr rows), then sets the DERIVED vector
// (fq7s-laplace-lagrange-e.mjs, LL eigenvectors + the framework N-body g5)
// beside them. The pre-unification three-law rows are in git history
// (99496be): H/16 cardinal law corr −0.014, ė −2.8e-6 (15× too shallow);
// H/3 line corr −0.284, ė −3.97e-5.
//
// Usage: node tools/explore/fq7s-orbit-vector-vs-laskar.mjs [kyrBack=250]
//   Prerequisite for the derived rows:
//     node tools/explore/fq7s-laplace-lagrange-e.mjs 2 g5=4.224
//   (without `g5=` the json is first-order and this script says so).

import { readFileSync } from 'node:fs';
const { createModel } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const model = createModel();
const deps = model.eclipse.frameworkSunDeps;
const KYR = parseFloat(process.argv[2] || '250');
const R2D = 180 / Math.PI;

const rows = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8')
  .split('\n').map((l) => l.trim().replace(/D/g, 'E').split(/\s+/).map(Number)).filter((r) => r.length >= 4 && Number.isFinite(r[0]) && -r[0] <= KYR);

const eModel = (y) => model.earth.eccentricity(y);          // the one H/3 law
const eEclipse = (y) => deps.eccentricityAt(y);              // the eclipse chain's read of it
const wModel = (y) => model.earth.perihelionLongitudeDeg(y);
const epsModel = (y) => model.earth.obliquityDeg(y);
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

const stats = { e: [], w: [], eps: [], z: [] };
let maxLawDiff = 0;
for (const [tk, eL, epsL, wL] of rows) {
  const y = 2000 + tk * 1000;
  maxLawDiff = Math.max(maxLawDiff, Math.abs(eEclipse(y) - eModel(y)));
  stats.e.push(eModel(y) - eL);
  stats.w.push(wrap(wModel(y) - wL * R2D));
  stats.eps.push(epsModel(y) - epsL * R2D);
  const zL = [eL * Math.cos(wL), eL * Math.sin(wL)];
  const wm = wModel(y) / R2D;
  stats.z.push(Math.hypot(eModel(y) * Math.cos(wm) - zL[0], eModel(y) * Math.sin(wm) - zL[1]));
}
const rms = (v) => Math.sqrt(v.reduce((s, q) => s + q * q, 0) / v.length);
const mean = (v) => v.reduce((s, q) => s + q, 0) / v.length;
console.log(`La2004 vs model over the last ${KYR} kyr (n ${rows.length}, 1-kyr steps):`);
console.log(`  unification invariant: eclipse-path e(t) ≡ earth.eccentricity — max |Δe| ${maxLawDiff.toExponential(1)}${maxLawDiff > 1e-12 ? '   ← TWO LAWS AGAIN, investigate' : ''}`);
console.log(`  e  — H/3 law:         RMS ${rms(stats.e).toExponential(2)}  (mean ${mean(stats.e).toExponential(2)})`);
console.log(`  e  — Laskar itself sd: ${Math.sqrt(rows.reduce((s, r) => s + (r[1] - mean(rows.map((q) => q[1]))) ** 2, 0) / rows.length).toExponential(2)}  (the signal to explain)`);
console.log(`  ϖ  — of-date:         RMS ${rms(stats.w).toFixed(2)}°  (mean ${mean(stats.w).toFixed(2)}°)`);
console.log(`  ε  — obliquity:       RMS ${rms(stats.eps).toFixed(3)}°  (Laskar sd ${Math.sqrt(rows.reduce((s, r) => s + (r[2] * R2D - mean(rows.map((q) => q[2] * R2D))) ** 2, 0) / rows.length).toFixed(3)}°)`);
console.log(`  |Δz| e·e^{iϖ}:       ${rms(stats.z).toExponential(2)}`);

// ── C-large steps (1)+(2): the DERIVED law (LL eigenvectors + framework
// N-body g5, fq7s-ll-orbital-elements.local.json) against La2004 —
// correlation over the cardinal window, the cardinal-timing scale of the
// law difference, and ϖ_of-date = arg z + p·t ──────────────────────────
{
  const LLfile = JSON.parse(readFileSync(new URL('./fq7s-ll-orbital-elements.local.json', import.meta.url), 'utf8'));
  const LLd = LLfile.data;
  const g5 = LLfile.g5 ?? 'unrecorded (pre-stamp file)';
  const firstOrder = g5 !== String(g5) || !/^\d/.test(String(g5));
  console.log(`\nC-LARGE (1): e-law vs La2004 over the last ${KYR} kyr — correlation / RMS   [derived json g5 = ${g5}]`);
  if (firstOrder) console.log('   *** WARNING: derived vector generated with the FIRST-ORDER g5 (3.74, 12% low) — regenerate with `fq7s-laplace-lagrange-e.mjs 2 g5=4.224` before quoting these rows ***');
  const byYear = new Map(LLd.map((r) => [r.year, r]));
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
  const eL = [], eModelv = [], eDer = [], wLv = [], wDerOfDate = [], wModelv = [];
  const P_ASPY = 1296000 / (H_YEARS() / 13);   // framework mean general precession ″/yr (H/13 cycle)
  for (const [tk, e, , wL] of rows) {
    const y = 2000 + tk * 1000, d = byYear.get(tk * 1000);
    if (!d) continue;
    eL.push(e); eModelv.push(eModel(y)); eDer.push(d.eccentricity);
    wLv.push(wL * R2D);
    wDerOfDate.push(d.perihelionLong + P_ASPY * (tk * 1000) / 3600);   // arg z (fixed J2000 ecliptic) + accumulated precession (t < 0 → less)
    wModelv.push(wModel(y));
  }
  for (const [nm, v] of [['H/3 law (the one shipped law)', eModelv], ['DERIVED |z| (LL + N-body g5)', eDer]]) {
    const dd = v.map((q, i) => q - eL[i]);
    console.log(`   ${nm.padEnd(34)} corr ${corr(v, eL).toFixed(3)}   RMS ${rms(dd).toExponential(2)}`);
  }
  // cardinal-point timing scale: an equation-of-centre difference 2·δe (rad) at a cardinal point shifts its instant by 2δe/(2π) years
  const maxDe = Math.max(...eDer.map((q, i) => Math.abs(q - eModelv[i])));
  console.log(`   cardinal-timing scale of (derived − H/3 law) over the window: max |δe| ${maxDe.toExponential(2)} → EoC ${(2 * maxDe * R2D).toFixed(2)}° → cardinal instants shift up to ${(2 * maxDe / (2 * Math.PI) * 365.25).toFixed(1)} days (the Step-6d fit resolves 0.3 min — engine-vs-runtime, not truth)`);
  console.log(`\nC-LARGE (2): ϖ_of-date vs La2004 over the last ${KYR} kyr:`);
  const wrapv = (v) => v.map((q, i) => wrap(q - wLv[i]));
  console.log(`   model ϖ law (H/16 + harmonics)            RMS ${rms(wrapv(wModelv)).toFixed(2)}°`);
  console.log(`   DERIVED arg z + framework precession p·t   RMS ${rms(wrapv(wDerOfDate)).toFixed(2)}°`);
  // the mean of-date period each implies over the window (unwrapped)
  const unwrapCycles = (v) => { let tot = 0; for (let i = 1; i < v.length; i++) { let dlt = v[i] - v[i - 1]; if (dlt > 180) dlt -= 360; else if (dlt < -180) dlt += 360; tot += dlt; } return tot / 360; };
  console.log(`   mean of-date period over the window: La2004 ${(KYR * 1000 / Math.abs(unwrapCycles(wLv))).toFixed(0)} yr · model ${(KYR * 1000 / Math.abs(unwrapCycles(wModelv))).toFixed(0)} yr · derived ${(KYR * 1000 / Math.abs(unwrapCycles(wDerOfDate))).toFixed(0)} yr   (H/16 = 20,957)`);
}
function H_YEARS() { return 335317; }

// J2000 derivatives from Laskar rows 0, −1, −2, −3 kyr (finite differences) vs the law
const at = (k) => rows.find((r) => r[0] === -k);
if (at(0) && at(1) && at(2)) {
  const eL = [at(0)[1], at(1)[1], at(2)[1]];
  const edotL = (eL[0] - eL[1]) / 10;          // per century (1 kyr = 10 cy)
  const eddL = (eL[0] - 2 * eL[1] + eL[2]) / 100;
  const d = (f) => (f(2000) - f(1000)) / 10, dd = (f) => (f(2000) - 2 * f(1000) + f(0)) / 100;
  console.log('\nJ2000 slope / curvature (per cy, per cy²) from the −1/−2 kyr rows:');
  console.log(`  ė   Laskar ${edotL.toExponential(3)} · H/3 law ${d(eModel).toExponential(3)}   (observed −4.20e-5)`);
  console.log(`  ë   Laskar ${eddL.toExponential(3)} · H/3 law ${dd(eModel).toExponential(3)}`);
  const wL = [at(0)[3], at(1)[3]].map((v) => v * R2D);
  console.log(`  ϖ̇   Laskar ${(wrap(wL[0] - wL[1]) / 10 * 3600).toFixed(1)}″/cy · model ${(wrap(wModel(2000) - wModel(1000)) / 10 * 3600).toFixed(1)}″/cy`);
}
