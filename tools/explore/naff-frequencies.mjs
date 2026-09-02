#!/usr/bin/env node
// FREQUENCY ANALYSIS of the model's own N-body series — the A-type quantities
// done properly (item 3 of the N-body improvement programme).
//
// An OLS slope through an unwrapped angle is a poor estimator of a long-term
// mean: it is biased by the window edges and is meaningless for a librating
// angle. Secular dynamics is a sum of rotating vectors, so the right object is
// the complex variable z = e·e^{iϖ} (and ζ = sin(i/2)·e^{iΩ}) and its spectrum.
// This script implements Laskar's numerical analysis of fundamental frequencies
// (NAFF, Laskar 1990/1993) on the series dumped by lattice-long-window-test.mjs:
//   1. Hann-window the series; find the strongest peak of |⟨z, e^{iωt}⟩| on an
//      FFT grid; refine ω by golden-section maximisation of the windowed product;
//   2. project out that component (amplitude and phase by the windowed inner
//      product, Gram–Schmidt against the ones already found); repeat.
// Output per planet: the leading frequencies (″/yr and ″/cy), periods, amplitudes,
// with the nearest 8H/N and the Laskar 2004 g/s for reference. The dominant term
// of z is the planet's long-term apsidal rotation; the dominant term of ζ its nodal
// regression — quantity A, without any window bias.
//
// RESOLUTION: two frequencies closer than ~1/span cannot be separated — on a
// 100-kyr window that is ≈ 3.6 ″/yr, so g3 (17.37) and g4 (17.92) blend (Mars's
// leading term reads 16.87 with the summed amplitude); 1 Myr resolves ≈ 0.36 ″/yr,
// still marginal for that pair; 10 Myr separates everything in the g/s set.
// MEASURED (100-kyr WH dump, Newton only): Jupiter 4.334 (g5 4.2575), Saturn
// 28.339 (g6 28.2455) with g5 second at 0.033 vs 0.048 amplitude — the two-vector
// structure behind its retrograde windows; Mercury 5.240 (Laskar 5.5965 INCLUDES
// relativity; the 1PN term raises g1 by ≈ 0.43 ″/yr — run the dump with gr=1 to see it).
//
// MEASURED, 1-Myr WH dumps (leading term of z per planet, ″/yr; Laskar 2004 in brackets):
//   Newton only: Mercury g1 5.1032 · Venus g2 7.321 · Earth g5-led 4.304 · Mars g4 17.903 [17.916]
//                · Jupiter g5 4.2562 [4.2575] · Saturn g6 28.2453 [28.2455] (g5 second, 0.033 vs 0.048)
//                · Uranus g5-led 3.921 · Neptune g8 0.607 [0.673]
//   1PN on:      Mercury g1 5.5757 [5.5965] — the relativistic term raises Mercury's long-term
//                apsidal frequency by 0.473 ″/yr = 47.3 ″/cy; Mars 17.917, Jupiter 4.2568, Saturn 28.2456
//   nodes (ζ, invariable-plane dump): s1 −5.573 [−5.620] · s2 −7.26 [−7.08] · s3 −18.34/−18.40 [−18.85]
//                · s4 −17.55 [−17.76] · s6 −26.3477 [−26.3475] · s7 −3.000 [−2.993] · s8 −0.71 [−0.69]
//   Against the lattice: Mercury 8H/11 = 5.314 sits between the Newtonian g1 (5.10) and the
//   relativistic g1 (5.58) — it is neither mean; Mars 8H/36 = 17.39 is 2.9 % under g4; the node
//   divisors: Earth −8H/40 (−5.76) vs s3 −5.5 (5 %), Mercury −8H/9 (−4.35) vs s1 −5.57 (22 %),
//   Mars −8H/64 (−9.22) vs s4 −5.27 (75 %), Jupiter/Saturn −8H/36 (−5.19) vs s6 −7.86 (34 %),
//   Uranus −8H/11 (−1.58) vs s7 −0.89, Neptune −8H/3 (−0.43) vs s8 −0.21. The g/s frequencies of
//   the model's own N-body are NOT on 8H/N integers (Mercury's g2 component at 8H/16.00 and s6 at
//   −8H/54.54 are the closest) — the doc-108 conclusion, now from the model's own engine at 1 Myr.
//
//   node tools/explore/naff-frequencies.mjs [file=tools/explore/lattice-long-window-ecliptic-1000000.local.json] [terms=6]

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const FILE = KV.file || ROOT + 'tools/explore/lattice-long-window-ecliptic-1000000.local.json';
const NTERMS = parseInt(KV.terms || '6', 10);
const D = JSON.parse(readFileSync(FILE, 'utf8'));
const t = Float64Array.from(D.t);                                  // years from J2000
const N = t.length, span = t[N - 1] - t[0];
const H = TL.H, D2R = Math.PI / 180;
const LASKAR = { g: { g1: 5.5965, g2: 7.4555, g3: 17.3711, g4: 17.9159, g5: 4.2575, g6: 28.2455, g7: 3.0876, g8: 0.6730 }, s: { s1: -5.6197, s2: -7.0797, s3: -18.8506, s4: -17.7553, s6: -26.3475, s7: -2.9927, s8: -0.6919 } };

