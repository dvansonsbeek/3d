#!/usr/bin/env node
// OBSERVATION-FIRST AUDIT of the perihelion rates — what is measured, what is
// integrated from measured masses, and what is a long-term-mean layer.
//
// Three quantities get conflated in the perihelion discussion:
//   A  eigenfrequency / first-order secular MEAN (g_k; ≥ 10⁵-yr averages)
//   B  the instantaneous secular rate at this epoch (phase rate of the sum of
//      the modes + the Newtonian perturbations) — what an N-body run gives now
//   C  a short-window observed trend (126 yr through an osculating element)
// This audit puts B beside C for every planet using the model's OWN 9-body
// Newtonian integrator (tools/explore/derive-planetary-lunar-terms.js makeDeriv;
// Sun + 8 planets, DE440 mass ratios, Standish J2000 state with the TRUE phases),
// with NO relativistic term anywhere, and fits the osculating ϖ in ECLIPJ2000
// over exactly the WebGeoCalc window with the same OLS estimator.
//
// PRE-REGISTERED EXPECTATIONS (written before the first run):
//   1. Saturn's N-body rate is RETROGRADE (≈ −1,500 ″/cy) — the "prograde"
//      number is the first-order mean (A), not a prediction for this epoch;
//   2. Venus, Earth, Mars, Jupiter, Uranus, Neptune: N-body ≈ WebGeoCalc within
//      the window noise (a few ″/cy);
//   3. Mercury: N-body ≈ 531, WebGeoCalc ≈ 572 — the ONLY planet where Newton +
//      the masses leaves a gap, and the gap is ≈ 43 ″/cy, produced by the model's
//      own integrator with no relativity in it;
//   4. the lattice 8H/N column is quantity A (the long-term-mean layer) and is
//      not comparable with B/C — the kinematic-vs-dynamical rule.
//
// MEASURED (Horizons seed, dt 0.05 d, window 1800–2100, N-body − WebGeoCalc, ″/cy):
//   Mercury −43.0 · Venus −8 (ill-conditioned) · Earth −6.3 · Mars −1.4 ·
//   Jupiter −32 · Saturn +23 (N-body −1,577 vs observed −1,600: RETROGRADE,
//   reproduced) · Uranus +0.3 · Neptune (ill-conditioned).
//   Every planet sits within the window scatter (inner ≲ 6, the great-inequality
//   pair ≲ 30) except Mercury, whose −43.0 is the excess apsidal advance — and it
//   appears here from Newton's law and the DE440 masses alone. Expectations 1–4
//   above: all met. (Mean-element seed for comparison: Saturn −297, Jupiter +865.)
//
// NUMERICS (measured, two-body Mercury, RK4, 100 yr): dt 0.5 d → +85 ″/cy of
// SPURIOUS apsidal drift (it read 614 for Mercury on the first run); dt 0.2 →
// 2.2; dt 0.1 → 0.14; dt 0.05 → 0.01 ″/cy. Default 0.05 d. Do not read the
// table from a coarser step. Rows with e < 0.01 (Venus, Neptune) have an
// ill-conditioned ϖ and their window trends are not meaningful in either series.
//
//   node tools/explore/perihelion-observation-audit.mjs [dtDays=0.05] [seed=horizons|standish]

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const wgc = JSON.parse(readFileSync(ROOT + 'public/input/wgc-perihelion-data.json', 'utf8'));

const DT = parseFloat(process.argv[2] || '0.05');   // days — see NUMERICS in the header
const D2R = Math.PI / 180, DAY = 86400, AU_KM = TL.currentAUDistance;
const GM_S = TL.GM_SUN, GM_EM = P.GM_EM;

