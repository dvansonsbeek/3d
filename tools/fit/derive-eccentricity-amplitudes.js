// ═══════════════════════════════════════════════════════════════
// Derive Planet Eccentricity Parameters (Pipeline Step 7a)
//
// Three derivations:
//   1. K from Earth: K = e_amp × √m / (sin(tilt) × √d)
//   2. Venus base from R=311: e_V = ψ / (311 × √m_V)
//   3. Mercury/Mars amplitude from K: e_amp = K × sin(tilt) × √d / (√m × a^1.5)
//
// Phase is recomputed for all affected planets via law of cosines.
// Venus amplitude is NOT K-derived (Laplace-Lagrange dominated).
// Outer planet amplitudes are kept as-is (negligible K contribution).
//
// Usage: node tools/fit/derive-eccentricity-amplitudes.js [--write]
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const MP_PATH = path.join(__dirname, '..', '..', 'public', 'input', 'model-parameters.json');

// ── Step 1: Derive K from Earth ────────────────────────────────

const earthAmp = C.eccentricityAmplitude;
const earthTilt = C.earthtiltMean;
const earthD = 3;  // Earth Fibonacci divisor
const earthM = C.massFraction.earth;
const earthA = 1.0;  // AU

const K = earthAmp * Math.sqrt(earthM) * Math.pow(earthA, 1.5)
        / (Math.sin(earthTilt * Math.PI / 180) * Math.sqrt(earthD));

console.log('═══ Derive Planet Eccentricity Amplitudes ═══');
console.log('');
console.log('  K derived from Earth:');
console.log(`    eccentricityAmplitude = ${earthAmp}`);
console.log(`    earthtiltMean         = ${earthTilt}°`);
console.log(`    massFraction.earth    = ${earthM.toExponential(6)}`);
console.log(`    fibonacciD            = ${earthD}`);
console.log(`    K = ${K.toExponential(10)}`);
console.log('');

const storedK = C.eccentricityAmplitudeK;
if (Math.abs(K - storedK) / K > 1e-6) {
  console.log(`  ⚠ Stored K (${storedK.toExponential(10)}) differs from derived by ${((storedK/K - 1) * 100).toFixed(4)}%`);
  console.log('    → Will update eccentricityAmplitudeK in model-parameters.json');
} else {
  console.log(`  ✓ Stored K matches derived (diff < 0.0001%)`);
}
console.log('');

// ── Step 2: Derive Venus base from R=311 ──────────────────────

const R = 311;  // Fibonacci primitive root prime — master ratio
const venusM = C.massFraction.venus;
const venusBaseNew = K > 0 ? C.PSI / (R * Math.sqrt(venusM)) : C.planets.venus.orbitalEccentricityBase;
const venusBaseOld = C.planets.venus.orbitalEccentricityBase;

console.log(`  Venus base from R=${R}: e_V = ψ / (${R} × √m_V) = ${venusBaseNew.toFixed(10)}`);
console.log(`  Venus base stored:     ${venusBaseOld.toFixed(10)}`);
if (Math.abs(venusBaseNew - venusBaseOld) / venusBaseOld > 1e-6) {
  console.log(`  ⚠ Differs by ${((venusBaseNew / venusBaseOld - 1) * 100).toFixed(4)}% → will update`);
} else {
  console.log(`  ✓ Matches (diff < 0.0001%)`);
}
console.log('');

// ── Step 3: Compute per-planet amplitudes and phases ───────────

// K-driven amplitude applies to Mercury and Mars (high tilt, good R²).
// Venus: base from R=311, amplitude kept as-is (Laplace-Lagrange dominated).
// Outer planets: amplitude kept as-is (negligible compared to J2000-base diff).
// Phase is recomputed for ALL planets when base or amplitude changes.
const kDrivenPlanets = ['mercury', 'mars'];
const allPlanetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const P_earth = C.meanSolarYearDays;
const updates = {};
let anyChanged = false;

console.log('  Planet      | Old amp         | New amp         | Old phase  | New phase  | Amp Δ%   | Phase Δ°  | Mode');
console.log('  ------------|-----------------|-----------------|------------|------------|----------|-----------|----------');

