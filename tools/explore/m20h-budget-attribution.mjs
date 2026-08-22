// 20.3h PHASE 1 — BUDGET ATTRIBUTION (the gating phase; plan §12i).
// Decompose the shipped Moon chain's residual vs JPL into (a) the
// REACHABLE named-truncation part (shipped − MPP02: what a deeper derived
// series could close in principle) and (b) the FLAT analytic-vs-DE441
// representational gap (MPP02 − JPL: not decomposable term-by-term, the
// accepted floor — the ELP/MPP02 lift itself was rejected at 20.3f).
// Plus (c) the syzygy-phase concentration (does the reachable part grow
// at syzygy → syzygy-specific terms worth extracting?) and (d) the 2001
// centerline-outlier attribution.
// STOP-GATE: reachable λ headroom < ~0.5″ AND centerline effect < ~0.5″
// ⇒ "analytic floor reached", no extraction round.
//
// Conventions: shipped chain = full series (sceneEvalAt, TT axis via the
// framework ΔT) + the D2 derived extension (moonSeriesExtensionDeg), the
// same composition besselian bodiesAt ships. JPL cache values carry
// nutation; the leading-Δψ bridge matches the D2 instruments. MPP02
// of-date = inertial + accumulated p_A (the residual-attribution-mpp02
// convention, DE-fit parameter set).
// CONVENTION: the D2 Phase-A record's exact evaluation axis
// (d2-planetary-moon-check.mjs) — the tier's truncated Moon + the LP
// correction + the Lp-family β terms + the SHIPPED derived extension
// (moonSeriesExtensionDeg = Delaunay tail + A2 planetary), fixed
// deltaTStart bridge, leading-Δψ nutation on λ. λ carries a ~30.6″
// CONSTANT anchor offset vs JPL (absorbed by the finder anchors;
// elongation-class chains cancel it) — all conclusions use the
// mean-free SCATTER.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const MPP = require('./tools/lib/elp-mpp02.js');
const { moonSeriesExtensionDeg } = require('@essrt/physics/moon/series-extension');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, J2000 = 2451545.0;
const model = createModel();
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const BRIDGE = C.earthOrbital ? C.earthOrbital.deltaTStart / 86400 : 0;
const LP = C.moon.moonMeeusLpCorrection;
const mpp = MPP.loadMpp02(1);
const PREC = [0, 5029.0966 / 3600, 1.1120 / 3600, 0.000077 / 3600, 0];
const poly = (c, t) => c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] || 0))));
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const stats = (a) => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
  return { m, sd };
};
const fmt = (s) => `mean ${s.m.toFixed(2)}″ sd ${s.sd.toFixed(2)}″`;

function shippedMoonAt(jdUT) {
  const jb = jdUT + BRIDGE;
  const T = (jb - J2000) / 36525;
  const Lp = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
  const A1 = (119.75 + 131.849 * T) * D2R;
  const A3 = (313.45 + 481266.484 * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
  const F = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
  const bFam = (-2235 * Math.sin(Lp) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F)
    + 175 * Math.sin(A1 + F) + 127 * Math.sin(Lp - Mp) - 115 * Math.sin(Lp + Mp)) * 1e-6;
  const ext = moonSeriesExtensionDeg(T);
  return {
    lon: model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg,
    lat: model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg,
  };
}
function mpp02MoonAt(jdUT) {
  const T = (jdUT + BRIDGE - J2000) / 36525;
  const m = MPP.evalMpp02(T, mpp);
  return { lon: m.lon * R2D + poly(PREC, T), lat: m.lat * R2D };
}
function dPsiDegAt(jdUT) {
  const jb = jdUT + BRIDGE;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  return (N.psiOmega * Math.sin(om)) / 3600;
}

// ── (a)+(b): the all-phase decomposition over the 960-epoch JPL cache ───
const cache = require('./tools/explore/d2-moonval-jpl-cache.local.json');
const dSJ_l = [], dSJ_b = [], dMJ_l = [], dMJ_b = [], dSM_l = [], dSM_b = [];
for (const [jd, jplLon, jplLat] of cache.rows) {
  const dPsi = dPsiDegAt(jd);
  const s = shippedMoonAt(jd), m = mpp02MoonAt(jd);
  const jl = jplLon - dPsi;
  dSJ_l.push(wrap(s.lon - jl) * AS); dSJ_b.push((s.lat - jplLat) * AS);
  dMJ_l.push(wrap(m.lon - jl) * AS); dMJ_b.push((m.lat - jplLat) * AS);
  dSM_l.push(wrap(s.lon - m.lon) * AS); dSM_b.push((s.lat - m.lat) * AS);
}
console.log('1. ALL-PHASE DECOMPOSITION (n', cache.rows.length + ', 1970–2049):');
console.log('   shipped − JPL      λ', fmt(stats(dSJ_l)), '· β', fmt(stats(dSJ_b)), '  [banked class λ~3.0 β~0.65]');
console.log('   MPP02  − JPL      λ', fmt(stats(dMJ_l)), '· β', fmt(stats(dMJ_b)), '  [THE FLOOR — unreachable by any derived series]');
console.log('   shipped − MPP02   λ', fmt(stats(dSM_l)), '· β', fmt(stats(dSM_b)), '  [THE REACHABLE HEADROOM]');

