// THE ΔT OUT-OF-SAMPLE VALIDATION SUITE (reconstructed keeper) — the
// strongest positive evidence the cycle stack has: three tests in one.
//
//  1. RESIDUAL DIAGNOSTIC — the empirical CE-era deltaT (canon century
//     means) minus the PURE-TIDAL backbone, vs the shipped cycles'
//     prediction: the ~1,000-s arc (peak +459 s at 250 AD, trough
//     −513 s at 1050) is TRACKED in phase and amplitude across fifteen
//     centuries the fit never saw (the fit window is 1650–2017).
//  2. CYCLE ABLATION — each cycle's out-of-sample contribution: removing
//     Bond degrades RMS 78→268 s, resonator →188, Hallstatt →146
//     (all individually validated); the Joses are untestable at century
//     bins (~179-yr period averages out — their evidence stays the
//     fit-window coupled-pair audit).
//  3. RAW-MEDIEVAL CHECK (the spline-vs-sky control) — the same residual
//     against Stephenson's RAW S05–S09 observations: the smooth ~1,000-yr
//     "missing tone" the canon spline suggests does NOT exist coherently
//     in the raw data (sign flips between adjacent centuries = source
//     systematics). This is the control that stopped a spurious 5th
//     cycle — matching the fit campaign's own Eddy/Emp862 rollbacks.
//
//   node tools/explore/u2-dt-out-of-sample.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const DT = require2('/home/dennis/code/3d/tools/lib/deep-time.js');
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const canon = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-nasa.json'), 'utf8'));
const steph = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-stephenson-2016.json'), 'utf8'));
const START = 55.85417672145975;

const parts = {
  bond: (y) => DT.bondCycleDeltaTCorrection(y),
  hallstatt: (y) => DT.hallstattCycleDeltaTCorrection(y),
  jose5: (y) => DT.jose5CycleDeltaTCorrection(y),
  jose4: (y) => DT.jose4CycleDeltaTCorrection(y),
  resonator: (y) => DT.resonatorSwingDeltaTCorrection(y),
};
const names = Object.keys(parts);
const total = (y) => names.reduce((s, n) => s + parts[n](y), 0);
const fullAbs = (y) => START + DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6);
const pureAbs = (y) => fullAbs(y) - total(y);

// canon century means
const byYear = new Map();
for (const e of canon.entries) {
  const m = /^(-?\d+)/.exec(e.date);
  if (!m) continue;
  const y = parseInt(m[1], 10);
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(e.delta_T_sec);
}
const pts = [];
for (let c = 0; c <= 1600; c += 100) {
  const vals = [];
  for (let y = c; y < c + 100; y++) if (byYear.has(y)) vals.push(...byYear.get(y));
  if (!vals.length) continue;
  const m = vals.reduce((s, v) => s + v, 0) / vals.length;
  pts.push({ year: c + 50, resid: m - pureAbs(c + 50) });
}
const rms = (f) => {
  const r = pts.map((p) => p.resid - f(p.year));
  return Math.sqrt(r.reduce((s, v) => s + v * v, 0) / r.length);
};

console.log('1. RESIDUAL DIAGNOSTIC (out-of-sample era 50–1650 AD):');
console.log('   century | empirical resid vs pure tidal | cycles predict');
for (const p of pts) console.log(`     ${String(p.year).padStart(5)} | ${p.resid.toFixed(0).padStart(8)} | ${total(p.year).toFixed(0).padStart(8)}`);

console.log(`\n2. CYCLE ABLATION (RMS over the ${pts.length} out-of-sample centuries):`);
console.log(`   no cycles: ${rms(() => 0).toFixed(1)} s | FULL stack: ${rms(total).toFixed(1)} s`);
for (const drop of names) {
  const f = (y) => names.filter((n) => n !== drop).reduce((s, n) => s + parts[n](y), 0);
  console.log(`   minus ${drop.padEnd(10)}: ${rms(f).toFixed(1)} s`);
}

console.log('\n3. RAW-MEDIEVAL CHECK (spline-vs-sky; S05–S09 raw, weight>0):');
const ce = steph.entries.filter((e) => e.dt_observed_sec != null
  && /^S0[5-9]$/.test(e.source_table) && e.year >= 100 && e.year <= 1650
  && (e.weight === undefined || e.weight > 0));
console.log('   century | n | raw resid ± SE | cycles predict | misfit');
for (let c = 100; c <= 1600; c += 100) {
  const sel = ce.filter((e) => e.year >= c && e.year < c + 100);
  if (sel.length < 3) continue;
  const rs = sel.map((e) => e.dt_observed_sec - pureAbs(e.year));
  const m = rs.reduce((s, v) => s + v, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((s, v) => s + (v - m) ** 2, 0) / (rs.length - 1));
  const pred = total(c + 50);
  console.log(`     ${String(c + 50).padStart(5)} | ${String(sel.length).padStart(3)} | ${m.toFixed(0).padStart(6)} ± ${(sd / Math.sqrt(sel.length)).toFixed(0).padStart(3)} | ${pred.toFixed(0).padStart(6)} | ${(m - pred).toFixed(0).padStart(6)}`);
}
