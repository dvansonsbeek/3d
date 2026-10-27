/** @param {import('./year-day-lengths.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleOneSourceMovement(ctx: import("./year-day-lengths.js").Ctx): {
    lodRealSeconds: (year: number) => number;
    oneFamilyTropicalYearSeconds: (year: number) => number;
    oneSourceM: {
        yearLengths: Readonly<{
            tropicalYearSecondsAtYear: (year: number) => number;
            siderealYearSecondsAtYear: (year: number) => number;
            anomalisticYearSecondsAtYear: (year: number) => number;
            axialPrecessionYearsAtYear: (y: number) => number;
            perihelionPrecessionYearsAtYear: (y: number) => number;
            inclinationPrecessionYearsAtYear: (y: number) => number;
            generalPrecessionArcsecPerJulianYr: (y: number) => number;
            apsidalRateFixedArcsecPerJulianYr: (y: number) => number;
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
        /** The one-source sample at a decimal year (the engine year) — ε, e, ϖ of date, the Earth-orbit normal (the fields the frame of date and the invariable-plane elements read). @param {number} year */
        sampleAt: (year: number) => any;
        /** EXPERIMENT accessors: the series' e and equinox-referenced ϖ of date. @param {number} year @returns {number} */
        eAt: (year: number) => number;
        /** @param {number} year @returns {number} */
        periOfDateDegAt: (year: number) => number;
        /** The hybrid's obliquity at a decimal year, degrees — the banked series inside its span, the α(t)-coupled ζ-tail integration beyond (the deep sampler grows ~0.1 s/Myr). @param {number} year @returns {number} */
        epsAt: (year: number) => number;
        /** The hybrid's own domain, [yearFrom, yearTo] — the banked ζ series' span; null without a series. */
        obliquityHybridDomainYears: [number, number] | null;
        /** The precession of date's two factors at a decimal year (the factory's own — ONE home). @param {number} year @returns {{solarTorque: number, ellipticity: number}} */
        precessionOfDateFactorsAt: (year: number) => {
            solarTorque: number;
            ellipticity: number;
        };
        /** The spin axis's INERTIAL precession period at J2000, years — the self-anchored
         *  lunisolar rate the hybrid integrates ŝ on (deep-orbital-history D4e): the general
         *  precession anchor plus the planetary mean the ecliptic's own motion carries. */
        axialPrecessionYearsLunisolarJ2000: number;
    };
    siderealDaySeconds: (year: number) => number;
    stellarDaySeconds: (year: number) => number;
    tropicalYearDays: (year: number) => number;
    yearLengthsM: Readonly<{
        tropicalYearSecondsAtYear: (year: number) => number;
        siderealYearSecondsAtYear: (year: number) => number;
        anomalisticYearSecondsAtYear: (year: number) => number;
        axialPrecessionYearsAtYear: (y: number) => number;
        perihelionPrecessionYearsAtYear: (y: number) => number;
        inclinationPrecessionYearsAtYear: (y: number) => number;
        generalPrecessionArcsecPerJulianYr: (y: number) => number;
        apsidalRateFixedArcsecPerJulianYr: (y: number) => number;
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
};
export type Ctx = import("./year-day-lengths.js").Ctx & ReturnType<typeof assembleOneSourceMovement>;
