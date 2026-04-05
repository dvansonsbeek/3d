// ═══════════════════════════════════════════════════════════════════════════
// VECTOR BALANCE — FREQUENCY DECOMPOSITION & D-VALUE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════
//
// The time variation in the vector balance comes from inclination oscillations
// at DIFFERENT ICRF frequencies. Each planet oscillates at its own frequency,
// creating an independent perturbation. This script:
//
//   1. Decomposes the time variation by frequency (which planet causes most?)
//   2. Identifies frequency-sharing pairs (Venus=Neptune → can cancel)
//   3. Optimizes d-values to minimize time variation
//   4. Tests whether differential node rates can create dynamic cancellation
//   5. Explores balanced year shifts
//
// Key insight: with locked nodes, in the co-rotating frame the perturbation is:
//   δR(t) ≈ PSI × Σ_j [L_j × cos(mean_j) / (d_j × √m_j)] × sign_j
//            × cos(θ_j(t)) × [cos(Ω_j), sin(Ω_j)]
//
// Each frequency creates an oscillating 2D vector. The total variation is the
// RSS of all frequency components.
//
// Usage: node tools/explore/vector-balance-frequency-analysis.js
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
const FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55];

// ═══════════════════════════════════════════════════════════════════════════

function buildPlanetData(opts = {}) {
  const dOverrides = opts.dValues || {};
  const groupOverrides = opts.groups || {};
  const ascOverrides = opts.ascRates || {};
  const byOverride = opts.balancedYear || balancedYear;

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
      omegaJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane,
    };

    const defaultCycles = key === 'earth' ? 40 : p.ascendingNodeCyclesIn8H;
    const cycles = ascOverrides[key] !== undefined ? ascOverrides[key] : defaultCycles;

    pd.icrfP = key === 'earth' ? H / 3 : 1 / (1 / pd.eclP - 1 / genPrec);
    pd.icrfRate = 360 / pd.icrfP;
    pd.amp = PSI / (pd.d * Math.sqrt(pd.mass));
    pd.L = pd.mass * Math.sqrt(pd.sma * (1 - pd.ecc * pd.ecc));
    pd.ascNodeRate = -360 * cycles / SUPER_PERIOD;

    // Derive phase angle from balanced year
    const periAtBY = ((pd.periLong + pd.icrfRate * (byOverride - 2000)) % 360 + 360) % 360;
    pd.phaseAngle = pd.antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);

    const antiSign = pd.antiPhase ? -1 : 1;
    const cosJ2000 = Math.cos((pd.periLong - pd.phaseAngle) * DEG2RAD);
    pd.mean = pd.inclJ2000 - antiSign * pd.amp * cosJ2000;

    // Perturbation coefficient: how much this planet's oscillation affects the vector
    pd.pertCoeff = pd.L * Math.cos(pd.mean * DEG2RAD) * pd.amp * DEG2RAD;

    planets[key] = pd;
  }
  return planets;
}

function measureStability(planets, nSamples = 200) {
  const step = SUPER_PERIOD / nSamples;
  let min = 100, max = 0, sum = 0;
  for (let i = 0; i <= nSamples; i++) {
    const year = balancedYear + i * step;
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
    const bal = totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
    sum += bal;
    if (bal < min) min = bal;
    if (bal > max) max = bal;
  }
  return { min, max, mean: sum / (nSamples + 1), variation: max - min };
}

function scalarBalance(planets) {
  let wIn = 0, wAnti = 0;
  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const w = Math.sqrt(p.mass * p.sma * (1 - p.ecc * p.ecc)) / p.d;
    if (p.antiPhase) wAnti += w; else wIn += w;
  }
  return (1 - Math.abs(wIn - wAnti) / (wIn + wAnti)) * 100;
}

