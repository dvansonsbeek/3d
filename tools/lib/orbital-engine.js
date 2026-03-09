// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL ENGINE — Time-dependent orbital element functions
// Extracted from src/script.js for use by optimization tools.
//
// All functions here compute orbital ELEMENTS (eccentricity, obliquity,
// inclination, year lengths, perihelion longitude, precession) as
// functions of time. They do NOT compute scene graph positions.
//
// Primary consumer: tools/tuning/validate-scene-graph.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');

// ═══════════════════════════════════════════════════════════════════════════
// EARTH ECCENTRICITY (script.js ~line 31422)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's orbital eccentricity for a given year.
 *
 * @param {number} currentYear - decimal year
 * @returns {number} eccentricity at that year
 */
function computeEccentricityEarth(currentYear) {
  const root = C.eccentricityDerivedMean;
  const degrees = ((currentYear - C.balancedYear) / C.perihelionCycleLength) * 360;
  const cosTheta = Math.cos(degrees * Math.PI / 180);
  const h1 = root - C.eccentricityBase;
  return root + (-C.eccentricityAmplitude - h1 * cosTheta) * cosTheta;
}

// ═══════════════════════════════════════════════════════════════════════════
// EARTH OBLIQUITY (script.js ~line 31457)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's obliquity (axial tilt) for a given year.
 * Two-cosine formula with H/3 and H/8 cycles.
 *
 * @param {number} currentYear - decimal year
 * @returns {number} obliquity in degrees
 */
function computeObliquityEarth(currentYear) {
  const t = currentYear - C.balancedYear;
  const phase3 = (t / (C.H / 3)) * 2 * Math.PI;
  const phase8 = (t / (C.H / 8)) * 2 * Math.PI;
  return C.earthtiltMean
    - C.earthInvPlaneInclinationAmplitude * Math.cos(phase3)
    + C.earthInvPlaneInclinationAmplitude * Math.cos(phase8);
}

// ═══════════════════════════════════════════════════════════════════════════
// EARTH INCLINATION (script.js ~line 31487)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's ecliptic inclination for a given year.
 * Single cosine with H/3 cycle.
 *
 * @param {number} currentYear - decimal year
 * @returns {number} inclination in degrees
 */
function computeInclinationEarth(currentYear) {
  const degrees = ((currentYear - C.balancedYear) / (C.H / 3)) * 360;
  const radians = degrees * Math.PI / 180;
  return C.earthInvPlaneInclinationMean
    + (-C.earthInvPlaneInclinationAmplitude * Math.cos(radians));
}

// ═══════════════════════════════════════════════════════════════════════════
// OBLIQUITY INTEGRALS (script.js ~line 29617)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute obliquity deviation components from mean.
 *
 * @param {number} currentYear - decimal year
 * @returns {object} { component3, component8, sin3, sin8 }
 */
