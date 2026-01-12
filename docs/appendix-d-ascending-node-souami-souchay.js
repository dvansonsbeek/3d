// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX D: ASCENDING NODE COMPARISON (Souami & Souchay Original Values)
// ═══════════════════════════════════════════════════════════════════════════
//
// This script demonstrates the error when using the original Souami & Souchay
// (2012) ascending node values instead of the J2000-calibrated values.
//
// The comparison shows:
// 1. Original S&S ascending nodes produce different ecliptic inclinations
// 2. The error varies by planet (some large, some small)
// 3. This is why we calibrated "Verified" ascending nodes in Appendix C
//
// The difference arises because:
// - S&S values are reference values from their coordinate system
// - Small adjustments are needed to match JPL J2000 ecliptic inclinations
// - The adjustments compensate for coordinate system differences
//
// Run with: node appendix-d-ascending-node-souami-souchay.js
// ═══════════════════════════════════════════════════════════════════════════

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const holisticyearLength = 333888;

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE VALUES (at J2000)
// ═══════════════════════════════════════════════════════════════════════════

const earthConfig = {
  // Dynamic inclination at J2000
  inclJ2000: 1.57867339,  // Earth's inclination to invariable plane at J2000
  // Earth's ascending node from Souami & Souchay (2012) - used for both
  ascNodeSouamiSouchay: 284.51,
  ascNodeVerified: 284.51
};

// ═══════════════════════════════════════════════════════════════════════════
// J2000 ECLIPTIC INCLINATIONS (JPL targets - these are what we want to match)
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
// SOUAMI & SOUCHAY ORIGINAL ASCENDING NODES (2012)
// These are the original values from the paper
// ═══════════════════════════════════════════════════════════════════════════

const ascendingNodesSouamiSouchay = {
  earth: 284.51,      // Original S&S
  mercury: 32.22,     // Original S&S
  venus: 52.31,       // Original S&S
  mars: 352.95,       // Original S&S
  jupiter: 306.92,    // Original S&S
  saturn: 122.27,     // Original S&S
  uranus: 308.44,     // Original S&S
  neptune: 189.28,    // Original S&S
  pluto: 107.06       // Original S&S
};

// ═══════════════════════════════════════════════════════════════════════════
// J2000-VERIFIED ASCENDING NODES (for comparison)
// ═══════════════════════════════════════════════════════════════════════════

const ascendingNodesVerified = {
  earth: 284.51,
  mercury: 32.83,
  venus: 54.70,
  mars: 354.87,
  jupiter: 312.89,
  saturn: 118.81,
  uranus: 307.80,
  neptune: 192.04,
  pluto: 101.06
};

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the apparent ecliptic inclination of a planet
 * by computing the angle between orbital plane normals
 */
