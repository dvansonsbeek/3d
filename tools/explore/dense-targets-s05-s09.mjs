// ITEM 3 — THE DENSE-TARGET PROGRAMME (plan §12i item 3): the full timed
// corpus (S01/S02/S04 Babylonian, S05 Chinese, S07 Greek, S09 Arab —
// −800..+1280) through the Phase C differential machinery, asking two
// questions the sparse window could not:
//   Q1 (POWER): does eclipse-level density reach per-century σ below the
//       ΔT cycle contributions (200–550 s), the plan's 140–220 s goal?
//   Q2 (DISCRIMINATION): with that power, does the eclipse record PREFER
//       the shipped cycle stack out-of-sample — per-cycle ablation χ²
//       (full stack vs each cycle removed vs no cycles), on residuals the
//       1650–2017 fit window never saw?
// Method = the gate-ified phaseC section verbatim (differential
// DT_re = DT_obs + (frameworkTT − canonTT); night-at-site candidate
// screening with per-table observer sites — the site only disambiguates,
// the differential itself is site-free; ±1-yr straddle; 15-min
// mis-ID-insensitivity tolerance; weight null=1, 0 excluded =
// Stephenson's own unreliable class; century statistic = MEDIAN ±
// MAD-SE). S07's solar rows drop naturally at lunar identification.
//
//   node tools/explore/dense-targets-s05-s09.mjs
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
const D2R = Math.PI / 180;

// Observer sites per table — VISIBILITY SCREENING ONLY (the differential
// is site-free); a representative capital suffices for a night test.
const SITES = {
  S01: { lat: 32.5, lon: 44.4 },   // Babylon
  S02: { lat: 32.5, lon: 44.4 },   // Babylon
  S04: { lat: 32.5, lon: 44.4 },   // Babylon
  S05: { lat: 34.7, lon: 112.5 },  // Luoyang (Chinese capitals 34–35°N)
  S07: { lat: 31.2, lon: 29.9 },   // Alexandria
  S09: { lat: 33.3, lon: 44.4 },   // Baghdad
};

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
function sunAltDeg(jdUT, site) {
  const lam = model.eclipse.sunLonDegAtJD(jdUT) * D2R;
  const eps = model.earth.obliquityDeg(model.time.yearFromJD(jdUT)) * D2R;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
  const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
  const H = ((gmstDeg(jdUT) + site.lon) * D2R) - ra;
  return Math.asin(Math.sin(site.lat * D2R) * Math.sin(dec)
    + Math.cos(site.lat * D2R) * Math.cos(dec) * Math.cos(H)) / D2R;
}
const visible = (year, dtObs, site) => (canonByYear.get(year) || [])
  .filter((c) => c.type_nasa !== 'N')
  .filter((c) => sunAltDeg(c.jd_TD - dtObs / 86400, site) < 0);
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

// S07 EXCLUDED: its rows mix lunar and solar without a type marker (the
// 364 trio is Theon's SOLAR eclipse), and a solar row false-matches a
// nearby lunar canon event under year-based identification. Re-admitting
// S07 requires per-row typing from the paper's table text (n = 11).
const obsSet = steph.entries.filter((e) =>
  /^S0[12459]$/.test(e.source_table) && e.dt_observed_sec != null);
let identified = 0, straddled = 0, ambiguous = 0, dropped = 0, w0 = 0;
const rows = [];
for (const obs of obsSet) {
  const w = obs.weight === null || obs.weight === undefined ? 1 : obs.weight;
  if (w === 0) { w0 += 1; continue; }
  const site = SITES[obs.source_table];
  let cands = visible(obs.year, obs.dt_observed_sec, site);
  if (cands.length === 0) {
    cands = [...visible(obs.year - 1, obs.dt_observed_sec, site),
             ...visible(obs.year + 1, obs.dt_observed_sec, site)];
    if (cands.length > 0) straddled += 1;
  }
  const shifts = cands.map(shiftFor).filter((s) => s !== null);
  if (shifts.length === 0) { dropped += 1; continue; }
  const spread = Math.max(...shifts) - Math.min(...shifts);
  if (shifts.length > 1 && spread > 900) { ambiguous += 1; continue; }
  identified += 1;
  const shiftSec = shifts.reduce((s, v) => s + v, 0) / shifts.length;
  const fwSec = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
  rows.push({
    year: obs.year, table: obs.source_table,
    residSec: fwSec - (obs.dt_observed_sec + shiftSec),
  });
}
console.log(`corpus: ${obsSet.length} timed observations | identified ${identified} (${straddled} straddle) | ambiguous ${ambiguous} | dropped ${dropped} | weight-0 excluded ${w0}`);

// ── Q1: per-century density + power ──────────────────────────────────────
const CYC = {
  bond: DT.bondCycleDeltaTCorrection,
  hallstatt: DT.hallstattCycleDeltaTCorrection,
  jose5: DT.jose5CycleDeltaTCorrection,
  jose4: DT.jose4CycleDeltaTCorrection,
  resonator: DT.resonatorSwingDeltaTCorrection,
};
const cents = {};
for (const r of rows) {
  const c = String(Math.floor(r.year / 100) * 100);
  (cents[c] ?? (cents[c] = [])).push(r);
}
const stats = (vals) => {
  const v = vals.slice().sort((a, b) => a - b);
  const med = v[Math.floor(v.length / 2)];
  const mad = v.map((x) => Math.abs(x - med)).sort((a, b) => a - b)[Math.floor(v.length / 2)];
  return { med, se: 1.4826 * mad / Math.sqrt(v.length), n: v.length };
};
console.log('\nQ1 — per-century residuals vs the FULL framework curve (s):');
console.log('  century |  n | median ± SE (s) | cycle stack at century (s)');
const centKeys = Object.keys(cents).sort((a, b) => Number(a) - Number(b));
for (const c of centKeys) {
  const { med, se, n } = stats(cents[c].map((r) => r.residSec));
  const y = Number(c) + 50;
  const stack = Object.values(CYC).reduce((s, f) => s + f(y), 0);
  console.log(`  ${c.padStart(7)} | ${String(n).padStart(2)} | ${med.toFixed(0).padStart(6)} ± ${se.toFixed(0).padStart(4)} | ${stack.toFixed(0).padStart(6)}`);
}

// ── Q2: cycle-ablation discrimination (CE-era centuries, n ≥ 5) ─────────
// Removing cycle i from the curve: resid' = resid − cycle_i(year).
console.log('\nQ2 — out-of-sample discrimination, χ² = Σ (median/SE)² over centuries with n ≥ 5:');
const usable = centKeys.filter((c) => cents[c].length >= 5);
const variantChi2 = (removeFns) => {
  let chi2 = 0;
  for (const c of usable) {
    const vals = cents[c].map((r) => r.residSec - removeFns.reduce((s, f) => s + f(r.year), 0));
    const { med, se } = stats(vals);
    if (se > 0) chi2 += (med / se) ** 2;
  }
  return chi2;
};
console.log(`  centuries used: ${usable.join(', ')}`);
console.log(`  FULL stack        : χ² = ${variantChi2([]).toFixed(1)}`);
for (const [name, fn] of Object.entries(CYC)) {
  console.log(`  minus ${name.padEnd(10)}  : χ² = ${variantChi2([fn]).toFixed(1)}`);
}
console.log(`  NO cycles         : χ² = ${variantChi2(Object.values(CYC)).toFixed(1)}`);
