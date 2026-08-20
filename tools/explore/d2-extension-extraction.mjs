// STAGE D2 PHASE A1 — the DERIVED series extension (plan §12i item 10).
// Extended-catalog extraction from the Stage-D1 3-body lab: framework
// constants only, no literature series, no fitted values.
//  · long window (default 120 yr), joint LSQ over [Meeus-60 head +
//    candidate Delaunay combos beyond the table] (λ even-F catalog,
//    β odd-F catalog)
//  · head fidelity check (top-60 must stay ~100% of Meeus)
//  · candidate extension terms reported at |amp| ≥ 0.1″
//  · convergence: re-run at dt/2, report candidate drift
//
// MEASURED RECORD (2026-08-20, the Phase-A1 run, 120 yr @ dt 0.01):
//  · 47 λ terms ≥ 0.1″ (largest: 2 0 1 2 −0.99″, 2 0 −4 0 +0.95″,
//    2 −2 1 0 +0.75″), RMS content 2.02″; head 100.00–100.03%,
//    worst head deviation 0.50%; dt-halving drift 0.000″.
//  · 30 β terms ≥ 0.1″ (largest 4 −1 −1 1 +0.34″), RMS 0.80″;
//    β head 100.02–100.03%.
//  · JPL OUT-OF-SAMPLE (960 all-phase epochs): shipped-Moon residual
//    λ 3.68 → 3.12″ (predicted 3.08) and β 1.04 → 0.65″ (predicted
//    0.66) with the extension ADDED; the sign-flipped control degrades
//    both (5.05″/1.73″) — the integrator predicted reality.
//  · 179-syzygy elongation fleet: RMS 5.51 → 4.90″.
//  · 15-point NASA centerline scoreboard DEGRADES (3.61 → 4.72″) under
//    the Moon-only extension: no fleet-wide syzygy bias (−0.14″ mean
//    over 179) but −2.56″ mean at the 5 reference events — the Moon
//    tail was CANCELLING Sun-side leftover tones there. Per the
//    pre-registered acceptance ("all four, never a subset") the Moon
//    extension must NOT ship alone; it lands JOINTLY with the
//    longer-baseline Sun completion v2 (plan item 10, reordered).
// Usage: node tools/explore/d2-extension-extraction.mjs [years=120] [dt=0.01]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const lab = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const R2D = 180 / Math.PI, AS = 3600;

// ── extended candidate catalog ────────────────────────────────────────────
// λ: even F; parity rule of the main problem. Bounds chosen to cover the
// Meeus table's neighborhood one order deeper.
const meeusSet = new Set(lab.MT.longitudeTerms.terms.map((t) => t.slice(0, 4).join(',')));
const CAND = [];
for (let kD = 0; kD <= 6; kD += 1) for (let kM = -2; kM <= 2; kM++)
  for (let kMp = -4; kMp <= 4; kMp++) for (let kF = -2; kF <= 2; kF += 2) {
    if (kD === 0 && kM === 0 && kMp === 0 && kF === 0) continue;
    if (kD % 2 === 1 && kD !== 1) continue;          // odd-D terms beyond 1D are tiny in the main problem
    if (Math.abs(kD) + Math.abs(kM) + Math.abs(kMp) + Math.abs(kF) > 7) continue;
    if (kD === 0) { // canonical sign: first nonzero positive
      const first = kM !== 0 ? kM : (kMp !== 0 ? kMp : kF);
      if (first < 0) continue;
    }
    const key = [kD, kM, kMp, kF].join(',');
    if (meeusSet.has(key)) continue;
    CAND.push([kD, kM, kMp, kF]);
  }

