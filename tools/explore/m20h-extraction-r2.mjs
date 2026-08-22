// 20.3h PHASE 2b-A, RUN 1 — Delaunay extraction ROUND 2 (plan §12i).
// The alias-breaker named the doctrine-clean extractable λ content:
// NEW Delaunay terms beyond the D2 catalog's order-7 bound (led by
// [6,0,−2,0] at 0.57″ — order 8, excluded by the old bound) and
// amplitude corrections on the shipped extension args (0.72″
// sd-equivalent). This run reuses the Stage-D1 3-body lab (framework
// constants only) with:
//   · the catalog bound widened to kD ≤ 8, order ≤ 10;
//   · the SHIPPED extension args included in the joint fit, so their
//     round-2 amplitudes come out directly (correction = r2 − shipped);
//   · the same frequency screen and head-fidelity checks as D2.
// NOTE the epistemic split: a 3-body lab derives MAIN-PROBLEM content
// only. Extension-arg corrections that the lab does NOT reproduce are
// beyond-3-body physics (planetary modulation of Delaunay terms /
// MPP02's fitted content) and stay out of a derived tail; corrections
// it DOES reproduce are truncation of the D2 extraction itself.
// Usage: node tools/explore/m20h-extraction-r2.mjs [years=120] [dt=0.01]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const lab = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const R2D = 180 / Math.PI;

// ── catalogs ────────────────────────────────────────────────────────────
const meeusSet = new Set(lab.MT.longitudeTerms.terms.map((t) => t.slice(0, 4).join(',')));
// the shipped extension's λ args (even F) with shipped amplitudes (″)
const extSrc = readFileSync(ROOT + 'packages/physics/src/moon/series-extension.cjs', 'utf8');
const extRows = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+), (-?\d+\.\d+)\]/gm)]
  .map((m) => [...m.slice(1, 5).map(Number), parseFloat(m[5])]);
const extLon = extRows.filter((r) => r[3] % 2 === 0);
const extSet = new Set(extLon.map((r) => r.slice(0, 4).join(',')));
console.log(`shipped extension λ args: ${extLon.length}`);
// widened NEW candidates
const CAND = [];
for (let kD = 0; kD <= 8; kD += 1) for (let kM = -2; kM <= 2; kM++)
  for (let kMp = -5; kMp <= 5; kMp++) for (let kF = -2; kF <= 2; kF += 2) {
    if (kD === 0 && kM === 0 && kMp === 0 && kF === 0) continue;
    if (kD % 2 === 1 && kD !== 1) continue;
    if (Math.abs(kD) + Math.abs(kM) + Math.abs(kMp) + Math.abs(kF) > 10) continue;
    if (kD === 0) {
      const first = kM !== 0 ? kM : (kMp !== 0 ? kMp : kF);
      if (first < 0) continue;
    }
    const key = [kD, kM, kMp, kF].join(',');
    if (meeusSet.has(key) || extSet.has(key)) continue;
    CAND.push([kD, kM, kMp, kF]);
  }
console.log(`widened NEW candidates: ${CAND.length}`);

// ── the lab run + joint fit (D2 pattern, sine rows) ─────────────────────
function run(years, dt) {
  const { eIC, iIC, aIC } = lab.calibrate(undefined, true);
  const S = lab.integrate(eIC, iIC, aIC, years, dt);
  const A = lab.analyzeRun(S);
  const lonResid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));
  const winDays = years * 365.25;
  const stride = winDays / A.T.length;
  const rates = { D: 0, M: 0, Mp: 0, F: 0 };
  {
    const a0 = lab.meanAnglesFor(A, 0), a1 = lab.meanAnglesFor(A, A.T.length - 1);
    const span = A.T[A.T.length - 1] - A.T[0];
    rates.D = (a1.D - a0.D) / span; rates.M = (a1.M - a0.M) / span;
    rates.Mp = (a1.Mp - a0.Mp) / span; rates.F = (a1.F - a0.F) / span;
  }
  const screen = ([kD, kM, kMp, kF]) => {
    const w = Math.abs(kD * rates.D + kM * rates.M + kMp * rates.Mp + kF * rates.F);
    return w * winDays / (2 * Math.PI) >= 3 && w * stride < Math.PI * 0.9;
  };
  const okCand = CAND.filter(screen);
  const okExt = extLon.filter((r) => screen(r));
  const HEAD = lab.MT.longitudeTerms.terms.map((t) => t).sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]));
  const terms = [...HEAD.map((t) => t.slice(0, 4)), ...okExt.map((r) => r.slice(0, 4)), ...okCand];
  const K = terms.length;
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
  return { A, terms, amps, nHead: HEAD.length, nExt: okExt.length, HEAD, okExt, okCand };
}

console.log(`run: ${YEARS} yr @ dt ${DT} ...`);
const t0 = Date.now();
const r = run(YEARS, DT);
console.log(`  done ${((Date.now() - t0) / 1000).toFixed(0)} s; ${r.A.T.length} samples; ${r.terms.length} joint terms`);

// head fidelity
let worst = 0;
for (let k = 0; k < r.nHead; k++) {
  const m = r.HEAD[k][4] * 1e-6;
  if (Math.abs(m) < 0.001) continue;
  worst = Math.max(worst, Math.abs(r.amps[k] * R2D / m - 1));
}
console.log(`HEAD fidelity: worst ${(worst * 100).toFixed(2)}% (D2 record: 0.50%)`);

// extension-arg corrections
console.log('\nEXT-ARG round-2 amplitudes vs shipped (″; |correction| ≥ 0.05″):');
const corrections = [];
r.okExt.forEach((row2, j) => {
  const k = r.nHead + j;
  const r2as = r.amps[k] * R2D * 3600;
  const dAs = r2as - row2[4];
  corrections.push({ a: row2.slice(0, 4), shipped: row2[4], r2: r2as, d: dAs });
  if (Math.abs(dAs) >= 0.05) {
    console.log(`  [${row2.slice(0, 4).join(',')}]`.padEnd(16) + ` shipped ${row2[4].toFixed(3)} → r2 ${r2as.toFixed(3)}  (Δ ${dAs.toFixed(3)})`);
  }
});
const corrSd = Math.sqrt(corrections.reduce((s, c) => s + c.d * c.d / 2, 0));
console.log(`  correction content (sd-equivalent): ${corrSd.toFixed(2)}″  [alias-breaker EXT class: 0.72″]`);

// new terms
console.log('\nNEW terms ≥ 0.1″:');
const news = [];
r.okCand.forEach((a, j) => {
  const k = r.nHead + r.nExt + j;
  const as = r.amps[k] * R2D * 3600;
  if (Math.abs(as) >= 0.1) { news.push([...a, as]); console.log(`  [${a.join(',')}]`.padEnd(16) + ` ${as.toFixed(3)}″`); }
});
const newSd = Math.sqrt(news.reduce((s, n) => s + n[4] * n[4] / 2, 0));
console.log(`  new content (sd-equivalent): ${newSd.toFixed(2)}″  [alias-breaker NEW class: 0.41″; 6D−2Mp target 0.57″]`);

writeFileSync(ROOT + 'tools/explore/m20h-r2-lon.local.json', JSON.stringify({
  years: YEARS, dt: DT, headWorstPct: worst * 100,
  corrections, newTerms: news,
}, null, 1));
console.log('\nwrote tools/explore/m20h-r2-lon.local.json');
