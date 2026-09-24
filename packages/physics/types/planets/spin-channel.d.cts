export type SpinSatellite = {
    name?: string;
    gmKm3S2: number;
    semiMajorAxisKm: number;
    orbitalPeriodDays: number;
    retrograde?: boolean;
};
/** @typedef {{ name?: string, gmKm3S2: number, semiMajorAxisKm: number, orbitalPeriodDays: number, retrograde?: boolean }} SpinSatellite */
/**
 * The precession constant from the planet's own torques.
 * @param {{
 *   j2: number, j2ReferenceRadiusKm: number, momentOfInertiaFactor: number,
 *   rotationRateDegPerDay: number, satellites: ReadonlyArray<SpinSatellite>,
 *   gmPlanetSystemKm3S2: number, meanMotionRadPerYr: number, eccentricity: number,
 * }} p
 * @returns {{ alphaArcsecPerYr: number, alphaRadPerYr: number, q: number, l: number,
 *   spinRadPerYr: number, spinRetrograde: boolean, gmPlanetAloneKm3S2: number }}
 */
export function computePlanetPrecessionConstant(p: {
    j2: number;
    j2ReferenceRadiusKm: number;
    momentOfInertiaFactor: number;
    rotationRateDegPerDay: number;
    satellites: ReadonlyArray<SpinSatellite>;
    gmPlanetSystemKm3S2: number;
    meanMotionRadPerYr: number;
    eccentricity: number;
}): {
    alphaArcsecPerYr: number;
    alphaRadPerYr: number;
    q: number;
    l: number;
    spinRadPerYr: number;
    spinRetrograde: boolean;
    gmPlanetAloneKm3S2: number;
};
/**
 * @param {{
 *   key: string,
 *   spin: { j2: number, j2ReferenceRadiusKm: number, momentOfInertiaFactor: number,
 *     momentOfInertiaFactorClass?: string, rotationRateDegPerDay: number,
 *     poleRaJ2000Deg: number, poleDecJ2000Deg: number, cassiniLocked?: boolean,
 *     satellites: ReadonlyArray<SpinSatellite> },
 *   zetaModes: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorInclEclipticDeg: number, anchorAscNodeEclipticDeg: number,
 *   semiMajorAxisAU: number, eccentricity: number, massFractionOfSun: number,
 *   gmSunKm3S2: number, obliquityJ2000Deg: number,
 * }} deps — spin from the astro-reference planetSpinPhysical block; the ζ
 *   table and the J2000 anchor elements from the governed artifacts; the
 *   mass fraction (planet system / Sun) for the two-body mean motion
 *   n = 2π√((1 + μ)/a³); the J2000 obliquity of the ecliptic for the pole
 *   conversion.
 */
export function createPlanetSpinChannel(deps: {
    key: string;
    spin: {
        j2: number;
        j2ReferenceRadiusKm: number;
        momentOfInertiaFactor: number;
        momentOfInertiaFactorClass?: string;
        rotationRateDegPerDay: number;
        poleRaJ2000Deg: number;
        poleDecJ2000Deg: number;
        cassiniLocked?: boolean;
        satellites: ReadonlyArray<SpinSatellite>;
    };
    zetaModes: ReadonlyArray<{
        omegaRadPerYr: number;
        re: number;
        im: number;
    }>;
    anchorInclEclipticDeg: number;
    anchorAscNodeEclipticDeg: number;
    semiMajorAxisAU: number;
    eccentricity: number;
    massFractionOfSun: number;
    gmSunKm3S2: number;
    obliquityJ2000Deg: number;
}): Readonly<{
    key: string;
    cassiniLocked: boolean;
    momentOfInertiaFactor: number;
    momentOfInertiaFactorClass: string;
    alphaArcsecPerYr: number;
    satelliteQuadrupole: number;
    satelliteAngularMomentum: number;
    spinRetrograde: boolean;
    meanMotionRadPerYr: number;
    obliquityJ2000Deg: number;
    spinPrecessionRateArcsecPerYrJ2000: number | null;
    axialPrecessionPeriodYearsJ2000: number | null;
    obliquityDegAtYear: (year: number) => number | null;
    spinPrecessionRateArcsecPerYrAtYear: (year: number) => number | null;
    obliquityEnvelopeDeg: (year: number, spanYr: number) => {
        minDeg: number;
        meanDeg: number;
        maxDeg: number;
    } | null;
    stepYr: 25;
    maxSpanYr: 10000000;
}>;
/**
 * The IAU pole (ICRF equatorial RA/Dec) as an ecliptic-J2000 unit vector.
 * @param {number} raDeg @param {number} decDeg @param {number} obliquityJ2000Deg
 * @returns {number[]}
 */
export function poleEclipticJ2000(raDeg: number, decDeg: number, obliquityJ2000Deg: number): number[];
/**
 * The planet's orbit normal n̂(t) in ecliptic J2000 from its deep ζ table,
 * DC-anchored at the chain's J2000 plane (the Earth hybrid's ζ convention:
 * ζ = sin(i/2)·e^{iΩ}; the anchor is the coordinate the modes wander around).
 * @param {ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>} zetaModes
 * @param {number} anchorInclEclipticDeg @param {number} anchorAscNodeEclipticDeg
 * @returns {(tYr: number) => number[]}
 */
export function createOrbitNormalEvaluator(zetaModes: ReadonlyArray<{
    omegaRadPerYr: number;
    re: number;
    im: number;
}>, anchorInclEclipticDeg: number, anchorAscNodeEclipticDeg: number): (tYr: number) => number[];