// ── (c): syzygy concentration — same three deltas at the 179 fleet jds ──
const syz = require('./tools/explore/d2-syzygy-jpl-cache.local.json');
const sSM_l = [], sSJ_l = [], sMJ_l = [];
for (const [jd] of syz.rows) {
  const dPsi = dPsiDegAt(jd);
  const s = shippedMoonAt(jd), m = mpp02MoonAt(jd);
  sSM_l.push(wrap(s.lon - m.lon) * AS);
}
console.log('\n2. SYZYGY CONCENTRATION (n', syz.rows.length, 'fleet instants):');
console.log('   shipped − MPP02 at syzygy   λ', fmt(stats(sSM_l)),
  '  [vs all-phase', stats(dSM_l).sd.toFixed(2) + '″ — growth ⇒ syzygy-specific terms exist]');

// ── (d): the 2001 Jun 21 centerline outlier (7.3″ shadow-plane) ─────────
console.log('\n3. THE 2001 OUTLIER (Jun 21 ~12:00 UT, jd 2452082.0):');
for (const jd of [2452081.997, 2452082.004, 2452082.011]) {
  const s = shippedMoonAt(jd), m = mpp02MoonAt(jd);
  // nearest JPL cache row for context
  let best = null;
  for (const r of cache.rows) if (!best || Math.abs(r[0] - jd) < Math.abs(best[0] - jd)) best = r;
  console.log(`   jd ${jd.toFixed(3)}: shipped−MPP02 λ ${(wrap(s.lon - m.lon) * AS).toFixed(2)}″ β ${((s.lat - m.lat) * AS).toFixed(2)}″` +
    `  (nearest cache row ${Math.abs(best[0] - jd).toFixed(1)} d away)`);
}
const typical = stats(dSM_l);
console.log('   [typical all-phase shipped−MPP02:', fmt(typical) + ' — an outsized residual here ⇒ series-driven; typical ⇒ geometry/Sun-side]');

// ── 4. THE CORRELATION SPLIT (the real reachable measure) ───────────────
// shipped is CLOSER to JPL than MPP02 is, so naively "closing the MPP02
// gap" would hurt. The reachable content is the component of (shipped −
// JPL) that (shipped − MPP02) PREDICTS: regress dSJ on dSM (mean-free).
{
  // Detrend dSM linearly in time first: the framework-vs-IAU precession
  // RATE difference (~5″/cy) rides my MPP02 of-date conversion as a ramp —
  // anchor/rate class, not extraction content; it dilutes the regression.
  const ts = cache.rows.map(([jd]) => (jd - J2000) / 36525);
  const detrend = (a) => {
    const n2 = a.length, mt = ts.reduce((s, v) => s + v, 0) / n2, ma = a.reduce((s, v) => s + v, 0) / n2;
    let sxy2 = 0, sxx2 = 0;
    for (let i = 0; i < n2; i++) { sxy2 += (ts[i] - mt) * (a[i] - ma); sxx2 += (ts[i] - mt) ** 2; }
    const sl = sxy2 / sxx2;
    return a.map((v, i) => v - ma - sl * (ts[i] - mt));
  };
  const x = detrend(dSM_l), y = detrend(dSJ_l);
  console.log(`   [detrended: dSM sd ${stats(x).sd.toFixed(2)}″ (raw ${stats(dSM_l).sd.toFixed(2)}), dSJ sd ${stats(y).sd.toFixed(2)}″ (raw ${stats(dSJ_l).sd.toFixed(2)})]`);
  globalThis.__detrendedSM = x;
  {
    const xb = detrend(dSM_b), yb = detrend(dSJ_b);
    const sxxB = xb.reduce((s, v) => s + v * v, 0), sxyB = xb.reduce((s, v, i) => s + v * yb[i], 0);
    const bB = sxyB / sxxB;
    const residB = yb.map((v, i) => v - bB * xb[i]);
    console.log(`   β regression: slope ${bB.toFixed(3)}, scatter ${stats(yb).sd.toFixed(2)}″ → residual ${stats(residB).sd.toFixed(2)}″ ⇒ reachable β ${Math.sqrt(Math.max(0, stats(yb).sd ** 2 - stats(residB).sd ** 2)).toFixed(2)}″`);
  }
  const sxx = x.reduce((s, v) => s + v * v, 0), sxy = x.reduce((s, v, i) => s + v * y[i], 0);
  const b = sxy / sxx;
  const resid = y.map((v, i) => v - b * x[i]);
  const sdY = stats(dSJ_l).sd, sdR = stats(resid).sd;
  console.log('\n4. CORRELATION SPLIT (all-phase λ, mean-free):');
  console.log(`   regression dSJ = ${b.toFixed(3)}·dSM: scatter ${sdY.toFixed(2)}″ → residual ${sdR.toFixed(2)}″`);
  console.log(`   ⇒ the MPP02-predictable (REACHABLE) component of shipped−JPL: ${Math.sqrt(Math.max(0, sdY * sdY - sdR * sdR)).toFixed(2)}″`);
}

