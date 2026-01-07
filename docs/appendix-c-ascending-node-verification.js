// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX C: ASCENDING NODE VERIFICATION (J2000-Verified Values)
// ═══════════════════════════════════════════════════════════════════════════
//
// This script verifies that the J2000-verified ascending node values produce
// the correct J2000 ecliptic inclinations when combined with invariable plane
// geometry.
//
// The verification process:
// 1. Given: Planet's inclination to invariable plane (from Souami & Souchay 2012)
// 2. Given: Planet's ascending node on invariable plane (J2000-Verified)
// 3. Given: Earth's inclination to invariable plane (dynamic at J2000)
// 4. Given: Earth's ascending node on invariable plane (J2000-Verified)
// 5. Calculate: Apparent ecliptic inclination using spherical geometry
// 6. Compare: Should match JPL J2000 ecliptic inclination exactly
//
// Formula: The angle between two orbital planes with normals n₁ and n₂ is:
//   cos(angle) = n₁ · n₂
// where n = (sin(i)sin(Ω), sin(i)cos(Ω), cos(i))
//
// Run with: node appendix-c-ascending-node-verification.js
// ═══════════════════════════════════════════════════════════════════════════

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const holisticyearLength = 298176;

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE VALUES (at J2000)
// ═══════════════════════════════════════════════════════════════════════════

const earthConfig = {
  // Dynamic inclination at J2000
  inclJ2000: 1.57867339,  // Earth's inclination to invariable plane at J2000
  // J2000-Verified ascending node = longitudePerihelion + 180° + inclination
  // = 102.9517° + 180° + 1.5787° = 284.5304°
  ascNodeVerified: 284.5304
};

// ═══════════════════════════════════════════════════════════════════════════
// J2000 ECLIPTIC INCLINATIONS (JPL targets - these are what we must match)
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
// J2000-VERIFIED ASCENDING NODES (calibrated to match JPL ecliptic inclinations)
// These are the values we're verifying
// ═══════════════════════════════════════════════════════════════════════════

const ascendingNodesVerified = {
  earth: 284.5304,    // Reference for ecliptic normal (FIXED) = perihelion + 180° + incl
  mercury: 32.85,     // was S&S 32.22, Δ = +0.63°
  venus: 54.72,       // was S&S 52.31, Δ = +2.41°
  mars: 354.89,       // was S&S 352.95, Δ = +1.94°
  jupiter: 312.91,    // was S&S 306.92, Δ = +5.99°
  saturn: 118.83,     // was S&S 122.27, Δ = -3.44°
  uranus: 307.82,     // was S&S 308.44, Δ = -0.62°
  neptune: 192.06,    // was S&S 189.28, Δ = +2.78°
  pluto: 101.08       // was S&S 107.06, Δ = -5.98°
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
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║   APPENDIX C: ASCENDING NODE VERIFICATION (J2000-Verified Values)        ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This script verifies that J2000-verified ascending nodes produce        ║');
console.log('║  correct JPL J2000 ecliptic inclinations when combined with              ║');
console.log('║  invariable plane geometry.                                              ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ EARTH REFERENCE (defines the ecliptic plane)                               │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Inclination to Inv. Plane at J2000:  ${earthConfig.inclJ2000}°`);
console.log(`│ Ascending Node (Verified):           ${earthConfig.ascNodeVerified}°`);
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

const results = [];
let allPassed = true;

const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

for (const planet of planets) {
  const invPlaneIncl = invPlaneInclinationsJ2000[planet];
  const ascNodeVerified = ascendingNodesVerified[planet];
  const jplTarget = jplEclipticInclinationsJ2000[planet];

  // Calculate apparent ecliptic inclination
  const calculatedIncl = calculateApparentEclipticInclination(
    invPlaneIncl,
    ascNodeVerified,
    earthConfig.inclJ2000,
    earthConfig.ascNodeVerified
  );

  const error = calculatedIncl - jplTarget;
  const errorArcsec = Math.abs(error) * 3600;
  const passed = errorArcsec < 1.0;  // Pass if within 1 arcsecond

  if (!passed) allPassed = false;

  results.push({
    planet,
    invPlaneIncl,
    ascNodeVerified,
    jplTarget,
    calculated: calculatedIncl,
    error,
    errorArcsec,
    passed
  });

  const name = planet.charAt(0).toUpperCase() + planet.slice(1);
  const status = passed ? '✓ PASS' : '✗ FAIL';

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${name.toUpperCase().padEnd(73)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ INPUTS:                                                                     │');
  console.log(`│   Inv. Plane Inclination:  ${invPlaneIncl.toFixed(7).padStart(12)}°    (Souami & Souchay 2012)      │`);
  console.log(`│   Ascending Node:          ${ascNodeVerified.toFixed(2).padStart(12)}°    (J2000-Verified)            │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│ OUTPUT:                                                                     │');
  console.log(`│   Calculated Ecliptic Incl: ${calculatedIncl.toFixed(8)}°                                   │`);
  console.log(`│   JPL Target:               ${jplTarget.toFixed(8)}°                                   │`);
  console.log(`│   Error:                    ${(error >= 0 ? '+' : '') + error.toFixed(8)}° (${errorArcsec.toFixed(2).padStart(6)} arcsec)            │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ STATUS: ${status.padEnd(66)}│`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// Summary table
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                              SUMMARY TABLE                                ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ Inv.Plane │ Asc.Node  │ JPL Target │ Calculated │ Error  │ OK ║');
console.log('╠══════════╪═══════════╪═══════════╪════════════╪════════════╪════════╪════╣');

for (const r of results) {
  const name = r.planet.charAt(0).toUpperCase() + r.planet.slice(1).padEnd(7);
  const invP = r.invPlaneIncl.toFixed(4).padStart(9);
  const ascN = r.ascNodeVerified.toFixed(2).padStart(9);
  const jpl = r.jplTarget.toFixed(5).padStart(10);
  const calc = r.calculated.toFixed(5).padStart(10);
  const err = r.errorArcsec.toFixed(2).padStart(6);
  const ok = r.passed ? ' ✓ ' : ' ✗ ';
  console.log(`║ ${name} │ ${invP}° │ ${ascN}° │ ${jpl}° │ ${calc}° │ ${err}" │${ok}║`);
}

console.log('╚══════════╧═══════════╧═══════════╧════════════╧════════════╧════════╧════╝');
console.log('');

const passCount = results.filter(r => r.passed).length;
const totalCount = results.length;

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`VERIFICATION COMPLETE: ${passCount}/${totalCount} planets passed (< 1 arcsecond error)`);
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

if (allPassed) {
  console.log('✓ All J2000-verified ascending nodes produce correct ecliptic inclinations.');
  console.log('');
  console.log('These verified values are used in script.js as:');
  console.log('  - <planet>AscendingNodeInvPlaneVerified');
  console.log('  - o.<planet>EclipticInclinationDynamic (output)');
} else {
  console.log('✗ Some ascending nodes need adjustment.');
}

console.log('');
console.log('References:');
console.log('  - Souami, D. & Souchay, J. (2012) "The solar system\'s invariable plane"');
console.log('  - JPL Horizons: https://ssd.jpl.nasa.gov/horizons/');
console.log('  - See also: appendix-d-ascending-node-souami-souchay.js for comparison');
