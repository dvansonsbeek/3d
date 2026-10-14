export type PeriodSecondsAtAge = (tMa: number) => (number | null);
/**
 * @typedef {(tMa: number) => (number | null)} PeriodSecondsAtAge
 */
/**
 * @param {{
 *   ageAnchorYear: number,
 *   tropicalYearJ2000Seconds: number,
 *   isDeepTime: () => boolean,
 *   gridMinYear?: number,
 *   gridMaxYear?: number,
 *   gridStepYears?: number,
 *   gridAnchorYear?: number,
 *   maxCacheEntries?: number,
 * }} deps — ageAnchorYear is the year whose age is 0 in the period
 *   functions' t_Ma coordinate (startmodelYear = 2000.5, the certified
 *   convention); tropicalYearJ2000Seconds is the length of ONE tick of the
 *   year axis the integrator is fed — the linear SI-year label, each tick
 *   exactly one J2000 tropical year of seconds — so it is the integrand's
 *   weight in BOTH branches (plan 09 step 7c′: the deep branch had weighted
 *   each tick by the tropical year OF DATE, adding that year's deep-time
 *   drift to every lunar count — ~5° of Moon at ±100 kyr, ~1.3 orbits at
 *   1 Ma — although the tick itself never changes length; the owner's call:
 *   a plain correctness fix, the tick already is an SI tick);
 *   isDeepTime is read PER CALL so the engine's runtime toggle works.
 */
export function createChainCycleIntegrator({ ageAnchorYear, tropicalYearJ2000Seconds, isDeepTime, gridMinYear, gridMaxYear, gridStepYears, gridAnchorYear, maxCacheEntries, }: {
    ageAnchorYear: number;
    tropicalYearJ2000Seconds: number;
    isDeepTime: () => boolean;
    gridMinYear?: number;
    gridMaxYear?: number;
    gridStepYears?: number;
    gridAnchorYear?: number;
    maxCacheEntries?: number;
}): {
    cyclesBetween: (periodFnSeconds: PeriodSecondsAtAge, yearA: number, yearB: number) => number | null;
};
