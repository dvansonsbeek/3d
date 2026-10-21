/**
 * The Moon at epoch — the solar-Δa-corrected Kepler month.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */

/** @param {import('./one-source-movement.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleMoonEpoch(ctx) {
  const {
    EPOCH_PARAMS, MASS_RATIO_EARTH_MOON, deepLod, moonDistanceMetresAtAge, moonSiderealMonthInput, yearToTMa,
  } = ctx;
  /** Solar-Δa-corrected Kepler month. @param {number} year @returns {number} */
  const moonSiderealMonthDaysAt = (year) => {
    const tMa = yearToTMa(year);
    const lod = deepLod.lodSecondsAtAge(tMa);
    const aAppM = moonDistanceMetresAtAge(tMa);
    if (lod === null || aAppM === null) return NaN;
    const aAppKm = aAppM / 1000;
    const sidYrDays = deepLod.siderealYearSecondsAtAge(tMa) / lod;
    const deltaA = aAppKm * (1 / (MASS_RATIO_EARTH_MOON + 1)) * (moonSiderealMonthInput / sidYrDays);
    const aCorrM = (aAppKm + deltaA) * 1000;
    const monthSeconds = 2 * Math.PI * Math.sqrt(Math.pow(aCorrM, 3) / EPOCH_PARAMS.gmEarthMoonM3S2);
    return monthSeconds / lod;
  };

  return { moonSiderealMonthDaysAt };
}
/** @typedef {import('./one-source-movement.js').Ctx & ReturnType<typeof assembleMoonEpoch>} Ctx */
