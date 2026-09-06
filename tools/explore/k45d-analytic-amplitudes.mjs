#!/usr/bin/env node
// P5/K4.5d — PROPER PHYSICS: the giants' periodic-term amplitudes DERIVED
// from the disturbing function (first-order perturbation theory computed
// EXACTLY — no series truncation in e or α, no trajectory integration, no
// fitting). Inputs: the model's GMs + the governed artifact's engine-
// extracted J2000 anchor elements. The engine-run extraction
// (k45-residual-naff.mjs) is the VERIFIER (the DLT-1 pattern).
//
// Method, per ordered pair (target i ← perturber j), both on FIXED anchor
// ellipses:
//   1. Grid (M_i, M_j) ∈ [0,2π)² (mean anomalies), N×N.
//   2. At each node: exact disturbing acceleration on i
//        a_d = Gm_j [ (r_j−r_i)/|Δ|³ − r_j/|r_j|³ ]   (direct + indirect),
//      and the exact element-rate dE/dt = (∂E/∂v)·a_d with ∂E/∂v by central
//      differences through computeOsculatingElements (the chain's own
//      extractor — no hand-transcribed Gauss forms to get wrong).
//   3. DFT the rate fields per argument (s,t): coefficient G_E(s,t).
//   4. First-order displacement per argument, frequency ν = s·n_i + t·n_j
//      (ARTIFACT window mean motions):
//        δE(s,t)   = G_E / (iν)                        (a, h, k, q, p)
//        δλ̄(s,t)  = G_λ̄/(iν) − (3n_i/2a_i)·G_a/(iν)²  (the Kepler feedback
//                    — the ν² amplification that makes the GI dominate)
//
//   node tools/explore/k45d-analytic-amplitudes.mjs
//
// RESULT (measured; analytic first-order vs the engine extraction):
//   Structure and hierarchy CONFIRMED on every argument; synodic-class
//   amplitudes agree to 0.6–0.75 (U←J 470/703″, N←J 518/912, N←S 141/192);
//   near-resonant amplitudes low by the classic first-order factor ~2–2.8
//   (Saturn GI 1055 vs 2902″, Jupiter GI 426 vs 1179, U−2N 1539 vs 3255) —
//   textbook: first-order theory underestimates exactly where divisors are
//   small (why the GI defeated Euler/Lagrange and needed Laplace's
//   higher-order development). The GI period is equally divisor-sensitive:
//   window mean motions put it at 832 yr vs the trajectory's 936.
//   VERDICT (the project's own precedent, DLT-1 Stage D1 — amplitudes
//   verified by a 3-body INTEGRATOR at 100.0±0.1%): the ENGINE-EXTRACTED
//   amplitudes are the from-gravity values (the engine integrates Newton
//   exactly; extraction measures our own physics, never observations);
//   THIS instrument is the independent first-order structural check that
//   guards the extraction. Both ride together: extraction = source,
//   analytic = verifier, attribution = the label.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const { gmOf } = await import('./j2000-state.mjs');

const AU_KM = TL.currentAUDistance;
const D2R = Math.PI / 180, YRS = 365.25 * 86400;
const chains = KC.buildPlanetChainsFromArtifact();
const GM_S = TL.GM_SUN;

// state (km, km/s) on the FIXED anchor ellipse at mean anomaly M
function stateAtM(planet, Mrad) {
  const a = chains[planet].anchor;
  const el = { aAU: a.aAU, e: a.e, inclEclipticDeg: a.inclEclipticDeg, ascNodeEclipticDeg: a.ascNodeEclipticDeg, lonPeriEclipticDeg: a.lonPeriEclipticDeg, meanLonEclipticDeg: (a.lonPeriEclipticDeg + Mrad / D2R) % 360 };
  const p = KC.computeHeliocentricEclipticFromElements(el);
  // velocity via the vis-viva/orientation route: differentiate position wrt M numerically (dM small), scale by n
  const dM = 1e-6;
  const el2 = { ...el, meanLonEclipticDeg: el.meanLonEclipticDeg + dM / D2R };
  const p2 = KC.computeHeliocentricEclipticFromElements(el2);
  const mu = GM_S + gmOf(planet);
  const n = Math.sqrt(mu / Math.pow(a.aAU * AU_KM, 3));   // rad/s
  const v = [(p2.xAU - p.xAU), (p2.yAU - p.yAU), (p2.zAU - p.zAU)].map((d) => d * AU_KM / dM * n);
  return { r: [p.xAU * AU_KM, p.yAU * AU_KM, p.zAU * AU_KM], v, mu, nRadS: n };
}

// element vector from state (the chain's own extractor): [aAU, λ̄deg, k, h, q, p]
function elemVec(r, v, mu) {
  const e = KC.computeOsculatingElements(r, v, mu);
  const si2 = Math.sin(e.inclEclipticDeg / 2 * D2R);
  return [e.aAU, e.meanLonEclipticDeg,
    e.e * Math.cos(e.lonPeriEclipticDeg * D2R), e.e * Math.sin(e.lonPeriEclipticDeg * D2R),
    si2 * Math.cos(e.ascNodeEclipticDeg * D2R), si2 * Math.sin(e.ascNodeEclipticDeg * D2R)];
}

