// ═══════════════════════════════════════════════════════════════════════════
// ASCENDING NODE RATE OPTIMIZATION FOR VECTOR BALANCE
// ═══════════════════════════════════════════════════════════════════════════
//
// The dynamic vector balance (angular momentum perturbation cancellation)
// is dominated by Jupiter and Saturn, which carry ~85% of the system's
// angular momentum. Their ascending node precession rates determine HOW
// their angular momentum perturbation vectors rotate over time.
//
// Currently: both Jupiter and Saturn have 55 cycles per 8H.
// Question: what cycle counts would maximize vector balance stability?
//
// Usage: node tools/explore/vector-balance-asc-node-search.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;
const SUPER_PERIOD = 8 * H;

const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ═══════════════════════════════════════════════════════════════════════════
// BUILD PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════

function buildPlanetData(ascNodeOverrides) {
  const planets = {};
  for (const key of PLANET_KEYS) {
    const p = key === 'earth' ? null : C.planets[key];
    const pd = {
      mass: C.massFraction[key],
      sma: key === 'earth' ? 1.0 : C.derived[key].orbitDistance,
      ecc: C.eccJ2000[key],
      eclP: key === 'earth' ? H / 16 : p.perihelionEclipticYears,
      periLong: key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion,
      inclJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000,
      d: key === 'earth' ? 3 : p.fibonacciD,
      phaseAngle: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationPhaseAngle : p.inclinationPhaseAngle,
      antiPhase: key === 'saturn',
      omegaJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane,
      ascNodeCycles8H: ascNodeOverrides[key] !== undefined ? ascNodeOverrides[key] :
        (key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H),
    };

    pd.icrfP = key === 'earth' ? H / 3 : 1 / (1 / pd.eclP - 1 / genPrec);
    pd.icrfRate = 360 / pd.icrfP;
    pd.amp = PSI / (pd.d * Math.sqrt(pd.mass));
    pd.L = pd.mass * Math.sqrt(pd.sma * (1 - pd.ecc * pd.ecc));
    pd.ascNodeRate = -360 / (SUPER_PERIOD / pd.ascNodeCycles8H);

    const antiSign = pd.antiPhase ? -1 : 1;
    const cosJ2000 = Math.cos((pd.periLong - pd.phaseAngle) * DEG2RAD);
    pd.mean = pd.inclJ2000 - antiSign * pd.amp * cosJ2000;

    planets[key] = pd;
  }
  return planets;
}

// ═══════════════════════════════════════════════════════════════════════════
// VECTOR BALANCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function vectorBalanceAt(planets, year) {
  let sumX = 0, sumY = 0, totalMag = 0;
  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const antiSign = p.antiPhase ? -1 : 1;
    const peri = p.periLong + p.icrfRate * (year - 2000);
    const incl = p.mean + antiSign * p.amp * Math.cos((peri - p.phaseAngle) * DEG2RAD);
    const omega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
    const mag = p.L * Math.sin(incl * DEG2RAD);
    sumX += mag * Math.cos(omega);
    sumY += mag * Math.sin(omega);
    totalMag += Math.abs(mag);
  }
  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  return totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
}

