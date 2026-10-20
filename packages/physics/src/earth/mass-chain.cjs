/**
 * The J2000 mass chain and the Moon's J2000 periods — ONE home (holisticuniverse
 * plan 13 B3). Before B3 the mass chain (Moon Kepler → GM_EM → the Earth/Moon
 * split → the Sun) was computed in three places (model.js, tools/lib/
 * constants.js, src/script.js), and the Moon's derived periods in three more.
 *
 * Every expression here is the twins' expression in the twins' operation
 * order (floating point is not associative; the goldens pin the values).
 */

'use strict';

/**
 * The mass chain in §9 order: Δa (the Sun's tidal coupling to the Earth–Moon
 * barycentric wobble, leading order), the corrected Moon distance, Kepler on
 * the Moon's orbit → G(M_E + M_M), the DE440 split → GM_E and GM_M, Kepler on
 * Earth's orbit → G(M_☉ + M_E), the subtraction → GM_☉ and M_☉.
 * @param {{
 *   moonDistanceKm: number, moonSiderealMonthDays: number, meanSiderealYearDays: number,
 *   meanLengthOfDaySeconds: number, massRatioEarthMoon: number, currentAUDistanceKm: number,
 *   gravitationalConstantKm3KgS2: number,
 * }} c
 * @returns {{
 *   meanSiderealYearSeconds: number, moonOrbitalShiftKm: number, moonDistanceCorrectedKm: number,
 *   gmEarthMoonSystemKm3S2: number, gmEarthAloneKm3S2: number, gmMoonAloneKm3S2: number,
 *   gmSunPlusEarthKm3S2: number, gmSunKm3S2: number, sunMassKg: number,
 * }}
 */
function computeMassChainJ2000(c) {
  const meanSiderealYearSeconds = c.meanSiderealYearDays * 86400;
  const moonOrbitalShiftKm = c.moonDistanceKm * (1 / (c.massRatioEarthMoon + 1)) * (c.moonSiderealMonthDays / c.meanSiderealYearDays);
  const moonDistanceCorrectedKm = c.moonDistanceKm + moonOrbitalShiftKm;
  const gmEarthMoonSystemKm3S2 = (4 * Math.PI * Math.PI * Math.pow(moonDistanceCorrectedKm, 3))
    / Math.pow(c.moonSiderealMonthDays * c.meanLengthOfDaySeconds, 2);
  const gmEarthAloneKm3S2 = gmEarthMoonSystemKm3S2 * (c.massRatioEarthMoon / (c.massRatioEarthMoon + 1));
  const gmMoonAloneKm3S2 = gmEarthMoonSystemKm3S2 / (c.massRatioEarthMoon + 1);
  const gmSunPlusEarthKm3S2 = (4 * Math.PI * Math.PI * Math.pow(c.currentAUDistanceKm, 3))
    / Math.pow(meanSiderealYearSeconds, 2);
  const gmSunKm3S2 = gmSunPlusEarthKm3S2 - gmEarthAloneKm3S2;
  const sunMassKg = gmSunKm3S2 / c.gravitationalConstantKm3KgS2;
  return { meanSiderealYearSeconds, moonOrbitalShiftKm, moonDistanceCorrectedKm, gmEarthMoonSystemKm3S2, gmEarthAloneKm3S2, gmMoonAloneKm3S2, gmSunPlusEarthKm3S2, gmSunKm3S2, sunMassKg };
}

/**
 * The Moon's J2000 periods on the IAU inputs. The two precession inputs are
 * equinox-OF-DATE observables (3231.50 d / 6798.38 d; the legacy "ICRF" name
 * is kept); the star-referenced periods remove the equinox's own precession,
 * 1/T_E = 1/T_I ∓ 1/T_p (the perigee advances, the node regresses), T_p the
 * J2000 precession anchor in days. The months follow kinematically.
 * @param {{
 *   moonSiderealMonthDays: number, moonApsidalPrecessionDaysInput: number, moonNodalPrecessionDaysInput: number,
 *   axialPrecessionJ2000Days: number, meanSiderealYearDays: number, meanSolarYearDays: number,
 * }} c
 * @returns {{
 *   moonApsidalPrecessionDaysEarth: number, moonNodalPrecessionDaysEarth: number,
 *   moonApsidalJ2000Seconds: number, moonNodalJ2000Seconds: number, moonSiderealMonthJ2000Seconds: number,
 *   moonAnomalisticMonthDays: number, moonNodalMonthDays: number, moonSynodicMonthDays: number, moonTropicalMonthDays: number,
 *   moonFullMoonCycleEarthDays: number, moonFullMoonCycleICRFDays: number,
 *   moonApsidalMeetsNodalDays: number, moonLunarLevelingCycleDays: number,
 *   moonDraconicYearICRFDays: number, moonDraconicYearEarthDays: number,
 * }}
 */
