/**
 * Meeus Ch. 47 lunar periodic series — THE shared implementation (8.2-6).
 *
 * Replaces THREE copies: the browser scene block (moveModel), the tools
 * scene block (both the full production evaluation), and hosts the
 * TRUNCATED eclipse-finder variant beside it. The dual form is DELIBERATE
 * (doc 66 §Layer 1b): the truncated `_eclMoon*` helpers are the form the
 * certified eclipse statistics were produced with (the NASA canon recall,
 * tight-window and type figures live in data/lunar-canon-recall.json; the
 * mismatches are knife-edge at the γ ≈ 1.0/1.5 boundaries) — upgrading
 * them to the full series is a RE-CERTIFICATION item, not a refactor.
 *
 * Full scene form: 60 longitude + 60 latitude terms with E/E² scaling on
 * M-bearing terms, A1 (Venus, Meeus-observed rate — the 18V−16E−M′
 * near-resonance makes it hypersensitive; no chain identity), A2/A3
 * (D2-derived rates, CHAIN-INTEGRATED under deep time through
 * their identified content), all six latitude corrections, the EoC-half
 * subtraction (the off-centre orbit geometry already provides half the
 * equation of centre), and the two-term ellipse distance.
 *
 * The correction literals (3958/1962/318; −2235/382/175/175/127/−115;
 * phases 119.75/53.09/313.45; Meeus A/B rates 479264.290/481266.484) are
 * Meeus Ch. 47 STRUCTURE and live here, like the argument polynomials
 * (8.2-5 S2 precedent). The 60-term tables are INJECTED — they are fitted
 * coefficients (the engines' two sources are byte-identical).
 *
 * THE LUNAR PLANE OF DATE (plan 31 A2; doc 111 §1.43; moon/plane-of-date.cjs,
 * earth/laplace-plane.cjs): the series is evaluated in the Moon's MEAN orbit
 * plane (the Laplace plane) and composed into the ecliptic of date. Every
 * |kF| = 1 amplitude rides sin i_L(t)/sin i₀, |kF| = 3 its cube, |kF| = 2 (the
 * longitude's and the distance's reduction to the ecliptic) tan²(i_L/2)/tan²(i₀/2)
 * — §1.15: a term's amplitude is a function of the elements. The three
 * flattening terms (−2235 sin L′, +127 sin(L′ − M′), −115 sin(L′ + M′)) are the
 * J2000 tilt's first order; they are replaced by the exact rotation of the
 * plane by 2235 µ° × θ(t)/θ(0) about the equinox line (8.05″ today, 11.8° at the
 * cited history's end). The era moves by the sidebands Meeus truncated, 0.107″
 * rms in latitude (confirmed against Horizons), 3e-4″ in longitude. Absent the
 * injected scales (no deep chain, or beyond the histories) the form is the era's.
 * The truncated finder forms are RE-CERTIFIED on the same composition — the
 * former "table only" latitude omitted the 8″ tilt family the canon's Moon has.
 */

'use strict';

// The DERIVED series-extension tail (the D2 planetary and
// node terms, moon/series-extension.cjs) is part of the ONE scene Moon —
// formerly added by the besselian tier alone, so the rendered Moon and the
// eclipse-location Moon were two different Moons. The truncated finder forms
// below stay bare by certified design.
const { moonSeriesExtensionDeg } = require('./series-extension.cjs');
const { composeEclipticOfDate } = require('./plane-of-date.cjs');

/** Meeus's flattening-term anchor: the J2000 tilt of the Moon's mean plane from the ecliptic, −2235 µ° sin L′. */
const FLATTENING_TILT_ANCHOR_DEG = 2235e-6;
/** @typedef {{s1: number, s2: number, s3: number}} FScales — the |kF| = 1, 2, 3 multipliers */
/** @type {FScales} */
const F_SCALES_ERA = Object.freeze({ s1: 1, s2: 1, s3: 1 });

/**
 * @typedef {Array<[number, number, number, number, number]>} MeeusTermTable
 */

