// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS MODULE — Single source of truth for all tool scripts.
//
// All input data loaded from JSON files in public/input/:
//   model-parameters.json       — Model theory parameters
//   astro-reference.json        — IAU/JPL/Meeus reference data
//   fitted-coefficients.json    — Fitting pipeline output (via fitted-coefficients.js)
//
// Sub-modules:
//   constants/fitted-coefficients.js — Loads fitted data + buildFittedCoefficients()
//   constants/utils.js              — Date conversion, formatting, derivation helpers
//
// All consumers: const C = require('./lib/constants');
// ═══════════════════════════════════════════════════════════════════════════

// ─── Sub-modules & JSON data ─────────────────────────────────────────────
const fitted = require('./constants/fitted-coefficients');
const utils = require('./constants/utils');
const path = require('path');
const fs = require('fs');
const modelParams = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'model-parameters.json'), 'utf8'));
const astroRef = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));

// Build ASTRO_REFERENCE object (consumed by scene-graph.js, optimizer.js, etc.)
const ASTRO_REFERENCE = {
  // Earth orbital (J2000)
  juneSolstice2000_JD: astroRef.earthOrbital.juneSolstice2000_JD,
  obliquityJ2000_deg: astroRef.earthOrbital.obliquityJ2000_deg,
  obliquityRate_arcsecPerCentury: astroRef.earthOrbital.obliquityRate_arcsecPerCentury,
  earthEccentricityJ2000: astroRef.earthOrbital.earthEccentricityJ2000,
  earthPerihelionLongitudeJ2000: astroRef.earthOrbital.earthPerihelionLongitudeJ2000,
  earthAscendingNodeInvPlane: astroRef.earthOrbital.earthAscendingNodeInvPlane,
  earthInclinationPhaseAngle: astroRef.earthOrbital.earthInclinationPhaseAngle,
  perihelionPassageJ2000_JD: astroRef.earthOrbital.perihelionPassageJ2000_JD,
  earthInclinationJ2000_deg: astroRef.earthOrbital.earthInclinationJ2000_deg,
  // Lunar Meeus coefficients
  ...astroRef.moonMeeus,
  // Cardinal point anchors
  cardinalPointAnchors: astroRef.cardinalPointAnchors,
  // Additional fields attached below after planets are defined:
  //   ascNodeTiltCorrection, decCorrection, raCorrection,
  //   earthInvPlanePrecessionYears, <planet>PerihelionRef_JD
};

const yearLengthRef = astroRef.yearLengthRef;
const knownValues = astroRef.knownValues;


// ═══════════════════════════════════════════════════════════════════════════
// 1. FOUNDATIONAL MODEL CONSTANTS (from model-parameters.json)
// These define the model itself. Changing any = different theory.
// ═══════════════════════════════════════════════════════════════════════════

const H = modelParams.foundational.holisticyearLength;
const inputMeanSolarYear = modelParams.foundational.inputmeanlengthsolaryearindays;
const startmodelJD = modelParams.foundational.startmodelJD;
const startmodelYear = modelParams.foundational.startmodelYear;
const correctionDays = modelParams.foundational.correctionDays;
const correctionSun = modelParams.foundational.correctionSun;
const temperatureGraphMostLikely = modelParams.foundational.temperatureGraphMostLikely;
const startAngleModel = modelParams.foundational.startAngleModel;
const useVariableSpeed = modelParams.foundational.useVariableSpeed;


// ═══════════════════════════════════════════════════════════════════════════
// 2. PHYSICAL & ASTRONOMICAL CONSTANTS (from astro-reference.json)
// External reference values from IAU, JPL DE440, etc.
// ═══════════════════════════════════════════════════════════════════════════

const currentAUDistance = astroRef.physicalConstants.currentAUDistance;
const meanSiderealYearSeconds = astroRef.physicalConstants.meansiderealyearlengthinSeconds;
const G_CONSTANT = astroRef.physicalConstants.G_CONSTANT;
const MASS_RATIO_EARTH_MOON = astroRef.physicalConstants.MASS_RATIO_EARTH_MOON;
const massRatioDE440 = astroRef.physicalConstants.massRatioDE440;
const perihelionalignmentYear = astroRef.earthOrbital.perihelionalignmentYear;


