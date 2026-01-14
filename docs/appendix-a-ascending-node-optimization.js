// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX A: ASCENDING NODE OPTIMIZATION (Numerical)
// ═══════════════════════════════════════════════════════════════════════════
//
// This script CALCULATES the optimal ascending node values that produce
// exact JPL J2000 ecliptic inclinations using numerical optimization.
//
// APPROACH: Brute-force search to find ascending nodes that minimize
// the error between calculated and target ecliptic inclinations.
//
// INPUTS (fixed):
//   - Planet's inclination to invariable plane (Souami & Souchay 2012)
//   - Earth's inclination to invariable plane at J2000
//   - Earth's ascending node (284.51° - Souami & Souchay 2012)
//   - JPL J2000 ecliptic inclination (target)
//
// OUTPUT (calculated):
//   - Optimal ascending node for each planet
//   - These become <planet>AscendingNodeInvPlaneVerified in script.js
//
// The optimization finds the ascending node Ω such that:
//   apparentEclipticInclination(Ω) = JPL_J2000_target
//
// Compare with Appendix B which derives the same values analytically.
//
// Run with: node appendix-a-ascending-node-optimization.js
// ═══════════════════════════════════════════════════════════════════════════

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE VALUES (at J2000)
// ═══════════════════════════════════════════════════════════════════════════

const earthConfig = {
  // Dynamic inclination at J2000 (from oscillation formula)
  inclJ2000: 1.57866663,
  // Earth's ascending node from Souami & Souchay (2012)
  ascNodeVerified: 284.51
};

// ═══════════════════════════════════════════════════════════════════════════
// J2000 ECLIPTIC INCLINATIONS (JPL targets - these MUST be matched exactly)
// Source: JPL Horizons J2000 elements
// ═══════════════════════════════════════════════════════════════════════════

const jplEclipticInclinationsJ2000 = {
  mercury: 7.00497902,
  venus: 3.39467605,
  mars: 1.84969142,
  jupiter: 1.30439695,
  saturn: 2.48599187,
  uranus: 0.77263783,
  neptune: 1.77004347,
  pluto: 17.14001
};

// ═══════════════════════════════════════════════════════════════════════════
// INVARIABLE PLANE INCLINATIONS (Souami & Souchay 2012)
// These are FIXED inputs - we don't change these
// ═══════════════════════════════════════════════════════════════════════════

const invPlaneInclinationsJ2000 = {
  mercury: 6.3472858,
  venus: 2.1545441,
  mars: 1.6311858,
  jupiter: 0.3219652,
  saturn: 0.9254704,
  uranus: 0.9946692,
  neptune: 0.7354155,
  pluto: 15.5639473
};

// ═══════════════════════════════════════════════════════════════════════════
// SOUAMI & SOUCHAY ORIGINAL ASCENDING NODES (starting points)
// ═══════════════════════════════════════════════════════════════════════════

const ascendingNodesSouamiSouchay = {
  mercury: 32.22,
  venus: 52.31,
  mars: 352.95,
  jupiter: 306.92,
  saturn: 122.27,
  uranus: 308.44,
  neptune: 189.28,
  pluto: 107.06
};

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the apparent ecliptic inclination of a planet
 * by computing the angle between orbital plane normals
 */
function calculateApparentEclipticInclination(planetIncl, planetAscNode, earthIncl, earthAscNode) {
  const pI = planetIncl * DEG2RAD;
  const pOmega = planetAscNode * DEG2RAD;
  const eI = earthIncl * DEG2RAD;
  const eOmega = earthAscNode * DEG2RAD;

  // Planet orbital plane normal
  const pnx = Math.sin(pI) * Math.sin(pOmega);
  const pny = Math.sin(pI) * Math.cos(pOmega);
  const pnz = Math.cos(pI);

  // Earth orbital plane normal (= ecliptic normal)
  const enx = Math.sin(eI) * Math.sin(eOmega);
  const eny = Math.sin(eI) * Math.cos(eOmega);
  const enz = Math.cos(eI);

  // Dot product gives cos(angle between planes)
  const dot = pnx * enx + pny * eny + pnz * enz;

  return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
}

/**
 * Find the optimal ascending node that produces the target ecliptic inclination
 * Uses binary search / Newton-Raphson hybrid approach
 */
