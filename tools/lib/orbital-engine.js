// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL ENGINE — Time-dependent orbital element functions
// Extracted from src/script.js for use by optimization tools and dashboard.
//
// All functions here compute orbital ELEMENTS (eccentricity, obliquity,
// inclination, year lengths, perihelion longitude, precession, day length)
// as functions of time. They do NOT compute scene graph positions.
//
// Organized by category:
//   OBLIQUITY → ECCENTRICITY → ASCENDING NODE → ARGUMENT OF PERIHELION →
//   LONGITUDE OF PERIHELION → INCLINATION → PRECESSION →
//   YEAR LENGTH → DAY LENGTH → COMPOSITE
//
// Primary consumers: tools/optimize.js, tools/export-dashboard-data.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');

// ═══════════════════════════════════════════════════════════════════════════
// PRECOMPUTED OBLIQUITY EXTREMA
// Obliquity is a sum of 16 harmonics (shortest period ~10,469 yr).
// Extrema occur only ~5 times per 25,000 years. Precompute once at module
// load so calculateDynamicAscendingNodeFromTilts() can look them up via
// binary search instead of scanning + binary searching each call.
// ═══════════════════════════════════════════════════════════════════════════

const _OBLIQUITY_EXTREMA_RANGE = [-50000, 50000]; // year range to precompute
let _obliquityExtrema = null; // lazily computed on first use

