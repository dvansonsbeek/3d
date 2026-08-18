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
 *     pDynDegPerYearAt?: (year: number) => number,
 *     pKinDegPerYearAt?: (year: number) => number,
 *   },
 * }} deps — fns are the ENGINE'S OWN chain wrappers (each engine's toggle
 *   semantics ride along); eccAt/channelIntegral are the shared moon ecc
 *   channel; constants are J2000-frozen injections. The OPTIONAL precession
 *   pair powers the (d′) of-date rate completion: pDyn = the DYNAMICAL
 *   axial precession (day-form beat of the engine's sidereal/solar year
 *   evaluators — the tweakpane identity, real at J2000, epoch-valid);
 *   pKin = the KINEMATIC pair's beat (the H/13-family mean the chains
 *   embed). Absent ⇒ the completion is disabled (pre-(d′) behaviour).
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
    pDynDegPerYearAt, pKinDegPerYearAt,
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
  /** @returns {number} */
  function kPlValue() {
    if (kPl === null) {
      const de2dT = Math.pow(eccAt(50), 2) - Math.pow(eccAt(-50), 2);  // Δ(e²) per cy at J2000
      const t2Obl = (elpEarthFigureJ2ArcsecPerCy2 + elpGeneralPrecessionPA_T2ArcsecPerCy2) / 3600;
      kPl = 2 * (bundle.T2_LP - bundle.T2_LP_TIDAL - t2Obl) / de2dT;
    }
    return kPl;
  }
  /** @param {number} T @returns {number} */
  function planetaryCarrier(T) {
    if (T === 0) return 0;
    const k = kPlValue();
    // The channel's e0 anchor CONST — not eccAt(0), which under integrated
    // phase carries the R3 drift correction (the 8.2-2 convention).
    const e0sq = eccE0 * eccE0;
    /** @param {number} t */
    const f = (t) => { const e = eccAt(t * 100); return e * e - e0sq; };
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
    const h = T / N;
    let sum = f(0) + f(T);
    for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return k * sum * h / 3;
  }

  /** @type {{eps0: number, C: number} | null} */
  let obl = null;
  /** @param {number} T @returns {number} */
  function obliquityCarrier(T) {
    if (T === 0) return 0;
    if (obl === null) {
      // (d′): when the of-date rate completion is live, its ∫(p_dyn − p_kin)
      // carries the model-native share of the precession ACCELERATION
      // (ṗΔ_eff/2 per T²); the carrier's normalization is reduced by exactly
      // that share so the TOTAL Lp T² stays the certified, DE441-validated
      // budget (J2 + Lieske ṗ_A/2) — the model-vs-Lieske ṗ difference lives
      // here as one visible derived term, never hidden.
      const T2_OBL = (elpEarthFigureJ2ArcsecPerCy2 + elpGeneralPrecessionPA_T2ArcsecPerCy2) / 3600
        - rateCompInit().pdSlopeDegPerCy2 / 2;
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

  // ── Secular-ë completion carrier (ṅ campaign, plan §12i item 0 (c)) ──────
  // The certified snapshot's Lp T³/T⁴ tail is DERIVED physics (v4 D3,
  // tools/explore/v4-d3-tails.js): the Adams–Laplace channel's curvature
  // under the SECULAR-theory ë reproduces 1/538841 at 98.8%. The H/3 line's
  // own ë is ~7× smaller with the opposite bulk effect — the documented BCE
  // drift-row divergence, sharply localized here — so the always-chains
  // branch, which integrates the H/3 channel, loses that content (measured:
  // deep−snapshot Lp 2c = +0.91″/cy² over 27 cy = +0.68 tail + 0.22 the
  // channel's own curvature + 0.03 convention; dense DE441 confirms the
  // certified tail at ×1.0 — canon−DE441 2c = +0.11 ± 0.13″/cy², 300
  // epochs; instruments: tools/explore/u2-args-branch-isolation.mjs,
  // u2-lp-decomposition.mjs, u2-dense-de441.mjs). This third carrier
  // integrates the CURVATURE difference of e² (secular Taylor − H/3
  // channel) through the same K_PL conversion: zero through T² by
  // construction (the certified T² normalization is untouched), < 0.001″
  // in the modern era, the derived tail across the eclipse corpus. The
  // envelope is the H/3 quarter-period cos² taper (H/12 yr — lattice-
  // derived, no new constant): the completion saturates there, so deep
  // time keeps the pure H-lattice claim (no open polynomial). The
  // channel's own third-order content is not subtracted (ω³-suppressed,
  // negligible); the T⁴ secular remainder beyond the channel term stays a
  // documented deviation (D3: 40.8% derived; ≈ −7″ at −135).
  /** @type {{dd2: number, d3Sec: number, Tq: number} | null} */
  let secComp = null;
  /** @param {number} T @returns {number} */
  function lpSecularCompletion(T) {
    if (T === 0) return 0;
    if (secComp === null) {
      // d²(e²)/dT², d³(e²)/dT³ under the quadratic secular e(T) (per cy)
      const d2Sec = 2 * (eccentricityDotJ2000 * eccentricityDotJ2000
        + eccentricityJ2000 * eccentricityDotDotJ2000);
      const d3Sec = 6 * eccentricityDotJ2000 * eccentricityDotDotJ2000;
      // the H/3 channel's own d²(e²)/dT² — central difference at ±10 cy
      /** @param {number} tCy */
      const e2 = (tCy) => { const e = eccAt(tCy * 100); return e * e; };
      const d2Ch = (e2(10) - 2 * e2(0) + e2(-10)) / 100;
      secComp = { dd2: d2Sec - d2Ch, d3Sec, Tq: holisticYearJ2000 / 12 / 100 };
    }
    const S = secComp;
    /** @param {number} t */
    const f = (t) => {
      const q = Math.abs(t) / S.Tq;
      if (q >= 1) return 0;
      const env = Math.cos(Math.PI / 2 * q) ** 2;
      return (0.5 * S.dd2 * t * t + S.d3Sec * t * t * t / 6) * env;
    };
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 2000));
    const h = T / N;
    let sum = f(0) + f(T);
    for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return kPlValue() * sum * h / 3;
  }

  // ── Deep-time branch: always-chains (Stage B) ────────────────────────────
  /** @type {number | null} */
  let argsY0 = null;

  // ── Of-date rate completion (ṅ campaign (d′)) ────────────────────────────
  // The chains' J2000 rates differ from the certified bundle rates by the
  // kinematic-vs-dynamical precession (tropical: the +0.006 s month offset
  // ≡ Δp = p_dyn − p_kin exactly) plus per-chain construction residues
  // (anomalistic +0.030 s ↔ −22″/cy, etc.) — measured end-to-end as the
  // argument linears −4.08/+0.42/+1.72/−21.99/+2.27 ″/cy (instruments:
  // u2-args-branch-isolation + the (d′) rate attribution). Two parts:
  //  1. pFix = ∫(p_dyn − p_kin) dy — the DYNAMICAL precession accumulation
  //     (Dennis's tweakpane identity), applied to every of-date longitude
  //     (Lp, ϖ, Ω; it cancels in D/M/Mp/F as of-date differences must).
  //     Natively BOUNDED at deep time: p_dyn oscillates about the lattice
  //     mean p_kin, so the integral never runs away — no taper. Two-tier
  //     lazy cumulative Simpson table (25-yr cells to ±30 kyr, 500-yr to
  //     ±1 Myr, frozen beyond — deep-Moon display class, documented).
  //  2. Residual per-chain rate anchors, SELF-MEASURED at build (±25-yr
  //     central difference of the raw compositions vs the certified bundle
  //     rates, timeline conversion measured from jdToSIyear — assuming the
  //     day-scale would inject ~29″/cy) and applied through the H/12 cos²
  //     taper integral (analytic): full in the historical window, frozen
  //     ≤ ~0.9° at deep time. Zero new physical constants anywhere.
  /** @type {{ok: boolean, pFix: (dyYears: number) => number, pdSlopeDegPerCy2: number} | null} */
  let rateComp = null;
  function rateCompInit() {
    if (rateComp !== null) return rateComp;
    if (!pDynDegPerYearAt || !pKinDegPerYearAt) {
      rateComp = { ok: false, pFix: () => 0, pdSlopeDegPerCy2: 0 };
      return rateComp;
    }
    if (argsY0 === null) argsY0 = jdToSIyear(j2000JD);
    const y0 = argsY0;
    const pDynAt = pDynDegPerYearAt, pKinAt = pKinDegPerYearAt;
    /** @param {number} y */
    const pd = (y) => pDynAt(y) - pKinAt(y);   // deg/yr
    // effective in-window ṗΔ (secant over the ancient span — robust against
    // the slow oscillation, matches the 27-cy quadratic fit)
    const pdSlopeDegPerCy2 = (pd(y0) - pd(y0 - 2700)) / 27 * 100;
    const FS = 25, FR = 30000, CS = 500, CR = 1000000;
    const nF = FR / FS;
    const fineP = new Float64Array(nF + 1), fineF = new Float64Array(nF + 1);
    let fineBuilt = false;
    /** @type {Float64Array | null} */ let coarseP = null;
    /** @type {Float64Array | null} */ let coarseF = null;
    /** @param {number} a @param {number} h */
    const cell = (a, h) => (pd(a) + 4 * pd(a + h / 2) + pd(a + h)) * h / 6;
    const buildFine = () => {
      for (let i = 0; i < nF; i++) {
        fineF[i + 1] = fineF[i] + cell(y0 + i * FS, FS);
        fineP[i + 1] = fineP[i] - cell(y0 - (i + 1) * FS, FS);
      }
      fineBuilt = true;
    };
    const buildCoarse = () => {
      const nC = (CR - FR) / CS;
      coarseF = new Float64Array(nC + 1);
      coarseP = new Float64Array(nC + 1);
      coarseF[0] = fineF[nF];
      coarseP[0] = fineP[nF];
      for (let i = 0; i < nC; i++) {
        coarseF[i + 1] = coarseF[i] + cell(y0 + FR + i * CS, CS);
        coarseP[i + 1] = coarseP[i] - cell(y0 - FR - (i + 1) * CS, CS);
      }
    };
    /** @param {number} dy @returns {number} degrees */
    const pFix = (dy) => {
      if (!fineBuilt) buildFine();
      const a = Math.abs(dy);
      if (a <= FR) {
        const arr = dy >= 0 ? fineF : fineP;
        const x = a / FS, i = Math.floor(x), f = x - i;
        return i >= nF ? arr[nF] : arr[i] + f * (arr[i + 1] - arr[i]);
      }
      if (coarseF === null || coarseP === null) buildCoarse();
      const arr = /** @type {Float64Array} */ (dy >= 0 ? coarseF : coarseP);
      const nC = arr.length - 1;
      const x = (a - FR) / CS, i = Math.floor(x), f = x - i;
      if (i >= nC) return arr[nC];   // frozen beyond ±1 Myr (documented)
      return arr[i] + f * (arr[i + 1] - arr[i]);
    };
    rateComp = { ok: true, pFix, pdSlopeDegPerCy2 };
    return rateComp;
  }

  /** Analytic taper integral: ∫₀^dy cos²(π t / 2T_q) dt, saturating at
   *  ±T_q/2 — the (c) taper convention at first order.
   *  @param {number} dy @param {number} Tq @returns {number} */
  function iEnv(dy, Tq) {
    if (Math.abs(dy) >= Tq) return Math.sign(dy) * Tq / 2;
    return dy / 2 + (Tq / (2 * Math.PI)) * Math.sin(Math.PI * dy / Tq);
  }

  /** @type {{ok: boolean, Lp: number, w: number, om: number, Lsun: number, ws: number, Tq: number} | null} */
  let rcAnchors = null;
  function anchorsInit() {
    if (rcAnchors !== null) return rcAnchors;
    const RC = rateCompInit();
    if (!RC.ok) {
      rcAnchors = { ok: false, Lp: 0, w: 0, om: 0, Lsun: 0, ws: 0, Tq: 1 };
      return rcAnchors;
    }
    // timeline conversion measured from the injected jdToSIyear itself
    const dppd = (jdToSIyear(j2000JD + 5000) - jdToSIyear(j2000JD - 5000)) / 10000;  // y-units/day
    const k = 1 / (36525 * dppd);   // deg/cy → deg per y-unit
    const jdOff = 25 / dppd;
    const a = fwArgsDeepParts(j2000JD - jdOff);
    const b = fwArgsDeepParts(j2000JD + jdOff);
    if (a === null || b === null) {
      rcAnchors = { ok: false, Lp: 0, w: 0, om: 0, Lsun: 0, ws: 0, Tq: 1 };
      return rcAnchors;
    }
    const span = b.dy - a.dy;
    const B = bundle;
    rcAnchors = {
      ok: true,
      Lp: B.LPR * k - (b.Lp - a.Lp) / span,
      w: B.WDOT * k - (b.w - a.w) / span,
      om: B.NDOT * k - (b.om - a.om) / span,
      Lsun: (B.LPR - B.DR) * k - (b.Lsun - a.Lsun) / span,
      ws: (B.LPR - B.DR - B.MR) * k - (b.ws - a.ws) / span,
      Tq: holisticYearJ2000 / 12,
    };
    return rcAnchors;
  }

  /** Raw deep composition — UNWRAPPED of-date parts incl. pFix, NO anchors
   *  (the anchors are measured against exactly this).
   *  @param {number} jd
   *  @returns {{Lp: number, w: number, om: number, Lsun: number, ws: number, dy: number} | null} */
  function fwArgsDeepParts(jd) {
    const A = bundle;
    if (argsY0 === null) argsY0 = jdToSIyear(j2000JD);
    const y = jdToSIyear(jd);
    const Ntrop = tropicalOrbitsBetween(argsY0, y);
    const Naps = apsidalOfDateCyclesBetween(argsY0, y);
    const Nnod = nodalOfDateCyclesBetween(argsY0, y);
    const Nperi = cyclesBetween(argsY0, y, 16);
    if (Ntrop === null || Naps === null || Nnod === null || Nperi === null) return null;   // tidal-lock guard
    const dev = sunSecularDeviations(jd);
    const Tj = (jd - j2000JD) / julianCenturyDays;
    const dy = y - argsY0;
    // pFix rides Lp ONLY: the obliquity carrier's PA reduction compensates
    // its ṗΔ·T²/2 there, keeping total Lp T² certified. The apsidal/nodal
    // chains' own curvature is ALREADY certified-consistent (v4 checks;
    // pre-(d′) isolation −0.20/+0.13″/cy²), so ϖ/Ω take only the tapered
    // rate anchors — which self-measure and absorb their Δp rate share.
    // Deep time: Mp/F inherit Lp's bounded pFix oscillation uncancelled
    // (physically p-free args; bounded, display-class — documented).
    const pF = rateCompInit().pFix(dy);
    const Lp = A.LP0 + 360 * Ntrop + planetaryCarrier(Tj) + obliquityCarrier(Tj)
      + lpSecularCompletion(Tj) + pF;
    const w = (A.LP0 - A.MP0) + 360 * Naps;                      // perigee ϖ (of-date, advance)
    const om = (A.LP0 - A.F0) - 360 * Nnod;                      // node Ω (of-date, regression)
    const Lsun = (A.LP0 - A.D0) + 360 * dy + dev.dLs;            // mean Sun (model timeline)
    const ws = (A.LP0 - A.D0 - A.M0) + 360 * Nperi + dev.dPeri;  // Sun perihelion (H/16 chain)
    return { Lp, w, om, Lsun, ws, dy };
  }

  /** @param {number} jd @returns {MoonArgsDeg | null} */
  function fwArgsDeep(jd) {
    const P = fwArgsDeepParts(jd);
    if (P === null) return null;
    let { Lp, w, om, Lsun, ws } = P;
    const AN = anchorsInit();
    if (AN.ok) {
      const I = iEnv(P.dy, AN.Tq);
      Lp += AN.Lp * I;
      w += AN.w * I;
      om += AN.om * I;
      Lsun += AN.Lsun * I;
      ws += AN.ws * I;
    }
    /** @param {number} x */
    const wrap = (x) => ((x % 360) + 360) % 360;
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

  // _rateCompletion: probe hook (instruments/verification) — the (d′) state:
  // whether the completion is live, its measured ṗΔ, and the five anchors.
  return { argsAt, fwArgs, fwArgsDeep, pureMeeusArgs, sunSecularDeviations, planetaryCarrier, obliquityCarrier, lpSecularCompletion, bundle,
    _rateCompletion: () => ({ rc: rateCompInit(), anchors: anchorsInit() }) };
}

module.exports = { createMoonArguments, jdToDecimalYear };
