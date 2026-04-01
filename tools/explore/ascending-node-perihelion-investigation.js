// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE & PERIHELION INVESTIGATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Investigation started: 2026-04-01
// Status: OPEN — findings documented, model not yet changed
//
// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════
//
// The current model uses the ascending node (Ω) on the invariable plane
// as the reference angle for the inclination oscillation formula:
//
//   i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)
//
// where Ω precesses prograde at +H/3 and phaseAngle = 203.3195° (s₈ eigenmode).
//
// ═══════════════════════════════════════════════════════════════════════════
// FINDINGS (2026-04-01)
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. ASCENDING NODE DIRECTION
//    - La2010 N-body solution shows Ω DECREASING at ~-4.15°/kyr (retrograde)
//    - The La2010 period matches H/5 = 67,063 years (ecliptic precession)
//    - This is confirmed by secular perturbation theory:
//      * All s-eigenfrequencies are negative (retrograde nodal precession)
//      * All g-eigenfrequencies are positive (prograde apsidal precession)
//    - Analogous to the Moon: node regresses (18.6yr), apsides advance (8.85yr)
//    - Sources: Laskar (1990), Murray & Dermott (1999), Brouwer & Clemence (1961)
//
// 2. PERIHELION vs ASCENDING NODE
//    - Perihelion longitude advances prograde: +H/3 in ICRF, +H/16 in ecliptic
//    - Ascending node regresses retrograde: -H/5 in invariant frame
//    - At J2000: ω̃ = 102.947° and Ω = 284.51° (differ by ~181.6°, near 180°)
//    - This ~180° relationship is coincidental at this epoch, not structural
//    - La2010 shows the argument of perihelion (ω = ω̃ - Ω) changes at ~7.2°/kyr
//
// 3. INCLINATION FORMULA REQUIREMENTS
//    - The formula cos(angle(t) - phaseAngle) requires the reference angle
//      to precess at the SAME rate as the inclination oscillation (H/3)
//    - The ascending node at +H/3 satisfies this (current model)
//    - The perihelion longitude in ICRF also moves at H/3 — a valid alternative
//    - The ascending node at -H/5 does NOT work (different period, wrong phase)
//
// 4. PERIHELION-BASED PHASE ANGLE
//    - If we use ω̃ (ICRF perihelion longitude) instead of Ω:
//      * New phase angle: 21.77° (was 203.3195°)
//      * Saturn phase angle: 201.77° (was 23.3195°)
//      * Mean inclination changes by only -0.5 arcseconds for Earth
//      * Balance (Law 3) is UNAFFECTED (depends on group membership, not angle)
//    - PROBLEM: Mars fails Laplace-Lagrange bounds with 21.77° phase angle
//      * Mars new mean = 0.823°, min = -0.33° (impossible negative inclination)
//      * All other planets fit within bounds
//
// 5. CURRENT MODEL STATUS
//    - The simulation uses Ω at +H/3 for everything (inclination, visuals, markers)
//    - The VFP ascending node chart shows model's +H/3 alongside La2010's -H/5
//    - The discrepancy is visible but the model's RA/Dec accuracy is unaffected
//    - The ascending node visual (invariable plane markers) moves at +H/3
//
// ═══════════════════════════════════════════════════════════════════════════
// OPEN QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. Can Mars be handled with a different phase group (201.77° instead of 21.77°)?
//    This would break the "Saturn sole retrograde" finding.
//
// 2. Is the 203.3195° phase angle (s₈ eigenmode) fundamentally tied to Ω,
//    or is it a coincidence that it works with the +H/3 ascending node?
//
// 3. Should we separate the "inclination oscillation reference angle" from
//    the "ascending node display value"? The oscillation needs H/3 rate,
//    but the displayed ascending node should show the physical -H/5 rate.
//
// 4. What would happen if we changed the ascending node markers to -H/5
//    while keeping the inclination formula at +H/3 with Ω?
//    The markers would diverge from the inclination phase — is that correct?
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS SCRIPT DOES
// ═══════════════════════════════════════════════════════════════════════════
//
// Recomputes all planetary inclination parameters using the perihelion
// longitude (J2000/ICRF) as the reference angle instead of the ascending node.
// Shows the impact on mean inclination and Laplace-Lagrange bounds.
//
// Usage: node tools/explore/ascending-node-perihelion-investigation.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ═══════════════════════════════════════════════════════════════════════════
// PHASE ANGLE DERIVATION FOR EARTH
// ═══════════════════════════════════════════════════════════════════════════

