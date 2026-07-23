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
const HOLISTIC_ROOT = path.resolve(__dirname, '..', '..', '..', '..', 'code', 'Holistic', 'holisticuniverse');
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
  EARTH_ECC_BASE: { val: C.eccentricityBase, prec: -1 },
  EARTH_ECC_AMP: { val: C.eccentricityAmplitude, prec: -1 },
  CORRECTION_SUN: { val: C.correctionSun, prec: 5 },
  CORRECTION_DAYS: { val: C.correctionDays, prec: 4 },
  START_ANGLE_MODEL: { val: C.startAngleModel, prec: 8 },
};

for (const [name, { val, prec }] of Object.entries(earthScalars)) {
  const output = prec < 0 ? val : parseFloat(val.toFixed(prec));
  constantsTs = replaceScalar(constantsTs, name, output);
}

// ── 2b. Balance + Config results (from balance-search.js) ─────

console.log('');
console.log('  ── Balance / Config results ──');

const balancePresetsPath = path.join(__dirname, '..', '..', 'data', 'balance-presets.json');
if (fs.existsSync(balancePresetsPath)) {
  const bp = JSON.parse(fs.readFileSync(balancePresetsPath, 'utf8'));
  const cc = bp.currentConfig || {};
  const rnd = (n, d) => Number.parseFloat((Number(n)).toFixed(d));
  const da = bp.deepAnalysis || {};
  const balanceLines = [
    `inclBalance:     ${rnd(cc.inclBalance, 4)},   // Law 3 — in-phase vs anti-phase weights (%)`,
    `eccBalance:      ${rnd(cc.eccBalance, 4)},   // Law 5 — eccentricity weights balance (%)`,
    `eccBalanceJ2000: ${rnd(cc.eccBalanceJ2000, 4)},   // Law 5 — J2000 snapshot eccentricity balance (%)`,
    `saturnPredErrPct:${rnd(cc.saturnPredErrPct, 4)},   // Finding 4 — Saturn e predicted vs observed (%)`,
    `threshold:       ${rnd(bp.threshold, 3)},    // TNO-margin threshold used in balance-search`,
    `presetCount:     ${bp.count},       // Configs passing inclination balance threshold`,
    `configNumber:    ${cc.rank},         // Current config's rank within sorted presets`,
    `searchSpace:     ${bp.searchSpace},   // Exhaustive search space size`,
    `// Deep analysis pipeline counts:`,
    `deepEccThreshold:    ${da.eccThreshold || 99},     // Eccentricity balance threshold (%)`,
    `deepCandidateCount:  ${da.candidateCount || 94},   // Configs passing incl + ecc thresholds`,
    `deepLLValidCount:    ${da.llValidCount || 49},     // Configs with valid LL anchor`,
    `deepSurvivorCount:   ${da.survivorCount || bp.presetCount || 41}, // Configs passing all filters (rate error ≤ max)`,
    `deepMaxRateError:    ${da.maxRateError || 5},      // Max total rate error threshold (arcsec)`,
  ];
  constantsTs = replaceObjectLiteral(constantsTs, 'BALANCE_RESULTS', balanceLines);
} else {
  console.log('  ⚠ balance-presets.json not found — run `node tools/verify/balance-search.js` first');
}

// ── 2c. Significance results (from fibonacci_significance.py) ─

console.log('');
console.log('  ── Significance results ──');

