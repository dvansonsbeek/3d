/** @param {import('./time-axis.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleLunarTheory(ctx: import("./time-axis.js").Ctx): {
    deepCalendar: import("../phase/deep-calendar.cjs").DeepCalendar;
    frameworkDeltaTSecondsAtJD: (jd: number) => number;
    j2000JD: number;
    jdTTFromUT: (jd: number) => number;
    julianCenturyDays: number;
    moonArgs: {
        argsAt: (jdTT: number) => MoonArgsDeg;
        meanElongationUnwrappedDeg: (jdTT: number) => number | null;
        fwArgs: (jdTT: number) => MoonArgsDeg;
        fwArgsDeep: (jd: number) => MoonArgsDeg | null;
        pureMeeusArgs: (jdTT: number) => MoonArgsDeg;
        planetaryCarrier: (T: number) => number;
        obliquityCarrier: (T: number) => number;
        lpSecularCompletion: (T: number) => number;
        apsidalNodalSecularCompletion: (T: number) => {
            w: number;
            om: number;
        };
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
        recordCarrierPrefixes: (limitCy: number | {
            past: number;
            future: number;
        }) => Record<string, {
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
    recordLunarCumulativeBank: (limitYears: number | {
        past: number;
        future: number;
    }) => {
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
        channel: {
            windowCenturies: number;
            segmentCenturies: number;
            exponents: {
                s: number;
                edge: {
                    fwd: number;
                    bwd: number;
                };
                fwd: number[];
                bwd: number[];
            }[];
        };
        segmentYears: number;
        chainLimitYears: number;
    };
    lunarSeatStatus: () => {
        chains: Record<string, {
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
        } | null>;
        carriers: Record<string, {
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
        channel: {
            s: number;
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
        }[];
    };
    moonAxialTilt: {
        stateAtAge: (tMa: number, reading?: CassiniReading) => {
            ageMa: number;
            aOverEarthRadii: number;
            state: number;
            thetaDeg: number;
            inclinationDeg: number;
            obliquityToOrbitEqDeg: number;
            obliquityToOrbitDeg: number;
            obliquityToLaplacePoleDeg: number;
            anchorScale: number;
            transition: {
                aOverEarthRadii: number;
                ageMa: number;
                lastState1Deg: number;
                state2Deg: number;
            } | null;
            nodePeriodYears: number;
        } | null;
        bandAtAge: (tMa: number) => {
            shipped: {
                ageMa: number;
                aOverEarthRadii: number;
                state: number;
                thetaDeg: number;
                inclinationDeg: number;
                obliquityToOrbitEqDeg: number;
                obliquityToOrbitDeg: number;
                obliquityToLaplacePoleDeg: number;
                anchorScale: number;
                transition: {
                    aOverEarthRadii: number;
                    ageMa: number;
                    lastState1Deg: number;
                    state2Deg: number;
                } | null;
                nodePeriodYears: number;
            } | null;
            readings: {
                name: string;
                state: {
                    ageMa: number;
                    aOverEarthRadii: number;
                    state: number;
                    thetaDeg: number;
                    inclinationDeg: number;
                    obliquityToOrbitEqDeg: number;
                    obliquityToOrbitDeg: number;
                    obliquityToLaplacePoleDeg: number;
                    anchorScale: number;
                    transition: {
                        aOverEarthRadii: number;
                        ageMa: number;
                        lastState1Deg: number;
                        state2Deg: number;
                    } | null;
                    nodePeriodYears: number;
                } | null;
            }[];
            minObliquityToOrbitDeg: number | null;
            maxObliquityToOrbitDeg: number | null;
        };
        transition: (reading?: CassiniReading) => {
            aOverEarthRadii: number;
            ageMa: number;
            lastState1Deg: number;
            state2Deg: number;
        } | null;
        rawAtAge: (tMa: number, reading?: CassiniReading) => CassiniRaw | null;
        figure: Readonly<{
            cMinusAOverC: 0.00063;
            bMinusAOverC: 0.000228;
            hydrostaticRadiusEarthRadii: 15;
            hydrostaticRadiusBandEarthRadii: 21;
            sources: "Peale 1969 (AJ 74, 483); Ward 1975 (Science 189, 377); Yoder 1995; Williams et al. 2001, 2014; Ćuk, Hamilton & Stewart 2021 (PSJ 2, 221)";
        }>;
        edgeMa: number;
    };
};
export type Ctx = import("./time-axis.js").Ctx & ReturnType<typeof assembleLunarTheory>;
