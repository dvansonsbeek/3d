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
// WHAT THE "DE" COLUMN IS (owner's correction, recorded): NOT an observation.
// It is the JPL planetary ephemeris (NAIF kernel set 1 = generic DE4xx: an
// N-body integration WITH relativity, fitted to optical astrometry 1800–1970
// and to radar/spacecraft ranging since), rendered as osculating elements by
// WebGeoCalc. 1800–2026 is data-constrained, 2026–2100 is prediction. The
// json's headline `rates` are the FULL 1800–2100 window although the explorer
// labels them 1900–2026 (mislabel, to fix); `windowRates.trustworthy` is
// 1900–2026. So "N-body − DE" compares two integrations: ours (Newton only,
// seeded from the DE state) against JPL's (Newton + GR, fitted to data). For
// the outer planets that is integrator-vs-integrator and agreement is expected;
// the data content of the comparison is where the two DIFFER in physics —
// Mercury — and the raw-data statements of that difference are the transits.
//
// MEASURED (Horizons seed, dt 0.05 d, N-body − DE, ″/cy):
//   window 1800–2100: Mercury −43.0 · Earth −6.3 · Mars −1.4 · Jupiter −32 ·
//     Saturn +23 (−1,577 vs −1,600: retrograde in both) · Uranus +0.3
//   window 1900–2026: Mercury −43.0 · Earth −12.2 · Mars −0.8 · Jupiter −225
//     (832 vs 1,057) · Saturn −153 (−3,822 vs −3,669) · Uranus +107
//   Jupiter/Saturn/Uranus window "rates" swing by thousands of ″/cy between
//   the two windows in BOTH series (883-yr great inequality, 59-yr J–S
//   conjunction cycle) — there is no single rate for them on these spans, and
//   nothing in this table is a Saturn "observation" of −1,600 or −3,669.
//   Mercury is the same −43.0 in both windows. Expectations 1–4 above: met
//   (1 in the sense that both integrations run retrograde in both windows).
//   (Mean-element seed for comparison, 1800–2100: Saturn −297, Jupiter +865.)
//
// MASS EXPERIMENT (measured; "could Mercury's base rate just be 575?"): scaling
// one perturber by the amount that gives Mercury +43 (Newton + masses → 572):
//   Venus ×1.155  → Mercury 571.8 ✓ but Earth +48 ″/cy, Mars +6 off the DE
//   Jupiter ×1.28 → Mercury 572.0 ✓ but Earth +192, Mars +354, Uranus +7/−606
//   Earth ×1.48   → Mercury 572.2 ✓ but Mars +108, Venus −286
// The same masses that give Mercury 529 give Earth/Mars/Uranus right to a few
// ″/cy (and are pinned to 10⁻⁸ by satellites and flybys). Raising Mercury's
// Newtonian rate by 43 breaks every other planet — Le Verrier's route, closed
// by the model's own integrator. Whatever supplies the 43 must act at Mercury
// preferentially (∝ 1/a-class), not through the perturbing masses.
//
// TWO-BODY vs MANY-BODY (interactions=sun; measured, 1800–2100): with ONLY the
// Sun–planet pairs the perihelia hardly move — Mercury −3.7 ″/cy (39.3 with 1PN:
// the pure relativistic term), Mars +54, Earth −173 (window wobble of a
// near-Keplerian orbit), Saturn +374 — against the observed 572 / 1,598 / 1,157 /
// −1,600. With all 36 pairs: 529 / 1,596 / 1,151 / −1,577. The whole secular
// motion of the perihelia IS the planet–planet interaction, computed exactly
// (all pairs, every step); "the three-body problem" means no closed-form
// solution exists, not that the physics is missing — the numerical solution is
// what this script computes.
//
// 1PN TERM ON (gr=1; measured, 1800–2100, N-body − DE): Mercury −0.0 (572.0 vs
// 572.0) · Venus +0.4 · Earth −2.5 · Mars −0.1 · Jupiter −32 · Saturn +23 ·
// Uranus +0.3 — the single omitted term closes the single open row, and
// touches nothing else beyond the window scatter. Pre-registered prediction
// ("Mercury → ~0, nothing else by more than 1″ beyond scatter") met.
//
// READOUT FRAMES (Newton only; measured): frame=equatorial reads the SAME
// integration as ϖ = Ω_eq + ω on the J2000 equator — Mercury 518, Mars 1,587,
// Earth 1,151: the numbers change by −11 to −5 ″/cy purely from the readout,
// and note it does NOT reproduce the scene's RA projection (574): "ICRF
// perihelion rate" is itself several different quantities depending on which
// angle is read. frame=invariable (plane inclined 1.5785° to ECLIPJ2000, node
// at 107.58°) gives present-window node rates Mercury −528, Venus −1,468,
// Mars −1,504, Jupiter −3,047, Saturn −2,822, Uranus −433, Neptune −105 —
// circulating, as they should in that plane (they librate in the J2000
// ecliptic). The lattice's node column must be compared with the LONG-WINDOW
// mean in this frame (lattice-long-window-test.mjs frame=invariable).
//
// JOINT-MASS EXPERIMENT (owner: "maybe ALL masses change slightly — find a
// balanced set"): weighted least squares on the finite-difference sensitivity
// matrix ∂ϖ̇/∂lnM (scratchpad mass_inverse.mjs) finds a set that fits EVERY
// perihelion row within its window scatter: Venus +18.0 %, Earth −8.9 %,
// Mars −63.9 %, Jupiter +0.9 %, Saturn +1.8 % (Mercury 572.0, Earth 1156.8,
// Mars 1597.9 …). Then the NODE column (elem=node) with the same set:
//   baseline masses: N-body − DE = 0.0 (Mercury) 0.0 (Venus) 0.0 (Mars) 0.0
//     (Jupiter) 0.0 (Saturn) +0.1 (Uranus) — the integrator reproduces Ω̇ to 0.1;
//   joint set:       −26.3 (Mercury) +64.5 (Venus) +17.1 (Mars) +13.4 (Jupiter)
//     −9.4 (Saturn) +2.5 (Uranus).
// The masses that would fix the perihelion column break the node column by
// 100–600× the integrator's demonstrated precision. A mass re-balance cannot
// carry the 43: the perihelia and the nodes are set by the SAME masses through
// different geometry, and only the perihelion of Mercury is off. (Earth's Ω row
// is meaningless in the ecliptic frame — i ≈ 0 — and is to be ignored.)
//
// NUMERICS (measured, two-body Mercury, RK4, 100 yr): dt 0.5 d → +85 ″/cy of
// SPURIOUS apsidal drift (it read 614 for Mercury on the first run); dt 0.2 →
// 2.2; dt 0.1 → 0.14; dt 0.05 → 0.01 ″/cy. Default 0.05 d. Do not read the
// table from a coarser step. Rows with e < 0.01 (Venus, Neptune) have an
// ill-conditioned ϖ and their window trends are not meaningful in either series.
//
//   node tools/explore/perihelion-observation-audit.mjs [dt=0.05] [seed=horizons|standish] [scale=venus:1.155,…] [elem=peri|node] [frame=ecliptic|equatorial|invariable] [gr=1]

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HZ } from './j2000-state.mjs';
import { parseExtraForces, setEboundTarget } from './nbody-forces.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const wgc = JSON.parse(readFileSync(ROOT + 'public/input/wgc-perihelion-data.json', 'utf8'));