for (const key of allPlanetKeys) {
  const p = C.planets[key];
  const tilt = p.axialTiltMean;
  const d = p.fibonacciD;
  const m = C.massFraction[key];
  const period_days = p.solarYearInput;
  const a = Math.pow(period_days / P_earth, 2 / 3);  // AU from Kepler
  const isKDriven = kDrivenPlanets.includes(key);
  const isVenus = key === 'venus';

  // Amplitude: K formula for K-driven planets, keep existing for others
  const ampNew = isKDriven
    ? K * Math.sin(tilt * Math.PI / 180) * Math.sqrt(d) / (Math.sqrt(m) * Math.pow(a, 1.5))
    : p.orbitalEccentricityAmplitude;

  // Base: R=311 for Venus, existing for others
  const base = isVenus ? venusBaseNew : p.orbitalEccentricityBase;

  // Phase from law of cosines: e(J2000) = sqrt(base² + amp² - 2·base·amp·cos(θ))
  const e_j2000 = p.orbitalEccentricityJ2000 || base;
  const cosTheta = (base * base + ampNew * ampNew - e_j2000 * e_j2000) / (2 * base * ampNew);

  let phaseNew;
  if (Math.abs(cosTheta) <= 1) {
    phaseNew = Math.acos(cosTheta) * 180 / Math.PI;
  } else {
    phaseNew = cosTheta > 1 ? 0 : 180;
  }

  const ampOld = p.orbitalEccentricityAmplitude;
  const phaseOld = p.eccentricityPhaseJ2000;
  const ampDiff = (ampNew / ampOld - 1) * 100;
  const phaseDiff = phaseNew - phaseOld;
  const mode = isKDriven ? 'K-driven' : isVenus ? 'R=311' : 'keep';

  console.log(
    '  ' + key.padEnd(12) + '| ' +
    ampOld.toExponential(5).padEnd(16) + '| ' +
    ampNew.toExponential(5).padEnd(16) + '| ' +
    phaseOld.toFixed(4).padStart(10) + ' | ' +
    phaseNew.toFixed(4).padStart(10) + ' | ' +
    (ampDiff >= 0 ? '+' : '') + ampDiff.toFixed(3) + '%'.padEnd(4) + '| ' +
    (phaseDiff >= 0 ? '+' : '') + phaseDiff.toFixed(4).padEnd(9) + ' | ' +
    mode
  );

  if (isKDriven && (Math.abs(ampDiff) > 0.001 || Math.abs(phaseDiff) > 0.0001)) {
    anyChanged = true;
    updates[key] = { amplitude: ampNew, phase: phaseNew };
  }
  if (isVenus) {
    // Venus: update base + phase (amplitude unchanged)
    const baseChanged = Math.abs(venusBaseNew - venusBaseOld) / venusBaseOld > 1e-6;
    const phaseChanged = Math.abs(phaseDiff) > 0.0001;
    if (baseChanged || phaseChanged) {
      anyChanged = true;
      updates[key] = { base: venusBaseNew, phase: phaseNew };
    }
  }
}

// ── Step 3: Verify Earth consistency ───────────────────────────

console.log('');
const earthBase = C.eccentricityBase;
const earthEJ2000 = C.eccJ2000.earth;
const earthCosTheta = (earthBase * earthBase + earthAmp * earthAmp - earthEJ2000 * earthEJ2000)
                    / (2 * earthBase * earthAmp);
const earthPhase = Math.acos(earthCosTheta) * 180 / Math.PI;
console.log(`  Earth verification: e(J2000) = ${earthEJ2000}, phase = ${earthPhase.toFixed(4)}°`);
console.log(`  e_reconstructed = ${Math.sqrt(earthBase*earthBase + earthAmp*earthAmp - 2*earthBase*earthAmp*Math.cos(earthPhase*Math.PI/180)).toFixed(8)} (should be ${earthEJ2000})`);
console.log('');

// ── Step 4: Write if --write ───────────────────────────────────

if (!anyChanged) {
  console.log('  ✓ All amplitudes and phases already match K. Nothing to update.\n');
  process.exit(0);
}

if (!WRITE) {
  console.log(`  ${Object.keys(updates).length} planets need updating. Run with --write to apply.\n`);
  process.exit(0);
}

// Read and update model-parameters.json
const mp = JSON.parse(fs.readFileSync(MP_PATH, 'utf8'));

// Update K
mp.earth.eccentricityAmplitudeK = K;

// Update per-planet values
for (const [key, vals] of Object.entries(updates)) {
  if (vals.amplitude !== undefined) mp.planets[key].orbitalEccentricityAmplitude = vals.amplitude;
  if (vals.base !== undefined) mp.planets[key].orbitalEccentricityBase = vals.base;
  if (vals.phase !== undefined) mp.planets[key].eccentricityPhaseJ2000 = vals.phase;
}

fs.writeFileSync(MP_PATH, JSON.stringify(mp, null, 2) + '\n');
console.log(`  ✓ Updated model-parameters.json:`);
console.log(`    - eccentricityAmplitudeK: ${K.toExponential(10)}`);
for (const [key, vals] of Object.entries(updates)) {
  const parts = [];
  if (vals.base !== undefined) parts.push(`base=${vals.base.toFixed(8)}`);
  if (vals.amplitude !== undefined) parts.push(`amp=${vals.amplitude.toExponential(5)}`);
  if (vals.phase !== undefined) parts.push(`phase=${vals.phase.toFixed(4)}°`);
  console.log(`    - ${key}: ${parts.join(', ')}`);
}
console.log('');
console.log('  Next: run export-to-script.js --write to sync to script.js\n');
