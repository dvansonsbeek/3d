export type EclipseConstants = {
    rEarthMetres: number;
    moonDiameterKm: number;
    sunDiameterKm: number;
    j2000JD: number;
    julianCenturyDays: number;
};
export type EclipseFormulaDeps = {
    /**
     * - the truncated series' ecliptic longitude (the finders' own)
     */
    moonLonDegAt: (jdUT: number) => number;
    /**
     * - the truncated series' ecliptic latitude
     */
    moonBetaDegAt: (jdUT: number) => number;
    /**
     * - the truncated series' distance
     */
    moonDistanceKmAt: (jdUT: number) => number;
    /**
     * - the finders' Sun (mean geometric longitude of date)
     */
    sunLonDegAt: (jdUT: number) => number;
    /**
     * - the engine's ΔT at a UT JD (the one bridge, UT → TT)
     */
    deltaTSecondsAt: (jdUT: number) => number;
    /**
     * - the one bridge's inverse, TT → UT (phase/deep-calendar's ΔT at a TT instant)
     */
    jdUTFromTT: (jdTT: number) => number;
    /**
     * - the mean elongation L′ − L_sun of date, UNWRAPPED (moon/arguments); null beyond the chains
     */
    meanElongationUnwrappedDegAt: (jdTT: number) => number | null;
    /**
     * - the arguments of date, degrees (moon/arguments)
     */
    argsAt: (jdTT: number) => {
        Lp: number;
        D: number;
        M: number;
        Mp: number;
        F: number;
    };
    /**
     * - live (epoch-mutable), the finders' own
     */
    getSunDistanceKm: () => number;
    /**
     * - the chain's periods of date, the mean Moon distance, the orbit's inclination to the ecliptic of date and the Laplace plane's tilt from the ecliptic (the regime's marker); null beyond the histories
     */
    periodsOfDateAt: (jdTT: number) => (PeriodsOfDate & {
        moonDistanceKm: number;
        inclinationDeg: number;
        laplaceTiltDeg: number;
    }) | null;
    /**
     * - the navigable domain's TT edges (the Newton seed is clamped inside it)
     */
    jdTTDomain: () => {
        min: number;
        max: number;
    };
    constants: EclipseConstants;
    /**
     * - the certified window in engine years (default: the canon's)
     */
    certifiedWindowYears?: {
        min: number;
        max: number;
    } | undefined;
};
export type EclipseKind = "lunar" | "solar";
export type EclipseOfDate = {
    /**
     * - the mean syzygy count from J2000 (Meeus's k: integer, the full Moon at k + ½ counted on its own axis)
     */
    k: number;
    kind: EclipseKind;
    /**
     * - the TRUE syzygy (opposition or conjunction in longitude), TT
     */
    jdSyzygyTT: number;
    jdSyzygyUT: number;
    /**
     * - GREATEST eclipse (the least distance from the shadow axis), TT
     */
    jdTT: number;
    jdUT: number;
    /**
     * - ΔT at the instant (the civil bridge)
     */
    deltaTSeconds: number;
    /**
     * - the Moon's ecliptic latitude at greatest eclipse
     */
    betaDeg: number;
    /**
     * - at greatest eclipse
     */
    moonDistanceKm: number;
    sunDistanceKm: number;
    /**
     * - the arguments of date at the syzygy
     */
    argsDeg: {
        D: number;
        M: number;
        Mp: number;
        F: number;
    };
    /**
     * - the Moon's distance from the nearer node at the syzygy (|F| folded to 0…90°)
     */
    nodeDistanceDeg: number;
    /**
     * - 'Total' | 'Partial' | 'Penumbral' (lunar) · 'Total' | 'Annular' | 'Partial' (solar) · null = no eclipse
     */
    type: string | null;
    /**
     * - lunar: the signed least distance in Earth radii on the fundamental plane (the canon's γ); solar: γ in Earth radii (unsigned, the finders')
     */
    gamma: number;
    /**
     * - lunar: the least angular distance from the shadow axis
     */
    sigmaDeg?: number | undefined;
    /**
     * - lunar
     */
    magnitudeUmbral?: number | undefined;
    /**
     * - lunar
     */
    magnitudePenumbral?: number | undefined;
    /**
     * - solar: the topocentric Moon over the Sun
     */
    moonSunRatio?: number | undefined;
    geometry: ReturnType<typeof lunarShadowGeometry> | ReturnType<typeof solarShadowGeometry>;
    regime: "certified" | "reproducible";
};
/**
 * every period in SI days (86,400 s); solarDayDays = LOD/86,400 — the solar day of date in SI days
 */
