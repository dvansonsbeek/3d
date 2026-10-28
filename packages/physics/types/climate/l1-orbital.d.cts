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
 * The GIA channel — the polar moment's LAGGED response to the ICE-VOLUME history
 * (holisticuniverse plans 06 and 26). The solid Earth responds to an ice load
 * through the mantle's viscoelastic relaxation, so
 *
 *   α(t) = α₀ − k · [ V(t) − V(2000) ],   J₂(t)/J₂₀ = 1 − k_J · [ V(t) − V(2000) ]
 *
 * with V(t) the ice-volume history in the channel's currency (‰ of the LR04-fitted
 * orbital response — the orbital part of benthic δ¹⁸O IS ice volume: the sea-level
 * stack and LR04 agree on one ratio, ~67 m/‰, across the precession, obliquity and
 * eccentricity bands; plan 26 §2M.2), and k, k_J DERIVED at construction so that
 * dα/dt(J2000) and dJ₂/dt(J2000) equal the observed rates (Peltier's ICE-6G LOD
 * coupling, Cox & Chao 2002 satellite gravimetry) — no stored scale, no J₂→α
 * factor. k > 0 is the direct-load sign (an uncompensated ice load lowers α); after
 * a rapid deglaciation V − ⟨V⟩ < 0, α sits above equilibrium and relaxes for ~τ —
 * today's −0.35 ms/cy non-tidal drift is that tail. τ was MEASURED against the
 * historical ΔT record through the joint fitter (optimum 5–6 kyr, the degree-2
 * Maxwell estimate; the plan 06 record).
 *
 * V(t) = Σ_r w_r(t)·L1′_r(t) + B(t)  (plan 26), where
 *   - L1′_r is regime r's fitted L1 line set (its own fit window of the LR04 record:
 *     post-MPT 0–1 Ma, iNHG–MPT 1–2.7 Ma, pre-iNHG 2.7–5.3 Ma), lagged by τ (each
 *     line Ĉ′ = Ĉ·iωτ/(1+iωτ), so the evaluator stays a sinusoid sum), with the
 *     405-kyr line left out of the ice proxy (not ice: the sea-level ratio there is
 *     24 m/‰); w_r is a C¹ window on the regime's fit window with smoothstep joins
 *     of ±joinHalfKyr at the regime boundaries — a fitted line set is NEVER
 *     extrapolated beyond its window (measured: the post-MPT set is a degenerate
 *     cluster outside it, R² −26, amplitude 3× the record, and the former channel
 *     oscillated at ±7e-4 at random phase for the whole deep past; plan 26 §2M.1).
 *     Beyond the last window the orbital part is zero (no proxy, no claim).
 *   - B(t) is the ice BASELINE relative to today, in metres of sea-level equivalent
 *     from the cited inventory (Greenland's 7.4 m absent before the NH glaciation,
 *     the whole 65 m absent before the Antarctic glaciation; astro-reference
 *     giaIceInventory), converted to ‰ by the LGM-to-present swing of the post-MPT
 *     lagged response (its range over the last 800 kyr ↔ the 120-m LGM drop) — the
 *     same response per unit of ice the J2000 rates normalise. Less ice → lighter
 *     δ¹⁸O → V < 0 → α and J₂ ABOVE their present values (polar mass moved into the
 *     oceans raises C and J₂): the ice-free Earth sits at +1.7·10⁻⁴ of J₂/J₂₀.
 *
 * The single-regime form (l1Terms + yStdDenormalization, no windows, no baseline)
 * is the pre-plan-26 channel and stays available (the research twins).
 *
 * @param {{
 *   l1Terms?: Array<{period_kyr: number, a: number, b: number}>,
 *   yStdDenormalization?: number,
 *   regimes?: Array<{ l1Terms: Array<{period_kyr: number, a: number, b: number}>, yStdDenormalization: number, windowKyr: [number, number] }>,
 *   joinHalfKyr?: number,
 *   excludePeriodsAboveKyr?: number,
 *   iceInventory?: { lgmSeaLevelDropM: number, presentIceSeaLevelM: number, greenlandSeaLevelM: number, nhGlaciationOnsetMa: number, nhGlaciationWidthMyr: number, eotMa: number, eotWidthMyr: number },
 *   relaxationKyr: number,
 *   alphaGiaRateJ2000PerYr: number,
 *   alphaJ2000: number,
 *   j2RateJ2000PerYr?: number,
 *   j2J2000?: number,
 * }} cfg - relaxationKyr, alphaGiaRateJ2000PerYr and j2RateJ2000PerYr are the
 *   assembled deepTime block (DEFAULT_CONSTANTS.deepTime: τ the banked record
 *   data/deep-time-fitted.json, the rates derived from astro-reference
 *   giaCoxChaoPeltier — plan 11 step 1); alphaJ2000 the IERS moment-of-inertia
 *   factor; j2J2000 Earth's J₂ (astro-reference). `regimes` ordered young → old
 *   (the first holds J2000 and sets the normalisation); `iceInventory` the
 *   deepTime.iceInventory block (astro-reference giaIceInventory).
 * @returns {{
 *   alphaAt: (year: number) => number,
 *   j2RatioAt: (year: number) => number,
 *   laggedL1PermilAt: (year: number) => number,
 *   iceBaselinePermilAt: (year: number) => number,
 *   kPerPermille: number,
 *   relaxationKyr: number,
 *   laggedL1Terms: Array<{period_kyr: number, a: number, b: number}>,
 *   glacialSwingPermil: number,
 * }}
 *
 * THE SAME REDISTRIBUTION, ITS SECOND OBSERVABLE — j2RatioAt(year) = J₂(t)/J₂₀.
 * The mass that changes the polar moment changes the oblateness, and the
 * luni-solar precession rate is proportional to it (ψ̇ ∝ (C − A)/C; the
 * consumer is the spin integration, earth/deep-orbital-history). The J₂ side
 * is scaled on its OWN observation, exactly as the α side is on its rate:
 *
 *   J₂(t) = J₂₀ − k_J · [ V(t) − V(2000) ],   k_J = −(dJ₂/dt)_obs / (dV/dt)₂₀₀₀
 *
 * so dJ₂/dt(J2000) IS the observed satellite rate (Cox & Chao 2002) by
 * construction. A constant dJ₂/dt would be a rate valid at a point used
 * across a span; this is the history. Inside the Quaternary the ratio is
 * bounded, ±3·10⁻⁴ over the glacial cycles; beyond the record it is the
 * baseline's constant. Without the two constants the ratio is 1 at every year.
 */
