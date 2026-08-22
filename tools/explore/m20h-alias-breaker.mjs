// 20.3h PHASE 2a — THE ALIAS-BREAKER (plan §12i).
// Phase 1 found 1.98″ of reachable λ content (shipped − MPP02 maps into
// shipped − JPL at slope 1.083) but the ~30.4-day JPL cache sampling
// (≈ the synodic month) ALIASES everything onto main-problem arguments.
// This instrument dense-samples shipped − MPP02 OFFLINE (MPP02 is local)
// at 2-day steps over 1970–2049 — Nyquist 4 d, the alias fully broken —
// and LSQ-names the true content on a catalog of Meeus-60 args ∪ the
// shipped extension args ∪ planetary/deep-tail probes. Each detected
// term is classified:
//   IN-MEEUS      → amplitude-difference vs the shipped head
//                   (parameter/DE-fit class — doctrine question)
//   IN-EXTENSION  → amplitude-difference vs the shipped derived tail
//   NEW           → genuinely absent from the shipped chain
//                   (extractable by the D2 RK4 machinery)
// The class subtotals decide Phase 2b: extract, or stop at the floor.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const MPP = require('./tools/lib/elp-mpp02.js');
const { moonSeriesExtensionDeg } = require('@essrt/physics/moon/series-extension');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, J2000 = 2451545.0;
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const mpp = MPP.loadMpp02(1);
const PREC = [0, 5029.0966 / 3600, 1.1120 / 3600, 0.000077 / 3600, 0];
const poly = (c, t) => c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] || 0))));
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

// ── candidate catalog ───────────────────────────────────────────────────
const MT = JSON.parse(readFileSync(new URL('../../public/input/meeus-lunar-tables.json', import.meta.url), 'utf8'));
const meeusArgs = MT.longitudeTerms.terms.map((t) => t.slice(0, 4));
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));
const EXTRA = [
  [3, 0, -1, 0], [3, 0, -2, 0], [5, 0, -2, 0], [1, 1, -1, 0], [2, 1, -2, 0],
  [0, 2, -1, 0], [0, 2, 1, 0], [2, -2, 0, 0], [4, 0, 1, 0], [6, 0, -2, 0],
];
const key = (a) => a.join(',');
const meeusSet = new Set(meeusArgs.map(key));
const extSet = new Set(extArgs.map(key));
const catalog = [];
const seen = new Set();
for (const a of [...meeusArgs, ...extArgs, ...EXTRA]) {
  const k = key(a);
  if (seen.has(k)) continue;
  seen.add(k);
  catalog.push({ a, cls: meeusSet.has(k) ? 'MEEUS' : extSet.has(k) ? 'EXT' : 'NEW' });
}
// special (non-Delaunay) probes: the Meeus additive/planetary args + Lp
const SPECIAL = [
  ['A1(Venus)', (T) => (119.75 + 131.849 * T) * D2R, 131.849],
  ['A2(Jup)', (T) => (53.09 + 479264.29 * T) * D2R, 479264.29],
  ['A3', (T) => (313.45 + 481266.484 * T) * D2R, 481266.484],
  ['Lp', (T) => (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R, 481267.881],
];
// FREQUENCY CLUSTERING — the 80-yr window cannot separate candidates
// whose rates differ by ≲150 deg/cy (beat ≳ 240 yr): the normal equations
// go near-singular and amplitudes explode in compensating pairs (the
// ill-conditioned-regressor trap). Keep ONE representative per cluster
// (preference MEEUS > EXT > NEW > SPECIAL) and report membership — the
// cluster's CONTENT is real; its attribution within the cluster is
// window-ambiguous, stated as such.
const RATES = [445267.1114034, 35999.0502909, 477198.8675055, 483202.0175233];
const freqOf = (a) => Math.abs(a[0] * RATES[0] + a[1] * RATES[1] + a[2] * RATES[2] + a[3] * RATES[3]);
const all = [
  ...catalog.map((c) => ({ ...c, name: `[${c.a.join(',')}]`, freq: freqOf(c.a) })),
  ...SPECIAL.map(([name, fn, fq]) => ({ a: null, fn, cls: 'SPECIAL', name, freq: fq })),
].sort((p, q) => p.freq - q.freq);
const PREF = { MEEUS: 0, EXT: 1, NEW: 2, SPECIAL: 3 };
const clusters = [];
for (const c of all) {
  const last = clusters[clusters.length - 1];
  if (last && c.freq - last.members[last.members.length - 1].freq < 150) last.members.push(c);
  else clusters.push({ members: [c] });
}
for (const cl of clusters) cl.rep = cl.members.slice().sort((p, q) => PREF[p.cls] - PREF[q.cls])[0];
const fitSet = clusters.map((cl) => cl.rep);
console.log(`catalog: ${catalog.length} Delaunay (${meeusArgs.length} Meeus / ${extArgs.length} ext / ${EXTRA.length} probes) + ${SPECIAL.length} special → ${fitSet.length} resolvable clusters`);

// ── dense sampling ──────────────────────────────────────────────────────
const JD0 = 2440588, JD1 = 2469800, STEP = 2;
const args = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});
const ts = [], ys = [];
for (let jd = JD0; jd <= JD1; jd += STEP) {
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const ext = moonSeriesExtensionDeg(T);
  const ship = model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg;
  const m = MPP.evalMpp02(T, mpp);
  const mppLon = m.lon * R2D + poly(PREC, T);
  ts.push(T); ys.push(wrap(ship - mppLon) * AS);
}
// detrend (mean + linear — the framework-vs-IAU precession-rate class)
{
  const n = ys.length, mt = ts.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (ts[i] - mt) * (ys[i] - my); sxx += (ts[i] - mt) ** 2; }
  const sl = sxy / sxx;
  for (let i = 0; i < n; i++) ys[i] -= my + sl * (ts[i] - mt);
}
const sd0 = Math.sqrt(ys.reduce((s, v) => s + v * v, 0) / ys.length);
console.log(`dense shipped−MPP02 λ: n ${ys.length} (2-day, 1970–2049) · detrended sd ${sd0.toFixed(2)}″`);

