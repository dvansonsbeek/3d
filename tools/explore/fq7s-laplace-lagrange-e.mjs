// OPTION C-LARGE, STEP 1 — Earth's eccentricity from the framework's OWN
// Laplace–Lagrange secular theory (zero fitted constants).
//
// z_j = e_j·e^{iϖ_j} for the 8 planets obeys ż = i·A·z (first-order
// secular theory; Murray & Dermott ch. 7). Inputs are all framework
// quantities: GM_SUN, GM_EARTH_MOON_SYSTEM (the EMB mass), the DE440
// planet mass ratios (declared IAU inputs), orbital periods (framework
// records), and the J2000 e/ϖ per planet (epoch initial conditions,
// "anchored by design"). Eigenvalues g_i are the secular apsidal
// frequencies; Earth's row of the eigenvectors, scaled by the J2000
// ICs, gives z_Earth(t) = Σ c_i V_Ei e^{i g_i t} and e(t) = |z|.
//
// Outputs: the g_i vs Laskar's published values and vs the lattice
// (8H/n); e(t) vs La2004 over the last 2 Myr (RMS, correlation, the
// spectrum peaks); the J2000 slope/curvature. This is the derivation
// path for a frame-invariant e = |z| — the C-large candidate.
//
// Usage: node tools/explore/fq7s-laplace-lagrange-e.mjs [myr=2]

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const TL = require('./tools/lib/constants.js');
const { DEFAULT_CONSTANTS: C } = require('@essrt/physics');
const P = require('./tools/explore/derive-planetary-lunar-terms.js');

const MYR = parseFloat(process.argv[2] || '2');
const D2R = Math.PI / 180, AS = 206264.806;
const GM_S = TL.GM_SUN;
const GM_EM = P.GM_EM;

// ── the 8 planets: mass ratio (planet/Sun), period (yr), J2000 e, ϖ ─────
const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const pl = names.map((k) => {
  if (k === 'earth') return { k, m: GM_EM / GM_S, T: TL.yearLengthRef.siderealYear / 365.25, e: C.earthOrbital.earthEccentricityJ2000, w: C.earthOrbital.earthPerihelionLongitudeJ2000 * D2R };
  const p = TL.planets[k];
  return { k, m: 1 / TL.massRatioDE440[k], T: p.solarYearInput / 365.25, e: p.orbitalEccentricityJ2000, w: p.longitudePerihelion * D2R };
});
for (const p of pl) { p.n = 2 * Math.PI / p.T; p.a = Math.cbrt((1 + p.m) * p.T * p.T); }   // AU, yr, GM_S = 4π² units
const N = pl.length;

// Laplace coefficients b^{(j)}_{3/2}(α) by quadrature
const bLap = (j, alpha) => {
  const M = 4096; let s = 0;
  for (let i = 0; i < M; i++) { const psi = (i + 0.5) * 2 * Math.PI / M; s += Math.cos(j * psi) / Math.pow(1 - 2 * alpha * Math.cos(psi) + alpha * alpha, 1.5); }
  return s * 2 / M;
};
// secular matrix A (rad/yr)
const A = Array.from({ length: N }, () => new Float64Array(N));
for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
  if (j === k) continue;
  const aj = pl[j].a, ak = pl[k].a;
  const alpha = aj < ak ? aj / ak : ak / aj;
  const abar = aj < ak ? alpha : 1;
  const f = (pl[j].n / 4) * (pl[k].m / (1 + pl[j].m)) * alpha * abar;
  A[j][j] += f * bLap(1, alpha);
  A[j][k] = -f * bLap(2, alpha);
}
// symmetrize with L_j = m_j·n_j·a_j² (the LL invariant weights) → B = L^{1/2} A L^{-1/2}
const L = pl.map((p) => p.m * p.n * p.a * p.a);
const B = Array.from({ length: N }, (_, j) => Float64Array.from({ length: N }, (_, k) => A[j][k] * Math.sqrt(L[j] / L[k])));
// Jacobi eigen-decomposition of B (symmetric)
const V = Array.from({ length: N }, (_, i) => Float64Array.from({ length: N }, (_, j) => (i === j ? 1 : 0)));
const S = B.map((r) => Float64Array.from(r));
for (let sweep = 0; sweep < 100; sweep++) {
  let off = 0; for (let p = 0; p < N; p++) for (let q = p + 1; q < N; q++) off += S[p][q] * S[p][q];
  if (off < 1e-30) break;
  for (let p = 0; p < N; p++) for (let q = p + 1; q < N; q++) {
    if (Math.abs(S[p][q]) < 1e-18) continue;
    const th = 0.5 * Math.atan2(2 * S[p][q], S[q][q] - S[p][p]);
    const c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < N; k++) { const spk = S[p][k], sqk = S[q][k]; S[p][k] = c * spk - s * sqk; S[q][k] = s * spk + c * sqk; }
    for (let k = 0; k < N; k++) { const skp = S[k][p], skq = S[k][q]; S[k][p] = c * skp - s * skq; S[k][q] = s * skp + c * skq; }
    for (let k = 0; k < N; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
  }
}
const g = Array.from({ length: N }, (_, i) => S[i][i]);                       // rad/yr
// DIAGNOSTIC ONLY (argv[3] = 'laskar-g5g7'): substitute Laskar's g5/g7 for
// the first-order values to test whether the J–S frequency error alone
// explains the >0.5 Myr dephasing. Not a derivation — a sensitivity probe.
if (process.argv[3] === 'laskar-g5g7') {
  const sortedIdx = g.map((v, i) => i).sort((a, b) => g[b] - g[a]);
  const i5 = sortedIdx[5], i7 = sortedIdx[6];   // 6th and 7th highest = g5-class (3.74) and g7-class (2.73)
  g[i5] = 4.2575 / AS; g[i7] = 3.0876 / AS;
  console.log('DIAGNOSTIC: g5/g7 replaced by Laskar 4.2575/3.0876 ″/yr (eigenvectors unchanged)');
}
// DERIVATION (argv[3] = 'g5=<value>'): the g5-class frequency from the
// FRAMEWORK'S OWN 9-body integration (fq7s-nbody-g.mjs: 4.224 ″/yr over
// 100 kyr, Laskar 4.2575) — eigenvectors from LL, g5 from the framework
// N-body: every input is the framework's. Zero fitted constants.
const g5arg = process.argv.slice(3).find((a) => a.startsWith('g5='));
if (g5arg) {
  const sortedIdx = g.map((v, i) => i).sort((a, b) => g[b] - g[a]);
  g[sortedIdx[5]] = parseFloat(g5arg.slice(3)) / AS;
  console.log(`DERIVED g5 substituted from the framework N-body: ${g5arg.slice(3)} ″/yr (eigenvectors from LL)`);
}
const E = Array.from({ length: N }, (_, j) => Float64Array.from({ length: N }, (_, i) => V[j][i] / Math.sqrt(L[j])));   // eigenvectors of A
// order by frequency
const order = g.map((v, i) => i).sort((a, b) => g[b] - g[a]);