const sigResultsPath = path.join(__dirname, '..', '..', 'data', 'significance-results.json');
if (fs.existsSync(sigResultsPath)) {
  const sr = JSON.parse(fs.readFileSync(sigResultsPath, 'utf8'));
  const fc   = sr.fisher_combined || {};
  const sc   = sr.stouffer_combined_corrected || {};
  const ssc  = sr.stouffer_sigma_corrected || {};  // sigma equivalents of sc
  const scu  = sr.stouffer_combined || {};  // uncorrected (informational, unused in TS)
  const jc   = sr.joint_combined || {};      // NEW: direct joint test per null
  void scu;  // silence unused-var lint
  const toExpJs = (n) => {
    // Render as e.g. "1.8e-14" with one decimal in the mantissa
    if (n === null || n === undefined) return 'null';
    const s = Number(n).toExponential(1);
    return s.replace(/e([+-]?)0*(\d)/, 'e$1$2');
  };
  const empR = (dist) => {
    const v = sr.method && sr.method[`empirical_correlation_${dist}`];
    return (typeof v === 'number') ? Number(v.toFixed(3)) : 'null';
  };
  const jointField = (distKey, field) => {
    const j = jc[distKey];
    if (!j) return 'null';
    const v = j[field];
    if (typeof v === 'number') {
      return field === 'p' ? toExpJs(v) : String(v);
    }
    return 'null';
  };
  const sigLines = [
    `testCount:          ${sr.counts.total},       // Total significance tests in the script`,
    `lawCount:           ${sr.counts.lawCount || 6},        // Fibonacci Laws covered`,
    `empiricalCount:     ${sr.counts.empirical},        // Permutation-combinable empirical tests`,
    `mcCombinableCount:  ${sr.counts.mc_combinable || sr.counts.empirical},        // MC-combinable tests (larger set)`,
    `structuralCount:    ${sr.counts.structural},        // Structural / tautological tests`,
    `// Empirical pairwise correlation MEASURED from each null (not assumed):`,
    `empiricalR_permutation: ${empR('permutation')},`,
    `empiricalR_logUniform:  ${empR('log_uniform')},`,
    `empiricalR_uniform:     ${empR('uniform')},`,
    `// Derived Brown-style variance inflation factor using MEASURED r̄:`,
    `correlationFactor:  ${Number((sr.method && sr.method.correlation_factor || 1).toFixed(2))},      // 1 + (k-1)*r̄_permutation`,
    `// HEADLINE (recommended for citation): direct joint permutation test`,
    `// — studentized T = Sum z_i, p = fraction of nulls with T_null >= T_obs.`,
    `// Model-independent; joint null captures inter-test correlation.`,
    `headlineP:          ${toExpJs(sr.headline_p)},  // Direct joint permutation test`,
    `headlineSigma:      ${sr.headline_sigma},      // Sigma equivalent of headlineP`,
    `// Direct joint test across the 3 null distributions:`,
    `jointP_permutation: ${jointField('permutation', 'p')},`,
    `jointP_logUniform:  ${jointField('log_uniform', 'p')},`,
    `jointP_uniform:     ${jointField('uniform', 'p')},`,
    `jointSigma_permutation: ${jointField('permutation', 'sigma')},`,
    `jointSigma_logUniform:  ${jointField('log_uniform', 'sigma')},`,
    `jointSigma_uniform:     ${jointField('uniform', 'sigma')},`,
    `// Supporting: Stouffer's Z with MEASURED correlation (approximation of joint test):`,
    `stoufferP_permutation: ${toExpJs(sc.permutation)},`,
    `stoufferP_logUniform:  ${toExpJs(sc.log_uniform)},`,
    `stoufferP_uniform:     ${toExpJs(sc.uniform)},`,
    `stoufferSigma_permutation: ${ssc.permutation},`,
    `stoufferSigma_logUniform:  ${ssc.log_uniform},`,
    `stoufferSigma_uniform:     ${ssc.uniform},`,
    `// Supporting: Fisher's method (floor-clamp sensitive, for cross-check only):`,
    `fisherP_permutation: ${toExpJs(fc.permutation)},`,
    `fisherP_logUniform:  ${toExpJs(fc.log_uniform)},`,
    `fisherP_uniform:     ${toExpJs(fc.uniform)},`,
  ];
  constantsTs = replaceObjectLiteral(constantsTs, 'SIGNIFICANCE_RESULTS', sigLines);
} else {
  console.log('  ⚠ significance-results.json not found — run `python3 scripts/fibonacci_significance.py` first');
}

// ── 3. Planet eccentricity records ────────────────────────────

console.log('');
console.log('  ── Eccentricity records ──');

