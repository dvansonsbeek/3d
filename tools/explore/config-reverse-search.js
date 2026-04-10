// ═══════════════════════════════════════════════════════════════════════════
// REVERSE SEARCH: DERIVE D-VALUES FROM LL BOUNDS
// ═══════════════════════════════════════════════════════════════════════════
//
// Instead of searching for the best d-values by balance optimization
// (forward search, done by tools/verify/balance-search.js), this script
// derives d-values from physics:
//
//   1. Laplace-Lagrange bounds give the long-term inclination range
//   2. amplitude = (I_max - I_min) / 2
//   3. d = ψ / (amplitude × √m) → nearest Fibonacci number
//
// If the LL-derived d-values match Config #1, it means the d-values
// can be independently predicted from secular theory — making them
// not just a balance optimization result but a physical prediction.
//
// Also exhaustively searches all d-value × group × scenario combinations
// and ranks Config #1 among all valid configurations.
//
// Usage: node tools/explore/config-reverse-search.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SUPER_PERIOD = 8 * H;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const NP = 8;
const FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55];

// ═══════════════════════════════════════════════════════════════════════════
// OBSERVED DATA
// ═══════════════════════════════════════════════════════════════════════════

const planets = PLANET_KEYS.map(key => {
  const mass = C.massFraction[key];
  const sma = key === 'earth' ? 1.0 : C.derived[key].orbitDistance;
  const ecc = C.eccJ2000[key];
  const L = mass * Math.sqrt(sma * (1 - ecc * ecc));
  const inclJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : C.planets[key].invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : C.planets[key].ascendingNodeInvPlane;
  const sqrtM = Math.sqrt(mass);
  return { key, mass, sqrtM, sma, ecc, L, inclJ2000, omegaJ2000 };
});

// LL bounds from Laskar (2004) — invariable plane inclination ranges over ~4 Myr
// These are the OBSERVED long-term ranges from numerical integration
const llBounds = {
  mercury: { min: 4.57, max: 9.86 },
  venus:   { min: 0.00, max: 3.38 },
  earth:   { min: 0.00, max: 2.95 },
  mars:    { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02 },
  uranus:  { min: 0.902, max: 1.11 },
  neptune: { min: 0.554, max: 0.800 },
};

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     STEP 1 v3: LL-BOUNDS-CONSTRAINED CONFIGURATION DERIVATION           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: DERIVE AMPLITUDES AND D-VALUES FROM LL BOUNDS
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('1. AMPLITUDES AND D-VALUES FROM LL BOUNDS');
console.log('   amplitude = (I_max - I_min) / 2, then d = ψ / (amplitude × √m)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Planet     │ LL range          │ Amplitude │ Mean      │ d_exact │ Nearest Fib │ ψ/(d√m)   │ Match │ J2000 I');
console.log('───────────┼───────────────────┼───────────┼───────────┼─────────┼─────────────┼───────────┼───────┼────────');

const derived = [];

