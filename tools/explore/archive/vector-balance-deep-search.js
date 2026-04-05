// ═══════════════════════════════════════════════════════════════════════════
// DEEP VECTOR BALANCE EXPLORATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Previous finding: when all 8 planets share the same ascending node rate,
// the vector balance reaches ~92% min with only 7.4% variation — regardless
// of the actual rate chosen. This means the geometry is "frozen" in a
// co-rotating frame, and the ~8% residual comes from the fixed J2000
// ascending node positions (Ω_J2000) and inclination magnitudes.
//
// This script explores:
//   1. WHY 92% is the ceiling — decompose the residual
//   2. Does group assignment matter in the locked-node scenario?
//   3. Can per-planet rate perturbations close the gap?
//   4. Can optimizing Ω_J2000 (within observational bounds) help?
//   5. Does the ICRF perihelion rate interplay matter?
//
// Usage: node tools/explore/vector-balance-deep-search.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const genPrec = H / 13;
const SUPER_PERIOD = 8 * H;

const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildPlanetData(opts = {}) {
  const ascOverrides = opts.ascRates || {};
  const omegaOverrides = opts.omegaJ2000 || {};
  const dOverrides = opts.dValues || {};
  const groupOverrides = opts.groups || {};
  const phaseOverrides = opts.phases || {};

  const planets = {};
  for (const key of PLANET_KEYS) {
    const p = key === 'earth' ? null : C.planets[key];
    const pd = {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      mass: C.massFraction[key],
      sma: key === 'earth' ? 1.0 : C.derived[key].orbitDistance,
      ecc: C.eccJ2000[key],
      eclP: key === 'earth' ? H / 16 : p.perihelionEclipticYears,
      periLong: key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion,
      inclJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000,
      d: dOverrides[key] || (key === 'earth' ? 3 : p.fibonacciD),
      antiPhase: groupOverrides[key] !== undefined ? groupOverrides[key] : (key === 'saturn'),
      omegaJ2000: omegaOverrides[key] !== undefined ? omegaOverrides[key] :
        (key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane),
    };

    const defaultCycles = key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H;
    const cycles = ascOverrides[key] !== undefined ? ascOverrides[key] : defaultCycles;

    pd.icrfP = key === 'earth' ? H / 3 : 1 / (1 / pd.eclP - 1 / genPrec);
    pd.icrfRate = 360 / pd.icrfP;
    pd.amp = PSI / (pd.d * Math.sqrt(pd.mass));
    pd.L = pd.mass * Math.sqrt(pd.sma * (1 - pd.ecc * pd.ecc));
    pd.ascNodeRate = -360 * cycles / SUPER_PERIOD;

    // Phase angle
    if (phaseOverrides[key] !== undefined) {
      pd.phaseAngle = phaseOverrides[key];
    } else {
      pd.phaseAngle = key === 'earth'
        ? C.ASTRO_REFERENCE.earthInclinationPhaseAngle
        : p.inclinationPhaseAngle;
    }

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

function vectorBalanceDetailed(planets, year) {
  let sumX = 0, sumY = 0, totalMag = 0;
  const perPlanet = {};
  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const antiSign = p.antiPhase ? -1 : 1;
    const peri = p.periLong + p.icrfRate * (year - 2000);
    const incl = p.mean + antiSign * p.amp * Math.cos((peri - p.phaseAngle) * DEG2RAD);
    const omega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
    const mag = p.L * Math.sin(incl * DEG2RAD);
    const x = mag * Math.cos(omega);
    const y = mag * Math.sin(omega);
    sumX += x;
    sumY += y;
    totalMag += Math.abs(mag);
    perPlanet[key] = { incl, omega: omega * RAD2DEG, mag, x, y };
  }
  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  const balance = totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
  return { x: sumX, y: sumY, residual, total: totalMag, balance, perPlanet };
}

function measureStability(planets, nSamples = 200) {
  const step = SUPER_PERIOD / nSamples;
  let min = 100, max = 0, sum = 0;
  let minYear = 0, maxYear = 0;
  for (let i = 0; i <= nSamples; i++) {
    const year = balancedYear + i * step;
    const r = vectorBalanceDetailed(planets, year);
    sum += r.balance;
    if (r.balance < min) { min = r.balance; minYear = year; }
    if (r.balance > max) { max = r.balance; maxYear = year; }
  }
  return { min, max, mean: sum / (nSamples + 1), variation: max - min, minYear, maxYear };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║         DEEP VECTOR BALANCE EXPLORATION                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: DECOMPOSE THE 92% CEILING
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('1. DECOMPOSE THE 92% CEILING (all nodes locked at same rate)');
console.log('   When all Ω precess together, the geometry is frozen in a co-rotating');
console.log('   frame. The residual comes from the J2000 Ω positions and inclinations.');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// All nodes at the same rate — use a common rate of 55
const allLocked = {};
for (const key of PLANET_KEYS) allLocked[key] = 55;
const lockedPlanets = buildPlanetData({ ascRates: allLocked });
const lockedJ2000 = vectorBalanceDetailed(lockedPlanets, 2000);

console.log('Per-planet angular momentum vectors at J2000 (all nodes at 55 cycles/8H):');
console.log('');
console.log('Planet     │ Ω J2000    │ i(J2000)   │ L         │ |L·sin(i)| │ Lx           │ Ly           │ % of total');
console.log('───────────┼────────────┼────────────┼───────────┼────────────┼──────────────┼──────────────┼──────────');

for (const key of PLANET_KEYS) {
  const v = lockedJ2000.perPlanet[key];
  const p = lockedPlanets[key];
  const pct = (Math.abs(v.mag) / lockedJ2000.total * 100).toFixed(1);
  console.log(
    p.name.padEnd(10) + ' │ ' +
    (((v.omega % 360) + 360) % 360).toFixed(2).padStart(10) + '° │ ' +
    v.incl.toFixed(4).padStart(10) + '° │ ' +
    p.L.toExponential(3).padStart(9) + ' │ ' +
    Math.abs(v.mag).toExponential(3).padStart(10) + ' │ ' +
    v.x.toExponential(4).padStart(12) + ' │ ' +
    v.y.toExponential(4).padStart(12) + ' │ ' +
    pct.padStart(8)
  );
}
console.log('');
console.log(`Residual: |Σ| = ${lockedJ2000.residual.toExponential(6)}  (direction: ${(Math.atan2(lockedJ2000.y, lockedJ2000.x) * RAD2DEG).toFixed(1)}°)`);
console.log(`Total:    Σ|v| = ${lockedJ2000.total.toExponential(6)}`);
console.log(`Balance:  ${lockedJ2000.balance.toFixed(4)}%`);
console.log('');

// Breakdown: Jupiter vs Saturn vs rest
const juVec = lockedJ2000.perPlanet.jupiter;
const saVec = lockedJ2000.perPlanet.saturn;
const restX = lockedJ2000.x - juVec.x - saVec.x;
const restY = lockedJ2000.y - juVec.y - saVec.y;
console.log('Dominant contributions:');
console.log(`  Jupiter:     (${juVec.x.toExponential(4)}, ${juVec.y.toExponential(4)})  |v|=${Math.sqrt(juVec.x**2+juVec.y**2).toExponential(4)}`);
console.log(`  Saturn:      (${saVec.x.toExponential(4)}, ${saVec.y.toExponential(4)})  |v|=${Math.sqrt(saVec.x**2+saVec.y**2).toExponential(4)}`);
console.log(`  Ju+Sa:       (${(juVec.x+saVec.x).toExponential(4)}, ${(juVec.y+saVec.y).toExponential(4)})  |v|=${Math.sqrt((juVec.x+saVec.x)**2+(juVec.y+saVec.y)**2).toExponential(4)}`);
console.log(`  Other 6:     (${restX.toExponential(4)}, ${restY.toExponential(4)})  |v|=${Math.sqrt(restX**2+restY**2).toExponential(4)}`);
console.log(`  Ju+Sa angle: ${(Math.atan2(juVec.y+saVec.y, juVec.x+saVec.x) * RAD2DEG).toFixed(1)}°`);
console.log(`  Other6 angle: ${(Math.atan2(restY, restX) * RAD2DEG).toFixed(1)}°`);

const juSaMag = Math.sqrt((juVec.x+saVec.x)**2 + (juVec.y+saVec.y)**2);
const restMag = Math.sqrt(restX**2 + restY**2);
const angleDiff = Math.abs(Math.atan2(juVec.y+saVec.y, juVec.x+saVec.x) - Math.atan2(restY, restX)) * RAD2DEG;
console.log(`  Angle between Ju+Sa and rest: ${angleDiff.toFixed(1)}° (180° = perfect cancellation)`);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: GROUP ASSIGNMENT WITH LOCKED NODES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('2. GROUP ASSIGNMENT SEARCH WITH LOCKED NODES');
console.log('   All nodes at same rate. Which group assignment optimizes the frozen geometry?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const variablePlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const groupResults = [];

for (let mask = 0; mask < 128; mask++) {
  const groups = { earth: false };
  for (let i = 0; i < variablePlanets.length; i++) {
    groups[variablePlanets[i]] = !!(mask & (1 << i));
  }

  // Derive phase angles for this group assignment
  const phases = {};
  for (const key of PLANET_KEYS) {
    const f = key === 'earth' ? null : C.planets[key];
    const eclP = key === 'earth' ? H/16 : f.perihelionEclipticYears;
    const icrfP = key === 'earth' ? H/3 : 1 / (1/eclP - 1/genPrec);
    const icrfRate = 360 / icrfP;
    const periLong = key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : f.longitudePerihelion;
    const periAtBY = ((periLong + icrfRate * (balancedYear - 2000)) % 360 + 360) % 360;
    phases[key] = groups[key] ? periAtBY : ((periAtBY - 180 + 360) % 360);
  }

  const planets = buildPlanetData({ ascRates: allLocked, groups, phases });
  const stab = measureStability(planets, 100);

  const antiNames = variablePlanets.filter(k => groups[k]).map(k => k.charAt(0).toUpperCase() + k.slice(1));
  groupResults.push({
    mask, label: antiNames.length === 0 ? '(none)' : antiNames.join('+'),
    min: stab.min, mean: stab.mean, variation: stab.variation,
  });
}

groupResults.sort((a, b) => b.min - a.min);

console.log('TOP 20 BY MIN BALANCE (locked nodes):');
console.log('');
console.log('Rank │ Anti-phase planets               │ Vec min   │ Vec mean  │ Vec var');
console.log('─────┼─────────────────────────────────┼───────────┼───────────┼─────────');

for (let i = 0; i < 20; i++) {
  const r = groupResults[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.label.padEnd(33) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Ω_J2000 OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('3. Ω_J2000 SENSITIVITY (locked nodes, Saturn-only anti-phase)');
console.log('   How much does shifting each planet\'s J2000 ascending node help?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const defaultLocked = buildPlanetData({ ascRates: allLocked });
const defaultLockedStab = measureStability(defaultLocked, 200);

console.log(`Default (locked nodes): min=${defaultLockedStab.min.toFixed(4)}%, var=${defaultLockedStab.variation.toFixed(4)}`);
console.log('');
console.log('Planet     │ Ω J2000 │ Best Ω shift │ New min   │ Δ min     │ New var');
console.log('───────────┼─────────┼──────────────┼───────────┼───────────┼─────────');

for (const key of PLANET_KEYS) {
  const defaultOmega = defaultLocked[key].omegaJ2000;
  let bestShift = 0, bestMin = defaultLockedStab.min;

  for (let shift = -30; shift <= 30; shift += 1) {
    const planets = buildPlanetData({
      ascRates: allLocked,
      omegaJ2000: { [key]: defaultOmega + shift }
    });
    const stab = measureStability(planets, 50);
    if (stab.min > bestMin) { bestMin = stab.min; bestShift = shift; }
  }

  // Refine
  for (let shift = bestShift - 1; shift <= bestShift + 1; shift += 0.1) {
    const planets = buildPlanetData({
      ascRates: allLocked,
      omegaJ2000: { [key]: defaultOmega + shift }
    });
    const stab = measureStability(planets, 100);
    if (stab.min > bestMin) { bestMin = stab.min; bestShift = shift; }
  }

  const bestPlanets = buildPlanetData({
    ascRates: allLocked,
    omegaJ2000: { [key]: defaultOmega + bestShift }
  });
  const bestStab = measureStability(bestPlanets, 200);

  console.log(
    defaultLocked[key].name.padEnd(10) + ' │ ' +
    defaultOmega.toFixed(2).padStart(7) + '° │ ' +
    (bestShift >= 0 ? '+' : '') + bestShift.toFixed(1).padStart(10) + '° │ ' +
    bestStab.min.toFixed(4).padStart(9) + ' │ ' +
    (bestStab.min - defaultLockedStab.min >= 0 ? '+' : '') +
    (bestStab.min - defaultLockedStab.min).toFixed(4).padStart(8) + ' │ ' +
    bestStab.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: COMBINED Ω OPTIMIZATION (greedy)
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('4. GREEDY Ω OPTIMIZATION (locked nodes)');
console.log('   Iteratively shift the most impactful planet\'s Ω to find combined optimum');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const currentOmega = {};
for (const key of PLANET_KEYS) {
  currentOmega[key] = key === 'earth'
    ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane
    : C.planets[key].ascendingNodeInvPlane;
}

let bestSoFar = defaultLockedStab.min;
const optimizedOmega = { ...currentOmega };

for (let iter = 0; iter < 5; iter++) {
  let bestKey = null, bestOmegaShift = 0, bestIterMin = bestSoFar;

  for (const key of PLANET_KEYS) {
    for (let shift = -20; shift <= 20; shift += 0.5) {
      const testOmega = { ...optimizedOmega, [key]: optimizedOmega[key] + shift };
      const planets = buildPlanetData({ ascRates: allLocked, omegaJ2000: testOmega });
      const stab = measureStability(planets, 50);
      if (stab.min > bestIterMin) {
        bestIterMin = stab.min; bestKey = key; bestOmegaShift = shift;
      }
    }
  }

  if (!bestKey) { console.log(`  Iteration ${iter + 1}: no improvement found. Stopping.`); break; }

  optimizedOmega[bestKey] += bestOmegaShift;
  bestSoFar = bestIterMin;

  const p = buildPlanetData({ ascRates: allLocked, omegaJ2000: optimizedOmega });
  const s = measureStability(p, 200);

  console.log(`  Iter ${iter + 1}: shift ${bestKey} Ω by ${bestOmegaShift >= 0 ? '+' : ''}${bestOmegaShift.toFixed(1)}° → min=${s.min.toFixed(4)}%, var=${s.variation.toFixed(4)}`);
}

console.log('');
console.log('  Optimized Ω values vs original:');
console.log('  Planet     │ Original Ω │ Optimized Ω │ Shift');
console.log('  ───────────┼────────────┼─────────────┼──────────');
for (const key of PLANET_KEYS) {
  const orig = currentOmega[key];
  const opt = optimizedOmega[key];
  const shift = opt - orig;
  if (Math.abs(shift) > 0.01) {
    console.log('  ' + defaultLocked[key].name.padEnd(10) + ' │ ' +
      orig.toFixed(2).padStart(10) + '° │ ' +
      opt.toFixed(2).padStart(11) + '° │ ' +
      (shift >= 0 ? '+' : '') + shift.toFixed(1) + '°');
  } else {
    console.log('  ' + defaultLocked[key].name.padEnd(10) + ' │ ' +
      orig.toFixed(2).padStart(10) + '° │ ' +
      opt.toFixed(2).padStart(11) + '° │ unchanged');
  }
}

const optFinal = buildPlanetData({ ascRates: allLocked, omegaJ2000: optimizedOmega });
const optFinalStab = measureStability(optFinal, 500);
console.log('');
console.log(`  Final: min=${optFinalStab.min.toFixed(4)}%, mean=${optFinalStab.mean.toFixed(4)}%, var=${optFinalStab.variation.toFixed(4)}`);
console.log(`  Improvement: +${(optFinalStab.min - defaultLockedStab.min).toFixed(4)} pp min`);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: RATE PERTURBATIONS FROM COMMON BASE
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('5. RATE PERTURBATIONS FROM COMMON BASE');
console.log('   Start with all nodes at same rate, then add small per-planet offsets');
console.log('   to Jupiter and Saturn (the dominant contributors)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Use the best common rate (6 cycles/8H from previous search, but test others too)
const baseRates = [6, 1, 42, 55];

for (const baseRate of baseRates) {
  console.log(`Base rate: ${baseRate} cycles/8H (period: ${Math.round(SUPER_PERIOD / baseRate).toLocaleString()} yr)`);
  console.log('');

  const rates = {};
  for (const key of PLANET_KEYS) rates[key] = baseRate;

  const basePlanets = buildPlanetData({ ascRates: rates });
  const baseStab = measureStability(basePlanets, 100);

  // Scan Jupiter offset
  let bestJuOff = 0, bestSaOff = 0, bestOffMin = baseStab.min;

  for (let juOff = -5; juOff <= 5; juOff += 0.25) {
    for (let saOff = -5; saOff <= 5; saOff += 0.25) {
      const testRates = { ...rates, jupiter: baseRate + juOff, saturn: baseRate + saOff };
      const planets = buildPlanetData({ ascRates: testRates });
      const stab = measureStability(planets, 50);
      if (stab.min > bestOffMin) {
        bestOffMin = stab.min; bestJuOff = juOff; bestSaOff = saOff;
      }
    }
  }

  const bestRates = { ...rates, jupiter: baseRate + bestJuOff, saturn: baseRate + bestSaOff };
  const bestPlanets = buildPlanetData({ ascRates: bestRates });
  const bestStab = measureStability(bestPlanets, 200);

  console.log(`  All equal:    min=${baseStab.min.toFixed(4)}%, var=${baseStab.variation.toFixed(4)}`);
  console.log(`  Best offsets: Ju ${bestJuOff >= 0 ? '+' : ''}${bestJuOff.toFixed(2)}, Sa ${bestSaOff >= 0 ? '+' : ''}${bestSaOff.toFixed(2)} → min=${bestStab.min.toFixed(4)}%, var=${bestStab.variation.toFixed(4)}`);
  console.log(`  Ju rate: ${(baseRate + bestJuOff).toFixed(2)} cycles/8H, Sa rate: ${(baseRate + bestSaOff).toFixed(2)} cycles/8H`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: THE ROLE OF INCLINATION OSCILLATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('6. STATIC VS DYNAMIC INCLINATION');
console.log('   Compare: vector balance with oscillating inclinations vs fixed at mean');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Test with inclinations frozen at mean (no ICRF perihelion oscillation)
function vectorBalanceStatic(planets, year) {
  let sumX = 0, sumY = 0, totalMag = 0;
  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const incl = p.mean;  // FIXED at mean — no oscillation
    const omega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;
    const mag = p.L * Math.sin(incl * DEG2RAD);
    sumX += mag * Math.cos(omega);
    sumY += mag * Math.sin(omega);
    totalMag += Math.abs(mag);
  }
  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  return totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
}

const defaultPlanets = buildPlanetData({});

console.log('Year            │ Dynamic bal │ Static bal  │ Δ         │ Notes');
console.log('────────────────┼─────────────┼─────────────┼───────────┼───────────');

const testYears = [
  { y: balancedYear, label: 'Balanced year' },
  { y: 2000, label: 'J2000' },
  { y: 10000, label: '10,000 AD' },
  { y: balancedYear + H/2, label: 'Half H' },
];

for (const { y, label } of testYears) {
  const dyn = vectorBalanceDetailed(defaultPlanets, y).balance;
  const stat = vectorBalanceStatic(defaultPlanets, y);
  console.log(label.padEnd(16) + ' │ ' +
    dyn.toFixed(4).padStart(11) + ' │ ' +
    stat.toFixed(4).padStart(11) + ' │ ' +
    (dyn - stat >= 0 ? '+' : '') + (dyn - stat).toFixed(4).padStart(8) + ' │ ' +
    (Math.abs(dyn - stat) < 0.5 ? 'similar' : 'DIFFERENT'));
}

// Also test locked nodes with static inclinations
console.log('');
console.log('With locked nodes (all at 55):');
const lockedPlanets2 = buildPlanetData({ ascRates: allLocked });
for (const { y, label } of testYears) {
  const dyn = vectorBalanceDetailed(lockedPlanets2, y).balance;
  const stat = vectorBalanceStatic(lockedPlanets2, y);
  console.log(label.padEnd(16) + ' │ ' +
    dyn.toFixed(4).padStart(11) + ' │ ' +
    stat.toFixed(4).padStart(11) + ' │ ' +
    (dyn - stat >= 0 ? '+' : '') + (dyn - stat).toFixed(4).padStart(8) + ' │ ' +
    (Math.abs(dyn - stat) < 0.5 ? 'similar' : 'DIFFERENT'));
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: CONCLUSIONS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('7. CONCLUSIONS');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Key questions answered:');
console.log('  1. The 92% ceiling with locked nodes is set by the J2000 Ω geometry');
console.log('  2. The residual comes from Ju+Sa vector not perfectly opposing the rest');
console.log('  3. Ω optimization can potentially improve the locked-node balance');
console.log('  4. Rate perturbations from a common base can help close the gap');
console.log('  5. Static vs dynamic inclinations show the oscillation contribution');
console.log('');