export type PeriodsOfDate = {
    synodicDays: number;
    draconicDays: number;
    anomalisticDays: number;
    siderealMonthDays: number;
    tropicalYearDays: number;
    siderealYearDays: number;
    solarDayDays: number;
};
/**
 * synodicMonths the integer month count n; cycles the count of the second period (half-integer
 * for the node when the cycle closes at the OPPOSITE node — the inex, the tritos); the shift of
 * the argument per cycle in degrees; the span in SI days, in solar days of date and in tropical
 * years of date; today's name where the pair is today's.
 */
export type Recurrence = {
    synodicMonths: number;
    cycles: number;
    shiftDegPerCycle: number;
    spanDays: number;
    spanSolarDays: number;
    spanYears: number;
    name: string | null;
};
/**
 * @typedef {Object} EclipseFormulaDeps
 * @property {(jdUT: number) => number} moonLonDegAt - the truncated series' ecliptic longitude (the finders' own)
 * @property {(jdUT: number) => number} moonBetaDegAt - the truncated series' ecliptic latitude
 * @property {(jdUT: number) => number} moonDistanceKmAt - the truncated series' distance
 * @property {(jdUT: number) => number} sunLonDegAt - the finders' Sun (mean geometric longitude of date)
 * @property {(jdUT: number) => number} deltaTSecondsAt - the engine's ΔT at a UT JD (the one bridge, UT → TT)
 * @property {(jdTT: number) => number} jdUTFromTT - the one bridge's inverse, TT → UT (phase/deep-calendar's ΔT at a TT instant)
 * @property {(jdTT: number) => number | null} meanElongationUnwrappedDegAt - the mean elongation L′ − L_sun of date, UNWRAPPED (moon/arguments); null beyond the chains
 * @property {(jdTT: number) => {Lp: number, D: number, M: number, Mp: number, F: number}} argsAt - the arguments of date, degrees (moon/arguments)
 * @property {() => number} getSunDistanceKm - live (epoch-mutable), the finders' own
 * @property {(jdTT: number) => (PeriodsOfDate & { moonDistanceKm: number, inclinationDeg: number, laplaceTiltDeg: number }) | null} periodsOfDateAt - the chain's periods of date, the mean Moon distance, the orbit's inclination to the ecliptic of date and the Laplace plane's tilt from the ecliptic (the regime's marker); null beyond the histories
 * @property {() => {min: number, max: number}} jdTTDomain - the navigable domain's TT edges (the Newton seed is clamped inside it)
 * @property {EclipseConstants} constants
 * @property {{min: number, max: number}} [certifiedWindowYears] - the certified window in engine years (default: the canon's)
 */
/** @typedef {'lunar' | 'solar'} EclipseKind */
/**
 * @typedef {Object} EclipseOfDate
 * @property {number} k - the mean syzygy count from J2000 (Meeus's k: integer, the full Moon at k + ½ counted on its own axis)
 * @property {EclipseKind} kind
 * @property {number} jdSyzygyTT - the TRUE syzygy (opposition or conjunction in longitude), TT
 * @property {number} jdSyzygyUT
 * @property {number} jdTT - GREATEST eclipse (the least distance from the shadow axis), TT
 * @property {number} jdUT
 * @property {number} deltaTSeconds - ΔT at the instant (the civil bridge)
 * @property {number} betaDeg - the Moon's ecliptic latitude at greatest eclipse
 * @property {number} moonDistanceKm - at greatest eclipse
 * @property {number} sunDistanceKm
 * @property {{D: number, M: number, Mp: number, F: number}} argsDeg - the arguments of date at the syzygy
 * @property {number} nodeDistanceDeg - the Moon's distance from the nearer node at the syzygy (|F| folded to 0…90°)
 * @property {string | null} type - 'Total' | 'Partial' | 'Penumbral' (lunar) · 'Total' | 'Annular' | 'Partial' (solar) · null = no eclipse
 * @property {number} gamma - lunar: the signed least distance in Earth radii on the fundamental plane (the canon's γ); solar: γ in Earth radii (unsigned, the finders')
 * @property {number} [sigmaDeg] - lunar: the least angular distance from the shadow axis
 * @property {number} [magnitudeUmbral] - lunar
 * @property {number} [magnitudePenumbral] - lunar
 * @property {number} [moonSunRatio] - solar: the topocentric Moon over the Sun
 * @property {ReturnType<typeof lunarShadowGeometry> | ReturnType<typeof solarShadowGeometry>} geometry
 * @property {'certified' | 'reproducible'} regime
 */
