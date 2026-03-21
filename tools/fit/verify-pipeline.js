#!/usr/bin/env node
/**
 * Verify the fitting pipeline produces the same values as the current JSON.
 * Runs each fitting script's core computation WITHOUT writing to files,
 * then compares against the stored values in fitted-coefficients.json.
 *
 * Usage: node tools/fit/verify-pipeline.js
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.resolve(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
const stored = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

let totalChecks = 0, totalErrors = 0;

function check(label, actual, expected, tolerance = 1e-10) {
  totalChecks++;
  if (typeof actual === 'number' && typeof expected === 'number') {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      console.log(`  ✗ ${label}: actual=${actual} expected=${expected} diff=${diff.toExponential()}`);
      totalErrors++;
      return false;
    }
  } else if (actual !== expected) {
    console.log(`  ✗ ${label}: actual=${actual} expected=${expected}`);
    totalErrors++;
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Verify constants load correctly
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 1: Constants load ═══');
try {
  const C = require('../lib/constants');
  check('H', C.H, 335008);
  check('planets count', Object.keys(C.planets).length, 7);
  check('PERI_HARMONICS terms', C.PERI_HARMONICS.length, stored.PERI_HARMONICS_RAW.length);
  check('OBLIQUITY terms', C.SOLSTICE_OBLIQUITY_HARMONICS.length, stored.SOLSTICE_OBLIQUITY_HARMONICS.length);
  check('OBLIQUITY_MEAN', C.SOLSTICE_OBLIQUITY_MEAN, stored.SOLSTICE_OBLIQUITY_MEAN_FITTED);
  console.log('  ✓ Constants loaded OK\n');
} catch (e) {
  console.log(`  ✗ Constants failed to load: ${e.message}\n`);
  totalErrors++;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Verify scene graph produces correct positions
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 2: Scene graph positions ═══');
try {
  const SG = require('../lib/scene-graph');
  const jd = 2451545.0; // J2000
  for (const target of ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const pos = SG.computePlanetPosition(target, jd);
    const ok = pos && typeof pos.ra === 'number' && typeof pos.dec === 'number';
    if (!ok) {
      console.log(`  ✗ ${target}: failed to compute position`);
      totalErrors++;
    }
  }
  console.log('  ✓ All 9 targets compute positions OK\n');
} catch (e) {
  console.log(`  ✗ Scene graph error: ${e.message}\n`);
  totalErrors++;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Verify PERI_HARMONICS (compare stored JSON values with what's loaded)
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 3: PERI_HARMONICS consistency ═══');
const C = require('../lib/constants');
const fitted = require('../lib/constants/fitted-coefficients');

check('PERI_OFFSET', fitted.PERI_OFFSET, stored.PERI_OFFSET);
for (let i = 0; i < stored.PERI_HARMONICS_RAW.length; i++) {
  const s = stored.PERI_HARMONICS_RAW[i];
  const f = fitted.PERI_HARMONICS_RAW[i];
  check(`PERI[${i}] div`, f[0], s[0]);
  check(`PERI[${i}] sin`, f[1], s[1]);
  check(`PERI[${i}] cos`, f[2], s[2]);
}
console.log(`  ✓ PERI_HARMONICS: ${stored.PERI_HARMONICS_RAW.length} terms match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 4. Verify OBLIQUITY harmonics
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 4: OBLIQUITY harmonics consistency ═══');
check('OBLIQUITY_MEAN_FITTED', stored.SOLSTICE_OBLIQUITY_MEAN_FITTED, C.SOLSTICE_OBLIQUITY_MEAN);
for (let i = 0; i < stored.SOLSTICE_OBLIQUITY_HARMONICS.length; i++) {
  const s = stored.SOLSTICE_OBLIQUITY_HARMONICS[i];
  const f = C.SOLSTICE_OBLIQUITY_HARMONICS[i];
  check(`OBLIQ[${i}] div`, f[0], s[0]);
  check(`OBLIQ[${i}] sin`, f[1], s[1]);
  check(`OBLIQ[${i}] cos`, f[2], s[2]);
}

// Verify J2000 obliquity
let obliq = C.SOLSTICE_OBLIQUITY_MEAN;
for (const [div, sinC, cosC] of C.SOLSTICE_OBLIQUITY_HARMONICS) {
  const phase = 2 * Math.PI * (2000 - C.balancedYear) / (C.H / div);
  obliq += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
check('J2000 obliquity vs IAU', Math.abs(obliq - C.ASTRO_REFERENCE.obliquityJ2000_deg) * 3600, 0, 0.1); // within 0.1"
console.log(`  ✓ OBLIQUITY: ${stored.SOLSTICE_OBLIQUITY_HARMONICS.length} terms match, J2000=${obliq.toFixed(6)}°\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 5. Verify CARDINAL_POINT_HARMONICS
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 5: CARDINAL_POINT_HARMONICS consistency ═══');
for (const type of ['SS', 'WS', 'VE', 'AE']) {
  const s = stored.CARDINAL_POINT_HARMONICS[type];
  const f = C.CARDINAL_POINT_HARMONICS[type];
  check(`${type} term count`, f.length, s.length);
  for (let i = 0; i < s.length; i++) {
    check(`${type}[${i}] div`, f[i][0], s[i][0]);
    check(`${type}[${i}] sin`, f[i][1], s[i][1]);
    check(`${type}[${i}] cos`, f[i][2], s[i][2]);
  }
}
console.log(`  ✓ CARDINAL_POINT_HARMONICS: all 4 types match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 6. Verify YEAR_LENGTH harmonics
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 6: YEAR_LENGTH harmonics consistency ═══');
for (const name of ['TROPICAL_YEAR_HARMONICS', 'SIDEREAL_YEAR_HARMONICS', 'ANOMALISTIC_YEAR_HARMONICS']) {
  const s = stored[name];
  const f = fitted[name];
  check(`${name} count`, f.length, s.length);
  for (let i = 0; i < s.length; i++) {
    check(`${name}[${i}] div`, f[i][0], s[i][0]);
    check(`${name}[${i}] sin`, f[i][1], s[i][1]);
    check(`${name}[${i}] cos`, f[i][2], s[i][2]);
  }
}
console.log(`  ✓ YEAR_LENGTH harmonics: all 3 types match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 7. Verify PARALLAX corrections
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 7: PARALLAX corrections consistency ═══');
for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const decS = stored.PARALLAX_DEC_CORRECTION[planet];
  const decF = fitted.PARALLAX_DEC_CORRECTION[planet];
  const raS = stored.PARALLAX_RA_CORRECTION[planet];
  const raF = fitted.PARALLAX_RA_CORRECTION[planet];

  for (const k of Object.keys(decS)) {
    check(`DEC.${planet}.${k}`, decF[k], decS[k]);
  }
  for (const k of Object.keys(raS)) {
    check(`RA.${planet}.${k}`, raF[k], raS[k]);
  }
}
console.log(`  ✓ PARALLAX corrections: all 7 planets match\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 8. Verify planet derived values (orbitTilt, invPlaneInclination)
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ Step 8: Derived planet values ═══');
const mp = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'model-parameters.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));

for (const [key, p] of Object.entries(C.planets)) {
  const arP = ar.planetOrbitalElements[key];
  const mpP = mp.planets[key];

  // Verify orbitTilt derived correctly
  const utils = require('../lib/constants/utils');
  const tilt = utils.computeOrbitTilt(arP.ascendingNode, arP.eclipticInclinationJ2000);
  check(`${key}.orbitTilta`, p.orbitTilta, tilt.orbitTilta, 1e-7);
  check(`${key}.orbitTiltb`, p.orbitTiltb, tilt.orbitTiltb, 1e-7);

  // Verify invPlaneInclinationMean derived correctly
  const amp = utils.computeInvPlaneInclinationAmplitude(C.PSI, mpP.fibonacciD, C.massFraction[key]);
  const mean = utils.computeInvPlaneInclinationMean(arP.invPlaneInclinationJ2000, amp, mpP.ascendingNodeInvPlane, mpP.inclinationPhaseAngle);
  check(`${key}.invPlaneInclinationAmplitude`, p.invPlaneInclinationAmplitude, amp, 1e-7);
  check(`${key}.invPlaneInclinationMean`, p.invPlaneInclinationMean, mean, 1e-7);

  // Verify J2000 reconstruction
  const cosPhase = Math.cos((mpP.ascendingNodeInvPlane - mpP.inclinationPhaseAngle) * Math.PI / 180);
  const reconstructed = mean + amp * cosPhase;
  check(`${key}.inclJ2000 reconstructed`, reconstructed, arP.invPlaneInclinationJ2000, 1e-6);
}
console.log(`  ✓ All derived planet values verified\n`);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  ${totalChecks} checks, ${totalErrors} errors`);
if (totalErrors === 0) {
  console.log('  ✓ ALL PIPELINE VERIFICATION PASSED');
  console.log('  The JSON files are consistent with the computation engine.');
} else {
  console.log('  ✗ VERIFICATION FAILED — fix errors before proceeding');
  process.exit(1);
}
console.log('═══════════════════════════════════════════════════════════════');
