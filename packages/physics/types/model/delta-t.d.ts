/**
 * ΔT (TT − UT1) — the raw integral plus the cycle stack, memoized on the exact argument.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
/** @param {import('./moon-epoch.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleDeltaT(ctx: import("./moon-epoch.js").Ctx): {
    deltaTSeconds: (year: number) => number;
    meanDeltaTSecondsAtAge: (tMa: number) => number;
};
export type Ctx = import("./moon-epoch.js").Ctx & ReturnType<typeof assembleDeltaT>;
