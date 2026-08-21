// THE SUN PLANETARY COMPLETION — fit + verification instrument (20.3h).
// The dev record behind the v1 fitted table of
// packages/physics/src/eclipse/sun-planetary-completion.cjs.
//
// SUPERSEDED BY STAGE D2 (plan §12i item 10): the shipped module is now
// the DERIVED 68-term table extracted from the framework's own 8-body
// integration — re-derivation goes through the D2 instrument chain
// (tools/explore/d2-derived-sun.mjs → d2-sun-table-extraction.mjs →
// d2-joint-preview.mjs), NOT through a re-run of this fitter. Part 1's
// coefficient-drift comparison no longer applies (the shipped basis is
// no longer the 10-term fit basis); parts 3–4 (the shipped-model
// scoreboards) remain valid verification instruments.
//
// Fetches JPL Horizons live (ObsEcLon, COMMAND 10/301, CENTER 500@399,
// QUANTITIES 31, TLIST of JD UT — the u2-dense-de441 convention) at:
//  · 960 deterministic pseudo-random all-phase epochs 1970–2049 (LCG,
//    fixed seed — no syzygy lock, no argument aliasing), and
//  · the 179 eclipse syzygies 1970–2049 (the finder's greatest instants),
// then:
//  1. re-fits the shipped 10-term basis on the all-phase Sun residual
//     (leading-nutation-bridged to mean-of-date; free constant excluded
//     from shipment) and prints each coefficient against the SHIPPED
//     table — drift here means JPL or the finder Sun changed;
//  2. half-sample era-stability (1970–2009 vs 2010–2049);
//  3. the 179-syzygy elongation scoreboard through the SHIPPED model
//     (the completion is inside besselian, so this instrument applies
//     the shipped evaluator to the finder Sun exactly as the tier does);
//  4. the 15-point NASA-centerline shadow-plane scoreboard through the
//     shipped model.eclipse.umbraGroundAtJD.
//
// MEASURED RECORD (2026-08, the shipping run):
//  all-phase Sun 10.0″ → 2.9″ RMS; every term half-sample stable;
//  syzygy elongation mean +1.1″ → +1.5″, RMS 10.6″ → 5.5″ (remaining
//  scatter is the Moon's Ch. 47 truncation tail — refit-resistant,
//  coherent content ≤1.5″; the 2F syzygy signature is the tail's
//  eclipse-cadence projection, absent all-phase, so no 2F term ships);
//  centerlines shadow-plane mean 6.0″ → 3.6″ / max 5.0″. The three
//  stable MOON terms (Mp −1.5″, E−J −0.7″, V−E +0.9″) FAILED the
//  centerline preview (mean unchanged, Timor degraded) — not shipped:
//  the 20.3h-lite lesson, "preview the gate scoreboard before
//  shipping", applied and confirmed.
//
//   node tools/fit/sun-planetary-completion-fit.js
'use strict';
/* global fetch -- Node ≥18 built-in; this fitter queries JPL Horizons live */

const { join } = require('node:path');
const { readFileSync } = require('node:fs');
const { createSunPlanetaryCompletion } = require('@essrt/physics/eclipse/sun-planetary-completion');
// Frozen dev-record value of the derived EMB wobble (a_M·μ/AU); the live
// model computes it from constants — this instrument only needs parity.
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec: 6.4399 });

const ROOT = join(__dirname, '..', '..', '..');

