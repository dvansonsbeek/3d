// Plan 32 — hypothesis 4's classifier, strict: is an LR04 residual peak a difference or sum tone
// of one OBLIQUITY line and one ECCENTRICITY line, or of one PRECESSION line and one obliquity
// line, of the formula's 28 L1 lines, within HALF the series' resolution (0.5/span)? The
// multiplicative (nonlinear) response's signature. Reads a sweep JSON from run-records.mjs.
//   node tools/explore/residual-spectra/classify-tones.mjs <sweep.json>

import { readFileSync } from 'node:fs';

const coeffs = JSON.parse(readFileSync(new URL('../../../public/input/climate-formula-coefficients.json', import.meta.url), 'utf8'));
const L1 = coeffs.regimes['lr04-post-mpt'].L1.map((c) => ({ p: c.period_kyr, label: c.label, f: 1 / c.period_kyr }));
const fam = (c) => (/precession/i.test(c.label) ? 'P' : c.p > 35 && c.p < 60 ? 'O' : c.p >= 60 ? 'E' : '?');
const sweep = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [id, r] of Object.entries(sweep)) {
  if (!id.startsWith('lr04')) continue;
  const a = r.analysis, tol = 0.5 / a.span;
  console.log(`\n== ${id}  (resolution 1/span = ${(1 / a.span * 1e3).toFixed(3)} /Myr; tolerance ${(tol * 1e3).toFixed(3)} /Myr)`);
  const list = a.candidates.length ? a.candidates : a.peaks;
  for (const c of list.slice(0, 8)) {
    const matches = [];
    for (let i = 0; i < L1.length; i++) for (let j = 0; j < L1.length; j++) {
      if (i === j) continue;
      const fi = fam(L1[i]), fj = fam(L1[j]);
      const allowed = (fi === 'O' && fj === 'E') || (fi === 'P' && fj === 'O') || (fi === 'P' && fj === 'E');
      if (!allowed) continue;
      for (const [sign, s] of [[-1, '−'], [1, '+']]) {
        const f = Math.abs(L1[i].f + sign * L1[j].f);
        const d = Math.abs(f - c.f);
        if (d <= tol) matches.push({ d, text: `${L1[i].label} (${L1[i].p.toFixed(1)}) ${s} ${L1[j].label} (${L1[j].p.toFixed(1)}) → ${(1 / f).toFixed(1)} kyr` });
      }
    }
    for (const l of L1) { const d = Math.abs(2 * l.f - c.f); if (d <= tol) matches.push({ d, text: `2 × ${l.label} (${l.p.toFixed(1)}) → ${(0.5 / l.f).toFixed(1)} kyr` }); }
    matches.sort((x, y) => x.d - y.d);
    const verdict = c.power > a.floor.p99 ? 'ABOVE AR(1)' : c.power > a.floorWhite.p99 ? 'above white only' : 'below both';
    console.log(`   ${c.period.toFixed(1).padStart(8)} kyr  amp ${c.amplitude.toFixed(3)} ‰  ${verdict.padEnd(17)} ${matches.length ? matches.slice(0, 3).map((m) => m.text).join(' | ') : '— no primary-family tone within the tolerance'}`);
  }
}
