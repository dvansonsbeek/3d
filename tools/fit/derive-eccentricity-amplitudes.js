// ═══════════════════════════════════════════════════════════════
// Derive Planet Eccentricity Amplitudes from K Constant
//
// Derives eccentricityAmplitudeK from Earth's parameters, then
// computes orbitalEccentricityAmplitude and eccentricityPhaseJ2000
// for all planets using the universal K formula:
//
//   e_amp = K × sin(tilt) × √d / (√m × a^1.5)
//
// The phase is solved from the law of cosines eccentricity formula:
//   e(J2000) = sqrt(base² + amp² - 2·base·amp·cos(θ))
//   → cos(θ) = (base² + amp² - e_J2000²) / (2·base·amp)
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

// ── Step 2: Compute per-planet amplitudes and phases ───────────

const planetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const P_earth = C.meanSolarYearDays;
const updates = {};
let anyChanged = false;

console.log('  Planet      | Old amp         | New amp         | Old phase  | New phase  | Amp Δ%   | Phase Δ°');
console.log('  ------------|-----------------|-----------------|------------|------------|----------|--------');

for (const key of planetKeys) {
  const p = C.planets[key];
  const tilt = p.axialTiltMean;
  const d = p.fibonacciD;
  const m = C.massFraction[key];
  const period_days = p.solarYearInput;
  const a = Math.pow(period_days / P_earth, 2 / 3);  // AU from Kepler

  // New amplitude from K formula
  const ampNew = K * Math.sin(tilt * Math.PI / 180) * Math.sqrt(d)
               / (Math.sqrt(m) * Math.pow(a, 1.5));

  // New phase from law of cosines: e(J2000) = sqrt(base² + amp² - 2·base·amp·cos(θ))
  const base = p.orbitalEccentricityBase;
  const e_j2000 = p.orbitalEccentricityJ2000 || base;
  const cosTheta = (base * base + ampNew * ampNew - e_j2000 * e_j2000) / (2 * base * ampNew);

  let phaseNew;
  if (Math.abs(cosTheta) <= 1) {
    phaseNew = Math.acos(cosTheta) * 180 / Math.PI;
  } else {
    // Amplitude too small to reach e_J2000 — lock at nearest boundary
    phaseNew = cosTheta > 1 ? 0 : 180;
  }

  const ampOld = p.orbitalEccentricityAmplitude;
  const phaseOld = p.eccentricityPhaseJ2000;
  const ampDiff = (ampNew / ampOld - 1) * 100;
  const phaseDiff = phaseNew - phaseOld;

  console.log(
    '  ' + key.padEnd(12) + '| ' +
    ampOld.toExponential(5).padEnd(16) + '| ' +
    ampNew.toExponential(5).padEnd(16) + '| ' +
    phaseOld.toFixed(4).padStart(10) + ' | ' +
    phaseNew.toFixed(4).padStart(10) + ' | ' +
    (ampDiff >= 0 ? '+' : '') + ampDiff.toFixed(3) + '%'.padEnd(4) + '| ' +
    (phaseDiff >= 0 ? '+' : '') + phaseDiff.toFixed(4)
  );

  if (Math.abs(ampDiff) > 0.001 || Math.abs(phaseDiff) > 0.0001) {
    anyChanged = true;
    updates[key] = { amplitude: ampNew, phase: phaseNew };
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
  mp.planets[key].orbitalEccentricityAmplitude = vals.amplitude;
  mp.planets[key].eccentricityPhaseJ2000 = vals.phase;
}

fs.writeFileSync(MP_PATH, JSON.stringify(mp, null, 2) + '\n');
console.log(`  ✓ Updated model-parameters.json:`);
console.log(`    - eccentricityAmplitudeK: ${K.toExponential(10)}`);
for (const [key, vals] of Object.entries(updates)) {
  console.log(`    - ${key}: amp=${vals.amplitude.toExponential(5)}, phase=${vals.phase.toFixed(4)}°`);
}
console.log('');
console.log('  Next: run export-to-script.js --write to sync to script.js\n');
