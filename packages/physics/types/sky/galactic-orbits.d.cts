export type OrbitElements = {
    Rg: number;
    L: number;
    kappaG: number;
    phi0: number;
    amp: number;
    psi: number;
    c2: number;
    z0: number;
    vz: number;
    nu: number;
    amplitudeFraction: number;
    epochYear: number;
};
export const LOCAL_GALACTIC_KINEMATICS: Readonly<{
    r0Pc: number;
    v0KmS: 233.1;
    omega0KmSKpc: number;
    oortBKmSKpc: -11.9;
    localDensityMsunPc3: 0.097;
    sunVelocityLsrKmS: Readonly<{
        u: 11.1;
        v: 12.24;
        w: 7.25;
    }>;
    sunHeightPc: 20.8;
    catalogueRegimeYears: 50000000;
    sources: "McMillan 2017 (R₀, v₀, Ω₀); Bovy 2017 (B); McKee+2015 (ρ₀); Schönrich+2010 (U,V,W)☉; Bennett & Bovy 2019 (z☉)";
}>;
/** The model's reach: a relative orbit whose radial amplitude exceeds this fraction of R₀ is outside it. */
export const RADIAL_AMPLITUDE_MAX: 0.15;
/** The Sun's state is anchored at J2000 (its position (−R₀, 0, z☉), its velocity Schönrich's + the circular speed). */
export const SUN_EPOCH_YEAR: 2000;
/**
 * The named catalogue's stars ride this, not the closed form: the epicycle's floor is third order in the radial
 * amplitude (Sirius, amplitude 10 % of R₀: 9.7″ from the exact orbit at 100 kyr, the straight line 1.3″) and the
 * series breaks for the high-velocity stars a naked-eye catalogue holds (Arcturus 33 % of R₀: 118° off at
 * 10 kyr; Groombridge 1830, 320 km/s, diverges). The integration is RK4 in the inertial Galactocentric frame on
 * the SAME potential (v_c ∝ R^β, the harmonic vertical term), on a deterministic schedule so a position is pure
 * in the year: nodes every nodeYears from the set's epoch, each reached from the previous by whole steps of
 * stepYears; a year is reached from its node by ceil(|r|/stepYears) equal steps (a 1-Myr step is 1/200 of
 * the orbit — RK4's error ~1e-9 of the excursion per orbit). Both tiers of the scene ride this integrator (the
 * arriving stars on the coarser schedule) and the pipeline selects by it; the closed form is the potential's
 * analytic check and the amplitude diagnostic, gated against the integrator (a first build drew the arriving
 * stars on the closed form with a 15 % amplitude cut — a third of the superset, the fast stars that arrive
 * from farthest, fell to the cut).
 */
export const ORBIT_INTEGRATION: Readonly<{
    /** the named catalogue (41,000 stars, era-certified): 1-Myr steps, 5-Myr nodes */
    named: Readonly<{
        stepYears: 1000000;
        nodeYears: 5000000;
    }>;
    /** the arriving stars (a few hundred thousand, unnamed, invisible today): 2-Myr steps (RK4's error 16× the named tier's, ~1e-7 of the excursion), 10-Myr nodes */
    arriving: Readonly<{
        stepYears: 2000000;
        nodeYears: 10000000;
    }>;
    /** the pipeline's visibility sampling over the window: 0.5-Myr steps, every step a sample */
    sampling: Readonly<{
        stepYears: 500000;
        nodeYears: 500000;
    }>;
}>;
/** 1 km/s in parsecs per Julian year (the IAU parsec, the SI second, the Julian year). */
export const KMS_TO_PC_PER_YEAR: 0.000001022712165;
/** km/s per (mas/yr × kpc): the tangential velocity v_t = 4.74047 μ[mas/yr] d[kpc]. */
export const KMS_PER_MASYR_KPC: 4.740470463;
/** G in pc (km/s)² / M☉ (IAU 2015 nominal GM☉ and the IAU parsec). */
export const G_PC_KMS2_PER_MSUN: 0.00430091;
/** 8-point Gauss–Legendre nodes and weights on [−1, 1] (Newton on the Legendre polynomial, once). Eight points
 *  reproduce the 16-point azimuth integral to 8e-7 pc over ±50 Myr at the model's largest amplitude (0.41 µs per
 *  star for 0.90 — the browser moves 450,000 orbits per update). */