function run(years, dt) {
  const { eIC, iIC, aIC } = lab.calibrate(undefined, true);
  const S = lab.integrate(eIC, iIC, aIC, years, dt);
  const A = lab.analyzeRun(S);
  const lonResid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));

  // frequency screen: drop candidates with < 3 cycles in the window or
  // aliasing vs the sample stride
  const winDays = years * 365.25;
  const stride = winDays / A.T.length;
  const rates = { D: 0, M: 0, Mp: 0, F: 0 };
  {
    const a0 = lab.meanAnglesFor(A, 0), a1 = lab.meanAnglesFor(A, A.T.length - 1);
    const span = A.T[A.T.length - 1] - A.T[0];
    rates.D = (a1.D - a0.D) / span; rates.M = (a1.M - a0.M) / span;
    rates.Mp = (a1.Mp - a0.Mp) / span; rates.F = (a1.F - a0.F) / span;
  }
  const okCand = CAND.filter(([kD, kM, kMp, kF]) => {
    const w = Math.abs(kD * rates.D + kM * rates.M + kMp * rates.Mp + kF * rates.F);
    return w * winDays / (2 * Math.PI) >= 3 && w * stride < Math.PI * 0.9;
  });

  const HEAD = lab.MT.longitudeTerms.terms
    .map((t) => t).sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]));
  const terms = [...HEAD.map((t) => t.slice(0, 4)), ...okCand];
  const K = terms.length;

  // accumulating normal equations (no stored design matrix)
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const bv = new Float64Array(K);
  const row = new Float64Array(K);
  for (let i = 0; i < A.T.length; i++) {
    const ang = lab.meanAnglesFor(A, i);
    for (let k = 0; k < K; k++) {
      const t = terms[k];
      row[k] = Math.sin(t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F);
    }
    const y = lonResid[i];
    for (let k = 0; k < K; k++) {
      const rk = row[k];
      bv[k] += rk * y;
      const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  // solve
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
  const amps = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * amps[cc];
    amps[c] = s / Gm[c][c];
  }
  return { A, terms, amps, nHead: HEAD.length, HEAD, okCand };
}

console.log(`catalog: ${CAND.length} candidate combos beyond the Meeus 60`);
console.log(`run 1: ${YEARS} yr @ dt ${DT} ...`);
const t0 = Date.now();
const r1 = run(YEARS, DT);
console.log(`  done ${((Date.now() - t0) / 1000).toFixed(0)} s; ${r1.A.T.length} samples; ${r1.terms.length} joint terms`);

// head fidelity
console.log('\nHEAD fidelity (top-10 λ vs Meeus):');
for (let k = 0; k < 10; k++) {
  const d = r1.amps[k] * R2D, m = r1.HEAD[k][4] * 1e-6;
  console.log(`  ${r1.HEAD[k].slice(0, 4).join(' ').padEnd(12)} ${(d / m * 100).toFixed(2)}%`);
}
let worst = 0;
for (let k = 0; k < r1.nHead; k++) {
  const m = r1.HEAD[k][4] * 1e-6;
  if (Math.abs(m) < 0.001) continue;   // tiny head terms judged by the tail rules
  worst = Math.max(worst, Math.abs(r1.amps[k] * R2D / m - 1));
}
console.log(`  worst head deviation (terms ≥ 0.001°): ${(worst * 100).toFixed(2)}%`);

// extension candidates
const found = [];
for (let k = r1.nHead; k < r1.terms.length; k++) {
  const as = r1.amps[k] * R2D * AS;
  if (Math.abs(as) >= 0.1) found.push({ t: r1.terms[k], as });
}
found.sort((a, b) => Math.abs(b.as) - Math.abs(a.as));
console.log(`\nEXTENSION candidates ≥ 0.1″ (derived, 3-body main problem): ${found.length}`);
for (const f of found.slice(0, 25)) console.log(`  ${f.t.join(' ').padEnd(12)} ${f.as.toFixed(3)}″`);
const rss = Math.sqrt(found.reduce((s, f) => s + f.as * f.as, 0) / 2);
console.log(`  extension RSS/√2 (RMS contribution): ${rss.toFixed(2)}″`);

