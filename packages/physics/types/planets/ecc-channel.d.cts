/**
 * The law of cosines over resolved cycles. null cycles → the MEAN
 * eccentricity √(base² + amp²) (past the tidal-lock asymptote).
 * @param {number | null} cycles @param {number} base @param {number} amplitude
 * @returns {number} */
export function eccentricityFromCycles(cycles: number | null, base: number, amplitude: number): number;
/**
 * Browser-convention evaluator: J2000-FIXED anchor + cycle length, divisor
 * N = H_J2000/cycleLength, integrated phase via the injected engine
 * cyclesBetween (toggle semantics ride along), null → mean.
 * @param {number} currentYear @param {number} anchorYearJ2000
 * @param {number} cycleLengthYearsJ2000 @param {number} base
 * @param {number} amplitude
 * @param {{ holisticYearJ2000: number,
 *   cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null) }} env
 * @returns {number} */
export function computeEccentricityIntegrated(currentYear: number, anchorYearJ2000: number, cycleLengthYearsJ2000: number, base: number, amplitude: number, env: {
    holisticYearJ2000: number;
    cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null);
}): number;
