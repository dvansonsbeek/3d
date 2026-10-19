#!/usr/bin/env node
/**
 * Dump selected constants as JSON to stdout.
 * Called by load_constants.py — not intended for direct use.
 *
 * Outputs all input constants, derived values, fitted coefficients,
 * and planet data needed by the Python training/fitting scripts.
 */

const path = require('path');
const C = require(path.join(__dirname, '..', '..', 'lib', 'constants'));

const output = {
  // Foundational (plan 09 step 7c: the frozen era unit H and the device's
  // rounded mean-tropical-year input left the model; the research scripts
  // that scan the retired 8H/n lattice carry 335,317 as a named record)
  perihelionalignmentYear: C.perihelionalignmentYear,
  startmodelJD: C.startmodelJD,     // plan 11 step 5: from astro-reference timeReference.sceneEpochJD
  startmodelYear: C.startmodelYear, // plan 11 step 5: from astro-reference timeReference.sceneEpochYear (correctionDays is deleted)
  // (plan 11 step 2: correctionSun, eccentricityBase, earthInvPlaneInclinationMean,
  // eccentricityDerivedMean and perihelionPhaseOffset — scene-scaffold constants
  // with no reader left — are deleted; temperatureGraphMostLikely left at plan 07 R10;
  // plan 11 step 4: startAngleModel left with the K-device scaffold)
  useVariableSpeed: C.useVariableSpeed,

  // Earth parameters (plan 11 step 4: the K-device scaffold's pose —
  // earthtiltMean, earthInvPlaneInclinationAmplitude, earthRAAngle,
  // eccentricityAmplitude, kDeviceWheelPhaseAtJ2000Cycles — is deleted; the
  // scene's world frame is the J2000 ecliptic. eccentricityAmplitudeK left at
  // plan 07 R6.)
  earthAscendingNodeInvPlane: C.earthAscendingNodeInvPlane,
  perihelionRefJD: C.perihelionRefJD,

  // Derived values
  meanSolarYearDays: C.meanSolarYearDays,
  meanSiderealYearDays: C.meanSiderealYearDays,
  balancedYear: C.balancedYear,
  balancedJD: C.balancedJD,
  eocEccentricity: C.eocEccentricity,

  // (plan 09 step 7a: the fitted cardinal record CARDINAL_POINT_ANCHORS /
  //  CARDINAL_POINT_HARMONICS is deleted)
  axialPrecessionJ2000Years: C.axialPrecessionJ2000Years,   // plan 09: the IAU p_A anchor as a period

  // Physical & astronomical constants
  currentAUDistance: C.currentAUDistance,
  meanSiderealYearSeconds: C.meanSiderealYearSeconds,
  G_CONSTANT: C.G_CONSTANT,
  MASS_RATIO_EARTH_MOON: C.MASS_RATIO_EARTH_MOON,
  massRatioDE440: C.massRatioDE440,

  // Deep-time physics anchors (astro-reference.json physicalConstants + the
  // generated module's assembled deepTime block — plan 11 step 1: astro-reference
  // moonRecessionAlpha1PerMa / giaCoxChaoPeltier, data/deep-time-fitted.json,
  // the ΔT fit artifact's shipped_taper — read through tools/lib/constants.js)
  EARTH_MOI_FACTOR: C.EARTH_MOI_FACTOR,
  SOLAR_LUMINOSITY_W: C.SOLAR_LUMINOSITY_W,
  SOLAR_WIND_KG_PER_S: C.SOLAR_WIND_KG_PER_S,
  ALPHA_1: C.ALPHA_1,   // the LLR rate — the cited distance history's J2000 slope (plan 12 option A: ALPHA_3/ALPHA_4 and RECESSION_REGIME are deleted)
  ALPHA_CLIMATE_SCALE: C.ALPHA_CLIMATE_SCALE,
  ALPHA_GIA_RATE_J2000_PER_YR: C.ALPHA_GIA_RATE_J2000_PER_YR,
  ALPHA_GIA_RELAXATION_KYR: C.ALPHA_GIA_RELAXATION_KYR,
  J2_RATE_J2000_PER_YR: C.J2_RATE_J2000_PER_YR,
  DT_STACK_TAPER_FULL_HALFWIDTH_YR: C.DT_STACK_TAPER_FULL_HALFWIDTH_YR,
  DT_STACK_TAPER_TOTAL_HALFWIDTH_YR: C.DT_STACK_TAPER_TOTAL_HALFWIDTH_YR,

  // Moon inputs
  moonSiderealMonthInput: C.moonSiderealMonthInput,
  moonDistance: C.moonDistance,
  moonOrbitalEccentricity: C.moonOrbitalEccentricity,

  // Planet data (full objects)
  planets: C.planets,

  // Astronomical references
  ASTRO_REFERENCE: {
    obliquityJ2000_deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
    earthEccentricityJ2000: C.ASTRO_REFERENCE.earthEccentricityJ2000,
    earthPerihelionLongitudeJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
    juneSolstice2000_JD: C.ASTRO_REFERENCE.juneSolstice2000_JD,
  },
};

process.stdout.write(JSON.stringify(output));
