declare const SCENARIO: Readonly<{
    rocheZoneEarthRadii: 3;
    lawExponent: 5.5;
    windowSamplesShipped: 3;
    windowSamplesBand: number[];
    lockYearsAt6Re: 100;
    moonRadiusMetres: 1737400;
    sources: "Farhat et al. 2022 (the history); Zahnle et al. 2015 (the law's form); Peale 1977 (the lock); Canup 2004 (the hand-off's scenario)";
}>;
/**
 * @param {object} deps
 * @param {{ earthRadiusMetres: number, gmEarthMoonM3S2: number, moonMassKg: number, earthMassKg: number, totalAngularMomentumKgM2S: number, earthMomentOfInertiaKgM2: number, moonEccentricityFactor?: number }} deps.constants
 * @param {{ moonDistanceMetresAtAge: (tMa: number) => number | null }} deps.fns  the cited history's reader of date
 */
export function createEarlyRecession({ constants: K, fns }: {
    constants: {
        earthRadiusMetres: number;
        gmEarthMoonM3S2: number;
        moonMassKg: number;
        earthMassKg: number;
        totalAngularMomentumKgM2S: number;
        earthMomentOfInertiaKgM2: number;
        moonEccentricityFactor?: number;
    };
    fns: {
        moonDistanceMetresAtAge: (tMa: number) => number | null;
    };
}): {
    scenario: Readonly<{
        rocheZoneEarthRadii: 3;
        lawExponent: 5.5;
        windowSamplesShipped: 3;
        windowSamplesBand: number[];
        lockYearsAt6Re: 100;
        moonRadiusMetres: 1737400;
        sources: "Farhat et al. 2022 (the history); Zahnle et al. 2015 (the law's form); Peale 1977 (the lock); Canup 2004 (the hand-off's scenario)";
    }>;
    edgeMa: number;
    lawFactor: (m: number) => number | null;
    yearsFromRoche: (aTargetRe: number, m?: number) => number | null;
    distanceReAtYears: (years: number, m?: number) => number | null;
    handover: () => {
        aOverEarthRadii: number;
        years: number | null;
        bandYears: (number | null)[];
        lawFactorShipped: number | null;
        lawFactorBand: (number | null)[];
    } | null;
    stateAt: (aOverEarthRadii: number) => {
        aOverEarthRadii: number;
        dayHours: number;
        monthHours: number;
        monthDays: number;
        moonDiameterDeg: number;
        lockYears: number;
    };
};
export const SEC_PER_JULIAN_YR: number;
export { SCENARIO as EARLY_RECESSION_SCENARIO };
