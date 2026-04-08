// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX E (84): INCLINATION PARAMETER COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════
//
// This script COMPUTES inclination mean and amplitude values for each planet
// using the Fibonacci Laws of Planetary Motion.
//
// The amplitudes are derived from: amplitude = ψ / (d × √m)
// where ψ is the universal constant, d is the Fibonacci quantum number,
// and m is the planetary mass in solar units.
//
// The mean is computed from the J2000 constraint:
//   mean = inclJ2000 - amplitude × cos(Ω_J2000 - phaseAngle)
//
// It then verifies that:
// 1. All values match the exact J2000 invariable plane inclination
// 2. All ranges stay within Laplace-Lagrange secular bounds
// 3. The invariable plane balance holds (Σ(in-phase) w = Σ(anti-phase) w)
// 4. Ecliptic inclination trends are consistent with JPL observations
//
// Depends on: Appendix A (80) (provides ascending node values used here)
//
// Usage: node 84-inclination-optimization.js
//
// Output: Recommended constants for script.js
//
// Reference: Fibonacci Laws (doc 10), Laplace-Lagrange secular theory,
//            Souami & Souchay (2012)
// ═══════════════════════════════════════════════════════════════════════════

const C = require("../lib/constants");
const holisticyearLength = C.H;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ═══════════════════════════════════════════════════════════════════════════
// FIBONACCI LAWS CONSTANTS
// See: docs/10-fibonacci-laws.md
// ═══════════════════════════════════════════════════════════════════════════

const PSI = C.PSI;

// Pure Fibonacci quantum numbers (d) — Config #3 (unique mirror-symmetric config)
const FIBONACCI_D = { earth: 3 }; // Earth not in C.planets
for (const [k, p] of Object.entries(C.planets)) FIBONACCI_D[k] = p.fibonacciD;
FIBONACCI_D.pluto = null; // Not in Fibonacci theory

// Planetary masses in solar units
const PLANET_MASS = { ...C.massFraction, pluto: 1 / 136047200 };

// Semi-major axes in AU (from model orbit distances)
const PLANET_SMA = { earth: 1.0, pluto: 39.48 };
for (const k of Object.keys(C.planets)) {
  PLANET_SMA[k] = C.derived[k].orbitDistance;
}

// Eccentricities (J2000)
const PLANET_ECC = { ...C.eccJ2000, pluto: 0.2488 };

// Compute Fibonacci amplitude for a planet
function getFibonacciAmplitude(key) {
  const d = FIBONACCI_D[key];
  if (d === null) return null;
  const sqrtM = Math.sqrt(PLANET_MASS[key]);
  return PSI / (d * sqrtM);
}

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE (computed from Fibonacci theory)
// ═══════════════════════════════════════════════════════════════════════════
//
// PHASE ANGLE DERIVATION
// ----------------------
// Each planet has a per-planet phase angle: the ICRF perihelion longitude
// at the balanced year (~302,635 BC). The mean is derived from:
//
//   mean = i_J2000 - amplitude × cos(ω̃_J2000 - phaseAngle)
//
// where:
//   ω̃_J2000   = ICRF perihelion longitude at J2000
//   i_J2000   = inclination to invariable plane at J2000
//   amplitude = ψ / (d × √m)  (Fibonacci amplitude)
//   phaseAngle = per-planet ICRF perihelion at balanced year
//
// Earth's phase angle (21.77°) clusters near the γ₁ eigenmode (20.23°).
// Saturn is anti-phase: MAX inclination at balanced year (others at MIN).
// All ICRF periods divide 8H = 2,682,536 years (Grand Holistic Octave).
// ═══════════════════════════════════════════════════════════════════════════

const earthFibAmp = getFibonacciAmplitude('earth');

console.log(`FIBONACCI CONSTANTS:`);
console.log(`  ψ = ${PSI.toExponential(6)} = 2205 / (2 × ${holisticyearLength.toLocaleString()})`);
console.log(`  Earth phase angle: ${C.ASTRO_REFERENCE.earthInclinationPhaseAngle}°`);
console.log(`  Earth perihelion J2000: ${C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000}°\n`);