// Options: positional [dt] [seed] kept for the older calls; any `key=value` token
// anywhere: dt=, seed=horizons|standish, scale=venus:1.1,…, elem=peri|node,
// frame=ecliptic|equatorial|invariable (readout frame), gr=1 (1PN term on).
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const POS = process.argv.slice(2).filter((a) => !a.includes('='));
const DT = parseFloat(KV.dt || POS[0] || '0.05');   // days — see NUMERICS in the header
const FRAME = (KV.frame || 'ecliptic').toLowerCase();
const GR_ON = KV.gr === '1' || KV.gr === 'true';
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
// tp=icarus — add (1566) Icarus as a MASSLESS test particle (Horizons J2000
// heliocentric state, same query as the planets, COMMAND='1566;'): a = 1.078 AU,
// e = 0.827, perihelion 0.187 AU — the body whose perihelion advance discriminates
// between a 1/(a(1−e²)) term (GR: 10.1 ″/cy) and any short-range radial force
// tuned to the four inner planets (measured ≈ 10 ± 2, free coefficient).
const TP = (KV.tp || '').toLowerCase();
const names = [...Object.keys(STANDISH), ...(TP === 'icarus' ? ['icarus'] : [])];
const gmOf = (k) => (k === 'earth' ? GM_EM : k === 'icarus' ? 1e-30 : GM_S / TL.massRatioDE440[k]);

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
  ...HZ,   // the one home: j2000-state.mjs
  icarus:  [6.520497231987e+7, -2.502763235136e+8, -3.096760321833e+7, 1.131538091290e+1, -6.655831703377e+0, -4.860889118144e+0],
};
const SEED = (KV.seed || POS[1] || 'horizons').toLowerCase();
// scale=venus:1.155,jupiter:1.0 — multiply a perturber's GM (the "could the
// masses absorb the 43?" experiment: Le Verrier's own first idea).
const MASS_SCALE = Object.fromEntries((KV.scale || '').split(',').filter(Boolean).map((s) => { const [k, v] = s.split(':'); return [k, parseFloat(v)]; }));

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
const gms = [GM_S, ...names.map((k) => gmOf(k) * (MASS_SCALE[k] ?? 1))];
if (Object.keys(MASS_SCALE).length) console.log('MASS SCALING applied:', MASS_SCALE);
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => SEED === 'standish' ? stateJ2000(k) : { r: HORIZONS_J2000[k].slice(0, 3), v: HORIZONS_J2000[k].slice(3, 6) })];
const n = st.length, Mtot = gms.reduce((s, x) => s + x, 0);
const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mtot);
const vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mtot);
const Y0 = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
// interactions=all (default) | sun — DEMONSTRATION of what the N-body is: with
// `all`, every one of the 36 pairs among the nine bodies attracts every other at
// every step (the many-body problem solved numerically); with `sun`, only the
// eight Sun–planet pairs act (true two-body physics). The perihelion rates of
// the `sun` run are the answer to "is the N-body a two-body calculation?".
const INTERACTIONS = (KV.interactions || 'all').toLowerCase();
const derivNewton = INTERACTIONS === 'sun'
  ? (Y, dY) => {
      for (let i = 0; i < 3 * n; i++) { dY[i] = Y[3 * n + i]; dY[3 * n + i] = 0; }
      for (let B = 1; B < n; B++) {
        const ib = 3 * B, dx = Y[ib] - Y[0], dy = Y[ib + 1] - Y[1], dz = Y[ib + 2] - Y[2];
        const r2 = dx * dx + dy * dy + dz * dz, ir3 = 1 / (r2 * Math.sqrt(r2));
        dY[3 * n] += gms[B] * dx * ir3; dY[3 * n + 1] += gms[B] * dy * ir3; dY[3 * n + 2] += gms[B] * dz * ir3;
        dY[3 * n + ib] -= gms[0] * dx * ir3; dY[3 * n + ib + 1] -= gms[0] * dy * ir3; dY[3 * n + ib + 2] -= gms[0] * dz * ir3;
      }
    }
  : P.makeDeriv(gms, n, false);
