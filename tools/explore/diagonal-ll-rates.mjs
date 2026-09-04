#!/usr/bin/env node
// THE BARE-RATE OVERVIEW (X2 diagnosis generalized to all planets, 2026-09-02).
//
// The X2 finding: free Earth in the model universe precesses at its DIAGONAL
// Laplace–Lagrange rate A_EE (measured 12.90 ″/yr by NAFF vs 12.78 computed —
// the "bare" apsidal rate a planet has when its neighbours' eccentricity
// vectors are frozen). This script computes every planet's bare rate
//   A_jj = (n_j/4) Σ_k (m_k/(M+m_j)) α ᾱ b¹₃/₂(α)     (apsidal, prograde)
//   B_jj = −A_jj                                        (nodal — same sum)
// from AUTHORITATIVE inputs only: masses from tools/lib/constants
// (massRatioDE440) + the shared GM_EM, osculating a from the campaign's J2000
// Horizons vectors (j2000-state.mjs — no rounded tables; a first version with
// a hardcoded 4-digit a-table put Jupiter/Saturn ~1 % high and manufactured a
// false integer pattern, since removed). Model lines are read from the
// constants (perihelionEclipticYears, ascendingNodeCyclesIn8H), never retyped.
//
// DEFINABILITY CAVEAT (measured): Jupiter's and Saturn's bares depend on the
// a-convention at the ~1–2 % level (Saturn's osculating a at J2000 is 0.47 %
// above its mean — the Great Inequality); Venus/Earth/Mars bares are sharp
// (their a's are stable to ~1e-5). Sub-0.1 % claims are only definable for
// the sharp trio.
//
// THE SHARP-TRIO NULL (owner's 12-cycle question reduced to its definable
// core): are Venus : Earth : Mars = 34 : 36 : 50 on a common unit beyond
// chance? The null jitters the three sharp bares ±2 % (structure-preserving)
// and gives every trial the same freedom the observed fit used (any Earth
// integer 10–60 defines a candidate unit); P = fraction of trials achieving
// the observed worst residual.
//
// RESULTS (first authoritative run): bare ″/yr — Me 5.5335 (+1PN 5.9633),
// V 12.0656, E 12.7760, Ma 17.7284, J 7.3694, S 18.2234, U 2.7494, N 0.6691.
// Jupiter/Saturn sit ~1 % off the owner's 12-cycle integers (21, 52) — the
// earlier apparent fit was the rounded-a artifact. SHARP-TRIO NULL: the
// V:E:Ma = 34:36:50 common-unit fit (worst residual 0.091 %) is reached by
// 26 % of jittered trios once the unit-scan freedom is priced in — P ≈ 0.26,
// chance level. With the mass-solve exclusion (Δm/m 4–30 % needed vs ranging
// at 1e-8) the 12-cycle bare comb is closed. FULL-SET NULL (the decisive
// test): the eight bare rates against the model's own 8H comb read
// Σ dist = 2.457 vs the random expectation 2.00 ± 0.41 — slightly FARTHER
// from the lattice than chance (P 0.68) — and against ANY base (free-unit
// scan 0.10–1.20 ″/yr, the jitter null given the same freedom) P ≈ 0.66.
// The bare-rate set carries no lattice structure on any comb. What stands:
// Earth's bare 12.89 ± 0.01 (certified across two frozen universes);
// Mercury's and Mars's model divisors within 2–5 % of their bares; the
// three-layer structure (bare → eigen → window); Earth's bare-vs-H/3
// proximity (+11 %) is a ~1-in-5-class coincidence per this null.
//
//   node tools/explore/diagonal-ll-rates.mjs [trials=50000]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { NAMES, GM_SUN, gmOf, osculAt, AU_KM } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const TRIALS = parseInt(KV.trials || '50000', 10);

// external reference values (cited, not model-derivable): Laskar 2004 g/s —
// the free-universe eigenfrequencies our own NAFF reproduces to 0.1–1 % (doc 109 §5)
const EIGEN_G = { mercury: 5.5965, venus: 7.4555, earth: 17.3711, mars: 17.9159, jupiter: 4.2575, saturn: 28.2455, uranus: 3.0876, neptune: 0.673 };
const EIGEN_S = { mercury: -5.6197, venus: -7.0797, earth: -18.8506, mars: -17.7553, jupiter: -26.3475, saturn: -26.3475, uranus: -2.9927, neptune: -0.6919 };

