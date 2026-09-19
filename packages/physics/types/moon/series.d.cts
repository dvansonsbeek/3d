export type MeeusTermTable = Array<[number, number, number, number, number]>;
/**
 * @typedef {Array<[number, number, number, number, number]>} MeeusTermTable
 */
/**
 * @param {{
 *   constants: {
 *     moonL: MeeusTermTable,
 *     moonB: MeeusTermTable,
 *     moonR: MeeusTermTable,
 *     moonRMeanKm: number,
 *     moonDistanceJ2000Km: number,
 *     j2000JD: number,
 *     julianCenturyDays: number,
 *     moonMeeusLpCorrectionDeg: number,
 *     fwA2RateDegPerCy: number,
 *     fwA3RateDegPerCy: number,
 *   },
 *   fns: {
 *     argsAt: (jdTT: number) => {Lp: number, D: number, M: number, Mp: number, F: number},
 *     eFactorForD: (dDaysTT: number, T: number, T2: number) => number,
 *     eFactorAtJdTT: (jdTT: number, T: number, T2: number) => number,
 *     getMoonDistanceKm: (jdTT?: number) => number,
 *     getEccentricityBase: () => number,
 *     deltaTSeconds: (jdUT: number) => number,
 *     jdToSIyear: (jd: number) => number,
 *     tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null),
 *     cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *     jupiterOrbitsBetween: (yearA: number, yearB: number) => (number | null),
 *     isDeepTime: () => boolean,
 *     isFrameworkNative: () => boolean,
 *   },
 * }} deps — argsAt is the engine's dispatcher (probe hook and mode toggle
 *   ride along); eFactorForD preserves each engine's exact E-factor call
 *   shape (S11: the two convert d→years with differently-associated
 *   expressions); distance/eccentricity are GETTERS because the browser's
 *   moonDistance is deep-time-mutable.
 */
export function createMoonSeries({ constants, fns }: {
    constants: {
        moonL: MeeusTermTable;
        moonB: MeeusTermTable;
        moonR: MeeusTermTable;
        moonRMeanKm: number;
        moonDistanceJ2000Km: number;
        j2000JD: number;
        julianCenturyDays: number;
        moonMeeusLpCorrectionDeg: number;
        fwA2RateDegPerCy: number;
        fwA3RateDegPerCy: number;
    };
    fns: {
        argsAt: (jdTT: number) => {
            Lp: number;
            D: number;
            M: number;
            Mp: number;
            F: number;
        };
        eFactorForD: (dDaysTT: number, T: number, T2: number) => number;
        eFactorAtJdTT: (jdTT: number, T: number, T2: number) => number;
        getMoonDistanceKm: (jdTT?: number) => number;
        getEccentricityBase: () => number;
        deltaTSeconds: (jdUT: number) => number;
        jdToSIyear: (jd: number) => number;
        tropicalOrbitsBetween: (yearA: number, yearB: number) => (number | null);
        apsidalOfDateCyclesBetween: (yearA: number, yearB: number) => (number | null);
        cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null);
        jupiterOrbitsBetween: (yearA: number, yearB: number) => (number | null);
        isDeepTime: () => boolean;
        isFrameworkNative: () => boolean;
    };
}): {
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
