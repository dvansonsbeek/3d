// ═══════════════════════════════════════════════════════════════════════════
// VECTOR BALANCE OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════
//
// Systematic search for configurations that maximize the STABILITY of the
// dynamic vector balance over one full 8H super-period.
//
// Goal: Find which combination of:
//   - Group assignments (in-phase vs anti-phase per planet)
//   - Fibonacci d-values
//   - Phase angles (balanced-year-derived vs eigenmode)
//   - Ascending node rates
// produces a vector balance that is BOTH high AND stable over 8H.
//
// Constraints:
//   - LL bounds: mean ± amplitude must fall within Laplace-Lagrange bounds
//   - Trend direction: ecliptic inclination change must match JPL sign
//   - Earth locked: d=3, in-phase
//
// Usage: node tools/explore/vector-balance-optimizer.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;
const SUPER_PERIOD = 8 * H;

// ═══════════════════════════════════════════════════════════════════════════
// FIXED DATA (cannot change)
// ═══════════════════════════════════════════════════════════════════════════

const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55];

const FIXED = {};
for (const key of PLANET_KEYS) {
  const p = key === 'earth' ? null : C.planets[key];
  FIXED[key] = {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    mass: C.massFraction[key],
    sma: key === 'earth' ? 1.0 : C.derived[key].orbitDistance,
    ecc: C.eccJ2000[key],
    eclP: key === 'earth' ? H / 16 : p.perihelionEclipticYears,
    periLong: key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion,
    inclJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000,
    omegaJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane,
    ascNodeCycles8H: key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H,  // Earth: -H/5 → 40 cycles in 8H
  };
  const f = FIXED[key];
  f.icrfP = key === 'earth' ? H / 3 : 1 / (1 / f.eclP - 1 / genPrec);
  f.icrfRate = 360 / f.icrfP;
  f.L = f.mass * Math.sqrt(f.sma * (1 - f.ecc * f.ecc));
  f.ascNodePeriod = SUPER_PERIOD / f.ascNodeCycles8H;
  f.ascNodeRate = -360 / f.ascNodePeriod;  // negative = regression
}

const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, earth: 0,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

// Eigenmode phases (Laplace-Lagrange, Farside Table 10.1)
const EIGENMODES = {
  γ1: 20.23, γ2: 318.3, γ3: 255.6, γ4: 296.9,
  γ5: 0, γ6: 127.3, γ7: 315.6, γ8: 202.8,
};

// All eigenmode candidates per planet (MAX, MIN = ±180°, mean↓ = +90°, mean↑ = +270°)
function eigenmodeOptions() {
  const options = [];
  for (const [mode, phase] of Object.entries(EIGENMODES)) {
    options.push({ label: `${mode} MAX`, angle: phase });
    options.push({ label: `${mode} MIN`, angle: (phase + 180) % 360 });
    options.push({ label: `${mode} m↓`, angle: (phase + 90) % 360 });
    options.push({ label: `${mode} m↑`, angle: (phase + 270) % 360 });
  }
  return options;
}
const ALL_EIGENMODE_OPTIONS = eigenmodeOptions();

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build planet state from a configuration.
 * @param {Object} config - { key: { d, antiPhase, phaseAngle } }
 * @returns {Object} computed planet data with mean, amp, etc.
 */
function buildState(config) {
  const state = {};
  for (const key of PLANET_KEYS) {
    const f = FIXED[key];
    const c = config[key];
    const d = c.d;
    const sqrtM = Math.sqrt(f.mass);
    const amp = PSI / (d * sqrtM);
    const antiSign = c.antiPhase ? -1 : 1;
    const cosJ2000 = Math.cos((f.periLong - c.phaseAngle) * DEG2RAD);
    const mean = f.inclJ2000 - antiSign * amp * cosJ2000;
    state[key] = {
      ...f, d, amp, mean, antiPhase: c.antiPhase, phaseAngle: c.phaseAngle,
      w: Math.sqrt(f.mass * f.sma * (1 - f.ecc * f.ecc)) / d,
      v: sqrtM * Math.pow(f.sma, 1.5) * f.ecc / Math.sqrt(d),
    };
  }
  return state;
}

