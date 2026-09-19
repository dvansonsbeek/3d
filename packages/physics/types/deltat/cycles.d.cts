export type CycleSpec = {
    latticeN: number;
    cosCoeffSeconds: number;
    sinCoeffSeconds: number;
};
export type ResonatorKick = {
    tYear: number;
    cosSeconds: number;
    sinSeconds: number;
};
export type ResonatorTone = {
    dn: number;
    phiLockedRad: number;
    ampSeconds: number;
};
export type DeltaTCyclesDeps = {
    /**
     * - 8 × the holistic year (J2000)
     */
    eightHYears: number;
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
     * - keyed bond/hallstatt/jose5/jose4
     */
    cycles: Record<string, CycleSpec>;
    resonator: {
        t0LatticeN: number;
        q: number;
        kicks: ResonatorKick[];
        tones: ResonatorTone[];
    };
};
/**
 * @typedef {{ latticeN: number, cosCoeffSeconds: number, sinCoeffSeconds: number }} CycleSpec
 * @typedef {{ tYear: number, cosSeconds: number, sinSeconds: number }} ResonatorKick
 * @typedef {{ dn: number, phiLockedRad: number, ampSeconds: number }} ResonatorTone
 */
/**
 * @typedef {Object} DeltaTCyclesDeps
 * @property {number} eightHYears - 8 × the holistic year (J2000)
 * @property {number} taperFullHalfwidthYears - full strength within |y−2000| ≤ this
 * @property {number} taperTotalHalfwidthYears - zero beyond
 * @property {number} tropicalYearSecondsJ2000 - δLOD denominator (variation ≤1e-8 in-window)
 * @property {Record<string, CycleSpec>} cycles - keyed bond/hallstatt/jose5/jose4
 * @property {{ t0LatticeN: number, q: number, kicks: ResonatorKick[],
 *   tones: ResonatorTone[] }} resonator
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