function _precomputeObliquityExtrema() {
  if (_obliquityExtrema) return _obliquityExtrema;
  const [rangeStart, rangeEnd] = _OBLIQUITY_EXTREMA_RANGE;
  const sampleStep = 500; // years — well below half the shortest period (~5235 yr)
  const extrema = [];

  let prevObl = computeObliquityEarth(rangeStart);
  let prevDir = 0;

  for (let y = rangeStart + sampleStep; y <= rangeEnd; y += sampleStep) {
    const obl = computeObliquityEarth(y);
    const curDir = obl > prevObl ? 1 : (obl < prevObl ? -1 : 0);

    if (prevDir !== 0 && curDir !== 0 && prevDir !== curDir) {
      // Binary search for exact extremum
      let lo = y - sampleStep, hi = y;
      for (let iter = 0; iter < 30; iter++) {
        const mid = (lo + hi) / 2;
        const oblLo = computeObliquityEarth(lo);
        const oblMid = computeObliquityEarth(mid);
        const oblHi = computeObliquityEarth(hi);
        if ((oblMid > oblLo && oblMid > oblHi) || (oblMid < oblLo && oblMid < oblHi)) {
          extrema.push(mid);
          break;
        } else if ((oblMid - oblLo) * prevDir > 0) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
    }
    if (curDir !== 0) prevDir = curDir;
    prevObl = obl;
  }

  _obliquityExtrema = extrema.sort((a, b) => a - b);
  return _obliquityExtrema;
}

/**
 * Get obliquity extrema within a year range via binary search on precomputed array.
 */
function _getObliquityExtremaInRange(yearMin, yearMax) {
  const all = _precomputeObliquityExtrema();
  // Binary search for first extremum >= yearMin
  let lo = 0, hi = all.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (all[mid] < yearMin) lo = mid + 1; else hi = mid;
  }
  const result = [];
  for (let i = lo; i < all.length && all[i] <= yearMax; i++) {
    result.push(all[i]);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// OBLIQUITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's obliquity (axial tilt) for a given year.
 * 16-harmonic fit with J2000 smart anchor (exact IAU obliquity at year 2000).
 * RMSE: 0.004 arcsec over full H.
 * For H/3 vs H/8 component decomposition, use computeObliquityIntegrals().
 *
 * @param {number} currentYear - decimal year
 * @returns {number} obliquity in degrees
 */
function computeObliquityEarth(currentYear) {
  const t = currentYear - C.balancedYear;
  let obliq = C.SOLSTICE_OBLIQUITY_MEAN;
  for (const [div, sinC, cosC] of C.SOLSTICE_OBLIQUITY_HARMONICS) {
    const phase = 2 * Math.PI * t / (C.H / div);
    obliq += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return obliq;
}

/**
 * Compute obliquity deviation components from mean.
 * Returns separate H/3 (inclination) and H/8 (axial) components.
 * Source: script.js computeObliquityIntegrals() ~line 31543
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

/**
 * Compute dynamic obliquity (axial tilt) for a non-Earth planet.
 * Anchored to J2000: at year 2000, returns the known axial tilt.
 * Venus and Neptune have no obliquity cycle (returns static value).
 * Source: script.js computePlanetObliquity() (newly added)
 * See docs/37-planets-precession-cycles.md § Obliquity Cycle Theory.
 *
 * @param {string} planetName - e.g. 'mercury', 'mars'
 * @param {number} currentYear - decimal year
 * @returns {number} obliquity in degrees
 */
function computePlanetObliquity(planetName, currentYear) {
  const p = C.planets[planetName];
  if (!p) return 0;

  const tiltJ2000 = p.axialTiltMean;

  // Venus, Neptune: no obliquity cycle — return static tilt
  if (!p.obliquityCycle) return tiltJ2000;

  // Two-component obliquity (same structure as Earth's -cos(H/3) + cos(H/8)):
  //   1. Inclination component at ICRF perihelion period (NEGATIVE sign)
  //   2. Obliquity precession component at obliquityCycle period (POSITIVE sign)
  // Both with same amplitude, anchored to axialTiltMean at J2000
  const amp = p.invPlaneInclinationAmplitude;
  const t = currentYear - C.balancedYear;
  const t2000 = 2000 - C.balancedYear;

  // Inclination component (ICRF perihelion period, NEGATIVE — like Earth's -cos(H/3))
  const genPrecRate = 1 / (C.H / 13);
  const icrfPeriod = 1 / (1 / p.perihelionEclipticYears - genPrecRate);
  const phaseIncl = 2 * Math.PI / icrfPeriod;
  const inclComponent = -amp * (Math.cos(phaseIncl * t) - Math.cos(phaseIncl * t2000));

  // Obliquity precession component (obliquityCycle, POSITIVE — like Earth's +cos(H/8))
  const phaseObliq = 2 * Math.PI / p.obliquityCycle;
  const obliqComponent = amp * (Math.cos(phaseObliq * t) - Math.cos(phaseObliq * t2000));

  return tiltJ2000 + inclComponent + obliqComponent;
}

/**
 * Compute planet inclination tilt relative (deviation from mean).
 * For Earth: H/3 component. For planets: inclination(t) - inclinationMean.
 *
 * @param {string} planetName - planet key or 'earth'
 * @param {number} currentYear - decimal year
 * @returns {number} relative deviation in degrees
 */
function computeInclinationTiltRelative(planetName, currentYear) {
  if (planetName === 'earth') {
    return computeObliquityIntegrals(currentYear).component3;
  }
  const p = C.planets[planetName];
  if (!p) return 0;
  const incl = computePlanetInvPlaneInclinationDynamic(planetName, currentYear);
  return incl - p.invPlaneInclinationMean;
}

/**
 * Compute axial tilt absolute for any planet.
 * For Earth: earthtiltMean + H/8 component.
 * For planets: obliquity - inclination deviation = the axial component.
 *
 * @param {string} planetName - planet key or 'earth'
 * @param {number} currentYear - decimal year
 * @returns {number} axial tilt in degrees
 */
function computeAxialTiltAbsolute(planetName, currentYear) {
  if (planetName === 'earth') {
    return C.earthtiltMean + computeObliquityIntegrals(currentYear).component8;
  }
  const p = C.planets[planetName];
  if (!p) return 0;
  // For planets: axial component = obliquity - inclination deviation
  // At J2000: axialTiltMean - 0 = axialTiltMean ✓
  const inclRel = computeInclinationTiltRelative(planetName, currentYear);
  const obliq = computePlanetObliquity(planetName, currentYear);
  return obliq - inclRel;
}

/**
 * Compute axial tilt relative (deviation from mean) for any planet.
 * For Earth: H/8 component. For planets: axialTilt(t) - axialTiltMean.
 *
 * @param {string} planetName - planet key or 'earth'
 * @param {number} currentYear - decimal year
 * @returns {number} relative deviation in degrees
 */
function computeAxialTiltRelative(planetName, currentYear) {
  if (planetName === 'earth') {
    return computeObliquityIntegrals(currentYear).component8;
  }
  const p = C.planets[planetName];
  if (!p) return 0;
  return computeAxialTiltAbsolute(planetName, currentYear) - p.axialTiltMean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ECCENTRICITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's orbital eccentricity for a given year.
 * Source: script.js computeEccentricityEarth() ~line 33358
 *
 * @param {number} currentYear - decimal year
 * @returns {number} eccentricity at that year
 */
function computeEccentricityEarth(currentYear) {
  return computeEccentricity(currentYear, C.balancedYear, C.perihelionCycleLength, C.eccentricityBase, C.eccentricityAmplitude);
}

/**
 * Generalized eccentricity formula for any planet.
 * e(t) = e₀ + (−A − (e₀ − e_base)·cos θ)·cos θ  where e₀ = √(e_base² + A²)
 * Source: script.js computeEccentricityEarth() ~line 33358
 */
function computeEccentricity(currentYear, balancedYear, cycleLength, base, amplitude) {
  // Law of cosines: distance between two circular orbits
  const θ = ((currentYear - balancedYear) / cycleLength) * 2 * Math.PI;
  return Math.sqrt(base * base + amplitude * amplitude - 2 * base * amplitude * Math.cos(θ));
}

/**
 * Compute perihelion and aphelion distances from eccentricity.
 * Perihelion = a × (1 - e), Aphelion = a × (1 + e)
 * where a = semi-major axis (AU).
 *
 * For Earth: a = 1.0 AU.
 * For planets: a = orbitDistance (Kepler 3rd law derived).
 *
 * @param {number} eccentricity - current eccentricity
 * @param {number} semiMajorAxis - semi-major axis in AU (default 1.0 for Earth)
 * @returns {object} { perihelion, aphelion } in AU
 */
/**
 * Compute semi-major axis from Kepler's 3rd law: a = (T²)^(1/3)
 * where T = H / orbitCount, orbitCount = round(H × meanSolarYear / solarYearInput).
 * Source: script.js ~line 1904 (e.g. mercuryOrbitDistance)
 *
 * @param {string} planetName - planet key or 'earth'
 * @returns {number} semi-major axis in AU
 */
function computeSemiMajorAxis(planetName) {
  if (planetName === 'earth') return 1.0;
  const p = C.planets[planetName];
  if (!p || !p.solarYearInput) return 0;
  const orbitCount = Math.round(C.H * C.meanSolarYearDays / p.solarYearInput);
  const T = C.H / orbitCount;
  return Math.pow(T * T, 1 / 3);
}

function computePerihelionAphelionDistance(eccentricity, semiMajorAxis = 1.0) {
  return {
    perihelion: semiMajorAxis * (1 - eccentricity),
    aphelion: semiMajorAxis * (1 + eccentricity),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE — Rate-based integration
// Source: script.js calculateDynamicAscendingNodeFromTilts() ~line 31709
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find ALL years when Earth's inclination equals a target value within a range.
 * Source: script.js findAllInclinationCrossings() ~line 31653
 *
 * @param {number} targetInclination - Target inclination in degrees
 * @param {number} startYear - Start of search range
 * @param {number} endYear - End of search range
 * @returns {number[]} Array of years where crossings occur
 */
function findAllInclinationCrossings(targetInclination, startYear, endYear) {
  const minIncl = C.earthInvPlaneInclinationMean - C.earthInvPlaneInclinationAmplitude;
  const maxIncl = C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude;

  if (targetInclination < minIncl || targetInclination > maxIncl) {
    return [];
  }

  // Analytical solution: Earth inclination is a simple cosine
  //   I(t) = mean - amp * cos(2π * (t - balancedYear) / (H/3))
  //   target = mean - amp * cos(θ)  →  cos(θ) = (mean - target) / amp
  const cosTheta = (C.earthInvPlaneInclinationMean - targetInclination) / C.earthInvPlaneInclinationAmplitude;
  if (Math.abs(cosTheta) > 1) return [];

  const period = C.H / 3;
  const baseTheta = Math.acos(cosTheta); // 0..π
  const crossings = [];
  const yMin = Math.min(startYear, endYear);
  const yMax = Math.max(startYear, endYear);

  // Two crossings per cycle at θ = ±baseTheta + 2πn
  // θ = 2π * (year - balancedYear) / period  →  year = balancedYear + θ * period / (2π)
  const thetaToYear = (theta) => C.balancedYear + theta * period / (2 * Math.PI);

  // Find the range of n values we need
  const nMin = Math.floor((yMin - C.balancedYear) / period - 1);
  const nMax = Math.ceil((yMax - C.balancedYear) / period + 1);

  for (let n = nMin; n <= nMax; n++) {
    const y1 = thetaToYear(baseTheta + 2 * Math.PI * n);
    const y2 = thetaToYear(-baseTheta + 2 * Math.PI * n);
    if (y1 >= yMin && y1 <= yMax) crossings.push(y1);
    if (y2 >= yMin && y2 <= yMax && Math.abs(y2 - y1) > 0.1) crossings.push(y2);
  }

  return crossings.sort((a, b) => a - b);
}

/**
 * Calculate dynamic ascending node using rate-based integration.
 * Properly handles obliquity direction changes and inclination crossovers.
 * Source: script.js calculateDynamicAscendingNodeFromTilts() ~line 31709
 *
 * @param {number} orbitTilta - Encodes sin(Ω)*i in degrees
 * @param {number} orbitTiltb - Encodes cos(Ω)*i in degrees
 * @param {number} currentYear - Current year
 * @returns {number} Dynamic ascending node longitude (0-360°)
 */
function calculateDynamicAscendingNodeFromTilts(orbitTilta, orbitTiltb, currentYear, planetName) {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Extract static ascending node and inclination from tilts
  const staticOmegaDeg = Math.atan2(orbitTilta, orbitTiltb) * RAD2DEG;
  const staticOmega = ((staticOmegaDeg % 360) + 360) % 360;
  const planetInclination = Math.sqrt(orbitTilta * orbitTilta + orbitTiltb * orbitTiltb);

  if (planetInclination < 1e-6) return staticOmega;

  const i = planetInclination * DEG2RAD;
  const OmegaRad = staticOmega * DEG2RAD;
  const tanI = Math.tan(i);
  if (Math.abs(tanI) < 1e-10) return staticOmega;

  // Base perturbation rate: dΩ/dε = -sin(Ω) / tan(i)
  const sinOmega = Math.sin(OmegaRad);
  const baseDOmegaDeps = -sinOmega / tanI;

  const EPOCH_YEAR = 2000;

  // Helper: integrate effect between two years with segment handling
  const integrateEffect = (fromYear, toYear) => {
    if (Math.abs(toYear - fromYear) < 0.1) return 0;

    const yearMin = Math.min(fromYear, toYear);
    const yearMax = Math.max(fromYear, toYear);
    const dir = toYear >= fromYear ? 1 : -1;

    let criticalYears = [yearMin, yearMax];

    // Look up precomputed obliquity extrema (O(log n) binary search)
    criticalYears.push(..._getObliquityExtremaInRange(yearMin, yearMax));

    // Find ALL inclination crossings
    const minEarthIncl = C.earthInvPlaneInclinationMean - C.earthInvPlaneInclinationAmplitude;
    const maxEarthIncl = C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude;

    // When planetName is provided, the ecliptic inclination is dynamic and could enter
    // Earth's range even if the J2000 value is outside — always search for crossovers
    if (planetName || (planetInclination >= minEarthIncl && planetInclination <= maxEarthIncl)) {
      const crossIncl = planetName
        ? computeEclipticInclination(planetName, (yearMin + yearMax) / 2)
        : planetInclination;
      const allCrossings = findAllInclinationCrossings(crossIncl, yearMin, yearMax);
      criticalYears.push(...allCrossings);
    }

    // Sort and deduplicate
    criticalYears = [...new Set(criticalYears)].sort((a, b) => a - b);

    // Integrate over segments
    let effect = 0;
    for (let idx = 0; idx < criticalYears.length - 1; idx++) {
      const segStart = criticalYears[idx];
      const segEnd = criticalYears[idx + 1];

      const oblStart = computeObliquityEarth(segStart);
      const oblEnd = computeObliquityEarth(segEnd);
      const deltaObl = (oblEnd - oblStart) * DEG2RAD;

      const midYear = (segStart + segEnd) / 2;
      const earthInclAtMid = computeInclinationEarth(midYear);

      // Use dynamic ecliptic inclination when planetName is provided
      const dynIncl = planetName
        ? computeEclipticInclination(planetName, midYear)
        : planetInclination;
      const inclDirection = earthInclAtMid > dynIncl ? 1 : -1;
      const dynTanI = Math.tan(dynIncl * DEG2RAD);
      if (Math.abs(dynTanI) < 1e-10) continue; // skip near-zero inclination
      const segRate = -sinOmega / dynTanI;

      effect += segRate * inclDirection * deltaObl * RAD2DEG;
    }

    return effect * dir;
  };

  // Calculate net effect from epoch (2000) to current year
  const effectFromEpoch = integrateEffect(EPOCH_YEAR, currentYear);

  let newOmega = staticOmega + effectFromEpoch;
  return ((newOmega % 360) + 360) % 360;
}

/**
 * Compute ascending node on the invariable plane (linear precession).
 * The ascending node precesses at the same rate as the perihelion ecliptic period.
 *
 * @param {string} planetName - planet key
 * @param {number} year - decimal year
 * @returns {number} ascending node longitude on invariable plane (0-360°)
 */
function computeAscendingNodeInvPlane(planetName, year) {
  const p = C.planets[planetName];
  if (!p || !p.ascendingNodeInvPlane) return 0;
  const period = p.ascendingNodePeriod || p.perihelionEclipticYears;
  const rate = 360 / period;
  return ((p.ascendingNodeInvPlane + rate * (year - 2000)) % 360 + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARGUMENT OF PERIHELION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute argument of perihelion (ecliptic): ω = ϖ - Ω
 * Source: script.js ~line 31914 (derived, not a standalone function)
 *
 * @param {number} lonPerihelion - Longitude of perihelion (degrees)
 * @param {number} ascendingNode - Ascending node longitude (degrees)
 * @returns {number} Argument of perihelion (0-360°)
 */
function computeArgumentOfPerihelion(lonPerihelion, ascendingNode) {
  return ((lonPerihelion - ascendingNode) % 360 + 360) % 360;
}

/**
 * Compute argument of perihelion on the invariable plane.
 * ω_inv = ϖ - Ω_inv
 *
 * @param {number} lonPerihelion - Longitude of perihelion (degrees)
 * @param {number} ascNodeInvPlane - Ascending node on invariable plane (degrees)
 * @returns {number} Argument of perihelion on inv. plane (0-360°)
 */
function computeArgumentOfPerihelionInvPlane(lonPerihelion, ascNodeInvPlane) {
  return ((lonPerihelion - ascNodeInvPlane) % 360 + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// LONGITUDE OF PERIHELION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's perihelion longitude using 21-harmonic predictive formula.
 * Source: script.js calcEarthPerihelionPredictive() ~line 33449
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
 * Source: script.js calcERD() ~line 33461
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
 * Source: script.js calcPlanetPerihelionLong() ~line 33473
 *
 * @param {number} theta0 - perihelion longitude at J2000 (degrees)
 * @param {number} period - precession period in years
 * @param {number} year - decimal year
 * @returns {number} longitude in degrees [0, 360)
 */
function calcPlanetPerihelionLong(theta0, period, year) {
  return ((theta0 + 360.0 * (year - 2000) / period) % 360 + 360) % 360;
}

/**
 * Compute ICRF perihelion longitude for a planet.
 * ICRF = ecliptic minus general precession (H/13).
 * For Earth: uses H/3 period directly.
 * For planets: icrfPeriod = 1 / (1/perihelionEclipticYears - 1/(H/13))
 *
 * @param {string} planetName - planet key
 * @param {number} year - decimal year
 * @returns {number} ICRF longitude in degrees [0, 360)
 */
function calcPerihelionLongICRF(planetName, year) {
  const genPrecRate = 1 / (C.H / 13);
  if (planetName === 'earth') {
    const eclipticLong = calcEarthPerihelionPredictive(year);
    const generalPrecession = 360 * (year - 2000) * genPrecRate;
    return ((eclipticLong - generalPrecession) % 360 + 360) % 360;
  }
  const p = C.planets[planetName];
  if (!p) return 0;
  const icrfPeriod = 1 / (1 / p.perihelionEclipticYears - genPrecRate);
  const icrfRate = 360 / icrfPeriod;
  return ((p.longitudePerihelion + icrfRate * (year - 2000)) % 360 + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// INCLINATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's ecliptic inclination for a given year.
 * Single cosine with H/3 cycle.
 * Source: script.js computeInclinationEarth() ~line 33423
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

/**
 * Compute dynamic invariable-plane inclination for a planet.
 * Uses ICRF perihelion-based oscillation with mean-centered cosine.
 * Source: script.js computePlanetInvPlaneInclinationDynamic()
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
  const phaseOffset = p.inclinationPhaseAngle;

  if (i_J2000 === undefined || amplitude === undefined) {
    return i_J2000 || 0;
  }

  if (amplitude === 0) return i_J2000;

  // ICRF perihelion period: Earth = H/3 directly, others = 1/(1/eclP - 1/(H/13))
  const genPrecRate = 1 / (C.H / 13);
  const icrfPeriod = (planetName === 'earth')
    ? C.H / 3
    : 1 / (1 / p.perihelionEclipticYears - genPrecRate);
  const icrfRate = 360 / icrfPeriod;

  const jd = julianDay || C.yearToJD(currentYear);
  const yearsSinceBalanced = (jd - C.balancedJD) / C.meanSolarYearDays;

  const periLongJ2000 = p.longitudePerihelion;
  const periAtBalanced = periLongJ2000 - icrfRate * C.yearsFromBalancedToJ2000;
  const periCurrent = periAtBalanced + icrfRate * yearsSinceBalanced;

  const currentPhaseDeg = periCurrent - phaseOffset;
  const currentPhaseRad = currentPhaseDeg * Math.PI / 180;

  const antiPhaseSign = p.antiPhase ? -1 : 1;
  return i_mean + antiPhaseSign * amplitude * Math.cos(currentPhaseRad);
}

/**
 * Compute a planet's inclination to the ecliptic (Earth's orbital plane).
 * Derived from spherical geometry: the angle between two planes (planet and Earth)
 * both tilted relative to the invariable plane.
 *
 * Formula: cos(i_ecl) = cos(i_p)·cos(i_e) + sin(i_p)·sin(i_e)·cos(Ω_p - Ω_e)
 * where i = inv. plane inclination, Ω = ascending node on inv. plane.
 *
 * Validated at J2000: matches JPL ecliptic inclinations within 2 arcmin for all planets.
 *
 * @param {string} planetName - e.g. 'mercury', 'mars'
 * @param {number} currentYear - calendar year
 * @returns {number} ecliptic inclination in degrees
 */
function computeEclipticInclination(planetName, currentYear) {
  const DEG = Math.PI / 180;

  // Planet inclination and ascending node on invariable plane
  const i_p = computePlanetInvPlaneInclinationDynamic(planetName, currentYear) * DEG;
  const omega_p = computeAscendingNodeInvPlane(planetName, currentYear) * DEG;

  // Earth inclination and ascending node on invariable plane
  // Earth's node precesses at H/3 (inclination cycle)
  const i_e = computeInclinationEarth(currentYear) * DEG;
  const omega_e = (C.earthAscendingNodeInvPlane + 360 * (currentYear - 2000) / (C.H / 3)) * DEG;

  const cosIncl = Math.cos(i_p) * Math.cos(i_e) + Math.sin(i_p) * Math.sin(i_e) * Math.cos(omega_p - omega_e);
  return Math.acos(Math.max(-1, Math.min(1, cosIncl))) / DEG;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRECESSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute axial precession (in years per full cycle).
 * Source: script.js computeAxialPrecession() ~line 33323
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
 * Source: script.js computeAxialPrecessionRealLOD() ~line 33339
 *
 * @param {number} siderealYearSec - sidereal year in seconds
 * @param {number} solarYearDays - solar year in days
 * @param {number} lengthOfDay - seconds per solar day
 * @returns {number} axial precession period in years
 */
function computeAxialPrecessionRealLOD(siderealYearSec, solarYearDays, lengthOfDay) {
  return siderealYearSec / (siderealYearSec - (solarYearDays * lengthOfDay));
}

/**
 * Compute perihelion precession period (in years).
 * Derived from anomalistic and solar year: P_peri = T_anom / (T_anom - T_solar)
 * Source: script.js ~line 33237 (o.perihelionPrecessionRealLOD)
 *
 * @param {number} anomalisticYearSec - anomalistic year in seconds
 * @param {number} solarYearSec - solar year in seconds
 * @returns {number} perihelion precession period in years
 */
function computePerihelionPrecession(anomalisticYearSec, solarYearSec) {
  return anomalisticYearSec / (anomalisticYearSec - solarYearSec);
}

/**
 * Compute inclination precession period (in years).
 * For Earth: H/3 = 111,772 yr. For planets: perihelionEclipticYears.
 * Source: constants — this is a fixed period per planet.
 *
 * @param {string} planetName - planet key or 'earth'
 * @returns {number} inclination precession period in years
 */
function computeInclinationPrecessionPeriod(planetName) {
  if (planetName === 'earth') return C.H / 3;
  const p = C.planets[planetName];
  return p ? Math.abs(p.perihelionEclipticYears) : 0;
}

/**
 * Compute obliquity precession period (in years).
 * Uses Fibonacci ratio: P_obl = P_axial × 13/8
 * Source: script.js ~line 33230 (obliquityPrecessionRealLOD = axial * 13/8)
 *
 * @param {number} axialPrecession - axial precession period in years
 * @returns {number} obliquity precession period in years
 */
function computeObliquityPrecession(axialPrecession) {
  return axialPrecession * 13 / 8;
}

/**
 * Compute ecliptic precession period (in years).
 * Uses Fibonacci ratio: P_ecl = P_axial × 13/5
 * Source: script.js ~line 33231 (eclipticPrecessionRealLOD = axial * 13/5)
 *
 * @param {number} axialPrecession - axial precession period in years
 * @returns {number} ecliptic precession period in years
 */
function computeEclipticPrecession(axialPrecession) {
  return axialPrecession * 13 / 5;
}

// ═══════════════════════════════════════════════════════════════════════════
// YEAR LENGTH (Earth only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a Fourier harmonic series for year-length prediction.
 * Source: script.js evalYearFourier() ~line 33264
 *
 * @param {number} year - calendar year
 * @param {number} mean - mean year length (days)
 * @param {Array} harmonics - array of [period_divisor, sin_coeff, cos_coeff]
 * @returns {number} year length in days
 */
function evalYearFourier(year, mean, harmonics) {
  const t = year - C.balancedYear;
  let result = mean;
  for (const [div, sinC, cosC] of harmonics) {
    const phase = 2 * Math.PI * t / (C.H / div);
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}

/** Compute simplified tropical year length in days (Fourier harmonics around mean). */
function computeLengthOfSimplifiedSolarYear(year) {
  return evalYearFourier(year, C.meanSolarYearDays, C.TROPICAL_YEAR_HARMONICS);
}

/** Compute tropical year length in days as mean of 4 cardinal point year lengths.
 *  This is the physically correct definition: the mean return time to solstices/equinoxes. */
function computeLengthOfSolarYear(year) {
  return (computeSolsticeYearLength(year, 'SS') +
          computeSolsticeYearLength(year, 'WS') +
          computeSolsticeYearLength(year, 'VE') +
          computeSolsticeYearLength(year, 'AE')) / 4;
}

/** Compute sidereal year length in days. */
function computeLengthOfSiderealYear(year) {
  return evalYearFourier(year, C.meanSiderealYearDays, C.SIDEREAL_YEAR_HARMONICS);
}

/** Compute anomalistic year length with variable LOD, in seconds. */
function computeLengthOfAnomalisticYearRealLOD(year, lengthOfDay) {
  const anomDays = evalYearFourier(year, C.meanAnomalisticYearDays, C.ANOMALISTIC_YEAR_HARMONICS);
  return anomDays * lengthOfDay;
}

/** Compute anomalistic year length in days. */
function computeLengthOfAnomalisticYearDays(year) {
  return evalYearFourier(year, C.meanAnomalisticYearDays, C.ANOMALISTIC_YEAR_HARMONICS);
}

/**
 * Compute solar year length in seconds.
 * @param {number} solarYearDays - solar year in days
 * @param {number} lengthOfDay - seconds per solar day
 * @returns {number} solar year in seconds
 */
function computeLengthOfSolarYearSec(solarYearDays, lengthOfDay) {
  return solarYearDays * lengthOfDay;
}

/**
 * Compute sidereal year length in seconds.
 * This is a constant (the orbital period doesn't change).
 * @returns {number} sidereal year in seconds
 */
function computeLengthOfSiderealYearSec() {
  return C.meanSiderealYearSeconds;
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY LENGTH (Earth only)
// Source: script.js ~lines 33200-33224
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute length of day (seconds per solar day).
 * LOD = sidereal year (seconds) / sidereal year (days)
 * Source: script.js ~line 33200
 *
 * @param {number} siderealYearDays - sidereal year in days
 * @returns {number} length of day in seconds
 */
function computeLengthOfDay(siderealYearDays) {
  return C.meanSiderealYearSeconds / siderealYearDays;
}

/**
 * Compute sidereal day length in seconds.
 * siderealDay = solarYearSec / (solarYearDays + 1)
 * Source: script.js ~line 33208
 *
 * @param {number} solarYearSec - solar year in seconds (solarYearDays × LOD)
 * @param {number} solarYearDays - solar year in days
 * @returns {number} sidereal day in seconds
 */
function computeSiderealDay(solarYearSec, solarYearDays) {
  return solarYearSec / (solarYearDays + 1);
}

/**
 * Compute stellar day length in seconds.
 * Adds perihelion precession term to sidereal day.
 * Source: script.js ~line 33209
 *
 * @param {number} siderealYearSec - sidereal year in seconds
 * @param {number} solarYearSec - solar year in seconds
 * @param {number} solarYearDays - solar year in days
 * @param {number} siderealDay - sidereal day in seconds
 * @returns {number} stellar day in seconds
 */
function computeStellarDay(siderealYearSec, solarYearSec, solarYearDays, siderealDay) {
  return (((siderealYearSec - solarYearSec) / (1 / C.eccentricityAmplitude / 13 * 16)) / (solarYearDays + 1)) + siderealDay;
}

/**
 * Compute RA Day Offset in milliseconds.
 * Two-harmonic cosine: −14.194 − 5.640·cos(H/16) − 1.684·cos(H/8)
 * Confirmed by 65-epoch multiepoch test (R²=0.994, RMS=0.324 ms).
 * Source: script.js ~line 33218
 *
 * @param {number} year - calendar year
 * @returns {number} RA day offset in milliseconds
 */
function computeRADayOffset(year) {
  const t = year - C.balancedYear;
  return -14.194
    - 5.640 * Math.cos(2 * Math.PI * t / (C.H / 16))
    - 1.684 * Math.cos(2 * Math.PI * t / (C.H / 8));
}

/**
 * Compute measured solar day in seconds.
 * measuredSolarDay = LOD + raDayOffset (converted from ms to s)
 * Source: script.js ~line 33224
 *
 * @param {number} lengthOfDay - length of day in seconds
 * @param {number} raDayOffsetMs - RA day offset in milliseconds
 * @returns {number} measured solar day in seconds
 */
function computeMeasuredSolarDay(lengthOfDay, raDayOffsetMs) {
  return lengthOfDay + raDayOffsetMs / 1000;
}

/**
 * Compute stellar day minus sidereal day offset in seconds.
 * This offset arises from perihelion precession.
 *
 * @param {number} stellarDay - stellar day in seconds
 * @param {number} siderealDay - sidereal day in seconds
 * @returns {number} offset in seconds (stellar - sidereal)
 */
function computeStellarSiderealOffset(stellarDay, siderealDay) {
  return stellarDay - siderealDay;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLSTICE PREDICTION (Earth only)
// Fully derived from model parameters — zero fitted constants.
// See docs/14-solstice-prediction.md
// ═══════════════════════════════════════════════════════════════════════════

// Solstice RA: derived from earthRAAngle, inclination amplitude, and obliquity.
// All three project through the same 1/sin(ε) ecliptic-to-equatorial factor.
// The earthRAAngle sets the mean offset; the inclination amplitude sets the oscillation.
// Validated: RMSE = 0.089° (0.36 min RA) against 15,953 simulation data points.

// Cardinal Point JD: linear trend + 24 self-corrected harmonics (Fibonacci + combinations).
// Fitted from 15,953 observations (21-year steps) per cardinal point.
// Anchored at IAU J2000 values. Self-correcting: exact at year 2000.
// See docs/14-solstice-prediction.md

// Pre-compute harmonic contributions at J2000 for each cardinal point
const _CP_T2000 = 2000 - C.balancedYear;
const _CP_HARMONICS_AT_J2000 = {};
for (const type of ['SS', 'WS', 'VE', 'AE']) {
  let h2000 = 0;
  for (const [div, sinC, cosC] of C.CARDINAL_POINT_HARMONICS[type]) {
    const phase = 2 * Math.PI * _CP_T2000 / (C.H / div);
    h2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  _CP_HARMONICS_AT_J2000[type] = h2000;
}

/**
 * Compute the RA (in degrees) where a cardinal point occurs.
 * Fully derived — zero fitted constants.
 *
 * Formula: RA(t) = (baseRA − earthRAAngle/sin(ε)) + (A/sin(ε)) × [−sin(H/3) + sin(H/8)]
 *   where baseRA = 90° (SS), 270° (WS), 0° (VE), 180° (AE)
 *
 * RMSE: 0.089° (0.36 min RA) against 15,953 simulation data points.
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} RA in degrees
 */
function computeSolsticeRA(year, type) {
  const t = year - C.balancedYear;
  const sinE = Math.sin(C.earthtiltMean * Math.PI / 180);
  const baseRA = { SS: 90, WS: 270, VE: 0, AE: 180 }[type || 'SS'];
  const raMean = baseRA - C.earthRAAngle / sinE;
  const amp = C.earthInvPlaneInclinationAmplitude / sinE;
  const phase3 = 2 * Math.PI * t / (C.H / 3);
  const phase8 = 2 * Math.PI * t / (C.H / 8);
  return raMean + amp * (-Math.sin(phase3) + Math.sin(phase8));
}

/**
 * Compute the Julian Day when a cardinal point occurs.
 * Anchored at observed J2000 value for each cardinal point.
 *
 * Formula: JD = anchor + meanSolarYear × (year − 2000)
 *             + Σ harmonics(year − balanced) − Σ harmonics(2000 − balanced)
 *
 * 24 harmonics: 5 Fibonacci fundamentals + 19 combination/overtones.
 * RMSE: SS 0.10min, WS 0.06min, VE 0.05min, AE 0.05min over full H.
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} Julian Day of the cardinal point
 */
function computeSolsticeJD(year, type) {
  const cp = type || 'SS';
  const t = year - C.balancedYear;
  const anchor = C.CARDINAL_POINT_ANCHORS[cp];
  const harmonics = C.CARDINAL_POINT_HARMONICS[cp];
  let jd = anchor + C.meanSolarYearDays * (year - 2000);
  for (const [div, sinC, cosC] of harmonics) {
    const phase = 2 * Math.PI * t / (C.H / div);
    jd += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  jd -= _CP_HARMONICS_AT_J2000[cp];
  return jd;
}

/**
 * Compute the cardinal-point tropical year length (time between consecutive events).
 * Derivative of computeSolsticeJD() with respect to year.
 *
 * At J2000: SS=365.2417d (shortest, −46s), WS=365.2427d (longest, +45s).
 * The ±46s variation comes from perihelion precession (H/16).
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} year length in days
 */
function computeSolsticeYearLength(year, type) {
  const cp = type || 'SS';
  const t = year - C.balancedYear;
  const harmonics = C.CARDINAL_POINT_HARMONICS[cp];
  let length = C.meanSolarYearDays;
  for (const [div, sinC, cosC] of harmonics) {
    const period = C.H / div;
    const omega = 2 * Math.PI / period;
    const phase = omega * t;
    length += sinC * omega * Math.cos(phase) - cosC * omega * Math.sin(phase);
  }
  return length;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRECESSION PREDICTION (429-term ML system)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the 429-term feature vector for precession prediction.
 * Ported from script.js buildPredictiveFeatures().
 * See PREDICTIVE_FORMULA_GUIDE.mdx for feature matrix architecture.
 *
 * @param {number} year - calendar year
 * @param {number} planetPeriod - planet's perihelion precession period (years)
 * @param {number} planetTheta0 - planet's J2000 perihelion longitude (degrees)
 * @returns {number[]} 429-element feature array
 */
function buildPredictiveFeatures(year, planetPeriod, planetTheta0) {
  const H = C.H;
  const t = year - C.balancedYear;

  const thetaE = calcEarthPerihelionPredictive(year);
  const thetaP = calcPlanetPerihelionLong(planetTheta0, planetPeriod, year);
  const erd = calcERD(year);
  const obliq = computeObliquityEarth(year);
  const ecc = computeEccentricityEarth(year);

  const thetaERad = thetaE * Math.PI / 180;
  const thetaPRad = thetaP * Math.PI / 180;
  const diff = thetaERad - thetaPRad;
  const sumAngle = thetaERad + thetaPRad;

  const obliqNorm = obliq - C.SOLSTICE_OBLIQUITY_MEAN;
  const eccMean = Math.sqrt(C.eccentricityBase ** 2 + C.eccentricityAmplitude ** 2);
  const eccNorm = ecc - eccMean;
  const erd2 = erd * erd;
  const erd3 = erd2 * erd;

  const f = [];

  // GROUP 1: ANGLE TERMS (0-17) — 18 terms
  for (const n of [1, 2, 3, 4]) {
    f.push(Math.cos(n * diff), Math.sin(n * diff));
  }
  f.push(Math.cos(sumAngle), Math.sin(sumAngle));
  for (const n of [1, 2]) f.push(Math.cos(n * thetaERad), Math.sin(n * thetaERad));
  for (const n of [1, 2]) f.push(Math.cos(n * thetaPRad), Math.sin(n * thetaPRad));

  // GROUP 2: OBLIQUITY & ECCENTRICITY (18-23) — 6 terms
  f.push(obliqNorm, eccNorm);
  f.push(obliqNorm * Math.cos(diff), obliqNorm * Math.sin(diff));
  f.push(eccNorm * Math.cos(diff), eccNorm * Math.sin(diff));

  // GROUP 3: ERD TERMS (24-35) — 12 terms
  f.push(erd, erd2);
  f.push(erd * Math.cos(diff), erd * Math.sin(diff));
  f.push(erd * Math.cos(2 * diff), erd * Math.sin(2 * diff));
  f.push(erd * Math.cos(sumAngle), erd * Math.sin(sumAngle));
  f.push(erd2 * Math.cos(diff), erd2 * Math.sin(diff));
  f.push(erd3, erd2 * Math.cos(2 * diff));

  // GROUP 4: PERIODIC TERMS (36-57) — 22 terms
  const periods = [planetPeriod, H, H/16, H/32, H/48, H/8, H/3, H/4, H/5, H/12, H/13];
  for (const p of periods) {
    const phase = 2 * Math.PI * t / p;
    f.push(Math.sin(phase), Math.cos(phase));
  }

  // GROUP 5: ERD × PERIODIC (58-79) — 22 terms
  for (const p of periods) {
    const phase = 2 * Math.PI * t / p;
    f.push(erd * Math.sin(phase), erd * Math.cos(phase));
  }

  // GROUP 6: ERD² × PERIODIC (80-91) — 12 terms
  for (const p of [planetPeriod, H, H/16, H/8, H/3, H/5]) {
    const phase = 2 * Math.PI * t / p;
    f.push(erd2 * Math.sin(phase), erd2 * Math.cos(phase));
  }

  // GROUP 7: PERIODIC × ANGLE (92-115) — 24 terms
  for (const p of [H/16, H/32, H/8, H/3, planetPeriod, H/5]) {
    const phase = 2 * Math.PI * t / p;
    const sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP * Math.cos(diff), sinP * Math.sin(diff));
    f.push(cosP * Math.cos(diff), cosP * Math.sin(diff));
  }

  // GROUP 8: ERD × PERIODIC × ANGLE (116-131) — 16 terms
  for (const p of [H/16, H/32, planetPeriod, H]) {
    const phase = 2 * Math.PI * t / p;
    const sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(erd * sinP * Math.cos(diff), erd * sinP * Math.sin(diff));
    f.push(erd * cosP * Math.cos(diff), erd * cosP * Math.sin(diff));
  }

  // GROUP 9: PERIODIC × 2δ (132-147) — 16 terms
  for (const p of [H/16, H/32, planetPeriod, H]) {
    const phase = 2 * Math.PI * t / p;
    const sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP * Math.cos(2 * diff), sinP * Math.sin(2 * diff));
    f.push(cosP * Math.cos(2 * diff), cosP * Math.sin(2 * diff));
  }

  // GROUP 10: PERIODIC × PERIODIC (148-159) — 12 terms
  for (const [p1, p2] of [[H/16, planetPeriod], [H/16, H/8], [H/8, planetPeriod],
                           [H/8, H/3], [planetPeriod, H/3], [H/16, H/3]]) {
    const ph1 = 2 * Math.PI * t / p1, ph2 = 2 * Math.PI * t / p2;
    f.push(Math.sin(ph1) * Math.sin(ph2), Math.cos(ph1) * Math.cos(ph2));
  }

  // GROUP 11: CONSTANT (160) — 1 term
  f.push(1.0);

  // GROUP 12: ERD × SUM-ANGLE (161-164) — 4 terms
  f.push(erd * Math.cos(2 * sumAngle), erd * Math.sin(2 * sumAngle));
  f.push(erd2 * Math.cos(sumAngle), erd2 * Math.sin(sumAngle));

  // GROUP 13: EXTENDED HARMONICS (165-224) — 60 terms
  f.push(Math.cos(3 * diff), Math.sin(3 * diff));
  f.push(erd * Math.cos(3 * diff), erd * Math.sin(3 * diff));

  // Beat frequencies (12)
  for (const [p1, p2] of [[H/16, planetPeriod], [H/8, planetPeriod], [H/3, planetPeriod]]) {
    const beat = p1 !== p2 ? Math.abs(p1 - p2) : H;
    const sumf = p1 !== p2 ? (p1 * p2) / (p1 + p2) : p1 / 2;
    for (const bp of [beat, sumf]) {
      const phase = 2 * Math.PI * t / bp;
      f.push(Math.sin(phase), Math.cos(phase));
    }
  }

  // H/48, H/4, H/13 × angle (12)
  for (const p of [H/48, H/4, H/13]) {
    const phase = 2 * Math.PI * t / p;
    const sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP * Math.cos(diff), sinP * Math.sin(diff));
    f.push(cosP * Math.cos(diff), cosP * Math.sin(diff));
  }

  // Sum angle combinations (16)
  for (const p of [H/16, H/8, planetPeriod, H]) {
    const phase = 2 * Math.PI * t / p;
    const sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP * Math.cos(sumAngle), sinP * Math.sin(sumAngle));
    f.push(cosP * Math.cos(sumAngle), cosP * Math.sin(sumAngle));
  }

  // ERD³ × angle (4)
  f.push(erd3 * Math.cos(diff), erd3 * Math.sin(diff));
  f.push(erd3 * Math.cos(2 * diff), erd3 * Math.sin(2 * diff));

  // ERD² × periodic × angle (12)
  for (const p of [H/16, planetPeriod, H/8]) {
    const phase = 2 * Math.PI * t / p;
    const sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(erd2 * sinP * Math.cos(diff), erd2 * sinP * Math.sin(diff));
    f.push(erd2 * cosP * Math.cos(diff), erd2 * cosP * Math.sin(diff));
  }

  // GROUP 14: VENUS PERIODIC TERMS (225-240) — 16 terms
  for (const d of [80, 21]) {
    const phase = 2 * Math.PI * t / (H/d);
    f.push(Math.sin(phase), Math.cos(phase));
  }
  { const phase = 2*Math.PI*t/(H/80), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  for (const p of [planetPeriod, H/16]) {
    const phase = 2*Math.PI*t/p, sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(3*diff), sinP*Math.sin(3*diff), cosP*Math.cos(3*diff), cosP*Math.sin(3*diff));
  }

  // GROUP 15: TIME-VARYING OBLIQ/ECC INTERACTIONS (241-252) — 12 terms
  f.push(obliqNorm*erd*Math.cos(diff), obliqNorm*erd*Math.sin(diff));
  f.push(obliqNorm*erd*Math.cos(2*diff), obliqNorm*erd*Math.sin(2*diff));
  f.push(eccNorm*erd*Math.cos(diff), eccNorm*erd*Math.sin(diff));
  f.push(eccNorm*erd*Math.cos(2*diff), eccNorm*erd*Math.sin(2*diff));
  { const phase = 2*Math.PI*t/(H/16);
    f.push(obliqNorm*Math.sin(phase), obliqNorm*Math.cos(phase));
    f.push(eccNorm*Math.sin(phase), eccNorm*Math.cos(phase)); }

  // GROUP 16: VENUS FINE-TUNING (253-272) — 20 terms
  for (const d of [78, 94, 77, 55]) {
    const phase = 2*Math.PI*t/(H/d);
    f.push(Math.sin(phase), Math.cos(phase));
  }
  for (const d of [78, 94]) {
    const phase = 2*Math.PI*t/(H/d), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff));
  }
  for (const d of [78, 94]) {
    const phase = 2*Math.PI*t/(H/d);
    f.push(erd*Math.sin(phase), erd*Math.cos(phase));
  }

  // GROUP 17: GREEDY-SELECTED TERMS (273-286) — 14 terms
  { const phase = 2*Math.PI*t/(H/60); f.push(Math.sin(phase), Math.cos(phase)); }
  for (const d of [24, 45]) {
    const phase = 2*Math.PI*t/(H/d), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff));
  }
  { const phase = 2*Math.PI*t/(H/9), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }

  // GROUP 18: GREEDY ROUND-2 (287-302) — 16 terms
  { const phase = 2*Math.PI*t/(H/110); f.push(Math.sin(phase), Math.cos(phase)); }
  { const phase = 2*Math.PI*t/(H/60), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  { const phase = 2*Math.PI*t/(H/75); f.push(Math.sin(phase), Math.cos(phase)); }
  { const phase = 2*Math.PI*t/(H/41), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  { const phase = 2*Math.PI*t/(H/56); f.push(Math.sin(phase), Math.cos(phase)); }
  { const phase = 2*Math.PI*t/(H/45); f.push(Math.sin(phase), Math.cos(phase)); }

  // GROUP 19: GREEDY ROUND-3 (303-318) — 16 terms
  { const phase = 2*Math.PI*t/(H/56), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  { const phase = 2*Math.PI*t/(H/41), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  { const phase = 2*Math.PI*t/(H/110); f.push(erd*Math.sin(phase), erd*Math.cos(phase)); }
  f.push(erd*Math.sin(6*diff), erd*Math.cos(6*diff));
  { const phase = 2*Math.PI*t/(H/39), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }

  // GROUP 20: GREEDY ROUND-4 (319-336) — 18 terms
  { const phase = 2*Math.PI*t/(H/60), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  { const phase = 2*Math.PI*t/(H/112), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  { const phase = 2*Math.PI*t/(H/39), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  { const phase = 2*Math.PI*t/(H/96), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  { const phase = 2*Math.PI*t/(H/37); f.push(Math.sin(phase), Math.cos(phase)); }

  // GROUP 21: GREEDY ROUND-5 (337-358) — 22 terms
  { const phase = 2*Math.PI*t/(H/96), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  { const phase = 2*Math.PI*t/(H/7), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP, cosP, sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff)); }
  { const phase = 2*Math.PI*t/(H/18); f.push(Math.sin(phase), Math.cos(phase)); }
  { const phase = 2*Math.PI*t/(H/37), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  { const phase = 2*Math.PI*t/(H/38), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  f.push(erd*Math.cos(6*diff), erd*Math.sin(6*diff));

  // GROUP 22: GREEDY ROUND-6 (359-368) — 10 terms
  { const phase = 2*Math.PI*t/(H/31), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP, cosP);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff));
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }

  // GROUP 23: GREEDY ROUND-7 (369-388) — 20 terms
  { const phase = 2*Math.PI*t/(H/128), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP, cosP);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff));
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }
  { const phase = 2*Math.PI*t/(H/42), sinP = Math.sin(phase), cosP = Math.cos(phase);
    f.push(sinP, cosP);
    f.push(sinP*Math.cos(diff), sinP*Math.sin(diff), cosP*Math.cos(diff), cosP*Math.sin(diff));
    f.push(sinP*Math.cos(2*diff), sinP*Math.sin(2*diff), cosP*Math.cos(2*diff), cosP*Math.sin(2*diff)); }

  // GROUP 24: SATURN HIGH-FREQUENCY (389-406) — 18 terms
  for (const d of [272, 544, 816, 1088, 1360, 1632, 1904, 2176, 2448]) {
    const phase = 2*Math.PI*t/(H/d);
    f.push(Math.sin(phase), Math.cos(phase));
  }

  // GROUP 25: VENUS HIGH-FREQUENCY TRIPLETS (407-428) — 22 terms
  for (const d of [124, 125, 126, 129, 139, 140, 141, 142, 143, 157, 158]) {
    const phase = 2*Math.PI*t/(H/d);
    f.push(Math.sin(phase), Math.cos(phase));
  }

  return f;
}

/**
 * Predict the total geocentric precession rate for a planet (arcsec/century).
 * Uses the 429-term feature matrix × trained ridge-regression coefficients.
 *
 * @param {number} year - calendar year
 * @param {string} planetKey - e.g. 'mercury', 'mars'
 * @returns {number} total precession rate in arcsec/century (baseline + fluctuation)
 */
function predictGeocentricPrecession(year, planetKey) {
  const planet = C.PREDICT_PLANETS[planetKey];
  const coeffs = C.PREDICT_COEFFS[planetKey];
  if (!planet || !coeffs) return 0;
  const features = buildPredictiveFeatures(year, planet.period, planet.theta0);
  let dot = 0;
  for (let i = 0; i < coeffs.length; i++) dot += coeffs[i] * features[i];
  return planet.baseline + dot;
}

/**
 * Predict the precession fluctuation (deviation from baseline) for a planet.
 * @param {number} year - calendar year
 * @param {string} planetKey - e.g. 'mercury', 'mars'
 * @returns {number} fluctuation in arcsec/century
 */
function predictPrecessionFluctuation(year, planetKey) {
  const planet = C.PREDICT_PLANETS[planetKey];
  if (!planet) return 0;
  return predictGeocentricPrecession(year, planetKey) - planet.baseline;
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
  const solarYearDays = computeLengthOfSolarYear(year);
  const siderealYearDays = computeLengthOfSiderealYear(year);
  const siderealYearSec = siderealYearDays * C.meanLengthOfDay;
  const precession = computeAxialPrecession(siderealYearSec, solarYearDays);
  const perihelionLong = calcEarthPerihelionPredictive(year);
  const erd = calcERD(year);

  // Day length
  const lengthOfDay = computeLengthOfDay(siderealYearDays);
  const solarYearSec = solarYearDays * lengthOfDay;
  const siderealDay = computeSiderealDay(solarYearSec, solarYearDays);
  const stellarDay = computeStellarDay(siderealYearSec, solarYearSec, solarYearDays, siderealDay);
  const raDayOffsetMs = computeRADayOffset(year);
  const measuredSolarDay = computeMeasuredSolarDay(lengthOfDay, raDayOffsetMs);

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
    lengthOfDay,
    siderealDay,
    stellarDay,
    raDayOffsetMs,
    measuredSolarDay,
  };
}

module.exports = {
  // Obliquity
  computeObliquityEarth,
  computeObliquityIntegrals,
  computePlanetObliquity,
  computeInclinationTiltRelative,
  computeAxialTiltAbsolute,
  computeAxialTiltRelative,

  // Eccentricity
  computeEccentricity,
  computeEccentricityEarth,
  computeSemiMajorAxis,
  computePerihelionAphelionDistance,

  // Ascending Node
  calculateDynamicAscendingNodeFromTilts,
  findAllInclinationCrossings,
  computeAscendingNodeInvPlane,

  // Argument of Perihelion
  computeArgumentOfPerihelion,
  computeArgumentOfPerihelionInvPlane,

  // Longitude of Perihelion
  calcEarthPerihelionPredictive,
  calcERD,
  calcPlanetPerihelionLong,
  calcPerihelionLongICRF,

  // Inclination
  computeInclinationEarth,
  computePlanetInvPlaneInclinationDynamic,
  computeEclipticInclination,

  // Precession
  computeAxialPrecession,
  computeAxialPrecessionRealLOD,
  computePerihelionPrecession,
  computeInclinationPrecessionPeriod,
  computeObliquityPrecession,
  computeEclipticPrecession,

  // Year Length
  evalYearFourier,
  computeLengthOfSolarYear,
  computeLengthOfSimplifiedSolarYear,
  computeLengthOfSiderealYear,
  computeLengthOfAnomalisticYearRealLOD,
  computeLengthOfAnomalisticYearDays,
  computeLengthOfSolarYearSec,
  computeLengthOfSiderealYearSec,

  // Day Length
  computeLengthOfDay,
  computeSiderealDay,
  computeStellarDay,
  computeRADayOffset,
  computeMeasuredSolarDay,
  computeStellarSiderealOffset,

  // Solstice Prediction
  computeSolsticeRA,
  computeSolsticeJD,
  computeSolsticeYearLength,

  // Composite
  computeEarthOrbitalElements,
  buildPredictiveFeatures,
  predictGeocentricPrecession,
  predictPrecessionFluctuation,
};