/** @param {EclipseFormulaDeps} deps */
export function createEclipseFormula(deps: EclipseFormulaDeps): {
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
    eclipsesInRange: (jdUTStart: number, jdUTEnd: number, kind: EclipseKind) => EclipseOfDate[];
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
    recurrencesAt: (jdTT: number, opts?: Parameters<typeof recurrencesOfDate>[1]) => {
        node: Recurrence[];
        anomaly: Recurrence[];
        year: Recurrence[];
    } | null;
    /** @param {number} jdTT */ regimeAt: (jdTT: number) => "certified" | "reproducible";
    /** The arguments of date the formula runs on (degrees, wrapped) — the gate's regressor. @param {number} jdTT */
    argumentsAt: (jdTT: number) => {
        Lp: number;
        D: number;
        M: number;
        Mp: number;
        F: number;
    };
    /** The periods of date the recurrences and the statistics run on (SI days), with the mean Moon distance, the inclination and the Laplace tilt of date. @param {number} jdTT */
    periodsAt: (jdTT: number) => (PeriodsOfDate & {
        moonDistanceKm: number;
        inclinationDeg: number;
        laplaceTiltDeg: number;
    }) | null;
    /** The series' elongation from the syzygy offset at a UT instant, wrapped (the formula's own residual: 0 at the true syzygy; at the MEAN syzygy it is the periodic correction of date). @param {number} jdUT @param {EclipseKind} kind */
    elongationResidualDegAt: (jdUT: number, kind: EclipseKind) => number;
    certifiedWindowYears: Readonly<{
        min: -1999;
        max: 3000;
    }> | {
        min: number;
        max: number;
    };
};
/**
 * The recurrences of date — for every month count n ≤ maxN the nearest count k of the second
 * period (the node: half-integer allowed — a cycle closing at the opposite node; the anomaly and
 * the season: integer), the shift of the argument per cycle 360·(n·P_syn − k·P)/P, filtered to
 * |shift| ≤ the tolerance, reduced to PRIMITIVE pairs (a multiple of a kept pair with the same
 * ratio is dropped), the shortest first. The tolerances are the ones that select today's named
 * cycles and nothing shorter (step 0's measurement): the node 1° (the tritos 0.52°, the Saros
 * 0.48°, the inex 0.04°; the next shorter pair 88/95.5 reads 1.00°), the season 1° (the Metonic
 * alone, 0.09°), the anomaly 3.5° (the Saros's 223/239 reads 2.82°).
 * @param {PeriodsOfDate} P
 * @param {{maxSynodicMonths?: number, nodeTolDeg?: number, anomalyTolDeg?: number, yearTolDeg?: number, keep?: number}} [opts]
 * @returns {{node: Recurrence[], anomaly: Recurrence[], year: Recurrence[]}}
 */
export function recurrencesOfDate(P: PeriodsOfDate, opts?: {
    maxSynodicMonths?: number;
    nodeTolDeg?: number;
    anomalyTolDeg?: number;
    yearTolDeg?: number;
    keep?: number;
}): {
    node: Recurrence[];
    anomaly: Recurrence[];
    year: Recurrence[];
};
/**
 * @typedef {{ rEarthMetres: number, moonDiameterKm: number, sunDiameterKm: number, j2000JD: number, julianCenturyDays: number }} EclipseConstants
 */
/**
 * The lunar shadow's angular geometry at the Moon's distance — Danjon's enlarged umbra and
 * penumbra and the three class limits on the Moon's angular distance σ from the shadow axis.
 * The finders' `_shadowGeometry`, verbatim (bit-identical doubles).
 * @param {number} moonDistanceKm @param {number} sunDistanceKm @param {EclipseConstants} K
 * @returns {{moonR: number, umbraR: number, penumR: number, totalMax: number, partialMax: number, penumMax: number}} degrees
 */
export function lunarShadowGeometry(moonDistanceKm: number, sunDistanceKm: number, K: EclipseConstants): {
    moonR: number;
    umbraR: number;
    penumR: number;
    totalMax: number;
    partialMax: number;
    penumMax: number;
};
/**
 * The lunar type and magnitudes from the least distance σ (degrees) — the finders' rule.
 * @param {number} sigmaDeg @param {ReturnType<typeof lunarShadowGeometry>} G
 * @returns {{type: 'Total' | 'Partial' | 'Penumbral' | null, magnitudeUmbral: number, magnitudePenumbral: number}}
 */
