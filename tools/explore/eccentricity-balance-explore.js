// ═══════════════════════════════════════════════════════════════
// Eccentricity Balance Explorer
// Goal: Find what tweaks can bring Law 5 balance from 99.89% to 100%
//
// The eccentricity balance formula: v_j = √m_j × a_j^(3/2) × e_j / √d_j
// Two phase groups must sum to equal: Σ(prograde) v_j = Σ(anti-phase) v_j
// Saturn is the only anti-phase planet, so: v_Saturn = Σ(other 7 planets)
//
// Usage: node tools/explore/eccentricity-balance-explore.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const MSY = C.meanSolarYearDays;

// Current SolarYearInputs
const SYI = {};
for (const [k, p] of Object.entries(C.planets)) SYI[k] = p.solarYearInput;

function getMass(planet) {
  return C.massFraction[planet];
}

function getSMA(planet, syiOverrides) {
  if (planet === 'earth') return 1.0;
  const syi = syiOverrides?.[planet] ?? SYI[planet];
  const count = Math.round(C.totalDaysInH / syi);
  return Math.pow(Math.pow(H / count, 2), 1/3);
}

// J2000 eccentricities (all 8 planets from constants.js)
const eccJ2000 = C.eccJ2000;

// Circular orbit eccentricities: e/(1+e)
const eccCircular = {};
for (const [k, e] of Object.entries(eccJ2000)) {
  eccCircular[k] = e / (1 + e);
}

