export type PlanetGeometryBody = {
    key: string;
    type?: string;
    periodDays: number;
    semiMajorAxisAu?: number;
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
 *   periodDays: number,
 *   semiMajorAxisAu?: number,
 *   orbitalEccentricityBase?: number,
 *   longitudePerihelion?: number,
 *   ascendingNode?: number,
 *   rotationPeriodDays?: number,
 *   orbitDistanceOverride?: number,
 * }} PlanetGeometryBody
 */
/**
 * @param {PlanetGeometryBody} body — `periodDays` the body's sidereal orbital
 *   period in SI days; `semiMajorAxisAu` the chain's J2000 a where a chain
 *   exists (else Kepler's a from the period, in the scene's solar-year units)
 * @param {{
 *   meanSolarYearDays: number,
 *   currentAUDistanceKm: number,
 *   earthEccentricityJ2000: number,
 *   earthPerihelionLongitudeJ2000Deg: number,
 * }} env — the engine's J2000 values; `meanSolarYearDays` is the scene's
 *   year unit (`pos` counts mean solar years), so `periodYears` is the period
 *   in that unit, the scaffold's `speed` = 2π/periodYears.
 * @returns {{
 *   orbitDistance: number, periodYears: number, periodDays: number,
 *   realOrbitalEccentricity: (number | undefined),
 *   elipticOrbit: (number | undefined), perihelionDistance: (number | undefined),
 *   speedKmh: number, rotationPeriodHours: (number | undefined),
 *   eccentricityPerihelion: (number | undefined), lowestPoint: (number | undefined),
 * }}
 */
export function derivePlanetGeometry(body: PlanetGeometryBody, env: {
    meanSolarYearDays: number;
    currentAUDistanceKm: number;
    earthEccentricityJ2000: number;
    earthPerihelionLongitudeJ2000Deg: number;
}): {
    orbitDistance: number;
    periodYears: number;
    periodDays: number;
    realOrbitalEccentricity: (number | undefined);
    elipticOrbit: (number | undefined);
    perihelionDistance: (number | undefined);
    speedKmh: number;
    rotationPeriodHours: (number | undefined);
    eccentricityPerihelion: (number | undefined);
    lowestPoint: (number | undefined);
};
/**
 * The scaffold's orbit inputs for one body — ONE home for the rule (plan 09
 * step 7b): where the governed engine-D chain artifact has the body, the
 * chain's J2000 semi-major axis and its fitted era-window mean motion (deg
 * per Julian year → the period in SI days); otherwise the body's observed
 * period input (the no-chain bodies Pluto, Halley, Eros, Ceres).
 * @param {string} key
 * @param {any} chainArtifact the CHAIN_ARTIFACT (or the governed JSON it embeds)
 * @param {number} fallbackPeriodDays the observed period input, SI days
 * @returns {{ periodDays: number, semiMajorAxisAu: (number | undefined) }}
 */
export function scaffoldOrbitInputs(key: string, chainArtifact: any, fallbackPeriodDays: number): {
    periodDays: number;
    semiMajorAxisAu: (number | undefined);
};
