export type PeriodSecondsAtAge = (tMa: number) => (number | null);
/**
 * @typedef {(tMa: number) => (number | null)} PeriodSecondsAtAge
 */
/**
 * @param {{
 *   ageAnchorYear: number,
 *   tropicalYearSecondsAtAge: (tMa: number) => (number | null),
 *   tropicalYearJ2000Seconds: number,
 *   isDeepTime: () => boolean,
 *   gridMinYear?: number,
 *   gridMaxYear?: number,
 *   gridStepYears?: number,
 *   gridAnchorYear?: number,
 *   maxCacheEntries?: number,
 * }} deps — ageAnchorYear is the year whose age is 0 in the period
 *   functions' t_Ma coordinate (startmodelYear = 2000.5, the certified
 *   convention); tropicalYearJ2000Seconds feeds the snapshot branch;
 *   isDeepTime is read PER CALL so the engine's runtime toggle works.
 */
export function createChainCycleIntegrator({ ageAnchorYear, tropicalYearSecondsAtAge, tropicalYearJ2000Seconds, isDeepTime, gridMinYear, gridMaxYear, gridStepYears, gridAnchorYear, maxCacheEntries, }: {
    ageAnchorYear: number;
    tropicalYearSecondsAtAge: (tMa: number) => (number | null);
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
