// ═══════════════════════════════════════════════════════════════
// Appendix N — Eccentricity Balance Analysis
//
// Comprehensive analysis of Law 5 (eccentricity balance) showing:
//   1. Current 8-planet balance with J2000 eccentricities
//   2. Mirror-pair decomposition and the spectacular cancellation
//   3. Saturn eccentricity for perfect balance vs Law 4 prediction
//   4. Sensitivity: what parameter changes close the gap
//   5. Why TNOs cannot participate (closed-system argument)
//
// Key finding: Law 4 predicts Saturn e = 0.05373, Law 5 requires
// e = 0.05374 for 100% balance — they agree to 0.01%.
//
// Usage: node docs/appendix-n-eccentricity-balance.js
// ═══════════════════════════════════════════════════════════════

// ── Computation chain (exact reproduction from script.js) ──

const holisticyearLength = 333888;
const inputmeanlengthsolaryearindays = 365.2421897;
const meansolaryearlengthinDays = Math.round(inputmeanlengthsolaryearindays * (holisticyearLength / 16)) / (holisticyearLength / 16);

const solarYearInputs = {
  mercury: 87.96845, venus: 224.6965, mars: 686.934,
  jupiter: 4330.595, saturn: 10746.6, uranus: 30583, neptune: 59896,
};

const solarYearCounts = {};
for (const [k, v] of Object.entries(solarYearInputs))
  solarYearCounts[k] = Math.round((holisticyearLength * meansolaryearlengthinDays) / v);

const orbitDistance = { earth: 1.0 };
for (const [k, c] of Object.entries(solarYearCounts))
  orbitDistance[k] = Math.pow(Math.pow(holisticyearLength / c, 2), 1/3);

// Masses (exact chain from script.js)
const meansiderealyearlengthinSeconds = 31558149.724;
const currentAUDistance = 149597870.698828;
const meansiderealyearlengthinDays = meansolaryearlengthinDays * (holisticyearLength/13) / ((holisticyearLength/13) - 1);
const meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;
const speedofSuninKM = (currentAUDistance * 2 * Math.PI) / (meansiderealyearlengthinSeconds / 60 / 60);
const meanAUDistance = (meansiderealyearlengthinSeconds / 60 / 60 * speedofSuninKM) / (2 * Math.PI);
const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(meanAUDistance, 3)) / Math.pow(meansiderealyearlengthinSeconds, 2);
const G_CONSTANT = 6.6743e-20;
const M_SUN = GM_SUN / G_CONSTANT;

const massRatios = {
  mercury: 6023625.5, venus: 408523.72, mars: 3098703.59,
  jupiter: 1047.348625, saturn: 3497.9018, uranus: 22902.944, neptune: 19412.237,
};
const mass = {};
for (const [k, ratio] of Object.entries(massRatios))
  mass[k] = 1 / ratio;

// Earth mass via Moon system (same chain as script.js)
const moonDistance = 384399.07;
const moonSiderealMonthInput = 27.32166156;
const moonSiderealMonth = (holisticyearLength * meansolaryearlengthinDays) /
  Math.ceil((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput - 0);
const moonAtApogee = 405400;
const MASS_RATIO_EARTH_MOON = 81.3007;
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3)) /
  Math.pow(moonSiderealMonth * meanlengthofday, 2);
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1)) /
  (1 - moonAtApogee / meanAUDistance);
const M_EARTH = GM_EARTH / G_CONSTANT;
mass.earth = M_EARTH / M_SUN;

// J2000 eccentricities (JPL DE440)
const eccJ2000 = {
  mercury: 0.20563593, venus: 0.00677672, earth: 0.01671, mars: 0.09339410,
  jupiter: 0.04838624, saturn: 0.05386179, uranus: 0.04725744, neptune: 0.00859048,
};

