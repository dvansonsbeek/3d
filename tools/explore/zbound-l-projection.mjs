#!/usr/bin/env node
// THE L-CLOSURE OF THE COMB SHAPES (the "generalized Law 5", 2026-09-01).
// Measured chain that led here: the all-planet zbound leaks ΔL/L 6.1e-4/60 kyr;
// a Law-5-distributed torque compensator made it WORSE (8.1e-6 → 1.3e-3 at
// 6 kyr, and 3.4e-5 low-passed) because every planet is itself steered — the
// controllers fight any injected torque. Diagnosis: the leak is PHYSICAL, not
// numerical. At fixed a, L_z,j ∝ Λ_j·√(1−e_j²), so prescribing every e_j(t)
// prescribes total L_z(t); the free dynamics conserves L because its e-exchanges
// are exactly anti-correlated, and snapping the frequencies breaks that
// anti-correlation at the detuning level. The closure must happen in the
// TARGETS: adjust the fitted amplitudes minimally so Σ_j Λ_j e_j(t)² is exactly
// constant — i.e. for every beat m = N_k − N_l ≠ 0,
//     C_m = Σ_j Λ_j Σ_{(k,l): N_k−N_l=m} A_jk·conj(A_jl) = 0.
// This is the model's Law-5 eccentricity balance generalized to every beat
// frequency of the comb. (cos i variations are outside this projection — the
// zeta modes are not bounded; the xy leak was measured 20× below the z leak.)
//
// Reads naff-modes-ecliptic-1000000-gr.local.json, snaps to the comb, solves the
// min-norm amplitude correction (Gauss–Newton, 3 iterations, exact-constraint
// min-norm step), writes zbound-modes-lclosed.local.json (same shape as the
// NAFF table, snapped + adjusted) and prints Σ|C| before/after and max |ΔA|/|A|.
//
//   node tools/explore/zbound-l-projection.mjs [ampMin=3e-4] [maxModes=6] [mMax=12]
//
// RESULT (2026-09-01): NEGATIVE — measured 6-kyr leak with the projected
// targets 3.0e-5 vs 8.1e-6 plain (the amplitude corrections move the targets
// off the free trajectories; the bigger steering errors cost more torque than
// the closure saves). RESOLUTION found instead: the "leak" is not secular —
// the comb targets' own L_z BREATHES, peak-to-peak 3.4e-4 over the exact 8H
// cycle (scratchpad target_L_excursion.mjs), and the measured ΔL is the system
// following that bounded, periodic exchange. No compensator is needed; the
// number to quote is the breathing amplitude, and the reservoir is the model's
// Law-5 statement. Tool kept for the constraint machinery.
//
// mMax: only beats with m ≤ mMax are constrained. The FULL closure (all 42
// beats vs 46 amplitudes) is over-constrained — max |ΔA|/|A| 227 %, the shapes
// destroyed. The L excursion from beat m scales as |C_m|/(m·comb), so the slow
// beats dominate the wander and the fast ones are bounded breathing; closing
// only m ≤ mMax keeps the correction small.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const NAFF = require(ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const AMP_MIN = parseFloat(KV.ampMin || '3e-4'), MAX_MODES = parseInt(KV.maxModes || '6', 10), M_MAX = parseInt(KV.mMax || '12', 10);
const COMB = 2 * Math.PI / (8 * TL.H);
const GM_S = TL.GM_SUN, GM_EM = 403504.747706457;
const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const REF_A = { mercury: 0.387, venus: 0.723, earth: 1.0, mars: 1.524, jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07 };
const gmOf = (k) => (k === 'earth' ? GM_EM : GM_S / TL.massRatioDE440[k]);
const LAM = names.map((p) => gmOf(p) * Math.sqrt((GM_S + gmOf(p)) * REF_A[p]));   // L_z scale per unit (1−e²/2); common factors cancel in C=0

// amps[j] = [{N, re, im}] per planet, snapped
const amps = names.map((p) => (NAFF.modes[p].z || [])
  .filter((m) => Math.hypot(m.re, m.im) >= AMP_MIN).slice(0, MAX_MODES)
  .map((m) => ({ N: Math.round(m.omegaRadPerYr / COMB), re: m.re, im: m.im })));

// enumerate beats m > 0 and the (planet, k, l) pairs contributing to each
const beatMap = new Map();
for (const [j, list] of amps.entries())
  for (let k = 0; k < list.length; k++)
    for (let l = 0; l < list.length; l++) {
      if (k === l) continue;
      const m = list[k].N - list[l].N;
      if (m <= 0 || m > M_MAX) continue;
      if (!beatMap.has(m)) beatMap.set(m, []);
      beatMap.get(m).push([j, k, l]);
    }