// gr=1: the first post-Newtonian (Schwarzschild) acceleration of each planet in
// the Sun's field — the term the Newtonian run omits and the audit measures as
// −43 at Mercury: a = GM/(c²r³)·[(4GM/r − v²) r + 4 (r·v) v], heliocentric r, v;
// reaction on the Sun by momentum conservation. Planet–planet 1PN cross terms
// (EIH) are ≲ 0.01 ″/cy and left out.
const C_KM_S = TL.speedOfLight, C2 = C_KM_S * C_KM_S;
// extra=j2:2.2e-7,ring:2e-9@2.8,yukawa:1e-9@0.4 — force plugins (nbody-forces.mjs),
// added to every planet's heliocentric acceleration with the reaction on the Sun.
const EXTRA = parseExtraForces(KV.extra || '');
if ((KV.extra || '').includes('ebound')) { const OEb = require(ROOT + 'tools/lib/orbital-engine.js'); setEboundTarget((year) => OEb.computeEccentricityEarth(year)); }   // the H/3 line as the bound target
if (EXTRA.length) console.log(`EXTRA FORCES: ${KV.extra}`);
let tSimSec = 0;   // set by the integration loop for time-dependent plugins (the ring)
const derivBase = (!GR_ON && !EXTRA.length) ? derivNewton : (Y, dY) => {
  derivNewton(Y, dY);
  if (EXTRA.length) for (let i = 1; i < n; i++) {
    const r = [Y[3 * i] - Y[0], Y[3 * i + 1] - Y[1], Y[3 * i + 2] - Y[2]];
    const v = [Y[3 * n + 3 * i] - Y[3 * n], Y[3 * n + 3 * i + 1] - Y[3 * n + 1], Y[3 * n + 3 * i + 2] - Y[3 * n + 2]];
    for (const f of EXTRA) { const a = f(r, v, tSimSec, GM_S); const q = gms[i] / GM_S; dY[3 * n + 3 * i] += a[0]; dY[3 * n + 3 * i + 1] += a[1]; dY[3 * n + 3 * i + 2] += a[2]; dY[3 * n] -= q * a[0]; dY[3 * n + 1] -= q * a[1]; dY[3 * n + 2] -= q * a[2]; }
  }
};
const deriv = !GR_ON ? derivBase : (Y, dY) => {
  derivBase(Y, dY);
  for (let i = 1; i < n; i++) {
    const rx = Y[3 * i] - Y[0], ry = Y[3 * i + 1] - Y[1], rz = Y[3 * i + 2] - Y[2];
    const vx = Y[3 * n + 3 * i] - Y[3 * n], vy = Y[3 * n + 3 * i + 1] - Y[3 * n + 1], vz = Y[3 * n + 3 * i + 2] - Y[3 * n + 2];
    const r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2), v2 = vx * vx + vy * vy + vz * vz, rv = rx * vx + ry * vy + rz * vz;
    const k = GM_S / (C2 * r2 * r), fr = 4 * GM_S / r - v2, fv = 4 * rv;
    const ax = k * (fr * rx + fv * vx), ay = k * (fr * ry + fv * vy), az = k * (fr * rz + fv * vz);
    dY[3 * n + 3 * i] += ax; dY[3 * n + 3 * i + 1] += ay; dY[3 * n + 3 * i + 2] += az;
    const q = gms[i] / GM_S;
    dY[3 * n] -= q * ax; dY[3 * n + 1] -= q * ay; dY[3 * n + 2] -= q * az;
  }
};

