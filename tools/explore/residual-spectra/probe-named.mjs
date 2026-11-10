// Plan 32 — direct probes behind the classifier's readings.
//  A. The Sun vs Horizons at NAMED argument frequencies, fitted directly (weighted LS of a cos/sin
//     pair, floating mean) in three dense 300-yr windows at the cache's 10-day cadence: the amplitude
//     and phase of each named term's RESIDUAL, so "the same term, drifting in phase" can be told from
//     "a term the model lacks" — and the unidentified cardinal doublet (6.399 / 6.424 yr yearly-
//     sampled) at its possible true periods.
//  B. The lunar canon: the timing residual against the canon's own gamma (the Moon's least distance
//     from the shadow axis) — a linear dependence is an EVENT-DEFINITION difference (greatest eclipse
//     vs opposition), not lunar theory — and the residual in DYNAMICAL time (the canon's TD instant
//     against the model's TT), which is free of both ΔT conventions.
//   node tools/explore/residual-spectra/probe-named.mjs [out.json]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { lsFitAtOmega, analyseSeries } from './spectrum.mjs';
import { sunResidualRows } from './series-sun.mjs';
import { model } from './series.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = process.argv[2] || null;
const YEAR = 365.25;
const P = { D: 29.530588853, Mp: 27.554549878, F: 27.212220817, M: 365.259636, L: 365.256363, V: 224.70069, Ma: 686.97985, J: 4332.589, S: 10759.22, Om: 6798.38 };
const f = Object.fromEntries(Object.entries(P).map(([k, d]) => [k, YEAR / d]));
const TROP = YEAR / 365.2422;   // the cardinal instants' sampling comb, cycles per Julian year

// ── A. the Sun ────────────────────────────────────────────────────────────────────────────────
const NAMED = [
  ['D (the barycentre term, 29.53 d)', f.D], ['D − M′ (411.8 d)', f.D - f.Mp], ['D + M′', f.D + f.Mp], ['D − M', f.D - f.M], ['D + M', f.D + f.M], ['2D', 2 * f.D], ['M′ (27.55 d)', f.Mp],
  ['annual (M)', f.M], ['semi-annual (2M)', 2 * f.M],
  ['V − E (1.599 yr)', f.V - f.L], ['2V − 2E (0.799 yr)', 2 * (f.V - f.L)], ['2V − 3E (3.98 yr)', Math.abs(2 * f.V - 3 * f.L)], ['3V − 4E (1.141 yr)', Math.abs(3 * f.V - 4 * f.L)], ['3V − 5E (8.10 yr)', Math.abs(3 * f.V - 5 * f.L)], ['3V − 3E', 3 * (f.V - f.L)],
  ['E − J (1.092 yr)', f.L - f.J], ['2E − 2J', 2 * (f.L - f.J)], ['J (11.86 yr)', f.J], ['2E − 2Mars (15.8 yr alias class)', Math.abs(2 * f.L - 2 * f.Ma)], ['E − Mars (2.135 yr)', f.L - f.Ma],
  ['the lunar node Ω (18.61 yr)', f.Om],
  // the cardinal doublet's possible true periods: f_obs, f_obs + comb, comb − f_obs
  ['doublet a as sampled (6.3988 yr)', 1 / 6.3988], ['doublet a + 1/yr (0.8648 yr)', 1 / 6.3988 + TROP], ['1/yr − doublet a (1.1852 yr)', TROP - 1 / 6.3988],
  ['doublet b as sampled (6.4245 yr)', 1 / 6.4245], ['doublet b + 1/yr (0.8653 yr)', 1 / 6.4245 + TROP], ['1/yr − doublet b (1.1843 yr)', TROP - 1 / 6.4245],
];
console.log('A. The Sun − Horizons at named arguments: residual amplitude (″) and phase (°) per dense 300-yr window');
const rows = sunResidualRows();
const windows = [[-2500, -2200], [-400, -100], [1700, 2000]];
const sunTable = {};
const header = `   ${'argument'.padEnd(40)} period (yr)  ${windows.map((w) => `${String(w[0]).padStart(6)}…${String(w[1]).padEnd(6)}`.padEnd(22)).join('')}`;
console.log(header);
const sel = windows.map(([a, b]) => { const r = rows.filter((x) => x.t >= a && x.t < b); return { t: r.map((x) => x.t), y: r.map((x) => x.y), w: r.map(() => 1) }; });
for (const [label, fr] of NAMED) {
  const cells = sel.map((s) => { const fit = lsFitAtOmega(s.t, s.y, s.w, 2 * Math.PI * fr); return { amp: fit.amplitude, phase: Math.atan2(fit.c, fit.b) * 180 / Math.PI }; });
  sunTable[label] = { periodYears: 1 / fr, windows: cells };
  console.log(`   ${label.padEnd(40)} ${(1 / fr).toFixed(5).padStart(10)}   ${cells.map((c) => `${c.amp.toFixed(3).padStart(6)}″ ${c.phase.toFixed(0).padStart(5)}°`.padEnd(22)).join('')}`);
}
console.log(`   (window rms: ${sel.map((s) => Math.sqrt(s.y.reduce((a, v) => a + v * v, 0) / s.y.length).toFixed(3)).join(' / ')} ″)`);

