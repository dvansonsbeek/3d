// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZER — Diagnostics, sensitivity analysis, and parameter optimization
//             for the Holistic Universe Model
//
// Usage:
//   const opt = require('./optimizer');
//   opt.scanOrbit('mercury');                         // eccentricity diagnostics
//   opt.baseline('mars');                             // RA/Dec errors vs JPL
//   opt.sensitivityScan('mars', 'startpos', -5, 5);  // parameter sweep
//   opt.nelderMead('mars', ['startpos','angleCorrection']); // optimization
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
const sg = require('./scene-graph');
const jpl = require('./horizons-client');
const { j2000ToOfDate } = require('./precession');
const fs = require('fs');
const path = require('path');

const REF_PATH = path.join(__dirname, '..', '..', 'data', 'reference-data.json');
const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'jpl-cache.json');

/**
 * Load JPL reference dates from cache for sun/moon.
 * Uses the same yearly dates as defaultReferenceDates().
 */
function loadJPLRefDates(target) {
  const code = jpl.TARGET_CODES[target];
  if (!code) throw new Error(`No JPL target code for: ${target}`);

  let cache;
  try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); }
  catch { throw new Error(`JPL cache not found. Run 'baseline-jpl ${target}' first to populate cache.`); }

  const jds = defaultReferenceDates();
  const results = [];
  for (const jd of jds) {
    const key = `${code}_${jd}`;
    if (!cache[key]) throw new Error(`JD ${jd} not in JPL cache for ${target}. Run 'baseline-jpl ${target}' first.`);
    results.push({
      jd, ra: cache[key].ra, dec: cache[key].dec, weight: 1,
      year: C.startmodelYear + (jd - C.startmodelJD) / C.meanSolarYearDays,
      label: 'JPL Horizons',
    });
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARAMETER INJECTION — Mutate constants, rebuild scene graph, restore
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the eccentricity at J2000 from actual scene graph geometry.
 * Reads the Euclidean distance from Earth to barycenter.pivot in the Earth equatorial
 * frame — identical to what the browser reads as earthPerihelionFromEarth.distAU.
 *
 * This is more accurate than the algebraic formula (base + amplitude×cos(phase))
 * because it includes the perpendicular component when the perihelion phase is not
 * exactly 0, matching the scene's true geometry.
 */
function computeEccentricityJ2000Scene(amplitude) {
  const saved = C.eccentricityAmplitude;
  C.eccentricityAmplitude = amplitude;
  recomputeEccentricityDerived();

  sg._invalidateGraph();
  const graph = sg.buildSceneGraph();
  const pos = (1 / C.meanSolarYearDays) * (C.j2000JD - C.startmodelJD);
  sg.moveModel(graph, pos);

  const bcWP  = graph.barycenter.pivot.getWorldPosition();
  const local = graph.earthNodes.rotAxis.worldToLocal(bcWP[0], bcWP[1], bcWP[2]);
  const distScene = Math.sqrt(local[0]*local[0] + local[1]*local[1] + local[2]*local[2]);

  C.eccentricityAmplitude = saved;
  recomputeEccentricityDerived();
  return distScene / 100;  // scene units → AU (model uses ×100 scaling)
}

/**
 * Solve for eccentricityAmplitude given eccentricityBase such that
 * the scene-geometry eccentricity at J2000 equals
 * ASTRO_REFERENCE.earthEccentricityJ2000 (0.01671022).
 *
 * Uses scene geometry (barycenter Euclidean distance) rather than the algebraic
 * formula, so the result matches what the browser displays as distAU exactly.
 * The J2000 phase is determined by perihelionalignmentYear.
 */
function solveAmplitudeForJ2000(base) {
  const target = C.ASTRO_REFERENCE.earthEccentricityJ2000;

  // At A=0 the scene eccentricity equals base (no variable component).
  // If base ≥ target the constraint is infeasible — return null so the caller
  // can assign a penalty cost rather than crash.
  if (base >= target) return null;

  // f(A) = scene_eccentricity(A) - target; monotonically increasing in A.
  function f(A) {
    return computeEccentricityJ2000Scene(A) - target;
  }

  // Find upper bracket where f > 0
  let hi = target - base;
  if (f(hi) <= 0) hi = 0.05;
  if (f(hi) <= 0) hi = 0.5;

  // Bisection — converges to 1e-12 in ~40 iterations
  let lo = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) <= 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

/**
 * Recompute all eccentricity-derived constants after base or amplitude changes.
 * Keeps eccentricityDerivedMean and eocEccentricity in sync.
 */
function recomputeEccentricityDerived() {
  C.eccentricityDerivedMean = Math.sqrt(
    C.eccentricityBase * C.eccentricityBase + C.eccentricityAmplitude * C.eccentricityAmplitude
  );
  C.eocEccentricity = C.eccentricityDerivedMean - C.eccentricityBase / 2;
}

/**
 * Recompute inclination-derived constants after earthInvPlaneInclinationAmplitude or earthtiltMean changes.
 * Cascade: amplitude → earthInvPlaneInclinationMean + earthRAAngle (both used in scene graph).
 */
function recomputeInclinationDerived() {
  const A = C.earthInvPlaneInclinationAmplitude;
  const eps = C.earthtiltMean;
  // mean = inclJ2000 − A × cos(Ω_J2000 − phaseAngle)
  const cosTheta = Math.cos((C.ASTRO_REFERENCE.earthAscendingNodeInvPlane
    - C.ASTRO_REFERENCE.earthInclinationPhaseAngle) * Math.PI / 180);
  C.earthInvPlaneInclinationMean = C.ASTRO_REFERENCE.earthInclinationJ2000_deg - A * cosTheta;
  // earthRAAngle = 2A − A²/ε
  C.earthRAAngle = 2 * A - (A * A) / eps;
}

/**
 * Recompute perihelion-phase derived constants after perihelionalignmentYear or correctionSun changes.
 * Cascade: balancedYear → perihelionPhaseOffset (used in perihelionPhaseJ2000 in scene graph).
 */
function recomputePerihelionDerived() {
  C.balancedYear = C.perihelionalignmentYear - (C.temperatureGraphMostLikely * (C.H / 16));
  C.perihelionPhaseOffset = (((C.startModelYearWithCorrection - C.balancedYear) / (C.H / 16) * 360
    + C.correctionSun + 360 * (C.startmodelJD - C.perihelionRefJD) / C.meanSolarYearDays) % 360 + 360) % 360;
}

/**
 * Solve for earthInvPlaneInclinationAmplitude such that the scene-geometry obliquity rate
 * (sun.dec at June solstice J2100 minus J2000, in arcsec/century) equals
 * ASTRO_REFERENCE.obliquityRate_arcsecPerCentury (-46.836769"/cy).
 *
 * Monotonically: larger amplitude → larger |rate|. So if rate is too negative (too large),
 * reduce amplitude.
 */
function solveAmplitudeForObliquityRate() {
  const target = C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury;  // negative
  const solsticeJ2000 = C.ASTRO_REFERENCE.juneSolstice2000_JD;
  const solsticeJ2100 = solsticeJ2000 + C.tropicalCenturyDays;  // 100 tropical years for phase-clean measurement

  function measureRate(A) {
    const saved = C.earthInvPlaneInclinationAmplitude;
    C.earthInvPlaneInclinationAmplitude = A;
    recomputeInclinationDerived();
    sg._invalidateGraph();
    const d0 = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2000).dec);
    const d1 = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2100).dec);
    C.earthInvPlaneInclinationAmplitude = saved;
    recomputeInclinationDerived();
    return (d1 - d0) * 3600;
  }

  // f(A) = measureRate(A) - target; want f = 0. Rate is negative and |rate| grows with A.
  // Larger A → more negative rate → f more negative. Bisect to find root.
  let lo = 0.3, hi = 1.0;
  // Ensure bracket
  if (measureRate(lo) < target) lo = 0.1;
  if (measureRate(hi) > target) hi = 1.5;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (measureRate(mid) > target) lo = mid; else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return (lo + hi) / 2;
}

