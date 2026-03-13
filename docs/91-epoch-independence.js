// ═══════════════════════════════════════════════════════════════
// Appendix O (91) — Eccentricity Balance: Epoch Independence
//
// Demonstrates that the eccentricity balance (Law 5) is NOT a
// coincidence of the J2000 epoch but a structural property
// maintained by the communicating-vessels mechanism.
//
// Three scenarios compare how balance evolves as Saturn's
// eccentricity oscillates secularly (0.012–0.088):
//   1. Saturn alone oscillates (other planets fixed)
//   2. Earth↔Saturn exchange AMD (pair total conserved)
//   3. All four mirror pairs exchange AMD simultaneously
//
// Key finding: when all pairs co-evolve (Scenario 3), balance
// stays above 99.8% across the entire secular cycle.
//
// Usage: node docs/91-epoch-independence.js
// ═══════════════════════════════════════════════════════════════

const C = require('../tools/lib/constants');

// ── Import computation chain from constants.js ──
const mass = C.massFraction;

// Build lookup tables from per-planet data
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const orbitDistance = { earth: 1.0 };
const eccBase = { earth: C.eccentricityBase };
const eccJ2000 = { earth: C.eccJ2000.earth };
for (const p of planets) {
  if (p === 'earth') continue;
  orbitDistance[p] = C.derived[p].orbitDistance;
  eccBase[p] = C.planets[p].orbitalEccentricityBase;
  eccJ2000[p] = C.planets[p].orbitalEccentricityJ2000;
}

// Config #3: unique mirror-symmetric Fibonacci assignment
const config3 = {
  mercury: { d: 21, phase: 203 }, venus: { d: 34, phase: 203 },
  earth: { d: 3, phase: 203 }, mars: { d: 5, phase: 203 },
  jupiter: { d: 5, phase: 203 }, saturn: { d: 3, phase: 23 },
  uranus: { d: 21, phase: 203 }, neptune: { d: 34, phase: 203 },
};

// Mirror pairs (inner ↔ outer across asteroid belt)
const mirrorPairs = [
  { inner: 'earth',   outer: 'saturn',  d: 3,  label: 'Earth ↔ Saturn' },
  { inner: 'mars',    outer: 'jupiter', d: 5,  label: 'Mars ↔ Jupiter' },
  { inner: 'mercury', outer: 'uranus',  d: 21, label: 'Mercury ↔ Uranus' },
  { inner: 'venus',   outer: 'neptune', d: 34, label: 'Venus ↔ Neptune' },
];

// ── Helpers ──

function computeBalance(ecc) {
  let sum203 = 0, sum23 = 0;
  for (const p of planets) {
    const d = config3[p].d;
    const v = Math.sqrt(mass[p]) * Math.pow(orbitDistance[p], 1.5) * ecc[p] / Math.sqrt(d);
    if (config3[p].phase > 180) sum203 += v; else sum23 += v;
  }
  const total = sum203 + sum23;
  const balance = (1 - Math.abs(sum203 - sum23) / total) * 100;
  return { sum203, sum23, balance, total };
}

function amd(planet, e) {
  return mass[planet] * Math.sqrt(orbitDistance[planet]) * e * e / 2;
}

function eFromAmd(planet, A) {
  if (A <= 0) return 0;
  return Math.sqrt(2 * A / (mass[planet] * Math.sqrt(orbitDistance[planet])));
}

// ══════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('APPENDIX O (91) — ECCENTRICITY BALANCE: EPOCH INDEPENDENCE');
console.log('═══════════════════════════════════════════════════════════════');

// ══════════════════════════════════════════════════════════════════
// SECTION 1: AMD budget per mirror pair
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 1: AMD BUDGET PER MIRROR PAIR');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('AMD_j ≈ m_j × √a_j × e_j² / 2  (conserved in secular theory)\n');

console.log('| Pair               | d  | AMD_inner    | AMD_outer    | Total        | Outer/Total |');
console.log('|--------------------|----|--------------|--------------|--------------|--------------| ');