function optimizeAscendingNode(planetIncl, targetEclipticIncl, earthIncl, earthAscNode, startNode) {
  // Search around the starting node
  let bestNode = startNode;
  let bestError = Infinity;

  // First: coarse search ±10° in 0.01° steps
  for (let delta = -10; delta <= 10; delta += 0.01) {
    const testNode = (startNode + delta + 360) % 360;
    const calcIncl = calculateApparentEclipticInclination(planetIncl, testNode, earthIncl, earthAscNode);
    const error = Math.abs(calcIncl - targetEclipticIncl);

    if (error < bestError) {
      bestError = error;
      bestNode = testNode;
    }
  }

  // Second: fine search around best ±0.1° in 0.0001° steps
  const fineStart = bestNode;
  for (let delta = -0.1; delta <= 0.1; delta += 0.0001) {
    const testNode = (fineStart + delta + 360) % 360;
    const calcIncl = calculateApparentEclipticInclination(planetIncl, testNode, earthIncl, earthAscNode);
    const error = Math.abs(calcIncl - targetEclipticIncl);

    if (error < bestError) {
      bestError = error;
      bestNode = testNode;
    }
  }

  // Calculate final values
  const calcIncl = calculateApparentEclipticInclination(planetIncl, bestNode, earthIncl, earthAscNode);

  return {
    optimalNode: bestNode,
    calculatedIncl: calcIncl,
    targetIncl: targetEclipticIncl,
    error: calcIncl - targetEclipticIncl,
    errorArcsec: Math.abs(calcIncl - targetEclipticIncl) * 3600,
    deltaFromSS: bestNode - startNode
  };
}

/**
 * Get Earth's ascending node - FIXED value, not optimized
 * Earth defines the ecliptic plane, so its ascending node is a fixed reference.
 * This value was determined separately and should not be changed here.
 */
