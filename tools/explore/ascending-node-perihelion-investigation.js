// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE & PERIHELION INVESTIGATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Investigation started: 2026-04-01
// Updated: 2026-04-03
// Status: OPEN — per-planet phase angles from balanced year + ICRF periods
//
// ═══════════════════════════════════════════════════════════════════════════
// FINDINGS
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. Ascending node regresses at -H/5 (La2010, secular theory confirmed)
// 2. Perihelion advances prograde in ICRF: Earth +H/3, all others retrograde
// 3. Inclination oscillation period = |ICRF perihelion period| per planet
// 4. Phase angle = ω̃_ICRF at max inclination (derived from balanced year)
// 5. Each planet reaches max inclination ONCE per ICRF period
// 6. Balance (Saturn vs rest) is weight-based, independent of phase angles
// 7. 7/8 planets pass LL bounds. Saturn marginally exceeds (1.047° vs 1.02°)
//
// ═══════════════════════════════════════════════════════════════════════════
// DERIVATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Step 1: Start with each planet's observed ω̃ (perihelion longitude) at J2000
// Step 2: Compute ICRF rate: 1/T_ICRF = 1/T_ecl - 1/(H/13)
//         Earth is sole prograde (+H/3), all others retrograde
// Step 3: Go backward to balanced year: ω̃_balanced = ω̃_J2000 + rate × (BY - 2000)
//         Earth subtracts degrees (prograde going backward)
//         All others add degrees (retrograde going backward)
// Step 4: At balanced year ALL planets are at minimum inclination (by definition)
//         cos(ω̃_balanced - phaseAngle) = -1 → phaseAngle = ω̃_balanced - 180°
// Step 5: Phase angle = ω̃_ICRF where max inclination occurs
//         Max occurs once per |ICRF period|, when ω̃_ICRF passes through phaseAngle
//
// ═══════════════════════════════════════════════════════════════════════════
// OPEN QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. Saturn marginally exceeds LL upper bound (1.047° vs 1.02°) — is the
//    LL bound a hard limit or does it have uncertainty?
// 2. Should we change the model to use these per-planet phase angles?
// 3. How does this affect the ecliptic inclination trends vs JPL?
// 4. What is the correct interpretation of the ascending node visual markers?
//
// Usage: node tools/explore/ascending-node-perihelion-investigation.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const genPrec = H / 13;

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════

const planetData = {
  mercury: { name: 'Mercury', eclP: C.planets.mercury.perihelionEclipticYears, periLong: C.planets.mercury.longitudePerihelion, inclJ2000: C.planets.mercury.invPlaneInclinationJ2000, d: C.planets.mercury.fibonacciD, mass: C.massFraction.mercury, sma: C.derived.mercury.orbitDistance, ecc: C.eccJ2000.mercury },
  venus:   { name: 'Venus',   eclP: C.planets.venus.perihelionEclipticYears,   periLong: C.planets.venus.longitudePerihelion,   inclJ2000: C.planets.venus.invPlaneInclinationJ2000,   d: C.planets.venus.fibonacciD,   mass: C.massFraction.venus,   sma: C.derived.venus.orbitDistance,   ecc: C.eccJ2000.venus },
  earth:   { name: 'Earth',   eclP: H/3,                                       periLong: 102.947,                               inclJ2000: 1.57869,                                     d: 3,                           mass: C.massFraction.earth,   sma: 1.0,                            ecc: C.eccJ2000.earth },
  mars:    { name: 'Mars',    eclP: C.planets.mars.perihelionEclipticYears,    periLong: C.planets.mars.longitudePerihelion,    inclJ2000: C.planets.mars.invPlaneInclinationJ2000,    d: C.planets.mars.fibonacciD,    mass: C.massFraction.mars,    sma: C.derived.mars.orbitDistance,    ecc: C.eccJ2000.mars },
  jupiter: { name: 'Jupiter', eclP: C.planets.jupiter.perihelionEclipticYears, periLong: C.planets.jupiter.longitudePerihelion, inclJ2000: C.planets.jupiter.invPlaneInclinationJ2000, d: C.planets.jupiter.fibonacciD, mass: C.massFraction.jupiter, sma: C.derived.jupiter.orbitDistance, ecc: C.eccJ2000.jupiter },
  saturn:  { name: 'Saturn',  eclP: C.planets.saturn.perihelionEclipticYears,  periLong: C.planets.saturn.longitudePerihelion,  inclJ2000: C.planets.saturn.invPlaneInclinationJ2000,  d: C.planets.saturn.fibonacciD,  mass: C.massFraction.saturn,  sma: C.derived.saturn.orbitDistance,  ecc: C.eccJ2000.saturn },
  uranus:  { name: 'Uranus',  eclP: C.planets.uranus.perihelionEclipticYears,  periLong: C.planets.uranus.longitudePerihelion,  inclJ2000: C.planets.uranus.invPlaneInclinationJ2000,  d: C.planets.uranus.fibonacciD,  mass: C.massFraction.uranus,  sma: C.derived.uranus.orbitDistance,  ecc: C.eccJ2000.uranus },
  neptune: { name: 'Neptune', eclP: C.planets.neptune.perihelionEclipticYears, periLong: C.planets.neptune.longitudePerihelion, inclJ2000: C.planets.neptune.invPlaneInclinationJ2000, d: C.planets.neptune.fibonacciD, mass: C.massFraction.neptune, sma: C.derived.neptune.orbitDistance, ecc: C.eccJ2000.neptune },
};