/**
 * Solve for earthtiltMean such that sun.dec at the June solstice 2000 equals
 * ASTRO_REFERENCE.obliquityJ2000_deg (23.439291°).
 *
 * Monotonically: larger earthtiltMean → larger obliquity at J2000.
 */
function solveEarthtiltMeanForObliquity() {
  const target = C.ASTRO_REFERENCE.obliquityJ2000_deg;
  const solsticeJ2000 = C.ASTRO_REFERENCE.juneSolstice2000_JD;

  function measureObliquity(eps) {
    const saved = C.earthtiltMean;
    C.earthtiltMean = eps;
    recomputeInclinationDerived();
    sg._invalidateGraph();
    const dec = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2000).dec);
    C.earthtiltMean = saved;
    recomputeInclinationDerived();
    return dec;
  }

  let lo = 23.0, hi = 24.0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (measureObliquity(mid) < target) lo = mid; else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

/**
 * Compute the RA (degrees) of graph.barycenter.pivot in Earth's equatorial frame at J2000.
 * This is the perihelion direction as encoded in the scene graph geometry.
 *
 * Requires constants (eccentricityBase, eccentricityAmplitude, etc.) to already be set.
 * Invalidates and rebuilds the scene graph, so call only when constants have changed.
 */
function computePerihelionRA() {
  const j2000JD = C.j2000JD;
  sg._invalidateGraph();
  const graph = sg.buildSceneGraph();
  const pos = (1 / C.meanSolarYearDays) * (j2000JD - C.startmodelJD);
  sg.moveModel(graph, pos);

  const bcWP = graph.barycenter.pivot.getWorldPosition();
  const local = graph.earthNodes.rotAxis.worldToLocal(bcWP[0], bcWP[1], bcWP[2]);
  const { cartesianToSpherical, thetaToRaDeg } = sg;
  const sph = cartesianToSpherical(local[0], local[1], local[2]);
  return thetaToRaDeg(sph.theta);
}

/**
 * Solve for eccentricityBase such that barycenter.pivot.RA at J2000 equals
 * ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 (102.947°).
 *
 * For each candidate base: derive amplitude (e(J2000) constraint), rebuild graph,
 * compute barycenter RA, bisect to root.  Returns { base, amplitude, raAchieved }.
 */
function solveBaseForPerihelionRA() {
  const targetRA = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
  const savedBase = C.eccentricityBase;
  const savedAmp  = C.eccentricityAmplitude;

  function evalRA(base) {
    const amp = solveAmplitudeForJ2000(base);
    if (amp === null) return null;
    C.eccentricityBase = base;
    C.eccentricityAmplitude = amp;
    recomputeEccentricityDerived();
    return computePerihelionRA();
  }

  // RA increases monotonically with base (confirmed by scan): bisect on (RA - targetRA)
  let lo = 0.001, hi = C.ASTRO_REFERENCE.earthEccentricityJ2000 - 1e-6;
  const raLo = evalRA(lo);
  const raHi = evalRA(hi);

  let base, amp, raAchieved;
  if (raLo !== null && raHi !== null) {
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const raMid = evalRA(mid);
      if (raMid === null || raMid < targetRA) lo = mid; else hi = mid;
      if (hi - lo < 1e-10) break;
    }
    base = (lo + hi) / 2;
    amp = solveAmplitudeForJ2000(base);
    C.eccentricityBase = base;
    C.eccentricityAmplitude = amp;
    recomputeEccentricityDerived();
    raAchieved = computePerihelionRA();
  } else {
    base = savedBase;
    amp = savedAmp;
    raAchieved = null;
  }

  // Restore original values and graph
  C.eccentricityBase = savedBase;
  C.eccentricityAmplitude = savedAmp;
  recomputeEccentricityDerived();
  sg._invalidateGraph();

  return { base, amplitude: amp, raAchieved, raTarget: targetRA };
}

/**
 * Compute the perihelion longitude (degrees) of a planet using the same formula as the
 * browser's apparentRaFromPdA(earthPerihelionFromEarth, planetPerihelionFromEarth):
 *
 *   1. Get barycenter world position in Earth's equatorial frame  → pdA (ra1, r1)
 *   2. Get planet periFromE world position in Earth's equatorial frame → pdB (ra2, r2)
 *   3. Compute 2D vector pdA→pdB, return the OPPOSITE direction (in degrees)
 *
 * This matches script.js exactly, including the A→B vector + π convention.
 */
function computePlanetPerihelionRA(planet) {
  sg._invalidateGraph();
  const graph = sg.buildSceneGraph();
  // Measure at model start (pos=0) — matches what the browser shows on startup
  sg.moveModel(graph, 0);

  const pm = graph.planetNodeMap[planet];
  if (!pm) throw new Error(`Unknown planet: ${planet}`);

  // pdA = earthPerihelionFromEarth = barycenter position in Earth equatorial frame
  const bcWP    = graph.barycenter.pivot.getWorldPosition();
  const bcLocal = graph.earthNodes.rotAxis.worldToLocal(bcWP[0], bcWP[1], bcWP[2]);
  const bcSph   = sg.cartesianToSpherical(bcLocal[0], bcLocal[1], bcLocal[2]);

  // pdB = planetPerihelionFromEarth = periFromE position in Earth equatorial frame
  const pWP    = pm.periFromE.pivot.getWorldPosition();
  const pLocal = graph.earthNodes.rotAxis.worldToLocal(pWP[0], pWP[1], pWP[2]);
  const pSph   = sg.cartesianToSpherical(pLocal[0], pLocal[1], pLocal[2]);

  // Replicate apparentRaFromPdA: 2D project, vector A→B, return opposite direction
  const TWO_PI = 2 * Math.PI;
  let θ1 = bcSph.theta % TWO_PI; if (θ1 < 0) θ1 += TWO_PI;
  let θ2 = pSph.theta  % TWO_PI; if (θ2 < 0) θ2 += TWO_PI;
  const r1 = bcSph.r, r2 = pSph.r;

  const x1 = r1 * Math.cos(θ1), z1 = r1 * Math.sin(θ1);
  const x2 = r2 * Math.cos(θ2), z2 = r2 * Math.sin(θ2);
  const dx = x2 - x1, dz = z2 - z1;

  let aparRad = Math.atan2(dz, dx);
  if (aparRad < 0) aparRad += TWO_PI;
  let oppRad = aparRad + Math.PI;
  if (oppRad >= TWO_PI) oppRad -= TWO_PI;

  return oppRad * (180 / Math.PI);
}

