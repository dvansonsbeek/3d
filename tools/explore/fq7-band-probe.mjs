// FQ-7 R1 — the extended-window band probe (plan §12i FQ-7 components
// (ii)+(iii)).
//
// QUESTIONS this measures:
//  (a) The ~17-yr λ band ([2,2,-1,-1]-labeled, 0.67″): the 79-yr dense
//      window cannot separate 16.9 yr (2131 °/cy) from the 18.6-yr node
//      (Ω, 1934 °/cy) or the 19.86-yr J−S synodic (1813 °/cy) — their
//      beats exceed the window. A 200-yr window (1850–2049) resolves all
//      three. [2,2,-1,-1] is odd-F in LONGITUDE — main-problem
//      parity-forbidden — so the label is suspect a priori.
//  (b) The β budget: Phase-1 measured 0.32″ of reachable β headroom
//      (0.65 → 0.33, the MPP02-vs-JPL floor) and round 2 harvested λ
//      only. Name the β content on the odd-F catalog + probes.
//
// Method: dense shipped−MPP02 in BOTH λ and β, 2-day steps 1850–2049
// (n≈36,500), joint LSQ per column over frequency-clustered catalogs
// (cluster threshold 60 °/cy at the 200-yr window — the 2a instrument's
// ill-conditioning guard, tightened by the window ratio).
//
// Usage: node tools/explore/fq7-band-probe.mjs

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

// ── catalogs ─────────────────────────────────────────────────────────────
const MT = JSON.parse(readFileSync(new URL('../../public/input/meeus-lunar-tables.json', import.meta.url), 'utf8'));
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));
const RATES = [445267.1114034, 35999.0502909, 477198.8675055, 483202.0175233];
const freqOf = (a) => Math.abs(a[0] * RATES[0] + a[1] * RATES[1] + a[2] * RATES[2] + a[3] * RATES[3]);

// planetary + node probes (the 2a catalog lacked these entirely):
// Ω node; planetary mean-longitude combos (framework-carrier rates —
// °/cy differences dwarf the probe precision needed); slow families.
const PL0 = { V: 181.979801, E: 100.466457, Ma: 355.433000, J: 34.351519, S: 50.077444 };
const PL1 = { V: 58517.815676, E: 36000.769780, Ma: 19141.696300, J: 3036.302389, S: 1223.511013 };
/** @type {Array<[string, number, number]>} name, L0 deg, rate deg/cy */
const PROBES = [
  ['Omega', 125.04452, -1934.136],
  ['2Omega', 250.08904, -3868.272],
  ['J-S', PL0.J - PL0.S, PL1.J - PL1.S],
  ['2(J-S)', 2 * (PL0.J - PL0.S), 2 * (PL1.J - PL1.S)],
  ['E-J', PL0.E - PL0.J, PL1.E - PL1.J],
  ['2(E-J)', 2 * (PL0.E - PL0.J), 2 * (PL1.E - PL1.J)],
  ['V-E', PL0.V - PL0.E, PL1.V - PL1.E],
  ['2(V-E)', 2 * (PL0.V - PL0.E), 2 * (PL1.V - PL1.E)],
  ['E-S', PL0.E - PL0.S, PL1.E - PL1.S],
  ['E-Ma', PL0.E - PL0.Ma, PL1.E - PL1.Ma],
  ['2E-2Ma', 2 * (PL0.E - PL0.Ma), 2 * (PL1.E - PL1.Ma)],
];
// modulated planetary probes: slow planetary tone ± the fast carriers
// (the A2 rows' pattern V-E±Mp, ±2D — as sidebands they land at fast
// frequencies; include the ±Mp/±2D partners of the slow trio)
const FAST = [['Mp', 134.9633964, 477198.8675055], ['2D', 2 * 297.8501921, 2 * 445267.1114034], ['F', 93.2720950, 483202.0175233], ['2F', 2 * 93.2720950, 2 * 483202.0175233]];
for (const [pn, p0, p1] of [['Omega', 125.04452, -1934.136], ['J-S', PL0.J - PL0.S, PL1.J - PL1.S]]) {
  for (const [fn2, f0, f1] of FAST) {
    PROBES.push([`${fn2}+${pn}`, f0 + p0, f1 + p1], [`${fn2}-${pn}`, f0 - p0, f1 - p1]);
  }
}

