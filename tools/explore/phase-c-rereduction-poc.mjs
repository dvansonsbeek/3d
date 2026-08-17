// PHASE C proof-of-concept — the differential contact-time re-reduction
// (plan §12i queue item 1; the pre-registered falsification test).
//
// For each Babylonian timed observation (Stephenson tables S01/S02/S04,
// years -800..-301):
//   1. identify the canon eclipse: year match + umbral type + night at
//      Babylon at the implied UT = jd_TD - DT_obs/86400 (the Moon is
//      anti-solar at a lunar eclipse, so sun-below-horizon is the
//      visibility proxy);
//   2. framework opposition TT for that eclipse (finder, the
//      canonGeometry gate convention: evTT = ev.jd +
//      deltaTSecondsAtJD(ev.jd)/86400);
//   3. re-reduced deltaT: DT_re = DT_obs + (evTT_ours - canonTT)*86400 —
//      the raw tablet local time cancels IDENTICALLY (it is theory-free),
//      and the umbral shadow-enlargement convention cancels with it (the
//      differential lives in greatest-times only);
//   4. per-century residuals (framework curve - obs, the
//      dtBandsByCentury sign convention) for BOTH the original and the
//      re-reduced DT, on the SAME identified subset;
//   5. compare against the PRE-REGISTERED column, read from the RECORDED
//      artifact - never recomputed.
//
// THE MIS-ID-INSENSITIVITY PROPERTY: for an ambiguous year (two visible
// candidates), the differential is nearly identical for either candidate
// (both sides move together) - ambiguous rows are kept when the
// candidates' shifts agree within 2 minutes.
//
// First run (51/75 identified): re-reduced century residuals
// +2.2/+8.8/-4.4/+6.0 min for -700/-600/-500/-400 vs the pre-registered
// +5/+4.8/-1.2/-5 - three of four centuries within ~4 min. Hardening
// before any verdict: per-century standard errors, the -800 bin
// (Babylonian year-straddle: allow +-1-yr candidates), the -400
// deviation, Stephenson weights. See the plan's Phase C entry.
//
//   node tools/explore/phase-c-rereduction-poc.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require2 = createRequire(join(ROOT, 'package.json'));
const DT = require2('./tools/lib/deep-time.js');

const model = createModel(DEFAULT_CONSTANTS);
const steph = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-stephenson-2016.json'), 'utf8'));
const canon = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-nasa.json'), 'utf8'));
const recorded = JSON.parse(readFileSync(join(ROOT, 'data/lunar-alignment-summary.json'), 'utf8'));
const D2R = Math.PI / 180;
const BABYLON = { lat: 32.5, lon: 44.4 };

const canonByYear = new Map();
for (const c of canon.entries) {
  const m = /^(-?\d+)/.exec(c.date);
  if (!m) continue;
  const y = parseInt(m[1], 10);
  if (!canonByYear.has(y)) canonByYear.set(y, []);
  canonByYear.get(y).push(c);
}

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

const obsSet = steph.entries.filter((e) =>
  /^S0[124]$/.test(e.source_table) && e.year >= -800 && e.year <= -301 && e.dt_observed_sec != null);
console.log(`observations in window: ${obsSet.length}`);

let identified = 0, ambiguous = 0, none = 0, noFinder = 0;
const rows = [];
for (const obs of obsSet) {
  const cands = (canonByYear.get(obs.year) || []).filter((c) => c.type_nasa !== 'N');
  const visible = cands.filter((c) => sunAltDeg(c.jd_TD - obs.dt_observed_sec / 86400) < 0);
  if (visible.length === 0) { none += 1; continue; }
  const shifts = [];
  for (const c of visible) {
    const evs = model.eclipse.findLunarInRange(c.jd_TD - 20, c.jd_TD + 20);
    let best = null, bestD = 2;
    for (const ev of evs) {
      const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
      const d = Math.abs(evTT - c.jd_TD);
      if (d < bestD) { best = evTT; bestD = d; }
    }
    if (best !== null) shifts.push((best - c.jd_TD) * 86400);
  }
  if (shifts.length === 0) { noFinder += 1; continue; }
  const spread = Math.max(...shifts) - Math.min(...shifts);
  if (visible.length > 1 && spread > 120) { ambiguous += 1; continue; }
  identified += 1;
  const shiftSec = shifts.reduce((s, v) => s + v, 0) / shifts.length;
  rows.push({ year: obs.year, dtObs: obs.dt_observed_sec, dtRe: obs.dt_observed_sec + shiftSec, shiftSec });
}
console.log(`identified ${identified} | ambiguous ${ambiguous} | no night candidate ${none} | no finder match ${noFinder}`);

const cents = {};
for (const r of rows) {
  const cent = String(Math.floor(r.year / 100) * 100);
  const b = cents[cent] ?? (cents[cent] = { n: 0, sObs: 0, sRe: 0, sFw: 0, sShift: 0 });
  b.n += 1; b.sObs += r.dtObs; b.sRe += r.dtRe; b.sShift += r.shiftSec;
  b.sFw += DT.meanDeltaTSecondsAtAge((2000 - r.year) / 1e6);
}

const pre = recorded.theoryDrift.predictedReducedResidualMinutes;
console.log('\ncentury |  n | old resid (min) | RE-REDUCED resid (min) | mean shift (min) | PRE-REGISTERED (min)');
for (const cent of Object.keys(cents).sort((a, b) => Number(a) - Number(b))) {
  const b = cents[cent];
  const oldMin = (b.sFw - b.sObs) / b.n / 60;
  const reMin = (b.sFw - b.sRe) / b.n / 60;
  console.log(`  ${cent} | ${String(b.n).padStart(2)} | ${oldMin.toFixed(1).padStart(14)} | ${reMin.toFixed(1).padStart(20)} | ${(b.sShift / b.n / 60).toFixed(1).padStart(15)} | ${pre[cent] !== undefined ? pre[cent] : '—'}`);
}
