// THE ANCIENT GEOMETRY SWEEPS — the two measurements that closed the
// "why are the ancient solar-eclipse paths off?" question (plan §12i).
//
// The audit-26 ancient rows show a NON-MONOTONIC miss pattern (modern
// arcsecond-exact; the ~1000 AD Cairo cluster 1,400–3,200 km off; Babylon
// −135 at 1,411 km; Thales −584 back at 237 km). Timing is excluded by
// construction (the audit's ±4h scan) and by Phase C. These sweeps test
// the two remaining PHYSICAL channels against the NASA lunar canon over
// ±2,400 years, ~200 events per 80-yr bin:
//
//  1. GAMMA SWEEP — our lunar-eclipse γ (= D_moon·sin β / R_E, signed) vs
//     canon γ: the sky cross-track channel (Moon node/latitude secular),
//     Earth-orientation-free. RESULT: flat to ±0.0004 γ ≈ ±3 km of path
//     latitude across the whole span. The ancient misses need Δγ ≈ 0.2 —
//     five hundred times more. EXONERATED.
//
//  2. AXIS SWEEP — our Moon declination at the canon's greatest instant vs
//     the canon's sub-lunar latitude (greatest_lat): the Earth-axis
//     channel (obliquity, equinox mapping, AND the Sun-dec secular — the
//     Moon at opposition sits at the anti-solar point ± β). RESULT: flat
//     to ±0.03° ≈ ±4 km. EXONERATED — this CONTRADICTS doc 103's
//     "antiquity Sun-secular" reading of the −135 residual.
//
// CONCLUSION BY ELIMINATION: the ancient "geographic" audit rows are
// EVENT-DATA questions (eclipse re-identification, site assumptions,
// record interpretation — the Cairo cluster's internal inconsistency,
// 120 km vs 3,220 km at the same observatory in the same generation, is
// the tell), not model physics. Follow-ups: doc 103 reinterpretation +
// a per-event attribution review (alternative-eclipse scans).
//
//   node tools/explore/ancient-gamma-axis-sweeps.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const model = createModel(DEFAULT_CONSTANTS);
const canon = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-nasa.json'), 'utf8'));
const R_E_KM = DEFAULT_CONSTANTS.bodyDiametersKm.earth / 2;
const D2R = Math.PI / 180;

const BINS = [];
for (let c = -2400; c <= 2400; c += 300) BINS.push(c);
const HALF = 40;

function parseLat(s) {
  const m = /^(\d+)([NS])$/.exec(s);
  if (!m) return null;
  return (m[2] === 'N' ? 1 : -1) * parseInt(m[1], 10);
}
function moonDecDeg(jdUT) {
  const lam = model.moon.lonDegAtJD(jdUT) * D2R;
  const bet = model.moon.betaDegAtJD(jdUT) * D2R;
  const eps = model.earth.obliquityDeg(model.time.yearFromJD(jdUT)) * D2R;
  return Math.asin(Math.sin(bet) * Math.cos(eps)
    + Math.cos(bet) * Math.sin(eps) * Math.sin(lam)) / D2R;
}
const stats = (a) => {
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / (a.length - 1));
  return { mean, se: sd / Math.sqrt(a.length), n: a.length };
};

const gSeries = [], lSeries = [];
for (const center of BINS) {
  const a = model.time.jdFromYear(center - HALF);
  const b = model.time.jdFromYear(center + HALF);
  const evs = model.eclipse.findLunarInRange(a, b);
  const inWin = canon.entries.filter((c2) => c2.jd_TD >= a - 1 && c2.jd_TD <= b + 1);
  const dg = [], dl = [];
  for (const ev of evs) {
    const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
    let best = null, bestD = 1;
    for (const c2 of inWin) {
      const d = Math.abs(c2.jd_TD - evTT);
      if (d < bestD) { best = c2; bestD = d; }
    }
    if (!best) continue;
    dg.push(ev.moonDistance_km * Math.sin(ev.beta * D2R) / R_E_KM - best.gamma);
    const lat = parseLat(best.greatest_lat);
    if (lat !== null) dl.push(moonDecDeg(best.jd_TD - best.delta_T_sec / 86400) - lat);
  }
  if (dg.length >= 5) gSeries.push({ center, ...stats(dg) });
  if (dl.length >= 5) lSeries.push({ center, ...stats(dl) });
}
const baseline = (series, from) => {
  const m = series.filter((s) => s.center >= from);
  return m.reduce((s, v) => s + v.mean, 0) / m.length;
};
const gBase = baseline(gSeries, 1500), lBase = baseline(lSeries, 1500);
console.log('bin    |   γ drift ×1000 (± SE)  ≈ km |  axis dLat deg (± SE)  ≈ km');
for (let i = 0; i < gSeries.length; i++) {
  const g = gSeries[i], l = lSeries[i];
  console.log(`${String(g.center).padStart(6)} | ${((g.mean - gBase) * 1000).toFixed(1).padStart(7)} ± ${(g.se * 1000).toFixed(1)}  ${((g.mean - gBase) * R_E_KM).toFixed(0).padStart(5)} | ${(l.mean - lBase).toFixed(3).padStart(8)} ± ${l.se.toFixed(3)}  ${((l.mean - lBase) * 111).toFixed(0).padStart(4)}`);
}
