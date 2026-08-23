// FQ-7 R3 — the DENSE JPL band check (the decisive arbiter).
//
// The 200-yr MPP02 probe named Ω-family content in shipped−MPP02; the lab
// produces part of it (Mp−Ω 0.46″, Ω 0.39″) and not the rest. The monthly
// JPL caches ALIAS Mp±Ω onto Mp (the m20h lesson), so this instrument
// fetches a DENSE 2-day JPL sample (1985–2025, n≈7,300 — two full node
// cycles, Mp vs Mp±Ω separable) and fits shipped−JPL on the same
// clustered catalog. Verdict logic per Ω row:
//   JPL confirms + lab produces  → shippable derived candidate
//   JPL confirms + lab absent    → named beyond-lab physics (floor)
//   JPL absent                   → MPP02's own fitted class (drop)
// Conventions: the d2-planetary-moon-check composition line-for-line
// (TT bridge; JPL apparent λ minus the leading-nutation ψΩ·sinΩ term;
// β raw; the Meeus additive β family on the shipped side; mean-free λ).
//
// Usage: node tools/explore/fq7-jpl-band.mjs

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

// ── dense JPL fetch (range mode; chunked by decade) ─────────────────────
const JD0 = 2446066.5, JD1 = 2460676.5, STEP_D = 2;   // 1985–2025
const CACHE = HERE + 'fq7-jpl-dense.local.json';
let cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : null;
if (!cache) {
  const rows = [];
  for (let lo = JD0; lo < JD1; lo += 3652) {
    const hi = Math.min(lo + 3652, JD1);
    const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
      + `&COMMAND='301'&CENTER='500@399'&EPHEM_TYPE=OBSERVER&QUANTITIES='31'&CSV_FORMAT=YES&ANG_FORMAT=DEG`
      + `&START_TIME='JD ${lo}'&STOP_TIME='JD ${hi}'&STEP_SIZE='${STEP_D} d'`;
    const txt = await (await fetch(url)).text();
    const body = txt.split('$$SOE')[1]?.split('$$EOE')[0]?.trim();
    if (!body) throw new Error('no SOE block: ' + txt.slice(0, 400));
    // range-mode CSV carries the calendar date, not JD — the rows sit
    // exactly on the requested grid: jd = lo + i·STEP. Chunk boundaries
    // duplicate (STOP inclusive); dedupe by jd.
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const f = lines[i].split(',').map((x) => x.trim());
      const jd = lo + i * STEP_D;
      if (rows.length && Math.abs(rows[rows.length - 1][0] - jd) < 1e-6) continue;
      rows.push([jd, parseFloat(f[3]), parseFloat(f[4])]);
    }
    process.stderr.write(`  fetched ${rows.length} rows to JD ${hi}\n`);
  }
  cache = { n: rows.length, rows };
  writeFileSync(CACHE, JSON.stringify(cache));
}
console.log(`dense JPL cache: n ${cache.n} (2-day, 1985–2025)`);

// ── shipped composition + differences ───────────────────────────────────
const args4 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});
const ts = [], yL = [], yB = [];
for (const [jd, jplLon, jplLat] of cache.rows) {
  if (!Number.isFinite(jd) || !Number.isFinite(jplLon)) continue;
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  const ext = moonSeriesExtensionDeg(T);
  const LpA = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
  const A1a = (119.75 + 131.849 * T) * D2R;
  const A3a = (313.45 + 481266.484 * T) * D2R;
  const ag = args4(T);
  const bFam = (-2235 * Math.sin(LpA) + 382 * Math.sin(A3a) + 175 * Math.sin(A1a - ag.F)
    + 175 * Math.sin(A1a + ag.F) + 127 * Math.sin(LpA - ag.Mp) - 115 * Math.sin(LpA + ag.Mp)) * 1e-6;
  ts.push(T);
  yL.push(wrap((model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg) - (jplLon - dPsiDeg)) * AS);
  yB.push(((model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg) - jplLat) * AS);
}
const detrend = (ys) => {
  const n = ys.length, mt = ts.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (ts[i] - mt) * (ys[i] - my); sxx += (ts[i] - mt) ** 2; }
  const sl = sxy / sxx;
  for (let i = 0; i < n; i++) ys[i] -= my + sl * (ts[i] - mt);
  return Math.sqrt(ys.reduce((s, v) => s + v * v, 0) / n);
};

