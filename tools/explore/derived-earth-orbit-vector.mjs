#!/usr/bin/env node
// DERIVED EARTH ORBIT VECTOR — doc 108 §6 "C-large step 3": the self-consistent
// secular solution for Earth's e and ϖ from the model's OWN N-body, zero fitted
// constants, evaluated as a runtime-class formula and tested three ways.
//
// Input: the NAFF mode table written by naff-frequencies.mjs (out=…) from a
// Wisdom–Holman dump — z_E(t) = Σ Aₖ e^{i(gₖ t + φₖ)}, ζ_E(t) likewise. This
// replaces doc 108's first-order Laplace–Lagrange eigenvectors (whose local
// slope was 11 % off because they were inconsistent with the N-body g₅) by the
// modes of the integration itself.
//
// Tests, each labelled by what it is:
//   (a) SELF-CONSISTENCY  — the reconstruction against the N-body series it came
//       from (residual RMS of e over the window; how much the truncated mode sum
//       loses); theory-vs-itself.
//   (b) THEORY-VS-THEORY  — against La2004 (data/la2004-earth-51myr-back.asc) over
//       the last 250 kyr / 1 Myr: correlation and RMS of e(t), RMS of ϖ_of-date.
//       La2004 is another integration of the same Newton + GR model; agreement
//       shows the two calculations are consistent, not that either is nature.
//   (c) THEORY-VS-OBSERVATION — the J2000 value, slope and curvature of e against
//       the MEASURED ones (astro-reference: e 0.016710, ė −4.20e-5/cy), and the
//       shipped H/3 law's values beside them. This is the only row in this script
//       that touches a measurement; the eclipse-chain and cardinal-point tests
//       (historical eclipses = observations) are the next step, outside this script.
//
// MEASURED on the 1-Myr mode table (16 terms, WH, 1PN):
//   with the near-duplicate frequencies KEPT (refit only): self-consistency e RMS 5.8e-5,
//     La2004 250 kyr corr 1.000 / RMS 3.9e-4, J2000 e 0.016657 ė −4.18e-5 ë −2.6e-7 — but
//     Earth's g5 term read A = 0.078 (physical ≈ 0.019): two frequencies 0.12 ″/yr apart
//     (resolution 0.36) carrying large cancelling amplitudes — an in-window fit, not a solution;
//   with near-duplicates MERGED: in-window corr 0.981 / RMS 2.5e-3; OUT of window (0.5–2 Myr
//     back) corr 0.136 / RMS 1.7e-2 — no better than the shipped H/3 law (2.2e-2); J2000 e
//     0.015985 (4 % off), ė −4.16e-5 (measured −4.20e-5), ë −2.5e-7 (Simon −2.5e-7).
// CONCLUSION: a 1-Myr window cannot resolve g3/g4, g5/4.23, g1/5.87 — the mode table fits
// its window and does not extrapolate. A DERIVED deep-time vector needs a ≥ 10–20 Myr
// integration (Laskar's NAFF windows), i.e. the item-5 run; item 1 is parked on it. The
// shipped H/3 law stays the local law until then. (This is the honest form of doc 108 §6.)
//
//   node tools/explore/derived-earth-orbit-vector.mjs [modes=tools/explore/naff-modes-ecliptic-1000000-gr.local.json] [series=tools/explore/lattice-long-window-ecliptic-1000000.local.json] [kyr=250]

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const astro = JSON.parse(readFileSync(ROOT + 'public/input/astro-reference.json', 'utf8'));
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const MODES = JSON.parse(readFileSync(KV.modes || ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json', 'utf8'));
const SERIES = JSON.parse(readFileSync(KV.series || ROOT + 'tools/explore/lattice-long-window-ecliptic-1000000.local.json', 'utf8'));
const KYR = parseFloat(KV.kyr || '250');
const R2D = 180 / Math.PI;

const E = MODES.modes.earth;
const zAt = (t) => { let re = 0, im = 0; for (const m of E.z) { const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t); re += m.re * c - m.im * s; im += m.re * s + m.im * c; } return [re, im]; };
const eAt = (t) => Math.hypot(...zAt(t));
const wAt = (t) => { const [re, im] = zAt(t); return ((Math.atan2(im, re) * R2D) % 360 + 360) % 360; };   // fixed J2000 ecliptic
const rms = (v) => Math.sqrt(v.reduce((s, q) => s + q * q, 0) / v.length);
const mean = (v) => v.reduce((s, q) => s + q, 0) / v.length;
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

console.log(`mode table: ${MODES.source} (${MODES.integrator}, ${MODES.gr ? '1PN on' : 'Newton only'}, ${MODES.terms} terms, ${MODES.spanYears.toFixed(0)} yr); Earth z modes:`);
E.z.forEach((m, i) => console.log(`   ${i + 1}  g = ${(m.omegaRadPerYr * R2D * 3600).toFixed(4).padStart(9)} ″/yr   A = ${Math.hypot(m.re, m.im).toFixed(5)}   φ = ${(Math.atan2(m.im, m.re) * R2D).toFixed(1).padStart(7)}°`));

// (a) self-consistency against the N-body series
{
  const t = SERIES.t, e = SERIES.elements.earth.e, w = SERIES.elements.earth.w;
  const de = [], dw = []; for (let i = 0; i < t.length; i += 10) { de.push(eAt(t[i]) - e[i]); dw.push(wrap(wAt(t[i]) - w[i])); }
  console.log(`\n(a) SELF-CONSISTENCY vs the N-body series (theory-vs-itself): e RMS ${rms(de).toExponential(2)} (series sd ${rms(e.map((q) => q - mean(e))).toExponential(2)}), ϖ RMS ${rms(dw).toFixed(2)}° — the truncation loss of ${MODES.terms} modes`);
}
// (b) theory-vs-theory: La2004
{
  const rows = readFileSync(ROOT + 'data/la2004-earth-51myr-back.asc', 'utf8').split('\n').map((l) => l.trim().replace(/D/g, 'E').split(/\s+/).map(Number)).filter((r) => r.length >= 4 && Number.isFinite(r[0]) && -r[0] <= KYR);
  const eL = rows.map((r) => r[1]), eD = rows.map((r) => eAt(r[0] * 1000)), eH3 = rows.map((r) => OE.computeEccentricityEarth(2000 + r[0] * 1000));
  // La2004 ϖ is from the moving equinox: add the framework's mean general precession to arg z
  const pAspy = 1296000 / (require(ROOT + 'tools/lib/constants.js').H / 13);
  const wL = rows.map((r) => r[3] * R2D), wD = rows.map((r) => wAt(r[0] * 1000) + pAspy * (r[0] * 1000) / 3600);
  console.log(`\n(b) THEORY-VS-THEORY vs La2004, last ${KYR} kyr (n ${rows.length}):`);
  console.log(`    e — derived vector:  corr ${corr(eD, eL).toFixed(3)}   RMS ${rms(eD.map((q, i) => q - eL[i])).toExponential(2)}   (doc 108 first-order L-L + N-body g5: 0.967 / 4.7e-3)`);
  console.log(`    e — shipped H/3 law: corr ${corr(eH3, eL).toFixed(3)}   RMS ${rms(eH3.map((q, i) => q - eL[i])).toExponential(2)}`);
  console.log(`    ϖ of date — derived: RMS ${rms(wD.map((q, i) => wrap(q - wL[i]))).toFixed(2)}°   (doc 108: 8.05°; the model's ϖ law: 102.85°)`);
  // out-of-sample: the mode table was fitted on ±500 kyr; La2004 beyond 500 kyr back is extrapolation
  const half = MODES.spanYears / 2000;
  const all = readFileSync(ROOT + 'data/la2004-earth-51myr-back.asc', 'utf8').split('\n').map((l) => l.trim().replace(/D/g, 'E').split(/\s+/).map(Number)).filter((r) => r.length >= 4 && Number.isFinite(r[0]) && -r[0] <= 4 * half);
  const inW = all.filter((r) => -r[0] <= half), outW = all.filter((r) => -r[0] > half);
  const stat = (rs) => { const a = rs.map((r) => r[1]), b = rs.map((r) => eAt(r[0] * 1000)); return `corr ${corr(b, a).toFixed(3)}  RMS ${rms(b.map((q, i) => q - a[i])).toExponential(2)}`; };
  console.log(`    e — in the fitted window (0–${half} kyr back): ${stat(inW)};  OUT of it (${half}–${4 * half} kyr back, extrapolation): ${stat(outW)}`);
}
// (c) theory-vs-observation: J2000 value, slope, curvature of e
{
  const e0 = eAt(0), e1 = eAt(-100), e2 = eAt(-200), ep = eAt(100);
  const edot = (ep - e1) / 2, eddot = ep - 2 * e0 + e1;
  const h0 = OE.computeEccentricityEarth(2000), h1 = OE.computeEccentricityEarth(1900), hp = OE.computeEccentricityEarth(2100);
  console.log(`\n(c) THEORY-VS-OBSERVATION at J2000 (measured: e ${astro.earthOrbital.earthEccentricityJ2000}, ė ${astro.earthOrbital.earthEccentricityDotJ2000}/cy):`);
  console.log(`    derived vector: e ${e0.toFixed(6)}   ė ${edot.toExponential(3)}/cy   ë ${eddot.toExponential(2)}/cy²`);
  console.log(`    shipped H/3:    e ${h0.toFixed(6)}   ė ${((hp - h1) / 2).toExponential(3)}/cy   ë ${(hp - 2 * h0 + h1).toExponential(2)}/cy²`);
  console.log(`    NB the derived vector is seeded from the DE J2000 state, so its e(2000) is the ephemeris value by construction; the SLOPE is the test.`);
}
console.log('\nreading: (a) says how faithful the mode sum is to its own integration; (b) says whether two integrations of the same physics agree (they should); only (c) — and the eclipse/cardinal chains next — touch observations.');