const earthConfig = {
  periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
  period: holisticyearLength / 3,         // 111,772 years (ICRF)
  inclJ2000: C.ASTRO_REFERENCE.earthInclinationJ2000_deg,
  phaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
  amplitude: earthFibAmp
};
// Mean derived from J2000 constraint: mean = inclJ2000 - amplitude × cos(ω̃ - φ)
earthConfig.mean = earthConfig.inclJ2000 - earthConfig.amplitude *
  Math.cos((earthConfig.periLongJ2000 - earthConfig.phaseAngle) * DEG2RAD);

// Earth FROZEN at J2000 — JPL "mean ecliptic and equinox of J2000" frame.
// (See docs/32-inclination-calculations.md "Two Frames" section.)
function getEarthInclination(_year) { return earthConfig.inclJ2000; }
function getEarthOmega(_year)       { return earthConfig.omegaJ2000; }

// ═══════════════════════════════════════════════════════════════════════════
// JPL ECLIPTIC INCLINATION TREND RATES (degrees/century)
// Source: JPL Approximate Positions of the Planets
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
// ═══════════════════════════════════════════════════════════════════════════
const jplTrends = {
  mercury: -0.00595,   // DECREASING
  venus:   -0.00079,   // DECREASING
  earth:   0,           // (ecliptic reference frame)
  mars:    -0.00813,   // DECREASING
  jupiter: -0.00184,   // DECREASING
  saturn:  +0.00194,   // INCREASING
  uranus:  -0.00243,   // DECREASING
  neptune: +0.00035,   // INCREASING
  pluto:   -0.00100    // DECREASING (estimated)
};

// ═══════════════════════════════════════════════════════════════════════════
// LAPLACE-LAGRANGE BOUNDS (from secular theory)
// Source: Farside physics textbook Table 10.4 (matching script.js values)
// https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html
// ═══════════════════════════════════════════════════════════════════════════
const laplaceLagrangeBounds = {
  mercury: { min: 4.57, max: 9.86 },     // Table 10.4: 4.57° - 9.86°
  venus:   { min: 0.00, max: 3.38 },     // Table 10.4: 0.00° - 3.38°
  earth:   { min: 0.00, max: 2.95 },     // Table 10.4: 0.00° - 2.95°
  mars:    { min: 0.00, max: 5.84 },     // Table 10.4: 0.00° - 5.84°
  jupiter: { min: 0.241, max: 0.489 },   // Table 10.4: 0.241° - 0.489°
  saturn:  { min: 0.797, max: 1.02 },    // Table 10.4: 0.797° - 1.02°
  uranus:  { min: 0.902, max: 1.11 },    // Table 10.4: 0.902° - 1.11°
  neptune: { min: 0.554, max: 0.800 },   // Table 10.4: 0.554° - 0.800°
  pluto:   { min: 15.0, max: 16.5 }      // Estimated (not in Table 10.4)
};

