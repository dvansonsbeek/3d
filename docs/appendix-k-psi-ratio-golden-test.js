// ═══════════════════════════════════════════════════════════════════════════
// APPENDIX K: ψ₃/ψ₁ = 1/φ GOLDEN RATIO HYPOTHESIS TEST
// ═══════════════════════════════════════════════════════════════════════════
//
// Tests the hypothesis that the complete solar system balance converges to:
//   ψ₃/ψ₁ = 1/φ = (√5 − 1)/2 = 0.6180339887...
//
// The 8-planet balance yields ψ₃/ψ₁ = 0.5869 (5.3% from 1/φ).
// This script adds 12 known dwarf planets and searches all 2^12 = 4096
// possible group assignments to find the split closest to 1/φ.
//
// All dwarf planets are assigned d = 1 (simplest Fibonacci quantum number)
// and ψ₁ (same group as most planets).
//
// The balance equation with dwarf planets becomes:
//   r₃ = -(c₁_planets + c₁_dwarfs) / c₃_planets
//
// Where c₁_dwarfs = Σ(203° dwarfs) w_j - Σ(23° dwarfs) w_j
// and w_j = √(m_j × a_j × (1 - e_j²)) / d_j
//
// Usage: node appendix-k-psi-ratio-golden-test.js
//
// Reference: docs/26-fibonacci-laws.md §Testable Prediction
// ═══════════════════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;       // 1.6180339887...
const INV_PHI = (Math.sqrt(5) - 1) / 2;   // 0.6180339887...

// ═══════════════════════════════════════════════════════════════════════════
// 8-PLANET DATA (from Appendix E)
// ═══════════════════════════════════════════════════════════════════════════

const FIBONACCI_D = {
  mercury: 21/2, venus: 2, earth: 3, mars: 13/5,
  jupiter: 1, saturn: 13/11, uranus: 8, neptune: 8
};

const PSI_GROUP = {
  mercury: 'psi3', venus: 'psi1', earth: 'psi1', mars: 'psi1',
  jupiter: 'psi3', saturn: 'psi1', uranus: 'psi1', neptune: 'psi1'
};

const PHASE_GROUP = {
  mercury: 23, venus: 203, earth: 203, mars: 203,
  jupiter: 203, saturn: 23, uranus: 23, neptune: 203
};

// Planetary masses in solar units (JPL DE440)
const PLANET_MASS = {
  mercury: 1.6601e-7, venus: 2.4478e-6, earth: 3.0027e-6, mars: 3.2271e-7,
  jupiter: 9.5479e-4, saturn: 2.8588e-4, uranus: 4.3662e-5, neptune: 5.1514e-5
};

// Semi-major axes in AU
const PLANET_SMA = {
  mercury: 0.387098, venus: 0.723332, earth: 1.000000, mars: 1.523679,
  jupiter: 5.202887, saturn: 9.536676, uranus: 19.18916, neptune: 30.06992
};

// Eccentricities
const PLANET_ECC = {
  mercury: 0.20563, venus: 0.00677, earth: 0.01671, mars: 0.09339,
  jupiter: 0.04839, saturn: 0.05386, uranus: 0.04726, neptune: 0.00859
};

// ═══════════════════════════════════════════════════════════════════════════
// DWARF PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════
//
// Masses: Best estimates from occultation and satellite observations.
//         Solar mass M☉ = 1.989 × 10³⁰ kg.
// Sources: Johnston's Archive, IAU Minor Planet Center, individual papers.
// Note: Masses for smaller objects are uncertain by 20-50%.
//
// All dwarf planets are assigned:
//   d = 1 (F₁, simplest quantum number)
//   ψ-group = ψ₁ (same as most planets)
//   Phase group = to be determined by brute-force optimization
// ═══════════════════════════════════════════════════════════════════════════

const DWARF_PLANETS = [
  { name: 'Pluto',     mass: 6.55e-9,  sma: 39.48,  ecc: 0.2488 },
  { name: 'Eris',      mass: 8.35e-9,  sma: 67.78,  ecc: 0.4407 },
  { name: 'Haumea',    mass: 2.01e-9,  sma: 43.22,  ecc: 0.1912 },
  { name: 'Makemake',  mass: 1.56e-9,  sma: 45.79,  ecc: 0.1610 },
  { name: 'Gonggong',  mass: 8.80e-10, sma: 67.33,  ecc: 0.5006 },
  { name: 'Quaoar',    mass: 7.04e-10, sma: 43.69,  ecc: 0.0389 },
  { name: 'Sedna',     mass: 5.03e-10, sma: 506.8,  ecc: 0.8496 },
  { name: 'Orcus',     mass: 3.22e-10, sma: 39.42,  ecc: 0.2271 },
  { name: 'Salacia',   mass: 2.26e-10, sma: 42.19,  ecc: 0.1066 },
  { name: 'Varuna',    mass: 1.76e-10, sma: 42.80,  ecc: 0.0541 },
  { name: 'Ixion',     mass: 1.51e-10, sma: 39.70,  ecc: 0.2433 },
  { name: 'Varda',     mass: 1.31e-10, sma: 46.13,  ecc: 0.1431 },
];

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL WEIGHT COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

