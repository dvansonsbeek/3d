/**
 * The J2000 precession anchor p₀; the kinematic day of date and the year lengths in days of the epoch.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { ONE_FAMILY_WINDOW_YEARS } from '../earth/year-lengths.cjs';

/** @param {import('./earth-scalars.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleYearDayLengths(ctx) {
  const { C, late, deepLod, meanLengthOfDay, yearToTMa } = ctx;
  // The year lengths of date in DAYS are the published SI year lengths over
  // the kinematic day of date; the kinematic day of date is the Layer-0 tidal
  // mean LOD, exactly ω₀ (the SI day) at J2000.
  /** THE J2000 precession anchor p₀: the IAU 2006 general precession in
   * longitude at J2000 (astro-reference.json
   * earthOrbital.generalPrecessionJ2000_arcsecPerYr = 50.28796195 ″/yr),
   * stated as the period 1,296,000/p_A = 25,771.575 Julian years. ONE home:
   * the composed clock's p₀, the hybrid's self-anchor and the lunisolar
   * surface all read it (the identifier predates the anchor's move onto the
   * IAU input). @returns {number} */
  function certifiedAxialPrecessionJ2000Years() {
    return 1296000 / C.earthOrbital.generalPrecessionJ2000_arcsecPerYr;
  }
  /** Kinematic day of date (Layer 0 tidal mean LOD; ω₀ at J2000). Past the
   *  tidal-lock asymptote the chain is null — the J2000 day stands in.
   *  @param {number} year @returns {number} */
  const dayLengthSeconds = (year) => deepLod.lodSecondsAtAge(yearToTMa(year)) ?? meanLengthOfDay;
  /** Sidereal year of date in days of the epoch — the published SI sidereal
   *  year (the λ̇ channel inside the one-family window, the mass-loss law
   *  beyond) over the kinematic day of date. @param {number} year @returns {number} */
  const siderealYearDays = (year) => late.publishedSiderealYearSecondsAtYear(year) / dayLengthSeconds(year);
  /** Anomalistic year of date in days of the epoch — the published SI
   *  anomalistic year (one-family inside its window; NaN beyond, where the
   *  movement's apsidal line is not resolved). @param {number} year @returns {number} */
  const anomalisticYearDays = (year) => {
    const s = Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS ? late.yearLengthsM.anomalisticYearSecondsAtYear(year) : NaN;
    return s / dayLengthSeconds(year);
  };

  return { anomalisticYearDays, certifiedAxialPrecessionJ2000Years, dayLengthSeconds, siderealYearDays };
}
/** @typedef {import('./earth-scalars.js').Ctx & ReturnType<typeof assembleYearDayLengths>} Ctx */
