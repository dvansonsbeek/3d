export type PredictPlanetFields = {
    perihelionEclipticYears: number;
    longitudePerihelion: number;
    ascendingNodeCyclesIn8H: number | null | undefined;
    axialPrecessionYears: number;
    obliquityCycle: number | null | undefined;
    wobblePeriod: number | null | undefined;
};
export type PredictDeps = {
    /**
     * - holistic year length (live: setEpoch mutates it)
     */
    getHYears: () => number;
    getBalancedYear: () => number;
    /**
     * - live per-call reads
     */
    getPlanetFields: (planetKey: string) => PredictPlanetFields;
    /**
     * - θ_E, engine-owned form
     */
    calcEarthPerihelionDeg: (year: number) => number;
    /**
     * - ERD deg/yr, engine-owned form
     */
    calcErdRate: (year: number) => number;
    computeObliquityEarthDeg: (year: number) => number;
    computeEccentricityEarth: (year: number) => number;
    /**
     * - the fitted solstice-obliquity mean
     */
    obliquityMeanDeg: number;
    /**
     * - Earth's mean eccentricity (the one law's base′)
     */
    eccentricityMean: number;
};
/**
 * @typedef {Object} PredictPlanetFields
 * @property {number} perihelionEclipticYears
 * @property {number} longitudePerihelion
 * @property {number|null|undefined} ascendingNodeCyclesIn8H
 * @property {number} axialPrecessionYears
 * @property {number|null|undefined} obliquityCycle
 * @property {number|null|undefined} wobblePeriod
 */
/**
 * @typedef {Object} PredictDeps
 * @property {() => number} getHYears - holistic year length (live: setEpoch mutates it)
 * @property {() => number} getBalancedYear
 * @property {(planetKey: string) => PredictPlanetFields} getPlanetFields - live per-call reads
 * @property {(year: number) => number} calcEarthPerihelionDeg - θ_E, engine-owned form
 * @property {(year: number) => number} calcErdRate - ERD deg/yr, engine-owned form
 * @property {(year: number) => number} computeObliquityEarthDeg
 * @property {(year: number) => number} computeEccentricityEarth
 * @property {number} obliquityMeanDeg - the fitted solstice-obliquity mean
 * @property {number} eccentricityMean - Earth's mean eccentricity (the one law's base′)
 */
/**
 * Build the predictive-precession machinery over one engine's state.
 * @param {PredictDeps} deps
 */
export function createPredictivePrecession(deps: PredictDeps): {
    buildPredictiveFeatures: (year: number, planetKey: string) => number[];
    getPlanetFundamentalPeriodsYears: (planetName: string) => Record<string, number | null>;
    getFeatureTemplate: (planetName: string) => number[];
    resetTemplateCache: () => void;
};
/**
 * Any planet's perihelion longitude — simple linear precession from J2000.
 *
 * @param {number} theta0Deg - perihelion longitude at J2000 (degrees)
 * @param {number} periodYears - precession period in years
 * @param {number} year - decimal year
 * @returns {number} longitude in degrees [0, 360)
 */
export function calcPlanetPerihelionLongDeg(theta0Deg: number, periodYears: number, year: number): number;
/**
 * Sum/difference beat periods of two cycles, null where degenerate or
 * beyond MAX_BEAT_YEARS.
 *
 * @param {number|null} t1 @param {number|null} t2
 * @returns {{ sum: number|null, diff: number|null }}
 */
export function beatPair(t1: number | null, t2: number | null): {
    sum: number | null;
    diff: number | null;
};
