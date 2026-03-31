#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Export to Holistic Website Repository
//
// Syncs all fitted coefficients and model parameters from the
// simulation repo to the Holistic website repo's TypeScript files:
//
//   - constants.ts: harmonics, eccentricities, phases, PERI_OFFSET
//   - coefficients.ts: 429-term prediction coefficients (7 planets)
//
// Usage:
//   node tools/fit/export-to-holistic.js              # dry run
//   node tools/fit/export-to-holistic.js --write      # apply changes
//
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const HOLISTIC_ROOT = path.resolve(__dirname, '..', '..', '..', 'Holistic', 'holisticuniverse');
const CONSTANTS_PATH = path.join(HOLISTIC_ROOT, 'src', 'lib', 'orbital', 'constants.ts');
const COEFFICIENTS_PATH = path.join(HOLISTIC_ROOT, 'src', 'lib', 'orbital', 'coefficients.ts');

if (!fs.existsSync(HOLISTIC_ROOT)) {
  console.error(`Holistic repo not found at ${HOLISTIC_ROOT}`);
  process.exit(1);
}

const C = require('../lib/constants');
const fitted = require('../../public/input/fitted-coefficients.json');
const mp = require('../../public/input/model-parameters.json');

let constantsTs = fs.readFileSync(CONSTANTS_PATH, 'utf8');
let changeCount = 0;

console.log('═══ Export to Holistic Website ═══');
console.log('');

// ── Helper: replace a TS array ────────────────────────────────

function replaceArray(content, name, newArr) {
  // Find the start of the declaration
  const startRe = new RegExp('export const ' + name + ':\\s*\\[number,\\s*number,\\s*number\\]\\[\\]\\s*=\\s*\\[');
  const startMatch = content.match(startRe);
  if (!startMatch) {
    console.log(`  ⚠ ${name}: not found in constants.ts`);
    return content;
  }

  // Find the closing ] by counting bracket depth from the opening [
  const startIdx = startMatch.index + startMatch[0].length - 1; // position of opening [
  let depth = 1;
  let endIdx = startIdx + 1;
  while (endIdx < content.length && depth > 0) {
    if (content[endIdx] === '[') depth++;
    if (content[endIdx] === ']') depth--;
    endIdx++;
  }
  // endIdx is now just past the closing ]

  const oldBlock = content.substring(startMatch.index, endIdx);

  let newBlock = startMatch[0].replace(/\[$/, '[\n');
  for (const [div, sin, cos] of newArr) {
    // Website expects periods (H/div), fitted JSON stores divisors
    const period = C.H / div;
    newBlock += `  [${period}, ${sin}, ${cos}],\n`;
  }
  newBlock += ']';

  if (oldBlock === newBlock) {
    console.log(`  ✓ ${name}: unchanged (${newArr.length} terms)`);
    return content;
  }

  console.log(`  ↻ ${name}: updated (${newArr.length} terms)`);
  changeCount++;
  return content.replace(oldBlock, newBlock);
}

// ── Helper: replace a scalar constant ─────────────────────────

function replaceScalar(content, name, newVal) {
  const re = new RegExp('(export const ' + name + '(?::\\s*number)?\\s*=\\s*)[\\-\\d.e+]+');
  const match = content.match(re);
  if (!match) {
    console.log(`  ⚠ ${name}: not found`);
    return content;
  }
  const oldVal = match[0].replace(match[1], '');
  if (oldVal === String(newVal)) {
    console.log(`  ✓ ${name}: unchanged (${newVal})`);
    return content;
  }
  console.log(`  ↻ ${name}: ${oldVal} → ${newVal}`);
  changeCount++;
  return content.replace(match[0], match[1] + newVal);
}


// ── 1. Year-length harmonics ──────────────────────────────────

console.log('  ── Harmonics ──');
constantsTs = replaceArray(constantsTs, 'TROPICAL_YEAR_HARMONICS', fitted.TROPICAL_YEAR_HARMONICS);
constantsTs = replaceArray(constantsTs, 'SIDEREAL_YEAR_HARMONICS', fitted.SIDEREAL_YEAR_HARMONICS);
constantsTs = replaceArray(constantsTs, 'ANOMALISTIC_YEAR_HARMONICS', fitted.ANOMALISTIC_YEAR_HARMONICS);
constantsTs = replaceArray(constantsTs, 'OBLIQUITY_HARMONICS', fitted.SOLSTICE_OBLIQUITY_HARMONICS);

// Replace the Pythagorean OBLIQUITY_MEAN computation with the pipeline-fitted value.
// The Pythagorean computation (100k-sample numerical integration) gives ~1.8" error
// compared to the pipeline-fitted value from actual simulation data.
const obliqMeanFitted = fitted.SOLSTICE_OBLIQUITY_MEAN_FITTED;
if (obliqMeanFitted) {
  const obliqRe = /export const OBLIQUITY_MEAN: number = \(\(\) => \{[\s\S]*?\}\)\(\)/;
  const obliqMatch = constantsTs.match(obliqRe);
  if (obliqMatch) {
    const newObliq = `export const OBLIQUITY_MEAN: number = ${obliqMeanFitted} // Pipeline-fitted (SOLSTICE_OBLIQUITY_MEAN_FITTED)`;
    if (obliqMatch[0] !== newObliq) {
      constantsTs = constantsTs.replace(obliqMatch[0], newObliq);
      console.log(`  ↻ OBLIQUITY_MEAN: Pythagorean → pipeline-fitted (${obliqMeanFitted.toFixed(5)}°)`);
      changeCount++;
    } else {
      console.log(`  ✓ OBLIQUITY_MEAN: unchanged (${obliqMeanFitted.toFixed(5)}°)`);
    }
  } else {
    // Already replaced in a previous run — check scalar
    constantsTs = replaceScalar(constantsTs, 'OBLIQUITY_MEAN', obliqMeanFitted);
  }
}
constantsTs = replaceArray(constantsTs, 'PERI_HARMONICS', fitted.PERI_HARMONICS_RAW);
// Cardinal point harmonics are in a separate file (cardinalPointHarmonics.ts),
// synced below — not in constants.ts itself.
constantsTs = replaceScalar(constantsTs, 'PERI_OFFSET', fitted.PERI_OFFSET);

// Cardinal point anchors (J2000 Julian Days)
const anchors = fitted.CARDINAL_POINT_ANCHORS_ADJUSTED || fitted.CARDINAL_POINT_ANCHORS;
if (anchors) {
  for (const type of ['SS', 'WS', 'VE', 'AE']) {
    const re = new RegExp('(  ' + type + ':\\s*)[\\d.]+');
    const match = constantsTs.match(re);
    if (match) {
      const expected = match[1] + anchors[type];
      if (match[0] !== expected) {
        constantsTs = constantsTs.replace(match[0], expected);
        // Only log+count once for all 4
      }
    }
  }
  // Check if any anchor changed
  const oldAnchors = constantsTs.match(/CARDINAL_POINT_ANCHORS = \{([^}]+)\}/s);
  if (oldAnchors) {
    const hasAll = ['SS', 'WS', 'VE', 'AE'].every(t => oldAnchors[1].includes(String(anchors[t])));
    if (hasAll) {
      console.log('  ✓ CARDINAL_POINT_ANCHORS: unchanged');
    } else {
      console.log('  ↻ CARDINAL_POINT_ANCHORS: updated');
      changeCount++;
    }
  }
}