function checkLL(planets) {
  const llBounds = {
    mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
    earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
    jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
    uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
  };
  let pass = 0, fail = [];
  for (const key of PLANET_KEYS) {
    const p = planets[key];
    const ll = llBounds[key];
    if (p.mean - p.amp >= ll.min - 0.01 && p.mean + p.amp <= ll.max + 0.01) pass++;
    else fail.push(key);
  }
  return { pass, fail };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     FREQUENCY DECOMPOSITION & D-VALUE OPTIMIZATION                     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: FREQUENCY DECOMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('1. FREQUENCY DECOMPOSITION — which planet contributes most time variation?');
console.log('   With locked nodes, each planet creates an oscillating perturbation vector');
console.log('   at its own ICRF frequency. Magnitude = L × cos(mean) × amp × |[cosΩ, sinΩ]|');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const lockedRates = {};
for (const key of PLANET_KEYS) lockedRates[key] = 55;

const defaultPlanets = buildPlanetData({ ascRates: lockedRates });

console.log('Planet     │ ICRF period  │ d  │ Amplitude │ Mean      │ L           │ Pert. coeff  │ Direction │ % of pert');
console.log('───────────┼──────────────┼────┼───────────┼───────────┼─────────────┼──────────────┼───────────┼──────────');

let totalPert = 0;
const pertData = [];
for (const key of PLANET_KEYS) {
  const p = defaultPlanets[key];
  const pertMag = p.pertCoeff;
  totalPert += Math.abs(pertMag);
  pertData.push({ key, pertMag });
}

for (const { key, pertMag } of pertData) {
  const p = defaultPlanets[key];
  const pct = (Math.abs(pertMag) / totalPert * 100).toFixed(1);
  console.log(
    p.name.padEnd(10) + ' │ ' +
    Math.round(Math.abs(p.icrfP)).toLocaleString().padStart(12) + ' │ ' +
    p.d.toString().padStart(2) + ' │ ' +
    (p.amp.toFixed(4) + '°').padStart(9) + ' │ ' +
    (p.mean.toFixed(4) + '°').padStart(9) + ' │ ' +
    p.L.toExponential(4).padStart(11) + ' │ ' +
    Math.abs(pertMag).toExponential(4).padStart(12) + ' │ ' +
    (((p.omegaJ2000 % 360) + 360) % 360).toFixed(1).padStart(9) + '° │ ' +
    pct.padStart(8)
  );
}

// Identify frequency-sharing pairs
console.log('');
console.log('Frequency-sharing pairs (same ICRF period):');
const periods = {};
for (const key of PLANET_KEYS) {
  const p = defaultPlanets[key];
  const roundedP = Math.round(Math.abs(p.icrfP));
  if (!periods[roundedP]) periods[roundedP] = [];
  periods[roundedP].push(key);
}
for (const [period, keys] of Object.entries(periods)) {
  if (keys.length > 1) {
    console.log(`  Period ~${Number(period).toLocaleString()} yr: ${keys.join(' + ')} → could cancel if d-values and Ω align`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: D-VALUE OPTIMIZATION (locked nodes)
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('2. D-VALUE OPTIMIZATION (locked nodes, Saturn-only anti-phase)');
console.log('   Search mirror-symmetric d-values to minimize vector balance variation');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const dResults = [];
// Mirror-symmetric: Me=Ur, Ve=Ne, Ea fixed=3, Ma=Ju, Sa varies
for (const d_ea_sa of [3, 5, 8]) {
  for (const d_ma_ju of [3, 5, 8, 13]) {
    for (const d_me_ur of [5, 8, 13, 21, 34, 55]) {
      for (const d_ve_ne of [5, 8, 13, 21, 34, 55]) {
        const dValues = {
          mercury: d_me_ur, venus: d_ve_ne, earth: 3,
          mars: d_ma_ju, jupiter: d_ma_ju,
          saturn: d_ea_sa, uranus: d_me_ur, neptune: d_ve_ne,
        };
        const planets = buildPlanetData({ dValues, ascRates: lockedRates });
        const ll = checkLL(planets);
        if (ll.pass < 6) continue;

        const scalar = scalarBalance(planets);
        if (scalar < 80) continue;

        const stab = measureStability(planets, 100);
        const label = `Me${d_me_ur} Ve${d_ve_ne} Ma${d_ma_ju} Ju${d_ma_ju} Sa${d_ea_sa} Ur${d_me_ur} Ne${d_ve_ne}`;

        dResults.push({
          label, ll: ll.pass, scalar, ...stab,
          d_ea_sa, d_ma_ju, d_me_ur, d_ve_ne,
        });
      }
    }
  }
}

dResults.sort((a, b) => a.variation - b.variation);

console.log('TOP 20 BY LOWEST VARIATION (most stable vector balance over 8H):');
console.log('');
console.log('Rank │ d-values                              │ LL │ Scalar   │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼───────────────────────────────────────┼────┼──────────┼──────────┼──────────┼─────────');

for (let i = 0; i < Math.min(20, dResults.length); i++) {
  const r = dResults[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.label.padEnd(37) + ' │ ' +
    (r.ll + '/8').padStart(3) + ' │ ' +
    r.scalar.toFixed(4).padStart(8) + ' │ ' +
    r.min.toFixed(4).padStart(8) + ' │ ' +
    r.mean.toFixed(4).padStart(8) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// Also by min balance
const dByMin = [...dResults].sort((a, b) => b.min - a.min);
console.log('');
console.log('TOP 20 BY HIGHEST MIN BALANCE:');
console.log('');
console.log('Rank │ d-values                              │ LL │ Scalar   │ Vec min  │ Vec mean │ Vec var');
console.log('─────┼───────────────────────────────────────┼────┼──────────┼──────────┼──────────┼─────────');

for (let i = 0; i < Math.min(20, dByMin.length); i++) {
  const r = dByMin[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.label.padEnd(37) + ' │ ' +
    (r.ll + '/8').padStart(3) + ' │ ' +
    r.scalar.toFixed(4).padStart(8) + ' │ ' +
    r.min.toFixed(4).padStart(8) + ' │ ' +
    r.mean.toFixed(4).padStart(8) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: DIFFERENTIAL NODE RATES FOR DYNAMIC CANCELLATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('3. DIFFERENTIAL NODE RATES — can beat frequencies cancel time variation?');
console.log('   If Ju and Sa nodes precess at slightly different rates, their combined');
console.log('   vector rotates slowly — potentially compensating inclination oscillations');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Jupiter ICRF period = H/8 ≈ 41,915 yr
// Saturn ICRF period = H/5 ≈ 67,063 yr (this is the inclination period, not ecliptic)
// Actually Saturn ICRF = 1/(1/(H*(-1/8)) - 1/(H/13))... let me check
const juICRF = Math.abs(defaultPlanets.jupiter.icrfP);
const saICRF = Math.abs(defaultPlanets.saturn.icrfP);
console.log(`Jupiter ICRF inclination cycle: ${Math.round(juICRF).toLocaleString()} yr`);
console.log(`Saturn ICRF inclination cycle:  ${Math.round(saICRF).toLocaleString()} yr`);
console.log(`Beat frequency: ${Math.round(Math.abs(1 / (1/juICRF - 1/saICRF))).toLocaleString()} yr`);
console.log('');

// If the Ju-Sa node rate difference matches the Ju-Sa inclination beat frequency,
// the rotation of their combined vector would track the inclination beat
const inclBeat = Math.abs(1 / (1/juICRF - 1/saICRF));
const beatCycles8H = SUPER_PERIOD / inclBeat;
console.log(`Inclination beat period: ${Math.round(inclBeat).toLocaleString()} yr (${beatCycles8H.toFixed(2)} cycles/8H)`);
console.log('');

// Scan: Ju and Sa at different rates, looking for dynamic cancellation
console.log('Scanning differential rates: Ju at base, Sa offset by Δ...');
console.log('');

const baseJu = 55;
const diffResults = [];

for (let saOff = -20; saOff <= 20; saOff += 0.5) {
  const rates = {};
  for (const key of PLANET_KEYS) {
    rates[key] = key === 'earth' ? 40 : C.planets[key].ascendingNodeCyclesIn8H;
  }
  rates.saturn = baseJu + saOff;

  const planets = buildPlanetData({ ascRates: rates });
  const stab = measureStability(planets, 150);
  diffResults.push({ saRate: baseJu + saOff, saOff, ...stab });
}

diffResults.sort((a, b) => b.min - a.min);

console.log('TOP 15 BY MIN BALANCE (Ju=55 fixed, Sa varies):');
console.log('');
console.log('Rank │ Sa rate  │ Sa offset │ Vec min   │ Vec mean  │ Vec var');
console.log('─────┼─────────┼───────────┼───────────┼───────────┼─────────');

for (let i = 0; i < 15; i++) {
  const r = diffResults[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    r.saRate.toFixed(1).padStart(7) + ' │ ' +
    (r.saOff >= 0 ? '+' : '') + r.saOff.toFixed(1).padStart(8) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: BALANCED YEAR SENSITIVITY
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('4. BALANCED YEAR SENSITIVITY');
console.log('   The balanced year sets all phase angles. Does shifting it help?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const byResults = [];
for (let byOffset = -50000; byOffset <= 50000; byOffset += 1000) {
  const testBY = balancedYear + byOffset;
  const planets = buildPlanetData({ ascRates: lockedRates, balancedYear: testBY });
  const stab = measureStability(planets, 100);
  byResults.push({ by: testBY, offset: byOffset, ...stab });
}

byResults.sort((a, b) => b.min - a.min);

console.log('TOP 15 BY MIN BALANCE (locked nodes, varying balanced year):');
console.log('');
console.log('Rank │ Balanced year  │ Offset      │ Vec min   │ Vec mean  │ Vec var');
console.log('─────┼────────────────┼─────────────┼───────────┼───────────┼─────────');

for (let i = 0; i < 15; i++) {
  const r = byResults[i];
  console.log(
    (i + 1).toString().padStart(4) + ' │ ' +
    Math.round(r.by).toLocaleString().padStart(14) + ' │ ' +
    (r.offset >= 0 ? '+' : '') + r.offset.toLocaleString().padStart(10) + ' │ ' +
    r.min.toFixed(4).padStart(9) + ' │ ' +
    r.mean.toFixed(4).padStart(9) + ' │ ' +
    r.variation.toFixed(4).padStart(7)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: COMBINED BEST — d-values + differential rates + balanced year
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('5. COMBINED OPTIMIZATION');
console.log('   Best d-values + best differential Ju/Sa rates + best balanced year');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Current baseline
const currentStab = measureStability(buildPlanetData({}), 300);
console.log(`Current (default everything):     min=${currentStab.min.toFixed(4)}%, mean=${currentStab.mean.toFixed(4)}%, var=${currentStab.variation.toFixed(4)}`);

const lockedStab = measureStability(buildPlanetData({ ascRates: lockedRates }), 300);
console.log(`Locked nodes (all at 55):         min=${lockedStab.min.toFixed(4)}%, mean=${lockedStab.mean.toFixed(4)}%, var=${lockedStab.variation.toFixed(4)}`);

// Best d-values from Section 2 with locked nodes
if (dByMin.length > 0) {
  const bestD = dByMin[0];
  const bestDValues = {
    mercury: bestD.d_me_ur, venus: bestD.d_ve_ne, earth: 3,
    mars: bestD.d_ma_ju, jupiter: bestD.d_ma_ju,
    saturn: bestD.d_ea_sa, uranus: bestD.d_me_ur, neptune: bestD.d_ve_ne,
  };
  const bestDStab = measureStability(buildPlanetData({ dValues: bestDValues, ascRates: lockedRates }), 300);
  console.log(`Best d-values + locked nodes:     min=${bestDStab.min.toFixed(4)}%, mean=${bestDStab.mean.toFixed(4)}%, var=${bestDStab.variation.toFixed(4)}  (${bestD.label})`);
}

// Best differential rate from Section 3
if (diffResults.length > 0) {
  const bestDiff = diffResults[0];
  const diffRates = {};
  for (const key of PLANET_KEYS) {
    diffRates[key] = key === 'earth' ? 40 : C.planets[key].ascendingNodeCyclesIn8H;
  }
  diffRates.saturn = bestDiff.saRate;
  const bestDiffStab = measureStability(buildPlanetData({ ascRates: diffRates }), 300);
  console.log(`Best Sa diff rate (${bestDiff.saRate.toFixed(1)}):       min=${bestDiffStab.min.toFixed(4)}%, mean=${bestDiffStab.mean.toFixed(4)}%, var=${bestDiffStab.variation.toFixed(4)}`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('INTERPRETATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('The vector balance has two components:');
console.log('  STATIC:  set by J2000 Ω positions and mean inclinations (~99.6% at J2000)');
console.log('  DYNAMIC: oscillation at different ICRF frequencies causes ±35% variation');
console.log('');
console.log('Locked nodes eliminate the Ω-rotation component, leaving only the');
console.log('inclination oscillation component. The remaining ~8% residual and ~7%');
console.log('variation cannot be eliminated because Jupiter and Saturn oscillate at');
console.log('different, incommensurate ICRF frequencies (H/8 and a non-Fibonacci period).');
console.log('');
console.log('D-value changes can redistribute the oscillation amplitudes but cannot');
console.log('make frequencies commensurable. The fundamental limit is set by orbital');
console.log('mechanics — the ICRF perihelion rates are not free parameters.');
console.log('');
