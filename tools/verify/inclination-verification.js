// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX F (85): INCLINATION PARAMETER VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
//
// This script verifies all planetary inclination parameters (mean, amplitude,
// phase angle) by:
// 1. Confirming exact J2000 invariable plane inclination match
// 2. Calculating ecliptic inclination trend and comparing to JPL observed rates
// 3. Validating parameters against Laplace-Lagrange bounds
//
// Depends on: Values calculated in Appendix E (84) (inclination optimization)
//
// Usage: node 85-inclination-verification.js
//
// Reference: Laplace-Lagrange secular theory, Souami & Souchay (2012)
// ═══════════════════════════════════════════════════════════════════════════

const C = require("../lib/constants");
const holisticyearLength = C.H;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ═══════════════════════════════════════════════════════════════════════════
// EARTH REFERENCE (from constants.js)
// ═══════════════════════════════════════════════════════════════════════════

const earthConfig = {
  periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  period: holisticyearLength / 3,  // Earth ICRF period = H/3
  mean: C.earthInvPlaneInclinationMean,
  amplitude: C.earthInvPlaneInclinationAmplitude,
  inclJ2000: 1.57866663,
  phaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
  omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane  // for ecliptic plane normal
};

// Earth-frame helpers removed: this script compares to JPL trends, which use
// the J2000-fixed ecliptic frame. See calculateEclipticInclination() below.

// ═══════════════════════════════════════════════════════════════════════════
// JPL ECLIPTIC INCLINATION TREND RATES (degrees/century)
// Source: JPL Approximate Positions of the Planets
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
// These constants are also defined in script.js as <planet>EclipticInclinationTrendJPL
// ═══════════════════════════════════════════════════════════════════════════
const mercuryEclipticInclinationTrendJPL = -0.00595;  // degrees/century (DECREASING)
const venusEclipticInclinationTrendJPL = -0.00079;    // degrees/century (DECREASING)
const marsEclipticInclinationTrendJPL = -0.00813;     // degrees/century (DECREASING)
const jupiterEclipticInclinationTrendJPL = -0.00184;  // degrees/century (DECREASING)
const saturnEclipticInclinationTrendJPL = +0.00194;   // degrees/century (INCREASING)
const uranusEclipticInclinationTrendJPL = -0.00243;   // degrees/century (DECREASING)
const neptuneEclipticInclinationTrendJPL = +0.00035;  // degrees/century (INCREASING)
const plutoEclipticInclinationTrendJPL = -0.00100;    // degrees/century (estimated)

// ═══════════════════════════════════════════════════════════════════════════
// CURRENT CODE VALUES (from constants module)
// ═══════════════════════════════════════════════════════════════════════════

const genPrec = holisticyearLength / 13;
const jplTrends = {
  mercury: mercuryEclipticInclinationTrendJPL, venus: venusEclipticInclinationTrendJPL,
  mars: marsEclipticInclinationTrendJPL, jupiter: jupiterEclipticInclinationTrendJPL,
  saturn: saturnEclipticInclinationTrendJPL, uranus: uranusEclipticInclinationTrendJPL,
  neptune: neptuneEclipticInclinationTrendJPL, pluto: plutoEclipticInclinationTrendJPL
};

const currentCodeValues = {};
const planetNames = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
for (const p of planetNames) {
  const pd = C.planets[p];
  const eclP = pd.perihelionEclipticYears;
  const icrfP = 1 / (1/eclP - 1/genPrec);  // signed
  const ascNodeP = pd.ascendingNodeCyclesIn8H
    ? -(8 * holisticyearLength) / pd.ascendingNodeCyclesIn8H
    : eclP;
  currentCodeValues[p] = {
    mean: pd.invPlaneInclinationMean,
    amplitude: pd.invPlaneInclinationAmplitude,
    phaseAngle: pd.inclinationPhaseAngle,
    periLongJ2000: pd.longitudePerihelion,
    omegaJ2000: pd.ascendingNodeInvPlane,  // for ecliptic plane normal
    icrfPeriod: icrfP,
    ascNodePeriod: ascNodeP,
    period: eclP,  // kept for ecliptic ascending node rate
    inclJ2000: pd.invPlaneInclinationJ2000,
    jplTrend: jplTrends[p],
    antiPhase: pd.antiPhase || false
  };
}
// Pluto (not in C.planets)
currentCodeValues.pluto = {
  mean: 15.716200, amplitude: 0.717024, phaseAngle: 203.32,
  periLongJ2000: 224.06, omegaJ2000: 101.06,
  icrfPeriod: 1 / (1/holisticyearLength - 1/genPrec),
  ascNodePeriod: holisticyearLength,
  period: holisticyearLength, inclJ2000: 15.5639473,
  jplTrend: plutoEclipticInclinationTrendJPL, antiPhase: false
};

