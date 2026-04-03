// ═══════════════════════════════════════════════════════════════════════════
// BALANCED YEAR SEARCH — Find the optimal inclination minimum epoch
// ═══════════════════════════════════════════════════════════════════════════
//
// The balanced year defines when 7 planets are at minimum inclination
// and Saturn is at MAXIMUM inclination (anti-phase).
//
// The inclination minimum doesn't have to coincide with the current
// balanced year (-302,635). It could be any earlier occurrence:
//   balanced year - n × H (for n = 0, 1, 2, 3, ... 7)
// All 8 planets meet every 8H = 2,682,536 years (super-holistic year).
//
// Criteria:
//   1. All 8 planets within Laplace-Lagrange bounds
//   2. Correct inclination trend DIRECTION (matches JPL sign)
//   3. Correct inclination trend RATE (matches JPL magnitude)
//
// Mars uses NEW period H/(35/8) for 8H compatibility.
// Saturn is ANTI-PHASE (MAX at balanced year, others at MIN).
//
// Usage: node tools/explore/balanced-year-search.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const currentBalancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════

const planetData = {
  mercury: { name: 'Mercury', eclP: C.planets.mercury.perihelionEclipticYears, periLong: C.planets.mercury.longitudePerihelion, inclJ2000: C.planets.mercury.invPlaneInclinationJ2000, omega: C.planets.mercury.ascendingNodeInvPlane, d: C.planets.mercury.fibonacciD, mass: C.massFraction.mercury, sma: C.derived.mercury.orbitDistance, ecc: C.eccJ2000.mercury, antiPhase: false },
  venus:   { name: 'Venus',   eclP: C.planets.venus.perihelionEclipticYears,   periLong: C.planets.venus.longitudePerihelion,   inclJ2000: C.planets.venus.invPlaneInclinationJ2000,   omega: C.planets.venus.ascendingNodeInvPlane,   d: C.planets.venus.fibonacciD,   mass: C.massFraction.venus,   sma: C.derived.venus.orbitDistance,   ecc: C.eccJ2000.venus,   antiPhase: false },
  earth:   { name: 'Earth',   eclP: H/16,                                      periLong: 102.947,                               inclJ2000: 1.57869,                                     omega: 284.51,                                  d: 3,                           mass: C.massFraction.earth,   sma: 1.0,                            ecc: C.eccJ2000.earth,   antiPhase: false },
  mars:    { name: 'Mars',    eclP: H/(35/8),                                  periLong: C.planets.mars.longitudePerihelion,    inclJ2000: C.planets.mars.invPlaneInclinationJ2000,    omega: C.planets.mars.ascendingNodeInvPlane,    d: C.planets.mars.fibonacciD,    mass: C.massFraction.mars,    sma: C.derived.mars.orbitDistance,    ecc: C.eccJ2000.mars,    antiPhase: false },
  jupiter: { name: 'Jupiter', eclP: C.planets.jupiter.perihelionEclipticYears, periLong: C.planets.jupiter.longitudePerihelion, inclJ2000: C.planets.jupiter.invPlaneInclinationJ2000, omega: C.planets.jupiter.ascendingNodeInvPlane, d: C.planets.jupiter.fibonacciD, mass: C.massFraction.jupiter, sma: C.derived.jupiter.orbitDistance, ecc: C.eccJ2000.jupiter, antiPhase: false },
  saturn:  { name: 'Saturn',  eclP: C.planets.saturn.perihelionEclipticYears,  periLong: C.planets.saturn.longitudePerihelion,  inclJ2000: C.planets.saturn.invPlaneInclinationJ2000,  omega: C.planets.saturn.ascendingNodeInvPlane,  d: C.planets.saturn.fibonacciD,  mass: C.massFraction.saturn,  sma: C.derived.saturn.orbitDistance,  ecc: C.eccJ2000.saturn,  antiPhase: true },
  uranus:  { name: 'Uranus',  eclP: C.planets.uranus.perihelionEclipticYears,  periLong: C.planets.uranus.longitudePerihelion,  inclJ2000: C.planets.uranus.invPlaneInclinationJ2000,  omega: C.planets.uranus.ascendingNodeInvPlane,  d: C.planets.uranus.fibonacciD,  mass: C.massFraction.uranus,  sma: C.derived.uranus.orbitDistance,  ecc: C.eccJ2000.uranus,  antiPhase: false },
  neptune: { name: 'Neptune', eclP: C.planets.neptune.perihelionEclipticYears, periLong: C.planets.neptune.longitudePerihelion, inclJ2000: C.planets.neptune.invPlaneInclinationJ2000, omega: C.planets.neptune.ascendingNodeInvPlane, d: C.planets.neptune.fibonacciD, mass: C.massFraction.neptune, sma: C.derived.neptune.orbitDistance, ecc: C.eccJ2000.neptune, antiPhase: false },
};