// ── 2. Earth scalar constants ─────────────────────────────────

console.log('');
console.log('  ── Earth scalars ──');

// Round to match the precision used in constants.ts
const earthScalars = {
  EARTH_INCLIN_MEAN: { val: C.earthInvPlaneInclinationMean, prec: 5 },
  EARTH_INCLIN_AMPL: { val: C.earthInvPlaneInclinationAmplitude, prec: 5 },
  EARTH_OBLIQ_MEAN: { val: C.earthtiltMean, prec: 6 },
  EARTH_ECC_BASE: { val: C.eccentricityBase, prec: 6 },
  EARTH_ECC_AMP: { val: C.eccentricityAmplitude, prec: 6 },
};

for (const [name, { val, prec }] of Object.entries(earthScalars)) {
  const rounded = parseFloat(val.toFixed(prec));
  constantsTs = replaceScalar(constantsTs, name, rounded);
}

// ── 3. Planet eccentricity records ────────────────────────────

console.log('');
console.log('  ── Eccentricity records ──');

const planets7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Helper: replace a Record<string, number> block by finding the variable name
// then replacing the content between { and }
function replaceRecordBlock(content, varName, line1, line2) {
  const re = new RegExp('(export const ' + varName + '[^{]*\\{)([\\s\\S]*?)(\\})');
  const match = content.match(re);
  if (!match) {
    console.log(`  ⚠ ${varName}: not found`);
    return content;
  }
  const newBody = `\n${line1}\n${line2}\n`;
  const oldBlock = match[0];
  const newBlock = match[1] + newBody + match[3];
  if (oldBlock === newBlock) {
    console.log(`  ✓ ${varName}: unchanged`);
    return content;
  }
  console.log(`  ↻ ${varName}: updated`);
  changeCount++;
  return content.replace(oldBlock, newBlock);
}

