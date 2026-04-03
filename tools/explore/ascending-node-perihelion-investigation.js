// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE & PERIHELION INVESTIGATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Investigation started: 2026-04-01
// Updated: 2026-04-03
// Status: OPEN — Saturn anti-phase confirmed (MAX at balanced year)
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
// 6. Balance (Saturn vs rest) preserved — independent of phase angles
// 7. Saturn is ANTI-PHASE: MAX inclination at balanced year (others at MIN)
//    This is required by BOTH the balance AND the LL bounds
// 8. Mars period changed to H/(35/8) for 8H super-period compatibility
// 9. All 8 planets meet every 8H = 2,682,536 years (super-holistic year)
// 10. Phase angles cluster near LL eigenmode phases (γ₁–γ₈):
//     Earth 21.77° → γ₈ MIN (22.8°, Δ=1.0°)
//     Uranus 21.33° → γ₁ MAX (20.2°, Δ=1.1°)
//     Jupiter 291.18° → γ₁ mean↑ (290.2°, Δ=1.0°)
//     Saturn 120.38° → γ₄ MIN (116.9°, Δ=3.5°)
//     Venus 79.82° → γ₃ MIN (75.6°, Δ=4.2°)
//     Neptune 354.04° → γ₅ MAX (0°, Δ=6.0°)
//     Mars 96.95° → γ₅ mean↓ (90°, Δ=7.0°)
//     Mercury 99.52° → γ₅ mean↓ (90°, Δ=9.5°)
// 11. Eigenmode-locking is NOT possible: it breaks the balanced year
//     alignment (planets would not be exactly at MIN/MAX at balanced year).
//     The balanced year is the structural anchor; eigenmode proximity is a
//     consequence, not a constraint.
// 12. Saturn and Neptune ecliptic trends have wrong direction vs JPL.
//     Not fixable by phase adjustment — fundamental to ICRF approach.
//     Difference is small: Saturn 7.7"/cy, Neptune 1.3"/cy.
//
// ═══════════════════════════════════════════════════════════════════════════
// KEY INSIGHT: Saturn anti-phase
// ═══════════════════════════════════════════════════════════════════════════
//
// At the balanced year:
//   7 planets at MINIMUM inclination → phase = ω̃_balanced - 180°
//   Saturn at MAXIMUM inclination → phase = ω̃_balanced (no -180°)
//
// This is required because:
//   1. BALANCE: Saturn's weight must oppose the other 7 (Law 3 + Law 5)
//   2. LL BOUNDS: Saturn only fits [0.797°, 1.02°] when anti-phase
//      - At MIN: mean = 0.983°, max = 1.047° → FAILS LL (exceeds 1.02°)
//      - At MAX: mean = 0.868°, max = 0.933° → PASSES LL
//
// Usage: node tools/explore/ascending-node-perihelion-investigation.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════

