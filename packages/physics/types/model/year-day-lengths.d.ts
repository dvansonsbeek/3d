/** @param {import('./earth-scalars.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleYearDayLengths(ctx: import("./earth-scalars.js").Ctx): {
    anomalisticYearDays: (year: number) => number;
    certifiedAxialPrecessionJ2000Years: () => number;
    dayLengthSeconds: (year: number) => number;
    siderealYearDays: (year: number) => number;
};
export type Ctx = import("./earth-scalars.js").Ctx & ReturnType<typeof assembleYearDayLengths>;
