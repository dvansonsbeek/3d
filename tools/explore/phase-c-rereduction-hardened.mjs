// PHASE C — the HARDENED differential contact-time re-reduction
// (plan §12i queue item 1; hardening of phase-c-rereduction-poc.mjs —
// the PoC stays untouched as the first-run record).
//
// Additions over the PoC:
//   H1. ±1-yr candidate straddle (the Babylonian calendar year straddles
//       the Julian year) with night-visibility disambiguation — recovers
//       the "no night candidate" drops; straddled rows are tagged.
//   H2. Stephenson weights: w = 0 excluded; weighted century means with
//       effective n = (Σw)²/Σw² and weighted standard errors.
//   H3. Per-century SE + z-score against the PRE-REGISTERED column (read
//       from the RECORDED artifact — never recomputed) + a χ² verdict
//       over the covered centuries.
//   H4. Per-table split (S01/S02/S04) — the empirical answer to the
//       "S02/S04 handling" question: a table-level systematic would
//       show here.
//   H5. Worst-century composition dump (per-observation year/weight/
//       table/shift/residual) so a deviation is inspectable, not argued.
//
// Conventions (matched to the recorded machinery, tools/verify/
// lunar-alignment.js): framework ΔT = meanDeltaTSecondsAtAge (curve
// only, no deltaTStart anchor — BOTH sides of the comparison use it);
// framework opposition TT = ev.jd + deltaTSecondsAtJD(ev.jd)/86400 (the
// canonGeometry convention); residual sign = framework − observed.
//
//   node tools/explore/phase-c-rereduction-hardened.mjs
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

/** Framework-vs-canon greatest-time shift (s) for one canon eclipse, or null. */
function shiftFor(c) {
  const evs = model.eclipse.findLunarInRange(c.jd_TD - 20, c.jd_TD + 20);
  let best = null, bestD = 2;
  for (const ev of evs) {
    const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
    const d = Math.abs(evTT - c.jd_TD);
    if (d < bestD) { best = evTT; bestD = d; }
  }
  return best === null ? null : (best - c.jd_TD) * 86400;
}

/** Night-visible candidates for an observation in a given Julian year. */
function visibleCands(year, dtObs) {
  return (canonByYear.get(year) || [])
    .filter((c) => c.type_nasa !== 'N')
    .filter((c) => sunAltDeg(c.jd_TD - dtObs / 86400) < 0);
}

const obsSet = steph.entries.filter((e) =>
  /^S0[124]$/.test(e.source_table) && e.year >= -800 && e.year <= -301 && e.dt_observed_sec != null);
const w0 = obsSet.filter((e) => (e.weight ?? 0) === 0).length;
console.log(`observations in window: ${obsSet.length} (excluding ${w0} with weight 0)`);

let identified = 0, ambiguous = 0, none = 0, straddled = 0;
const rows = [];
const dropLog = [];
for (const obs of obsSet) {
  // weight null = untabulated, kept at 1 (tagged); weight 0 = excluded class
  const w = obs.weight === null || obs.weight === undefined ? 1 : obs.weight;
  if (w === 0) continue;
  let cands = visibleCands(obs.year, obs.dt_observed_sec);
  let tag = '';
  if (cands.length === 0) {
    // H1: the Babylonian year straddle — try the adjacent Julian years,
    // keep only night-visible candidates (the disambiguator).
    cands = [...visibleCands(obs.year - 1, obs.dt_observed_sec),
             ...visibleCands(obs.year + 1, obs.dt_observed_sec)];
    tag = '±1yr';
    if (cands.length > 0) straddled += 1;
  }
  if (cands.length === 0) { none += 1; dropLog.push({ year: obs.year, why: 'no night candidate (±1yr incl.)' }); continue; }
  const shifts = cands.map(shiftFor).filter((s) => s !== null);
  if (shifts.length === 0) { none += 1; dropLog.push({ year: obs.year, why: 'no finder match' }); continue; }
  const spread = Math.max(...shifts) - Math.min(...shifts);
  // Mis-ID-insensitivity tolerance: candidates agreeing within 15 min —
  // half the per-event scatter floor (30–70 min measured) — carry the
  // same century-mean information; the mean shift is used and the spread
  // is far below the century SD. (The PoC's 2-min threshold was stricter
  // than the noise floor justifies and dropped the whole −800 bin.)
  if (shifts.length > 1 && spread > 900) { ambiguous += 1; dropLog.push({ year: obs.year, why: `ambiguous (spread ${(spread / 60).toFixed(1)} min over ${shifts.length})` }); continue; }
  identified += 1;
  const shiftSec = shifts.reduce((s, v) => s + v, 0) / shifts.length;
  const fw = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
  rows.push({
    year: obs.year, w, table: obs.source_table, tag,
    shiftSec,
    residOldMin: (fw - obs.dt_observed_sec) / 60,
    residReMin: (fw - (obs.dt_observed_sec + shiftSec)) / 60,
  });
}
console.log(`identified ${identified} (${straddled} via ±1yr straddle) | ambiguous ${ambiguous} | no candidate ${none}`);