const planets7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Helper: replace a Record<string, ...> block by finding the variable name
// then replacing the content between { and }
function replaceRecordBlock(content, varName, line1, line2) {
  // Match both 'export const' and plain 'const'
  const re = new RegExp('((export )?const ' + varName + '[^{]*\\{)([\\s\\S]*?)(\\})');
  const match = content.match(re);
  if (!match) {
    console.log(`  ⚠ ${varName}: not found`);
    return content;
  }
  const newBody = `\n${line1}\n${line2}\n`;
  const oldBlock = match[0];
  const newBlock = match[1] + newBody + match[4];
  if (oldBlock === newBlock) {
    console.log(`  ✓ ${varName}: unchanged`);
    return content;
  }
  console.log(`  ↻ ${varName}: updated`);
  changeCount++;
  return content.replace(oldBlock, newBlock);
}

/**
 * Replace an object-literal block (e.g. `export const FOO = { ... } as const`).
 * Takes an array of lines for the new body. Preserves any trailing `as const`.
 */
function replaceObjectLiteral(content, varName, bodyLines) {
  const re = new RegExp('((?:export )?const\\s+' + varName + '[^=]*=\\s*\\{)([\\s\\S]*?)(\\})');
  const match = content.match(re);
  if (!match) {
    console.log(`  ⚠ ${varName}: not found`);
    return content;
  }
  const newBody = '\n' + bodyLines.map(l => '  ' + l).join('\n') + '\n';
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

// ECC_BASE, ECC_AMPLITUDE, ECC_PHASE_J2000 are now derived at runtime in constants.ts
// (from K + mean obliquity + balanced-year phase). We sync the INPUT tables instead.

const cap = p => p.charAt(0).toUpperCase() + p.slice(1);
const ar = require('../../public/input/astro-reference.json').planetOrbitalElements;

// SOLAR_YEAR_DAYS (from astro-reference.json)
{
  const inner = planets7.slice(0, 3).map(p => `${cap(p)}: ${ar[p].solarYearInput}`).join(', ');
  const outer = planets7.slice(3).map(p => `${cap(p)}: ${ar[p].solarYearInput}`).join(', ');
  constantsTs = replaceRecordBlock(constantsTs, 'SOLAR_YEAR_DAYS',
    `  ${inner},`, `  ${outer},`);
}

// ECC_J2000 (from astro-reference.json)
{
  const inner = planets7.slice(0, 3).map(p => `${cap(p)}: ${ar[p].orbitalEccentricityJ2000}`).join(', ');
  const outer = planets7.slice(3).map(p => `${cap(p)}: ${ar[p].orbitalEccentricityJ2000}`).join(', ');
  constantsTs = replaceRecordBlock(constantsTs, 'ECC_J2000',
    `  ${inner},`, `  ${outer},`);
}

// TILT_J2000 (from astro-reference.json)
{
  const inner = planets7.slice(0, 3).map(p => `${cap(p)}: ${ar[p].axialTiltJ2000}`).join(', ');
  const outer = planets7.slice(3).map(p => `${cap(p)}: ${ar[p].axialTiltJ2000}`).join(', ');
  constantsTs = replaceRecordBlock(constantsTs, 'TILT_J2000',
    `  ${inner},`, `  ${outer},`);
}

// INCL_J2000 (from astro-reference.json)
{
  const inner = ['mercury','venus','earth','mars'].map(p =>
    `${cap(p)}: ${p === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : ar[p].invPlaneInclinationJ2000}`).join(', ');
  const outer = planets7.slice(3).map(p => `${cap(p)}: ${ar[p].invPlaneInclinationJ2000}`).join(', ');
  constantsTs = replaceRecordBlock(constantsTs, 'INCL_J2000',
    `  ${inner},`, `  ${outer},`);
}

// ── 4. Inclination records ────────────────────────────────────
// INCL_MEAN is now derived at runtime in constants.ts (from INCL_J2000 + PSI + phase).
// INCL_J2000 is synced as an input table above.

// ── 4b. Anti-phase flag ──────────────────────────────────────

console.log('');
console.log('  ── Anti-phase ──');

{
  const cap = p => p.charAt(0).toUpperCase() + p.slice(1);
  const ap = p => p === 'earth' ? false : (mp.planets[p].antiPhase || false);
  const inner = ['mercury', 'venus', 'earth', 'mars'].map(p => `${cap(p)}: ${ap(p)}`).join(', ');
  const outer = ['jupiter', 'saturn', 'uranus', 'neptune'].map(p => `${cap(p)}: ${ap(p)}`).join(', ');
  constantsTs = replaceRecordBlock(constantsTs, 'ANTI_PHASE',
    `  ${inner},`,
    `  ${outer},`);
}

// ── 4c. Inclination phase angles ─────────────────────────────

console.log('');
console.log('  ── Inclination phase angles ──');

{
  const cap = p => p.charAt(0).toUpperCase() + p.slice(1);
  const phase = p => p === 'earth'
    ? C.ASTRO_REFERENCE.earthInclinationCycleAnchor
    : mp.planets[p].inclinationCycleAnchor;
  const inner = ['mercury', 'venus', 'earth', 'mars'].map(p => `${cap(p)}: ${phase(p)}`).join(', ');
  const outer = ['jupiter', 'saturn', 'uranus', 'neptune'].map(p => `${cap(p)}: ${phase(p)}`).join(', ');
  constantsTs = replaceRecordBlock(constantsTs, 'INCL_CYCLE_ANCHOR',
    `  ${inner},`,
    `  ${outer},`);
}

// ── 4d. Ascending node periods (asc-node integers re-fit 2026-04-09) ──

console.log('');
console.log('  ── Ascending node integers ──');

{
  // The website constants.ts stores ASC_NODE_PERIOD as expressions like
  // `-_8H / 12`. We replace the whole record block with the new integers,
  // preserving the Earth special case (-H/5 = -8H/40).
  const cyc = p => p === 'earth' ? null : mp.planets[p].ascendingNodeCyclesIn8H;
  // Match the existing layout: 8 lines, planets in declaration order
  const re = /(export const ASC_NODE_PERIOD: Record<string, number> = \{)([\s\S]*?)(\})/;
  const match = constantsTs.match(re);
  if (!match) {
    console.log('  ⚠ ASC_NODE_PERIOD: not found');
  } else {
    const newBody = '\n' +
      `  Mercury: -_8H / ${cyc('mercury')},\n` +
      `  Venus:   -_8H / ${cyc('venus')},\n` +
      `  Earth:   -H / 5,\n` +
      `  Mars:    -_8H / ${cyc('mars')},\n` +
      `  Jupiter: -_8H / ${cyc('jupiter')},\n` +
      `  Saturn:  -_8H / ${cyc('saturn')},\n` +
      `  Uranus:  -_8H / ${cyc('uranus')},\n` +
      `  Neptune: -_8H / ${cyc('neptune')},\n`;
    const newBlock = match[1] + newBody + match[3];
    if (match[0] === newBlock) {
      console.log('  ✓ ASC_NODE_PERIOD: unchanged');
    } else {
      constantsTs = constantsTs.replace(match[0], newBlock);
      console.log('  ↻ ASC_NODE_PERIOD: updated');
      changeCount++;
    }
  }
}

// ── 3d. Astro-reference anchors (from public/input/astro-reference.json) ──
// Values sourced from astro-reference.json (the pipeline's single source of
// truth for IAU/Meeus/fit-derived scalar anchors). deltaTStart in particular
// is auto-updated by tools/fit/dt-corrections-fit.js --sweep-usno, so it must
// propagate to Holistic to keep the calculator's ΔT anchor in step with the
// simulator.
console.log('');
console.log('  ── Astro-reference anchors ──');
{
  const arFull = require('../../public/input/astro-reference.json');
  const eo = arFull.earthOrbital || {};
  const mr = arFull.moonReference || {};
  const anchors = [
    ['DELTA_T_START_SECONDS',                     eo.deltaTStart],
    ['PERIHELION_ALIGNMENT_YEAR',                 eo.perihelionalignmentYear],
    // Lunar Precession Invariant inputs — needed for the deep-time apsidal/nodal
    // scaling and the V-tags shown on the website + paper.
    ['MOON_APSIDAL_PRECESSION_DAYS_ICRF_INPUT',   mr.moonApsidalPrecessionDaysInputICRF],
    ['MOON_NODAL_PRECESSION_DAYS_ICRF_INPUT',     mr.moonNodalPrecessionDaysInputICRF],
  ];
  for (const [name, val] of anchors) {
    if (typeof val !== 'number') {
      console.log(`  ⚠ ${name}: astro-reference missing corresponding key`);
      continue;
    }
    constantsTs = replaceScalar(constantsTs, name, val);
  }
}

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

const coeffs = fitted.PREDICT_COEFFS_PHYSICAL || fitted.PREDICT_COEFFS_UNIFIED;
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

// ── Feature builder verification ──────────────────────────────

const PLANETS_PATH = path.join(HOLISTIC_ROOT, 'src', 'lib', 'orbital', 'planets.ts');
if (fs.existsSync(PLANETS_PATH)) {
  const planetsTs = fs.readFileSync(PLANETS_PATH, 'utf8');
  const OE = require('../lib/orbital-engine');
  const expectedCount = OE.buildPredictiveFeatures(2000, 'mercury').length;

  // Count features by checking the comment at the top of buildFeatures
  const commentMatch = planetsTs.match(/Build (?:unified|physical-beat) (\d+)-term feature matrix/);
  const declaredCount = commentMatch ? parseInt(commentMatch[1]) : 0;

  if (declaredCount !== expectedCount) {
    console.log(`  ⚠ planets.ts buildFeatures declares ${declaredCount} terms but pipeline expects ${expectedCount} — MANUAL UPDATE NEEDED`);
  } else {
    console.log(`  ✓ planets.ts buildFeatures: ${expectedCount} terms (matches pipeline)`);
  }
}

// ── 6. model-values (compute + generated JSON) ────────────────
//
// Website layout (2026-07): model-values.ts is a thin re-export of
// model-values.generated.json. The heavy year-by-year scans live in
// model-values.compute.ts and only run at codegen time (predev/prebuild
// hooks call scripts/generate-model-values.mjs, which mtime-checks its
// inputs and rewrites the JSON when constants.ts / lib/orbital changes).
//
// This exporter does NOT touch either file directly:
//   - .compute.ts pulls its numbers via imports from orbital/constants.ts,
//     which we already sync above → no string replacement needed.
//   - .generated.json auto-refreshes on the next `pnpm run dev/build`
//     because its mtime falls behind constants.ts.
//
// We just flag when the snapshot is stale so the exporter's output makes
// the "you'll need to rebuild/regen the website" step obvious.

// ── ΔT correction coefficients (deepTime.ts) ──────────────────
// Source of truth: data/deltaT-3flag-fit.json (fitted by tools/fit/dt-corrections-fit.js).
// Delegates to tools/fit/export-dt-corrections.js so the transform lives in one place.
// deepTime.ts is independent of constants.ts so its changes are NOT folded into the
// model-values staleness check below — DT corrections don't feed the LOD pipeline.
{
  console.log('');
  console.log('  ── deepTime.ts (ΔT correction coefficients) ──');
  const dt = require('./export-dt-corrections');
  const fit = dt.loadFitJson();
  const targetPath = dt.TARGETS.websiteDeepTime.path;
  if (!fit) {
    console.log('    (data/deltaT-3flag-fit.json not found — run dt-corrections-fit.js --write to generate)');
  } else if (!fs.existsSync(targetPath)) {
    console.log(`    (${dt.TARGETS.websiteDeepTime.label} not found, skipping)`);
  } else {
    const before = fs.readFileSync(targetPath, 'utf8');
    const { source: after, changes } = dt.applyToSource(before, fit);
    if (changes === 0) {
      console.log('    ✓ 3-flag ΔT constants already in sync');
    } else if (!WRITE) {
      console.log(`    ${changes} ΔT constants pending. Run with --write to apply.`);
    } else {
      fs.writeFileSync(targetPath, after);
      console.log(`    ✓ Written ${changes} ΔT constants to deepTime.ts`);
    }
  }
}

const MV_COMPUTE = path.join(HOLISTIC_ROOT, 'src', 'data', 'model-values.compute.ts');
const MV_JSON    = path.join(HOLISTIC_ROOT, 'src', 'data', 'model-values.generated.json');
const MV_TS      = path.join(HOLISTIC_ROOT, 'src', 'data', 'model-values.ts');

// ── 7. Fit-anchored measurement scalars → model-values.compute.ts + deepTime.ts ──
//
// Auto-syncs the hand-written "shipped measurement constants" in the website
// from their machine sources in this repo, so a re-fit propagates into website
// V-tags and paper \Mv macros without manual edits:
//
//   data/deltaT-4flag-fit.json  → usnoLodJ2000, deltaTEspenakRmsSeconds
//   tools/lib/deep-time.js      → ALPHA_CLIMATE_SCALE_NUM + the dLOD/dt
//     channel rates (DLOD_TIDAL / DLOD_GIA / DLOD_ALLCYCLES /
//     DLOD_RESONATOR), evaluated at
//     the sim's model epoch 2000.5 (t_Ma = −5e-7) so they match the
//     tweakpane's dLOD/dt decomposition rows digit-for-digit; plus
//     ALPHA_CLIMATE_SCALE / ALPHA_1 into website deepTime.ts (the α(t)
//     constants export-dt-corrections.js does not cover).
//
// Eclipse-audit / Bond-IRD / Babylon-135 numbers remain hand-maintained —
// they come from docs 102/103 analyses with no machine-readable artifact.
{
  console.log('');
  console.log('  ── Fit-anchored scalars (compute.ts + deepTime.ts) ──');
  let mvChangeCount = 0;

  // Replace a quoted V-key value:  key: '…',
  function replaceMvString(content, key, newVal) {
    const re = new RegExp("(" + key + ":\\s*')[^']*(')");
    const m = content.match(re);
    if (!m) { console.log(`    ⚠ ${key}: not found`); return content; }
    const oldVal = m[0].slice(m[1].length, m[0].length - 1);
    if (oldVal === newVal) { console.log(`    ✓ ${key}: unchanged (${newVal})`); return content; }
    console.log(`    ↻ ${key}: '${oldVal}' → '${newVal}'`);
    mvChangeCount++;
    return content.replace(m[0], m[1] + newVal + "'");
  }

  // Replace a numeric const:  const NAME = <number>   (no export prefix).
  // Comparison is NUMERIC so equal values in different notations (e.g.
  // -9.9375895103e-5 vs -0.000099375895103) don't churn the file.
  function replaceMvConst(content, name, newVal, label) {
    const re = new RegExp('(const ' + name + '\\s*=\\s*)[\\-\\d.e+]+');
    const m = content.match(re);
    if (!m) { console.log(`    ⚠ const ${name}: not found${label ? ' in ' + label : ''}`); return content; }
    const oldVal = m[0].replace(m[1], '');
    if (Number(oldVal) === Number(newVal)) { console.log(`    ✓ ${name}: unchanged (${oldVal})`); return content; }
    console.log(`    ↻ ${name}: ${oldVal} → ${newVal}${label ? '  [' + label + ']' : ''}`);
    mvChangeCount++;
    return content.replace(m[0], m[1] + newVal);
  }

  const DT = require('../lib/deep-time');

  if (fs.existsSync(MV_COMPUTE)) {
    let mv = fs.readFileSync(MV_COMPUTE, 'utf8');
    const mvBefore = mv;

    const FIT4_PATH = path.resolve(__dirname, '..', '..', 'data', 'deltaT-4flag-fit.json');
    if (fs.existsSync(FIT4_PATH)) {
      const fit4 = JSON.parse(fs.readFileSync(FIT4_PATH, 'utf8'));
      const usno = fit4.optimum.usno_target_lod_s;                 // e.g. 86400.0026
      const usnoStr = String(usno).replace(/^\d+/, i => i.replace(/\B(?=(\d{3})+$)/g, ','));
      mv = replaceMvString(mv, 'usnoLodJ2000', usnoStr);
      mv = replaceMvString(mv, 'deltaTEspenakRmsSeconds', fit4.optimum.espenak_rms_s.toFixed(1));
    } else {
      console.log('    (data/deltaT-4flag-fit.json not found — skipping USNO/RMS sync)');
    }

    mv = replaceMvConst(mv, 'ALPHA_CLIMATE_SCALE_NUM', DT.ALPHA_CLIMATE_SCALE);
    const dLod = DT.dLodDtDecompositionAtAge(-5e-7);               // model epoch 2000.5
    if (dLod.tidal !== null) {
      mv = replaceMvConst(mv, 'DLOD_TIDAL',     dLod.tidal.toFixed(2));
      mv = replaceMvConst(mv, 'DLOD_GIA',       dLod.gia.toFixed(2));
      mv = replaceMvConst(mv, 'DLOD_ALLCYCLES', dLod.stack.toFixed(2));
      mv = replaceMvConst(mv, 'DLOD_RESONATOR', dLod.resonator.toFixed(2));
    }

    // Deep-time scalar anchors (Devonian / Earth-Moon genesis / +200 Myr) —
    // computed from the shipped ESSRT chain so a Moon-polynomial refit
    // propagates into website V-tags and paper \Mv macros automatically.
    // Genesis epoch = the rigid-Roche crossing (~9,500 km) of the recession
    // polynomial; the "Hadean" key names are kept for macro compatibility.
    {
      const R_E_KM = 6371, ROCHE_RIGID_KM = 9500;
      const fmtInt = x => Math.round(x).toLocaleString('en-US');
      const uMinus = s => String(s).replace('-', '−');
      const TOTAL_DAYS = DT.meanHAtAge(0) * DT.meanYearInDaysAtAge(0);
      const driftPpm = t => uMinus(Math.round(
        (DT.meanHAtAge(t) * DT.meanYearInDaysAtAge(t) / TOTAL_DAYS - 1) * 1e6));
      let lo = 4400, hi = 4550;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (DT.meanMoonDistanceMetresAtAge(mid) / 1000 > ROCHE_RIGID_KM) lo = mid; else hi = mid;
      }
      const tGen = Math.round((lo + hi) / 2);
      const key = (name, val) => { mv = replaceMvString(mv, name, val); };
      // Devonian (380 Ma)
      key('hAtDevonian',            fmtInt(DT.meanHAtAge(380)));
      key('lodAtDevonianHr',        (DT.meanLodSecondsAtAge(380) / 3600).toFixed(2));
      key('eightHAtDevonian',       (8 * DT.meanHAtAge(380) / 1e6).toFixed(3));
      key('moonDistanceAtDevonian', fmtInt(DT.meanMoonDistanceMetresAtAge(380) / 1000));
      key('daysPerYearAtDevonian',  DT.meanYearInDaysAtAge(380).toFixed(2));
      key('driftAtDevonianPpm',     driftPpm(380));
      key('axialPrecAtDevonian',    fmtInt(DT.meanHAtAge(380) / 13));
      // Earth-Moon genesis (rigid-Roche crossing)
      key('moonGenesisAgeGa',       (tGen / 1000).toFixed(3));
      key('hAtHadean',              fmtInt(DT.meanHAtAge(tGen)));
      key('lodAtHadeanHr',          (DT.meanLodSecondsAtAge(tGen) / 3600).toFixed(2));
      key('eightHAtHadean',         (8 * DT.meanHAtAge(tGen) / 1e6).toFixed(3));
      key('moonDistanceAtHadean',   fmtInt(DT.meanMoonDistanceMetresAtAge(tGen) / 1000));
      key('moonDistanceAtHadeanRE', (DT.meanMoonDistanceMetresAtAge(tGen) / 1000 / R_E_KM).toFixed(2));
      key('axialPrecAtHadean',      fmtInt(DT.meanHAtAge(tGen) / 13));
      key('driftAtHadeanPpm',       driftPpm(tGen));
      key('hOneGyrAgoPct',          '~' + Math.round(DT.meanHAtAge(1000) / DT.meanHAtAge(0) * 100));
      // +200 Myr future
      key('hAt200MyrFuture',            fmtInt(DT.meanHAtAge(-200)));
      key('eightHAt200MyrFuture',       (8 * DT.meanHAtAge(-200) / 1e6).toFixed(3));
      key('moonDistanceAt200MyrFuture', fmtInt(DT.meanMoonDistanceMetresAtAge(-200) / 1000));
      key('lodAt200MyrFutureHr',        (DT.meanLodSecondsAtAge(-200) / 3600).toFixed(2));
      key('axialPrecAt200MyrFuture',    fmtInt(DT.meanHAtAge(-200) / 13));
    }

    if (mv !== mvBefore && WRITE) {
      fs.writeFileSync(MV_COMPUTE, mv);
      console.log('    ✓ Written to model-values.compute.ts');
    }
  } else {
    console.log('    (model-values.compute.ts not found, skipping)');
  }

  // Deep-time physics anchors → website deepTime.ts (cycle coefficients are
  // handled by export-dt-corrections.js above). Source of truth:
  // astro-reference.json physicalConstants + model-parameters.json deepTime,
  // read via tools/lib/constants.js (same chain deep-time.js uses).
  const WEB_DEEPTIME = path.join(HOLISTIC_ROOT, 'src', 'lib', 'orbital', 'deepTime.ts');
  if (fs.existsSync(WEB_DEEPTIME)) {
    let wdt = fs.readFileSync(WEB_DEEPTIME, 'utf8');
    const wdtBefore = wdt;
    wdt = replaceMvConst(wdt, 'ALPHA_CLIMATE_SCALE', C.ALPHA_CLIMATE_SCALE, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'ALPHA_1', C.ALPHA_1, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'ALPHA_3', C.ALPHA_3, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'ALPHA_4', C.ALPHA_4, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'EARTH_MOI_FACTOR', C.EARTH_MOI_FACTOR, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'L_SUN_W', C.SOLAR_LUMINOSITY_W, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'SOLAR_WIND_KG_PER_S', C.SOLAR_WIND_KG_PER_S, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'HOLOCENE_TAPER_FULL_HALFWIDTH_YR', C.DT_STACK_TAPER_FULL_HALFWIDTH_YR, 'deepTime.ts');
    wdt = replaceMvConst(wdt, 'HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR', C.DT_STACK_TAPER_TOTAL_HALFWIDTH_YR, 'deepTime.ts');
    if (wdt !== wdtBefore && WRITE) {
      fs.writeFileSync(WEB_DEEPTIME, wdt);
      console.log('    ✓ Written to deepTime.ts');
    }
  }

  if (mvChangeCount === 0) {
    console.log('    ✓ all fit-anchored scalars in sync');
  } else if (!WRITE) {
    console.log(`    ${mvChangeCount} scalar(s) pending. Run with --write to apply.`);
  } else {
    console.log('      Regen after write: `pnpm run values:generate` + `npx tsx docs/paper/generate-tex-values.ts`');
  }
}

