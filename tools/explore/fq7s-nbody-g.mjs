// OPTION C-LARGE, STEP 2 — the secular apsidal frequencies g5/g6 from the
// framework's OWN N-body (Sun + 8 planets, no Moon), zero fitted constants.
//
// First-order Laplace–Lagrange gets g5 12% low (the Jupiter–Saturn 5:2
// near-resonance is a second-order effect). The model's doctrine is to
// derive, and its own planetary integrator is the derivation: integrate
// the 9-body system for YEARS, sample the osculating h = e·sinϖ,
// k = e·cosϖ of Jupiter and Saturn, and fit the two-mode secular model
//   z_J(t) = A5 e^{i(g5 t+φ5)} + A6 e^{i(g6 t+φ6)},  z_S(t) likewise,
// with g5, g6 FREE (grid + linear amplitudes) — the 54-kyr g6−g5 beat
// and Jupiter's ⅓-cycle of g5 over 100 kyr pin both to ~1%. The Great
// Inequality (883 yr) averages out at 100-yr sampling with a running mean.
//
// Usage: node tools/explore/fq7s-nbody-g.mjs [years=100000] [dt=1]
//   (1 kyr ≈ timing probe; 100 kyr is the production run)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const { DEFAULT_CONSTANTS: C } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);

const YEARS = parseFloat(process.argv[2] || '100000');
const DT = parseFloat(process.argv[3] || '1');
const D2R = Math.PI / 180, DAY = 86400, AS = 206264.806;
const GM_S = TL.GM_SUN, GM_EM = P.GM_EM;

// bodies: Sun + 8 planets (EMB as one body), J2000 mean elements → state
const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const bodies = names.map((k) => {
  if (k === 'earth') return { k, gm: GM_EM, T: TL.yearLengthRef.siderealYear, e: C.earthOrbital.earthEccentricityJ2000, w: C.earthOrbital.earthPerihelionLongitudeJ2000, inc: C.earthOrbital.earthInclinationJ2000_deg * 0, Om: 0 };
  const p = TL.planets[k];
  return { k, gm: GM_S / TL.massRatioDE440[k], T: p.solarYearInput, e: p.orbitalEccentricityJ2000, w: p.longitudePerihelion, inc: p.eclipticInclinationJ2000, Om: p.ascendingNode };
});
function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e), r = p / (1 + e * Math.cos(nu)), h = Math.sqrt(gm * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu), vxp = -gm / h * Math.sin(nu), vyp = gm / h * (e + Math.cos(nu));
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si, sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si, sw * si, cw * si, ci];
  const rot = (x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}
const gms = [GM_S], states = [{ r: [0, 0, 0], v: [0, 0, 0] }];
for (const b of bodies) {
  const a = Math.cbrt((GM_S + b.gm) * Math.pow(b.T * DAY / (2 * Math.PI), 2));
  const w = (b.w - b.Om) * D2R;   // argument of perihelion; start each planet at perihelion (ν = 0) — phases are irrelevant for secular RATES
  states.push(keplerPosVel(GM_S + b.gm, a, b.e, b.inc * D2R, b.Om * D2R, w, 0));
  gms.push(b.gm);
}
const n = states.length;
const Mtot = gms.reduce((s, x) => s + x, 0);
const rB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.r[k], 0) / Mtot);
const vB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.v[k], 0) / Mtot);
const Y = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { Y[3 * i + k] = states[i].r[k] - rB[k]; Y[3 * n + 3 * i + k] = states[i].v[k] - vB[k]; }
const deriv = P.makeDeriv(gms, n, false);

// osculating h,k of body i (heliocentric)
const hk = (i) => {
  const r = [Y[3 * i] - Y[0], Y[3 * i + 1] - Y[1], Y[3 * i + 2] - Y[2]];
  const v = [Y[3 * n + 3 * i] - Y[3 * n], Y[3 * n + 3 * i + 1] - Y[3 * n + 1], Y[3 * n + 3 * i + 2] - Y[3 * n + 2]];
  const mu = GM_S + gms[i];
  const hv = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const rn = Math.hypot(...r);
  const ev = [0, 1, 2].map((k) => (v[(k + 1) % 3] * hv[(k + 2) % 3] - v[(k + 2) % 3] * hv[(k + 1) % 3]) / mu - r[k] / rn);
  return [ev[1], ev[0]];   // h = e sinϖ ≈ ev_y, k = e cosϖ ≈ ev_x (ecliptic-plane projection)
};