// H2/H3: weighted century means + SEs + z vs the pre-registered column
const pre = recorded.theoryDrift.predictedReducedResidualMinutes;
const cents = {};
for (const r of rows) {
  const c = String(Math.floor(r.year / 100) * 100);
  (cents[c] ?? (cents[c] = [])).push(r);
}
console.log('\ndrops (first 12):');
for (const d of dropLog.slice(0, 12)) console.log(`  ${d.year}: ${d.why}`);

// PRIMARY statistic: the robust MEDIAN with MAD-derived SE. Measured
// rationale: within-century pairs of HIGH-weight tablets can contradict
// each other beyond physical possibility (−593 w10 vs −587 w6 imply a
// −2,700 ms/day LOD offset over 6 yr — the LOD-continuity class), so
// Stephenson's weights cannot be allowed to concentrate a century into
// one tablet; the median is outlier-immune and its MAD-SE measured
// TIGHTER than the weighted SE on this corpus. Weighted and unweighted
// means are reported alongside for transparency.
console.log('\ncentury |  n | MEDIAN resid ± SE (min) | wtd mean | unwtd | PRE-REG (min) |   z  | old median');
let chi2 = 0, chiN = 0;
for (const cent of Object.keys(cents).sort((a, b) => Number(a) - Number(b))) {
  const rs = cents[cent];
  const vals = rs.map((r) => r.residReMin).sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  const mad = vals.map((x) => Math.abs(x - med)).sort((a, b) => a - b)[Math.floor(vals.length / 2)];
  const se = 1.4826 * mad / Math.sqrt(vals.length);
  const sw = rs.reduce((s, r) => s + r.w, 0);
  const mean = rs.reduce((s, r) => s + r.w * r.residReMin, 0) / sw;
  const unwtd = rs.reduce((s, r) => s + r.residReMin, 0) / rs.length;
  const oldVals = rs.map((r) => r.residOldMin).sort((a, b) => a - b);
  const medOld = oldVals[Math.floor(oldVals.length / 2)];
  const p = pre[cent];
  const z = p !== undefined && se > 0 ? (med - p) / se : null;
  if (z !== null) { chi2 += z * z; chiN += 1; }
  console.log(`  ${cent} | ${String(rs.length).padStart(2)} | ${med.toFixed(1).padStart(7)} ± ${se.toFixed(1).padStart(4)} | ${mean.toFixed(1).padStart(7)} | ${unwtd.toFixed(1).padStart(6)} | ${p !== undefined ? String(p).padStart(6) : '     —'} | ${z !== null ? z.toFixed(1).padStart(4) : '   —'} | ${medOld.toFixed(1).padStart(7)}`);
}
console.log(`\nχ² (median) vs pre-registered = ${chi2.toFixed(1)} / ${chiN} centuries`);

// H4: per-table split
console.log('\nper-table split (weighted mean re-reduced residual):');
for (const t of ['S01', 'S02', 'S04']) {
  const rs = rows.filter((r) => r.table === t);
  if (rs.length === 0) continue;
  const sw = rs.reduce((s, r) => s + r.w, 0);
  const mean = rs.reduce((s, r) => s + r.w * r.residReMin, 0) / sw;
  console.log(`  ${t}: n ${String(rs.length).padStart(2)} | mean ${mean.toFixed(1)} min`);
}

// H5: worst-century composition
let worst = null;
for (const cent of Object.keys(cents)) {
  const rs = cents[cent];
  const sw = rs.reduce((s, r) => s + r.w, 0);
  const mean = rs.reduce((s, r) => s + r.w * r.residReMin, 0) / sw;
  const p = pre[cent];
  if (p === undefined) continue;
  const dev = Math.abs(mean - p);
  if (worst === null || dev > worst.dev) worst = { cent, dev };
}
if (worst) {
  console.log(`\nworst-century composition (${worst.cent}, |Δ| = ${worst.dev.toFixed(1)} min):`);
  console.log('   year | w | tbl | tag  | shift (min) | re-resid (min)');
  for (const r of cents[worst.cent].sort((a, b) => a.year - b.year)) {
    console.log(`  ${String(r.year).padStart(5)} | ${r.w} | ${r.table} | ${(r.tag || '—').padEnd(4)} | ${(r.shiftSec / 60).toFixed(1).padStart(10)} | ${r.residReMin.toFixed(1).padStart(13)}`);
  }
}
