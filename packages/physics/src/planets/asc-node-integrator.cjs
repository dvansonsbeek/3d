/**
 * Dynamic ascending node — rate-based segment integration (Phase 8.3, L5).
 *
 * dΩ/dε = −sin(Ω)/tan(i), integrated over obliquity change with segment
 * handling at obliquity extrema and Earth-inclination crossovers (the
 * inclination DIRECTION flips the sign of the effect per segment).
 *
 * Extracted from tools/lib/orbital-engine.js
 * calculateDynamicAscendingNodeFromTilts (itself the mirror of the
 * browser's 6-arg variant — S-P5). The BROWSER variant remains engine-side
 * this slice: neither copy is fixture-pinned, so the signature unification
 * is deferred to the factory pass, WITH probes first (recorded follow-up).
 *
 * §2h BOUNDARY: this module takes {ascendingNodeDeg, inclinationDeg} — the
 * Tychosium `orbitTilta/orbitTiltb` scheme names never enter the package;
 * the engines own the atan2/hypot decomposition at their edge.
 *
 * All time-dependent inputs are INJECTED per call: the engine's obliquity
 * and Earth-inclination evaluators, the precomputed obliquity-extrema
 * lookup, the inclination-crossing finder, and (optionally) the per-planet
 * dynamic ecliptic inclination.
 */

'use strict';

/**
 * @param {{ ascendingNodeDeg: number, inclinationDeg: number }} tilt —
 *   static node and inclination (engine-decomposed from its scene scheme)
 * @param {number} currentYear
 * @param {{
 *   obliquityAt: (year: number) => number,
 *   earthInclinationAt: (year: number) => number,
 *   obliquityExtremaInRange: (yearMin: number, yearMax: number) => number[],
 *   inclinationCrossingsInRange: (inclinationDeg: number, yearMin: number, yearMax: number) => number[],
 *   eclipticInclinationAt: ((year: number) => number) | null,
 *   earthInclinationMeanDeg: number,
 *   earthInclinationAmplitudeDeg: number,
 *   epochYear?: number,
 * }} deps — eclipticInclinationAt non-null enables the dynamic-inclination
 *   crossover search and per-segment rates (the planetName path).
 * @returns {number} dynamic ascending node longitude, degrees 0–360
 */
function integrateAscendingNode(tilt, currentYear, deps) {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  const staticOmega = ((tilt.ascendingNodeDeg % 360) + 360) % 360;
  const planetInclination = tilt.inclinationDeg;

  if (planetInclination < 1e-6) return staticOmega;

  const i = planetInclination * DEG2RAD;
  const OmegaRad = staticOmega * DEG2RAD;
  const tanI = Math.tan(i);
  if (Math.abs(tanI) < 1e-10) return staticOmega;

  const sinOmega = Math.sin(OmegaRad);
  const EPOCH_YEAR = deps.epochYear !== undefined ? deps.epochYear : 2000;

  /** @param {number} fromYear @param {number} toYear @returns {number} */
  const integrateEffect = (fromYear, toYear) => {
    if (Math.abs(toYear - fromYear) < 0.1) return 0;

    const yearMin = Math.min(fromYear, toYear);
    const yearMax = Math.max(fromYear, toYear);
    const dir = toYear >= fromYear ? 1 : -1;   // integration direction — signs the total

    /** @type {number[]} */
    let criticalYears = [yearMin, yearMax];

    criticalYears.push(...deps.obliquityExtremaInRange(yearMin, yearMax));

    // Find ALL inclination crossings
    const minEarthIncl = deps.earthInclinationMeanDeg - deps.earthInclinationAmplitudeDeg;
    const maxEarthIncl = deps.earthInclinationMeanDeg + deps.earthInclinationAmplitudeDeg;

    // With a dynamic ecliptic inclination the planet can enter Earth's range
    // even if the static value is outside — always search for crossovers.
    if (deps.eclipticInclinationAt || (planetInclination >= minEarthIncl && planetInclination <= maxEarthIncl)) {
      const crossIncl = deps.eclipticInclinationAt
        ? deps.eclipticInclinationAt((yearMin + yearMax) / 2)
        : planetInclination;
      criticalYears.push(...deps.inclinationCrossingsInRange(crossIncl, yearMin, yearMax));
    }

    criticalYears = [...new Set(criticalYears)].sort((a, b) => a - b);

    // Integrate over segments
    let effect = 0;
    for (let idx = 0; idx < criticalYears.length - 1; idx++) {
      const segStart = criticalYears[idx];
      const segEnd = criticalYears[idx + 1];

      const oblStart = deps.obliquityAt(segStart);
      const oblEnd = deps.obliquityAt(segEnd);
      const deltaObl = (oblEnd - oblStart) * DEG2RAD;

      const midYear = (segStart + segEnd) / 2;
      const earthInclAtMid = deps.earthInclinationAt(midYear);

      const dynIncl = deps.eclipticInclinationAt
        ? deps.eclipticInclinationAt(midYear)
        : planetInclination;
      const inclDirection = earthInclAtMid > dynIncl ? 1 : -1;
      const dynTanI = Math.tan(dynIncl * DEG2RAD);
      if (Math.abs(dynTanI) < 1e-10) continue; // skip near-zero inclination
      const segRate = -sinOmega / dynTanI;

      effect += segRate * inclDirection * deltaObl * RAD2DEG;
    }
    return effect * dir;
  };

  const effectFromEpoch = integrateEffect(EPOCH_YEAR, currentYear);

  let newOmega = staticOmega + effectFromEpoch;
  return ((newOmega % 360) + 360) % 360;
}

module.exports = { integrateAscendingNode };
