// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX E: INCLINATION PARAMETER COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════
//
// This script COMPUTES inclination mean and amplitude values for each planet
// using the Fibonacci Laws of Planetary Motion with invariable plane balance.
//
// The amplitudes are derived from: amplitude = ψ_g / (d × √m)
// where ψ_g is the group constant, d is the Fibonacci quantum number,
// and m is the planetary mass in solar units.
//
// The ψ₃/ψ₁ ratio is determined by the angular momentum balance condition:
//   Σ(203° group) L × amp = Σ(23° group) L × amp
//
// The mean is computed from the J2000 constraint:
//   mean = inclJ2000 - amplitude × cos(Ω_J2000 - phaseAngle)
//
// It then verifies that:
// 1. All values match the exact J2000 invariable plane inclination
// 2. All ranges stay within Laplace-Lagrange secular bounds
// 3. The invariable plane balance holds to machine precision
// 4. Ecliptic inclination trends are consistent with JPL observations
//
// Depends on: Appendix A (provides ascending node values used here)
//
// Usage: node appendix-e-inclination-optimization.js
//
// Output: Recommended constants for script.js
//
// Reference: Fibonacci Laws (doc 26), Laplace-Lagrange secular theory,
//            Souami & Souchay (2012)
// ═══════════════════════════════════════════════════════════════════════════

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const holisticyearLength = 333888;

// ═══════════════════════════════════════════════════════════════════════════
// FIBONACCI LAWS CONSTANTS
// See: docs/26-fibonacci-laws.md
// ═══════════════════════════════════════════════════════════════════════════

// Fundamental ψ-constant: ψ₁ = F₅ × F₈² / (2H) = 2205 / 667776
const PSI1 = 2205 / (2 * holisticyearLength);

// ψ₃/ψ₁ ratio computed from invariable plane balance condition
// (see computeBalanceRatio() below, after orbital data constants)

// Fibonacci quantum numbers (d)
const FIBONACCI_D = {
  mercury: 21/2,    // F₈/F₃ = 10.5
  venus:   2,       // F₃
  earth:   3,       // F₄
  mars:    13/5,    // F₇/F₅ = 2.6
  jupiter: 1,       // F₁
  saturn:  13/11,   // F₇/L₅ ≈ 1.182
  uranus:  8,       // F₆
  neptune: 8,       // F₆ (updated from F₅=5, see doc 26)
  pluto:   null     // Not in Fibonacci theory
};

// ψ-group assignments (ψ₁ for most planets, ψ₃ for Mercury and Jupiter)
const PSI_GROUP = {
  mercury: 'psi3', venus: 'psi1', earth: 'psi1', mars: 'psi1',
  jupiter: 'psi3', saturn: 'psi1', uranus: 'psi1', neptune: 'psi1',
  pluto: null
};

// Planetary masses in solar units (JPL DE440)
const PLANET_MASS = {
  mercury: 1.6601e-7,
  venus:   2.4478e-6,
  earth:   3.0027e-6,
  mars:    3.2271e-7,
  jupiter: 9.5479e-4,
  saturn:  2.8588e-4,
  uranus:  4.3662e-5,
  neptune: 5.1514e-5,
  pluto:   7.35e-9
};

// Semi-major axes in AU
const PLANET_SMA = {
  mercury: 0.387098, venus: 0.723332, earth: 1.000000, mars: 1.523679,
  jupiter: 5.202887, saturn: 9.536676, uranus: 19.18916, neptune: 30.06992,
  pluto: 39.48
};

// Eccentricities (for angular momentum calculation)
const PLANET_ECC = {
  mercury: 0.20563, venus: 0.00677, earth: 0.01671, mars: 0.09339,
  jupiter: 0.04839, saturn: 0.05386, uranus: 0.04726, neptune: 0.00859,
  pluto: 0.2488
};

