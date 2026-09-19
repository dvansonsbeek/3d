/**
 * ψ constant from Earth's calibration. @param {{
 *   earthInvPlaneInclinationAmplitude: number,
 *   massEarthAlone: number, massSun: number }} c @returns {number} */
export function computePsiConstant(c: {
    earthInvPlaneInclinationAmplitude: number;
    massEarthAlone: number;
    massSun: number;
}): number;
/**
 * ψ law: invariable-plane inclination amplitude and mean.
 * @param {{ fibonacciD: number, massFrac: number,
 *   invPlaneInclinationJ2000: number, longitudePerihelion: number,
 *   inclinationCycleAnchor: number, antiPhase: boolean }} b
 * @param {number} psiConstant
 * @returns {{ amplitude: number, mean: number }} */
export function computeInclinationLaw(b: {
    fibonacciD: number;
    massFrac: number;
    invPlaneInclinationJ2000: number;
    longitudePerihelion: number;
    inclinationCycleAnchor: number;
    antiPhase: boolean;
}, psiConstant: number): {
    amplitude: number;
    mean: number;
};
/**
 * Wobble period: beat of axial precession and perihelion ICRF precession.
 * @param {number} periEclYr @param {number} axialYr @param {number} H
 * @returns {number} years */
export function computeWobblePeriodYears(periEclYr: number, axialYr: number, H: number): number;
/**
 * Obliquity cycle with the Venus/Neptune fallback: the record's cycle if
 * present, else |ICRF| (tidally damped — the two-component obliquity
 * formula cancels exactly, constant tilt).
 * @param {number | null | undefined} obliquityCycleYears
 * @param {number} periEclYr @param {number} H @returns {number} */
export function resolveObliquityCycleYears(obliquityCycleYears: number | null | undefined, periEclYr: number, H: number): number;
/**
 * Mean obliquity, SNAPSHOT form (the load-time law both engines ship):
 * mean = tiltJ2000 + amp·cos(ωᵢ·t₂₀₀₀) − amp·cos(ωₒ·t₂₀₀₀).
 * @param {{ axialTiltJ2000: number, invPlaneInclinationAmplitude: number,
 *   perihelionEclipticYears: number }} b
 * @param {number | null | undefined} obliqCycleYears — falsy ⇒ static tilt
 * @param {{ H: number, t2000: number }} env — t2000 = 2000 − eccentricity
 *   anchor (balancedYear − systemResetN·H)
 * @returns {number} degrees */
export function computeObliquityMeanSnapshot(b: {
    axialTiltJ2000: number;
    invPlaneInclinationAmplitude: number;
    perihelionEclipticYears: number;
}, obliqCycleYears: number | null | undefined, env: {
    H: number;
    t2000: number;
}): number;
/**
 * K constant from Earth's calibration. @param {{
 *   eccentricityAmplitude: number, massEarthAlone: number, massSun: number,
 *   earthTiltMeanDeg: number }} c @returns {number} */
export function computeKConstant(c: {
    eccentricityAmplitude: number;
    massEarthAlone: number;
    massSun: number;
    earthTiltMeanDeg: number;
}): number;
/**
 * K law: eccentricity amplitude, base and J2000 phase.
 * @param {{ fibonacciD: number, massFrac: number, solarYearInput: number,
 *   orbitalEccentricityJ2000: number, antiPhase: boolean }} b
 * @param {{ kConstant: number, obliquityMeanDeg: number,
 *   wobblePeriodYears: number, t2000: number, meanSolarYearDays: number }} env
 * @returns {{ amplitude: number, base: number, phaseJ2000: number }} */
export function computeEccentricityLaw(b: {
    fibonacciD: number;
    massFrac: number;
    solarYearInput: number;
    orbitalEccentricityJ2000: number;
    antiPhase: boolean;
}, env: {
    kConstant: number;
    obliquityMeanDeg: number;
    wobblePeriodYears: number;
    t2000: number;
    meanSolarYearDays: number;
}): {
    amplitude: number;
    base: number;
    phaseJ2000: number;
};
