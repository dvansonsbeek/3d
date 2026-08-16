/**
 * Meeus Ch. 47 lunar periodic series — THE shared implementation (8.2-6).
 *
 * Replaces THREE copies: the browser scene block (moveModel), the tools
 * scene block (both the full production evaluation), and hosts the
 * TRUNCATED eclipse-finder variant beside it. The dual form is DELIBERATE
 * (doc 66 §Layer 1b): the truncated `_eclMoon*` helpers are the form the
 * certified eclipse statistics were produced with (NASA canon recall
 * 99.58/74.62/98.66, knife-edge at the γ ≈ 1.0/1.5 boundaries) — upgrading
 * them to the full series is a RE-CERTIFICATION item, not a refactor.
 *
 * Full scene form: 60 longitude + 60 latitude terms with E/E² scaling on
 * M-bearing terms, A1 (Venus, Meeus-observed rate — the 18V−16E−M′
 * near-resonance makes it hypersensitive; no lattice identity), A2/A3
 * (D2-derived lattice rates, CHAIN-INTEGRATED under deep time through
 * their identified content), all six latitude corrections, the EoC-half
 * subtraction (the off-centre orbit geometry already provides half the
 * equation of centre), and the two-term ellipse distance.
 *
 * The correction literals (3958/1962/318; −2235/382/175/175/127/−115;
 * phases 119.75/53.09/313.45; Meeus A/B rates 479264.290/481266.484) are
 * Meeus Ch. 47 STRUCTURE and live here, like the argument polynomials
 * (8.2-5 S2 precedent). The 60-term tables are INJECTED — they are fitted
 * coefficients (the engines' two sources are byte-identical).
 */