function buildFitSet(delaunayArgs, extraProbes, clusterDegPerCy) {
  const seen = new Set();
  const items = [];
  for (const a of delaunayArgs) {
    const k = a.join(',');
    if (seen.has(k)) continue;
    seen.add(k);
    items.push({ a, name: `[${k}]`, cls: 'DELAUNAY', freq: freqOf(a) });
  }
  for (const [name, p0, p1] of extraProbes) {
    items.push({ a: null, p0, p1, name, cls: 'PROBE', freq: Math.abs(p1) });
  }
  items.sort((x, y) => x.freq - y.freq);
  const clusters = [];
  for (const c of items) {
    const last = clusters[clusters.length - 1];
    if (last && c.freq - last.members[last.members.length - 1].freq < clusterDegPerCy) last.members.push(c);
    else clusters.push({ members: [c] });
  }
  // representative preference: PROBE beats DELAUNAY only when the cluster
  // holds a parity-suspect member; report all members either way.
  for (const cl of clusters) cl.rep = cl.members[0];
  return clusters;
}

// ── dense sampling, λ and β ──────────────────────────────────────────────
const JD0 = 2396759, JD1 = 2469800, STEP = 2;   // 1850–2049
const args4 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});
const ts = [], yL = [], yB = [];
for (let jd = JD0; jd <= JD1; jd += STEP) {
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const ext = moonSeriesExtensionDeg(T);
  const shipL = model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg;
  // shipped β must carry the Meeus additive β family (the finder form
  // omits it; the m20h-budget convention, line-for-line) — omitting it
  // shows up as a spurious 8″ sin(Lp)=sin(F+Ω) cluster.
  const LpA = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
  const A1a = (119.75 + 131.849 * T) * D2R;
  const A3a = (313.45 + 481266.484 * T) * D2R;
  const Mpa = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
  const Fa = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
  const bFam = (-2235 * Math.sin(LpA) + 382 * Math.sin(A3a) + 175 * Math.sin(A1a - Fa)
    + 175 * Math.sin(A1a + Fa) + 127 * Math.sin(LpA - Mpa) - 115 * Math.sin(LpA + Mpa)) * 1e-6;
  const shipB = model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg;
  const m = MPP.evalMpp02(T, mpp);
  ts.push(T);
  yL.push(wrap(shipL - (m.lon * R2D + poly(PREC, T))) * AS);
  yB.push(wrap(shipB - m.lat * R2D) * AS);
}
const detrend = (ys) => {
  const n = ys.length, mt = ts.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (ts[i] - mt) * (ys[i] - my); sxx += (ts[i] - mt) ** 2; }
  const sl = sxy / sxx;
  for (let i = 0; i < n; i++) ys[i] -= my + sl * (ts[i] - mt);
  return Math.sqrt(ys.reduce((s, v) => s + v * v, 0) / n);
};

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
  // residual
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
  return { x: out, resid: Math.sqrt(ss / ts.length), fitSet };
}

function report(label, ys, clusters) {
  const sd0 = detrend(ys);
  const { x, resid, fitSet } = jointFit(ys, clusters);
  console.log(`\n${label}: dense shipped−MPP02, n ${ys.length} (2-day, 1850–2049) · detrended sd ${sd0.toFixed(2)}″ · post-fit resid ${resid.toFixed(2)}″`);
  const rows = fitSet.map((e, c) => ({
    e, amp: Math.hypot(x[2 * c], x[2 * c + 1]), cosA: x[2 * c], sinA: x[2 * c + 1],
    members: clusters[c].members.map((m) => `${m.name}:${m.cls}`).join(' '),
  })).filter((r) => r.amp >= 0.08).sort((a, b) => b.amp - a.amp);
  for (const r of rows.slice(0, 16)) {
    const comp = r.e.cls === 'PROBE' ? `  (cos ${r.cosA.toFixed(3)} sin ${r.sinA.toFixed(3)})` : '';
    console.log(`   ${r.amp.toFixed(3)}″  ${r.members}${comp}`);
  }
}

// λ: even+odd Delaunay (Meeus lon + ext lon args) + all probes
const meeusLonArgs = MT.longitudeTerms.terms.map((t) => t.slice(0, 4));
const lonClusters = buildFitSet([...meeusLonArgs, ...extArgs], PROBES, 60);
console.log(`λ catalog → ${lonClusters.length} clusters at 60 °/cy resolution (200-yr window)`);
report('λ', yL, lonClusters);

// β: Meeus lat args + probes (node family is the prime suspect)
const meeusLatArgs = MT.latitudeTerms.terms.map((t) => t.slice(0, 4));
const latClusters = buildFitSet([...meeusLatArgs, ...extArgs], PROBES, 60);
console.log(`\nβ catalog → ${latClusters.length} clusters`);
report('β', yB, latClusters);
