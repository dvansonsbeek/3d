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
  // Foundational
  H: C.H,
  inputMeanSolarYear: C.inputMeanSolarYear,
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
  eccentricityAmplitudeK: C.eccentricityAmplitudeK,
  perihelionRefJD: C.perihelionRefJD,

  // Derived values
  perihelionCycleLength: C.perihelionCycleLength,
  meanSolarYearDays: C.meanSolarYearDays,
  meanSiderealYearDays: C.meanSiderealYearDays,
  meanAnomalisticYearDays: C.meanAnomalisticYearDays,
  balancedYear: C.balancedYear,
  balancedJD: C.balancedJD,
  totalDaysInH: C.totalDaysInH,
  eccentricityDerivedMean: C.eccentricityDerivedMean,
  eocEccentricity: C.eocEccentricity,
  perihelionPhaseOffset: C.perihelionPhaseOffset,

  // Fitted coefficients
  SOLSTICE_OBLIQUITY_MEAN: C.SOLSTICE_OBLIQUITY_MEAN,
  SOLSTICE_OBLIQUITY_HARMONICS: C.SOLSTICE_OBLIQUITY_HARMONICS,
  CARDINAL_POINT_ANCHORS: C.CARDINAL_POINT_ANCHORS,
  CARDINAL_POINT_HARMONICS: C.CARDINAL_POINT_HARMONICS,
  TROPICAL_YEAR_HARMONICS: C.TROPICAL_YEAR_HARMONICS,
  SIDEREAL_YEAR_HARMONICS: C.SIDEREAL_YEAR_HARMONICS,
  ANOMALISTIC_YEAR_HARMONICS: C.ANOMALISTIC_YEAR_HARMONICS,

  // Physical & astronomical constants
  currentAUDistance: C.currentAUDistance,
  meanSiderealYearSeconds: C.meanSiderealYearSeconds,
  G_CONSTANT: C.G_CONSTANT,
  MASS_RATIO_EARTH_MOON: C.MASS_RATIO_EARTH_MOON,
  massRatioDE440: C.massRatioDE440,

  // Moon inputs
  moonSiderealMonthInput: C.moonSiderealMonthInput,
  moonDistance: C.moonDistance,

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
