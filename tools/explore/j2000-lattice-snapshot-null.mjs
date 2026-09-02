#!/usr/bin/env node
// THE FOUNDING OBSERVATION WITH A NULL — do the present-epoch planetary rates
// "land on 8H integers" more than chance allows?
//
// The lattice's planetary perihelion/node divisors were identified from the
// J2000-era rates (WebGeoCalc windows, ICRF conversions) and read as 8H/N with
// integer N. Doc 109 showed those rates are snapshots of a continuously varying
// phase rate (Mercury 8H/10.6 → 8H/11.6 over its cycle; Saturn from −8H/65 to
// +8H/58). This script asks the remaining question about the snapshot itself:
//   (a) how far is each shipped divisor from the present-epoch rate (two windows,
//       ecliptic perihelia from the model's own N-body, invariable-plane nodes)?
//   (b) how close is ANY rate to the nearest 8H/N with integer N ≤ NMAX — i.e.
//       what does the grid guarantee by itself? (spacing between neighbours at N
//       is 1/N relative: 9 % at N = 11, 1.5 % at N = 65 — a random number is never
//       farther than half that from some integer)
//   (c) null: the same rates jittered ±7 % (structure-preserving), scored by the
//       same "nearest integer within tol" rule as the shipped set.
//
// MEASURED (2026-08-30):
//   (a) shipped divisor vs present-epoch rate, perihelia: Mercury 0.5 % (the one true snapshot
//       match), Mars 8.9 %, Jupiter 286 % (1800–2100) / 126 % (1900–2026), Saturn 99 % / 18 %,
//       Uranus 44 % / sign, Venus and Neptune sign; nodes (invariable plane): Mercury 18 %,
//       Mars 106 %, Jupiter 43 %, Saturn 38 %, Uranus 23 %, Neptune 38 %, Venus 97 %.
//       → apart from Mercury's perihelion, the shipped divisors are neither the present rates
//       nor (doc 109 §4) the long-term means; they were constrained by other things (balance
//       laws, inclination trends, window choices), not by the rates.
//   (b) the present rates themselves: 7 of 12 within 1 % of an integer N (2 of 12 within 0.3 %);
//   (c) null (±7 % jitter): 5.4 ± 1.3 at 1 % → P = 0.20; 1.8 ± 1.2 at 0.3 % → P = 0.56.
//   VERDICT: the "J2000 integers" are what a grid of spacing 1/N guarantees; no information
//   beyond the snapshot. Mercury's 8H/11 = present Newtonian rate remains a single 0.5 % match.
//
//   node tools/explore/j2000-lattice-snapshot-null.mjs [tol=0.01] [nmax=70] [trials=20000] [jitter=0.07]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const TOL = parseFloat(KV.tol || '0.01'), NMAX = parseInt(KV.nmax || '70', 10), TRIALS = parseInt(KV.trials || '20000', 10), JITTER = parseFloat(KV.jitter || '0.07');
const H = TL.H;

// present-epoch rates from perihelion-observation-audit.mjs (″/cy): ecliptic ϖ̇ (1800–2100 | 1900–2026),
// invariable-plane Ω̇ (1800–2100). Venus/Neptune ϖ ill-conditioned (e < 0.01) — listed, not scored.
const RATES = {
  mercury: { peri: [529.0, 528.8], node: -528.1 },
  venus:   { peri: [14.0, 14.0], node: -1468.2, illPeri: true },
  mars:    { peri: [1596.5, 1602.5], node: -1503.5 },
  jupiter: { peri: [488.5, 832.2], node: -3046.6 },
  saturn:  { peri: [-1576.7, -3821.8], node: -2822.0 },
  uranus:  { peri: [806.6, -200.8], node: -432.5 },
  neptune: { peri: [9101.7, -59258.1], node: -105.2, illPeri: true },
};
const shipped = (k) => ({ periN: 8 * H / TL.planets[k].perihelionEclipticYears, nodeN: -8 * H / TL.planets[k].ascendingNodePeriod });
const rateToN = (rate) => 8 * H * rate / 129600000;          // 8H/N ⇔ N = 8H·rate/(1296000·100)
const nearestInt = (N) => { const n = Math.round(Math.abs(N)); return { n, rel: n < 1 || n > NMAX ? null : Math.abs(Math.abs(N) - n) / Math.abs(N) }; };

console.log(`shipped divisors vs the present-epoch rates (relative miss of the divisor's N from the rate's N; tol for "on the grid" = ${(100 * TOL).toFixed(1)} %, N ≤ ${NMAX})`);
console.log('planet    rate N (1800–2100) N (1900–2026)   shipped N   miss(1800–2100)  miss(1900–2026) │ node N     shipped N   miss');
const scored = [];
for (const [k, r] of Object.entries(RATES)) {
  const s = shipped(k), N1 = rateToN(r.peri[0]), N2 = rateToN(r.peri[1]), Nn = -rateToN(r.node);   // node divisors are −8H/N with N > 0: compare magnitudes of regression
  const miss = (N, S) => (Math.sign(N) !== Math.sign(S) ? 'sign' : (100 * Math.abs(N - S) / Math.abs(N)).toFixed(1) + ' %');
  console.log(`${k.padEnd(9)} ${N1.toFixed(2).padStart(9)} ${N2.toFixed(2).padStart(13)} ${s.periN.toFixed(0).padStart(11)}   ${miss(N1, s.periN).padStart(14)}  ${miss(N2, s.periN).padStart(14)} │ ${Nn.toFixed(2).padStart(8)} ${s.nodeN.toFixed(0).padStart(11)}   ${miss(Nn, s.nodeN)}${r.illPeri ? '   (ϖ ill-conditioned: e < 0.01)' : ''}`);
  if (!r.illPeri) scored.push(N1);
  scored.push(Nn);
}
// (b) the grid by itself, and (c) the null on the scored rates
const onGrid = (Ns) => Ns.filter((N) => { const q = nearestInt(N); return q.rel !== null && q.rel <= TOL; }).length;
const obs = onGrid(scored);
console.log(`\n(b) nearest-integer distance of the present-epoch rates themselves (perihelia 1800–2100 + nodes): ` + scored.map((N) => { const q = nearestInt(N); return `${Math.abs(N).toFixed(2)}→${q.n} (${q.rel === null ? 'out of range' : (100 * q.rel).toFixed(1) + ' %'})`; }).join(' · '));
console.log(`    within ${(100 * TOL).toFixed(1)} % of an integer: ${obs} of ${scored.length}`);
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let ge = 0, sum = 0, sum2 = 0;
for (let t = 0; t < TRIALS; t++) { const c = onGrid(scored.map((N) => N * (1 + (2 * rnd() - 1) * JITTER))); sum += c; sum2 += c * c; if (c >= obs) ge++; }
const mu = sum / TRIALS, sd = Math.sqrt(sum2 / TRIALS - mu * mu);
console.log(`(c) null (${TRIALS} jittered sets, ±${(100 * JITTER).toFixed(0)} %): mean ${mu.toFixed(2)} on-grid, sd ${sd.toFixed(2)}, P(count ≥ ${obs}) = ${(ge / TRIALS).toFixed(3)}`);
console.log(`\nreading: the shipped divisors are NOT the present-epoch rates for most planets (column "miss"); and any set of numbers of this size lands within ~1/(2N) of an integer N — the grid guarantees near-integers for N ≳ 20. Both facts say the "J2000 integers" carry no information beyond the snapshot they were read from.`);
