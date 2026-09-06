#!/usr/bin/env node
// P5/K3 — the frame bridge, MEASURED: the fixed rotation R mapping the
// evaluator's heliocentric ecliptic-J2000 frame into the scene's world frame.
//
// Method: the scene's own Earth–Sun vector is the probe (the DST-1-calibrated
// core of the model). At a grid of epochs, pair the scene's Sun→Earth world
// vector with the evaluator's Earth heliocentric ecliptic vector; solve the
// best-fit rotation (Kabsch); report residuals and any epoch drift. A small,
// epoch-stable residual ⇒ the scene world frame is inertial and R is a
// measured constant of the boundary; drift ⇒ the of-date layer must join the
// conversion (measure first, then decide — plan 02 §P5 K2 doctrine).
//
// RESULT (measured): the scene world frame IS inertial ecliptic-J2000,
//   y-up, with one fixed in-plane azimuth rotation of ≈ −68.23° (the model's
//   start-orientation convention) and the pole off the J2000 ecliptic pole by
//   ≈ 1.6′ (the scene's mean-plane convention) — both part of the single
//   fixed R. Residuals: an annual ≤ 9″ ring at J2000 (the evaluator's Kepler
//   Earth vs the scene's DST-1-class Sun — Earth's B2 periodic budget) and a
//   LINEAR ≈ 0.55″/yr Earth-longitude convention drift (82″ at 1850, 42″ at
//   1925/2075, 57″ at 2100 — the same family as the 0.28″/yr engine-vs-
//   sidereal-anchor gap; reconcile at K4). NO rotational drift: the of-date
//   layer does not join the conversion; the boundary is one fixed rotation.
//   DOCTRINE NOTE: R is never pasted as a literal — the flag path derives it
//   at runtime from the scene's own Earth triad (this method), so any scene
//   convention change propagates automatically.
//
//   node tools/explore/k3-frame-probe.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const SG = require(ROOT + 'tools/lib/scene-graph.js');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const TL = require(ROOT + 'tools/lib/constants.js');

const chains = KC.buildPlanetChainsFromArtifact();
const J2000_JD = KC.ANCHOR_EPOCH_JD;

// scene Sun→Earth world vector (scene units; Earth ≈ rotAxis world position)
function sceneSunToEarth(jd) {
  SG.computePlanetPosition('sun', jd);           // animates the graph to jd
  const g = SG._getGraphForProbe();
  const sun = g.sunNodes.pivot.getWorldPosition();
  const earth = g.earthNodes.rotAxis.getWorldPosition();
  return [earth[0] - sun[0], earth[1] - sun[1], earth[2] - sun[2]];
}

// evaluator Earth heliocentric ecliptic-J2000 (AU)
function evalEarthHelio(year) {
  const el = KC.computePlanetElementsAtYear(year, chains.earth);
  const p = KC.computeHeliocentricEclipticFromElements(el);
  return [p.xAU, p.yAU, p.zAU];
}

const norm = (v) => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; };