// Config #32: unique mirror-symmetric Fibonacci assignment
const config32 = {
  mercury: { d: 21, phase: 203 }, venus: { d: 34, phase: 203 },
  earth: { d: 3, phase: 203 }, mars: { d: 5, phase: 203 },
  jupiter: { d: 5, phase: 203 }, saturn: { d: 3, phase: 23 },
  uranus: { d: 21, phase: 203 }, neptune: { d: 34, phase: 203 },
};

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Mirror pairs (inner ↔ outer across asteroid belt)
const mirrorPairs = [
  { inner: 'earth',   outer: 'saturn',  d: 3,  label: 'Earth ↔ Saturn' },
  { inner: 'mars',    outer: 'jupiter', d: 5,  label: 'Mars ↔ Jupiter' },
  { inner: 'mercury', outer: 'uranus',  d: 21, label: 'Mercury ↔ Uranus' },
  { inner: 'venus',   outer: 'neptune', d: 34, label: 'Venus ↔ Neptune' },
];

// ── Helper: compute eccentricity balance ──
function computeBalance(ecc) {
  let sum203 = 0, sum23 = 0;
  const vPerPlanet = {};
  for (const p of planets) {
    const d = config32[p].d;
    const v = Math.sqrt(mass[p]) * Math.pow(orbitDistance[p], 1.5) * ecc[p] / Math.sqrt(d);
    vPerPlanet[p] = v;
    if (config32[p].phase > 180) sum203 += v; else sum23 += v;
  }
  const gap = sum23 - sum203;
  const total = sum203 + sum23;
  const balance = (1 - Math.abs(gap) / total) * 100;
  return { sum203, sum23, gap, total, balance, v: vPerPlanet };
}

// ══════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('APPENDIX N — ECCENTRICITY BALANCE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');

// ══════════════════════════════════════════════════════════════════
// SECTION 1: Current 8-planet balance (J2000 eccentricities)
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 1: 8-PLANET ECCENTRICITY BALANCE (J2000)');
console.log('───────────────────────────────────────────────────────────────\n');

const j2000 = computeBalance(eccJ2000);

console.log('v_j = √m_j × a_j^(3/2) × e_j / √d_j\n');
console.log('| Planet   | Group | d  | √m          | a^(3/2)     | e          | v_j          | % of total |');
console.log('|----------|-------|----|-------------|-------------|------------|--------------|------------|');
for (const p of planets) {
  const d = config32[p].d;
  const sqrtM = Math.sqrt(mass[p]);
  const a32 = Math.pow(orbitDistance[p], 1.5);
  const group = config32[p].phase > 180 ? '203°' : '23°';
  const pct = (j2000.v[p] / j2000.total * 100).toFixed(2);
  console.log(`| ${p.padEnd(8)} | ${group}  | ${d.toString().padStart(2)} | ${sqrtM.toExponential(3).padStart(11)} | ${a32.toFixed(4).padStart(11)} | ${eccJ2000[p].toFixed(8)} | ${j2000.v[p].toExponential(4).padStart(12)} | ${pct.padStart(9)}% |`);
}

console.log(`\n  Σ(203°) = ${j2000.sum203.toExponential(6)}`);
console.log(`  Σ(23°)  = ${j2000.sum23.toExponential(6)}  (Saturn only)`);
console.log(`  Gap     = ${j2000.gap.toExponential(6)}  (23° side heavier)`);
console.log(`  Total   = ${j2000.total.toExponential(6)}`);
console.log(`  Balance = ${j2000.balance.toFixed(4)}%`);

// ══════════════════════════════════════════════════════════════════
// SECTION 2: Mirror pair decomposition
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 2: MIRROR PAIR DECOMPOSITION');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('Each mirror pair shares a Fibonacci d-value. The pairs act as');
console.log('"communicating vessels" — AMD flows between inner and outer');
console.log('members. The total gap is the residual of massive cancellation.\n');

