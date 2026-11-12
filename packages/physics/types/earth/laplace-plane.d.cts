/**
 * — nodeEigenRatio = ω_L/β_S (the slow geometry of the node's eigen-rate; 1 on the
 *   ecliptic), perigeeJ2RateRadPerYr the perigee's oblateness part; the two full rates are the
 *   direct solve's own (the ratio × the solar coefficient × cos i_L; the J₂ part + the solar term).
 */
export type CoupledState = {
    omegaRadPerYr: number;
    thetaDeg: number;
    phiDeg: number;
    epsDeg: number;
    alphaSolarRadPerYr: number;
    alphaLunarEclipticRadPerYr: number;
    alphaLunarRadPerYr: number;
    betaSolarRadPerYr: number;
    betaJ2RadPerYr: number;
    ringJ2RadPerYr: number;
    betaJ2ThirdLawRadPerYr: number;
    inclinationFactor: number;
    lOrbitOverLSpin: number;
    regimeFactorRaw: number;
    freeInclinationDeg: number;
    nodeEigenRatio: number;
    perigeeJ2RateRadPerYr: number;
    nodeRateRadPerYr: number;
    perigeeRateRadPerYr: number;
};
/**
 * @typedef {{
 *   omegaRadPerYr: number, thetaDeg: number, phiDeg: number, epsDeg: number,
 *   alphaSolarRadPerYr: number, alphaLunarEclipticRadPerYr: number, alphaLunarRadPerYr: number,
 *   betaSolarRadPerYr: number, betaJ2RadPerYr: number, ringJ2RadPerYr: number, betaJ2ThirdLawRadPerYr: number,
 *   inclinationFactor: number, lOrbitOverLSpin: number, regimeFactorRaw: number, freeInclinationDeg: number,
 *   nodeEigenRatio: number, perigeeJ2RateRadPerYr: number, nodeRateRadPerYr: number, perigeeRateRadPerYr: number,
 * }} CoupledState — nodeEigenRatio = ω_L/β_S (the slow geometry of the node's eigen-rate; 1 on the
 *   ecliptic), perigeeJ2RateRadPerYr the perigee's oblateness part; the two full rates are the
 *   direct solve's own (the ratio × the solar coefficient × cos i_L; the J₂ part + the solar term).
 */
/**
 * @param {{
 *   constants: {
 *     earthJ2J2000: number, earthRadiusMetres: number, astronomicalUnitMetres: number,
 *     gmSunM3S2: number, gmEarthAloneM3S2: number, gmEarthMoonM3S2: number,
 *     moonMassKg: number, moonEccentricityFactor: number, earthEccentricityJ2000: number,
 *     moonInclinationJ2000Deg: number, moonDistanceJ2000Metres: number, lodJ2000Seconds: number,
 *     precessionSolarShareJ2000: number, meanObliquityJ2000Deg: number,
 *     moonNodalJ2000Seconds: number, moonApsidalJ2000Seconds: number,
 *     spinTorqueScale?: number,
 *     tableAgeMinMa?: number, tableAgeMaxMa?: number,
 *   },
 *   fns: {
 *     moonDistanceMetresAtAge: (tMa: number) => (number | null),
 *     lodSecondsAtAge: (tMa: number) => (number | null),
 *     meanObliquityDegAtAge: (tMa: number) => (number | null),
 *     iEarthAtAge: (tMa: number) => number,
 *     lunarNodeSolarPeriodSecondsAtAge: (tMa: number) => (number | null),
 *     lunarPerigeeSolarPeriodSecondsAtAge: (tMa: number) => (number | null),
 *     p0ArcsecPerYr: () => number,
 *     underAlphaReferencePin?: (build: () => void) => void,
 *   },
 * }} deps — constants the engine's own J2000 anchors (SI: metres, seconds, kg);
 *   fns the engine's histories (the cited distance and mean obliquity, the
 *   conservation LOD, the GIA-pinned moment of inertia) and the month chain's
 *   SOLAR node/perigee periods of date (the Brouwer–Clemence form with the
 *   e-channel modulation, the observed J2000 periods at t = 0). p0 lazy, as the
 *   composed law's. spinTorqueScale (default 1) scales BOTH torques on the
 *   spin (the spin frozen, the ring finds its Laplace plane) — the gate's
 *   test-particle limit (→ 0), never a model setting. tableAgeMinMa /
 *   tableAgeMaxMa the table's extent (the navigable domain; absent, no table:
 *   every read the direct solve). underAlphaReferencePin the chain's pin for
 *   a table build — α held at its J2000 reference (absent, the build runs
 *   under the caller's state).
 */
