/** @param {import('./sun-and-eclipses.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePublishedPeriods(ctx: import("./sun-and-eclipses.js").Ctx): {
    publishedAxialPrecessionYearsAtYear: (year: number) => number;
    publishedSiderealYearSecondsAtYear: (year: number) => number;
    publishedTropicalYearSecondsAtYear: (year: number) => number;
};
export type Ctx = import("./sun-and-eclipses.js").Ctx & ReturnType<typeof assemblePublishedPeriods>;