let gapCheck = 0;
console.log('| Pair                | d  | v_inner      | v_outer      | Pair gap     | % of total gap |');
console.log('|---------------------|----|--------------|--------------|--------------|--------------------|');

for (const pair of mirrorPairs) {
  const vI = j2000.v[pair.inner];
  const vO = j2000.v[pair.outer];
  // Gap contribution: how much this pair adds to (23° - 203°)
  let pair203 = 0, pair23 = 0;
  for (const p of [pair.inner, pair.outer]) {
    if (config32[p].phase > 180) pair203 += j2000.v[p]; else pair23 += j2000.v[p];
  }
  const pairContrib = pair23 - pair203;
  gapCheck += pairContrib;
  const pctGap = (pairContrib / j2000.gap * 100).toFixed(1);

  console.log(`| ${pair.label.padEnd(19)} | ${pair.d.toString().padStart(2)} | ${vI.toExponential(4).padStart(12)} | ${vO.toExponential(4).padStart(12)} | ${pairContrib.toExponential(4).padStart(12)} | ${pctGap.padStart(17)}% |`);
}
console.log(`| Sum                 |    |              |              | ${gapCheck.toExponential(4).padStart(12)} | ${'100.0'.padStart(17)}% |`);

console.log('\nThe spectacular cancellation:');
console.log('  Earth-Saturn contributes    +42,504% of the gap');
console.log('  Mars-Jupiter compensates    −21,928%');
console.log('  Mercury-Uranus compensates  −15,704%');
console.log('  Venus-Neptune compensates    −4,773%');
console.log('  Four numbers spanning ±42,000% cancel to leave 0.12%.');

// ══════════════════════════════════════════════════════════════════
// SECTION 3: Saturn eccentricity for perfect balance
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 3: SATURN ECCENTRICITY — LAW 4 vs LAW 5 CONVERGENCE');
console.log('───────────────────────────────────────────────────────────────\n');

// Perfect balance: sum203 = sum23 = v_Saturn
// v_Saturn = √m_Sa × a_Sa^(3/2) × e_Sa / √d_Sa
// → e_Sa = sum203 × √d / (√m × a^(3/2))
const sqrtM_sa = Math.sqrt(mass.saturn);
const a32_sa = Math.pow(orbitDistance.saturn, 1.5);
const d_sa = config32.saturn.d;
const e_perfect = j2000.sum203 * Math.sqrt(d_sa) / (sqrtM_sa * a32_sa);

const e_predicted = 0.05373;  // Law 4 AMD partition prediction (Finding 4)
const e_j2000 = 0.05386179;  // JPL J2000 observed

// Verify
const balPerfect = computeBalance({ ...eccJ2000, saturn: e_perfect });
const balPredicted = computeBalance({ ...eccJ2000, saturn: e_predicted });

console.log('Saturn eccentricity from three sources:\n');
console.log('| Source                        | e_Saturn   | Balance (%)  |');
console.log('|-------------------------------|------------|--------------|');
console.log(`| Law 4 prediction (AMD pair)   | ${e_predicted.toFixed(5).padStart(10)} | ${balPredicted.balance.toFixed(4).padStart(12)} |`);
console.log(`| Law 5 perfect balance         | ${e_perfect.toFixed(5).padStart(10)} | ${balPerfect.balance.toFixed(4).padStart(12)} |`);
console.log(`| J2000 observed (JPL DE440)    | ${e_j2000.toFixed(5).padStart(10)} | ${j2000.balance.toFixed(4).padStart(12)} |`);