/**
 * Check LL bounds and trend direction constraints.
 */
function checkConstraints(state) {
  let llPass = 0, dirPass = 0, llFail = [], dirFail = [];
  for (const key of PLANET_KEYS) {
    const s = state[key];
    const ll = llBounds[key];
    const rangeMin = s.mean - s.amp;
    const rangeMax = s.mean + s.amp;
    if (rangeMin >= ll.min - 0.01 && rangeMax <= ll.max + 0.01) {
      llPass++;
    } else {
      llFail.push(key);
    }

    if (key === 'earth') { dirPass++; continue; }
    // Compute ecliptic trend (simplified — inclination change 1900→2100)
    const trend = computeEclipticTrend(s, key);
    if ((jplTrends[key] >= 0) === (trend >= 0)) {
      dirPass++;
    } else {
      dirFail.push(key);
    }
  }
  return { llPass, dirPass, llFail, dirFail };
}

function computeEclipticTrend(s, key) {
  function planetIncl(year) {
    const peri = s.periLong + s.icrfRate * (year - 2000);
    const antiSign = s.antiPhase ? -1 : 1;
    return s.mean + antiSign * s.amp * Math.cos((peri - s.phaseAngle) * DEG2RAD);
  }

  // Earth inclination at given year
  const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
  const earthAmp = C.earthInvPlaneInclinationAmplitude;
  const earthMean = C.earthInvPlaneInclinationMean;

  function earthIncl(year) {
    const peri = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + FIXED.earth.icrfRate * (year - 2000);
    return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
  }

  function eclipticIncl(year) {
    const pI = planetIncl(year) * DEG2RAD;
    const eI = earthIncl(year) * DEG2RAD;
    const pOmega = (s.omegaJ2000 + s.ascNodeRate * (year - 2000)) * DEG2RAD;
    const eOmega = (FIXED.earth.omegaJ2000 + FIXED.earth.ascNodeRate * (year - 2000)) * DEG2RAD;
    const dot = Math.sin(pI)*Math.sin(eI)*(Math.sin(pOmega)*Math.sin(eOmega) + Math.cos(pOmega)*Math.cos(eOmega)) + Math.cos(pI)*Math.cos(eI);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
  }

  return (eclipticIncl(2100) - eclipticIncl(1900)) / 2;
}

/**
 * Compute vector balance at a single year.
 */
function vectorBalanceAt(state, year) {
  let sumX = 0, sumY = 0, totalMag = 0;
  for (const key of PLANET_KEYS) {
    const s = state[key];
    const antiSign = s.antiPhase ? -1 : 1;
    const peri = s.periLong + s.icrfRate * (year - 2000);
    const incl = s.mean + antiSign * s.amp * Math.cos((peri - s.phaseAngle) * DEG2RAD);
    const omega = (s.omegaJ2000 + s.ascNodeRate * (year - 2000)) * DEG2RAD;
    const mag = s.L * Math.sin(incl * DEG2RAD);
    sumX += mag * Math.cos(omega);
    sumY += mag * Math.sin(omega);
    totalMag += Math.abs(mag);
  }
  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  return { balance: totalMag > 0 ? (1 - residual / totalMag) * 100 : 100, residual, total: totalMag };
}

/**
 * Measure vector balance stability over 8H.
 * Returns { min, max, mean, variation, stability }
 */
function measureStability(state, nSamples = 200) {
  const step = SUPER_PERIOD / nSamples;
  let min = 100, max = 0, sum = 0;
  for (let i = 0; i <= nSamples; i++) {
    const year = balancedYear + i * step;
    const r = vectorBalanceAt(state, year);
    sum += r.balance;
    if (r.balance < min) min = r.balance;
    if (r.balance > max) max = r.balance;
  }
  const mean = sum / (nSamples + 1);
  return { min, max, mean, variation: max - min, stability: min };  // stability = worst case
}

/**
 * Scalar balance (inclination + eccentricity).
 */
