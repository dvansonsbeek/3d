// Plan 32 — series 3 (the paleo anchors), 5 (the Sun vs Horizons: yearly means + two 300-yr windows
// at the 10-d cadence), 6 (the lunar canon's timings) and 8 (the cardinal instants vs Horizons).
//   node tools/explore/residual-spectra/run-rest.mjs [out.json] [--surrogates N] [--which paleo|sun|lunar|cardinal|all]

import { writeFileSync } from 'node:fs';
import { analyseSeries } from './spectrum.mjs';
import { seriesPaleo } from './series-paleo.mjs';
import { sunResidualRows, seriesSunYearly, seriesSunWindow, seriesCardinal } from './series-sun.mjs';
import { seriesLunarCanon } from './series-lunar.mjs';

const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const nSur = Number(arg('--surrogates', 100)), which = arg('--which', 'all');

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
function report(a, series) {
  console.log(`\n== ${a.label}  n ${a.n}  span ${fmt(a.tMin, 1)}…${fmt(a.tMax, 1)}  rms ${fmt(a.rms, 4)} ${series.meta.unit}${a.trend ? ` after a linear trend (raw rms ${fmt(a.rmsRaw, 4)}; slope ${a.trend.slope.toExponential(3)} per unit t)` : ''}  AR(1) ρ ${fmt(a.ar1.rho, 3)} τ ${fmt(a.ar1.tau, 2)}`);
  console.log(`   grid ${a.grid.nFreq} freqs, periods ${fmt(1 / a.grid.fMax, 3)} … ${fmt(1 / a.grid.fMin, 1)} (oversample ${a.grid.oversample}); floor p99 ${fmt(a.floor.p99, 4)} (AR1), ${fmt(a.floorWhite.p99, 4)} (white); ${a.floor.n} surrogates`);
  const above = a.candidates.length;
  console.log(above ? `   ${above} line(s) above the AR(1) p < 0.01 floor` : '   no line above the AR(1) p < 0.01 floor — the strongest peaks, for the record:');
  console.log('   period        amp      power    /AR1    /white  interior  half1   half2   stands  sidelobe?  verdict');
  for (const c of (above ? a.candidates : a.peaks).slice(0, 12)) {
    const verdict = c.power > a.floor.p99 ? 'ABOVE the red-noise floor' : c.power > a.floorWhite.p99 ? 'above white only' : 'below both';
    console.log(`   ${c.period.toFixed(3).padStart(10)}  ${fmt(c.amplitude, 3).padStart(8)}  ${fmt(c.power, 4)}  ${fmt(c.power / a.floor.p99, 2).padStart(6)}  ${fmt(c.power / a.floorWhite.p99, 2).padStart(6)}  ${fmt(c.amplitudeInterior, 3).padStart(8)}  ${fmt(c.amplitudeFirstHalf, 3).padStart(6)}  ${fmt(c.amplitudeSecondHalf, 3).padStart(6)}   ${c.standsInBothHalves && c.standsInInterior ? 'YES' : 'no '}     ${c.windowSidelobeOfStrongest ? 'yes' : 'no '}        ${verdict}`);
  }
}
const medianGap = (t) => { const ts = [...t].sort((a, b) => a - b); const g = []; for (let i = 1; i < ts.length; i++) if (ts[i] > ts[i - 1]) g.push(ts[i] - ts[i - 1]); g.sort((a, b) => a - b); return g[Math.floor(g.length / 2)]; };
const fMaxFor = (t, periodMin) => Math.min(1, (1 / periodMin) / (0.5 / medianGap(t)));

const results = {};
const list = [];
if (which === 'all' || which === 'paleo') { list.push([seriesPaleo(), { periodMin: null, oversample: 8, detrend: 'none', surrogates: Math.max(nSur, 1000) }]); list.push([seriesPaleo({ maxAgeMa: 600 }), { periodMin: null, oversample: 8, detrend: 'none', surrogates: Math.max(nSur, 1000) }]); }
if (which === 'all' || which === 'sun') {
  const rows = sunResidualRows();
  list.push([seriesSunYearly(rows), { periodMin: 2, oversample: 4, detrend: 'none' }]);
  list.push([seriesSunWindow(rows, 1700, 2000), { periodMin: 0.3, oversample: 4, detrend: 'none' }]);
  list.push([seriesSunWindow(rows, -2500, -2200), { periodMin: 0.3, oversample: 4, detrend: 'none' }]);
}
if (which === 'all' || which === 'cardinal') list.push(...seriesCardinal().map((s) => [s, { periodMin: 2, oversample: 4, detrend: 'none' }]));
if (which === 'all' || which === 'lunar') list.push([seriesLunarCanon(), { periodMin: 1, oversample: 4, detrend: 'none' }]);
for (const [s, opt] of list) {
  const t0 = Date.now();
  const a = analyseSeries({ t: s.t, y: s.y, w: s.w, surrogates: opt.surrogates || nSur, label: s.id, oversample: opt.oversample, fMaxFactor: opt.periodMin ? fMaxFor(s.t, opt.periodMin) : 1, detrend: opt.detrend });
  report(a, s);
  if (s.rows) for (const r of s.rows) console.log(`      ${r.id.padEnd(28)} ${String(r.ageMa).padStart(7)} Ma  ${r.quantity.padEnd(18)} obs ${r.observed}  pred ${Number(r.predicted).toFixed(3)}  rel ${(r.rel * 100).toFixed(2)} %  tol ±${(r.tolRel * 100).toFixed(1)} %`);
  console.log(`   (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  results[s.id] = { meta: s.meta, analysis: a, rows: s.rows || undefined };
}
if (out) { writeFileSync(out, JSON.stringify(results)); console.log(`\nwritten ${out}`); }
