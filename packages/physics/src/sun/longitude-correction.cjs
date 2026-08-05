/**
 * Sun longitude correction — the fitted H-lattice harmonic stack
 * (Phase 9, S-P8). THE shared evaluator behind what were THREE verbatim
 * copies: the browser's sunLongitudeCorrection and two inline blocks in
 * tools/lib/scene-graph (moveModel and the fast animator).
 *
 * The ~200″→~7″ RMS Sun-only correction (Phase Z-B): a fitted harmonic
 * table on H-lattice divisors, with the H-LATTICE FILTER applied at
 * evaluation — a divisor is structurally on-lattice iff EITHER
 *   (a) it is a year-multiple of H (integer year period), OR
 *   (b) it is a small precession divisor (1..20 — Earth's Fibonacci
 *       named cycles H/3, H/5, H/8, H/13, H/16, …), OR
 *   (c) it is one of the two lunar precession divisors (auto-tracked
 *       from the Meeus anchors).
 * Divisors failing all three are design-rule violating and silently
 * skipped. (Clause (d) "sharesFactorWithH" was removed 2026-07-15 — it
 * admitted mid-range fit artifacts, divisors 84/92/115/122, that are
 * not physically motivated. See tools/fit/sun-longitude-harmonics.js.)
 *
 * MATCHED PAIR: every dep is the J2000-FIXED value — the table was
 * fitted against J2000 H and mSY (the Node engines' documented
 * convention). The browser copy historically read the MUTABLE
 * holisticyearLength/balancedYear globals; measured divergence under
 * epoch shift was 8.2e-10 deg (~3 µas) — aligned onto the fitted
 * convention at extraction (9-1), zero fixture drift.
 *
 * The engines own the application (θ −= corr·d2r on the Sun node only)
 * and their enable flags.
 */

'use strict';

/**
 * @typedef {Object} SunLongitudeCorrectionDeps
 * @property {number} hYears - H, J2000-fixed (the fitted axis)
 * @property {number} balancedYear - J2000-fixed
 * @property {number} j2000JD
 * @property {number} meanDeg - the fitted mean offset
 * @property {Array<[number, number, number]>} harmonics - [divisor, sinC, cosC]
 * @property {number} nNodalJ2000 - lunar nodal divisor (per 8H convention)
 * @property {number} nApsidalJ2000 - lunar apsidal divisor
 */

/** @param {SunLongitudeCorrectionDeps} deps */
function createSunLongitudeCorrection(deps) {
  /** Correction in DEGREES at JD (subtract from the raw Sun longitude).
   * @param {number} jd @returns {number} */
  function correctionDegAt(jd) {
    const year = 2000 + (jd - deps.j2000JD) / 365.25;
    const t = year - deps.balancedYear;
    let corr = deps.meanDeg;
    const H_round = Math.round(deps.hYears);
    for (const h of deps.harmonics) {
      const divisor = h[0];
      const isYearMultiple = divisor >= H_round && divisor % H_round === 0;
      const isPrecessionDivisor = divisor > 0 && divisor <= 20;
      const isLunarPrecession = divisor === deps.nNodalJ2000 || divisor === deps.nApsidalJ2000;
      if (!isYearMultiple && !isPrecessionDivisor && !isLunarPrecession) continue;
      const phase = 2 * Math.PI * t / (deps.hYears / divisor);
      corr += h[1] * Math.sin(phase) + h[2] * Math.cos(phase);
    }
    return corr;
  }

  return { correctionDegAt };
}

module.exports = { createSunLongitudeCorrection };
