/**
 * @param {object} opts
 * @param {(year: number) => {e: number, periOfDateDeg: number}} opts.sampleAt
 *   the one-source history sampler (createDeepOrbitalHistory build().at,
 *   year-keyed by the caller)
 * @param {(year: number) => number} opts.tropicalYearSecondsAtYearFn
 *   the movement's mean tropical year of date, SI SECONDS (see header)
 */
export function createCardinalStructure({ sampleAt, tropicalYearSecondsAtYearFn }: {
    sampleAt: (year: number) => {
        e: number;
        periOfDateDeg: number;
    };
    tropicalYearSecondsAtYearFn: (year: number) => number;
}): {
    eocOffsetSeconds: (year: number, type: "VE" | "SS" | "AE" | "WS") => number;
    yearLengthSeconds: (year: number, type: "VE" | "SS" | "AE" | "WS") => number;
    spreadSeconds: (year: number) => {
        VE: number;
        SS: number;
        AE: number;
        WS: number;
        meanSeconds: number;
    };
    anomalisticYearSeconds: (year: number) => number;
};
/**
 * Equation of center in degrees, to e⁴ (the computeSunPositionFast family).
 * @param {number} e eccentricity
 * @param {number} meanAnomalyDeg
 * @returns {number} degrees
 */
export function equationOfCenterDeg(e: number, meanAnomalyDeg: number): number;
/** Cardinal longitudes, equinox of date. @type {Record<string, number>} */
export const CARDINAL_LONGITUDE_DEG: Record<string, number>;
