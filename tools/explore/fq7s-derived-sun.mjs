// FQ-7-SUN S3 — the SIGNAL UPGRADE twin (plan §12i, FQ-7-Sun round).
//
// The S1 deep re-read measured the v3 signal's table-read ceiling
// (0.614 → 0.546″, no further): the census's ~0.6″ JPL structure is the
// SIGNAL-vs-reality gap, not table truncation. This instrument re-derives
// the signal better, three upgrades over d2-derived-sun.mjs:
//   · URANUS + NEPTUNE added (framework elements + massRatioDE440 GMs) —
//     the E−U/E−Ne tones were absent from the 8-body twin entirely;
//   · 400-yr window (1800–2200) — sideband resolution doubles, the
//     1900–2100 JPL validation span sits fully interior (no edge);
//   · t0 = 1800 phases from the engine graph (same convention/validation
//     as the 1900 run: λ_abs = λE_true − (λp − λE)_graph).
// Everything else is d2-derived-sun verbatim: base3 = Sun–Earth–Moon,
// full = base3 + 7 planets, dl_sun = full − base3 with the secular
// perihelion family projected out (T-modulated annual basis).
//
// Output: fq7s-derived-sun-signal.local.json {jd0, stride, dlP[]} + the
// JPL correlation check on the existing 1,600-epoch cache (read-only).
//
// Usage: node tools/explore/fq7s-derived-sun.mjs [years=400] [dt=0.01] [t0Year=1800] [outSuffix='']
//   t0Year/outSuffix support the ENSEMBLE protocol: several twins at
//   different t0 epochs, extracted separately and averaged — IC-realization
//   phase noise averages out, systematic content survives (still pure
//   derivation, JPL untouched).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const D1 = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');
const SG = require(ROOT + 'tools/lib/scene-graph.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);

const model = createModel(DEFAULT_CONSTANTS);
const C = DEFAULT_CONSTANTS;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const DAY = 86400;
const YEARS = parseFloat(process.argv[2] || '400');
const DT = parseFloat(process.argv[3] || '0.01');
const T0YR = parseFloat(process.argv[4] || '1800');
const SUFFIX = process.argv[5] || '';
const HERE = fileURLToPath(new URL('.', import.meta.url));

const JD0 = model.time.jdFromYear(T0YR);

// ── constants mirrored from the lab conventions ─────────────────────────
const GM_S = 1.327124e11;
const GM_EM = P.GM_EM;
const MASS_RATIO_EM = TL.MASS_RATIO_EARTH_MOON ?? 81.30056816;
const GM_M = GM_EM / (1 + MASS_RATIO_EM);
const GM_E = GM_EM - GM_M;
const GM_HELIO = GM_S + GM_EM;
const T_SID_YR_S = (TL.meanSiderealYearSeconds ?? 31558149.7635);
const d2r = D2R;

// 7 planets: the P.PLANETS five + Uranus/Neptune from the same sources
const PLANETS7 = [
  ...P.PLANETS,
  ...['uranus', 'neptune'].map((k) => {
    const p = TL.planets[k];
    return {
      key: k,
      gm: GM_S / TL.massRatioDE440[k],
      T_days: p.solarYearInput,
      e: p.orbitalEccentricityJ2000,
      inc: (p.eclipticInclinationJ2000 || 0) * d2r,
      Om: (p.ascendingNode || 0) * d2r,
      w: (((p.longitudePerihelion || 0) - (p.ascendingNode || 0)) * d2r),
    };
  }),
];

// ── real planet longitudes at t0 from the engine graph ──────────────────
SG.computePlanetPosition('venus', JD0);
const g = SG._getGraphForProbe();
const wp = (n) => n.getWorldPosition();
const sunW = wp(g.sunNodes.pivot), earthW = wp(g.earthNodes.pivot);
const lamG = (v) => Math.atan2(v[2] - sunW[2], v[0] - sunW[0]) * R2D;
const lamEg = lamG(earthW);
const lamE = (model.eclipse.sunLonDegAtJD(JD0) + 180) % 360;
const lamPlanet = {};
for (const k of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  lamPlanet[k] = ((lamE - (lamG(wp(g.planetNodeMap[k].planet.pivot)) - lamEg)) + 720) % 360;
}
console.log(`t0 = JD ${JD0.toFixed(2)} (${T0YR}); planet λ:`, Object.entries(lamPlanet).map(([k, v]) => `${k} ${v.toFixed(2)}°`).join('  '));

function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu);
  const vxp = -gm / h * Math.sin(nu), vyp = gm / h * (e + Math.cos(nu));
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si,
    sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si,
    sw * si, cw * si, ci];
  const rot = (x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}

