#!/usr/bin/env node
// THE STATISTICAL-MODE TEST (E26) — is H/3 the most-visited rate of Earth's
// wandering inertial perihelion?
//
// The last doorway on the 13:3-permanence question. A sum of rotating
// vectors spends most of its time near its slow turning points, so even
// though Earth's inertial ϖ̇ wanders (engine D), "H/3" could still label
// the system's TYPICAL state rather than a lucky instant — if 11.57 ″/yr
// were the MODE of the rate distribution. This script measures that
// distribution on the model's own ±500-kyr Wisdom–Holman integration
// (1PN on) — the same dump the NAFF pipeline reads.
//
// RESULT (measured): the mode is ≈ 8 ″/yr (13.9 % bin share), the median
// 7.9, quartiles 5.0 / 11.5 — H/3 sits at the 75TH PERCENTILE. Time spent
// within ±5 % of H/3: 5.7 % against a 4.7 % uniform-null expectation.
// H/3 is NOT the mode and is barely above chance — the statistical rescue
// fails, and with capture excluded (secular spin–orbit capture locks a
// spin precession to a FIXED eigenfrequency, never to a superposition
// wandering on 20-kyr scales against Myr-class libration; the literature's
// future p-crossings give obliquity chaos, not capture — Néron de Surgy &
// Laskar 1997) and the two clocks five orders of magnitude apart in rate
// (H ~10 %/380 Myr tidal vs M_Sun ~0.003 %), the 13:3-permanence question
// is CLOSED on every doorway tried: E22 (frames/masses/projection), E23
// (held universes), E24 (any-base scan), X1–X3 (mechanism/lock/snap), the
// force sandbox (≤1 % reach), and the statistics of the rate itself (this
// script). What IS permanent: the addition identities' form (16 = 13 + 3,
// 8 = 5 + 3 — frame arithmetic), the spin family's H(t)-scaling
// (rock-confirmed), and the composed two-engine precession (doc 99).
// Labeled: theory-vs-theory — the referee is the model's own engine D.
//
// Input dump: node tools/explore/lattice-long-window-test.mjs
//   years=1000000 integrator=wh dt=2 order=2 gr=1 frame=both sample=1000
// (the Batch D generator writes the same file.)
//
//   node tools/explore/pomega-rate-distribution.mjs [file=...] [baseYears=2000]

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const FILE = KV.file || ROOT + 'tools/explore/lattice-long-window-ecliptic-1000000-gr.local.json';
const BASE_YEARS = parseFloat(KV.baseYears || '2000');

const D = JSON.parse(readFileSync(FILE, 'utf8'));
const t = D.t, w = D.elements.earth.w;
const uw = [w[0]];
for (let i = 1; i < w.length; i++) { let dd = w[i] - w[i - 1]; while (dd > 180) dd -= 360; while (dd < -180) dd += 360; uw.push(uw[i - 1] + dd); }

const stepYears = (t[t.length - 1] - t[0]) / (t.length - 1);
const base = Math.max(2, Math.round(BASE_YEARS / stepYears));
const rates = [];
for (let i = base; i < uw.length; i += 10) rates.push((uw[i] - uw[i - base]) / (t[i] - t[i - base]) * 3600);
rates.sort((a, b) => a - b);
const q = (p) => rates[Math.floor(p * rates.length)];

const h3 = 1296000 / (TL.H / 3);   // the H/3 line, ″/yr — from the shared H, never retyped
console.log(`Earth inertial ϖ̇ over the dump span (${D.gr ? '1PN on' : 'Newton'}), sliding ${BASE_YEARS}-yr baseline, N=${rates.length}`);
console.log(`quantiles ″/yr: 5% ${q(0.05).toFixed(1)} · 25% ${q(0.25).toFixed(1)} · 50% ${q(0.5).toFixed(1)} · 75% ${q(0.75).toFixed(1)} · 95% ${q(0.95).toFixed(1)}`);

const hist = {};
for (const r of rates) { const b = Math.round(r); hist[b] = (hist[b] || 0) + 1; }
const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('mode bins (″/yr : time share %): ' + top.map(([b, c]) => `${b} : ${(100 * c / rates.length).toFixed(1)}`).join(' · '));

console.log(`\nthe H/3 line = ${h3.toFixed(2)} ″/yr (from H = ${TL.H}):`);
for (const tol of [0.05, 0.10, 0.20]) {
  const n = rates.filter((r) => Math.abs(r - h3) <= tol * h3).length;
  console.log(`  within ±${100 * tol}%: ${(100 * n / rates.length).toFixed(1)} % of the span`);
}
console.log(`  uniform-null share for the ±5 % band ≈ ${(100 * 2 * 0.05 * h3 / (q(0.95) - q(0.05))).toFixed(1)} %`);
console.log(`  H/3's percentile in the distribution: ${(100 * rates.filter((r) => r < h3).length / rates.length).toFixed(0)}th`);
