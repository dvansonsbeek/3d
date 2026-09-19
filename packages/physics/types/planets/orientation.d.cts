/**
 * Invariable-plane inclination at explicit time (browser form): the ICRF
 * perihelion-linked oscillation i(t) = mean + s·A·cos(ϖ_ICRF(t) − anchor).
 * @param {{ key?: string, isEarth?: boolean,
 *   invPlaneInclinationJ2000: number, invPlaneInclinationMean: number,
 *   invPlaneInclinationAmplitude: number, inclinationCycleAnchor: number,
 *   longitudePerihelion: number, perihelionEclipticYears: number,
 *   antiPhase?: boolean }} body
 * @param {number} yearsSinceBalanced
 * @param {{ H: number, yearsFromBalancedToJ2000: number }} env
 * @returns {number} degrees */
export function invPlaneInclinationAt(body: {
    key?: string;
    isEarth?: boolean;
    invPlaneInclinationJ2000: number;
    invPlaneInclinationMean: number;
    invPlaneInclinationAmplitude: number;
    inclinationCycleAnchor: number;
    longitudePerihelion: number;
    perihelionEclipticYears: number;
    antiPhase?: boolean;
}, yearsSinceBalanced: number, env: {
    H: number;
    yearsFromBalancedToJ2000: number;
}): number;
/**
 * Ascending node on the invariable plane — the LINEAR year-2000-anchored
 * convention (node-integrator/dashboard; see the header).
 * @param {{ ascendingNodeInvPlane?: number, ascendingNodePeriod?: number,
 *   perihelionEclipticYears: number }} body
 * @param {number} year @returns {number} degrees 0–360 */
export function ascendingNodeInvPlaneLinearAt(body: {
    ascendingNodeInvPlane?: number;
    ascendingNodePeriod?: number;
    perihelionEclipticYears: number;
}, year: number): number;
/**
 * Scene ecliptic inclination — normal-vector dot product, balanced-year
 * anchoring, planet Ω on the −8H/N assignment (canonicalized at S-P4; the
 * mirror of src/script.js updateDynamicInclinations).
 * @param {{ perihelionEclipticYears: number, longitudePerihelion: number,
 *   inclinationCycleAnchor: number, antiPhase?: boolean,
 *   invPlaneInclinationMean: number, invPlaneInclinationAmplitude: number,
 *   ascendingNodeInvPlane: number, ascendingNodeCyclesIn8H?: number }} body
 * @param {{ invPlanePrecessionYears: number, inclinationMean: number,
 *   inclinationAmplitude: number, ascendingNodeInvPlane: number }} earth
 * @param {number} yearsSinceBalanced
 * @param {{ H: number, yearsFromBalancedToJ2000: number }} env
 * @returns {number} degrees */
export function eclipticInclinationFromBalanced(body: {
    perihelionEclipticYears: number;
    longitudePerihelion: number;
    inclinationCycleAnchor: number;
    antiPhase?: boolean;
    invPlaneInclinationMean: number;
    invPlaneInclinationAmplitude: number;
    ascendingNodeInvPlane: number;
    ascendingNodeCyclesIn8H?: number;
}, earth: {
    invPlanePrecessionYears: number;
    inclinationMean: number;
    inclinationAmplitude: number;
    ascendingNodeInvPlane: number;
}, yearsSinceBalanced: number, env: {
    H: number;
    yearsFromBalancedToJ2000: number;
}): number;
