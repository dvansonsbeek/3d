/** @param {import('./context.js').ModelInputs} ctx @returns the bindings the later slices read */
export function assembleDerivedConstants(ctx: import("./context.js").ModelInputs): {
    GM_EARTH_ALONE: number;
    GM_EARTH_MOON_SYSTEM: number;
    GM_MOON_ALONE: number;
    GM_SUN: number;
    GM_SUN_PLUS_EARTH: number;
    G_CONSTANT: any;
    MASS_RATIO_EARTH_MOON: any;
    M_SUN: number;
    axialPrecessionJ2000Days: number;
    currentAUDistance: any;
    meanLengthOfDay: any;
    meanSiderealYearDays: any;
    meanSolarYearDays: number;
    meanTropicalYearJ2000Seconds: number;
    moonDistanceCorrected: number;
    moonDistanceKm: any;
    moonOrbitalShift: number;
    moonSiderealMonth: any;
    moonSiderealMonthInput: any;
    startmodelJD: any;
    startmodelYear: any;
};
export type Ctx = import("./context.js").ModelInputs & ReturnType<typeof assembleDerivedConstants>;