// convergence: dt/2 on the same window
console.log(`\nrun 2 (convergence): ${YEARS} yr @ dt ${DT / 2} ...`);
const r2 = run(YEARS, DT / 2);
let maxDrift = 0, driftTerm = null;
for (const f of found.slice(0, 25)) {
  const idx = r2.terms.findIndex((t) => t.join(',') === f.t.join(','));
  if (idx < 0) continue;
  const as2 = r2.amps[idx] * R2D * AS;
  const d = Math.abs(as2 - f.as);
  if (d > maxDrift) { maxDrift = d; driftTerm = `${f.t.join(' ')}: ${f.as.toFixed(3)} → ${as2.toFixed(3)}`; }
}
console.log(`  max candidate drift dt→dt/2: ${maxDrift.toFixed(3)}″  (${driftTerm})`);

// ── β extension: odd-F catalog on the same run ────────────────────────────
{
  const meeusBSet = new Set(lab.MT.latitudeTerms.terms.map((t) => t.slice(0, 4).join(',')));
  const BC = [];
  for (let kD = 0; kD <= 6; kD += 1) for (let kM = -2; kM <= 2; kM++)
    for (let kMp = -4; kMp <= 4; kMp++) for (let kF = -3; kF <= 3; kF += 2) {
      if (kD % 2 === 1 && kD !== 1) continue;
      if (Math.abs(kD) + Math.abs(kM) + Math.abs(kMp) + Math.abs(kF) > 7) continue;
      if (kD === 0) { const first = kM !== 0 ? kM : (kMp !== 0 ? kMp : kF); if (first < 0) continue; }
      if (meeusBSet.has([kD, kM, kMp, kF].join(','))) continue;
      BC.push([kD, kM, kMp, kF]);
    }
  const HEADB = lab.MT.latitudeTerms.terms.map((t) => t).sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]));
  const termsB = [...HEADB.map((t) => t.slice(0, 4)), ...BC];
  const A = r1.A;
  const K = termsB.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const bv = new Float64Array(K); const row = new Float64Array(K);
  for (let i = 0; i < A.T.length; i++) {
    const ang = lab.meanAnglesFor(A, i);
    for (let k = 0; k < K; k++) {
      const t = termsB[k];
      row[k] = Math.sin(t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F);
    }
    const y = A.beta[i];
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
  const amps = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * amps[cc];
    amps[c] = s / Gm[c][c];
  }
  console.log('\nβ HEAD fidelity (top-6):');
  for (let k = 0; k < 6; k++) console.log(`  ${HEADB[k].slice(0, 4).join(' ').padEnd(12)} ${(amps[k] * R2D / (HEADB[k][4] * 1e-6) * 100).toFixed(2)}%`);
  const foundB = [];
  for (let k = HEADB.length; k < K; k++) {
    const as = amps[k] * R2D * AS;
    if (Math.abs(as) >= 0.1) foundB.push({ t: termsB[k], as });
  }
  foundB.sort((a, b) => Math.abs(b.as) - Math.abs(a.as));
  console.log(`\nβ EXTENSION candidates ≥ 0.1″: ${foundB.length}`);
  for (const f of foundB.slice(0, 15)) console.log(`  ${f.t.join(' ').padEnd(12)} ${f.as.toFixed(3)}″`);
  console.log(`  β extension RMS contribution: ${Math.sqrt(foundB.reduce((s, f) => s + f.as * f.as, 0) / 2).toFixed(2)}″`);
  // dump both columns for the JPL validation step
  // dump the derived term set for downstream validation/preview harnesses
  // (out-path via argv[4]; defaults beside this script, gitignored class)
  const { writeFileSync } = await import('node:fs');
  const outPath = process.argv[4] || new URL('./d2-extension-terms.local.json', import.meta.url).pathname;
  writeFileSync(outPath, JSON.stringify({
    lon: found.map((f) => ({ k: f.t, arcsec: f.as })),
    lat: foundB.map((f) => ({ k: f.t, arcsec: f.as })),
  }, null, 1));
  console.log(`terms dumped → ${outPath}`);
}