if (fs.existsSync(MV_COMPUTE) && fs.existsSync(MV_JSON)) {
  console.log('');
  console.log('  ── model-values (compute + JSON snapshot) ──');
  const constantsMtime = fs.statSync(CONSTANTS_PATH).mtimeMs;
  const jsonMtime      = fs.statSync(MV_JSON).mtimeMs;
  const willBeStale = changeCount > 0 && WRITE;
  const alreadyStale = jsonMtime < constantsMtime;
  if (willBeStale || alreadyStale) {
    const verb = alreadyStale ? 'is' : 'will be';
    console.log(`    ⚠ model-values.generated.json ${verb} stale vs constants.ts`);
    console.log('      Run `pnpm run values:generate` in the website repo (or just');
    console.log('      start dev/build — predev/prebuild refresh it automatically).');
  } else if (changeCount > 0) {
    console.log('    ℹ JSON snapshot will need regen after --write (see above)');
  } else {
    console.log('    ✓ compute file untouched, JSON snapshot in sync');
  }
} else if (fs.existsSync(MV_TS)) {
  // Legacy pre-split layout — website not yet migrated to the JSON snapshot.
  console.log('');
  console.log('  ── model-values.ts (legacy layout) ──');
  console.log('    ✓ All values match (via constants.ts single source of truth)');
}

console.log('');