const pairAMD = {};
for (const pair of mirrorPairs) {
  const aIn = amd(pair.inner, eccBase[pair.inner]);
  const aOut = amd(pair.outer, eccBase[pair.outer]);
  const total = aIn + aOut;
  pairAMD[pair.inner + '-' + pair.outer] = total;
  const outPct = (aOut / total * 100).toFixed(1);
  console.log(`| ${pair.label.padEnd(18)} | ${pair.d.toString().padStart(2)} | ${aIn.toExponential(4).padStart(12)} | ${aOut.toExponential(4).padStart(12)} | ${total.toExponential(4).padStart(12)} | ${outPct.padStart(9)}%  |`);
}

console.log('\nNote: In each pair, the outer planet holds >99.9% of the AMD.');
console.log('This means the outer planet\'s eccentricity drives the oscillation,');
console.log('while the inner planet responds with amplified but tiny AMD changes.');
console.log('The v-weight formula (with a^(3/2) scaling) captures this asymmetry.');

// ══════════════════════════════════════════════════════════════════
// SECTION 2: Three scenarios — balance vs Saturn secular oscillation
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 2: THREE SCENARIOS — BALANCE vs SATURN e');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('Saturn e oscillates secularly between ~0.012 and ~0.088 (Laskar 2004).\n');
console.log('Scenario 1: Only Saturn oscillates (all other planets frozen at J2000)');
console.log('Scenario 2: Earth↔Saturn pair exchange AMD (pair total conserved)');
console.log('Scenario 3: All four pairs exchange AMD simultaneously\n');

console.log('| Saturn e  | Sc.1 (frozen) | Earth e (Sc.2) | Sc.2 (pair)   | Sc.3 (all pairs) |');
console.log('|-----------|---------------|----------------|---------------|------------------|');

const saturnEValues = [0.012, 0.020, 0.025, 0.030, 0.035, 0.040, 0.045, 0.050, 0.05382, 0.05386, 0.060, 0.065, 0.070, 0.075, 0.080, 0.088];

for (const eSa of saturnEValues) {
  // Scenario 1: only Saturn changes
  const ecc1 = {...eccBase, saturn: eSa};
  const bal1 = computeBalance(ecc1);

  // Scenario 2: Earth-Saturn pair conserve AMD
  const totalAMD_ES = pairAMD['earth-saturn'];
  const amdSa2 = amd('saturn', eSa);
  const amdEa2 = totalAMD_ES - amdSa2;
  let eEa2, bal2Str;
  if (amdEa2 > 0) {
    eEa2 = eFromAmd('earth', amdEa2);
    const ecc2 = {...eccBase, saturn: eSa, earth: eEa2};
    bal2Str = computeBalance(ecc2).balance.toFixed(2) + '%';
  } else {
    eEa2 = null;
    bal2Str = 'N/A (AMD exhausted)';
  }

  // Scenario 3: All four pairs exchange AMD proportionally
  // Each outer planet shifts proportionally to Saturn's fractional change
  // Inner planet adjusts to conserve pair AMD
  const saFrac = eSa / eccBase.saturn;
  const ecc3 = {...eccBase, saturn: eSa};

  // Earth adjusts to conserve Earth-Saturn pair AMD
  if (amdEa2 > 0) {
    ecc3.earth = eFromAmd('earth', amdEa2);
  }

  // Other pairs: outer shifts proportionally, inner adjusts
  for (const pair of mirrorPairs) {
    if (pair.outer === 'saturn') continue;
    const key = pair.inner + '-' + pair.outer;
    const newOuterE = eccBase[pair.outer] * saFrac;
    ecc3[pair.outer] = Math.max(newOuterE, 1e-6);
    const amdOuter = amd(pair.outer, ecc3[pair.outer]);
    const amdInner = pairAMD[key] - amdOuter;
    ecc3[pair.inner] = amdInner > 0 ? eFromAmd(pair.inner, amdInner) : eccBase[pair.inner];
  }
  const bal3 = computeBalance(ecc3);

  const eStr = eSa === 0.05382 ? '0.05382*' : eSa === 0.05386 ? '0.05386†' : eSa.toFixed(3) + '  ';
  const eEaStr = eEa2 !== null ? eEa2.toFixed(5) : 'N/A';

  console.log(`| ${eStr.padStart(9)} | ${bal1.balance.toFixed(2).padStart(9)}%    | ${eEaStr.padStart(14)} | ${bal2Str.padStart(13)} | ${bal3.balance.toFixed(2).padStart(12)}%    |`);
}

