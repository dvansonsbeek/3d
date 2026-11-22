export type ClimateL1Line = {
    period_kyr: number;
    a: number;
    b: number;
};
export type ClimateL2Line = {
    p_kyr: number;
    a: number;
    b: number;
};
export type ClimateL3Step = {
    t_kyr: number;
    beta: number;
};
export type ClimateFormulaRegime = {
    intercept: number;
    /**
     * - the orbital lines (kyr periods, fitted cos/sin coefficients)
     */
    L1: ClimateL1Line[];
    /**
     * - the 405-kyr family (empty in the shipped file)
     */
    L2: ClimateL2Line[];
    /**
     * - the regime steps (β added at every t ≥ t_kyr)
     */
    L3: ClimateL3Step[];
    denormalization: {
        y_std: number;
        y_mean: number;
        trend_slope: number;
        trend_intercept: number;
    };
};
export type ClimateFormulaCoefficients = {
    regimes: Record<string, ClimateFormulaRegime>;
};
/**
 * - a marker: kyr after 2000 AD, δ¹⁸O ‰
 */
export type ClimateForwardMarker = {
    kyrFromNow: number;
    permil: number;
};
export type ClimateForwardMarkerRule = {
    /**
     * - the regime whose lines are carried forward
     */
    regimeKey: string;
    /**
     * - the figure's window, kyr BP (negative = after 2000 AD)
     */
    windowKyrBP: readonly [number, number];
    /**
     * - samples across the window (the grid is their quotient)
     */
    samples: number;
    /**
     * - the neighbourhood an extremum must dominate, each side, in samples
     */
    halfWidthSamples: number;
    /**
     * - the least excursion against the neighbourhood ends' mean
     */
    prominencePermil: number;
    /**
     * - a glacial marker's least δ¹⁸O
     */
    glacialMinPermil: number;
    /**
     * - an interglacial marker's greatest δ¹⁸O
     */
    interglacialMaxPermil: number;
};
/** @typedef {{ period_kyr: number, a: number, b: number }} ClimateL1Line */
/** @typedef {{ p_kyr: number, a: number, b: number }} ClimateL2Line */
/** @typedef {{ t_kyr: number, beta: number }} ClimateL3Step */
/**
 * @typedef {Object} ClimateFormulaRegime
 * @property {number} intercept
 * @property {ClimateL1Line[]} L1 - the orbital lines (kyr periods, fitted cos/sin coefficients)
 * @property {ClimateL2Line[]} L2 - the 405-kyr family (empty in the shipped file)
 * @property {ClimateL3Step[]} L3 - the regime steps (β added at every t ≥ t_kyr)
 * @property {{ y_std: number, y_mean: number, trend_slope: number, trend_intercept: number }} denormalization
 */
/** @typedef {{ regimes: Record<string, ClimateFormulaRegime> }} ClimateFormulaCoefficients */
/** @typedef {{ kyrFromNow: number, permil: number }} ClimateForwardMarker - a marker: kyr after 2000 AD, δ¹⁸O ‰ */
/**
 * @typedef {Object} ClimateForwardMarkerRule
 * @property {string} regimeKey - the regime whose lines are carried forward
 * @property {readonly [number, number]} windowKyrBP - the figure's window, kyr BP (negative = after 2000 AD)
 * @property {number} samples - samples across the window (the grid is their quotient)
 * @property {number} halfWidthSamples - the neighbourhood an extremum must dominate, each side, in samples
 * @property {number} prominencePermil - the least excursion against the neighbourhood ends' mean
 * @property {number} glacialMinPermil - a glacial marker's least δ¹⁸O
 * @property {number} interglacialMaxPermil - an interglacial marker's greatest δ¹⁸O
 */
/** @type {ClimateForwardMarkerRule} */
export const CLIMATE_FORWARD_MARKER_RULE: ClimateForwardMarkerRule;
/**
 * The canonical formula in the proxy's own units at age t (kyr BP), one regime.
 * Every layer line carries the L3 steps (they define the regime's baseline):
 *   layer 'l1'  → intercept + L1 + L3
 *   layer 'all' → intercept + L1 + L2 + L3 (the total; L2 is empty in the shipped file)
 * @param {ClimateFormulaCoefficients} coeffs
 * @param {number} tKyrBP
 * @param {string} regimeKey
 * @param {'l1' | 'all' | string} layer
 * @returns {number} the proxy value (δ¹⁸O ‰ for the LR04 regimes), NaN for an unknown regime
 */
export function evalClimateFormulaProxyUnits(coeffs: ClimateFormulaCoefficients, tKyrBP: number, regimeKey: string, layer: "l1" | "all" | string): number;
/**
 * Local maxima ('max') or minima ('min') of a sampled curve: a sample that
 * strictly dominates every sample within halfWidth on BOTH sides, with an
 * excursion of at least `prominence` against the mean of the two neighbourhood
 * ends. The first and last halfWidth samples cannot qualify (the edge margin).
 * @param {number[]} t
 * @param {number[]} vals
 * @param {'max' | 'min'} type
 * @param {number} prominence - in the curve's units
 * @param {number} halfWidth - in samples
 * @returns {Array<{ t: number, v: number }>}
 */
export function findExtrema(t: number[], vals: number[], type: "max" | "min", prominence: number, halfWidth: number): Array<{
    t: number;
    v: number;
}>;
/**
 * The forward figure's markers under the rule: the glacial maxima and the
 * interglacial peaks of the formula carried past 2000 AD, each sorted by time
 * from now, with the grid, the edge margin and the curve's own extremes over
 * the forward half (the window minimum lies inside the margin and is unmarked).
 * @param {ClimateFormulaCoefficients} coeffs
 * @param {ClimateForwardMarkerRule} [rule]
 * @returns {{ rule: ClimateForwardMarkerRule, gridKyr: number, edgeMarginKyr: number, glacials: ClimateForwardMarker[], interglacials: ClimateForwardMarker[], curveMaximum: ClimateForwardMarker, curveMinimum: ClimateForwardMarker }}
 */
export function computeClimateForwardExtrema(coeffs: ClimateFormulaCoefficients, rule?: ClimateForwardMarkerRule): {
    rule: ClimateForwardMarkerRule;
    gridKyr: number;
    edgeMarginKyr: number;
    glacials: ClimateForwardMarker[];
    interglacials: ClimateForwardMarker[];
    curveMaximum: ClimateForwardMarker;
    curveMinimum: ClimateForwardMarker;
};
