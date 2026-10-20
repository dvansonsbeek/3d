export type MeanObliquityTable = {
    /**
     * - ascending, 0 first, uniform 1-Myr step
     */
    ageMa: ReadonlyArray<number>;
    /**
     * - the cited mean obliquity column, degrees
     */
    obliquityDeg: ReadonlyArray<number>;
};
/**
 * @typedef {Object} MeanObliquityTable
 * @property {ReadonlyArray<number>} ageMa - ascending, 0 first, uniform 1-Myr step
 * @property {ReadonlyArray<number>} obliquityDeg - the cited mean obliquity column, degrees
 */
/**
 * @param {{ table: MeanObliquityTable }} deps
 * @returns {{
 *   meanObliquityDegAtAge: (tMa: number) => number|null,
 *   cosRatioAtAge: (tMa: number) => number|null,
 *   meanObliquityJ2000Deg: number,
 *   spanMa: number,
 * }}
 */
export function createMeanObliquityHistory(deps: {
    table: MeanObliquityTable;
}): {
    meanObliquityDegAtAge: (tMa: number) => number | null;
    cosRatioAtAge: (tMa: number) => number | null;
    meanObliquityJ2000Deg: number;
    spanMa: number;
};
