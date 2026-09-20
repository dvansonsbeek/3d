/**
 * Assemble the model surfaces from a resolved constants context + fitted
 * coefficients. Internal: `createModel` in index.js composes this with the
 * §2d context validation and counterfactual hashing — call that, not this.
 *
 * @param {Readonly<Record<string, any>>} C  the frozen constants context
 * @param {Readonly<Record<string, any>>} F  the fitted coefficients
 * @param {{ eccentricityAt?: (year: number) => number, eccentricityRateAt?: (year: number) => number, perihelionLongitudeDegAt?: (year: number) => number }} [laws]
 *   RESEARCH OVERRIDES for Earth's orbit laws (doc 109 §7): an alternative e(t),
 *   de/dt(t) and ϖ_of-date(t) flow through every consumer (the eclipse Sun, the
 *   Moon's E-factor, the cardinal points) exactly as the shipped laws do. Default
 *   {} = the shipped laws, bit-identical to before this parameter existed. Not a
 *   counterfactual in the §2d sense (no hash change) — callers must say when
 *   they used it; the generators refuse to --write under an override.
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon) — type inferred so ReturnType stays precise
 */
export function assembleModel(C: Readonly<Record<string, any>>, F: Readonly<Record<string, any>>, laws?: {
    eccentricityAt?: (year: number) => number;
    eccentricityRateAt?: (year: number) => number;
    perihelionLongitudeDegAt?: (year: number) => number;
}, secularSeriesArtifact?: any): Readonly<{
    time: Readonly<{
        yearFromJD: (jd: number) => number;
        jdFromYear: (year: number) => number;
        siTropicalYearDays: number;
    }>;
    epoch: Readonly<{
        yearToTMa: (year: number) => number;
        hAtYear: (year: number) => number | null;
        lodSecondsAtYear: (year: number) => number | null;
        alphaAtYear: (year: number) => number;
        moonDistanceKmAtYear: (year: number) => number;
        siderealYearSecondsAtYear: (year: number) => number;
        deltaTSecondsAtYear: (year: number) => number;
        cyclesBetween: (yearA: number, yearB: number, divisorN: number) => number;
        axialPrecessionYearsAtYear: (year: number) => number;
        tropicalYearSecondsAtYear: (year: number) => number;
    }>;
    earth: Readonly<{
        perihelionLongitudeDeg: (year: number) => number;
        obliquityDeg: (year: number) => number;
        eccentricity: (year: number) => number;
        inclinationDeg: (year: number) => number;
        ascendingNodeDeg: (year: number) => number;
    }>;
    lengths: Readonly<{
        tropicalYearDays: (year: number) => number;
        tropicalYearDirectDays: (year: number) => number;
        siderealYearDays: (year: number) => number;
        anomalisticYearDays: (year: number) => number;
        dayLengthSeconds: (year: number) => number;
        siderealDaySeconds: (year: number) => number;
        stellarDaySeconds: (year: number) => number;
        measuredSolarDaySeconds: (year: number) => number;
        raDayOffsetMs: (year: number) => number;
    }>;
    cardinal: Readonly<{
        jd: (year: number, type: string) => number;
        raDeg: (year: number, type: string) => number;
        yearLengthDays: (year: number, type: string) => number;
    }>;
    cardinalStructure: Readonly<{
        yearLengthSeconds: (year: number, type: "VE" | "SS" | "AE" | "WS") => number;
        eocOffsetSeconds: (year: number, type: "VE" | "SS" | "AE" | "WS") => number;
        spreadSeconds: (year: number) => {
            VE: number;
            SS: number;
            AE: number;
            WS: number;
            meanSeconds: number;
        };
        anomalisticYearSeconds: (year: number) => number;
    }>;
    yearLengths: Readonly<{
        tropicalYearSecondsAtYear: (year: number) => number;
        siderealYearSecondsAtYear: (year: number) => number;
        anomalisticYearSecondsAtYear: (year: number) => number;
        axialPrecessionYearsAtYear: (y: number) => number;
        perihelionPrecessionYearsAtYear: (y: number) => number;
        inclinationPrecessionYearsAtYear: (y: number) => number;
        cardinal: Readonly<{
            yearLengthSeconds: (y: number, type: "VE" | "SS" | "AE" | "WS") => number;
            eocOffsetSeconds: (y: number, type: "VE" | "SS" | "AE" | "WS") => number;
            spreadSeconds: (y: number) => {
                VE: number;
                SS: number;
                AE: number;
                WS: number;
                meanSeconds: number;
            };
        }>;
        planetaryRelAtYear: (year: number) => number;
    }>;
    moon: Readonly<{
        distanceKmAtYear: (year: number) => number;
        siderealMonthDaysAtYear: (year: number) => number;
        synodicMonthDays: number;
        lonDegAtJD: (jd: number) => number;
        betaDegAtJD: (jd: number) => number;
        distanceKmAtJD: (jd: number) => number;
    }>;
    eclipse: Readonly<{
        sunLonDegAtJD: (jd: number) => number;
        sunLonCompletedDegAtJD: (jd: number) => number;
        findLunarInRange: (jdStart: number, jdEnd: number) => {
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            magnitudeUmbral: number;
            magnitudePenumbral: number;
        }[];
        findSolarInRange: (jdStart: number, jdEnd: number) => {
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            moonAppR_topo: number;
            sunAppR: number;
            moonSunRatio: number;
        }[];
        deltaTSecondsAtJD: (jd: number) => number;
        frameworkSunDeps: Readonly<{
            sunMeanLongitudeJ2000Deg: any;
            tropicalRateDegPerCy: number;
            eccentricityAt: (year: number) => number;
            perihelionLongitudeDegAt: (year: number) => number;
            meanLongitudeDegAt: (year: number) => number;
        }>;
        umbraGroundAtJD: (jd: number) => {
            latDeg: number;
            lonDeg: number;
        } | null;
        solarLocalCircumstances: (jdGreatest: number, latDeg: number, lonDeg: number) => {
            kind: "none" | "partial" | "annular" | "total";
            magnitude: number;
            maxJd: number;
            contacts: {
                c1: number | null;
                c2: number | null;
                c3: number | null;
                c4: number | null;
            };
            centralDurationSeconds: number | null;
        };
    }>;
    climate: Readonly<{
        l1OrbitalPermil: (year: number) => number;
    }>;
    planets: Readonly<{
        keys: readonly string[];
        record: (k: string) => Record<string, any> | undefined;
        perihelionLongitudeDeg: (k: string, year: number) => number;
        ascendingNodeInvPlaneDeg: (k: string, year: number) => number;
        invPlaneInclinationDeg: (k: string, year: number) => number;
    }>;
}>;