const beats = [...beatMap.keys()].sort((a, b) => a - b);

// unknown vector x: [re, im] per amplitude, flattened; index helper
const offs = []; let nx = 0;
for (const list of amps) { offs.push(nx); nx += 2 * list.length; }
const getA = (x, j, k) => [x[offs[j] + 2 * k], x[offs[j] + 2 * k + 1]];

function constraints(x) {   // C_m = Σ Λ_j A_jk conj(A_jl), complex → [re, im] per beat
  const C = [];
  for (const m of beats) {
    let cr = 0, ci = 0;
    for (const [j, k, l] of beatMap.get(m)) {
      const [ar, ai] = getA(x, j, k), [br, bi] = getA(x, j, l);
      cr += LAM[j] * (ar * br + ai * bi);   // A·conj(B)
      ci += LAM[j] * (ai * br - ar * bi);
    }
    C.push(cr, ci);
  }
  return C;
}
function jacobian(x) {   // dC/dx, rows = 2·#beats, cols = nx
  const J = beats.flatMap(() => [new Float64Array(nx), new Float64Array(nx)]);
  for (const [bi_, m] of beats.entries()) {
    const rowR = J[2 * bi_], rowI = J[2 * bi_ + 1];
    for (const [j, k, l] of beatMap.get(m)) {
      const [ar, ai] = getA(x, j, k), [br, bi] = getA(x, j, l);
      const ok = offs[j] + 2 * k, ol = offs[j] + 2 * l, L = LAM[j];
      rowR[ok] += L * br; rowR[ok + 1] += L * bi; rowR[ol] += L * ar; rowR[ol + 1] += L * ai;
      rowI[ok] += -L * bi; rowI[ok + 1] += L * br; rowI[ol] += L * ai; rowI[ol + 1] += -L * ar;
    }
  }
  return J;
}
function solveSym(M, b) {   // Gaussian elimination with partial pivoting
  const n = b.length, A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc <= n; cc++) A[r][cc] -= f * A[c][cc]; }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) { let s = A[r][n]; for (let c = r + 1; c < n; c++) s -= A[r][c] * x[c]; x[r] = s / A[r][r]; }
  return x;
}

const x0 = new Float64Array(nx);
for (const [j, list] of amps.entries()) for (const [k, m] of list.entries()) { x0[offs[j] + 2 * k] = m.re; x0[offs[j] + 2 * k + 1] = m.im; }
const norm1 = (C) => C.reduce((s, c) => s + Math.abs(c), 0);
const scale = norm1(constraints(x0));
let x = Float64Array.from(x0);
for (let it = 0; it < 3; it++) {
  const C = constraints(x), J = jacobian(x);
  const nc = C.length;
  const JJt = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j2) => {
    let s = 0; for (let c = 0; c < nx; c++) s += J[i][c] * J[j2][c]; return s;
  }));
  for (let i = 0; i < nc; i++) JJt[i][i] *= 1 + 1e-12;
  const lam = solveSym(JJt, C);
  for (let c = 0; c < nx; c++) { let s = 0; for (let i = 0; i < nc; i++) s += J[i][c] * lam[i]; x[c] -= s; }
  console.log(`iter ${it + 1}: Σ|C| = ${norm1(constraints(x)).toExponential(3)} (start ${scale.toExponential(3)})`);
}
let maxRel = 0;
for (const [j, list] of amps.entries()) for (const [k, m] of list.entries()) {
  const [nr, ni] = getA(x, j, k);
  const rel = Math.hypot(nr - m.re, ni - m.im) / Math.hypot(m.re, m.im);
  maxRel = Math.max(maxRel, rel);
}
console.log(`max |ΔA|/|A| = ${(maxRel * 100).toFixed(2)} %  over ${beats.length} beat constraints, ${nx / 2} amplitudes`);
const out = { source: 'zbound-l-projection over naff-modes-ecliptic-1000000-gr', note: 'comb-snapped amplitudes projected onto the L_z-conserving manifold (all beats of Σ Λ e² zeroed) — the generalized Law 5', modes: {} };
for (const [j, p] of names.entries()) {
  out.modes[p] = { z: amps[j].map((m, k) => { const [nr, ni] = getA(x, j, k); return { omegaRadPerYr: m.N * COMB, re: nr, im: ni }; }) };
}
writeFileSync(new URL('./zbound-modes-lclosed.local.json', import.meta.url), JSON.stringify(out));
console.log('wrote tools/explore/zbound-modes-lclosed.local.json');
