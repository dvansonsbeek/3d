/**
 * Moon series extension — the DERIVED Delaunay tail beyond the shipped
 * Meeus-60 head (Stage D2 Phase A, plan §12i item 10).
 *
 * DERIVATION, not fit: the amplitudes come from the Stage-D1 3-body lab
 * (tools/explore/derive-meeus-amplitudes.js — RK4 on framework constants,
 * IC calibration to the free elements), joint-LSQ over [Meeus-60 head +
 * extended Delaunay catalog] on a 120-yr window. Head fidelity
 * 100.00–100.03% (the derivation reproduces the shipped head, so the
 * tail is the same physics one order deeper); dt-halving drift 0.000″.
 * Extraction: tools/explore/d2-extension-extraction.mjs.
 *
 * JPL enters only as OUT-OF-SAMPLE VALIDATION (960 all-phase epochs):
 * shipped-Moon residual λ 3.68″ → 3.12″ (predicted 3.08″) and
 * β 1.04″ → 0.65″ (predicted 0.66″) with the extension ADDED; the
 * sign-flipped control degrades both — the integrator predicted reality.
 * Ships JOINTLY with the derived Sun completion v2
 * (eclipse/sun-planetary-completion.cjs): the Moon-only form degrades
 * the NASA centerline reference set (its tail was cancelling Sun-side
 * leftover tones there), and the pre-registered acceptance was all four
 * gates, never a subset.
 *
 * Arguments are the instrument-grade Delaunay polynomials (IAU/Meeus
 * class, degrees/Julian-century TT) — phase carriers only, DECLARED
 * INPUTS by the FQ-5 N2 stop-gate (the documented negative of research
 * item 20.3e): the framework composition of Mp carries a measured
 * 16.9″/cy catalog-input residual (≡ 0.26 μd of sidereal month —
 * e3b-argument-attribution E0 + the N1 quantification), which is NOT
 * exact closure, and the evaluation target here is JPL reality where
 * the DE-fitted literals are truth-class. The Sun completion's
 * PLANETARY carriers, by contrast, went framework-native at N3 (its
 * derived signal is framework-frequency; see
 * eclipse/sun-planetary-completion.cjs v3).
 *
 * Sign convention: sine terms, ADDED to the full-series Moon longitude
 * and latitude (the validated sense; see besselian.cjs bodiesAt).
 *
 * THE A2 PLANETARY TAIL (the second derived section below): the Moon's
 * direct planetary perturbations, derived from epoch-phased twin 8-body
 * integrations (full = planets+J2 vs base = J2-only; planet phases from
 * the engine graph, the Moon at its true epoch Delaunay phases; fitted
 * on the run's own arguments with a main-problem absorber catalog,
 * absorbers discarded — instrument
 * tools/explore/d2-planetary-moon-epoch.mjs). Cross-validated: V−E
 * +0.849″ sin (independent JPL fit: +0.85), E−J −0.681″ (JPL: −0.69);
 * content 0.896″. JPL out-of-sample (960 all-phase epochs): λ scatter
 * 3.12″ → 3.03″ (the extraction predicted 2.98); the sign-flipped
 * control degrades to 3.47″; the syzygy fleet improves 3.99″ → 3.82″
 * in EVERY era. The β rows (0.074″ content) measurably do NOT help and
 * are not shipped. RECORDED TENSION (owner-accepted at shipping): the
 * 13-event NASA centerline scoreboard moves 2.22″ → 2.68″ mean — the
 * A1-class correlated-subsample effect (the tracked events sit −1.6″
 * below the +1.4″ fleet mean and sample the near-annual arguments at
 * correlated phases; the era-split refutes anchor double-counting and
 * the modern era improves most, 3.57 → 3.34). The ≤8″ api gate holds
 * (max 6.2″). Coefficients are stored with the run→real argument
 * mapping already applied (the extraction's heliocentric-planet vs
 * geocentric-sun π-offset is folded into the signs).
 *
 * THE J2 NODE FAMILY (FQ-7 Round 3, plan §12i) — five derived terms on
 * Ω-family arguments (NOT expressible on the integer Delaunay lattice,
 * which is why every earlier extraction missed them; the 200-yr band
 * probe named them, the dense 2-day JPL sample confirmed them real, and
 * the channel isolation identified them as EARTH'S J2 acting on the
 * lunar orbit — the same channel whose secular piece DLT-1 derives as
 * the Earth-figure +0.1925″/cy² T² term). Extracted from the B−A
 * differential of epoch-phased 3-body twin integrations (J2 on vs off,
 * identical ICs; per-run fits on each run's OWN mean angles — fitting
 * the raw differential leaks A·δrate·t quadrature, measured as 2.4″
 * fake rows), dt-halving converged ≤0.003″. TWO DOCUMENTED CONTROLS
 * certify the channel and calibrate the run→instrument frame mapping:
 * the derived pure-Ω λ term reproduces the Meeus flattening additive
 * (+1962e-6 sin(Lp−F)) at 1.028, and the derived β sin(Lp) reproduces
 * the −2235e-6 additive at 0.971 — both already shipped via the
 * catalog additive family and therefore NOT re-shipped here. JPL
 * out-of-sample (validation only, never fit): official all-phase λ
 * 2.964 → 2.922″, β 0.653 → 0.606″; dense 2-day λ 2.378 → 2.321″,
 * β 0.655 → 0.601″; syzygy-fleet elongation improves. Instruments:
 * fq7-band-probe.mjs · fq7-jpl-band.mjs · fq7-j2-node.mjs ·
 * fq7-r3-ship.mjs · fq7-r3-preview.mjs. The Ω carrier polynomial is an
 * IAU-class instrument literal — the same DECLARED-INPUT status as the
 * Delaunay carriers above (Ω ≡ Lp − F of the same catalog class).
 */