console.log(`\nAgreement between Law 4 and Law 5:`);
console.log(`  Law 4 predicted:    ${e_predicted.toFixed(8)}`);
console.log(`  Law 5 perfect:      ${e_perfect.toFixed(8)}`);
console.log(`  Difference:         ${(e_predicted - e_perfect).toExponential(4)}  (${(Math.abs(e_predicted - e_perfect)/e_perfect * 100).toFixed(4)}%)`);
console.log(`\n  J2000 vs perfect:   ${(e_j2000 - e_perfect).toExponential(4)}  (${((e_j2000 - e_perfect)/e_j2000 * 100).toFixed(4)}%)`);
console.log(`  J2000 vs predicted: ${(e_j2000 - e_predicted).toExponential(4)}  (${((e_j2000 - e_predicted)/e_j2000 * 100).toFixed(4)}%)`);

console.log('\n  ★ KEY FINDING: Laws 4 and 5 independently converge on the');
console.log('    same Saturn eccentricity to within 0.01%. Two independent');
console.log('    Fibonacci constraints — AMD partition ratios (Law 4) and');
console.log('    eccentricity balance (Law 5) — predict essentially the');
console.log('    same value: e_Saturn ≈ 0.05373.');
console.log('    With this value, the eccentricity balance reaches 99.9952%.');

// ══════════════════════════════════════════════════════════════════
// SECTION 4: Balance scan across Saturn eccentricity range
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 4: BALANCE vs SATURN ECCENTRICITY');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('Saturn\'s eccentricity oscillates secularly (~0.01 to ~0.09).');
console.log('The balance passes through 100% near the model prediction.\n');

console.log('| Saturn e   | Balance (%)   | Notes                                |');
console.log('|------------|--------------|--------------------------------------|');

const scanValues = [
  [0.010, 'Near secular minimum'],
  [0.030, ''],
  [0.050, ''],
  [e_predicted, 'Law 4 AMD prediction'],
  [e_perfect, 'PERFECT BALANCE (Law 5)'],
  [e_j2000, 'J2000 observed (JPL)'],
  [0.060, ''],
  [0.070, ''],
  [0.090, 'Near secular maximum'],
];

for (const [e, note] of scanValues) {
  const r = computeBalance({ ...eccJ2000, saturn: e });
  const marker = note ? '← ' + note : '';
  console.log(`| ${e.toFixed(5).padStart(10)} | ${r.balance.toFixed(4).padStart(12)} | ${marker} |`);
}

// ══════════════════════════════════════════════════════════════════
// SECTION 5: Sensitivity analysis
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 5: SENSITIVITY — WHAT CLOSES THE GAP');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('For each planet, the smallest change in a or e that closes the gap:\n');

console.log('Orbital distance (a):');
console.log('| Planet   | Current a (AU) | Δa needed (AU) | Δa/a (%)   |');
console.log('|----------|----------------|----------------|------------|');
for (const p of planets) {
  const a = orbitDistance[p];
  const sign = config32[p].phase > 180 ? 1 : -1;
  const deltaA = (j2000.gap / j2000.v[p]) * a * (2/3) * sign;
  console.log(`| ${p.padEnd(8)} | ${a.toFixed(4).padStart(14)} | ${(deltaA > 0 ? '+' : '') + deltaA.toFixed(4).padStart(13)} | ${(Math.abs(deltaA/a)*100).toFixed(4).padStart(9)}% |`);
}

console.log('\nEccentricity (e):');
console.log('| Planet   | Current e      | Δe needed      | Δe/e (%)   |');
console.log('|----------|----------------|----------------|------------|');
for (const p of planets) {
  const sign = config32[p].phase > 180 ? 1 : -1;
  const deltaE = (j2000.gap / j2000.v[p]) * eccJ2000[p] * sign;
  console.log(`| ${p.padEnd(8)} | ${eccJ2000[p].toFixed(8)} | ${deltaE.toExponential(4).padStart(14)} | ${(Math.abs(deltaE/eccJ2000[p])*100).toFixed(4).padStart(9)}% |`);
}

console.log('\nRanked by smallest Δa/a:');
const ranked = planets.map(p => {
  return {
    name: p,
    pctA: Math.abs((j2000.gap / j2000.v[p]) * (2/3) * 100),
    pctE: Math.abs((j2000.gap / j2000.v[p]) * 100),
  };
}).sort((a,b) => a.pctA - b.pctA);

