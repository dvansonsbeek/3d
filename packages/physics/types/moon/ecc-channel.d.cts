/**
 * @param {{
 *   cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *   eccentricityBase: number,
 *   eccentricityJ2000?: number,
 *   perihelionLongitudeJ2000Deg: number,
 *   inclinationCycleAnchorDeg: number,
 * }} deps — cyclesBetween MUST be the engine's own H-lattice phase counter
 *   (integrated under deep time); perihelionLongitudeJ2000Deg is ϖ_ICRF at
 *   J2000 (102.94719°, the FULL value — a truncated copy once cost 0.684″);
 *   inclinationCycleAnchorDeg is the H/3 inclination anchor (21.77°).
 */
export function createMoonEccChannel({ cyclesBetween, eccentricityBase, perihelionLongitudeJ2000Deg, inclinationCycleAnchorDeg, eccentricityJ2000, }: {
    cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null);
    eccentricityBase: number;
    eccentricityJ2000?: number;
    perihelionLongitudeJ2000Deg: number;
    inclinationCycleAnchorDeg: number;
}): {
    eccAt: (tYr: number) => number;
    eccRateAt: (tYr: number) => number;
    modulation: (tMa: number, s: number) => number;
    channelIntegral: (T: number, s: number) => number;
    eFactorAt: (tYr: number) => number;
    th0: number;
    amplitude: number;
    mean: number;
    e0: number;
    g0: number;
};
