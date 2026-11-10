// Plan 32 — series 1 and 2 (the ΔT residuals) through the one harness. Prints the decision
// table and writes the sweep JSON to the path given (default: the session scratchpad).
//   node tools/explore/residual-spectra/run-deltat.mjs [out.json] [--surrogates N]

import { writeFileSync } from 'node:fs';
import { analyseSeries } from './spectrum.mjs';
import { seriesDeltaTEspenak, seriesDeltaTStephensonTimed, seriesDeltaTStephensonSpline, seriesDeltaTSplineRefit, withoutJose } from './series.mjs';

const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const nSur = process.argv.includes('--surrogates') ? Number(process.argv[process.argv.indexOf('--surrogates') + 1]) : 1000;

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
function report(a, series) {
  console.log(`\n== ${a.label}  n ${a.n}  span ${fmt(a.tMin, 0)}…${fmt(a.tMax, 0)}  rms ${fmt(a.rms)} ${series.meta.unit}  AR(1) ρ ${fmt(a.ar1.rho, 3)} τ ${fmt(a.ar1.tau, 1)} yr`);
  console.log(`   grid ${a.grid.nFreq} freqs, periods ${fmt(1 / a.grid.fMax, 1)} … ${fmt(1 / a.grid.fMin, 0)} yr (oversample ${a.grid.oversample}); floor p99 ${fmt(a.floor.p99, 3)} (AR1), ${fmt(a.floorWhite.p99, 3)} (white); ${a.floor.n} surrogates`);
  const above = a.candidates.length;
  console.log(above ? `   ${above} line(s) above the AR(1) p < 0.01 floor` : '   no line above the AR(1) p < 0.01 floor — the strongest peaks, for the record:');
  console.log('   period (yr)   amp      power   /AR1   /white  interior  half1  half2   stands   window-sidelobe?  verdict');
  for (const c of (above ? a.candidates : a.peaks).slice(0, 10)) {
    const verdict = c.power > a.floor.p99 ? 'ABOVE the red-noise floor' : c.power > a.floorWhite.p99 ? 'above white only (red noise explains it)' : 'below both floors';
    console.log(`   ${c.period.toFixed(1).padStart(10)}  ${fmt(c.amplitude).padStart(7)}  ${fmt(c.power, 3)}  ${fmt(c.power / a.floor.p99, 2).padStart(5)}  ${fmt(c.power / a.floorWhite.p99, 2).padStart(6)}  ${fmt(c.amplitudeInterior).padStart(8)}  ${fmt(c.amplitudeFirstHalf).padStart(5)}  ${fmt(c.amplitudeSecondHalf).padStart(5)}   ${c.standsInBothHalves && c.standsInInterior ? 'YES' : 'no '}      ${c.windowSidelobeOfStrongest ? 'yes' : 'no '}              ${verdict}`);
  }
}

const results = {};
const timed = seriesDeltaTStephensonTimed(), spline = seriesDeltaTStephensonSpline();
// hypothesis 1's proper form: the stack re-fitted on the spline with all four cycles (the check: the
// shipped residual must come back) and with Bond + Hallstatt only (the record free of the Jose fit)
const refit4 = seriesDeltaTSplineRefit({ cycles: ['bond', 'hallstatt', 'jose5', 'jose4'] }), refit2 = seriesDeltaTSplineRefit({ cycles: ['bond', 'hallstatt'] });
for (const s of [seriesDeltaTEspenak(), timed, spline, withoutJose(timed), withoutJose(spline), refit4, refit2]) {
  const a = analyseSeries({ t: s.t, y: s.y, w: s.w, surrogates: nSur, label: s.id, oversample: 8 });
  report(a, s);
  if (s.meta.refit) for (const [k, v] of Object.entries(s.meta.refit)) console.log(`      re-fitted ${k}: amplitude ${v.amplitude_s.toFixed(1)} s (shipped ${v.shipped_amplitude_s.toFixed(1)} s)`);
  // the power AT the two Jose periods, whatever the peaks are (the pre-registered read)
  if (s.id.startsWith('deltaT-spline-refit') || s.id.endsWith('nojose')) {
    for (const p of [715.5337423312883, 897.469387755102]) {
      const i = a.spectrum.f.reduce((best, f, k) => (Math.abs(1 / f - p) < Math.abs(1 / a.spectrum.f[best] - p) ? k : best), 0);
      console.log(`      at the Jose period ${p.toFixed(1)} yr (grid ${(1 / a.spectrum.f[i]).toFixed(1)}): power ${a.spectrum.power[i].toFixed(3)} = ${(a.spectrum.power[i] / a.floor.p99).toFixed(2)}× the AR(1) floor, ${(a.spectrum.power[i] / a.floorWhite.p99).toFixed(2)}× the white floor`);
    }
  }
  results[s.id] = { meta: s.meta, analysis: a };
}
if (out) { writeFileSync(out, JSON.stringify(results)); console.log(`\nwritten ${out}`); }