function scalarBalance(state) {
  let wIn = 0, wAnti = 0, vIn = 0, vAnti = 0;
  for (const key of PLANET_KEYS) {
    const s = state[key];
    if (s.antiPhase) { wAnti += s.w; vAnti += s.v; }
    else { wIn += s.w; vIn += s.v; }
  }
  const inclBal = (1 - Math.abs(wIn - wAnti) / (wIn + wAnti)) * 100;
  const eccBal = (wIn + wAnti > 0 && vIn + vAnti > 0)
    ? (1 - Math.abs(vIn - vAnti) / (vIn + vAnti)) * 100 : 0;
  return { inclBal, eccBal };
}

/**
 * Derive phase angles from balanced year for a given group assignment.
 */
function derivePhaseAngles(config) {
  const result = {};
  for (const key of PLANET_KEYS) {
    const f = FIXED[key];
    const periAtBY = ((f.periLong + f.icrfRate * (balancedYear - 2000)) % 360 + 360) % 360;
    result[key] = config[key].antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: GROUP ASSIGNMENT SEARCH
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║         VECTOR BALANCE OPTIMIZER                                        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 1: GROUP ASSIGNMENT SEARCH');
console.log('Testing all 128 possible group assignments (Earth locked in-phase)');
console.log('Using Config #1 d-values: Me=21, Ve=34, Ea=3, Ma=5, Ju=5, Sa=3, Ur=21, Ne=34');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const currentD = { mercury: 21, venus: 34, earth: 3, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
const variablePlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const phase1Results = [];

for (let mask = 0; mask < 128; mask++) {
  // Build group assignment from bitmask
  const config = {};
  for (let i = 0; i < variablePlanets.length; i++) {
    const key = variablePlanets[i];
    config[key] = { d: currentD[key], antiPhase: !!(mask & (1 << i)) };
  }
  config.earth = { d: 3, antiPhase: false };

  // Derive phase angles from balanced year
  const phases = derivePhaseAngles(config);
  for (const key of PLANET_KEYS) config[key].phaseAngle = phases[key];

  const state = buildState(config);
  const constraints = checkConstraints(state);
  const scalar = scalarBalance(state);
  const stability = measureStability(state);

  // Group label
  const groupLabel = variablePlanets.map(k => config[k].antiPhase ? 'A' : 'I').join('');
  const antiPlanets = variablePlanets.filter(k => config[k].antiPhase).map(k => FIXED[k].name);
  const antiLabel = antiPlanets.length === 0 ? '(none)' : antiPlanets.join('+');

  phase1Results.push({
    mask, groupLabel, antiLabel,
    llPass: constraints.llPass, dirPass: constraints.dirPass,
    llFail: constraints.llFail, dirFail: constraints.dirFail,
    inclBal: scalar.inclBal, eccBal: scalar.eccBal,
    vecMin: stability.min, vecMax: stability.max, vecMean: stability.mean,
    vecVar: stability.variation,
  });
}

// Sort by vector balance stability (minimum balance = worst case)
phase1Results.sort((a, b) => b.vecMin - a.vecMin);

console.log('TOP 20 BY WORST-CASE VECTOR BALANCE (min over 8H):');
console.log('');
console.log('Rank │ Anti-phase planets      │ LL │ Dir│ Incl bal │ Ecc bal  │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼────────────────────────┼────┼────┼──────────┼──────────┼──────────┼──────────┼─────────');

for (let i = 0; i < Math.min(20, phase1Results.length); i++) {
  const r = phase1Results[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.antiLabel.padEnd(22) + ' │ ' +
    (r.llPass + '/8').padStart(3) + ' │ ' +
    (r.dirPass + '/8').padStart(3) + ' │ ' +
    r.inclBal.toFixed(4).padStart(8) + ' │ ' +
    r.eccBal.toFixed(4).padStart(8) + ' │ ' +
    r.vecMin.toFixed(4).padStart(8) + ' │ ' +
    r.vecMean.toFixed(4).padStart(8) + ' │ ' +
    r.vecVar.toFixed(4).padStart(7)
  );
}

// Also show configs that pass all LL + have high scalar balance
console.log('');
console.log('TOP 20 BY SCALAR INCLINATION BALANCE (with LL pass ≥ 7):');
console.log('');
console.log('Rank │ Anti-phase planets      │ LL │ Dir│ Incl bal │ Ecc bal  │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼────────────────────────┼────┼────┼──────────┼──────────┼──────────┼──────────┼─────────');

const phase1ByScalar = [...phase1Results]
  .filter(r => r.llPass >= 7)
  .sort((a, b) => b.inclBal - a.inclBal);

for (let i = 0; i < Math.min(20, phase1ByScalar.length); i++) {
  const r = phase1ByScalar[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.antiLabel.padEnd(22) + ' │ ' +
    (r.llPass + '/8').padStart(3) + ' │ ' +
    (r.dirPass + '/8').padStart(3) + ' │ ' +
    r.inclBal.toFixed(4).padStart(8) + ' │ ' +
    r.eccBal.toFixed(4).padStart(8) + ' │ ' +
    r.vecMin.toFixed(4).padStart(8) + ' │ ' +
    r.vecMean.toFixed(4).padStart(8) + ' │ ' +
    r.vecVar.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: D-VALUE SEARCH FOR TOP GROUP ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 2: D-VALUE SEARCH FOR TOP GROUP ASSIGNMENTS');
console.log('Testing mirror-symmetric d-values for best group assignments');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Take top 5 unique group assignments by vector stability
const topGroups = phase1Results.slice(0, 5);

// Mirror-symmetric d-values (inner ↔ outer): Me=Ur, Ve=Ne, Ea=Sa, Ma=Ju
const mirrorD = [];
for (const d_ea_sa of [3, 5]) {
  for (const d_ma_ju of [3, 5, 8]) {
    for (const d_me_ur of [5, 8, 13, 21, 34]) {
      for (const d_ve_ne of [5, 8, 13, 21, 34]) {
        mirrorD.push({
          mercury: d_me_ur, venus: d_ve_ne, earth: 3,
          mars: d_ma_ju, jupiter: d_ma_ju,
          saturn: d_ea_sa, uranus: d_me_ur, neptune: d_ve_ne,
        });
      }
    }
  }
}

console.log(`Testing ${mirrorD.length} mirror-symmetric d-combos × ${topGroups.length} group assignments = ${mirrorD.length * topGroups.length} configs`);
console.log('');

const phase2Results = [];

for (const groupResult of topGroups) {
  for (const dCombo of mirrorD) {
    const config = {};
    for (const key of PLANET_KEYS) {
      const isAnti = key === 'earth' ? false :
        !!(groupResult.mask & (1 << variablePlanets.indexOf(key)));
      config[key] = { d: dCombo[key], antiPhase: isAnti };
    }

    const phases = derivePhaseAngles(config);
    for (const key of PLANET_KEYS) config[key].phaseAngle = phases[key];

    const state = buildState(config);
    const constraints = checkConstraints(state);

    // Skip if too many LL failures
    if (constraints.llPass < 6) continue;

    const scalar = scalarBalance(state);
    // Skip if scalar balance is terrible
    if (scalar.inclBal < 90) continue;

    const stability = measureStability(state, 100);  // fewer samples for speed

    const dLabel = `Me${dCombo.mercury} Ve${dCombo.venus} Ma${dCombo.mars} Ju${dCombo.jupiter} Sa${dCombo.saturn} Ur${dCombo.uranus} Ne${dCombo.neptune}`;
    phase2Results.push({
      groupLabel: groupResult.antiLabel,
      dLabel,
      llPass: constraints.llPass, dirPass: constraints.dirPass,
      inclBal: scalar.inclBal, eccBal: scalar.eccBal,
      vecMin: stability.min, vecMean: stability.mean, vecVar: stability.variation,
    });
  }
}

phase2Results.sort((a, b) => b.vecMin - a.vecMin);

console.log('TOP 20 BY WORST-CASE VECTOR BALANCE:');
console.log('');
console.log('Rank │ Anti-phase              │ d-values                              │ LL │ Incl bal │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼────────────────────────┼───────────────────────────────────────┼────┼──────────┼──────────┼──────────┼─────────');

for (let i = 0; i < Math.min(20, phase2Results.length); i++) {
  const r = phase2Results[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.groupLabel.padEnd(22) + ' │ ' +
    r.dLabel.padEnd(37) + ' │ ' +
    (r.llPass + '/8').padStart(3) + ' │ ' +
    r.inclBal.toFixed(4).padStart(8) + ' │ ' +
    r.vecMin.toFixed(4).padStart(8) + ' │ ' +
    r.vecMean.toFixed(4).padStart(8) + ' │ ' +
    r.vecVar.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: EIGENMODE PHASE ANGLES
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 3: EIGENMODE PHASE ANGLES');
console.log('For the current config (Saturn-only anti-phase, Config #1 d-values):');
console.log('Test balanced-year-derived phases vs nearest eigenmode phases');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Current config
const currentConfig = {};
for (const key of PLANET_KEYS) {
  currentConfig[key] = {
    d: currentD[key],
    antiPhase: key === 'saturn',
  };
}
const currentPhases = derivePhaseAngles(currentConfig);
for (const key of PLANET_KEYS) currentConfig[key].phaseAngle = currentPhases[key];

const currentState = buildState(currentConfig);
const currentStability = measureStability(currentState, 500);

console.log(`Current (balanced-year phases): min=${currentStability.min.toFixed(4)}%, mean=${currentStability.mean.toFixed(4)}%, var=${currentStability.variation.toFixed(4)}`);
console.log('');

// For each planet, find the nearest eigenmode phase and test it
console.log('Planet     │ Current φ  │ Nearest eigenmode          │ Δ       │ Vec min with eigenmode │ Δ min');
console.log('───────────┼────────────┼────────────────────────────┼─────────┼────────────────────────┼──────────');

for (const key of PLANET_KEYS) {
  if (key === 'earth') continue;
  const curPhase = currentPhases[key];

  // Find nearest eigenmode
  let bestEigen = null, bestDiff = 360;
  for (const opt of ALL_EIGENMODE_OPTIONS) {
    const diff = Math.abs(((curPhase - opt.angle + 180) % 360 + 360) % 360 - 180);
    if (diff < bestDiff) { bestDiff = diff; bestEigen = opt; }
  }

  // Test with this eigenmode phase
  const testConfig = {};
  for (const k of PLANET_KEYS) {
    testConfig[k] = { ...currentConfig[k] };
  }
  testConfig[key].phaseAngle = bestEigen.angle;

  const testState = buildState(testConfig);
  const testStability = measureStability(testState, 200);

  console.log(
    FIXED[key].name.padEnd(10) + ' │ ' +
    (curPhase.toFixed(2) + '°').padStart(10) + ' │ ' +
    (bestEigen.label + ' ' + bestEigen.angle.toFixed(2) + '°').padEnd(26) + ' │ ' +
    (bestDiff.toFixed(2) + '°').padStart(7) + ' │ ' +
    testStability.min.toFixed(4).padStart(22) + ' │ ' +
    (testStability.min - currentStability.min).toFixed(4).padStart(8)
  );
}

// Test ALL planets at their nearest eigenmode simultaneously
console.log('');
const allEigenConfig = {};
for (const key of PLANET_KEYS) {
  allEigenConfig[key] = { d: currentD[key], antiPhase: key === 'saturn' };
  if (key === 'earth') {
    allEigenConfig[key].phaseAngle = currentPhases[key];
    continue;
  }
  let bestEigen = null, bestDiff = 360;
  for (const opt of ALL_EIGENMODE_OPTIONS) {
    const diff = Math.abs(((currentPhases[key] - opt.angle + 180) % 360 + 360) % 360 - 180);
    if (diff < bestDiff) { bestDiff = diff; bestEigen = opt; }
  }
  allEigenConfig[key].phaseAngle = bestEigen.angle;
}

const allEigenState = buildState(allEigenConfig);
const allEigenStability = measureStability(allEigenState, 500);
const allEigenConstraints = checkConstraints(allEigenState);
const allEigenScalar = scalarBalance(allEigenState);

console.log(`ALL planets at nearest eigenmode:`);
console.log(`  Vector: min=${allEigenStability.min.toFixed(4)}%, mean=${allEigenStability.mean.toFixed(4)}%, var=${allEigenStability.variation.toFixed(4)}`);
console.log(`  Scalar: incl=${allEigenScalar.inclBal.toFixed(4)}%, ecc=${allEigenScalar.eccBal.toFixed(4)}%`);
console.log(`  LL: ${allEigenConstraints.llPass}/8, Dir: ${allEigenConstraints.dirPass}/8`);
console.log(`  Δ min vs current: ${(allEigenStability.min - currentStability.min).toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: ASCENDING NODE RATE SENSITIVITY
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 4: ASCENDING NODE RATE SENSITIVITY');
console.log('Which planet\'s ascending node rate most affects vector stability?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Planet     │ Current Ω rate  │ Current cycles/8H │ Vec min (default) │ Vec min (rate×2) │ Vec min (rate/2) │ Δ max');
console.log('───────────┼─────────────────┼───────────────────┼───────────────────┼──────────────────┼──────────────────┼──────────');

for (const key of PLANET_KEYS) {
  // Double the ascending node rate
  const savedRate = FIXED[key].ascNodeRate;

  FIXED[key].ascNodeRate = savedRate * 2;
  const state2x = buildState(currentConfig);
  const stab2x = measureStability(state2x, 200);

  FIXED[key].ascNodeRate = savedRate / 2;
  const stateHalf = buildState(currentConfig);
  const stabHalf = measureStability(stateHalf, 200);

  FIXED[key].ascNodeRate = savedRate;  // restore

  const delta = Math.max(
    Math.abs(stab2x.min - currentStability.min),
    Math.abs(stabHalf.min - currentStability.min)
  );

  console.log(
    FIXED[key].name.padEnd(10) + ' │ ' +
    (savedRate.toFixed(6) + '°/yr').padStart(15) + ' │ ' +
    FIXED[key].ascNodeCycles8H.toString().padStart(17) + ' │ ' +
    currentStability.min.toFixed(4).padStart(17) + ' │ ' +
    stab2x.min.toFixed(4).padStart(16) + ' │ ' +
    stabHalf.min.toFixed(4).padStart(16) + ' │ ' +
    delta.toFixed(4).padStart(8)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5: COMBINED OPTIMIZATION — BEST OVERALL CONFIG
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('PHASE 5: SUMMARY — CURRENT VS BEST FOUND');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const currentConstraints = checkConstraints(currentState);
const currentScalar = scalarBalance(currentState);

console.log('CURRENT CONFIGURATION (Saturn-only anti-phase, Config #1):');
console.log(`  d-values: Me=21 Ve=34 Ea=3 Ma=5 Ju=5 Sa=3 Ur=21 Ne=34`);
console.log(`  Anti-phase: Saturn only`);
console.log(`  Scalar balance: incl=${currentScalar.inclBal.toFixed(6)}%, ecc=${currentScalar.eccBal.toFixed(6)}%`);
console.log(`  Vector balance: min=${currentStability.min.toFixed(4)}%, max=${currentStability.max.toFixed(4)}%, mean=${currentStability.mean.toFixed(4)}%`);
console.log(`  Variation: ${currentStability.variation.toFixed(4)} pp over 8H`);
console.log(`  LL bounds: ${currentConstraints.llPass}/8 pass ${currentConstraints.llFail.length > 0 ? '(fail: ' + currentConstraints.llFail.join(', ') + ')' : ''}`);
console.log(`  Trend dir: ${currentConstraints.dirPass}/8 pass ${currentConstraints.dirFail.length > 0 ? '(fail: ' + currentConstraints.dirFail.join(', ') + ')' : ''}`);
console.log('');

if (phase2Results.length > 0) {
  const best = phase2Results[0];
  console.log('BEST FOUND (Phase 2):');
  console.log(`  d-values: ${best.dLabel}`);
  console.log(`  Anti-phase: ${best.groupLabel}`);
  console.log(`  Scalar balance: incl=${best.inclBal.toFixed(4)}%`);
  console.log(`  Vector balance: min=${best.vecMin.toFixed(4)}%, mean=${best.vecMean.toFixed(4)}%`);
  console.log(`  Variation: ${best.vecVar.toFixed(4)} pp over 8H`);
  console.log(`  LL bounds: ${best.llPass}/8`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('INTERPRETATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The vector balance measures whether angular momentum perturbations');
console.log('cancel at every moment across 8H. High min + low variation = stable');
console.log('invariable plane. The phase angles, ascending node rates, and group');
console.log('assignments ALL contribute to this stability.');
console.log('');