const OSC = Object.fromEntries(NAMES.map((p) => [p, osculAt(p)]));
function laplace(j, alpha) {
  const N = 40000; let s = 0;
  for (let i = 0; i < N; i++) { const psi = (i + 0.5) * Math.PI / N; s += Math.cos(j * psi) / Math.pow(1 - 2 * alpha * Math.cos(psi) + alpha * alpha, 1.5); }
  return (2 / Math.PI) * s * (Math.PI / N);
}
const A = {};
for (const p of NAMES) {
  const n_p = 1296000 / Math.pow(OSC[p].aAU, 1.5);
  let sum = 0;
  for (const k of NAMES) {
    if (k === p) continue;
    const external = OSC[k].aAU > OSC[p].aAU;
    const alpha = external ? OSC[p].aAU / OSC[k].aAU : OSC[k].aAU / OSC[p].aAU;
    const abar = external ? alpha : 1;
    sum += (n_p / 4) * (gmOf(k) / (GM_SUN + gmOf(p))) * alpha * abar * laplace(1, alpha);
  }
  A[p] = sum;
}
// 1PN apsidal term per planet
const C_KMS = 299792.458, GR = {};
for (const p of NAMES) {
  const aKm = OSC[p].aAU * AU_KM;
  GR[p] = 6 * Math.PI * GM_SUN / (C_KMS * C_KMS * aKm * (1 - OSC[p].e ** 2)) / Math.pow(OSC[p].aAU, 1.5) * 206264.806;
}
console.log('BARE (frozen-neighbour) L-L rates — authoritative inputs (massRatioDE440 + J2000 Horizons osculating a)');
console.log('planet     a (AU)      bare ″/yr   +1PN      eigen g   model peri line | bare node   eigen s   model node line');
for (const p of NAMES) {
  const periYears = p === 'earth' ? TL.H / 3 : TL.planets[p].perihelionEclipticYears;   // Earth: the H/3 law line
  const modelPeri = 1296000 / periYears;
  const nodeN = p === 'earth' ? -40 : -Math.abs(TL.planets[p].ascendingNodeCyclesIn8H);
  const modelNode = 1296000 * nodeN / (8 * TL.H);
  console.log(
    p.padEnd(9)
    + ` ${OSC[p].aAU.toFixed(5).padStart(9)}`
    + ` ${A[p].toFixed(4).padStart(10)}`
    + ` ${(A[p] + GR[p]).toFixed(4).padStart(8)}`
    + `  ${EIGEN_G[p].toFixed(3).padStart(7)}`
    + `  ${modelPeri.toFixed(3).padStart(9)}`
    + `      | ${(-A[p]).toFixed(4).padStart(9)}`
    + ` ${EIGEN_S[p].toFixed(3).padStart(8)}`
    + `  ${modelNode.toFixed(3).padStart(9)}`
  );
}

// THE SHARP-TRIO NULL
const rV = A.venus, rE = A.earth, rM = A.mars;
function quality(v, e, m) {   // best common-unit fit over N_E ∈ [10, 60]
  let best = Infinity;
  for (let NE = 10; NE <= 60; NE++) {
    const u = e / NE;
    const dv = Math.abs(v / u - Math.round(v / u)) / (v / u);
    const dm = Math.abs(m / u - Math.round(m / u)) / (m / u);
    const q = Math.max(dv, dm);
    if (q < best) best = q;
  }
  return best;
}
const qObs = quality(rV, rE, rM);
const uObs = rE / 36;
console.log(`\nSHARP-TRIO (V, E, Ma): u = A_E/36 = ${uObs.toFixed(5)} ″/yr → V ${(rV / uObs).toFixed(3)} (34), Ma ${(rM / uObs).toFixed(3)} (50)`);
console.log(`observed best common-unit quality (any N_E 10–60): worst residual ${(qObs * 100).toFixed(3)} %`);
let hits = 0;
for (let t = 0; t < TRIALS; t++) {
  const j = () => 1 + (Math.random() * 2 - 1) * 0.02;
  if (quality(rV * j(), rE * j(), rM * j()) <= qObs) hits++;
}
console.log(`null: ${hits}/${TRIALS} jittered sharp-trios fit a common unit at least this well — P ≈ ${(hits / TRIALS).toFixed(4)}`);

// THE FULL-SET NULL (§6-class): is the set of eight bare rates structured
// against a lattice beyond chance? Two tests, both with the ±2 % structure-
// preserving jitter null. Metric = Σ over planets of the fractional distance
// of N = rate/u to the nearest integer (∈ [0, 0.5] per planet; uniform
// expectation 0.25, so a random set sums to 2.0 ± 0.41).
const RATES8 = NAMES.map((p) => A[p]);
const fracDist = (x) => Math.abs(x - Math.round(x));
const sumDist = (rates, u) => rates.reduce((s, r) => s + fracDist(r / u), 0);
// Test 1 — the model's own 8H comb (u = COMB per line):
const uComb = 1296000 / (8 * TL.H);
const d1 = sumDist(RATES8, uComb);
let h1 = 0;
for (let t = 0; t < TRIALS; t++) { const r = RATES8.map((x) => x * (1 + (Math.random() * 2 - 1) * 0.02)); if (sumDist(r, uComb) <= d1) h1++; }
console.log(`\nFULL-SET null, test 1 (the 8H comb): Σ dist = ${d1.toFixed(3)} (random: 2.00 ± 0.41) — P(≤ observed) ≈ ${(h1 / TRIALS).toFixed(3)}`);
// Test 2 — ANY base: scan u, take the best Σ dist; same freedom for the null.
function bestU(rates) {
  let best = Infinity;
  for (let u = 0.10; u <= 1.20; u += 0.0005) { const d = sumDist(rates, u); if (d < best) best = d; }
  return best;
}
const d2 = bestU(RATES8);
let h2 = 0; const T2 = Math.min(TRIALS, 2000);
for (let t = 0; t < T2; t++) { const r = RATES8.map((x) => x * (1 + (Math.random() * 2 - 1) * 0.02)); if (bestU(r) <= d2) h2++; }
console.log(`FULL-SET null, test 2 (free base 0.10–1.20 ″/yr): best Σ dist = ${d2.toFixed(3)} — P(≤ observed) ≈ ${(h2 / T2).toFixed(3)} (${h2}/${T2})`);
