// ═══════════════════════════════════════════════════════════════════════════
// elp-mpp02.js — ELP/MPP02 evaluator (Chapront & Francou 2003)
//
// Port of the reference C++ implementation shipped alongside the series in
// data/lunar-series/elp-mpp02/driver/ElpMpp02.{cpp,h} (ytliu0/ElpMpp02,
// GPL-3.0), which in turn implements the authors' ftp distribution.
//
// WHY THIS EXISTS: ELP/MPP02 is the lineage modern DE-class ephemerides were
// fitted to, while ELP-2000/82B is the lineage Meeus Ch. 47 was abridged from.
// Differencing the two isolates the "ephemeris-generation gap" — the −6.27″
// half of the shipped MOON_CORRECTION_RESIDUAL decomposition (docs/66 §1).
//
// The series files alone are NOT sufficient to evaluate MPP02: the theory's
// re-fitted fundamental arguments and its two Δ-parameter sets live in the
// driver. Both are applied here.
//
//   corr = 0 → parameters fitted to Lunar Laser Ranging
//   corr = 1 → parameters fitted to JPL DE405/DE406
//
// Units: longitude/latitude series in radians, distance in km.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');

const PI = Math.PI;
const DEG = PI / 180;
const SEC = PI / 648000;                 // arcsec → rad
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'lunar-series', 'elp-mpp02');

const mod2pi = (x) => x - 2 * PI * Math.floor((x + PI) / (2 * PI));

// ── Δ-parameter sets (driver setup_parameters) ─────────────────────────────
const PARAM_SETS = {
  // corr = 0 — fitted to LLR
  0: { Dw1_0: -0.10525, Dw2_0: 0.16826, Dw3_0: -0.10760, Deart_0: -0.04012,
       Dperi: -0.04854, Dw1_1: -0.32311, Dgam: 0.00069, De: 0.00005,
       Deart_1: 0.01442, Dep: 0.00226, Dw2_1: 0.08017, Dw3_1: -0.04317,
       Dw1_2: -0.03794, Dw1_3: 0, Dw1_4: 0, Dw2_2: 0, Dw2_3: 0, Dw3_2: 0, Dw3_3: 0 },
  // corr = 1 — fitted to JPL DE405/DE406
  1: { Dw1_0: -0.07008, Dw2_0: 0.20794, Dw3_0: -0.07215, Deart_0: -0.00033,
       Dperi: -0.00749, Dw1_1: -0.35106, Dgam: 0.00085, De: -0.00006,
       Deart_1: 0.00732, Dep: 0.00224, Dw2_1: 0.08017, Dw3_1: -0.04317,
       Dw1_2: -0.03743, Dw1_3: -0.00018865, Dw1_4: -0.00001024,
       Dw2_2: 0.00470602, Dw2_3: -0.00025213, Dw3_2: -0.00261070, Dw3_3: -0.00010712 },
};

/** Derive Cw2_1/Cw3_1 and the B1..B5 amplitude factors from a Δ-set. */
function setupParameters(corr) {
  const p = Object.assign({}, PARAM_SETS[corr]);
  const am = 0.074801329, alpha = 0.002571881;
  const dtsm = 2 * alpha / (3 * am);
  const xa = 2 * alpha / 3;
  const bp = [[0.311079095, -0.103837907], [-0.004482398, 0.000668287],
              [-0.001102485, -0.001298072], [0.001056062, -0.000178028],
              [0.000050928, -0.000037342]];
  const w11 = (1732559343.73604 + p.Dw1_1) * SEC;
  const w21 = (14643420.3171 + p.Dw2_1) * SEC;
  const w31 = (-6967919.5383 + p.Dw3_1) * SEC;
  const x2 = w21 / w11, x3 = w31 / w11;
  const y2 = am * bp[0][0] + xa * bp[4][0];
  const y3 = am * bp[0][1] + xa * bp[4][1];
  const d21 = x2 - y2, d22 = w11 * bp[1][0], d23 = w11 * bp[2][0], d24 = w11 * bp[3][0], d25 = y2 / am;
  const d31 = x3 - y3, d32 = w11 * bp[1][1], d33 = w11 * bp[2][1], d34 = w11 * bp[3][1], d35 = y3 / am;
  p.Cw2_1 = d21 * p.Dw1_1 + d25 * p.Deart_1 + d22 * p.Dgam + d23 * p.De + d24 * p.Dep;
  p.Cw3_1 = d31 * p.Dw1_1 + d35 * p.Deart_1 + d32 * p.Dgam + d33 * p.De + d34 * p.Dep;

  const delnu_nu = (0.55604 + p.Dw1_1) * SEC / w11;
  const dele     = (0.01789 + p.De) * SEC;
  const delg     = (-0.08066 + p.Dgam) * SEC;
  const delnp_nu = (-0.06424 + p.Deart_1) * SEC / w11;
  const delep    = (-0.12879 + p.Dep) * SEC;
  const facs = {
    fB1: -am * delnu_nu + delnp_nu,
    fB2: delg,
    fB3: dele,
    fB4: delep,
    fB5: -xa * delnu_nu + dtsm * delnp_nu,
    fA:  1 - (2 / 3) * delnu_nu,
  };
  return { paras: p, facs };
}