export function createLaplacePlaneRegime({ constants: K, fns }: {
    constants: {
        earthJ2J2000: number;
        earthRadiusMetres: number;
        astronomicalUnitMetres: number;
        gmSunM3S2: number;
        gmEarthAloneM3S2: number;
        gmEarthMoonM3S2: number;
        moonMassKg: number;
        moonEccentricityFactor: number;
        earthEccentricityJ2000: number;
        moonInclinationJ2000Deg: number;
        moonDistanceJ2000Metres: number;
        lodJ2000Seconds: number;
        precessionSolarShareJ2000: number;
        meanObliquityJ2000Deg: number;
        moonNodalJ2000Seconds: number;
        moonApsidalJ2000Seconds: number;
        spinTorqueScale?: number;
        tableAgeMinMa?: number;
        tableAgeMaxMa?: number;
    };
    fns: {
        moonDistanceMetresAtAge: (tMa: number) => (number | null);
        lodSecondsAtAge: (tMa: number) => (number | null);
        meanObliquityDegAtAge: (tMa: number) => (number | null);
        iEarthAtAge: (tMa: number) => number;
        lunarNodeSolarPeriodSecondsAtAge: (tMa: number) => (number | null);
        lunarPerigeeSolarPeriodSecondsAtAge: (tMa: number) => (number | null);
        p0ArcsecPerYr: () => number;
        underAlphaReferencePin?: (build: () => void) => void;
    };
}): {
    spinRatioAtAge: (tMa: number) => number | null;
    earthJ2AtAge: (tMa: number) => number | null;
    laplaceRadiusMetresAtAge: (tMa: number) => number | null;
    freeInclinationDegAtAge: (tMa: number, kappa?: number) => number | null;
    freeInclinationBandDegAtAge: (tMa: number) => number | null;
    coupledStateAtAge: (tMa: number) => CoupledState | null;
    regimeFactorAtAge: (tMa: number) => number | null;
    regimeFactorDirectAtAge: (tMa: number) => number | null;
    laplaceTiltFromEclipticDegAtAge: (tMa: number) => number | null;
    laplaceTiltFromEquatorDegAtAge: (tMa: number) => number | null;
    testParticleTiltFromEquatorDegAtAge: (tMa: number) => number | null;
    rigidLockRateRadPerYrAtAge: (tMa: number) => number | null;
    nodeEigenRateRadPerYrAtAge: (tMa: number) => number | null;
    nodePeriodSecondsAtAge: (tMa: number) => number | null;
    perigeeRateRadPerYrAtAge: (tMa: number) => number | null;
    perigeePeriodSecondsAtAge: (tMa: number) => number | null;
    nodePeriodDirectSecondsAtAge: (tMa: number) => number | null;
    perigeePeriodDirectSecondsAtAge: (tMa: number) => number | null;
    FREE_INCLINATION_EXPONENT_SHIPPED: number;
    FREE_INCLINATION_EXPONENT_BAND: number;
    TABLE_STEP_MA: number;
};
/**
 * The test-particle Laplace plane (Tremaine, Touma & Namouni 2009 eq. 23) —
 * the tilt of the Laplace plane from the EQUATOR, degrees.
 * @param {number} aMetres the orbit's semi-major axis
 * @param {number} epsDeg the obliquity
 * @param {number} laplaceRadiusMetres r_L
 * @returns {number}
 */
export function testParticleTiltFromEquatorDeg(aMetres: number, epsDeg: number, laplaceRadiusMetres: number): number;
/** sin i_L ∝ a^{−κ}: the shipped exponent (the torque along the pole) and the band's other edge. */
export const FREE_INCLINATION_EXPONENT_SHIPPED: 0.5;
export const FREE_INCLINATION_EXPONENT_BAND: 0.25;
/** The table's node spacing (Myr) and its chunk (nodes per lazily built block, 100 Myr). */
export const TABLE_STEP_MA: 0.02;
