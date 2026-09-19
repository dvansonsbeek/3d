export type FrameworkSunDeps = {
    /**
     * - L0 anchor (input anchor, 280.46646)
     */
    sunMeanLongitudeJ2000Deg: number;
    /**
     * - the framework tropical rate (from the year chain)
     */
    tropicalRateDegPerCy: number;
    /**
     * - the framework e(t) law
     */
    eccentricityAt: (year: number) => number;
    /**
     * - the framework ϖ(t) law (heliocentric)
     */
    perihelionLongitudeDegAt: (year: number) => number;
    /**
     * - optional epoch-dependent
     * mean longitude L(t) (e.g. L0 + ∫rate·dt from the f(Y) tropical-year chain);
     * absent = the linear form L0 + rate·T
     */
    meanLongitudeDegAt?: ((year: number) => number) | undefined;
};
export type EclipseFinderDeps = {
    /**
     * - truncated-series ecliptic longitude
     */
    moonLonDegAt: (jd: number) => number;
    /**
     * - truncated-series ecliptic latitude
     */
    moonBetaDegAt: (jd: number) => number;
    /**
     * - truncated-series distance
     */
    moonDistanceKmAt: (jd: number) => number;
    /**
     * - the engine's ΔT convention
     */
    deltaTSecondsAt: (jd: number) => number;
    /**
     * - live (epoch-mutable)
     */
    getSynodicMonthDays: () => number;
    /**
     * - live (epoch-mutable)
     */
    getSunDistanceKm: () => number;
    /**
     * - E4 (the native-Sun landing,
     * plan §12i item 11): when present, sunLonDegAt uses the FRAMEWORK form —
     * linear tropical rate + Kepler EoC (to e³) on the framework e(t)/ϖ(t)
     * laws, TT clock unchanged — instead of the Meeus Ch. 25 polynomials.
     * Absent = the historical Meeus form (every certified number's current
     * basis). The swap is a conscious matched-pair event: the D2 completion's
     * fitted 2lE residue and the certified statistics re-measure with it.
     */
    frameworkSun?: FrameworkSunDeps | undefined;
    constants: {
        rEarthMetres: number;
        moonDiameterKm: number;
        sunDiameterKm: number;
        j2000JD: number;
        julianCenturyDays: number;
    };
};
/**
 * @typedef {Object} FrameworkSunDeps
 * @property {number} sunMeanLongitudeJ2000Deg - L0 anchor (input anchor, 280.46646)
 * @property {number} tropicalRateDegPerCy - the framework tropical rate (from the year chain)
 * @property {(year: number) => number} eccentricityAt - the framework e(t) law
 * @property {(year: number) => number} perihelionLongitudeDegAt - the framework ϖ(t) law (heliocentric)
 * @property {(year: number) => number} [meanLongitudeDegAt] - optional epoch-dependent
 *   mean longitude L(t) (e.g. L0 + ∫rate·dt from the f(Y) tropical-year chain);
 *   absent = the linear form L0 + rate·T
 */
/**
 * @typedef {Object} EclipseFinderDeps
 * @property {(jd: number) => number} moonLonDegAt - truncated-series ecliptic longitude
 * @property {(jd: number) => number} moonBetaDegAt - truncated-series ecliptic latitude
 * @property {(jd: number) => number} moonDistanceKmAt - truncated-series distance
 * @property {(jd: number) => number} deltaTSecondsAt - the engine's ΔT convention
 * @property {() => number} getSynodicMonthDays - live (epoch-mutable)
 * @property {() => number} getSunDistanceKm - live (epoch-mutable)
 * @property {FrameworkSunDeps} [frameworkSun] - E4 (the native-Sun landing,
 *   plan §12i item 11): when present, sunLonDegAt uses the FRAMEWORK form —
 *   linear tropical rate + Kepler EoC (to e³) on the framework e(t)/ϖ(t)
 *   laws, TT clock unchanged — instead of the Meeus Ch. 25 polynomials.
 *   Absent = the historical Meeus form (every certified number's current
 *   basis). The swap is a conscious matched-pair event: the D2 completion's
 *   fitted 2lE residue and the certified statistics re-measure with it.
 * @property {{ rEarthMetres: number, moonDiameterKm: number,
 *   sunDiameterKm: number, j2000JD: number, julianCenturyDays: number }} constants
 */
/** @param {EclipseFinderDeps} deps */
export function createEclipseFinders(deps: EclipseFinderDeps): {
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
