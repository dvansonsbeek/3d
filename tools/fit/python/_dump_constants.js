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
  startmodelJD: C.startmodelJD,
  startmodelYear: C.startmodelYear,
  correctionDays: C.correctionDays,
  correctionSun: C.correctionSun,
  temperatureGraphMostLikely: C.temperatureGraphMostLikely,
  startAngleModel: C.startAngleModel,
  useVariableSpeed: C.useVariableSpeed,

  // Earth parameters
  earthtiltMean: C.earthtiltMean,
  earthInvPlaneInclinationAmplitude: C.earthInvPlaneInclinationAmplitude,
  earthRAAngle: C.earthRAAngle,
  earthInvPlaneInclinationMean: C.earthInvPlaneInclinationMean,
  earthAscendingNodeInvPlane: C.earthAscendingNodeInvPlane,
  eccentricityBase: C.eccentricityBase,
  eccentricityAmplitude: C.eccentricityAmplitude,
  // (eccentricityAmplitudeK — the K constant — left with the law at plan 07 R6.)
  perihelionRefJD: C.perihelionRefJD,

  // Derived values
  meanSolarYearDays: C.meanSolarYearDays,
  meanSiderealYearDays: C.meanSiderealYearDays,
  balancedYear: C.balancedYear,
  kDeviceWheelPhaseAtJ2000Cycles: C.kDeviceWheelPhaseAtJ2000Cycles,   // plan 07 R10: the K wheels' recorded J2000 phase
  balancedJD: C.balancedJD,
  eccentricityDerivedMean: C.eccentricityDerivedMean,
  eocEccentricity: C.eocEccentricity,
  perihelionPhaseOffset: C.perihelionPhaseOffset,

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
  ALPHA_1: C.ALPHA_1,
  ALPHA_3: C.ALPHA_3,
  ALPHA_4: C.ALPHA_4,
  ALPHA_CLIMATE_SCALE: C.ALPHA_CLIMATE_SCALE,
  ALPHA_GIA_RATE_J2000_PER_YR: C.ALPHA_GIA_RATE_J2000_PER_YR,
  ALPHA_GIA_RELAXATION_KYR: C.ALPHA_GIA_RELAXATION_KYR,
  J2_RATE_J2000_PER_YR: C.J2_RATE_J2000_PER_YR,
  RECESSION_REGIME: C.RECESSION_REGIME,
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