for (const r of ranked) {
  console.log(`  ${r.name.padEnd(8)}: Δa/a = ${r.pctA.toFixed(4)}%,  Δe/e = ${r.pctE.toFixed(4)}%`);
}

console.log('\n  The 3 most sensitive planets are the outer gas/ice giants (Saturn,');
console.log('  Jupiter, Uranus), which dominate the eccentricity weights. The 0.12%');
console.log('  gap requires only a 0.16% change in Saturn\'s orbital distance or');
console.log('  0.24% change in Saturn\'s eccentricity — both well within secular');
console.log('  oscillation ranges.');

// ══════════════════════════════════════════════════════════════════
// SECTION 6: TNO / closed system argument
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 6: CLOSED-SYSTEM ARGUMENT — WHY TNOs DON\'T PARTICIPATE');
console.log('───────────────────────────────────────────────────────────────\n');

const M_SUN_KG = 1.989e30;

// Known TNOs for comparison
const tnos = [
  { name: 'Pluto',    m_kg: 1.303e22, a: 39.48, e: 0.2488 },
  { name: 'Eris',     m_kg: 1.66e22,  a: 67.78, e: 0.4407 },
  { name: 'Haumea',   m_kg: 4.01e21,  a: 43.22, e: 0.1951 },
];

console.log('The eccentricity balance is an intrinsic 8-planet property. The');
console.log('mirror pairs act as "communicating vessels" that exchange AMD:');
console.log();
console.log('  Earth  ↔ Saturn    (d=3)   — cross-phase pair');
console.log('  Mars   ↔ Jupiter   (d=5)   — belt-adjacent pair');
console.log('  Mercury ↔ Uranus   (d=21)  — outermost pair');
console.log('  Venus  ↔ Neptune   (d=34)  — far pair');
console.log();
console.log('Why planets participate but TNOs do not:');
console.log();
console.log('  Planets:  Massive enough to gravitationally perturb each other\'s');
console.log('            orbits. They define the secular eigenmodes (s₁–s₈, g₁–g₈)');
console.log('            and exchange Angular Momentum Deficit (AMD) between pairs.');
console.log('            Their orbits are stable over billions of years.');
console.log();
console.log('  TNOs:     Too small to influence any planet\'s orbit. They are test');
console.log('            particles — they respond to planets but cannot shape the');
console.log('            eigenmode structure. No paired counterpart for AMD exchange.');
console.log();

// Quantitative demonstration: TNO v-weights vs gap
console.log('Quantitative comparison (v without d-factor):');
console.log('| Object   | v (no d)      | vs gap         | vs 8-planet total |');
console.log('|----------|---------------|----------------|-------------------|');
console.log(`| Gap      | ${j2000.gap.toExponential(4).padStart(13)} | 1×             |                   |`);
for (const t of tnos) {
  const v = Math.sqrt(t.m_kg / M_SUN_KG) * Math.pow(t.a, 1.5) * t.e;
  console.log(`| ${t.name.padEnd(8)} | ${v.toExponential(4).padStart(13)} | ${(v / j2000.gap).toFixed(0).padStart(5)}×          | ${(v / j2000.total).toFixed(1).padStart(5)}× total     |`);
}
console.log();
console.log('  Even Pluto alone (at d=1) overshoots the gap by 137×.');
console.log('  The a^(3/2) scaling amplifies TNOs far more than the √a scaling');
console.log('  of the inclination balance, making them too heavy for any');
console.log('  Fibonacci d-factor to serve as a fine correction.');
console.log();
console.log('  Conclusion: The eccentricity balance is a closed-system property');
console.log('  of the 8-planet secular system. Unlike the inclination balance');
console.log('  (where TNOs provide a tiny 0.0002% nudge), the eccentricity');
console.log('  balance operates through pairwise AMD exchange and does not');
console.log('  admit external participants.');

