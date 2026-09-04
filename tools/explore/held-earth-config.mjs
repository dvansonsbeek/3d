#!/usr/bin/env node
// THE HELD-EARTH CONFIGURATION, PREDICTED (E23/C2-long companion; owner's
// question 2026-09-04 "what would the all-planet configuration be if we keep
// Earth at H/3?"; plan 02 IP-two-engine-model E23): with Earth's z pinned to
// the H/3 law, Earth stops being a dynamical degree of freedom and becomes an
// external forcing. The remaining seven planets form their own Laplace–
// Lagrange system A' (Earth's row/column removed), with Earth's three lines
// (N24 = +11.595, N48 = +23.19, N0 = 0 ″/yr; amplitudes base′, base′/4,
// base′/4) entering through the coupling column A_jE.
//   proper modes:  eigenvalues of A'  (the 7-planet g')
//   forced terms:  X = (ωI − A')⁻¹ · c · A_E   per Earth line ω
// All physical inputs from the shared module (the E20 one-home rule). Linear
// L-L only (no GI second-order for J/S — inner-system predictions are the
// reliable part).
//
// RESULT (2026-09-04, certified line by line by the 4.3-Myr run,
// zbound-strata-hold.local.json): without Earth's back-reaction Venus's mode
// g₂′ = 12.18 ″/yr (near its bare 12.15) — 0.58 from the imposed 11.595 line:
// the C2 Venus pumping IS this near-resonance. Forced epicycles predicted /
// measured: Venus 0.163 / 0.131 (nonlinear shave; e plateau 0.173 held
// 4.3 Myr), Mercury 5.45e-2 / 5.62e-2, Mars 1.08e-2 / 9.95e-3, giants 1e-5
// class / bit-unchanged. 8-planet sanity eigenvalues: inner g's within ~1 %
// of known (g3 17.36, g4 18.02); J/S low as linear L-L always is (GI).
import { NAMES, GM_SUN, gmOf, osculAt } from './j2000-state.mjs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');

const OSC = Object.fromEntries(NAMES.map((p) => [p, osculAt(p)]));
function lap(j, a) { const N = 40000; let s = 0; for (let i = 0; i < N; i++) { const psi = (i + 0.5) * Math.PI / N; s += Math.cos(j * psi) / Math.pow(1 - 2 * a * Math.cos(psi) + a * a, 1.5); } return (2 / Math.PI) * s * (Math.PI / N); }
const C_AU_YR = 299792.458 / 149597870.7 * 365.25 * 86400;   // c in AU/yr
// full 8x8 secular matrix in ″/yr (+1PN on every diagonal, formula-derived)
const n = NAMES.length;
const A = Array.from({ length: n }, () => new Float64Array(n));
for (let j = 0; j < n; j++) {
  const aj = OSC[NAMES[j]].aAU, ej = OSC[NAMES[j]].e;
  const nj = 1296000 / Math.pow(aj, 1.5);   // ″/yr
  for (let k = 0; k < n; k++) {
    if (k === j) continue;
    const ak = OSC[NAMES[k]].aAU, ext = ak > aj;
    const al = ext ? aj / ak : ak / aj, ab = ext ? al : 1;
    const f = (nj / 4) * (gmOf(NAMES[k]) / (GM_SUN + gmOf(NAMES[j]))) * al * ab;
    A[j][j] += f * lap(1, al);
    A[j][k] = -f * lap(2, al);
  }
  const nRad = 2 * Math.PI / Math.pow(aj, 1.5);
  A[j][j] += 3 * nRad ** 3 * aj ** 2 / (C_AU_YR ** 2 * (1 - ej ** 2)) * 206264.806;   // 1PN
}
// eigenvalues by det-sign scan + bisection (all real for the L-L class)
function detShift(M, lam) {
  const m = M.length, B = M.map((r, i) => Array.from(r, (x, c) => x - (i === c ? lam : 0)));
  let det = 1;
  for (let c = 0; c < m; c++) {
    let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(B[r][c]) > Math.abs(B[p][c])) p = r;
    if (p !== c) { [B[c], B[p]] = [B[p], B[c]]; det = -det; }
    if (Math.abs(B[c][c]) < 1e-300) return 0;
    det *= B[c][c];
    for (let r = c + 1; r < m; r++) { const f = B[r][c] / B[c][c]; for (let cc = c; cc < m; cc++) B[r][cc] -= f * B[c][cc]; }
  }
  return det;
}
function eigs(M) {
  const out = [], lo = -2, hi = 40, steps = 42000;
  let prev = detShift(M, lo);
  for (let i = 1; i <= steps; i++) {
    const lam = lo + (hi - lo) * i / steps, d = detShift(M, lam);
    if (prev === 0 || d === 0 || (prev < 0) !== (d < 0)) {
      let a2 = lo + (hi - lo) * (i - 1) / steps, b2 = lam;
      for (let it = 0; it < 80; it++) { const mid = (a2 + b2) / 2, dm = detShift(M, mid); if ((detShift(M, a2) < 0) !== (dm < 0)) b2 = mid; else a2 = mid; }
      out.push((a2 + b2) / 2);
    }
    prev = d;
  }
  return out;
}
function solve(M, rhs) {   // (M)x = rhs
  const m = M.length, B = M.map((r, i) => [...r, rhs[i]]);
  for (let c = 0; c < m; c++) {
    let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(B[r][c]) > Math.abs(B[p][c])) p = r;
    [B[c], B[p]] = [B[p], B[c]];
    for (let r = c + 1; r < m; r++) { const f = B[r][c] / B[c][c]; for (let cc = c; cc <= m; cc++) B[r][cc] -= f * B[c][cc]; }
  }
  const x = new Float64Array(m);
  for (let r = m - 1; r >= 0; r--) { let s = B[r][m]; for (let c = r + 1; c < m; c++) s -= B[r][c] * x[c]; x[r] = s / B[r][r]; }
  return x;
}
const iE = NAMES.indexOf('earth');
const SEVEN = NAMES.filter((p) => p !== 'earth');
const A7 = SEVEN.map((p) => SEVEN.map((q) => A[NAMES.indexOf(p)][NAMES.indexOf(q)]));
const cE = SEVEN.map((p) => A[NAMES.indexOf(p)][iE]);   // coupling to Earth

