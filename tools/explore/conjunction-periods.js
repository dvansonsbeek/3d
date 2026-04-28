#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// CONJUNCTION PERIODS — Calculate synodic periods from orbit count ratios,
//                       focus on Jupiter-Saturn great conjunctions
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CONJUNCTION PERIODS — Synodic Period Verification');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 1. SYNODIC PERIODS FOR ALL PLANET PAIRS
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 1. Synodic Periods — All Adjacent Planet Pairs ──────────');
console.log();

// Synodic period: T_syn = 1 / |1/T_a - 1/T_b|
// With orbit counts: T_syn = H / |count_a - count_b|
// (because T = H/count, so 1/T = count/H, and |1/T_a - 1/T_b| = |count_a - count_b|/H)

const planetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const earthCount = C.H; // Earth: 1 orbit/year, so count = H

// Known synodic periods (days, from JPL)
const knownSynodic = {
  'mercury-earth': 115.88,
  'venus-earth': 583.92,
  'earth-mars': 779.94,
  'earth-jupiter': 398.88,
  'earth-saturn': 378.09,
  'jupiter-saturn': 7253.5, // ~19.859 years
};

// Adjacent pairs including Earth
const adjacentPairs = [
  ['mercury', 'venus'],
  ['venus', 'earth'],
  ['earth', 'mars'],
  ['mars', 'jupiter'],
  ['earth', 'jupiter'],
  ['earth', 'saturn'],
  ['jupiter', 'saturn'],
  ['saturn', 'uranus'],
  ['uranus', 'neptune'],
];

function getCount(name) {
  if (name === 'earth') return earthCount;
  return C.derived[name].solarYearCount;
}

function getPeriod(name) {
  if (name === 'earth') return 1.0;
  return C.derived[name].period;
}

const synHeader = ['Pair', 'Count diff', 'Synodic(yr)', 'Synodic(d)', 'Known(d)', 'Diff(d)'];
const synRows = [];

for (const [a, b] of adjacentPairs) {
  const ca = getCount(a);
  const cb = getCount(b);
  const diff = Math.abs(ca - cb);
  const synodicYears = C.H / diff;
  const synodicDays = synodicYears * C.meanSolarYearDays;
  const pairKey = `${a}-${b}`;
  const known = knownSynodic[pairKey];
  const diffDays = known ? (synodicDays - known).toFixed(3) : 'N/A';

  const nameA = a === 'earth' ? 'Earth' : C.planets[a].name;
  const nameB = b === 'earth' ? 'Earth' : C.planets[b].name;

  synRows.push([
    C.pad(`${nameA}-${nameB}`, 18),
    C.padLeft(C.fmtInt(diff), 10),
    C.padLeft(synodicYears.toFixed(6), 12),
    C.padLeft(synodicDays.toFixed(3), 12),
    C.padLeft(known ? known.toFixed(2) : 'N/A', 10),
    C.padLeft(diffDays, 10),
  ]);
}

C.printTable(synHeader, synRows, [18, 10, 12, 12, 10, 10]);

// ═══════════════════════════════════════════════════════════════════════════
// 2. JUPITER-SATURN GREAT CONJUNCTION — DEEP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 2. Jupiter-Saturn Great Conjunction — Deep Analysis ──────');
console.log();

const jCount = C.derived.jupiter.solarYearCount;
const sCount = C.derived.saturn.solarYearCount;
const gcCountDiff = jCount - sCount;
const gcPeriodYears = C.H / gcCountDiff;
const gcPeriodDays = gcPeriodYears * C.meanSolarYearDays;

console.log(`  Jupiter orbit count:  ${C.fmtInt(jCount)}`);
console.log(`  Saturn orbit count:   ${C.fmtInt(sCount)}`);
console.log(`  Difference:           ${C.fmtInt(gcCountDiff)}`);
console.log(`  Great conj. in H yr:  ${C.fmtInt(gcCountDiff)}`);
console.log();
console.log(`  Great conjunction period:`);
console.log(`    Model:  ${gcPeriodYears.toFixed(6)} years = ${gcPeriodDays.toFixed(3)} days`);
console.log(`    Known:  ~19.859 years = ~7253.5 days`);
console.log(`    Diff:   ${(gcPeriodYears - 19.859).toFixed(6)} years = ${(gcPeriodDays - 7253.5).toFixed(3)} days`);
console.log();

// Check: is the great conjunction count a Fibonacci-related number?
console.log(`  Is ${C.fmtInt(gcCountDiff)} connected to Fibonacci?`);
console.log(`    ${gcCountDiff} / 5 = ${gcCountDiff / 5}`);
console.log(`    ${gcCountDiff} / 8 = ${gcCountDiff / 8}`);
console.log(`    ${gcCountDiff} / 13 = ${gcCountDiff / 13}`);
console.log(`    ${gcCountDiff} / 21 = ${gcCountDiff / 21}`);

