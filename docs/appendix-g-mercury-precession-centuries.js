// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX G: MERCURY PERIHELION PRECESSION BY CENTURY
// ═══════════════════════════════════════════════════════════════════════════
//
// This script explains the relationship between:
// 1. Ecliptic-frame precession rate (constant Newtonian value)
// 2. Earth-frame precession rate (fluctuates due to Earth's orientation)
// 3. "Missing advance" (difference between the two)
//
// IMPORTANT: The Earth-frame calculation requires the full 3D simulation.
// This script provides theoretical analysis and expected values, not
// actual computed results from the model.
//
// To get actual values from the running model, see:
//   Planet Stats > Mercury > "Missing advance 1800-1900"
//   Planet Stats > Mercury > "Missing advance of perihelion" (1900-2000)
//   Planet Stats > Mercury > "Predicted missing advance" (2000-2100)
//
// Historical context:
// - Le Verrier (1859) observed ~575 arcsec/century
// - Newtonian prediction: ~532 arcsec/century
// - Discrepancy of ~43 arcsec/century explained by General Relativity (1915)
//
// Run with: node appendix-g-mercury-precession-centuries.js
// ═══════════════════════════════════════════════════════════════════════════

const holisticyearLength = 333888;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// Mercury's perihelion precession period (ICRF frame)
const mercuryPerihelionICRFYears = holisticyearLength / (1 + 3/8);  // ~242,828 years

// Ecliptic precession rate: 129,600,000 / period_years arcsec/century
// This is the formula used in script.js OrbitalFormulas.precessionRateFromPeriod()
const eclipticRate = 129600000 / mercuryPerihelionICRFYears;

// Earth precession cycles (affect Earth-frame measurements)
const earthAxialPrecessionPeriod = holisticyearLength / 13;        // ~25,684 years
const earthObliquityPeriod = holisticyearLength / 8;               // ~41,736 years
const earthInclinationPrecessionPeriod = holisticyearLength / 3;   // ~111,296 years
const earthEclipticPrecessionPeriod = holisticyearLength / 5;      // ~66,778 years

// Dominant fluctuation period (beat frequency between Earth's cycles)
const dominantFluctuationPeriod = holisticyearLength / 45;         // ~7,420 years

