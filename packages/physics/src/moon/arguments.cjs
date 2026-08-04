/**
 * Framework-native lunar fundamental arguments — THE shared implementation
 * (Phase 8.2-5). The measured argument-decomposition recipe of doc 66 §1:
 * {Lp, D, M, Mp, F} in degrees, of-date, Meeus Ch. 47 convention.
 *
 * Extracted VERBATIM from src/script.js (_FW_MOON, _FW_SUN_SEC,
 * _fwSunSecularDeviations, the two bounded Lp carriers, _fwMoonArgsDeep,
 * _fwMoonArgs, and the pure-Meeus reference polynomials), which
 * tools/lib/scene-graph.js mirrored. Mirror gaps closed here:
 *
 *  - S3: the Sun secular deviations' year coordinate. The browser used the
 *    full Julian/Gregorian calendar conversion; the tools mirror used a
 *    linear approximation. The calendar conversion is EMBEDDED here as a
 *    private helper, so both engines now evaluate the same coordinate.
 *  - S9: ϖ/Ω composition order in the deep branch (wrapper-composed vs
 *    use-site subtraction) — one form now, the browser's.
 *  - S10: P_DEGCY was derived from the browser's MUTABLE holisticyearLength
 *    global (a latent epoch dependency in a J2000-frozen bundle) — it is
 *    built from the injected holisticYearJ2000 and has no consumers; kept
 *    as documentation of the frame decomposition.
 *
 * Construction (docs/66 §1, abridged): linear rates are observational J2000
 * anchors; perigee/node ride the PHASE-AWARE e_E channel integral (s_ϖ
 * 2.407 / s_Ω 1.018, Meeus-effective); Lp's planetary T² remainder rides
 * the bounded e_E² carrier + the obliquity-line carrier (K_PL derived
 * lazily from the closed v4 budget — zero new constants); D and M are
 * identity-composed (D ≡ Lp − L_sun, M ≡ L_sun − ϖ_sun) with secular
 * content from the closed-form year-length-harmonic integrals. Deep time:
 * the SAME factored-law chains that phase the scene layers supply the
 * skeleton (always-chains, Stage B); snapshot keeps the certified
 * polynomial skeleton, clamped at |T| ≤ 100 cy (unclamped, the fitted T⁴
 * tail reverses the lunar mean motion at year ≈ 1.99e6).
 */

'use strict';

/**
 * Astronomical JD → decimal year: Julian calendar before 1582-10-15,
 * Gregorian after (Meeus Ch. 7 inverse). The S3-aligned coordinate for the
 * Sun secular deviations. @param {number} jd @returns {number}
 */
function jdToDecimalYear(jd) {
  const J = jd + 0.5;
  const Z = Math.floor(J);
  const F = J - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  const isGregorian = (Z >= 2299161);
  const isLeap = isGregorian
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
    : (year % 4 === 0);
  const monthLengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  for (let m = 0; m < month - 1; m++) dayOfYear += monthLengths[m];
  const daysInYear = isLeap ? 366 : 365;
  return year + (dayOfYear - 1) / daysInYear;
}

/**
 * @typedef {{Lp: number, D: number, M: number, Mp: number, F: number}} MoonArgsDeg
 */

/**
 * @param {{
 *   constants: {
 *     j2000JD: number,
 *     julianCenturyDays: number,
 *     holisticYearJ2000: number,
 *     balancedYearJ2000: number,
 *     meanSolarYearDays: number,
 *     meanAnomalisticYearDays: number,
 *     tropicalYearHarmonics: Array<[number, number, number]>,
 *     anomalisticYearHarmonics: Array<[number, number, number]>,
 *     eccentricityJ2000: number,
 *     eccentricityDotJ2000: number,
 *     eccentricityDotDotJ2000: number,
 *     elpEarthFigureJ2ArcsecPerCy2: number,
 *     elpGeneralPrecessionPA_T2ArcsecPerCy2: number,
 *     eccE0: number,
 *   },
 *   fns: {
 *     eccAt: (tYr: number) => number,
 *     channelIntegral: (T: number, s: number) => number,
 *     computeObliquityEarth: (year: number) => number,
 *     jdToSIyear: (jd: number) => number,
 *     tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     nodalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *     isDeepTime: () => boolean,
 *     isFrameworkNative: () => boolean,
 *   },
 * }} deps — fns are the ENGINE'S OWN chain wrappers (each engine's toggle
 *   semantics ride along); eccAt/channelIntegral are the shared moon ecc
 *   channel; constants are J2000-frozen injections.
 */