// ── Series loading ──────────────────────────────────────────────────────────
const nums = (line) => line.trim().split(/\s+/);

/** Main-problem file: 4 Delaunay multipliers + A + B1..B6.
 *  The shipped amplitude is A corrected by the Δ-set via the B partials. */
function readMain(file, facs) {
  const lines = fs.readFileSync(path.join(DATA_DIR, file), 'utf8').split('\n');
  const n = parseInt(lines[0].trim(), 10);
  const mult = [], amp = [];
  for (let i = 1; i <= n; i++) {
    const p = nums(lines[i]);
    if (p.length < 11) throw new Error(`${file}: short row at ${i}`);
    mult.push([+p[0], +p[1], +p[2], +p[3]]);
    const A = +p[4], B1 = +p[5], B2 = +p[6], B3 = +p[7], B4 = +p[8], B5 = +p[9];
    amp.push(facs.fA * A + facs.fB1 * B1 + facs.fB2 * B2 + facs.fB3 * B3 +
             facs.fB4 * B4 + facs.fB5 * B5);
  }
  return { n, mult, amp };
}

/** Perturbation file: 13 multipliers + amplitude + phase. */
function readPert(file) {
  const lines = fs.readFileSync(path.join(DATA_DIR, file), 'utf8').split('\n');
  const n = parseInt(lines[0].trim(), 10);
  const mult = [], amp = [], ph = [];
  for (let i = 1; i <= n; i++) {
    const p = nums(lines[i]);
    if (p.length < 15) throw new Error(`${file}: short row at ${i}`);
    mult.push(p.slice(0, 13).map(Number));
    amp.push(+p[13]);
    ph.push(+p[14]);
  }
  return { n, mult, amp, ph };
}

/** Load the whole theory for one parameter set. */
function loadMpp02(corr = 1) {
  const { paras, facs } = setupParameters(corr);
  const c = {
    corr,
    paras,
    main: {
      long: readMain('elp_main.long', facs),
      lat:  readMain('elp_main.lat', facs),
      dist: readMain('elp_main.dist', facs),
    },
    pert: {},
  };
  for (const q of ['long', 'lat', 'dist']) {
    const maxT = (q === 'lat') ? 2 : 3;
    c.pert[q] = [];
    for (let k = 0; k <= maxT; k++) c.pert[q].push(readPert(`elp_pert.${q}T${k}`));
  }
  c.termCount = c.main.long.n + c.main.lat.n + c.main.dist.n +
    ['long', 'lat', 'dist'].reduce((s, q) => s + c.pert[q].reduce((a, b) => a + b.n, 0), 0);
  return c;
}

// ── Arguments ───────────────────────────────────────────────────────────────
/** MPP02's own re-fitted arguments. NOTE these differ from ELP-2000/82B —
 *  e.g. W2 rate 14643420.3171"/cy here vs 14643420.2632 there. Evaluating
 *  MPP02 amplitudes on ELP82B arguments mixes the theories and is invalid. */
