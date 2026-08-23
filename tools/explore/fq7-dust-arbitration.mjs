// FQ-7 DUST ROUND, PHASE 1b — reality arbitration of the census leaders.
//
// The census (fq7-dust-census.mjs) ranks candidate arguments against
// MPP02. MPP02 carries DE-fitted content, so a census leader can be
// MPP02-only. This instrument re-measures every census leader on the
// DENSE JPL residual (2-day 1985–2025, the R3 arbiter cache) by
// independent per-candidate LSQ on the post-known residual — the same
// convention in both frames, so the two columns are comparable:
//   REAL dust   → similar amplitude in both (JPL ≈ census);
//   MPP02-only  → census amplitude, JPL ~0;
//   JPL-only    → would mean the census window aliased it away.
// Conventions: fq7-r3-preview line-for-line (BRIDGE, dPsi nutation
// removal, the Meeus additive β family on the shipped side).
//
// Usage: node tools/explore/fq7-dust-arbitration.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const { moonSeriesExtensionDeg } = require('@essrt/physics/moon/series-extension');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

const MT = JSON.parse(readFileSync(new URL('../../public/input/meeus-lunar-tables.json', import.meta.url), 'utf8'));
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));
const census = JSON.parse(readFileSync(HERE + 'fq7-dust-census.local.json', 'utf8'));

const args4 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});
const RATES = [445267.1114034, 35999.0502909, 477198.8675055, 483202.0175233];
const freqOf = (a) => Math.abs(a[0] * RATES[0] + a[1] * RATES[1] + a[2] * RATES[2] + a[3] * RATES[3]);

// ── the dense JPL residual, post-known ──────────────────────────────────
const cache = JSON.parse(readFileSync(HERE + 'fq7-jpl-dense.local.json', 'utf8'));
const ts = [], yL = [], yB = [];
for (const [jd, jplLon, jplLat] of cache.rows) {
  if (!Number.isFinite(jd) || !Number.isFinite(jplLon)) continue;
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  const ext = moonSeriesExtensionDeg(T);
  const ag = args4(T);
  const LpA = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
  const A1a = (119.75 + 131.849 * T) * D2R;
  const A3a = (313.45 + 481266.484 * T) * D2R;
  const bFam = (-2235 * Math.sin(LpA) + 382 * Math.sin(A3a) + 175 * Math.sin(A1a - ag.F)
    + 175 * Math.sin(A1a + ag.F) + 127 * Math.sin(LpA - ag.Mp) - 115 * Math.sin(LpA + ag.Mp)) * 1e-6;
  const shipL = model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg;
  const shipB = model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg;
  ts.push(T);
  yL.push(wrap(shipL - (jplLon - dPsiDeg)) * AS);
  yB.push(wrap(shipB - jplLat) * AS);
}
const n = ts.length;
console.log(`dense JPL rows: ${n} (2-day 1985–2025)`);

// known absorbers: Meeus + extension args (dedup, coarse 300 °/cy cluster
// for the 40-yr window) + T quadrature on the 12 biggest head terms
function knownReps(delaunayArgs, headTerms) {
  const seen = new Set(); const items = [];
  for (const a of delaunayArgs) {
    const k = a.join(','); if (seen.has(k)) continue; seen.add(k);
    items.push({ a, freq: freqOf(a) });
  }
  items.sort((x, y) => x.freq - y.freq);
  const reps = [];
  for (const c of items) {
    const last = reps[reps.length - 1];
    if (last && c.freq - last.freq < 300) continue;
    reps.push(c);
  }
  const big = headTerms.map((t) => ({ a: t.slice(0, 4), amp: Math.abs(t[4]) }))
    .sort((x, y) => y.amp - x.amp).slice(0, 12);
  for (const bt of big) reps.push({ a: bt.a, tmod: 1, freq: freqOf(bt.a) });
  return reps;
}

function fitResidual(ys, reps) {
  const K = 2 * reps.length + 2;              // + constant & slope
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < n; i++) {
    const T = ts[i], ag = args4(T);
    for (let c = 0; c < reps.length; c++) {
      const e = reps[c];
      const th = e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F;
      const w = e.tmod ? T : 1;
      row[2 * c] = w * Math.cos(th); row[2 * c + 1] = w * Math.sin(th);
    }
    row[K - 2] = 1; row[K - 1] = T;
    const y = ys[i];
    for (let k = 0; k < K; k++) {
      const rk = row[k]; b[k] += rk * y; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
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
  const resid = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const T = ts[i], ag = args4(T);
    let f = out[K - 2] + out[K - 1] * T;
    for (let c = 0; c < reps.length; c++) {
      const e = reps[c];
      const th = e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F;
      const w = e.tmod ? T : 1;
      f += w * (out[2 * c] * Math.cos(th) + out[2 * c + 1] * Math.sin(th));
    }
    resid[i] = ys[i] - f;
  }
  return resid;
}

function arbitrate(label, ys, delaunayArgs, headTerms, rows) {
  const reps = knownReps(delaunayArgs, headTerms);
  const resid = fitResidual(ys, reps);
  const sd = Math.sqrt(Array.from(resid).reduce((s, v) => s + v * v, 0) / n);
  console.log(`\n${label}: post-known JPL residual ${sd.toFixed(3)}″ (${reps.length} absorbers)`);
  console.log(`   ${'arg'.padEnd(14)} census   JPL    ratio   verdict`);
  for (const r of rows) {
    const [kD, kM, kMp, kF] = r.a;
    let sc = 0, ss = 0, scc = 0, sss = 0, scs = 0;
    for (let i = 0; i < n; i++) {
      const ag = args4(ts[i]);
      const th = kD * ag.D + kM * ag.M + kMp * ag.Mp + kF * ag.F;
      const co = Math.cos(th), si = Math.sin(th), y = resid[i];
      sc += co * y; ss += si * y; scc += co * co; sss += si * si; scs += co * si;
    }
    const det = scc * sss - scs * scs;
    const ac = (sc * sss - ss * scs) / det, as2 = (ss * scc - sc * scs) / det;
    const jamp = Math.hypot(ac, as2);
    const ratio = jamp / r.amp;
    const verdict = ratio > 0.6 && ratio < 1.67 ? 'REAL' : (ratio <= 0.35 ? 'MPP02-only' : '?');
    console.log(`   [${r.a.join(',')}]`.padEnd(17) + ` ${r.amp.toFixed(3)}  ${jamp.toFixed(3)}  ${ratio.toFixed(2)}    ${verdict}`);
  }
}

const meeusLonArgs = MT.longitudeTerms.terms.map((t) => t.slice(0, 4));
const meeusLatArgs = MT.latitudeTerms.terms.map((t) => t.slice(0, 4));
// arbitrate the census leaders with trustworthy joint amps (joint ≈ scan;
// a joint≫scan row is secular-degenerate — parameter class, skip it)
const trusted = (rows) => rows.filter((r) => r.amp >= 0.05 && r.stage1 > 0 && r.amp / r.stage1 < 1.5).slice(0, 30);
arbitrate('λ', yL, [...meeusLonArgs, ...extArgs], MT.longitudeTerms.terms, trusted(census.lon.rows));
arbitrate('β', yB, [...meeusLatArgs, ...extArgs], MT.latitudeTerms.terms, trusted(census.lat.rows));