// ═══════════════════════════════════════════════════════════════════════════
// 3. EARTH PARAMETERS (from model-parameters.json + derived)
// ═══════════════════════════════════════════════════════════════════════════

const earthtiltMean = modelParams.earth.earthtiltMean;
const earthInvPlaneInclinationAmplitude = modelParams.earth.earthInvPlaneInclinationAmplitude;
// Derived: 2A − A²/ε — two tilt layers (H/3 + H/5) minus second-order equatorial projection
const earthRAAngle = utils.computeEarthRAAngle(earthInvPlaneInclinationAmplitude, earthtiltMean);
// Derived: inclJ2000 − amplitude × cos(Ω_J2000 − phaseAngle) — refs from ASTRO_REFERENCE
const earthAscendingNodeInvPlane = ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const earthInvPlaneInclinationMean = utils.computeInvPlaneInclinationMean(
  ASTRO_REFERENCE.earthInclinationJ2000_deg, earthInvPlaneInclinationAmplitude,
  earthAscendingNodeInvPlane, ASTRO_REFERENCE.earthInclinationPhaseAngle);
const eccentricityBase = modelParams.earth.eccentricityBase;
const eccentricityAmplitude = modelParams.earth.eccentricityAmplitude;
const eccentricityAmplitudeK = modelParams.earth.eccentricityAmplitudeK;
const perihelionRefJD = ASTRO_REFERENCE.perihelionPassageJ2000_JD;


// ═══════════════════════════════════════════════════════════════════════════
// 4. MOON INPUT CONSTANTS (astro refs + model startpos)
// ═══════════════════════════════════════════════════════════════════════════

const moonSiderealMonthInput = astroRef.moonReference.moonSiderealMonthInput;
const moonAnomalisticMonthInput = astroRef.moonReference.moonAnomalisticMonthInput;
const moonNodalMonthInput = astroRef.moonReference.moonNodalMonthInput;
const moonDistance = astroRef.moonReference.moonDistance;
const moonEclipticInclinationJ2000 = astroRef.moonReference.moonEclipticInclinationJ2000;
const moonOrbitalEccentricity = astroRef.moonReference.moonOrbitalEccentricityBase;
const moonTilt = astroRef.moonReference.moonTilt;
const moonMeeusLpCorrection = modelParams.moon.moonMeeusLpCorrection || 0;
const moonStartposApsidal = modelParams.moon.moonStartposApsidal;
const moonStartposNodal = modelParams.moon.moonStartposNodal;
const moonStartposMoon = modelParams.moon.moonStartposMoon;


// ═══════════════════════════════════════════════════════════════════════════
// 5. PLANET INPUT DATA (merged from model-parameters.json + astro-reference.json)
// Per-planet constants for the 7 non-Earth planets.
// ═══════════════════════════════════════════════════════════════════════════

// Helper: convert fraction [num, den] to H * num / den
function fractionToYears(frac) {
  if (frac === null) return null;
  return H * frac[0] / frac[1];
}

const planetAstro = astroRef.planetOrbitalElements;
const planets = {};
for (const [key, mp] of Object.entries(modelParams.planets)) {
  const ar = planetAstro[key];
  planets[key] = {
    // Model parameters (from model-parameters.json)
    name: mp.name,
    orbitalEccentricityBase: mp.orbitalEccentricityBase,
    orbitalEccentricityAmplitude: mp.orbitalEccentricityAmplitude,
    eccentricityPhaseJ2000: mp.eccentricityPhaseJ2000,
    eocFraction: mp.eocFraction,
    startpos: mp.startpos,
    angleCorrection: mp.angleCorrection,
    perihelionEclipticYears: fractionToYears(mp.perihelionEclipticFraction),
    type: mp.type,
    mirrorPair: mp.mirrorPair,
    fibonacciD: mp.fibonacciD,
    ascendingNodeInvPlane: mp.ascendingNodeInvPlane,
    inclinationPhaseAngle: mp.inclinationPhaseAngle,
    obliquityCycle: fractionToYears(mp.obliquityCycleFraction),
    // Astro references (from astro-reference.json)
    solarYearInput: ar.solarYearInput,
    orbitalEccentricityJ2000: ar.orbitalEccentricityJ2000,
    axialTiltMean: ar.axialTiltMean,
    eclipticInclinationJ2000: ar.eclipticInclinationJ2000,
    longitudePerihelion: ar.longitudePerihelion,
    ascendingNode: ar.ascendingNode,
    invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
  };
}