export function createAlphaGiaChannel({ l1Terms, yStdDenormalization, regimes, joinHalfKyr, excludePeriodsAboveKyr, iceInventory, relaxationKyr, alphaGiaRateJ2000PerYr, alphaJ2000, j2RateJ2000PerYr, j2J2000 }: {
    l1Terms?: Array<{
        period_kyr: number;
        a: number;
        b: number;
    }>;
    yStdDenormalization?: number;
    regimes?: Array<{
        l1Terms: Array<{
            period_kyr: number;
            a: number;
            b: number;
        }>;
        yStdDenormalization: number;
        windowKyr: [number, number];
    }>;
    joinHalfKyr?: number;
    excludePeriodsAboveKyr?: number;
    iceInventory?: {
        lgmSeaLevelDropM: number;
        presentIceSeaLevelM: number;
        greenlandSeaLevelM: number;
        nhGlaciationOnsetMa: number;
        nhGlaciationWidthMyr: number;
        eotMa: number;
        eotWidthMyr: number;
    };
    relaxationKyr: number;
    alphaGiaRateJ2000PerYr: number;
    alphaJ2000: number;
    j2RateJ2000PerYr?: number;
    j2J2000?: number;
}): {
    alphaAt: (year: number) => number;
    j2RatioAt: (year: number) => number;
    laggedL1PermilAt: (year: number) => number;
    iceBaselinePermilAt: (year: number) => number;
    kPerPermille: number;
    relaxationKyr: number;
    laggedL1Terms: Array<{
        period_kyr: number;
        a: number;
        b: number;
    }>;
    glacialSwingPermil: number;
};
