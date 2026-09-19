export function createDerivedViews({ primitives: L0 }: {
    primitives: EpochPrimitives;
}): DerivedViews;
export type EpochPrimitives = import("../layer0/index.js").EpochPrimitives;
export type DerivedViews = {
    tropicalYearDays: (year: number) => number | null;
    siderealYearDays: (year: number) => number | null;
    anomalisticYearDays: (year: number) => number | null;
    siderealYearDaysViaLattice: (year: number) => number | null;
};