/**
 * @param {{
 *   constants: {
 *     moonL: MeeusTermTable,
 *     moonB: MeeusTermTable,
 *     moonR: MeeusTermTable,
 *     moonRMeanKm: number,
 *     moonDistanceJ2000Km: number,
 *     j2000JD: number,
 *     julianCenturyDays: number,
 *     fwA2RateDegPerCy: number,
 *     fwA3RateDegPerCy: number,
 *   },
 *   fns: {
 *     argsAt: (jdTT: number) => {Lp: number, D: number, M: number, Mp: number, F: number},
 *     eFactorForD: (dDaysTT: number, T: number, T2: number) => number,
 *     eFactorAtJdTT: (jdTT: number, T: number, T2: number) => number,
 *     getMoonDistanceKm: (jdTT?: number) => number,
 *     getEccentricityBase: () => number,
 *     deltaTSeconds: (jdUT: number) => number,
 *     jdToSIyear: (jd: number) => number,
 *     tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     siderealOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     jupiterOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     isDeepTime: () => boolean,
 *     isFrameworkNative: () => boolean,
 *     lunarPlaneScalesAt?: (dDaysTT: number) => ({tiltShape: number, sinScale: number, tanHalfSqScale: number} | null),
 *   },
 * }} deps — argsAt is the engine's dispatcher (probe hook and mode toggle
 *   ride along); eFactorForD preserves each engine's exact E-factor call
 *   shape (S11: the two convert d→years with differently-associated
 *   expressions); distance/eccentricity are GETTERS because the browser's
 *   moonDistance is deep-time-mutable.
 */
