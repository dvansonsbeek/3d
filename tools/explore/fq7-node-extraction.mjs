// FQ-7 ROUND 3 — the node-family extraction (plan §12i FQ-7 R1 follow-up).
//
// QUESTION: does the Stage-D1 3-body lab PRODUCE the Ω-family content the
// 200-yr band probe named in shipped−MPP02 (λ: Mp±Ω ~0.59″ each, 2F+Ω
// 0.37, Ω 0.32, 2D+Ω 0.11; β: F−Ω 0.40, F+Ω 0.10)? The A1 extraction
// catalog was integer-Delaunay only — Ω-family arguments are NOT on that
// lattice, so the lab was never asked. The lab integrates full 3D; the
// node dynamics are in there.
//
// METHOD: the A1 protocol verbatim — calibrated ICs, RK4, joint LSQ of
// [Meeus-60 head (sin) + the shipped extension args (sin) + the Ω-family
// candidates (sin AND cos — node-modulation phases are not parity-fixed
// a priori)] on RUN-OWN mean angles, with the run's own mean node
// Ω(t) = fOm.a + fOm.b·t. Head-fidelity guard as always; dt-halving
// convergence on the Ω rows. Amplitudes transfer by combo (the A1/A2
// practice); phase comparison against the probe's measured MPP02-implied
// components is the out-of-sample check before any shipping decision.
//
// Usage: node tools/explore/fq7-node-extraction.mjs [years=120] [dt=0.01]

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname;
const require = createRequire(ROOT + 'package.json');
const lab = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const R2D = 180 / Math.PI, AS = 3600;

// shipped extension Delaunay args (λ + β) — keep them in the fit so the
// Ω rows absorb nothing that belongs to the shipped tail
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));

// Ω-family candidates as [kD,kM,kMp,kF,kΩ] — run-own Ω enters as its own
// angle; F±Ω, Mp±Ω etc. expressed with explicit kΩ.
const OMEGA_LON = [
  [0, 0, 1, 0, -1, 'Mp-Om'], [0, 0, 1, 0, 1, 'Mp+Om'],
  [0, 0, 0, 2, 1, '2F+Om'], [0, 0, 0, 0, 1, 'Om'],
  [2, 0, 0, 0, 1, '2D+Om'],
];
const OMEGA_LAT = [
  [0, 0, 0, 1, -1, 'F-Om'], [0, 0, 0, 1, 1, 'F+Om'],
];

