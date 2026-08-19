// STACK-COMPOSITION EXPLORATION — the follow-up question item 3 opened
// ("tune or extend the ΔT stack?"). Characterization only; no stack changes.
//
// VERDICT (measured; recorded in docs/102 "The residual structure is not
// Earth rotation"): NEITHER tune nor extend.
//  A. Attribution: our curve and Stephenson's own spline agree to
//     −6..−103 s per century, yet BOTH miss the timed-lunar observations
//     by the same −1,200..+500 s century medians — the structure is
//     corpus signal both models miss, not a defect of our curve.
//  B. Physical vetoes: (1) the century medians swing ±600 s century to
//     century (−500: −1,198 → −400: −627 → −300: −1,222), which no real
//     ΔT can do (LOD-continuity — it would need ~16 ms/day excursions
//     flipping sign per century); (2) the periodogram's best lattice tone
//     (~8H/2300 ≈ 1,165 yr, amp 430 s, Δχ² 22) implies a 6.4 ms LOD
//     amplitude — above the ~4 ms millennial bound. So the residual
//     structure is observation-class systematics (per-era/per-source
//     reduction conventions), with a century-correlated floor ~±600 s.
//  C. The shape-regression "tunings" are the same systematics projecting
//     onto slow shapes: the corpus "wants" Hallstatt ×3.8 and Joses ×4–5
//     (instantly unphysical — they'd smash the LOD bound), which
//     reclassifies the resonator's k = −0.65 ± 0.19 as the same
//     noise-class artifact, not evidence. The ablation validations
//     (resonator, Bond — shape NECESSITY across many centuries) are
//     robust to this in a way amplitude-tuning is not.
//
// Sections:
//  A. Per-century medians of (framework − obs_re) vs (stephensonSpline −
//     obs_re) and (framework − spline at midpoints).
//  B. Lattice periodogram: weighted LSQ of mean + A·cos + B·sin per 8H/n
//     divisor (periods ~250–4200 yr) on per-observation residuals, with
//     each tone's implied LOD amplitude against the ~4 ms bound.
//     (Characterization only — the whitelist/fitting disciplines forbid
//     shipping anything from this scan.)
//  C. Shipped-cycle shape regression: coefficient of each cycle's shape
//     against the residual (≈ −1 "remove", ≈ 0 indifferent, > 0 larger).
//
// Same corpus/machinery as the gate's denseTargets section
// (tools/verify/lunar-alignment.js): S01/S02/S04/S05/S09, S07 excluded
// (unmarked lunar/solar mix), null weight → 1, ±1-yr straddle, 900 s
// identification tolerance.
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require2 = createRequire(join(ROOT, 'package.json'));
const DT = require2('./tools/lib/deep-time.js');
const C = require2('./tools/lib/constants.js');
const { stephensonDeltaT } = require2('@essrt/physics/reference/published-curves');

const model = createModel(DEFAULT_CONSTANTS);
const steph = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-stephenson-2016.json'), 'utf8'));
const stephPoly = JSON.parse(readFileSync(join(ROOT, 'public/input/stephenson-2016-deltaT-polynomial.json'), 'utf8'));
const spline = (y) => stephensonDeltaT(y, stephPoly);
const canon = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-nasa.json'), 'utf8'));
const D2R = Math.PI / 180;
const SITES = {
  S01: { lat: 32.5, lon: 44.4 }, S02: { lat: 32.5, lon: 44.4 },
  S04: { lat: 32.5, lon: 44.4 }, S05: { lat: 34.7, lon: 112.5 },
  S09: { lat: 33.3, lon: 44.4 },
};
const canonByYear = new Map();
for (const c of canon.entries) {
  const m = /^(-?\d+)/.exec(c.date);
  if (!m) continue;
  const y = parseInt(m[1], 10);
  if (!canonByYear.has(y)) canonByYear.set(y, []);
  canonByYear.get(y).push(c);
}
const gmstDeg = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  return ((280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360 + 360) % 360;
};
const sunAltDeg = (jdUT, site) => {
  const lam = model.eclipse.sunLonDegAtJD(jdUT) * D2R;
  const eps = model.earth.obliquityDeg(model.time.yearFromJD(jdUT)) * D2R;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
  const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
  const H = ((gmstDeg(jdUT) + site.lon) * D2R) - ra;
  return Math.asin(Math.sin(site.lat * D2R) * Math.sin(dec) + Math.cos(site.lat * D2R) * Math.cos(dec) * Math.cos(H)) / D2R;
};
const visible = (year, dtObs, site) => (canonByYear.get(year) || [])
  .filter((c) => c.type_nasa !== 'N')
  .filter((c) => sunAltDeg(c.jd_TD - dtObs / 86400, site) < 0);