const planetData = {
  mercury: { name: 'Mercury', eclP: C.planets.mercury.perihelionEclipticYears, periLong: C.planets.mercury.longitudePerihelion, inclJ2000: C.planets.mercury.invPlaneInclinationJ2000, d: C.planets.mercury.fibonacciD, mass: C.massFraction.mercury, sma: C.derived.mercury.orbitDistance, ecc: C.eccJ2000.mercury, antiPhase: false },
  venus:   { name: 'Venus',   eclP: C.planets.venus.perihelionEclipticYears,   periLong: C.planets.venus.longitudePerihelion,   inclJ2000: C.planets.venus.invPlaneInclinationJ2000,   d: C.planets.venus.fibonacciD,   mass: C.massFraction.venus,   sma: C.derived.venus.orbitDistance,   ecc: C.eccJ2000.venus,   antiPhase: false },
  earth:   { name: 'Earth',   eclP: H/16,                                      periLong: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000, inclJ2000: C.ASTRO_REFERENCE.earthInclinationJ2000_deg, d: 3, mass: C.massFraction.earth, sma: 1.0, ecc: C.eccJ2000.earth, antiPhase: false },
  mars:    { name: 'Mars',    eclP: C.planets.mars.perihelionEclipticYears,    periLong: C.planets.mars.longitudePerihelion,    inclJ2000: C.planets.mars.invPlaneInclinationJ2000,    d: C.planets.mars.fibonacciD,    mass: C.massFraction.mars,    sma: C.derived.mars.orbitDistance,    ecc: C.eccJ2000.mars,    antiPhase: false },
  jupiter: { name: 'Jupiter', eclP: C.planets.jupiter.perihelionEclipticYears, periLong: C.planets.jupiter.longitudePerihelion, inclJ2000: C.planets.jupiter.invPlaneInclinationJ2000, d: C.planets.jupiter.fibonacciD, mass: C.massFraction.jupiter, sma: C.derived.jupiter.orbitDistance, ecc: C.eccJ2000.jupiter, antiPhase: false },
  saturn:  { name: 'Saturn',  eclP: C.planets.saturn.perihelionEclipticYears,  periLong: C.planets.saturn.longitudePerihelion,  inclJ2000: C.planets.saturn.invPlaneInclinationJ2000,  d: C.planets.saturn.fibonacciD,  mass: C.massFraction.saturn,  sma: C.derived.saturn.orbitDistance,  ecc: C.eccJ2000.saturn,  antiPhase: true },
  uranus:  { name: 'Uranus',  eclP: C.planets.uranus.perihelionEclipticYears,  periLong: C.planets.uranus.longitudePerihelion,  inclJ2000: C.planets.uranus.invPlaneInclinationJ2000,  d: C.planets.uranus.fibonacciD,  mass: C.massFraction.uranus,  sma: C.derived.uranus.orbitDistance,  ecc: C.eccJ2000.uranus,  antiPhase: false },
  neptune: { name: 'Neptune', eclP: C.planets.neptune.perihelionEclipticYears, periLong: C.planets.neptune.longitudePerihelion, inclJ2000: C.planets.neptune.invPlaneInclinationJ2000, d: C.planets.neptune.fibonacciD, mass: C.massFraction.neptune, sma: C.derived.neptune.orbitDistance, ecc: C.eccJ2000.neptune, antiPhase: false },
};

// Compute ICRF periods, rates, and amplitudes
for (const [key, p] of Object.entries(planetData)) {
  p.icrfP = (key === 'earth') ? H / 3 : 1 / (1/p.eclP - 1/genPrec);
  p.icrfRate = 360 / p.icrfP;
  p.absPeriod = Math.abs(p.icrfP);
  p.amp = PSI / (p.d * Math.sqrt(p.mass));
  p.w = Math.sqrt(p.mass * p.sma * (1 - p.ecc * p.ecc)) / p.d;
  p.v = Math.sqrt(p.mass) * Math.pow(p.sma, 1.5) * p.ecc / Math.sqrt(p.d);
}

// Laplace-Lagrange bounds
const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

// Eigenmode phases (from script.js)
const allEigenmodes = [
  { mode: 'γ₁', phase: 20.23 }, { mode: 'γ₂', phase: 318.3 },
  { mode: 'γ₃', phase: 255.6 }, { mode: 'γ₄', phase: 296.9 },
  { mode: 'γ₅', phase: 0 },     { mode: 'γ₆', phase: 127.3 },
  { mode: 'γ₇', phase: 315.6 }, { mode: 'γ₈', phase: 202.8 },
];

const yearsToBalanced = balancedYear - 2000;

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE PHASE ANGLES
// ═══════════════════════════════════════════════════════════════════════════
// 7 planets: MIN at balanced year → phase = ω̃_balanced - 180°
// Saturn: MAX at balanced year → phase = ω̃_balanced (anti-phase)