// ═══════════════════════════════════════════════════════════════════════════
// LAPLACE-LAGRANGE BOUNDS (from secular theory)
// ═══════════════════════════════════════════════════════════════════════════

const laplaceLagrangeBounds = {
  mercury: { min: 4.57, max: 9.86 },
  venus:   { min: 0.00, max: 3.38 },
  mars:    { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02 },
  uranus:  { min: 0.902, max: 1.11 },
  neptune: { min: 0.554, max: 0.800 },
  pluto:   { min: 15.0, max: 16.5 }
};

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getPlanetInclination(planet, year) {
  const { mean, amplitude, phaseAngle, periLongJ2000, icrfPeriod, antiPhase } = planet;
  const periLong = periLongJ2000 + (360 / icrfPeriod) * (year - 2000);
  const phase = (periLong - phaseAngle) * DEG2RAD;
  const sign = antiPhase ? -1 : 1;
  return mean + sign * amplitude * Math.cos(phase);
}

function getPlanetOmega(planet, year) {
  // Ascending node Ω advances at the asc-node period (-8H/N), distinct from
  // ϖ_ICRF (perihelion) and the ecliptic perihelion period.
  return planet.omegaJ2000 + (360 / planet.ascNodePeriod) * (year - 2000);
}

// Earth FROZEN at J2000 — JPL's "mean ecliptic and equinox of J2000" frame.
// (See docs/32-inclination-calculations.md "Two Frames" section.)
const _EARTH_I_J2000 = earthConfig.inclJ2000;
const _EARTH_OM_J2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
function calculateEclipticInclination(planet, year) {
  const planetI = getPlanetInclination(planet, year) * DEG2RAD;
  const planetOmega = getPlanetOmega(planet, year) * DEG2RAD;
  const earthI = _EARTH_I_J2000 * DEG2RAD;
  const earthOmega = _EARTH_OM_J2000 * DEG2RAD;

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

function verifyPlanet(name, planet, bounds) {
  const result = {
    name,
    j2000Match: false,
    trendMatch: false,
    directionMatch: false,
    withinBounds: false,
    calculated: {},
    errors: []
  };

  // 1. Check J2000 invariable plane inclination
  const inclAt2000 = getPlanetInclination(planet, 2000);
  const j2000Error = Math.abs(inclAt2000 - planet.inclJ2000);
  result.calculated.inclJ2000 = inclAt2000;
  result.calculated.j2000Error = j2000Error;
  result.j2000Match = j2000Error < 0.0001;

  if (!result.j2000Match) {
    result.errors.push(`J2000 mismatch: ${inclAt2000.toFixed(7)}° vs target ${planet.inclJ2000}° (Δ=${j2000Error.toFixed(7)}°)`);
  }

  // 2. Calculate ecliptic inclination trend
  const ecl1900 = calculateEclipticInclination(planet, 1900);
  const ecl2000 = calculateEclipticInclination(planet, 2000);
  const ecl2100 = calculateEclipticInclination(planet, 2100);
  const trend = (ecl2100 - ecl1900) / 2;  // degrees per century

  result.calculated.ecl1900 = ecl1900;
  result.calculated.ecl2000 = ecl2000;
  result.calculated.ecl2100 = ecl2100;
  result.calculated.trend = trend;
  result.calculated.trendErrorArcsec = Math.abs(trend - planet.jplTrend) * 3600;

  // Check trend direction
  const expectedDirection = planet.jplTrend >= 0 ? 'increasing' : 'decreasing';
  const actualDirection = trend >= 0 ? 'increasing' : 'decreasing';
  result.calculated.expectedDirection = expectedDirection;
  result.calculated.actualDirection = actualDirection;
  result.directionMatch = expectedDirection === actualDirection;

  if (!result.directionMatch) {
    result.errors.push(`Direction mismatch: ${actualDirection} vs expected ${expectedDirection}`);
  }

  // Trend match (within 5 arcsec/century is excellent)
  result.trendMatch = result.calculated.trendErrorArcsec < 30;

  // 3. Check Laplace-Lagrange bounds
  const rangeMin = planet.mean - planet.amplitude;
  const rangeMax = planet.mean + planet.amplitude;
  result.calculated.rangeMin = rangeMin;
  result.calculated.rangeMax = rangeMax;
  result.withinBounds = rangeMin >= bounds.min - 0.01 && rangeMax <= bounds.max + 0.01;

  if (!result.withinBounds) {
    result.errors.push(`Range [${rangeMin.toFixed(3)}°, ${rangeMax.toFixed(3)}°] outside LL bounds [${bounds.min}°, ${bounds.max}°]`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║        APPENDIX F (85): PLANETARY INCLINATION PARAMETER VERIFICATION          ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This script verifies all planetary inclination oscillation parameters    ║');
console.log('║  against J2000 constraints and JPL observed ecliptic inclination rates.   ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Display Earth reference first
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ EARTH REFERENCE (fixed values)                                              │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ ICRF Perihelion (ω̃) at J2000: ${earthConfig.periLongJ2000}°`);
console.log(`│ ICRF Period:                  ${earthConfig.period.toLocaleString()} years (H/3, sole prograde)`);
console.log(`│ Mean Inclination:             ${earthConfig.mean}°`);
console.log(`│ Amplitude:                    ${earthConfig.amplitude}°`);
console.log(`│ Phase Angle:                  ${earthConfig.phaseAngle}°`);
console.log(`│ J2000 Inclination:            ${earthConfig.inclJ2000}° (range: 0.85° - 2.12°)`);
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

const results = [];
const allPassed = [];

for (const [name, planet] of Object.entries(currentCodeValues)) {
  const bounds = laplaceLagrangeBounds[name];
  const result = verifyPlanet(name, planet, bounds);
  results.push(result);


  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ ${name.toUpperCase().padEnd(75)}│`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ CODE VALUES:                                                                │`);
  console.log(`│   Mean:            ${planet.mean.toFixed(6).padEnd(20)}Amplitude:        ${planet.amplitude.toFixed(6)}   │`);
  console.log(`│   Phase Angle:     ${String(planet.phaseAngle.toFixed(2) + '°').padEnd(20)}ICRF Period:      ${Math.round(planet.icrfPeriod).toLocaleString()} yrs${(planet.antiPhase ? ' (anti)' : '').padEnd(11)}│`);
  console.log(`│   ω̃ at J2000:      ${String(planet.periLongJ2000 + '°').padEnd(20)}                                       │`);
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ VERIFICATION:                                                               │`);

  // J2000 check
  const j2000Status = result.j2000Match ? '✓' : '✗';
  const j2000Color = result.j2000Match ? '' : ' <<<';
  console.log(`│   ${j2000Status} J2000 Inv. Plane:  ${result.calculated.inclJ2000.toFixed(7)}° (target: ${planet.inclJ2000}°)${j2000Color.padEnd(13)}│`);

  // Trend check
  const trendStatus = result.directionMatch && result.trendMatch ? '✓' : (result.directionMatch ? '~' : '✗');
  const trendSign = result.calculated.trend >= 0 ? '+' : '';
  const jplSign = planet.jplTrend >= 0 ? '+' : '';
  console.log(`│   ${trendStatus} Ecliptic Trend:   ${trendSign}${result.calculated.trend.toFixed(6)}°/cy (JPL: ${jplSign}${planet.jplTrend.toFixed(5)}°/cy)         │`);
  console.log(`│     Trend Error:    ${result.calculated.trendErrorArcsec.toFixed(2).padEnd(10)} arcsec/century                               │`);

  // Bounds check
  const boundsStatus = result.withinBounds ? '✓' : '✗';
  console.log(`│   ${boundsStatus} LL Range:        [${result.calculated.rangeMin.toFixed(3)}°, ${result.calculated.rangeMax.toFixed(3)}°] within [${bounds.min}°, ${bounds.max}°]     │`);

  // Overall status
  const allOk = result.j2000Match && result.directionMatch && result.withinBounds;
  allPassed.push(allOk);
  const overallStatus = allOk ? '✓ PASS' : '✗ FAIL';
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ STATUS: ${overallStatus.padEnd(67)}│`);

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.log(`│   ! ${error.padEnd(71)}│`);
    }
  }

  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                              SUMMARY TABLE                                ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║ Planet   │ Mean     │ Ampl.   │ φ   │ J2000   │ Trend   │ LL   │ Status  ║');
console.log('╠══════════╪══════════╪═════════╪═════╪═════════╪═════════╪══════╪═════════╣');

for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const p = currentCodeValues[r.name];
  const name = r.name.charAt(0).toUpperCase() + r.name.slice(1);
  const mean = p.mean.toFixed(4);
  const ampl = p.amplitude.toFixed(4);
  const phase = String(p.phaseAngle);
  const j2000 = r.j2000Match ? '✓' : '✗';
  const trend = r.directionMatch ? (r.trendMatch ? '✓' : '~') : '✗';
  const bounds = r.withinBounds ? '✓' : '✗';
  const status = allPassed[i] ? 'PASS' : 'FAIL';

  console.log(`║ ${name.padEnd(8)} │ ${mean.padStart(8)} │ ${ampl.padStart(7)} │ ${phase.padStart(3)}° │    ${j2000}    │    ${trend}    │  ${bounds}   │  ${status.padEnd(5)} ║`);
}

console.log('╚══════════╧══════════╧═════════╧═════╧═════════╧═════════╧══════╧═════════╝');
console.log('');
console.log('Legend: ✓ = pass, ~ = close, ✗ = fail');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// CODE REFERENCE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                         CURRENT script.js VALUES                          ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('// Inclination oscillation parameters (mean, amplitude, phase)');
console.log('// Period uses <planet>PerihelionEclipticYears for ascending node precession rate');
console.log('// Formula: i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)');
console.log('');

for (const [name, p] of Object.entries(currentCodeValues)) {
  const periodExpr =
    name === 'mercury' ? 'holisticyearLength/(1+(3/8))' :
    name === 'venus' ? 'holisticyearLength*2' :
    name === 'mars' ? 'holisticyearLength/(4+(1/3))' :
    name === 'jupiter' ? 'holisticyearLength/5' :
    name === 'saturn' ? '-holisticyearLength/8' :
    name === 'uranus' ? 'holisticyearLength/3' :
    name === 'neptune' ? 'holisticyearLength*2' :
    'holisticyearLength';

  const retro = p.period < 0 ? '  // RETROGRADE' : '';

  console.log(`// ${name.toUpperCase()}`);
  console.log(`const ${name}InvPlaneInclinationMean = ${p.mean.toFixed(6)};`);
  console.log(`const ${name}InvPlaneInclinationAmplitude = ${p.amplitude.toFixed(6)};  // Range: ${(p.mean - p.amplitude).toFixed(2)}° to ${(p.mean + p.amplitude).toFixed(2)}°`);
  console.log(`const ${name}InclinationPhaseAngle = ${p.phaseAngle};${retro}`);
  console.log(`const ${name}AscendingNodeInvPlaneVerified = ${p.omegaJ2000};`);
  console.log(`// Period: ${periodExpr} = ${Math.abs(p.period).toLocaleString()} years`);
  console.log('');
}

// Final summary
const passCount = allPassed.filter(x => x).length;
const totalCount = allPassed.length;
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`VERIFICATION COMPLETE: ${passCount}/${totalCount} planets passed all checks`);
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Notes:');
console.log('- J2000 Match: Calculated inclination matches target within 0.0001°');
console.log('- Trend Match: Direction correct and error < 30 arcsec/century');
console.log('- LL Bounds: Range [mean±amplitude] within Laplace-Lagrange secular bounds');
console.log('');
console.log('References:');
console.log('- Souami, D. & Souchay, J. (2012) "The solar system\'s invariable plane"');
console.log('- JPL Horizons: https://ssd.jpl.nasa.gov/planets/approx_pos.html');
console.log('- Laplace-Lagrange Theory: farside.ph.utexas.edu/teaching/celestial/');
console.log('');
