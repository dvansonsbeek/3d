#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// MOON CYCLES — Verify derived month lengths, precession periods,
//               eclipse cycles (Saros, Exeligmos, Callippic)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  MOON CYCLES — Lunar Cycle Verification');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 1. INPUT MONTHS AND INTEGER CYCLE COUNTS
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 1. Input Months and Integer Cycle Counts ─────────────────');
console.log();

const totalDays = C.totalDaysInH;

// Integer cycle counts (the Math.ceil values)
const siderealCycles = Math.ceil(totalDays / C.moonSiderealMonthInput);
const anomalisticCycles = Math.ceil(totalDays / C.moonAnomalisticMonthInput);
const nodalCycles = Math.ceil(totalDays / C.moonNodalMonthInput);

console.log('  Input month lengths and integer cycle counts in H:');
console.log();
console.log(`  Total days in H = ${totalDays.toFixed(2)}`);
console.log();
console.log(`  Sidereal month:    input = ${C.moonSiderealMonthInput} d`);
console.log(`    Exact cycles: ${(totalDays / C.moonSiderealMonthInput).toFixed(6)}`);
console.log(`    Rounded (ceil): ${C.fmtInt(siderealCycles)}`);
console.log(`    Model month:  ${C.moonSiderealMonth.toFixed(10)} d`);
console.log();
console.log(`  Anomalistic month: input = ${C.moonAnomalisticMonthInput} d`);
console.log(`    Exact cycles: ${(totalDays / C.moonAnomalisticMonthInput).toFixed(6)}`);
console.log(`    Rounded (ceil): ${C.fmtInt(anomalisticCycles)}`);
console.log(`    Model month:  ${C.moonAnomalisticMonth.toFixed(10)} d`);
console.log();
console.log(`  Nodal month:       input = ${C.moonNodalMonthInput} d`);
console.log(`    Exact cycles: ${(totalDays / C.moonNodalMonthInput).toFixed(6)}`);
console.log(`    Rounded (ceil): ${C.fmtInt(nodalCycles)}`);
console.log(`    Model month:  ${C.moonNodalMonth.toFixed(10)} d`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. DERIVED MONTHS — MODEL VS KNOWN
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 2. Derived Months — Model vs Known ──────────────────────');
console.log();

const monthComparisons = [
  { name: 'Sidereal month', model: C.moonSiderealMonth, known: 27.321662, unit: 'd' },
  { name: 'Anomalistic month', model: C.moonAnomalisticMonth, known: 27.554550, unit: 'd' },
  { name: 'Nodal (draconic) month', model: C.moonNodalMonth, known: 27.212221, unit: 'd' },
  { name: 'Synodic month', model: C.moonSynodicMonth, known: 29.530589, unit: 'd' },
  { name: 'Tropical month', model: C.moonTropicalMonth, known: 27.321582, unit: 'd' },
];

const mcHeader = ['Month type', 'Model (d)', 'Known (d)', 'Diff (s)', 'Diff (ppm)'];
const mcRows = [];

for (const mc of monthComparisons) {
  const diffDays = mc.model - mc.known;
  const diffSeconds = diffDays * 86400;
  const ppm = (diffDays / mc.known) * 1e6;
  mcRows.push([
    C.pad(mc.name, 24),
    C.padLeft(mc.model.toFixed(8), 14),
    C.padLeft(mc.known.toFixed(6), 12),
    C.padLeft(diffSeconds.toFixed(3), 10),
    C.padLeft(ppm.toFixed(2), 10),
  ]);
}

C.printTable(mcHeader, mcRows, [24, 14, 12, 10, 10]);

// ═══════════════════════════════════════════════════════════════════════════
// 3. PRECESSION PERIODS — MODEL VS KNOWN
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 3. Precession Periods — Model vs Known ──────────────────');
console.log();

const precComparisons = [
  {
    name: 'Apsidal precession (Earth frame)',
    modelDays: C.moonApsidalPrecessionDaysEarth,
    knownYears: 8.849,
    knownDays: 8.849 * 365.25,
  },
  {
    name: 'Apsidal precession (ICRF)',
    modelDays: C.moonApsidalPrecessionDaysICRF,
    knownYears: null,
    knownDays: null,
  },
  {
    name: 'Nodal precession (Earth frame)',
    modelDays: C.moonNodalPrecessionDaysEarth,
    knownYears: 18.613,
    knownDays: 18.613 * 365.25,
  },
  {
    name: 'Nodal precession (ICRF)',
    modelDays: C.moonNodalPrecessionDaysICRF,
    knownYears: null,
    knownDays: null,
  },
  {
    name: 'Apsidal-nodal beat',
    modelDays: C.moonApsidalMeetsNodalDays,
    knownYears: null,
    knownDays: null,
  },
  {
    name: 'Lunar leveling cycle',
    modelDays: C.moonLunarLevelingCycleDays,
    knownYears: null,
    knownDays: null,
  },
];

for (const pc of precComparisons) {
  const modelYears = pc.modelDays / C.meanSolarYearDays;
  console.log(`  ${pc.name}:`);
  console.log(`    Model:  ${pc.modelDays.toFixed(4)} days = ${modelYears.toFixed(6)} years`);
  if (pc.knownDays) {
    const diffDays = pc.modelDays - pc.knownDays;
    const diffHours = diffDays * 24;
    console.log(`    Known:  ~${pc.knownDays.toFixed(2)} days = ~${pc.knownYears} years`);
    console.log(`    Diff:   ${diffDays.toFixed(4)} days = ${diffHours.toFixed(2)} hours`);
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ECLIPSE CYCLES — SAROS, EXELIGMOS, CALLIPPIC
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 4. Eclipse Cycles — Saros, Exeligmos, Callippic ─────────');
console.log();

// SAROS: 223 synodic ≈ 239 anomalistic ≈ 242 draconic ≈ ~6585.32 days
console.log('  SAROS CYCLE:');
console.log();

const saros = {
  synodic: { n: 223, month: C.moonSynodicMonth, label: 'synodic' },
  anomalistic: { n: 239, month: C.moonAnomalisticMonth, label: 'anomalistic' },
  draconic: { n: 242, month: C.moonNodalMonth, label: 'draconic (nodal)' },
};

const sarosBase = saros.synodic.n * saros.synodic.month;
console.log(`    223 synodic months     = ${sarosBase.toFixed(6)} days`);

for (const [key, s] of Object.entries(saros)) {
  const days = s.n * s.month;
  const diff = days - sarosBase;
  const diffHours = diff * 24;
  if (key !== 'synodic') {
    console.log(`    ${s.n} ${C.pad(s.label + ' months', 22)} = ${days.toFixed(6)} days  (diff from synodic: ${diffHours.toFixed(3)} hours)`);
  }
}

const knownSaros = 6585.32;
console.log();
console.log(`    Known Saros:           ~${knownSaros} days`);
console.log(`    Model vs known:        ${(sarosBase - knownSaros).toFixed(4)} days = ${((sarosBase - knownSaros) * 24).toFixed(2)} hours`);

// Draconic year-based
const draconicYearSaros = 19 * C.moonDraconicYearEarth;
console.log();
console.log(`    19 draconic years      = ${draconicYearSaros.toFixed(6)} days  (diff from synodic: ${((draconicYearSaros - sarosBase) * 24).toFixed(3)} hours)`);

// EXELIGMOS: 3 x Saros
console.log();
console.log('  EXELIGMOS (3x Saros):');
const exelBase = 3 * sarosBase;
console.log(`    3 x 223 synodic        = ${exelBase.toFixed(6)} days`);
console.log(`    3 x 239 anomalistic    = ${(3 * saros.anomalistic.n * saros.anomalistic.month).toFixed(6)} days`);
console.log(`    3 x 242 draconic       = ${(3 * saros.draconic.n * saros.draconic.month).toFixed(6)} days`);
console.log(`    Known Exeligmos:       ~${(knownSaros * 3).toFixed(2)} days`);
console.log(`    Model vs known:        ${(exelBase - knownSaros * 3).toFixed(4)} days`);

// Is Exeligmos a near-integer number of days? (Important: makes eclipses repeat at same longitude)
const exelFrac = exelBase - Math.floor(exelBase);
console.log(`    Fractional days:       ${exelFrac.toFixed(6)} (closer to integer -> same-longitude repeat)`);

// CALLIPPIC: 940 synodic ≈ 76 solar years
console.log();
console.log('  CALLIPPIC CYCLE:');
const callSynodic = 940 * C.moonSynodicMonth;
const call76Years = 76 * C.meanSolarYearDays;
const callDraconic = 1020 * C.moonNodalMonth;
const callSidereal = 1016 * C.moonSiderealMonth;
const callTropical = 1016 * C.moonTropicalMonth;

console.log(`    940 synodic months     = ${callSynodic.toFixed(6)} days`);
console.log(`    76 solar years         = ${call76Years.toFixed(6)} days`);
console.log(`    Diff (syn - 76yr):     ${(callSynodic - call76Years).toFixed(6)} days = ${((callSynodic - call76Years) * 24).toFixed(3)} hours`);
console.log(`    1020 draconic months   = ${callDraconic.toFixed(6)} days  (diff: ${((callDraconic - callSynodic) * 24).toFixed(3)} hours)`);
console.log(`    1016 sidereal months   = ${callSidereal.toFixed(6)} days  (diff: ${((callSidereal - callSynodic) * 24).toFixed(3)} hours)`);
console.log(`    1016 tropical months   = ${callTropical.toFixed(6)} days  (diff: ${((callTropical - callSynodic) * 24).toFixed(3)} hours)`);

// METONIC: 235 synodic ≈ 19 solar years
console.log();
console.log('  METONIC CYCLE (for reference):');
const metSynodic = 235 * C.moonSynodicMonth;
const met19Years = 19 * C.meanSolarYearDays;
console.log(`    235 synodic months     = ${metSynodic.toFixed(6)} days`);
console.log(`    19 solar years         = ${met19Years.toFixed(6)} days`);
console.log(`    Diff:                  ${(metSynodic - met19Years).toFixed(6)} days = ${((metSynodic - met19Years) * 24).toFixed(3)} hours`);

// ═══════════════════════════════════════════════════════════════════════════
// 5. DRACONIC YEAR AND ECLIPSE YEAR
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 5. Draconic Year and Eclipse Year ────────────────────────');
console.log();

const knownDraconicYear = 346.620;

console.log(`  Draconic year (ICRF):    ${C.moonDraconicYearICRF.toFixed(6)} days`);
console.log(`  Draconic year (Earth):   ${C.moonDraconicYearEarth.toFixed(6)} days`);
console.log(`  Known eclipse year:      ~${knownDraconicYear} days`);
console.log(`  Model (Earth) vs known:  ${(C.moonDraconicYearEarth - knownDraconicYear).toFixed(6)} days = ${((C.moonDraconicYearEarth - knownDraconicYear) * 24).toFixed(3)} hours`);
console.log();

// Eclipse seasons per solar year
const eclipseSeasons = C.meanSolarYearDays / C.moonDraconicYearEarth;
console.log(`  Eclipse seasons per year: ${eclipseSeasons.toFixed(6)} (~${eclipseSeasons.toFixed(2)} seasons)`);
console.log(`  Eclipses per year (min):  ~2 (at least 2 solar eclipses guaranteed)`);

// ═══════════════════════════════════════════════════════════════════════════
// 6. FULL MOON CYCLE
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 6. Full Moon Cycle ───────────────────────────────────────');
console.log();

const knownFMC = 411.78; // days (approximately)
console.log(`  Full Moon Cycle (Earth): ${C.moonFullMoonCycleEarth.toFixed(6)} days = ${(C.moonFullMoonCycleEarth / C.meanSolarYearDays).toFixed(6)} years`);
console.log(`  Full Moon Cycle (ICRF):  ${C.moonFullMoonCycleICRF.toFixed(6)} days`);
console.log(`  Known:                   ~${knownFMC} days`);
console.log(`  Diff (Earth vs known):   ${(C.moonFullMoonCycleEarth - knownFMC).toFixed(4)} days`);

// ═══════════════════════════════════════════════════════════════════════════
// 7. INTERNAL CONSISTENCY CHECKS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 7. Internal Consistency Checks ──────────────────────────');
console.log();

// Check: synodic = 1/(1/sidereal - 1/solar_year_in_days_equivalent)
// Actually: synodic relates sidereal to the Sun's apparent motion
// 1/synodic = 1/sidereal - 1/year (where year = time for Sun to complete one orbit)
const computedSynodic = 1 / (1/C.moonSiderealMonth - 1/C.meanSolarYearDays);
console.log(`  Synodic from sidereal: 1/(1/${C.moonSiderealMonth.toFixed(6)} - 1/${C.meanSolarYearDays.toFixed(6)})`);
console.log(`    Computed: ${computedSynodic.toFixed(10)} days`);
console.log(`    Model:    ${C.moonSynodicMonth.toFixed(10)} days`);
console.log(`    Match:    ${Math.abs(computedSynodic - C.moonSynodicMonth) < 0.001 ? 'YES' : 'NO'} (diff: ${((computedSynodic - C.moonSynodicMonth) * 86400).toFixed(3)} seconds)`);
console.log();

// Check: tropical month relates to sidereal month via axial precession
// 1/tropical = 1/sidereal + precession_rate
// Precession rate = 1/(H/13 years * meanSolarYearDays)
const precRatePerDay = 13 / (C.H * C.meanSolarYearDays);
const computedTropical = 1 / (1/C.moonSiderealMonth + precRatePerDay);
console.log(`  Tropical from sidereal + precession:`);
console.log(`    Computed: ${computedTropical.toFixed(10)} days`);
console.log(`    Model:    ${C.moonTropicalMonth.toFixed(10)} days`);
console.log(`    Match:    ${Math.abs(computedTropical - C.moonTropicalMonth) < 0.001 ? 'YES' : 'NO'} (diff: ${((computedTropical - C.moonTropicalMonth) * 86400).toFixed(3)} seconds)`);
console.log();

// Check: apsidal precession period = |1 / (1/anomalistic - 1/sidereal)|
// Note: 1/anomalistic < 1/sidereal (anomalistic > sidereal), so result is negative -> take absolute value
const computedApsidal = Math.abs(1 / (1/C.moonAnomalisticMonth - 1/C.moonSiderealMonth));
console.log(`  Apsidal precession from |1/(1/anomalistic - 1/sidereal)|:`);
console.log(`    Computed: ${computedApsidal.toFixed(4)} days = ${(computedApsidal / C.meanSolarYearDays).toFixed(6)} years`);
console.log(`    Model:    ${C.moonApsidalPrecessionDaysEarth.toFixed(4)} days`);
console.log(`    Match:    ${Math.abs(computedApsidal - C.moonApsidalPrecessionDaysEarth) < 0.001 ? 'YES' : 'NO'} (diff: ${(computedApsidal - C.moonApsidalPrecessionDaysEarth).toFixed(4)} days)`);
console.log();

// Check: nodal precession period = |1 / (1/sidereal - 1/nodal)|
// Note: 1/sidereal < 1/nodal (sidereal > nodal), so result is negative -> take absolute value
const computedNodal = Math.abs(1 / (1/C.moonSiderealMonth - 1/C.moonNodalMonth));
console.log(`  Nodal precession from |1/(1/sidereal - 1/nodal)|:`);
console.log(`    Computed: ${computedNodal.toFixed(4)} days = ${(computedNodal / C.meanSolarYearDays).toFixed(6)} years`);
console.log(`    Model:    ${C.moonNodalPrecessionDaysEarth.toFixed(4)} days`);
console.log(`    Match:    ${Math.abs(computedNodal - C.moonNodalPrecessionDaysEarth) < 0.001 ? 'YES' : 'NO'} (diff: ${(computedNodal - C.moonNodalPrecessionDaysEarth).toFixed(4)} days)`);
console.log();

// Important note: Nodal precession Earth frame vs ICRF frame
console.log('  Note on nodal precession frames:');
console.log(`    Earth frame: ${(C.moonNodalPrecessionDaysEarth / C.meanSolarYearDays).toFixed(6)} yr (shorter due to Earth axial precession)`);
console.log(`    ICRF frame:  ${(C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays).toFixed(6)} yr (matches known ~18.613 yr)`);

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  MOON CYCLES VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