// fit the J2000 ICs: z_j(0) = Σ_i E_ji c_i  (c complex) — solve E·c = z0 twice (real, imag)
const solve = (M, b) => {
  const n = b.length, Mm = M.map((r) => Array.from(r)), x = Array.from(b);
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(Mm[r][c]) > Math.abs(Mm[piv][c])) piv = r;
    [Mm[c], Mm[piv]] = [Mm[piv], Mm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < n; r++) { const f = Mm[r][c] / Mm[c][c]; for (let cc = c; cc < n; cc++) Mm[r][cc] -= f * Mm[c][cc]; x[r] -= f * x[c]; }
  }
  const out = new Float64Array(n);
  for (let c = n - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < n; cc++) s -= Mm[c][cc] * out[cc]; out[c] = s / Mm[c][c]; }
  return out;
};
const cRe = solve(E, pl.map((p) => p.e * Math.cos(p.w)));
const cIm = solve(E, pl.map((p) => p.e * Math.sin(p.w)));
const iE = 2;   // Earth row
const modeAmp = order.map((i) => Math.hypot(cRe[i], cIm[i]) * Math.abs(E[iE][i]));

// Laskar's published g_i (″/yr) for reference labels
const LASKAR_G = { g1: 5.59, g2: 7.45, g3: 17.37, g4: 17.92, g5: 4.26, g6: 28.25, g7: 3.09, g8: 0.67 };
const H8 = 8 * C.foundational.holisticyearLength;
console.log('Laplace–Lagrange on the framework planets — secular apsidal eigenfrequencies:');
console.log('   g (″/yr)   period (kyr)   8H/n     Earth-mode amplitude   nearest Laskar g');
for (let r = 0; r < N; r++) {
  const i = order[r];
  const gas = g[i] * AS, per = 2 * Math.PI / g[i] / 1000;
  const n8 = H8 / (2 * Math.PI / g[i]);
  const near = Object.entries(LASKAR_G).sort((a, b) => Math.abs(a[1] - gas) - Math.abs(b[1] - gas))[0];
  console.log(`   ${gas.toFixed(2).padStart(7)}   ${per.toFixed(1).padStart(8)}   ${n8.toFixed(2).padStart(6)}   ${modeAmp[r].toFixed(5).padStart(12)}          ${near[0]} ${near[1]}`);
}

// Earth e(t) = |z(t)|, t in years (negative = past), vs La2004
const zE = (t) => { let re = 0, im = 0; for (let i = 0; i < N; i++) { const ph = g[i] * t; const cr = cRe[i], ci = cIm[i]; re += E[iE][i] * (cr * Math.cos(ph) - ci * Math.sin(ph)); im += E[iE][i] * (cr * Math.sin(ph) + ci * Math.cos(ph)); } return [re, im]; };
const rows = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8')
  .split('\n').map((l) => l.trim().replace(/D/g, 'E').split(/\s+/).map(Number)).filter((r) => r.length >= 4 && Number.isFinite(r[0]) && -r[0] <= MYR * 1000);
