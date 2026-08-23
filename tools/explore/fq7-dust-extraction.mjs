// FQ-7 DUST ROUND, PHASE 2 — lab derivation of the certified dust terms.
//
// The census + arbitration + catalog identification established: the
// leading dust is MAIN-PROBLEM series content below the Meeus ~0.4″
// cutoff, in argument classes the earlier extraction catalogs never
// enumerated (odd kD, |kM| = 3, |kF| = 4/5) — every leader REAL in JPL
// (ratio 0.9–1.1) and bit-matching an MPP02 main-problem catalog row.
// Main-problem ⇒ the Stage-D1 3-body lab must produce it. This run:
//   · one integration (default 120 yr @ dt 0.01, samples every 0.2 d),
//     λ AND β columns from the same run;
//   · joint sine-basis fit per column: Meeus head + shipped extension
//     args + the census-certified leaders (+ const/slope);
//   · head-fidelity gate as in D2/r2; dt-halving control via a second
//     run at dt/2 (per-term drift reported);
//   · acceptance per term: lab/census ratio in [0.7, 1.4] AND halving
//     drift ≤ 0.02″ — the shippable set, phases NOT taken from the lab
//     (ship convention: Meeus-instrument arguments, sine rows, sign
//     from the lab).
//
// Usage: node tools/explore/fq7-dust-extraction.mjs [years=120] [dt=0.01]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const lab = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const R2D = 180 / Math.PI;
const AS = 3600;

// ── catalogs ────────────────────────────────────────────────────────────
const census = JSON.parse(readFileSync(ROOT + 'tools/explore/fq7-dust-census.local.json', 'utf8'));
const extSrc = readFileSync(ROOT + 'packages/physics/src/moon/series-extension.cjs', 'utf8');
const extRows = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+), (-?\d+\.\d+)\]/gm)]
  .map((m) => [...m.slice(1, 5).map(Number), parseFloat(m[5])]);
// trusted census rows only (joint ≈ scan — the secular-degenerate rows are
// parameter-class and must NOT enter a derivation list)
const trusted = (rows) => rows.filter((r) => r.amp >= 0.04 && r.stage1 > 0 && r.amp / r.stage1 < 1.5);
const CAND_L = trusted(census.lon.rows).map((r) => ({ a: r.a, census: r.amp }));
const CAND_B = trusted(census.lat.rows).map((r) => ({ a: r.a, census: r.amp }));
console.log(`certified candidates: λ ${CAND_L.length} · β ${CAND_B.length}`);

// ── one run, both columns ───────────────────────────────────────────────
function jointColumn(A, ys, headTerms, extCol, cands, rates, winDays, stride) {
  const screen = (a) => {
    const w = Math.abs(a[0] * rates.D + a[1] * rates.M + a[2] * rates.Mp + a[3] * rates.F);
    return w * winDays / (2 * Math.PI) >= 3 && w * stride < Math.PI * 0.9;
  };
  const okExt = extCol.filter((r) => screen(r));
  const okCand = cands.filter((c) => screen(c.a));
  const HEAD = headTerms.slice().sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]));
  const terms = [...HEAD.map((t) => t.slice(0, 4)), ...okExt.map((r) => r.slice(0, 4)), ...okCand.map((c) => c.a)];
  const K = terms.length + 2;                     // + const, slope
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const bv = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < A.T.length; i++) {
    const ang = lab.meanAnglesFor(A, i);
    for (let k = 0; k < terms.length; k++) {
      const t = terms[k];
      row[k] = Math.sin(t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F);
    }
    row[K - 2] = 1; row[K - 1] = A.T[i];
    const y = ys[i];
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
  // head fidelity
  let worst = 0;
  for (let k = 0; k < HEAD.length; k++) {
    const m = HEAD[k][4] * 1e-6;
    if (Math.abs(m) < 0.001) continue;
    worst = Math.max(worst, Math.abs(amps[k] * R2D / m - 1));
  }
  const candAmps = okCand.map((c, j) => ({ ...c, lab: amps[HEAD.length + okExt.length + j] * R2D * AS }));
  return { worst, candAmps };
}