for (let j = 0; j < NP; j++) {
  const pl = planets[j];
  const ll = llBounds[pl.key];
  const amplitude = (ll.max - ll.min) / 2;
  const mean = (ll.max + ll.min) / 2;
  const dExact = amplitude > 0 ? PSI / (amplitude * pl.sqrtM) : Infinity;

  // Find nearest Fibonacci d
  let bestD = 1, bestDiff = Infinity;
  for (const d of FIB_D) {
    const lawAmp = PSI / (d * pl.sqrtM);
    if (Math.abs(lawAmp - amplitude) < bestDiff) { bestDiff = Math.abs(lawAmp - amplitude); bestD = d; }
  }
  const lawAmp = PSI / (bestD * pl.sqrtM);
  const match = amplitude > 0 ? (1 - Math.abs(lawAmp - amplitude) / amplitude) * 100 : 0;

  // Also check: does J2000 inclination fall within the LL range?
  const j2000In = pl.inclJ2000 >= ll.min && pl.inclJ2000 <= ll.max;

  derived.push({
    key: pl.key, llMin: ll.min, llMax: ll.max,
    amplitude, mean, dExact, bestD, lawAmp, match, j2000In,
  });

  console.log(
    pl.key.charAt(0).toUpperCase() + pl.key.slice(1).padEnd(9) + ' │ ' +
    (ll.min.toFixed(2) + '° – ' + ll.max.toFixed(2) + '°').padStart(17) + ' │ ' +
    (amplitude.toFixed(4) + '°').padStart(9) + ' │ ' +
    (mean.toFixed(4) + '°').padStart(9) + ' │ ' +
    dExact.toFixed(2).padStart(7) + ' │ ' +
    (bestD + ' (' + (bestD === (pl.key === 'earth' ? 3 : C.planets[pl.key].fibonacciD) ? '=C1' : '≠C1') + ')').padStart(11) + ' │ ' +
    (lawAmp.toFixed(4) + '°').padStart(9) + ' │ ' +
    match.toFixed(0).padStart(4) + '% │ ' +
    (pl.inclJ2000.toFixed(2) + '°').padStart(6) + (j2000In ? ' ✓' : ' ✗')
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: COMPARE WITH BOTH CANDIDATE CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('2. DERIVED D-VALUES vs CONFIG #1 vs PRESET #346');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const D_C1  = { mercury:21, venus:34, earth:3, mars:5, jupiter:5, saturn:3, uranus:21, neptune:34 };
const D_346 = { mercury:21, venus:34, earth:3, mars:8, jupiter:21, saturn:13, uranus:21, neptune:34 };

console.log('Planet     │ LL-derived │ Config #1 │ Preset 346 │ d_exact │ LL amp   │ C1 amp   │ 346 amp  │ C1 fits LL │ 346 fits LL');
console.log('───────────┼────────────┼───────────┼────────────┼─────────┼──────────┼──────────┼──────────┼────────────┼────────────');

for (let j = 0; j < NP; j++) {
  const d = derived[j];
  const key = d.key;
  const pl = planets[j];
  const c1d = D_C1[key];
  const p346d = D_346[key];
  const c1Amp = PSI / (c1d * pl.sqrtM);
  const p346Amp = PSI / (p346d * pl.sqrtM);
  const ll = llBounds[key];

  // Does Config #1 amplitude fit within LL bounds?
  // mean_c1 = inclJ2000 - sign * c1Amp * cos(phase)
  // For fit check, we just check if mean ± amp ⊂ LL
  // Use the LL-derived mean as approximation
  const c1FitsLL = (d.mean - c1Amp >= ll.min - 0.01) && (d.mean + c1Amp <= ll.max + 0.01);
  const p346FitsLL = (d.mean - p346Amp >= ll.min - 0.01) && (d.mean + p346Amp <= ll.max + 0.01);

  console.log(
    key.charAt(0).toUpperCase() + key.slice(1).padEnd(9) + ' │ ' +
    d.bestD.toString().padStart(10) + ' │ ' +
    c1d.toString().padStart(9) + ' │ ' +
    p346d.toString().padStart(10) + ' │ ' +
    d.dExact.toFixed(2).padStart(7) + ' │ ' +
    (d.amplitude.toFixed(4) + '°').padStart(8) + ' │ ' +
    (c1Amp.toFixed(4) + '°').padStart(8) + ' │ ' +
    (p346Amp.toFixed(4) + '°').padStart(8) + ' │ ' +
    (c1FitsLL ? '     ✓     ' : '     ✗     ') + ' │ ' +
    (p346FitsLL ? '     ✓' : '     ✗')
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: WHICH FIBONACCI D-VALUES FIT WITHIN LL BOUNDS?
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('3. ALL FIBONACCI D-VALUES THAT FIT WITHIN LL BOUNDS');
console.log('   For each planet: which d-values produce amplitudes within LL range?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const validD = {};

for (let j = 0; j < NP; j++) {
  const pl = planets[j];
  const ll = llBounds[pl.key];
  const d = derived[j];

  const valid = [];
  for (const fibD of FIB_D) {
    const amp = PSI / (fibD * pl.sqrtM);
    // Check: mean ± amp must fit within [ll.min, ll.max]
    // We use the LL-derived mean (center of LL range)
    const fitsLL = (d.mean - amp >= ll.min - 0.05) && (d.mean + amp <= ll.max + 0.05);
    // Also check with J2000-derived mean (more realistic)
    // mean_j2000 ≈ inclJ2000 (since J2000 is within range)
    // Actually mean depends on phase angle, so use range check:
    // For any mean in [ll.min + amp, ll.max - amp], the range fits
    const minMean = ll.min + amp;
    const maxMean = ll.max - amp;
    const anyMeanFits = maxMean >= minMean;

    if (anyMeanFits) {
      valid.push({ d: fibD, amp, minMean, maxMean });
    }
  }

  validD[pl.key] = valid;
  const validStr = valid.map(v => `d=${v.d} (amp=${v.amp.toFixed(4)}°)`).join(', ');
  console.log(`${pl.key.charAt(0).toUpperCase() + pl.key.slice(1).padEnd(10)}: ${valid.length > 0 ? validStr : 'NONE — LL range too narrow!'}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: EXHAUSTIVE SEARCH OF ALL VALID CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('4. EXHAUSTIVE SEARCH: ALL CONFIGURATIONS SATISFYING LL BOUNDS');
console.log('   Test ALL combinations of valid d-values × group assignments');
console.log('   Score by scalar balance + eccentricity balance');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// For each planet: valid d-values from section 3
// Earth is locked at d=3, in-phase
const searchPlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Count total combinations
let totalCombos = 1;
for (const key of searchPlanets) {
  totalCombos *= validD[key].length * 2; // d-values × 2 groups
}
console.log(`Total combinations: ${totalCombos.toLocaleString()}`);
console.log('');

const results = [];

function searchRecursive(idx, config) {
  if (idx === searchPlanets.length) {
    // Evaluate this configuration
    const d = { earth: 3 };
    const groups = { earth: false };
    for (const key of searchPlanets) {
      d[key] = config[key].d;
      groups[key] = config[key].antiPhase;
    }

    // Scalar inclination balance
    let wIn = 0, wAnti = 0;
    for (const key of PLANET_KEYS) {
      const pl = planets[PLANET_KEYS.indexOf(key)];
      const w = Math.sqrt(pl.mass * pl.sma * (1 - pl.ecc * pl.ecc)) / d[key];
      if (groups[key]) wAnti += w; else wIn += w;
    }
    const inclBal = (1 - Math.abs(wIn - wAnti) / (wIn + wAnti)) * 100;

    // Scalar eccentricity balance (using base eccentricities)
    let vIn = 0, vAnti = 0;
    for (const key of PLANET_KEYS) {
      const pl = planets[PLANET_KEYS.indexOf(key)];
      const eccBase = key === 'earth' ? C.eccentricityBase : C.planets[key].orbitalEccentricityBase;
      const v = pl.sqrtM * Math.pow(pl.sma, 1.5) * eccBase / Math.sqrt(d[key]);
      if (groups[key]) vAnti += v; else vIn += v;
    }
    const eccBal = (1 - Math.abs(vIn - vAnti) / (vIn + vAnti)) * 100;

    // Mirror symmetry check
    const mirror = (d.mercury === d.uranus) + (d.venus === d.neptune) +
                   (d.mars === d.jupiter) + (d.earth === d.saturn);

    // Only keep configs with inclination balance > 95%
    if (inclBal < 95) return;

    results.push({
      d: { ...d }, groups: { ...groups },
      inclBal, eccBal, mirror,
      dLabel: `Me${d.mercury} Ve${d.venus} Ma${d.mars} Ju${d.jupiter} Sa${d.saturn} Ur${d.uranus} Ne${d.neptune}`,
      antiLabel: PLANET_KEYS.filter(k => groups[k]).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('+') || '(none)',
    });
    return;
  }

  const key = searchPlanets[idx];
  for (const vd of validD[key]) {
    for (const antiPhase of [false, true]) {
      config[key] = { d: vd.d, antiPhase };
      searchRecursive(idx + 1, config);
    }
  }
}

searchRecursive(0, {});

console.log(`Configs with incl balance > 95%: ${results.length}`);

// Sort by combined score: inclBal + eccBal + mirror bonus
results.sort((a, b) => {
  const scoreA = a.inclBal + a.eccBal + a.mirror * 5;
  const scoreB = b.inclBal + b.eccBal + b.mirror * 5;
  return scoreB - scoreA;
});

console.log('');
console.log('TOP 30 BY COMBINED SCORE (incl bal + ecc bal + mirror bonus):');
console.log('');
console.log('Rk │ d-values                              │ Anti-phase              │ Incl bal │ Ecc bal  │ Mirr │ Score');
console.log('───┼───────────────────────────────────────┼─────────────────────────┼──────────┼──────────┼──────┼──────');

for (let i = 0; i < Math.min(30, results.length); i++) {
  const r = results[i];
  const score = r.inclBal + r.eccBal + r.mirror * 5;
  console.log(
    (i + 1).toString().padStart(2) + ' │ ' +
    r.dLabel.padEnd(37) + ' │ ' +
    r.antiLabel.padEnd(23) + ' │ ' +
    r.inclBal.toFixed(4).padStart(8) + ' │ ' +
    r.eccBal.toFixed(4).padStart(8) + ' │ ' +
    (r.mirror + '/4').padStart(4) + ' │ ' +
    score.toFixed(1).padStart(5)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: TOP CONFIGS - DETAILED ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('5. DETAILED ANALYSIS OF TOP 5');
console.log('═══════════════════════════════════════════════════════════════════════════');

for (let i = 0; i < Math.min(5, results.length); i++) {
  const r = results[i];
  console.log(`\n--- #${i+1}: ${r.dLabel} ---`);
  console.log(`  Anti-phase: ${r.antiLabel}`);
  console.log(`  Inclination balance: ${r.inclBal.toFixed(6)}%`);
  console.log(`  Eccentricity balance: ${r.eccBal.toFixed(4)}%`);
  console.log(`  Mirror pairs: ${r.mirror}/4`);

  console.log('  Planet     │ d  │ Group     │ LL amp    │ Law amp   │ LL range');
  for (const key of PLANET_KEYS) {
    const pl = planets[PLANET_KEYS.indexOf(key)];
    const d = r.d[key];
    const amp = PSI / (d * pl.sqrtM);
    const ll = llBounds[key];
    const llAmp = (ll.max - ll.min) / 2;
    console.log(
      '  ' + key.charAt(0).toUpperCase() + key.slice(1).padEnd(9) + ' │ ' +
      d.toString().padStart(2) + ' │ ' +
      (r.groups[key] ? 'anti-phase' : 'in-phase').padEnd(9) + ' │ ' +
      (llAmp.toFixed(4) + '°').padStart(9) + ' │ ' +
      (amp.toFixed(4) + '°').padStart(9) + ' │ ' +
      ll.min.toFixed(2) + '° – ' + ll.max.toFixed(2) + '°'
    );
  }

  // Fibonacci structure
  const dVals = PLANET_KEYS.map(k => r.d[k]);
  const fibChain = [];
  for (let a = 0; a < NP; a++) {
    for (let b = a + 1; b < NP; b++) {
      for (let c = 0; c < NP; c++) {
        if (c === a || c === b) continue;
        if (dVals[a] + dVals[b] === dVals[c]) {
          fibChain.push(`${PLANET_KEYS[a]}(${dVals[a]}) + ${PLANET_KEYS[b]}(${dVals[b]}) = ${PLANET_KEYS[c]}(${dVals[c]})`);
        }
      }
    }
  }
  if (fibChain.length > 0) {
    console.log('  Fibonacci chains:');
    for (const chain of fibChain) console.log('    ' + chain);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: IS CONFIG #1 IN THE RESULTS?
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('6. IS CONFIG #1 IN THE RESULTS?');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const c1match = results.find(r =>
  r.d.mercury === 21 && r.d.venus === 34 && r.d.mars === 5 &&
  r.d.jupiter === 5 && r.d.saturn === 3 && r.d.uranus === 21 && r.d.neptune === 34 &&
  r.groups.saturn === true &&
  Object.keys(r.groups).filter(k => r.groups[k]).length === 1
);

if (c1match) {
  const rank = results.indexOf(c1match) + 1;
  console.log(`Config #1 found at rank ${rank}/${results.length}`);
  console.log(`  Incl balance: ${c1match.inclBal.toFixed(4)}%  Ecc balance: ${c1match.eccBal.toFixed(4)}%  Mirror: ${c1match.mirror}/4`);
} else {
  // Check if Config #1 d-values even pass LL bounds
  console.log('Config #1 NOT in results. Checking why:');
  for (const key of PLANET_KEYS) {
    const pl = planets[PLANET_KEYS.indexOf(key)];
    const d = D_C1[key];
    const amp = PSI / (d * pl.sqrtM);
    const ll = llBounds[key];
    const meanLL = (ll.max + ll.min) / 2;
    const fits = (meanLL - amp >= ll.min - 0.05) && (meanLL + amp <= ll.max + 0.05);
    if (!fits) {
      console.log(`  ✗ ${key}: d=${d} gives amp=${amp.toFixed(4)}° but LL range only ${(ll.max-ll.min)/2}° half-width`);
    }
  }
}

console.log('');