// ═══════════════════════════════════════════════════════════════════════════
// MAIN OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     APPENDIX G: MERCURY PERIHELION PRECESSION BY CENTURY                 ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  This script provides theoretical analysis of Mercury\'s precession.      ║');
console.log('║  Actual values must be obtained from the running simulation.             ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ MODEL CONFIGURATION                                                        │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Holistic Year:                      ${holisticyearLength.toFixed(0).padStart(12)} years                │`);
console.log(`│ Mercury Perihelion ICRF Period:    ${mercuryPerihelionICRFYears.toFixed(2).padStart(12)} years                │`);
console.log(`│ Ecliptic Precession Rate:          ${eclipticRate.toFixed(2).padStart(12)} arcsec/century      │`);
console.log('│                                                                             │');
console.log('│ Earth Precession Cycles:                                                    │');
console.log(`│   Axial precession:                ${earthAxialPrecessionPeriod.toFixed(0).padStart(12)} years                │`);
console.log(`│   Obliquity cycle:                 ${earthObliquityPeriod.toFixed(0).padStart(12)} years                │`);
console.log(`│   Inclination precession:          ${earthInclinationPrecessionPeriod.toFixed(0).padStart(12)} years                │`);
console.log(`│   Ecliptic precession:             ${earthEclipticPrecessionPeriod.toFixed(0).padStart(12)} years                │`);
console.log('│                                                                             │');
console.log(`│ Dominant Fluctuation Period:       ${dominantFluctuationPeriod.toFixed(0).padStart(12)} years                │`);
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ EXPECTED VALUES FROM SIMULATION                                            │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log('│                                                                             │');
console.log('│ Century     │ Ecliptic Rate │ Earth-Frame │ Missing Adv │ Comments          │');
console.log('│             │  (arcsec/cy)  │ (arcsec/cy) │ (arcsec/cy) │                   │');
console.log('│ ────────────┼───────────────┼─────────────┼─────────────┼─────────────────  │');
console.log(`│ 1800-1900   │       ${eclipticRate.toFixed(2)}  │    varies   │    varies   │ Einstein\'s cent.  │`);
console.log(`│ 1900-2000   │       ${eclipticRate.toFixed(2)}  │    varies   │    varies   │ Measurement cent.  │`);
console.log(`│ 2000-2100   │       ${eclipticRate.toFixed(2)}  │    varies   │    varies   │ Prediction         │`);
console.log('│                                                                             │');
console.log('│ Note: Earth-frame values fluctuate with ~7,400 year period                 │');
console.log('│ Range: approximately ±100 arcsec/century around the ecliptic rate          │');
console.log('│                                                                             │');
console.log('│ To get actual values, run the simulation and check Planet Stats > Mercury  │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('TWO MEASUREMENT METHODS');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('1. ECLIPTIC-FRAME (perihelionLongitudeEcliptic function):');
console.log(`   - Reads directly from precession layer rotation`);
console.log(`   - Rate: ${eclipticRate.toFixed(2)} arcsec/century (CONSTANT)`);
console.log('   - This is the "true" heliocentric precession rate');
console.log('   - Unaffected by Earth\'s reference frame');
console.log('');
console.log('2. EARTH-FRAME (apparentRaFromPdA function):');
console.log('   - Transforms through Earth\'s equatorial coordinate system');
console.log('   - Rate: FLUCTUATES due to Earth\'s precession cycles');
console.log('   - Range: approximately ±100 arcsec/century variation');
console.log('   - Dominant period: ~7,400 years');
console.log('   - Long-term average equals the ecliptic rate');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('FLUCTUATION MECHANISM');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The ~7,400 year period arises from beat frequencies between:');
console.log('');
console.log('  Earth\'s inclination precession:    1/3 of Holistic Year   (111,296 years)');
console.log('  Earth\'s ecliptic precession:       1/5 of Holistic Year   (66,778 years)');
console.log('');
console.log('  Beat frequency: 1/(1/3 - 1/5) = 15/2 → ~44,518 years fundamental');
console.log('  Further harmonics divide this to produce ~7,400 year observed period');
console.log('');
console.log('Scene graph hierarchy in script.js:');
console.log('  └── earth');
console.log('        └── earthInclinationPrecession      ← 111,296 year cycle');
console.log('              └── earthEclipticPrecession   ← 66,778 year cycle');
console.log('                    └── earthObliquityPrecession');
console.log('                          └── earthPerihelionPrecession1');
console.log('                                └── mercuryPerihelionDurationEcliptic1');
console.log('                                      └── mercury');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('"MISSING ADVANCE" EXPLAINED');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The "missing advance" = Earth-frame rate - Ecliptic-frame rate');
console.log('');
console.log('This is a COORDINATE ARTIFACT, not a physical effect:');
console.log('  - It fluctuates with ~7,400 year period');
console.log('  - It averages to ZERO over ~334,000 years (one Holistic Year)');
console.log('  - Sometimes adds to apparent rate, sometimes subtracts');
console.log('');
console.log('This is NOT the same as the relativistic 43 arcsec/century:');
console.log('  - GR effect is a REAL PHYSICAL EFFECT');
console.log('  - GR effect accumulates continuously, never averages out');
console.log('  - GR effect is NOT included in this Newtonian model');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('HISTORICAL CONTEXT');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Le Verrier (1859) discovered a discrepancy in Mercury\'s precession:');
console.log('');
console.log('  Observed rate:            ~575 arcsec/century');
console.log('  Newtonian prediction:     ~532 arcsec/century');
console.log('  Unexplained anomaly:      ~43 arcsec/century');
console.log('');
console.log('This 43 arcsec/century was unexplained for 56 years until Einstein\'s');
console.log('General Relativity (1915) predicted exactly this amount from spacetime');
console.log('curvature near the Sun.');
console.log('');
console.log('The Earth-frame fluctuations shown by this model are DIFFERENT:');
console.log('  - They are reference frame artifacts');
console.log('  - They average out over time');
console.log('  - The ~575 arcsec/century we might see currently is coincidental');
console.log('    (we happen to be at a certain phase of the ~7,400 year cycle)');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('HOW TO GET ACTUAL VALUES');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Run the 3D simulation and open Planet Stats > Mercury:');
console.log('');
console.log('  "Missing advance 1800-1900 (Einstein\'s century)"');
console.log('    → Difference between Earth-frame and Ecliptic-frame (1800-1900)');
console.log('');
console.log('  "Missing advance of perihelion"');
console.log('    → Difference between Earth-frame and Ecliptic-frame (1900-2000)');
console.log('');
console.log('  "Predicted missing advance (next century)"');
console.log('    → Difference between Earth-frame and Ecliptic-frame (2000-2100)');
console.log('');
console.log('  "Perihelion precession (Heliocentric)"');
console.log(`    → Should show ~${eclipticRate.toFixed(2)} arcsec/century (constant)`);
console.log('');
console.log('  "Perihelion precession (Geocentric)"');
console.log('    → Earth-frame rate = Ecliptic rate + Missing advance');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('REFERENCES');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  docs/13-perihelion-precession.md - Full documentation');
console.log('  docs/17-mercury-precession-breakdown.md - Mercury analysis');
console.log('  src/script.js - calculateMissingPerihelionAdvanceBetween() function');
console.log('  src/script.js - apparentRaFromPdA() function');
console.log('  src/script.js - perihelionLongitudeEcliptic() function');
console.log('');
