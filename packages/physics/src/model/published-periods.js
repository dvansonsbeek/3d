/**
 * The published periods of date — the seamed precession period, tropical year and sidereal year (one-family inside the window, the deep chain beyond).
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { ONE_FAMILY_WINDOW_YEARS } from '../earth/year-lengths.cjs';

/** @param {import('./sun-and-eclipses.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePublishedPeriods(ctx) {
  const { certifiedAxialPrecessionJ2000Years, deepLod, yearLengthsM, yearToTMa } = ctx;
  // THE published of-date precession period and mean
  // tropical year: the one-family route (B) inside the banked tiers
  // (|Δyear| ≤ ONE_FAMILY_WINDOW_YEARS), the composed lunisolar period
  // beyond (S5: on the derived J2000 anchor, so the two faces agree at
  // 25,771.4 at J2000 and the deep tail is the same clock scaled; the
  // tidal-chain year). Shared by `epoch` and `lunisolar`.
  /** @param {number} year @returns {number} */
  const publishedAxialPrecessionYearsAtYear = (year) => {
    if (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS) return yearLengthsM.axialPrecessionYearsAtYear(year);
    const p = deepLod.lunisolarPrecessionPeriodYearsAtAge(yearToTMa(year));
    return p === null ? certifiedAxialPrecessionJ2000Years() : p;
  };
  /** @param {number} year @returns {number} */
  const publishedTropicalYearSecondsAtYear = (year) => {
    if (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS) return yearLengthsM.tropicalYearSecondsAtYear(year);
    return deepLod.tropicalYearSecondsAtAge(yearToTMa(year));
  };
  /** The published sidereal year of date, SI seconds — the one-family λ̇
   *  channel inside the window, the mass-loss law beyond (plan 09: the
   *  `lengths` surface's days ride it). @param {number} year @returns {number} */
  const publishedSiderealYearSecondsAtYear = (year) => {
    if (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS) return yearLengthsM.siderealYearSecondsAtYear(year);
    return deepLod.siderealYearSecondsAtAge(yearToTMa(year));
  };

  return { publishedAxialPrecessionYearsAtYear, publishedSiderealYearSecondsAtYear, publishedTropicalYearSecondsAtYear };
}
/** @typedef {import('./sun-and-eclipses.js').Ctx & ReturnType<typeof assemblePublishedPeriods>} Ctx */