'use strict';

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
 *     moonMeeusLpCorrectionDeg: number,
 *     fwA2RateDegPerCy: number,
 *     fwA3RateDegPerCy: number,
 *   },
 *   fns: {
 *     argsAt: (jdTT: number) => {Lp: number, D: number, M: number, Mp: number, F: number},
 *     eFactorForD: (dDaysTT: number, T: number, T2: number) => number,
 *     eFactorAtJdTT: (jdTT: number, T: number, T2: number) => number,
 *     getMoonDistanceKm: () => number,
 *     getEccentricityBase: () => number,
 *     deltaTSeconds: (jdUT: number) => number,
 *     jdToSIyear: (jd: number) => number,
 *     tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *     jupiterOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     isDeepTime: () => boolean,
 *     isFrameworkNative: () => boolean,
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
    moonMeeusLpCorrectionDeg, fwA2RateDegPerCy, fwA3RateDegPerCy,
  } = constants;
  const {
    argsAt, eFactorForD, eFactorAtJdTT, getMoonDistanceKm, getEccentricityBase, deltaTSeconds,
    jdToSIyear, tropicalOrbitsBetween, apsidalOfDateCyclesBetween,
    cyclesBetween, jupiterOrbitsBetween, isDeepTime, isFrameworkNative,
  } = fns;

  const D2R = Math.PI / 180;

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
      const nP13 = cyclesBetween(yA0, yA, 13);
      const nJ = jupiterOrbitsBetween(yA0, yA);
      if (nT !== null && nAps !== null && nP13 !== null && nJ !== null) {
        a3Deg = 313.45 + 360 * (nT - nP13);
        a2Deg = 53.09 + 360 * (nT + nAps - 2 * nJ);
      }
    }
    return { A1, A2: a2Deg * D2R, A3: a3Deg * D2R };
  }

  /** One 60-term table pass with E/E² on M-bearing terms (micro-degrees).
   *  @param {MeeusTermTable} table @param {number} Dr @param {number} Mr
   *  @param {number} Mpr @param {number} Fr @param {number} E
   *  @param {number} E2 @returns {number} */
  function sumTable(table, Dr, Mr, Mpr, Fr, E, E2) {
    let s = 0;
    for (let i = 0; i < table.length; i++) {
      const r = table[i];
      const arg = r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr;
      let term = r[4] * Math.sin(arg);
      const absM = r[1] < 0 ? -r[1] : r[1];
      if (absM === 1) term *= E;
      else if (absM === 2) term *= E2;
      s += term;
    }
    return s;
  }

  /** Σr table pass — COSINE of the argument (Meeus 47.A distance column),
   *  same E/E² convention. Units 0.001 km.
   *  @param {MeeusTermTable} table @param {number} Dr @param {number} Mr
   *  @param {number} Mpr @param {number} Fr @param {number} E
   *  @param {number} E2 @returns {number} */
  function sumTableCos(table, Dr, Mr, Mpr, Fr, E, E2) {
    let s = 0;
    for (let i = 0; i < table.length; i++) {
      const r = table[i];
      if (r[4] === 0) continue;
      const arg = r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr;
      let term = r[4] * Math.cos(arg);
      const absM = r[1] < 0 ? -r[1] : r[1];
      if (absM === 1) term *= E;
      else if (absM === 2) term *= E2;
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
  function fullDistanceKm(Dr, Mr, Mpr, Fr, E, E2) {
    const Sr = sumTableCos(moonR, Dr, Mr, Mpr, Fr, E, E2);
    return (moonRMeanKm + Sr * 1e-3) * (getMoonDistanceKm() / moonDistanceJ2000Km);
  }

  /** The PRODUCTION scene evaluation at d days TT from J2000 (the caller
   *  owns the UT→TT conversion — engine timing conventions differ).
   *  Returns everything the scene blocks write:
   *  thetaAddRad — the hierarchy θ increment (EoC-half-subtracted Σl);
   *  lonDeg — full ecliptic longitude incl. moonMeeusLpCorrection;
   *  latRad/latDeg — Σb with all six corrections (BOTH computed from Σb
   *  directly: the browser stores radians, the Node engine degrees, and
   *  (x·D2R)/D2R is not bit-exactly x); distKm — two-term ellipse; T.
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

    let Sl = sumTable(moonL, Dr, Mr, Mpr, Fr, E, E2);
    Sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp - Fr) + 318 * Math.sin(A2);
    // Subtract the EoC portion the off-centre orbit geometry already provides.
    const eocHalf = getEccentricityBase() / 2;
    Sl -= (2 * eocHalf / D2R * 1e6) * Math.sin(Mpr);
    Sl -= (1.25 * eocHalf * eocHalf / D2R * 1e6) * Math.sin(2 * Mpr);
    const thetaAddRad = Sl * 1e-6 * D2R;

    let Sb = sumTable(moonB, Dr, Mr, Mpr, Fr, E, E2);
    Sb += -2235 * Math.sin(Lp) + 382 * Math.sin(A3);
    Sb += 175 * Math.sin(A1 - Fr) + 175 * Math.sin(A1 + Fr);
    Sb += 127 * Math.sin(Lp - Mpr) - 115 * Math.sin(Lp + Mpr);
    const latRad = Sb * 1e-6 * D2R;
    const latDeg = Sb * 1e-6;

    // Full longitude re-adds the EoC half that θ absorbed.
    const fullSl = Sl + (2 * eocHalf / D2R * 1e6) * Math.sin(Mpr)
                     + (1.25 * eocHalf * eocHalf / D2R * 1e6) * Math.sin(2 * Mpr);
    const lonDeg = Lp / D2R + fullSl * 1e-6 + moonMeeusLpCorrectionDeg;
    const distKm = fullDistanceKm(Dr, Mr, Mpr, Fr, E, E2);
    return { thetaAddRad, lonDeg, latRad, latDeg, distKm, T };
  }

  /** TRUNCATED eclipse-finder longitude (doc 66 §Layer 1b): the certified
   *  form — no EoC subtraction, no A3/latitude-family, no LpCorrection.
   *  Accepts JD_UT; converts to TT via the injected ΔT.
   *  @param {number} jdUT @returns {number} degrees 0–360 */
  function truncatedLonDeg(jdUT) {
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
    let Sl = sumTable(moonL, Dr, Mr, Mpr, Fr, E, E2);
    const A1 = (119.75 + 131.849 * T) * D2R;
    const A2 = (53.09 + (isFrameworkNative() ? fwA2RateDegPerCy : 479264.290) * T) * D2R;
    Sl += 3958 * Math.sin(A1) + 1962 * Math.sin(LpMean * D2R - Fr) + 318 * Math.sin(A2);
    return (((LpMean + Sl * 1e-6) % 360) + 360) % 360;
  }

  /** TRUNCATED eclipse-finder latitude (doc 66 §Layer 1b): table only — the
   *  six additional corrections are DELIBERATELY absent (the certified
   *  eclipse statistics were produced with this form; the ~2.2 mdeg
   *  −2235·sin(Lp) family would move knife-edge canon events).
   *  @param {number} jdUT @returns {number} degrees */
  function truncatedBetaDeg(jdUT) {
    const jdTT = jdUT + deltaTSeconds(jdUT) / 86400;
    const T = (jdTT - j2000JD) / julianCenturyDays;
    const T2 = T * T;
    const args = argsAt(jdTT);
    const Dr = args.D * D2R, Mr = args.M * D2R, Mpr = args.Mp * D2R, Fr = args.F * D2R;
    const E = eFactorAtJdTT(jdTT, T, T2);
    const E2 = E * E;
    return sumTable(moonB, Dr, Mr, Mpr, Fr, E, E2) * 1e-6;
  }

  /** Full Meeus Ch. 47 distance at JD_UT (shared with the scene form).
   *  @param {number} jdUT @returns {number} km */
  function truncatedDistanceKm(jdUT) {
    const jdTT = jdUT + deltaTSeconds(jdUT) / 86400;
    const T = (jdTT - j2000JD) / julianCenturyDays;
    const args = argsAt(jdTT);
    const Dr = args.D * D2R, Mr = args.M * D2R, Mpr = args.Mp * D2R, Fr = args.F * D2R;
    const E = eFactorAtJdTT(jdTT, T, T * T);
    return fullDistanceKm(Dr, Mr, Mpr, Fr, E, E * E);
  }

  return { sceneEvalAt, truncatedLonDeg, truncatedBetaDeg, truncatedDistanceKm, additionalArgs };
}

module.exports = { createMoonSeries };
