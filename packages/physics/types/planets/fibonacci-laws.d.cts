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