for (const [key, p] of Object.entries(planetData)) {
  if (key === 'earth') { p.icrfP = H / 3; p.icrfRate = 360 / (H/3); }
  else { p.icrfRate = (1/p.eclP - 1/genPrec) * 360; p.icrfP = 360 / p.icrfRate; }
  p.amp = PSI / (p.d * Math.sqrt(p.mass));
}

const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, earth: 0,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

const keys = Object.keys(planetData);

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function evaluateBalancedYear(testBY) {
  const results = {};
  let llPasses = 0, directionMatches = 0, totalTrendError = 0;

  // Precompute Earth phase for this BY
  const earthPeriAtBY = ((planetData.earth.periLong + planetData.earth.icrfRate * (testBY - 2000)) % 360 + 360) % 360;
  const earthPhase = ((earthPeriAtBY - 180 + 360) % 360);
  const earthCosJ2000 = Math.cos((planetData.earth.periLong - earthPhase) * DEG2RAD);
  const earthMean = planetData.earth.inclJ2000 - planetData.earth.amp * earthCosJ2000;

  function getEarthIncl(year) {
    const peri = planetData.earth.periLong + planetData.earth.icrfRate * (year - 2000);
    return earthMean + planetData.earth.amp * Math.cos((peri - earthPhase) * DEG2RAD);
  }

  function getEarthOmega(year) {
    return 284.51 + (360 / (H / 3)) * (year - 2000);
  }

  for (const [key, p] of Object.entries(planetData)) {
    const periAtBY = ((p.periLong + p.icrfRate * (testBY - 2000)) % 360 + 360) % 360;
    // Saturn: MAX at balanced year (anti-phase)
    // Others: MIN at balanced year
    const phaseAngle = p.antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);

    const cosJ2000 = Math.cos((p.periLong - phaseAngle) * DEG2RAD);
    const mean = p.inclJ2000 - p.amp * cosJ2000;
    const minIncl = mean - p.amp;
    const maxIncl = mean + p.amp;
    const ll = llBounds[key];
    const inLL = minIncl >= ll.min - 0.01 && maxIncl <= ll.max + 0.01;
    if (inLL) llPasses++;

    let trend = 0, dirMatch = true, trendError = 0;

    if (key !== 'earth') {
      function getPlanetIncl(year) {
        const peri = p.periLong + p.icrfRate * (year - 2000);
        return mean + p.amp * Math.cos((peri - phaseAngle) * DEG2RAD);
      }

      function calcEclipticIncl(year) {
        const planetI = getPlanetIncl(year) * DEG2RAD;
        const planetOmega = (p.omega + (360 / p.eclP) * (year - 2000)) * DEG2RAD;
        const earthI = getEarthIncl(year) * DEG2RAD;
        const earthOmega = getEarthOmega(year) * DEG2RAD;
        const pnx = Math.sin(planetI) * Math.sin(planetOmega);
        const pny = Math.sin(planetI) * Math.cos(planetOmega);
        const pnz = Math.cos(planetI);
        const enx = Math.sin(earthI) * Math.sin(earthOmega);
        const eny = Math.sin(earthI) * Math.cos(earthOmega);
        const enz = Math.cos(earthI);
        const dot = pnx*enx + pny*eny + pnz*enz;
        return Math.acos(Math.max(-1, Math.min(1, dot))) * (180/Math.PI);
      }

      const ecl1900 = calcEclipticIncl(1900);
      const ecl2100 = calcEclipticIncl(2100);
      trend = (ecl2100 - ecl1900) / 2;
      dirMatch = (jplTrends[key] >= 0) === (trend >= 0);
      trendError = Math.abs(trend - jplTrends[key]) * 3600;
    }
    if (dirMatch) directionMatches++;
    totalTrendError += trendError;

    results[key] = { phaseAngle, mean, minIncl, maxIncl, inLL, trend, dirMatch, trendError };
  }

  return { results, llPasses, directionMatches, totalTrendError };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   BALANCED YEAR SEARCH — Saturn anti-phase (MAX at balanced year)       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Testing: BY, BY-H, BY-2H, ... BY-7H  (super-period 8H = ' + (8*H).toLocaleString() + ' years)');