// ── 5. NAME THE MISSING TERMS (what MPP02 says the shipped series lacks) ─
// Joint LSQ of the mean-free shipped−MPP02 λ residual on a Delaunay
// candidate basis — names the Phase-2 extraction catalog.
{
  const args = (jdUT) => {
    const T = (jdUT + BRIDGE - J2000) / 36525;
    const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
    const M = (357.5291092 + 35999.0502909 * T) * D2R;
    const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
    const F = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
    return { D, M, Mp, F };
  };
  const CAND = [
    ['D', (a) => a.D], ['2D', (a) => 2 * a.D], ['Mp', (a) => a.Mp], ['M', (a) => a.M],
    ['2D-Mp', (a) => 2 * a.D - a.Mp], ['2D-M', (a) => 2 * a.D - a.M], ['2D+Mp', (a) => 2 * a.D + a.Mp],
    ['Mp-M', (a) => a.Mp - a.M], ['Mp+M', (a) => a.Mp + a.M], ['2F', (a) => 2 * a.F],
    ['2D-2F', (a) => 2 * a.D - 2 * a.F], ['Mp-2F', (a) => a.Mp - 2 * a.F], ['2Mp', (a) => 2 * a.Mp],
    ['2D-2Mp', (a) => 2 * a.D - 2 * a.Mp], ['4D-Mp', (a) => 4 * a.D - a.Mp], ['4D-2Mp', (a) => 4 * a.D - 2 * a.Mp],
  ];
  const rows = [], yv = [];
  const src = globalThis.__detrendedSM;
  cache.rows.forEach(([jd], i) => {
    const a = args(jd);
    const row = [];
    for (const [, fn] of CAND) { const p = fn(a); row.push(Math.sin(p), Math.cos(p)); }
    rows.push(row); yv.push(src[i]);
  });
  const n = rows[0].length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0)), bb = new Array(n).fill(0);
  for (let r = 0; r < rows.length; r++) for (let i = 0; i < n; i++) { bb[i] += rows[r][i] * yv[r]; for (let j = 0; j < n; j++) A[i][j] += rows[r][i] * rows[r][j]; }
  for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc < n; cc++) A[r][cc] -= f * A[c][cc]; bb[r] -= f * bb[c]; }
  const x = new Array(n).fill(0);
  for (let c = n - 1; c >= 0; c--) { let s = bb[c]; for (let cc = c + 1; cc < n; cc++) s -= A[c][cc] * x[cc]; x[c] = s / A[c][c]; }
  const fit = rows.map((r) => r.reduce((s, v, i) => s + v * x[i], 0));
  const rem = yv.map((v, i) => v - fit[i]);
  console.log('\n5. MISSING-TERM NAMING (LSQ of mean-free shipped−MPP02 λ on the Delaunay basis):');
  console.log(`   scatter ${stats(yv.map((v) => v + 0)).sd.toFixed(2)}″ → post-fit ${stats(rem).sd.toFixed(2)}″; amplitudes ≥ 0.3″:`);
  CAND.forEach(([name], i) => {
    const amp = Math.hypot(x[2 * i], x[2 * i + 1]);
    if (amp >= 0.3) console.log(`     ${name.padEnd(8)} ${amp.toFixed(2)}″  (sin ${x[2 * i].toFixed(2)}, cos ${x[2 * i + 1].toFixed(2)})`);
  });
}