function measureStability(planets, nSamples = 200) {
  const step = SUPER_PERIOD / nSamples;
  let min = 100, max = 0, sum = 0;
  for (let i = 0; i <= nSamples; i++) {
    const year = balancedYear + i * step;
    const bal = vectorBalanceAt(planets, year);
    sum += bal;
    if (bal < min) min = bal;
    if (bal > max) max = bal;
  }
  return { min, max, mean: sum / (nSamples + 1), variation: max - min };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: CURRENT STATE
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ASCENDING NODE RATE OPTIMIZATION FOR VECTOR BALANCE                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

const defaultPlanets = buildPlanetData({});
const defaultStab = measureStability(defaultPlanets, 500);

console.log('1. CURRENT ASCENDING NODE RATES');
console.log('───────────────────────────────');
console.log('');
console.log('   Planet     │ Cycles/8H │ Period (yr)   │ Rate (°/yr)    │ L (ang.mom.)');
console.log('   ───────────┼───────────┼───────────────┼────────────────┼──────────────');
for (const key of PLANET_KEYS) {
  const p = defaultPlanets[key];
  const period = SUPER_PERIOD / p.ascNodeCycles8H;
  console.log('   ' + key.charAt(0).toUpperCase() + key.slice(1).padEnd(9) + ' │ ' +
    p.ascNodeCycles8H.toString().padStart(9) + ' │ ' +
    Math.round(period).toLocaleString().padStart(13) + ' │ ' +
    p.ascNodeRate.toFixed(6).padStart(14) + ' │ ' +
    p.L.toExponential(4).padStart(12));
}
console.log('');
console.log(`   Current vector balance: min=${defaultStab.min.toFixed(4)}%, mean=${defaultStab.mean.toFixed(4)}%, var=${defaultStab.variation.toFixed(4)}`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: JUPITER + SATURN JOINT SEARCH (integer cycles)
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('2. JUPITER + SATURN ASCENDING NODE: JOINT INTEGER SEARCH');
console.log('   Scanning Ju=[1..120] × Sa=[1..120] cycles per 8H');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const results = [];

for (let juCycles = 1; juCycles <= 120; juCycles++) {
  for (let saCycles = 1; saCycles <= 120; saCycles++) {
    const planets = buildPlanetData({ jupiter: juCycles, saturn: saCycles });
    const stab = measureStability(planets, 100);
    results.push({
      juCycles, saCycles,
      min: stab.min, mean: stab.mean, variation: stab.variation,
      ratio: juCycles / saCycles,
    });
  }
}

// Sort by minimum balance (worst case)
results.sort((a, b) => b.min - a.min);

console.log('TOP 30 BY WORST-CASE VECTOR BALANCE (min over 8H):');
console.log('');
console.log('Rank │ Ju cyc │ Sa cyc │ Ratio     │ Vec min   │ Vec mean  │ Vec var   │ Ju period    │ Sa period');
console.log('─────┼────────┼────────┼───────────┼───────────┼───────────┼───────────┼──────────────┼──────────────');

for (let i = 0; i < 30; i++) {
  const r = results[i];
  const juP = Math.round(SUPER_PERIOD / r.juCycles);
  const saP = Math.round(SUPER_PERIOD / r.saCycles);
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.juCycles.toString().padStart(6) + ' │ ' +
    r.saCycles.toString().padStart(6) + ' │ ' +
    r.ratio.toFixed(4).padStart(9) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(9) + ' │ ' +
    juP.toLocaleString().padStart(12) + ' │ ' +
    saP.toLocaleString().padStart(12)
  );
}

// Also sort by variation (stability)
const byVariation = [...results].sort((a, b) => a.variation - b.variation);

console.log('');
console.log('TOP 30 BY LOWEST VARIATION (most stable over 8H):');
console.log('');
console.log('Rank │ Ju cyc │ Sa cyc │ Ratio     │ Vec min   │ Vec mean  │ Vec var   │ Ju period    │ Sa period');
console.log('─────┼────────┼────────┼───────────┼───────────┼───────────┼───────────┼──────────────┼──────────────');

for (let i = 0; i < 30; i++) {
  const r = byVariation[i];
  const juP = Math.round(SUPER_PERIOD / r.juCycles);
  const saP = Math.round(SUPER_PERIOD / r.saCycles);
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.juCycles.toString().padStart(6) + ' │ ' +
    r.saCycles.toString().padStart(6) + ' │ ' +
    r.ratio.toFixed(4).padStart(9) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(9) + ' │ ' +
    juP.toLocaleString().padStart(12) + ' │ ' +
    saP.toLocaleString().padStart(12)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: FIBONACCI CANDIDATES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('3. FIBONACCI AND NOTABLE RATIO CANDIDATES');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Test specific Fibonacci and meaningful ratios
const fibCandidates = [
  // Current
  { ju: 55, sa: 55, label: 'Current (equal)' },
  // Fibonacci numbers
  { ju: 55, sa: 34, label: 'Fib: 55/34' },
  { ju: 34, sa: 55, label: 'Fib: 34/55' },
  { ju: 55, sa: 89, label: 'Fib: 55/89' },
  { ju: 89, sa: 55, label: 'Fib: 89/55' },
  { ju: 34, sa: 21, label: 'Fib: 34/21' },
  { ju: 21, sa: 34, label: 'Fib: 21/34' },
  { ju: 34, sa: 34, label: 'Equal: 34' },
  { ju: 89, sa: 89, label: 'Equal: 89' },
  // Golden ratio approximations
  { ju: 55, sa: 34, label: 'φ ≈ 1.618' },
  { ju: 89, sa: 55, label: 'φ ≈ 1.618' },
  // Simple ratios
  { ju: 55, sa: 40, label: 'Ju55/Sa40' },
  { ju: 40, sa: 55, label: 'Ju40/Sa55' },
  { ju: 55, sa: 42, label: 'Ju55/Sa42' },
  // H-fraction related
  { ju: 40, sa: 40, label: 'Both H/5 (=Earth)' },
  { ju: 24, sa: 24, label: 'Both 8H/24' },
  { ju: 48, sa: 48, label: 'Both 8H/48' },
  { ju: 104, sa: 104, label: 'Both 8H/104' },
  // From top results - will fill in after seeing search
  { ju: 1, sa: 1, label: 'Locked (same node)' },
];

console.log('Label                    │ Ju cyc │ Sa cyc │ Ratio     │ Vec min   │ Vec mean  │ Vec var   │ Ju period    │ Sa period');
console.log('─────────────────────────┼────────┼────────┼───────────┼───────────┼───────────┼───────────┼──────────────┼──────────────');

for (const c of fibCandidates) {
  const planets = buildPlanetData({ jupiter: c.ju, saturn: c.sa });
  const stab = measureStability(planets, 200);
  const juP = Math.round(SUPER_PERIOD / c.ju);
  const saP = Math.round(SUPER_PERIOD / c.sa);
  console.log(
    c.label.padEnd(24) + ' │ ' +
    c.ju.toString().padStart(6) + ' │ ' +
    c.sa.toString().padStart(6) + ' │ ' +
    (c.ju / c.sa).toFixed(4).padStart(9) + ' │ ' +
    stab.min.toFixed(4).padStart(9) + ' │ ' +
    stab.mean.toFixed(4).padStart(9) + ' │ ' +
    stab.variation.toFixed(4).padStart(9) + ' │ ' +
    juP.toLocaleString().padStart(12) + ' │ ' +
    saP.toLocaleString().padStart(12)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: FINE-GRAINED SEARCH AROUND BEST CANDIDATES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('4. FINE-GRAINED SEARCH: NON-INTEGER CYCLES (FRACTIONAL)');
console.log('   Around the top integer result, scan ±5 with 0.1 step');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Take the top integer result
const bestInt = results[0];
console.log(`Best integer: Ju=${bestInt.juCycles}, Sa=${bestInt.saCycles} → min=${bestInt.min.toFixed(4)}%`);
console.log('');

const fineResults = [];
for (let ju = bestInt.juCycles - 5; ju <= bestInt.juCycles + 5; ju += 0.5) {
  if (ju <= 0) continue;
  for (let sa = bestInt.saCycles - 5; sa <= bestInt.saCycles + 5; sa += 0.5) {
    if (sa <= 0) continue;
    const planets = buildPlanetData({ jupiter: ju, saturn: sa });
    const stab = measureStability(planets, 100);
    fineResults.push({ ju, sa, min: stab.min, mean: stab.mean, variation: stab.variation });
  }
}

fineResults.sort((a, b) => b.min - a.min);

console.log('TOP 15 FINE-GRAINED BY MIN BALANCE:');
console.log('');
console.log('Rank │ Ju cyc   │ Sa cyc   │ Ratio     │ Vec min   │ Vec mean  │ Vec var');
console.log('─────┼──────────┼──────────┼───────────┼───────────┼───────────┼─────────');

for (let i = 0; i < 15; i++) {
  const r = fineResults[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.ju.toFixed(1).padStart(8) + ' │ ' +
    r.sa.toFixed(1).padStart(8) + ' │ ' +
    (r.ju / r.sa).toFixed(4).padStart(9) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: ALL 8 PLANETS JOINT OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('5. WHAT IF ALL 8 ASCENDING NODES SHARE THE SAME RATE?');
console.log('   Testing: all planets have the same cycles/8H');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Cycles/8H │ Period (yr)   │ Vec min   │ Vec mean  │ Vec var   │ Notes');
console.log('──────────┼───────────────┼───────────┼───────────┼───────────┼─────────────────');

for (const n of [1, 2, 3, 5, 8, 13, 21, 24, 34, 39, 40, 48, 55, 89, 104]) {
  const overrides = {};
  for (const key of PLANET_KEYS) overrides[key] = n;
  const planets = buildPlanetData(overrides);
  const stab = measureStability(planets, 200);
  const period = Math.round(SUPER_PERIOD / n);
  let note = '';
  if (n === 55) note = '← current Ju+Sa';
  if (n === 40) note = '← current Earth';
  if (n === 13) note = '← H/13 (axial prec)';
  if (n === 8) note = '← H/8 (obliquity)';
  if (n === 3) note = '← H/3 (incl prec)';
  if (n === 5) note = '← H/5 (ecliptic)';
  if (n === 24) note = '← H/24';
  if (n === 39) note = '← near H/3 × 8';
  if (n === 104) note = '← 8 × 13';
  console.log(
    n.toString().padStart(9) + ' │ ' +
    period.toLocaleString().padStart(13) + ' │ ' +
    stab.min.toFixed(4).padStart(9) + ' │ ' +
    stab.mean.toFixed(4).padStart(9) + ' │ ' +
    stab.variation.toFixed(4).padStart(9) + ' │ ' +
    note
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: WHAT IF Ju = Sa (EQUAL RATE, SCANNING VALUES)
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('6. JUPITER = SATURN EQUAL RATE SCAN');
console.log('   Other planets keep their default rates');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Cycles/8H │ Period (yr)   │ Vec min   │ Vec mean  │ Vec var');
console.log('──────────┼───────────────┼───────────┼───────────┼─────────');

const equalResults = [];
for (let n = 1; n <= 120; n++) {
  const planets = buildPlanetData({ jupiter: n, saturn: n });
  const stab = measureStability(planets, 100);
  equalResults.push({ n, min: stab.min, mean: stab.mean, variation: stab.variation });
}

equalResults.sort((a, b) => b.min - a.min);
for (let i = 0; i < 20; i++) {
  const r = equalResults[i];
  const period = Math.round(SUPER_PERIOD / r.n);
  console.log(
    r.n.toString().padStart(9) + ' │ ' +
    period.toLocaleString().padStart(13) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: COMPARISON WITH OBSERVED SECULAR RATES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('7. OBSERVED SECULAR NODE RATES (La2010 / Souami & Souchay 2012)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Observed ascending node regression rates (arcsec/yr, from La2010/SS2012)
// Converted to cycles per 8H
const observedRates = {
  mercury: -6.592,  // arcsec/yr
  venus: -7.902,
  earth: -18.851,
  mars: -17.635,
  jupiter: -25.934,
  saturn: -26.578,
  uranus: -3.087,
  neptune: -0.673,
};

console.log('   Planet     │ Observed (″/yr) │ Obs cycles/8H │ Model cycles/8H │ Obs period (yr)');
console.log('   ───────────┼─────────────────┼───────────────┼─────────────────┼────────────────');

const obsOverrides = {};
for (const key of PLANET_KEYS) {
  const rate = observedRates[key];  // arcsec/yr
  const degPerYear = rate / 3600;
  const period = 360 / Math.abs(degPerYear);
  const cyclesPer8H = SUPER_PERIOD / period;
  const modelCycles = defaultPlanets[key].ascNodeCycles8H;
  obsOverrides[key] = cyclesPer8H;
  console.log('   ' + key.charAt(0).toUpperCase() + key.slice(1).padEnd(9) + ' │ ' +
    rate.toFixed(3).padStart(15) + ' │ ' +
    cyclesPer8H.toFixed(2).padStart(13) + ' │ ' +
    modelCycles.toString().padStart(15) + ' │ ' +
    Math.round(period).toLocaleString().padStart(14));
}

// Test with observed rates
const obsPlanets = buildPlanetData(obsOverrides);
const obsStab = measureStability(obsPlanets, 500);
console.log('');
console.log(`   With OBSERVED secular rates: min=${obsStab.min.toFixed(4)}%, mean=${obsStab.mean.toFixed(4)}%, var=${obsStab.variation.toFixed(4)}`);
console.log(`   With MODEL rates (8H-fitted): min=${defaultStab.min.toFixed(4)}%, mean=${defaultStab.mean.toFixed(4)}%, var=${defaultStab.variation.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The vector balance stability depends critically on the Jupiter/Saturn');
console.log('ascending node rates. Compare the best found integer solution vs current');
console.log('vs observed secular rates to determine the optimal configuration.');
console.log('');