export const GAUSS_LEGENDRE_8: Readonly<{
    x: readonly number[];
    w: readonly number[];
}>;
/** The derived local quantities: the power-law exponent, the frequencies in rad per year and in km/s/kpc, the periods. */
export function localRotationCurve(): {
    beta: number;
    oortAKmSKpc: number;
    kappa0KmSKpc: number;
    secondOrderCoefficient: number;
    omega0RadPerYear: number;
    kappa0RadPerYear: number;
    nuRadPerYear: number;
    epicyclePeriodMyr: number;
    verticalPeriodMyr: number;
};
/**
 * A star's heliocentric Galactic position (pc) and velocity (km/s) from its astrometry — X toward the
 * Galactic centre, Y along the rotation (l = 90°), Z toward the north Galactic pole; U, V, W likewise
 * (Johnson & Soderblom 1987's transformation written on the one-home triad).
 * @param {{raDeg: number, decDeg: number, distPc: number, pmRaMasYr: number, pmDecMasYr: number, rvKmS: number}} a
 */
export function heliocentricGalacticState(a: {
    raDeg: number;
    decDeg: number;
    distPc: number;
    pmRaMasYr: number;
    pmDecMasYr: number;
    rvKmS: number;
}): {
    xPc: number;
    yPc: number;
    zPc: number;
    uKmS: number;
    vKmS: number;
    wKmS: number;
};
/** @typedef {{Rg: number, L: number, kappaG: number, phi0: number, amp: number, psi: number, c2: number, z0: number, vz: number, nu: number, amplitudeFraction: number, epochYear: number}} OrbitElements */
/**
 * The orbit elements of a body (a star from its heliocentric Galactic state at its catalogue's epoch; the Sun with
 * null) in the inertial Galactocentric frame whose axes are today's heliocentric Galactic axes (X from the Sun
 * toward the centre — the Sun sits at X = −R₀ at J2000 — Y along the rotation at the Sun, Z north; φ
 * counterclockwise from +X seen from the north, so the Galaxy's rotation is φ̇ < 0). A star's heliocentric state
 * is relative to the Sun OF ITS EPOCH, so the Sun's own displacement from J2000 to that epoch is added (2.2
 * milliparsecs along the orbit for Hipparcos's J1991.25, 4.0 for Gaia's J2016.0 — below the catalogues' own
 * grain, carried for the form's sake; its velocity change over a decade is 1e-7 pc/yr). Positions in pc, rates
 * in pc/yr and rad/yr.
 * @param {{xPc: number, yPc: number, zPc: number, uKmS: number, vKmS: number, wKmS: number} | null} h
 * @param {number} [epochYear]  the catalogue epoch the state is given at (J2000 by default; the Sun's is J2000)
 * @returns {OrbitElements}
 */
export function orbitElements(h: {
    xPc: number;
    yPc: number;
    zPc: number;
    uKmS: number;
    vKmS: number;
    wKmS: number;
} | null, epochYear?: number): OrbitElements;
/** The radius at t years (the second-order epicycle). @param {OrbitElements} e @param {number} t */
export function radiusAt(e: OrbitElements, t: number): number;
/**
 * A body's inertial Galactocentric position (pc) at t years from its epoch.
 * @param {OrbitElements} e @param {number} t
 * @returns {[number, number, number]}
 */
export function galactocentricPositionAt(e: OrbitElements, t: number): [number, number, number];
/** A body's inertial Galactocentric position (pc) at an engine year — t counted from ITS OWN epoch. @param {OrbitElements} e @param {number} year */
export function galactocentricPositionAtYear(e: OrbitElements, year: number): [number, number, number];
/**
 * The heliocentric Galactic vector (pc) of a star at an engine year, in the inertial frame of today's Galactic
 * axes (X toward the centre, Y l = 90°, Z north): the star's orbit minus the Sun's, each from its own epoch.
 * @param {OrbitElements} star @param {OrbitElements} sun @param {number} year
 * @returns {[number, number, number]}
 */