const earthPeriLongJ2000 = 102.947;  // Ecliptic perihelion longitude at J2000
const earthInclJ2000 = 1.57869;     // Inclination to inv plane at J2000 (S&S 2012)
const earthAmplitude = C.earthInvPlaneInclinationAmplitude;

// The perihelion moves at H/3 in ICRF. At J2000, the ICRF and ecliptic
// perihelion are the same value (102.947°) because J2000 is the reference epoch.
// Going forward/backward in time, the ICRF rate is H/3 while ecliptic is H/16.

// At year 4739: inclination crosses mean (descending)
// ω̃ at 4739 = 102.947 + (360/(H/3)) * (4739 - 2000)
const periRateICRF = 360 / (H / 3);
const periAt4739 = earthPeriLongJ2000 + periRateICRF * (4739 - 2000);

// At mean crossing (descending): phase = 90° → phaseAngle = ω̃ - 90°
const earthPhaseAngle = ((periAt4739 - 90 + 360) % 360);

// Derive mean from J2000 constraint
const earthCosJ2000 = Math.cos((earthPeriLongJ2000 - earthPhaseAngle) * DEG2RAD);
const earthMean = earthInclJ2000 - earthAmplitude * earthCosJ2000;

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║     INCLINATION PHASE ANALYSIS — Perihelion-based (ICRF)       ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('EARTH PHASE ANGLE DERIVATION');
console.log('────────────────────────────');
console.log(`  ω̃ at J2000:          ${earthPeriLongJ2000}°`);
console.log(`  ω̃ at year 4739:      ${periAt4739.toFixed(4)}° (mean crossing, descending)`);
console.log(`  Phase angle:          ${earthPhaseAngle.toFixed(4)}° (ω̃ at mean crossing - 90°)`);
console.log(`  Mean inclination:     ${earthMean.toFixed(6)}°`);
console.log(`  Amplitude:            ${earthAmplitude}°`);
console.log(`  cos at J2000:         ${earthCosJ2000.toFixed(6)}`);
console.log(`  i(J2000) check:       ${(earthMean + earthAmplitude * earthCosJ2000).toFixed(6)}° (expected ${earthInclJ2000}°)`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// ALL PLANETS
// ═══════════════════════════════════════════════════════════════════════════

// Phase groups: Earth's phase angle → 21.77° group
// Saturn (retrograde) → 201.77° group (= 21.77 + 180°)
const PHASE_PROGRADE = earthPhaseAngle;                         // ~21.77°
const PHASE_RETROGRADE = ((earthPhaseAngle + 180) % 360);       // ~201.77°

console.log('PHASE GROUPS');
console.log('────────────');
console.log(`  Prograde group:   ${PHASE_PROGRADE.toFixed(4)}° (Mercury, Venus, Earth, Mars, Jupiter, Uranus, Neptune)`);
console.log(`  Retrograde group: ${PHASE_RETROGRADE.toFixed(4)}° (Saturn)`);
console.log(`  Old prograde:     203.3195° → New: ${PHASE_PROGRADE.toFixed(4)}°`);
console.log(`  Old retrograde:   23.3195°  → New: ${PHASE_RETROGRADE.toFixed(4)}°`);
console.log('');

// Fibonacci divisors
const FIBONACCI_D = { earth: 3 };
for (const [k, p] of Object.entries(C.planets)) FIBONACCI_D[k] = p.fibonacciD;

// Planetary masses
const PLANET_MASS = { ...C.massFraction };

// Get Fibonacci amplitude
function getFibAmplitude(key) {
  const d = FIBONACCI_D[key];
  if (!d) return null;
  return PSI / (d * Math.sqrt(PLANET_MASS[key]));
}

// Planet configurations
const planets = {
  mercury: { name: 'Mercury', periLongJ2000: C.planets.mercury.longitudePerihelion, inclJ2000: C.planets.mercury.invPlaneInclinationJ2000, omegaJ2000: C.planets.mercury.ascendingNodeInvPlane, period: C.planets.mercury.perihelionEclipticYears, phase: PHASE_PROGRADE },
  venus:   { name: 'Venus',   periLongJ2000: C.planets.venus.longitudePerihelion,   inclJ2000: C.planets.venus.invPlaneInclinationJ2000,   omegaJ2000: C.planets.venus.ascendingNodeInvPlane,   period: C.planets.venus.perihelionEclipticYears,   phase: PHASE_PROGRADE },
  earth:   { name: 'Earth',   periLongJ2000: earthPeriLongJ2000,                    inclJ2000: earthInclJ2000,                              omegaJ2000: 284.51,                                   period: H / 3,                                      phase: PHASE_PROGRADE },
  mars:    { name: 'Mars',    periLongJ2000: C.planets.mars.longitudePerihelion,     inclJ2000: C.planets.mars.invPlaneInclinationJ2000,     omegaJ2000: C.planets.mars.ascendingNodeInvPlane,     period: C.planets.mars.perihelionEclipticYears,     phase: PHASE_PROGRADE },
  jupiter: { name: 'Jupiter', periLongJ2000: C.planets.jupiter.longitudePerihelion,  inclJ2000: C.planets.jupiter.invPlaneInclinationJ2000,  omegaJ2000: C.planets.jupiter.ascendingNodeInvPlane,  period: C.planets.jupiter.perihelionEclipticYears,  phase: PHASE_PROGRADE },
  saturn:  { name: 'Saturn',  periLongJ2000: C.planets.saturn.longitudePerihelion,   inclJ2000: C.planets.saturn.invPlaneInclinationJ2000,   omegaJ2000: C.planets.saturn.ascendingNodeInvPlane,   period: C.planets.saturn.perihelionEclipticYears,   phase: PHASE_RETROGRADE },
  uranus:  { name: 'Uranus',  periLongJ2000: C.planets.uranus.longitudePerihelion,   inclJ2000: C.planets.uranus.invPlaneInclinationJ2000,   omegaJ2000: C.planets.uranus.ascendingNodeInvPlane,   period: C.planets.uranus.perihelionEclipticYears,   phase: PHASE_PROGRADE },
  neptune: { name: 'Neptune', periLongJ2000: C.planets.neptune.longitudePerihelion,  inclJ2000: C.planets.neptune.invPlaneInclinationJ2000,  omegaJ2000: C.planets.neptune.ascendingNodeInvPlane,  period: C.planets.neptune.perihelionEclipticYears,  phase: PHASE_PROGRADE },
};

// Laplace-Lagrange bounds
const llBounds = {
  mercury: { min: 4.57, max: 9.86 },
  venus:   { min: 0.00, max: 3.38 },
  earth:   { min: 0.00, max: 2.95 },
  mars:    { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02 },
  uranus:  { min: 0.902, max: 1.11 },
  neptune: { min: 0.554, max: 0.800 },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE AND COMPARE
// ═══════════════════════════════════════════════════════════════════════════

console.log('PLANET-BY-PLANET RESULTS');
console.log('════════════════════════');
console.log('');
console.log('Planet     │ Phase  │ ω̃ J2000   │ Ω J2000   │ Amplitude │ Old Mean  │ New Mean  │ Δ Mean  │ LL?');
console.log('───────────┼────────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────┼────');

for (const [key, p] of Object.entries(planets)) {
  const amp = (key === 'earth') ? earthAmplitude : getFibAmplitude(key);
  if (!amp) continue;

  // OLD: mean from ascending node
  const oldPhase = (key === 'saturn') ? 23.3195 : 203.3195;
  const oldCos = Math.cos((p.omegaJ2000 - oldPhase) * DEG2RAD);
  const oldMean = p.inclJ2000 - amp * oldCos;

  // NEW: mean from perihelion longitude
  const newCos = Math.cos((p.periLongJ2000 - p.phase) * DEG2RAD);
  const newMean = p.inclJ2000 - amp * newCos;

  const diffArcsec = (newMean - oldMean) * 3600;

  // Check LL bounds
  const newMin = newMean - amp;
  const newMax = newMean + amp;
  const ll = llBounds[key];
  const inLL = ll ? (newMin >= ll.min - 0.01 && newMax <= ll.max + 0.01) : true;

  // Verify J2000
  const j2000check = newMean + amp * newCos;

  const phaseStr = (p.phase > 180 ? '201.77' : ' 21.77').padStart(6);

  console.log(
    `${p.name.padEnd(10)} │ ${phaseStr}° │ ${p.periLongJ2000.toFixed(2).padStart(9)}° │ ${p.omegaJ2000.toFixed(2).padStart(9)}° │ ${amp.toFixed(4).padStart(9)}° │ ${oldMean.toFixed(4).padStart(9)}° │ ${newMean.toFixed(4).padStart(9)}° │ ${(diffArcsec >= 0 ? '+' : '') + diffArcsec.toFixed(1).padStart(6)}" │ ${inLL ? ' ✓ ' : ' ✗ '}`
  );
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// BALANCE CHECK
// ═══════════════════════════════════════════════════════════════════════════

console.log('BALANCE CHECK (Law 3)');
console.log('─────────────────────');
console.log('Balance weights w = √(m×a×(1-e²)) / d are INDEPENDENT of phase angle.');
console.log('Group membership (which side of the balance) is unchanged.');
console.log('→ Balance is UNAFFECTED by the phase angle change.');
console.log('');

// Verify: compute balance with new groups
const PLANET_SMA = { earth: 1.0 };
for (const k of Object.keys(C.planets)) PLANET_SMA[k] = C.derived[k].orbitDistance;
const PLANET_ECC = { ...C.eccJ2000 };

let sum21 = 0, sum201 = 0;
const balancePlanets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

for (const key of balancePlanets) {
  const m = PLANET_MASS[key];
  const a = PLANET_SMA[key];
  const e = PLANET_ECC[key];
  const d = FIBONACCI_D[key];
  const w = Math.sqrt(m * a * (1 - e * e)) / d;
  const is21 = planets[key].phase < 180;
  if (is21) sum21 += w; else sum201 += w;
}

const imbalance = Math.abs(sum21 - sum201) / (sum21 + sum201) * 100;
console.log(`  21.77° total:  ${sum21.toExponential(6)}`);
console.log(`  201.77° total: ${sum201.toExponential(6)}`);
console.log(`  Balance: ${(100 - imbalance).toFixed(4)}%${imbalance < 0.01 ? ' ✓' : ' ⚠'}`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// KEY EPOCHS FOR EARTH
// ═══════════════════════════════════════════════════════════════════════════

console.log('EARTH KEY EPOCHS');
console.log('────────────────');

function earthInclAtYear(year) {
  const peri = earthPeriLongJ2000 + periRateICRF * (year - 2000);
  return earthMean + earthAmplitude * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
}

const ascNodeRate = -360 / (H / 5);

const epochs = [
  balancedYear,
  Math.round(balancedYear + H/3/2),  // max inclination
  -23204,                              // nearest max to J2000
  2000,                                // J2000
  4739,                                // mean crossing
];

for (const year of epochs) {
  const peri = earthPeriLongJ2000 + periRateICRF * (year - 2000);
  const periNorm = ((peri % 360) + 360) % 360;
  const incl = earthInclAtYear(year);
  const ascNode = ((284.51 + ascNodeRate * (year - 2000)) % 360 + 360) % 360;
  const phase = ((periNorm - earthPhaseAngle + 360) % 360);

  let label = '';
  if (Math.abs(incl - (earthMean - earthAmplitude)) < 0.001) label = ' ← MIN';
  else if (Math.abs(incl - (earthMean + earthAmplitude)) < 0.001) label = ' ← MAX';
  else if (Math.abs(incl - earthMean) < 0.001) label = ' ← MEAN';

  console.log(`  Year ${year}: ω̃=${periNorm.toFixed(2).padStart(7)}°  Ω=${ascNode.toFixed(2).padStart(7)}°  phase=${phase.toFixed(2).padStart(7)}°  incl=${incl.toFixed(4).padStart(7)}°${label}`);
}
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('SUMMARY');
console.log('───────');
console.log(`  The inclination oscillation uses the perihelion longitude (ICRF) as reference.`);
console.log(`  Both precess at H/3, ensuring the formula cos(ω̃ - phaseAngle) tracks correctly.`);
console.log(`  The ascending node precesses independently at -H/5 (retrograde).`);
console.log('');
console.log(`  New phase angle:     ${PHASE_PROGRADE.toFixed(4)}° (was 203.3195°)`);
console.log(`  Saturn phase angle:  ${PHASE_RETROGRADE.toFixed(4)}° (was 23.3195°)`);
console.log(`  Mean inclination:    ${earthMean.toFixed(6)}° (was ${C.earthInvPlaneInclinationMean.toFixed(6)}°)`);
console.log(`  Amplitude:           ${earthAmplitude}° (unchanged)`);
console.log(`  Balance:             ${(100 - imbalance).toFixed(4)}% (unchanged, independent of phase angle)`);
