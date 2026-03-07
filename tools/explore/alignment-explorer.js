#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ALIGNMENT EXPLORER — When do planets align? Conjunction dates, angular
//                      patterns, and the trigon cycle
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ALIGNMENT EXPLORER — Conjunction Dates and Patterns');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 1. JUPITER-SATURN GREAT CONJUNCTIONS — DATE PREDICTIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 1. Jupiter-Saturn Great Conjunctions — Date Predictions ──');
console.log();

// Model epoch: JD 2451716.5 = 2000-06-21
// At this date, Jupiter is at startpos 13.76° and Saturn at 11.397°
// Angular positions at time t (years from epoch):
//   theta_J(t) = startpos_J + 360 * t / T_J  (degrees)
//   theta_S(t) = startpos_S + 360 * t / T_S
// Conjunction when theta_J(t) = theta_S(t) + 360*n for some integer n

const jPeriod = C.derived.jupiter.period;
const sPeriod = C.derived.saturn.period;
const jStart = C.planets.jupiter.startpos;
const sStart = C.planets.saturn.startpos;

// Synodic period
const synodicYears = 1 / (1/jPeriod - 1/sPeriod);

// Angular rates (degrees per year)
const jRate = 360 / jPeriod;
const sRate = 360 / sPeriod;
const relativeRate = jRate - sRate; // degrees per year of Jupiter relative to Saturn

// At epoch, angular separation = jStart - sStart (in model coordinates)
const epochSep = jStart - sStart; // degrees

// Time to first conjunction after epoch: solve relativeRate * t + epochSep = 360*n
// For the NEXT conjunction: t = (360*n - epochSep) / relativeRate, find smallest positive t
const tFirst = ((360 - (epochSep % 360)) % 360) / relativeRate;

console.log('  Model parameters:');
console.log(`    Jupiter: period = ${jPeriod.toFixed(6)} yr, startpos = ${jStart}°, rate = ${jRate.toFixed(6)}°/yr`);
console.log(`    Saturn:  period = ${sPeriod.toFixed(6)} yr, startpos = ${sStart}°, rate = ${sRate.toFixed(6)}°/yr`);
console.log(`    Synodic period: ${synodicYears.toFixed(6)} yr = ${(synodicYears * C.meanSolarYearDays).toFixed(2)} days`);
console.log(`    Relative rate: ${relativeRate.toFixed(6)}°/yr`);
console.log(`    Epoch separation: ${epochSep.toFixed(3)}°`);
console.log();

// Known great conjunction dates (historical and future)
const knownGCs = [
  { year: 1961.95, label: 'Feb 1961' },
  { year: 1981.37, label: 'Jan 1981' },
  { year: 2000.96, label: 'May-Dec 2000' },
  { year: 2020.96, label: 'Dec 2020' },
  { year: 2040.83, label: 'Oct 2040' },
  { year: 2060.30, label: 'Apr 2060' },
  { year: 2080.23, label: 'Mar 2080' },
];

// Generate conjunction dates from model
console.log('  Predicted great conjunctions (model vs known):');
console.log();
console.log(`  ${'#'.padStart(4)} | ${'Model year'.padEnd(12)} | ${'Longitude'.padEnd(10)} | ${'Known'.padEnd(15)} | ${'Diff (yr)'.padEnd(10)}`);
console.log(`  ${'-'.repeat(4)}-+-${'-'.repeat(12)}-+-${'-'.repeat(10)}-+-${'-'.repeat(15)}-+-${'-'.repeat(10)}`);

// Reference: epoch is year 2000.5 (June 21, 2000)
const epochYear = 2000.5;
let knownIdx = 0;

