/** @param {import('./lunar-theory.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleSunAndEclipses(ctx: import("./lunar-theory.js").Ctx): {
    besselian: {
        umbraGroundAt: (jdUT: number) => {
            latDeg: number;
            lonDeg: number;
        } | null;
        shadowStateAt: (jdUT: number, latDeg: number, lonDeg: number) => {
            offsetKm: number;
            penumbraKm: number;
            umbraKm: number;
            magnitude: number;
        };
        shadowRadiiAt: (jdUT: number) => {
            penumbraKm: number;
            umbraKm: number;
            gamma: number;
            moonDistanceKm: number;
        };
        localCircumstances: (jdGreatest: number, latDeg: number, lonDeg: number) => {
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
        gmstDeg: (jdUT: number) => number;
    };
    eclipseFinders: {
        sunLonDegAt: (jd: number) => number;
        findLunarEclipsesInRange: (jdStart: number, jdEnd: number, opts?: {
            stepDays?: number;
        }) => Array<{
            jd: number;
            jdOpposition: number;
            beta: number;
            leastDistanceDeg: number;
            moonDistance_km: number;
            type: string;
            magnitudeUmbral: number;
            magnitudePenumbral: number;
        }>;
        findSolarEclipsesInRange: (jdStart: number, jdEnd: number, opts?: {
            stepDays?: number;
        }) => Array<{
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            moonAppR_topo: number;
            sunAppR: number;
            moonSunRatio: number;
        }>;
    };
    eclipseFormula: {
        meanSyzygyCountAt: (jdTT: number, kind: EclipseKind) => number | null;
        meanSyzygy: (k: number, kind: EclipseKind, jdTTSeed?: number) => {
            jdTT: number;
            jdUT: number;
        } | null;
        syzygy: (k: number, kind: EclipseKind, jdTTSeed?: number) => {
            k: number;
            jdMeanTT: number;
            jdMeanUT: number;
            jdTT: number;
            jdUT: number;
        } | null;
        eclipseAt: (k: number, kind: EclipseKind, jdTTSeed?: number) => EclipseOfDate | null;
        syzygiesInRange: (jdUTStart: number, jdUTEnd: number, kind: EclipseKind) => EclipseOfDate[];
        eclipsesInRange: (jdUTStart: number, jdUTEnd: number, kind: EclipseKind) => import("../eclipse/formula.cjs").EclipseOfDate[];
        nextEclipseAfter: (jdUT: number, kind: EclipseKind, opts?: {
            maxSyzygies?: number;
        }) => EclipseOfDate | null;
        statisticsAt: (jdTT: number) => {
            eclipseYearDays: number;
            nodeRegressionDays: number;
            seasonsPerYear: number;
            synodicMonthsPerYear: number;
            inclinationDeg: number;
            laplaceTiltDeg: number;
            approximate: boolean;
            lunar: {
                limitDeg: {
                    penumbral: number;
                    partial: number;
                    total: number;
                };
                sinFLimit: {
                    penumbral: number;
                    partial: number;
                    total: number;
                };
                perYear: {
                    any: number;
                    umbral: number;
                    total: number;
                };
            };
            solar: {
                limitDeg: {
                    partial: number;
                    central: number;
                };
                sinFLimit: {
                    partial: number;
                    central: number;
                };
                perYear: {
                    any: number;
                    central: number;
                };
            };
        } | null;
        recurrencesAt: (jdTT: number, opts?: Parameters<typeof import("../eclipse/formula.cjs").recurrencesOfDate>[1]) => {
            node: Recurrence[];
            anomaly: Recurrence[];
            year: Recurrence[];
        } | null;
        regimeAt: (jdTT: number) => "certified" | "reproducible";
        argumentsAt: (jdTT: number) => {
            Lp: number;
            D: number;
            M: number;
            Mp: number;
            F: number;
        };
        periodsAt: (jdTT: number) => (import("../eclipse/formula.cjs").PeriodsOfDate & {
            moonDistanceKm: number;
            inclinationDeg: number;
            laplaceTiltDeg: number;
        }) | null;
        elongationResidualDegAt: (jdUT: number, kind: EclipseKind) => number;
        certifiedWindowYears: Readonly<{
            min: -1999;
            max: 3000;
        }> | {
            min: number;
            max: number;
        };
    };
    sunL0Deg: any;
    sunMeanLongitudeDegAt: ((year: number) => number) & {
        recordSunCumulativeBank: (limitYears: number | {
            past: number;
            future: number;
        }) => {
            fwd: number[];
            bwd: number[];
        };
        sunSeatStatus: () => {
            fwd: {
                banked: number;
                edge: number;
                bankEdge: number | null;
            };
            bwd: {
                banked: number;
                edge: number;
                bankEdge: number | null;
            };
        };
    };
    sunPlanetaryCompletionDeg: (T: number) => number;
    sunTropicalRateDegPerCy: number;
    recordSunCumulativeBank: (limitYears: number | {
        past: number;
        future: number;
    }) => {
        fwd: number[];
        bwd: number[];
    };
    sunSeatStatus: () => {
        fwd: {
            banked: number;
            edge: number;
            bankEdge: number | null;
        };
        bwd: {
            banked: number;
            edge: number;
            bankEdge: number | null;
        };
    };
};
export type Ctx = import("./lunar-theory.js").Ctx & ReturnType<typeof assembleSunAndEclipses>;