// Hann window, normalised inner product ⟨z, e^{iωt}⟩ over the window
const win = new Float64Array(N); let wsum = 0;
for (let i = 0; i < N; i++) { win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1))); wsum += win[i]; }
function proj(zr, zi, omega) {   // returns complex amplitude ⟨z e^{-iωt}⟩ (window-weighted mean)
  let ar = 0, ai = 0;
  for (let i = 0; i < N; i++) { const ph = -omega * t[i], c = Math.cos(ph), s = Math.sin(ph); ar += win[i] * (zr[i] * c - zi[i] * s); ai += win[i] * (zr[i] * s + zi[i] * c); }
  return [ar / wsum, ai / wsum];
}
// The search (grid + golden section) runs on a decimated copy — the secular band
// is below 1/5000 yr, so a ~40k-point stride keeps it far above Nyquist — and the
// final projection of each component uses the full series.
const STRIDE = Math.max(1, Math.ceil(N / 40000));
const tD = Float64Array.from(t.filter((_, i) => i % STRIDE === 0)), winD = Float64Array.from(win.filter((_, i) => i % STRIDE === 0)), wsumD = winD.reduce((s, x) => s + x, 0);
function ampD(zr, zi, omega) {
  let ar = 0, ai = 0;
  for (let j = 0, i = 0; i < N; i += STRIDE, j++) { const ph = -omega * tD[j], c = Math.cos(ph), s = Math.sin(ph); ar += winD[j] * (zr[i] * c - zi[i] * s); ai += winD[j] * (zr[i] * s + zi[i] * c); }
  return Math.hypot(ar, ai) / wsumD;
}
function refine(zr, zi, w0, dw) {   // golden-section max of |proj| on [w0−dw, w0+dw], decimated
  let a = w0 - dw, b = w0 + dw; const g = (Math.sqrt(5) - 1) / 2;
  let x1 = b - g * (b - a), x2 = a + g * (b - a), f1 = ampD(zr, zi, x1), f2 = ampD(zr, zi, x2);
  for (let k = 0; k < 80; k++) { if (f1 > f2) { b = x2; x2 = x1; f2 = f1; x1 = b - g * (b - a); f1 = ampD(zr, zi, x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + g * (b - a); f2 = ampD(zr, zi, x2); } }
  return (a + b) / 2;
}
function naff(zr, zi, nterms) {
  const found = [];
  const r = Float64Array.from(zr), im = Float64Array.from(zi);
  // grid: frequencies from −max to +max with step 2π/(4·span) (oversampled ×4), max = 2π·N/(8·span) (well below Nyquist of the 1000-d sampling)
  const dwGrid = 2 * Math.PI / (4 * span), wmax = 2 * Math.PI * 60 / 1;   // ±60 cycles/yr cap is far above any secular rate; restrict below
  const wcap = 2 * Math.PI / 5000;   // 5,000-yr shortest period considered (secular band)
  for (let term = 0; term < nterms; term++) {
    let best = { w: 0, a: -1 };
    for (let w = -wcap; w <= wcap; w += dwGrid) { const a = ampD(r, im, w); if (a > best.a) best = { w, a }; }
    const w = refine(r, im, best.w, dwGrid);
    const [ar, ai] = proj(r, im, w);
    // Gram–Schmidt: subtract this component from the residual
    for (let i = 0; i < N; i++) { const c = Math.cos(w * t[i]), s = Math.sin(w * t[i]); r[i] -= ar * c - ai * s; im[i] -= ar * s + ai * c; }
    found.push({ omega: w, ampl: Math.hypot(ar, ai), phaseDeg: Math.atan2(ai, ar) / D2R });
  }
  // Least-squares refit of the complex amplitudes at the found frequencies on the
  // FULL, unwindowed series (the Hann projection biases amplitudes; measured on
  // Earth: e(2000) 0.017145 → the refit removes the bias). Normal equations
  // G a = b with G_jk = Σ e^{i(ω_k − ω_j)t}, b_j = Σ z e^{−iω_j t}.
  // Frequencies closer than half the resolution (π/span) are NOT independent:
  // refitting both gives large cancelling amplitudes that fit the window and
  // diverge outside it (measured: Earth's g5 term read 0.078 instead of ~0.019
  // with 4.3464 and 4.2274 ″/yr both kept). Such near-duplicates are dropped
  // before the refit; the first-found (larger) one carries the amplitude.
  const tol = Math.PI / span;
  for (let j = found.length - 1; j > 0; j--) for (let i = 0; i < j; i++) if (Math.abs(found[j].omega - found[i].omega) < tol) { found.splice(j, 1); break; }
  const M = found.length;
  const G = Array.from({ length: M }, () => Array(M).fill(null).map(() => [0, 0])), B = Array.from({ length: M }, () => [0, 0]);
  const step = Math.max(1, Math.floor(N / 100000));
  for (let i = 0; i < N; i += step) {
    const cs = found.map((f) => [Math.cos(f.omega * t[i]), Math.sin(f.omega * t[i])]);
    for (let j = 0; j < M; j++) {
      B[j][0] += zr[i] * cs[j][0] + zi[i] * cs[j][1]; B[j][1] += zi[i] * cs[j][0] - zr[i] * cs[j][1];
      for (let k = 0; k < M; k++) { G[j][k][0] += cs[k][0] * cs[j][0] + cs[k][1] * cs[j][1]; G[j][k][1] += cs[k][1] * cs[j][0] - cs[k][0] * cs[j][1]; }
    }
  }
  // complex Gaussian elimination
  const A = G.map((row, j) => [...row.map((c) => [c[0], c[1]]), [B[j][0], B[j][1]]]);
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  for (let c = 0; c < M; c++) {
    let piv = c; for (let r = c + 1; r < M; r++) if (Math.hypot(...A[r][c]) > Math.hypot(...A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < M; r++) { if (r === c) continue; const f = cdiv(A[r][c], A[c][c]); for (let k = c; k <= M; k++) { const m = cmul(f, A[c][k]); A[r][k] = [A[r][k][0] - m[0], A[r][k][1] - m[1]]; } }
  }
  for (let j = 0; j < M; j++) { const a = cdiv(A[j][M], A[j][j]); found[j].ampl = Math.hypot(a[0], a[1]); found[j].phaseDeg = Math.atan2(a[1], a[0]) / D2R; }
  return found;
}
const nearest8HN = (ratePerYrArcsec) => { const P = 1296000 / ratePerYrArcsec; const Nn = 8 * H / P; return `${Nn < 0 ? '−' : ''}8H/${Math.abs(Nn).toFixed(2)}`; };
const nearestLaskar = (rate, set) => { let b = null; for (const [k, v] of Object.entries(set)) if (b === null || Math.abs(v - rate) < Math.abs(set[b] - rate)) b = k; return `${b} ${set[b]}`; };

console.log(`file ${FILE.replace(ROOT, '')}: ${D.integrator} dt ${D.dt} d, ${D.frame} frame, ${D.gr ? '1PN on' : 'Newton only'}, ${N} samples over ${span.toFixed(0)} yr`);
// out=<file>: write the mode table {planet: {z: [{omegaRadPerYr, re, im}], zeta: [...]}} — the
// runtime-evaluable secular solution (z(t) = Σ (re + i·im)·e^{iωt}, t in years from J2000)
const MODES = {};
for (const k of Object.keys(D.elements)) {
  const E = D.elements[k];
  const zr = E.e.map((e, i) => e * Math.cos(E.w[i] * D2R)), zi = E.e.map((e, i) => e * Math.sin(E.w[i] * D2R));
  const sr = E.inc.map((inc, i) => Math.sin(inc * D2R / 2) * Math.cos(E.Om[i] * D2R)), si = E.inc.map((inc, i) => Math.sin(inc * D2R / 2) * Math.sin(E.Om[i] * D2R));
  const lat = k === 'earth' ? null : 1296000 / TL.planets[k].perihelionEclipticYears;   // ″/yr
  console.log(`\n${k.toUpperCase()}  — z = e·e^{iϖ} (apsidal)   lattice 8H/N: ${lat === null ? '—' : lat.toFixed(3) + ' ″/yr'}`);
  console.log('   #    freq ″/yr    ″/cy     period yr     ampl     nearest 8H/N   nearest Laskar g');
  const zModes = naff(zr, zi, NTERMS);
  zModes.forEach((f, i) => { const asy = f.omega / D2R * 3600; console.log(`   ${i + 1}  ${asy.toFixed(4).padStart(10)} ${(asy * 100).toFixed(1).padStart(8)} ${(360 * 3600 / asy).toFixed(0).padStart(12)} ${f.ampl.toFixed(5).padStart(9)}   ${nearest8HN(asy).padStart(12)}   ${nearestLaskar(asy, LASKAR.g)}`); });
  console.log(`   ζ = sin(i/2)·e^{iΩ} (nodal)`);
  console.log('   #    freq ″/yr    ″/cy     period yr     ampl     nearest 8H/N   nearest Laskar s');
  const sModes = naff(sr, si, Math.min(NTERMS, 8));
  sModes.forEach((f, i) => { const asy = f.omega / D2R * 3600; console.log(`   ${i + 1}  ${asy.toFixed(4).padStart(10)} ${(asy * 100).toFixed(1).padStart(8)} ${(360 * 3600 / asy).toFixed(0).padStart(12)} ${f.ampl.toFixed(5).padStart(9)}   ${nearest8HN(asy).padStart(12)}   ${nearestLaskar(asy, LASKAR.s)}`); });
  const toRow = (f) => ({ omegaRadPerYr: f.omega, re: f.ampl * Math.cos(f.phaseDeg * D2R), im: f.ampl * Math.sin(f.phaseDeg * D2R) });
  MODES[k] = { z: zModes.map(toRow), zeta: sModes.map(toRow) };
}
if (KV.out) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(KV.out, JSON.stringify({ source: FILE.replace(ROOT, ''), integrator: D.integrator, gr: D.gr, frame: D.frame, spanYears: span, terms: NTERMS, note: 'z(t) = Σ (re + i im) e^{i ω t}, t years from J2000; e = |z|, ϖ = arg z; ζ likewise with sin(i/2), Ω', modes: MODES }, null, 1));
  console.log(`\nwrote mode table ${KV.out}`);
}
console.log('\nreading: the largest-amplitude term of z is the planet\'s long-term apsidal rotation (quantity A); a planet whose leading terms have comparable amplitudes (Saturn: g5, g6) has no single "rate" and its window trend can even change sign. Frequencies are in the readout frame of the dump (ecliptic-J2000 vs invariable plane matters for ζ).');