function calculateApparentEclipticInclination(planetIncl, planetAscNode, earthIncl, earthAscNode) {
  // Convert to radians
  const pI = planetIncl * DEG2RAD;
  const pOmega = planetAscNode * DEG2RAD;
  const eI = earthIncl * DEG2RAD;
  const eOmega = earthAscNode * DEG2RAD;

  // Planet orbital plane normal (in invariable plane coordinates)
  const pnx = Math.sin(pI) * Math.sin(pOmega);
  const pny = Math.sin(pI) * Math.cos(pOmega);
  const pnz = Math.cos(pI);

  // Earth orbital plane normal (= ecliptic normal)
  const enx = Math.sin(eI) * Math.sin(eOmega);
  const eny = Math.sin(eI) * Math.cos(eOmega);
  const enz = Math.cos(eI);

  // Dot product gives cos(angle between planes)
  const dot = pnx * enx + pny * eny + pnz * enz;

  // Apparent inclination is the angle between the normals
  const apparentIncl = Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;

  return apparentIncl;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║  APPENDIX D: ASCENDING NODE COMPARISON (Souami & Souchay Original)       ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This script shows the error when using original S&S ascending nodes     ║');
console.log('║  compared to the J2000-calibrated (Verified) values.                     ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ EARTH REFERENCE                                                            │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Inclination to Inv. Plane at J2000:  ${earthConfig.inclJ2000}°`);
console.log(`│ Ascending Node (Souami & Souchay):   ${earthConfig.ascNodeSouamiSouchay}°`);
console.log(`│ Ascending Node (Verified):           ${earthConfig.ascNodeVerified}°`);
console.log(`│ Δ Earth Ascending Node:              ${(earthConfig.ascNodeVerified - earthConfig.ascNodeSouamiSouchay).toFixed(3)}°`);
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

const results = [];

const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

for (const planet of planets) {
  const invPlaneIncl = invPlaneInclinationsJ2000[planet];
  const ascNodeSS = ascendingNodesSouamiSouchay[planet];
  const ascNodeVerified = ascendingNodesVerified[planet];
  const jplTarget = jplEclipticInclinationsJ2000[planet];

  // Calculate with S&S ascending nodes (both planet AND Earth use S&S values)
  const calculatedSS = calculateApparentEclipticInclination(
    invPlaneIncl,
    ascNodeSS,
    earthConfig.inclJ2000,
    earthConfig.ascNodeSouamiSouchay
  );

  // Calculate with Verified ascending nodes (both planet AND Earth use Verified values)
  const calculatedVerified = calculateApparentEclipticInclination(
    invPlaneIncl,
    ascNodeVerified,
    earthConfig.inclJ2000,
    earthConfig.ascNodeVerified
  );

  const errorSS = calculatedSS - jplTarget;
  const errorSSArcsec = Math.abs(errorSS) * 3600;

  const errorVerified = calculatedVerified - jplTarget;
  const errorVerifiedArcsec = Math.abs(errorVerified) * 3600;

  const ascNodeDelta = ascNodeVerified - ascNodeSS;

  results.push({
    planet,
    invPlaneIncl,
    ascNodeSS,
    ascNodeVerified,
    ascNodeDelta,
    jplTarget,
    calculatedSS,
    calculatedVerified,
    errorSS,
    errorSSArcsec,
    errorVerified,
    errorVerifiedArcsec
  });

  const name = planet.charAt(0).toUpperCase() + planet.slice(1);

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${name.toUpperCase().padEnd(73)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ INPUTS:                                                                     │');
  console.log(`│   Inv. Plane Inclination:       ${invPlaneIncl.toFixed(7).padStart(12)}°  (Souami & Souchay 2012)  │`);
  console.log(`│   Ascending Node (S&S):         ${ascNodeSS.toFixed(2).padStart(12)}°  (Original)               │`);
  console.log(`│   Ascending Node (Verified):    ${ascNodeVerified.toFixed(2).padStart(12)}°  (J2000-calibrated)       │`);
  console.log(`│   Δ Ascending Node:             ${(ascNodeDelta >= 0 ? '+' : '') + ascNodeDelta.toFixed(2).padStart(11)}°                           │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ COMPARISON:                                                                 │');
  console.log(`│   JPL Target Ecliptic Incl:     ${jplTarget.toFixed(8)}°                             │`);
  console.log('│                                                                             │');
  console.log(`│   Using S&S Ascending Nodes:    ${calculatedSS.toFixed(8)}°                             │`);
  console.log(`│     Error:                      ${(errorSS >= 0 ? '+' : '') + errorSS.toFixed(8)}° (${errorSSArcsec.toFixed(1).padStart(7)} arcsec)       │`);
  console.log('│                                                                             │');
  console.log(`│   Using Verified Asc. Nodes:    ${calculatedVerified.toFixed(8)}°                             │`);
  console.log(`│     Error:                      ${(errorVerified >= 0 ? '+' : '') + errorVerified.toFixed(8)}° (${errorVerifiedArcsec.toFixed(1).padStart(7)} arcsec)       │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  const improvement = errorSSArcsec - errorVerifiedArcsec;
  console.log(`│ IMPROVEMENT: ${improvement.toFixed(1)} arcsec reduction in error ${' '.repeat(35)}│`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// Summary table
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                   SUMMARY TABLE                                       ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ Ω S&S   │ Ω Verif │  Δ Ω   │ JPL Target │  S&S Err  │ Verif Err │ Improv ║');
console.log('╠══════════╪═════════╪═════════╪════════╪════════════╪═══════════╪═══════════╪════════╣');

for (const r of results) {
  const name = r.planet.charAt(0).toUpperCase() + r.planet.slice(1).padEnd(7);
  const omegaSS = r.ascNodeSS.toFixed(2).padStart(7);
  const omegaV = r.ascNodeVerified.toFixed(2).padStart(7);
  const delta = (r.ascNodeDelta >= 0 ? '+' : '') + r.ascNodeDelta.toFixed(2).padStart(5);
  const jpl = r.jplTarget.toFixed(4).padStart(10);
  const errSS = r.errorSSArcsec.toFixed(1).padStart(8) + '"';
  const errV = r.errorVerifiedArcsec.toFixed(1).padStart(8) + '"';
  const improv = (r.errorSSArcsec - r.errorVerifiedArcsec).toFixed(1).padStart(6) + '"';
  console.log(`║ ${name} │ ${omegaSS}° │ ${omegaV}° │ ${delta}° │ ${jpl}° │ ${errSS} │ ${errV} │ ${improv} ║`);
}

console.log('╚══════════╧═════════╧═════════╧════════╧════════════╧═══════════╧═══════════╧════════╝');
console.log('');

// Statistics
const avgErrorSS = results.reduce((sum, r) => sum + r.errorSSArcsec, 0) / results.length;
const avgErrorVerified = results.reduce((sum, r) => sum + r.errorVerifiedArcsec, 0) / results.length;
const maxErrorSS = Math.max(...results.map(r => r.errorSSArcsec));
const maxErrorVerified = Math.max(...results.map(r => r.errorVerifiedArcsec));

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('STATISTICS');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Using Souami & Souchay Original Ascending Nodes:');
console.log(`  Average error:  ${avgErrorSS.toFixed(1)} arcsec`);
console.log(`  Maximum error:  ${maxErrorSS.toFixed(1)} arcsec (${results.find(r => r.errorSSArcsec === maxErrorSS).planet})`);
console.log('');
console.log('Using J2000-Verified Ascending Nodes:');
console.log(`  Average error:  ${avgErrorVerified.toFixed(1)} arcsec`);
console.log(`  Maximum error:  ${maxErrorVerified.toFixed(1)} arcsec (${results.find(r => r.errorVerifiedArcsec === maxErrorVerified).planet})`);
console.log('');
console.log(`Overall improvement: ${(avgErrorSS - avgErrorVerified).toFixed(1)} arcsec average reduction`);
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The J2000-Verified ascending nodes are calibrated to produce exact');
console.log('JPL J2000 ecliptic inclinations. The adjustments from S&S values are:');
console.log('');
console.log('  Planet    Δ Ascending Node');
console.log('  ────────  ─────────────────');
for (const r of results) {
  const name = r.planet.charAt(0).toUpperCase() + r.planet.slice(1).padEnd(8);
  const delta = (r.ascNodeDelta >= 0 ? '+' : '') + r.ascNodeDelta.toFixed(2) + '°';
  console.log(`  ${name}  ${delta}`);
}
console.log('');
console.log('These adjustments compensate for coordinate system differences between');
console.log('the Souami & Souchay reference frame and the JPL J2000 ecliptic frame.');
console.log('');
console.log('In script.js:');
console.log('  - o.<planet>EclipticInclinationDynamic uses Verified nodes (accurate)');
console.log('  - o.<planet>EclipticInclinationSouamiSouchayDynamic uses S&S nodes (comparison)');
console.log('');
console.log('References:');
console.log('  - Souami, D. & Souchay, J. (2012) "The solar system\'s invariable plane"');
console.log('  - JPL Horizons: https://ssd.jpl.nasa.gov/horizons/');
console.log('  - See also: appendix-c-ascending-node-verification.js');
