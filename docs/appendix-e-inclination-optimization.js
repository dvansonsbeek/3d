// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX E: INCLINATION PARAMETER OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════
//
// This script CALCULATES optimal mean and amplitude values for each planet's
// inclination oscillation. It finds the best values that:
// 1. Match the exact J2000 invariable plane inclination
// 2. Minimize error vs JPL observed ecliptic inclination trend
// 3. Stay within Laplace-Lagrange secular bounds
//
// Depends on: Appendix A (provides ascending node values used here)
//
// Usage: node appendix-e-inclination-optimization.js
//
// Output: Recommended constants for script.js
//
// Reference: Laplace-Lagrange secular theory, Souami & Souchay (2012)
// ═══════════════════════════════════════════════════════════════════════════

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const holisticyearLength = 333888;

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE (FIXED - these are inputs, not optimized)
// ═══════════════════════════════════════════════════════════════════════════

const earthConfig = {
  omegaJ2000: 284.51,                     // Souami & Souchay (2012)
  period: holisticyearLength / 3,         // 111,296 years
  mean: 1.481592,
  amplitude: 0.633849,
  inclJ2000: 1.57867339,
  phaseAngle: 203
};

// Calculate Earth's initial phase from J2000 constraint
const earthCosPhase0 = (earthConfig.inclJ2000 - earthConfig.mean) / earthConfig.amplitude;
const earthPhase0 = Math.acos(earthCosPhase0);

function getEarthInclination(year) {
  const phase = earthPhase0 + 2 * Math.PI * (year - 2000) / earthConfig.period;
  return earthConfig.mean + earthConfig.amplitude * Math.cos(phase);
}

function getEarthOmega(year) {
  return earthConfig.omegaJ2000 + (360 / earthConfig.period) * (year - 2000);
}

// ═══════════════════════════════════════════════════════════════════════════
// JPL ECLIPTIC INCLINATION TREND RATES (degrees/century)
// Source: JPL Approximate Positions of the Planets
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
// ═══════════════════════════════════════════════════════════════════════════
const jplTrends = {
  mercury: -0.00595,   // DECREASING
  venus:   -0.00079,   // DECREASING
  mars:    -0.00813,   // DECREASING
  jupiter: -0.00184,   // DECREASING
  saturn:  +0.00194,   // INCREASING
  uranus:  -0.00243,   // DECREASING
  neptune: +0.00035,   // INCREASING
  pluto:   -0.00100    // DECREASING (estimated)
};

// ═══════════════════════════════════════════════════════════════════════════
// LAPLACE-LAGRANGE BOUNDS (from secular theory)
// Source: Farside physics textbook Table 10.4
// https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html
// Note: Some bounds are adjusted for J2000 calibration or retrograde precession
// ═══════════════════════════════════════════════════════════════════════════
const laplaceLagrangeBounds = {
  mercury: { min: 4.57, max: 9.86 },     // Table 10.4: 4.57° - 9.86°
  venus:   { min: 0.72, max: 4.11 },     // Table 10.4: 0.00° - 3.38° (adjusted for J2000)
  mars:    { min: 0.00, max: 5.84 },     // Table 10.4: 0.00° - 5.84°
  jupiter: { min: 0.241, max: 0.489 },   // Table 10.4: 0.241° - 0.489°
  saturn:  { min: 0.43, max: 1.53 },     // Table 10.4: 0.797° - 1.02° (expanded for retrograde)
  uranus:  { min: 0.902, max: 1.11 },    // Table 10.4: 0.902° - 1.11°
  neptune: { min: 0.554, max: 0.800 },   // Table 10.4: 0.554° - 0.800°
  pluto:   { min: 15.0, max: 16.5 }      // Estimated (not in Table 10.4)
};