(async () => {

// @essrt/physics is ESM (index.js) — dynamic import from this CJS fitter.
const { createModel, DEFAULT_CONSTANTS } = await import('@essrt/physics');

const model = createModel(DEFAULT_CONSTANTS);
const C = DEFAULT_CONSTANTS;
const D2R = Math.PI / 180;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((d + 540) % 360) - 180;

// deterministic all-phase epochs (same LCG/seed as the shipping run)
const J0 = model.time.jdFromYear(1970), J1 = model.time.jdFromYear(2050);
let seed = 20260820;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const apJds = Array.from({ length: 960 }, () => Math.round((J0 + rnd() * (J1 - J0)) * 1e6) / 1e6).sort((a, b) => a - b);
// eclipse syzygies
const szJds = [];
for (let s = J0; s < J1; s += 3650) szJds.push(...model.eclipse.findSolarInRange(s, Math.min(s + 3650, J1)).map((e) => Math.round(e.jd * 1e6) / 1e6));

async function fetchLons(command, list) {
  const out = new Map();
  for (let i = 0; i < list.length; i += 40) {
    const batch = list.slice(i, i + 40);
    const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
      + `&COMMAND='${command}'&CENTER='500@399'&EPHEM_TYPE=OBSERVER`
      + `&QUANTITIES='31'&CSV_FORMAT=YES&TLIST='${batch.join(' ')}'`;
    const txt = await (await fetch(url)).text();
    const rows = txt.split('$$SOE')[1]?.split('$$EOE')[0]?.trim().split('\n') ?? [];
    if (rows.length !== batch.length) throw new Error(`Horizons batch ${i}: ${rows.length}/${batch.length}`);
    rows.forEach((r, k) => out.set(batch[k], parseFloat(r.split(',').map((x) => x.trim())[3])));
    process.stderr.write(`  ${command}: ${Math.min(i + 40, list.length)}/${list.length}\r`);
  }
  return out;
}
console.log(`fetching JPL: ${apJds.length} all-phase + ${szJds.length} syzygy epochs × 2 bodies...`);
const apMoon = await fetchLons('301', apJds), apSun = await fetchLons('10', apJds);
const szMoon = await fetchLons('301', szJds), szSun = await fetchLons('10', szJds);

const mkRows = (jds, moonMap, sunMap) => jds.map((jd) => {
  const jb = jd + BRIDGE;
  const T = (jb - 2451545.0) / 36525;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  return {
    jd, T,
    dSun: wrap(model.eclipse.sunLonDegAtJD(jb) - (sunMap.get(jd) - dPsiDeg)) * 3600,
    dMoon: wrap(model.moon.lonDegAtJD(jb) + LP - (moonMap.get(jd) - dPsiDeg)) * 3600,
  };
});
const AROWS = mkRows(apJds, apMoon, apSun);
const SROWS = mkRows(szJds, szMoon, szSun);
const stats = (v) => ({ m: v.reduce((a, x) => a + x, 0) / v.length, rms: Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length) });

// the shipped basis (mirrors sun-planetary-completion.cjs TERMS order)
const AR = (T) => ({
  lV: (181.979801 + 58517.815676 * T) * D2R,
  lE: (100.466457 + 36000.769780 * T) * D2R,
  lM: (355.433000 + 19141.696300 * T) * D2R,
  lJ: (34.351519 + 3036.302389 * T) * D2R,
  D: (297.8501921 + 445267.1114034 * T) * D2R,
});
/** @type {Array<[string,(a:any)=>number]>} */
const BASIS = [
  ['V-E', (a) => a.lV - a.lE], ['2(V-E)', (a) => 2 * (a.lV - a.lE)], ['3(V-E)', (a) => 3 * (a.lV - a.lE)],
  ['2V-3E', (a) => 2 * a.lV - 3 * a.lE],
  ['E-J', (a) => a.lE - a.lJ], ['2(E-J)', (a) => 2 * (a.lE - a.lJ)], ['E-2J', (a) => a.lE - 2 * a.lJ],
  ['2(E-M)', (a) => 2 * (a.lE - a.lM)], ['2lE', (a) => 2 * a.lE], ['D', (a) => a.D],
];
function lsq(basis, y) {
  const n = basis.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  for (let r = 0; r < y.length; r++) {
    const f = basis.map((fn) => fn(r));
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] += f[i] * f[j]; b[i] += f[i] * y[r]; }
  }
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(M[r2][c]) > Math.abs(M[p][c])) p = r2;
    [M[c], M[p]] = [M[p], M[c]];
    const pv = M[c][c];
    for (let k = c; k < 2 * n; k++) M[c][k] /= pv;
    for (let r2 = 0; r2 < n; r2++) if (r2 !== c) { const f = M[r2][c]; for (let k = c; k < 2 * n; k++) M[r2][k] -= f * M[c][k]; }
  }
  const Ainv = M.map((row) => row.slice(n));
  const x = Ainv.map((row) => row.reduce((s2, v, j) => s2 + v * b[j], 0));
  const resid = y.map((v, r) => v - basis.reduce((s2, fn, i) => s2 + x[i] * fn(r), 0));
  const rms = Math.sqrt(resid.reduce((a2, v) => a2 + v * v, 0) / y.length);
  return { x, rms };
}
const buildBasis = (rows, combos) => {
  const basis = [/** @type {(r:number)=>number} */ () => 1];
  for (const [, fn] of combos) basis.push((r) => Math.cos(fn(AR(rows[r].T))), (r) => Math.sin(fn(AR(rows[r].T))));
  return basis;
};

// 1. refit vs the shipped table
const ySun = AROWS.map((r) => r.dSun);
const s0 = stats(ySun);
const f = lsq(buildBasis(AROWS, BASIS), ySun);
console.log(`\n1. ALL-PHASE SUN: raw ${Math.sqrt(s0.rms ** 2 - s0.m ** 2).toFixed(2)}″ → fitted ${f.rms.toFixed(2)}″  [shipping run: 9.98 → 2.93]`);
const SHIPPED = [[0, -5.08], [0, 5.55], [0, 0.68], [-2.64, 0], [0, 7.19], [0, -2.81], [-1.34, 0.97], [0, 2.05], [0, 1.42], [0, -6.64]];
console.log('   term        fit cos/sin″     shipped     drift');
for (let c2 = 0; c2 < BASIS.length; c2++) {
  const fc = f.x[1 + 2 * c2], fs = f.x[2 + 2 * c2];
  const [sc, ss] = SHIPPED[c2];
  const drift = Math.hypot(fc - sc, fs - ss);
  console.log(`   ${BASIS[c2][0].padEnd(9)} ${fc.toFixed(2).padStart(6)}/${fs.toFixed(2).padStart(6)}   ${sc.toFixed(2).padStart(6)}/${ss.toFixed(2).padStart(6)}   ${drift.toFixed(2)}″${drift > 0.5 ? '  ⚠ DRIFT' : ''}`);
}