// Compute ICRF periods, rates, and amplitudes
for (const [key, p] of Object.entries(planetData)) {
  p.icrfP = (key === 'earth') ? H / 3 : 1 / (1/p.eclP - 1/genPrec);
  p.icrfRate = 360 / p.icrfP;
  p.absPeriod = Math.abs(p.icrfP);
  p.amp = PSI / (p.d * Math.sqrt(p.mass));
  p.w = Math.sqrt(p.mass * p.sma * (1 - p.ecc * p.ecc)) / p.d;
}

// Laplace-Lagrange bounds
const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

// JPL ecliptic inclination trends (deg/century)
const jplTrends = {
  mercury: -0.00595, venus: -0.00079, earth: 0,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

const yearsToBalanced = balancedYear - 2000;

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: ICRF PERIODS AND DIRECTIONS
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║         ASCENDING NODE & PERIHELION INVESTIGATION                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('1. ICRF PERIHELION PERIODS');
console.log('─────────────────────────');
console.log('   1/T_ICRF = 1/T_ecl − 1/(H/13)');
console.log('   Earth is sole prograde; all others retrograde in ICRF.');
console.log('');
console.log('   Planet     │ Ecliptic      │ ICRF          │ Direction  │ Incl. cycle');
console.log('   ───────────┼───────────────┼───────────────┼────────────┼────────────');

for (const [key, p] of Object.entries(planetData)) {
  const dir = p.icrfP > 0 ? 'Prograde' : 'Retrograde';
  let fib = '';
  for (const f of [1,2,3,5,8,13,21,34]) {
    if (Math.abs(Math.abs(p.icrfP) - H/f) / (H/f) < 0.01) fib = ' (H/' + f + ')';
  }
  console.log('   ' + p.name.padEnd(10) + ' │ ' + p.eclP.toFixed(0).padStart(13) + ' │ ' + p.icrfP.toFixed(0).padStart(13) + ' │ ' + dir.padStart(10) + ' │ ' + p.absPeriod.toFixed(0).padStart(10) + fib);
}
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: PERIHELION AT BALANCED YEAR → PHASE ANGLES
// ═══════════════════════════════════════════════════════════════════════════

console.log('2. FROM J2000 PERIHELION BACK TO BALANCED YEAR');
console.log('──────────────────────────────────────────────');
console.log('   Years from J2000 to balanced year: ' + yearsToBalanced);
console.log('');
console.log('   Planet     │ ω̃ at J2000  │ ICRF rate     │ ω̃ at balanced │ Phase angle');
console.log('   ───────────┼─────────────┼───────────────┼───────────────┼────────────');

const results = {};

for (const [key, p] of Object.entries(planetData)) {
  const totalAdvance = p.icrfRate * yearsToBalanced;
  const periAtBalanced = ((p.periLong + totalAdvance) % 360 + 360) % 360;
  const phaseAngle = ((periAtBalanced - 180 + 360) % 360);

  // Mean from J2000 constraint
  const cosJ2000 = Math.cos((p.periLong - phaseAngle) * DEG2RAD);
  const mean = p.inclJ2000 - p.amp * cosJ2000;

  const minIncl = mean - p.amp;
  const maxIncl = mean + p.amp;
  const ll = llBounds[key];
  const inLL = minIncl >= ll.min - 0.01 && maxIncl <= ll.max + 0.01;

  results[key] = { periAtBalanced, phaseAngle, cosJ2000, mean, minIncl, maxIncl, inLL };

  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.periLong.toFixed(2).padStart(11) + '° │ ' +
    ((p.icrfRate >= 0 ? '+' : '') + (p.icrfRate * 1000).toFixed(3) + '°/kyr').padStart(13) + ' │ ' +
    periAtBalanced.toFixed(2).padStart(13) + '° │ ' +
    phaseAngle.toFixed(2).padStart(10) + '°'
  );
}
console.log('');
console.log('   Phase angle = ω̃_balanced − 180° = the ω̃_ICRF where MAX inclination occurs.');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: INCLINATION PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