// ══════════════════════════════════════════════════════════════════
// SECTION 7: Inclination balance comparison
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 7: COMPARISON — INCLINATION vs ECCENTRICITY BALANCE');
console.log('───────────────────────────────────────────────────────────────\n');

// Inclination balance
const PSI = 2205 / (2 * holisticyearLength);
let inclSum203 = 0, inclSum23 = 0;
for (const p of planets) {
  const d = config32[p].d;
  const w = Math.sqrt(mass[p] * orbitDistance[p] * (1 - eccJ2000[p] * eccJ2000[p])) / d;
  if (config32[p].phase > 180) inclSum203 += w; else inclSum23 += w;
}
const inclTotal = inclSum203 + inclSum23;
const inclGap = Math.abs(inclSum203 - inclSum23);
const inclBalance = (1 - inclGap / inclTotal) * 100;

console.log('| Property                 | Inclination (Law 3)  | Eccentricity (Law 5)  |');
console.log('|--------------------------|---------------------|-----------------------|');
console.log(`| Weight formula           | w = √(m·a(1-e²))/d | v = √m·a^(3/2)·e/√d  |`);
console.log(`| d scaling                | 1/d                 | 1/√d                  |`);
console.log(`| a scaling                | √a                  | a^(3/2)               |`);
console.log(`| Balance (J2000)          | ${inclBalance.toFixed(4)}%          | ${j2000.balance.toFixed(4)}%            |`);
console.log(`| Balance (predicted e_Sa) | ${inclBalance.toFixed(4)}%          | ${balPredicted.balance.toFixed(4)}%            |`);
console.log(`| Gap                      | ${inclGap.toExponential(3).padStart(12)}        | ${j2000.gap.toExponential(3).padStart(12)}          |`);
console.log(`| TNO correction possible  | Yes (tiny, 0.0002%) | No (a^(3/2) too heavy)|`);
console.log(`| System type              | Global (all mass)   | Closed (8 planets)    |`);

// ══════════════════════════════════════════════════════════════════
// SECTION 8: Summary
// ══════════════════════════════════════════════════════════════════
console.log('\n───────────────────────────────────────────────────────────────');
console.log('SECTION 8: SUMMARY');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('1. BALANCE: The 8-planet eccentricity balance is 99.88% with');
console.log('   J2000 eccentricities. With the model\'s predicted Saturn');
console.log('   eccentricity (Law 4: e = 0.05373), it reaches 99.9952%.');
console.log();
console.log('2. LAW CONVERGENCE: Laws 4 and 5 independently predict the');
console.log('   same Saturn eccentricity to 0.01%:');
console.log(`     Law 4 (AMD partition):  e = ${e_predicted}`);
console.log(`     Law 5 (perfect balance): e = ${e_perfect.toFixed(5)}`);
console.log(`     Difference:              ${Math.abs(e_predicted - e_perfect).toExponential(2)}`);
console.log();
console.log('3. PAIR CANCELLATION: Four mirror pairs with contributions');
console.log('   spanning ±42,000% of the gap cancel to 0.12%. The balance');
console.log('   emerges from the communicating-vessel structure of AMD exchange.');
console.log();
console.log('4. CLOSED SYSTEM: TNOs cannot participate because:');
console.log('   (a) they lack mirror-pair counterparts for AMD exchange,');
console.log('   (b) the a^(3/2) weighting makes them far too heavy, and');
console.log('   (c) they are test particles, not eigenmode-defining masses.');
console.log();
console.log('5. SENSITIVITY: The gap corresponds to a 0.24% change in');
console.log('   Saturn\'s eccentricity — within the secular oscillation');
console.log('   range of 0.01 to 0.09. The balance crosses 100% as Saturn\'s');
console.log('   eccentricity passes through its model-predicted mean value.');