// Format eccentricity values to avoid JS floating-point noise
function fmtEcc(v) {
  // Use enough precision to distinguish all planets, avoid trailing noise
  const s = v.toPrecision(8);
  return parseFloat(s);
}
function fmtAmp(v) {
  return v.toExponential().replace(/e\+0$/, '').replace(/e\+/, 'e+').replace(/e-0/, 'e-');
  // Use the value as-is for amplitudes (scientific notation)
}

const eccBase = {}, eccAmp = {}, eccPhase = {};
for (const p of planets7) {
  eccBase[p] = fmtEcc(mp.planets[p].orbitalEccentricityBase);
  eccAmp[p] = mp.planets[p].orbitalEccentricityAmplitude;
  eccPhase[p] = mp.planets[p].eccentricityPhaseJ2000;
}

constantsTs = replaceRecordBlock(constantsTs, 'ECC_BASE',
  `  Mercury: ${eccBase.mercury}, Venus: ${eccBase.venus}, Earth: EARTH_ECC_BASE, Mars: ${eccBase.mars},`,
  `  Jupiter: ${eccBase.jupiter}, Saturn: ${eccBase.saturn}, Uranus: ${eccBase.uranus}, Neptune: ${eccBase.neptune},`);

constantsTs = replaceRecordBlock(constantsTs, 'ECC_AMPLITUDE',
  `  Mercury: ${eccAmp.mercury}, Venus: ${eccAmp.venus}, Earth: EARTH_ECC_AMP, Mars: ${eccAmp.mars},`,
  `  Jupiter: ${eccAmp.jupiter}, Saturn: ${eccAmp.saturn}, Uranus: ${eccAmp.uranus}, Neptune: ${eccAmp.neptune},`);

constantsTs = replaceRecordBlock(constantsTs, 'ECC_PHASE_J2000',
  `  Mercury: ${eccPhase.mercury}, Venus: ${eccPhase.venus}, Earth: 192.9471, Mars: ${eccPhase.mars},`,
  `  Jupiter: ${eccPhase.jupiter}, Saturn: ${eccPhase.saturn}, Uranus: ${eccPhase.uranus}, Neptune: ${eccPhase.neptune},`);

// ── 4. Inclination records ────────────────────────────────────

console.log('');
console.log('  ── Inclination records ──');

constantsTs = replaceRecordBlock(constantsTs, 'INCL_MEAN',
  `  Mercury: ${C.planets.mercury.invPlaneInclinationMean}, Venus: ${C.planets.venus.invPlaneInclinationMean}, Earth: ${C.earthInvPlaneInclinationMean}, Mars: ${C.planets.mars.invPlaneInclinationMean},`,
  `  Jupiter: ${C.planets.jupiter.invPlaneInclinationMean}, Saturn: ${C.planets.saturn.invPlaneInclinationMean}, Uranus: ${C.planets.uranus.invPlaneInclinationMean}, Neptune: ${C.planets.neptune.invPlaneInclinationMean},`);

// ── 4. Write constants.ts ─────────────────────────────────────

console.log('');

if (changeCount === 0) {
  console.log('  ✓ constants.ts: all values already match. Nothing to update.');
} else if (!WRITE) {
  console.log(`  ${changeCount} changes pending. Run with --write to apply.`);
} else {
  fs.writeFileSync(CONSTANTS_PATH, constantsTs);
  console.log(`  ✓ Written ${changeCount} changes to constants.ts`);
}

// ── Cardinal point harmonics (separate file) ──────────────────

const CP_PATH = path.join(HOLISTIC_ROOT, 'src', 'lib', 'orbital', 'cardinalPointHarmonics.ts');
if (fitted.CARDINAL_POINT_HARMONICS) {
  let cpOut = '// Auto-generated by export-to-holistic.js — do not edit manually\n\n';
  for (const type of ['SS', 'WS', 'VE', 'AE']) {
    const arr = fitted.CARDINAL_POINT_HARMONICS[type];
    cpOut += `export const CARDINAL_POINT_HARMONICS_${type}: [number, number, number][] = [\n`;
    for (const [div, sinC, cosC] of arr) {
      cpOut += `  [${C.H / div}, ${sinC}, ${cosC}],\n`;
    }
    cpOut += ']\n\n';
  }
  const oldCp = fs.existsSync(CP_PATH) ? fs.readFileSync(CP_PATH, 'utf8') : '';
  if (oldCp === cpOut) {
    console.log(`  ✓ cardinalPointHarmonics.ts: unchanged (4 × 24 terms)`);
  } else if (!WRITE) {
    console.log(`  ↻ cardinalPointHarmonics.ts: needs update. Run with --write.`);
  } else {
    fs.writeFileSync(CP_PATH, cpOut);
    console.log(`  ✓ Written cardinalPointHarmonics.ts (4 × 24 terms)`);
  }
}

