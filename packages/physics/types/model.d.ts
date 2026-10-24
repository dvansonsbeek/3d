/**
 * Assemble the model surfaces from a resolved constants context + fitted
 * coefficients. Internal: `createModel` in index.js composes this with the
 * §2d context validation and counterfactual hashing — call that, not this.
 *
 * @param {Readonly<Record<string, any>>} C  the frozen constants context
 * @param {Readonly<Record<string, any>>} F  the fitted coefficients
 * @param {import('./model/context.js').Laws} [laws]  research overrides for Earth's orbit laws
 *   (model/context.js); default {} = the shipped laws, bit-identical to before this parameter existed
 * @param {any} [secularSeriesArtifact]  the governed N-body secular series (the API/Node path; the
 *   npm package alone has no 8 MB series)
 * @param {import('./model/context.js').Options} [options]  `giaEllipticityOfDate: false` = the orbital
 *   forcing alone (model/context.js); default true = the shipped physics, bit-identical to before
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon, …) — type inferred so ReturnType stays precise
 */
export function assembleModel(C: Readonly<Record<string, any>>, F: Readonly<Record<string, any>>, laws?: import("./model/context.js").Laws, secularSeriesArtifact?: any, options?: import("./model/context.js").Options): Readonly<{
    time: Readonly<{
        yearFromJD: (jd: number) => number;
        jdFromYear: (year: number) => number;
        siTropicalYearDays: number;
    }>;
    massChain: Readonly<{
        moonDistanceKm: any;
        moonSiderealMonthDays: any;
        siderealYearDays: any;
        dayLengthSeconds: any;
        massRatioEarthMoon: any;
        lunarSmallParameter: number;
        moonMassFraction: number;
        solarTidalShiftKm: number;
        moonDistanceCorrectedKm: number;
        gmEarthMoonSystemKm3S2: number;
        gmEarthKm3S2: number;
        gmMoonKm3S2: number;
        gmSunPlusEarthKm3S2: number;
        gmSunKm3S2: number;
        sunMassKg: number;
        earthMassKg: number;
        gravitationalConstantKm3KgS2: any;
    }>;
    sun: Readonly<{
        meanLongitudeDegAt: (year: number) => number;
        perihelionLongitudeDegAt: (year: number) => number;
    }>;
    epoch: Readonly<{
        yearToTMa: (year: number) => number;
        lodSecondsAtYear: (year: number) => number | null;
        lodRealSecondsAtYear: (year: number) => number;
        alphaAtYear: (year: number) => number;
        moonDistanceKmAtYear: (year: number) => number;
        siderealYearSecondsAtYear: (year: number) => number;
        deltaTSecondsAtYear: (year: number) => number;
        axialPrecessionYearsAtYear: (year: number) => number;
        tropicalYearSecondsAtYear: (year: number) => number;
    }>;
    lunisolar: Readonly<{
        meanPeriodYearsAtYear: (year: number) => number;
        meanRateArcsecPerYrAtYear: (year: number) => number;
        torqueRateArcsecPerYrAtYear: (year: number) => number;
        torquePeriodYearsAtYear: (year: number) => number;
        precessionObliquityFactorAtYear: (year: number) => number;
        meanObliquityCitedDegAtYear: (year: number) => number;
        ofDatePeriodYearsAtYear: (year: number) => number;
        solarShareJ2000: number;
        solarTorqueFactorOfDateAtYear: (year: number) => number;
        ellipticityRatioOfDateAtYear: (year: number) => number;
        lunarTorqueFactorAtYear: (year: number) => number;
        torqueTermAtYear: (year: number) => number;
        torqueConstantJ2000ArcsecPerYr: number;
        nodalModeS3ArcsecPerYr: number;
        nodalPeriodYears: number;
        spinAxisInertialRateArcsecPerYrAtYear: (year: number) => number;
        obliquityBeatYearsAtYear: (year: number) => number;
        spinAxisInertialRateMeanArcsecPerYr: (yearFrom: number, yearTo: number, stepYears?: number, opts?: {
            ellipticity?: boolean;
        }) => number;
        obliquityPeriodRealizedYears: (yearFrom: number, yearTo: number) => number;
        apsidalPeriodYearsAtYear: (year: number) => number | null;
        apsidalPerPrecessionAtYear: (year: number) => number | null;
        periOfDatePeriodYearsAtYear: (year: number) => number | null;
        periOfDatePerPrecessionAtYear: (year: number) => number | null;
        publishedWindowYears: 2000000;
        spinAxisInertialPeriodYearsJ2000: number;
        spinAxisInertialRateArcsecPerYrJ2000: number;
    }>;
    earth: Readonly<{
        perihelionLongitudeDeg: (year: number) => number;
        obliquityDeg: (year: number) => number;
        obliquityHybridDomainYears: [number, number] | null;
        meanObliquityCitedDeg: (year: number) => number;
        eccentricity: (year: number) => number;
        inclinationDeg: (year: number) => number;
        ascendingNodeDeg: (year: number) => number;
    }>;
    lengths: Readonly<{
        tropicalYearDays: (year: number) => number;
        siderealYearDays: (year: number) => number;
        anomalisticYearDays: (year: number) => number;
        dayLengthSeconds: (year: number) => number;
        lodRealSeconds: (year: number) => number;
        siderealDaySeconds: (year: number) => number;
        stellarDaySeconds: (year: number) => number;
    }>;
    cardinal: Readonly<{
        jd: (year: number, type: string) => number;
        jdNearUT: (jdUT: number, type: string) => number;
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
        sunApparentLonDegAtJD: (jdUT: number) => number;
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
        ttBridgeSeconds: any;
        frameworkSunDeps: Readonly<{
            sunMeanLongitudeJ2000Deg: any;
            tropicalRateDegPerCy: number;
            eccentricityAt: (year: number) => any;
            perihelionLongitudeDegAt: (year: number) => number;
            meanLongitudeDegAt: (year: number) => number;
        }>;
        umbraGroundAtJD: (jd: number) => {
            latDeg: number;
            lonDeg: number;
        } | null;
        gmstDegAtJD: (jdUT: number) => number;
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
        eccentricity: (k: string, year: number) => number;
        spin: (k: string) => Readonly<{
            key: string;
            cassiniLocked: boolean;
            momentOfInertiaFactor: number;
            momentOfInertiaFactorClass: string;
            alphaArcsecPerYr: number;
            satelliteQuadrupole: number;
            satelliteAngularMomentum: number;
            spinRetrograde: boolean;
            meanMotionRadPerYr: number;
            obliquityJ2000Deg: number;
            spinPrecessionRateArcsecPerYrJ2000: number | null;
            axialPrecessionPeriodYearsJ2000: number | null;
            obliquityDegAtYear: (year: number) => number | null;
            spinPrecessionRateArcsecPerYrAtYear: (year: number) => number | null;
            obliquityEnvelopeDeg: (year: number, spanYr: number) => {
                minDeg: number;
                meanDeg: number;
                maxDeg: number;
            } | null;
            spinAxisEclipticJ2000AtYear: (year: number) => number[] | null;
            orbitNormalEclipticJ2000AtYear: (year: number) => number[];
            stepYr: number;
            maxSpanYr: 10000000;
        }>;
    }>;
}>;
