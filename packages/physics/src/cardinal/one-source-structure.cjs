'use strict';

/**
 * ONE-SOURCE CARDINAL STRUCTURE (D4b — plan 02 Stage C/D4).
 *
 * The equation-of-center layer of the cardinal points, driven by the
 * one-source movement's own elements e(t), ϖ(t): the true Sun runs ahead
 * of or behind the mean Sun by the equation of center, so it crosses each
 * cardinal longitude λ_X (VE 0°, SS 90°, AE 180°, WS 270°, equinox of
 * date) early or late by
 *
 *   Δt_X(year) = −(T_mean/360°)·EoC(M_X),  M_X ≈ λ_X − ϖ(year) − EoC(M_X)
 *
 * and the per-point year length is the EXACT year-over-year difference
 *
 *   T_X(year) = T_mean(year+½) + [Δt_X(year+1) − Δt_X(year)]
 *
 * (the difference form, never rate × span — the rate-vs-point rule). The
 * spread of the four T_X around T_mean is ∝ e(t) — ±48 s at e = 0.0167,
 * ±138 s at e = 0.050 — phased by perihelion's passage of each cardinal
 * point (the owner-observed structure; Bromberg's numerical integration
 * reproduced sign-for-sign).
 *
 * VALIDATED against the banked one-source CSV (data/02-solar-measurements
 * .csv, 335,318 measured events per type over the full H window): year
 * lengths close to bias ~1 s / rms ~101 s; the residual is the ecliptic
 * -plane (planetary-precession) term the closed form does not carry.
 * T_mean MUST be supplied in SI seconds — a days-of-date year hides a
 * ~2,400 s LOD-vs-SI bias at −300 kyr (measured).
 *
 * DELIBERATELY NOT HERE: absolute event dates. They need a mean-sun
 * crossing chain, which is a per-renderer concern (the measured ±2–13 min
 * twin-stack split between the browser scene and the Step-6a instrument);
 * the era-certified absolute dates remain the frozen harmonic device
 * (createCardinalModel — the certified era clock).
 *
 * Pure factory: no artifact reads, no registry reads — the caller injects
 * the one-source sampler and the movement's mean tropical year, exactly
 * like createDeepOrbitalHistory injects its surfaces.
 */

const D2R = Math.PI / 180;

/** Cardinal longitudes, equinox of date. @type {Record<string, number>} */
const CARDINAL_LONGITUDE_DEG = { VE: 0, SS: 90, AE: 180, WS: 270 };

/**
 * Equation of center in degrees, to e⁴ (the computeSunPositionFast family).
 * @param {number} e eccentricity
 * @param {number} meanAnomalyDeg
 * @returns {number} degrees
 */
function equationOfCenterDeg(e, meanAnomalyDeg) {
  const M = meanAnomalyDeg * D2R;
  const e2 = e * e, e3 = e2 * e, e4 = e3 * e;
  return ((2 * e - e3 / 4) * Math.sin(M)
    + (1.25 * e2 - (11 / 24) * e4) * Math.sin(2 * M)
    + (13 / 12) * e3 * Math.sin(3 * M)
    + (103 / 96) * e4 * Math.sin(4 * M)) / D2R;
}

/**
 * @param {object} opts
 * @param {(year: number) => {e: number, periOfDateDeg: number}} opts.sampleAt
 *   the one-source history sampler (createDeepOrbitalHistory build().at,
 *   year-keyed by the caller)
 * @param {(year: number) => number} opts.tropicalYearSecondsAtYearFn
 *   the movement's mean tropical year of date, SI SECONDS (see header)
 */
