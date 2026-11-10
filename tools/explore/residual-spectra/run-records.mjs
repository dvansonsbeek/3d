// Plan 32 — series 4 (LR04) and 7 (La2004) through the one harness.
//   node tools/explore/residual-spectra/run-records.mjs [out.json] [--surrogates N] [--which lr04|la2004|all]

import { writeFileSync } from 'node:fs';
import { analyseSeries } from './spectrum.mjs';
import { seriesLr04, seriesLa2004 } from './series-records.mjs';
import { readFileSync } from 'node:fs';

/** Hypothesis 4's classifier: is a candidate frequency a SUM or DIFFERENCE tone of two of the formula's
 *  28 L1 lines, or a harmonic of one, within the series' resolution (1/span)? The signature of a
 *  multiplicative (nonlinear) climate response to the orbital forcing — external physics the linear
 *  line sum cannot carry (plan 26 §2M, doc 92). @returns {string} the match, or '' */
function combinationTone(fCandidate, resolution, l1Periods) {
  const lines = l1Periods.map((p) => ({ p, f: 1 / p }));
  let best = null;
  const consider = (f, label) => { const d = Math.abs(f - fCandidate); if (d <= resolution && (best === null || d < best.d)) best = { d, label }; };
  for (let i = 0; i < lines.length; i++) {
    consider(2 * lines[i].f, `2 × ${lines[i].p.toFixed(1)}`);
    for (let j = i + 1; j < lines.length; j++) {
      consider(lines[i].f + lines[j].f, `${lines[i].p.toFixed(1)} + ${lines[j].p.toFixed(1)}`);
      consider(Math.abs(lines[i].f - lines[j].f), `${lines[i].p.toFixed(1)} − ${lines[j].p.toFixed(1)}`);
    }
  }
  return best ? `${best.label} kyr (Δ ${(best.d * 1e3).toFixed(2)} /Myr)` : '';
}
const L1_PERIODS_KYR = JSON.parse(readFileSync(new URL('../../../public/input/climate-formula-coefficients.json', import.meta.url), 'utf8')).regimes['lr04-post-mpt'].L1.map((c) => c.period_kyr);

const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const nSur = Number(arg('--surrogates', 200)), which = arg('--which', 'all');

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
function report(a, series) {
  console.log(`\n== ${a.label}  n ${a.n}  span ${fmt(a.tMin, 0)}…${fmt(a.tMax, 0)}  rms ${fmt(a.rms, 3)} ${series.meta.unit}${a.trend ? ` after a ${a.trend.quadratic ? 'quadratic' : 'linear'} trend (raw rms ${fmt(a.rmsRaw, 3)}; slope ${(a.trend.slope * 1000).toExponential(3)} ${series.meta.unit}/Myr${a.trend.quadratic ? `, curvature ${(a.trend.curvaturePerUnit2 * 1e6).toExponential(3)} /Myr²` : ''})` : ''}  AR(1) ρ ${fmt(a.ar1.rho, 3)} τ ${fmt(a.ar1.tau, 1)}`);
  console.log(`   grid ${a.grid.nFreq} freqs, periods ${fmt(1 / a.grid.fMax, 1)} … ${fmt(1 / a.grid.fMin, 0)} (oversample ${a.grid.oversample}); floor p99 ${fmt(a.floor.p99, 4)} (AR1), ${fmt(a.floorWhite.p99, 4)} (white); ${a.floor.n} surrogates`);
  const above = a.candidates.length;
  console.log(above ? `   ${above} line(s) above the AR(1) p < 0.01 floor` : '   no line above the AR(1) p < 0.01 floor — the strongest peaks, for the record:');
  console.log('   period        amp      power    /AR1    /white  interior  half1   half2   stands  sidelobe?  verdict                      combination tone of the L1 lines?');
  for (const c of (above ? a.candidates : a.peaks).slice(0, 12)) {
    const verdict = c.power > a.floor.p99 ? 'ABOVE the red-noise floor' : c.power > a.floorWhite.p99 ? 'above white only       ' : 'below both             ';
    const tone = series.id.startsWith('lr04') ? combinationTone(c.f, 1 / a.span, L1_PERIODS_KYR) : '';
    c.combinationTone = tone;
    console.log(`   ${c.period.toFixed(2).padStart(10)}  ${fmt(c.amplitude, 3).padStart(8)}  ${fmt(c.power, 4)}  ${fmt(c.power / a.floor.p99, 2).padStart(6)}  ${fmt(c.power / a.floorWhite.p99, 2).padStart(6)}  ${fmt(c.amplitudeInterior, 3).padStart(8)}  ${fmt(c.amplitudeFirstHalf, 3).padStart(6)}  ${fmt(c.amplitudeSecondHalf, 3).padStart(6)}   ${c.standsInBothHalves && c.standsInInterior ? 'YES' : 'no '}     ${c.windowSidelobeOfStrongest ? 'yes' : 'no '}        ${verdict}  ${tone}`);
  }
}

const results = {};
const list = [];
if (which === 'all' || which === 'lr04') list.push(...seriesLr04().map((s) => [s, { periodMin: 8, detrend: 'none' }]));
// the La2004 residuals carry a secular drift (a g-mode rate offset: 56° of ϖ, 1,352″ of ε at −10 Myr) — removed as a
// stated linear trend so the LINES can be read; the slope is reported beside them
if (which === 'all' || which === 'la2004') list.push(...seriesLa2004({ stepKyr: 2 }).map((s) => [s, { periodMin: 8, detrend: arg('--detrend', 'linear') }]));
for (const [s, opt] of list) {
  // the Milankovitch band and the secular modes: periods ≥ 8 kyr (the grid's cap), oversample 4
  const ts = [...s.t].sort((a, b) => a - b); const gaps = []; for (let i = 1; i < ts.length; i++) if (ts[i] > ts[i - 1]) gaps.push(ts[i] - ts[i - 1]); gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const fMaxFactor = Math.min(1, (1 / opt.periodMin) / (0.5 / median));
  const t0 = Date.now();
  const a = analyseSeries({ t: s.t, y: s.y, w: s.w, surrogates: nSur, label: s.id, oversample: 4, fMaxFactor, detrend: opt.detrend });
  report(a, s);
  console.log(`   (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  results[s.id] = { meta: s.meta, analysis: a };
}
if (out) { writeFileSync(out, JSON.stringify(results)); console.log(`\nwritten ${out}`); }
