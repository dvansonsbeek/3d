#!/usr/bin/env node
// THE ANY-BASE LATTICE SCAN on the g-eigenfrequencies (E24; owner's
// middle-ground question 2026-09-04 "are better repeatable patterns
// possible?"; plan 02 IP-two-engine-model E24): is there a base period P such
// that ALL eight apsidal eigenfrequencies sit on integer lines of the comb
// 1296000/P — i.e. a truly repeating solar-system shape pattern? If all g's
// are lines, every beat (including g2−g5 = the 405-kyr metronome) is
// automatically a line too.
// Statistic: D(s) = Σ_j |g_j/s − round(g_j/s)| over comb spacings s.
// Null: 2000 surrogate sets, each g jittered by ±5 % uniformly (breaks any
// true commensurability while preserving the spread), same scan, min-D
// distribution. The E5/E21 discipline: a grid guarantees near-hits; only the
// null says whether a hit means anything.
// Frequencies (″/yr): our engine's certified values where we have them
// (doc 109: g1 5.576, g2 7.456, g3 17.37, g4 17.92, g5 4.257, g6 28.245),
// Laskar 2004 for g7/g8 (3.088, 0.673) — theory-vs-theory throughout.
//
// RESULT (2026-09-04): best base anywhere (s = 0.6179 ″/yr, P = 2.10 Myr)
// reaches D = 0.694 — EXACTLY the random-null median (0.693), P = 0.51: the
// eigenfrequency set carries NO commensurate structure at ANY base. And 85 %
// of arbitrary bases fit the g's better than 8H does (D(8H) = 2.467). An
// exactly repeating solar-system shape pattern does not exist at any period;
// the comb (E17) works sub-Myr only because spectra cannot resolve the
// detunes. The measured middle ground is the typed mode table — pattern
// without a global period.
const G = [5.576, 7.456, 17.37, 17.92, 4.257, 28.245, 3.088, 0.673];
const H8 = 0.48312;   // the model's comb spacing, 1296000/(8H)
function D(s) { let d = 0; for (const g of G) { const n = g / s; d += Math.abs(n - Math.round(n)); } return d; }
function scan(gs) {
  let best = [1e9, 0];
  for (let s = 0.05; s <= 3.0; s += 1e-4) {
    let d = 0; for (const g of gs) { const n = g / s; d += Math.abs(n - Math.round(n)); }
    if (d < best[0]) best = [d, s];
  }
  return best;
}
const [dBest, sBest] = scan(G);
console.log('ANY-BASE SCAN over comb spacings s = 0.05…3.0 ″/yr (grid 1e-4):');
console.log(`  best base: s = ${sBest.toFixed(4)} ″/yr → P = ${(1296000 / sBest / 1000).toFixed(1)} kyr, total detune D = ${dBest.toFixed(3)}`);
console.log(`  lines there: ${G.map((g) => `${(g / sBest).toFixed(2)}`).join(' ')}`);
console.log(`  the model's 8H base (s = ${H8}): D = ${D(H8).toFixed(3)}, lines ${G.map((g) => (g / H8).toFixed(2)).join(' ')}`);
console.log(`  worst-single-line detune at best base: ${Math.max(...G.map((g) => Math.abs(g / sBest - Math.round(g / sBest)))).toFixed(3)} (of 0.5 max)`);
// null
const M = 2000, mins = [];
for (let m = 0; m < M; m++) {
  const gs = G.map((g) => g * (1 + (Math.random() - 0.5) * 0.1));
  mins.push(scan(gs)[0]);
}
mins.sort((a, b) => a - b);
const p = mins.filter((x) => x <= dBest).length / M;
console.log(`  NULL (2000 jittered sets, same scan): min-D median ${mins[1000].toFixed(3)}, 5th pct ${mins[100].toFixed(3)}`);
console.log(`  P(a random set scans this well or better) = ${p.toFixed(2)}`);
// where does 8H rank within the real set's own scan?
let better = 0, tot = 0;
for (let s = 0.05; s <= 3.0; s += 1e-3) { tot++; if (D(s) < D(H8)) better++; }
console.log(`  8H's rank among all bases for the REAL set: ${(better / tot * 100).toFixed(0)} % of bases fit better`);
