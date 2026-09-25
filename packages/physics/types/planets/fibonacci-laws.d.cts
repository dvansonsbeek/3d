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