// Derive orbitTilta/b from ascendingNode + eclipticInclinationJ2000
for (const p of Object.values(planets)) {
  if (p.ascendingNode !== undefined && p.eclipticInclinationJ2000 !== undefined) {
    const tilt = utils.computeOrbitTilt(p.ascendingNode, p.eclipticInclinationJ2000);
    p.orbitTilta = tilt.orbitTilta;
    p.orbitTiltb = tilt.orbitTiltb;
  }
}

// Additional bodies (not in the 8-planet Fibonacci framework)
const additionalBodies = {};
for (const [key, body] of Object.entries(modelParams.additionalBodies)) {
  const ar = astroRef.additionalBodiesReference[key] || {};
  additionalBodies[key] = {
    name: body.name,
    solarYearInput: ar.solarYearInput || body.solarYearInput,
    orbitalEccentricityBase: body.orbitalEccentricityBase,
    type: body.type,
    ...(body.orbitDistanceOverride ? { orbitDistanceOverride: body.orbitDistanceOverride } : {}),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// 6. DERIVED MODEL VALUES
// Computed from foundational constants. Order matters (dependency chain).
// ═══════════════════════════════════════════════════════════════════════════

const perihelionCycleLength = H / 16;
const meanSolarYearDays = Math.round(inputMeanSolarYear * (H / 16)) / (H / 16);
const meanEarthRotationsPerYear = meanSolarYearDays + 1;
const startModelYearWithCorrection = startmodelYear + (correctionDays / meanSolarYearDays);
const balancedYear = perihelionalignmentYear - (temperatureGraphMostLikely * (H / 16));
const perihelionalignmentJD = Math.round(startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - perihelionalignmentYear)));
const balancedJD = startmodelJD - (meanSolarYearDays * (startModelYearWithCorrection - balancedYear));
const yearsFromBalancedToJ2000 = (startmodelJD - balancedJD) / meanSolarYearDays;
const meanSiderealYearDays = meanSolarYearDays * (H / 13) / ((H / 13) - 1);
const meanLengthOfDay = meanSiderealYearSeconds / meanSiderealYearDays;
const meanSiderealDay = (meanSolarYearDays / (meanSolarYearDays + 1)) * meanLengthOfDay;
const meanStellarDay = (meanSiderealDay / (H / 13)) / (meanSolarYearDays + 1) + meanSiderealDay;
const meanAnomalisticYearDays = (meanSolarYearDays / (perihelionCycleLength - 1)) + meanSolarYearDays;
const eccentricityDerivedMean = Math.sqrt(eccentricityBase * eccentricityBase + eccentricityAmplitude * eccentricityAmplitude);
const totalDaysInH = H * meanSolarYearDays;

// ── Step size and grid year (derived from H and startmodelYear) ──────────
const stepYears = modelParams.foundational.stepYears || 21;
const gridYear = balancedYear + Math.round((2000 - balancedYear) / stepYears) * stepYears;
const gridYearDeltaFromJ2000 = gridYear - 2000;

// Cardinal point year fractions for initial search (derived from startmodelYear offset)
// Maps calendar event to approximate year fraction from the model epoch
const _epochOffset = startmodelYear % 1;  // 0.5 for mid-year epoch
const cardinalPointYearFractions = {
  SS: 0.47 - _epochOffset,                   // June solstice
  WS: 0.97 - _epochOffset,                   // December solstice
  VE: ((0.22 - _epochOffset) % 1 + 1) % 1,  // March equinox (wrap if negative)
  AE: 0.73 - _epochOffset,                   // September equinox
};

// Shifted IAU values at grid year (for harmonic fitting when grid ≠ J2000)
const iauObliquityAtGrid = ASTRO_REFERENCE.obliquityJ2000_deg
  + (ASTRO_REFERENCE.obliquityRate_arcsecPerCentury / 3600 / 100) * gridYearDeltaFromJ2000;