// Kabsch: best rotation R with R·a_i ≈ b_i (unit vectors)
function kabsch(A, B) {
  const H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < A.length; k++)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) H[i][j] += A[k][j] * B[k][i];
  // 3x3 SVD via eigen of HᵀH (power iteration is overkill; use numeric closed form via Jacobi)
  // For robustness use a simple Jacobi eigen decomposition of symmetric HtH.
  const mulT = (M) => { const S = [[0,0,0],[0,0,0],[0,0,0]]; for (let i=0;i<3;i++) for (let j=0;j<3;j++) for (let k=0;k<3;k++) S[i][j]+=M[k][i]*M[k][j]; return S; };
  const jacobi = (S) => {
    let V = [[1,0,0],[0,1,0],[0,0,1]], a = S.map((r) => r.slice());
    for (let sweep = 0; sweep < 50; sweep++) {
      let off = 0; for (let i=0;i<3;i++) for (let j=i+1;j<3;j++) off += a[i][j]*a[i][j];
      if (off < 1e-24) break;
      for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
        const c = Math.cos(th), s = Math.sin(th);
        const G = [[1,0,0],[0,1,0],[0,0,1]]; G[p][p]=c; G[q][q]=c; G[p][q]=s; G[q][p]=-s;
        const GT = [[G[0][0],G[1][0],G[2][0]],[G[0][1],G[1][1],G[2][1]],[G[0][2],G[1][2],G[2][2]]];
        const mm = (X,Y)=>{const Z=[[0,0,0],[0,0,0],[0,0,0]];for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)Z[i][j]+=X[i][k]*Y[k][j];return Z;};
        a = mm(mm(GT, a), G); V = mm(V, G);
      }
    }
    return { vals: [a[0][0], a[1][1], a[2][2]], V };
  };
  const HtH = mulT(H);
  const { vals, V } = jacobi(HtH);
  // R = H V diag(1/sqrt(vals)) Vt  (polar decomposition, det fix)
  const mm = (X,Y)=>{const Z=[[0,0,0],[0,0,0],[0,0,0]];for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)Z[i][j]+=X[i][k]*Y[k][j];return Z;};
  const Vt = [[V[0][0],V[1][0],V[2][0]],[V[0][1],V[1][1],V[2][1]],[V[0][2],V[1][2],V[2][2]]];
  const Sinv = [[1/Math.sqrt(vals[0]),0,0],[0,1/Math.sqrt(vals[1]),0],[0,0,1/Math.sqrt(vals[2])]];
  let R = mm(H, mm(V, mm(Sinv, Vt)));
  const det = R[0][0]*(R[1][1]*R[2][2]-R[1][2]*R[2][1]) - R[0][1]*(R[1][0]*R[2][2]-R[1][2]*R[2][0]) + R[0][2]*(R[1][0]*R[2][1]-R[1][1]*R[2][0]);
  if (det < 0) { // reflect the smallest-singular-value axis
    const D = [[1,0,0],[0,1,0],[0,0,-1]];
    R = mm(H, mm(V, mm(D, mm(Sinv, Vt))));
  }
  return R;
}

// gather pairs over one year (samples the whole orbit) + spot epochs across the window
const pairs = { A: [], B: [] };
const epochs = [];
for (let m = 0; m < 12; m++) epochs.push(J2000_JD + m * 30.4);
for (const y of [-150, -75, 75, 100]) epochs.push(J2000_JD + y * 365.25);
for (const jd of epochs) {
  const year = KC.ANCHOR_EPOCH_YEAR + (jd - J2000_JD) / 365.25;
  pairs.A.push(norm(evalEarthHelio(year)));
  pairs.B.push(norm(sceneSunToEarth(jd)));
}
// Coplanar probe vectors (Earth's orbit) leave Kabsch rank-2 — build the
// rotation from orthonormal TRIADS instead: u = a(t1), v ⟂ from a(t2),
// w = u×v (the orbit normal). Exact for a rigid rotation; the epoch spread
// of R across many triads is the inertiality measurement.
const triad = (p, q) => {
  const u = p;
  const w = norm([p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]);
  const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
  return [u, v, w];
};
function rotFromTriads(a1, a2, b1, b2) {
  const A = triad(a1, a2), B = triad(b1, b2);
  // R = B · Aᵀ (columns are triad vectors)
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++) R[i][j] += B[k][i] * A[k][j];
  return R;
}
// reference triad from two J2000-era epochs a quarter-orbit apart
const R = rotFromTriads(pairs.A[0], pairs.A[3], pairs.B[0], pairs.B[3]);
void kabsch;
console.log('R (ecliptic-J2000 → scene world):');
for (const row of R) console.log('  [' + row.map((x) => x.toFixed(9).padStart(13)).join(', ') + ']');

// residuals per epoch (angle between R·a and b)
console.log('\nresiduals (angle R·eval vs scene, arcsec):');
let worst = 0;
for (let k = 0; k < pairs.A.length; k++) {
  const a = pairs.A[k], b = pairs.B[k];
  const Ra = [0, 1, 2].map((i) => R[i][0] * a[0] + R[i][1] * a[1] + R[i][2] * a[2]);
  const dot = Math.max(-1, Math.min(1, Ra[0] * b[0] + Ra[1] * b[1] + Ra[2] * b[2]));
  const asec = Math.acos(dot) * 180 / Math.PI * 3600;
  worst = Math.max(worst, asec);
  const yr = (epochs[k] - J2000_JD) / 365.25;
  console.log(`  ${(KC.ANCHOR_EPOCH_YEAR + yr).toFixed(2).padStart(8)}  ${asec.toFixed(1).padStart(9)}″`);
}
console.log(`\nworst ${worst.toFixed(1)}″ — ${worst < 3600 ? 'frame looks inertial at the ' + (worst < 60 ? 'sub-arcmin' : 'arcmin') + ' level' : 'DRIFT — the of-date layer must join the conversion'}`);