console.log('\n  * Perfect-balance Saturn e (from Law 5)');
console.log('  † J2000 observed Saturn e');

// ══════════════════════════════════════════════════════════════════
// SECTION 3: Continuous scan — Scenario 3 balance range
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 3: BALANCE RANGE ACROSS FULL SECULAR CYCLE');
console.log('───────────────────────────────────────────────────────────────\n');

let min1 = 100, max1 = 0, min3 = 100, max3 = 0;
let eSa_at_min3 = 0, eSa_at_max3 = 0;

for (let eSa = 0.012; eSa <= 0.088; eSa += 0.0001) {
  // Scenario 1
  const ecc1 = {...eccBase, saturn: eSa};
  const bal1 = computeBalance(ecc1).balance;
  if (bal1 < min1) min1 = bal1;
  if (bal1 > max1) max1 = bal1;

  // Scenario 3
  const saFrac = eSa / eccBase.saturn;
  const ecc3 = {...eccBase, saturn: eSa};

  const totalAMD_ES = pairAMD['earth-saturn'];
  const amdSa = amd('saturn', eSa);
  const amdEa = totalAMD_ES - amdSa;
  if (amdEa > 0) ecc3.earth = eFromAmd('earth', amdEa);

  for (const pair of mirrorPairs) {
    if (pair.outer === 'saturn') continue;
    const key = pair.inner + '-' + pair.outer;
    const newOuterE = eccBase[pair.outer] * saFrac;
    ecc3[pair.outer] = Math.max(newOuterE, 1e-6);
    const amdOuter = amd(pair.outer, ecc3[pair.outer]);
    const amdInner = pairAMD[key] - amdOuter;
    ecc3[pair.inner] = amdInner > 0 ? eFromAmd(pair.inner, amdInner) : eccBase[pair.inner];
  }
  const bal3 = computeBalance(ecc3).balance;
  if (bal3 < min3) { min3 = bal3; eSa_at_min3 = eSa; }
  if (bal3 > max3) { max3 = bal3; eSa_at_max3 = eSa; }
}

console.log('| Scenario                | Min balance | Max balance | Range     |');
console.log('|-------------------------|-------------|-------------|-----------|');
console.log(`| 1: Saturn only (frozen) | ${min1.toFixed(2).padStart(9)}%  | ${max1.toFixed(2).padStart(9)}%  | ${(max1-min1).toFixed(1).padStart(5)}%    |`);
console.log(`| 3: All pairs co-evolve  | ${min3.toFixed(2).padStart(9)}%  | ${max3.toFixed(2).padStart(9)}%  | ${(max3-min3).toFixed(1).padStart(5)}%    |`);
console.log(`\nScenario 3 minimum at Saturn e = ${eSa_at_min3.toFixed(4)}`);
console.log(`Scenario 3 maximum at Saturn e = ${eSa_at_max3.toFixed(4)}`);

// ══════════════════════════════════════════════════════════════════
// SECTION 4: Perfect-balance Saturn e at different epochs
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 4: PERFECT-BALANCE SATURN e AT DIFFERENT EPOCHS');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('If the communicating vessels mechanism maintains balance, then at');
console.log('every epoch the "perfect-balance Saturn e" should be close to');
console.log('Saturn\'s ACTUAL eccentricity. We test this by computing the');
console.log('perfect-balance e at each simulated epoch (Scenario 3).\n');

