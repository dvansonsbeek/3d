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

const REF_PATH = path.join(__dirname, '..', '..', 'config', 'reference-data.json');
const CACHE_PATH = path.join(__dirname, '..', '..', 'config', 'jpl-cache.json');

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

// Map of parameter names to their location in the constants object
// Each entry: { get, set } functions
function getParamAccessors(target) {
  // Sun/Earth parameters
  if (target === 'sun') {
    return {
      correctionSun:        { get: () => C.correctionSun, set: v => { C.correctionSun = v; } },
      perihelionRefJD:      { get: () => C.perihelionRefJD, set: v => { C.perihelionRefJD = v; } },
      eccentricityBase:     { get: () => C.eccentricityBase, set: v => { C.eccentricityBase = v; } },
      eccentricityAmplitude:{ get: () => C.eccentricityAmplitude, set: v => { C.eccentricityAmplitude = v; } },
      earthRAAngle:         { get: () => C.earthRAAngle, set: v => { C.earthRAAngle = v; } },
      earthtiltMean:        { get: () => C.earthtiltMean, set: v => { C.earthtiltMean = v; } },
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
    // angleCorrection is DERIVED from orbital elements — never optimize
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
        year: ref.calendarYear,
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
  for (let y = 2000; y <= 2025; y++) {
    dates.push(C.startmodelJD + (y - C.startmodelYear) * C.meanSolarYearDays);
  }
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
  const n = paramNames.length;

  const accessors = getParamAccessors(planet);
  const initial = paramNames.map(p => accessors[p].get());

  // Auto-load JPL reference dates for sun/moon if not provided
  if (!refDates && (planet === 'sun' || planet === 'moon')) {
    refDates = loadJPLRefDates(planet);
  }

  // Default scale: 1% of current value or 0.1 if near zero
  const scale = initialScale || initial.map(v => Math.abs(v) > 1 ? Math.abs(v) * 0.01 : 0.1);

  // Objective function
  function objective(x) {
    const overrides = {};
    for (let i = 0; i < n; i++) overrides[paramNames[i]] = x[i];
    const bl = baseline(planet, overrides, refDates);
    let cost = bl.rmsTotal;
    // Penalize start-date RA drift if weight > 0
    if (startDateWeight > 0) {
      const e0 = bl.entries.find(e => Math.abs(e.year - 2000.5) < 1);
      if (e0) cost += startDateWeight * Math.abs(e0.dRA);
    }
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

  return {
    planet,
    params: paramNames,
    initialValues: Object.fromEntries(paramNames.map((p, i) => [p, initial[i]])),
    optimizedValues: result,
    initialError,
    finalError: best.f,
    improvement: ((initialError - best.f) / initialError * 100).toFixed(2) + '%',
    iterations: iter,
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
