export type SunLongitudeCorrectionDeps = {
    /**
     * - H, J2000-fixed (the fitted axis)
     */
    hYears: number;
    /**
     * - J2000-fixed
     */
    balancedYear: number;
    j2000JD: number;
    /**
     * - the fitted mean offset
     */
    meanDeg: number;
    /**
     * - [divisor, sinC, cosC]
     */
    harmonics: Array<[number, number, number]>;
    /**
     * - lunar nodal divisor (per 8H convention)
     */
    nNodalJ2000: number;
    /**
     * - lunar apsidal divisor
     */
    nApsidalJ2000: number;
};
/**
 * @typedef {Object} SunLongitudeCorrectionDeps
 * @property {number} hYears - H, J2000-fixed (the fitted axis)
 * @property {number} balancedYear - J2000-fixed
 * @property {number} j2000JD
 * @property {number} meanDeg - the fitted mean offset
 * @property {Array<[number, number, number]>} harmonics - [divisor, sinC, cosC]
 * @property {number} nNodalJ2000 - lunar nodal divisor (per 8H convention)
 * @property {number} nApsidalJ2000 - lunar apsidal divisor
 */
/** @param {SunLongitudeCorrectionDeps} deps */
export function createSunLongitudeCorrection(deps: SunLongitudeCorrectionDeps): {
    correctionDegAt: (jd: number) => number;
};