// ═══════════════════════════════════════════════════════════════════════════
// FIXED INPUT PARAMETERS (from Souami & Souchay 2012 and model)
// These are INPUTS to the optimization - we find mean/amplitude from these
// ═══════════════════════════════════════════════════════════════════════════
const planetInputs = {
  mercury: {
    name: 'Mercury',
    omegaJ2000: 32.83,                              // Verified ascending node
    inclJ2000: 6.3472858,                           // J2000 inv plane inclination (S&S 2012)
    period: holisticyearLength / (1 + 5/13),        // ~241,164 years
    phaseAngle: 203.3195,                           // Prograde
    periodExpr: 'holisticyearLength/(1+(5/13))'
  },
  venus: {
    name: 'Venus',
    omegaJ2000: 54.70,
    inclJ2000: 2.1545441,
    period: holisticyearLength * 2,                 // 667,776 years
    phaseAngle: 203.3195,
    periodExpr: 'holisticyearLength*2'
  },
  mars: {
    name: 'Mars',
    omegaJ2000: 354.87,
    inclJ2000: 1.6311858,
    period: holisticyearLength / (4 + 5/13),        // ~77,207 years
    phaseAngle: 203.3195,
    periodExpr: 'holisticyearLength/(4+(5/13))'
  },
  jupiter: {
    name: 'Jupiter',
    omegaJ2000: 312.89,
    inclJ2000: 0.3219652,
    period: holisticyearLength / 5,                 // 66,778 years
    phaseAngle: 203.3195,
    periodExpr: 'holisticyearLength/5'
  },
  saturn: {
    name: 'Saturn',
    omegaJ2000: 118.81,
    inclJ2000: 0.9254704,
    period: -holisticyearLength / 8,                // -41,736 years (RETROGRADE)
    phaseAngle: 23.3195,                            // 203.3195 - 180 for retrograde
    periodExpr: '-holisticyearLength/8'
  },
  uranus: {
    name: 'Uranus',
    omegaJ2000: 307.80,
    inclJ2000: 0.9946692,
    period: holisticyearLength / 3,                 // 111,296 years
    phaseAngle: 203.3195,
    periodExpr: 'holisticyearLength/3'
  },
  neptune: {
    name: 'Neptune',
    omegaJ2000: 192.04,
    inclJ2000: 0.7354155,
    period: holisticyearLength * 2,                 // 667,776 years
    phaseAngle: 203.3195,
    periodExpr: 'holisticyearLength*2'
  },
  pluto: {
    name: 'Pluto',
    omegaJ2000: 101.06,
    inclJ2000: 15.5639473,
    period: holisticyearLength,                     // 333,888 years
    phaseAngle: 203.3195,
    periodExpr: 'holisticyearLength'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function optimizePlanet(key) {
  const input = planetInputs[key];
  const bounds = laplaceLagrangeBounds[key];
  const targetTrend = jplTrends[key];

  const { omegaJ2000, inclJ2000, period, phaseAngle } = input;

  // Calculate phase at J2000
  const phaseAtJ2000 = (omegaJ2000 - phaseAngle) * DEG2RAD;
  const cosPhaseJ2000 = Math.cos(phaseAtJ2000);

  // Helper: Calculate planet inclination at a given year
  function getPlanetInclination(year, mean, amplitude) {
    const omega = omegaJ2000 + (360 / period) * (year - 2000);
    const phase = (omega - phaseAngle) * DEG2RAD;
    return mean + amplitude * Math.cos(phase);
  }

  // Helper: Calculate ecliptic inclination (angle between planet and Earth orbital planes)
  function calcEclipticIncl(year, mean, amplitude) {
    const planetI = getPlanetInclination(year, mean, amplitude) * DEG2RAD;
    const planetOmega = (omegaJ2000 + (360 / period) * (year - 2000)) * DEG2RAD;
    const earthI = getEarthInclination(year) * DEG2RAD;
    const earthOmega = getEarthOmega(year) * DEG2RAD;

    // Calculate orbital plane normals
    const pnx = Math.sin(planetI) * Math.sin(planetOmega);
    const pny = Math.sin(planetI) * Math.cos(planetOmega);
    const pnz = Math.cos(planetI);

    const enx = Math.sin(earthI) * Math.sin(earthOmega);
    const eny = Math.sin(earthI) * Math.cos(earthOmega);
    const enz = Math.cos(earthI);

    // Dot product gives cos(angle between planes)
    const dot = pnx*enx + pny*eny + pnz*enz;
    return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
  }

  let best = null;

  // Search over mean values - amplitude is determined by J2000 constraint
  // Formula: i_J2000 = mean + amplitude * cos(phase_J2000)
  // Therefore: amplitude = (i_J2000 - mean) / cos(phase_J2000)

  const meanRange = Math.max(bounds.max - bounds.min, 1);
  const step = meanRange / 10000;  // Fine-grained search

  for (let mean = bounds.min + 0.0001; mean <= bounds.max - 0.0001; mean += step) {
    // Calculate required amplitude to match J2000 exactly
    if (Math.abs(cosPhaseJ2000) < 0.01) continue;  // Avoid division by near-zero

    const amplitude = (inclJ2000 - mean) / cosPhaseJ2000;

    // Check if amplitude is valid
    if (amplitude < 0) continue;                    // Amplitude must be positive
    if (mean + amplitude > bounds.max + 0.001) continue;  // Check upper bound
    if (mean - amplitude < bounds.min - 0.001) continue;  // Check lower bound

    // Verify J2000 value matches exactly
    const i2000_check = mean + amplitude * cosPhaseJ2000;
    if (Math.abs(i2000_check - inclJ2000) > 0.00001) continue;

    // Calculate ecliptic inclination trend
    const ecl1900 = calcEclipticIncl(1900, mean, amplitude);
    const ecl2100 = calcEclipticIncl(2100, mean, amplitude);
    const trend = (ecl2100 - ecl1900) / 2;  // degrees per century
    const trendError = Math.abs(trend - targetTrend);

    if (!best || trendError < best.trendError) {
      best = {
        mean,
        amplitude,
        trend,
        trendError,
        i2000_inv: i2000_check,
        rangeMin: mean - amplitude,
        rangeMax: mean + amplitude,
        directionMatch: (targetTrend >= 0) === (trend >= 0)
      };
    }
  }

  return best;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║         APPENDIX E: PLANETARY INCLINATION PARAMETER OPTIMIZATION         ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This script CALCULATES optimal mean/amplitude values for each planet.   ║');
console.log('║  Output can be used directly in script.js.                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('INPUT PARAMETERS (fixed):');
console.log('  - Ascending nodes (Ω): J2000-verified values from script.js');
console.log('  - J2000 inclinations: Souami & Souchay (2012)');
console.log('  - Phase angles: 203° prograde, 23° retrograde (s₈ eigenmode)');
console.log('  - Periods: From holisticyearLength ratios');
console.log('');
console.log('OPTIMIZATION GOAL:');
console.log('  - Exact J2000 invariable plane inclination match');
console.log('  - Minimize error vs JPL ecliptic inclination trend');
console.log('  - Stay within Laplace-Lagrange bounds');
console.log('');

const results = {};

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const bounds = laplaceLagrangeBounds[key];
  const targetTrend = jplTrends[key];

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${input.name.toUpperCase().padEnd(75)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ INPUTS:                                                                     │`);
  console.log(`│   Ω at J2000:        ${String(input.omegaJ2000 + '°').padEnd(15)} Phase Angle:     ${input.phaseAngle}°               │`);
  console.log(`│   J2000 Inv. Plane:  ${String(input.inclJ2000 + '°').padEnd(15)} Target Trend:    ${(targetTrend >= 0 ? '+' : '') + targetTrend.toFixed(5)}°/cy     │`);
  console.log(`│   Period:            ${input.periodExpr.padEnd(40)}│`);
  console.log(`│   LL Bounds:         [${bounds.min}°, ${bounds.max}°]`.padEnd(76) + '│');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');

  const result = optimizePlanet(key);
  results[key] = result;

  if (result) {
    const trendSign = result.trend >= 0 ? '+' : '';
    const errorArcsec = result.trendError * 3600;

    console.log(`│ OPTIMIZED OUTPUT:                                                           │`);
    console.log(`│   Mean:              ${result.mean.toFixed(6).padEnd(15)} Amplitude:       ${result.amplitude.toFixed(6)}        │`);
    console.log(`│   Range:             [${result.rangeMin.toFixed(3)}°, ${result.rangeMax.toFixed(3)}°]`.padEnd(76) + '│');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');
    console.log(`│ VERIFICATION:                                                               │`);
    console.log(`│   J2000 Match:       ${result.i2000_inv.toFixed(7)}° ✓                                       │`);
    console.log(`│   Trend:             ${trendSign}${result.trend.toFixed(6)}°/cy (error: ${errorArcsec.toFixed(2)}"/cy) ${result.directionMatch ? '✓' : '✗'}               │`);
  } else {
    console.log(`│ ERROR: No valid solution found within Laplace-Lagrange bounds!             │`);
  }

  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT: RECOMMENDED CODE FOR script.js
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    RECOMMENDED CODE FOR script.js                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('// ══════════════════════════════════════════════════════════════════════════════');
console.log('// INCLINATION OSCILLATION PARAMETERS (optimized by appendix-e-inclination-optimization.js)');
console.log('// Formula: i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)');
console.log('// ══════════════════════════════════════════════════════════════════════════════');
console.log('');

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const result = results[key];

  if (result) {
    const errorArcsec = result.trendError * 3600;
    const retro = input.period < 0 ? '  // RETROGRADE' : '';

    console.log(`// ${input.name.toUpperCase()} - J2000: ${input.inclJ2000}°, trend error: ${errorArcsec.toFixed(1)}"/cy`);
    console.log(`const ${key}InvPlaneInclinationMean = ${result.mean.toFixed(6)};`);
    console.log(`const ${key}InvPlaneInclinationAmplitude = ${result.amplitude.toFixed(6)};  // Range: ${result.rangeMin.toFixed(2)}° to ${result.rangeMax.toFixed(2)}°`);
    console.log(`const ${key}InclinationPhaseAngle = ${input.phaseAngle};${retro}`);
    console.log('');
  }
}

// Summary table
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                              SUMMARY TABLE                                ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ Mean       │ Amplitude │ Range           │ Error   │ Dir ║');
console.log('╠══════════╪════════════╪═══════════╪═════════════════╪═════════╪═════╣');

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const result = results[key];

  if (result) {
    const name = input.name.padEnd(8);
    const mean = result.mean.toFixed(4).padStart(10);
    const ampl = result.amplitude.toFixed(4).padStart(9);
    const range = `${result.rangeMin.toFixed(2)} - ${result.rangeMax.toFixed(2)}`.padStart(15);
    const error = (result.trendError * 3600).toFixed(1).padStart(7) + '"';
    const dir = result.directionMatch ? ' ✓  ' : ' ✗  ';

    console.log(`║ ${name} │ ${mean} │ ${ampl} │ ${range} │ ${error} │${dir}║`);
  }
}

console.log('╚══════════╧════════════╧═══════════╧═════════════════╧═════════╧═════╝');
console.log('');
console.log('Notes:');
console.log('- Mean and Amplitude are CALCULATED from inputs (Ω, J2000 incl, phase angle)');
console.log('- The optimization finds values that minimize JPL trend error');
console.log('- All planets match J2000 invariable plane inclination exactly');
console.log('- Saturn uses retrograde precession (negative period, phase angle 23°)');
console.log('');
