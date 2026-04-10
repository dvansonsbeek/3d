// ═══════════════════════════════════════════════════════════════
// Derive Planet Eccentricity Parameters (Pipeline Step 7a)
//
// K from Earth: K = e_amp × √m × a^1.5 / (sin(meanObliquity) × √d)
//
// All 7 planet amplitudes derived from K (symmetric with PSI):
//   e_amp = K × sin(meanObliquity) × √d / (√m × a^1.5)
//
// Uses model mean obliquity (from PSI → incl amp → mean tilt).
// Base eccentricities come from the dual-balance optimizer (Step 7b).
// Phase is recomputed for all planets via law of cosines.
//
// Usage: node tools/fit/derive-eccentricity-amplitudes.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

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

// All 7 planets get their amplitude from K using model mean obliquity
// (symmetric with PSI for inclination). Closes the loop:
// PSI → incl amp → mean tilt → K → ecc amp.
// Venus also gets its base from R=311.
// Phase is recomputed for all planets via law of cosines.
//
// Note: constants.js now computes these at runtime. This script verifies
// that the JSON values match and updates them if Earth parameters change.
const allPlanetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const P_earth = C.meanSolarYearDays;
const updates = {};
let anyChanged = false;

console.log('  Planet      | Mean tilt  | Old amp         | K-derived amp   | Old phase  | New phase  | Amp Δ%   | Phase Δ°');
console.log('  ------------|------------|-----------------|-----------------|------------|------------|----------|----------');

for (const key of allPlanetKeys) {
  const p = C.planets[key];
  const meanTilt = p.obliquityMean;  // computed by constants.js from PSI → incl amp → mean tilt
  const d = p.fibonacciD;
  const m = C.massFraction[key];
  const period_days = p.solarYearInput;
  const a = Math.pow(period_days / P_earth, 2 / 3);  // AU from Kepler

  // Amplitude from K using model mean obliquity
  const ampNew = K * Math.sin(Math.abs(meanTilt) * Math.PI / 180) * Math.sqrt(d) / (Math.sqrt(m) * Math.pow(a, 1.5));

  // Base from dual-balance optimizer (Step 7b)
  const base = p.orbitalEccentricityBase;

  // Phase from law of cosines: e(J2000) = sqrt(base² + amp² - 2·base·amp·cos(θ))
  const e_j2000 = p.orbitalEccentricityJ2000 || base;
  const cosTheta = (base * base + ampNew * ampNew - e_j2000 * e_j2000) / (2 * base * ampNew);

  let phaseNew;
  if (Math.abs(cosTheta) <= 1) {
    phaseNew = Math.acos(cosTheta) * 180 / Math.PI;
  } else {
    phaseNew = cosTheta > 1 ? 0 : 180;
  }

  // Compare against runtime-derived values (from constants.js)
  const ampOld = p.orbitalEccentricityAmplitude;
  const phaseOld = p.eccentricityPhaseJ2000;
  const ampDiff = (ampNew / ampOld - 1) * 100;
  const phaseDiff = phaseNew - phaseOld;

  console.log(
    '  ' + key.padEnd(12) + '| ' +
    meanTilt.toFixed(5).padStart(10) + ' | ' +
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

// ── Step 4: Verify Earth consistency ───────────────────────────

console.log('');
const earthBase = C.eccentricityBase;
const earthEJ2000 = C.eccJ2000.earth;
const earthCosTheta = (earthBase * earthBase + earthAmp * earthAmp - earthEJ2000 * earthEJ2000)
                    / (2 * earthBase * earthAmp);
const earthPhase = Math.acos(earthCosTheta) * 180 / Math.PI;
console.log(`  Earth verification: e(J2000) = ${earthEJ2000}, phase = ${earthPhase.toFixed(4)}°`);
console.log(`  e_reconstructed = ${Math.sqrt(earthBase*earthBase + earthAmp*earthAmp - 2*earthBase*earthAmp*Math.cos(earthPhase*Math.PI/180)).toFixed(8)} (should be ${earthEJ2000})`);
console.log('');

// ── Summary ───────────────────────────────────────────────────

if (!anyChanged) {
  console.log('  ✓ All amplitudes, phases, and bases are correctly derived at runtime.\n');
} else {
  console.log(`  ⚠ ${Object.keys(updates).length} planet(s) show runtime/verification mismatch — check constants.js derivation.\n`);
}
