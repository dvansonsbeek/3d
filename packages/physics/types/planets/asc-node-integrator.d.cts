/**
 * @param {{ ascendingNodeDeg: number, inclinationDeg: number }} tilt —
 *   static node and inclination (engine-decomposed from its scene scheme)
 * @param {number} currentYear
 * @param {{
 *   obliquityAt: (year: number) => number,
 *   earthInclinationAt: (year: number) => number,
 *   obliquityExtremaInRange: (yearMin: number, yearMax: number) => number[],
 *   inclinationCrossingsInRange: (inclinationDeg: number, yearMin: number, yearMax: number) => number[],
 *   eclipticInclinationAt: ((year: number) => number) | null,
 *   earthInclinationMeanDeg: number,
 *   earthInclinationAmplitudeDeg: number,
 *   epochYear?: number,
 * }} deps — eclipticInclinationAt non-null enables the dynamic-inclination
 *   crossover search and per-segment rates (the planetName path).
 * @returns {number} dynamic ascending node longitude, degrees 0–360
 */
export function integrateAscendingNode(tilt: {
    ascendingNodeDeg: number;
    inclinationDeg: number;
}, currentYear: number, deps: {
    obliquityAt: (year: number) => number;
    earthInclinationAt: (year: number) => number;
    obliquityExtremaInRange: (yearMin: number, yearMax: number) => number[];
    inclinationCrossingsInRange: (inclinationDeg: number, yearMin: number, yearMax: number) => number[];
    eclipticInclinationAt: ((year: number) => number) | null;
    earthInclinationMeanDeg: number;
    earthInclinationAmplitudeDeg: number;
    epochYear?: number;
}): number;
