/**
 * @param {{
 *   constants: {
 *     aMoonNowMetres: number,
 *     gmEarthMoonM3PerS2: number,
 *     massRatioEarthMoon: number,
 *     moonSiderealMonthInputDays: number,
 *     meanSiderealYearJ2000Seconds: number,
 *     moonApsidalJ2000Seconds: number,
 *     moonNodalJ2000Seconds: number,
 *     moonSiderealMonthJ2000Seconds: number,
 *     sPerigee: number,
 *     sNode: number,
 *   },
 *   fns: {
 *     meanLodSecondsAtAge: (tMa: number) => (number | null),
 *     meanSiderealYearSecondsAtAge: (tMa: number) => number,
 *     precessionPeriodYearsAtAge: (tMa: number) => (number | null),
 *     modulation: (tMa: number, s: number) => number,
 *     distanceMetresAtAge: (tMa: number) => number|null,
 *     laplaceRegime?: () => ({ nodePeriodSecondsAtAge: (tMa: number) => number|null, perigeePeriodSecondsAtAge: (tMa: number) => number|null } | null),
 *   },
 * }} deps — fns are the ENGINE'S OWN layer-0/1 evaluators and the shared
 *   eccentricity channel's modulation; constants are the engine's derived
 *   J2000 anchors (both engines derive them from the same JSON).
 *   fns.precessionPeriodYearsAtAge is the engine's lunisolar precession period
 *   of date T_p(t), Julian years (the composed rate's period — the tropical
 *   month's equinox turn; within 0.1 ms of the IAU input at J2000).
 *   fns.distanceMetresAtAge is the engine's CITED distance history
 *   (deltat/moon-distance-history; null beyond the span).
 *   fns.laplaceRegime (OPTIONAL, a LAZY getter — the regime reads this chain's
 *   SOLAR perigee/node forms, so it is built after it) is the Laplace-plane
 *   regime (earth/laplace-plane, plan 31 A): with it the published perigee and
 *   node of date are the oblateness term of date plus the solar term, exact
 *   at the J2000 anchor; absent, the solar form alone (bit-identical).
 */
export function createMoonMonthChain({ constants, fns }: {
    constants: {
        aMoonNowMetres: number;
        gmEarthMoonM3PerS2: number;
        massRatioEarthMoon: number;
        moonSiderealMonthInputDays: number;
        meanSiderealYearJ2000Seconds: number;
        moonApsidalJ2000Seconds: number;
        moonNodalJ2000Seconds: number;
        moonSiderealMonthJ2000Seconds: number;
        sPerigee: number;
        sNode: number;
    };
    fns: {
        meanLodSecondsAtAge: (tMa: number) => (number | null);
        meanSiderealYearSecondsAtAge: (tMa: number) => number;
        precessionPeriodYearsAtAge: (tMa: number) => (number | null);
        modulation: (tMa: number, s: number) => number;
        distanceMetresAtAge: (tMa: number) => number | null;
        laplaceRegime?: () => ({
            nodePeriodSecondsAtAge: (tMa: number) => number | null;
            perigeePeriodSecondsAtAge: (tMa: number) => number | null;
        } | null);
    };
}): {
    distanceMetresAtAge: (tMa: number) => number | null;
    distanceKmAtAge: (tMa: number) => number | null;
    solarDeltaAKmAtAge: (tMa: number, aApparentKm: number) => number | null;
    distanceCorrectedKmAtAge: (tMa: number) => number | null;
    siderealMonthSecondsAtAge: (tMa: number) => number | null;
    synodicMonthSecondsAtAge: (tMa: number) => number | null;
    tropicalMonthSecondsAtAge: (tMa: number) => number | null;
    perigeePrecessionSecondsAtAge: (tMa: number) => number | null;
    nodePrecessionSecondsAtAge: (tMa: number) => number | null;
    perigeePrecessionSolarSecondsAtAge: (tMa: number) => number | null;
    nodePrecessionSolarSecondsAtAge: (tMa: number) => number | null;
    anomalisticMonthSecondsAtAge: (tMa: number) => number | null;
    nodalMonthSecondsAtAge: (tMa: number) => number | null;
    apsidalMeetsNodalSecondsAtAge: (tMa: number) => number | null;
    lunarLevelingSecondsAtAge: (tMa: number) => number | null;
};