console.log('3. INCLINATION PARAMETERS (new vs old)');
console.log('──────────────────────────────────────');
console.log('');
console.log('   Planet     │ Amplitude │ Phase angle │ New Mean   │ Old Mean   │ Δ Mean   │ Min      │ Max      │ LL?');
console.log('   ───────────┼───────────┼─────────────┼────────────┼────────────┼──────────┼──────────┼──────────┼────');

// Old means (from ascending node + 203/23 phase)
const oldPhases = { mercury: 203.3195, venus: 203.3195, earth: 203.3195, mars: 203.3195, jupiter: 203.3195, saturn: 23.3195, uranus: 203.3195, neptune: 203.3195 };
const omegas = { mercury: 32.83, venus: 54.70, earth: 284.51, mars: 354.87, jupiter: 312.89, saturn: 118.81, uranus: 307.80, neptune: 192.04 };

for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  const oldCos = Math.cos((omegas[key] - oldPhases[key]) * DEG2RAD);
  const oldMean = p.inclJ2000 - p.amp * oldCos;
  const diffArcsec = (r.mean - oldMean) * 3600;

  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.amp.toFixed(4).padStart(9) + '° │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    r.mean.toFixed(4).padStart(10) + '° │ ' +
    oldMean.toFixed(4).padStart(10) + '° │ ' +
    ((diffArcsec >= 0 ? '+' : '') + diffArcsec.toFixed(1)).padStart(8) + '" │ ' +
    r.minIncl.toFixed(3).padStart(8) + '° │ ' +
    r.maxIncl.toFixed(3).padStart(8) + '° │ ' +
    (r.inLL ? ' ✓' : ' ✗')
  );
}

const passes = Object.values(results).filter(r => r.inLL).length;
const fails = Object.entries(results).filter(([, r]) => !r.inLL).map(([k]) => k);
console.log('');
console.log('   LL bounds: ' + passes + '/8 pass' + (fails.length > 0 ? ', FAIL: ' + fails.join(', ') : ' — ALL PASS ✓'));
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: WHEN DOES EACH PLANET REACH MAX INCLINATION?
// ═══════════════════════════════════════════════════════════════════════════

console.log('4. MAX INCLINATION TIMING');
console.log('─────────────────────────');
console.log('   Each planet reaches max inclination ONCE per |ICRF period|.');
console.log('   Max = half cycle after balanced year minimum.');
console.log('');
console.log('   Planet     │ Incl. cycle │ Half cycle  │ Nearest max to J2000     │ Phase angle (= ω̃ at max)');
console.log('   ───────────┼─────────────┼─────────────┼─────────────────────────┼─────────────────────────');

for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  const halfCycle = p.absPeriod / 2;
  const firstMax = balancedYear + halfCycle;

  // Find nearest max to J2000
  let nearestMax = firstMax;
  while (nearestMax < 2000 - p.absPeriod / 2) nearestMax += p.absPeriod;
  while (nearestMax > 2000 + p.absPeriod / 2) nearestMax -= p.absPeriod;

  const label = nearestMax < 0 ? Math.abs(Math.round(nearestMax)) + ' BC' : Math.round(nearestMax) + ' AD';

  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.absPeriod.toFixed(0).padStart(11) + ' │ ' +
    halfCycle.toFixed(0).padStart(11) + ' │ ' +
    (Math.round(nearestMax) + ' (' + label + ')').padStart(25) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(10) + '°'
  );
}
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: BALANCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('5. BALANCE VERIFICATION');
console.log('───────────────────────');
console.log('   Weights w = √(m×a×(1−e²)) / d are INDEPENDENT of phase angles and periods.');
console.log('   Group membership (Saturn vs rest) is unchanged.');
console.log('');

let sumSaturn = 0, sumRest = 0;
console.log('   Planet     │ d  │ w                   │ Group');
console.log('   ───────────┼────┼─────────────────────┼──────────');

for (const [key, p] of Object.entries(planetData)) {
  const isSaturn = key === 'saturn';
  if (isSaturn) sumSaturn += p.w; else sumRest += p.w;
  console.log('   ' + p.name.padEnd(10) + ' │ ' + p.d.toString().padStart(2) + ' │ ' + p.w.toExponential(6).padStart(19) + ' │ ' + (isSaturn ? 'Saturn (solo)' : 'Rest'));
}