// ── joint LSQ over the cluster representatives ──────────────────────────
const phaseOf = (e, T, ag) => e.a
  ? e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F
  : e.fn(T);
const nCols = 2 * fitSet.length;
const A = Array.from({ length: nCols }, () => new Float64Array(nCols));
const b = new Float64Array(nCols);
const row = new Float64Array(nCols);
for (let i = 0; i < ts.length; i++) {
  const T = ts[i], ag = args(T);
  let c = 0;
  for (const e of fitSet) {
    const p = phaseOf(e, T, ag);
    row[c++] = Math.sin(p); row[c++] = Math.cos(p);
  }
  const y = ys[i];
  for (let r = 0; r < nCols; r++) {
    b[r] += row[r] * y;
    const Ar = A[r], vr = row[r];
    for (let cc = r; cc < nCols; cc++) Ar[cc] += vr * row[cc];
  }
}
for (let r = 0; r < nCols; r++) for (let cc = 0; cc < r; cc++) A[r][cc] = A[cc][r];
// Cholesky-free Gaussian elimination
for (let c = 0; c < nCols; c++) {
  for (let r = c + 1; r < nCols; r++) {
    const f = A[r][c] / A[c][c];
    if (!Number.isFinite(f)) continue;
    for (let cc = c; cc < nCols; cc++) A[r][cc] -= f * A[c][cc];
    b[r] -= f * b[c];
  }
}
const x = new Float64Array(nCols);
for (let c = nCols - 1; c >= 0; c--) {
  let s = b[c];
  for (let cc = c + 1; cc < nCols; cc++) s -= A[c][cc] * x[cc];
  x[c] = A[c][c] !== 0 ? s / A[c][c] : 0;
}

// ── report: per-cluster amplitudes + class subtotals ────────────────────
let rss = 0;
for (let i = 0; i < ts.length; i++) {
  const T = ts[i], ag = args(T);
  let f = 0, c = 0;
  for (const e of fitSet) {
    const p = phaseOf(e, T, ag);
    f += x[c++] * Math.sin(p) + x[c++] * Math.cos(p);
  }
  rss += (ys[i] - f) ** 2;
}
console.log(`post-fit residual sd: ${Math.sqrt(rss / ts.length).toFixed(2)}″  (unexplained by the catalog)`);
const results = clusters.map((cl, i) => ({
  cl, amp: Math.hypot(x[2 * i], x[2 * i + 1]),
}));
// class attribution: a cluster's class is unambiguous only if all its
// members share one class; else report the membership.
const byClass = {};
for (const { cl, amp } of results) {
  const classes = [...new Set(cl.members.map((m) => m.cls))];
  const label = classes.length === 1 ? classes[0] : 'AMBIG';
  byClass[label] = (byClass[label] || 0) + amp * amp / 2;
}
console.log('class power (sd-equivalent ″; AMBIG = mixed-membership clusters):');
for (const [cls, p] of Object.entries(byClass)) console.log(`   ${cls.padEnd(8)} ${Math.sqrt(p).toFixed(2)}″`);
console.log('clusters ≥ 0.10″ (rep + members):');
results.filter((r) => r.amp >= 0.10).sort((p, q) => q.amp - p.amp).forEach(({ cl, amp }) => {
  const mem = cl.members.map((m) => `${m.name}:${m.cls}`).join(' ');
  console.log(`   ${amp.toFixed(3)}″  ${mem}`);
});