// dE/dt (per second) from disturbing acceleration via numerical ∂E/∂v
function elemRates(st, aDist) {
  const dv = 1e-7;   // km/s probe
  const rates = [0, 0, 0, 0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const vp = st.v.slice(); vp[c] += dv;
    const vm = st.v.slice(); vm[c] -= dv;
    const Ep = elemVec(st.r, vp, st.mu), Em = elemVec(st.r, vm, st.mu);
    for (let k = 0; k < 6; k++) {
      let d = Ep[k] - Em[k];
      if (k === 1) { while (d > 180) d -= 360; while (d < -180) d += 360; }   // λ̄ wrap
      rates[k] += (d / (2 * dv)) * aDist[c];
    }
  }
  return rates;
}

function derivePair(target, perturber, N = 96) {
  const gmP = gmOf(perturber);
  // rate fields over the (M_i, M_j) grid
  const F = Array.from({ length: 6 }, () => new Float64Array(N * N));
  for (let ii = 0; ii < N; ii++) {
    const Mi = 2 * Math.PI * ii / N;
    const sti = stateAtM(target, Mi);
    for (let jj = 0; jj < N; jj++) {
      const Mj = 2 * Math.PI * jj / N;
      const stj = stateAtM(perturber, Mj);
      const d = [stj.r[0] - sti.r[0], stj.r[1] - sti.r[1], stj.r[2] - sti.r[2]];
      const dn = Math.hypot(...d), rn = Math.hypot(...stj.r);
      const aDist = [0, 1, 2].map((c) => gmP * (d[c] / (dn * dn * dn) - stj.r[c] / (rn * rn * rn)));
      const rates = elemRates(sti, aDist);
      for (let k = 0; k < 6; k++) F[k][ii * N + jj] = rates[k];
    }
  }
  // DFT coefficient of field f at (s,t):  (1/N²) Σ f e^{-i(s Mi + t Mj)}
  const coef = (f, s, t2) => {
    let re = 0, im = 0;
    for (let ii = 0; ii < N; ii++) for (let jj = 0; jj < N; jj++) {
      const ph = -(s * 2 * Math.PI * ii / N + t2 * 2 * Math.PI * jj / N);
      re += f[ii * N + jj] * Math.cos(ph); im += f[ii * N + jj] * Math.sin(ph);
    }
    return [re / (N * N), im / (N * N)];
  };
  const nI = chains[target].meanMotionDegPerYr * D2R / YRS;   // rad/s
  const nJ = chains[perturber].meanMotionDegPerYr * D2R / YRS;
  const aI = chains[target].anchor.aAU;
  return { coef, F, nI, nJ, aI, nIradS: nI };
}

// amplitude of δλ̄ (″) and δz (dimensionless) at argument (s,t)
function amps(D, s, t2) {
  const nu = s * D.nI + t2 * D.nJ;                          // rad/s
  if (Math.abs(nu) < 1e-18) return null;
  const [ar, ai] = D.coef(D.F[0], s, t2);                   // da/dt (AU/s)
  const [lr, li] = D.coef(D.F[1], s, t2);                   // dλ̄/dt (deg/s)
  const [kr, ki] = D.coef(D.F[2], s, t2);
  const [hr, hi] = D.coef(D.F[3], s, t2);
  const magA = Math.hypot(ar, ai) / Math.abs(nu);
  const lamDirect = Math.hypot(lr, li) / Math.abs(nu);      // deg
  const lamKepler = (3 * D.nIradS / (2 * D.aI)) * Math.hypot(ar, ai) / (nu * nu);  // deg? units: (rad/s / AU)·(AU/s)/(1/s²) = rad
  const lamArcsec = Math.hypot(lamDirect * 3600, lamKepler / D2R * 3600);
  const zAmp = Math.hypot(Math.hypot(kr, ki), Math.hypot(hr, hi)) / Math.abs(nu);
  const periodYr = 2 * Math.PI / Math.abs(nu) / YRS;
  return { periodYr, lamArcsec, zAmp, aAmpAU: magA };
}

const CASES = [
  ['jupiter', 'saturn', [[-2, 5], [-1, 2], [-2, 3], [1, -1], [2, -2], [1, 0], [0, 1], [2, -5], [3, -5]]],
  ['saturn', 'jupiter', [[5, -2], [2, -1], [3, -2], [1, -1], [2, -2], [1, 0], [0, 1], [5, -3]]],
  ['uranus', 'neptune', [[1, -2], [2, -4], [1, -1], [2, -2], [1, 0], [0, 1], [3, -5]]],
  ['neptune', 'uranus', [[2, -1], [4, -2], [1, -1], [2, -2], [1, 0], [0, 1]]],
  ['uranus', 'jupiter', [[1, -1], [2, -1], [1, 0]]],
  ['neptune', 'jupiter', [[1, -1], [1, 0]]],
  ['neptune', 'saturn', [[1, -1], [1, 0]]],
];

for (const [target, perturber, args] of CASES) {
  console.log(`\n${target.toUpperCase()} ← ${perturber} (first-order, exact grid):`);
  const D = derivePair(target, perturber);
  for (const [s, t2] of args) {
    const A = amps(D, s, t2);
    if (!A) continue;
    console.log(`  (${s},${t2})  P ${A.periodYr.toFixed(1).padStart(8)} yr   δλ̄ ${A.lamArcsec.toFixed(1).padStart(9)}″   δz ${(A.zAmp * 1e6).toFixed(0).padStart(7)}µ`);
  }
}
console.log('\n(compare against the extracted table in k45-residual-naff.mjs — the verifier)');