function createMoonSeries({ constants, fns }) {
  const {
    moonL, moonB, moonR, moonRMeanKm, moonDistanceJ2000Km, j2000JD, julianCenturyDays,
    fwA2RateDegPerCy, fwA3RateDegPerCy,
  } = constants;
  const {
    argsAt, eFactorForD, eFactorAtJdTT, getMoonDistanceKm, getEccentricityBase, deltaTSeconds,
    jdToSIyear, tropicalOrbitsBetween, apsidalOfDateCyclesBetween,
    siderealOrbitsBetween, jupiterOrbitsBetween, isDeepTime, isFrameworkNative,
    lunarPlaneScalesAt,
  } = fns;

  const D2R = Math.PI / 180;

  /** The lunar plane of date at d days TT from J2000: the tilt shape and the F-class scales
   *  (plan 31 A2). The era form where no scales are injected or the histories refuse.
   *  @param {number} dDaysTT @returns {{tiltShape: number, fs: FScales}} */
  function planeOfDateAt(dDaysTT) {
    const p = lunarPlaneScalesAt ? lunarPlaneScalesAt(dDaysTT) : null;
    if (p === null) return { tiltShape: 1, fs: F_SCALES_ERA };
    return { tiltShape: p.tiltShape, fs: { s1: p.sinScale, s2: p.tanHalfSqScale, s3: p.sinScale * p.sinScale * p.sinScale } };
  }
  /** @param {number} kF @param {FScales} fs @returns {number} */
  const fScaleOf = (kF, fs) => (kF === 0 ? 1 : (kF === 1 || kF === -1) ? fs.s1 : (kF === 2 || kF === -2) ? fs.s2 : fs.s3);

  /** A1/A2/A3 in radians at T centuries TT (deep time: A2/A3 chain-integrated).
   *  @param {number} T @param {number} dDaysTT
   *  @returns {{A1: number, A2: number, A3: number}} */
  function additionalArgs(T, dDaysTT) {
    const A1 = (119.75 + 131.849 * T) * D2R;
    let a2Deg = 53.09 + (isFrameworkNative() ? fwA2RateDegPerCy : 479264.290) * T;
    let a3Deg = 313.45 + (isFrameworkNative() ? fwA3RateDegPerCy : 481266.484) * T;
    if (isDeepTime() && isFrameworkNative()) {
      const yA0 = jdToSIyear(j2000JD);
      const yA = jdToSIyear(j2000JD + dDaysTT);
      const nT = tropicalOrbitsBetween(yA0, yA);
      const nAps = apsidalOfDateCyclesBetween(yA0, yA);
      // A3 is the STAR-referenced lunar longitude (Meeus' rate 481,266.484 °/cy
      // ≡ 360°/sidereal month): the chain's sidereal-orbit count directly.
      const nSid = siderealOrbitsBetween(yA0, yA);
      const nJ = jupiterOrbitsBetween(yA0, yA);
      if (nT !== null && nAps !== null && nSid !== null && nJ !== null) {
        a3Deg = 313.45 + 360 * nSid;
        a2Deg = 53.09 + 360 * (nT + nAps - 2 * nJ);
      }
    }
    return { A1, A2: a2Deg * D2R, A3: a3Deg * D2R };
  }

  /** One 60-term table pass with E/E² on M-bearing terms and the F-class scales
   *  of the plane of date (micro-degrees).
   *  @param {MeeusTermTable} table @param {number} Dr @param {number} Mr
   *  @param {number} Mpr @param {number} Fr @param {number} E
   *  @param {number} E2 @param {FScales} fs @returns {number} */
  function sumTable(table, Dr, Mr, Mpr, Fr, E, E2, fs) {
    let s = 0;
    for (let i = 0; i < table.length; i++) {
      const r = table[i];
      const arg = r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr;
      let term = r[4] * Math.sin(arg);
      const absM = r[1] < 0 ? -r[1] : r[1];
      if (absM === 1) term *= E;
      else if (absM === 2) term *= E2;
      if (r[3] !== 0) term *= fScaleOf(r[3], fs);
      s += term;
    }
    return s;
  }

  /** Σr table pass — COSINE of the argument (Meeus 47.A distance column),
   *  same E/E² and F-class conventions. Units 0.001 km.
   *  @param {MeeusTermTable} table @param {number} Dr @param {number} Mr
   *  @param {number} Mpr @param {number} Fr @param {number} E
   *  @param {number} E2 @param {FScales} fs @returns {number} */
  function sumTableCos(table, Dr, Mr, Mpr, Fr, E, E2, fs) {
    let s = 0;
    for (let i = 0; i < table.length; i++) {
      const r = table[i];
      if (r[4] === 0) continue;
      const arg = r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr;
      let term = r[4] * Math.cos(arg);
      const absM = r[1] < 0 ? -r[1] : r[1];
      if (absM === 1) term *= E;
      else if (absM === 2) term *= E2;
      if (r[3] !== 0) term *= fScaleOf(r[3], fs);
      s += term;
    }
    return s;
  }

  /** Full Meeus Ch. 47 distance: r = meanKm + Σr·10⁻³ km, scaled by the
   *  framework's Driver-1 distance ratio (≡ 1 at J2000; the epoch-mutable
   *  getter over the J2000 constant, preserving the deep-time scaling the
   *  previous two-term ellipse form carried). ~2 km vs JPL at syzygy where
   *  the two-term form was ~5,700 km too far (the 2D-family terms all peak
   *  at eclipses).
   *  @param {number} Dr @param {number} Mr @param {number} Mpr
   *  @param {number} Fr @param {number} E @param {number} E2
   *  @returns {number} km */
  // 20.3d(i): the Driver-1 ratio is evaluated AT THE EVALUATED EPOCH — the
  // getter receives the evaluation jdTT so each engine can answer with its
  // pure a_M(t) evaluator (per-jd deterministic; previously the browser
  // answered with whatever epoch the render loop last set — a scene-state
  // timing accident — while the Node engines pinned the J2000 constant).
  // Engines whose getter ignores the argument keep their old behavior.
  /** @param {number} Dr @param {number} Mr @param {number} Mpr @param {number} Fr
   *  @param {number} E @param {number} E2 @param {FScales} fs @param {number} [jdTT] @returns {number} */
  function fullDistanceKm(Dr, Mr, Mpr, Fr, E, E2, fs, jdTT) {
    const Sr = sumTableCos(moonR, Dr, Mr, Mpr, Fr, E, E2, fs);
    return (moonRMeanKm + Sr * 1e-3) * (getMoonDistanceKm(jdTT) / moonDistanceJ2000Km);
  }

  /** The PRODUCTION scene evaluation at d days TT from J2000 (the caller
   *  owns the UT→TT conversion — engine timing conventions differ).
   *  Returns everything the scene blocks write:
   *  thetaAddRad — the hierarchy θ increment (EoC-half-subtracted Σl);
   *  lonDeg — full ecliptic longitude (GEOMETRIC, mean equinox of date)
   *  incl. the derived series-extension tail. (No fitted mean-longitude
   *  anchor — doc 109 §23: measured against Horizons' apparent
   *  Moon over 1970–2049 the series needs no anchor, −1.0″ ± 1.5″ flat in
   *  elongation; the former +32.75″ was the eclipse tier's mean Sun
   *  compensated — its aberration κ, the I2 long inequality and the trend-ΔT
   *  offset — not a property of the Moon);
   *  latRad/latDeg — the Laplace-frame Σb (the five non-tilt corrections, the
   *  extension, the F-class scales) composed into the ecliptic of date by the
   *  tilt rotation (BOTH from the rotation's one asin: the browser stores
   *  radians, the Node engine degrees, and (x·D2R)/D2R is not bit-exactly x);
   *  distKm — the Meeus distance of date; T.
   *  @param {number} dDaysTT
   *  @returns {{thetaAddRad: number, lonDeg: number, latRad: number, latDeg: number, distKm: number, T: number}} */
  function sceneEvalAt(dDaysTT) {
    const d = dDaysTT;
    const T = d / julianCenturyDays;
    const T2 = T * T;
    const args = argsAt(j2000JD + d);
    const Lp = args.Lp * D2R;
    const Dr = args.D * D2R, Mr = args.M * D2R, Mpr = args.Mp * D2R, Fr = args.F * D2R;
    const E = eFactorForD(d, T, T2);
    const E2 = E * E;
    const { A1, A2, A3 } = additionalArgs(T, d);
    const { tiltShape, fs } = planeOfDateAt(d);
    const ext = moonSeriesExtensionDeg(T, fs);   // derived tail, degrees → the tables' 1e-6° units

    let Sl = sumTable(moonL, Dr, Mr, Mpr, Fr, E, E2, fs);
    Sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp - Fr) + 318 * Math.sin(A2);
    Sl += ext.dLonDeg * 1e6;
    // Subtract the EoC portion the off-centre orbit geometry already provides.
    const eocHalf = getEccentricityBase() / 2;
    Sl -= (2 * eocHalf / D2R * 1e6) * Math.sin(Mpr);
    Sl -= (1.25 * eocHalf * eocHalf / D2R * 1e6) * Math.sin(2 * Mpr);

    // The Laplace-frame latitude: the table and the extension on the F-class scales, the planetary
    // corrections (A3's lag of the mean plane behind the moving ecliptic — a constant row, named;
    // the A1 ± F pair ∝ sin i); the tilt family enters through the composition below.
    let Sb = sumTable(moonB, Dr, Mr, Mpr, Fr, E, E2, fs);
    Sb += 382 * Math.sin(A3);
    Sb += fs.s1 * (175 * Math.sin(A1 - Fr) + 175 * Math.sin(A1 + Fr));
    Sb += ext.dLatDeg * 1e6;

    // Full longitude re-adds the EoC half that θ absorbed.
    const fullSl = Sl + (2 * eocHalf / D2R * 1e6) * Math.sin(Mpr)
                     + (1.25 * eocHalf * eocHalf / D2R * 1e6) * Math.sin(2 * Mpr);
    const lonFrameDeg = Lp / D2R + fullSl * 1e-6;
    const c = composeEclipticOfDate(lonFrameDeg, Sb * 1e-6, FLATTENING_TILT_ANCHOR_DEG, tiltShape);
    // The hierarchy θ increment carries the composition's longitude step beside the EoC-half-subtracted Σl.
    const thetaAddRad = (Sl * 1e-6 + (c.lonDeg - lonFrameDeg)) * D2R;
    const distKm = fullDistanceKm(Dr, Mr, Mpr, Fr, E, E2, fs, j2000JD + d);
    return { thetaAddRad, lonDeg: c.lonDeg, latRad: c.latRad, latDeg: c.latDeg, distKm, T };
  }

  /** THE TRUNCATED eclipse-finder pair (doc 66 §Layer 1b, RE-CERTIFIED in plan 31 A2):
   *  the longitude keeps its certified shape — no EoC subtraction, no A3/latitude-family,
   *  no LpCorrection — and the latitude is the table alone in the Laplace frame; both are
   *  composed into the ecliptic of date by the tilt rotation, so the finder's Moon carries
   *  the 8″ tilt family the canon's Moon has (the former "table only" latitude omitted it
   *  by certified design; the statistics are re-recorded with the reason) and the deep
   *  plane (11.8° at the cited history's end — eclipses in two seasons there). The two
   *  coordinates are ONE evaluation (the rotation couples them); a last-JD memo serves the
   *  finders' paired reads, values pure in jdUT. Accepts JD_UT; converts to TT via the
   *  injected ΔT.
   *  @param {number} jdUT @returns {{lonDeg: number, betaDeg: number}} lonDeg 0–360 */
  let truncatedMemoJd = NaN;
  /** @type {{lonDeg: number, betaDeg: number}} */
  let truncatedMemo = { lonDeg: 0, betaDeg: 0 };
  /** @param {number} jdUT @returns {{lonDeg: number, betaDeg: number}} */
  function truncatedPairAt(jdUT) {
    if (jdUT === truncatedMemoJd) return truncatedMemo;
    const jdTT = jdUT + deltaTSeconds(jdUT) / 86400;
    const T = (jdTT - j2000JD) / julianCenturyDays;
    const T2 = T * T;
    const args = argsAt(jdTT);
    const LpMean = args.Lp;
    const Dr = args.D * D2R, Mr = args.M * D2R, Mpr = args.Mp * D2R, Fr = args.F * D2R;
    // Original-JD call shape — (j2000JD + (jdTT − j2000JD)) is NOT bit-exactly
    // jdTT, so the truncated path keeps its own E-factor entry.
    const E = eFactorAtJdTT(jdTT, T, T2);
    const E2 = E * E;
    const { tiltShape, fs } = planeOfDateAt(jdTT - j2000JD);
    let Sl = sumTable(moonL, Dr, Mr, Mpr, Fr, E, E2, fs);
    const A1 = (119.75 + 131.849 * T) * D2R;
    const A2 = (53.09 + (isFrameworkNative() ? fwA2RateDegPerCy : 479264.290) * T) * D2R;
    Sl += 3958 * Math.sin(A1) + 1962 * Math.sin(LpMean * D2R - Fr) + 318 * Math.sin(A2);
    const Sb = sumTable(moonB, Dr, Mr, Mpr, Fr, E, E2, fs);
    const c = composeEclipticOfDate(LpMean + Sl * 1e-6, Sb * 1e-6, FLATTENING_TILT_ANCHOR_DEG, tiltShape);
    truncatedMemo = { lonDeg: ((c.lonDeg % 360) + 360) % 360, betaDeg: c.latDeg };
    truncatedMemoJd = jdUT;
    return truncatedMemo;
  }

  /** TRUNCATED eclipse-finder longitude (the pair's). @param {number} jdUT @returns {number} degrees 0–360 */
  function truncatedLonDeg(jdUT) { return truncatedPairAt(jdUT).lonDeg; }

  /** TRUNCATED eclipse-finder latitude (the pair's). @param {number} jdUT @returns {number} degrees */
  function truncatedBetaDeg(jdUT) { return truncatedPairAt(jdUT).betaDeg; }

  /** Full Meeus Ch. 47 distance at JD_UT (shared with the scene form).
   *  @param {number} jdUT @returns {number} km */
  function truncatedDistanceKm(jdUT) {
    const jdTT = jdUT + deltaTSeconds(jdUT) / 86400;
    const T = (jdTT - j2000JD) / julianCenturyDays;
    const args = argsAt(jdTT);
    const Dr = args.D * D2R, Mr = args.M * D2R, Mpr = args.Mp * D2R, Fr = args.F * D2R;
    const E = eFactorAtJdTT(jdTT, T, T * T);
    const { fs } = planeOfDateAt(jdTT - j2000JD);
    return fullDistanceKm(Dr, Mr, Mpr, Fr, E, E * E, fs, jdTT);
  }

  return { sceneEvalAt, truncatedLonDeg, truncatedBetaDeg, truncatedDistanceKm, additionalArgs };
}

module.exports = { createMoonSeries };
