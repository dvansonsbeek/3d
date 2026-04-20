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
// PSI is now derived from earthInvPlaneInclinationAmplitude in script.js section E2c

// A2. Earth parameters
replaceConst('earthtiltMean', mp.earth.earthtiltMean);
replaceConst('earthInvPlaneInclinationAmplitude', mp.earth.earthInvPlaneInclinationAmplitude);
replaceConst('eccentricityBase', mp.earth.eccentricityBase);
replaceConst('eccentricityAmplitude', mp.earth.eccentricityAmplitude);
// K is derived at runtime from eccentricityAmplitude + earthtiltMean (see section E2d in script.js)

// A3. Moon model parameters
replaceConst('moonStartposApsidal', mp.moon.moonStartposApsidal);
replaceConst('moonStartposNodal', mp.moon.moonStartposNodal);
replaceConst('moonStartposMoon', mp.moon.moonStartposMoon);

// A4. Planet parameters
console.log('\n=== A4. Planet Parameters ===');
for (const [key, p] of Object.entries(mp.planets)) {
  for (const prop of [
    // orbitalEccentricityBase, orbitalEccentricityAmplitude, eccentricityPhaseJ2000
    // are all derived at runtime (from balanced-year phase + K)
    'eocFraction', 'startpos', 'angleCorrection',
    'ascendingNodeInvPlane', 'inclinationCycleAnchor',
    'ascendingNodeCyclesIn8H',
    // Note: 'antiPhase' is a boolean — cannot be synced by replacePlanetProp (numeric regex).
    // Values are set manually in script.js planet definitions.
  ]) {
    if (p[prop] !== undefined) replacePlanetProp(key, prop, p[prop]);
  }
}

// Perihelion passage refs
for (const [key, jd] of Object.entries(mp.perihelionPassageRef)) {
  if (typeof jd === 'number') replacePlanetProp(key, 'perihelionRef_JD', jd);
}

// ─── Helper: replace a const array block ─────────────────────────────────
// Matches from "const NAME = [" to the closing "];" and replaces the content.
function replaceArray(name, newData, formatter) {
  const re = new RegExp('(const\\s+' + name + '\\s*=\\s*\\[)[\\s\\S]*?(\\];)');
  const m = src.match(re);
  if (!m) return;
  const oldBlock = m[0];
  const newBlock = m[1] + '\n' + formatter(newData) + '\n' + m[2];
  if (oldBlock === newBlock) return;
  // Count entries in old block to verify
  const oldCount = (oldBlock.match(/\[[\d,.\-\s+eE]+\]/g) || []).length;
  console.log('  ' + name + ': ' + oldCount + ' → ' + newData.length + ' entries');
  src = src.replace(re, newBlock);
  changes++;
}

// ─── Helper: replace a const object block ────────────────────────────────
// Matches from "const NAME = {" to the closing "};" and replaces entirely.
function replaceObject(name, newContent) {
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*\\{[\\s\\S]*?\\};');
  const m = src.match(re);
  if (!m) return;
  const newBlock = 'const ' + name + ' = ' + newContent + ';';
  if (m[0] === newBlock) return;
  console.log('  ' + name + ': updated');
  src = src.replace(re, newBlock);
  changes++;
}

// ─── Formatters ──────────────────────────────────────────────────────────
function fmtHarmonics3(data) {
  // Format: [div, sin, cos] pairs, 2 per line
  const lines = [];
  for (let i = 0; i < data.length; i += 2) {
    const a = data[i];
    const parts = ['  [' + String(a[0]).padStart(2) + ', ' + fmtNum(a[1]) + ', ' + fmtNum(a[2]) + ']'];
    if (i + 1 < data.length) {
      const b = data[i + 1];
      parts.push('[' + String(b[0]).padStart(2) + ', ' + fmtNum(b[1]) + ', ' + fmtNum(b[2]) + ']');
    }
    lines.push(parts.join(', ') + ',');
  }
  return lines.join('\n');
}

function fmtYearHarmonics(data) {
  return data.map(([div, s, c]) =>
    '  [' + String(div).padStart(2) + ',  ' + fmtSci(s) + ', ' + fmtSci(c) + '],'
  ).join('\n');
}

function fmtPeriHarmonics(data) {
  // PERI_HARMONICS uses H/div format in script.js
  const lines = [];
  for (let i = 0; i < data.length; i += 2) {
    const a = data[i];
    const parts = ['  [H/' + a[0] + ', ' + fmtNum(a[1], 6) + ', ' + fmtNum(a[2], 6) + ']'];
    if (i + 1 < data.length) {
      const b = data[i + 1];
      parts.push('[H/' + b[0] + ', ' + fmtNum(b[1], 6) + ', ' + fmtNum(b[2], 6) + ']');
    }
    lines.push(parts.join(', ') + ',');
  }
  return lines.join('\n');
}

