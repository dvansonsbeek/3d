export type PhaseMachinery = {
    ensureTable: () => void;
    cumulAtYear: (year: number) => (number | null);
    yearAtCumul: (targetCumul: number) => (number | null);
    grid: () => {
        yearMin: number;
        yearMax: number;
        stepYears: number;
        j2000Idx: number;
        length: number;
    };
};
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
     *   inverse of the phase machinery's cumulAtYear — null outside the table.
     */
    yearAtCumulIntegral: (targetCumul: number) => (number | null);
    /**
     * builds the ∫ daysPerYear dt table
     * (idempotent; under the lattice α).
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
     *   calendar year of the k-th H-balanced event, k = 0 being `balancedYear`;
     *   negative k = past; null outside the table domain.
     */
    balancedYearAtCycle: (cycleOffset: number) => (number | null);
    /**
     * diagnostic — the
     * table length once built, null before.
     */
    cumulDaysTableLength: () => (number | null);
};
/**
 * @typedef {Object} PhaseMachinery
 * @property {() => void} ensureTable
 * @property {(year: number) => (number | null)} cumulAtYear
 * @property {(targetCumul: number) => (number | null)} yearAtCumul
 * @property {() => {yearMin: number, yearMax: number, stepYears: number, j2000Idx: number, length: number}} grid
 */
/**
 * @typedef {Object} DeepCalendar
 * @property {(jd: number) => number} jdToSIyear SI-tropical-year label for a
 *   JD, anchored at startModelYearWithCorrection — NOT a calendar year (the
 *   scene's precession rotations integrate on this axis; a fit on it agrees
 *   with the runtime by construction; the round-trip bias Y_SI − Y is −11.0 yr
 *   at −302,635 and grows quadratically).
 * @property {(ySI: number) => number} siYearToJD the exact inverse of jdToSIyear.
 * @property {(targetCumul: number) => (number | null)} yearAtCumulIntegral
 *   inverse of the phase machinery's cumulAtYear — null outside the table.
 * @property {() => void} ensureCumulDaysTable builds the ∫ daysPerYear dt table
 *   (idempotent; under the lattice α).
 * @property {(year: number) => (number | null)} yearToJD calendar year → JD,
 *   integrating days-per-year from startModelYear; null outside the table
 *   domain or past the tidal-lock asymptote; startModelJD exactly at
 *   year = startModelYear.
 * @property {(cycleOffset: number) => (number | null)} balancedYearAtCycle
 *   calendar year of the k-th H-balanced event, k = 0 being `balancedYear`;
 *   negative k = past; null outside the table domain.
 * @property {() => (number | null)} cumulDaysTableLength diagnostic — the
 *   table length once built, null before.
 */
/**
 * @param {{
 *   phase: () => PhaseMachinery,
 *   meanYearInDaysAtAgeMa: (tMa: number) => (number | null),
 *   withLatticeAlpha: (build: () => void) => void,
 *   startModelJD: number,
 *   startModelYear: number,
 *   startModelYearWithCorrection: number,
 *   siTropicalYearDays: number,
 *   balancedYear: number,
 *   hJ2000: number,
 *   cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 * }} deps — `phase` is the engine's (lazily built) phase machinery, whose
 *   grid the days table shares; `meanYearInDaysAtAgeMa` the engine's
 *   days-per-year source (the LOD channel's `yearInDaysAtAge`);
 *   `withLatticeAlpha` the engine's R2 pin; `cyclesBetween` the engine's
 *   cycle counter (the browser passes its toggle-aware form, Node the
 *   integrated form — the caller's convention, preserved); `startModelYear`
 *   is the table zero (2000.5) and `startModelYearWithCorrection` the SI-axis
 *   anchor (≈ 2000.4977) — two different constants, do not unify.
 * @returns {DeepCalendar}
 */
export function createDeepCalendar({ phase, meanYearInDaysAtAgeMa, withLatticeAlpha, startModelJD, startModelYear, startModelYearWithCorrection, siTropicalYearDays, balancedYear, hJ2000, cyclesBetween, }: {
    phase: () => PhaseMachinery;
    meanYearInDaysAtAgeMa: (tMa: number) => (number | null);
    withLatticeAlpha: (build: () => void) => void;
    startModelJD: number;
    startModelYear: number;
    startModelYearWithCorrection: number;
    siTropicalYearDays: number;
    balancedYear: number;
    hJ2000: number;
    cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null);
}): DeepCalendar;