const SAMPLE_DAYS = parseFloat(process.argv[4] || '100');   // argv[4]: sampling interval in days (Myr-class runs: 365250 = 1 kyr)
const h = DT * DAY, steps = Math.round(YEARS * 365.25 / DT), sampleEvery = Math.max(1, Math.round(SAMPLE_DAYS / DT));
const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
const T = [], HJ = [], KJ = [], HS = [], KS = [];
const iJ = 1 + names.indexOf('jupiter'), iS = 1 + names.indexOf('saturn');
const t0c = Date.now();
for (let s = 0; s <= steps; s++) {
  if (s % sampleEvery === 0) { T.push(s * DT / 365.25); const j = hk(iJ), sa = hk(iS); HJ.push(j[0]); KJ.push(j[1]); HS.push(sa[0]); KS.push(sa[1]); }
  deriv(Y, k1);
  for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
  deriv(tmp, k2);
  for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
  deriv(tmp, k3);
  for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
  deriv(tmp, k4);
  for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}
console.log(`integrated ${YEARS} yr @ dt ${DT} d in ${((Date.now() - t0c) / 1000).toFixed(0)} s (${T.length} samples)`);
writeFileSync(ROOT + 'tools/explore/fq7s-nbody-g.local.json', JSON.stringify({ years: YEARS, dt: DT, T, HJ, KJ, HS, KS }));

// ── two-mode fit with free g5, g6 (grid search, linear amplitudes) ───────
function fitTwoMode(g5, g6) {
  // rows: [cos g5 t, sin g5 t, cos g6 t, sin g6 t] for h and k of J and S jointly
  const K = 4; const cols = (t) => [Math.cos(g5 * t), Math.sin(g5 * t), Math.cos(g6 * t), Math.sin(g6 * t)];
  const STRIDE = Math.max(1, Math.floor(T.length / 4000));   // ~4000 points suffice for a 2-mode fit
  let ss = 0;
  for (const series of [HJ, KJ, HS, KS]) {
    const G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
    for (let i = 0; i < T.length; i += STRIDE) { const v = cols(T[i]); for (let a = 0; a < K; a++) { b[a] += v[a] * series[i]; for (let c = 0; c < K; c++) G[a][c] += v[a] * v[c]; } }
    const Gm = G.map((r) => Array.from(r)), x = Array.from(b);
    for (let c = 0; c < K; c++) for (let r = c + 1; r < K; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
    const co = new Float64Array(K); for (let c = K - 1; c >= 0; c--) { let s2 = x[c]; for (let cc = c + 1; cc < K; cc++) s2 -= Gm[c][cc] * co[cc]; co[c] = s2 / Gm[c][c]; }
    for (let i = 0; i < T.length; i += STRIDE) { const v = cols(T[i]); ss += (series[i] - v.reduce((q, vv, a) => q + vv * co[a], 0)) ** 2; }
  }
  return ss;
}
if (YEARS >= 20000) {
  let best = null;
  for (let g5as = 3.0; g5as <= 5.0; g5as += 0.02) for (let g6as = 24; g6as <= 32; g6as += 0.1) {
    const ss = fitTwoMode(g5as / AS, g6as / AS);
    if (!best || ss < best.ss) best = { g5as, g6as, ss };
  }
  // refine
  for (let g5as = best.g5as - 0.02; g5as <= best.g5as + 0.02; g5as += 0.002) for (let g6as = best.g6as - 0.1; g6as <= best.g6as + 0.1; g6as += 0.01) {
    const ss = fitTwoMode(g5as / AS, g6as / AS);
    if (ss < best.ss) best = { g5as, g6as, ss };
  }
  console.log(`two-mode fit: g5 = ${best.g5as.toFixed(3)} ″/yr (Laskar 4.2575, LL-1st 3.74) · g6 = ${best.g6as.toFixed(2)} ″/yr (Laskar 28.2452)`);
} else console.log('(timing probe only — production needs ≥ 20 kyr for the two-mode fit)');
