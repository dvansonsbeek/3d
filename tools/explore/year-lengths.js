#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// YEAR LENGTHS — Verify tropical, sidereal, anomalistic year lengths,
//                season length asymmetry, and day length relationships
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  YEAR LENGTHS — Year and Day Length Verification');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 1. MEAN SOLAR YEAR — INPUT VS MODEL (ROUNDING EFFECT)
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 1. Mean Solar Year — Input vs Model (Rounding Effect) ───');
console.log();

console.log(`  Input mean solar year:   ${C.inputMeanSolarYear.toFixed(10)} days`);
console.log(`  Model mean solar year:   ${C.meanSolarYearDays.toFixed(10)} days`);
console.log(`  Difference:              ${((C.meanSolarYearDays - C.inputMeanSolarYear) * 86400).toFixed(6)} seconds`);
console.log();
console.log('  The model rounds: meanSolarYear = round(input * H/16) / (H/16)');
console.log(`  H/16 = ${C.perihelionCycleLength} (perihelion precession cycle)`);
console.log(`  input * H/16 = ${(C.inputMeanSolarYear * C.perihelionCycleLength).toFixed(6)}`);
console.log(`  rounded      = ${Math.round(C.inputMeanSolarYear * C.perihelionCycleLength)}`);
console.log(`  / (H/16)     = ${C.meanSolarYearDays.toFixed(10)} days`);
console.log();
console.log('  This rounding ensures an exact integer number of solar days in H/16 years,');
console.log('  which is critical for the perihelion precession cycle to close exactly.');

// ═══════════════════════════════════════════════════════════════════════════
// 2. YEAR TYPES — MODEL VS KNOWN
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 2. Year Types — Model vs Known ──────────────────────────');
console.log();

const yearComps = [
  {
    name: 'Mean tropical year',
    model: C.meanSolarYearDays,
    known: C.yearLengthRef.tropicalYearMean,
    derivation: 'round(input * H/16) / (H/16)',
  },
  {
    name: 'Mean sidereal year',
    model: C.meanSiderealYearDays,
    known: C.yearLengthRef.siderealYear,
    derivation: 'tropical * (H/13) / ((H/13) - 1)',
  },
  {
    name: 'Mean anomalistic year',
    model: C.meanAnomalisticYearDays,
    known: C.yearLengthRef.anomalisticYear,
    derivation: 'tropical / (H/16 - 1) + tropical',
  },
];

const ycHeader = ['Year type', 'Model (d)', 'Known (d)', 'Diff (s)', 'Diff (ppm)'];
const ycRows = [];

for (const yc of yearComps) {
  const diffDays = yc.model - yc.known;
  const diffSeconds = diffDays * 86400;
  const ppm = (diffDays / yc.known) * 1e6;
  ycRows.push([
    C.pad(yc.name, 24),
    C.padLeft(yc.model.toFixed(10), 16),
    C.padLeft(yc.known.toFixed(7), 14),
    C.padLeft(diffSeconds.toFixed(4), 10),
    C.padLeft(ppm.toFixed(2), 10),
  ]);
}

C.printTable(ycHeader, ycRows, [24, 16, 14, 10, 10]);

