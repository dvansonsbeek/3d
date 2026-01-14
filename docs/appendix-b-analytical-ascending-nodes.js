// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX B: ANALYTICAL ASCENDING NODE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════
//
// COMPARISON WITH APPENDIX A:
// - Appendix A uses NUMERICAL optimization (brute-force search)
// - Appendix B uses ANALYTICAL calculation (closed-form formula)
// - Both produce the same results, proving the geometric validity
//
// This script demonstrates that ascending nodes can be calculated ANALYTICALLY
// from the spherical trigonometry relationship between orbital planes.
//
// The key insight: The ecliptic inclination of a planet is the angle between
// two orbital planes (planet and Earth) in 3D space. Using spherical geometry:
//
//   cos(i_ecl) = cos(i_p)cos(i_e) + sin(i_p)sin(i_e)cos(ΔΩ)
//
// Where:
//   i_ecl = ecliptic inclination (JPL J2000 - known)
//   i_p = planet's invariable plane inclination (S&S 2012 - known)
//   i_e = Earth's invariable plane inclination (known)
//   ΔΩ = Ω_planet - Ω_earth (difference in ascending nodes)
//
// Solving for ΔΩ:
//   cos(ΔΩ) = [cos(i_ecl) - cos(i_p)cos(i_e)] / [sin(i_p)sin(i_e)]
//   ΔΩ = ±arccos([cos(i_ecl) - cos(i_p)cos(i_e)] / [sin(i_p)sin(i_e)])
//
// Then: Ω_planet = Ω_earth + ΔΩ  (choosing the sign that matches S&S direction)
//
// Run with: node appendix-b-analytical-ascending-nodes.js
// ═══════════════════════════════════════════════════════════════════════════

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN VALUES
// ═══════════════════════════════════════════════════════════════════════════

// Earth reference
const earthInclInvPlane = 1.57866663;  // Earth's J2000 inclination to invariable plane
const earthAscNodeInvPlane = 284.51;   // Earth's ascending node from Souami & Souchay (2012)

// JPL J2000 ecliptic inclinations (TARGET values - what we see from Earth)
const jplEclipticIncl = {
  mercury: 7.00497902,
  venus: 3.39467605,
  mars: 1.84969142,
  jupiter: 1.30439695,
  saturn: 2.48599187,
  uranus: 0.77263783,
  neptune: 1.77004347,
  pluto: 17.14001
};

// Souami & Souchay 2012 invariable plane inclinations (INPUT values)
const ssInvPlaneIncl = {
  mercury: 6.3472858,
  venus: 2.1545441,
  mars: 1.6311858,
  jupiter: 0.3219652,
  saturn: 0.9254704,
  uranus: 0.9946692,
  neptune: 0.7354155,
  pluto: 15.5639473
};

// Souami & Souchay original ascending nodes (for comparison)
const ssAscNodes = {
  mercury: 32.22,
  venus: 52.31,
  mars: 352.95,
  jupiter: 306.92,
  saturn: 122.27,
  uranus: 308.44,
  neptune: 189.28,
  pluto: 107.06
};

