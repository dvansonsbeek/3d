export type BesselianDeps = {
    /**
     *   full-series Moon: ecliptic-of-date longitude/latitude (deg) + distance (km), TT axis (days since J2000)
     */
    moonFullAtDaysTT: (dDaysTT: number) => {
        lonDeg: number;
        latDeg: number;
        distKm: number;
    };
    /**
     * - geometric mean sun longitude (deg), JD(UT) axis with the finder's internal ΔT
     */
    sunLonDegAt: (jdUT: number) => number;
    /**
     * - planetary completion (deg) at T centuries TT, SUBTRACTED from the finder sun (see eclipse/sun-planetary-completion.cjs; the finders deliberately stay without it — their fitted anchors and certified canon statistics were produced on the bare form, and elongation-class timing absorbs the omission into the fitted phases)
     */
    sunCompletionDeg: (T: number) => number;
    /**
     * - the Sun's derived planetary aberration κ (deg) at calendar year, SUBTRACTED from the geometric Sun longitude (the apparent Sun; see the header)
     */
    sunAberrationDegAt: (year: number) => number;
    /**
     * - framework ΔT (J2000-zeroed convention)
     */
    deltaTSecondsAt: (jd: number) => number;
    /**
     * - framework obliquity (deg) at calendar year
     */
    obliquityDegAt: (year: number) => number;
    /**
     * - framework Earth-orbit eccentricity at calendar year
     */
    eccentricityAt: (year: number) => number;
    /**
     * - framework perihelion longitude (deg) at calendar year
     */
    perihelionLongitudeDegAt: (year: number) => number;
    /**
     * - the model's own JD → calendar-year conversion
     */
    yearFromJD: (jd: number) => number;
    constants: {
        j2000JD: number;
        julianCenturyDays: number;
        earthDiameterKm: number;
        moonDiameterKm: number;
        sunDiameterKm: number;
        sunDistanceKm: number;
        earthFlatteningInverse: number;
        ttBridgeSeconds: number;
        gmstMeanSiderealT0Deg: number;
        gmstMeanSiderealRateDegPerDay: number;
        gmstMeanSiderealT2Deg: number;
        speedOfLightKmS: number;
    };
};
/**
 * @typedef {Object} BesselianDeps
 * @property {(dDaysTT: number) => {lonDeg: number, latDeg: number, distKm: number}} moonFullAtDaysTT
 *   full-series Moon: ecliptic-of-date longitude/latitude (deg) + distance (km), TT axis (days since J2000)
 * @property {(jdUT: number) => number} sunLonDegAt - geometric mean sun longitude (deg), JD(UT) axis with the finder's internal ΔT
 * @property {(T: number) => number} sunCompletionDeg - planetary completion (deg) at T centuries TT, SUBTRACTED from the finder sun (see eclipse/sun-planetary-completion.cjs; the finders deliberately stay without it — their fitted anchors and certified canon statistics were produced on the bare form, and elongation-class timing absorbs the omission into the fitted phases)
 * @property {(year: number) => number} sunAberrationDegAt - the Sun's derived planetary aberration κ (deg) at calendar year, SUBTRACTED from the geometric Sun longitude (the apparent Sun; see the header)
 * @property {(jd: number) => number} deltaTSecondsAt - framework ΔT (J2000-zeroed convention)
 * @property {(year: number) => number} obliquityDegAt - framework obliquity (deg) at calendar year
 * @property {(year: number) => number} eccentricityAt - framework Earth-orbit eccentricity at calendar year
 * @property {(year: number) => number} perihelionLongitudeDegAt - framework perihelion longitude (deg) at calendar year
 * @property {(jd: number) => number} yearFromJD - the model's own JD → calendar-year conversion
 * @property {{ j2000JD: number, julianCenturyDays: number, earthDiameterKm: number,
 *   moonDiameterKm: number, sunDiameterKm: number, sunDistanceKm: number,
 *   earthFlatteningInverse: number, ttBridgeSeconds: number,
 *   gmstMeanSiderealT0Deg: number, gmstMeanSiderealRateDegPerDay: number,
 *   gmstMeanSiderealT2Deg: number, speedOfLightKmS: number }} constants
 */
/** @param {BesselianDeps} deps */
export function createBesselian(deps: BesselianDeps): {
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
};