// ── catalog: Delaunay (Meeus + ext) + Ω/planetary probes; 900 °/cy
// clusters (the 40-yr window's honest resolution; Mp vs Mp±Ω separable,
// the slow Ω-vs-J−S ambiguity already settled by the 200-yr MPP02 probe)
const MT = JSON.parse(readFileSync(new URL('../../public/input/meeus-lunar-tables.json', import.meta.url), 'utf8'));
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));
const RATES = [445267.1114034, 35999.0502909, 477198.8675055, 483202.0175233];
const freqOf = (a) => Math.abs(a[0] * RATES[0] + a[1] * RATES[1] + a[2] * RATES[2] + a[3] * RATES[3]);
/** @type {Array<[string, number, number]>} */
const PROBES = [
  ['Omega', 125.04452, -1934.136],
  ['Mp-Om', 134.9633964 - 125.04452, 477198.8675055 + 1934.136],
  ['Mp+Om', 134.9633964 + 125.04452, 477198.8675055 - 1934.136],
  ['2F+Om', 2 * 93.2720950 + 125.04452, 2 * 483202.0175233 - 1934.136],
  ['2D+Om', 2 * 297.8501921 + 125.04452, 2 * 445267.1114034 - 1934.136],
  ['F-Om', 93.2720950 - 125.04452, 483202.0175233 + 1934.136],
  ['F+Om', 93.2720950 + 125.04452, 483202.0175233 - 1934.136],
];
function clustersOf(delArgs) {
  const seen = new Set(); const items = [];
  for (const a of delArgs) {
    const k = a.join(','); if (seen.has(k)) continue; seen.add(k);
    items.push({ a, name: `[${k}]`, cls: 'DEL', freq: freqOf(a) });
  }
  for (const [name, p0, p1] of PROBES) items.push({ a: null, p0, p1, name, cls: 'PROBE', freq: Math.abs(p1) });
  items.sort((x, y) => x.freq - y.freq);
  const cl = [];
  for (const c of items) {
    const last = cl[cl.length - 1];
    if (last && c.freq - last.members[last.members.length - 1].freq < 900) last.members.push(c);
    else cl.push({ members: [c] });
  }
  for (const c of cl) c.rep = c.members.find((m) => m.cls === 'PROBE') ?? c.members[0];
  return cl;
}
function jointFit(ys, clusters) {
  const fitSet = clusters.map((c) => c.rep);
  const K = 2 * fitSet.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < ts.length; i++) {
    const T = ts[i], ag = args4(T);
    for (let c = 0; c < fitSet.length; c++) {
      const e = fitSet[c];
      const th = e.a
        ? e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F
        : (e.p0 + e.p1 * T) * D2R;
      row[2 * c] = Math.cos(th); row[2 * c + 1] = Math.sin(th);
    }
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
  let ss = 0;
  for (let i = 0; i < ts.length; i++) {
    const T = ts[i], ag = args4(T);
    let f = 0;
    for (let c = 0; c < fitSet.length; c++) {
      const e = fitSet[c];
      const th = e.a
        ? e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F
        : (e.p0 + e.p1 * T) * D2R;
      f += out[2 * c] * Math.cos(th) + out[2 * c + 1] * Math.sin(th);
    }
    ss += (ys[i] - f) ** 2;
  }
  return { x: out, fitSet, resid: Math.sqrt(ss / ts.length) };
}
function report(label, ys, delArgs) {
  const sd0 = detrend(ys);
  const cl = clustersOf(delArgs);
  const { x, fitSet, resid } = jointFit(ys, cl);
  console.log(`\n${label}: shipped−JPL dense, sd ${sd0.toFixed(2)}″ · post-fit ${resid.toFixed(2)}″ · ${fitSet.length} clusters`);
  for (let c = 0; c < fitSet.length; c++) {
    const e = fitSet[c];
    if (e.cls !== 'PROBE') continue;
    const co = x[2 * c], si = x[2 * c + 1];
    const members = cl[c].members.map((m) => m.name).join(' ');
    console.log(`   ${e.name.padEnd(6)} cos ${co.toFixed(3).padStart(7)}  sin ${si.toFixed(3).padStart(7)}  amp ${Math.hypot(co, si).toFixed(3)}   [cluster: ${members}]`);
  }
}
report('λ', yL, [...MT.longitudeTerms.terms.map((t) => t.slice(0, 4)), ...extArgs]);
report('β', yB, MT.latitudeTerms.terms.map((t) => t.slice(0, 4)));
console.log('\nMPP02-side reference (200-yr probe): λ Mp−Ω 0.595 (c0.114 s0.585) · Mp+Ω 0.589 (c0.087 s−0.583) · 2F+Ω 0.374 (c0.066 s−0.369) · Ω 0.317 (c0.289 s−0.132) · 2D+Ω 0.111 | β F−Ω 0.401 (c0.031 s0.399) · F+Ω 0.097');
console.log('lab-side (R3 extraction, run-frame): λ Mp−Ω 0.457 · Ω 0.387 · Mp+Ω 0.129 · 2F+Ω 0.001 · 2D+Ω 0.035 | β F−Ω 0.017 · F+Ω 0.033');
