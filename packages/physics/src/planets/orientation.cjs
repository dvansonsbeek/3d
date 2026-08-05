/**
 * Planet orientation channel — THE shared implementation (Phase 8.3, L4):
 * invariable-plane inclination, ascending nodes, and the scene ecliptic
 * inclination (the balanced-year dot-product form canonicalized at S-P4).
 *
 * Time is EXPLICIT here (yearsSinceBalanced / calendar year). A finding
 * from extraction, preserved not fixed: the browser's
 * computePlanetInvPlaneInclinationDynamic(planet, currentYear) IGNORED its
 * currentYear parameter and read the live scene JD — the 8.3-0 fixtures
 * recorded identical values at every probed epoch. The browser wrapper
 * keeps that scene-coupling (visibly, at the wrapper); the Node engine
 * honors the year as before. Unifying them is a measured decision for the
 * factory layer, not a silent side effect.
 *
 * Two ascending-node conventions exist and BOTH are quantities (the S-P4
 * lesson): the year-2000-anchored linear node here
 * (ascendingNodeInvPlaneLinearAt — the node-integrator/dashboard mirror)
 * and the balanced-year −8H/N node inside the scene tilt
 * (eclipticInclinationFromBalanced). Do not merge them.
 */

'use strict';

/**
 * Invariable-plane inclination at explicit time (browser form): the ICRF
 * perihelion-linked oscillation i(t) = mean + s·A·cos(ϖ_ICRF(t) − anchor).
 * @param {{ key?: string, isEarth?: boolean,
 *   invPlaneInclinationJ2000: number, invPlaneInclinationMean: number,
 *   invPlaneInclinationAmplitude: number, inclinationCycleAnchor: number,
 *   longitudePerihelion: number, perihelionEclipticYears: number,
 *   antiPhase?: boolean }} body
 * @param {number} yearsSinceBalanced
 * @param {{ H: number, yearsFromBalancedToJ2000: number }} env
 * @returns {number} degrees */
function invPlaneInclinationAt(body, yearsSinceBalanced, env) {
  const iJ2000 = body.invPlaneInclinationJ2000;
  const amplitude = body.invPlaneInclinationAmplitude;
  if (iJ2000 === undefined || amplitude === undefined) return iJ2000 || 0;
  if (amplitude === 0) return iJ2000;

  // ICRF period: Earth = H/3 directly; others = 1/(1/eclP − 1/(H/13)).
  const genPrecRate = 1 / (env.H / 13);
  const icrfPeriod = body.isEarth
    ? env.H / 3
    : 1 / (1 / body.perihelionEclipticYears - genPrecRate);
  const icrfRate = 360 / icrfPeriod;

  const periAtBalanced = body.longitudePerihelion - icrfRate * env.yearsFromBalancedToJ2000;
  const periCurrent = periAtBalanced + icrfRate * yearsSinceBalanced;
  const currentPhaseRad = (periCurrent - body.inclinationCycleAnchor) * Math.PI / 180;
  const antiPhaseSign = body.antiPhase ? -1 : 1;
  return body.invPlaneInclinationMean + antiPhaseSign * amplitude * Math.cos(currentPhaseRad);
}

/**
 * Ascending node on the invariable plane — the LINEAR year-2000-anchored
 * convention (node-integrator/dashboard; see the header).
 * @param {{ ascendingNodeInvPlane?: number, ascendingNodePeriod?: number,
 *   perihelionEclipticYears: number }} body
 * @param {number} year @returns {number} degrees 0–360 */
function ascendingNodeInvPlaneLinearAt(body, year) {
  if (!body.ascendingNodeInvPlane) return 0;
  const period = body.ascendingNodePeriod || body.perihelionEclipticYears;
  const rate = 360 / period;
  return ((body.ascendingNodeInvPlane + rate * (year - 2000)) % 360 + 360) % 360;
}

/**
 * Scene ecliptic inclination — normal-vector dot product, balanced-year
 * anchoring, planet Ω on the −8H/N assignment (canonicalized at S-P4; the
 * mirror of src/script.js updateDynamicInclinations).
 * @param {{ perihelionEclipticYears: number, longitudePerihelion: number,
 *   inclinationCycleAnchor: number, antiPhase?: boolean,
 *   invPlaneInclinationMean: number, invPlaneInclinationAmplitude: number,
 *   ascendingNodeInvPlane: number, ascendingNodeCyclesIn8H?: number }} body
 * @param {{ invPlanePrecessionYears: number, inclinationMean: number,
 *   inclinationAmplitude: number, ascendingNodeInvPlane: number }} earth
 * @param {number} yearsSinceBalanced
 * @param {{ H: number, yearsFromBalancedToJ2000: number }} env
 * @returns {number} degrees */
function eclipticInclinationFromBalanced(body, earth, yearsSinceBalanced, env) {
  const d2r = Math.PI / 180;
  const genPrecRate = 1 / (env.H / 13);

  // --- Earth's orbital plane ---
  const earthPhaseRad = (yearsSinceBalanced / earth.invPlanePrecessionYears) * 2 * Math.PI;
  const earthI = (earth.inclinationMean
    - earth.inclinationAmplitude * Math.cos(earthPhaseRad)) * d2r;

  // Earth Ω regresses at -H/5 (ecliptic precession rate), NOT at H/3.
  const earthAscNodePeriod = -env.H / 5;
  const earthOmegaRate = 360 / earthAscNodePeriod;
  const earthOmega = (earth.ascendingNodeInvPlane
    - earthOmegaRate * env.yearsFromBalancedToJ2000
    + earthOmegaRate * yearsSinceBalanced) * d2r;

  // --- Planet's orbital plane ---
  const eclRate = 1 / body.perihelionEclipticYears;
  const icrfRate = (eclRate - genPrecRate) * 360;  // deg/yr
  const periICRFDeg = body.longitudePerihelion
    - icrfRate * env.yearsFromBalancedToJ2000
    + icrfRate * yearsSinceBalanced;

  const planetPhaseDeg = periICRFDeg - body.inclinationCycleAnchor;
  const antiPhaseSign = body.antiPhase ? -1 : 1;
  const planetI = (body.invPlaneInclinationMean
    + antiPhaseSign * body.invPlaneInclinationAmplitude * Math.cos(planetPhaseDeg * d2r)) * d2r;

  // Planet Ω advances at the asc-node period (-8H/N), NOT the ecliptic
  // perihelion period — they are different angles.
  const planetAscNodePeriod = body.ascendingNodeCyclesIn8H
    ? -(8 * env.H) / body.ascendingNodeCyclesIn8H
    : body.perihelionEclipticYears;
  const planetOmegaRate = 360 / planetAscNodePeriod;
  const planetOmegaDeg = body.ascendingNodeInvPlane
    - planetOmegaRate * env.yearsFromBalancedToJ2000
    + planetOmegaRate * yearsSinceBalanced;
  const planetOmega = planetOmegaDeg * d2r;

  // --- Dot product of normal vectors → angle between orbital planes ---
  const eNx = Math.sin(earthI) * Math.sin(earthOmega);
  const eNy = Math.sin(earthI) * Math.cos(earthOmega);
  const eNz = Math.cos(earthI);

  const pNx = Math.sin(planetI) * Math.sin(planetOmega);
  const pNy = Math.sin(planetI) * Math.cos(planetOmega);
  const pNz = Math.cos(planetI);

  const cosAngle = eNx * pNx + eNy * pNy + eNz * pNz;
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

module.exports = { invPlaneInclinationAt, ascendingNodeInvPlaneLinearAt, eclipticInclinationFromBalanced };
