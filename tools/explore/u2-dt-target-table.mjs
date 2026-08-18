// STEP 1+2 FEASIBILITY: the TARGET deltaT table (all constraint classes)
// and whether the current stack misfits carry a fittable signal.
//
// Target classes:
//   A. Totality-required points (the deltaT-free matcher: OUR geometry,
//      no Stephenson Moon): hard, ±~700 s combined (record ±500 + tier
//      ancient budget ±500).
//   B. Babylonian lunar century bands (identification-robust): ±SE.
//   C. CE canon century arc (Espenak spline; observation-driven in the
//      medieval segment): ±5% nominal.
//   D. The fit window 1650-2017 (Espenak seconds-class) - already the
//      fitter's target.
//
// Feasibility physics: a deltaT tone A*sin(2*pi*t/P) implies an LOD
// amplitude 2*pi*A/(P_yr*365.25)*1000 ms. Observed millennial LOD
// variations are ~±4 ms (Stephenson's own 1,500-yr oscillation);
// decadal ±3 ms. Any "closing cycle" must respect this bound.
//
//   node tools/explore/u2-dt-target-table.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const DT = require2('/home/dennis/code/3d/tools/lib/deep-time.js');
import { readFileSync } from 'node:fs';

const START = 55.85417672145975;
const fullAbs = (y) => START + DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6);

// A. totality points (deltaT-free matcher results)
const totality = [
  { year: -762, dt: 22329, err: 700, src: 'Bur-Sagale (unique survivor)' },
  { year: -708, dt: 19169, err: 700, src: 'Lu (traditional, top-2)' },
  { year: -584, dt: 18478, err: 700, src: 'Thales (top-ranked)' },
  { year: -135, dt: 10787, err: 700, src: 'Babylon diary (unique survivor)' },
];
console.log('CLASS A — totality-required deltaT (our geometry, deltaT-free):');
console.log('  year | target | model | misfit | misfit/σ');
let chi2 = 0;
for (const t of totality) {
  const m = fullAbs(t.year);
  const z = (m - t.dt) / t.err;
  chi2 += z * z;
  console.log(`  ${t.year} | ${String(t.dt).padStart(6)} | ${m.toFixed(0).padStart(6)} | ${(m - t.dt).toFixed(0).padStart(6)} | ${z.toFixed(2).padStart(5)}  (${t.src})`);
}
console.log(`  χ² = ${chi2.toFixed(1)} for 4 points (expected ≈ 4 if noise; p(χ²≥${chi2.toFixed(1)}) ${chi2 < 9.5 ? '> 0.05 — CONSISTENT WITH NOISE' : '< 0.05 — signal present'})`);

// sign pattern test: a smooth missing cycle cannot alternate sign between
// neighbouring points closer than P/2
const signs = totality.map((t) => Math.sign(fullAbs(t.year) - t.dt)).join(' ');
console.log(`  misfit sign sequence (−762→−135): ${signs}`);

// the LOD bound for hypothetical closing cycles
console.log('\nFEASIBILITY — LOD amplitude implied by a closing tone (A ≈ 1,000 s):');
for (const P of [356, 715, 1104, 1466, 2430, 3916, 8000]) {
  const lodMs = 2 * Math.PI * 1000 / (P * 365.25) * 1000;
  console.log(`  P = ${String(P).padStart(5)} yr → ${lodMs.toFixed(1).padStart(6)} ms LOD amplitude ${lodMs > 6 ? ' — EXCLUDED (obs ≲ 4 ms millennial)' : ' — allowed'}`);
}

// what precision would make the question answerable: N totality points
console.log('\nWHAT WOULD CREATE SIGNAL: per-century σ vs number of totality-class points');
for (const n of [1, 4, 10, 25]) {
  console.log(`  ${String(n).padStart(2)} points/century → σ_mean ≈ ${(700 / Math.sqrt(n)).toFixed(0)} s (cycle contributions at these epochs: 200–550 s)`);
}