console.log();
console.log('  Derivation chain:');
for (const yc of yearComps) {
  console.log(`    ${C.pad(yc.name, 24)}: ${yc.derivation}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. RELATIONSHIP BETWEEN YEAR TYPES
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 3. Relationship Between Year Types ──────────────────────');
console.log();

// Sidereal - tropical = precession contribution
const sidTropDiff = C.meanSiderealYearDays - C.meanSolarYearDays;
const sidTropDiffSeconds = sidTropDiff * 86400;
console.log('  Sidereal - Tropical = precession contribution:');
console.log(`    Model:  ${sidTropDiff.toFixed(10)} days = ${sidTropDiffSeconds.toFixed(4)} seconds`);
console.log(`    Known:  ${(C.yearLengthRef.siderealYear - C.yearLengthRef.tropicalYearMean).toFixed(7)} days = ${((C.yearLengthRef.siderealYear - C.yearLengthRef.tropicalYearMean) * 86400).toFixed(4)} seconds`);
console.log(`    This equals 1 full rotation / (H/13 years) expressed in days`);
const expectedDiff = C.meanSolarYearDays / (C.H / 13 - 1);
console.log(`    Expected: tropical / ((H/13) - 1) = ${expectedDiff.toFixed(10)} days`);
console.log(`    Match: ${Math.abs(sidTropDiff - expectedDiff) < 1e-10 ? 'EXACT' : 'MISMATCH'}`);
console.log();

// Anomalistic - tropical = perihelion precession contribution
const anomTropDiff = C.meanAnomalisticYearDays - C.meanSolarYearDays;
const anomTropDiffSeconds = anomTropDiff * 86400;
console.log('  Anomalistic - Tropical = perihelion precession contribution:');
console.log(`    Model:  ${anomTropDiff.toFixed(10)} days = ${anomTropDiffSeconds.toFixed(4)} seconds`);
console.log(`    Known:  ${(C.yearLengthRef.anomalisticYear - C.yearLengthRef.tropicalYearMean).toFixed(7)} days = ${((C.yearLengthRef.anomalisticYear - C.yearLengthRef.tropicalYearMean) * 86400).toFixed(4)} seconds`);
console.log(`    This equals 1 full rotation / (H/16 years) expressed in days`);
const expectedAnomDiff = C.meanSolarYearDays / (C.perihelionCycleLength - 1);
console.log(`    Expected: tropical / ((H/16) - 1) = ${expectedAnomDiff.toFixed(10)} days`);
console.log(`    Match: ${Math.abs(anomTropDiff - expectedAnomDiff) < 1e-10 ? 'EXACT' : 'MISMATCH'}`);
console.log();

// Verify: 1/tropical = 1/sidereal + 1/(precession_period_in_days)
// The precession "year" in days = (H/13) * meanSolarYearDays
const precPeriodDays = (C.H / 13) * C.meanSolarYearDays;
const invTrop = 1 / C.meanSolarYearDays;
const invSid = 1 / C.meanSiderealYearDays;
const invPrec = 1 / precPeriodDays;
console.log('  Frequency relationship: 1/tropical = 1/sidereal + 1/precession');
console.log(`    1/tropical  = ${invTrop.toExponential(10)}`);
console.log(`    1/sidereal  = ${invSid.toExponential(10)}`);
console.log(`    1/precession = ${invPrec.toExponential(10)}`);
console.log(`    Sum:          ${(invSid + invPrec).toExponential(10)}`);
console.log(`    Match: ${Math.abs(invTrop - (invSid + invPrec)) < 1e-15 ? 'EXACT' : Math.abs(invTrop - (invSid + invPrec)).toExponential(2)}`);

// ═══════════════════════════════════════════════════════════════════════════
// 4. DAY LENGTHS — MODEL VS KNOWN
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 4. Day Lengths — Model vs Known ─────────────────────────');
console.log();

const dayComps = [
  {
    name: 'Mean length of day (SI)',
    model: C.meanLengthOfDay,
    known: C.yearLengthRef.solarDay,
    derivation: 'sidereal_year_seconds / sidereal_year_days',
  },
  {
    name: 'Mean sidereal day',
    model: C.meanSiderealDay,
    known: C.yearLengthRef.siderealDay,
    derivation: '(solar_year_days / (solar_year_days+1)) * length_of_day',
  },
  {
    name: 'Mean stellar day',
    model: C.meanStellarDay,
    known: C.yearLengthRef.stellarDay,
    derivation: 'sidereal_day + (sidereal_day/(H/13)) / (solar_year_days+1)',
  },
];

const dcHeader = ['Day type', 'Model (s)', 'Known (s)', 'Diff (ms)', 'Diff (ppm)'];
const dcRows = [];

for (const dc of dayComps) {
  const diff = dc.model - dc.known;
  const diffMs = diff * 1000;
  const ppm = (diff / dc.known) * 1e6;
  dcRows.push([
    C.pad(dc.name, 26),
    C.padLeft(dc.model.toFixed(8), 16),
    C.padLeft(dc.known.toFixed(8), 16),
    C.padLeft(diffMs.toFixed(4), 10),
    C.padLeft(ppm.toFixed(4), 10),
  ]);
}

C.printTable(dcHeader, dcRows, [26, 16, 16, 10, 10]);

console.log();
console.log('  Note: stellar day > sidereal day because precession makes the vernal equinox');
console.log('  drift westward, so Earth completes a "sidereal" rotation slightly before');
console.log('  returning to the same position relative to the fixed stars.');

// ═══════════════════════════════════════════════════════════════════════════
// 5. SOLAR DAY OFFSET FROM PERIHELION PRECESSION
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 5. Solar Day Offset from Perihelion Precession ──────────');
console.log();

const solarDayOffsetMs = (86400 / C.perihelionCycleLength) / C.meanSolarYearDays * 1000;
const yearlyAccumulation = solarDayOffsetMs * C.meanSolarYearDays / 1000;

console.log(`  Perihelion precession causes the measured solar day to be ~${solarDayOffsetMs.toFixed(2)} ms short.`);
console.log(`  This accumulates to 1 extra day over one perihelion cycle (H/16 = ${C.perihelionCycleLength} years).`);
console.log();
console.log(`  Formula: (86400 / ${C.perihelionCycleLength}) / ${C.meanSolarYearDays.toFixed(6)} * 1000 = ${solarDayOffsetMs.toFixed(4)} ms/day`);
console.log(`  Yearly accumulation: ${solarDayOffsetMs.toFixed(4)} ms x ${C.meanSolarYearDays.toFixed(2)} days = ${yearlyAccumulation.toFixed(4)} seconds/year`);

// ═══════════════════════════════════════════════════════════════════════════
// 6. WOBBLE PARALLAX
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 6. Wobble Parallax ───────────────────────────────────────');
console.log();

const r = C.eccentricityAmplitude; // AU
const D = 1; // AU
const T_wobble_years = C.H / 13;
const T_sidereal_seconds = C.yearLengthRef.siderealYear * 86400;
const wobbleParallax = (r / D) * (T_sidereal_seconds / (T_wobble_years * C.yearLengthRef.siderealYear * 86400)) * T_sidereal_seconds;

console.log('  Earth orbits the wobble center, creating a parallax effect:');
console.log(`    Wobble radius (r):     ${r} AU = ${(r * C.currentAUDistance).toFixed(0)} km`);
console.log(`    Sun distance (D):      ${D} AU`);
console.log(`    Wobble period:         ${T_wobble_years.toFixed(2)} years (H/13)`);
console.log(`    Parallax offset:       ${wobbleParallax.toFixed(4)} seconds`);
console.log(`    Added to sidereal year when measured from Earth`);

// ═══════════════════════════════════════════════════════════════════════════
// 7. SEASON LENGTH ANALYSIS — CONSTANT-SPEED LIMITATION
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 7. Season Length Analysis — Constant-Speed Limitation ────');
console.log();

// Known season lengths (days, J2000, from equinox/solstice to next)
const knownSeasons = {
  spring: 92.758, // VE to SS
  summer: 93.651, // SS to AE
  autumn: 89.842, // AE to WS
  winter: 88.993, // WS to VE
};

// Total
const knownTotal = knownSeasons.spring + knownSeasons.summer + knownSeasons.autumn + knownSeasons.winter;

console.log('  Observed season lengths (J2000):');
console.log(`    Spring (VE→SS): ${knownSeasons.spring} days`);
console.log(`    Summer (SS→AE): ${knownSeasons.summer} days`);
console.log(`    Autumn (AE→WS): ${knownSeasons.autumn} days`);
console.log(`    Winter (WS→VE): ${knownSeasons.winter} days`);
console.log(`    Total:          ${knownTotal.toFixed(3)} days`);
console.log();

// In the Keplerian model, season asymmetry comes from eccentricity (e ~ 0.0167)
// The constant-speed circular model captures HALF this asymmetry
// Predicted season variations from off-center circle:
// The Sun orbits at constant speed on a circle offset by d = e*R from Earth
// For the model: the Sun orbits PERIHELION-OF-EARTH at 1 AU, but PERIHELION-OF-EARTH
// is offset from Earth by ~eccentricityBase AU

const e = C.eccentricityBase; // ~0.0153 AU (orbital radius of perihelion-of-earth)
// Actually at J2000, the total eccentricity ≈ eccentricityBase + eccentricityAmplitude ≈ 0.0167
const eJ2000 = C.eccentricityBase + C.eccentricityAmplitude; // approximate

console.log(`  Model eccentricity at J2000: ~${eJ2000.toFixed(6)} AU`);
console.log(`  (eccentricityBase ${C.eccentricityBase} + eccentricityAmplitude ${C.eccentricityAmplitude})`);
console.log();

// Keplerian equation of center amplitude ≈ 2e radians
// Off-center circle equation of center ≈ e radians (half)
// Season asymmetry is proportional to the equation of center
const keplerMax = 2 * eJ2000 * (180 / Math.PI); // degrees
const modelMax = eJ2000 * (180 / Math.PI); // degrees

console.log('  Equation of center (max angular deviation from mean):');
console.log(`    Keplerian (2e):     ±${keplerMax.toFixed(4)}° = ±${(keplerMax / 360 * C.meanSolarYearDays).toFixed(3)} days of season`);
console.log(`    Off-center (e):     ±${modelMax.toFixed(4)}° = ±${(modelMax / 360 * C.meanSolarYearDays).toFixed(3)} days of season`);
console.log(`    Model captures:     ~50% of observed season asymmetry`);
console.log();

// Predicted model season lengths (assuming half the asymmetry)
const meanSeason = C.meanSolarYearDays / 4;
const seasonAsymmetry = knownSeasons.summer - knownSeasons.winter;
const predictedAsymmetry = seasonAsymmetry / 2;
console.log(`  Mean season length: ${meanSeason.toFixed(3)} days`);
console.log(`  Observed max asymmetry (summer-winter): ${seasonAsymmetry.toFixed(3)} days`);
console.log(`  Predicted model asymmetry (half):       ${predictedAsymmetry.toFixed(3)} days`);

// ═══════════════════════════════════════════════════════════════════════════
// 8. PRECESSION RATE — MODEL VS IAU
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 8. Precession Rate — Model vs IAU ───────────────────────');
console.log();

const modelPrecYears = C.H / 13;
const iauPrecYears = C.yearLengthRef.iauPrecessionJ2000;
const precDiff = modelPrecYears - iauPrecYears;
const precDiffPct = (precDiff / iauPrecYears) * 100;

console.log(`  Model precession period (H/13): ${modelPrecYears.toFixed(2)} years`);
console.log(`  IAU J2000 precession period:    ${iauPrecYears.toFixed(5)} years`);
console.log(`  Difference:                     ${precDiff.toFixed(2)} years (${precDiffPct.toFixed(3)}%)`);
console.log();
console.log('  Note: H/13 is the MEAN precession period. The observed ~25,772 yr is the');
console.log('  current instantaneous rate, which varies through the obliquity cycle.');
console.log(`  The model correctly uses the long-term mean (${modelPrecYears.toFixed(2)} yr), which is`);
console.log('  shorter than the current observed rate because we are near a precession');
console.log('  rate maximum in the cycle.');

// ═══════════════════════════════════════════════════════════════════════════
// 9. SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 9. Summary ───────────────────────────────────────────────');
console.log();

const summaryItems = [
  { name: 'Mean solar year', modelVal: `${C.meanSolarYearDays.toFixed(7)} d`, knownVal: `${C.yearLengthRef.tropicalYearMean.toFixed(7)} d`, diff: `${((C.meanSolarYearDays - C.yearLengthRef.tropicalYearMean) * 86400).toFixed(3)} s` },
  { name: 'Mean sidereal year', modelVal: `${C.meanSiderealYearDays.toFixed(7)} d`, knownVal: `${C.yearLengthRef.siderealYear.toFixed(6)} d`, diff: `${((C.meanSiderealYearDays - C.yearLengthRef.siderealYear) * 86400).toFixed(3)} s` },
  { name: 'Mean anomalistic year', modelVal: `${C.meanAnomalisticYearDays.toFixed(7)} d`, knownVal: `${C.yearLengthRef.anomalisticYear.toFixed(6)} d`, diff: `${((C.meanAnomalisticYearDays - C.yearLengthRef.anomalisticYear) * 86400).toFixed(3)} s` },
  { name: 'Length of day', modelVal: `${C.meanLengthOfDay.toFixed(6)} s`, knownVal: `${C.yearLengthRef.solarDay.toFixed(1)} s`, diff: `${((C.meanLengthOfDay - C.yearLengthRef.solarDay) * 1000).toFixed(3)} ms` },
  { name: 'Sidereal day', modelVal: `${C.meanSiderealDay.toFixed(6)} s`, knownVal: `${C.yearLengthRef.siderealDay.toFixed(6)} s`, diff: `${((C.meanSiderealDay - C.yearLengthRef.siderealDay) * 1000).toFixed(3)} ms` },
  { name: 'Precession period', modelVal: `${modelPrecYears.toFixed(2)} yr`, knownVal: `${iauPrecYears.toFixed(2)} yr (current)`, diff: `${precDiff.toFixed(2)} yr (${precDiffPct.toFixed(2)}%)` },
];

for (const item of summaryItems) {
  console.log(`  ${C.pad(item.name, 24)}: model ${C.padLeft(item.modelVal, 20)}  known ${C.padLeft(item.knownVal, 22)}  diff ${item.diff}`);
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  YEAR LENGTHS VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