const imb = Math.abs(sumSaturn - sumRest) / (sumSaturn + sumRest) * 100;
console.log('   ───────────┴────┴─────────────────────┴──────────');
console.log('   Saturn: ' + sumSaturn.toExponential(6));
console.log('   Rest:   ' + sumRest.toExponential(6));
console.log('   Balance: ' + (100 - imb).toFixed(4) + '%' + (imb < 0.01 ? ' ✓' : ''));
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: VERIFICATION AT KEY EPOCHS
// ═══════════════════════════════════════════════════════════════════════════

console.log('6. VERIFICATION AT KEY EPOCHS');
console.log('────────────────────────────');
console.log('');

for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];

  // At J2000
  const j2000check = r.mean + p.amp * r.cosJ2000;

  // At balanced year
  const cosAtBY = Math.cos((r.periAtBalanced - r.phaseAngle) * DEG2RAD);
  const iAtBY = r.mean + p.amp * cosAtBY;

  // At max
  const iAtMax = r.mean + p.amp; // cos = +1

  console.log('   ' + p.name + ':');
  console.log('     i(J2000)    = ' + j2000check.toFixed(6) + '° (expected ' + p.inclJ2000 + '°) ' + (Math.abs(j2000check - p.inclJ2000) < 0.001 ? '✓' : '✗'));
  console.log('     i(balanced) = ' + iAtBY.toFixed(6) + '° = ' + r.minIncl.toFixed(6) + '° (MIN) ' + (Math.abs(iAtBY - r.minIncl) < 0.001 ? '✓' : '✗'));
  console.log('     i(max)      = ' + iAtMax.toFixed(6) + '° = ' + r.maxIncl.toFixed(6) + '° (MAX) ✓');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: MAX INCLINATION EVENTS NEAR J2000
// ═══════════════════════════════════════════════════════════════════════════

console.log('7. MAX INCLINATION EVENTS NEAR J2000 (±50,000 years)');
console.log('────────────────────────────────────────────────────');
console.log('');

for (const [key, p] of Object.entries(planetData)) {
  const halfCycle = p.absPeriod / 2;
  const firstMax = balancedYear + halfCycle;

  const events = [];
  let t = firstMax;
  while (t > -50000) t -= p.absPeriod;
  t += p.absPeriod;
  while (t < 50000) {
    events.push(Math.round(t));
    t += p.absPeriod;
  }

  console.log('   ' + p.name.padEnd(8) + ' (cycle ' + p.absPeriod.toFixed(0).padStart(6) + ' yr): ' +
    events.map(y => y < 0 ? Math.abs(y) + ' BC' : y + ' AD').join(', '));
}
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('8. SUMMARY');
console.log('──────────');
console.log('');
console.log('   Planet     │ d  │ ICRF Period │ Phase (max) │ Mean       │ Amplitude  │ Range           │ LL');
console.log('   ───────────┼────┼────────────┼─────────────┼────────────┼────────────┼─────────────────┼───');

for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.d.toString().padStart(2) + ' │ ' +
    p.icrfP.toFixed(0).padStart(10) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    r.mean.toFixed(4).padStart(10) + '° │ ' +
    p.amp.toFixed(4).padStart(10) + '° │ ' +
    (r.minIncl.toFixed(2) + '° – ' + r.maxIncl.toFixed(2) + '°').padStart(15) + ' │ ' +
    (r.inLL ? ' ✓' : ' ✗')
  );
}
console.log('');
console.log('   Balance: ' + (100 - imb).toFixed(4) + '% (Saturn vs rest, UNCHANGED)');
console.log('   ψ = ' + PSI.toExponential(6) + ' (UNCHANGED)');
console.log('');

console.log('9. WHAT CHANGES vs CURRENT MODEL');
console.log('─────────────────────────────────');
console.log('');
console.log('   UNCHANGED:');
console.log('   - ψ constant, Fibonacci d-values, Amplitudes, Balance');
console.log('   - J2000 inclination values (exact match)');
console.log('');
console.log('   CHANGED:');
console.log('   - Reference angle: Ω (ascending node) → ω̃_ICRF (perihelion in ICRF)');
console.log('   - Inclination period: ecliptic perihelion → |ICRF perihelion| per planet');
console.log('   - Phase angles: universal 203°/23° → per-planet (from balanced year)');
console.log('   - Phase angle meaning: ω̃_ICRF at MAX inclination for that planet');
console.log('   - Mean inclination values: small shifts');
console.log('   - Ascending node: separate calculation at -H/5 (decoupled from inclination)');
console.log('');