const cardinalPointAnchorsAtGrid = {};
for (const [type, jd2000] of Object.entries(ASTRO_REFERENCE.cardinalPointAnchors)) {
  cardinalPointAnchorsAtGrid[type] = jd2000 + meanSolarYearDays * gridYearDeltaFromJ2000;
}

// J2000.0 epoch (standard astronomical convention: Jan 1.5, 2000 TT = JD 2451545.0)
// Julian century = exactly 36525 days by IAU definition (used in Meeus, IAU precession, parallax)
// Tropical century = 100 model tropical years (used in obliquity rate solver for phase-clean measurement)
const j2000JD = 2451545.0;
const julianCenturyDays = 36525;
const tropicalCenturyDays = 100 * meanSolarYearDays;

// Triple synodic period (Jupiter-Saturn conjunction cycle with perihelion precession)
// Uses exact orbital periods from integer orbit counts: H / round(totalDaysInH / solarYearInput)
const _jupCount = Math.round(totalDaysInH / planets.jupiter.solarYearInput);
const _satCount = Math.round(totalDaysInH / planets.saturn.solarYearInput);
const _Tj = H / _jupCount;  // exact Jupiter period in tropical years
const _Ts = H / _satCount;  // exact Saturn period in tropical years
const _nJeff = 360 / _Tj + 360 / planets.jupiter.perihelionEclipticYears;
const _nSeff = 360 / _Ts + 360 / planets.saturn.perihelionEclipticYears;
const tripleSynodicYears = 3 * 360 / (_nJeff - _nSeff);

// Equation of center eccentricity — derived, not a free parameter.
const eocEccentricity = eccentricityDerivedMean - eccentricityBase / 2;

// Perihelion phase offset — derived from geometric perihelion direction vs reference perihelion date.
const perihelionPhaseOffset = (((startModelYearWithCorrection - balancedYear) / (H / 16) * 360
  + correctionSun + 360 * (startmodelJD - perihelionRefJD) / meanSolarYearDays) % 360 + 360) % 360;


// ═══════════════════════════════════════════════════════════════════════════
// 7. MOON DERIVED CYCLES
// ═══════════════════════════════════════════════════════════════════════════

const moonSiderealMonth = totalDaysInH / Math.ceil(totalDaysInH / moonSiderealMonthInput);
const moonAnomalisticMonth = totalDaysInH / Math.ceil(totalDaysInH / moonAnomalisticMonthInput);
const moonNodalMonth = totalDaysInH / Math.ceil(totalDaysInH / moonNodalMonthInput);

const moonSynodicMonth = totalDaysInH / (Math.ceil(totalDaysInH / moonSiderealMonthInput - 1) + 13 - H);
const moonTropicalMonth = totalDaysInH / (Math.ceil(totalDaysInH / moonSiderealMonthInput - 1) + 13);

const moonFullMoonCycleEarth = (moonSynodicMonth / (moonSynodicMonth - moonAnomalisticMonth)) * moonAnomalisticMonth;
const moonFullMoonCycleICRF = totalDaysInH / ((totalDaysInH / moonFullMoonCycleEarth) + 13);

const moonNodalPrecessionDaysEarth = (moonSiderealMonth / (moonSiderealMonth - moonNodalMonth)) * moonNodalMonth;
const moonNodalPrecessionDaysICRF = totalDaysInH / ((totalDaysInH / moonNodalPrecessionDaysEarth) - 13);

const moonApsidalPrecessionDaysEarth = (1 / ((moonAnomalisticMonth / moonSiderealMonth) - 1)) * moonAnomalisticMonth;
const moonApsidalPrecessionDaysICRF = totalDaysInH / ((totalDaysInH / moonApsidalPrecessionDaysEarth) + 13);