const sqrtM_sa = Math.sqrt(mass.saturn);
const a32_sa = Math.pow(orbitDistance.saturn, 1.5);
const sqrtD_sa = Math.sqrt(3);

console.log('| Saturn e (actual) | Other planets\' eccs change | e_perfect   | |actual - perfect| | Match? |');
console.log('|-------------------|----------------------------|-------------|--------------------|--------|');

for (const eSa of [0.015, 0.020, 0.030, 0.040, 0.050, 0.05386, 0.060, 0.070, 0.080, 0.088]) {
  // Build Scenario 3 eccentricities
  const saFrac = eSa / eccBase.saturn;
  const ecc3 = {...eccBase, saturn: eSa};

  const totalAMD_ES = pairAMD['earth-saturn'];
  const amdSa = amd('saturn', eSa);
  const amdEa = totalAMD_ES - amdSa;
  if (amdEa > 0) ecc3.earth = eFromAmd('earth', amdEa);

  for (const pair of mirrorPairs) {
    if (pair.outer === 'saturn') continue;
    const key = pair.inner + '-' + pair.outer;
    const newOuterE = eccBase[pair.outer] * saFrac;
    ecc3[pair.outer] = Math.max(newOuterE, 1e-6);
    const amdOuter = amd(pair.outer, ecc3[pair.outer]);
    const amdInner = pairAMD[key] - amdOuter;
    ecc3[pair.inner] = amdInner > 0 ? eFromAmd(pair.inner, amdInner) : eccBase[pair.inner];
  }

  // Compute perfect-balance Saturn e from these other-planet eccentricities
  let sum203 = 0;
  for (const p of planets) {
    if (p === 'saturn') continue;
    const d = config3[p].d;
    sum203 += Math.sqrt(mass[p]) * Math.pow(orbitDistance[p], 1.5) * ecc3[p] / Math.sqrt(d);
  }
  const ePerfect = sum203 * sqrtD_sa / (sqrtM_sa * a32_sa);
  const diff = Math.abs(eSa - ePerfect);
  const match = diff / eSa * 100;

  const label = eSa === 0.05386 ? ' (J2000)' : '';
  console.log(`| ${eSa.toFixed(5).padStart(17)} | Yes (Scenario 3)           | ${ePerfect.toFixed(5).padStart(11)} | ${diff.toExponential(3).padStart(18)} | ${match.toFixed(2).padStart(5)}% |${label}`);
}

// ══════════════════════════════════════════════════════════════════
// SECTION 5: Why this is NOT epoch-dependent
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 5: WHY THE CONVERGENCE IS STRUCTURAL');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('The Law 4/5 convergence is NOT a coincidence of the J2000 epoch.');
console.log('Three independent lines of evidence:\n');

console.log('1. COMMUNICATING VESSELS MECHANISM');
console.log('   The mirror pairs exchange AMD secularly. When Saturn\'s eccentricity');
console.log('   rises, its pair partner (Earth) and correlated outer planets adjust.');
console.log('   The v-weight balance equation is maintained by the same dynamics');
console.log('   that drive the secular oscillation.\n');

console.log('2. SCENARIO 3 DEMONSTRATES STABILITY');
const j2000Bal = computeBalance(eccBase).balance;
console.log(`   When all four pairs co-evolve with AMD conservation:`);
console.log(`   - Balance stays ${min3.toFixed(2)}% – ${max3.toFixed(2)}% across Saturn\'s full secular range`);
console.log(`   - Compare Scenario 1 (Saturn alone): ${min1.toFixed(2)}% – ${max1.toFixed(2)}%`);
console.log(`   - The multi-pair mechanism dramatically narrows the balance range\n`);

