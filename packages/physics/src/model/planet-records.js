/**
 * The planets' structural records — keys, mass fractions, the published J2000 record.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { CHAIN_ARTIFACT } from '../planets/chain-artifact.js';
import { PLANET_DISPLAY_NAMES } from '../planets/display-names.cjs';
import { computeObliquityJ2000Deg } from '../planets/spin-channel.cjs';

/** @param {import('./delta-t.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePlanetRecords(ctx) {
  const { C, GM_EARTH_ALONE, G_CONSTANT, M_SUN } = ctx;
  const PLANET_KEYS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const massEarthAlone = GM_EARTH_ALONE / G_CONSTANT;
  /** @type {Record<string, number>} */
  const massFraction = {};
  for (const k of PLANET_KEYS) massFraction[k] = 1 / C.physicalConstants.massRatioDE440[k];
  massFraction.earth = massEarthAlone / M_SUN;

  /** @type {Record<string, Record<string, any>>} */
  const PUBLISHED_PLANET_RECORDS = {};    // what model.planets.record() serves
  for (const k of PLANET_KEYS) {
    const ar = C.planetOrbitalElements[k];
    // The obliquity is the DERIVED J2000 obliquity of the spin channel (the
    // IAU pole against the chain's J2000 plane, acute form) — from the
    // governed artifacts.
    const obliquityDerived = computeObliquityJ2000Deg({
      spin: C.planetSpinPhysical[k],
      anchorInclEclipticDeg: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements[k].inclEclipticDeg,
      anchorAscNodeEclipticDeg: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements[k].ascNodeEclipticDeg,
      obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
    });
    const obliquityMean = Math.min(obliquityDerived, 180 - obliquityDerived);   // acute form of the derived J2000 obliquity
    // What `model.planets.record()` PUBLISHES is the structural record: the
    // REFERENCE inputs (IAU J2000 ϖ, the Souami & Souchay node and
    // inclination, DE440 e, the period input, the axial tilt), the DERIVED
    // `obliquityMean` (the spin channel against the chain's J2000 plane), and
    // the two PERIODS that are chain eigenmodes — 1,296,000/g and 1,296,000/s
    // (apsidal prograde positive, nodal regression negative). Quantities that
    // vary with the epoch (e, i, Ω, ϖ of date) are served AT AN EPOCH by
    // planet-elements-of-date.js and `/v1/bodies`' `at[]` rows, never as a
    // single oscillation's mean + amplitude + phase — the chain's multi-mode
    // vectors have none.
    const chainModes = /** @type {any} */ (CHAIN_ARTIFACT);
    const gArc = chainModes.g[k] && chainModes.g[k].arcsecPerYr;
    const sArc = chainModes.s[k] && chainModes.s[k].arcsecPerYr;
    PUBLISHED_PLANET_RECORDS[k] = Object.freeze({
      name: PLANET_DISPLAY_NAMES[k],   // presentation — planets/display-names
      orbitalPeriodInputDays: ar.orbitalPeriodInputDays,
      longitudePerihelion: ar.longitudePerihelion,
      ascendingNodeInvPlane: ar.ascendingNodeInvPlaneClosedForm,   // the closed-form verified J2000 node (astro-reference)
      invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
      orbitalEccentricityJ2000: ar.orbitalEccentricityJ2000,
      axialTiltJ2000: ar.axialTiltJ2000,
      obliquityMean,
      perihelionEclipticYears: gArc ? 1296000 / gArc : undefined,
      ascendingNodePeriod: sArc ? 1296000 / sArc : undefined,
    });
  }

  return { PLANET_KEYS, PUBLISHED_PLANET_RECORDS, massFraction };
}
/** @typedef {import('./delta-t.js').Ctx & ReturnType<typeof assemblePlanetRecords>} Ctx */
