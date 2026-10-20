export type MoonArgsDeg = {
    Lp: number;
    D: number;
    M: number;
    Mp: number;
    F: number;
};
/**
 * @param {{
 *   constants: {
 *     j2000JD: number,
 *     julianCenturyDays: number,
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
 *     sunMeanLonDegAtJdTT: (jdTT: number) => number,
 *     sunPerihelionLonDegAtJdTT: (jdTT: number) => number,
 *     jdToSIyear: (jd: number) => number,
 *     tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     nodalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
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
 *   Plan 09: the Sun of the arguments is the engine's ONE certified Sun —
 *   sunMeanLonDegAtJdTT (the mean longitude that integrates the one-family
 *   tropical year, unwrapped) and sunPerihelionLonDegAtJdTT (the mean
 *   perihelion of date, wrapped — the arguments wrap M, and the rate anchors
 *   difference it over ±25 days wrapped to ±180°). The former "model timeline" Sun — 360° per mean solar
 *   year plus the closed-form integrals of the retired year-length combs,
 *   the perihelion on the H/16 chain count — sat 0.2° behind the IAU mean
 *   Sun at −2000 (the combs could not carry the tropical year's secular
 *   drift); measured against Meeus L0 before the move.
 */
export function createMoonArguments({ constants, fns }: {
    constants: {
        j2000JD: number;
        julianCenturyDays: number;
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
        sunMeanLonDegAtJdTT: (jdTT: number) => number;
        sunPerihelionLonDegAtJdTT: (jdTT: number) => number;
        jdToSIyear: (jd: number) => number;
        tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null);
        apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null);
        nodalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null);
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
import { jdToDecimalYear } from "../time/calendar.cjs";
/**
 * @typedef {{Lp: number, D: number, M: number, Mp: number, F: number}} MoonArgsDeg
 */
/** The secular-completion taper half-width, Julian years: the cos² envelope
 *  inside which the chain's Meeus-measured rate anchors and the Lp secular
 *  completion act (full at the anchor, zero beyond). A recorded window of the
 *  completion, not a law — the anchors were measured with it (plan 09 step
 *  5c: it was written as the era unit's twelfth, H/12, "lattice-derived";
 *  the value is kept bit-identical and named for what it is). */
export const SECULAR_COMPLETION_TAPER_YEARS: 27943.083333333332;
export { jdToDecimalYear };
