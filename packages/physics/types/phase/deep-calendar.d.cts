export type DeepCalendar = {
    /**
     * SI-tropical-year label for a
     * JD, anchored at startModelYearWithCorrection — NOT a calendar year (the
     * scene's precession rotations integrate on this axis; a fit on it agrees
     * with the runtime by construction; the round-trip bias Y_SI − Y is −11.0 yr
     * at −302,635 and grows quadratically).
     */
    jdToSIyear: (jd: number) => number;
    /**
     * the exact inverse of jdToSIyear.
     */
    siYearToJD: (ySI: number) => number;
    /**
     * builds the ∫ daysPerYear dt table
     * (idempotent; under the pinned α).
     */
    ensureCumulDaysTable: () => void;
    /**
     * calendar year → JD,
     * integrating days-per-year from startModelYear; null outside the table
     * domain or past the tidal-lock asymptote; startModelJD exactly at
     * year = startModelYear.
     */
    yearToJD: (year: number) => (number | null);
    /**
     * diagnostic — the
     * table length once built, null before.
     */
    cumulDaysTableLength: () => (number | null);
    /**
     * the TT instant (SI
     * days) of a year of date — the position table, normalised, analytic partial
     * cell; null out of domain or without a `meanTropicalYearDaysAtAgeMa` source
     * (plan 27, doc 111 §1.36).
     */
    yearToJDTT: (year: number) => (number | null);
    /**
     * the exact inverse of yearToJDTT.
     */
    jdTTToYear: (jd: number) => (number | null);
    /**
     * the UT Julian Day (the
     * solar-day count the UT clock keeps) of a year of date: its TT instant minus the
     * full ΔT there; null out of domain.
     */
    yearToJDUT: (year: number) => (number | null);
    /**
     * the year of date a UT
     * Julian Day has reached — the inverse of yearToJDUT through the implicit bridge.
     */
    jdUTToYear: (jdUT: number) => (number | null);
    /**
     * THE BRIDGE: ΔT at a
     * UT Julian Day — the raw integral at the TT age the count has reached, the era
     * corrections at the civil year; null without a `deltaTSecondsAtAges` source.
     */
    deltaTSecondsAtJdUT: (jdUT: number) => (number | null);
    /**
     * ΔT at a TT instant.
     */
    deltaTSecondsAtJdTT: (jdTT: number) => (number | null);
    /**
     * the first
     * and last years the position table defines — the ONE navigable edge.
     */
    navigableYearRange: () => {
        yearMin: number;
        yearMax: number;
    };
};
/**
 * @typedef {Object} DeepCalendar
 * @property {(jd: number) => number} jdToSIyear SI-tropical-year label for a
 *   JD, anchored at startModelYearWithCorrection — NOT a calendar year (the
 *   scene's precession rotations integrate on this axis; a fit on it agrees
 *   with the runtime by construction; the round-trip bias Y_SI − Y is −11.0 yr
 *   at −302,635 and grows quadratically).
 * @property {(ySI: number) => number} siYearToJD the exact inverse of jdToSIyear.
 * @property {() => void} ensureCumulDaysTable builds the ∫ daysPerYear dt table
 *   (idempotent; under the pinned α).
 * @property {(year: number) => (number | null)} yearToJD calendar year → JD,
 *   integrating days-per-year from startModelYear; null outside the table
 *   domain or past the tidal-lock asymptote; startModelJD exactly at
 *   year = startModelYear.
 * @property {() => (number | null)} cumulDaysTableLength diagnostic — the
 *   table length once built, null before.
 * @property {(year: number) => (number | null)} yearToJDTT the TT instant (SI
 *   days) of a year of date — the position table, normalised, analytic partial
 *   cell; null out of domain or without a `meanTropicalYearDaysAtAgeMa` source
 *   (plan 27, doc 111 §1.36).
 * @property {(jd: number) => (number | null)} jdTTToYear the exact inverse of yearToJDTT.
 * @property {(year: number) => (number | null)} yearToJDUT the UT Julian Day (the
 *   solar-day count the UT clock keeps) of a year of date: its TT instant minus the
 *   full ΔT there; null out of domain.
 * @property {(jdUT: number) => (number | null)} jdUTToYear the year of date a UT
 *   Julian Day has reached — the inverse of yearToJDUT through the implicit bridge.
 * @property {(jdUT: number) => (number | null)} deltaTSecondsAtJdUT THE BRIDGE: ΔT at a
 *   UT Julian Day — the raw integral at the TT age the count has reached, the era
 *   corrections at the civil year; null without a `deltaTSecondsAtAges` source.
 * @property {(jdTT: number) => (number | null)} deltaTSecondsAtJdTT ΔT at a TT instant.
 * @property {() => {yearMin: number, yearMax: number}} navigableYearRange the first
 *   and last years the position table defines — the ONE navigable edge.
 */
/**
 * @param {{
 *   meanYearInDaysAtAgeMa: (tMa: number) => (number | null),
 *   meanTropicalYearDaysAtAgeMa?: ((tMa: number) => (number | null)) | null,
 *   withLatticeAlpha: (build: () => void) => void,
 *   withShippedAlpha?: ((build: () => void) => void) | null,
 *   deltaTSecondsAtAges?: ((tMaRaw: number, tMaCorrections: number) => number) | null,
 *   startModelJD: number,
 *   startModelYear: number,
 *   startModelYearWithCorrection: number,
 *   siTropicalYearDays: number,
 *   yearMin?: number,
 *   yearMax?: number,
 *   stepYears?: number,
 * }} deps — `meanYearInDaysAtAgeMa` is the engine's days-per-year source
 *   (the LOD channel's `yearInDaysAtAge`); `withLatticeAlpha` the engine's
 *   R2 pin; `startModelYear` is the table zero (2000.5) and
 *   `startModelYearWithCorrection` the SI-axis anchor (≈ 2000.4977) — two
 *   different constants, do not unify; the grid (±500 Myr, 10-kyr cells)
 *   is the engines' deep-time grid — the table zero sits at the cell
 *   nearest `startModelYear`.
 * @returns {DeepCalendar}
 */
export function createDeepCalendar({ meanYearInDaysAtAgeMa, meanTropicalYearDaysAtAgeMa, withLatticeAlpha, withShippedAlpha, deltaTSecondsAtAges, startModelJD, startModelYear, startModelYearWithCorrection, siTropicalYearDays, yearMin, yearMax, stepYears, }: {
    meanYearInDaysAtAgeMa: (tMa: number) => (number | null);
    meanTropicalYearDaysAtAgeMa?: ((tMa: number) => (number | null)) | null;
    withLatticeAlpha: (build: () => void) => void;
    withShippedAlpha?: ((build: () => void) => void) | null;
    deltaTSecondsAtAges?: ((tMaRaw: number, tMaCorrections: number) => number) | null;
    startModelJD: number;
    startModelYear: number;
    startModelYearWithCorrection: number;
    siTropicalYearDays: number;
    yearMin?: number;
    yearMax?: number;
    stepYears?: number;
}): DeepCalendar;
