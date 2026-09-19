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
 *     holisticYearJ2000: number,
 *     meanSiderealYearJ2000Seconds: number,
 *     nApsidalOfDateJ2000: number,
 *     nNodalOfDateJ2000: number,
 *     moonApsidalJ2000Seconds: number,
 *     moonNodalJ2000Seconds: number,
 *     moonSiderealMonthJ2000Seconds: number,
 *     sPerigee: number,
 *     sNode: number,
 *   },
 *   fns: {
 *     meanLodSecondsAtAge: (tMa: number) => (number | null),
 *     meanSiderealYearSecondsAtAge: (tMa: number) => number,
 *     meanHAtAge: (tMa: number) => (number | null),
 *     modulation: (tMa: number, s: number) => number,
 *     distanceMetresAtAge?: (tMa: number) => number,
 *   },
 * }} deps — fns are the ENGINE'S OWN layer-0/1 evaluators and the shared
 *   eccentricity channel's modulation; constants are the engine's derived
 *   J2000 anchors (both engines derive them from the same JSON).
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
        holisticYearJ2000: number;
        meanSiderealYearJ2000Seconds: number;
        nApsidalOfDateJ2000: number;
        nNodalOfDateJ2000: number;
        moonApsidalJ2000Seconds: number;
        moonNodalJ2000Seconds: number;
        moonSiderealMonthJ2000Seconds: number;
        sPerigee: number;
        sNode: number;
    };
    fns: {
        meanLodSecondsAtAge: (tMa: number) => (number | null);
        meanSiderealYearSecondsAtAge: (tMa: number) => number;
        meanHAtAge: (tMa: number) => (number | null);
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
    apsidalCyclesOfDateAtAge: (tMa: number) => number | null;
    nodalCyclesOfDateAtAge: (tMa: number) => number | null;
    apsidalPrecessionSecondsOfDateAtAge: (tMa: number) => number | null;
    nodalPrecessionSecondsOfDateAtAge: (tMa: number) => number | null;
    perigeePrecessionSecondsAtAge: (tMa: number) => number | null;
    nodePrecessionSecondsAtAge: (tMa: number) => number | null;
    anomalisticMonthSecondsAtAge: (tMa: number) => number | null;
    nodalMonthSecondsAtAge: (tMa: number) => number | null;
    apsidalMeetsNodalSecondsAtAge: (tMa: number) => number | null;
    lunarLevelingSecondsAtAge: (tMa: number) => number | null;
};
