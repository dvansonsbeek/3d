export type ClimateL1Regime = {
    /**
     * - 8H-lattice
     * harmonics (n = cycles per 8H)
     */
    l1Terms: Array<{
        n: number;
        a: number;
        b: number;
    }>;
    /**
     * - the fit's y_std scale-back
     */
    yStdDenormalization: number;
    /**
     * - 8H in kyr (the fit's period base)
     */
    eightHKyr: number;
};
/**
 * @typedef {Object} ClimateL1Regime
 * @property {Array<{n: number, a: number, b: number}>} l1Terms - 8H-lattice
 *   harmonics (n = cycles per 8H)
 * @property {number} yStdDenormalization - the fit's y_std scale-back
 * @property {number} eightHKyr - 8H in kyr (the fit's period base)
 */
/**
 * @param {number} year - calendar year
 * @param {ClimateL1Regime} regime
 * @returns {number} L1 orbital δ¹⁸O contribution, ‰
 */
export function evalClimateL1OrbitalPermil(year: number, regime: ClimateL1Regime): number;