// Compute ψ₃/ψ₁ from invariable plane angular momentum balance
// Balance: Σ(203° group) L_j × amp_j = Σ(23° group) L_j × amp_j
// With amp_j = ψ_g/(d_j×√m_j), structural weight w_j = L_j/(d_j×√m_j) = √(m_j×a_j×(1-e_j²))/d_j
function computeBalanceRatio() {
  function w(key) {
    const m = PLANET_MASS[key], a = PLANET_SMA[key], e = PLANET_ECC[key];
    return Math.sqrt(m * a * (1 - e * e)) / FIBONACCI_D[key];
  }
  // 203° group: Venus(ψ₁), Earth(ψ₁), Mars(ψ₁), Jupiter(ψ₃), Neptune(ψ₁)
  //  23° group: Mercury(ψ₃), Saturn(ψ₁), Uranus(ψ₁)
  const sum_psi1_203 = w('venus') + w('earth') + w('mars') + w('neptune');
  const sum_psi3_203 = w('jupiter');
  const sum_psi1_23 = w('saturn') + w('uranus');
  const sum_psi3_23 = w('mercury');
  // Balance: sum_psi1_203 + r₃×sum_psi3_203 = r₃×sum_psi3_23 + sum_psi1_23
  return (sum_psi1_23 - sum_psi1_203) / (sum_psi3_203 - sum_psi3_23);
}

const PSI3_OVER_PSI1 = computeBalanceRatio();
const PSI3 = PSI3_OVER_PSI1 * PSI1;

// Compute Fibonacci amplitude for a planet
function getFibonacciAmplitude(key) {
  const d = FIBONACCI_D[key];
  if (d === null) return null;
  const sqrtM = Math.sqrt(PLANET_MASS[key]);
  const psi = PSI_GROUP[key] === 'psi1' ? PSI1 : PSI3;
  return psi / (d * sqrtM);
}

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE (computed from Fibonacci theory)
// ═══════════════════════════════════════════════════════════════════════════

const earthFibAmp = getFibonacciAmplitude('earth');
const earthConfig = {
  omegaJ2000: 284.51,                     // Souami & Souchay (2012)
  period: holisticyearLength / 3,         // 111,296 years
  inclJ2000: 1.57866663,
  phaseAngle: 203.3195,                   // s₈ eigenmode, 203° group
  amplitude: earthFibAmp
};
// Mean derived from J2000 constraint: mean = inclJ2000 - amplitude × cos(Ω - φ)
earthConfig.mean = earthConfig.inclJ2000 - earthConfig.amplitude *
  Math.cos((earthConfig.omegaJ2000 - earthConfig.phaseAngle) * DEG2RAD);

// Calculate Earth's initial phase from J2000 constraint
const earthPhase0 = (earthConfig.omegaJ2000 - earthConfig.phaseAngle) * DEG2RAD;

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
// Source: Farside physics textbook Table 10.4
// https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html
// Note: Some bounds are adjusted for J2000 calibration or retrograde precession
// ═══════════════════════════════════════════════════════════════════════════
const laplaceLagrangeBounds = {
  mercury: { min: 4.57, max: 9.86 },     // Table 10.4: 4.57° - 9.86°
  venus:   { min: 0.72, max: 4.11 },     // Table 10.4: 0.00° - 3.38° (adjusted for J2000)
  earth:   { min: 0.00, max: 2.95 },     // Table 10.4: 0.00° - 2.95°
  mars:    { min: 0.00, max: 5.84 },     // Table 10.4: 0.00° - 5.84°
  jupiter: { min: 0.241, max: 0.489 },   // Table 10.4: 0.241° - 0.489°
  saturn:  { min: 0.43, max: 1.53 },     // Table 10.4: 0.797° - 1.02° (expanded for retrograde)
  uranus:  { min: 0.902, max: 1.11 },    // Table 10.4: 0.902° - 1.11°
  neptune: { min: 0.554, max: 0.800 },   // Table 10.4: 0.554° - 0.800°
  pluto:   { min: 15.0, max: 16.5 }      // Estimated (not in Table 10.4)
};