// Config #3 d-values and phases
const d = { mercury: 21, venus: 34, earth: 3, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
const isSaturn23 = true; // Saturn is the only anti-phase planet

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

function computeEccBalance(eccOverrides, syiOverrides) {
  let sum203 = 0, sum23 = 0;
  const weights = {};
  for (const p of planets) {
    const m = getMass(p);
    const a = getSMA(p, syiOverrides);
    const e = eccOverrides?.[p] ?? eccJ2000[p];
    const v = Math.sqrt(m) * Math.pow(a, 1.5) * e / Math.sqrt(d[p]);
    weights[p] = v;
    if (p === 'saturn') sum23 += v;
    else sum203 += v;
  }
  const total = sum203 + sum23;
  const gap = Math.abs(sum203 - sum23);
  const balance = (1 - gap / total) * 100;
  return { balance, sum203, sum23, gap, total, weights };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Current state
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('ECCENTRICITY BALANCE EXPLORER');
console.log('═══════════════════════════════════════════════════════════════');

const base = computeEccBalance();
console.log(`\nCurrent balance: ${base.balance.toFixed(6)}%`);
console.log(`  Σ(prograde) = ${base.sum203.toExponential(10)}`);
console.log(`  Σ(anti-phase)  = ${base.sum23.toExponential(10)}  (Saturn only)`);
console.log(`  Gap     = ${base.gap.toExponential(6)}`);
console.log(`  Gap is on the ${base.sum23 > base.sum203 ? 'anti-phase (Saturn)' : 'prograde'} side`);

console.log('\nPer-planet v-weights:');
console.log('Planet      √m          a^(3/2)      e            1/√d        v_j              % of total');
for (const p of planets) {
  const m = getMass(p);
  const a = getSMA(p);
  const e = eccJ2000[p];
  const sqrtM = Math.sqrt(m);
  const a32 = Math.pow(a, 1.5);
  const invSqrtD = 1 / Math.sqrt(d[p]);
  const v = base.weights[p];
  const pct = (v / base.total * 100).toFixed(2);
  console.log(`${p.padEnd(10)}  ${sqrtM.toExponential(4).padStart(10)}  ${a32.toFixed(6).padStart(11)}  ${e.toFixed(8)}  ${invSqrtD.toFixed(6)}  ${v.toExponential(8).padStart(17)}  ${pct.padStart(6)}%`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: What parameters are tweakable?
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('TWEAKABLE PARAMETERS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`
The v-weight formula is: v = √m × a^(3/2) × e / √d

Parameters in the formula:
  d  — Fixed by Config #3 (Fibonacci assignment). NOT tweakable.
  m  — Planet masses from DE440 ratios. NOT tweakable (physical constants).
  a  — Semi-major axis from SolarYearInput via Kepler's 3rd law.
       Quantized by integer SolarYearCount. TWEAKABLE within count step.
  e  — Eccentricities. Currently J2000 values. TWEAKABLE:
       Eccentricities oscillate secularly, so using a mean value
       (averaged over a secular cycle) is physically justified.

Since Saturn is heavier (anti-phase side > prograde side), we need to either:
  (a) REDUCE Saturn's v-weight, or
  (b) INCREASE one or more prograde planet v-weights
`);

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Perfect-balance eccentricity for each planet
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('SECTION 3: PERFECT-BALANCE ECCENTRICITY PER PLANET');
console.log('═══════════════════════════════════════════════════════════════');
console.log('For each planet: what eccentricity gives exactly 100% balance?\n');

console.log('Planet      e_J2000      e_perfect    Δe           Δe/e (%)     Secular range (Laskar)');

// Secular eccentricity ranges (approximate, from Laskar 2004/2008)
const secularRange = {
  mercury: { min: 0.10, max: 0.46 },
  venus:   { min: 0.00, max: 0.07 },
  earth:   { min: 0.00, max: 0.06 },
  mars:    { min: 0.00, max: 0.13 },
  jupiter: { min: 0.025, max: 0.060 },
  saturn:  { min: 0.012, max: 0.088 },
  uranus:  { min: 0.01, max: 0.08 },
  neptune: { min: 0.000, max: 0.015 },
};

for (const p of planets) {
  // For a prograde planet: increasing e moves prograde sum up → closes gap (since anti-phase is heavier)
  // For Saturn (anti-phase): decreasing e moves anti-phase sum down → closes gap
  // Perfect e: solve v_perfect such that sum203_new = sum23_new

  const m = getMass(p);
  const a = getSMA(p);
  const coeff = Math.sqrt(m) * Math.pow(a, 1.5) / Math.sqrt(d[p]);

  if (p === 'saturn') {
    // Saturn is anti-phase side. sum203 = base.sum203, new sum23 = coeff * e_new
    // Balance when: base.sum203 = coeff * e_new → e_new = base.sum203 / coeff
    const ePerfect = base.sum203 / coeff;
    const delta = ePerfect - eccJ2000[p];
    const pctChange = (delta / eccJ2000[p] * 100);
    const range = secularRange[p];
    const inRange = ePerfect >= range.min && ePerfect <= range.max ? 'YES' : 'NO';
    console.log(`${p.padEnd(10)}  ${eccJ2000[p].toFixed(8)}  ${ePerfect.toFixed(8)}  ${(delta >= 0 ? '+' : '') + delta.toExponential(4)}  ${pctChange.toFixed(4).padStart(9)}%  [${range.min}, ${range.max}] ${inRange}`);
  } else {
    // prograde planet. new sum203 = base.sum203 - base.weights[p] + coeff * e_new
    // Balance when: base.sum203 - base.weights[p] + coeff * e_new = base.sum23
    // e_new = (base.sum23 - base.sum203 + base.weights[p]) / coeff
    const ePerfect = (base.sum23 - base.sum203 + base.weights[p]) / coeff;
    if (ePerfect < 0) {
      console.log(`${p.padEnd(10)}  ${eccJ2000[p].toFixed(8)}  IMPOSSIBLE   (would need negative e)`);
      continue;
    }
    const delta = ePerfect - eccJ2000[p];
    const pctChange = (delta / eccJ2000[p] * 100);
    const range = secularRange[p];
    const inRange = ePerfect >= range.min && ePerfect <= range.max ? 'YES' : 'NO';
    console.log(`${p.padEnd(10)}  ${eccJ2000[p].toFixed(8)}  ${ePerfect.toFixed(8)}  ${(delta >= 0 ? '+' : '') + delta.toExponential(4)}  ${pctChange.toFixed(4).padStart(9)}%  [${range.min}, ${range.max}] ${inRange}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: SolarYearInput sensitivity (SMA changes)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 4: SOLARYEARINPUT SENSITIVITY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Each SYI change alters the quantized SMA. Can SMA alone close the gap?\n');

for (const p of Object.keys(SYI)) {
  const baseSYI = SYI[p];
  const baseCount = Math.round((H * MSY) / baseSYI);
  let bestBal = base.balance, bestSYI = baseSYI, bestCount = baseCount;

  // Scan a range
  const range = Math.max(1, baseSYI * 0.001);
  for (let delta = -range; delta <= range; delta += range / 5000) {
    const newSYI = baseSYI + delta;
    const r = computeEccBalance(null, { [p]: newSYI });
    if (r.balance > bestBal) {
      bestBal = r.balance;
      bestSYI = newSYI;
      bestCount = Math.round((H * MSY) / newSYI);
    }
  }

  const countChanged = bestCount !== baseCount;
  const improvement = bestBal - base.balance;
  console.log(`${p.padEnd(10)} SYI: ${baseSYI} → ${bestSYI.toFixed(4)} (count: ${baseCount} → ${bestCount}${countChanged ? ' CHANGED' : ''})  balance: ${bestBal.toFixed(6)}% (${improvement > 0 ? '+' : ''}${improvement.toFixed(6)}%)`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Combined SYI + eccentricity — multi-parameter search
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 5: COMBINED APPROACHES TO 100%');
console.log('═══════════════════════════════════════════════════════════════');

// Approach A: Saturn eccentricity alone
{
  const m = getMass('saturn');
  const a = getSMA('saturn');
  const coeff = Math.sqrt(m) * Math.pow(a, 1.5) / Math.sqrt(d.saturn);
  const ePerfect = base.sum203 / coeff;
  const delta = ePerfect - eccJ2000.saturn;
  console.log(`\nApproach A: Adjust Saturn eccentricity alone`);
  console.log(`  e_Saturn: ${eccJ2000.saturn} → ${ePerfect.toFixed(10)}`);
  console.log(`  Change: ${(delta * 1e6).toFixed(1)} × 10⁻⁶ (${(delta / eccJ2000.saturn * 100).toFixed(4)}%)`);
  console.log(`  Secular range allows [0.012, 0.088] — well within range`);
  console.log(`  This is the Law 5 prediction for Saturn's mean eccentricity`);
}

// Approach B: Jupiter eccentricity alone
{
  const m = getMass('jupiter');
  const a = getSMA('jupiter');
  const coeff = Math.sqrt(m) * Math.pow(a, 1.5) / Math.sqrt(d.jupiter);
  // Need to increase Jupiter's v by the gap amount
  const ePerfect = (base.weights.jupiter + base.gap) / coeff;
  // But only if anti-phase side was heavier
  if (base.sum23 > base.sum203) {
    const delta = ePerfect - eccJ2000.jupiter;
    console.log(`\nApproach B: Adjust Jupiter eccentricity alone`);
    console.log(`  e_Jupiter: ${eccJ2000.jupiter} → ${ePerfect.toFixed(10)}`);
    console.log(`  Change: ${(delta * 1e6).toFixed(1)} × 10⁻⁶ (${(delta / eccJ2000.jupiter * 100).toFixed(4)}%)`);
    console.log(`  Secular range allows [0.025, 0.060] — within range`);
  }
}

// Approach C: Use mean eccentricities instead of J2000
// Mean eccentricities from Laskar 2004 (10 Myr averages)
console.log(`\nApproach C: Mean eccentricities (10 Myr averages, Laskar 2004)`);
const eccMean = {
  mercury: 0.17, venus: 0.035, earth: 0.028, mars: 0.065,
  jupiter: 0.044, saturn: 0.050, uranus: 0.044, neptune: 0.008,
};
const meanResult = computeEccBalance(eccMean);
console.log(`  Balance with mean eccentricities: ${meanResult.balance.toFixed(6)}%`);
console.log(`  (Much worse — mean eccentricities are rough estimates, not suitable)`);

// Approach D: Find the minimum total Δe across all planets
console.log(`\nApproach D: Minimum total perturbation (spread across planets)`);
console.log(`  Optimize: min Σ(Δe_j/e_j)² subject to balance = 100%`);
console.log(`  Using Lagrange multiplier approach...`);
{
  // The balance constraint: Σ_203 v_j = v_saturn
  // v_j = c_j * e_j where c_j = √m_j * a_j^(3/2) / √d_j
  // Constraint: Σ_{j≠sat} c_j * e_j = c_sat * e_sat
  // Minimize: Σ_j (Δe_j / e_j0)² = Σ_j ((e_j - e_j0) / e_j0)²
  //
  // Lagrangian: L = Σ((e_j - e_j0)/e_j0)² - λ(Σ_{j≠sat} c_j*e_j - c_sat*e_sat)
  // ∂L/∂e_j = 2(e_j - e_j0)/e_j0² + sign_j*λ*c_j = 0
  // where sign_j = -1 for prograde, +1 for saturn
  // e_j = e_j0 - sign_j * λ * c_j * e_j0² / 2

  const c = {};
  for (const p of planets) {
    const m = getMass(p);
    const a = getSMA(p);
    c[p] = Math.sqrt(m) * Math.pow(a, 1.5) / Math.sqrt(d[p]);
  }

  // Current gap: sum23 - sum203 = c_sat*e_sat - Σ_{j≠sat} c_j*e_j
  const currentGap = base.sum23 - base.sum203; // positive means anti-phase too heavy

  // The perturbation Δe_j = -sign_j * λ * c_j * e_j0² / 2
  // Sum of perturbation effects on gap:
  // ΔGap = Σ_j sign_j * c_j * Δe_j = -λ/2 * Σ_j c_j² * e_j0²
  // Set ΔGap = -currentGap to close it:
  // λ = 2 * currentGap / Σ_j c_j² * e_j0²

  let sumC2E2 = 0;
  for (const p of planets) {
    sumC2E2 += c[p] * c[p] * eccJ2000[p] * eccJ2000[p];
  }
  const lambda = 2 * currentGap / sumC2E2;

  console.log('\n  Planet      e_J2000       e_optimal     Δe           Δe/e (%)');
  let totalRelChange2 = 0;
  const eccOptimal = {};
  for (const p of planets) {
    const sign = p === 'saturn' ? +1 : -1;
    const deltaE = -sign * lambda * c[p] * eccJ2000[p] * eccJ2000[p] / 2;
    const eOpt = eccJ2000[p] + deltaE;
    eccOptimal[p] = eOpt;
    const relChange = deltaE / eccJ2000[p] * 100;
    totalRelChange2 += (deltaE / eccJ2000[p]) ** 2;
    console.log(`  ${p.padEnd(10)}  ${eccJ2000[p].toFixed(8)}  ${eOpt.toFixed(8)}  ${(deltaE >= 0 ? '+' : '') + deltaE.toExponential(4)}  ${relChange.toFixed(6).padStart(11)}%`);
  }

  const verifyResult = computeEccBalance(eccOptimal);
  console.log(`\n  Verification: balance = ${verifyResult.balance.toFixed(8)}%`);
  console.log(`  Total RMS relative change: ${(Math.sqrt(totalRelChange2) * 100).toFixed(6)}%`);
  console.log(`  Max single-planet change: ${Math.max(...planets.map(p => Math.abs((eccOptimal[p] - eccJ2000[p]) / eccJ2000[p] * 100))).toFixed(4)}%`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: CIRCULAR ORBIT ECCENTRICITY e/(1+e)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 6: CIRCULAR ORBIT ECCENTRICITY e/(1+e)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('The model uses RealOrbitalEccentricity = e/(1+e) for circular orbits.');
console.log('What happens if we use these in the eccentricity balance formula?\n');

console.log('Planet      e_JPL        e_circular   Difference');
for (const p of planets) {
  const diff = eccCircular[p] - eccJ2000[p];
  console.log(`${p.padEnd(10)}  ${eccJ2000[p].toFixed(8)}  ${eccCircular[p].toFixed(8)}  ${diff.toExponential(4)}`);
}

const circResult = computeEccBalance(eccCircular);
console.log(`\nBalance with e/(1+e): ${circResult.balance.toFixed(6)}%`);
console.log(`Balance with e_JPL:   ${base.balance.toFixed(6)}%`);
console.log(`Change: ${(circResult.balance - base.balance) > 0 ? '+' : ''}${(circResult.balance - base.balance).toFixed(6)}%`);
console.log(`\n  Σ(prograde) = ${circResult.sum203.toExponential(10)}`);
console.log(`  Σ(anti-phase)  = ${circResult.sum23.toExponential(10)}`);
console.log(`  Gap     = ${circResult.gap.toExponential(6)}`);

// ═══════════════════════════════════════════════════════════════
// SECTION 7: TWEAK CIRCULAR ECCENTRICITIES TO REACH 100%
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 7: TWEAK CIRCULAR ECCENTRICITIES TO REACH 100%');
console.log('═══════════════════════════════════════════════════════════════');

// First: what's the perfect Saturn circular eccentricity?
{
  const m = getMass('saturn');
  const a = getSMA('saturn');
  const coeff = Math.sqrt(m) * Math.pow(a, 1.5) / Math.sqrt(d.saturn);
  const circBase = computeEccBalance(eccCircular);
  const ePerfectSaturn = circBase.sum203 / coeff;
  const delta = ePerfectSaturn - eccCircular.saturn;
  console.log(`\nApproach A (circular): Adjust Saturn e/(1+e) alone`);
  console.log(`  e_circ_Saturn: ${eccCircular.saturn.toFixed(10)} → ${ePerfectSaturn.toFixed(10)}`);
  console.log(`  Change: ${(delta / eccCircular.saturn * 100).toFixed(4)}%`);
  console.log(`  Corresponding JPL e: ${(ePerfectSaturn / (1 - ePerfectSaturn)).toFixed(10)}`);
}

// Approach D: Minimum perturbation spread across all (using circular eccentricities)
console.log(`\nApproach D (circular): Minimum perturbation spread across all planets`);
{
  const c = {};
  for (const p of planets) {
    c[p] = Math.sqrt(getMass(p)) * Math.pow(getSMA(p), 1.5) / Math.sqrt(d[p]);
  }

  const circBase = computeEccBalance(eccCircular);
  const currentGap = circBase.sum23 - circBase.sum203;

  let sumC2E2 = 0;
  for (const p of planets) {
    sumC2E2 += c[p] * c[p] * eccCircular[p] * eccCircular[p];
  }
  const lambda = 2 * currentGap / sumC2E2;

  console.log('\n  Planet      e_circ        e_optimal     Δe           Δe/e (%)      Back to JPL e');
  const eccOpt = {};
  for (const p of planets) {
    const sign = p === 'saturn' ? +1 : -1;
    const deltaE = -sign * lambda * c[p] * eccCircular[p] * eccCircular[p] / 2;
    eccOpt[p] = eccCircular[p] + deltaE;
    const relChange = deltaE / eccCircular[p] * 100;
    const backToJPL = eccOpt[p] / (1 - eccOpt[p]);
    console.log(`  ${p.padEnd(10)}  ${eccCircular[p].toFixed(8)}  ${eccOpt[p].toFixed(8)}  ${(deltaE >= 0 ? '+' : '') + deltaE.toExponential(4)}  ${relChange.toFixed(6).padStart(11)}%  ${backToJPL.toFixed(8)}`);
  }

  const verifyResult = computeEccBalance(eccOpt);
  console.log(`\n  Verification: balance = ${verifyResult.balance.toFixed(8)}%`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: WHAT POWER OF e GIVES BEST BALANCE?
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 8: WHAT TRANSFORMATION OF e GIVES BEST BALANCE?');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Test v = √m × a^(3/2) × f(e) / √d for different f(e):\n');

const transforms = [
  { name: 'e (JPL Keplerian)',     fn: e => e },
  { name: 'e/(1+e) (circular)',    fn: e => e / (1 + e) },
  { name: 'e/(1-e)',               fn: e => e / (1 - e) },
  { name: 'e²',                    fn: e => e * e },
  { name: '√e',                    fn: e => Math.sqrt(e) },
  { name: 'e × (1-e²)',           fn: e => e * (1 - e * e) },
  { name: 'e × √(1-e²)',         fn: e => e * Math.sqrt(1 - e * e) },
  { name: 'e / √(1-e²)',         fn: e => e / Math.sqrt(1 - e * e) },
  { name: 'e × (1+e)',            fn: e => e * (1 + e) },
  { name: '2e/(1+e²)',            fn: e => 2 * e / (1 + e * e) },
  { name: 'sin(e)',                fn: e => Math.sin(e) },
  { name: 'tan(e)',                fn: e => Math.tan(e) },
  { name: 'e^0.95',               fn: e => Math.pow(e, 0.95) },
  { name: 'e^1.05',               fn: e => Math.pow(e, 1.05) },
];

const results = [];
for (const t of transforms) {
  const eccTransformed = {};
  for (const p of planets) {
    eccTransformed[p] = t.fn(eccJ2000[p]);
  }
  const r = computeEccBalance(eccTransformed);
  results.push({ name: t.name, balance: r.balance });
}

results.sort((a, b) => b.balance - a.balance);
for (const r of results) {
  const marker = r.balance > 99.99 ? ' ← NEAR PERFECT' : r.balance > 99.95 ? ' ← EXCELLENT' : '';
  console.log(`  ${r.name.padEnd(25)} ${r.balance.toFixed(6)}%${marker}`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: FINE-TUNE THE BEST POWER
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 9: FINE-TUNE — SCAN e^γ FOR OPTIMAL γ');
console.log('═══════════════════════════════════════════════════════════════\n');

let bestGamma = 1.0, bestBal = 0;
const gammaResults = [];
for (let gamma = 0.80; gamma <= 1.20; gamma += 0.001) {
  const eccT = {};
  for (const p of planets) eccT[p] = Math.pow(eccJ2000[p], gamma);
  const r = computeEccBalance(eccT);
  if (r.balance > bestBal) { bestBal = r.balance; bestGamma = gamma; }
  if (Math.abs(gamma * 1000 - Math.round(gamma * 1000)) < 0.01 && gamma * 100 % 2 < 0.01) {
    gammaResults.push({ gamma, balance: r.balance });
  }
}

for (const g of gammaResults) {
  const marker = Math.abs(g.gamma - bestGamma) < 0.002 ? ' ← PEAK' : '';
  console.log(`  γ = ${g.gamma.toFixed(3)}  →  ${g.balance.toFixed(6)}%${marker}`);
}
console.log(`\n  Optimal γ = ${bestGamma.toFixed(4)} → balance = ${bestBal.toFixed(8)}%`);

// What does this gamma mean physically?
const eccGamma = {};
for (const p of planets) eccGamma[p] = Math.pow(eccJ2000[p], bestGamma);
console.log(`\n  Planet      e_JPL        e^${bestGamma.toFixed(4)}      Difference`);
for (const p of planets) {
  const diff = eccGamma[p] - eccJ2000[p];
  console.log(`  ${p.padEnd(10)}  ${eccJ2000[p].toFixed(8)}  ${eccGamma[p].toFixed(8)}  ${(diff >= 0 ? '+' : '') + diff.toExponential(4)}`);
}
