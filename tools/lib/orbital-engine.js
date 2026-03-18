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
// OBLIQUITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's obliquity (axial tilt) for a given year.
 * Primary formula: 12-harmonic fit including equation-of-center corrections.
 * RMSE: 0.20 arcsec over full H (935× more accurate than the geometric formula).
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

  const cycle = p.obliquityCycle;
  const tiltJ2000 = p.axialTiltMean;

  // Venus, Neptune: no obliquity cycle — return static tilt
  if (!cycle) return tiltJ2000;

  // Anchor to J2000 via inclination oscillation
  const inclAtJ2000 = computePlanetInvPlaneInclinationDynamic(planetName, 2000);
  const inclNow = computePlanetInvPlaneInclinationDynamic(planetName, currentYear);

  return tiltJ2000 + (inclNow - inclAtJ2000);
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
  const root = Math.sqrt(base * base + amplitude * amplitude);
  const degrees = ((currentYear - balancedYear) / cycleLength) * 360;
  const cosTheta = Math.cos(degrees * Math.PI / 180);
  const h1 = root - base;
  return root + (-amplitude - h1 * cosTheta) * cosTheta;
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

  const yearSpan = Math.abs(endYear - startYear);
  const cycleLength = C.H / 3;
  const expectedCrossings = Math.ceil(yearSpan / cycleLength) * 2 + 4;
  const steps = Math.max(1000, expectedCrossings * 50);
  const stepSize = (endYear - startYear) / steps;

  let prevIncl = computeInclinationEarth(startYear);
  const crossings = [];

  for (let i = 1; i <= steps; i++) {
    const year = startYear + i * stepSize;
    const incl = computeInclinationEarth(year);

    if ((prevIncl < targetInclination && incl >= targetInclination) ||
        (prevIncl > targetInclination && incl <= targetInclination)) {
      const fraction = (targetInclination - prevIncl) / (incl - prevIncl);
      crossings.push(year - stepSize + fraction * stepSize);
    }
    prevIncl = incl;
  }

  return crossings;
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
function calculateDynamicAscendingNodeFromTilts(orbitTilta, orbitTiltb, currentYear) {
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

    // Sample to find obliquity direction changes (extrema)
    const sampleStep = Math.min(1000, (yearMax - yearMin) / 100);
    if (sampleStep > 0) {
      let prevObl = computeObliquityEarth(yearMin);
      let prevDir = 0;

      for (let y = yearMin + sampleStep; y <= yearMax; y += sampleStep) {
        const obl = computeObliquityEarth(y);
        const curDir = obl > prevObl ? 1 : (obl < prevObl ? -1 : 0);

        if (prevDir !== 0 && curDir !== 0 && prevDir !== curDir) {
          // Direction changed — binary search for extremum
          let lo = y - sampleStep;
          let hi = y;
          for (let iter = 0; iter < 20; iter++) {
            const mid = (lo + hi) / 2;
            const oblLo = computeObliquityEarth(lo);
            const oblMid = computeObliquityEarth(mid);
            const oblHi = computeObliquityEarth(hi);

            if ((oblMid > oblLo && oblMid > oblHi) || (oblMid < oblLo && oblMid < oblHi)) {
              criticalYears.push(mid);
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
    }

    // Find ALL inclination crossings
    const minEarthIncl = C.earthInvPlaneInclinationMean - C.earthInvPlaneInclinationAmplitude;
    const maxEarthIncl = C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude;

    if (planetInclination >= minEarthIncl && planetInclination <= maxEarthIncl) {
      const allCrossings = findAllInclinationCrossings(planetInclination, yearMin, yearMax);
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
      const inclDirection = earthInclAtMid > planetInclination ? 1 : -1;

      effect += baseDOmegaDeps * inclDirection * deltaObl * RAD2DEG;
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
  if (!p || !p.ascendingNodeInvPlane || !p.perihelionEclipticYears) return 0;
  const rate = 360 / p.perihelionEclipticYears;
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
 * Uses ascending-node-based oscillation with mean-centered cosine.
 * Source: script.js computePlanetInvPlaneInclinationDynamic() ~line 33987
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

  const jd = julianDay || C.yearToJD(currentYear);
  const yearsSinceBalanced = (jd - C.balancedJD) / C.meanSolarYearDays;

  const precessionRate = 360 / period;

  const ascNodeJ2000 = p.ascendingNode;
  const ascNodeAtBalanced = ascNodeJ2000 - precessionRate * C.yearsFromBalancedToJ2000;
  const ascNodeCurrent = ascNodeAtBalanced + precessionRate * yearsSinceBalanced;

  const currentPhaseDeg = ascNodeCurrent - phaseOffset;
  const currentPhaseRad = currentPhaseDeg * Math.PI / 180;

  return i_mean + amplitude * Math.cos(currentPhaseRad);
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
 * For Earth: H/3 = 111,669 yr. For planets: perihelionEclipticYears.
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

/** Compute tropical year length in days. */
function computeLengthOfSolarYear(year) {
  return evalYearFourier(year, C.meanSolarYearDays, C.TROPICAL_YEAR_HARMONICS);
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
// Validated: RMSE = 0.089° (0.36 min RA) against 2,889 simulation data points.

// Cardinal Point JD: linear trend + 12 harmonics (5 Fibonacci + 7 overtones).
// 12-harmonic fits from 11,553 observations (29-year steps) per cardinal point.
// Anchored at observed J2000 values. Self-correcting: exact at year 2000.
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
 * RMSE: 0.089° (0.36 min RA) against 11,553 simulation data points.
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
 * 12 harmonics: 5 Fibonacci fundamentals + 7 overtones.
 * RMSE: SS 2.7min, WS 5.3min, VE 3.0min, AE 5.0min over full H.
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

  // Inclination
  computeInclinationEarth,
  computePlanetInvPlaneInclinationDynamic,

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
};