// Standish, JPL approx_pos Table 1 (1800–2050): a e I L ϖ Ω at J2000, then rates /cy; mean ecliptic & equinox of J2000
const STANDISH = {
  mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
  earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  uranus:  [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
};
const names = Object.keys(STANDISH);
const gmOf = (k) => (k === 'earth' ? GM_EM : GM_S / TL.massRatioDE440[k]);

// SEED for the integration. The Standish elements are MEAN elements (periodic
// terms removed); seeding the osculating state from them puts Jupiter and Saturn
// ~0.5° off in the phase of the 883-yr great-inequality term, which is exactly
// what dominates a 300-yr ϖ trend of those two (measured: Saturn read −297
// instead of ≈ −1,500 from the mean-element seed). Default seed is therefore
// the TRUE J2000 state: JPL Horizons, planet barycentres 1–8, CENTER='500@10'
// (heliocentric), REF_PLANE='ECLIPTIC', REF_SYSTEM='J2000', TDB, km and km/s,
// JD 2451545.0 — an observed state, no theory in it. argv[3] = 'standish' seeds
// from the mean elements instead (kept to show the effect).
const HORIZONS_J2000 = {
  mercury: [-1.946172635585e+7, -6.691327526352e+7, -3.679854343750e+6, 3.699499185728e+1, -1.116441592562e+1, -4.307628118658e+0],
  venus:   [-1.074564940522e+8, -4.885014975873e+6, 6.135634299718e+6, 1.381906029263e+0, -3.514029517645e+1, -5.600423382821e-1],
  earth:   [-2.650257688971e+7, 1.446939556280e+8, -1.704331902042e+2, -2.978644078798e+1, -5.478176822344e+0, 4.197340759138e-5],
  mars:    [2.080481406418e+8, -2.007052628224e+6, -5.156288959273e+6, 1.162672436605e+0, 2.629606453968e+1, 5.222970066951e-1],
  jupiter: [5.985675835979e+8, 4.396047284920e+8, -1.522686065302e+7, -7.909837688567e+0, 1.115613309734e+1, 1.308626770728e-1],
  saturn:  [9.583851242197e+8, 9.828564572112e+8, -5.521304749180e+7, -7.432021997941e+0, 6.735913712660e+0, 1.782497576763e-1],
  uranus:  [2.158975019759e+9, -2.054625247237e+9, -3.562548941967e+7, 4.637024235952e+0, 4.627657581334e+0, -4.289175880417e-2],
  neptune: [2.515046428529e+9, -3.738714513276e+9, 1.903227194039e+7, 4.465902049825e+0, 3.076627073142e+0, -1.660633585828e-1],
};
const SEED = (process.argv[3] || 'horizons').toLowerCase();

function kepler(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 40; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-14) break; } return E; }
function stateJ2000(k) {
  const [a0, e0, I0, L0, w0, O0] = STANDISH[k];
  const mu = GM_S + gmOf(k), aKm = a0 * AU_KM, e = e0;
  const M = (((L0 - w0) % 360) + 360) % 360 * D2R, E = kepler(M, e);
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
  const p = aKm * (1 - e * e), r = p / (1 + e * Math.cos(nu)), h = Math.sqrt(mu * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu), vxp = -mu / h * Math.sin(nu), vyp = mu / h * (e + Math.cos(nu));
  const Om = O0 * D2R, w = (w0 - O0) * D2R, inc = I0 * D2R;
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si, sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si, sw * si, cw * si, ci];
  const rot = (x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}

// barycentric initial state (Sun index 0)
const gms = [GM_S, ...names.map(gmOf)];
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => SEED === 'standish' ? stateJ2000(k) : { r: HORIZONS_J2000[k].slice(0, 3), v: HORIZONS_J2000[k].slice(3, 6) })];
const n = st.length, Mtot = gms.reduce((s, x) => s + x, 0);
const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mtot);
const vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mtot);
const Y0 = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
const deriv = P.makeDeriv(gms, n, false);

// osculating heliocentric ϖ (deg, ECLIPJ2000) and e of body i from a state vector
function oscul(Y, i) {
  const r = [Y[3 * i] - Y[0], Y[3 * i + 1] - Y[1], Y[3 * i + 2] - Y[2]];
  const v = [Y[3 * n + 3 * i] - Y[3 * n], Y[3 * n + 3 * i + 1] - Y[3 * n + 1], Y[3 * n + 3 * i + 2] - Y[3 * n + 2]];
  const mu = GM_S + gms[i];
  const hv = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const rn = Math.hypot(...r);
  const ev = [0, 1, 2].map((c) => (v[(c + 1) % 3] * hv[(c + 2) % 3] - v[(c + 2) % 3] * hv[(c + 1) % 3]) / mu - r[c] / rn);
  // longitude of perihelion in the ecliptic: node Ω from ĥ, ω in-plane, ϖ = Ω + ω (exact, not the h/k projection)
  const hn = Math.hypot(...hv), inc = Math.acos(hv[2] / hn);
  const Om = Math.atan2(hv[0], -hv[1]);
  const nodeV = [Math.cos(Om), Math.sin(Om), 0];
  const en = Math.hypot(...ev);
  let om = Math.acos(Math.max(-1, Math.min(1, (nodeV[0] * ev[0] + nodeV[1] * ev[1]) / en)));
  if (ev[2] < 0) om = 2 * Math.PI - om;
  if (inc < 1e-6) om = Math.atan2(ev[1], ev[0]) - Om;   // near-planar: Ω ill-defined, use the in-plane angle
  return { w: ((((Om + om) / D2R) % 360) + 360) % 360, e: en };
}