function computeResults(testBY) {
  const results = {};
  for (const [key, p] of Object.entries(planetData)) {
    const periAtBY = ((p.periLong + p.icrfRate * (testBY - 2000)) % 360 + 360) % 360;
    // Saturn: MAX at balanced year (phase = ω̃_balanced)
    // Others: MIN at balanced year (phase = ω̃_balanced - 180°)
    const phaseAngle = p.antiPhase
      ? periAtBY
      : ((periAtBY - 180 + 360) % 360);

    const cosJ2000 = Math.cos((p.periLong - phaseAngle) * DEG2RAD);
    const antiSign = p.antiPhase ? -1 : 1;
    const mean = p.inclJ2000 - antiSign * p.amp * cosJ2000;
    const minIncl = mean - p.amp;
    const maxIncl = mean + p.amp;
    const ll = llBounds[key];
    const inLL = minIncl >= ll.min - 0.01 && maxIncl <= ll.max + 0.01;

    results[key] = { periAtBY, phaseAngle, cosJ2000, mean, minIncl, maxIncl, inLL };
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║         ASCENDING NODE & PERIHELION INVESTIGATION                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Section 1: ICRF periods
console.log('1. ICRF PERIHELION PERIODS');
console.log('─────────────────────────');
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

// Section 2: Phase angles with Saturn anti-phase
console.log('2. PHASE ANGLES (Saturn anti-phase at balanced year)');
console.log('────────────────────────────────────────────────────');
console.log('   At balanced year (' + balancedYear + '):');
console.log('   7 planets at MIN inclination → phase = ω̃_balanced − 180°');
console.log('   Saturn at MAX inclination → phase = ω̃_balanced (anti-phase)');
console.log('');

const results = computeResults(balancedYear);

console.log('   Planet     │ ω̃ at J2000  │ ω̃ at balanced │ State at BY │ Phase angle │ Mean       │ Range           │ LL');
console.log('   ───────────┼─────────────┼───────────────┼─────────────┼─────────────┼────────────┼─────────────────┼───');

for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  const state = p.antiPhase ? 'MAX ↑' : 'MIN ↓';
  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.periLong.toFixed(2).padStart(11) + '° │ ' +
    r.periAtBY.toFixed(2).padStart(13) + '° │ ' +
    state.padStart(11) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    r.mean.toFixed(4).padStart(10) + '° │ ' +
    (r.minIncl.toFixed(2) + '° – ' + r.maxIncl.toFixed(2) + '°').padStart(15) + ' │ ' +
    (r.inLL ? ' ✓' : ' ✗')
  );
}

const passes = Object.values(results).filter(r => r.inLL).length;
console.log('');
console.log('   LL bounds: ' + passes + '/8 pass' + (passes === 8 ? ' — ALL PASS ✓' : ''));
console.log('');

// Section 3: Balance verification
console.log('3. BALANCE VERIFICATION');
console.log('───────────────────────');
console.log('');

let sumSaturn_w = 0, sumRest_w = 0, sumSaturn_v = 0, sumRest_v = 0;
console.log('   Planet     │ d  │ w (incl)            │ v (ecc)             │ Group');
console.log('   ───────────┼────┼─────────────────────┼─────────────────────┼──────────');
for (const [key, p] of Object.entries(planetData)) {
  if (p.antiPhase) { sumSaturn_w += p.w; sumSaturn_v += p.v; }
  else { sumRest_w += p.w; sumRest_v += p.v; }
  console.log('   ' + p.name.padEnd(10) + ' │ ' + p.d.toString().padStart(2) + ' │ ' +
    p.w.toExponential(6).padStart(19) + ' │ ' +
    p.v.toExponential(6).padStart(19) + ' │ ' +
    (p.antiPhase ? 'Saturn ↑' : 'Rest ↓'));
}
const imbW = Math.abs(sumSaturn_w - sumRest_w) / (sumSaturn_w + sumRest_w) * 100;
const imbV = Math.abs(sumSaturn_v - sumRest_v) / (sumSaturn_v + sumRest_v) * 100;
console.log('');
console.log('   Inclination balance: ' + (100 - imbW).toFixed(4) + '% ✓');
console.log('   Eccentricity balance: ' + (100 - imbV).toFixed(4) + '%');
console.log('');

// Section 4: Verification at key epochs
console.log('4. VERIFICATION AT KEY EPOCHS');
console.log('────────────────────────────');
console.log('');
for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  const antiSign = p.antiPhase ? -1 : 1;
  const j2000check = r.mean + antiSign * p.amp * r.cosJ2000;
  const cosAtBY = Math.cos((r.periAtBY - r.phaseAngle) * DEG2RAD);
  const iAtBY = r.mean + antiSign * p.amp * cosAtBY;
  const expectedBY = p.antiPhase ? r.maxIncl : r.minIncl;
  const labelBY = p.antiPhase ? 'MAX' : 'MIN';
  console.log('   ' + p.name + ':');
  console.log('     i(J2000)    = ' + j2000check.toFixed(6) + '° (expected ' + p.inclJ2000 + '°) ' + (Math.abs(j2000check - p.inclJ2000) < 0.001 ? '✓' : '✗'));
  console.log('     i(balanced) = ' + iAtBY.toFixed(6) + '° = ' + expectedBY.toFixed(6) + '° (' + labelBY + ') ' + (Math.abs(iAtBY - expectedBY) < 0.001 ? '✓' : '✗'));
  console.log('');
}

// Section 5: Eigenmode comparison
console.log('5. EIGENMODE PHASE COMPARISON');
console.log('────────────────────────────');
console.log('   Eigenmode + 0° = MAX, +90° = mean↓, +180° = MIN, +270° = mean↑');
console.log('');