'use strict';

/** Delaunay argument polynomials [deg at J2000, deg/cy, deg/cy²] TT. */
const DELAUNAY = {
  D: [297.8501921, 445267.1114034, -0.0018819],  // mean elongation
  M: [357.5291092, 35999.0502909, -0.0001536],   // Sun mean anomaly
  Mp: [134.9633964, 477198.8675055, 0.0087414],  // Moon mean anomaly
  F: [93.2720950, 483202.0175233, -0.0036539],   // argument of latitude
};

/** Longitude tail: [kD, kM, kMp, kF, sin″] — 47 derived terms ≥ 0.1″
 *  (RMS content 2.02″), plus the 20.3h ROUND-2 block at the end: five
 *  dt-halving-converged terms beyond the D2 catalog's order-7 bound
 *  (m20h-extraction-r2.mjs, the same D1 3-body lab). The lead term
 *  [6,0,−2,0] extracted at 0.572″ vs the MPP02-comparison target 0.57″
 *  (m20h-alias-breaker.mjs) — the integrator predicted the independent
 *  reference again. 4-gate out-of-sample (m20h-gate-preview.mjs):
 *  all-phase λ 3.03 → 2.96″, β unchanged, fleet improves, centerlines
 *  2.71 → 2.69″ with the 2001 max 7.3 → 6.7″. */