export function lunarTypeAt(sigmaDeg: number, G: ReturnType<typeof lunarShadowGeometry>): {
    type: "Total" | "Partial" | "Penumbral" | null;
    magnitudeUmbral: number;
    magnitudePenumbral: number;
};
/**
 * The solar geometry at conjunction (Meeus Ch. 54's geocentric form with the topocentric Moon):
 * the finders' `_solarGeometry`, verbatim.
 * @param {number} moonDistanceKm @param {number} sunDistanceKm @param {EclipseConstants} K
 * @returns {{moonAppR_geo: number, moonAppR_topo: number, parallax: number, sunAppR: number, partialLim: number, centralLim: number, isTotal: boolean}} degrees
 */
export function solarShadowGeometry(moonDistanceKm: number, sunDistanceKm: number, K: EclipseConstants): {
    moonAppR_geo: number;
    moonAppR_topo: number;
    parallax: number;
    sunAppR: number;
    partialLim: number;
    centralLim: number;
    isTotal: boolean;
};
/**
 * The solar type from |β| at greatest eclipse — the finders' rule.
 * @param {number} absBetaDeg @param {ReturnType<typeof solarShadowGeometry>} G
 * @returns {'Total' | 'Annular' | 'Partial' | null}
 */
export function solarTypeAt(absBetaDeg: number, G: ReturnType<typeof solarShadowGeometry>): "Total" | "Annular" | "Partial" | null;
/**
 * The Moon's angular distance σ from the shadow axis: cos σ = cos β · cos Δλ, Δλ the wrapped
 * elongation from the anti-Sun (the finders' `axisDistanceDeg`).
 * @param {number} dLonDeg wrapped to (−180, 180] @param {number} betaDeg @returns {number} degrees
 */
export function axisDistanceDeg(dLonDeg: number, betaDeg: number): number;
/**
 * The geocentric γ in Earth radii — the perpendicular distance from the Earth's centre to the
 * Sun–Moon line (the finders' `gammaAtJd`, on the same ecliptic vectors).
 * @param {number} sunLonDeg @param {number} moonLonDeg @param {number} moonBetaDeg
 * @param {number} moonDistanceKm @param {number} sunDistanceKm @param {number} rEarthKm
 * @returns {number} Earth radii (unsigned)
 */
export function gammaEarthRadii(sunLonDeg: number, moonLonDeg: number, moonBetaDeg: number, moonDistanceKm: number, sunDistanceKm: number, rEarthKm: number): number;
/** Wrap to (−180, 180]. @param {number} d @returns {number} */
export function wrap180(d: number): number;
/** Danjon's rule — the Earth's radius enlarged by 1/85 (an opaque atmospheric layer of ~75 km),
 *  the convention of the NASA Five Millennium Canon the lunar finder is gated on. Chauvenet's 1/50
 *  (Meeus Ch. 54's ×1.02 on the radii) shipped until the plan-32 follow-up (doc 111 §1.41 b). */
export const DANJON_EARTH_RADIUS_FACTOR: number;
/** The certified window — the NASA Five Millennium Canon's span in engine years (the lunar canon
 *  −1999…+3000 the recall campaign walks; the solar canon's audit sits inside it). A formula
 *  instant inside it is gated to minutes against a dated record; beyond it the instant is the
 *  model's, reproducible, not certified. */
export const CANON_WINDOW_YEARS: Readonly<{
    min: -1999;
    max: 3000;
}>;
/**
 * @typedef {{ synodicDays: number, draconicDays: number, anomalisticDays: number, siderealMonthDays: number,
 *   tropicalYearDays: number, siderealYearDays: number, solarDayDays: number }} PeriodsOfDate
 *   every period in SI days (86,400 s); solarDayDays = LOD/86,400 — the solar day of date in SI days
 */
/**
 * @typedef {{ synodicMonths: number, cycles: number, shiftDegPerCycle: number, spanDays: number,
 *   spanSolarDays: number, spanYears: number, name: string | null }} Recurrence
 *   synodicMonths the integer month count n; cycles the count of the second period (half-integer
 *   for the node when the cycle closes at the OPPOSITE node — the inex, the tritos); the shift of
 *   the argument per cycle in degrees; the span in SI days, in solar days of date and in tropical
 *   years of date; today's name where the pair is today's.
 */
/** Today's named pairs (synodic months / the second period's count) — the labels the of-date
 *  pairs carry only where they are these pairs exactly (plan 30 L(d): the names are today's
 *  coincidences). */
export const TODAYS_RECURRENCE_NAMES: Readonly<{
    node: Readonly<{
        '135/146.5': "tritos";
        '223/242': "Saros";
        '358/388.5': "inex";
        '669/726': "exeligmos";
    }>;
    anomaly: Readonly<{
        '223/239': "Saros";
        '669/717': "exeligmos";
    }>;
    year: Readonly<{
        '235/19': "Metonic";
        '940/76': "Callippic";
    }>;
}>;