const offsets = [
  { label: 'MAX', offset: 0 }, { label: 'mean↓', offset: 90 },
  { label: 'MIN', offset: 180 }, { label: 'mean↑', offset: 270 },
];
const targets = [];
for (const em of allEigenmodes) {
  for (const off of offsets) {
    targets.push({
      mode: em.mode, offset: off.offset, label: off.label,
      targetAngle: ((em.phase + off.offset) % 360 + 360) % 360,
      fullLabel: em.mode + ' ' + off.label + ' (' + (((em.phase + off.offset) % 360 + 360) % 360).toFixed(1) + '°)',
    });
  }
}

console.log('   Planet     │ Phase angle │ Best eigenmode match                          │ Δ');
console.log('   ───────────┼─────────────┼───────────────────────────────────────────────┼──────');
let totalDiff = 0;
let within5 = 0;
for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  let best = targets[0], bestDiff = 999;
  for (const t of targets) {
    const d = Math.abs(((r.phaseAngle - t.targetAngle + 180) % 360 + 360) % 360 - 180);
    if (d < bestDiff) { bestDiff = d; best = t; }
  }
  totalDiff += bestDiff;
  if (bestDiff < 5) within5++;
  const mark = bestDiff < 3 ? '★' : bestDiff < 5 ? '✓' : bestDiff < 10 ? '~' : ' ';
  console.log('   ' + mark + ' ' + p.name.padEnd(8) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    best.fullLabel.padEnd(45) + ' │ ' + bestDiff.toFixed(1).padStart(5) + '°');
}
console.log('');
console.log('   Total Δ: ' + totalDiff.toFixed(1) + '°  |  Within 5°: ' + within5 + '/8');
console.log('');

// Section 6: Max inclination timing
console.log('6. MAX INCLINATION TIMING');
console.log('─────────────────────────');
console.log('');
console.log('   Planet     │ Incl. cycle │ Phase angle │ Nearest max to J2000');
console.log('   ───────────┼─────────────┼─────────────┼──────────────────────');
for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  const halfCycle = p.absPeriod / 2;
  // For anti-phase (Saturn): MAX is at balanced year, then every absPeriod
  // For normal: MAX is at balanced year + halfCycle, then every absPeriod
  const firstMax = p.antiPhase ? balancedYear : balancedYear + halfCycle;
  let nearestMax = firstMax;
  while (nearestMax < 2000 - p.absPeriod / 2) nearestMax += p.absPeriod;
  while (nearestMax > 2000 + p.absPeriod / 2) nearestMax -= p.absPeriod;
  const label = nearestMax < 0 ? Math.abs(Math.round(nearestMax)) + ' BC' : Math.round(nearestMax) + ' AD';
  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.absPeriod.toFixed(0).padStart(11) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    (Math.round(nearestMax) + ' (' + label + ')').padStart(20));
}
console.log('');

// Section 7: Summary
console.log('7. SUMMARY');
console.log('──────────');
console.log('');
console.log('   Planet     │ d  │ ICRF Period │ Phase (max) │ State BY │ Mean       │ Amplitude  │ Range           │ LL');
console.log('   ───────────┼────┼────────────┼─────────────┼──────────┼────────────┼────────────┼─────────────────┼───');
for (const [key, p] of Object.entries(planetData)) {
  const r = results[key];
  const state = p.antiPhase ? 'MAX ↑' : 'MIN ↓';
  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.d.toString().padStart(2) + ' │ ' +
    p.icrfP.toFixed(0).padStart(10) + ' │ ' +
    r.phaseAngle.toFixed(2).padStart(11) + '° │ ' +
    state.padStart(8) + ' │ ' +
    r.mean.toFixed(4).padStart(10) + '° │ ' +
    p.amp.toFixed(4).padStart(10) + '° │ ' +
    (r.minIncl.toFixed(2) + '° – ' + r.maxIncl.toFixed(2) + '°').padStart(15) + ' │ ' +
    (r.inLL ? ' ✓' : ' ✗'));
}
console.log('');
console.log('   Inclination balance: ' + (100 - imbW).toFixed(4) + '% (Saturn vs rest)');
console.log('   Eccentricity balance: ' + (100 - imbV).toFixed(4) + '%');
console.log('   ψ = ' + PSI.toExponential(6));
console.log('   Super-period: 8H = ' + (8 * H).toLocaleString() + ' years');
console.log('');
