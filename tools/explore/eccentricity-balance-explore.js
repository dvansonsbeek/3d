#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// ECCENTRICITY BALANCE — POWER LAW ANALYSIS
//
// Tests which power γ of eccentricity produces optimal balance:
//   v_j = √m × a^1.5 × e^γ / √d
//
// Key question: is linear e (γ=1) exactly optimal with base
// eccentricities? This would confirm the balance formula is the
// unique correct form — not e², not √e, not any other power.
//
// Three eccentricity sets compared:
//   A) J2000 snapshot eccentricities
//   B) Base eccentricities (dual-balanced, from model)
//   C) Base with e^γ (sweep γ to find optimal)
//
// If base eccentricities give exact 100% at γ=1.0 and any
// departure from γ=1 degrades the balance, it proves the linear
// formula is structurally exact — not an approximation.
//
// RESULT: With base eccentricities, optimal γ = 1.00004 — confirming
// linear e is the exact correct form. Quadratic e² (AMD) gives only
// 89.6% balance vs 99.999% for linear. The formula v = √m × a^1.5 × e / √d
// is sharply tuned: even γ = 1.001 degrades balance by 0.015%.
//
// Usage: node tools/explore/eccentricity-balance-explore.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// d-values (Config #1)
const d = { mercury: 21, venus: 34, earth: 3, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };

// J2000 eccentricities
const eccJ2000 = C.eccJ2000;

// Base eccentricities (dual-balanced)
const eccBase = {};
for (const key of planets) {
  if (key === 'earth') eccBase[key] = C.eccentricityBase;
  else eccBase[key] = C.planets[key].orbitalEccentricityBase;
}

function getMass(planet) { return C.massFraction[planet]; }
function getSMA(planet) {
  if (planet === 'earth') return 1.0;
  const syi = C.planets[planet].solarYearInput;
  const count = Math.round(C.totalDaysInH / syi);
  return Math.pow(Math.pow(C.H / count, 2), 1/3);
}

// Compute balance with arbitrary eccentricity set and power γ
function computeBalance(eccs, gamma) {
  let sumIn = 0, sumAnti = 0;
  for (const p of planets) {
    const v = Math.sqrt(getMass(p)) * Math.pow(getSMA(p), 1.5) * Math.pow(eccs[p], gamma) / Math.sqrt(d[p]);
    if (p === 'saturn') sumAnti += v;
    else sumIn += v;
  }
  const total = sumIn + sumAnti;
  return (1 - Math.abs(sumIn - sumAnti) / total) * 100;
}

// Find optimal γ by golden-section search
function findOptimalGamma(eccs, lo, hi, tol) {
  const phi = (1 + Math.sqrt(5)) / 2;
  let a = lo, b = hi;
  let c = b - (b - a) / phi;
  let dd = a + (b - a) / phi;
  while (Math.abs(b - a) > tol) {
    const fc = computeBalance(eccs, c);
    const fd = computeBalance(eccs, dd);
    if (fc > fd) { b = dd; } else { a = c; }
    c = b - (b - a) / phi;
    dd = a + (b - a) / phi;
  }
  return (a + b) / 2;
}

