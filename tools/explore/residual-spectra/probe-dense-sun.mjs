// Plan 32 — the dense Sun windows searched down to the 10-day sampling's Nyquist (20 d): which
// SHORT-period residual terms alias onto the cardinal series' yearly lines (2.715 yr ↔ frac 0.3683
// cycles/yr; the 6.399 / 6.424 doublet ↔ frac 0.1563 / 0.1557)? The periodogram over the full grid,
// its top peaks with their yearly alias, and the named lunar-class terms' amplitudes.
//   node tools/explore/residual-spectra/probe-dense-sun.mjs

import { frequencyGrid, periodogram, lsFitAtOmega } from './spectrum.mjs';
import { sunResidualRows } from './series-sun.mjs';

const YEAR = 365.25;
const TROP = YEAR / 365.2422;
const rows = sunResidualRows();
const windows = [[-2500, -2200], [-400, -100], [1700, 2000]];
const alias = (fr) => { const r = ((fr % TROP) + TROP) % TROP; return Math.min(r, TROP - r); };
for (const [a, b] of windows) {
  const sel = rows.filter((x) => x.t >= a && x.t < b), t = sel.map((x) => x.t), y = sel.map((x) => x.y), w = sel.map(() => 1);
  const freqs = frequencyGrid(t, { oversample: 4, fMaxFactor: 1 });
  const power = periodogram(t, y, w, freqs);
  const peaks = [];
  for (let i = 1; i < freqs.length - 1; i++) if (power[i] > power[i - 1] && power[i] >= power[i + 1]) peaks.push({ f: freqs[i], power: power[i] });
  peaks.sort((x, y2) => y2.power - x.power);
  const rms = Math.sqrt(y.reduce((s, v) => s + v * v, 0) / y.length);
  console.log(`\n== Sun − Horizons ${a}…${b}  n ${t.length}  rms ${rms.toFixed(3)}″  grid to ${(1 / freqs[freqs.length - 1] * YEAR).toFixed(1)} d`);
  console.log('   period (d)   period (yr)   amp (″)   yearly alias (yr)   frac(f)');
  for (const p of peaks.slice(0, 18)) {
    const amp = lsFitAtOmega(t, y, w, 2 * Math.PI * p.f).amplitude, al = alias(p.f);
    const flag = Math.abs(al - 0.36828) < 2e-3 ? '  ← the 2.715-yr alias' : Math.abs(al - 0.1563) < 1.5e-3 || Math.abs(al - 0.1557) < 1.5e-3 ? '  ← the 6.4-yr doublet alias' : '';
    console.log(`   ${(YEAR / p.f).toFixed(3).padStart(10)}   ${(1 / p.f).toFixed(5).padStart(10)}   ${amp.toFixed(3).padStart(7)}   ${(1 / al).toFixed(3).padStart(14)}   ${al.toFixed(4)}${flag}`);
  }
  // the named lunar-class short terms directly
  const fD = YEAR / 29.530588853, fMp = YEAR / 27.554549878, fF = YEAR / 27.212220817, fM = YEAR / 365.259636, fTropMonth = YEAR / 27.321582;
  const named = [['D', fD], ['2D', 2 * fD], ['D − M′', fD - fMp], ['D + M′', fD + fMp], ['2D − M′', 2 * fD - fMp], ['2D − 2F', 2 * (fD - fF)], ['D − 2F', Math.abs(fD - 2 * fF)], ['D + 2F', fD + 2 * fF], ['2F (13.61 d)', 2 * fF], ['2L_moon (13.66 d, nutation)', 2 * fTropMonth], ['L_moon (27.32 d)', fTropMonth], ['M′', fMp], ['D − M', fD - fM], ['D + M', fD + fM], ['D − 2M', fD - 2 * fM], ['D + 2M', fD + 2 * fM]];
  console.log('   named short terms:');
  for (const [label, fr] of named) console.log(`     ${label.padEnd(28)} ${(YEAR / fr).toFixed(3).padStart(9)} d   amp ${lsFitAtOmega(t, y, w, 2 * Math.PI * fr).amplitude.toFixed(3)}″   alias ${(1 / alias(fr)).toFixed(3)} yr`);
}
