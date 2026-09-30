#!/usr/bin/env node
// EARTH e(t) OF A 20-MYR N-BODY DUMP AGAINST La2004, BY WINDOW — the time-domain
// twin of the g2 measurement (doc 109 §17). Theory against theory: La2004 is another
// integration, not an observation; the measured referee stays the rock metronome.
//
//   node --max-old-space-size=8192 tools/explore/ecc-dump-vs-la2004.mjs [dump=<file>]
//     dump defaults to tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json
//     (the shipped run: lunar quadrupole + Ceres/Vesta/Pallas); its point-mass twin is
//     …-gr-pre-lunar.local.json. Both are untracked (337 MB each).
//
// Reference: data/la2004-earth-51myr-back.asc (kyr from J2000, e, ε, ϖ̃; 1-kyr grid).
// Read-only: prints, writes nothing.
//
// MEASURED (rms Δe at zero lag | the lag that minimizes it is 0 for the shipped run):
//   window (kyr)      shipped run   point-mass run
//     −500 … 0          3.0e-5         6.8e-4
//    −1000 … −500       3.2e-5         1.2e-3
//    −2000 … −1000      3.4e-5         2.3e-3
//    −5000 … −3000      4.7e-5         6.0e-3
//   −10000 … −5000      7.1e-5         1.0e-2

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const FILE = KV.dump || ROOT + 'tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json';

const D = JSON.parse(readFileSync(FILE, 'utf8'));
console.log(`dump ${FILE.split('/').pop()} — ${D.integrator} dt ${D.dt} d, ${D.gr ? '1PN' : 'Newton'}, ±${D.years / 2} yr, sample ${D.sampleDays} d`);
console.log(`physics: ${D.physics ? JSON.stringify(D.physics) : 'none recorded (point mass, no asteroids)'}`);
const tYr = D.t, eArr = D.elements.earth.e;   // t: Julian years from J2000
const eAt = (/** @type {number} */ y) => {
  let lo = 0, hi = tYr.length - 1;
  if (y < tYr[0] || y > tYr[hi]) return NaN;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tYr[m] <= y) lo = m; else hi = m; }
  return eArr[lo] + (eArr[hi] - eArr[lo]) * (y - tYr[lo]) / (tYr[hi] - tYr[lo]);
};
const la04 = new Map(readFileSync(ROOT + 'data/la2004-earth-51myr-back.asc', 'utf8').trim().split('\n')
  .map((l) => l.trim().split(/\s+/).map((s) => Number(s.replace('D', 'E')))).map((r) => [r[0] * 1000, r[1]]));

const WINDOWS = [[-100000, 0], [-500000, 0], [-1000000, -500000], [-2000000, -1000000], [-3000000, -2000000], [-5000000, -3000000], [-10000000, -5000000]];
console.log('\n  window (kyr)        rms Δe     max|Δe|   best lag (yr)  rms at best lag');
for (const [a, b] of WINDOWS) {
  const stat = (/** @type {number} */ lag) => {
    let s = 0, n = 0, mx = 0;
    for (let y = a; y <= b; y += 1000) { const r = la04.get(y), m = eAt(y + lag); if (r === undefined || !Number.isFinite(m)) continue; const d = m - r; s += d * d; n++; mx = Math.max(mx, Math.abs(d)); }
    return { rms: Math.sqrt(s / n), mx };
  };
  const s0 = stat(0);
  let best = { lag: 0, rms: s0.rms };
  for (let lag = -20000; lag <= 20000; lag += 250) { const s = stat(lag); if (s.rms < best.rms) best = { lag, rms: s.rms }; }
  console.log(`  ${String(a / 1000).padStart(6)} … ${String(b / 1000).padStart(6)}   ${s0.rms.toExponential(2)}   ${s0.mx.toExponential(2)}   ${String(best.lag).padStart(7)}        ${best.rms.toExponential(2)}`);
}
