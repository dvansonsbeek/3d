// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS MODULE — Single source of truth for all tool scripts.
//
// Structure:
//   constants.js          — Input constants + derived values (this file)
//   constants/astro-reference.js    — External reference data (IAU, JPL, Meeus)
//   constants/fitted-coefficients.js — Fitted harmonics and ML coefficients
//   constants/utils.js              — Date conversion and formatting helpers
//
// All consumers: const C = require('./lib/constants');
// ═══════════════════════════════════════════════════════════════════════════

// ─── Sub-modules ─────────────────────────────────────────────────────────
const { ASTRO_REFERENCE, yearLengthRef, knownValues } = require('./constants/astro-reference');
const fitted = require('./constants/fitted-coefficients');
const utils = require('./constants/utils');


// ═══════════════════════════════════════════════════════════════════════════
// 1. FOUNDATIONAL MODEL CONSTANTS
// These define the model itself. Changing any = different theory.
// ═══════════════════════════════════════════════════════════════════════════

const H = 335008; // holisticyearLength
const inputMeanSolarYear = 365.2421897;
const perihelionalignmentYear = 1246;
const startmodelJD = 2451716.5;
const startmodelYear = 2000.5;
const correctionDays = -0.23328398168087;
const correctionSun = 0.495997;
const temperatureGraphMostLikely = 14.5;
const startAngleModel = 89.91949879;
const useVariableSpeed = true; // Toggle equation of center (must match script.js)


// ═══════════════════════════════════════════════════════════════════════════
// 2. PHYSICAL & ASTRONOMICAL CONSTANTS
// External reference values from IAU, JPL DE440, etc.
// ═══════════════════════════════════════════════════════════════════════════

const currentAUDistance = 149597870.698828; // km
const meanSiderealYearSeconds = 31558149.8;
const G_CONSTANT = 6.6743e-20; // km³/(kg·s²)
const MASS_RATIO_EARTH_MOON = 81.3007;

// DE440 Sun/planet mass ratios (Sun mass / planet mass)
const massRatioDE440 = {
  mercury: 6023625.5, venus: 408523.72, mars: 3098703.59,
  jupiter: 1047.348625, saturn: 3497.9018, uranus: 22902.944, neptune: 19412.237,
};


// ═══════════════════════════════════════════════════════════════════════════
// 3. EARTH PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

const earthtiltMean = 23.41365930;           // scene-geometry solved: obliquity at J2000 = IAU 23.439291° exactly
const earthInvPlaneInclinationAmplitude = 0.63541988; // scene-geometry solved: obliquity rate = IAU -46.836769"/cy exactly
// Derived: 2A − A²/ε — two tilt layers (H/3 + H/5) minus second-order equatorial projection
const earthRAAngle = 2 * earthInvPlaneInclinationAmplitude - earthInvPlaneInclinationAmplitude * earthInvPlaneInclinationAmplitude / earthtiltMean;
// Derived: inclJ2000 − amplitude × cos(Ω_J2000 − phaseAngle) — refs from ASTRO_REFERENCE
const earthAscendingNodeInvPlane = ASTRO_REFERENCE.earthAscendingNodeInvPlane;  // 284.51° Souami & Souchay (2012)
const earthInvPlaneInclinationMean = ASTRO_REFERENCE.earthInclinationJ2000_deg
  - earthInvPlaneInclinationAmplitude * Math.cos((earthAscendingNodeInvPlane - ASTRO_REFERENCE.earthInclinationPhaseAngle) * Math.PI / 180);
const eccentricityBase = 0.01537159;
const eccentricityAmplitude = 0.00137074; // scene-geometry solved: gives earthEccentricityJ2000 = 0.01671022 exactly
// K = eccentricityAmplitude × √m_Earth × a_Earth^(3/2) / (sin(tiltMean) × √d_Earth)
const eccentricityAmplitudeK = 3.4505372893e-6;
const perihelionRefJD = ASTRO_REFERENCE.perihelionPassageJ2000_JD; // JD of Earth perihelion 2000 (Jan 3.542)


// ═══════════════════════════════════════════════════════════════════════════
// 4. MOON INPUT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const moonSiderealMonthInput = 27.32166156;
const moonAnomalisticMonthInput = 27.55454988;
const moonNodalMonthInput = 27.21222082;
const moonDistance = 384399.07; // km
const moonEclipticInclinationJ2000 = 5.1453964;
const moonOrbitalEccentricity = 0.054900489;
const moonTilt = 6.687;
const moonStartposApsidal = 347.622;
const moonStartposNodal = -83.630;
const moonStartposMoon = 131.930;