const periE = model.earth.perihelionLongitudeDeg(T0YR);
const eccE = model.earth.eccentricity(T0YR);
const nuE = ((lamE - periE) % 360) * D2R;
const { eIC, iIC, aIC } = D1.calibrate(undefined, true);

function buildSystem(withPlanets) {
  const gms = [GM_S, GM_E, GM_M];
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  const emb = keplerPosVel(GM_HELIO, a_EMB, eccE, 0, 0, periE * D2R, nuE);
  const rel = keplerPosVel(GM_EM, aIC, eIC, iIC, 0, 0, 0);
  const states = [
    { r: [0, 0, 0], v: [0, 0, 0] },
    { r: emb.r.map((x, k) => x - rel.r[k] * GM_M / GM_EM), v: emb.v.map((x, k) => x - rel.v[k] * GM_M / GM_EM) },
    { r: emb.r.map((x, k) => x + rel.r[k] * GM_E / GM_EM), v: emb.v.map((x, k) => x + rel.v[k] * GM_E / GM_EM) },
  ];
  if (withPlanets) {
    for (const p of PLANETS7) {
      const a = Math.cbrt((GM_S + p.gm) * Math.pow(p.T_days * DAY / (2 * Math.PI), 2));
      const lam = lamPlanet[p.key];
      const nu = lam === undefined ? 0 : ((lam * D2R) - (p.Om + p.w));
      states.push(keplerPosVel(GM_S + p.gm, a, p.e, p.inc, p.Om, p.w, nu));
      gms.push(p.gm);
    }
  }
  const Mtot = gms.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.r[k], 0) / Mtot);
  const vB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.v[k], 0) / Mtot);
  const n = states.length;
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    Y[3 * i + k] = states[i].r[k] - rB[k];
    Y[3 * n + 3 * i + k] = states[i].v[k] - vB[k];
  }
  return { Y, gms, n };
}