// 2. era stability
const early = AROWS.filter((r) => r.T < 0.1), late = AROWS.filter((r) => r.T >= 0.1);
const fe = lsq(buildBasis(early, BASIS), early.map((r) => r.dSun));
const fl = lsq(buildBasis(late, BASIS), late.map((r) => r.dSun));
console.log('\n2. era stability (1970–2009 / 2010–2049):');
for (let c2 = 0; c2 < BASIS.length; c2++) {
  const aE = Math.hypot(fe.x[1 + 2 * c2], fe.x[2 + 2 * c2]);
  const aL = Math.hypot(fl.x[1 + 2 * c2], fl.x[2 + 2 * c2]);
  const phE = Math.atan2(fe.x[2 + 2 * c2], fe.x[1 + 2 * c2]) / D2R;
  const phL = Math.atan2(fl.x[2 + 2 * c2], fl.x[1 + 2 * c2]) / D2R;
  console.log(`   ${BASIS[c2][0].padEnd(9)} amp ${aE.toFixed(2)} / ${aL.toFixed(2)}″  phase ${phE.toFixed(0)} / ${phL.toFixed(0)}°  ${Math.abs(wrap(phE - phL)) < 30 && Math.abs(aE - aL) < 0.8 ? 'STABLE' : '⚠'}`);
}

// 3. syzygy elongation through the SHIPPED completion evaluator
const el0 = SROWS.map((r) => r.dMoon - r.dSun);
const el1 = SROWS.map((r) => r.dMoon - (r.dSun - sunPlanetaryCompletionDeg(r.T) * 3600));
const e0 = stats(el0), e1 = stats(el1);
console.log(`\n3. SYZYGY (n ${SROWS.length}): raw mean ${e0.m.toFixed(1)}″ RMS ${e0.rms.toFixed(1)}″ → completed mean ${e1.m.toFixed(1)}″ RMS ${e1.rms.toFixed(1)}″  [shipping run: +1.1/10.6 → +1.5/5.5]`);

// 4. centerline shadow-plane scoreboard through the shipped tier
const CL = JSON.parse(readFileSync(join(ROOT, 'public/input/solar-eclipse-centerlines-nasa.json'), 'utf8'));
const R_E = C.bodyDiametersKm.earth / 2;
const efUnit = (la, lo) => [-Math.cos(la * D2R) * Math.cos(lo * D2R), Math.sin(la * D2R), Math.cos(la * D2R) * Math.sin(lo * D2R)];
const K2 = C.physicalConstants;
const gmst = (jd) => { const T = (jd - 2451545.0) / 36525; return ((K2.gmstMeanSiderealT0Deg + K2.gmstMeanSiderealRateDegPerDay * (jd - 2451545.0) + K2.gmstMeanSiderealT2Deg * T * T) % 360 + 360) % 360; };
console.log('\n4. CENTERLINES (shadow-plane ″ through the shipped tier):');
const all = [];
for (const ev of CL.events) {
  const per = [];
  for (const p of ev.points) {
    const u = model.eclipse.umbraGroundAtJD(p.jd);
    const jb = p.jd + BRIDGE;
    const year = model.time.yearFromJD(jb);
    const eps = model.earth.obliquityDeg(year) * D2R;
    const lam = model.eclipse.sunLonDegAtJD(jb) * D2R;
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) / D2R;
    const ss = { la: Math.asin(Math.sin(lam) * Math.sin(eps)) / D2R, lo: ((ra - gmst(p.jd) + 540) % 360) - 180 };
    const a = efUnit(p.latDeg, p.lonDeg), b = efUnit(u.latDeg, u.lonDeg), s = efUnit(ss.la, ss.lo);
    const gv = [(b[0] - a[0]) * R_E, (b[1] - a[1]) * R_E, (b[2] - a[2]) * R_E];
    const dot = gv[0] * s[0] + gv[1] * s[1] + gv[2] * s[2];
    per.push(Math.hypot(gv[0] - dot * s[0], gv[1] - dot * s[1], gv[2] - dot * s[2]) / 1.86);
  }
  all.push(...per);
  console.log(`   ${ev.label.padEnd(36)} ${per.map((v) => v.toFixed(1) + '″').join('  ')}`);
}
console.log(`   overall mean ${(all.reduce((a, v) => a + v, 0) / all.length).toFixed(1)}″ | max ${Math.max(...all).toFixed(1)}″  [shipping run: 3.6 / 5.0]`);

})().catch((e) => { console.error(e); process.exit(1); });