function computeArgs(T, p) {
  const T2 = T * T, T3 = T * T2, T4 = T2 * T2;
  const W1 = (-142 + 18 / 60 + (59.95571 + p.Dw1_0) / 3600) * DEG
    + mod2pi((1732559343.73604 + p.Dw1_1) * T * SEC)
    + mod2pi((-6.8084 + p.Dw1_2) * T2 * SEC)
    + mod2pi((0.006604 + p.Dw1_3) * T3 * SEC)
    + mod2pi((-3.169e-5 + p.Dw1_4) * T4 * SEC);
  const W2 = (83 + 21 / 60 + (11.67475 + p.Dw2_0) / 3600) * DEG
    + mod2pi((14643420.3171 + p.Dw2_1 + p.Cw2_1) * T * SEC)
    + mod2pi((-38.2631 + p.Dw2_2) * T2 * SEC)
    + mod2pi((-0.045047 + p.Dw2_3) * T3 * SEC)
    + mod2pi(0.00021301 * T4 * SEC);
  const W3 = (125 + 2 / 60 + (40.39816 + p.Dw3_0) / 3600) * DEG
    + mod2pi((-6967919.5383 + p.Dw3_1 + p.Cw3_1) * T * SEC)
    + mod2pi((6.359 + p.Dw3_2) * T2 * SEC)
    + mod2pi((0.007625 + p.Dw3_3) * T3 * SEC)
    + mod2pi(-3.586e-5 * T4 * SEC);
  const Ea = (100 + 27 / 60 + (59.13885 + p.Deart_0) / 3600) * DEG
    + mod2pi((129597742.293 + p.Deart_1) * T * SEC)
    + mod2pi(-0.0202 * T2 * SEC) + mod2pi(9e-6 * T3 * SEC) + mod2pi(1.5e-7 * T4 * SEC);
  const pomp = (102 + 56 / 60 + (14.45766 + p.Dperi) / 3600) * DEG
    + mod2pi(1161.24342 * T * SEC) + mod2pi(0.529265 * T2 * SEC)
    + mod2pi(-1.1814e-4 * T3 * SEC) + mod2pi(1.1379e-5 * T4 * SEC);

  const pl = (d, m, s, rate) => mod2pi((d + m / 60 + s / 3600) * DEG + mod2pi(rate * T * SEC));
  return {
    W1: mod2pi(W1),
    D:  mod2pi(W1 - Ea + PI),
    F:  mod2pi(W1 - W3),
    L:  mod2pi(W1 - W2),
    Lp: mod2pi(Ea - pomp),
    zeta: mod2pi(W1 + 0.02438029560881907 * T),
    Me: pl(-108, 15, 3.216919, 538101628.66888),
    Ve: pl(-179, 58, 44.758419, 210664136.45777),
    EM: pl(100, 27, 59.13885, 129597742.293),
    Ma: pl(-5, 26, 3.642778, 68905077.65936),
    Ju: pl(34, 21, 5.379392, 10925660.57335),
    Sa: pl(50, 4, 38.902495, 4399609.33632),
    Ur: pl(-46, 3, 4.354234, 1542482.57845),
    Ne: pl(-56, 20, 56.808371, 786547.897),
  };
}

// ── Summation ───────────────────────────────────────────────────────────────
function mainSum(s, a, cosine) {
  let sum = 0;
  for (let i = 0; i < s.n; i++) {
    const m = s.mult[i];
    const ph = m[0] * a.D + m[1] * a.F + m[2] * a.L + m[3] * a.Lp;
    sum += s.amp[i] * (cosine ? Math.cos(ph) : Math.sin(ph));
  }
  return sum;
}

function pertSum(s, a) {
  let sum = 0;
  for (let i = 0; i < s.n; i++) {
    const m = s.mult[i];
    const ph = s.ph[i] + m[0] * a.D + m[1] * a.F + m[2] * a.L + m[3] * a.Lp
      + m[4] * a.Me + m[5] * a.Ve + m[6] * a.EM + m[7] * a.Ma + m[8] * a.Ju
      + m[9] * a.Sa + m[10] * a.Ur + m[11] * a.Ne + m[12] * a.zeta;
    sum += s.amp[i] * Math.sin(ph);
  }
  return sum;
}

/**
 * Evaluate ELP/MPP02 at Julian centuries T from J2000 (TDB).
 * Returns the Moon's geocentric spherical coordinates in MPP02's native
 * frame: the INERTIAL mean ecliptic of date (the same convention ELP-2000/82B
 * uses), so a consumer comparing against equinox-of-date longitudes must add
 * the accumulated general precession p_A — exactly as the ELP82B lab does.
 *   { lon, lat }  radians
 *   { dist }      km
 */
function evalMpp02(T, c) {
  const a = computeArgs(T, c.paras);
  const T2 = T * T, T3 = T * T2;
  const ml = mainSum(c.main.long, a, false);
  const mb = mainSum(c.main.lat, a, false);
  const md = mainSum(c.main.dist, a, true);
  const P = c.pert;
  const lon = a.W1 + ml + pertSum(P.long[0], a)
    + mod2pi(pertSum(P.long[1], a) * T)
    + mod2pi(pertSum(P.long[2], a) * T2)
    + mod2pi(pertSum(P.long[3], a) * T3);
  const lat = mb + pertSum(P.lat[0], a)
    + mod2pi(pertSum(P.lat[1], a) * T)
    + mod2pi(pertSum(P.lat[2], a) * T2);
  const ra0 = 384747.961370173 / 384747.980674318;
  const dist = ra0 * (md + pertSum(P.dist[0], a) + pertSum(P.dist[1], a) * T
    + pertSum(P.dist[2], a) * T2 + pertSum(P.dist[3], a) * T3);
  return { lon: mod2pi(lon), lat, dist, args: a };
}

module.exports = { loadMpp02, evalMpp02, computeArgs, setupParameters, mod2pi, PARAM_SETS };
