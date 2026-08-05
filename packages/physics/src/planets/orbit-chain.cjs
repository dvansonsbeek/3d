/**
 * Deep-time planet orbit chain — THE shared implementation (Phase 8.3, L6).
 * Driver 2: solar mass loss. Three pure laws:
 *
 *  - massLossScaledLinearAtAge — adiabatic a·M = const ⇒ a(t) scales
 *    LINEARLY with (1 − Δm). Serves Earth's AU (km) and every planet's
 *    semi-major axis (units are the caller's — S-P11 resolved: the two
 *    engines shared this driver all along, differing only in km vs
 *    AU-ratio normalization).
 *  - driver2PeriodSecondsAtAge — Kepler under mass loss, dT/T = −2·dM/M ⇒
 *    T(t) = T₀·(1 − Δm)². The integrand of the planet cycle chains
 *    (chain-cycles) and the scene integrators (S-P2).
 *  - synodicPeriodSeconds — the Earth–planet beat Tp·Ty/|Tp − Ty|.
 *
 * t_Ma is AGE in Myr (positive = past); Δm = massLossFracPerYear·t_Ma·1e6.
 * The t_Ma === 0 fast paths return the J2000 values EXACTLY.
 */

'use strict';

/**
 * @param {number} tMa @param {number} valueJ2000
 * @param {number} massLossFracPerYear @returns {number} */
function massLossScaledLinearAtAge(tMa, valueJ2000, massLossFracPerYear) {
  if (tMa === 0) return valueJ2000;
  const massLossFraction = massLossFracPerYear * tMa * 1e6;
  return valueJ2000 * (1 - massLossFraction);
}

/**
 * @param {number} tMa @param {number} periodJ2000Seconds
 * @param {number} massLossFracPerYear @returns {number} */
function driver2PeriodSecondsAtAge(tMa, periodJ2000Seconds, massLossFracPerYear) {
  if (tMa === 0) return periodJ2000Seconds;
  const massLossFraction = massLossFracPerYear * tMa * 1e6;
  return periodJ2000Seconds * Math.pow(1 - massLossFraction, 2);
}

/**
 * @param {number} planetPeriodSeconds @param {number} yearSeconds
 * @returns {number} */
function synodicPeriodSeconds(planetPeriodSeconds, yearSeconds) {
  return planetPeriodSeconds * yearSeconds / Math.abs(planetPeriodSeconds - yearSeconds);
}

module.exports = { massLossScaledLinearAtAge, driver2PeriodSecondsAtAge, synodicPeriodSeconds };
