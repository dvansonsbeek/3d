/**
 * Derived constants — the §9-order scalars from the constants context and the J2000 mass chain.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { computeMassChainJ2000 } from '../earth/mass-chain.cjs';
import { computeMeanTropicalYearJ2000Days } from '../earth/year-lengths.cjs';

/** @param {import('./context.js').ModelInputs} ctx @returns the bindings the later slices read */
export function assembleDerivedConstants(ctx) {
  const { C } = ctx;
  // The mean solar year in days (the calendar's year axis) is the J2000 mean
  // tropical year DERIVED in one home from the IAU sidereal year and p_A per
  // Julian year (year-lengths.cjs).
  const meanSolarYearDays = computeMeanTropicalYearJ2000Days(C.yearLengthRef.siderealYear, C.earthOrbital.generalPrecessionJ2000_arcsecPerYr);
  // The scene epoch's ONE home — astro-reference timeReference.sceneEpochJD /
  // sceneEpochYear; the SI-year axis (time-axis.js) anchors on the epoch itself.
  const startmodelYear = C.timeReference.sceneEpochYear;
  const startmodelJD = C.timeReference.sceneEpochJD;

  const meanSiderealYearDays = C.yearLengthRef.siderealYear;
  // (the sidereal year in SI seconds is the mass chain's own, below)
  // The J2000 day length ω₀ is the SI day (an input).
  const meanLengthOfDay = C.yearLengthRef.solarDay;
  const meanTropicalYearJ2000Seconds = meanSolarYearDays * meanLengthOfDay;
  // THE J2000 precession anchor p₀ in days (Julian years) — the IAU 2006
  // general precession; the Moon's star-referenced periods read it.
  const axialPrecessionJ2000Days = (1296000 / C.earthOrbital.generalPrecessionJ2000_arcsecPerYr) * 365.25;

  const G_CONSTANT = C.physicalConstants.G_CONSTANT;
  const MASS_RATIO_EARTH_MOON = C.physicalConstants.MASS_RATIO_EARTH_MOON;
  const currentAUDistance = C.physicalConstants.currentAUDistance;
  const moonDistanceKm = C.moonReference.moonDistance;
  const moonSiderealMonthInput = C.moonReference.moonSiderealMonthInput;

  // The Moon's sidereal month is the IAU input itself.
  const moonSiderealMonth = moonSiderealMonthInput;

  // The mass chain (Moon Kepler → GM_EM → the Earth/Moon split → the Sun, §9
  // order) — ONE home: earth/mass-chain.cjs (the deep-time chain,
  // deep-time-chain.js, computes the same scalars from the same context).
  const mass = computeMassChainJ2000({
    moonDistanceKm, moonSiderealMonthDays: moonSiderealMonth, meanSiderealYearDays,
    meanLengthOfDaySeconds: meanLengthOfDay, massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
    currentAUDistanceKm: currentAUDistance, gravitationalConstantKm3KgS2: G_CONSTANT,
  });
  const moonOrbitalShift = mass.moonOrbitalShiftKm;
  const moonDistanceCorrected = mass.moonDistanceCorrectedKm;
  const GM_EARTH_MOON_SYSTEM = mass.gmEarthMoonSystemKm3S2;
  const GM_EARTH_ALONE = mass.gmEarthAloneKm3S2;
  const GM_MOON_ALONE = mass.gmMoonAloneKm3S2;
  const GM_SUN_PLUS_EARTH = mass.gmSunPlusEarthKm3S2;
  const GM_SUN = mass.gmSunKm3S2;
  const M_SUN = mass.sunMassKg;

  return { GM_EARTH_ALONE, GM_EARTH_MOON_SYSTEM, GM_MOON_ALONE, GM_SUN, GM_SUN_PLUS_EARTH, G_CONSTANT, MASS_RATIO_EARTH_MOON, M_SUN, axialPrecessionJ2000Days, currentAUDistance, meanLengthOfDay, meanSiderealYearDays, meanSolarYearDays, meanTropicalYearJ2000Seconds, moonDistanceCorrected, moonDistanceKm, moonOrbitalShift, moonSiderealMonth, moonSiderealMonthInput, startmodelJD, startmodelYear };
}
/** @typedef {import('./context.js').ModelInputs & ReturnType<typeof assembleDerivedConstants>} Ctx */
