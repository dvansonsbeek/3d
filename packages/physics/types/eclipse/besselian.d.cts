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
     * - the ENGINE year of the UT JD (the TT Julian year from J2000 — the one axis every of-date read takes; a label year parted from it by 1.3 Gyr at the genesis)
     */
    yearFromJD: (jd: number) => number;
    /**
     * - the Sun's TROPICAL mean longitude of date, degrees (mod 360), at the engine year — the banked table (model/sun-mean-longitude.js); the mean Sun whose hour angle the UT axis counts (the GMST below)
     */
    sunMeanLongitudeDegAt: (year: number) => number;
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
        speedOfLightKmS: number;
    };
};
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
 * @property {(jd: number) => number} yearFromJD - the ENGINE year of the UT JD (the TT Julian year from J2000 — the one axis every of-date read takes; a label year parted from it by 1.3 Gyr at the genesis)
 * @property {(year: number) => number} sunMeanLongitudeDegAt - the Sun's TROPICAL mean longitude of date, degrees (mod 360), at the engine year — the banked table (model/sun-mean-longitude.js); the mean Sun whose hour angle the UT axis counts (the GMST below)
 * @property {{ j2000JD: number, julianCenturyDays: number, earthDiameterKm: number,
 *   moonDiameterKm: number, sunDiameterKm: number, sunDistanceKm: number,
 *   earthFlatteningInverse: number, ttBridgeSeconds: number,
 *   gmstMeanSiderealT0Deg: number, speedOfLightKmS: number }} constants
 */
/** Mean sidereal time at Greenwich, degrees (mean equinox of date — pairs with
 *  the mean-of-date body longitudes). THE ONE GMST of the model: the eclipse
 *  location tier, the API's observer tier, the eclipse and lunar audits, the
 *  drawn Earth's spin and the browser's diagnostics all read it.
 *
 *  Newcomb's definition on the model's OWN mean Sun (doc 111 §1.51): the UT
 *  axis counts SOLAR DAYS OF DATE (§1.36), so the mean Sun's hour angle is
 *  360° per UT day by construction and the sidereal angle is
 *
 *      GMST(jdUT) = T₀ + 360°·(jdUT − J2000) + [L(t) − L(t₀)]
 *
 *  with L the Sun's tropical mean longitude of date at the engine year t of
 *  the UT instant (the banked table, its own slice) and T₀ the IAU J2000
 *  sidereal time — the ONE measured anchor (T₀ − (L₀ − κ_aberration) = 0.53″).
 *  Its rate per solar day is 360°·(1 + 1/Y(t)), Y the tropical year in solar
 *  days of date: the published sidereal day of date (`lengths.siderealDaySeconds`,
 *  LOD·Y/(Y + 1)) by the same law — the drawn spin, the umbra's longitude and
 *  the published day are one quantity, bounded to the genesis edge.
 *
 *  It replaces the IAU 1982 polynomial (T₀ + rate·d + 1.39656″·T² on a
 *  J2000-frozen rate — 270° mod 360 at −1 Myr), now the REFEREE of
 *  `tools/verify/gmst-of-date.js`: the two agree to 0.3″ at 2026 and part by
 *  124″ (8 s of time, 0.03° of longitude) at −135 and 58 s at −3000 — IAU UT1
 *  is linear in the Earth rotation angle, mean solar time is not: 0.3″·T², a
 *  convention the ΔT record cannot resolve. The gate also reads the
 *  non-rotating origin transported on the model's own frames of date against
 *  the IAU 2006 polynomial (0.1″ over the audit window, nothing fitted).
 *  @param {number} jdUT
 *  @param {{ j2000JD: number, gmstMeanSiderealT0Deg: number }} K
 *  @param {(jdUT: number) => number} sunMeanLongitudeDegAtJD the mean Sun's tropical longitude at the UT JD, degrees (mod 360)
 *  @param {number} sunMeanLongitudeJ2000Deg the same function at K.j2000JD (memoised by the caller)
 *  @returns {number} */
export function computeGmstDeg(jdUT: number, K: {
    j2000JD: number;
    gmstMeanSiderealT0Deg: number;
}, sunMeanLongitudeDegAtJD: (jdUT: number) => number, sunMeanLongitudeJ2000Deg: number): number;
