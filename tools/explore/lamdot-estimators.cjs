#!/usr/bin/env node
// λ̇-CHANNEL ESTIMATORS ON THE 20-MYR DUMP — Earth's mean-longitude rate at the banked 2-kyr
// nodes around J2000 from several estimators, against the DE441-implied values
// (lamdot-nodes-vs-de441.cjs, pre-restatement run) and the Simon 1994 secular line; the
// record behind the 2026-09 choice in tools/verify/secular-series.js (the least-squares
// quadratic slope over 10 kyr).
//   boxcar W  — the former recipe: running mean of per-step rates over W yr (= the endpoint
//               difference of the osculating L — every node carries the short-period terms there)
//   lsq   W   — least-squares slope of a quadratic (or line) fitted to the unwrapped L over ±W/2
//
//   node --max-old-space-size=6000 tools/explore/lamdot-estimators.cjs
//   (needs the untracked dump tools/explore/lattice-long-window-ecliptic-20000000-gr.local.json)
//
// Measured: rms |estimator − DE441-implied| over the nine nodes in sidereal-year ms — boxcar
// 2000: 180 · boxcar 6000: 75 · lsq-lin 2000: 106 · lsq-quad 4000: 58 · 6000: 47 · 10000: 43;
// node roughness (rms second difference over ±9.9 Myr, ×1e-9): 57.5 · 18.3 · 2.2 · 2.2 · 0.97 · 0.76.
'use strict';
const fs = require('fs');
const path = require('path');
const DUMP = path.join(__dirname, 'lattice-long-window-ecliptic-20000000-gr.local.json');
if (!fs.existsSync(DUMP)) { console.error('dump missing — see tools/verify/secular-series.js for the run command'); process.exit(2); }
const D = JSON.parse(fs.readFileSync(DUMP, 'utf8'));
const tR = D.t, E = D.elements.earth, NR = tR.length, rT0 = tR[0], rDt = tR[1] - tR[0];
console.log(`dump: ${NR} samples, step ${rDt.toFixed(3)} yr, t ${rT0} … ${tR[NR - 1]}`);
const Lu = new Float64Array(NR); Lu[0] = E.L[0];
const expRev = rDt * 365.25 / 365.2563630;
for (let i = 1; i < NR; i++) { let f = (E.L[i] - E.L[i - 1]) / 360; f -= Math.floor(f); const k = Math.round(expRev - f); Lu[i] = Lu[i - 1] + (k + f) * 360; }
const idxOf = (t) => (t - rT0) / rDt;
const boxcar = (t, W) => { const a = Math.round(idxOf(t - W / 2)), b = Math.round(idxOf(t + W / 2)); return (Lu[b] - Lu[a]) / (tR[b] - tR[a]); };
const lsq = (t, W, deg = 2) => {
  const a = Math.max(0, Math.ceil(idxOf(t - W / 2))), b = Math.min(NR - 1, Math.floor(idxOf(t + W / 2)));
  const S = [0, 0, 0, 0, 0], R = [0, 0, 0];
  for (let i = a; i <= b; i++) { const x = (tR[i] - t) / 1000; let pw = 1; for (let k = 0; k < 5; k++) { S[k] += pw; if (k < 3) R[k] += pw * Lu[i]; pw *= x; } }
  if (deg === 1) { const det = S[0] * S[2] - S[1] * S[1]; return (S[0] * R[1] - S[1] * R[0]) / det / 1000; }
  const A = [[S[0], S[1], S[2], R[0]], [S[1], S[2], S[3], R[1]], [S[2], S[3], S[4], R[2]]];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const f = A[j][i] / A[i][i]; for (let k = i; k < 4; k++) A[j][k] -= f * A[i][k]; }
  const c2 = A[2][3] / A[2][2], c1 = (A[1][3] - A[1][2] * c2) / A[1][1];
  return c1 / 1000;
};
// DE441-implied nodes (the pre-restatement run of lamdot-nodes-vs-de441.cjs; ×1e-9)
const DE = { '-8000': 25.58, '-6000': 22.13, '-4000': 17.51, '-2000': 12.09, '0': 5.29, '2000': -1.88, '4000': -7.07, '6000': -12.77, '8000': -16.47 };
const simon = (y) => { const t = (y - 2000) / 1000; return (-4.08822 * t - 0.01569 * t * t) / 1295977422.83429 * 1e9; };
const est = {
  'boxcar 2000 (pre-2026-09)': (t) => boxcar(t, 2000), 'boxcar 6000': (t) => boxcar(t, 6000),
  'lsq-lin 2000': (t) => lsq(t, 2000, 1), 'lsq-quad 4000': (t) => lsq(t, 4000), 'lsq-quad 6000': (t) => lsq(t, 6000),
  'lsq-quad 10000 (shipped)': (t) => lsq(t, 10000), 'lsq-lin 6000': (t) => lsq(t, 6000, 1),
};
const years = [-8000, -6000, -4000, -2000, 0, 2000, 4000, 6000, 8000];
console.log('\nrel − 1 (×1e-9) at the nodes; last two columns: rms and max |estimator − DE441-implied| over the nine nodes, in sidereal-year ms');
console.log('estimator'.padEnd(28) + years.map((y) => String(y).padStart(8)).join('') + '     rms ms   max ms');
console.log('DE441-implied'.padEnd(28) + years.map((y) => DE[String(y)].toFixed(2).padStart(8)).join(''));
console.log('Simon 1994 secular'.padEnd(28) + years.map((y) => simon(y).toFixed(2).padStart(8)).join(''));
for (const [name, f] of Object.entries(est)) {
  const l0 = f(0);
  const vals = years.map((y) => (f(y - 2000) / l0 - 1) * 1e9);
  const d = vals.map((v, i) => (v - DE[String(years[i])]) * 1e-9 * 31558149.76 * 1000);
  console.log(name.padEnd(28) + vals.map((v) => v.toFixed(2).padStart(8)).join('') + Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length).toFixed(0).padStart(10) + Math.max(...d.map(Math.abs)).toFixed(0).padStart(9));
}
console.log('\nroughness over ±9.9 Myr: rms second difference of rel at 2-kyr nodes (×1e-9)');
for (const [name, f] of Object.entries(est)) {
  const l0 = f(0); const v = [];
  for (let t = -9900000; t <= 9900000; t += 2000) v.push(f(t) / l0);
  let s = 0; for (let i = 1; i < v.length - 1; i++) s += (v[i - 1] - 2 * v[i] + v[i + 1]) ** 2;
  console.log(name.padEnd(28) + (Math.sqrt(s / (v.length - 2)) * 1e9).toFixed(3).padStart(10));
}