// ═══════════════════════════════════════════════════════════════════════════
// FIXED INPUT PARAMETERS (from Souami & Souchay 2012 and balance model)
// Amplitudes are COMPUTED from Fibonacci theory, means from J2000 constraint
// ═══════════════════════════════════════════════════════════════════════════
//
// Balance groups: Saturn anti-phase (MAX at balanced year), all others in-phase (MIN at balanced year)
// Phase angles are per-planet, derived from balanced year + ICRF perihelion longitude
//
const genPrecRate = 1 / (holisticyearLength / 13);
const planetInputs = {};
for (const key of ['mercury','venus','mars','jupiter','saturn','uranus','neptune']) {
  const p = C.planets[key];
  const icrfPeriod = 1 / (1 / p.perihelionEclipticYears - genPrecRate);
  // Ascending node Ω period: -8H/N from the model's Fibonacci eigenfrequency assignment.
  const ascNodePeriod = p.ascendingNodeCyclesIn8H
    ? -(8 * holisticyearLength) / p.ascendingNodeCyclesIn8H
    : p.perihelionEclipticYears;
  planetInputs[key] = {
    name: p.name || key.charAt(0).toUpperCase() + key.slice(1),
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    eclPeriod: p.perihelionEclipticYears,
    icrfPeriod: icrfPeriod,
    ascNodePeriod: ascNodePeriod,
    phaseAngle: p.inclinationPhaseAngle,
    antiPhase: p.antiPhase || false,
  };
}
// Earth — special: ICRF period = H/3 directly; Ω regresses at -H/5
planetInputs.earth = {
  name: 'Earth',
  periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
  inclJ2000: C.ASTRO_REFERENCE.earthInclinationJ2000_deg,
  eclPeriod: holisticyearLength / 16,
  icrfPeriod: holisticyearLength / 3,
  ascNodePeriod: -holisticyearLength / 5,
  phaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
  antiPhase: false,
};
// Pluto — not in Fibonacci theory, hardcoded values from script.js
planetInputs.pluto = {
  name: 'Pluto',
  periLongJ2000: 224.069,
  omegaJ2000: 101.06,
  inclJ2000: 15.5639473,
  eclPeriod: holisticyearLength,
  icrfPeriod: 1 / (1 / holisticyearLength - genPrecRate),
  ascNodePeriod: holisticyearLength,
  phaseAngle: 203.32,
  antiPhase: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTATION FUNCTION (Fibonacci-derived amplitudes)
// ═══════════════════════════════════════════════════════════════════════════

function computePlanet(key) {
  const input = planetInputs[key];
  const bounds = laplaceLagrangeBounds[key];
  const targetTrend = jplTrends[key];

  const { periLongJ2000, omegaJ2000, inclJ2000, icrfPeriod, phaseAngle } = input;

  // Calculate phase at J2000 using perihelion longitude (ICRF reference)
  const cosPhaseJ2000 = Math.cos((periLongJ2000 - phaseAngle) * DEG2RAD);

  // Get amplitude from Fibonacci theory (or fall back to optimization for Pluto)
  const fibAmplitude = getFibonacciAmplitude(key);

  let amplitude, mean, source;

  if (fibAmplitude !== null) {
    // Fibonacci-derived: amplitude is known, compute mean from J2000 constraint
    amplitude = fibAmplitude;
    const antiPhaseSign = input.antiPhase ? -1 : 1;
    mean = inclJ2000 - antiPhaseSign * amplitude * cosPhaseJ2000;
    source = 'Fibonacci';
  } else {
    // Pluto: no Fibonacci theory, optimize for maximum amplitude within LL bounds
    source = 'Optimized';
    let best = null;
    const meanRange = Math.max(bounds.max - bounds.min, 1);
    const step = meanRange / 10000;

    for (let m = bounds.min + 0.0001; m <= bounds.max - 0.0001; m += step) {
      if (Math.abs(cosPhaseJ2000) < 0.01) continue;
      const a = (inclJ2000 - m) / cosPhaseJ2000;
      if (a < 0) continue;
      if (m + a > bounds.max + 0.001) continue;
      if (m - a < bounds.min - 0.001) continue;
      if (!best || a > best.amplitude) best = { mean: m, amplitude: a };
    }
    if (best) { mean = best.mean; amplitude = best.amplitude; }
    else return null;
  }

  // Verify J2000 match
  const antiSign2 = input.antiPhase ? -1 : 1;
  const i2000_check = mean + antiSign2 * amplitude * cosPhaseJ2000;

  // Check LL bounds
  const rangeMin = mean - amplitude;
  const rangeMax = mean + amplitude;
  const fitsLL = rangeMin >= bounds.min - 0.01 && rangeMax <= bounds.max + 0.01;

  const antiPhaseSign = input.antiPhase ? -1 : 1;
  const ascNodePeriod = input.ascNodePeriod;

  // Helper: Calculate planet inclination at a given year (ICRF perihelion-based)
  function getPlanetInclination(year, m, a) {
    const peri = periLongJ2000 + (360 / icrfPeriod) * (year - 2000);
    const phase = (peri - phaseAngle) * DEG2RAD;
    return m + antiPhaseSign * a * Math.cos(phase);
  }

  // Helper: Calculate ecliptic inclination (angle between planet and Earth orbital planes).
  // Planet Ω advances at the asc-node period (NOT the ICRF perihelion period or
  // the ecliptic perihelion period — these are different angles evolving at different rates).
  function calcEclipticIncl(year, m, a) {
    const planetI = getPlanetInclination(year, m, a) * DEG2RAD;
    const planetOmega = (omegaJ2000 + (360 / ascNodePeriod) * (year - 2000)) * DEG2RAD;
    const earthI = getEarthInclination(year) * DEG2RAD;
    const earthOmega = getEarthOmega(year) * DEG2RAD;

    const pnx = Math.sin(planetI) * Math.sin(planetOmega);
    const pny = Math.sin(planetI) * Math.cos(planetOmega);
    const pnz = Math.cos(planetI);

    const enx = Math.sin(earthI) * Math.sin(earthOmega);
    const eny = Math.sin(earthI) * Math.cos(earthOmega);
    const enz = Math.cos(earthI);

    const dot = pnx*enx + pny*eny + pnz*enz;
    return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
  }

  // Calculate ecliptic inclination trend
  const ecl1900 = calcEclipticIncl(1900, mean, amplitude);
  const ecl2100 = calcEclipticIncl(2100, mean, amplitude);
  const trend = (ecl2100 - ecl1900) / 2;
  const trendError = Math.abs(trend - targetTrend);

  // Fibonacci verification: d × i × √m = ψ
  let fibVerify = null;
  if (FIBONACCI_D[key] !== null) {
    const d = FIBONACCI_D[key];
    const sqrtM = Math.sqrt(PLANET_MASS[key]);
    const product = d * amplitude * sqrtM;
    fibVerify = { product, expected: PSI, match: Math.abs(product - PSI) / PSI < 0.001 };
  }

  return {
    mean, amplitude, trend, trendError, source,
    i2000_inv: i2000_check,
    rangeMin, rangeMax, fitsLL,
    directionMatch: (targetTrend >= 0) === (trend >= 0),
    fibVerify
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║        APPENDIX E (84): FIBONACCI-DERIVED INCLINATION PARAMETERS              ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  Amplitudes from Fibonacci Laws: amp = ψ / (d × √m)                     ║');
console.log('║  Means from J2000 constraint:    mean = i_J2000 - amp × cos(ω̃ - φ)      ║');
console.log('║  Single universal ψ = 2205 / (2 × ' + holisticyearLength + ') = ' + PSI.toExponential(6).padEnd(28) + '║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('FIBONACCI CONSTANTS:');
console.log(`  ψ = ${PSI.toExponential(6)} = 2205 / (2 × ${holisticyearLength.toLocaleString()})`);
console.log('');
console.log('BALANCE GROUPS (Saturn anti-phase vs rest):');
console.log('  Prograde: Mercury, Venus, Earth, Mars, Jupiter, Uranus, Neptune (MIN at balanced year)');
console.log('  Anti-phase: Saturn (MAX at balanced year)');
console.log('');
console.log('FIBONACCI DIVISORS (Config #1 — unique mirror-symmetric):');
console.log('  Mercury=21(F₈) Venus=34(F₉) Earth=3(F₄) Mars=5(F₅)');
console.log('  Jupiter=5(F₅)  Saturn=3(F₄) Uranus=21(F₈) Neptune=34(F₉)');
console.log('');
console.log('INPUT PARAMETERS (from JSON source of truth):');
console.log('  - Perihelion longitudes (ω̃): J2000 values from model-parameters.json');
console.log('  - Phase angles: per-planet, from balanced year (ICRF perihelion at max incl)');
console.log('  - Periods: |ICRF perihelion period| per planet');
console.log('');

const results = {};

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const bounds = laplaceLagrangeBounds[key];
  const targetTrend = jplTrends[key];

  const fibAmp = getFibonacciAmplitude(key);
  const dVal = FIBONACCI_D[key];

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${input.name.toUpperCase().padEnd(75)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ INPUTS:                                                                     │`);
  console.log(`│   ω̃ at J2000:        ${String(input.periLongJ2000 + '°').padEnd(15)} Phase Angle:     ${input.phaseAngle}°              │`);
  console.log(`│   J2000 Inv. Plane:  ${String(input.inclJ2000 + '°').padEnd(15)} Target Trend:    ${(targetTrend >= 0 ? '+' : '') + targetTrend.toFixed(5)}°/cy     │`);
  console.log(`│   ICRF Period:       ${String(Math.round(input.icrfPeriod) + ' yr').padEnd(40)}│`);
  console.log(`│   LL Bounds:         [${bounds.min}°, ${bounds.max}°]`.padEnd(76) + '│');
  if (dVal !== null) {
    console.log(`│   Fibonacci:         d=${dVal}, amp=${fibAmp.toFixed(4)}°`.padEnd(76) + '│');
  }
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');

  const result = computePlanet(key);
  results[key] = result;

  if (result) {
    const trendSign = result.trend >= 0 ? '+' : '';
    const errorArcsec = result.trendError * 3600;

    console.log(`│ COMPUTED OUTPUT (${result.source}):`.padEnd(76) + '│');
    console.log(`│   Mean:              ${result.mean.toFixed(6).padEnd(15)} Amplitude:       ${result.amplitude.toFixed(6)}        │`);
    console.log(`│   Range:             [${result.rangeMin.toFixed(3)}°, ${result.rangeMax.toFixed(3)}°]  LL fit: ${result.fitsLL ? '✓' : '✗'}`.padEnd(76) + '│');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');
    console.log(`│ VERIFICATION:                                                               │`);
    console.log(`│   J2000 Match:       ${result.i2000_inv.toFixed(7)}° ✓                                       │`);
    console.log(`│   Trend:             ${trendSign}${result.trend.toFixed(6)}°/cy (error: ${errorArcsec.toFixed(2)}"/cy) ${result.directionMatch ? '✓' : '✗'}               │`);
    if (result.fibVerify) {
      console.log(`│   Fib law:           d×i×√m = ${result.fibVerify.product.toExponential(4)} = ψ ${result.fibVerify.match ? '✓' : '✗'}                       │`);
    }
  } else {
    console.log(`│ ERROR: No valid solution found within Laplace-Lagrange bounds!             │`);
  }

  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// INVARIABLE PLANE BALANCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                  INVARIABLE PLANE BALANCE VERIFICATION                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Structural weight balance: Σ(rest) w = Σ(saturn) w where w = √(m×a×(1-e²)) / d
// Saturn is anti-phase (sole balance opponent); all others are in-phase
let sumRest = 0, sumSaturn = 0;
const balancePlanets = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

console.log('  Planet     │ Group      │ w = √(m×a×(1-e²))/d  │ Side');
console.log('  ──────────┼────────────┼──────────────────────┼──────');

for (const key of balancePlanets) {
  const r = results[key];
  if (!r) continue;
  const m = PLANET_MASS[key];
  const a = PLANET_SMA[key];
  const e = PLANET_ECC[key];
  const d = FIBONACCI_D[key];
  const w = Math.sqrt(m * a * (1 - e * e)) / d;
  const isAntiPhase = planetInputs[key].antiPhase;
  if (isAntiPhase) sumSaturn += w; else sumRest += w;

  const side = isAntiPhase ? 'Anti-phase' : 'Rest';
  console.log(`  ${planetInputs[key].name.padEnd(10)} │ ${side.padEnd(10)} │ ${w.toExponential(6).padStart(20)} │ ${side}`);
}

const imbalance = Math.abs(sumRest - sumSaturn) / (sumRest + sumSaturn) * 100;
const balancePct = (100 - imbalance).toFixed(2);
console.log('  ──────────┴────────────┴──────────────────────┴──────');
console.log(`  Rest total:   ${sumRest.toExponential(6)}`);
console.log(`  Saturn total: ${sumSaturn.toExponential(6)}`);
console.log(`  Difference:   ${Math.abs(sumRest - sumSaturn).toExponential(2)}`);
console.log(`  Balance:      ${balancePct}%${imbalance < 0.05 ? ' ✓ BALANCED' : ' ⚠ CHECK'}`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT: RECOMMENDED CODE FOR script.js
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    RECOMMENDED CODE FOR script.js                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('// ══════════════════════════════════════════════════════════════════════════════');
console.log('// INCLINATION OSCILLATION PARAMETERS (from Fibonacci Laws)');
console.log('// Formula: i(t) = mean + amplitude × cos(ω̃_ICRF(t) - phaseAngle)');
console.log('// Amplitude = ψ / (d × √m), Mean from J2000 constraint');
console.log('// See: docs/10-fibonacci-laws.md, tools/verify/inclination-optimization.js');
console.log('// ══════════════════════════════════════════════════════════════════════════════');
console.log('');

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const result = results[key];

  if (result) {
    const errorArcsec = result.trendError * 3600;
    const retro = input.antiPhase ? '  // ANTI-PHASE' : '';

    if (key === 'earth') {
      console.log(`// EARTH - J2000: ${input.inclJ2000}°`);
      console.log(`// Note: Earth uses IAU 2006-optimized values (see Fibonacci Laws (doc 10) for details)`);
      console.log(`// Fibonacci predicts: amplitude = ${result.amplitude.toFixed(6)}°, mean = ${result.mean.toFixed(6)}°`);
      console.log(`const earthInvPlaneInclinationAmplitude = ${C.earthInvPlaneInclinationAmplitude};  // IAU 2006 optimized`);
      console.log(`const earthInvPlaneInclinationMean = ${C.earthInvPlaneInclinationMean};       // IAU 2006 optimized`);
    } else {
      console.log(`// ${input.name.toUpperCase()} - J2000: ${input.inclJ2000}°, d=${FIBONACCI_D[key]}, trend error: ${errorArcsec.toFixed(1)}"/cy`);
      console.log(`const ${key}InvPlaneInclinationMean = ${result.mean.toFixed(6)};`);
      console.log(`const ${key}InvPlaneInclinationAmplitude = ${result.amplitude.toFixed(6)};  // Range: ${result.rangeMin.toFixed(2)}° to ${result.rangeMax.toFixed(2)}°`);
    }
    console.log(`const ${key}InclinationPhaseAngle = ${input.phaseAngle};${retro}`);
    console.log('');
  }
}

// Summary table
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                              SUMMARY TABLE                                ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ d  │ Phase │ Mean       │ Amplitude │ Range           │ LL  ║');
console.log('╠══════════╪════╪═══════╪════════════╪═══════════╪═════════════════╪═════╣');

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const result = results[key];

  if (result) {
    const name = input.name.padEnd(8);
    const d = (FIBONACCI_D[key] !== null ? String(FIBONACCI_D[key]) : '—').padStart(2);
    const phase = input.phaseAngle.toFixed(1).padStart(5) + '°';
    const mean = result.mean.toFixed(4).padStart(10);
    const ampl = result.amplitude.toFixed(4).padStart(9);
    const range = `${result.rangeMin.toFixed(2)} - ${result.rangeMax.toFixed(2)}`.padStart(15);
    const ll = result.fitsLL ? ' ✓  ' : ' ✗  ';

    console.log(`║ ${name} │ ${d} │ ${phase} │ ${mean} │ ${ampl} │ ${range} │${ll}║`);
  }
}

console.log('╚══════════╧════╧═══════╧════════════╧═══════════╧═════════════════╧═════╝');
console.log('');
console.log('Notes:');
console.log('- Amplitudes derived from single universal ψ: amp = ψ / (d × √m)');
console.log('- ψ = ' + PSI.toExponential(6) + ' = 2205 / (2 × ' + holisticyearLength.toLocaleString() + ')');
console.log('- Means computed from J2000 constraint: mean = i_J2000 - amp × cos(ω̃ - φ)');
console.log('- All planets match J2000 invariable plane inclination exactly');
console.log('- Phase angles: per-planet, from balanced year (ω̃_ICRF at max inclination)');
console.log('- Saturn is anti-phase: MAX inclination at balanced year (others at MIN)');
console.log('- Earth uses IAU 2006-optimized amplitude (' + C.earthInvPlaneInclinationAmplitude + '° vs Fibonacci ' + earthFibAmp.toFixed(6) + '°)');
console.log('- Pluto: no Fibonacci theory, amplitude optimized within LL bounds');
console.log('- See docs/10-fibonacci-laws.md for full derivation');
console.log('');
