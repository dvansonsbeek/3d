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
export function computeMassChainJ2000(c: {
    moonDistanceKm: number;
    moonSiderealMonthDays: number;
    meanSiderealYearDays: number;
    meanLengthOfDaySeconds: number;
    massRatioEarthMoon: number;
    currentAUDistanceKm: number;
    gravitationalConstantKm3KgS2: number;
}): {
    meanSiderealYearSeconds: number;
    moonOrbitalShiftKm: number;
    moonDistanceCorrectedKm: number;
    gmEarthMoonSystemKm3S2: number;
    gmEarthAloneKm3S2: number;
    gmMoonAloneKm3S2: number;
    gmSunPlusEarthKm3S2: number;
    gmSunKm3S2: number;
    sunMassKg: number;
};
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
export function computeMoonPeriodsJ2000(c: {
    moonSiderealMonthDays: number;
    moonApsidalPrecessionDaysInput: number;
    moonNodalPrecessionDaysInput: number;
    axialPrecessionJ2000Days: number;
    meanSiderealYearDays: number;
    meanSolarYearDays: number;
}): {
    moonApsidalPrecessionDaysEarth: number;
    moonNodalPrecessionDaysEarth: number;
    moonApsidalJ2000Seconds: number;
    moonNodalJ2000Seconds: number;
    moonSiderealMonthJ2000Seconds: number;
    moonAnomalisticMonthDays: number;
    moonNodalMonthDays: number;
    moonSynodicMonthDays: number;
    moonTropicalMonthDays: number;
    moonFullMoonCycleEarthDays: number;
    moonFullMoonCycleICRFDays: number;
    moonApsidalMeetsNodalDays: number;
    moonLunarLevelingCycleDays: number;
    moonDraconicYearICRFDays: number;
    moonDraconicYearEarthDays: number;
};