function fmtMoonTable(data) {
  // Format: [D,M,M',F, coeff] groups, 4 per line
  const lines = [];
  for (let i = 0; i < data.length; i += 4) {
    const parts = [];
    for (let j = i; j < Math.min(i + 4, data.length); j++) {
      const r = data[j];
      parts.push('[' + r.join(',') + ']');
    }
    lines.push('  ' + parts.join(',') + ',');
  }
  return lines.join('\n');
}

const { toDisplayName } = require('../lib/correction-stack');

function fmtParallax(data) {
  // Format: { Mercury: { A:x, B:y, ... }, Venus: { ... }, ... }
  const lines = ['{'];
  for (const [key, coeffs] of Object.entries(data)) {
    const name = toDisplayName(key);
    const pairs = Object.entries(coeffs).map(([k, v]) => k + ':' + fmtNum(v, 4));
    lines.push('  ' + name + ': { ' + pairs.join(', ') + ' },');
  }
  lines.push('}');
  return lines.join('\n');
}

function fmtNum(n, dec) {
  dec = dec || 6;
  if (n === 0) return '0';
  const s = n.toFixed(dec);
  return n >= 0 ? ' ' + s : s;
}

function fmtSci(n) {
  const s = n.toExponential(12);
  return n >= 0 ? '+' + s : s;
}

// ═══════════════════════════════════════════════════════════════════════════
// B. FITTED COEFFICIENTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== B. Fitted Coefficients ===');
replaceConst('PERI_OFFSET', fc.PERI_OFFSET);
replaceConst('OBLIQUITY_MEAN', fc.SOLSTICE_OBLIQUITY_MEAN_FITTED);

// B1. Year-length harmonics
replaceArray('TROPICAL_YEAR_HARMONICS', fc.TROPICAL_YEAR_HARMONICS, fmtYearHarmonics);
replaceArray('SIDEREAL_YEAR_HARMONICS', fc.SIDEREAL_YEAR_HARMONICS, fmtYearHarmonics);
replaceArray('ANOMALISTIC_YEAR_HARMONICS', fc.ANOMALISTIC_YEAR_HARMONICS, fmtYearHarmonics);

// B2. Perihelion harmonics (uses H/div format)
replaceArray('PERI_HARMONICS', fc.PERI_HARMONICS_RAW, fmtPeriHarmonics);

// B4. Obliquity harmonics
replaceArray('OBLIQUITY_HARMONICS', fc.SOLSTICE_OBLIQUITY_HARMONICS, fmtHarmonics3);

// B5a. Cardinal point anchors
if (fc.CARDINAL_POINT_ANCHORS_ADJUSTED) {
  const a = fc.CARDINAL_POINT_ANCHORS_ADJUSTED;
  const anchorStr = `{\n  SS: ${a.SS},  WS: ${a.WS},  VE: ${a.VE},  AE: ${a.AE},\n}`;
  replaceObject('CARDINAL_POINT_ANCHORS', anchorStr);
}

// B5b. Cardinal point harmonics
if (fc.CARDINAL_POINT_HARMONICS) {
  const cpLines = ['{\n'];
  for (const [type, terms] of Object.entries(fc.CARDINAL_POINT_HARMONICS)) {
    cpLines.push('  ' + type + ': [\n');
    cpLines.push(fmtHarmonics3(terms));
    cpLines.push('\n  ],\n');
  }
  cpLines.push('}');
  replaceObject('CARDINAL_POINT_HARMONICS', cpLines.join(''));
}

// B3. Parallax corrections
if (fc.PARALLAX_DEC_CORRECTION) {
  replaceObject('PARALLAX_DEC_CORRECTION', fmtParallax(fc.PARALLAX_DEC_CORRECTION));
  replaceObject('PARALLAX_RA_CORRECTION', fmtParallax(fc.PARALLAX_RA_CORRECTION));
}

// B3b. Gravitation correction (synodic period terms, planet-planet perturbations, capitalized keys)
if (fc.GRAVITATION_CORRECTION) {
  const lines = ['{'];
  for (const [planet, terms] of Object.entries(fc.GRAVITATION_CORRECTION)) {
    const arr = terms.map(t => {
      const pairs = Object.entries(t).map(([k, v]) => k + ': ' + fmtNum(v, 6).trim());
      return '    { ' + pairs.join(', ') + ' }';
    });
    lines.push('  ' + toDisplayName(planet) + ': [');
    lines.push(arr.join(',\n'));
    lines.push('  ],');
  }
  lines.push('}');
  replaceObject('GRAVITATION_CORRECTION', lines.join('\n'));
}