function createCardinalStructure({ sampleAt, tropicalYearSecondsAtYearFn }) {
  if (typeof sampleAt !== 'function' || typeof tropicalYearSecondsAtYearFn !== 'function') {
    throw new Error('createCardinalStructure: sampleAt and tropicalYearSecondsAtYearFn are required');
  }

  /**
   * Δt_X — the true-sun crossing offset vs the mean sun, SI seconds.
   * Negative when the true sun crosses λ_X early (EoC > 0 at the crossing).
   * @param {number} year epoch (decimal year)
   * @param {'VE'|'SS'|'AE'|'WS'} type
   * @returns {number} seconds
   */
  function eocOffsetSeconds(year, type) {
    const lam = CARDINAL_LONGITUDE_DEG[type];
    if (lam === undefined) throw new Error(`unknown cardinal type: ${type}`);
    const s = sampleAt(year);
    // λ_X is the SUN's geocentric cardinal longitude, but periOfDateDeg is
    // the EARTH's heliocentric longitude of perihelion (the standard ϖ,
    // 102.9° at J2000) — the Sun's geocentric perigee sits at ϖ + 180°.
    // Measured before this fix: the four year lengths came out canonical
    // in VALUE but swapped in TYPE (VE↔AE, SS↔WS — the structure's VE
    // read 48.50 min past 365 d 5 h where the scene MEASURES 49.02, the
    // Meeus March-equinox value); the missing 180° flipped the mean
    // anomaly fed to the equation of center. Found building the Bromberg
    // cardinal-year-lengths chart — the mean, spread magnitude and
    // anomalistic year (ϖ-difference form) were all unaffected.
    const perigeeDeg = s.periOfDateDeg + 180;
    let M = lam - perigeeDeg;                            // first guess
    M = lam - perigeeDeg - equationOfCenterDeg(s.e, M);  // one fixed-point pass
    const T = tropicalYearSecondsAtYearFn(year);
    return -(T / 360) * equationOfCenterDeg(s.e, M);
  }

  /**
   * T_X — the year length measured between successive passages of the
   * cardinal point, SI seconds (the exact difference form).
   * @param {number} year the interval starts at this year's event
   * @param {'VE'|'SS'|'AE'|'WS'} type
   * @returns {number} seconds
   */
  function yearLengthSeconds(year, type) {
    return tropicalYearSecondsAtYearFn(year + 0.5)
      + eocOffsetSeconds(year + 1, type) - eocOffsetSeconds(year, type);
  }

  /**
   * The ANOMALISTIC year — time between successive perihelion passages,
   * SI seconds. At perihelion the equation of center is ZERO by definition
   * (M = 0), so perihelion passages are pure mean-anomaly events and the
   * closed form needs no EoC term at all:
   *
   *   T_anom(year) = T_mean(year+½) · 360 / (360 − Δϖ_yr)
   *
   * with Δϖ_yr = ϖ(year+1) − ϖ(year) (wrapped; the year-over-year apsidal
   * advance RELATIVE TO THE EQUINOX — periOfDateDeg is equinox-referenced,
   * so this is the climatic-precession rate, ~0.017°/yr ≈ +25 min at
   * J2000). Exact difference form; driven by the ENGINE's ϖ(t) — this is
   * the model's physics, replacing the retired K-family anomalistic
   * harmonic fit (the family that measured worst against the one-source
   * movement: 0.41 s broadband).
   * @param {number} year the interval starts at this year's perihelion
   * @returns {number} seconds
   */
  function anomalisticYearSeconds(year) {
    const p0 = sampleAt(year).periOfDateDeg;
    const p1 = sampleAt(year + 1).periOfDateDeg;
    const dPeriDeg = ((p1 - p0 + 540) % 360) - 180;   // wrapped, prograde +
    return tropicalYearSecondsAtYearFn(year + 0.5) * 360 / (360 - dPeriDeg);
  }

  /**
   * The four year lengths minus the mean — the e(t)-proportional spread.
   * @param {number} year
   * @returns {{VE: number, SS: number, AE: number, WS: number, meanSeconds: number}}
   */
  function spreadSeconds(year) {
    const meanSeconds = tropicalYearSecondsAtYearFn(year + 0.5);
    /** @type {any} */
    const out = { meanSeconds };
    for (const type of ['VE', 'SS', 'AE', 'WS']) {
      out[type] = yearLengthSeconds(year, /** @type {'VE'} */(type)) - meanSeconds;
    }
    return out;
  }

  return { eocOffsetSeconds, yearLengthSeconds, spreadSeconds, anomalisticYearSeconds };
}

module.exports = { createCardinalStructure, equationOfCenterDeg, CARDINAL_LONGITUDE_DEG };