function computeMoonPeriodsJ2000(c) {
  const T = c.axialPrecessionJ2000Days;
  const M = c.moonSiderealMonthDays;
  // the days forms (tools/lib/constants.js §7, src/script.js)
  const moonApsidalPrecessionDaysEarth = 1 / (1 / c.moonApsidalPrecessionDaysInput - 1 / T);
  const moonNodalPrecessionDaysEarth = 1 / (1 / c.moonNodalPrecessionDaysInput + 1 / T);
  const moonAnomalisticMonthDays = 1 / (1 / M - 1 / moonApsidalPrecessionDaysEarth);
  const moonNodalMonthDays = 1 / (1 / M + 1 / moonNodalPrecessionDaysEarth);
  const moonSynodicMonthDays = M * c.meanSiderealYearDays / (c.meanSiderealYearDays - M);
  const moonTropicalMonthDays = 1 / (1 / M + 1 / T);
  const moonFullMoonCycleEarthDays = (moonSynodicMonthDays / (moonSynodicMonthDays - moonAnomalisticMonthDays)) * moonAnomalisticMonthDays;
  const moonFullMoonCycleICRFDays = 1 / (1 / moonFullMoonCycleEarthDays + 1 / T);
  const moonApsidalMeetsNodalDays = (moonNodalMonthDays / (moonAnomalisticMonthDays - moonNodalMonthDays)) * moonAnomalisticMonthDays;
  const moonLunarLevelingCycleDays = (moonNodalPrecessionDaysEarth / (moonNodalPrecessionDaysEarth - moonApsidalPrecessionDaysEarth) * (moonApsidalPrecessionDaysEarth / c.meanSolarYearDays)) * c.meanSolarYearDays;
  const moonDraconicYearICRFDays = 1 / ((1 / c.meanSolarYearDays) + (1 / moonNodalPrecessionDaysEarth));
  const moonDraconicYearEarthDays = 1 / (1 / moonDraconicYearICRFDays - 1 / T);
  // the seconds forms the deep-time chain anchors on (model.js / tools/lib/deep-time.js — the same
  // relation written on the seconds, so the J2000 anchors of the month chain are bit-identical)
  const moonApsidalOfDateJ2000Seconds = c.moonApsidalPrecessionDaysInput * 86400;
  const moonNodalOfDateJ2000Seconds = c.moonNodalPrecessionDaysInput * 86400;
  const moonApsidalJ2000Seconds = 1 / (1 / moonApsidalOfDateJ2000Seconds - 1 / (T * 86400));
  const moonNodalJ2000Seconds = 1 / (1 / moonNodalOfDateJ2000Seconds + 1 / (T * 86400));
  const moonSiderealMonthJ2000Seconds = M * 86400;
  return {
    moonApsidalPrecessionDaysEarth, moonNodalPrecessionDaysEarth,
    moonApsidalJ2000Seconds, moonNodalJ2000Seconds, moonSiderealMonthJ2000Seconds,
    moonAnomalisticMonthDays, moonNodalMonthDays, moonSynodicMonthDays, moonTropicalMonthDays,
    moonFullMoonCycleEarthDays, moonFullMoonCycleICRFDays, moonApsidalMeetsNodalDays, moonLunarLevelingCycleDays,
    moonDraconicYearICRFDays, moonDraconicYearEarthDays,
  };
}

module.exports = { computeMassChainJ2000, computeMoonPeriodsJ2000 };
