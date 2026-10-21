/**
 * The time axis — exact JD ↔ model-year conversion on the SI axis.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
/** @param {import('./inv-plane-elements.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleTimeAxis(ctx: import("./inv-plane-elements.js").Ctx): {
    jdFromYear: (year: number) => number;
    siTropicalYearDays: number;
    yearFromJD: (jd: number) => number;
};
export type Ctx = import("./inv-plane-elements.js").Ctx & ReturnType<typeof assembleTimeAxis>;
