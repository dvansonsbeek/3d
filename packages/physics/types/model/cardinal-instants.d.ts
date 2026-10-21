/**
 * Cardinal instants — the apparent Sun (completed, aberrated, nutated) and the Newton crossings.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
/** @param {import('./published-periods.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleCardinalInstants(ctx: import("./published-periods.js").Ctx): {
    cardinalCrossingJdUT: (year: number, type: string) => number;
    cardinalCrossingNearJdUT: (jdSeedUT: number, type: string) => number;
    cardinalTargetDeg: (type: string) => number;
    sunAberrationArcsecAt: (year: number) => number;
    sunApparentLonDegAtJdUT: (jdUT: number) => number;
};
export type Ctx = import("./published-periods.js").Ctx & ReturnType<typeof assembleCardinalInstants>;
