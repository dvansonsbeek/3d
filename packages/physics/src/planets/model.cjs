/**
 * createPlanetModel — the planet composition front door (Phase 8.3, L10).
 *
 * ONE law set, N body records: this factory binds an environment once and
 * runs the certified derivation chain over every body record, in the order
 * the chain requires (each step feeds the next):
 *
 *   ψ constant → inclination law (amplitude, mean)
 *             → wobble period (beat of |axial| and |ICRF|)
 *   K constant → obliquity mean (snapshot form) → eccentricity law
 *             (amplitude, base, J2000 phase)
 *   geometry   (the type-branched ellipse family — the law-derived
 *              eccentricity base feeds geometry for the seven carriers;
 *              minor bodies use their record's base)
 *
 * THIN BY DESIGN. This is the composition surface, not a rewiring: both
 * engines keep their existing direct call sites into the law modules, and
 * the runtime channels (eccentricity-at-year, orientation, the ascending-
 * node integrator, predictive precession) stay direct module calls because
 * they consume engine-owned state (scene JD, epoch machinery, fitted
 * tables). What this factory adds is the seam future bodies plug into:
 * a new body is a record + (at most) one new geometry branch — see the
 * minor-body placeholder note in geometry.cjs (Phase 18 perturbation
 * types land the same way).
 *
 * Guard semantics mirror tools/lib/constants.js verbatim: the law steps
 * run only where the record carries the required fields (fibonacciD +
 * mass fraction for the ψ/K families, perihelion + axial periods for
 * wobble); geometry runs for every body. The identity gate
 * (test/planet-model-identity.test.mjs) holds this factory bit-exact
 * against the shipped Node derivation.
 */

'use strict';

const { derivePlanetGeometry } = require('./geometry.cjs');
const FL = require('./fibonacci-laws.cjs');

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
 * @property {number} [axialPrecessionYears]
 * @property {number|null} [obliquityCycle]
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
function createPlanetModel(env, bodies) {
  const psiConstant = FL.computePsiConstant({
    earthInvPlaneInclinationAmplitude: env.calibration.earthInvPlaneInclinationAmplitude,
    massEarthAlone: env.calibration.massEarthAlone,
    massSun: env.calibration.massSun,
  });
  const kConstant = FL.computeKConstant({
    eccentricityAmplitude: env.calibration.eccentricityAmplitude,
    massEarthAlone: env.calibration.massEarthAlone,
    massSun: env.calibration.massSun,
    earthTiltMeanDeg: env.calibration.earthTiltMeanDeg,
  });
  // Anchor = balancedYear − systemResetN·H (n=7: the System Reset state).
  const eccentricityAnchor = env.balancedYear - env.systemResetN * env.holisticYears;
  const t2000 = 2000 - eccentricityAnchor;

  const geomEnv = {
    holisticYears: env.holisticYears,
    meanSolarYearDays: env.meanSolarYearDays,
    currentAUDistanceKm: env.currentAUDistanceKm,
    earthEccentricityJ2000: env.earthEccentricityJ2000,
    earthPerihelionLongitudeJ2000Deg: env.earthPerihelionLongitudeJ2000Deg,
  };

  /** @type {Record<string, PlanetModelRecord>} */
  const out = {};
  for (const [key, b] of Object.entries(bodies)) {
    const massFrac = env.massFractions[key];
    /** @type {PlanetModelRecord} */
    const rec = /** @type {PlanetModelRecord} */ ({});

    if (b.fibonacciD && massFrac && b.invPlaneInclinationJ2000 !== undefined) {
      const il = FL.computeInclinationLaw({
        fibonacciD: b.fibonacciD, massFrac,
        invPlaneInclinationJ2000: b.invPlaneInclinationJ2000,
        longitudePerihelion: /** @type {number} */ (b.longitudePerihelion),
        inclinationCycleAnchor: /** @type {number} */ (b.inclinationCycleAnchor),
        antiPhase: /** @type {boolean} */ (b.antiPhase),
      }, psiConstant);
      rec.invPlaneInclinationAmplitude = il.amplitude;
      rec.invPlaneInclinationMean = il.mean;
    }

    if (b.perihelionEclipticYears && b.axialPrecessionYears) {
      rec.wobblePeriodYears = FL.computeWobblePeriodYears(
        b.perihelionEclipticYears, b.axialPrecessionYears, env.holisticYears,
      );
    }

    if (b.fibonacciD && massFrac) {
      rec.obliquityMeanDeg = FL.computeObliquityMeanSnapshot({
        axialTiltJ2000: /** @type {number} */ (b.axialTiltJ2000),
        invPlaneInclinationAmplitude: /** @type {number} */ (rec.invPlaneInclinationAmplitude),
        perihelionEclipticYears: /** @type {number} */ (b.perihelionEclipticYears),
      }, b.obliquityCycle, { H: env.holisticYears, t2000 });
      const el = FL.computeEccentricityLaw({
        fibonacciD: b.fibonacciD, massFrac,
        solarYearInput: b.solarYearInput,
        orbitalEccentricityJ2000: /** @type {number} */ (b.orbitalEccentricityJ2000),
        antiPhase: /** @type {boolean} */ (b.antiPhase),
      }, {
        kConstant, obliquityMeanDeg: rec.obliquityMeanDeg,
        wobblePeriodYears: /** @type {number} */ (rec.wobblePeriodYears), t2000,
        meanSolarYearDays: env.meanSolarYearDays,
      });
      rec.eccentricityAmplitude = el.amplitude;
      rec.eccentricityBase = el.base;
      rec.eccentricityPhaseJ2000Deg = el.phaseJ2000;
    }

    rec.geometry = derivePlanetGeometry({
      key, type: b.type,
      solarYearInput: b.solarYearInput,
      orbitalEccentricityBase: rec.eccentricityBase !== undefined
        ? rec.eccentricityBase : b.orbitalEccentricityBase,
      longitudePerihelion: b.longitudePerihelion,
      ascendingNode: b.ascendingNode,
      rotationPeriodDays: b.rotationPeriodDays,
      orbitDistanceOverride: b.orbitDistanceOverride,
    }, geomEnv);

    out[key] = rec;
  }

  return { psiConstant, kConstant, eccentricityAnchor, t2000, bodies: out };
}

module.exports = { createPlanetModel };