/**
 * Solve for angleCorrection such that the scene's periFromE.pivot RA at J2000 equals
 * C.planets[planet].longitudePerihelion.
 *
 * Monotonically: larger angleCorrection → larger RA (angle shifts the perihelion direction).
 * Returns the solved angleCorrection value.
 */
function solveAngleCorrectionForPerihelion(planet) {
  const p      = C.planets[planet];
  const target = p.longitudePerihelion;
  const saved  = p.angleCorrection;

  function measureRA(ac) {
    p.angleCorrection = ac;
    return computePlanetPerihelionRA(planet);
  }

  // Newton iteration to find estimate: repeatedly probe slope and step
  let estimate = saved;
  for (let k = 0; k < 8; k++) {
    const raA = measureRA(estimate);
    const raB = measureRA(estimate + 1);
    let slope = raB - raA;
    if (slope > 180) slope -= 360;
    if (slope < -180) slope += 360;
    if (Math.abs(slope) < 0.01) slope = 1;
    const d = ((target - raA) + 540) % 360 - 180;
    const step = d / slope;
    estimate += step;
    if (Math.abs(step) < 0.001) break;
  }

  // Bisect within ±20° of estimate to polish; expand bracket if target not enclosed
  let lo = estimate - 20, hi = estimate + 20;
  const raLo0 = measureRA(lo);
  const loAdj = raLo0 + (((target - raLo0) + 540) % 360 - 180);
  // Determine ascending using unwrapped values (raw comparison fails when RA wraps near 0/360)
  const raHi0 = measureRA(hi);
  const raHi0U = raHi0 + Math.round((loAdj - raHi0) / 360) * 360;
  let ascending = raHi0U > raLo0;

  // If target is not within the bracket RA range, expand until it is
  for (let k = 0; k < 10; k++) {
    const raLo = measureRA(lo);
    const raHi = measureRA(hi);
    const raLoU = raLo + Math.round((loAdj - raLo) / 360) * 360;
    const raHiU = raHi + Math.round((loAdj - raHi) / 360) * 360;
    // Use loAdj (unwrapped target) for comparison, not raw target
    const inRange = (raLoU <= loAdj && loAdj <= raHiU) || (raHiU <= loAdj && loAdj <= raLoU);
    if (inRange) break;
    lo -= 10; hi += 10;
  }

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const ra  = measureRA(mid);
    const raUnwrapped = ra + Math.round((loAdj - ra) / 360) * 360;
    // Compare against loAdj (unwrapped target), not raw target
    if (ascending ? raUnwrapped < loAdj : raUnwrapped > loAdj) lo = mid; else hi = mid;
    if (hi - lo < 1e-10) break;
  }

  const solved = (lo + hi) / 2;
  p.angleCorrection = saved;
  sg._invalidateGraph();
  return solved;
}

// Map of parameter names to their location in the constants object
// Each entry: { get, set } functions
function getParamAccessors(target) {
  // Sun/Earth parameters
  if (target === 'sun') {
    return {
      correctionSun:        { get: () => C.correctionSun, set: v => { C.correctionSun = v; recomputePerihelionDerived(); } },
      perihelionalignmentYear: { get: () => C.perihelionalignmentYear, set: v => { C.perihelionalignmentYear = v; recomputePerihelionDerived(); } },
      eccentricityBase:     { get: () => C.eccentricityBase, set: v => {
        C.eccentricityBase = v;
        // eccentricityAmplitude is derived: the value that satisfies e(J2000) = 0.01671022
        // given eccentricityBase and perihelionalignmentYear (which fixes cosTheta at J2000).
        // If base ≥ e(J2000), the constraint is infeasible — set amplitude = 0 so the
        // resulting orbit is geometrically wrong and the optimizer sees a high cost.
        const solved = solveAmplitudeForJ2000(v);
        C.eccentricityAmplitude = solved !== null ? solved : 0;
        recomputeEccentricityDerived();
      } },
      earthtiltMean:        { get: () => C.earthtiltMean, set: v => {
        C.earthtiltMean = v;
        recomputeInclinationDerived();
      } },
      earthInvPlaneInclinationAmplitude: { get: () => C.earthInvPlaneInclinationAmplitude, set: v => {
        C.earthInvPlaneInclinationAmplitude = v;
        recomputeInclinationDerived();
      } },
      // eccentricityAmplitude — derived from eccentricityBase + e(J2000) constraint, not free
      // perihelionRefJD — fixed astronomical observation (Jan 3.542, 2000), not a free parameter
    };
  }

  // Moon parameters
  if (target === 'moon') {
    return {
      moonStartposApsidal:  { get: () => C.moonStartposApsidal, set: v => { C.moonStartposApsidal = v; } },
      moonStartposNodal:    { get: () => C.moonStartposNodal, set: v => { C.moonStartposNodal = v; } },
      moonStartposMoon:     { get: () => C.moonStartposMoon, set: v => { C.moonStartposMoon = v; } },
      moonTilt:             { get: () => C.moonTilt, set: v => { C.moonTilt = v; } },
      moonEclipticInclinationJ2000: { get: () => C.moonEclipticInclinationJ2000, set: v => { C.moonEclipticInclinationJ2000 = v; } },
      moonOrbitalEccentricity: { get: () => C.moonOrbitalEccentricity, set: v => { C.moonOrbitalEccentricity = v; } },
    };
  }

  // Planet parameters
  const p = C.planets[target];
  const d = C.derived[target];
  if (!p || !d) throw new Error(`Unknown target: ${target}`);

  return {
    startpos:               { get: () => p.startpos,               set: v => { p.startpos = v; } },
    angleCorrection:        { get: () => p.angleCorrection,        set: v => { p.angleCorrection = v; } },
    solarYearInput:         { get: () => p.solarYearInput,         set: v => { p.solarYearInput = v; } },
    longitudePerihelion:    { get: () => p.longitudePerihelion,     set: v => { p.longitudePerihelion = v; } },
    ascendingNode:          { get: () => p.ascendingNode,           set: v => { p.ascendingNode = v; } },
    eclipticInclinationJ2000: { get: () => p.eclipticInclinationJ2000, set: v => { p.eclipticInclinationJ2000 = v; } },
    orbitalEccentricityBase:    { get: () => p.orbitalEccentricityBase,    set: v => { p.orbitalEccentricityBase = v; } },
    perihelionEclipticYears:{ get: () => p.perihelionEclipticYears, set: v => { p.perihelionEclipticYears = v; } },
    eocFraction:            { get: () => p.eocFraction,            set: v => { p.eocFraction = v; } },
    perihelionRef_JD:       { get: () => C.ASTRO_REFERENCE[target + 'PerihelionRef_JD'], set: v => { C.ASTRO_REFERENCE[target + 'PerihelionRef_JD'] = v; } },
    decCorrA:               { get: () => (C.ASTRO_REFERENCE.decCorrection[target] || {}).A || 0, set: v => { if (!C.ASTRO_REFERENCE.decCorrection[target]) C.ASTRO_REFERENCE.decCorrection[target] = {}; C.ASTRO_REFERENCE.decCorrection[target].A = v; } },
    decCorrB:               { get: () => (C.ASTRO_REFERENCE.decCorrection[target] || {}).B || 0, set: v => { if (!C.ASTRO_REFERENCE.decCorrection[target]) C.ASTRO_REFERENCE.decCorrection[target] = {}; C.ASTRO_REFERENCE.decCorrection[target].B = v; } },
    decCorrC:               { get: () => (C.ASTRO_REFERENCE.decCorrection[target] || {}).C || 0, set: v => { if (!C.ASTRO_REFERENCE.decCorrection[target]) C.ASTRO_REFERENCE.decCorrection[target] = {}; C.ASTRO_REFERENCE.decCorrection[target].C = v; } },
    decCorrD:               { get: () => (C.ASTRO_REFERENCE.decCorrection[target] || {}).D || 0, set: v => { if (!C.ASTRO_REFERENCE.decCorrection[target]) C.ASTRO_REFERENCE.decCorrection[target] = {}; C.ASTRO_REFERENCE.decCorrection[target].D = v; } },
    decCorrE:               { get: () => (C.ASTRO_REFERENCE.decCorrection[target] || {}).E || 0, set: v => { if (!C.ASTRO_REFERENCE.decCorrection[target]) C.ASTRO_REFERENCE.decCorrection[target] = {}; C.ASTRO_REFERENCE.decCorrection[target].E = v; } },
    decCorrF:               { get: () => (C.ASTRO_REFERENCE.decCorrection[target] || {}).F || 0, set: v => { if (!C.ASTRO_REFERENCE.decCorrection[target]) C.ASTRO_REFERENCE.decCorrection[target] = {}; C.ASTRO_REFERENCE.decCorrection[target].F = v; } },
  };
}