const moonApsidalMeetsNodalDays = (moonNodalMonth / (moonAnomalisticMonth - moonNodalMonth)) * moonAnomalisticMonth;
const moonLunarLevelingCycleDays = (moonNodalPrecessionDaysEarth / (moonNodalPrecessionDaysEarth - moonApsidalPrecessionDaysEarth) * (moonApsidalPrecessionDaysEarth / meanSolarYearDays)) * meanSolarYearDays;
const moonDraconicYearICRF = 1 / ((1 / meanSolarYearDays) + (1 / moonNodalPrecessionDaysEarth));
const moonDraconicYearEarth = totalDaysInH / ((totalDaysInH / moonDraconicYearICRF) - 13);


// ═══════════════════════════════════════════════════════════════════════════
// 8. ASTRO_REFERENCE WIRING
// Attach planet-dependent fields to the imported ASTRO_REFERENCE object.
// ═══════════════════════════════════════════════════════════════════════════

// Model-derived value (not an astronomical reference, but consumed via ASTRO_REFERENCE)
ASTRO_REFERENCE.earthInvPlanePrecessionYears = H / 3;

// Parallax corrections (fitted, from fitted-coefficients.js)
ASTRO_REFERENCE.decCorrection = fitted.PARALLAX_DEC_CORRECTION;
ASTRO_REFERENCE.raCorrection = fitted.PARALLAX_RA_CORRECTION;

// Moon post-Meeus RA/Dec correction (fitted to JPL DE440 residuals)
const MOON_CORRECTION = fitted.MOON_CORRECTION || null;

// Gravitation correction (per-planet synodic periods, planet-planet perturbations)
const GRAVITATION_CORRECTION = fitted.GRAVITATION_CORRECTION || null;

// Elongation correction for inner planets (Venus, Mars)
const ELONGATION_CORRECTION = fitted.ELONGATION_CORRECTION || null;

// Planet perihelion passage references (model-tuned, from model-parameters.json)
for (const [key, jd] of Object.entries(modelParams.perihelionPassageRef)) {
  if (typeof jd === 'number') ASTRO_REFERENCE[key + 'PerihelionRef_JD'] = jd;
}

// Ascending node corrections (derived from planet data)
ASTRO_REFERENCE.ascNodeTiltCorrection = {
  mercury: 180 - planets.mercury.ascendingNode,
  venus:   180 - planets.venus.ascendingNode,
  mars:    180 - planets.mars.ascendingNode,
  jupiter: 2 * planets.jupiter.startpos,
  saturn:  2 * planets.saturn.startpos,
  uranus:  2 * planets.uranus.startpos,
  neptune: 2 * planets.neptune.startpos,
};


// ═══════════════════════════════════════════════════════════════════════════
// 9. MASS COMPUTATION, PSI, J2000 ECCENTRICITIES
// ═══════════════════════════════════════════════════════════════════════════

const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(currentAUDistance, 3)) / Math.pow(meanSiderealYearSeconds, 2);
const M_SUN = GM_SUN / G_CONSTANT;

const massFraction = {};
for (const [k, ratio] of Object.entries(massRatioDE440)) {
  massFraction[k] = 1 / ratio;
}

// Earth mass via Moon orbital mechanics
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3)) /
  Math.pow(moonSiderealMonth * meanLengthOfDay, 2);
const SOLAR_SIDEREAL_DAY_RATIO = meanLengthOfDay / meanSiderealDay;
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1)) *
  SOLAR_SIDEREAL_DAY_RATIO;
massFraction.earth = (GM_EARTH / G_CONSTANT) / M_SUN;

const PSI = modelParams.foundational.psiNumerator / (2 * H);

const eccJ2000 = {
  mercury: planets.mercury.orbitalEccentricityJ2000,
  venus:   planets.venus.orbitalEccentricityJ2000,
  earth:   ASTRO_REFERENCE.earthEccentricityJ2000,
  mars:    planets.mars.orbitalEccentricityJ2000,
  jupiter: planets.jupiter.orbitalEccentricityJ2000,
  saturn:  planets.saturn.orbitalEccentricityJ2000,
  uranus:  planets.uranus.orbitalEccentricityJ2000,
  neptune: planets.neptune.orbitalEccentricityJ2000,
};

const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

