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
        findLunarEclipsesInRange: (jdStart: number, jdEnd: number) => Array<{
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            magnitudeUmbral: number;
            magnitudePenumbral: number;
        }>;
        findSolarEclipsesInRange: (jdStart: number, jdEnd: number) => Array<{
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            moonAppR_topo: number;
            sunAppR: number;
            moonSunRatio: number;
        }>;
    };
    sunL0Deg: any;
    sunMeanLongitudeDegAt: ((year: number) => number) & {
        recordSunCumulativeBank: (limitYears: number) => {
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
    recordSunCumulativeBank: (limitYears: number) => {
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