function runOnce(years, dt) {
  const { eIC, iIC, aIC } = lab.calibrate(undefined, true);
  const S = lab.integrate(eIC, iIC, aIC, years, dt);
  const A = lab.analyzeRun(S);
  const winDays = years * 365.25;
  const stride = winDays / A.T.length;
  const rates = {};
  {
    const a0 = lab.meanAnglesFor(A, 0), a1 = lab.meanAnglesFor(A, A.T.length - 1);
    const span = A.T[A.T.length - 1] - A.T[0];
    rates.D = (a1.D - a0.D) / span; rates.M = (a1.M - a0.M) / span;
    rates.Mp = (a1.Mp - a0.Mp) / span; rates.F = (a1.F - a0.F) / span;
  }
  const lonResid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));
  const L = jointColumn(A, lonResid, lab.MT.longitudeTerms.terms, extRows.filter((r) => r[3] % 2 === 0), CAND_L, rates, winDays, stride);
  const B = jointColumn(A, A.beta, lab.MT.latitudeTerms.terms, extRows.filter((r) => Math.abs(r[3]) % 2 === 1), CAND_B, rates, winDays, stride);
  return { L, B, nS: A.T.length };
}

console.log(`run 1: ${YEARS} yr @ dt ${DT} ...`);
let t0 = Date.now();
const r1 = runOnce(YEARS, DT);
console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)} s · ${r1.nS} samples · head fidelity λ ${(r1.L.worst * 100).toFixed(2)}% β ${(r1.B.worst * 100).toFixed(2)}%`);
console.log(`run 2 (dt-halving): ${YEARS} yr @ dt ${DT / 2} ...`);
t0 = Date.now();
const r2 = runOnce(YEARS, DT / 2);
console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)} s · head fidelity λ ${(r2.L.worst * 100).toFixed(2)}% β ${(r2.B.worst * 100).toFixed(2)}%`);

function verdictTable(label, c1, c2) {
  console.log(`\n${label}: lab vs census (″) — ACCEPT = ratio∈[0.7,1.4] & halving ≤ 0.02″`);
  console.log(`   ${'arg'.padEnd(14)} census   lab     halving  ratio  verdict`);
  const acc = [];
  const byKey = new Map(c2.map((c) => [c.a.join(','), c.lab]));
  for (const c of c1.sort((x, y) => y.census - x.census)) {
    const lab2 = byKey.get(c.a.join(','));
    const halv = lab2 === undefined ? NaN : Math.abs(c.lab - lab2);
    const ratio = Math.abs(c.lab) / c.census;
    const ok = ratio >= 0.7 && ratio <= 1.4 && halv <= 0.02;
    if (ok) acc.push({ a: c.a, amp: c.lab, census: c.census, halving: halv });
    if (c.census >= 0.04) {
      console.log(`   [${c.a.join(',')}]`.padEnd(17) + ` ${c.census.toFixed(3)}  ${c.lab >= 0 ? ' ' : ''}${c.lab.toFixed(3)}  ${halv.toFixed(3)}    ${ratio.toFixed(2)}   ${ok ? 'ACCEPT' : '—'}`);
    }
  }
  const content = Math.sqrt(acc.reduce((s, a) => s + a.amp * a.amp / 2, 0));
  console.log(`   accepted ${acc.length}/${c1.length} · content (sd-equiv) ${content.toFixed(3)}″`);
  return acc;
}

const accL = verdictTable('λ', r1.L.candAmps, r2.L.candAmps);
const accB = verdictTable('β', r1.B.candAmps, r2.B.candAmps);

writeFileSync(ROOT + 'tools/explore/fq7-dust-terms.local.json', JSON.stringify({
  years: YEARS, dt: DT,
  headFidelityPct: { lon: r1.L.worst * 100, lat: r1.B.worst * 100 },
  lon: accL, lat: accB,
}, null, 1));
console.log('\nwrote tools/explore/fq7-dust-terms.local.json');