console.log('Saturn at MAX inclination at balanced year; all others at MIN.');
console.log('Mars period: H/(35/8) = ' + (H/(35/8)).toFixed(0) + ' years (for 8H compatibility)');
console.log('');

const candidates = [];
for (let n = 0; n < 8; n++) {
  const testBY = currentBalancedYear - n * H;
  const ev = evaluateBalancedYear(testBY);
  candidates.push({ n, testBY, ...ev });
}

console.log(' n │ Balanced Year    │ LL pass │ Dir match │ Trend error │ Score');
console.log('───┼──────────────────┼─────────┼───────────┼─────────────┼──────');
for (const c of candidates) {
  const score = c.llPasses * 10 + c.directionMatches * 5 - c.totalTrendError / 100;
  console.log(
    ' ' + c.n + ' │ ' +
    c.testBY.toLocaleString().padStart(16) + ' │ ' +
    (c.llPasses + '/8').padStart(7) + ' │ ' +
    (c.directionMatches + '/8').padStart(9) + ' │ ' +
    c.totalTrendError.toFixed(1).padStart(11) + ' │ ' +
    score.toFixed(1).padStart(5)
  );
}

const best = candidates.reduce((a, b) => {
  if (a.llPasses !== b.llPasses) return a.llPasses > b.llPasses ? a : b;
  if (a.directionMatches !== b.directionMatches) return a.directionMatches > b.directionMatches ? a : b;
  return a.totalTrendError < b.totalTrendError ? a : b;
});

console.log('');
console.log('BEST: n=' + best.n + ' → Balanced year ' + best.testBY.toLocaleString());
console.log('');

// Detailed results for best
console.log('═══════════════════════════════════════════════════════════════════');
console.log('DETAILED RESULTS (n=' + best.n + ', BY=' + best.testBY.toLocaleString() + ')');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('Planet     │ Phase angle │ State BY │ Mean       │ Range           │ LL  │ JPL trend    │ Model trend  │ Dir │ Err');
console.log('───────────┼─────────────┼──────────┼────────────┼─────────────────┼─────┼──────────────┼──────────────┼─────┼─────');

for (const [key, p] of Object.entries(planetData)) {
  const r = best.results[key];
  const state = p.antiPhase ? 'MAX ↑' : 'MIN ↓';
  const jpl = jplTrends[key];
  console.log(
    '  ' + p.name.padEnd(9) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    state.padStart(8) + ' │ ' +
    r.mean.toFixed(4).padStart(10) + '° │ ' +
    (r.minIncl.toFixed(2) + '° – ' + r.maxIncl.toFixed(2) + '°').padStart(15) + ' │ ' +
    (r.inLL ? ' ✓ ' : ' ✗ ') + ' │ ' +
    (key === 'earth' ? '    —       ' : ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12)) + ' │ ' +
    (key === 'earth' ? '    —       ' : ((r.trend >= 0 ? '+' : '') + r.trend.toFixed(5)).padStart(12)) + ' │ ' +
    (key === 'earth' ? ' — ' : (r.dirMatch ? ' ✓ ' : ' ✗ ')) + ' │ ' +
    (key === 'earth' ? ' —' : r.trendError.toFixed(1).padStart(4) + '"')
  );
}
console.log('');

// Show all candidates LL + direction
console.log('═══════════════════════════════════════════════════════════════════');
console.log('ALL CANDIDATES OVERVIEW');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
for (const c of candidates) {
  const label = c.testBY < 0 ? Math.abs(c.testBY).toLocaleString() + ' BC' : c.testBY.toLocaleString() + ' AD';
  console.log('n=' + c.n + ' (BY=' + label + '): LL=' + c.llPasses + '/8, Dir=' + c.directionMatches + '/8, TrendErr=' + c.totalTrendError.toFixed(1) + '"');
  let line = '  LL:  ';
  for (const [key, p] of Object.entries(planetData)) line += p.name.substring(0, 2) + (c.results[key].inLL ? '✓' : '✗') + ' ';
  console.log(line);
  line = '  Dir: ';
  for (const [key, p] of Object.entries(planetData)) {
    if (key === 'earth') { line += 'Ea— '; continue; }
    line += p.name.substring(0, 2) + (c.results[key].dirMatch ? '✓' : '✗') + ' ';
  }
  console.log(line);
  console.log('');
}
