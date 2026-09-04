#!/usr/bin/env node
// THE TWO-EXPANSIONS SCALING LAW (owner-approved direction 2026-09-04; plan
// IP-two-expansions.md): under adiabatic solar mass loss (a·M invariant;
// e, i, α = a_j/a_k invariant; planet masses fixed) every secular
// eigenfrequency scales ∝ M and the 405-kyr metronome period ∝ 1/M — the
// long-eccentricity band is a scale that weighs the ancient Sun (prior art:
// Spalding, Fischer & Laughlin 2018, ApJL 869 L19).
//
// MEASURED (this script, δ = +1 %): Newtonian eigenfrequency exponents
// d ln g / d ln M = 1.000 on every slot; per-mode 1PN correction follows
// exponent 1 + 3·(1PN share) exactly (g₁ slot predicted 1.22 from Mercury's
// 0.073 share, measured 1.212; g₂ slot 1.035/1.035); Mercury's 1PN term
// alone: exponent 4.000 (∝ M⁴); the g₂−g₅ beat period obeys ∝ 1/M
// (347.1 → 343.4 kyr under 1.01·M vs predicted 343.6 — linear-L-L beat
// value; the SCALING is the claim, not the 347). Derived companions:
// n ∝ M², orbital periods ∝ M⁻², insolation ∝ M²·L(t), and the solar third
// of Earth's precession torque ∝ M⁴ (the two-clock method's cross-coupling).
//
//   node tools/explore/solar-mass-scaling.mjs [delta=0.01]
import { NAMES, GM_SUN, gmOf, osculAt } from './j2000-state.mjs';
const OSC = Object.fromEntries(NAMES.map((p) => [p, osculAt(p)]));
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const DELTA = parseFloat(KV.delta || '0.01');
function lap(j, a) { const N = 20000; let s = 0; for (let i = 0; i < N; i++) { const psi = (i + 0.5) * Math.PI / N; s += Math.cos(j * psi) / Math.pow(1 - 2 * a * Math.cos(psi) + a * a, 1.5); } return (2 / Math.PI) * s * (Math.PI / N); }
const C_AU_YR = 299792.458 / 149597870.7 * 365.25 * 86400;
function buildA(scaleM) {
  const n = NAMES.length, A = Array.from({ length: n }, () => new Float64Array(n));
  let pn1 = 0;
  for (let j = 0; j < n; j++) {
    const aj = OSC[NAMES[j]].aAU / scaleM, ej = OSC[NAMES[j]].e;
    const nj = 1296000 * Math.sqrt(scaleM) / Math.pow(aj, 1.5);
    for (let k = 0; k < n; k++) {
      if (k === j) continue;
      const ak = OSC[NAMES[k]].aAU / scaleM, ext = ak > aj;
      const al = ext ? aj / ak : ak / aj, ab = ext ? al : 1;
      const f = (nj / 4) * (gmOf(NAMES[k]) / (scaleM * GM_SUN + gmOf(NAMES[j]))) * al * ab;
      A[j][j] += f * lap(1, al);
      A[j][k] = -f * lap(2, al);
    }
    const nRad = 2 * Math.PI * Math.sqrt(scaleM) / Math.pow(aj, 1.5);
    const g1pn = 3 * nRad ** 3 * aj ** 2 / (C_AU_YR ** 2 * (1 - ej ** 2)) * 206264.806;
    A[j][j] += g1pn;
    if (j === 0) pn1 = g1pn;
  }
  return { A, pn1 };
}
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
  const out = [], lo = -2, hi = 40, steps = 21000;
  let prev = detShift(M, lo);
  for (let i = 1; i <= steps; i++) {
    const lam = lo + (hi - lo) * i / steps, d = detShift(M, lam);
    if ((prev < 0) !== (d < 0)) {
      let a2 = lo + (hi - lo) * (i - 1) / steps, b2 = lam;
      for (let it = 0; it < 60; it++) { const mid = (a2 + b2) / 2, dm = detShift(M, mid); if ((detShift(M, a2) < 0) !== (dm < 0)) b2 = mid; else a2 = mid; }
      out.push((a2 + b2) / 2);
    }
    prev = d;
  }
  return out;
}
const base = buildA(1), up = buildA(1 + DELTA);
const g0 = eigs(base.A), g1 = eigs(up.A);
console.log(`eigenfrequencies at M and ${(1 + DELTA).toFixed(2)}·M (″/yr), measured exponent d ln g / d ln M:`);
for (let i = 0; i < g0.length; i++) {
  const ex = Math.log(g1[i] / g0[i]) / Math.log(1 + DELTA);
  console.log(`  slot ${i + 1}  ${g0[i].toFixed(4)} → ${g1[i].toFixed(4)}   exponent ${ex.toFixed(3)}  (Newtonian prediction 1.000 + 3·1PN-share)`);
}
console.log(`\nMercury 1PN term: ${base.pn1.toFixed(4)} → ${up.pn1.toFixed(4)} ″/yr, exponent ${(Math.log(up.pn1 / base.pn1) / Math.log(1 + DELTA)).toFixed(3)} (prediction 4.000)`);
const near = (arr, v) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), 1e9);
const beat = (arr) => 1296000 / (near(arr, 7.42 * (1 + DELTA / 2)) - near(arr, 3.69 * (1 + DELTA / 2))) / 1000;
console.log(`g₂−g₅ beat period: ${beat(g0).toFixed(1)} kyr at M → ${beat(g1).toFixed(1)} kyr at ${(1 + DELTA).toFixed(2)}·M (prediction ÷${(1 + DELTA).toFixed(2)} → ${(beat(g0) / (1 + DELTA)).toFixed(1)})`);