console.log('full 8-planet eigenfrequencies (linear L-L + 1PN, ″/yr) — sanity vs known g:');
console.log(' ', eigs(A).map((x) => x.toFixed(3)).join('  '));
console.log('\n7-planet eigenfrequencies g′ (Earth removed as a degree of freedom):');
const G7 = eigs(A7);
console.log(' ', G7.map((x) => x.toFixed(3)).join('  '));
console.log('\ndiagonal (bare) rates for reference (″/yr):', NAMES.map((p, j) => `${p.slice(0, 2)} ${A[j][j].toFixed(2)}`).join('  '));

// Earth's three imposed lines
const LINE = 1296000 / (TL.H / 3);           // ″/yr = 11.595
const base = TL.eccentricityBase;
const LINES = [
  { name: 'N24 (+H/3)', w: LINE, amp: base },
  { name: 'N48 (+2H/3)', w: 2 * LINE, amp: base / 4 },
  { name: 'N0 (fixed)', w: 0, amp: base / 4 },
];
console.log(`\nEarth forcing lines: ${LINES.map((l) => `${l.name} @ ${l.w.toFixed(3)} ″/yr amp ${l.amp.toFixed(5)}`).join('; ')}`);
console.log('\nFORCED RESPONSE of each free planet to held-Earth (|X| per line; resonance denominators shown for the nearest g′):');
console.log('planet     |X|@11.595   |X|@23.19    |X|@0       nearest g′ to 11.595 (detune)');
for (const [ji, p] of SEVEN.entries()) {
  const amps = LINES.map((l) => {
    const M = A7.map((r, i2) => r.map((x, c) => (i2 === c ? l.w - x : -x)));   // (ωI − A')
    const X = solve(M, cE.map((x) => x * l.amp));
    return Math.abs(X[ji]);
  });
  const nearest = G7.reduce((b, g) => (Math.abs(g - LINE) < Math.abs(b - LINE) ? g : b), 1e9);
  console.log(
    p.padEnd(9)
    + amps.map((x) => x.toExponential(2).padStart(11)).join(' ')
    + `   ${nearest.toFixed(3)} (${(nearest - LINE).toFixed(3)})`
  );
}
console.log('\ncoupling column A_jE (″/yr):', SEVEN.map((p, i2) => `${p.slice(0, 2)} ${cE[i2].toFixed(4)}`).join('  '));