// Readout frame (the owner's point: "the values are ecliptic, not ICRF" — the
// integration is frame-free; the frame is chosen at readout). ecliptic = ECLIPJ2000
// (the integration frame); equatorial = ICRF/J2000 equator (rotate about x by ε);
// invariable = z along the total orbital angular momentum of the initial state.
const EPS_J2000 = 23.4392911 * D2R;
let ROT = null;   // 3×3, applied to heliocentric r and v before the element readout
if (FRAME === 'equatorial') { const c = Math.cos(EPS_J2000), s = Math.sin(EPS_J2000); ROT = [[1, 0, 0], [0, c, -s], [0, s, c]]; }
if (FRAME === 'invariable') {
  const L = [0, 0, 0];
  for (let i = 0; i < n; i++) { const r = [Y0[3 * i], Y0[3 * i + 1], Y0[3 * i + 2]], v = [Y0[3 * n + 3 * i], Y0[3 * n + 3 * i + 1], Y0[3 * n + 3 * i + 2]]; L[0] += gms[i] * (r[1] * v[2] - r[2] * v[1]); L[1] += gms[i] * (r[2] * v[0] - r[0] * v[2]); L[2] += gms[i] * (r[0] * v[1] - r[1] * v[0]); }
  const Ln = Math.hypot(...L), z = L.map((q) => q / Ln);
  let x = [1 - z[0] * z[0], -z[0] * z[1], -z[0] * z[2]]; const xn = Math.hypot(...x); x = x.map((q) => q / xn);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  ROT = [x, y, z];   // rows = new axes in ecliptic coordinates
  console.log(`invariable plane: inclination to ECLIPJ2000 ${(Math.acos(z[2]) / D2R).toFixed(4)}°, node at ecliptic longitude ${((Math.atan2(z[0], -z[1]) / D2R + 360) % 360).toFixed(3)}°`);
}
const rot = (a) => (ROT ? [ROT[0][0] * a[0] + ROT[0][1] * a[1] + ROT[0][2] * a[2], ROT[1][0] * a[0] + ROT[1][1] * a[1] + ROT[1][2] * a[2], ROT[2][0] * a[0] + ROT[2][1] * a[1] + ROT[2][2] * a[2]] : a);

