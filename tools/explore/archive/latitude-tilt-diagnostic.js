#!/usr/bin/env node
/**
 * Diagnostic: trace the Y component through the scene graph to understand
 * why ecliptic latitude is nearly constant at opposition dates.
 *
 * Tests two configurations:
 *   1. Current: tilt on realPeri.container (above annual rotation)
 *   2. Fixed: tilt on planet.container (below annual rotation)
 */

const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');

const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

// Saturn opposition dates (JD)
const dates = [
  { label: 'Opp 2015', jd: 2457165.5 },
  { label: 'Opp 2017', jd: 2457919.5 },
  { label: 'Opp 2020', jd: 2459050.5 },
  { label: 'Opp 2024', jd: 2460561.5 },
];

const obliquity = C.ASTRO_REFERENCE.obliquityJ2000_deg;

function equatorialToEcliptic(raDeg, decDeg, obliquityDeg) {
  const eps = obliquityDeg * d2r;
  const a = raDeg * d2r, d = decDeg * d2r;
  const sinLam = Math.sin(a) * Math.cos(eps) + Math.tan(d) * Math.sin(eps);
  let lam = Math.atan2(sinLam, Math.cos(a)) * r2d;
  if (lam < 0) lam += 360;
  const sinBet = Math.sin(d) * Math.cos(eps) - Math.cos(d) * Math.sin(eps) * Math.sin(a);
  return { lon: lam, lat: Math.asin(sinBet) * r2d };
}

console.log('=== LATITUDE TILT DIAGNOSTIC ===\n');

// --- Test 1: Current setup (tilt on realPeri.container) ---
console.log('--- Config 1: Tilt on realPeri.container (CURRENT) ---');
console.log('Date      | Model beta | realPeri.container.rx | planet.container.rx | Combined angle');
console.log('----------+------------+----------------------+--------------------+--------------');

for (const { label, jd } of dates) {
  const pos = (jd - C.startmodelJD) / C.meanSolarYearDays;
  const result = sg.computePlanetPosition('saturn', jd);
  const raDeg = sg.thetaToRaDeg(result.ra);
  const decDeg = sg.phiToDecDeg(result.dec);
  const ecl = equatorialToEcliptic(raDeg, decDeg, obliquity);

  // Get internal state
  const graph = sg.buildSceneGraph();
  const sDay = 1 / C.meanSolarYearDays;
  const posVal = sDay * (jd - C.startmodelJD);
  sg.moveModel(graph, posVal);
  graph.root.updateWorldMatrix();

  const pm = graph.planetNodeMap.saturn;
  const realPeriRx = pm.realPeri.container.rx;
  const realPeriRz = pm.realPeri.container.rz;
  const planetRx = pm.planet.container.rx;
  const planetRz = pm.planet.container.rz;
  const realPeriOrbitRy = pm.realPeri.orbit.ry;
  const planetOrbitRy = pm.planet.orbit.ry;
  const combined = realPeriOrbitRy + planetOrbitRy;
  const combinedMod = ((combined % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  console.log(`${label} | ${ecl.lat.toFixed(4).padStart(10)} | rx=${(realPeriRx*r2d).toFixed(4).padStart(7)}° rz=${(realPeriRz*r2d).toFixed(4).padStart(7)}° | rx=${(planetRx*r2d).toFixed(4).padStart(7)}° | combined_mod=${(combinedMod*r2d).toFixed(2).padStart(7)}°`);
}

// --- Test 2: Move tilt to planet.container ---
console.log('\n--- Config 2: Tilt on planet.container (FIX) ---');
console.log('Date      | Model beta | planet.container.rx  | planet.orbit.ry mod');
console.log('----------+------------+---------------------+-------------------');

for (const { label, jd } of dates) {
  sg._invalidateGraph();
  const graph = sg.buildSceneGraph();

  // Move tilt from realPeri.container to planet.container
  const pm = graph.planetNodeMap.saturn;
  const pd = pm.sceneData;
  // Remove tilt from realPeri container
  pm.realPeri.container.rx = 0;
  pm.realPeri.container.rz = 0;
  // Add tilt to planet container
  pm.planet.container.rx = pd.realPeriTiltA * d2r;
  pm.planet.container.rz = pd.realPeriTiltB * d2r;

  const sDay = 1 / C.meanSolarYearDays;
  const posVal = sDay * (jd - C.startmodelJD);
  sg.moveModel(graph, posVal);

  // Re-apply tilt to planet container (moveModel may have overwritten realPeri.container)
  pm.realPeri.container.rx = 0;
  pm.realPeri.container.rz = 0;
  pm.planet.container.rx = pd.realPeriTiltA * d2r;
  pm.planet.container.rz = pd.realPeriTiltB * d2r;

  graph.root.updateWorldMatrix();

  // Get Earth frame
  const earthRotAxisWP = graph.earthNodes.rotAxis.getWorldPosition();
  const targetWP = pm.planet.pivot.getWorldPosition();
  const local = graph.earthNodes.rotAxis.worldToLocal(targetWP[0], targetWP[1], targetWP[2]);
  const r = Math.sqrt(local[0]*local[0] + local[1]*local[1] + local[2]*local[2]);
  const phi = Math.acos(Math.min(1, Math.max(-1, local[1] / r)));
  const theta = Math.atan2(local[0], local[2]);
  const raDeg = sg.thetaToRaDeg(theta);
  const decDeg = sg.phiToDecDeg(phi);
  const ecl = equatorialToEcliptic(raDeg, decDeg, obliquity);

  const planetOrbitRyMod = ((pm.planet.orbit.ry % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  console.log(`${label} | ${ecl.lat.toFixed(4).padStart(10)} | rx=${(pm.planet.container.rx*r2d).toFixed(4).padStart(7)}° rz=${(pm.planet.container.rz*r2d).toFixed(4).padStart(7)}° | ${(planetOrbitRyMod*r2d).toFixed(2).padStart(7)}°`);
}

sg._invalidateGraph();