// ═══════════════════════════════════════════════════════════════════════════
// 5. PLANET INPUT DATA
// Per-planet constants for the 7 non-Earth planets.
// ═══════════════════════════════════════════════════════════════════════════

const planets = {
  mercury: {
    name: 'Mercury',
    solarYearInput: 87.9686,
    orbitalEccentricityBase: 0.20563593,
    orbitalEccentricityJ2000: 0.20563593,
    orbitalEccentricityAmplitude: 8.436789e-5,
    eccentricityPhaseJ2000: 89.9882,
    axialTiltMean: 0.03,
    eocFraction: -0.527,
    startpos: 83.5293,
    angleCorrection: 0.97090778,
    perihelionEclipticYears: H / (1 + 3/8),
    type: 'I',
    mirrorPair: 'uranus',
    fibonacciD: 21,
    eclipticInclinationJ2000: 7.00497902,
    longitudePerihelion: 77.4569131,
    ascendingNode: 48.33033155,
    invPlaneInclinationJ2000: 6.3472858,
    ascendingNodeInvPlane: 32.83,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 6.726620,
    invPlaneInclinationAmplitude: 0.384621,
    obliquityCycle: H * 8 / 3,
    orbitTilta: 5.23265097,
    orbitTiltb: 4.65715524,
  },
  venus: {
    name: 'Venus',
    solarYearInput: 224.695,
    orbitalEccentricityBase: 0.00619052,
    orbitalEccentricityJ2000: 0.00677672,
    orbitalEccentricityAmplitude: 9.625389e-4,
    eccentricityPhaseJ2000: 123.7514,
    axialTiltMean: 2.6392,
    eocFraction: 0.436,
    startpos: 249.3141,
    angleCorrection: -2.80286830,
    perihelionEclipticYears: H * 2,
    type: 'I',
    mirrorPair: 'neptune',
    fibonacciD: 34,
    eclipticInclinationJ2000: 3.39467605,
    longitudePerihelion: 131.5765919,
    ascendingNode: 76.67877109,
    invPlaneInclinationJ2000: 2.1545441,
    ascendingNodeInvPlane: 54.70,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 2.207361,
    invPlaneInclinationAmplitude: 0.061866,
    obliquityCycle: null,
    orbitTilta: 3.30333743,
    orbitTiltb: 0.78216832,
  },
  mars: {
    name: 'Mars',
    solarYearInput: 686.931,
    orbitalEccentricityBase: 0.09297543,
    orbitalEccentricityJ2000: 0.09339410,
    orbitalEccentricityAmplitude: 3.073636e-3,
    eccentricityPhaseJ2000: 96.8878,
    axialTiltMean: 25.19,
    eocFraction: -0.066224,
    startpos: 121.4679,
    angleCorrection: -2.10936153,
    perihelionEclipticYears: H / (4 + 1/3),
    type: 'II',
    mirrorPair: 'jupiter',
    fibonacciD: 5,
    eclipticInclinationJ2000: 1.84969142,
    longitudePerihelion: 336.0650681,
    ascendingNode: 49.55737662,
    invPlaneInclinationJ2000: 1.6311858,
    ascendingNodeInvPlane: 354.87,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 2.649893,
    invPlaneInclinationAmplitude: 1.158626,
    obliquityCycle: 3 * H / 8,
    orbitTilta: 1.40771866,
    orbitTiltb: 1.19986938,
  },
  jupiter: {
    name: 'Jupiter',
    solarYearInput: 4330.5,
    orbitalEccentricityBase: 0.04821478,
    orbitalEccentricityJ2000: 0.04838624,
    orbitalEccentricityAmplitude: 1.149908e-6,
    eccentricityPhaseJ2000: 180,
    axialTiltMean: 3.13,
    eocFraction: 0.495,
    startpos: 13.85,
    angleCorrection: 0.92703626,
    perihelionEclipticYears: H / 5,
    type: 'III',
    mirrorPair: 'mars',
    fibonacciD: 5,
    eclipticInclinationJ2000: 1.30439695,
    longitudePerihelion: 14.70659401,
    ascendingNode: 100.4877868,
    invPlaneInclinationJ2000: 0.3219652,
    ascendingNodeInvPlane: 312.89,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 0.329100,
    invPlaneInclinationAmplitude: 0.021301,
    obliquityCycle: H / 2,
    orbitTilta: 1.28260534,
    orbitTiltb: -0.23743407,
  },
  saturn: {
    name: 'Saturn',
    solarYearInput: 10747.0,
    orbitalEccentricityBase: 0.05374486,
    orbitalEccentricityJ2000: 0.05386179,
    orbitalEccentricityAmplitude: 5.403008e-6,
    eccentricityPhaseJ2000: 180,
    axialTiltMean: 26.73,
    eocFraction: 0.540,
    startpos: 11.3199,
    angleCorrection: -0.17477212,
    perihelionEclipticYears: -H / 8,
    type: 'III',
    mirrorPair: 'earth',
    fibonacciD: 3,
    eclipticInclinationJ2000: 2.48599187,
    longitudePerihelion: 92.12794343,
    ascendingNode: 113.6452856,
    invPlaneInclinationJ2000: 0.9254704,
    ascendingNodeInvPlane: 118.81,
    inclinationPhaseAngle: 23.3195,
    invPlaneInclinationMean: 0.931678,
    invPlaneInclinationAmplitude: 0.064879,
    obliquityCycle: H / 3,
    orbitTilta: 2.27728294,
    orbitTiltb: -0.99706468,
  },
  uranus: {
    name: 'Uranus',
    solarYearInput: 30586,
    orbitalEccentricityBase: 0.04734421,
    orbitalEccentricityJ2000: 0.04725744,
    orbitalEccentricityAmplitude: 2.831008e-5,
    eccentricityPhaseJ2000: 0,
    axialTiltMean: 82.23,
    eocFraction: 0.530,
    startpos: 44.8801,
    angleCorrection: -0.73459551,
    perihelionEclipticYears: H / 3,
    type: 'III',
    mirrorPair: 'mercury',
    fibonacciD: 21,
    eclipticInclinationJ2000: 0.77263783,
    longitudePerihelion: 170.7308251,
    ascendingNode: 74.00919023,
    invPlaneInclinationJ2000: 0.9946692,
    ascendingNodeInvPlane: 307.80,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 1.000600,
    invPlaneInclinationAmplitude: 0.023716,
    obliquityCycle: H / 2,
    orbitTilta: 0.74274130,
    orbitTiltb: 0.21284872,
  },
  neptune: {
    name: 'Neptune',
    solarYearInput: 59980,
    orbitalEccentricityBase: 0.00868571,
    orbitalEccentricityJ2000: 0.00859048,
    orbitalEccentricityAmplitude: 8.098033e-6,
    eccentricityPhaseJ2000: 0,
    axialTiltMean: 28.32,
    eocFraction: 0.585,
    startpos: 47.9551,
    angleCorrection: 2.33381876,
    perihelionEclipticYears: H * 2,
    type: 'III',
    mirrorPair: 'venus',
    fibonacciD: 34,
    eclipticInclinationJ2000: 1.77004347,
    longitudePerihelion: 45.80124471,
    ascendingNode: 131.7853754,
    invPlaneInclinationJ2000: 0.7354155,
    ascendingNodeInvPlane: 192.04,
    inclinationPhaseAngle: 203.3195,
    invPlaneInclinationMean: 0.722190,
    invPlaneInclinationAmplitude: 0.013486,
    obliquityCycle: null,
    orbitTilta: 1.31982602,
    orbitTiltb: -1.17945460,
  },
};

// Additional bodies (not in the 8-planet Fibonacci framework)
const additionalBodies = {
  pluto: { name: 'Pluto', solarYearInput: 90465, orbitalEccentricityBase: 0.2488273, type: 'I' },
  halleys: { name: "Halley's", solarYearInput: 27503, orbitalEccentricityBase: 0.96714291, type: 'III' },
  eros: { name: 'Eros', solarYearInput: 642.93, orbitalEccentricityBase: 0.2229512, type: 'II' },
  ceres: { name: 'Ceres', solarYearInput: 1680.5, orbitalEccentricityBase: 0.0755347, orbitDistanceOverride: 2.76596 },
};


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

// J2000.0 epoch and Julian century derived from model constants
const j2000JD = startmodelJD - (startmodelYear - 2000.0) * meanSolarYearDays;
const julianCenturyDays = 100 * meanSolarYearDays;

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

const PSI = 2205 / (2 * H);

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
  CARDINAL_POINT_ANCHORS: ASTRO_REFERENCE.cardinalPointAnchors,
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
