/**
 * Planet eccentricity channel — THE shared implementation (Phase 8.3, L3).
 * The law-of-cosines oscillation every body's runtime eccentricity rides
 * (Earth on H/16, each planet on its OWN wobble period — S-P1):
 *
 *   e(t) = √(base² + amp² − 2·base·amp·cos θ),  θ = 2π·N·∫1/H dt
 *
 * — the distance between two circular orbits (body orbits the wobble
 * centre at radius amp; the centre orbits the Sun at radius base).
 *
 * Extracted from src/script.js computeEccentricityEarth (the browser's
 * 5-arg generic form) and tools/lib/orbital-engine.js computeEccentricity
 * (identical law; R6 aligned its phase to integrated). The structural twin
 * of moon/ecc-channel — but a DIFFERENT law (H/16 orbit law vs the Moon
 * channel's H/3 line; doc 66 keeps the two deliberately distinct).
 *
 * Engine null/toggle semantics stay ENGINE-SIDE, deliberately:
 *  - the browser's cyclesBetween carries its DEEP_TIME_MODE toggle and maps
 *    null (past tidal lock) → the MEAN eccentricity;
 *  - the Node engine pre-computes its snapshot cycles and keeps them when
 *    the integrated phase is null (its documented R6 flag polarity).
 * Both call the same law; the dispatch difference is recorded here so
 * nobody "unifies" it without measuring.
 */

'use strict';

/**
 * The law of cosines over resolved cycles. null cycles → the MEAN
 * eccentricity √(base² + amp²) (past the tidal-lock asymptote).
 * @param {number | null} cycles @param {number} base @param {number} amplitude
 * @returns {number} */
function eccentricityFromCycles(cycles, base, amplitude) {
  if (cycles === null) {
    return Math.sqrt(base * base + amplitude * amplitude);
  }
  const phase = cycles * 2 * Math.PI;
  return Math.sqrt(
    base * base + amplitude * amplitude - 2 * base * amplitude * Math.cos(phase)
  );
}

/**
 * Browser-convention evaluator: J2000-FIXED anchor + cycle length, divisor
 * N = H_J2000/cycleLength, integrated phase via the injected engine
 * cyclesBetween (toggle semantics ride along), null → mean.
 * @param {number} currentYear @param {number} anchorYearJ2000
 * @param {number} cycleLengthYearsJ2000 @param {number} base
 * @param {number} amplitude
 * @param {{ holisticYearJ2000: number,
 *   cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null) }} env
 * @returns {number} */
function computeEccentricityIntegrated(currentYear, anchorYearJ2000, cycleLengthYearsJ2000, base, amplitude, env) {
  const divisorN = env.holisticYearJ2000 / cycleLengthYearsJ2000;
  const cycles = env.cyclesBetween(anchorYearJ2000, currentYear, divisorN);
  return eccentricityFromCycles(cycles, base, amplitude);
}

module.exports = { eccentricityFromCycles, computeEccentricityIntegrated };