function computeObliquityIntegrals(currentYear) {
  const t = currentYear - C.balancedYear;
  const phase3 = (t / (C.H / 3)) * 2 * Math.PI;
  const phase8 = (t / (C.H / 8)) * 2 * Math.PI;
  return {
    component3: -C.earthInvPlaneInclinationAmplitude * Math.cos(phase3),
    component8: C.earthInvPlaneInclinationAmplitude * Math.cos(phase8),
    sin3: Math.sin(phase3),
    sin8: Math.sin(phase8),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// YEAR-LENGTH FUNCTIONS (script.js ~lines 31328-31378)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the length of the solar (tropical) year based on obliquity.
 *
 * @param {number} obliquity - current obliquity in degrees
 * @returns {number} solar year in days
 */
function computeLengthOfSolarYear(obliquity) {
  return C.meanSolarYearDays
    - (C.meanSolarYearAmplitudeSecPerDay / C.meanLengthOfDay)
    * (obliquity - C.earthtiltMean);
}

/**
 * Compute the length of the sidereal year based on eccentricity.
 *
 * @param {number} eccentricity - current eccentricity
 * @returns {number} sidereal year in days
 */
function computeLengthOfSiderealYear(eccentricity) {
  return C.meanSiderealYearDays
    - (C.meanSiderealYearAmplitudeSecPerDay / C.meanLengthOfDay)
    * (eccentricity - C.eccentricityDerivedMean);
}

/**
 * Compute the length of the anomalistic year with Real LOD.
 *
 * @param {number} eccentricity - current eccentricity
 * @param {number} lengthOfDay - current length of day in seconds
 * @returns {number} anomalistic year in seconds
 */
function computeLengthOfAnomalisticYearRealLOD(eccentricity, lengthOfDay) {
  const rawAnomDays = C.meanAnomalisticYearDays
    - (C.meanAnomalisticYearAmplitudeSecPerDay / C.meanLengthOfDay)
    * (eccentricity - C.eccentricityDerivedMean);
  const rawSeconds = rawAnomDays * lengthOfDay;
  const meanSeconds = C.meanAnomalisticYearDays * C.meanLengthOfDay;
  const apsidalCorrection = ((rawSeconds - meanSeconds) / (13 / 3)) * (16 / 3);
  return rawSeconds - apsidalCorrection;
}

// ═══════════════════════════════════════════════════════════════════════════
// AXIAL PRECESSION (script.js ~lines 31387-31410)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute axial precession (in years per full cycle).
 *
 * @param {number} siderealYearSec - sidereal year in seconds
 * @param {number} solarYearDays - solar year in days
 * @returns {number} axial precession period in years
 */
function computeAxialPrecession(siderealYearSec, solarYearDays) {
  return siderealYearSec / (siderealYearSec - (solarYearDays * 86400));
}

/**
 * Compute axial precession with variable LOD.
 *
 * @param {number} siderealYearSec - sidereal year in seconds
 * @param {number} solarYearDays - solar year in days
 * @param {number} lengthOfDay - seconds per solar day
 * @returns {number} axial precession period in years
 */
function computeAxialPrecessionRealLOD(siderealYearSec, solarYearDays, lengthOfDay) {
  return siderealYearSec / (siderealYearSec - (solarYearDays * lengthOfDay));
}

// ═══════════════════════════════════════════════════════════════════════════
// PERIHELION PREDICTIVE FORMULAS (script.js ~lines 31513-31539)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's perihelion longitude using 12-harmonic predictive formula.
 *
 * @param {number} year - decimal year
 * @returns {number} longitude in degrees [0, 360)
 */
function calcEarthPerihelionPredictive(year) {
  const t = year - C.balancedYear;
  const meanRate = 360.0 / C.perihelionCycleLength;
  let longitude = 270.0 + meanRate * t;
  for (let i = 0; i < C.PERI_HARMONICS.length; i++) {
    const [period, sinC, cosC] = C.PERI_HARMONICS[i];
    const phase = 2 * Math.PI * t / period;
    longitude += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return ((longitude + C.PERI_OFFSET) % 360 + 360) % 360;
}

/**
 * Compute Earth Rate of Deviation (ERD) — derivative of harmonic perturbations.
 *
 * @param {number} year - decimal year
 * @returns {number} ERD value (degrees/year)
 */
function calcERD(year) {
  const t = year - C.balancedYear;
  let erd = 0;
  for (let i = 0; i < C.PERI_HARMONICS.length; i++) {
    const [period, sinC, cosC] = C.PERI_HARMONICS[i];
    const omega = 2 * Math.PI / period;
    const phase = omega * t;
    erd += sinC * omega * Math.cos(phase) - cosC * omega * Math.sin(phase);
  }
  return erd;
}

/**
 * Compute any planet's perihelion longitude (simple linear precession).
 *
 * @param {number} theta0 - perihelion longitude at J2000 (degrees)
 * @param {number} period - precession period in years
 * @param {number} year - decimal year
 * @returns {number} longitude in degrees [0, 360)
 */
function calcPlanetPerihelionLong(theta0, period, year) {
  return ((theta0 + 360.0 * (year - 2000) / period) % 360 + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANET INCLINATION DYNAMICS (script.js ~line 31836)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute dynamic invariable-plane inclination for a planet.
 * Uses ascending-node-based oscillation with mean-centered cosine.
 *
 * @param {string} planetName - e.g. 'mercury', 'mars'
 * @param {number} currentYear - decimal year
 * @param {number} [julianDay] - optional JD (if not provided, computed from year)
 * @returns {number} inclination in degrees
 */
function computePlanetInvPlaneInclinationDynamic(planetName, currentYear, julianDay) {
  const p = C.planets[planetName];
  if (!p) return 0;

  const i_J2000 = p.invPlaneInclinationJ2000;
  const i_mean = p.invPlaneInclinationMean;
  const amplitude = p.invPlaneInclinationAmplitude;
  const period = p.perihelionEclipticYears;
  const phaseOffset = p.inclinationPhaseAngle;

  if (i_J2000 === undefined || amplitude === undefined || period === undefined) {
    return i_J2000 || 0;
  }

  if (amplitude === 0) return i_J2000;

  // Compute years since balanced year from JD for precision
  const jd = julianDay || C.yearToJD(currentYear);
  const yearsSinceBalanced = (jd - C.balancedJD) / C.meanSolarYearDays;

  const precessionRate = 360 / period;

  // Back-calculate ascending node at balancedYear from J2000 value
  // (ascendingNode in planets[] is the ecliptic ascending node, not invariable plane)
  // For the orbital engine, we use the inclinationPhaseAngle approach
  const ascNodeJ2000 = p.ascendingNode; // approximate
  const ascNodeAtBalanced = ascNodeJ2000 - precessionRate * C.yearsFromBalancedToJ2000;
  const ascNodeCurrent = ascNodeAtBalanced + precessionRate * yearsSinceBalanced;

  const currentPhaseDeg = ascNodeCurrent - phaseOffset;
  const currentPhaseRad = currentPhaseDeg * Math.PI / 180;

  return i_mean + amplitude * Math.cos(currentPhaseRad);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE: Compute all orbital elements for a given year
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute all Earth orbital elements at a given year.
 * Convenience function that calls all individual computations.
 *
 * @param {number} year - decimal year
 * @returns {object} all orbital elements
 */
function computeEarthOrbitalElements(year) {
  const eccentricity = computeEccentricityEarth(year);
  const obliquity = computeObliquityEarth(year);
  const inclination = computeInclinationEarth(year);
  const solarYearDays = computeLengthOfSolarYear(obliquity);
  const siderealYearDays = computeLengthOfSiderealYear(eccentricity);
  const siderealYearSec = siderealYearDays * C.meanLengthOfDay;
  const precession = computeAxialPrecession(siderealYearSec, solarYearDays);
  const perihelionLong = calcEarthPerihelionPredictive(year);
  const erd = calcERD(year);

  return {
    year,
    eccentricity,
    obliquity,
    inclination,
    solarYearDays,
    siderealYearDays,
    siderealYearSec,
    precession,
    perihelionLong,
    erd,
  };
}

module.exports = {
  // Earth orbital elements
  computeEccentricityEarth,
  computeObliquityEarth,
  computeInclinationEarth,
  computeObliquityIntegrals,

  // Year lengths
  computeLengthOfSolarYear,
  computeLengthOfSiderealYear,
  computeLengthOfAnomalisticYearRealLOD,

  // Precession
  computeAxialPrecession,
  computeAxialPrecessionRealLOD,

  // Perihelion formulas
  calcEarthPerihelionPredictive,
  calcERD,
  calcPlanetPerihelionLong,

  // Planet inclination
  computePlanetInvPlaneInclinationDynamic,

  // Composite
  computeEarthOrbitalElements,
};