function createMoonArguments({ constants, fns }) {
  const {
    j2000JD, julianCenturyDays, holisticYearJ2000, balancedYearJ2000,
    meanSolarYearDays, meanAnomalisticYearDays,
    tropicalYearHarmonics, anomalisticYearHarmonics,
    eccentricityJ2000, eccentricityDotJ2000, eccentricityDotDotJ2000,
    elpEarthFigureJ2ArcsecPerCy2, elpGeneralPrecessionPA_T2ArcsecPerCy2,
    eccE0,
  } = constants;
  const {
    eccAt, channelIntegral, computeObliquityEarth, jdToSIyear,
    tropicalOrbitsBetween, apsidalOfDateCyclesBetween, nodalOfDateCyclesBetween,
    cyclesBetween, isDeepTime, isFrameworkNative,
  } = fns;

  // ── The _FW_MOON bundle: Meeus Ch. 47 J2000 anchors + derived checks ─────
  const bundle = (() => {
    const LP0 = 218.3164477, D0 = 297.8501921, M0 = 357.5291092,
          MP0 = 134.9633964, F0 = 93.2720950;
    const LPR = 481267.88123421, DR = 445267.1114034, MR = 35999.0502909,
          MPR = 477198.8675055, FR = 483202.0175233;
    const P_DEGCY = 360 * 13 / holisticYearJ2000 * 100;   // framework general precession, deg/Julian cy (S10: J2000-frozen by injection; no consumers — documentation of the frame decomposition)
    const WDOT = LPR - MPR;   // perigee ϖ̇ of-date (+4069.0137) = ϖ̇_ICRF + p
    const NDOT = LPR - FR;    // node   Ω̇ of-date (−1934.1363) = Ω̇_ICRF + p
    // e_E channel Taylor CHECKS (documented J2000 reference values — the live
    // path is the phase-aware channelIntegral; T2_*/T3_* are NOT consumed):
    const E0 = eccentricityJ2000, EDOT0 = eccentricityDotJ2000;
    const KAPPA = 3 * E0 * EDOT0 / (1 - E0 * E0);
    // v4 frame attribution: FRAME-EFFECTIVE exponents (physical pair after
    // removing the IAU ṗ_A frame term: s_ϖ 2.479 / s_Ω 0.867).
    const S_W = 2.407, S_N = 1.018;
    const T2_W = S_W * WDOT * KAPPA / 2;   // −0.010318 °/cy² (Meeus ϖ −0.010320)
    const T2_N = S_N * NDOT * KAPPA / 2;   // +0.0020752 °/cy² (Meeus Ω +0.0020753)
    const EDDOT0 = eccentricityDotDotJ2000;
    const KAPPA_DOT = 3 * (EDOT0 * EDOT0 + E0 * EDDOT0) / (1 - E0 * E0)
                    + 6 * E0 * E0 * EDOT0 * EDOT0 / Math.pow(1 - E0 * E0, 2);
    const T3_W = WDOT * (S_W * S_W * KAPPA * KAPPA + S_W * KAPPA_DOT) / 6;
    const T3_N = NDOT * (S_N * S_N * KAPPA * KAPPA + S_N * KAPPA_DOT) / 6;
    // Lp carrier T²: framework tidal n̈/2 (LLR) + planetary secular remainder
    const T2_LP_TIDAL = (-25.86 / 3600) / 2;
    const T2_LP_PLANETARY = -0.0015786 - T2_LP_TIDAL;   // +7.247″/cy²
    const T2_LP = T2_LP_TIDAL + T2_LP_PLANETARY;
    return { LP0, D0, M0, MP0, F0, LPR, DR, MR, P_DEGCY, WDOT, NDOT, T2_W, T2_N, T3_W, T3_N, T2_LP, T2_LP_TIDAL, S_W, S_N };
  })();

  // ── Sun secular deviations: closed-form year-length-harmonic integrals ───
  // Normalized to value 0 AND slope 0 at J2000. KL/KA/KS capture the J2000
  // mean-year values at construction by design; phases use the fixed J2000
  // lattice (the documented snapshot approximation).
  const sunSec = (() => {
    const trop = tropicalYearHarmonics, anom = anomalisticYearHarmonics;
    const PBAR = meanSolarYearDays, ABAR = meanAnomalisticYearDays, DBAR = ABAR - PBAR;
    const KL = -(360 / PBAR);
    const wbar = 360 * DBAR / ABAR;
    const KA = wbar * PBAR / (ABAR * DBAR);
    const KS = -wbar / DBAR;
    /** @param {number} y @param {Array<[number, number, number]>} set */
    const dP = (y, set) => {
      const t = y - balancedYearJ2000; let s = 0;
      for (const [d, sc, cc] of set) {
        const w = 2 * Math.PI / (holisticYearJ2000 / d);
        s += sc * Math.sin(w * t) + cc * Math.cos(w * t);
      } return s;
    };
    /** @param {number} y @param {Array<[number, number, number]>} set */
    const intdP = (y, set) => {
      const t = y - balancedYearJ2000; let s = 0;
      for (const [d, sc, cc] of set) {
        const w = 2 * Math.PI / (holisticYearJ2000 / d);
        s += (-sc * Math.cos(w * t) + cc * Math.sin(w * t)) / w;
      } return s;
    };
    return { int0T: intdP(2000, trop), int0A: intdP(2000, anom),
             slope0L: KL * dP(2000, trop),
             slope0P: KA * dP(2000, anom) + KS * dP(2000, trop),
             KL, KA, KS, intdP, trop, anom };
  })();

  /** @param {number} jdTT @returns {{dLs: number, dPeri: number}} */
  function sunSecularDeviations(jdTT) {
    const y = jdToDecimalYear(jdTT);   // S3: the calendar coordinate, both engines
    const S = sunSec;
    const iT = S.intdP(y, S.trop) - S.int0T, iA = S.intdP(y, S.anom) - S.int0A;
    return {
      dLs: S.KL * iT - S.slope0L * (y - 2000),
      dPeri: S.KA * iA + S.KS * iT - S.slope0P * (y - 2000),
    };
  }

  // ── Bounded Lp carriers (K_PL / C_OBL derived lazily — zero new constants)
  /** @type {number | null} */
  let kPl = null;
  /** @param {number} T @returns {number} */
  function planetaryCarrier(T) {
    if (T === 0) return 0;
    if (kPl === null) {
      const de2dT = Math.pow(eccAt(50), 2) - Math.pow(eccAt(-50), 2);  // Δ(e²) per cy at J2000
      const t2Obl = (elpEarthFigureJ2ArcsecPerCy2 + elpGeneralPrecessionPA_T2ArcsecPerCy2) / 3600;
      kPl = 2 * (bundle.T2_LP - bundle.T2_LP_TIDAL - t2Obl) / de2dT;
    }
    // The channel's e0 anchor CONST — not eccAt(0), which under integrated
    // phase carries the R3 drift correction (the 8.2-2 convention).
    const e0sq = eccE0 * eccE0;
    /** @param {number} t */
    const f = (t) => { const e = eccAt(t * 100); return e * e - e0sq; };
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
    const h = T / N;
    let sum = f(0) + f(T);
    for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return kPl * sum * h / 3;
  }

  /** @type {{eps0: number, C: number} | null} */
  let obl = null;
  /** @param {number} T @returns {number} */
  function obliquityCarrier(T) {
    if (T === 0) return 0;
    if (obl === null) {
      const T2_OBL = (elpEarthFigureJ2ArcsecPerCy2 + elpGeneralPrecessionPA_T2ArcsecPerCy2) / 3600;
      const eps0 = computeObliquityEarth(2000);
      const epsDot = computeObliquityEarth(2050) - computeObliquityEarth(1950);
      obl = { eps0, C: 2 * T2_OBL / epsDot };
    }
    /** @param {number} t */
    const f = (t) => computeObliquityEarth(2000 + t * 100) - /** @type {{eps0: number, C: number}} */ (obl).eps0;
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 2000));
    const h = T / N;
    let sum = f(0) + f(T);
    for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return /** @type {{eps0: number, C: number}} */ (obl).C * sum * h / 3;
  }

  // ── Deep-time branch: always-chains (Stage B) ────────────────────────────
  /** @type {number | null} */
  let argsY0 = null;
  /** @param {number} jd @returns {MoonArgsDeg | null} */
  function fwArgsDeep(jd) {
    const A = bundle;
    if (argsY0 === null) argsY0 = jdToSIyear(j2000JD);
    const y = jdToSIyear(jd);
    const Ntrop = tropicalOrbitsBetween(argsY0, y);
    const Naps = apsidalOfDateCyclesBetween(argsY0, y);
    const Nnod = nodalOfDateCyclesBetween(argsY0, y);
    const Nperi = cyclesBetween(argsY0, y, 16);
    if (Ntrop === null || Naps === null || Nnod === null || Nperi === null) return null;   // tidal-lock guard
    /** @param {number} x */
    const wrap = (x) => ((x % 360) + 360) % 360;
    const dev = sunSecularDeviations(jd);
    const Tj = (jd - j2000JD) / julianCenturyDays;
    const Lp = A.LP0 + 360 * Ntrop + planetaryCarrier(Tj) + obliquityCarrier(Tj);
    const w = (A.LP0 - A.MP0) + 360 * Naps;                      // perigee ϖ (of-date, advance)
    const om = (A.LP0 - A.F0) - 360 * Nnod;                      // node Ω (of-date, regression)
    const Lsun = (A.LP0 - A.D0) + 360 * (y - argsY0) + dev.dLs;  // mean Sun (model timeline)
    const ws = (A.LP0 - A.D0 - A.M0) + 360 * Nperi + dev.dPeri;  // Sun perihelion (H/16 chain)
    return {
      Lp: wrap(Lp), D: wrap(Lp - Lsun), M: wrap(Lsun - ws),
      Mp: wrap(Lp - w), F: wrap(Lp - om),
    };
  }

  /** Framework-native args {Lp, D, M, Mp, F} (degrees, of-date) at JD_TT.
   *  Deep time: the chains; else the certified polynomial skeleton with the
   *  phase-aware channel perigee/node and identity-composed D/M.
   *  @param {number} jdTT @returns {MoonArgsDeg} */
  function fwArgs(jdTT) {
    if (isDeepTime()) {
      const dt = fwArgsDeep(jdTT);
      if (dt !== null) return dt;
    }
    const A = bundle;
    const T = (jdTT - j2000JD) / julianCenturyDays;
    /** @param {number} x */
    const wrap = (x) => ((x % 360) + 360) % 360;
    // Polynomial tails clamped at |T| ≤ 100 cy — see the header.
    const Tc = Math.max(-100, Math.min(100, T));
    const Tc2 = Tc * Tc, Tc3 = Tc2 * Tc, Tc4 = Tc3 * Tc;
    const Lp = A.LP0 + A.LPR * T + A.T2_LP * Tc2 + Tc3 / 538841 - Tc4 / 65194000;
    const w = (A.LP0 - A.MP0) + A.WDOT * (T + channelIntegral(T, A.S_W));   // perigee ϖ (of-date)
    const om = (A.LP0 - A.F0) + A.NDOT * (T + channelIntegral(T, A.S_N));   // node Ω (of-date)
    const dev = sunSecularDeviations(jdTT);
    const Lsun = (A.LP0 - A.D0) + (A.LPR - A.DR) * T + dev.dLs;                  // of-date mean Sun
    const ws = (A.LP0 - A.D0 - A.M0) + (A.LPR - A.DR - A.MR) * T + dev.dPeri;    // of-date Sun perihelion
    return {
      Lp: wrap(Lp), D: wrap(Lp - Lsun), M: wrap(Lsun - ws),
      Mp: wrap(Lp - w), F: wrap(Lp - om),
    };
  }

  /** Pure Meeus Ch. 47 polynomial reference (A/B mode) — exact fractions.
   *  @param {number} jdTT @returns {MoonArgsDeg} */
  function pureMeeusArgs(jdTT) {
    const T = (jdTT - j2000JD) / julianCenturyDays;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    /** @param {number} x */
    const wrap = (x) => ((x % 360) + 360) % 360;
    return {
      Lp: wrap(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000),
      D:  wrap(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000),
      M:  wrap(357.5291092 +  35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000),
      Mp: wrap(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000),
      F:  wrap( 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000),
    };
  }

  /** Mode-dispatched arguments (probe hooks stay engine-side).
   *  @param {number} jdTT @returns {MoonArgsDeg} */
  function argsAt(jdTT) {
    return isFrameworkNative() ? fwArgs(jdTT) : pureMeeusArgs(jdTT);
  }

  return { argsAt, fwArgs, fwArgsDeep, pureMeeusArgs, sunSecularDeviations, planetaryCarrier, obliquityCarrier, bundle };
}

module.exports = { createMoonArguments, jdToDecimalYear };
