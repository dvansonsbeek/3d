// S03 RE-REDUCTION, HARDENED (uncommitted):
//  - JOINT decode per tablet group: a year's rows are contacts of ONE
//    eclipse in TEMPORAL ORDER (sorted by interval: morning events by
//    +deg ascending = C1,max,C4; evening by deg ascending = C1,max,C4).
//    Candidate eclipse and the ordered contact-assignment are chosen
//    JOINTLY by total proximity to Stephenson's DTs (selection only).
//  - Per-eclipse aggregation: one deltaT point per eclipse (weighted
//    contact mean) - honest independence.
//  - Re-identification scan for outliers: every visible eclipse within
//    +-2 yr is tried, not just the same-year one.
//  - Output: the eclipse-level class-A table merged with the totality
//    points; chi^2 vs the current curve; smooth-signature test.
//
//   node tools/explore/u2-s03-hardened.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const DT = require2('/home/dennis/code/3d/tools/lib/deep-time.js');

const model = createModel(DEFAULT_CONSTANTS);
const START = DEFAULT_CONSTANTS.earthOrbital.deltaTStart;
const BABYLON = { lat: 32.54, lon: 44.42 };
const D2R = Math.PI / 180;
const dtModelAbs = (jd) => START + model.eclipse.deltaTSecondsAtJD(jd);
const curve = (y) => START + DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6);

function gmstDeg(jd) {
  const T = (jd - 2451545.0) / 36525;
  return ((280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360 + 360) % 360;
}
function sunAltDeg(jdUT) {
  const lam = model.eclipse.sunLonDegAtJD(jdUT) * D2R;
  const eps = model.earth.obliquityDeg(model.time.yearFromJD(jdUT)) * D2R;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
  const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
  const H = ((gmstDeg(jdUT) + BABYLON.lon) * D2R) - ra;
  return Math.asin(Math.sin(BABYLON.lat * D2R) * Math.sin(dec)
    + Math.cos(BABYLON.lat * D2R) * Math.cos(dec) * Math.cos(H)) / D2R;
}
function crossing(a, b) {
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (sunAltDeg(a) * sunAltDeg(m) <= 0) b = m; else a = m;
  }
  return (a + b) / 2;
}

const rows = [];
for (const line of readFileSync('/home/dennis/code/3d/data/rspa20160404supp2/Table-S03.txt', 'utf8').split('\n')) {
  const m = /^\s*03\s+(-?\s?\d+)\s+(\d+)\s+([+-]\s?\d+)\??\s+(\d+)\s*$/.exec(line);
  if (!m) continue;
  rows.push({ year: parseInt(m[1].replace(/\s/g, ''), 10), dt: +m[2], deg: parseInt(m[3].replace(/\s/g, ''), 10), w: +m[4] });
}
const byYear = new Map();
for (const r of rows) { if (!byYear.has(r.year)) byYear.set(r.year, []); byYear.get(r.year).push(r); }

// ordered contact assignments for group size 1..3
const ASSIGN = { 1: [['C1'], ['max'], ['C4']], 2: [['C1', 'max'], ['C1', 'C4'], ['max', 'C4']], 3: [['C1', 'max', 'C4']] };

const eclipsePoints = [];
for (const [year, group] of byYear) {
  group.sort((a, b) => a.deg - b.deg);      // temporal order for both signs
  const a = model.time.jdFromYear(year - 2), b = model.time.jdFromYear(year + 3);
  const evs = model.eclipse.findSolarInRange(a, b);
  let best = null;
  for (const e of evs) {
    const lc = model.eclipse.solarLocalCircumstances(e.jd, BABYLON.lat, BABYLON.lon);
    if (lc.kind === 'none' || lc.magnitude < 0.1) continue;
    if (sunAltDeg(lc.maxJd) < -1) continue;
    const rise = crossing(lc.maxJd - 0.5, lc.maxJd);
    const set = crossing(lc.maxJd, lc.maxJd + 0.5);
    const cjd = { C1: lc.contacts.c1, max: lc.maxJd, C4: lc.contacts.c4 };
    for (const assign of ASSIGN[Math.min(group.length, 3)]) {
      if (assign.length !== group.length) continue;
      let sum = 0; const dts = [];
      let ok = true;
      for (let i = 0; i < group.length; i++) {
        const r = group[i];
        const cj = cjd[assign[i]];
        if (cj === null || cj === undefined) { ok = false; break; }
        const utObs = (r.deg > 0 ? rise : set) + r.deg * 4 / 1440;
        const dT = (cj + dtModelAbs(cj) / 86400 - utObs) * 86400;
        sum += Math.abs(dT - r.dt); dts.push({ dT, w: r.w });
      }
      if (!ok) continue;
      if (best === null || sum < best.sum) best = { sum, dts, year, evJd: e.jd, assign, sameYear: Math.abs(model.time.yearFromJD(e.jd) - year) < 1.2 };
    }
  }
  if (!best || best.sum / best.dts.length > 1500) continue;
  const sw = best.dts.reduce((s, d) => s + d.w, 0);
  const mean = best.dts.reduce((s, d) => s + d.w * d.dT, 0) / sw;
  const spread = Math.sqrt(best.dts.reduce((s, d) => s + d.w * (d.dT - mean) ** 2, 0) / sw) || 300;
  eclipsePoints.push({ year, dT: mean, err: Math.max(spread / Math.sqrt(best.dts.length), 250), n: best.dts.length, sameYear: best.sameYear });
}
console.log('eclipse-level class-A points from S03 (joint decode, per-eclipse aggregated):');
console.log('  year | contacts | deltaT_ours ± err | curve | misfit | z | same-year ID?');
let chi2 = 0, nn = 0;
for (const p of eclipsePoints.sort((x, y) => x.year - y.year)) {
  const c = curve(p.year);
  const z = (c - p.dT) / Math.hypot(p.err, 500);   // 500 s ancient-tier budget
  chi2 += z * z; nn += 1;
  console.log(`  ${p.year} | ${p.n} | ${p.dT.toFixed(0).padStart(6)} ± ${p.err.toFixed(0).padStart(4)} | ${c.toFixed(0)} | ${(c - p.dT).toFixed(0).padStart(6)} | ${z.toFixed(1).padStart(5)} | ${p.sameYear ? 'yes' : 'SHIFTED'}`);
}
// merge with the totality points
const totality = [
  { year: -762, dT: 22329 }, { year: -708, dT: 19169 }, { year: -584, dT: 18478 }, { year: -135, dT: 10787 },
];
for (const t of totality) {
  const z = (curve(t.year) - t.dT) / 700;
  chi2 += z * z; nn += 1;
}
console.log(`\nMERGED CLASS A: ${nn} eclipse-level points | χ² = ${chi2.toFixed(1)} (χ²/n = ${(chi2 / nn).toFixed(2)})`);
// smooth-signature test: weighted mean misfit and slope over the merged set
const all = [...eclipsePoints.map((p) => ({ y: p.year, m: curve(p.year) - p.dT, e: Math.hypot(p.err, 500) })),
  ...totality.map((t) => ({ y: t.year, m: curve(t.year) - t.dT, e: 700 }))];
const W = all.reduce((s, p) => s + 1 / p.e ** 2, 0);
const mBar = all.reduce((s, p) => s + p.m / p.e ** 2, 0) / W;
const seBar = Math.sqrt(1 / W);
console.log(`weighted mean misfit (curve − eclipse targets): ${mBar.toFixed(0)} ± ${seBar.toFixed(0)} s → ${(mBar / seBar).toFixed(1)}σ`);
