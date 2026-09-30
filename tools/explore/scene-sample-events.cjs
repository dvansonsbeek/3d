#!/usr/bin/env node
// SAMPLE THE SCENE'S SOLAR EVENTS AROUND ANY EPOCH — the solar-measurements
// exporter's own event definitions (packages/fitting/src/export-solar-measurements.cjs:
// declination zero crossing for the equinoxes, declination extremum for the
// solstices, wobble-centre distance extremum for perihelion/aphelion; 0.5-h
// sampling, the same parabolic/linear refinement), seeded at the requested
// epoch instead of chained from J2000. Reproduces the window CSV's rows to
// 3e-9 d where the two overlap (measured 2026-09).
//
//   node tools/explore/scene-sample-events.cjs <centreYear> <halfSpanYears> [out]
//   default out: tools/explore/scene-sample-<centreYear>.local.json
//
// Read-only against the model. Consumer: scene-sample-check.cjs.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SG = require(path.join(ROOT, 'tools/lib/scene-graph.js'));
const C = require(path.join(ROOT, 'tools/lib/constants.js'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const Y0 = Number(process.argv[2]), HALF = Number(process.argv[3] || 200);
const OUT = process.argv[4] || path.join(__dirname, `scene-sample-${Y0}.local.json`);
if (!Number.isFinite(Y0)) { console.error('usage: scene-sample-events.cjs <centreYear> [halfSpanYears] [out]'); process.exit(2); }
const STEP = 0.5 / 24, RANGE = 96;
const decOf = (p) => 90 - p.dec * 180 / Math.PI;
const row = (type, idx, jd) => {
  const fp = SG.computeSunPositionFast(jd);
  return { type, idx, jd, ra: (fp.ra * 180 / Math.PI + 360) % 360, dec: decOf(fp), wa: fp.worldAngle, wob: fp.wobbleDistAU, dist: fp.distAU };
};
function extremum(approxJD, f, isMax) {
  let best = approxJD, bv = isMax ? -Infinity : Infinity; const s = [];
  for (let k = -RANGE; k <= RANGE; k++) { const jd = approxJD + k * STEP; const v = f(SG.computeSunPositionFast(jd)); s.push([jd, v]); if (isMax ? v > bv : v < bv) { bv = v; best = jd; } }
  const i = s.findIndex((x) => x[0] === best);
  if (i > 0 && i < s.length - 1) { const d = s[i - 1][1] - 2 * s[i][1] + s[i + 1][1]; if (Math.abs(d) > 1e-12) best = s[i][0] + (STEP / 2) * (s[i - 1][1] - s[i + 1][1]) / d; }
  return best;
}
function equinox(approxJD, asc) {
  let p1 = decOf(SG.computeSunPositionFast(approxJD - RANGE * STEP));
  for (let k = -RANGE + 1; k <= RANGE; k++) {
    const jd2 = approxJD + k * STEP, p2 = decOf(SG.computeSunPositionFast(jd2));
    if (asc ? (p1 < 0 && p2 >= 0) : (p1 >= 0 && p2 < 0)) return jd2 - STEP + (-p1 / (p2 - p1)) * STEP;
    p1 = p2;
  }
  return null;
}
const FIND = {
  VE: (a) => equinox(a, true), AE: (a) => equinox(a, false),
  SS: (a) => extremum(a, decOf, true), WS: (a) => extremum(a, decOf, false),
  PERI: (a) => extremum(a, (p) => p.wobbleDistAU, false), APH: (a) => extremum(a, (p) => p.wobbleDistAU, true),
};
// seed: a coarse half-day scan of one year around the epoch
const jd0 = DT.yearToJDDeepTime(Y0);
const scan = []; for (let d = -190; d <= 190; d += 0.5) { const p = SG.computeSunPositionFast(jd0 + d); scan.push([jd0 + d, decOf(p), p.wobbleDistAU]); }
const arg = (col, isMax) => scan.reduce((b, x) => ((isMax ? x[col] > b[col] : x[col] < b[col]) ? x : b))[0];
const cross = (asc) => { let best = null; for (let i = 1; i < scan.length; i++) { const a = scan[i - 1][1], b = scan[i][1]; if (asc ? (a < 0 && b >= 0) : (a >= 0 && b < 0)) { if (best === null || Math.abs(scan[i][0] - jd0) < Math.abs(best - jd0)) best = scan[i][0]; } } return best; };
const seed = { VE: cross(true), AE: cross(false), SS: arg(1, true), WS: arg(1, false), PERI: arg(2, false), APH: arg(2, true) };
const rows = [];
const yr = { VE: C.meanSolarYearDays, AE: C.meanSolarYearDays, SS: C.meanSolarYearDays, WS: C.meanSolarYearDays, PERI: C.meanAnomalisticYearDays, APH: C.meanAnomalisticYearDays };
for (const t of Object.keys(FIND)) {
  const c = FIND[t](seed[t]);
  if (c === null) { console.error(`seed failed for ${t}`); process.exit(1); }
  rows.push(row(t, 0, c));
  let prev = c, step = yr[t];
  for (let i = 1; i <= HALF; i++) { const j = FIND[t](prev + step); step = j - prev; prev = j; rows.push(row(t, i, j)); }
  prev = c; step = yr[t];
  for (let i = 1; i <= HALF; i++) { const j = FIND[t](prev - step); step = prev - j; prev = j; rows.push(row(t, -i, j)); }
}
rows.sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.idx - b.idx));
fs.writeFileSync(OUT, JSON.stringify({ centreYear: Y0, halfSpanYears: HALF, columns: 'type idx jdUT raDeg decDeg worldAngleDeg wobbleDistAU sunDistAU', rows: rows.map((r) => [r.type, r.idx, r.jd, r.ra, r.dec, r.wa, r.wob, r.dist]) }));
console.error(`epoch ${Y0}: ${rows.length} events → ${path.relative(ROOT, OUT)}`);
