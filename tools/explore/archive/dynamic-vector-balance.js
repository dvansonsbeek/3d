// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC VECTOR BALANCE EXPLORATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Tests whether the invariable plane remains stable over time by computing
// the 2D angular momentum perturbation vector at many time points.
//
// Physical requirement: The total angular momentum vector must remain fixed.
// Each planet's orbital plane tilts (inclination) and rotates (ascending node),
// creating a time-varying perturbation. For the invariable plane to be stable:
//
//   Σ L_j × i_j(t) × cos(Ω_j(t)) = constant   (x-component)
//   Σ L_j × i_j(t) × sin(Ω_j(t)) = constant   (y-component)
//
// where:
//   i_j(t) = mean_j + sign_j × amp_j × cos(ω̃_ICRF_j(t) - φ_j)
//   Ω_j(t) = Ω_j(J2000) + ascNodeRate_j × (t - 2000)
//
// If phase angles matter, changing them should break the time-constancy
// of the vector sum.
//
// Usage: node tools/explore/dynamic-vector-balance.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;

// ═══════════════════════════════════════════════════════════════════════════
// PLANET DATA
// ═══════════════════════════════════════════════════════════════════════════

const planetData = {};
const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

for (const key of planetKeys) {
  const p = key === 'earth' ? null : C.planets[key];
  const pd = {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    // Perihelion (ecliptic + ICRF)
    eclP: key === 'earth' ? H / 16 : p.perihelionEclipticYears,
    periLong: key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion,
    // Inclination
    inclJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000,
    d: key === 'earth' ? 3 : p.fibonacciD,
    phaseAngle: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationPhaseAngle : p.inclinationPhaseAngle,
    antiPhase: key === 'earth' ? false : p.antiPhase,
    // Ascending node on invariable plane
    omegaJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane,
    ascNodeCycles8H: key === 'earth' ? (8 * H / (H / 5)) : p.ascendingNodeCyclesIn8H, // Earth: -H/5
    // Mass & orbit
    mass: C.massFraction[key],
    sma: key === 'earth' ? 1.0 : C.derived[key].orbitDistance,
    ecc: C.eccJ2000[key],
  };

  // Derived values
  pd.icrfP = key === 'earth' ? H / 3 : 1 / (1 / pd.eclP - 1 / genPrec);
  pd.icrfRate = 360 / pd.icrfP;  // deg/yr
  pd.amp = PSI / (pd.d * Math.sqrt(pd.mass));
  pd.L = pd.mass * Math.sqrt(pd.sma * (1 - pd.ecc * pd.ecc));  // angular momentum proxy

  // Ascending node rate (deg/yr) — regresses for all planets
  const ascNodePeriod = (8 * H) / pd.ascNodeCycles8H;
  pd.ascNodeRate = -360 / ascNodePeriod;  // negative = regression

  // Mean inclination (from J2000 constraint)
  const antiSign = pd.antiPhase ? -1 : 1;
  const cosJ2000 = Math.cos((pd.periLong - pd.phaseAngle) * DEG2RAD);
  pd.mean = pd.inclJ2000 - antiSign * pd.amp * cosJ2000;

  // Structural weight w = √(m·a(1-e²)) / d
  pd.w = Math.sqrt(pd.mass * pd.sma * (1 - pd.ecc * pd.ecc)) / pd.d;

  planetData[key] = pd;
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC BALANCE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the 2D angular momentum perturbation vector at a given year.
 *
 * @param {number} year - decimal year
 * @param {object} [overrides] - optional per-planet phase angle overrides
 * @returns {{ x, y, mag, total, balance, perPlanet }}
 */
function vectorBalance(year, overrides) {
  let sumX = 0, sumY = 0, totalMag = 0;
  const perPlanet = {};

  for (const key of planetKeys) {
    const p = planetData[key];
    const phaseAngle = (overrides && overrides[key] !== undefined) ? overrides[key] : p.phaseAngle;
    const antiSign = p.antiPhase ? -1 : 1;

    // ICRF perihelion at this year
    const peri = p.periLong + p.icrfRate * (year - 2000);

    // Inclination at this year
    const incl = p.mean + antiSign * p.amp * Math.cos((peri - phaseAngle) * DEG2RAD);

    // Ascending node at this year
    const omega = (p.omegaJ2000 + p.ascNodeRate * (year - 2000)) * DEG2RAD;

    // Angular momentum perturbation vector (in invariable plane)
    const inclRad = incl * DEG2RAD;
    const mag = p.L * Math.sin(inclRad);
    const x = mag * Math.cos(omega);
    const y = mag * Math.sin(omega);

    sumX += x;
    sumY += y;
    totalMag += Math.abs(mag);

    perPlanet[key] = { incl, omega: omega / DEG2RAD, mag, x, y };
  }

  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  const balance = totalMag > 0 ? (1 - residual / totalMag) * 100 : 100;
  const direction = Math.atan2(sumY, sumX) / DEG2RAD;

  return { x: sumX, y: sumY, mag: residual, total: totalMag, balance, direction, perPlanet };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║         DYNAMIC VECTOR BALANCE EXPLORATION                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// ── Section 1: Planet parameters ─────────────────────────────────────────

console.log('1. PLANET PARAMETERS');
console.log('────────────────────');
console.log('');
console.log('   Planet     │ d  │ Phase φ   │ ICRF rate    │ Ω rate       │ Mean incl  │ Amplitude  │ L (a.m.)');
console.log('   ───────────┼────┼───────────┼──────────────┼──────────────┼────────────┼────────────┼──────────────');
for (const key of planetKeys) {
  const p = planetData[key];
  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    p.d.toString().padStart(2) + ' │ ' +
    (p.phaseAngle.toFixed(2) + '°').padStart(9) + ' │ ' +
    (p.icrfRate.toFixed(6) + '°/yr').padStart(12) + ' │ ' +
    (p.ascNodeRate.toFixed(6) + '°/yr').padStart(12) + ' │ ' +
    (p.mean.toFixed(4) + '°').padStart(10) + ' │ ' +
    (p.amp.toFixed(4) + '°').padStart(10) + ' │ ' +
    p.L.toExponential(4).padStart(12));
}

// ── Section 2: Static scalar balance (reference) ─────────────────────────

console.log('');
console.log('2. SCALAR BALANCE (reference — phase angles NOT used)');
console.log('─────────────────────────────────────────────────────');
console.log('');
let sumIn = 0, sumAnti = 0;
for (const key of planetKeys) {
  const p = planetData[key];
  if (p.antiPhase) sumAnti += p.w; else sumIn += p.w;
}
const scalarBal = (1 - Math.abs(sumIn - sumAnti) / (sumIn + sumAnti)) * 100;
console.log(`   Σ(in-phase) w = ${sumIn.toExponential(10)}`);
console.log(`   Σ(anti-phase) w = ${sumAnti.toExponential(10)}`);
console.log(`   Scalar balance:  ${scalarBal.toFixed(6)}%`);
console.log('');

// ── Section 3: Vector balance at key epochs ──────────────────────────────

console.log('3. VECTOR BALANCE AT KEY EPOCHS');
console.log('───────────────────────────────');
console.log('');
console.log('   Year            │ |Residual|      │ Total          │ Balance %     │ Direction');
console.log('   ────────────────┼─────────────────┼────────────────┼───────────────┼──────────');

const epochs = [
  { year: balancedYear, label: 'Balanced year' },
  { year: balancedYear + H/2, label: 'Half H' },
  { year: -100000, label: '-100,000' },
  { year: -50000, label: '-50,000' },
  { year: 0, label: '0 AD' },
  { year: 1000, label: '1000 AD' },
  { year: 2000, label: 'J2000' },
  { year: 3000, label: '3000 AD' },
  { year: 10000, label: '10,000 AD' },
  { year: 50000, label: '50,000 AD' },
];

for (const { year, label } of epochs) {
  const r = vectorBalance(year);
  console.log('   ' + label.padEnd(16) + ' │ ' +
    r.mag.toExponential(6).padStart(15) + ' │ ' +
    r.total.toExponential(6).padStart(14) + ' │ ' +
    r.balance.toFixed(6).padStart(13) + ' │ ' +
    (r.direction.toFixed(1) + '°').padStart(8));
}

// ── Section 4: Balance over a full 8H super-period ──────────────────────

console.log('');
console.log('4. BALANCE OVER FULL 8H SUPER-PERIOD');
console.log('─────────────────────────────────────');
console.log('');

const superPeriod = 8 * H;
const nSamples = 1000;
const step = superPeriod / nSamples;

let minBal = 100, maxBal = 0, sumBal = 0;
let minBalYear = 0, maxBalYear = 0;
let minRes = Infinity, maxRes = 0;

for (let i = 0; i <= nSamples; i++) {
  const year = balancedYear + i * step;
  const r = vectorBalance(year);
  sumBal += r.balance;
  if (r.balance < minBal) { minBal = r.balance; minBalYear = year; }
  if (r.balance > maxBal) { maxBal = r.balance; maxBalYear = year; }
  if (r.mag < minRes) minRes = r.mag;
  if (r.mag > maxRes) maxRes = r.mag;
}

const avgBal = sumBal / (nSamples + 1);
console.log(`   Samples:  ${nSamples + 1} points across ${superPeriod.toLocaleString()} years (8H)`);
console.log(`   Min balance:  ${minBal.toFixed(6)}%  (year ${Math.round(minBalYear)})`);
console.log(`   Max balance:  ${maxBal.toFixed(6)}%  (year ${Math.round(maxBalYear)})`);
console.log(`   Mean balance: ${avgBal.toFixed(6)}%`);
console.log(`   Residual range: ${minRes.toExponential(4)} — ${maxRes.toExponential(4)}`);
console.log(`   Variation:    ${(maxBal - minBal).toFixed(6)} percentage points`);

// ── Section 5: Per-planet contribution at J2000 ─────────────────────────

console.log('');
console.log('5. PER-PLANET VECTORS AT J2000');
console.log('──────────────────────────────');
console.log('');

const j2000 = vectorBalance(2000);
console.log('   Planet     │ i(2000)    │ Ω(2000)    │ |L×sin(i)|    │ x-component    │ y-component');
console.log('   ───────────┼────────────┼────────────┼───────────────┼────────────────┼────────────────');
for (const key of planetKeys) {
  const v = j2000.perPlanet[key];
  const p = planetData[key];
  console.log('   ' + p.name.padEnd(10) + ' │ ' +
    (v.incl.toFixed(4) + '°').padStart(10) + ' │ ' +
    (((v.omega % 360) + 360) % 360).toFixed(2).padStart(10) + '° │ ' +
    Math.abs(v.mag).toExponential(4).padStart(13) + ' │ ' +
    v.x.toExponential(4).padStart(14) + ' │ ' +
    v.y.toExponential(4).padStart(14));
}
console.log('');
console.log(`   Σx = ${j2000.x.toExponential(6)}`);
console.log(`   Σy = ${j2000.y.toExponential(6)}`);
console.log(`   |Σ| = ${j2000.mag.toExponential(6)}  (direction: ${j2000.direction.toFixed(1)}°)`);
console.log(`   Vector balance: ${j2000.balance.toFixed(6)}%`);

// ── Section 6: Sensitivity to phase angle changes ───────────────────────

console.log('');
console.log('6. PHASE ANGLE SENSITIVITY (±10° perturbation at J2000)');
console.log('───────────────────────────────────────────────────────');
console.log('');
console.log('   Planet     │ Default bal │ φ + 10°     │ φ - 10°     │ Δ max');
console.log('   ───────────┼─────────────┼─────────────┼─────────────┼──────────');

const baseBal = vectorBalance(2000).balance;
for (const key of planetKeys) {
  const plus = vectorBalance(2000, { [key]: planetData[key].phaseAngle + 10 }).balance;
  const minus = vectorBalance(2000, { [key]: planetData[key].phaseAngle - 10 }).balance;
  const delta = Math.max(Math.abs(plus - baseBal), Math.abs(minus - baseBal));
  console.log('   ' + planetData[key].name.padEnd(10) + ' │ ' +
    baseBal.toFixed(6).padStart(11) + ' │ ' +
    plus.toFixed(6).padStart(11) + ' │ ' +
    minus.toFixed(6).padStart(11) + ' │ ' +
    delta.toFixed(6).padStart(8));
}

// ── Section 7: Sensitivity over time (not just at J2000) ────────────────

console.log('');
console.log('7. PHASE ANGLE SENSITIVITY OVER TIME');
console.log('────────────────────────────────────');
console.log('   For each planet: perturb φ by +10°, measure balance variation over 8H');
console.log('');
console.log('   Planet     │ Default var │ Perturbed var │ Default mean │ Perturbed mean │ Δ mean');
console.log('   ───────────┼─────────────┼───────────────┼──────────────┼────────────────┼──────────');

// Default variation over 8H
let defMin = 100, defMax = 0, defSum = 0;
for (let i = 0; i <= nSamples; i++) {
  const year = balancedYear + i * step;
  const r = vectorBalance(year);
  defSum += r.balance;
  if (r.balance < defMin) defMin = r.balance;
  if (r.balance > defMax) defMax = r.balance;
}
const defMean = defSum / (nSamples + 1);
const defVar = defMax - defMin;

for (const key of planetKeys) {
  const override = { [key]: planetData[key].phaseAngle + 10 };
  let pMin = 100, pMax = 0, pSum = 0;
  for (let i = 0; i <= nSamples; i++) {
    const year = balancedYear + i * step;
    const r = vectorBalance(year, override);
    pSum += r.balance;
    if (r.balance < pMin) pMin = r.balance;
    if (r.balance > pMax) pMax = r.balance;
  }
  const pMean = pSum / (nSamples + 1);
  const pVar = pMax - pMin;
  console.log('   ' + planetData[key].name.padEnd(10) + ' │ ' +
    defVar.toFixed(6).padStart(11) + ' │ ' +
    pVar.toFixed(6).padStart(13) + ' │ ' +
    defMean.toFixed(6).padStart(12) + ' │ ' +
    pMean.toFixed(6).padStart(14) + ' │ ' +
    (pMean - defMean).toFixed(6).padStart(8));
}

// ── Section 8: Group swap test ──────────────────────────────────────────

console.log('');
console.log('8. GROUP SWAP TEST');
console.log('──────────────────');
console.log('   What happens if we flip Saturn to in-phase (or another planet to anti-phase)?');
console.log('');

// Temporarily swap Saturn to in-phase by flipping its sign
// We do this by giving it a phase angle offset of 180° (which is what in-phase means)
const satPhase = planetData.saturn.phaseAngle;
const satSwap = vectorBalance(2000, { saturn: (satPhase + 180) % 360 });
console.log(`   Saturn → in-phase (φ+180°): balance = ${satSwap.balance.toFixed(4)}%  (was ${baseBal.toFixed(4)}%)`);

// Swap Jupiter to anti-phase
const jupPhase = planetData.jupiter.phaseAngle;
const jupSwap = vectorBalance(2000, { jupiter: (jupPhase + 180) % 360 });
console.log(`   Jupiter → anti-phase (φ+180°): balance = ${jupSwap.balance.toFixed(4)}%  (was ${baseBal.toFixed(4)}%)`);

// ── Section 9: Comparison — ascending node vs fixed direction ───────────

console.log('');
console.log('9. ASCENDING NODE CONTRIBUTION');
console.log('──────────────────────────────');
console.log('   Does the ascending node direction matter, or is it mainly the inclination?');
console.log('');

// Compare: normal vector balance vs "fixed Ω" (all nodes at J2000 values)
function vectorBalanceFixedOmega(year) {
  let sumX = 0, sumY = 0, totalMag = 0;
  for (const key of planetKeys) {
    const p = planetData[key];
    const antiSign = p.antiPhase ? -1 : 1;
    const peri = p.periLong + p.icrfRate * (year - 2000);
    const incl = p.mean + antiSign * p.amp * Math.cos((peri - p.phaseAngle) * DEG2RAD);
    const omega = p.omegaJ2000 * DEG2RAD;  // FIXED at J2000
    const inclRad = incl * DEG2RAD;
    const mag = p.L * Math.sin(inclRad);
    sumX += mag * Math.cos(omega);
    sumY += mag * Math.sin(omega);
    totalMag += Math.abs(mag);
  }
  const residual = Math.sqrt(sumX * sumX + sumY * sumY);
  return (1 - residual / totalMag) * 100;
}

console.log('   Year            │ Dynamic Ω bal │ Fixed Ω bal   │ Δ');
console.log('   ────────────────┼───────────────┼───────────────┼──────────');
for (const { year, label } of epochs) {
  const dynamic = vectorBalance(year).balance;
  const fixed = vectorBalanceFixedOmega(year);
  console.log('   ' + label.padEnd(16) + ' │ ' +
    dynamic.toFixed(6).padStart(13) + ' │ ' +
    fixed.toFixed(6).padStart(13) + ' │ ' +
    (dynamic - fixed).toFixed(6).padStart(8));
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('If the vector balance is high AND stable over 8H, the phase angles and');
console.log('ascending nodes create a self-consistent dynamic system where the');
console.log('invariable plane remains fixed despite each planet oscillating individually.');
console.log('');