// ── 5. Regenerate coefficients.ts ─────────────────────────────

console.log('');
console.log('  ── Prediction Coefficients ──');

const coeffs = fitted.PREDICT_COEFFS_UNIFIED;
const planetNames = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const Names = planetNames.map(p => p.charAt(0).toUpperCase() + p.slice(1));

let coefOut = '// Auto-generated from fitted-coefficients.json — do not edit manually\n';
coefOut += '// Generated by tools/fit/export-to-holistic.js\n\n';

for (let i = 0; i < planetNames.length; i++) {
  const arr = coeffs[planetNames[i]];
  coefOut += `export const ${Names[i].toUpperCase()}_COEFFS: number[] = [\n`;
  for (let j = 0; j < arr.length; j++) {
    const comma = j < arr.length - 1 ? ',' : '';
    coefOut += `  ${arr[j]}${comma}  // Term ${j + 1}\n`;
  }
  coefOut += ']\n\n';
}

coefOut += 'export const COEFFICIENTS: Record<string, number[]> = {\n';
for (let i = 0; i < planetNames.length; i++) {
  coefOut += `  ${planetNames[i]}: ${Names[i].toUpperCase()}_COEFFS,\n`;
}
coefOut += '}\n';

const oldCoef = fs.readFileSync(COEFFICIENTS_PATH, 'utf8');
if (oldCoef === coefOut) {
  console.log(`  ✓ coefficients.ts: unchanged (${planetNames.length} × ${coeffs.mercury.length} terms)`);
} else if (!WRITE) {
  console.log(`  ↻ coefficients.ts: needs update (${planetNames.length} × ${coeffs.mercury.length} terms). Run with --write.`);
} else {
  fs.writeFileSync(COEFFICIENTS_PATH, coefOut);
  console.log(`  ✓ Written coefficients.ts (${planetNames.length} × ${coeffs.mercury.length} terms)`);
}

// ── 6. model-values.ts ────────────────────────────────────────

const MV_PATH = path.join(HOLISTIC_ROOT, 'src', 'data', 'model-values.ts');
if (fs.existsSync(MV_PATH)) {
  console.log('');
  console.log('  ── model-values.ts ──');
  let mvTs = fs.readFileSync(MV_PATH, 'utf8');
  let mvChanges = 0;

  // Helper: replace a string value like  key: 'value',
  function replaceMV(key, newVal) {
    const re = new RegExp("(" + key + ":\\s*')[^']*(')", 'g');
    const match = mvTs.match(re);
    if (!match) return;
    const expected = match[0].replace(/'.+'/, "'" + newVal + "'");
    if (match[0] === expected) return;
    mvTs = mvTs.replace(match[0], expected);
    console.log(`    ↻ ${key}: → '${newVal}'`);
    mvChanges++;
  }

  // Helper: replace a numeric value in PLANET_INCL
  function replacePlanetIncl(planet, field, newVal) {
    const re = new RegExp("(" + planet + ":[^}]*" + field + ":\\s*)[\\d.]+");
    const match = mvTs.match(re);
    if (!match) return;
    const rounded = parseFloat(newVal.toPrecision(7));
    const expected = match[1] + rounded;
    if (match[0] === expected) return;
    mvTs = mvTs.replace(match[0], expected);
    mvChanges++;
  }

  // Earth display values
  replaceMV('eccentricityBase', C.eccentricityBase.toFixed(6));
  replaceMV('eccentricityAmplitude', C.eccentricityAmplitude.toFixed(6));
  replaceMV('correctionSun', C.correctionSun.toFixed(5));

  // Per-planet inclination display strings
  const inclPlanets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  for (const p of inclPlanets) {
    const mean = C.planets[p].invPlaneInclinationMean;
    const amp = C.planets[p].invPlaneInclinationAmplitude;
    replaceMV(p + 'InclMean', mean.toFixed(6));
    replaceMV(p + 'InclAmp', amp.toFixed(6));
  }

  // PLANET_INCL numeric object
  for (const p of inclPlanets) {
    replacePlanetIncl(p, 'mean', C.planets[p].invPlaneInclinationMean);
    replacePlanetIncl(p, 'amp', C.planets[p].invPlaneInclinationAmplitude);
  }
  replacePlanetIncl('earth', 'mean', C.earthInvPlaneInclinationMean);
  replacePlanetIncl('earth', 'amp', C.earthInvPlaneInclinationAmplitude);

  if (mvChanges === 0) {
    console.log('    ✓ All values match');
  } else if (!WRITE) {
    console.log(`    ${mvChanges} changes pending`);
  } else {
    fs.writeFileSync(MV_PATH, mvTs);
    console.log(`    ✓ Written ${mvChanges} changes to model-values.ts`);
  }
}

console.log('');