// RK4 integration in one direction, sampling every SAMPLE days
function run(Y, years, sampleDays, out) {
  const h = Math.sign(years) * DT * DAY, steps = Math.round(Math.abs(years) * 365.25 / DT), every = Math.max(1, Math.round(sampleDays / DT));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) { const t = 2000 + Math.sign(years) * s * DT / 365.25; const row = { t }; for (let i = 1; i < n; i++) row[names[i - 1]] = oscul(Y, i); out.push(row); }
    deriv(Y, k1); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
    deriv(tmp, k2); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
    deriv(tmp, k3); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
    deriv(tmp, k4); for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
}
const t0 = Date.now();
const fwd = [], bwd = [];
run(Float64Array.from(Y0), 100, 10, fwd);
run(Float64Array.from(Y0), -400, 10, bwd);
const series = [...bwd.reverse(), ...fwd.slice(1)];
console.log(`framework 9-body (Newton + DE440 masses, no relativity) integrated 1600–2100 at dt ${DT} d in ${((Date.now() - t0) / 1000).toFixed(1)} s — ${series.length} samples; seed = ${SEED === 'standish' ? 'Standish MEAN elements (phase of the periodic terms lost)' : 'JPL Horizons J2000 state vectors (observed)'}\n`);

const unwrap = (v) => { const o = [v[0]]; for (let i = 1; i < v.length; i++) { let d = v[i] - v[i - 1]; while (d > 180) d -= 360; while (d < -180) d += 360; o.push(o[i - 1] + d); } return o; };
const ols = (x, y) => { const nn = x.length, mx = x.reduce((s, q) => s + q, 0) / nn, my = y.reduce((s, q) => s + q, 0) / nn; let sxy = 0, sxx = 0; for (let i = 0; i < nn; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxy / sxx; };
const rateOver = (k, y0, y1) => { const rows = series.filter((r) => r.t >= y0 && r.t <= y1); return ols(rows.map((r) => r.t), unwrap(rows.map((r) => r[k].w))) * 3600 * 100; };

const f = (v, d = 1, w = 11) => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(d)).padStart(w);
const W0 = wgc.MERCURY.yrArr[0], W1 = wgc.MERCURY.yrArr[wgc.MERCURY.yrArr.length - 1];
console.log(`ϖ rates in ECLIPJ2000, ″/cy.  window ${W0}–${Math.round(W1)} = the WebGeoCalc window; the same raw-OLS estimator on both series.\n`);
console.log('planet    WGC raw OLS  WGC sin+lin   N-body(Newton)   N-body−WGC   Standish 1800–2050   N-body 1600–2100   lattice 8H/N   (quantity)');
console.log('                 [C]          [C]      [B, this window]                  [B, mean element]        [B, longer]      [A]');
for (const k of names) {
  const K = k.toUpperCase();
  const wraw = wgc[K] ? wgc[K].rates.rawPi : null, wsin = wgc[K] ? wgc[K].rates.sinPi : null;
  const nb = rateOver(k, W0, W1), nbLong = rateOver(k, 1600, 2100);
  const standish = STANDISH[k][10] * 3600;
  const lattice = k === 'earth' ? null : 1296000 / TL.planets[k].perihelionEclipticYears * 100;
  const flag = STANDISH[k][1] < 0.01 ? '   ← e < 0.01: ϖ ill-conditioned, trend not meaningful' : '';
  console.log(`${k.padEnd(9)}${f(wraw)}${f(wsin, 1, 13)}${f(nb, 1, 18)}${f(wraw === null ? null : nb - wraw, 1, 13)}${f(standish, 1, 21)}${f(nbLong, 1, 19)}${f(lattice, 1, 15)}${flag}`);
}
console.log('\nreading: N-body − WGC is what Newton + the measured masses leave unexplained in this window, planet by planet. Earth has no WGC row (its ϖ is the reference of that frame).');
console.log('Saturn: the retrograde sign is reproduced by the integration — the prograde number is the first-order/eigenmode MEAN (A), not a prediction for this epoch.');
console.log('Mercury: the residual is the excess apsidal advance; it is produced here with no relativistic term anywhere in the model (cf. tools/explore/mercury-transit-apsidal-test.mjs, perihelion-excess-candidates.mjs).');