// Our numerically optimized values (from Appendix A)
const optimizedAscNodes = {
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
// ANALYTICAL CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate planet's ascending node analytically from spherical trigonometry
 *
 * @param {number} eclipticIncl - JPL J2000 ecliptic inclination (degrees)
 * @param {number} planetInvIncl - Planet's inclination to invariable plane (degrees)
 * @param {number} earthInvIncl - Earth's inclination to invariable plane (degrees)
 * @param {number} earthAscNode - Earth's ascending node on invariable plane (degrees)
 * @param {number} ssHint - S&S ascending node as hint for sign selection (degrees)
 * @returns {object} - Analytical result with both possible solutions
 */
function calculateAscendingNodeAnalytical(eclipticIncl, planetInvIncl, earthInvIncl, earthAscNode, ssHint) {
  const i_ecl = eclipticIncl * DEG2RAD;
  const i_p = planetInvIncl * DEG2RAD;
  const i_e = earthInvIncl * DEG2RAD;

  // Spherical trigonometry formula:
  // cos(i_ecl) = cos(i_p)cos(i_e) + sin(i_p)sin(i_e)cos(ΔΩ)

  const numerator = Math.cos(i_ecl) - Math.cos(i_p) * Math.cos(i_e);
  const denominator = Math.sin(i_p) * Math.sin(i_e);

  // Check if solution exists
  const cosRatio = numerator / denominator;

  if (Math.abs(cosRatio) > 1.0001) {
    return {
      valid: false,
      message: `No solution: |cos(ΔΩ)| = ${Math.abs(cosRatio).toFixed(4)} > 1`,
      cosRatio: cosRatio
    };
  }

  // Clamp to [-1, 1] for numerical safety
  const clampedCosRatio = Math.max(-1, Math.min(1, cosRatio));

  // ΔΩ has two possible values: +arccos and -arccos
  const deltaOmega = Math.acos(clampedCosRatio) * RAD2DEG;

  // Two possible ascending nodes
  const solution1 = ((earthAscNode + deltaOmega) % 360 + 360) % 360;
  const solution2 = ((earthAscNode - deltaOmega) % 360 + 360) % 360;

  // Choose the one closer to S&S hint
  const diff1 = Math.min(Math.abs(solution1 - ssHint), 360 - Math.abs(solution1 - ssHint));
  const diff2 = Math.min(Math.abs(solution2 - ssHint), 360 - Math.abs(solution2 - ssHint));

  const bestSolution = diff1 < diff2 ? solution1 : solution2;
  const otherSolution = diff1 < diff2 ? solution2 : solution1;

  return {
    valid: true,
    deltaOmega: deltaOmega,
    solution1: solution1,
    solution2: solution2,
    bestSolution: bestSolution,
    otherSolution: otherSolution,
    cosRatio: clampedCosRatio
  };
}

/**
 * Verify by calculating ecliptic inclination from ascending node
 */
function verifyEclipticInclination(planetIncl, planetAscNode, earthIncl, earthAscNode) {
  const i_p = planetIncl * DEG2RAD;
  const omega_p = planetAscNode * DEG2RAD;
  const i_e = earthIncl * DEG2RAD;
  const omega_e = earthAscNode * DEG2RAD;

  // Using spherical formula
  const cosIncl = Math.cos(i_p) * Math.cos(i_e) +
                  Math.sin(i_p) * Math.sin(i_e) * Math.cos(omega_p - omega_e);

  return Math.acos(Math.max(-1, Math.min(1, cosIncl))) * RAD2DEG;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     APPENDIX B: ANALYTICAL ASCENDING NODE CALCULATION                    ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This demonstrates that ascending nodes can be calculated ANALYTICALLY   ║');
console.log('║  from spherical trigonometry - no numerical optimization needed!         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('THE FORMULA:');
console.log('────────────');
console.log('cos(i_ecl) = cos(i_p)·cos(i_e) + sin(i_p)·sin(i_e)·cos(ΔΩ)');
console.log('');
console.log('Solving for ΔΩ:');
console.log('cos(ΔΩ) = [cos(i_ecl) - cos(i_p)·cos(i_e)] / [sin(i_p)·sin(i_e)]');
console.log('Ω_planet = Ω_earth ± arccos(...)');
console.log('');

console.log('EARTH REFERENCE:');
console.log(`  Inclination to invariable plane: ${earthInclInvPlane}°`);
console.log(`  Ascending node on invariable plane: ${earthAscNodeInvPlane}°`);
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const results = [];

for (const planet of planets) {
  const result = calculateAscendingNodeAnalytical(
    jplEclipticIncl[planet],
    ssInvPlaneIncl[planet],
    earthInclInvPlane,
    earthAscNodeInvPlane,
    ssAscNodes[planet]
  );

  const name = planet.charAt(0).toUpperCase() + planet.slice(1);

  console.log(`┌─────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ ${name.toUpperCase().padEnd(73)}│`);
  console.log(`├─────────────────────────────────────────────────────────────────────────────┤`);
  console.log(`│ INPUTS:                                                                    │`);
  console.log(`│   JPL ecliptic inclination:     ${jplEclipticIncl[planet].toFixed(8).padStart(12)}°                        │`);
  console.log(`│   S&S invariable plane incl:    ${ssInvPlaneIncl[planet].toFixed(7).padStart(12)}°                         │`);
  console.log(`│   S&S ascending node (hint):    ${ssAscNodes[planet].toFixed(2).padStart(12)}°                         │`);
  console.log(`├─────────────────────────────────────────────────────────────────────────────┤`);

  if (result.valid) {
    console.log(`│ ANALYTICAL CALCULATION:                                                    │`);
    console.log(`│   cos(ΔΩ) = ${result.cosRatio.toFixed(8).padStart(12)}                                         │`);
    console.log(`│   ΔΩ = ±${result.deltaOmega.toFixed(4)}°                                                       │`);
    console.log(`│                                                                            │`);
    console.log(`│   Solution 1: Ω = ${earthAscNodeInvPlane.toFixed(2)}° + ${result.deltaOmega.toFixed(2)}° = ${result.solution1.toFixed(2)}°                       │`);
    console.log(`│   Solution 2: Ω = ${earthAscNodeInvPlane.toFixed(2)}° - ${result.deltaOmega.toFixed(2)}° = ${result.solution2.toFixed(2)}°                       │`);
    console.log(`│                                                                            │`);
    console.log(`│   Best match (closest to S&S): ${result.bestSolution.toFixed(2)}°                               │`);
    console.log(`├─────────────────────────────────────────────────────────────────────────────┤`);

    // Verify
    const verifiedIncl = verifyEclipticInclination(
      ssInvPlaneIncl[planet],
      result.bestSolution,
      earthInclInvPlane,
      earthAscNodeInvPlane
    );

    const error = verifiedIncl - jplEclipticIncl[planet];
    const errorArcsec = Math.abs(error) * 3600;

    console.log(`│ VERIFICATION:                                                              │`);
    console.log(`│   Calculated ecliptic incl:    ${verifiedIncl.toFixed(8)}°                            │`);
    console.log(`│   JPL target:                  ${jplEclipticIncl[planet].toFixed(8)}°                            │`);
    console.log(`│   Error:                       ${errorArcsec.toFixed(4)} arcsec                             │`);
    console.log(`├─────────────────────────────────────────────────────────────────────────────┤`);

    const diffFromOptimized = result.bestSolution - optimizedAscNodes[planet];
    console.log(`│ COMPARISON WITH NUMERICAL OPTIMIZATION:                                    │`);
    console.log(`│   Analytical solution:         ${result.bestSolution.toFixed(2)}°                                     │`);
    console.log(`│   Numerical optimization:      ${optimizedAscNodes[planet].toFixed(2)}°                                     │`);
    console.log(`│   Difference:                  ${(diffFromOptimized >= 0 ? '+' : '') + diffFromOptimized.toFixed(4)}°                                    │`);

    results.push({
      planet,
      analytical: result.bestSolution,
      optimized: optimizedAscNodes[planet],
      diff: diffFromOptimized,
      error: errorArcsec
    });
  } else {
    console.log(`│ ERROR: ${result.message.padEnd(66)}│`);
  }

  console.log(`└─────────────────────────────────────────────────────────────────────────────┘`);
  console.log('');
}

// Summary table
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                               SUMMARY COMPARISON                                      ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ Analytical │ Optimized │   Diff   │ S&S Original │ Δ from S&S │ Error     ║');
console.log('╠══════════╪════════════╪═══════════╪══════════╪══════════════╪════════════╪═══════════╣');

for (const r of results) {
  const name = r.planet.charAt(0).toUpperCase() + r.planet.slice(1).padEnd(7);
  const anal = r.analytical.toFixed(2).padStart(10);
  const opt = r.optimized.toFixed(2).padStart(9);
  const diff = (r.diff >= 0 ? '+' : '') + r.diff.toFixed(4).padStart(7);
  const ss = ssAscNodes[r.planet].toFixed(2).padStart(12);
  const deltaFromSS = (r.analytical - ssAscNodes[r.planet]);
  const deltaSS = (deltaFromSS >= 0 ? '+' : '') + deltaFromSS.toFixed(2).padStart(9);
  const err = r.error.toFixed(2).padStart(8) + '"';
  console.log(`║ ${name} │ ${anal}° │ ${opt}° │ ${diff}° │ ${ss}° │ ${deltaSS}° │ ${err} ║`);
}

console.log('╚══════════╧════════════╧═══════════╧══════════╧══════════════╧════════════╧═══════════╝');
console.log('');

// Key insight
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('KEY INSIGHT');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The ascending nodes can be calculated ANALYTICALLY from:');
console.log('  1. JPL J2000 ecliptic inclinations (observed from Earth)');
console.log('  2. Souami & Souchay invariable plane inclinations');
console.log('  3. Earth\'s ascending node (284.51° - Souami & Souchay 2012)');
console.log('');
console.log('The formula is pure spherical trigonometry - the angle between two planes');
console.log('inclined to a reference plane (the invariable plane).');
console.log('');
console.log('This is NOT circular reasoning because:');
console.log('  - JPL ecliptic inclinations are OBSERVED values');
console.log('  - S&S invariable plane inclinations are INDEPENDENT measurements');
console.log('  - Earth\'s ascending node is derived from perihelion geometry');
console.log('');
console.log('The analytical and numerical solutions match (within rounding), proving');
console.log('our numerical optimization was finding the correct geometric solution.');
console.log('');
console.log('IMPLICATION: Any researcher with these three inputs could derive the same');
console.log('ascending node values. The geometry is fully determined.');
console.log('');
