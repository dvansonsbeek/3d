/** @param {import('./planet-elements-of-date.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleInvPlaneElements(ctx: import("./planet-elements-of-date.js").Ctx): {
    ascendingNodeDeg: (year: number) => number;
    inclinationDeg: (year: number) => number;
};
export type Ctx = import("./planet-elements-of-date.js").Ctx & ReturnType<typeof assembleInvPlaneElements>;
