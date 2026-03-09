#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// ORBIT COUNTS — Verify SolarYearCount, Kepler's 3rd law, Fibonacci ratios,
//                and sensitivity to SolarYearInput changes
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ORBIT COUNTS — Fibonacci Orbital Structure Verification');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log(`  H = ${C.fmtInt(C.H)} solar years`);
console.log(`  Mean solar year = ${C.meanSolarYearDays.toFixed(10)} days`);
console.log(`  Total days in H = ${C.totalDaysInH.toFixed(2)} days`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 1. ORBIT COUNTS AND KEPLER'S 3RD LAW
// ═══════════════════════════════════════════════════════════════════════════
console.log('─── 1. Orbit Counts and Kepler\'s 3rd Law ────────────────────');
console.log();

const header = ['Planet', 'Type', 'YearInput(d)', 'SolarYearCount', 'Period(yr)', 'a(AU)', 'Known a(AU)', 'a err%'];
const rows = [];

// Known semi-major axes (AU) from JPL
const knownA = {
  mercury: 0.38710, venus: 0.72333, mars: 1.52368, jupiter: 5.20288,
  saturn: 9.53667, uranus: 19.1891, neptune: 30.0699,
};

// Known orbital periods (days) from JPL
const knownPeriodDays = {
  mercury: 87.969, venus: 224.701, mars: 686.980, jupiter: 4332.59,
  saturn: 10759.22, uranus: 30688.5, neptune: 60182.0,
};

for (const [key, p] of Object.entries(C.planets)) {
  const d = C.derived[key];
  const ka = knownA[key];
  const err = ka ? ((d.orbitDistance - ka) / ka * 100).toFixed(4) : 'N/A';
  rows.push([
    C.pad(p.name, 8),
    p.type,
    C.padLeft(p.solarYearInput.toFixed(3), 12),
    C.padLeft(C.fmtInt(d.solarYearCount), 14),
    C.padLeft(d.period.toFixed(8), 14),
    C.padLeft(d.orbitDistance.toFixed(6), 10),
    C.padLeft(ka ? ka.toFixed(5) : 'N/A', 11),
    C.padLeft(err, 8),
  ]);
}

C.printTable(header, rows, [8, 4, 12, 14, 14, 10, 11, 8]);

console.log();
console.log('Additional bodies:');
const addRows = [];
for (const [key, b] of Object.entries(C.additionalBodies)) {
  const d = C.additionalDerived[key];
  addRows.push([
    C.pad(b.name, 10),
    C.padLeft(b.solarYearInput.toFixed(2), 12),
    C.padLeft(C.fmtInt(d.solarYearCount), 14),
    C.padLeft(d.period.toFixed(6), 14),
    C.padLeft(d.orbitDistance.toFixed(6), 10),
  ]);
}
C.printTable(['Body', 'YearInput(d)', 'SolarYearCount', 'Period(yr)', 'a(AU)'],
             addRows, [10, 12, 14, 14, 10]);

// ═══════════════════════════════════════════════════════════════════════════
// 2. FIBONACCI RELATIONSHIPS BETWEEN ORBIT COUNTS
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 2. Fibonacci Relationships Between Orbit Counts ─────────');
console.log();

// Orbit count differences and ratios for mirror pairs
const mirrorPairs = [
  ['mars', 'jupiter', 5],
  ['mercury', 'uranus', 21],
  ['venus', 'neptune', 34],
];

console.log('Mirror pairs (inner-outer, shared Fibonacci divisor d):');
console.log();
for (const [inner, outer, d] of mirrorPairs) {
  const ci = C.derived[inner].solarYearCount;
  const co = C.derived[outer].solarYearCount;
  const diff = ci - co;
  const ratio = ci / co;
  console.log(`  ${C.planets[inner].name} / ${C.planets[outer].name} (d=${d}):`);
  console.log(`    Orbit counts: ${C.fmtInt(ci)} / ${C.fmtInt(co)}`);
  console.log(`    Difference:   ${C.fmtInt(diff)}`);
  console.log(`    Ratio:        ${ratio.toFixed(6)}`);
  console.log();
}

// Earth-Saturn pair (d=3, opposite phase groups)
const earthCount = C.H; // Earth makes exactly H orbits in H years (1 orbit/year)
const saturnCount = C.derived.saturn.solarYearCount;
console.log(`  Earth / Saturn (d=3, opposite phase groups):`);
console.log(`    Orbit counts: ${C.fmtInt(earthCount)} / ${C.fmtInt(saturnCount)}`);
console.log(`    Difference:   ${C.fmtInt(earthCount - saturnCount)}`);
console.log(`    Ratio:        ${(earthCount / saturnCount).toFixed(6)}`);
console.log();

// Check orbit count ratios between adjacent planets
console.log('Adjacent planet orbit count ratios:');
const planetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
for (let i = 0; i < planetKeys.length - 1; i++) {
  const a = planetKeys[i], b = planetKeys[i + 1];
  const ca = C.derived[a].solarYearCount;
  const cb = C.derived[b].solarYearCount;
  console.log(`  ${C.pad(C.planets[a].name + '/' + C.planets[b].name, 20)} = ${C.fmtInt(ca)} / ${C.fmtInt(cb)} = ${(ca / cb).toFixed(6)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SENSITIVITY ANALYSIS — ROUNDING BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 3. Sensitivity Analysis — Rounding Boundaries ───────────');
console.log();
console.log('How much must SolarYearInput change to shift SolarYearCount by +/-1?');
console.log();

const sensHeader = ['Planet', 'Count', 'Input(d)', 'To count-1(d)', 'To count+1(d)', 'Margin-(d)', 'Margin+(d)'];
const sensRows = [];

for (const [key, p] of Object.entries(C.planets)) {
  const d = C.derived[key];
  const count = d.solarYearCount;
  // SolarYearCount = round(totalDaysInH / input)
  // Boundary at count + 0.5: input = totalDaysInH / (count + 0.5)
  // Boundary at count - 0.5: input = totalDaysInH / (count - 0.5)
  const inputForCountMinus1 = C.totalDaysInH / (count - 0.5); // input must exceed this to get count-1
  const inputForCountPlus1 = C.totalDaysInH / (count + 0.5);  // input must go below this to get count+1
  const marginMinus = inputForCountMinus1 - p.solarYearInput; // positive = how much input can increase
  const marginPlus = p.solarYearInput - inputForCountPlus1;    // positive = how much input can decrease

  sensRows.push([
    C.pad(p.name, 8),
    C.padLeft(C.fmtInt(count), 10),
    C.padLeft(p.solarYearInput.toFixed(3), 12),
    C.padLeft(inputForCountMinus1.toFixed(6), 13),
    C.padLeft(inputForCountPlus1.toFixed(6), 13),
    C.padLeft(marginMinus.toFixed(6), 11),
    C.padLeft(marginPlus.toFixed(6), 11),
  ]);
}

C.printTable(sensHeader, sensRows, [8, 10, 12, 13, 13, 11, 11]);

console.log();
console.log('Margin- = how much input can INCREASE before count drops by 1');
console.log('Margin+ = how much input can DECREASE before count rises by 1');
console.log('Smaller margins = more fragile (near rounding boundary)');

// ═══════════════════════════════════════════════════════════════════════════
// 4. PERIOD COMPARISON — MODEL VS KNOWN (JPL)
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 4. Period Comparison — Model vs Known (JPL) ─────────────');
console.log();

const perHeader = ['Planet', 'Model T(d)', 'Known T(d)', 'Diff(d)', 'Diff(ppm)'];
const perRows = [];

for (const [key, p] of Object.entries(C.planets)) {
  const d = C.derived[key];
  const modelDays = d.period * C.meanSolarYearDays;
  const known = knownPeriodDays[key];
  if (known) {
    const diff = modelDays - known;
    const ppm = (diff / known) * 1e6;
    perRows.push([
      C.pad(p.name, 8),
      C.padLeft(modelDays.toFixed(4), 12),
      C.padLeft(known.toFixed(3), 12),
      C.padLeft(diff.toFixed(4), 10),
      C.padLeft(ppm.toFixed(1), 10),
    ]);
  }
}

C.printTable(perHeader, perRows, [8, 12, 12, 10, 10]);
console.log();
console.log('ppm = parts per million difference');

// ═══════════════════════════════════════════════════════════════════════════
// 5. KEPLER'S 3RD LAW VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
console.log();
console.log('─── 5. Kepler\'s 3rd Law Verification ────────────────────────');
console.log();
console.log('a^3 / T^2 should be constant (= 1 in AU/year units):');
console.log();

for (const [key, p] of Object.entries(C.planets)) {
  const d = C.derived[key];
  const k3 = (d.orbitDistance ** 3) / (d.period ** 2);
  console.log(`  ${C.pad(p.name, 8)}: a³/T² = ${k3.toFixed(10)}  (deviation from 1: ${((k3 - 1) * 1e12).toFixed(2)} × 10⁻¹²)`);
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ORBIT COUNTS VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
