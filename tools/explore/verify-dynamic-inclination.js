#!/usr/bin/env node
/**
 * Verify that dynamic ecliptic inclination matches J2000 static values at J2000 epoch.
 */
const C = require('../lib/constants.js');
const d2r = Math.PI / 180;

const ysb = C.yearsFromBalancedToJ2000;

function computeDynamicEclipticInclination(key, yearsSinceBalanced) {
  const p = C.planets[key];
  const genPrecRate = 1 / (C.H / 13);

  // Earth's orbital plane: inclination oscillates with H/3 (ICRF perihelion period);
  // ascending node Ω regresses at -H/5 (the ecliptic precession rate).
  const earthPrecYears = C.ASTRO_REFERENCE.earthInvPlanePrecessionYears;
  const earthPhaseRad = (yearsSinceBalanced / earthPrecYears) * 2 * Math.PI;
  const earthI = (C.earthInvPlaneInclinationMean - C.earthInvPlaneInclinationAmplitude * Math.cos(earthPhaseRad)) * d2r;
  const earthAscNodePeriod = -C.H / 5;
  const earthOmegaRate = 360 / earthAscNodePeriod;
  const earthOmega = (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane - earthOmegaRate * C.yearsFromBalancedToJ2000 + earthOmegaRate * yearsSinceBalanced) * d2r;

  // Planet inclination: driven by ICRF perihelion ϖ_ICRF advancing at the ICRF rate
  const eclRate = 1 / p.perihelionEclipticYears;
  const icrfRate = (eclRate - genPrecRate) * 360;  // deg/yr
  const periICRFDeg = p.longitudePerihelion - icrfRate * C.yearsFromBalancedToJ2000 + icrfRate * yearsSinceBalanced;
  const planetPhaseDeg = periICRFDeg - p.inclinationCycleAnchor;
  const antiSign = p.antiPhase ? -1 : 1;
  const planetI = (p.invPlaneInclinationMean + antiSign * p.invPlaneInclinationAmplitude * Math.cos(planetPhaseDeg * d2r)) * d2r;

  // Planet ascending node Ω: advances at the asc-node period (-8H/N), NOT the ICRF
  // perihelion or ecliptic perihelion period — these are different angles.
  const planetAscNodePeriod = p.ascendingNodeCyclesIn8H
    ? -(8 * C.H) / p.ascendingNodeCyclesIn8H
    : p.perihelionEclipticYears;
  const planetOmegaRate = 360 / planetAscNodePeriod;
  const planetOmegaDeg = p.ascendingNodeInvPlane - planetOmegaRate * C.yearsFromBalancedToJ2000 + planetOmegaRate * yearsSinceBalanced;
  const planetOmega = planetOmegaDeg * d2r;

  const eNx = Math.sin(earthI) * Math.sin(earthOmega);
  const eNy = Math.sin(earthI) * Math.cos(earthOmega);
  const eNz = Math.cos(earthI);
  const pNx = Math.sin(planetI) * Math.sin(planetOmega);
  const pNy = Math.sin(planetI) * Math.cos(planetOmega);
  const pNz = Math.cos(planetI);
  const cosAngle = eNx * pNx + eNy * pNy + eNz * pNz;
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

console.log('J2000 Ecliptic Inclination Validation:');
console.log('Planet    | Dynamic    | Static J2000 | Diff');
console.log('-'.repeat(55));
for (const key of Object.keys(C.planets)) {
  const p = C.planets[key];
  if (p.ascendingNodeInvPlane === undefined) continue;
  const dynamic = computeDynamicEclipticInclination(key, ysb);
  const staticVal = p.eclipticInclinationJ2000;
  const diff = dynamic - staticVal;
  console.log(`${key.padEnd(10)}| ${dynamic.toFixed(6).padStart(10)} | ${staticVal.toFixed(6).padStart(12)} | ${diff.toFixed(6).padStart(10)}`);
}