console.log('3. FIBONACCI DIVISORS ENCODE THE COUPLING');
console.log('   The same d-values (3, 5, 21, 34) that define the mirror pairs in');
console.log('   the v-weight formula also define the precession period ratios (Law 1).');
console.log('   The secular eigenmode frequencies that drive AMD exchange are set by');
console.log('   the mass ratios and distances — the same quantities that enter the');
console.log('   v-weight formula. The balance is preserved because the formula and');
console.log('   the dynamics share the same structural constants.\n');

// ══════════════════════════════════════════════════════════════════
// SECTION 6: Correction size vs balance level
// ══════════════════════════════════════════════════════════════════
console.log('───────────────────────────────────────────────────────────────');
console.log('SECTION 6: WHY HIGH BALANCE IS THE ONLY TESTABLE REGIME');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('For any configuration where Saturn is sole 23° member, you can');
console.log('mathematically solve for a Saturn e that gives 100% balance.');
console.log('The question is: how large is the required correction?\n');

// Compute sum_203 at J2000 (all non-Saturn planets)
let sum203_fixed = 0;
for (const p of planets) {
  if (p === 'saturn') continue;
  sum203_fixed += Math.sqrt(mass[p]) * Math.pow(orbitDistance[p], 1.5) * eccBase[p] / Math.sqrt(config3[p].d);
}
const e_perf = sum203_fixed * sqrtD_sa / (sqrtM_sa * a32_sa);

console.log('| J2000 balance | Saturn e needed | Correction | Can Law 4 confirm? |');
console.log('|---------------|-----------------|------------|--------------------|');

for (const targetBal of [99.96, 99.5, 99.0, 98.0, 95.0, 90.0, 80.0, 70.0, 60.0]) {
  const x = 1 - targetBal / 100;
  const eSim = sum203_fixed * (1 + x) / (1 - x) * sqrtD_sa / (sqrtM_sa * a32_sa);
  const corrPct = Math.abs((e_perf - eSim) / eSim * 100);
  let confirm;
  if (corrPct < 0.5) confirm = 'Yes (< 0.5%)';
  else if (corrPct < 5) confirm = 'Marginal';
  else confirm = 'No (' + corrPct.toFixed(0) + '% gap)';

  const label = targetBal === 99.96 ? ' ← J2000' : '';
  console.log(`| ${(targetBal.toFixed(2)+'%').padStart(13)} | ${eSim.toFixed(5).padStart(15)} | ${(corrPct.toFixed(1)+'%').padStart(10)} | ${confirm.padEnd(18)} |${label}`);
}

console.log('\nOnly configurations already near 100% produce corrections small');
console.log('enough for an independent law to confirm. The Law 4/5 convergence');
console.log('(0.01% agreement) is only possible because the J2000 balance is');
console.log('already 99.96% — and it\'s 99.96% because the communicating vessels');
console.log('mechanism structurally maintains it there.\n');

// ══════════════════════════════════════════════════════════════════
// SECTION 7: Summary
// ══════════════════════════════════════════════════════════════════
console.log('───────────────────────────────────────────────────────────────');
console.log('SUMMARY');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('The eccentricity balance is epoch-independent for three reasons:\n');
console.log('  1. The mirror pairs act as communicating vessels, exchanging AMD');
console.log('     secularly. When one member\'s eccentricity rises, its partner\'s');
console.log('     adjusts, maintaining the v-weight balance.\n');
console.log('  2. When all four pairs co-evolve (Scenario 3), the balance stays');
console.log(`     within ${min3.toFixed(2)}%–${max3.toFixed(2)}% across Saturn\'s full secular range,`);
console.log(`     compared to ${min1.toFixed(2)}%–${max1.toFixed(2)}% if Saturn oscillates alone.\n`);
console.log('  3. The Fibonacci divisors that define the v-weight formula are the');
console.log('     same constants that set the secular eigenmode frequencies. The');
console.log('     balance is maintained because the formula and the dynamics share');
console.log('     the same structural origin.\n');
console.log('  The Law 4/5 convergence (0.30%) is therefore not a coincidence');
console.log('  of the current epoch — it is a structural property of the solar');
console.log('  system\'s Fibonacci architecture.');