// ── B. the lunar canon ────────────────────────────────────────────────────────────────────────
console.log('\nB. The lunar canon: the timing residual against gamma, and in dynamical time');
const m = model();
const canon = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'lunar-eclipses-nasa.json'), 'utf8'));
const events = [];
for (let yr = -1999; yr < 3000; yr += 100) events.push(...m.eclipse.findLunarInRange(m.time.jdFromYear(yr), m.time.jdFromYear(Math.min(yr + 100, 3001))));
events.sort((x, y) => x.jd - y.jd);
const jdStart = m.time.jdFromYear(-1999), jdEnd = m.time.jdFromYear(3001);
const nasa = canon.entries.filter((e) => e.jd >= jdStart && e.jd <= jdEnd);
const used = new Uint8Array(nasa.length);
const bsearch = (jd) => { let lo = 0, hi = nasa.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (nasa[mid].jd < jd) lo = mid + 1; else hi = mid; } return lo; };
const BRIDGE_DAYS = m.eclipse.ttBridgeSeconds / 86400;
const ttOf = (jdUT) => { const jb = jdUT + BRIDGE_DAYS; return jb + m.eclipse.deltaTSecondsAtJD(jb) / 86400; };
const pairs = [];
for (const ev of events) {
  const i = bsearch(ev.jd); let best = -1, bestD = Infinity;
  for (let k = -1; k <= 1; k++) { const j = i + k; if (j < 0 || j >= nasa.length || used[j]) continue; const d = Math.abs(nasa[j].jd - ev.jd); if (d < bestD) { bestD = d; best = j; } }
  if (best >= 0 && bestD * 1440 <= 180) { used[best] = 1; const n = nasa[best]; pairs.push({ t: 2000 + (ev.jd - 2451545) / 365.25, dUT: (n.jd - ev.jd) * 1440, dTD: (n.jd_TD - ttOf(ev.jd)) * 1440, gamma: n.gamma, type: n.type }); }
}
const stat = (a) => { const mean = a.reduce((s, v) => s + v, 0) / a.length; return { mean, sd: Math.sqrt(a.reduce((s, v) => s + (v - mean) * (v - mean), 0) / a.length) }; };
const regress = (x, y) => { const mx = stat(x).mean, my = stat(y).mean; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); } const slope = sxy / sxx; return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy) }; };
const dUT = pairs.map((p) => p.dUT), dTD = pairs.map((p) => p.dTD), gam = pairs.map((p) => p.gamma);
console.log(`   ${pairs.length} matched eclipses; residual canon − model: UT ${stat(dUT).mean.toFixed(2)} ± ${stat(dUT).sd.toFixed(2)} min; dynamical time ${stat(dTD).mean.toFixed(2)} ± ${stat(dTD).sd.toFixed(2)} min`);
const rg = regress(gam, dTD);
console.log(`   dynamical-time residual against gamma: slope ${rg.slope.toFixed(3)} min per unit gamma, r = ${rg.r.toFixed(3)}; against |gamma|: r = ${regress(gam.map(Math.abs), dTD).r.toFixed(3)}`);
const corrected = dTD.map((v, i) => v - (rg.intercept + rg.slope * gam[i]));
console.log(`   after the linear gamma term: ${stat(corrected).sd.toFixed(2)} min sd (from ${stat(dTD).sd.toFixed(2)})`);
const lunar = {};
for (const [id, y] of [['lunar-canon-TD', dTD], ['lunar-canon-TD-gamma-removed', corrected]]) {
  const a = analyseSeries({ t: pairs.map((p) => p.t), y, w: pairs.map(() => 1), surrogates: 300, label: id, oversample: 4, fMaxFactor: Math.min(1, (1 / 1) / (0.5 / 0.41)) });
  lunar[id] = a;
  console.log(`\n   == ${id}  n ${a.n}  rms ${a.rms.toFixed(3)} min  AR(1) ρ ${a.ar1.rho.toFixed(3)}; floor p99 ${a.floor.p99.toFixed(4)} (AR1) ${a.floorWhite.p99.toFixed(4)} (white); ${a.candidates.length} line(s) above the AR(1) floor`);
  for (const c of (a.candidates.length ? a.candidates : a.peaks).slice(0, 10)) console.log(`      ${c.period.toFixed(4).padStart(10)} yr  amp ${c.amplitude.toFixed(3)} min  power/AR1 ${(c.power / a.floor.p99).toFixed(2)}  halves ${c.amplitudeFirstHalf.toFixed(2)} / ${c.amplitudeSecondHalf.toFixed(2)}  ${c.standsInBothHalves && c.standsInInterior ? 'stands' : 'unstable'}`);
}
if (out) { writeFileSync(out, JSON.stringify({ sunTable, windows, lunar: { n: pairs.length, gammaRegression: rg, sdTD: stat(dTD).sd, sdAfterGamma: stat(corrected).sd, analyses: lunar } })); console.log(`\nwritten ${out}`); }
