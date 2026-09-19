export type MoonArgsDeg = {
    Lp: number;
    D: number;
    M: number;
    Mp: number;
    F: number;
};
/**
 * @typedef {{Lp: number, D: number, M: number, Mp: number, F: number}} MoonArgsDeg
 */
/**
 * @param {{
 *   constants: {
 *     j2000JD: number,
 *     julianCenturyDays: number,
 *     holisticYearJ2000: number,
 *     balancedYearJ2000: number,
 *     meanSolarYearDays: number,
 *     meanAnomalisticYearDays: number,
 *     tropicalYearHarmonics: Array<[number, number, number]>,
 *     anomalisticYearHarmonics: Array<[number, number, number]>,
 *     eccentricityJ2000: number,
 *     eccentricityDotJ2000: number,
 *     eccentricityDotDotJ2000: number,
 *     elpEarthFigureJ2ArcsecPerCy2: number,
 *     elpGeneralPrecessionPA_T2ArcsecPerCy2: number,
 *     eccE0: number,
 *   },
 *   fns: {
 *     eccAt: (tYr: number) => number,
 *     channelIntegral: (T: number, s: number) => number,
 *     computeObliquityEarth: (year: number) => number,
 *     jdToSIyear: (jd: number) => number,
 *     tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     nodalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *     isDeepTime: () => boolean,
 *     isFrameworkNative: () => boolean,
 *     pDynDegPerYearAt?: (year: number) => number,
 *     pKinDegPerYearAt?: (year: number) => number,
 *   },
 * }} deps — fns are the ENGINE'S OWN chain wrappers (each engine's toggle
 *   semantics ride along); eccAt/channelIntegral are the shared moon ecc
 *   channel; constants are J2000-frozen injections. The OPTIONAL precession
 *   pair powers the (d′) of-date rate completion: pDyn = the DYNAMICAL
 *   axial precession (day-form beat of the engine's sidereal/solar year
 *   evaluators — the tweakpane identity, real at J2000, epoch-valid);
 *   pKin = the KINEMATIC pair's beat (the H/13-family mean the chains
 *   embed). Absent ⇒ the completion is disabled (pre-(d′) behaviour).
 */
export function createMoonArguments({ constants, fns }: {
    constants: {
        j2000JD: number;
        julianCenturyDays: number;
        holisticYearJ2000: number;
        balancedYearJ2000: number;
        meanSolarYearDays: number;
        meanAnomalisticYearDays: number;
        tropicalYearHarmonics: Array<[number, number, number]>;
        anomalisticYearHarmonics: Array<[number, number, number]>;
        eccentricityJ2000: number;
        eccentricityDotJ2000: number;
        eccentricityDotDotJ2000: number;
        elpEarthFigureJ2ArcsecPerCy2: number;
        elpGeneralPrecessionPA_T2ArcsecPerCy2: number;
        eccE0: number;
    };
    fns: {
        eccAt: (tYr: number) => number;
        channelIntegral: (T: number, s: number) => number;
        computeObliquityEarth: (year: number) => number;
        jdToSIyear: (jd: number) => number;
        tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null);
        apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null);
        nodalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null);
        cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null);
        isDeepTime: () => boolean;
        isFrameworkNative: () => boolean;
        pDynDegPerYearAt?: (year: number) => number;
        pKinDegPerYearAt?: (year: number) => number;
    };
}): {
    argsAt: (jdTT: number) => MoonArgsDeg;
    fwArgs: (jdTT: number) => MoonArgsDeg;
    fwArgsDeep: (jd: number) => MoonArgsDeg | null;
    pureMeeusArgs: (jdTT: number) => MoonArgsDeg;
    sunSecularDeviations: (jdTT: number) => {
        dLs: number;
        dPeri: number;
    };
    planetaryCarrier: (T: number) => number;
    obliquityCarrier: (T: number) => number;
    lpSecularCompletion: (T: number) => number;
    bundle: {
        LP0: number;
        D0: number;
        M0: number;
        MP0: number;
        F0: number;
        LPR: number;
        DR: number;
        MR: number;
        P_DEGCY: number;
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
    };
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
/**
 * Astronomical JD → decimal year: Julian calendar before 1582-10-15,
 * Gregorian after (Meeus Ch. 7 inverse). The S3-aligned coordinate for the
 * Sun secular deviations. @param {number} jd @returns {number}
 */
export function jdToDecimalYear(jd: number): number;