// osculating heliocentric ϖ (deg) and e of body i from a state vector, in the readout frame
function oscul(Y, i) {
  const r = rot([Y[3 * i] - Y[0], Y[3 * i + 1] - Y[1], Y[3 * i + 2] - Y[2]]);
  const v = rot([Y[3 * n + 3 * i] - Y[3 * n], Y[3 * n + 3 * i + 1] - Y[3 * n + 1], Y[3 * n + 3 * i + 2] - Y[3 * n + 2]]);
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
  // Kepler-III diagnostic inputs: osculating a (with the point-mass μ) and the
  // heliocentric ecliptic longitude of the position (its unwrapped slope = the
  // observed mean motion). An added radial force changes the period at fixed a,
  // i.e. the GM the planet "feels": n²a³/GM_S − 1 ≠ 0, and differently per planet.
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2], a = 1 / (2 / rn - v2 / mu);
  return { w: ((((Om + om) / D2R) % 360) + 360) % 360, e: en, Om: (((Om / D2R) % 360) + 360) % 360, inc: inc / D2R, a, lam: Math.atan2(r[1], r[0]) / D2R };
}
// argv[5] = 'elem=node' compares the ascending-node rates Ω̇ instead of ϖ̇ — the
// same perturber masses through a different geometry: any mass set proposed to
// fix the perihelion column must also keep this column right.
const ELEM = KV.elem || 'peri';