const LON_TERMS = [
  [2, 0, 1, 2, -0.9900],
  [2, 0, -4, 0, 0.9465],
  [2, -2, 1, 0, 0.7524],
  [0, 1, -3, 0, -0.6704],
  [4, 1, -1, 0, -0.6323],
  [1, 0, 2, 0, -0.5864],
  [1, 0, 0, -2, -0.5813],
  [2, 0, -2, -2, -0.5631],
  [1, -1, 0, 0, -0.5617],
  [0, 1, 3, 0, -0.5455],
  [2, 0, -2, 2, -0.5253],
  [2, -1, -3, 0, 0.4674],
  [2, 0, 2, -2, -0.4625],
  [2, -1, -1, 2, -0.4271],
  [0, 1, 0, 2, 0.4173],
  [6, 0, -1, 0, 0.3954],
  [2, -1, 1, -2, -0.3876],
  [2, -1, 0, 2, -0.3816],
  [2, 2, -1, -2, -0.3654],
  [2, 2, 1, -2, -0.3615],
  [4, 1, -2, 0, -0.3575],
  [0, 0, 3, 2, -0.3281],
  [4, -2, -1, 0, 0.3106],
  [0, 1, -1, -2, 0.3016],
  [2, -2, -2, 0, 0.2964],
  [4, 0, -1, -2, 0.2963],
  [2, 1, 2, 0, -0.2897],
  [4, 1, 0, 0, -0.2887],
  [4, -1, 1, 0, 0.2833],
  [0, 1, 1, 2, 0.2643],
  [2, 2, -2, 0, -0.2635],
  [1, 1, -2, 0, 0.2569],
  [1, 0, 0, 2, 0.2524],
  [4, 0, 2, 0, 0.2190],
  [4, 0, -1, 2, -0.2007],
  [0, 2, -2, 0, -0.1813],
  [0, 0, 3, -2, -0.1784],
  [2, 2, 0, 0, -0.1684],
  [2, 0, -1, -2, 0.1634],
  [4, -2, 0, 0, 0.1549],
  [2, 2, -3, 0, 0.1545],
  [1, -1, -1, 0, -0.1479],
  [2, 1, -3, 0, 0.1290],
  [6, 0, 0, 0, 0.1268],
  [1, 0, -3, 0, -0.1252],
  [2, 0, 2, 2, -0.1236],
  [1, -1, 1, 0, -0.1225],
  // 20.3h ROUND 2 — beyond the order-7 catalog bound (see header note):
  [6, 0, -2, 0, 0.572],
  [6, 0, -3, 0, 0.294],
  [4, 0, -2, 2, -0.169],
  [4, -2, -2, 0, 0.161],
  [0, 0, 5, 0, 0.112],
];

/** Latitude tail: [kD, kM, kMp, kF, sin″] — 30 derived terms ≥ 0.1″
 *  (RMS content 0.80″). */
const LAT_TERMS = [
  [4, -1, -1, 1, 0.3390],
  [2, 0, -1, -3, 0.3282],
  [2, -2, -1, 1, 0.3148],
  [0, 1, 2, -1, -0.3050],
  [0, 1, -2, 1, -0.2988],
  [2, 0, 1, -3, -0.2919],
  [2, -2, -1, -1, 0.2685],
  [0, 0, 4, 1, 0.2636],
  [2, 0, -3, 1, 0.2526],
  [2, 0, -1, 3, -0.2447],
  [2, 1, 1, 1, -0.2369],
  [4, 0, 1, 1, 0.2128],
  [2, 2, 0, -1, -0.1749],
  [4, 1, -1, -1, -0.1737],
  [4, -1, 0, 1, 0.1581],
  [2, 0, 3, -1, 0.1465],
  [0, 0, 2, -3, -0.1461],
  [2, 0, 0, 3, -0.1444],
  [1, 0, -1, 1, 0.1387],
  [2, 0, 3, 1, 0.1381],
  [2, 0, -4, -1, 0.1335],
  [2, -1, 2, -1, 0.1283],
  [2, -1, 2, 1, 0.1241],
  [0, 2, -1, -1, -0.1208],
  [0, 0, 2, 3, -0.1178],
  [4, 1, 0, -1, -0.1128],
  [2, 2, -1, -1, -0.1127],
  [1, 0, -2, -1, -0.1093],
  [2, 2, -1, 1, -0.1044],
  [1, 1, 1, 1, 0.1014],
];

/** Planetary mean-longitude polynomials, degrees per Julian century TT
 *  (IAU-class instrument literals — same carriers as the Sun completion).
 *  Order: Venus, Earth (EMB), Mars, Jupiter, Saturn. */