// Derive invPlaneInclinationAmplitude and invPlaneInclinationMean for each planet
// Amplitude = PSI / (d × √m), Mean = inclJ2000 - amplitude × cos(Ω - φ)
for (const [key, p] of Object.entries(planets)) {
  if (p.fibonacciD && massFraction[key] && p.invPlaneInclinationJ2000 !== undefined) {
    p.invPlaneInclinationAmplitude = utils.computeInvPlaneInclinationAmplitude(PSI, p.fibonacciD, massFraction[key]);
    p.invPlaneInclinationMean = utils.computeInvPlaneInclinationMean(
      p.invPlaneInclinationJ2000, p.invPlaneInclinationAmplitude,
      p.ascendingNodeInvPlane, p.inclinationPhaseAngle);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// 10. PLANET DERIVED CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

function computePlanetDerived(key) {
  const p = planets[key];
  const solarYearCount = Math.round(totalDaysInH / p.solarYearInput);
  const orbitDistance = ((H / solarYearCount) ** 2) ** (1/3);
  const period = H / solarYearCount;

  let perihelionDistance, elipticOrbit, realOrbitalEccentricity;

  if (p.type === 'I') {
    realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
    perihelionDistance = orbitDistance * realOrbitalEccentricity * 100;
    elipticOrbit = perihelionDistance / 2;
  } else if (p.type === 'II') {
    realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
    elipticOrbit = (realOrbitalEccentricity * orbitDistance * 100) / 2 + (p.orbitalEccentricityBase - realOrbitalEccentricity) * orbitDistance * 100;
    perihelionDistance = (orbitDistance * p.orbitalEccentricityBase * 100) + elipticOrbit;
  } else { // Type III
    realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
    const dw = (ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 - p.longitudePerihelion) * Math.PI / 180;
    elipticOrbit = 2 * ASTRO_REFERENCE.earthEccentricityJ2000 * 100 * Math.sin(dw);
    perihelionDistance = realOrbitalEccentricity * orbitDistance * 100;
  }

  return {
    solarYearCount,
    orbitDistance,
    period,
    perihelionDistance,
    elipticOrbit,
    realOrbitalEccentricity,
    speed_kmh: (orbitDistance * currentAUDistance * Math.PI * 2) / (meanSolarYearDays * period) / 24,
  };
}

const derived = {};
for (const key of Object.keys(planets)) {
  derived[key] = computePlanetDerived(key);
}

function rebuildDerived(key) {
  derived[key] = computePlanetDerived(key);
}

function computeAdditionalDerived(key) {
  const b = additionalBodies[key];
  const solarYearCount = Math.round(totalDaysInH / b.solarYearInput);
  const orbitDistance = b.orbitDistanceOverride || ((H / solarYearCount) ** 2) ** (1/3);
  const period = H / solarYearCount;
  return { solarYearCount, orbitDistance, period };
}

const additionalDerived = {};
for (const key of Object.keys(additionalBodies)) {
  additionalDerived[key] = computeAdditionalDerived(key);
}


// ═══════════════════════════════════════════════════════════════════════════
// 11. BUILD DYNAMIC VALUES
// ═══════════════════════════════════════════════════════════════════════════

// Date utilities (jdToYear/yearToJD need model constants)
const { jdToYear, yearToJD } = utils.createDateUtils({ startmodelYear, startmodelJD, meanSolarYearDays });

// Fitted coefficients that depend on model parameters
const { SOLSTICE_OBLIQUITY_MEAN, PREDICT_PLANETS, PREDICT_COEFFS, PERI_HARMONICS } = fitted.buildFittedCoefficients({
  earthtiltMean, earthInvPlaneInclinationAmplitude, earthRAAngle,
  earthInvPlaneInclinationMean, planets, H,
});


// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS — All ~115 items, backward compatible
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Foundational model constants
  H,
  inputMeanSolarYear,
  perihelionalignmentYear,
  perihelionalignmentJD,
  startmodelJD,
  startmodelYear,
  correctionDays,
  correctionSun,
  temperatureGraphMostLikely,
  startAngleModel,
  useVariableSpeed,

  // Physical & astronomical constants
  currentAUDistance,
  meanSiderealYearSeconds,
  G_CONSTANT,
  MASS_RATIO_EARTH_MOON,
  massRatioDE440,

  // Earth parameters
  earthRAAngle,
  earthtiltMean,
  earthInvPlaneInclinationMean,
  earthInvPlaneInclinationAmplitude,
  earthAscendingNodeInvPlane,
  eccentricityBase,
  eccentricityAmplitude,
  eccentricityAmplitudeK,
  perihelionRefJD,

  // Moon inputs
  moonSiderealMonthInput,
  moonAnomalisticMonthInput,
  moonNodalMonthInput,
  moonDistance,
  moonEclipticInclinationJ2000,
  moonMeeusLpCorrection,
  MOON_CORRECTION,
  GRAVITATION_CORRECTION,
  ELONGATION_CORRECTION,
  moonOrbitalEccentricity,
  moonTilt,
  moonStartposApsidal,
  moonStartposNodal,
  moonStartposMoon,

  // Planet data
  planets,
  additionalBodies,

  // Derived model values
  perihelionCycleLength,
  meanSolarYearDays,
  meanEarthRotationsPerYear,
  startModelYearWithCorrection,
  balancedYear,
  balancedJD,
  stepYears,
  gridYear,
  gridYearDeltaFromJ2000,
  cardinalPointYearFractions,
  iauObliquityAtGrid,
  cardinalPointAnchorsAtGrid,
  yearsFromBalancedToJ2000,
  meanSiderealYearDays,
  meanLengthOfDay,
  meanSiderealDay,
  meanStellarDay,
  meanAnomalisticYearDays,
  eccentricityDerivedMean,
  totalDaysInH,
  j2000JD,
  julianCenturyDays,
  tropicalCenturyDays,
  tripleSynodicYears,
  eocEccentricity,
  perihelionPhaseOffset,
  TROPICAL_YEAR_HARMONICS: fitted.TROPICAL_YEAR_HARMONICS,
  SIDEREAL_YEAR_HARMONICS: fitted.SIDEREAL_YEAR_HARMONICS,
  ANOMALISTIC_YEAR_HARMONICS: fitted.ANOMALISTIC_YEAR_HARMONICS,

  // Moon derived
  moonSiderealMonth,
  moonAnomalisticMonth,
  moonNodalMonth,
  moonSynodicMonth,
  moonTropicalMonth,
  moonFullMoonCycleEarth,
  moonFullMoonCycleICRF,
  moonNodalPrecessionDaysEarth,
  moonNodalPrecessionDaysICRF,
  moonApsidalPrecessionDaysEarth,
  moonApsidalPrecessionDaysICRF,
  moonApsidalMeetsNodalDays,
  moonLunarLevelingCycleDays,
  moonDraconicYearICRF,
  moonDraconicYearEarth,

  // Astronomical reference data
  ASTRO_REFERENCE,

  // Mass, PSI, eccentricities
  GM_SUN,
  M_SUN,
  massFraction,
  PSI,
  eccJ2000,
  fibonacci,

  // Planet derived
  derived,
  additionalDerived,
  computePlanetDerived,
  rebuildDerived,

  // External reference values
  yearLengthRef,
  knownValues,

  // Predictive formula (from fitted-coefficients.js)
  PERI_HARMONICS,
  SOLSTICE_JD_HARMONICS: fitted.SOLSTICE_JD_HARMONICS,
  SOLSTICE_OBLIQUITY_MEAN,
  SOLSTICE_OBLIQUITY_HARMONICS: fitted.SOLSTICE_OBLIQUITY_HARMONICS,
  CARDINAL_POINT_HARMONICS: fitted.CARDINAL_POINT_HARMONICS,
  CARDINAL_POINT_ANCHORS: fitted.CARDINAL_POINT_ANCHORS_ADJUSTED || ASTRO_REFERENCE.cardinalPointAnchors,
  PERI_OFFSET: fitted.PERI_OFFSET,
  PREDICT_PLANETS,
  PREDICT_COEFFS,

  // Date utilities
  jdToCalendar: utils.jdToCalendar,
  calendarToJD: utils.calendarToJD,
  jdToYear,
  yearToJD,
  jdToDateString: utils.jdToDateString,

  // Formatting helpers
  pad: utils.pad,
  padLeft: utils.padLeft,
  fmt: utils.fmt,
  fmtInt: utils.fmtInt,
  printTable: utils.printTable,
};
