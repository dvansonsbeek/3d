#!/usr/bin/env node
// THE SNAP-EPOCH SEARCH (owner's question 2026-09-04: "was the perihelion
// configuration ~998 ka extraordinary?"; X3 assessment §4b, plan 02).
// Input: ./backward-1myr-z.local.json (run backward-1myr-dump.mjs first).
// Pre-registered statistics:
//  S1 alignment: R_n(t) = |Σ e^{iϖ_j}|/n for all 8 and for the inner 4;
//     null = surrogate drifts (measured mean rates, random initial phases),
//     max-over-the-Myr distribution from 2000 Monte-Carlo draws.
//  S2 lattice-phase misfit: mean angular distance between the free ϖ_j(t)
//     and the model's lattice lines wound back from their J2000 anchors —
//     by construction 0 at J2000; the question is whether any OTHER epoch
//     (e.g. 998 ka) approaches it.
//  S3 the raw configuration table at 998 ka.
//
// RESULT (2026-09-04): 998 ka is ORDINARY — 26 % of the Myr's epochs are more
// aligned (R8 0.483; R4 0.633, 35 %); the Myr's best alignments (R8 0.763 @
// 59 ka, R4 0.989 @ 272 ka) are chance-level vs the surrogate null (P 0.31 /
// 0.10). S2: misfit at 998 ka = 103.8° — WORSE than the 90° random
// expectation; the only epoch where free and lattice configurations coincide
// is J2000 (0° by anchoring) — a snap at 998 ka needs re-anchored phases =
// unfalsifiable. S3: loose Me/V/J grouping (ϖ 312–333°), Earth−Venus Δϖ
// −55.8°, e's = the free past. Sign lesson: e-vector invariant under time
// reversal — no mirror (first pass wrongly negated h; caught vs +1157 ″/cy).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const { readFileSync } = require('node:fs');
const TL = require(ROOT + 'tools/lib/constants.js');
const D = JSON.parse(readFileSync(new URL('./backward-1myr-z.local.json', import.meta.url), 'utf8'));
const NAMES = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const S = D.sampleYears, N = D.z[0].k.length;
// time reversal leaves the e-vector INVARIANT ((−v)×(−h) = v×h): no mirror.
const pom = D.z.map((zi) => zi.k.map((k, j) => Math.atan2(zi.h[j], k)));
const eArr = D.z.map((zi) => zi.k.map((k, j) => Math.hypot(k, zi.h[j])));
const R = (idx, t) => {
  let x = 0, y = 0;
  for (const i of idx) { x += Math.cos(pom[i][t]); y += Math.sin(pom[i][t]); }
  return Math.hypot(x, y) / idx.length;
};
const ALL = [0, 1, 2, 3, 4, 5, 6, 7], INNER = [0, 1, 2, 3];
let m8 = [0, 0], m4 = [0, 0];
const t998 = Math.round(998000 / S);
for (let t = 0; t < N; t++) { const r8 = R(ALL, t), r4 = R(INNER, t); if (r8 > m8[0]) m8 = [r8, t]; if (r4 > m4[0]) m4 = [r4, t]; }
console.log(`S1 ALIGNMENT over the past 1 Myr (${N} epochs, ${S}-yr cadence):`);
console.log(`  R8 max ${m8[0].toFixed(3)} at ${(m8[1] * S / 1000).toFixed(0)} ka | R8 at 998 ka: ${R(ALL, t998).toFixed(3)}`);
console.log(`  R4 max ${m4[0].toFixed(3)} at ${(m4[1] * S / 1000).toFixed(0)} ka | R4 at 998 ka: ${R(INNER, t998).toFixed(3)}`);
const rank = (idx, v) => { let c = 0; for (let t = 0; t < N; t++) if (R(idx, t) > v) c++; return c / N; };
console.log(`  fraction of epochs MORE aligned than 998 ka: R8 ${(rank(ALL, R(ALL, t998)) * 100).toFixed(1)} %, R4 ${(rank(INNER, R(INNER, t998)) * 100).toFixed(1)} %`);
// Monte-Carlo null for the scan maximum: drifting phases at the measured mean rates
const rate = pom.map((pp) => { // mean unwrapped rate rad per sample
  let acc = 0, prev = pp[0], tot = 0;
  for (let t = 1; t < N; t++) { let d = pp[t] - prev; if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI; prev = pp[t]; acc += d; tot++; }
  return acc / tot;
});
function mcMax(idx) {
  const M = 2000, out = [];
  for (let m = 0; m < M; m++) {
    const p0 = idx.map(() => Math.random() * 2 * Math.PI);
    let best = 0;
    for (let t = 0; t < N; t += 5) {
      let x = 0, y = 0;
      for (const [q, i] of idx.entries()) { const a = p0[q] + rate[i] * t; x += Math.cos(a); y += Math.sin(a); }
      const r = Math.hypot(x, y) / idx.length;
      if (r > best) best = r;
    }
    out.push(best);
  }
  out.sort((a, b) => a - b);
  return out;
}
const n8 = mcMax(ALL), n4 = mcMax(INNER);
const pct = (arr, v) => arr.filter((x) => x >= v).length / arr.length;
console.log(`  NULL (2000 surrogate Myr-scans): R8 max median ${n8[1000].toFixed(3)}, P(scan max ≥ observed ${m8[0].toFixed(3)}) = ${pct(n8, m8[0]).toFixed(2)}`);
console.log(`                                   R4 max median ${n4[1000].toFixed(3)}, P(scan max ≥ observed ${m4[0].toFixed(3)}) = ${pct(n4, m4[0]).toFixed(2)}`);
// S2 lattice-phase misfit vs the wound-back model lines
const MODEL_N = { mercury: 11, venus: -6, earth: 24, mars: 36, jupiter: 39, saturn: -65, uranus: 24, neptune: 4 };
const COMB = 2 * Math.PI / (8 * TL.H);      // rad/yr per line N
const th0 = pom.map((pp) => pp[0]);          // J2000 anchors (t index 0 = J2000)
let best = [1e9, 0];
const mis = new Float64Array(N);
for (let t = 0; t < N; t++) {
  let s2 = 0;
  for (const [i, p] of NAMES.entries()) {
    const target = th0[i] - MODEL_N[p] * COMB * (t * S);   // wound BACK
    let d = pom[i][t] - target; d = Math.atan2(Math.sin(d), Math.cos(d));
    s2 += Math.abs(d);
  }
  mis[t] = s2 / 8;
  if (t > 0 && mis[t] < best[0]) best = [mis[t], t];
}
console.log(`\nS2 LATTICE-PHASE MISFIT (free ϖ vs the model lines wound back from J2000):`);
console.log(`  at J2000: ${(mis[0] * 180 / Math.PI).toFixed(1)}° (0 by construction) | at 998 ka: ${(mis[t998] * 180 / Math.PI).toFixed(1)}° | best epoch OTHER than J2000: ${(best[0] * 180 / Math.PI).toFixed(1)}° at ${(best[1] * S / 1000).toFixed(0)} ka | random-phase expectation: 90°`);
// S3 the raw configuration at 998 ka
console.log(`\nS3 THE CONFIGURATION AT 998 ka (ecliptic ϖ, °; e):`);
for (const [i, p] of NAMES.entries()) console.log(`  ${p.padEnd(8)} ϖ ${((pom[i][t998] * 180 / Math.PI + 360) % 360).toFixed(1).padStart(6)}°   e ${eArr[i][t998].toFixed(4)}`);
let dEV = pom[2][t998] - pom[1][t998]; dEV = Math.atan2(Math.sin(dEV), Math.cos(dEV));
console.log(`  Earth−Venus Δϖ at 998 ka: ${(dEV * 180 / Math.PI).toFixed(1)}°`);