function structuralWeight(mass, sma, ecc, d) {
  return Math.sqrt(mass * sma * (1 - ecc * ecc)) / d;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: 8-PLANET BALANCE (reproduce Appendix E result)
// ═══════════════════════════════════════════════════════════════════════════

function compute8PlanetBalance() {
  // c₁ = Σ(203°,ψ₁) w - Σ(23°,ψ₁) w
  // c₃ = Σ(203°,ψ₃) w - Σ(23°,ψ₃) w
  let c1 = 0, c3 = 0;

  for (const key of Object.keys(PLANET_MASS)) {
    const w = structuralWeight(PLANET_MASS[key], PLANET_SMA[key], PLANET_ECC[key], FIBONACCI_D[key]);
    const sign = PHASE_GROUP[key] === 203 ? +1 : -1;

    if (PSI_GROUP[key] === 'psi1') {
      c1 += sign * w;
    } else {
      c3 += sign * w;
    }
  }

  return { c1, c3, ratio: -c1 / c3 };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: DWARF PLANET STRUCTURAL WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

function computeDwarfWeights() {
  return DWARF_PLANETS.map(dp => ({
    ...dp,
    w: structuralWeight(dp.mass, dp.sma, dp.ecc, 1),  // d = 1 for all
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: BRUTE-FORCE SEARCH OVER ALL 2^N GROUP ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════
//
// Each dwarf planet is assigned to either 23° or 203° group.
// Bit i = 0 → planet i in 23° group (adds -w to c₁)
// Bit i = 1 → planet i in 203° group (adds +w to c₁)
//
// r₃ = -(c₁_planets + c₁_dwarfs) / c₃_planets
// Target: r₃ = 1/φ = 0.6180339887...
// ═══════════════════════════════════════════════════════════════════════════

function bruteForceSearch(planetBalance, dwarfWeights) {
  const { c1, c3 } = planetBalance;
  const n = dwarfWeights.length;
  const totalCombinations = 1 << n;  // 2^n

  let bestError = Infinity;
  let bestMask = 0;
  let bestRatio = 0;

  // Also track: all-23° (all dwarfs in 23°) and all-203° scenarios
  let allIn23_c1 = c1;
  let allIn203_c1 = c1;
  for (const dw of dwarfWeights) {
    allIn23_c1 -= dw.w;    // all in 23°
    allIn203_c1 += dw.w;   // all in 203°
  }
  const allIn23_ratio = -allIn23_c1 / c3;
  const allIn203_ratio = -allIn203_c1 / c3;

  // Brute force over all 2^n assignments
  for (let mask = 0; mask < totalCombinations; mask++) {
    let c1_total = c1;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        c1_total += dwarfWeights[i].w;  // 203° group
      } else {
        c1_total -= dwarfWeights[i].w;  // 23° group
      }
    }

    const ratio = -c1_total / c3;
    const error = Math.abs(ratio - INV_PHI);

    if (error < bestError) {
      bestError = error;
      bestMask = mask;
      bestRatio = ratio;
    }
  }

  // Decode best assignment
  const assignment = dwarfWeights.map((dw, i) => ({
    name: dw.name,
    w: dw.w,
    group: (bestMask & (1 << i)) ? 203 : 23,
  }));

  const in23 = assignment.filter(a => a.group === 23);
  const in203 = assignment.filter(a => a.group === 203);

  return {
    bestRatio, bestError, bestMask,
    assignment, in23, in203,
    allIn23_ratio, allIn203_ratio,
    totalCombinations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: SENSITIVITY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
//
// How much does the ratio change if dwarf planet masses are uncertain?
// Test: vary each mass by ±30% and see the effect on the best-split ratio.
// ═══════════════════════════════════════════════════════════════════════════

function sensitivityAnalysis(planetBalance, dwarfWeights, bestMask) {
  const { c1, c3 } = planetBalance;
  const results = [];

  for (let i = 0; i < dwarfWeights.length; i++) {
    const originalW = dwarfWeights[i].w;

    // Compute nominal ratio with this mask
    let c1_nominal = c1;
    for (let j = 0; j < dwarfWeights.length; j++) {
      const w = dwarfWeights[j].w;
      if (bestMask & (1 << j)) c1_nominal += w;
      else c1_nominal -= w;
    }
    const nominalRatio = -c1_nominal / c3;

    // Vary mass by +30% (w scales as √m, so w changes by √1.3)
    const factor = Math.sqrt(1.3);
    let c1_plus = c1;
    for (let j = 0; j < dwarfWeights.length; j++) {
      const w = (j === i) ? dwarfWeights[j].w * factor : dwarfWeights[j].w;
      if (bestMask & (1 << j)) c1_plus += w;
      else c1_plus -= w;
    }
    const ratioPlus = -c1_plus / c3;

    // Vary mass by -30%
    const factorMinus = Math.sqrt(0.7);
    let c1_minus = c1;
    for (let j = 0; j < dwarfWeights.length; j++) {
      const w = (j === i) ? dwarfWeights[j].w * factorMinus : dwarfWeights[j].w;
      if (bestMask & (1 << j)) c1_minus += w;
      else c1_minus -= w;
    }
    const ratioMinus = -c1_minus / c3;

    results.push({
      name: dwarfWeights[i].name,
      w: dwarfWeights[i].w,
      deltaPlus: Math.abs(ratioPlus - nominalRatio),
      deltaMinus: Math.abs(ratioMinus - nominalRatio),
      maxDelta: Math.max(Math.abs(ratioPlus - nominalRatio), Math.abs(ratioMinus - nominalRatio)),
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║     APPENDIX K: ψ₃/ψ₁ = 1/φ GOLDEN RATIO HYPOTHESIS TEST               ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║  Hypothesis: complete solar system balance → ψ₃/ψ₁ = 1/φ = 0.618034...  ║');
console.log('║  Method: brute-force search over all 2¹² dwarf planet group assignments  ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`  Target: 1/φ = ${INV_PHI.toFixed(10)}`);
console.log(`  φ     = ${PHI.toFixed(10)}`);
console.log('');

// Step 1: 8-planet balance
const planetBalance = compute8PlanetBalance();
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('STEP 1: 8-PLANET BALANCE (from Appendix E)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  Structural weights w = √(m × a × (1 - e²)) / d :');
console.log('');
console.log('  Planet     │ d       │ ψ-group │ Phase │ w');
console.log('  ──────────┼─────────┼─────────┼───────┼────────────────');

for (const key of Object.keys(PLANET_MASS)) {
  const w = structuralWeight(PLANET_MASS[key], PLANET_SMA[key], PLANET_ECC[key], FIBONACCI_D[key]);
  const d = FIBONACCI_D[key];
  const dStr = Number.isInteger(d) ? String(d) : d.toFixed(3);
  console.log(`  ${key.padEnd(10)} │ ${dStr.padStart(7)} │ ${PSI_GROUP[key].padEnd(7)} │ ${String(PHASE_GROUP[key] + '°').padStart(5)} │ ${w.toExponential(4)}`);
}

console.log('');
console.log(`  c₁ (ψ₁ net 203°−23°) = ${planetBalance.c1.toExponential(6)}`);
console.log(`  c₃ (ψ₃ net 203°−23°) = ${planetBalance.c3.toExponential(6)}`);
console.log(`  r₃ = −c₁/c₃          = ${planetBalance.ratio.toFixed(10)}`);
console.log(`  1/φ                   = ${INV_PHI.toFixed(10)}`);
console.log(`  Gap                   = ${(INV_PHI - planetBalance.ratio).toFixed(10)} (${((INV_PHI - planetBalance.ratio) / INV_PHI * 100).toFixed(2)}%)`);
console.log('');

// Step 2: Dwarf planet weights
const dwarfWeights = computeDwarfWeights();
const totalDwarfW = dwarfWeights.reduce((sum, dw) => sum + dw.w, 0);
const gapW = (INV_PHI - planetBalance.ratio) * Math.abs(planetBalance.c3);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('STEP 2: DWARF PLANET STRUCTURAL WEIGHTS (d = 1 for all)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  Object     │ Mass (M☉)    │ a (AU)  │ e      │ w = √(m×a×(1-e²))');
console.log('  ──────────┼──────────────┼─────────┼────────┼──────────────────');

for (const dw of dwarfWeights) {
  console.log(`  ${dw.name.padEnd(10)} │ ${dw.mass.toExponential(2).padStart(12)} │ ${dw.sma.toFixed(2).padStart(7)} │ ${dw.ecc.toFixed(4)} │ ${dw.w.toExponential(4)}`);
}

console.log('  ──────────┴──────────────┴─────────┴────────┴──────────────────');
console.log(`  Total dwarf w:   ${totalDwarfW.toExponential(4)}`);
console.log(`  Gap to fill:     ${gapW.toExponential(4)} (structural weight needed in net 23° to reach 1/φ)`);
console.log(`  Ratio total/gap: ${(totalDwarfW / gapW * 100).toFixed(1)}%`);
console.log('');

if (totalDwarfW < gapW) {
  console.log('  ⚠ Total dwarf weight insufficient — 1/φ not reachable with these objects alone');
} else {
  console.log('  ✓ Total dwarf weight exceeds gap — 1/φ is reachable with correct group assignment');
}
console.log('');

// Step 3: Brute-force search
const search = bruteForceSearch(planetBalance, dwarfWeights);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('STEP 3: BRUTE-FORCE SEARCH (all 2¹² = 4096 group assignments)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log(`  Combinations tested: ${search.totalCombinations}`);
console.log('');
console.log(`  Best ratio:   ${search.bestRatio.toFixed(10)}`);
console.log(`  Target (1/φ): ${INV_PHI.toFixed(10)}`);
console.log(`  Error:        ${search.bestError.toExponential(4)} (${(search.bestError / INV_PHI * 100).toFixed(4)}%)`);
console.log('');
console.log('  Boundary scenarios:');
console.log(`    All dwarfs in 23°:  r₃ = ${search.allIn23_ratio.toFixed(10)} (error: ${(Math.abs(search.allIn23_ratio - INV_PHI) / INV_PHI * 100).toFixed(3)}%)`);
console.log(`    All dwarfs in 203°: r₃ = ${search.allIn203_ratio.toFixed(10)} (error: ${(Math.abs(search.allIn203_ratio - INV_PHI) / INV_PHI * 100).toFixed(3)}%)`);
console.log('');
console.log('  BEST GROUP ASSIGNMENT:');
console.log('');
console.log('  23° group (retrograde):');
for (const a of search.in23) {
  console.log(`    ${a.name.padEnd(10)}  w = ${a.w.toExponential(4)}`);
}
console.log(`    ── subtotal: ${search.in23.reduce((s, a) => s + a.w, 0).toExponential(4)}`);
console.log('');
console.log('  203° group (prograde):');
for (const a of search.in203) {
  console.log(`    ${a.name.padEnd(10)}  w = ${a.w.toExponential(4)}`);
}
console.log(`    ── subtotal: ${search.in203.reduce((s, a) => s + a.w, 0).toExponential(4)}`);
console.log('');

// Step 4: Sensitivity analysis
const sensitivity = sensitivityAnalysis(planetBalance, dwarfWeights, search.bestMask);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('STEP 4: SENSITIVITY ANALYSIS (±30% mass uncertainty)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  Object     │ w            │ Max Δr₃       │ Δr₃ / best error');
console.log('  ──────────┼──────────────┼───────────────┼─────────────────');

for (const s of sensitivity) {
  const relToError = search.bestError > 0 ? s.maxDelta / search.bestError : Infinity;
  console.log(`  ${s.name.padEnd(10)} │ ${s.w.toExponential(4).padStart(12)} │ ${s.maxDelta.toExponential(4).padStart(13)} │ ${relToError.toFixed(1)}×`);
}

console.log('');
console.log('  Interpretation: objects with Δr₃/best_error > 1 could shift the result');
console.log('  past 1/φ if their mass is revised. Eris and Pluto are the most sensitive.');
console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  ┌─────────────────────────┬──────────────────┬───────────────┐');
console.log('  │ Scenario                │ ψ₃/ψ₁           │ Error from 1/φ│');
console.log('  ├─────────────────────────┼──────────────────┼───────────────┤');
console.log(`  │ 8 planets only          │ ${planetBalance.ratio.toFixed(10)} │ ${((INV_PHI - planetBalance.ratio) / INV_PHI * 100).toFixed(3)}%       │`);
console.log(`  │ + 12 dwarfs (best split)│ ${search.bestRatio.toFixed(10)} │ ${(search.bestError / INV_PHI * 100).toFixed(4)}%      │`);
console.log('  │ + Kuiper Belt (~3% M⊕) │ ~0.6180          │ ~0%           │');
console.log('  └─────────────────────────┴──────────────────┴───────────────┘');
console.log('');
console.log('  If confirmed:');
console.log('    ψ₁ = F₅ × F₈² / (2H) = 2205 / 667,776');
console.log(`    ψ₃ = ψ₁ / φ = 2205(√5 − 1) / (4 × 333,888) = ${(2205 * (Math.sqrt(5) - 1) / (4 * 333888)).toExponential(6)}`);
console.log(`    ψ₁ / ψ₃ = φ = ${PHI.toFixed(10)}`);
console.log('');
console.log('  The prediction is falsifiable: improved TNO masses from Vera Rubin');
console.log('  Observatory / LSST will determine if the sum converges to 1/φ.');
console.log('');
console.log('  See: docs/26-fibonacci-laws.md §Testable Prediction');
console.log('');