export function heliocentricGalacticAtYear(star: OrbitElements, sun: OrbitElements, year: number): [number, number, number];
/** The acceleration (pc/yr²) at an inertial Galactocentric position: the power-law rotation curve's −v_c²/R radially, −ν² z vertically. @param {number} X @param {number} Y @param {number} Z */
export function galacticAcceleration(X: number, Y: number, Z: number): number[];
/**
 * A body's inertial Galactocentric STATE at its epoch (the same placement as orbitElements): [X, Y, Z, vX, vY, vZ]
 * in pc and pc/yr. @param {{xPc: number, yPc: number, zPc: number, uKmS: number, vKmS: number, wKmS: number} | null} h @param {number} [epochYear]
 */
export function galactocentricState(h: {
    xPc: number;
    yPc: number;
    zPc: number;
    uKmS: number;
    vKmS: number;
    wKmS: number;
} | null, epochYear?: number): number[];
/**
 * Integrate a state over dtYears in nSteps equal RK4 steps (a new array; the input untouched).
 * @param {ArrayLike<number>} s  [X, Y, Z, vX, vY, vZ] @param {number} dtYears @param {number} nSteps
 * @returns {number[]}
 */
export function integrateOrbitRK4(s: ArrayLike<number>, dtYears: number, nSteps: number): number[];
/**
 * The schedule from a set's epoch to a year: the node index (toward the epoch), the remainder and its step count.
 * @param {number} year @param {number} epochYear @param {{stepYears: number, nodeYears: number}} [sched]
 */
export function integrationSchedule(year: number, epochYear: number, sched?: {
    stepYears: number;
    nodeYears: number;
}): {
    nodeIndex: number;
    nodeYear: number;
    remainder: number;
    steps: number;
    stepsPerNode: number;
    nodeYears: number;
};
/**
 * A single body's integrated inertial position at a year from its epoch state, on the deterministic schedule
 * (the nodes rebuilt from the epoch each call — the gates' and the main thread's single-star reads).
 * @param {ArrayLike<number>} state0 @param {number} epochYear @param {number} year @param {{stepYears: number, nodeYears: number}} [sched]
 * @returns {number[]}  the full state [X, Y, Z, vX, vY, vZ]
 */
export function integratedStateAtYear(state0: ArrayLike<number>, epochYear: number, year: number, sched?: {
    stepYears: number;
    nodeYears: number;
}): number[];
/**
 * A main-sequence lifetime from the absolute visual magnitude, as a BAND: L/L☉ = 10^((4.83 − M_V)/2.5) and
 * τ = 10 Gyr · (L/L☉)^(−2.5/3.5) (L ∝ M^3.5, τ ∝ M/L — the textbook relation, e.g. Carroll & Ostlie §13).
 * A star is drawn while |t| < τ: in the future it has not died, in the past it had been born — every star
 * treated as mid-life, which is the band's statement. @param {number} absMagV
 */
export function mainSequenceLifetimeYears(absMagV: number): number;
/**
 * The Sun's height above the Galactic plane at an engine year (pc, north positive): the harmonic vertical motion of
 * the model's potential from the J2000 state — z = z☉ cos νt + (W☉/ν) sin νt, amplitude √(z☉² + (W☉/ν)²) ≈ 102 pc,
 * period 2π/ν ≈ 85 Myr (the integrator's z is this to 1e-9: the vertical equation is decoupled and linear).
 * @param {number} year
 */
export function sunHeightPcAtYear(year: number): number;
/**
 * The Milky Way band's apparent shift in Galactic latitude from the Sun's height (degrees, the band moving toward
 * the SOUTH when the Sun is north of the plane): the midplane seen from height z at the light's effective distance D
 * lies at −atan(z/D) — a uniform shift for every longitude, the first order of the parallax of the disc's light. D
 * is an ILLUSTRATION parameter: the optical band is the light of the disc within one to two kiloparsecs, dust
 * closing the view in the plane beyond; 1.5 kpc. The Magellanic Clouds, 50 kpc away, shift with the dome's texture
 * all the same — the illustration's limit, said so. 0.8° today (z☉ 20.8 pc), 3.9° at the extremes.
 */
export const MILKY_WAY_LIGHT_DISTANCE_PC: 1500;
/** @param {number} year */
export function milkyWayLatitudeShiftDegAtYear(year: number): number;
