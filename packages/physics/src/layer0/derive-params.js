/**
 * Derive the Layer 0 parameter bundle from raw catalogue constants.
 *
 * Mirrors `tools/lib/deep-time.js` lines ~60–101 OPERATION FOR OPERATION —
 * grouping, order, the speed-of-light fallback ternary, all of it. Floating
 * point is not associative, so "algebraically the same" is not the standard
 * here; bit-identical is, and the layer0 identity test compares every field of
 * this function's output against the values deep-time.js derives internally.
 * If the two ever disagree, one of them changed and the other did not — which
 * is the exact drift mode that produced five diverging implementations.
 *
 * Pure function; its only import is the torque-share derivation (plan 06
 * Phase 3: the unit H(t) = 13·T_p,composed needs the solar fraction of the
 * J2000 precession torque, derived ONCE here from the shared constants).
 * Lives in physics so the browser and the Node engine can both build Layer 0
 * from ONE derivation (deep-time.js keeps its own inline copy only until
 * Phase C rewrites it; until then the test is the enforcement).
 */

import { computeSolarTorqueShare } from '../earth/precession-composed.cjs';

/**
 * @typedef {Object} RawEpochConstants
 * @property {number} solarLuminosityW          IAU 2015 nominal (W)
 * @property {number} solarWindKgPerS           Ulysses/ACE/Wind
 * @property {number} speedOfLightKmPerS        km/s (fallback 299792458 m/s if falsy)
 * @property {number} alpha1PerMa                 the LLR recession rate — the cited distance history's J2000 slope
 * @property {number} meanSiderealYearSeconds
 * @property {number} lodJ2000Seconds              ω₀: the J2000 day length, SI seconds (the SI day since plan 09)
 * @property {number} sunMassKg                 M_SUN
 * @property {number} gmEarthAloneKm3S2
 * @property {number} gmMoonAloneKm3S2
 * @property {number} gravitationalConstantKm3KgS2
 * @property {number} earthMoiFactorJ2000
 * @property {number} earthDiameterKm
 * @property {number} moonDistanceKm
 * @property {number} moonOrbitalEccentricity
 * @property {number} gmEarthMoonSystemKm3S2
 * @property {number} gmSunKm3S2                 GM☉ (km³/s²) — the solar precession torque
 * @property {number} astronomicalUnitKm         1 AU (km)
 * @property {number} earthOrbitalEccentricityJ2000
 * @property {number} moonEclipticInclinationJ2000Deg
 * @property {number} axialPrecessionJ2000Years    the model's ONE J2000 precession reading (1,296,000/p_A; plan 09)
 */

/**
 * @param {RawEpochConstants} raw
 * @returns {import('./index.js').EpochParams}
 */
export const deriveEpochParams = (raw) => {
  // Solar physics — Driver 2 mass loss
  const cSiMPerS = raw.speedOfLightKmPerS ? raw.speedOfLightKmPerS * 1000 : 299792458;
  const dmDtTotalKgS = raw.solarLuminosityW / (cSiMPerS * cSiMPerS) + raw.solarWindKgPerS;

  // J2000 anchors. Plan 09: ω₀ is the SI day (an input, 86,400 s); the
  // identifier keeps its historical name — the H/13 kinematic-day
  // construction it once named (86,399.99968 s) is deleted.
  const lodNowH13Seconds = raw.lodJ2000Seconds;
  const solarMassLossFracPerYear = dmDtTotalKgS * raw.meanSiderealYearSeconds / raw.sunMassKg;

  // Earth mass, moments
  const earthMassKg = raw.gmEarthAloneKm3S2 / raw.gravitationalConstantKm3KgS2;
  const moonMassKg = raw.gmMoonAloneKm3S2 / raw.gravitationalConstantKm3KgS2;
  const earthRadiusM = (raw.earthDiameterKm / 2) * 1000;
  const iEarthJ2000 = raw.earthMoiFactorJ2000 * earthMassKg * earthRadiusM * earthRadiusM;

  // Moon constants
  const moonDistanceNowM = raw.moonDistanceKm * 1000;
  const moonEccentricityFactor = Math.sqrt(1 - raw.moonOrbitalEccentricity * raw.moonOrbitalEccentricity);
  const gmEarthMoonM3S2 = raw.gmEarthMoonSystemKm3S2 * 1e9;
  const totalAngularMomentumKgM2S = (iEarthJ2000 * 2 * Math.PI / lodNowH13Seconds)
    + (moonMassKg * Math.sqrt(gmEarthMoonM3S2 * moonDistanceNowM) * moonEccentricityFactor);
  const moonLockDistanceM = (totalAngularMomentumKgM2S / (moonMassKg * Math.sqrt(gmEarthMoonM3S2) * moonEccentricityFactor)) ** 2;

  // The solar fraction of the J2000 precession torque (plan 06 Phase 3): the
  // unit H(t) ≡ 13·T_p,composed = H_era(t) / [f_S + (1 − f_S)(a₀/a_M(t))³].
  const precessionSolarShareJ2000 = computeSolarTorqueShare({
    gmSunKm3S2: raw.gmSunKm3S2, auKm: raw.astronomicalUnitKm, earthEccentricity: raw.earthOrbitalEccentricityJ2000,
    gmMoonKm3S2: raw.gmMoonAloneKm3S2, moonDistanceKm: raw.moonDistanceKm, moonEccentricity: raw.moonOrbitalEccentricity,
    moonInclinationDeg: raw.moonEclipticInclinationJ2000Deg,
  });

  return Object.freeze({
    epochYear: 2000,
    alpha1PerMa: raw.alpha1PerMa,
    moonDistanceNowM,
    moonLockDistanceM,
    totalAngularMomentumKgM2S,
    moonMassKg,
    gmEarthMoonM3S2,
    moonEccentricityFactor,
    earthMassKg,
    earthRadiusM,
    lodNowH13Seconds,
    siderealYearJ2000Seconds: raw.meanSiderealYearSeconds,
    solarMassLossFracPerYear,
    precessionSolarShareJ2000,
    // p₀, the composed precession rate's J2000 anchor — the tropical year of
    // date's equinox term (plan 09 step 5d; the same expression the deep-time
    // factory's composed module resolves, so the twins stay bit-identical)
    precessionRateJ2000ArcsecPerYr: 1296000 / raw.axialPrecessionJ2000Years,
  });
};