function getEarthAscendingNode() {
  // Earth's ascending node is FIXED - it defines the ecliptic reference frame
  // We use the verified value from script.js (284.5304°)
  // = longitudePerihelion + 180° + inclination = 102.9517° + 180° + 1.5787°
  return earthConfig.ascNodeVerified;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     APPENDIX A: ASCENDING NODE OPTIMIZATION (Numerical)                  ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This script CALCULATES optimal ascending node values that produce       ║');
console.log('║  exact JPL J2000 ecliptic inclinations.                                  ║');
console.log('║                                                                           ║');
console.log('║  Output can be used directly in script.js as:                            ║');
console.log('║    <planet>AscendingNodeInvPlaneVerified                                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('INPUT PARAMETERS (fixed):');
console.log('  - Invariable plane inclinations: Souami & Souchay (2012)');
console.log('  - Earth inclination at J2000: ' + earthConfig.inclJ2000 + '°');
console.log('  - JPL J2000 ecliptic inclinations: Target values to match');
console.log('');

// Step 1: Earth's ascending node is FIXED (not optimized)
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ EARTH ASCENDING NODE (FIXED INPUT)                                         │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');

const fixedEarthNode = getEarthAscendingNode();

console.log(`│ Earth Ascending Node:    ${fixedEarthNode.toFixed(3)}°  (FIXED - defines ecliptic)        │`);
console.log(`│ Earth Inclination J2000: ${earthConfig.inclJ2000}°                              │`);
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

// Step 2: Optimize each planet's ascending node (Earth is fixed)
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ OPTIMIZE PLANETARY ASCENDING NODES                                         │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

const results = {};
const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

for (const planet of planets) {
  const result = optimizeAscendingNode(
    invPlaneInclinationsJ2000[planet],
    jplEclipticInclinationsJ2000[planet],
    earthConfig.inclJ2000,
    fixedEarthNode,
    ascendingNodesSouamiSouchay[planet]
  );

  results[planet] = result;
  const name = planet.charAt(0).toUpperCase() + planet.slice(1);

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${name.toUpperCase().padEnd(73)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ INPUTS:                                                                     │');
  console.log(`│   Inv. Plane Inclination:    ${invPlaneInclinationsJ2000[planet].toFixed(7).padStart(12)}°  (Souami & Souchay)        │`);
  console.log(`│   JPL J2000 Ecliptic Incl:   ${jplEclipticInclinationsJ2000[planet].toFixed(8).padStart(12)}°  (TARGET)                │`);
  console.log(`│   S&S Ascending Node:        ${ascendingNodesSouamiSouchay[planet].toFixed(2).padStart(12)}°  (Starting point)         │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ OPTIMIZED OUTPUT:                                                           │');
  console.log(`│   Optimal Ascending Node:    ${result.optimalNode.toFixed(2).padStart(12)}°                              │`);
  console.log(`│   Δ from S&S:                ${(result.deltaFromSS >= 0 ? '+' : '') + result.deltaFromSS.toFixed(2).padStart(11)}°                              │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ VERIFICATION:                                                               │');
  console.log(`│   Calculated Ecliptic Incl:  ${result.calculatedIncl.toFixed(8)}°                             │`);
  console.log(`│   Target Ecliptic Incl:      ${result.targetIncl.toFixed(8)}°                             │`);
  console.log(`│   Error:                     ${result.errorArcsec.toFixed(4).padStart(10)} arcsec                        │`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// Summary and code output
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    RECOMMENDED CODE FOR script.js                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('// ═══════════════════════════════════════════════════════════════════════════');
console.log('// J2000-VERIFIED ASCENDING NODES ON INVARIABLE PLANE');
console.log('// Optimized by appendix-a-ascending-node-optimization.js to match JPL J2000');
console.log('// ecliptic inclinations exactly.');
console.log('// ═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(`const earthAscendingNodeInvPlaneVerified = ${fixedEarthNode.toFixed(3)};      // FIXED (defines ecliptic)`);

for (const planet of planets) {
  const r = results[planet];
  const varName = `${planet}AscendingNodeInvPlaneVerified`;
  const padding = ' '.repeat(Math.max(0, 40 - varName.length - r.optimalNode.toFixed(2).length));
  console.log(`const ${varName} = ${r.optimalNode.toFixed(2)};${padding}// Δ = ${(r.deltaFromSS >= 0 ? '+' : '') + r.deltaFromSS.toFixed(2)}° from S&S`);
}

console.log('');
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                              SUMMARY TABLE                                ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ S&S Ω    │ Optimal Ω │  Δ Ω    │ JPL Target │ Calc Incl  │ Err  ║');
console.log('╠══════════╪══════════╪═══════════╪═════════╪════════════╪════════════╪══════╣');

// Earth row (FIXED, not optimized)
const earthName = 'Earth'.padEnd(8);
const earthSS = fixedEarthNode.toFixed(2).padStart(8);
const earthOpt = fixedEarthNode.toFixed(2).padStart(9);
console.log(`║ ${earthName} │ ${earthSS}° │ ${earthOpt}° │  FIXED │     (ref)  │    (ref)   │  -   ║`);

for (const planet of planets) {
  const r = results[planet];
  const name = planet.charAt(0).toUpperCase() + planet.slice(1).padEnd(7);
  const ss = ascendingNodesSouamiSouchay[planet].toFixed(2).padStart(8);
  const opt = r.optimalNode.toFixed(2).padStart(9);
  const delta = (r.deltaFromSS >= 0 ? '+' : '') + r.deltaFromSS.toFixed(2).padStart(6);
  const target = r.targetIncl.toFixed(4).padStart(10);
  const calc = r.calculatedIncl.toFixed(4).padStart(10);
  const err = r.errorArcsec < 0.01 ? '<0.01' : r.errorArcsec.toFixed(2);
  console.log(`║ ${name} │ ${ss}° │ ${opt}° │ ${delta}° │ ${target}° │ ${calc}° │ ${err.padStart(4)}" ║`);
}

console.log('╚══════════╧══════════╧═══════════╧═════════╧════════════╧════════════╧══════╝');
console.log('');

// Statistics
const avgError = Object.values(results).reduce((sum, r) => sum + r.errorArcsec, 0) / planets.length;
const maxError = Math.max(...Object.values(results).map(r => r.errorArcsec));
const maxErrorPlanet = planets.find(p => results[p].errorArcsec === maxError);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('OPTIMIZATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(`Average error:  ${avgError.toFixed(4)} arcsec`);
console.log(`Maximum error:  ${maxError.toFixed(4)} arcsec (${maxErrorPlanet})`);
console.log('');
console.log('These optimized ascending nodes are used in script.js to produce:');
console.log('  - o.<planet>EclipticInclinationDynamic (matches JPL J2000 exactly)');
console.log('');
console.log('Compare with Souami & Souchay original values:');
console.log('  - o.<planet>EclipticInclinationSouamiSouchayDynamic (for reference)');
console.log('');
console.log('Verification scripts:');
console.log('  - appendix-c-ascending-node-verification.js (verifies these values)');
console.log('  - appendix-d-ascending-node-souami-souchay.js (compares S&S accuracy)');
console.log('');
console.log('References:');
console.log('  - Souami, D. & Souchay, J. (2012) "The solar system\'s invariable plane"');
console.log('  - JPL Horizons: https://ssd.jpl.nasa.gov/horizons/');
