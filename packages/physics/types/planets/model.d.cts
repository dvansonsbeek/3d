export type PlanetModelBody = {
    /**
     * - geometry type branch ('I' | 'II' | 'III')
     */
    type?: string | undefined;
    solarYearInput: number;
    fibonacciD?: number | undefined;
    invPlaneInclinationJ2000?: number | undefined;
    longitudePerihelion?: number | undefined;
    inclinationCycleAnchor?: number | undefined;
    antiPhase?: boolean | undefined;
    perihelionEclipticYears?: number | undefined;
    /**
     * - carriers: the chain's g-mode beat (input since Phase 7 commit 2)
     */
    wobblePeriodYears?: number | undefined;
    /**
     * - carriers: the derived J2000 obliquity (input since Phase 7 commit 2)
     */
    obliquityMeanDeg?: number | undefined;
    axialTiltJ2000?: number | undefined;
    orbitalEccentricityJ2000?: number | undefined;
    ascendingNode?: number | undefined;
    rotationPeriodDays?: number | undefined;
    /**
     * - minor bodies: JSON input;
     * carriers: ignored (the K law derives it)
     */
    orbitalEccentricityBase?: number | undefined;
    orbitDistanceOverride?: number | undefined;
};
export type PlanetModelEnv = {
    holisticYears: number;
    meanSolarYearDays: number;
    balancedYear: number;
    systemResetN: number;
    currentAUDistanceKm: number;
    earthEccentricityJ2000: number;
    earthPerihelionLongitudeJ2000Deg: number;
    calibration: {
        earthInvPlaneInclinationAmplitude: number;
        massEarthAlone: number;
        massSun: number;
        eccentricityAmplitude: number;
        earthTiltMeanDeg: number;
    };
    massFractions: Record<string, number>;
};
export type PlanetModelRecord = {
    invPlaneInclinationAmplitude?: number | undefined;
    invPlaneInclinationMean?: number | undefined;
    wobblePeriodYears?: number | undefined;
    obliquityMeanDeg?: number | undefined;
    eccentricityAmplitude?: number | undefined;
    eccentricityBase?: number | undefined;
    eccentricityPhaseJ2000Deg?: number | undefined;
    geometry: ReturnType<typeof derivePlanetGeometry>;
};
/**
 * @typedef {Object} PlanetModelBody
 * @property {string} [type] - geometry type branch ('I' | 'II' | 'III')
 * @property {number} solarYearInput
 * @property {number} [fibonacciD]
 * @property {number} [invPlaneInclinationJ2000]
 * @property {number} [longitudePerihelion]
 * @property {number} [inclinationCycleAnchor]
 * @property {boolean} [antiPhase]
 * @property {number} [perihelionEclipticYears]
 * @property {number} [wobblePeriodYears] - carriers: the chain's g-mode beat (input since Phase 7 commit 2)
 * @property {number} [obliquityMeanDeg] - carriers: the derived J2000 obliquity (input since Phase 7 commit 2)
 * @property {number} [axialTiltJ2000]
 * @property {number} [orbitalEccentricityJ2000]
 * @property {number} [ascendingNode]
 * @property {number} [rotationPeriodDays]
 * @property {number} [orbitalEccentricityBase] - minor bodies: JSON input;
 *   carriers: ignored (the K law derives it)
 * @property {number} [orbitDistanceOverride]
 */
/**
 * @typedef {Object} PlanetModelEnv
 * @property {number} holisticYears
 * @property {number} meanSolarYearDays
 * @property {number} balancedYear
 * @property {number} systemResetN
 * @property {number} currentAUDistanceKm
 * @property {number} earthEccentricityJ2000
 * @property {number} earthPerihelionLongitudeJ2000Deg
 * @property {{ earthInvPlaneInclinationAmplitude: number,
 *   massEarthAlone: number, massSun: number,
 *   eccentricityAmplitude: number, earthTiltMeanDeg: number }} calibration
 * @property {Record<string, number>} massFractions
 */
/**
 * @typedef {Object} PlanetModelRecord
 * @property {number} [invPlaneInclinationAmplitude]
 * @property {number} [invPlaneInclinationMean]
 * @property {number} [wobblePeriodYears]
 * @property {number} [obliquityMeanDeg]
 * @property {number} [eccentricityAmplitude]
 * @property {number} [eccentricityBase]
 * @property {number} [eccentricityPhaseJ2000Deg]
 * @property {ReturnType<typeof derivePlanetGeometry>} geometry
 */
/**
 * Run the full derivation chain over a set of body records.
 *
 * @param {PlanetModelEnv} env
 * @param {Record<string, PlanetModelBody>} bodies - keyed by body name
 *   (the key selects the body-unique geometry branches: mercury, pluto,
 *   halleys, ceres)
 * @returns {{ psiConstant: number, kConstant: number,
 *   eccentricityAnchor: number, t2000: number,
 *   bodies: Record<string, PlanetModelRecord> }}
 */
export function createPlanetModel(env: PlanetModelEnv, bodies: Record<string, PlanetModelBody>): {
    psiConstant: number;
    kConstant: number;
    eccentricityAnchor: number;
    t2000: number;
    bodies: Record<string, PlanetModelRecord>;
};
import { derivePlanetGeometry } from "./geometry.cjs";