const PLANET_L0 = [181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const PLANET_L1 = [58517.815676, 36000.769780, 19141.696300, 3036.302389, 1223.511013];

/**
 * The A2 planetary longitude tail:
 * [[kV, kE, kMa, kJ, kSa, kD, kMp], cos″, sin″] — 15 derived terms
 * (content 0.896″), run→real argument mapping folded into the signs.
 * @type {Array<[number[], number, number]>}
 */
const PLANETARY_LON_TERMS = [
  [[1, -1, 0, 0, 0, 0, 0], -0.0056, -0.8488],
  [[2, -2, 0, 0, 0, 0, 0], -0.0034, 0.3166],
  [[3, -3, 0, 0, 0, 0, 0], -0.0051, -0.0387],
  [[0, 1, 0, -1, 0, 0, 0], 0.0325, 0.6814],
  [[0, 2, 0, -2, 0, 0, 0], -0.0084, -0.1835],
  [[0, 2, -2, 0, 0, 0, 0], 0.0002, 0.2205],
  [[0, 1, 0, 0, -1, 0, 0], 0.0078, 0.0463],
  [[1, -1, 0, 0, 0, 2, 0], -0.0020, -0.0308],
  [[1, -1, 0, 0, 0, -2, 0], 0.0045, -0.1193],
  [[0, 1, 0, -1, 0, 2, 0], 0.0014, 0.0322],
  [[0, 1, 0, -1, 0, -2, 0], 0.0161, 0.2141],
  [[1, -1, 0, 0, 0, 0, 1], 0.0023, -0.1929],
  [[1, -1, 0, 0, 0, 0, -1], -0.0029, -0.2306],
  [[0, 1, 0, -1, 0, 0, 1], 0.0059, 0.1729],
  [[0, 1, 0, -1, 0, 0, -1], -0.0077, 0.2235],
];

/** Lunar mean-node polynomial [deg at J2000, deg/cy, deg/cy²] TT —
 *  the Ω carrier for the J2 node family (declared input, see header). */
const OMEGA = [125.0445479, -1934.1362891, 0.0020754];

/**
 * The J2 node family (see header): [[kD,kM,kMp,kF,kΩ], sin″] — pure
 * sin-parity (the derivation's cos components read ≤0.005″), ADD-composed
 * like the Delaunay tail.
 * @type {Array<[number[], number]>}
 */
const NODE_LON_TERMS = [
  [[0, 0, 1, 0, -1], -0.544],
  [[0, 0, 1, 0, 1], 0.546],
  [[0, 0, 0, 2, 1], 0.371],
  [[2, 0, 0, 0, 1], 0.103],
];
/** @type {Array<[number[], number]>} */
const NODE_LAT_TERMS = [
  [[0, 0, 0, 1, -1], -0.375],
];

const D2R = Math.PI / 180;

/**
 * Derived series-extension correction to the full-series Moon:
 * the Delaunay tail plus the A2 planetary tail (longitude only).
 * @param {number} T - Julian centuries TT from J2000
 * @returns {{dLonDeg: number, dLatDeg: number}} degrees — ADD to the
 *   full-series Moon longitude/latitude
 */
function moonSeriesExtensionDeg(T) {
  const poly = /** @param {number[]} p */ (p) => (p[0] + (p[1] + p[2] * T) * T) * D2R;
  const D = poly(DELAUNAY.D), M = poly(DELAUNAY.M), Mp = poly(DELAUNAY.Mp), F = poly(DELAUNAY.F);
  let lon = 0, lat = 0;
  for (const [kD, kM, kMp, kF, s] of LON_TERMS) lon += s * Math.sin(kD * D + kM * M + kMp * Mp + kF * F);
  for (const [kD, kM, kMp, kF, s] of LAT_TERMS) lat += s * Math.sin(kD * D + kM * M + kMp * Mp + kF * F);
  const l = new Float64Array(5);
  for (let i = 0; i < 5; i++) l[i] = (PLANET_L0[i] + PLANET_L1[i] * T) * D2R;
  for (const [k, cA, sA] of PLANETARY_LON_TERMS) {
    const th = k[0] * l[0] + k[1] * l[1] + k[2] * l[2] + k[3] * l[3] + k[4] * l[4] + k[5] * D + k[6] * Mp;
    lon += cA * Math.cos(th) + sA * Math.sin(th);
  }
  const Om = poly(OMEGA);
  for (const [k, s] of NODE_LON_TERMS) lon += s * Math.sin(k[0] * D + k[1] * M + k[2] * Mp + k[3] * F + k[4] * Om);
  for (const [k, s] of NODE_LAT_TERMS) lat += s * Math.sin(k[0] * D + k[1] * M + k[2] * Mp + k[3] * F + k[4] * Om);
  return { dLonDeg: lon / 3600, dLatDeg: lat / 3600 };
}

module.exports = { moonSeriesExtensionDeg };