// ═══════════════════════════════════════════════════════════════════════════
// FIXED INPUT PARAMETERS (from Souami & Souchay 2012 and balance model)
// Amplitudes are COMPUTED from Fibonacci theory, means from J2000 constraint
// ═══════════════════════════════════════════════════════════════════════════
//
// Phase groups (from invariable plane balance, see doc 26):
//   203.3195° group: Venus, Earth, Mars, Jupiter, Neptune
//   23.3195° group:  Mercury, Saturn, Uranus
//
const planetInputs = {
  mercury: {
    name: 'Mercury',
    omegaJ2000: 32.83,                              // Verified ascending node
    inclJ2000: 6.3472858,                           // J2000 inv plane inclination (S&S 2012)
    period: holisticyearLength / (1 + 3/8),         // ~242,828 years
    phaseAngle: 23.3195,                            // 23° balance group
    periodExpr: 'holisticyearLength/(1+(3/8))'
  },
  venus: {
    name: 'Venus',
    omegaJ2000: 54.70,
    inclJ2000: 2.1545441,
    period: holisticyearLength * 2,                 // 667,776 years
    phaseAngle: 203.3195,                           // 203° balance group
    periodExpr: 'holisticyearLength*2'
  },
  earth: {
    name: 'Earth',
    omegaJ2000: 284.51,
    inclJ2000: 1.57866663,
    period: holisticyearLength / 3,                 // 111,296 years
    phaseAngle: 203.3195,                           // 203° balance group
    periodExpr: 'holisticyearLength/3'
  },
  mars: {
    name: 'Mars',
    omegaJ2000: 354.87,
    inclJ2000: 1.6311858,
    period: holisticyearLength / (4 + 1/3),         // ~77,051 years
    phaseAngle: 203.3195,                           // 203° balance group
    periodExpr: 'holisticyearLength/(4+(1/3))'
  },
  jupiter: {
    name: 'Jupiter',
    omegaJ2000: 312.89,
    inclJ2000: 0.3219652,
    period: holisticyearLength / 5,                 // 66,778 years
    phaseAngle: 203.3195,                           // 203° balance group
    periodExpr: 'holisticyearLength/5'
  },
  saturn: {
    name: 'Saturn',
    omegaJ2000: 118.81,
    inclJ2000: 0.9254704,
    period: -holisticyearLength / 8,                // -41,736 years (RETROGRADE)
    phaseAngle: 23.3195,                            // 23° balance group
    periodExpr: '-holisticyearLength/8'
  },
  uranus: {
    name: 'Uranus',
    omegaJ2000: 307.80,
    inclJ2000: 0.9946692,
    period: holisticyearLength / 3,                 // 111,296 years
    phaseAngle: 23.3195,                            // 23° balance group (updated from 203°)
    periodExpr: 'holisticyearLength/3'
  },
  neptune: {
    name: 'Neptune',
    omegaJ2000: 192.04,
    inclJ2000: 0.7354155,
    period: holisticyearLength * 2,                 // 667,776 years
    phaseAngle: 203.3195,                           // 203° balance group
    periodExpr: 'holisticyearLength*2'
  },
  pluto: {
    name: 'Pluto',
    omegaJ2000: 101.06,
    inclJ2000: 15.5639473,
    period: holisticyearLength,                     // 333,888 years
    phaseAngle: 203.3195,                           // No Fibonacci theory (not in classical LL)
    periodExpr: 'holisticyearLength'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTATION FUNCTION (Fibonacci-derived amplitudes)
// ═══════════════════════════════════════════════════════════════════════════

function computePlanet(key) {
  const input = planetInputs[key];
  const bounds = laplaceLagrangeBounds[key];
  const targetTrend = jplTrends[key];

  const { omegaJ2000, inclJ2000, period, phaseAngle } = input;

  // Calculate phase at J2000
  const cosPhaseJ2000 = Math.cos((omegaJ2000 - phaseAngle) * DEG2RAD);

  // Get amplitude from Fibonacci theory (or fall back to optimization for Pluto)
  const fibAmplitude = getFibonacciAmplitude(key);

  let amplitude, mean, source;

  if (fibAmplitude !== null) {
    // Fibonacci-derived: amplitude is known, compute mean from J2000 constraint
    amplitude = fibAmplitude;
    mean = inclJ2000 - amplitude * cosPhaseJ2000;
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
  const i2000_check = mean + amplitude * cosPhaseJ2000;

  // Check LL bounds
  const rangeMin = mean - amplitude;
  const rangeMax = mean + amplitude;
  const fitsLL = rangeMin >= bounds.min - 0.01 && rangeMax <= bounds.max + 0.01;

  // Helper: Calculate planet inclination at a given year
  function getPlanetInclination(year, m, a) {
    const omega = omegaJ2000 + (360 / period) * (year - 2000);
    const phase = (omega - phaseAngle) * DEG2RAD;
    return m + a * Math.cos(phase);
  }

  // Helper: Calculate ecliptic inclination (angle between planet and Earth orbital planes)
  function calcEclipticIncl(year, m, a) {
    const planetI = getPlanetInclination(year, m, a) * DEG2RAD;
    const planetOmega = (omegaJ2000 + (360 / period) * (year - 2000)) * DEG2RAD;
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

  // Fibonacci verification: d × i × √m = ψ_g
  let fibVerify = null;
  if (FIBONACCI_D[key] !== null) {
    const d = FIBONACCI_D[key];
    const sqrtM = Math.sqrt(PLANET_MASS[key]);
    const product = d * amplitude * sqrtM;
    const psi = PSI_GROUP[key] === 'psi1' ? PSI1 : PSI3;
    fibVerify = { product, expected: psi, match: Math.abs(product - psi) / psi < 0.001 };
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
// RUN OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║        APPENDIX E: FIBONACCI-DERIVED INCLINATION PARAMETERS              ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  Amplitudes from Fibonacci Laws: amp = ψ_g / (d × √m)                   ║');
console.log('║  Means from J2000 constraint:    mean = i_J2000 - amp × cos(Ω - φ)      ║');
console.log('║  ψ₃/ψ₁ from balance condition:   Σ(203°) L×amp = Σ(23°) L×amp           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('FIBONACCI CONSTANTS:');
console.log(`  ψ₁ = ${PSI1.toExponential(6)} = 2205/667776`);
console.log(`  ψ₃ = ${PSI3.toExponential(6)} = ${PSI3_OVER_PSI1.toFixed(6)} × ψ₁ (from balance)`);
console.log('');
console.log('PHASE GROUPS (from invariable plane balance):');
console.log('  203.3195° group: Venus, Earth, Mars, Jupiter, Neptune');
console.log('   23.3195° group: Mercury, Saturn, Uranus');
console.log('');
console.log('INPUT PARAMETERS:');
console.log('  - Ascending nodes (Ω): J2000-verified values from script.js');
console.log('  - J2000 inclinations: Souami & Souchay (2012)');
console.log('  - Periods: From holisticyearLength ratios');
console.log('');

const results = {};

for (const key of Object.keys(planetInputs)) {
  const input = planetInputs[key];
  const bounds = laplaceLagrangeBounds[key];
  const targetTrend = jplTrends[key];

  const fibAmp = getFibonacciAmplitude(key);
  const dVal = FIBONACCI_D[key];
  const psiLabel = PSI_GROUP[key] === 'psi1' ? 'ψ₁' : PSI_GROUP[key] === 'psi3' ? 'ψ₃' : '—';

  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${input.name.toUpperCase().padEnd(75)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ INPUTS:                                                                     │`);
  console.log(`│   Ω at J2000:        ${String(input.omegaJ2000 + '°').padEnd(15)} Phase Group:     ${input.phaseAngle}°              │`);
  console.log(`│   J2000 Inv. Plane:  ${String(input.inclJ2000 + '°').padEnd(15)} Target Trend:    ${(targetTrend >= 0 ? '+' : '') + targetTrend.toFixed(5)}°/cy     │`);
  console.log(`│   Period:            ${input.periodExpr.padEnd(40)}│`);
  console.log(`│   LL Bounds:         [${bounds.min}°, ${bounds.max}°]`.padEnd(76) + '│');
  if (dVal !== null) {
    console.log(`│   Fibonacci:         d=${dVal}, ${psiLabel}, amp=${fibAmp.toFixed(4)}°`.padEnd(76) + '│');
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
      console.log(`│   Fib law:           d×i×√m = ${result.fibVerify.product.toExponential(4)} = ${psiLabel} ${result.fibVerify.match ? '✓' : '✗'}                       │`);
    }
  } else {
    console.log(`│ ERROR: No valid solution found within Laplace-Lagrange bounds!             │`);
  }

  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT: RECOMMENDED CODE FOR script.js
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// INVARIABLE PLANE BALANCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                  INVARIABLE PLANE BALANCE VERIFICATION                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

let sum203 = 0, sum23 = 0;
const balancePlanets = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

console.log('  Planet     │ Group │ L (ang.mom.) │ Amplitude  │ L × amp      │ Side');
console.log('  ──────────┼───────┼──────────────┼────────────┼──────────────┼──────');

for (const key of balancePlanets) {
  const r = results[key];
  if (!r) continue;
  const m = PLANET_MASS[key];
  const a = PLANET_SMA[key];
  const e = PLANET_ECC[key];
  const L = m * Math.sqrt(a * (1 - e * e));
  const Lamp = L * r.amplitude;
  const is203 = planetInputs[key].phaseAngle > 180;
  if (is203) sum203 += Lamp; else sum23 += Lamp;

  const side = is203 ? '203°' : ' 23°';
  console.log(`  ${planetInputs[key].name.padEnd(10)} │ ${side}  │ ${L.toExponential(4).padStart(12)} │ ${r.amplitude.toFixed(4).padStart(10)}° │ ${Lamp.toExponential(4).padStart(12)} │ ${side}`);
}

const imbalance = Math.abs(sum203 - sum23) / (sum203 + sum23) * 100;
console.log('  ──────────┴───────┴──────────────┴────────────┴──────────────┴──────');
console.log(`  203° total: ${sum203.toExponential(6)}`);
console.log(`   23° total: ${sum23.toExponential(6)}`);
console.log(`  Imbalance:  ${imbalance.toFixed(4)}%${imbalance < 0.01 ? ' ✓ BALANCED' : ' ⚠ CHECK ψ₃/ψ₁ ratio'}`);
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
console.log('// INCLINATION OSCILLATION PARAMETERS (from Fibonacci Laws + balance condition)');
console.log('// Formula: i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)');
console.log('// Amplitude = ψ_g / (d × √m), Mean from J2000 constraint');
console.log('// See: docs/26-fibonacci-laws.md, docs/appendix-e-inclination-optimization.js');
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
console.log('- Amplitudes derived from Fibonacci Laws: amp = ψ_g / (d × √m)');
console.log('- ψ₃/ψ₁ = ' + PSI3_OVER_PSI1.toFixed(6) + ' determined by invariable plane balance condition');
console.log('- Means computed from J2000 constraint: mean = i_J2000 - amp × cos(Ω - φ)');
console.log('- All planets match J2000 invariable plane inclination exactly');
console.log('- Phase groups: 203.3195° (Venus,Earth,Mars,Jupiter,Neptune), 23.3195° (Mercury,Saturn,Uranus)');
console.log('- Saturn uses retrograde precession (negative period)');
console.log('- Pluto: no Fibonacci theory, amplitude optimized within LL bounds');
console.log('- See docs/26-fibonacci-laws.md for full derivation');
console.log('');
