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
    lunisolar: Readonly<{
        /** The mean lunisolar precession period T_p(t), years — the composed torque rate's period on the derived J2000 anchor (25,771.4 at J2000). @param {number} year @returns {number} */
        meanPeriodYearsAtYear: (year: number) => number;
        /** The composed rate ψ̇(t) = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³], ″/yr (p₀ = 50.2883, derived). @param {number} year @returns {number} */
        meanRateArcsecPerYrAtYear: (year: number) => number;
        /** The of-date period — the one-family beat inside ±2 Myr, the composed mean beyond. @param {number} year @returns {number} */
        ofDatePeriodYearsAtYear: (year: number) => number;
        /** f_S, the solar fraction of the J2000 precession torque. */
        solarShareJ2000: number;
        /** (a₀/a_M(t))³ — the lunar torque's growth on the recession history. @param {number} year @returns {number} */
        lunarTorqueFactorAtYear: (year: number) => number;
        /** f_S + (1 − f_S)(a₀/a_M)³ — the torque term the unit divides H_era by. @param {number} year @returns {number} */
        torqueTermAtYear: (year: number) => number;
        /** The hybrid's precession constant α = p₀ / cos ε₀, ″/yr (p₀ the derived J2000 rate, ε₀ the J2000 obliquity input; 54.81). */
        torqueConstantJ2000ArcsecPerYr: number;
        /** The apsidal (perihelion vs the stars) period from the engine-D chain's secular tangent, years — inside the published window only (the tangent is an extrapolation beyond the banked series: it turns negative at −5 Myr); null beyond. @param {number} year @returns {number|null} */
        apsidalPeriodYearsAtYear: (year: number) => number | null;
        /** T_aps(t) / T_p(t) — the apsidal period in of-date precession periods (4.33 at J2000, a reading; 0.84 … 9.9 across ±26 kyr, measured); null beyond the published window. @param {number} year @returns {number|null} */
        apsidalPerPrecessionAtYear: (year: number) => number | null;
        /** T_peri(t) = 1/(1/T_p + 1/T_aps) — the perihelion-of-date period (equinox precession + inertial perihelion motion, frame arithmetic at every epoch), years, on the of-date T_p; null beyond the published window. @param {number} year @returns {number|null} */
        periOfDatePeriodYearsAtYear: (year: number) => number | null;
        /** T_peri(t) / T_p(t) (0.812 at J2000 — the J2000 reading); null beyond the published window. @param {number} year @returns {number|null} */
        periOfDatePerPrecessionAtYear: (year: number) => number | null;
        /** The published of-date window, years from 2000. */
        publishedWindowYears: 2000000;
    }>;
    earth: Readonly<{
        perihelionLongitudeDeg: (year: number) => number;
        obliquityDeg: (year: number) => number;
        obliquityCombDeg: (year: number) => number;
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