// Trigon pattern: conjunctions advance by ~117° each time (360° / 3 ≈ 120°)
// After 3 conjunctions ≈ 60 years, they return near the starting longitude
const advanceDeg = 360 * (1 - gcPeriodYears * sCount / C.H); // angular advance per conjunction
// Actually: in gcPeriodYears, Jupiter moves gcPeriodYears * jCount/H orbits
// = gcPeriodYears * (jCount/H) full orbits. Fractional part * 360 = conjunction longitude advance
// But simpler: Jupiter makes exactly 1 more orbit than Saturn per conjunction period
// Jupiter's position advances by: (jCount/H) * gcPeriodYears * 360 mod 360
// Saturn's position advances by: (sCount/H) * gcPeriodYears * 360 mod 360
// They're at the same position, so the conjunction longitude is:
// Saturn position = (sCount * gcPeriodYears / H) * 360
const saturnOrbitsPerGC = sCount * gcPeriodYears / C.H;
const jupiterOrbitsPerGC = jCount * gcPeriodYears / C.H;
const conjAdvanceDeg = (saturnOrbitsPerGC - Math.floor(saturnOrbitsPerGC)) * 360;

console.log();
console.log(`  Trigon pattern:`);
console.log(`    Saturn orbits per great conj: ${saturnOrbitsPerGC.toFixed(6)} (fractional: ${(saturnOrbitsPerGC % 1).toFixed(6)})`);
console.log(`    Jupiter orbits per great conj: ${jupiterOrbitsPerGC.toFixed(6)} (should be Saturn + 1)`);
console.log(`    Conjunction advances by: ${conjAdvanceDeg.toFixed(3)}° per great conjunction`);
console.log(`    Three conjunctions span: ${(conjAdvanceDeg * 3 % 360).toFixed(3)}°`);
console.log(`    Full trigon cycle: ${(360 / conjAdvanceDeg).toFixed(3)} conjunctions = ${(360 / conjAdvanceDeg * gcPeriodYears).toFixed(2)} years`);

// ═══════════════════════════════════════════════════════════════════════════
// 3. MIRROR PAIR SYNODIC PERIODS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 3. Mirror Pair Synodic Periods ──────────────────────────');
console.log();

const mirrorPairs = [
  ['mars', 'jupiter', 5],
  ['mercury', 'uranus', 21],
  ['venus', 'neptune', 34],
];

for (const [inner, outer, d] of mirrorPairs) {
  const ci = C.derived[inner].solarYearCount;
  const co = C.derived[outer].solarYearCount;
  const diff = ci - co;
  const synodicYears = C.H / diff;
  const synodicDays = synodicYears * C.meanSolarYearDays;
  console.log(`  ${C.planets[inner].name}-${C.planets[outer].name} (d=${d}):`);
  console.log(`    Count diff: ${C.fmtInt(diff)}`);
  console.log(`    Synodic period: ${synodicYears.toFixed(6)} years = ${synodicDays.toFixed(3)} days`);
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. EARTH-PLANET SYNODIC PERIODS (OBSERVABLE CONJUNCTIONS)
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 4. Earth-Planet Synodic Periods (observable from Earth) ──');
console.log();

const knownEarthSynodic = {
  mercury: { days: 115.88, label: 'inferior conjunction' },
  venus: { days: 583.92, label: 'inferior conjunction' },
  mars: { days: 779.94, label: 'opposition' },
  jupiter: { days: 398.88, label: 'opposition' },
  saturn: { days: 378.09, label: 'opposition' },
  uranus: { days: 369.66, label: 'opposition' },
  neptune: { days: 367.49, label: 'opposition' },
};

for (const key of planetKeys) {
  const pCount = C.derived[key].solarYearCount;
  const diff = Math.abs(pCount - earthCount);
  const synodicYears = C.H / diff;
  const synodicDays = synodicYears * C.meanSolarYearDays;
  const known = knownEarthSynodic[key];
  const errDays = known ? (synodicDays - known.days).toFixed(3) : 'N/A';
  const errPct = known ? ((synodicDays - known.days) / known.days * 100).toFixed(4) : 'N/A';

  console.log(`  Earth-${C.pad(C.planets[key].name, 8)}: ${C.padLeft(synodicDays.toFixed(3), 10)} days (${synodicYears.toFixed(6)} yr)  known: ${known ? known.days.toFixed(2) : 'N/A'} d  diff: ${errDays} d (${errPct}%)  [${known ? known.label : ''}]`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. CONJUNCTION COUNT RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 5. Conjunction Counts in H Years ────────────────────────');
console.log();
console.log('Number of conjunctions (= orbit count difference) in one Earth Fundamental Cycle:');
console.log();

for (let i = 0; i < planetKeys.length; i++) {
  for (let j = i + 1; j < planetKeys.length; j++) {
    const a = planetKeys[i], b = planetKeys[j];
    const ca = C.derived[a].solarYearCount;
    const cb = C.derived[b].solarYearCount;
    const diff = ca - cb;
    console.log(`  ${C.pad(C.planets[a].name + '-' + C.planets[b].name, 20)}: ${C.padLeft(C.fmtInt(diff), 12)} conjunctions`);
  }
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CONJUNCTION PERIODS VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
