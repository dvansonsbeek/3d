export type PlanetGeometryBody = {
    key: string;
    type?: string;
    solarYearInput: number;
    orbitalEccentricityBase?: number;
    longitudePerihelion?: number;
    ascendingNode?: number;
    rotationPeriodDays?: number;
    orbitDistanceOverride?: number;
};
/**
 * @typedef {{
 *   key: string,
 *   type?: string,
 *   solarYearInput: number,
 *   orbitalEccentricityBase?: number,
 *   longitudePerihelion?: number,
 *   ascendingNode?: number,
 *   rotationPeriodDays?: number,
 *   orbitDistanceOverride?: number,
 * }} PlanetGeometryBody
 */
/**
 * @param {PlanetGeometryBody} body
 * @param {{
 *   holisticYears: number,
 *   meanSolarYearDays: number,
 *   currentAUDistanceKm: number,
 *   earthEccentricityJ2000: number,
 *   earthPerihelionLongitudeJ2000Deg: number,
 * }} env — the engine's J2000 values (browser passes its live globals at
 *   load time, preserving its original initial-derivation semantics; the
 *   epoch machinery that later mutates the browser's `let` aliases is
 *   untouched by this layer).
 * @returns {{
 *   solarYearCount: number, orbitDistance: number, periodYears: number,
 *   realOrbitalEccentricity: (number | undefined),
 *   elipticOrbit: (number | undefined), perihelionDistance: (number | undefined),
 *   speedKmh: number, rotationPeriodHours: (number | undefined),
 *   eccentricityPerihelion: (number | undefined), lowestPoint: (number | undefined),
 * }}
 */
export function derivePlanetGeometry(body: PlanetGeometryBody, env: {
    holisticYears: number;
    meanSolarYearDays: number;
    currentAUDistanceKm: number;
    earthEccentricityJ2000: number;
    earthPerihelionLongitudeJ2000Deg: number;
}): {
    solarYearCount: number;
    orbitDistance: number;
    periodYears: number;
    realOrbitalEccentricity: (number | undefined);
    elipticOrbit: (number | undefined);
    perihelionDistance: (number | undefined);
    speedKmh: number;
    rotationPeriodHours: (number | undefined);
    eccentricityPerihelion: (number | undefined);
    lowestPoint: (number | undefined);
};