const shiftFor = (c) => {
  const evs = model.eclipse.findLunarInRange(c.jd_TD - 20, c.jd_TD + 20);
  let best = null, bestD = 2;
  for (const ev of evs) {
    const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
    const d = Math.abs(evTT - c.jd_TD);
    if (d < bestD) { best = evTT; bestD = d; }
  }
  return best === null ? null : (best - c.jd_TD) * 86400;
};

const rows = [];
for (const obs of steph.entries.filter((e) => /^S0[12459]$/.test(e.source_table) && e.dt_observed_sec != null)) {
  const w = obs.weight === null || obs.weight === undefined ? 1 : obs.weight;
  if (w === 0) continue;
  const site = SITES[obs.source_table];
  let cands = visible(obs.year, obs.dt_observed_sec, site);
  if (cands.length === 0) cands = [...visible(obs.year - 1, obs.dt_observed_sec, site), ...visible(obs.year + 1, obs.dt_observed_sec, site)];
  const shifts = cands.map(shiftFor).filter((s) => s !== null);
  if (shifts.length === 0) continue;
  if (shifts.length > 1 && Math.max(...shifts) - Math.min(...shifts) > 900) continue;
  const shiftSec = shifts.reduce((s, v) => s + v, 0) / shifts.length;
  const dtRe = obs.dt_observed_sec + shiftSec;
  rows.push({
    year: obs.year,
    residFw: DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6) - dtRe,
    residSp: (spline(obs.year) ?? NaN) - dtRe,
  });
}
console.log(`rows: ${rows.length}`);

// per-century scatter → per-row sigma estimate (century MAD), for weighting
const cents = {};
for (const r of rows) {
  const c = Math.floor(r.year / 100) * 100;
  (cents[c] ?? (cents[c] = [])).push(r);
}
const centSig = {};
for (const [c, rs] of Object.entries(cents)) {
  const v = rs.map((r) => r.residFw).sort((a, b) => a - b);
  const med = v[Math.floor(v.length / 2)];
  const mad = v.map((x) => Math.abs(x - med)).sort((a, b) => a - b)[Math.floor(v.length / 2)];
  centSig[c] = Math.max(300, 1.4826 * mad);   // floor 300 s
}
for (const r of rows) r.sig = centSig[Math.floor(r.year / 100) * 100];

// A. attribution table
console.log('\nA. per-century medians (s): fw−obs | spline−obs | fw−spline(at midpoint)');
for (const c of Object.keys(cents).map(Number).sort((a, b) => a - b)) {
  const rs = cents[c];
  if (rs.length < 5) continue;
  const med = (vals) => vals.slice().sort((a, b) => a - b)[Math.floor(vals.length / 2)];
  const mFw = med(rs.map((r) => r.residFw));
  const mSp = med(rs.map((r) => r.residSp));
  console.log(`  ${String(c).padStart(5)} | n ${String(rs.length).padStart(2)} | ${mFw.toFixed(0).padStart(6)} | ${mSp.toFixed(0).padStart(6)} | ${(DT.meanDeltaTSecondsAtAge((2000 - (c + 50)) / 1e6) - (spline(c + 50) ?? NaN)).toFixed(0).padStart(6)}`);
}