function runFit(years, dt) {
  const { eIC, iIC, aIC } = lab.calibrate(undefined, true);
  const S = lab.integrate(eIC, iIC, aIC, years, dt);
  const A = lab.analyzeRun(S);
  const lonResid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));
  const latSeries = A.beta;

  const OmAt = (i) => A.fOm.a + A.fOm.b * A.T[i];

  function jointFit(series, delaunaySinArgs, omegaRows) {
    // columns: sin per Delaunay arg + (cos,sin) per Ω row
    const K = delaunaySinArgs.length + 2 * omegaRows.length;
    const G = Array.from({ length: K }, () => new Float64Array(K));
    const bv = new Float64Array(K), row = new Float64Array(K);
    for (let i = 0; i < A.T.length; i++) {
      const ang = lab.meanAnglesFor(A, i);
      const Om = OmAt(i);
      for (let k = 0; k < delaunaySinArgs.length; k++) {
        const t = delaunaySinArgs[k];
        row[k] = Math.sin(t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F);
      }
      for (let k = 0; k < omegaRows.length; k++) {
        const t = omegaRows[k];
        const th = t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F + t[4] * Om;
        row[delaunaySinArgs.length + 2 * k] = Math.cos(th);
        row[delaunaySinArgs.length + 2 * k + 1] = Math.sin(th);
      }
      const y = series[i];
      for (let k = 0; k < K; k++) {
        const rk = row[k]; bv[k] += rk * y; const Gk = G[k];
        for (let j = k; j < K; j++) Gk[j] += rk * row[j];
      }
    }
    for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
    const Gm = G.map((r) => Array.from(r)); const x = Array.from(bv);
    for (let c = 0; c < K; c++) {
      let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
      [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
      for (let r = c + 1; r < K; r++) {
        const f = Gm[r][c] / Gm[c][c];
        for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc];
        x[r] -= f * x[c];
      }
    }
    const out = new Float64Array(K);
    for (let c = K - 1; c >= 0; c--) {
      let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc];
      out[c] = s / Gm[c][c];
    }
    return out;
  }

  // λ: Meeus-60 head + shipped extension args + Ω rows
  const HEAD = lab.MT.longitudeTerms.terms.slice().sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]));
  const lonDelaunay = [...HEAD.map((t) => t.slice(0, 4)), ...extArgs];
  const xL = jointFit(lonResid, lonDelaunay, OMEGA_LON);
  // head-fidelity guard (top-10)
  let worst = 0;
  for (let k = 0; k < 10; k++) {
    const d = xL[k] * R2D, m = HEAD[k][4] * 1e-6;
    worst = Math.max(worst, Math.abs(d / m - 1));
  }
  // β: Meeus lat args + Ω rows
  const LATH = lab.MT.latitudeTerms.terms.slice().sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]));
  const latDelaunay = LATH.map((t) => t.slice(0, 4));
  const xB = jointFit(latSeries, latDelaunay, OMEGA_LAT);
  let worstB = 0;
  for (let k = 0; k < 5; k++) {
    const d = xB[k] * R2D, m = LATH[k][4] * 1e-6;
    worstB = Math.max(worstB, Math.abs(d / m - 1));
  }

  const omL = OMEGA_LON.map((t, k) => {
    const c0 = xL[lonDelaunay.length + 2 * k] * R2D * AS;
    const s0 = xL[lonDelaunay.length + 2 * k + 1] * R2D * AS;
    return { name: t[5], cos: c0, sin: s0, amp: Math.hypot(c0, s0) };
  });
  const omB = OMEGA_LAT.map((t, k) => {
    const c0 = xB[latDelaunay.length + 2 * k] * R2D * AS;
    const s0 = xB[latDelaunay.length + 2 * k + 1] * R2D * AS;
    return { name: t[5], cos: c0, sin: s0, amp: Math.hypot(c0, s0) };
  });
  return { omL, omB, worst, worstB, n: A.T.length, OmRateDegPerCy: A.fOm.b * R2D * 36525 };
}

console.log(`FQ-7 R3 — node-family extraction: ${YEARS} yr @ dt ${DT}`);
const t0 = Date.now();
const r1 = runFit(YEARS, DT);
console.log(`  done ${((Date.now() - t0) / 1000).toFixed(0)} s · ${r1.n} samples · head-fidelity worst λ ${(r1.worst * 100).toFixed(2)}% / β ${(r1.worstB * 100).toFixed(2)}% · lab node rate ${r1.OmRateDegPerCy.toFixed(1)} °/cy (instrument −1934)`);
console.log('λ Ω-family (″; probe-measured MPP02-implied amps: Mp−Ω 0.595 · Mp+Ω 0.589 · 2F+Ω 0.374 · Ω 0.317 · 2D+Ω 0.111):');
for (const t of r1.omL) console.log(`   ${t.name.padEnd(6)} cos ${t.cos.toFixed(3).padStart(7)}  sin ${t.sin.toFixed(3).padStart(7)}  amp ${t.amp.toFixed(3)}`);
console.log('β Ω-family (″; probe-measured: F−Ω 0.401 · F+Ω 0.097):');
for (const t of r1.omB) console.log(`   ${t.name.padEnd(6)} cos ${t.cos.toFixed(3).padStart(7)}  sin ${t.sin.toFixed(3).padStart(7)}  amp ${t.amp.toFixed(3)}`);

console.log(`\nconvergence run: ${YEARS} yr @ dt ${DT / 2} ...`);
const t1 = Date.now();
const r2 = runFit(YEARS, DT / 2);
console.log(`  done ${((Date.now() - t1) / 1000).toFixed(0)} s`);
console.log('dt-halving drift (″):');
for (let k = 0; k < r1.omL.length; k++) console.log(`   ${r1.omL[k].name.padEnd(6)} ${(r2.omL[k].amp - r1.omL[k].amp).toFixed(4)}`);
for (let k = 0; k < r1.omB.length; k++) console.log(`   ${r1.omB[k].name.padEnd(6)} ${(r2.omB[k].amp - r1.omB[k].amp).toFixed(4)}`);
