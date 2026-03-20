#!/usr/bin/env node
/**
 * Export values from JSON source-of-truth files to src/script.js.
 *
 * Reads the 4 JSON files in public/input/ and patches the corresponding
 * values in script.js. Does NOT restructure the file — only updates numeric
 * values in place.
 *
 * Usage:
 *   node tools/fit/export-to-script.js          # dry run (show diffs)
 *   node tools/fit/export-to-script.js --write   # apply changes
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '..', '..', 'src', 'script.js');
const mp = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'public', 'input', 'model-parameters.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'), 'utf8'));
const fc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json'), 'utf8'));

let src = fs.readFileSync(SCRIPT_PATH, 'utf8');
const doWrite = process.argv.includes('--write');
let changes = 0;

// ─── Helper: replace a top-level const value ────────────────────────────
function replaceConst(name, newVal) {
  const re = new RegExp('(const\\s+' + name + '\\s*=\\s*)([\\d.eE+\\-]+)');
  const m = src.match(re);
  if (!m) return;
  const oldVal = parseFloat(m[2]);
  if (Math.abs(oldVal - newVal) < 1e-14) return;
  console.log('  ' + name + ': ' + oldVal + ' → ' + newVal);
  src = src.replace(re, '$1' + newVal);
  changes++;
}

// ─── Helper: replace a value inside planets.KEY = { ... PROP: value } ───
function replacePlanetProp(planet, prop, newVal) {
  // Match the property inside the planet block
  const blockRe = new RegExp('(planets\\.' + planet + '\\s*=\\s*\\{[\\s\\S]*?' + prop + ':\\s*)([\\d.eE+\\-]+)');
  const m = src.match(blockRe);
  if (!m) return;
  const oldVal = parseFloat(m[2]);
  if (Math.abs(oldVal - newVal) < 1e-14) return;
  console.log('  planets.' + planet + '.' + prop + ': ' + oldVal + ' → ' + newVal);
  src = src.replace(blockRe, '$1' + newVal);
  changes++;
}

// ═══════════════════════════════════════════════════════════════════════════
// A. MODEL PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

console.log('=== A. Model Parameters ===');

// A1. Foundational
replaceConst('holisticyearLength', mp.foundational.holisticyearLength);
replaceConst('inputmeanlengthsolaryearindays', mp.foundational.inputmeanlengthsolaryearindays);
replaceConst('startmodelJD', mp.foundational.startmodelJD);
replaceConst('startmodelYear', mp.foundational.startmodelYear);
replaceConst('correctionDays', mp.foundational.correctionDays);
replaceConst('correctionSun', mp.foundational.correctionSun);
replaceConst('temperatureGraphMostLikely', mp.foundational.temperatureGraphMostLikely);
replaceConst('startAngleModel', mp.foundational.startAngleModel);
replaceConst('psiNumerator', mp.foundational.psiNumerator);

// A2. Earth parameters
replaceConst('earthtiltMean', mp.earth.earthtiltMean);
replaceConst('earthInvPlaneInclinationAmplitude', mp.earth.earthInvPlaneInclinationAmplitude);
replaceConst('eccentricityBase', mp.earth.eccentricityBase);
replaceConst('eccentricityAmplitude', mp.earth.eccentricityAmplitude);
replaceConst('eccentricityAmplitudeK', mp.earth.eccentricityAmplitudeK);

// A3. Moon model parameters
replaceConst('moonStartposApsidal', mp.moon.moonStartposApsidal);
replaceConst('moonStartposNodal', mp.moon.moonStartposNodal);
replaceConst('moonStartposMoon', mp.moon.moonStartposMoon);

// A4. Planet parameters
console.log('\n=== A4. Planet Parameters ===');
for (const [key, p] of Object.entries(mp.planets)) {
  for (const prop of [
    'orbitalEccentricityBase', 'orbitalEccentricityAmplitude',
    'eccentricityPhaseJ2000', 'eocFraction', 'startpos', 'angleCorrection',
  ]) {
    if (p[prop] !== undefined) replacePlanetProp(key, prop, p[prop]);
  }
}

// Perihelion passage refs
for (const [key, jd] of Object.entries(mp.perihelionPassageRef)) {
  if (typeof jd === 'number') replacePlanetProp(key, 'perihelionRef_JD', jd);
}

// ═══════════════════════════════════════════════════════════════════════════
// B. FITTED COEFFICIENTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== B. Fitted Coefficients ===');
replaceConst('PERI_OFFSET', fc.PERI_OFFSET);
replaceConst('OBLIQUITY_MEAN', fc.SOLSTICE_OBLIQUITY_MEAN_FITTED);

// TODO: PERI_HARMONICS, OBLIQUITY_HARMONICS, CARDINAL_POINT_HARMONICS,
//       PARALLAX corrections, PREDICT_COEFFS — these are arrays/objects
//       that need block replacement, not simple value replacement.

// ═══════════════════════════════════════════════════════════════════════════
// C. ASTRO REFERENCES
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== C. Astro References ===');
replaceConst('currentAUDistance', ar.physicalConstants.currentAUDistance);
replaceConst('meansiderealyearlengthinSeconds', ar.physicalConstants.meansiderealyearlengthinSeconds);
replaceConst('speedOfLight', ar.physicalConstants.speedOfLight);
replaceConst('perihelionalignmentYear', ar.earthOrbital.perihelionalignmentYear);
replaceConst('deltaTStart', ar.earthOrbital.deltaTStart);
replaceConst('moonDistance', ar.moonReference.moonDistance);
replaceConst('moonOrbitalEccentricityBase', ar.moonReference.moonOrbitalEccentricityBase);
replaceConst('moonEclipticInclinationJ2000', ar.moonReference.moonEclipticInclinationJ2000);
replaceConst('moonTilt', ar.moonReference.moonTilt);

// Planet astro references
console.log('\n=== C. Planet Astro References ===');
for (const [key, a] of Object.entries(ar.planetOrbitalElements)) {
  for (const prop of [
    'solarYearInput', 'orbitalEccentricityJ2000', 'axialTiltMean',
    'eclipticInclinationJ2000', 'longitudePerihelion', 'ascendingNode',
    'invPlaneInclinationJ2000', 'meanAnomaly', 'trueAnomaly',
  ]) {
    if (a[prop] !== undefined) replacePlanetProp(key, prop, a[prop]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + changes + ' values to update');
if (changes === 0) {
  console.log('✓ script.js is already in sync with JSON files');
} else if (doWrite) {
  fs.writeFileSync(SCRIPT_PATH, src);
  console.log('✓ Written ' + changes + ' changes to script.js');
} else {
  console.log('(dry run — add --write to apply changes)');
}
