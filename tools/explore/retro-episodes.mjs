#!/usr/bin/env node
// THE "KNOBS" — Earth's retrograde-perihelion episodes of the past 1 Myr
// (owner's question 2026-09-04 on the free-universe z-plate; X3 assessment
// §4b, plan 02). Input: ./backward-1myr-z.local.json (backward-1myr-dump.mjs).
// Extracts every interval where the forward-in-real-time ϖ̇ < 0 (1.2-kyr
// smoothing) plus the deep e-minima for the 405-node cross-reference.
//
// RESULT (2026-09-04): five short episodes — 918–901, 652–635, 544–527,
// 273–261, 49–40 ka (8–17 kyr each, peak retro rates −190 to −2,400 ″/cy),
// all during e-dips < ~0.022 — and they do NOT coincide with MIS-11-class
// events: the two DEEPEST minima (374 ka ≈ MIS 11, 749 ka ≈ MIS 19, one
// 405-node apart; engine epochs 20–30 kyr from the dated stages = expected
// phase drift) host prograde SURGES (+8,000 ″/cy class) instead — the loop
// direction at a near-origin passage depends on which side of the origin z
// passes. Knob epochs fall in MIS 3/8/13-14/16/23, mostly glacials. Climate
// couples to |z| (e), never to sign(ϖ̇). Sign lesson: e-vector invariant
// under time reversal — no mirror (first pass negated h; caught against the
// known +1157 ″/cy J2000 forward rate).
import { createRequire } from 'node:module';
const requireLocal = createRequire(import.meta.url);
const { readFileSync } = requireLocal('node:fs');
const D = JSON.parse(readFileSync(new URL('./backward-1myr-z.local.json', import.meta.url), 'utf8'));
const S = D.sampleYears, zi = D.z[2];   // Earth
const N = zi.k.length;
// index i = i*S years BEFORE J2000; no mirror (see header)
const pom = zi.k.map((k, j) => Math.atan2(zi.h[j], k));
const e = zi.k.map((k, j) => Math.hypot(k, zi.h[j]));
// unwrap along increasing index (going into the past)
const un = [pom[0]];
for (let i = 1; i < N; i++) { let d = pom[i] - un[i - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; un.push(un[i - 1] + d); }
// forward-in-real-time rate at epoch i (real time runs index-decreasing)
const W = 3;   // ±600 yr
const rate = new Float64Array(N);
for (let i = W; i < N - W; i++) rate[i] = (un[i - W] - un[i + W]) / (2 * W * S) * 206264.806 * 100;   // ″/cy forward in time
// retrograde intervals: rate < 0 sustained ≥ 1 kyr
const events = [];
let cur = null;
for (let i = N - W - 1; i >= W; i--) {   // sweep old → recent (real-time order)
  if (rate[i] < 0) {
    if (!cur) cur = { i0: i, i1: i, minE: e[i], peak: 0 };
    cur.i1 = i;
    if (e[i] < cur.minE) cur.minE = e[i];
    if (rate[i] < cur.peak) cur.peak = rate[i];
  } else if (cur) {
    if ((cur.i0 - cur.i1 + 1) * S >= 1000) events.push(cur);
    cur = null;
  }
}
if (cur && (cur.i0 - cur.i1 + 1) * S >= 1000) events.push(cur);
console.log('retrograde-ϖ episodes of Earth, past 1 Myr (free dynamics; epochs = ka before J2000):');
console.log('  from     to     duration   min e     peak retro rate');
for (const ev of events) {
  console.log(
    `  ${(ev.i0 * S / 1000).toFixed(0).padStart(4)} ka ${(ev.i1 * S / 1000).toFixed(0).padStart(4)} ka`
    + `   ${((ev.i0 - ev.i1 + 1) * S / 1000).toFixed(1).padStart(5)} kyr`
    + `   ${ev.minE.toFixed(4)}`
    + `   ${ev.peak.toFixed(0).padStart(8)} ″/cy`
  );
}
console.log('\ndeep e-minima (e < 0.01), for the 405-node cross-reference:');
for (let i = 10; i < N - 10; i++) {
  if (e[i] < 0.01 && e[i] <= Math.min(...e.slice(i - 10, i + 11))) console.log(`  ${(i * S / 1000).toFixed(0).padStart(4)} ka   e ${e[i].toFixed(4)}`);
}
console.log('\nsanity — forward rate near J2000 (expect ≈ +1157 ″/cy):', ((un[0] - un[10]) / (10 * S) * 206264.806 * 100).toFixed(0));