// B3c. Elongation correction (inner planets, capitalized keys)
if (fc.ELONGATION_CORRECTION) {
  const lines = ['{'];
  for (const [planet, coeffs] of Object.entries(fc.ELONGATION_CORRECTION)) {
    const pairs = Object.entries(coeffs).map(([k, v]) => k + ': ' + fmtNum(v, 6).trim());
    lines.push('  ' + toDisplayName(planet) + ': { ' + pairs.join(', ') + ' },');
  }
  lines.push('}');
  replaceObject('ELONGATION_CORRECTION', lines.join('\n'));
}

// D. Moon Meeus tables
const meeus = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'public', 'input', 'meeus-lunar-tables.json'), 'utf8'));
replaceArray('MOON_L', meeus.longitudeTerms.terms, fmtMoonTable);
replaceArray('MOON_B', meeus.latitudeTerms.terms, fmtMoonTable);

// ═══════════════════════════════════════════════════════════════════════════
// C. ASTRO REFERENCES
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== C. Astro References ===');
replaceConst('currentAUDistance', ar.physicalConstants.currentAUDistance);
// meansiderealyearlengthinSeconds is now derived: ASTRO_REFERENCE.siderealYearJ2000 * 86400
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
    'solarYearInput', 'orbitalEccentricityJ2000', 'axialTiltJ2000',
    'eclipticInclinationJ2000', 'longitudePerihelion', 'ascendingNode',
    'invPlaneInclinationJ2000', 'meanAnomaly', 'trueAnomaly',
  ]) {
    if (a[prop] !== undefined) replacePlanetProp(key, prop, a[prop]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// D. PREDICT_COEFFS (physical-beat prediction coefficients per planet, ~2421 terms)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== D. Prediction Coefficients ===');
const coeffsSource = fc.PREDICT_COEFFS_PHYSICAL || fc.PREDICT_COEFFS_UNIFIED;
if (coeffsSource) {
  const planets7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  // Build the new PREDICT_COEFFS block
  let newCoeffs = 'const PREDICT_COEFFS = {\n';
  for (const p of planets7) {
    const coeffs = coeffsSource[p];
    if (!coeffs) continue;
    newCoeffs += '  ' + p + ': [\n';
    // Format 7 coefficients per line
    for (let i = 0; i < coeffs.length; i += 7) {
      const chunk = coeffs.slice(i, i + 7);
      newCoeffs += '                                ' +
        chunk.map(v => fmtSci(v)).join(', ') + ',\n';
    }
    newCoeffs += '  ],\n';
  }
  newCoeffs += '};';

  // Replace the old block
  const re = /const PREDICT_COEFFS = \{[\s\S]*?\n\};/;
  const m = src.match(re);
  if (m) {
    const termCount = coeffsSource.venus ? coeffsSource.venus.length : (coeffsSource.mercury ? coeffsSource.mercury.length : 0);
    if (m[0] === newCoeffs) {
      console.log('  PREDICT_COEFFS: unchanged (' + planets7.length + ' planets × ~' + termCount + ' terms)');
    } else {
      console.log('  PREDICT_COEFFS: ' + planets7.length + ' planets × ~' + termCount + ' terms updated');
      src = src.replace(re, newCoeffs);
      changes++;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// E. BALANCE PRESETS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== E. Balance Presets ===');
const balancePresetsPath = path.resolve(__dirname, '..', '..', 'data', 'balance-presets.json');
if (fs.existsSync(balancePresetsPath)) {
  const bpData = JSON.parse(fs.readFileSync(balancePresetsPath, 'utf8'));
  if (bpData.presets && bpData.presets.length > 0) {
    const presetsStr = bpData.presets.map(p => JSON.stringify(p)).join(',\n');
    const newBlock = 'const BALANCE_PRESETS = [\n' + presetsStr + '\n];';
    // Greedy match to capture the entire array including nested arrays, up to ];
    const re = /const BALANCE_PRESETS = \[[\s\S]*?\n\];/;
    const m = src.match(re);
    if (m) {
      if (m[0] !== newBlock) {
        src = src.replace(re, newBlock);
        changes++;
        console.log(`  BALANCE_PRESETS: updated (${bpData.presets.length} presets)`);
      }
    }
  }
} else {
  console.log('  (no balance-presets.json found, skipping)');
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