// RK4 integration in one direction, sampling every SAMPLE days
function run(Y, years, sampleDays, out) {
  const h = Math.sign(years) * DT * DAY, steps = Math.round(Math.abs(years) * 365.25 / DT), every = Math.max(1, Math.round(sampleDays / DT));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  for (let s = 0; s <= steps; s++) {
    tSimSec = Math.sign(years) * s * DT * DAY;
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
console.log(`framework 9-body (${GR_ON ? 'Newton + 1PN relativistic term' : 'Newton only, no relativity'} + DE440 masses) integrated 1600–2100 at dt ${DT} d in ${((Date.now() - t0) / 1000).toFixed(1)} s — ${series.length} samples; seed = ${SEED === 'standish' ? 'Standish MEAN elements (phase of the periodic terms lost)' : 'JPL Horizons J2000 state vectors'}; readout frame = ${FRAME}${FRAME !== 'ecliptic' ? ' (DE columns are ECLIPJ2000 and are NOT comparable in this frame)' : ''}\n`);

const unwrap = (v) => { const o = [v[0]]; for (let i = 1; i < v.length; i++) { let d = v[i] - v[i - 1]; while (d > 180) d -= 360; while (d < -180) d += 360; o.push(o[i - 1] + d); } return o; };
const ols = (x, y) => { const nn = x.length, mx = x.reduce((s, q) => s + q, 0) / nn, my = y.reduce((s, q) => s + q, 0) / nn; let sxy = 0, sxx = 0; for (let i = 0; i < nn; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxy / sxx; };
const rateOver = (k, y0, y1) => { const rows = series.filter((r) => r.t >= y0 && r.t <= y1); return ols(rows.map((r) => r.t), unwrap(rows.map((r) => (ELEM === 'node' ? r[k].Om : r[k].w)))) * 3600 * 100; };

const f = (v, d = 1, w = 11) => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(d)).padStart(w);
// The DE series is NOT an observation: it is the JPL ephemeris (an integration
// with relativity, fitted to optical astrometry 1800–1970 and to radar/spacecraft
// ranging since) rendered as osculating elements by WebGeoCalc. 1800–2026 is
// data-constrained; 2026–2100 is prediction. Its `rates` field is the FULL
// 1800–2100 window (the explorer labels it 1900–2026 — a mislabel); the
// `windowRates.trustworthy` field is 1900–2026. Both are shown, like for like.
const WIN = ELEM === 'node'
  ? [['1800–2100', 1800, 2100, (K) => wgc[K]?.rates.rawOm], ['1900–2026', 1900, 2026, () => null]]
  : [['1800–2100', 1800, 2100, (K) => wgc[K]?.rates.rawPi], ['1900–2026', 1900, 2026, (K) => wgc[K]?.windowRates?.trustworthy?.raw]];
console.log(`${ELEM === 'node' ? 'Ω (ascending node)' : 'ϖ'} rates in ECLIPJ2000, ″/cy — raw OLS on both series, same window.  DE = JPL ephemeris via WebGeoCalc (not an observation; see note).\n`);
console.log('planet      DE 1800–2100  N-body   N-body−DE  │  DE 1900–2026  N-body   N-body−DE  │  Standish mean   lattice 8H/N');
console.log('                [C]        [B]                │       [C]        [B]                │   [B, 1800–2050]     [A]');
for (const k of names) {
  const K = k.toUpperCase();
  const cells = WIN.map(([, y0, y1, de]) => { const d = de(K) ?? null, nb = rateOver(k, y0, y1); return `${f(d, 1, 12)}${f(nb, 1, 9)}${f(d === null ? null : nb - d, 1, 12)}`; });
  const standish = STANDISH[k] ? STANDISH[k][ELEM === 'node' ? 11 : 10] * 3600 : null;
  const lattice = (k === 'earth' || !TL.planets[k]) ? null : 1296000 / TL.planets[k].perihelionEclipticYears * 100;
  const flag = ELEM === 'node' && k === 'earth' ? '   ← i ≈ 0 in this frame: Ω undefined, ignore' : (STANDISH[k] && STANDISH[k][1] < 0.01) ? '   ← e < 0.01: ϖ ill-conditioned' : k === 'icarus' ? '   ← massless test particle (GR advance 10.1 ″/cy; measured ≈ 10 ± 2)' : '';
  console.log(`${k.padEnd(9)}${cells[0]}  │${cells[1]}  │${f(standish, 1, 16)}${f(lattice, 1, 15)}${flag}`);
}
// Kepler-III consistency: implied GM per planet from the window's mean motion and mean osculating a
{
  const rows = series.filter((r) => r.t >= 1800 && r.t <= 2100);
  const line = names.map((k) => {
    const n = ols(rows.map((r) => r.t), unwrap(rows.map((r) => r[k].lam))) * D2R / (365.25 * 86400);   // rad/s
    const a = rows.reduce((s, r) => s + r[k].a, 0) / rows.length;
    const rel = n * n * a * a * a / (GM_S + gms[1 + names.indexOf(k)]) - 1;
    return `${k} ${rel >= 0 ? '+' : ''}${rel.toExponential(2)}`;
  }).join(' · ');
  console.log(`\nKepler-III: n²ā³/GM − 1 per planet, 1800–2100 (Newtonian perturbations give the baseline pattern at ~1e-4; an added radial force shows as a DIFFERENT pattern — compare runs): ${line}`);
}
console.log('\nreading: N-body − DE is what Newton + the measured masses leave against the fitted ephemeris in that window. Jupiter/Saturn window trends swing by thousands of ″/cy between windows (883-yr great inequality) — no single "rate" exists for them on these spans.');
console.log('Saturn: the retrograde sign is reproduced by the integration — the prograde number is the first-order/eigenmode MEAN (A), not a prediction for this epoch.');
console.log('Mercury: the residual is the excess apsidal advance; it is produced here with no relativistic term anywhere in the model (cf. tools/explore/mercury-transit-apsidal-test.mjs, perihelion-excess-candidates.mjs).');
