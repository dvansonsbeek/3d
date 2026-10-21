/**
 * The Moon at epoch — the solar-Δa-corrected Kepler month.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
/** @param {import('./one-source-movement.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleMoonEpoch(ctx: import("./one-source-movement.js").Ctx): {
    moonSiderealMonthDaysAt: (year: number) => number;
};
export type Ctx = import("./one-source-movement.js").Ctx & ReturnType<typeof assembleMoonEpoch>;