for (let n = -3; n <= 7; n++) {
  const t = tFirst + n * synodicYears;
  const year = epochYear + t;
  const longitude = (sStart + sRate * t) % 360;
  const normLon = longitude < 0 ? longitude + 360 : longitude;

  // Find closest known GC
  let closest = null;
  let closestDiff = Infinity;
  for (const gc of knownGCs) {
    const diff = Math.abs(year - gc.year);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = gc;
    }
  }

  const matchStr = closest && closestDiff < 2 ? `${closest.label}` : '';
  const diffStr = closest && closestDiff < 2 ? (year - closest.year).toFixed(3) : '';

  if (year > 1900 && year < 2150) {
    console.log(`  ${String(n).padStart(4)} | ${year.toFixed(3).padEnd(12)} | ${normLon.toFixed(2).padStart(7)}°  | ${matchStr.padEnd(15)} | ${diffStr.padEnd(10)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TRIGON PATTERN — 60-YEAR CYCLE
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 2. Trigon Pattern — Angular Distribution ─────────────────');
console.log();

// Conjunction longitude advances by a fixed amount each time
const conjAdvance = (sRate * synodicYears) % 360;
const normalizedAdvance = conjAdvance > 180 ? conjAdvance - 360 : conjAdvance;
console.log(`  Longitude advance per conjunction: ${normalizedAdvance.toFixed(4)}°`);
console.log(`  Close to 360°/3 = 120°? Difference: ${(Math.abs(normalizedAdvance) - 120).toFixed(4)}°`);
console.log();

// How many conjunctions to complete a full 360° rotation?
const conjPerFullRotation = 360 / Math.abs(normalizedAdvance);
const fullRotationYears = conjPerFullRotation * synodicYears;
console.log(`  Conjunctions per full rotation: ${conjPerFullRotation.toFixed(3)}`);
console.log(`  Full rotation period: ${fullRotationYears.toFixed(2)} years`);
console.log();

// Show 20 consecutive conjunction longitudes to visualize the pattern
console.log('  First 20 conjunction longitudes (from epoch):');
console.log();
for (let n = 0; n < 20; n++) {
  const t = tFirst + n * synodicYears;
  const year = epochYear + t;
  const lon = ((sStart + sRate * t) % 360 + 360) % 360;
  const bar = '|' + '#'.repeat(Math.round(lon / 6)) + ' '.repeat(60 - Math.round(lon / 6)) + '|';
  console.log(`    ${String(n + 1).padStart(3)}.  ${year.toFixed(1)}  ${lon.toFixed(1).padStart(6)}°  ${bar}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EARTH-MARS OPPOSITIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 3. Earth-Mars Oppositions ────────────────────────────────');
console.log();

const mPeriod = C.derived.mars.period;
const mStart = C.planets.mars.startpos;
const emSynodicYears = 1 / (1 - 1/mPeriod); // Earth-Mars synodic

const eRate = 360; // Earth: 360°/year
const mRate = 360 / mPeriod;
const emRelRate = eRate - mRate;
const emEpochSep = 0 - mStart; // Earth at 0 (startAngleModel ~ 90, but relative)
const emTFirst = ((360 - ((- mStart) % 360 + 360) % 360) % 360) / emRelRate;

console.log(`  Earth-Mars synodic period: ${emSynodicYears.toFixed(6)} yr = ${(emSynodicYears * C.meanSolarYearDays).toFixed(2)} days`);
console.log(`  Known: 779.94 days. Diff: ${(emSynodicYears * C.meanSolarYearDays - 779.94).toFixed(3)} days`);
console.log();

// Known Mars oppositions
const knownMarsOpp = [
  { year: 2001.50, label: 'Jun 2001' },
  { year: 2003.64, label: 'Aug 2003' },
  { year: 2005.84, label: 'Nov 2005' },
  { year: 2007.97, label: 'Dec 2007' },
  { year: 2010.07, label: 'Jan 2010' },
  { year: 2012.18, label: 'Mar 2012' },
  { year: 2014.28, label: 'Apr 2014' },
  { year: 2016.37, label: 'May 2016' },
  { year: 2018.55, label: 'Jul 2018' },
  { year: 2020.79, label: 'Oct 2020' },
];

console.log('  Predicted Earth-Mars oppositions (nearest epoch):');
console.log();
for (let n = -1; n <= 12; n++) {
  const t = emTFirst + n * emSynodicYears;
  const year = epochYear + t;
  if (year < 1999 || year > 2025) continue;

  let closest = null;
  let closestDiff = Infinity;
  for (const opp of knownMarsOpp) {
    const diff = Math.abs(year - opp.year);
    if (diff < closestDiff) { closestDiff = diff; closest = opp; }
  }

  const matchStr = closest && closestDiff < 1 ? closest.label : '';
  const diffStr = closest && closestDiff < 1 ? (year - closest.year).toFixed(3) : '';
  console.log(`    ${year.toFixed(3)}  ${matchStr.padEnd(12)}  diff: ${diffStr} yr`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. TOTAL CONJUNCTION COUNTS — FIBONACCI SIGNIFICANCE
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 4. Total Conjunction Counts — Fibonacci Significance ─────');
console.log();

const pairs = [
  ['jupiter', 'saturn'],
  ['mars', 'jupiter'],
  ['mercury', 'uranus'],
  ['venus', 'neptune'],
];

for (const [a, b] of pairs) {
  const ca = C.derived[a].solarYearCount;
  const cb = C.derived[b].solarYearCount;
  const diff = ca - cb;
  const d = C.planets[a].fibonacciD;

  // Check divisibility by Fibonacci numbers
  const divisors = [];
  for (const f of C.fibonacci) {
    if (f > 1 && diff % f === 0) divisors.push(f);
  }

  console.log(`  ${C.planets[a].name}-${C.planets[b].name}: ${C.fmtInt(diff)} conjunctions in H years`);
  if (divisors.length > 0) {
    console.log(`    Divisible by Fibonacci: ${divisors.join(', ')}`);
  }
  console.log(`    Per year: ${(diff / C.H).toFixed(6)} (period: ${(C.H / diff).toFixed(4)} yr)`);
  console.log();
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ALIGNMENT EXPLORER COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
