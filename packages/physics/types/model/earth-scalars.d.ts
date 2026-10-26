/**
 * Earth scalars of date — e, ϖ, ε read from the one-source movement; the eclipse Sun's elements (the research `laws` hook).
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
/** @param {import('./deep-time-chain.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleEarthScalars(ctx: import("./deep-time-chain.js").Ctx): {
    earthPerihelionDeg: (year: number) => number;
    eccentricityAt: (year: number) => number;
    obliquityDeg: (year: number) => number;
    sunEccentricityAt: (year: number) => number;
    sunPerihelionDegAt: (year: number) => number;
};
export type Ctx = import("./deep-time-chain.js").Ctx & ReturnType<typeof assembleEarthScalars>;
