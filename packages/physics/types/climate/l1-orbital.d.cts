export type ClimateL1Regime = {
    /**
     * - the
     * L1 lines: periods in kyr (the engine's own orbital lines + the 405-kyr
     * family — data/l1-physical-lines.json, ONE home) with fitted cos/sin
     * coefficients
     */
    l1Terms: Array<{
        period_kyr: number;
        a: number;
        b: number;
    }>;
    /**
     * - the fit's y_std scale-back
     */
    yStdDenormalization: number;
};
/**
 * @typedef {Object} ClimateL1Regime
 * @property {Array<{period_kyr: number, a: number, b: number}>} l1Terms - the
 *   L1 lines: periods in kyr (the engine's own orbital lines + the 405-kyr
 *   family — data/l1-physical-lines.json, ONE home) with fitted cos/sin
 *   coefficients
 * @property {number} yStdDenormalization - the fit's y_std scale-back
 */
/**
 * @param {number} year - calendar year
 * @param {ClimateL1Regime} regime
 * @returns {number} L1 orbital δ¹⁸O contribution, ‰
 */
export function evalClimateL1OrbitalPermil(year: number, regime: ClimateL1Regime): number;
/**
 * The GIA channel — the polar moment's LAGGED response to the ice history the
 * L1 layer proxies (holisticuniverse plan 06, D7). The solid Earth responds to
 * an ice load through the mantle's viscoelastic relaxation, so
 *
 *   α(t) = α₀ − k · [ L1(t) − ⟨L1⟩_τ(t) ]
 *
 * with ⟨L1⟩_τ the causal exponential average over the PAST (time constant τ).
 * Every L1 line passes that filter as a line, Ĉ' = Ĉ · iωτ/(1 + iωτ) with
 * Ĉ = a + ib in physical time, so the evaluator stays a sinusoid sum and each
 * runtime's lattice-α pin and memo are untouched. k > 0 is the direct-load
 * sign (an uncompensated ice load lowers α); after a rapid deglaciation
 * L1 − ⟨L1⟩ < 0, α sits above equilibrium and relaxes for ~τ — today's
 * −0.35 ms/cy non-tidal drift is that tail. k is DERIVED at construction so
 * that dα/dt(J2000) equals the satellite-gravimetry rate (Cox & Chao 2002
 * dJ₂/dt ÷ the Peltier J₂→α factor): no stored scale. τ was MEASURED against
 * the historical ΔT record through the joint fitter (optimum 5–6 kyr,
 * the degree-2 Maxwell estimate; plan 06 D7 record). Replaces the
 * instantaneous α ∝ L1 law, which had the deglacial transient's sign and
 * timing backwards and depended on fitted comb lines the T1 test retired.
 *
 * @param {Array<{period_kyr: number, a: number, b: number}>} l1Terms
 * @param {number} relaxationKyr - τ in kyr
 * @returns {Array<{period_kyr: number, a: number, b: number}>}
 */
export function laggedL1Terms(l1Terms: Array<{
    period_kyr: number;
    a: number;
    b: number;
}>, relaxationKyr: number): Array<{
    period_kyr: number;
    a: number;
    b: number;
}>;
/**
 * @param {{
 *   l1Terms: Array<{period_kyr: number, a: number, b: number}>,
 *   yStdDenormalization: number,
 *   relaxationKyr: number,
 *   alphaGiaRateJ2000PerYr: number,
 *   alphaJ2000: number,
 * }} cfg - relaxationKyr and alphaGiaRateJ2000PerYr are model-parameters
 *   deepTime constants; alphaJ2000 the IERS moment-of-inertia factor
 * @returns {{
 *   alphaAt: (year: number) => number,
 *   laggedL1PermilAt: (year: number) => number,
 *   kPerPermille: number,
 *   relaxationKyr: number,
 *   laggedL1Terms: Array<{period_kyr: number, a: number, b: number}>,
 * }}
 */
export function createAlphaGiaChannel({ l1Terms, yStdDenormalization, relaxationKyr, alphaGiaRateJ2000PerYr, alphaJ2000 }: {
    l1Terms: Array<{
        period_kyr: number;
        a: number;
        b: number;
    }>;
    yStdDenormalization: number;
    relaxationKyr: number;
    alphaGiaRateJ2000PerYr: number;
    alphaJ2000: number;
}): {
    alphaAt: (year: number) => number;
    laggedL1PermilAt: (year: number) => number;
    kPerPermille: number;
    relaxationKyr: number;
    laggedL1Terms: Array<{
        period_kyr: number;
        a: number;
        b: number;
    }>;
};