const eL = [], eM = [];
for (const [tk, e] of rows) { eL.push(e); eM.push(Math.hypot(...zE(tk * 1000))); }
const mean = (v) => v.reduce((s, q) => s + q, 0) / v.length;
const sd = (v) => { const m = mean(v); return Math.sqrt(v.reduce((s, q) => s + (q - m) ** 2, 0) / v.length); };
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
const diff = eL.map((v, i) => eM[i] - v);
console.log(`\nEarth e(t), last ${MYR} Myr (n ${rows.length}): La2004 mean ${mean(eL).toFixed(4)} sd ${sd(eL).toFixed(4)} · LL mean ${mean(eM).toFixed(4)} sd ${sd(eM).toFixed(4)} · RMS diff ${Math.sqrt(mean(diff.map((d) => d * d))).toFixed(4)} · corr ${corr(eL, eM).toFixed(3)}`);
console.log(`  (for scale: the shipped H/3 line vs La2004 read RMS 2.2e-2 over 250 kyr; a flat e = mean would read ${sd(eL).toFixed(4)})`);
// J2000 slope/curvature
const e0 = Math.hypot(...zE(0)), e1 = Math.hypot(...zE(-100)), e2 = Math.hypot(...zE(-200));
console.log(`  J2000: e ${e0.toFixed(6)} (obs 0.016710) · ė ${((e0 - e1) / 1).toExponential(3)}/cy (obs −4.20e-5) · ë ${((e0 - 2 * e1 + e2)).toExponential(2)}/cy² (Laskar 1-kyr −1.2e-6, Simon −2.5e-7)`);
// emit Earth's mode table — z_E(t) = Σ (re_i + i·im_i)·e^{i g_i t}, t in yr
// from J2000 — the runtime-evaluable form of the derived vector
{
  const modes = order.map((i) => ({ gArcsecPerYr: g[i] * AS, re: E[iE][i] * cRe[i], im: E[iE][i] * cIm[i] }));
  writeFileSync(new URL('./fq7s-ll-modes.local.json', import.meta.url), JSON.stringify({ source: 'fq7s-laplace-lagrange-e.mjs', g5: g5arg ? g5arg.slice(3) : 'first-order', modes }, null, 1));
  console.log('  wrote fq7s-ll-modes.local.json (Earth mode table)');
}
// emit the LL orbital elements in the la2010-orbital-elements.json shape
// (0…−500 kyr, 1-kyr steps) so the LR04 insolation check can run a V3 =
// "framework-derived LL e/ϖ" through its V2 (Laskar) hook via
// LA2010_PATH override. ϖ is the fixed-J2000-ecliptic longitude of
// perihelion (arg z); the La2010 file's frame is the invariable plane
// (~1.6° apart — a first-test approximation, recorded).
{
  const data = [];
  for (let k = 0; k <= 500; k++) { const t = -k * 1000; const [re, im] = zE(t); data.push({ year: t, eccentricity: Math.hypot(re, im), inclination: 0, perihelionLong: ((Math.atan2(im, re) / D2R) + 360) % 360, ascendingNode: 0 }); }
  writeFileSync(new URL('./fq7s-ll-orbital-elements.local.json', import.meta.url), JSON.stringify({ source: 'framework Laplace–Lagrange (fq7s-laplace-lagrange-e.mjs)', frame: 'J2000 ecliptic (fixed)', columns: { year: 'yr from J2000', eccentricity: 'e = |z|', perihelionLong: 'arg z (deg)' }, data }));
  console.log('  wrote fq7s-ll-orbital-elements.local.json (0…−500 kyr) for the LR04 insolation V3 test');
}
// spectrum peaks of LL e(t)
{
  const m = mean(eM), n = eM.length, out = [];
  for (let Pk = 30; Pk <= 600; Pk += 1) { let sc = 0, ss = 0; for (let i = 0; i < n; i++) { const th = 2 * Math.PI * i / Pk; sc += (eM[i] - m) * Math.cos(th); ss += (eM[i] - m) * Math.sin(th); } out.push([Pk, 2 * Math.hypot(sc, ss) / n]); }
  out.sort((a, b) => b[1] - a[1]);
  const peaks = []; for (const p of out) { if (!peaks.some((q) => Math.abs(q[0] - p[0]) < 8)) peaks.push(p); if (peaks.length >= 6) break; }
  console.log('  LL e(t) spectrum peaks (kyr, amp):', peaks.map(([Pk, Am]) => `${Pk}:${Am.toFixed(4)}`).join('  '), '   [La2004: 96:0.0111 405:0.0098 125:0.0091]');
}
