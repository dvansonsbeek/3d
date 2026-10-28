/** @param {import('./time-axis.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleLunarTheory(ctx: import("./time-axis.js").Ctx): {
    frameworkDeltaTSecondsAtJD: (jd: number) => number;
    j2000JD: number;
    jdTTFromUT: (jd: number) => number;
    julianCenturyDays: number;
    moonArgs: {
        argsAt: (jdTT: number) => MoonArgsDeg;
        fwArgs: (jdTT: number) => MoonArgsDeg;
        fwArgsDeep: (jd: number) => MoonArgsDeg | null;
        pureMeeusArgs: (jdTT: number) => MoonArgsDeg;
        planetaryCarrier: (T: number) => number;
        obliquityCarrier: (T: number) => number;
        lpSecularCompletion: (T: number) => number;
        bundle: {
            LP0: number;
            D0: number;
            M0: number;
            MP0: number;
            F0: number;
            LPR: 481267.88123421;
            DR: 445267.1114034;
            MR: 35999.0502909;
            WDOT: number;
            NDOT: number;
            T2_W: number;
            T2_N: number;
            T3_W: number;
            T3_N: number;
            T2_LP: number;
            T2_LP_TIDAL: number;
            S_W: number;
            S_N: number;
            S_W_PHYS: number;
            S_N_PHYS: number;
            W_ICRF: number;
            N_ICRF: number;
            P0: number;
            T2F: number;
        };
        recordCarrierPrefixes: (limitCy: number) => Record<string, {
            fwd: number[];
            bwd: number[];
        }>;
        carrierSeatStatus: () => Record<string, {
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
        }>;
        _rateCompletion: () => {
            rc: {
                ok: boolean;
                pFix: (dyYears: number) => number;
                pdSlopeDegPerCy2: number;
            };
            anchors: {
                ok: boolean;
                Lp: number;
                w: number;
                om: number;
                Lsun: number;
                ws: number;
                Tq: number;
            };
        };
    };
    moonSeries: {
        sceneEvalAt: (dDaysTT: number) => {
            thetaAddRad: number;
            lonDeg: number;
            latRad: number;
            latDeg: number;
            distKm: number;
            T: number;
        };
        truncatedLonDeg: (jdUT: number) => number;
        truncatedBetaDeg: (jdUT: number) => number;
        truncatedDistanceKm: (jdUT: number) => number;
        additionalArgs: (T: number, dDaysTT: number) => {
            A1: number;
            A2: number;
            A3: number;
        };
    };
    moonSynodicMonthDays: number;
    recordLunarCumulativeBank: (limitYears: number) => {
        chains: {
            draconic: {
                fwd: number[];
                bwd: number[];
                segmentYears: number;
            } | null;
            tropical: {
                fwd: number[];
                bwd: number[];
                segmentYears: number;
            } | null;
            anomalistic: {
                fwd: number[];
                bwd: number[];
                segmentYears: number;
            } | null;
            sidereal: {
                fwd: number[];
                bwd: number[];
                segmentYears: number;
            } | null;
            jupiter: {
                fwd: number[];
                bwd: number[];
                segmentYears: number;
            } | null;
        };
        carriers: Record<string, {
            fwd: number[];
            bwd: number[];
        }>;
        segmentYears: number;
        chainLimitYears: number;
    };
};
export type Ctx = import("./time-axis.js").Ctx & ReturnType<typeof assembleLunarTheory>;