// B. lattice periodogram (weighted LSQ per divisor) on residFw
const H = C.H;
const wls = (period) => {
  const om = 2 * Math.PI / period;
  let Scc = 0, Sss = 0, Ssc = 0, Sc = 0, Ss = 0, Sy = 0, Syc = 0, Sys = 0, S1 = 0;
  for (const r of rows) {
    const w = 1 / (r.sig * r.sig);
    const co = Math.cos(om * r.year), si = Math.sin(om * r.year);
    Scc += w * co * co; Sss += w * si * si; Ssc += w * si * co;
    Sc += w * co; Ss += w * si; Sy += w * r.residFw; Syc += w * r.residFw * co; Sys += w * r.residFw * si; S1 += w;
  }
  // solve [S1 Sc Ss; Sc Scc Ssc; Ss Ssc Sss] [m A B] = [Sy Syc Sys]
  const M = [[S1, Sc, Ss], [Sc, Scc, Ssc], [Ss, Ssc, Sss]];
  const b = [Sy, Syc, Sys];
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let j = i + 1; j < 3; j++) {
      const f = M[j][i] / M[i][i];
      for (let k = i; k < 3; k++) M[j][k] -= f * M[i][k];
      b[j] -= f * b[i];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < 3; k++) s -= M[i][k] * x[k]; x[i] = s / M[i][i]; }
  let chi0 = 0, chi1 = 0;
  for (const r of rows) {
    const w = 1 / (r.sig * r.sig);
    const fit = x[0] + x[1] * Math.cos(om * r.year) + x[2] * Math.sin(om * r.year);
    chi0 += w * r.residFw * r.residFw;
    chi1 += w * (r.residFw - fit) ** 2;
  }
  return { amp: Math.hypot(x[1], x[2]), dChi2: chi0 - chi1 };
};
console.log('\nB. lattice periodogram (8H/n; period 250–4200 yr): top Δχ² divisors');
const results = [];
for (let n = Math.ceil(8 * H / 4200); n <= Math.floor(8 * H / 250); n++) {
  const period = 8 * H / n;
  const { amp, dChi2 } = wls(period);
  results.push({ n, period, amp, dChi2 });
}
results.sort((a, b) => b.dChi2 - a.dChi2);
for (const r of results.slice(0, 10)) {
  // a ΔT tone A·sin(2πt/P) implies an LOD amplitude of A·2π/(P·365.25) s/day
  const lodMs = r.amp * 2 * Math.PI / (r.period * 365.25) * 1000;
  console.log(`  8H/${r.n} = ${r.period.toFixed(0).padStart(5)} yr | amp ${r.amp.toFixed(0).padStart(4)} s | Δχ² ${r.dChi2.toFixed(1)} | implied LOD amp ${lodMs.toFixed(1)} ms (millennial bound ~4 ms)`);
}
console.log('  reference — shipped cycle divisors: bond 8H/1830=1466 | hallstatt 8H/1104=2430 | jose5 8H/2989=898 | jose4 8H/3749=715 | resonator 8H/685=3916');

// C. shipped-cycle shape regression (coefficient on each cycle's shape)
console.log('\nC. shipped-cycle shape coefficients (0 = indifferent, −1 = remove, +k = scale up):');
const CYC = {
  bond: DT.bondCycleDeltaTCorrection,
  hallstatt: DT.hallstattCycleDeltaTCorrection,
  jose5: DT.jose5CycleDeltaTCorrection,
  jose4: DT.jose4CycleDeltaTCorrection,
  resonator: DT.resonatorSwingDeltaTCorrection,
};
for (const [name, fn] of Object.entries(CYC)) {
  let Sxx = 0, Sxy = 0, Sx = 0, Sy = 0, S1 = 0;
  for (const r of rows) {
    const w = 1 / (r.sig * r.sig);
    const x = fn(r.year);
    Sxx += w * x * x; Sxy += w * x * r.residFw; Sx += w * x; Sy += w * r.residFw; S1 += w;
  }
  const det = S1 * Sxx - Sx * Sx;
  const k = (S1 * Sxy - Sx * Sy) / det;
  const seK = Math.sqrt(S1 / det);
  console.log(`  ${name.padEnd(10)}: k = ${k.toFixed(2).padStart(6)} ± ${seK.toFixed(2)}`);
}