function integrate(withPlanets, years, dt) {
  const { Y, gms, n } = buildSystem(withPlanets);
  const deriv = P.makeDeriv(gms, n, false);
  const h = dt * DAY;
  const steps = Math.round(years * 365.25 / dt);
  const sampleEvery = Math.max(1, Math.round(0.25 / dt));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  const T = [], lamS = [];
  for (let s = 0; s <= steps; s++) {
    if (s % sampleEvery === 0) {
      T.push(s * dt);
      lamS.push(Math.atan2(Y[1] - Y[4], Y[0] - Y[3]));
    }
    deriv(Y, k1);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
    deriv(tmp, k2);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
    deriv(tmp, k3);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
    deriv(tmp, k4);
    for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  for (let i = 1; i < lamS.length; i++) {
    while (lamS[i] - lamS[i - 1] > Math.PI) lamS[i] -= 2 * Math.PI;
    while (lamS[i] - lamS[i - 1] < -Math.PI) lamS[i] += 2 * Math.PI;
  }
  return { T, lamS };
}

console.log(`integrating base3 + full (10 bodies), ${YEARS} yr @ dt ${DT} ...`);
const t0c = Date.now();
const B = integrate(false, YEARS, DT);
const F = integrate(true, YEARS, DT);
console.log(`done ${((Date.now() - t0c) / 1000).toFixed(0)} s (${B.T.length} samples)`);

const N = B.T.length;
const dl = new Float64Array(N);
for (let i = 0; i < N; i++) dl[i] = (F.lamS[i] - B.lamS[i]) * R2D * 3600;
const rms = (v) => Math.sqrt(Array.from(v).reduce((s, x) => s + x * x, 0) / v.length);

// ── shared extended-family basis (secular + D + T-modulated annual) ─────
const K = 15;
const rowAt = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const Dm = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
  const L = (100.46646 + 36000.7698 * T) * D2R;
  const sL = Math.sin(L), cL = Math.cos(L), s2L = Math.sin(2 * L), c2L = Math.cos(2 * L);
  return [1, Math.sin(Dm), Math.cos(Dm), T, T * T, sL, cL, s2L, c2L, T * sL, T * cL, T * s2L, T * c2L, T * T * sL, T * T * cL];
};
function projectOut(jds, v) {
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K);
  const rowsB = jds.map(rowAt);
  for (let i = 0; i < v.length; i++) {
    for (let k = 0; k < K; k++) {
      b[k] += rowsB[i][k] * v[i];
      for (let j = k; j < K; j++) G[k][j] += rowsB[i][k] * rowsB[i][j];
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
  const coef = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * coef[cc];
    coef[c] = s / Gm[c][c];
  }
  return v.map((y, i) => y - rowsB[i].reduce((s, f, k) => s + f * coef[k], 0));
}

// grid projection + dump
const gridJds = Array.from(B.T, (t) => JD0 + t);
const dlP = projectOut(gridJds, Array.from(dl));
const OUT = `fq7s-derived-sun-signal${SUFFIX}.local.json`;
writeFileSync(HERE + OUT,
  JSON.stringify({ jd0: JD0, stride: B.T[1] - B.T[0], dlP: dlP.map((v) => Math.round(v * 1000) / 1000) }));
console.log(`grid-projected planetary signal RMS ${rms(dlP).toFixed(2)}″ → ${OUT}`);

// ── JPL correlation (read-only reuse of the 1,600-epoch cache) ──────────
const CACHE = HERE + 'd2-sun-jpl-cache.local.json';
if (existsSync(CACHE)) {
  const cache = JSON.parse(readFileSync(CACHE, 'utf8'));
  const BRIDGE = C.earthOrbital.deltaTStart / 86400;
  const Nnut = C.physicalConstants.nutationLeadingTermsArcsec;
  const wrap = (d) => ((d + 540) % 360) - 180;
  const usable = [];
  const stride = B.T[1] - B.T[0];
  for (const [jd, jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (Nnut.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (Nnut.psiOmega * Math.sin(om)) / 3600;
    const i = (jd - JD0) / stride, i0 = Math.floor(i);
    if (i0 < 0 || i0 + 1 >= N) continue;
    const f = i - i0;
    usable.push({
      jd,
      resid: wrap(model.eclipse.sunLonDegAtJD(jb) - (jplSun - dPsiDeg)) * 3600,
      d: dlP[i0] * (1 - f) + dlP[i0 + 1] * f,
    });
  }
  const uj = usable.map((r) => r.jd);
  const r0 = projectOut(uj, usable.map((r) => r.resid));
  const dP2 = projectOut(uj, usable.map((r) => r.d));
  const r1 = r0.map((v, i) => v + dP2[i]);
  console.log(`\nJPL residual (family removed): RMS ${rms(r0).toFixed(2)}″ (n ${usable.length})`);
  console.log(`residual + derived (correct sign): RMS ${rms(r1).toFixed(2)}″  [d2 8-body record: 0.60″]`);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < r0.length; i++) { sxy += r0[i] * dP2[i]; sxx += dP2[i] * dP2[i]; syy += r0[i] * r0[i]; }
  console.log(`correlation ${(sxy / Math.sqrt(sxx * syy)).toFixed(3)}  slope ${(sxy / sxx).toFixed(3)}`);
}
