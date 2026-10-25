/**
 * createPlanetModel — the planet composition front door (Phase 8.3, L10).
 *
 * ONE law set, N body records: this factory binds an environment once and
 * runs the certified derivation chain over every body record:
 *
 *   inputs     the chain's g-mode beat (wobble) and the spin channel's
 *              derived J2000 obliquity, carried on the record since plan 06
 *              Phase 7 commit 2
 *   geometry   (the ellipse family — geometry.cjs's own taxonomy since
 *              plan 11 step 3 — on the OBSERVED J2000 eccentricity; minor
 *              bodies use their record's base)
 *
 * The ψ and K amplitude laws that opened this chain (ψ constant →
 * inclination amplitude/mean; K constant → eccentricity amplitude/base/
 * phase) are DELETED — K at plan 07 R6, ψ at plan 07 R5. A planet's
 * inclination and eccentricity of date have one home, the N-body chain
 * (model.js planetChainElementsAt).
 *
 * THIN BY DESIGN. This is the composition surface, not a rewiring: both
 * engines keep their existing direct call sites, and the runtime channels
 * stay direct module calls because they consume engine-owned state (scene
 * JD, epoch machinery, fitted tables). What this factory adds is the seam
 * future bodies plug into: a new body is a record + (at most) one new
 * geometry branch — see the minor-body placeholder note in geometry.cjs
 * (Phase 18 perturbation types land the same way).
 *
 * Geometry runs for every body. The identity gate
 * (test/planet-model-identity.test.mjs) holds this factory bit-exact
 * against the shipped Node derivation.
 */

'use strict';

const { derivePlanetGeometry, scaffoldOrbitInputs } = require('./geometry.cjs');

/**
 * @typedef {Object} PlanetModelBody
 * @property {number} orbitalPeriodInputDays - the body's orbital-period input, SI days — for the planets the period OF DATE (measured in sun-and-eclipses.js: their rates sit 1.4–1.6°/cy above the VSOP sidereal mean motions, the precession plus input rounding), not the sidereal period the field was once documented as; the scaffold period of the no-chain bodies — the chain planets ride the artifact's elements
 * @property {number} [invPlaneInclinationJ2000]
 * @property {number} [longitudePerihelion]
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
 * @property {any} [chainArtifact] - the governed engine-D chain artifact (CHAIN_ARTIFACT): the seven chain planets' scaffold a and period ride its J2000 elements (plan 09 step 7b)
 * @property {number} meanSolarYearDays
 * @property {number} balancedYear
 * @property {number} systemResetN
 * @property {number} currentAUDistanceKm
 * @property {number} earthEccentricityJ2000
 * @property {number} earthPerihelionLongitudeJ2000Deg
 */

/**
 * @typedef {Object} PlanetModelRecord
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
 * @returns {{ bodies: Record<string, PlanetModelRecord> }}
 */
function createPlanetModel(env, bodies) {
  // Plan 07 R6: kConstant, the System-Reset eccentricityAnchor
  // (balancedYear − systemResetN·H) and the t2000 phase it fed went with the
  // eccentricity law; plan 07 R5: psiConstant (ψ = 3·A_earth·√(m_E/m_☉),
  // from env.calibration) went with the inclination law.

  const geomEnv = {
    meanSolarYearDays: env.meanSolarYearDays,
    currentAUDistanceKm: env.currentAUDistanceKm,
    earthEccentricityJ2000: env.earthEccentricityJ2000,
    earthPerihelionLongitudeJ2000Deg: env.earthPerihelionLongitudeJ2000Deg,
  };

  /** @type {Record<string, PlanetModelRecord>} */
  const out = {};
  for (const [key, b] of Object.entries(bodies)) {
    /** @type {PlanetModelRecord} */
    const rec = /** @type {PlanetModelRecord} */ ({});

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
    // anchored on, not a construction. The additional bodies' base is their
    // observed J2000 eccentricity too (astro-reference additionalBodiesReference;
    // plan 11 step 2 deleted the stored copy).

    rec.geometry = derivePlanetGeometry({
      key,   // the ellipse family is the law's own taxonomy (geometry.cjs SCAFFOLD_ELLIPSE_FAMILY, plan 11 step 3)
      // plan 09 step 7b: the chain's J2000 elements where the artifact has the body, else the observed period input
      ...scaffoldOrbitInputs(key, env.chainArtifact, b.orbitalPeriodInputDays),
      orbitalEccentricityBase: b.orbitalEccentricityBase !== undefined
        ? b.orbitalEccentricityBase : b.orbitalEccentricityJ2000,
      longitudePerihelion: b.longitudePerihelion,
      ascendingNode: b.ascendingNode,
      rotationPeriodDays: b.rotationPeriodDays,
      orbitDistanceOverride: b.orbitDistanceOverride,
    }, geomEnv);

    out[key] = rec;
  }

  return { bodies: out };
}

module.exports = { createPlanetModel };
