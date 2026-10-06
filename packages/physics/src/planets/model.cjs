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
 *   massEarthAlone: number, massSun: number }} calibration
 * @property {Record<string, number>} massFractions
 */

/**
 * @typedef {Object} PlanetModelRecord
 * @property {number} [invPlaneInclinationAmplitude]
 * @property {number} [invPlaneInclinationMean]
 * @property {number} [wobblePeriodYears]
 * @property {number} [obliquityMeanDeg]
 * @property {ReturnType<typeof derivePlanetGeometry>} geometry
 */

/**
 * Run the full derivation chain over a set of body records.
 *
 * @param {PlanetModelEnv} env
 * @param {Record<string, PlanetModelBody>} bodies - keyed by body name
 *   (the key selects the body-unique geometry branches: mercury, pluto,
 *   halleys, ceres)
 * @returns {{ psiConstant: number,
 *   bodies: Record<string, PlanetModelRecord> }}
 */
function createPlanetModel(env, bodies) {
  const psiConstant = FL.computePsiConstant({
    earthInvPlaneInclinationAmplitude: env.calibration.earthInvPlaneInclinationAmplitude,
    massEarthAlone: env.calibration.massEarthAlone,
    massSun: env.calibration.massSun,
  });
  // Plan 07 R6: kConstant, the System-Reset eccentricityAnchor
  // (balancedYear − systemResetN·H) and the t2000 phase it fed went with the
  // eccentricity law.

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

    // Plan 06 Phase 7 commit 2: the K law's cycle period and obliquity input
    // are INPUTS of the record now — the chain's own g-mode beat
    // (keplerian-chain computeSecularShape) and the derived J2000 obliquity
    // (spin-channel computeObliquityJ2000Deg); the device's integer axial and
    // obliquity fractions are retired.
    if (b.wobblePeriodYears !== undefined) rec.wobblePeriodYears = b.wobblePeriodYears;
    if (b.obliquityMeanDeg !== undefined) rec.obliquityMeanDeg = b.obliquityMeanDeg;

    // Plan 07 R6: the K law's eccentricityAmplitude / eccentricityBase /
    // eccentricityPhaseJ2000Deg stood here. With the law gone, the ellipse
    // geometry below reads the OBSERVED J2000 eccentricity where it used to
    // read the law's System-Reset base — the observation the chain is
    // anchored on, not a construction. The stored base survives only for the
    // additional bodies, which carry theirs in model-parameters.json.

    rec.geometry = derivePlanetGeometry({
      key, type: b.type,
      solarYearInput: b.solarYearInput,
      orbitalEccentricityBase: b.orbitalEccentricityBase !== undefined
        ? b.orbitalEccentricityBase : b.orbitalEccentricityJ2000,
      longitudePerihelion: b.longitudePerihelion,
      ascendingNode: b.ascendingNode,
      rotationPeriodDays: b.rotationPeriodDays,
      orbitDistanceOverride: b.orbitDistanceOverride,
    }, geomEnv);

    out[key] = rec;
  }

  return { psiConstant, bodies: out };
}

module.exports = { createPlanetModel };
