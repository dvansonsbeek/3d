/**
 * @param {{
 *   constants: {
 *     aMoonNowMetres: number,
 *     alpha1PerMa: number,
 *     alpha3PerMa3: number,
 *     alpha4PerMa4: number,
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
 *     distanceMetresAtAge?: (tMa: number) => number,
 *   },
 * }} deps — fns are the ENGINE'S OWN layer-0/1 evaluators and the shared
 *   eccentricity channel's modulation; constants are the engine's derived
 *   J2000 anchors (both engines derive them from the same JSON).
 *   fns.precessionPeriodYearsAtAge is the engine's lunisolar precession period
 *   of date T_p(t), Julian years (the composed rate's period; plan 09 step
 *   5c — the tropical month's equinox turn, formerly the counter's 13/H(t),
 *   0.086 % slow: the chain's J2000 tropical month sat 5.85 ms above the IAU
 *   input, the 1/T_p form is within 0.1 ms of it).
 *   fns.distanceMetresAtAge, when present, OVERRIDES the internal quartic —
 *   the Driver-1½ regime-aware history (recession-history.cjs); absent, the
 *   internal quartic is the pure twin (bit-identical for t ≤ jointMa).
 */
export function createMoonMonthChain({ constants, fns }: {
    constants: {
        aMoonNowMetres: number;
        alpha1PerMa: number;
        alpha3PerMa3: number;
        alpha4PerMa4: number;
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
        distanceMetresAtAge?: (tMa: number) => number;
    };
}): {
    distanceMetresAtAge: (tMa: number) => number;
    distanceKmAtAge: (tMa: number) => number;
    solarDeltaAKmAtAge: (tMa: number, aApparentKm: number) => number | null;
    distanceCorrectedKmAtAge: (tMa: number) => number | null;
    siderealMonthSecondsAtAge: (tMa: number) => number | null;
    synodicMonthSecondsAtAge: (tMa: number) => number | null;
    tropicalMonthSecondsAtAge: (tMa: number) => number | null;
    perigeePrecessionSecondsAtAge: (tMa: number) => number | null;
    nodePrecessionSecondsAtAge: (tMa: number) => number | null;
    anomalisticMonthSecondsAtAge: (tMa: number) => number | null;
    nodalMonthSecondsAtAge: (tMa: number) => number | null;
    apsidalMeetsNodalSecondsAtAge: (tMa: number) => number | null;
    lunarLevelingSecondsAtAge: (tMa: number) => number | null;
};