// ═══════════════════════════════════════════════════════════════
console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     ECCENTRICITY BALANCE — POWER LAW ANALYSIS                           ║');
console.log('║     Which power γ of eccentricity gives optimal balance?                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Balance at γ=1 for both eccentricity sets
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('1. BALANCE AT γ = 1.0 (linear eccentricity)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`  J2000 eccentricities:  ${computeBalance(eccJ2000, 1.0).toFixed(6)}%`);
console.log(`  Base eccentricities:   ${computeBalance(eccBase, 1.0).toFixed(6)}%`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Optimal γ for each set
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('2. OPTIMAL γ (golden-section search in [0.5, 2.0])');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const optJ2000 = findOptimalGamma(eccJ2000, 0.5, 2.0, 1e-8);
const optBase = findOptimalGamma(eccBase, 0.5, 2.0, 1e-8);

console.log(`  J2000: optimal γ = ${optJ2000.toFixed(8)} → balance = ${computeBalance(eccJ2000, optJ2000).toFixed(6)}%`);
console.log(`  Base:  optimal γ = ${optBase.toFixed(8)} → balance = ${computeBalance(eccBase, optBase).toFixed(6)}%`);
console.log('');
console.log(`  J2000 deviation from linear: γ - 1.0 = ${(optJ2000 - 1).toFixed(8)}`);
console.log(`  Base deviation from linear:  γ - 1.0 = ${(optBase - 1).toFixed(8)}`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SECTION 3: γ sweep — how balance varies with power
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('3. γ SWEEP (balance vs power)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('  γ        │ J2000 balance  │ Base balance   │ Note');
console.log('  ─────────┼────────────────┼────────────────┼──────────────');

const gammaTests = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 0.99, 1.0, 1.01, 1.02, 1.05, 1.1, 1.2, 1.5, 2.0];
for (const g of gammaTests) {
  const bJ = computeBalance(eccJ2000, g);
  const bB = computeBalance(eccBase, g);
  const note = g === 1.0 ? '← LINEAR (Law 5)' :
               g === 2.0 ? '← QUADRATIC (AMD)' :
               g === 0.5 ? '← SQRT' :
               Math.abs(g - optJ2000) < 0.005 ? '← J2000 optimal' :
               Math.abs(g - optBase) < 0.005 ? '← Base optimal' : '';
  console.log(`  ${g.toFixed(2).padStart(5)}     │ ${bJ.toFixed(6).padStart(12)}% │ ${bB.toFixed(6).padStart(12)}% │ ${note}`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Sensitivity — how fast does balance degrade?
// ═══════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('4. SENSITIVITY — Balance degradation near γ = 1.0');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const deltas = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1];
console.log('  Δγ       │ Base balance at 1+Δ  │ Base balance at 1-Δ  │ Degradation');
console.log('  ─────────┼──────────────────────┼──────────────────────┼────────────');
const baseAt1 = computeBalance(eccBase, 1.0);
for (const delta of deltas) {
  const bPlus = computeBalance(eccBase, 1.0 + delta);
  const bMinus = computeBalance(eccBase, 1.0 - delta);
  const worstDeg = baseAt1 - Math.min(bPlus, bMinus);
  console.log(`  ${delta.toFixed(3).padStart(6)}   │ ${bPlus.toFixed(6).padStart(12)}%       │ ${bMinus.toFixed(6).padStart(12)}%       │ ${worstDeg.toFixed(6)}%`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Comparison with AMD weighting (γ=2)
// ═══════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('5. LINEAR (γ=1) vs QUADRATIC (γ=2, AMD)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
const bLin = computeBalance(eccBase, 1.0);
const bQuad = computeBalance(eccBase, 2.0);
console.log(`  Linear e (γ=1):    ${bLin.toFixed(6)}%`);
console.log(`  Quadratic e² (γ=2): ${bQuad.toFixed(6)}%`);
console.log(`  Improvement at γ=1: ${(bLin - bQuad).toFixed(4)} percentage points`);
console.log('');
if (bLin > bQuad + 0.1) {
  console.log('  → Linear eccentricity is STRONGLY preferred over quadratic.');
  console.log('    The balance operates on a first-order secular quantity,');
  console.log('    not the quadratic AMD.');
} else {
  console.log('  → Both weightings give similar balance.');
}

// ═══════════════════════════════════════════════════════════════
// CONCLUSION
// ═══════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

if (Math.abs(optBase - 1.0) < 0.001) {
  console.log('  ★ With base eccentricities, γ = 1.0 IS the optimal power.');
  console.log('    The linear eccentricity formula v = √m × a^1.5 × e / √d');
  console.log('    is the EXACT correct form — not an approximation.');
  console.log('    Any departure from γ = 1 degrades the balance.');
} else {
  console.log(`  With base eccentricities, optimal γ = ${optBase.toFixed(6)} (differs from 1.0 by ${Math.abs(optBase - 1).toFixed(6)}).`);
  console.log('  The linear formula is close but not exactly optimal.');
}
console.log('');