/**
 * Apply parameter overrides, rebuild derived values and scene graph,
 * run a function, then restore originals.
 *
 * @param {string} planet - planet name
 * @param {Object} overrides - { paramName: value } map
 * @param {Function} fn - function to run with overrides active
 * @returns {*} return value of fn
 */
function withOverrides(planet, overrides, fn) {
  const accessors = getParamAccessors(planet);
  const saved = {};

  // Save originals and apply overrides
  for (const [key, val] of Object.entries(overrides)) {
    if (!accessors[key]) throw new Error(`Unknown parameter: ${key}`);
    saved[key] = accessors[key].get();
    accessors[key].set(val);
  }

  // Rebuild derived values for planets when orbital params change
  const needsRebuild = planet !== 'sun' && planet !== 'moon'
    && ('solarYearInput' in overrides || 'orbitalEccentricityBase' in overrides);
  if (needsRebuild) C.rebuildDerived(planet);

  // Force scene graph rebuild
  sg._invalidateGraph();

  try {
    return fn();
  } finally {
    // Restore originals
    for (const [key, val] of Object.entries(saved)) {
      accessors[key].set(val);
    }
    if (needsRebuild) C.rebuildDerived(planet);
    sg._invalidateGraph();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC: Orbit Scanner
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scan a full orbit and measure actual min/max distances and effective eccentricity.
 * Works for planets (Sun distance), Sun (Earth-Sun distance), and Moon (Earth-Moon distance).
 *
 * @param {string} target - planet name, 'sun', or 'moon'
 * @param {number} [jdEpoch] - epoch to scan from (default: model start)
 * @param {number} [steps=720] - angular resolution
 * @returns {Object} scan results with min/max distances and eccentricity
 */
function scanOrbit(target, jdEpoch, steps = 720) {
  const sDay = 1 / C.meanSolarYearDays;
  const jd0 = jdEpoch || C.startmodelJD;

  // Determine orbital period and reference body
  let periodDays, inputE, orbitDist, targetType;
  if (target === 'sun') {
    // Earth-Sun: one anomalistic year
    periodDays = C.meanAnomalisticYearDays;
    inputE = C.eccentricityDerivedMean; // Earth's orbital eccentricity
    orbitDist = 1.0; // AU
    targetType = 'earth-sun';
  } else if (target === 'moon') {
    // Earth-Moon: one anomalistic month
    periodDays = C.moonAnomalisticMonth;
    inputE = C.moonOrbitalEccentricity;
    orbitDist = C.moonDistance / C.currentAUDistance; // AU
    targetType = 'earth-moon';
  } else {
    const d = C.derived[target];
    const p = C.planets[target];
    periodDays = (C.H / d.solarYearCount) * C.meanSolarYearDays;
    inputE = p.orbitalEccentricityJ2000;
    orbitDist = d.orbitDistance;
    targetType = p.type;
  }

  const graph = sg.buildSceneGraph();
  let minDist = Infinity, maxDist = 0;
  let minStep = 0, maxStep = 0;

  for (let i = 0; i < steps; i++) {
    const jd = jd0 + (i / steps) * periodDays;
    const pos = sDay * (jd - C.startmodelJD);
    sg.moveModel(graph, pos);

    let dist;
    if (target === 'sun') {
      // Earth-Sun distance
      const eWP = graph.earthNodes.rotAxis.getWorldPosition();
      const sWP = graph.sunNodes.pivot.getWorldPosition();
      const dx = eWP[0] - sWP[0], dy = eWP[1] - sWP[1], dz = eWP[2] - sWP[2];
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / 100;
    } else if (target === 'moon') {
      // Earth-Moon distance
      const eWP = graph.earthNodes.rotAxis.getWorldPosition();
      const mWP = graph.moonNodes.pivot.getWorldPosition();
      const dx = eWP[0] - mWP[0], dy = eWP[1] - mWP[1], dz = eWP[2] - mWP[2];
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / 100;
    } else {
      // Planet-Sun distance
      const pm = graph.planetNodeMap[target];
      const plWP = pm.planet.pivot.getWorldPosition();
      const sWP = graph.sunNodes.pivot.getWorldPosition();
      const dx = plWP[0] - sWP[0], dy = plWP[1] - sWP[1], dz = plWP[2] - sWP[2];
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz) / 100;
    }

    if (dist < minDist) { minDist = dist; minStep = i; }
    if (dist > maxDist) { maxDist = dist; maxStep = i; }
  }

  const modelE = (maxDist - minDist) / (maxDist + minDist);
  sg._invalidateGraph();

  return {
    target,
    type: targetType,
    orbitDistance: orbitDist,
    periodDays,
    minDist,
    maxDist,
    modelEccentricity: modelE,
    inputEccentricity: inputE,
    ratio: modelE / inputE,
    perihelionAngle: (minStep / steps) * 360,
    aphelionAngle: (maxStep / steps) * 360,
    keplerPeri: orbitDist * (1 - inputE),
    keplerAph: orbitDist * (1 + inputE),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC: Layer Decomposition
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Show world position of each layer in a target's chain at a given JD.
 * Works for planets, 'sun' (Earth chain → barycenter → Sun), and 'moon' (Moon chain).
 *
 * @param {string} target - planet name, 'sun', or 'moon'
 * @param {number} jd - Julian Day
 * @returns {Array<{name, worldPos, distFromRef}>} distFromRef = dist from Sun (planets) or Earth (moon)
 */
function decomposeLayerPositions(target, jd) {
  const sDay = 1 / C.meanSolarYearDays;
  const graph = sg.buildSceneGraph();
  const pos = sDay * (jd - C.startmodelJD);
  sg.moveModel(graph, pos);

  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  const earthWP = graph.earthNodes.rotAxis.getWorldPosition();

  function distFrom(wp, ref) {
    return Math.sqrt((wp[0]-ref[0])**2 + (wp[1]-ref[1])**2 + (wp[2]-ref[2])**2) / 100;
  }

  function makeEntry(name, node, refWP) {
    const wp = node.getWorldPosition();
    return { name, worldPos: wp, distFromRef: distFrom(wp, refWP) };
  }

  let layers;

  if (target === 'sun') {
    // Earth chain: earth → precession layers → barycenter → sun
    layers = [
      makeEntry('earth.container', graph.earthNodes.container, sunWP),
      makeEntry('earth.pivot', graph.earthNodes.pivot, sunWP),
      makeEntry('earthInclPrec.pivot', graph.earthInclPrec.pivot, sunWP),
      makeEntry('earthEclipPrec.pivot', graph.earthEclipPrec.pivot, sunWP),
      makeEntry('earthObliqPrec.pivot', graph.earthObliqPrec.pivot, sunWP),
      makeEntry('earthPeriPrec1.pivot', graph.earthPeriPrec1.pivot, sunWP),
      makeEntry('earthPeriPrec2.pivot', graph.earthPeriPrec2.pivot, sunWP),
      makeEntry('barycenter.pivot', graph.barycenter.pivot, sunWP),
      makeEntry('sun.pivot', graph.sunNodes.pivot, sunWP),
      makeEntry('earth.rotAxis', graph.earthNodes.rotAxis, sunWP),
    ];
  } else if (target === 'moon') {
    // Moon chain: earth.pivot → apsidal → apsNodal1 → apsNodal2 → lunarLevel → nodal → moon
    layers = [
      makeEntry('earth.pivot', graph.earthNodes.pivot, earthWP),
      makeEntry('moonApsidalPrec.pivot', graph.moonApsidalPrec.pivot, earthWP),
      makeEntry('moonApsNodalPrec1.pivot', graph.moonApsNodalPrec1.pivot, earthWP),
      makeEntry('moonApsNodalPrec2.pivot', graph.moonApsNodalPrec2.pivot, earthWP),
      makeEntry('moonLunarLevel.pivot', graph.moonLunarLevel.pivot, earthWP),
      makeEntry('moonNodalPrec.pivot', graph.moonNodalPrec.pivot, earthWP),
      makeEntry('moon.pivot', graph.moonNodes.pivot, earthWP),
      makeEntry('sun.pivot', graph.sunNodes.pivot, earthWP),
    ];
  } else {
    // Planet chain: barycenter → eclip1 → periFromE → eclip2 → realPeri → planet
    const pm = graph.planetNodeMap[target];
    layers = [
      makeEntry('sun.pivot', graph.sunNodes.pivot, sunWP),
      makeEntry('barycenter.pivot', graph.barycenter.pivot, sunWP),
      makeEntry('eclip1.pivot', pm.eclip1.pivot, sunWP),
      makeEntry('periFromE.pivot', pm.periFromE.pivot, sunWP),
      makeEntry('eclip2.pivot', pm.eclip2.pivot, sunWP),
      makeEntry('realPeri.pivot', pm.realPeri.pivot, sunWP),
      makeEntry(target + '.pivot', pm.planet.pivot, sunWP),
      makeEntry('earth.rotAxis', graph.earthNodes.rotAxis, sunWP),
    ];
  }

  sg._invalidateGraph();
  return layers;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC: Perihelion Tracking
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Track closest-approach distance over time by finding min distance within each orbit.
 * Works for planets (perihelion to Sun), Sun (perigee = Earth perihelion),
 * and Moon (lunar perigee).
 *
 * @param {string} target - planet name, 'sun', or 'moon'
 * @param {number} yearStart - start year
 * @param {number} yearEnd - end year
 * @param {number} [nOrbits=10] - number of orbits to sample
 * @returns {Array<{year, periDist, periRA, jd}>}
 */
function trackPerihelion(target, yearStart, yearEnd, nOrbits = 10) {
  const sDay = 1 / C.meanSolarYearDays;
  const graph = sg.buildSceneGraph();

  // Determine period
  let periodDays;
  if (target === 'sun') {
    periodDays = C.meanSolarYearDays; // Earth's anomalistic year ≈ solar year
  } else if (target === 'moon') {
    periodDays = C.moonAnomalisticMonth;
  } else {
    const d = C.derived[target];
    periodDays = (C.H / d.solarYearCount) * C.meanSolarYearDays;
  }

  const jdStart = C.startmodelJD + (yearStart - C.startmodelYear) * C.meanSolarYearDays;
  const jdEnd = C.startmodelJD + (yearEnd - C.startmodelYear) * C.meanSolarYearDays;
  const totalOrbits = (jdEnd - jdStart) / periodDays;
  const orbitsToSample = Math.min(nOrbits, Math.floor(totalOrbits));
  const orbitSpacing = (jdEnd - jdStart - periodDays) / Math.max(1, orbitsToSample - 1);

  // Distance function based on target type
  function computeDist() {
    if (target === 'sun') {
      const eWP = graph.earthNodes.rotAxis.getWorldPosition();
      const sWP = graph.sunNodes.pivot.getWorldPosition();
      return { dist: Math.sqrt((eWP[0]-sWP[0])**2 + (eWP[1]-sWP[1])**2 + (eWP[2]-sWP[2])**2) / 100,
               targetWP: graph.sunNodes.pivot.getWorldPosition() };
    } else if (target === 'moon') {
      const eWP = graph.earthNodes.rotAxis.getWorldPosition();
      const mWP = graph.moonNodes.pivot.getWorldPosition();
      return { dist: Math.sqrt((eWP[0]-mWP[0])**2 + (eWP[1]-mWP[1])**2 + (eWP[2]-mWP[2])**2) / 100,
               targetWP: mWP };
    } else {
      const pm = graph.planetNodeMap[target];
      const plWP = pm.planet.pivot.getWorldPosition();
      const sWP = graph.sunNodes.pivot.getWorldPosition();
      return { dist: Math.sqrt((plWP[0]-sWP[0])**2 + (plWP[1]-sWP[1])**2 + (plWP[2]-sWP[2])**2) / 100,
               targetWP: plWP };
    }
  }

  const results = [];
  const stepsPerOrbit = 360;

  for (let orbit = 0; orbit < orbitsToSample; orbit++) {
    const orbitStartJD = jdStart + orbit * orbitSpacing;
    let minDist = Infinity, minJD = orbitStartJD;

    for (let i = 0; i < stepsPerOrbit; i++) {
      const jd = orbitStartJD + (i / stepsPerOrbit) * periodDays;
      const pos = sDay * (jd - C.startmodelJD);
      sg.moveModel(graph, pos);
      const { dist } = computeDist();
      if (dist < minDist) { minDist = dist; minJD = jd; }
    }

    // At closest approach, get RA
    const pos = sDay * (minJD - C.startmodelJD);
    sg.moveModel(graph, pos);
    const { targetWP } = computeDist();
    const local = graph.earthNodes.rotAxis.worldToLocal(targetWP[0], targetWP[1], targetWP[2]);
    const ra = ((Math.atan2(local[0], local[2]) * 180 / Math.PI) % 360 + 360) % 360;

    const year = C.startmodelYear + (minJD - C.startmodelJD) / C.meanSolarYearDays;
    results.push({ year, periDist: minDist, periRA: ra, jd: minJD });
  }

  sg._invalidateGraph();
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// BASELINE: RA/Dec errors at reference dates
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute model RA/Dec at reference dates and compare against JPL.
 * For planets: uses reference-data.json. For sun/moon: uses custom refDates
 * (array of {jd, ra, dec} in degrees), which can be pre-fetched from JPL.
 *
 * @param {string} target - planet name, 'sun', or 'moon'
 * @param {Object} [overrides] - optional parameter overrides
 * @param {Array} [refDates] - custom reference dates [{jd, ra, dec, weight?, label?}]
 * @returns {Object} { target, entries, rmsRA, rmsDec, rmsTotal, maxRA, maxDec }
 */
function baseline(target, overrides, refDates) {
  const fn = () => {
    let valid;

    if (refDates) {
      // Use provided reference dates (for sun/moon or custom sets)
      valid = refDates.map(r => ({
        jd: r.jd, ra: r.ra, dec: r.dec,
        weight: r.weight || 1,
        label: r.label || '',
        tier: r.tier || 'custom',
        calendarYear: r.year || C.startmodelYear + (r.jd - C.startmodelJD) / C.meanSolarYearDays,
        _raDeg: true, // flag: RA is already in degrees
      }));
    } else {
      // Load from reference-data.json (planets)
      const refData = JSON.parse(fs.readFileSync(REF_PATH, 'utf-8'));
      const entries = refData.planets[target];
      if (!entries || entries.length === 0) {
        throw new Error(`No reference data for ${target}. Use 'baseline-jpl' command to fetch from JPL first.`);
      }
      valid = entries.filter(e => e.ra != null && e.dec != null && e.weight > 0);
    }

    const results = [];
    let sumRA2 = 0, sumDec2 = 0, totalWeight = 0;
    let maxRAErr = 0, maxDecErr = 0;

    for (const ref of valid) {
      const result = sg.computePlanetPosition(target, ref.jd);
      const modelRA = sg.thetaToRaDeg(result.ra);
      const modelDec = sg.phiToDecDeg(result.dec);

      // Reference RA: may be in hours (number) or degrees with °
      let refRA;
      if (ref._raDeg) {
        refRA = ref.ra; // already in degrees
      } else {
        refRA = parseFloat(ref.ra);
        if (typeof ref.ra === 'string' && !ref.ra.includes('°')) {
          refRA = refRA * 15; // hours to degrees
        }
      }
      let refDec = parseFloat(ref.dec);

      // Apply IAU precession: convert J2000/ICRF reference to of-date frame
      // Our model computes in the of-date equatorial frame (precessing equator),
      // but JPL returns fixed J2000/ICRF coordinates. The difference is ~50"/yr.
      const ofDate = j2000ToOfDate(refRA, refDec, ref.jd);
      refRA = ofDate.ra;
      refDec = ofDate.dec;

      // Angular difference (handle wrap-around)
      let dRA = modelRA - refRA;
      if (dRA > 180) dRA -= 360;
      if (dRA < -180) dRA += 360;
      const dDec = modelDec - refDec;

      const w = ref.weight || 1;
      sumRA2 += dRA * dRA * w;
      sumDec2 += dDec * dDec * w;
      totalWeight += w;

      if (Math.abs(dRA) > Math.abs(maxRAErr)) maxRAErr = dRA;
      if (Math.abs(dDec) > Math.abs(maxDecErr)) maxDecErr = dDec;

      results.push({
        jd: ref.jd,
        year: ref.calendarYear || ref.year || C.startmodelYear + (ref.jd - C.startmodelJD) / C.meanSolarYearDays,
        label: ref.label,
        tier: ref.tier,
        weight: w,
        refRA, refDec,
        modelRA, modelDec,
        dRA, dDec,
        distAU: result.distAU,
      });
    }

    const rmsRA = Math.sqrt(sumRA2 / totalWeight);
    const rmsDec = Math.sqrt(sumDec2 / totalWeight);
    const rmsTotal = Math.sqrt((sumRA2 + sumDec2) / totalWeight);

    return { target, entries: results, rmsRA, rmsDec, rmsTotal, maxRA: maxRAErr, maxDec: maxDecErr };
  };

  if (overrides && Object.keys(overrides).length > 0) {
    return withOverrides(target, overrides, fn);
  }
  return fn();
}

/**
 * Generate default reference dates for baseline testing.
 * Spans 2000-2025 at ~yearly intervals.
 *
 * @returns {number[]} array of Julian Day numbers
 */
function defaultReferenceDates() {
  const dates = [];
  // Winter (perihelion-season) dates — half-integer model years → Jan 3 each year
  for (let y = 2000; y <= 2025; y++) {
    dates.push(C.startmodelJD + (y - C.startmodelYear) * C.meanSolarYearDays);
  }
  // Summer (solstice-season) dates — integer model years → June 21 each year
  // These give the optimizer signal around the June solstice so correctionSun
  // converges to the value that satisfies both perihelion-season and solstice timing.
  for (let y = 2000; y <= 2025; y++) {
    dates.push(C.startmodelJD + (y - 2000) * C.meanSolarYearDays);
  }
  dates.sort((a, b) => a - b);
  return dates;
}

// ═══════════════════════════════════════════════════════════════════════════
// SENSITIVITY SCAN — Single-parameter sweep
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sweep one parameter across a range, measuring error at each step.
 *
 * @param {string} planet - planet name
 * @param {string} paramName - parameter to sweep
 * @param {number} lo - lower bound
 * @param {number} hi - upper bound
 * @param {number} [steps=100] - number of steps
 * @param {Array} [refDates] - custom reference dates for sun/moon
 * @returns {Object} { paramName, current, steps: [{value, rmsTotal}], bestValue, bestError }
 */
function sensitivityScan(planet, paramName, lo, hi, steps = 100, refDates) {
  const accessors = getParamAccessors(planet);
  if (!accessors[paramName]) throw new Error(`Unknown parameter: ${paramName}`);
  const current = accessors[paramName].get();

  // Auto-load JPL reference dates for sun/moon if not provided
  if (!refDates && (planet === 'sun' || planet === 'moon')) {
    refDates = loadJPLRefDates(planet);
  }

  const results = [];
  let bestVal = current, bestErr = Infinity;

  for (let i = 0; i <= steps; i++) {
    const value = lo + (hi - lo) * (i / steps);
    const overrides = { [paramName]: value };
    const bl = baseline(planet, overrides, refDates);

    results.push({ value, rmsTotal: bl.rmsTotal, rmsRA: bl.rmsRA, rmsDec: bl.rmsDec });
    if (bl.rmsTotal < bestErr) {
      bestErr = bl.rmsTotal;
      bestVal = value;
    }
  }

  return { paramName, current, steps: results, bestValue: bestVal, bestError: bestErr };
}

// ═══════════════════════════════════════════════════════════════════════════
// NELDER-MEAD SIMPLEX OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Multi-parameter optimization using Nelder-Mead simplex method.
 *
 * @param {string} planet - planet name
 * @param {string[]} paramNames - parameters to optimize
 * @param {Object} [options]
 * @param {number} [options.maxIter=500] - maximum iterations
 * @param {number} [options.tol=1e-8] - convergence tolerance
 * @param {number[]} [options.initialScale] - initial simplex scale per param
 * @param {Array} [options.refDates] - custom reference dates for sun/moon
 * @returns {Object} { params, values, initialError, finalError, iterations }
 */
function nelderMead(planet, paramNames, options = {}) {
  const { maxIter = 500, tol = 1e-8, initialScale, startDateWeight = 0 } = options;
  let { refDates } = options;

  // For Sun: four parameters are DERIVED (solved analytically, not free Nelder-Mead params):
  //   eccentricityBase      → perihelion longitude (barycenter.RA = 102.947° at J2000)
  //   eccentricityAmplitude → base + e(J2000) = 0.01671022
  //   earthInvPlaneInclinationAmplitude → obliquity rate = IAU -46.836769"/cy (bisection)
  //   earthtiltMean         → obliquity at J2000 = IAU 23.439291° (bisection)
  if (planet === 'sun') {
    const derived = ['eccentricityBase', 'eccentricityAmplitude',
                     'earthInvPlaneInclinationAmplitude', 'earthtiltMean'];
    const removed = paramNames.filter(p => derived.includes(p));
    if (removed.length > 0) {
      console.warn(`[optimizer] Sun: removing derived params from free list: ${removed.join(', ')}`);
      console.warn(`            eccentricityBase  → derived from perihelion longitude (barycenter.RA = 102.947°)`);
      console.warn(`            eccentricityAmplitude → derived from base + e(J2000) = 0.01671022`);
      console.warn(`            earthInvPlaneInclinationAmplitude → derived from IAU obliquity rate -46.836769"/cy`);
      console.warn(`            earthtiltMean → derived from IAU obliquity at J2000 = 23.439291°`);
      paramNames = paramNames.filter(p => !derived.includes(p));
    }

    // Iterative solver: eccentricityBase, obliquity, and perihelion longitude are coupled.
    // Changing base shifts the geometry → obliquity measurement shifts → re-solve obliquity.
    // Iterate until all constraints converge simultaneously.
    const targetRA = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
    const MAX_ITER = 10;
    const RA_TOL = 0.0001; // degrees (~0.36 arcsec)

    for (let iter = 1; iter <= MAX_ITER; iter++) {
      // 1. Solve obliquity rate → earthInvPlaneInclinationAmplitude
      const solvedAmpl = solveAmplitudeForObliquityRate();
      C.earthInvPlaneInclinationAmplitude = solvedAmpl;
      recomputeInclinationDerived();

      // 2. Solve obliquity at J2000 → earthtiltMean
      const solvedTilt = solveEarthtiltMeanForObliquity();
      C.earthtiltMean = solvedTilt;
      recomputeInclinationDerived();
      sg._invalidateGraph();

      // 3. Derive eccentricityAmplitude from current base + e(J2000) constraint
      const solvedAmp = solveAmplitudeForJ2000(C.eccentricityBase);
      if (solvedAmp !== null) {
        C.eccentricityAmplitude = solvedAmp;
        recomputeEccentricityDerived();
        sg._invalidateGraph();
      }

      // 4. Measure perihelion longitude
      const currentRA = computePerihelionRA();
      const raErr = currentRA - targetRA;

      console.warn(`[optimizer] Sun iter ${iter}: base=${C.eccentricityBase.toFixed(8)} amp=${C.eccentricityAmplitude.toFixed(10)} RA=${currentRA.toFixed(6)}° (target=${targetRA}°, err=${(raErr*3600).toFixed(1)}" ) tilt=${solvedTilt.toFixed(8)} inclAmpl=${solvedAmpl.toFixed(8)}`);

      if (Math.abs(raErr) < RA_TOL) {
        console.warn(`[optimizer] Sun: converged at iter ${iter} — perihelion RA within ${(raErr*3600).toFixed(1)}" of target`);
        break;
      }

      // 5. Adjust eccentricityBase to close the gap
      // RA increases monotonically with base — bisect around current value
      const step = 0.0005; // search range around current base
      let lo = Math.max(0.001, C.eccentricityBase - step);
      let hi = Math.min(C.ASTRO_REFERENCE.earthEccentricityJ2000 - 1e-6, C.eccentricityBase + step);

      for (let bi = 0; bi < 40; bi++) {
        const mid = (lo + hi) / 2;
        const amp = solveAmplitudeForJ2000(mid);
        if (amp === null) { lo = mid; continue; }
        C.eccentricityBase = mid;
        C.eccentricityAmplitude = amp;
        recomputeEccentricityDerived();
        sg._invalidateGraph();
        const midRA = computePerihelionRA();
        if (midRA < targetRA) lo = mid; else hi = mid;
        if (hi - lo < 1e-10) break;
      }
      // Apply the converged base
      const newBase = (lo + hi) / 2;
      const newAmp = solveAmplitudeForJ2000(newBase);
      C.eccentricityBase = newBase;
      C.eccentricityAmplitude = newAmp;
      recomputeEccentricityDerived();
      sg._invalidateGraph();
    }

    console.warn(`[optimizer] Sun: final eccentricityBase = ${C.eccentricityBase.toFixed(8)}`);
    console.warn(`            eccentricityAmplitude = ${C.eccentricityAmplitude.toFixed(10)}`);
    console.warn(`            earthtiltMean = ${C.earthtiltMean.toFixed(8)}`);
    console.warn(`            earthInvPlaneInclinationAmplitude = ${C.earthInvPlaneInclinationAmplitude.toFixed(8)}`);
  }

  // For planets (not sun/moon): angleCorrection is DERIVED from longitudePerihelion.
  // Solve it analytically before NM so the optimizer never sees it as a free parameter.
  if (planet !== 'sun' && planet !== 'moon') {
    const derived = ['angleCorrection'];
    const removed = paramNames.filter(p => derived.includes(p));
    if (removed.length > 0) {
      console.warn(`[optimizer] ${planet}: removing derived params from free list: ${removed.join(', ')}`);
      paramNames = paramNames.filter(p => !derived.includes(p));
    }
    console.warn(`[optimizer] ${planet}: solving angleCorrection for longitudePerihelion = ${C.planets[planet].longitudePerihelion}°...`);
    const solvedAC = solveAngleCorrectionForPerihelion(planet);
    C.planets[planet].angleCorrection = solvedAC;
    sg._invalidateGraph();
    console.warn(`            → angleCorrection = ${solvedAC.toFixed(8)}`);
  }

  const n = paramNames.length;
  const accessors = getParamAccessors(planet);
  const initial = paramNames.map(p => accessors[p].get());

  // Auto-load JPL reference dates for sun/moon if not provided
  if (!refDates && (planet === 'sun' || planet === 'moon')) {
    refDates = loadJPLRefDates(planet);
  }

  // Default scale: 1% of current value or 0.1 if near zero
  // Default scale: 2% of current value, minimum 0.001.
  // Always relative so small parameters (like eccentricityBase ≈ 0.015) don't get
  // perturbed into physically invalid territory (old rule used flat 0.1 for |v| < 1).
  const scale = initialScale || initial.map(v => Math.max(Math.abs(v) * 0.02, 0.001));


  // Parameter bounds: restrict startpos search to ±10° of initial value.
  // Inner planets (Mercury, Venus) have two local minima for startpos
  // separated by ~10° — the near and far side of the orbit as seen from Earth.
  // We want the near-side solution (closest approach).
  const bounds = {};
  for (let i = 0; i < n; i++) {
    if (paramNames[i] === 'startpos') {
      bounds[i] = { min: initial[i] - 10, max: initial[i] + 10 };
    }
  }

  // Objective function
  function objective(x) {
    // Apply bounds penalty — large cost for out-of-bounds parameters
    for (const [idx, b] of Object.entries(bounds)) {
      if (x[idx] < b.min || x[idx] > b.max) return 1e6;
    }
    const overrides = {};
    for (let i = 0; i < n; i++) overrides[paramNames[i]] = x[i];
    const bl = baseline(planet, overrides, refDates);
    let cost = bl.rmsTotal;
    // Penalize start-date RA drift if weight > 0
    if (startDateWeight > 0) {
      const e0 = bl.entries.find(e => Math.abs(e.year - 2000.5) < 1);
      if (e0) cost += startDateWeight * Math.abs(e0.dRA);
    }
    // earthInvPlaneInclinationAmplitude and earthtiltMean are solved analytically before NM
    // (exact bisection for IAU rate and obliquity). No penalty needed here.
    return cost;
  }

  // Build initial simplex (n+1 vertices)
  const simplex = [{ x: [...initial], f: objective(initial) }];
  for (let i = 0; i < n; i++) {
    const xi = [...initial];
    xi[i] += scale[i];
    simplex.push({ x: xi, f: objective(xi) });
  }

  const initialError = simplex[0].f;

  // Nelder-Mead coefficients
  const alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5;

  let iter = 0;
  for (; iter < maxIter; iter++) {
    // Sort by function value
    simplex.sort((a, b) => a.f - b.f);

    // Check convergence
    const fRange = simplex[n].f - simplex[0].f;
    if (fRange < tol) break;

    // Centroid of all points except worst
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) centroid[j] += simplex[i].x[j];
    }
    for (let j = 0; j < n; j++) centroid[j] /= n;

    // Reflection
    const xr = centroid.map((c, j) => c + alpha * (c - simplex[n].x[j]));
    const fr = objective(xr);

    if (fr < simplex[0].f) {
      // Expansion
      const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
      const fe = objective(xe);
      if (fe < fr) {
        simplex[n] = { x: xe, f: fe };
      } else {
        simplex[n] = { x: xr, f: fr };
      }
    } else if (fr < simplex[n - 1].f) {
      simplex[n] = { x: xr, f: fr };
    } else {
      // Contraction
      const xc = centroid.map((c, j) => c + rho * (simplex[n].x[j] - c));
      const fc = objective(xc);
      if (fc < simplex[n].f) {
        simplex[n] = { x: xc, f: fc };
      } else {
        // Shrink
        for (let i = 1; i <= n; i++) {
          for (let j = 0; j < n; j++) {
            simplex[i].x[j] = simplex[0].x[j] + sigma * (simplex[i].x[j] - simplex[0].x[j]);
          }
          simplex[i].f = objective(simplex[i].x);
        }
      }
    }
  }

  simplex.sort((a, b) => a.f - b.f);
  const best = simplex[0];

  const result = {};
  for (let i = 0; i < n; i++) result[paramNames[i]] = best.x[i];

  // For planets (not sun/moon): report solved angleCorrection.
  let planetDerived = null;
  if (planet !== 'sun' && planet !== 'moon') {
    const p = C.planets[planet];
    const achievedRA = computePlanetPerihelionRA(planet);
    const target = p.longitudePerihelion;
    const diff = ((achievedRA - target) + 540) % 360 - 180;
    planetDerived = {
      angleCorrection: p.angleCorrection,
      perihelionRA: { achieved: achievedRA, target, diff },
    };
  }

  // For Sun: verify all derived values after optimization.
  let sunDerived = null;
  if (planet === 'sun') {
    const optBase = C.eccentricityBase;
    const optAmp = C.eccentricityAmplitude;
    const eJ2000 = computeEccentricityJ2000Scene(optAmp);

    // Perihelion longitude verification: measure actual RA at J2000
    const perihelionRA = computePerihelionRA();
    const perihelionTarget = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;

    // Obliquity value + rate check — measure with optimized NM params applied.
    const solsticeJ2000 = C.ASTRO_REFERENCE.juneSolstice2000_JD;
    const solsticeJ2100 = solsticeJ2000 + C.tropicalCenturyDays;
    const [modelObliqDeg, modelObliqRateArcsecCy] = withOverrides(planet, result, () => {
      sg._invalidateGraph();
      const d0 = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2000).dec);
      const d1 = sg.phiToDecDeg(sg.computePlanetPosition('sun', solsticeJ2100).dec);
      sg._invalidateGraph();
      return [d0, (d1 - d0) * 3600];
    });

    sunDerived = {
      eccentricityBase: optBase,
      eccentricityAmplitude: optAmp,
      eJ2000Achieved: eJ2000,
      eJ2000Target: C.ASTRO_REFERENCE.earthEccentricityJ2000,
      perihelionRA: {
        raAchieved: perihelionRA,
        raTarget: perihelionTarget,
        diffArcsec: (perihelionRA - perihelionTarget) * 3600,
      },
      obliquity: {
        modelDeg: modelObliqDeg,
        iauDeg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
        diffArcsec: (modelObliqDeg - C.ASTRO_REFERENCE.obliquityJ2000_deg) * 3600,
        earthtiltMean: C.earthtiltMean,
        earthInvPlaneInclinationAmplitude: C.earthInvPlaneInclinationAmplitude,
        earthInvPlaneInclinationMean: C.earthInvPlaneInclinationMean,
      },
      obliquityRate: {
        modelArcsecCy: modelObliqRateArcsecCy,
        iauArcsecCy: C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury,
        diffArcsecCy: modelObliqRateArcsecCy - C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury,
      },
    };
  }

  return {
    planet,
    params: paramNames,
    initialValues: Object.fromEntries(paramNames.map((p, i) => [p, initial[i]])),
    optimizedValues: result,
    initialError,
    finalError: best.f,
    improvement: ((initialError - best.f) / initialError * 100).toFixed(2) + '%',
    iterations: iter,
    sunDerived,
    planetDerived,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Diagnostics
  scanOrbit,
  decomposeLayerPositions,
  trackPerihelion,

  // Baseline
  baseline,
  defaultReferenceDates,

  // Optimization
  sensitivityScan,
  nelderMead,

  // Utility
  withOverrides,
  loadJPLRefDates,
  getParamAccessors,
};
