/** @param {import('./planet-spin-channel.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePlanetElementsOfDate(ctx: import("./planet-spin-channel.js").Ctx): {
    nodeOriginSSDeg: () => number;
    planetAscNodeDeg: (k: string, year: number) => number;
    planetEccentricity: (k: string, year: number) => number;
    planetInclinationDeg: (k: string, year: number) => number;
    planetPerihelionDeg: (k: string, year: number) => number;
};
export type Ctx = import("./planet-spin-channel.js").Ctx & ReturnType<typeof assemblePlanetElementsOfDate>;
