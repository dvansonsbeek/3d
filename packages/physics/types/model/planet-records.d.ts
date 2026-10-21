/** @param {import('./delta-t.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePlanetRecords(ctx: import("./delta-t.js").Ctx): {
    PLANET_KEYS: string[];
    PUBLISHED_PLANET_RECORDS: Record<string, Record<string, any>>;
    massFraction: Record<string, number>;
};
export type Ctx = import("./delta-t.js").Ctx & ReturnType<typeof assemblePlanetRecords>;
