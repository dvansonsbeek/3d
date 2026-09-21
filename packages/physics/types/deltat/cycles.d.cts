export type CycleSpec = {
    periodYears: number;
    cosCoeffSeconds: number;
    sinCoeffSeconds: number;
};
export type ResonatorKick = {
    tYear: number;
    cosSeconds: number;
    sinSeconds: number;
};
export type ResonatorTone = {
    periodYears: number;
    phiLockedRad: number;
    ampSeconds: number;
};
export type DeltaTCyclesDeps = {
    /**
     * - full strength within |y−2000| ≤ this
     */
    taperFullHalfwidthYears: number;
    /**
     * - zero beyond
     */
    taperTotalHalfwidthYears: number;
    /**
     * - δLOD denominator (variation ≤1e-8 in-window)
     */
    tropicalYearSecondsJ2000: number;
    /**
     * - keyed bond/hallstatt/jose5/jose4; each
     * period in YEARS (the fit file's `period_yr` — the former 8H/n divisor is
     * gone from the runtime, plan 06 T5 / layer B item 3)
     */
    cycles: Record<string, CycleSpec>;
    /**
     * - T₀ and the tones' periods in years
     */
    resonator: {
        t0Years: number;
        q: number;
        kicks: ResonatorKick[];
        tones: ResonatorTone[];
    };
};
/**
 * @typedef {{ periodYears: number, cosCoeffSeconds: number, sinCoeffSeconds: number }} CycleSpec
 * @typedef {{ tYear: number, cosSeconds: number, sinSeconds: number }} ResonatorKick
 * @typedef {{ periodYears: number, phiLockedRad: number, ampSeconds: number }} ResonatorTone
 */
/**
 * @typedef {Object} DeltaTCyclesDeps
 * @property {number} taperFullHalfwidthYears - full strength within |y−2000| ≤ this
 * @property {number} taperTotalHalfwidthYears - zero beyond
 * @property {number} tropicalYearSecondsJ2000 - δLOD denominator (variation ≤1e-8 in-window)
 * @property {Record<string, CycleSpec>} cycles - keyed bond/hallstatt/jose5/jose4; each
 *   period in YEARS (the fit file's `period_yr` — the former 8H/n divisor is
 *   gone from the runtime, plan 06 T5 / layer B item 3)
 * @property {{ t0Years: number, q: number, kicks: ResonatorKick[],
 *   tones: ResonatorTone[] }} resonator - T₀ and the tones' periods in years
 */
/**
 * Build the cycle-correction evaluators over one engine's constant set.
 * All evaluators are UNGATED — the engines own their enable flags.
 * @param {DeltaTCyclesDeps} deps
 */
export function createDeltaTCycles(deps: DeltaTCyclesDeps): {
    taperAt: (year: number) => number;
    taperDerivativeAt: (year: number) => number;
    cycleDeltaTSecondsAt: (cycleKey: string, year: number) => number;
    cycleLodSecondsAt: (cycleKey: string, year: number) => number;
    swingDeltaTSecondsAt: (year: number) => number;
    swingLodSecondsAt: (year: number) => number;
    swingLodRateAt: (year: number) => number;
};
