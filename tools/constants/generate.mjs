/**
 * Generate the physics constants module from the JSON source of truth (§2g).
 *
 *   node tools/constants/generate.mjs           check  (exit 1 if stale)
 *   node tools/constants/generate.mjs --write   regenerate
 *
 * WHY GENERATED, NOT READ AT RUNTIME. `holisticyearLength` is used at
 * `script.js:44` — module scope, before anything runs — so an async read means
 * restructuring initialisation. A runtime fetch would also put a network
 * dependency in front of a core constant, and Phase 15's gate is
 * offline === hosted, bit-identical. Build-time generation gives the same
 * single-source guarantee at zero runtime cost.
 *
 * WHAT IS AND IS NOT INJECTABLE (§2d). Not every constant may be a parameter.
 * The classification below is the load-bearing part of this file:
 *
 *   parameter  free parameters — we choose them; changing one = a different
 *              model. This is the counterfactual surface.
 *   anchor     measured reality that feeds the model. Injectable, but asks a
 *              different question: "what if the universe were otherwise".
 *   target     validation data, only ever compared against. NEVER injectable —
 *              if a target enters the constants context, a counterfactual can
 *              move the goalposts it is judged by. Not hypothetical:
 *              laplaceLagrangeBounds is the bound Saturn fails in verify-laws
 *              (44/45), so making it injectable would let that documented
 *              failure be configured away.
 *   presentation  visualisation only. Not physics; belongs to the simulator.
 *
 * Only `parameter` and `anchor` are emitted.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IN = join(ROOT, 'public/input');
const OUT_JS = join(ROOT, 'packages/physics/src/constants/generated.js');
const OUT_DTS = join(ROOT, 'packages/physics/src/constants/generated.d.ts');
const OUT_COEFFS = join(ROOT, 'packages/physics/src/constants/coefficients.js');

/**
 * Fitted coefficients emitted VERBATIM from fitted-coefficients.json (§2j).
 *
 * A SEPARATE export and a separate file, because the lifecycle differs: model
 * parameters are chosen or measured and change deliberately; these are pipeline
 * OUTPUT and change wholesale whenever a fit step runs. One hash over both could
 * not distinguish "someone changed H" from "6b was rerun".
 *
 * WHY VERBATIM MATTERS. export-to-script.js did not merely format these — it
 * rounded. Its fmtHarmonics3 wrote 6 decimal places, so the browser ran on
 * coefficients measurably worse than the ones tools/lib reads:
 *
 *   PERI_HARMONICS           RSS 0.0076"  worst 0.0359"   1 term zeroed
 *   OBLIQUITY_HARMONICS      RSS 0.0058"  worst 0.0219"   1 term zeroed
 *   SUN_LONGITUDE_HARMONICS  RSS 0.0031"  worst 0.0055"
 *
 * against a 6b fit that targets 0.00641" out-of-sample. The fitter reached that
 * and the export threw away as much again — in one engine only. Two coefficients
 * were rounded to exactly zero. Emitting the JSON unchanged removes the whole
 * class of error.
 *
 * Any rename or reshape script.js wants (PERI_HARMONICS_RAW -> PERI_HARMONICS,
 * divisor n -> period H/n) happens THERE, visibly, not in a formatter here.
 */
const COEFFICIENT_KEYS = [
  'TROPICAL_YEAR_HARMONICS',
  'SIDEREAL_YEAR_HARMONICS',
  'ANOMALISTIC_YEAR_HARMONICS',
  'PERI_HARMONICS_RAW',
  'SOLSTICE_OBLIQUITY_HARMONICS',
  'SUN_LONGITUDE_HARMONICS',

  // Correction tables. Audited for the same rounding: fmtParallax wrote FOUR
  // decimals and the gravitation/elongation formatters six, but all four blocks
  // came out bit-exact — the fitter already stores them at that precision, so
  // the formatter had nothing to round away. Emitted verbatim regardless, so the
  // question cannot arise again.
  'PARALLAX_DEC_CORRECTION',
  'PARALLAX_RA_CORRECTION',
  'GRAVITATION_CORRECTION',
  'ELONGATION_CORRECTION',
];

/**
 * Every top-level block of the two JSONs, classified. A block missing from this
 * map is an ERROR, not a default — silently including or excluding a new block
 * is exactly the failure this map exists to prevent.
 */
const CLASSIFICATION = {
  'model-parameters.json': {
    foundational: 'parameter',
    earth: 'parameter',
    moon: 'parameter',
    planets: 'parameter',
    additionalBodies: 'parameter',
    perihelionPassageRef: 'parameter',
    deepTime: 'parameter',
  },
  'astro-reference.json': {
    physicalConstants: 'anchor',
    earthOrbital: 'anchor',
    // Anchor, not presentation: earthDiameter yields R_EARTH_M for the physics
    // and sun/moon diameters give the radii the eclipse geometry uses. They are
    // measured reality, so a counterfactual over them is legitimate — "what if
    // the Moon were larger" is a real question this model can answer.
    bodyDiametersKm: 'anchor',
    cardinalPointAnchors: 'anchor',
    moonReference: 'anchor',
    moonMeeus: 'anchor',
    planetOrbitalElements: 'anchor',
    additionalBodiesReference: 'anchor',
    yearLengthRef: 'anchor',

    // ── never injectable ────────────────────────────────────────────────────
    // Self-described: "Validation reference values for comparison".
    knownValues: 'target',
    // Re-anchors a published external curve (Espenak/Meeus ΔT) onto the model's
    // axis so the two can be plotted together. A comparison aid, never an input.
    externalCurveAnchors: 'target',
    // Consumed only by tools/verify/{inclination-optimization,inclination-verification}.
    laplaceLagrangeBounds: 'target',
    // Consumed only by tools/verify/ascending-node-*.
    ascendingNodesSouamiSouchay: 'target',
    // Feeds only trendError / directionMatch in script.js — compared against the
    // model's own computed trend, never an input to it.
    jplEclipticInclinationTrends: 'target',
    // Farside Table 10.1 reference phases. No consumer at all today.
    eigenmodePhasesLaplaceLagrange: 'target',

    // ── not physics ─────────────────────────────────────────────────────────
    // Self-described "visualization only"; zero consumers in tools/lib/constants.js.
    galaxyMotion: 'presentation',
  },
};

const read = (f) => JSON.parse(readFileSync(join(IN, f), 'utf8'));

/** Walk a block, dropping `_`-prefixed documentation keys. */
const strip = (v) => {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => [k, strip(x)]),
    );
  }
  return v;
};

/** Stable key order so the hash depends on values, not on JSON.stringify order. */
const canonical = (v) => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  }
  return v;
};

function build() {
  const included = {};
  const reference = {};
  const excluded = {};
  const problems = [];

  for (const [file, classes] of Object.entries(CLASSIFICATION)) {
    const json = read(file);
    const blocks = Object.keys(json).filter((k) => !k.startsWith('_'));

    for (const b of blocks) {
      const cls = classes[b];
      if (!cls) { problems.push(`${file}: block "${b}" is UNCLASSIFIED — add it to CLASSIFICATION`); continue; }
      if (cls === 'parameter' || cls === 'anchor') included[b] = strip(json[b]);
      else {
        excluded[b] = cls;
        // Excluded from the INJECTABLE context, but still emitted — as a
        // separate export. Not injectable and single-sourced are different
        // properties, and conflating them left 36 values duplicated as
        // literals in script.js with nothing keeping them in step.
        reference[b] = strip(json[b]);
      }
    }
    for (const b of Object.keys(classes)) {
      if (!blocks.includes(b)) problems.push(`${file}: classified block "${b}" no longer exists — remove it`);
    }
  }

  // Hashed over the INJECTABLE set only. Reference data is not part of the
  // model's identity: changing a validation bound does not make it a different
  // model, and a counterfactual cannot alter it.
  const hash = createHash('sha256')
    .update(JSON.stringify(canonical(included)))
    .digest('hex')
    .slice(0, 16);

  return { included, reference, excluded, problems, hash };
}

const countLeaves = (o) =>
  Object.values(o).reduce((n, v) => n + (v && typeof v === 'object' ? countLeaves(v) : 1), 0);

function emitJs({ included, reference, excluded, hash }) {
  const blocks = Object.keys(included).sort();
  const refBlocks = Object.keys(reference).sort();
  const exNote = Object.entries(excluded)
    .map(([b, c]) => ` *   ${b.padEnd(32)} ${c}`)
    .join('\n');

  const refSection = `
/**
 * Validation targets and presentation data — SINGLE-SOURCED BUT NOT INJECTABLE.
 *
 * These are deliberately absent from DEFAULT_CONSTANTS. \`createModel\` never
 * accepts them, so a counterfactual cannot move the goalposts it is judged by:
 * laplaceLagrangeBounds is the bound Saturn fails in verify-laws (44/45), and
 * making it injectable would let that documented failure be configured away.
 *
 * They are still emitted, because "must not be injectable" and "may be
 * duplicated as literals" are different claims. Before this export existed,
 * script.js carried its own copies of all of them with nothing keeping the two
 * in step — they happened to agree, by nobody's design.
 *
 * @type {Readonly<Record<string, unknown>>}
 */
export const REFERENCE_DATA = Object.freeze({
${refBlocks.map((b) => `  ${b}: ${JSON.stringify(reference[b], null, 2).split('\n').join('\n  ')},`).join('\n')}
});
`;

  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source of truth: public/input/{model-parameters,astro-reference}.json
 * Classification and rationale: tools/constants/generate.mjs
 *
 * Two exports, deliberately separate (§2d):
 *
 *   DEFAULT_CONSTANTS  free parameters + measured anchors. INJECTABLE — this is
 *                      the counterfactual surface, and what the hash covers.
 *   REFERENCE_DATA     validation targets + presentation. Single-sourced so
 *                      nothing duplicates them, but NOT injectable:
${exNote}
 *
 * @typedef {typeof DEFAULT_CONSTANTS} GeneratedConstants
 */

/**
 * Content hash of the values below, over a key-sorted canonical form. Responses
 * carry it so a counterfactual is reproducible (§2d).
 * @type {string}
 */
export const CONSTANTS_HASH = ${JSON.stringify(hash)};

/** @type {Readonly<Record<string, unknown>>} */
export const DEFAULT_CONSTANTS = Object.freeze({
  hash: ${JSON.stringify(hash)},
${blocks.map((b) => `  ${b}: ${JSON.stringify(included[b], null, 2).split('\n').join('\n  ')},`).join('\n')}
});
${refSection}`;
}

function emitDts({ included, reference, hash }) {
  const t = (v, ind = '  ') => {
    if (Array.isArray(v)) return v.length && typeof v[0] === 'number' ? 'number[]' : 'unknown[]';
    if (v === null) return 'null';
    if (typeof v === 'object') {
      const inner = Object.entries(v)
        .map(([k, x]) => `${ind}  ${JSON.stringify(k)}: ${t(x, `${ind}  `)};`)
        .join('\n');
      return `{\n${inner}\n${ind}}`;
    }
    return typeof v;
  };
  const body = Object.keys(included).sort()
    .map((b) => `  readonly ${b}: ${t(included[b])};`)
    .join('\n');

  return `// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// Gives the TypeScript website full type safety at the boundary (§2g) while
// packages/physics stays JavaScript.

export declare const CONSTANTS_HASH: ${JSON.stringify(hash)};

export declare const DEFAULT_CONSTANTS: {
  readonly hash: ${JSON.stringify(hash)};
${body}
};

// Validation targets and presentation data. Single-sourced, NOT injectable —
// createModel does not accept these (§2d).
export declare const REFERENCE_DATA: {
${Object.keys(reference).sort().map((b) => `  readonly ${b}: ${t(reference[b])};`).join('\n')}
};
`;
}

/** Emit the fitted coefficients verbatim, with their own content hash. */
function buildCoefficients() {
  const fc = read('fitted-coefficients.json');
  const out = {};
  const missing = [];
  for (const k of COEFFICIENT_KEYS) {
    if (!(k in fc)) { missing.push(k); continue; }
    out[k] = fc[k];
  }
  const hash = createHash('sha256')
    .update(JSON.stringify(canonical(out)))
    .digest('hex')
    .slice(0, 16);
  return { out, hash, missing };
}

function emitCoefficients({ out, hash }) {
  const keys = Object.keys(out).sort();
  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source: public/input/fitted-coefficients.json, emitted VERBATIM.
 *
 * Separate from DEFAULT_CONSTANTS because the lifecycle differs (§2j): these are
 * fitting-pipeline output, regenerated wholesale when a step runs, never
 * hand-edited. COEFFICIENTS_HASH identifies the fit; CONSTANTS_HASH identifies
 * the parameters we chose. A result is reproducible from the pair, and the two
 * moving independently is the signal a dependency-aware pipeline needs.
 *
 * Full double precision, deliberately. The predecessor (export-to-script.js)
 * rounded these to 6 decimals on their way into src/script.js, costing up to
 * 0.0359" worst-case and zeroing two coefficients outright, against a fit that
 * targets 0.00641". Renames and reshapes belong at the point of use, not here.
 */

/** @type {string} */
export const COEFFICIENTS_HASH = ${JSON.stringify(hash)};

/** @type {Readonly<Record<string, unknown>>} */
export const FITTED_COEFFICIENTS = Object.freeze({
${keys.map((k) => `  ${k}: ${JSON.stringify(out[k])},`).join('\n')}
});
`;
}

// ── run ──────────────────────────────────────────────────────────────────────
const result = build();
const coeffs = buildCoefficients();
if (coeffs.missing.length) {
  console.error('fitted-coefficients.json is missing expected keys:');
  for (const k of coeffs.missing) console.error(`  ${k}`);
  process.exit(1);
}

if (result.problems.length) {
  console.error('CLASSIFICATION out of step with the JSON:');
  for (const p of result.problems) console.error(`  ${p}`);
  process.exit(1);
}

const js = emitJs(result);
const dts = emitDts(result);
const write = process.argv.includes('--write');

const coeffJs = emitCoefficients(coeffs);

if (write) {
  mkdirSync(dirname(OUT_JS), { recursive: true });
  writeFileSync(OUT_JS, js);
  writeFileSync(OUT_DTS, dts);
  writeFileSync(OUT_COEFFS, coeffJs);
  console.log(`generated ${countLeaves(result.included)} values in ${Object.keys(result.included).length} blocks`);
  console.log(`  constants hash    ${result.hash}`);
  console.log(`  coefficients hash ${coeffs.hash}  (${Object.keys(coeffs.out).length} arrays, full precision)`);
  console.log(`  excluded: ${Object.entries(result.excluded).map(([b, c]) => `${b} (${c})`).join(', ')}`);
  console.log('  -> packages/physics/src/constants/{generated.js,generated.d.ts,coefficients.js}');
  process.exit(0);
}

let current = null;
let currentDts = null;
let currentCoeffs = null;
try {
  current = readFileSync(OUT_JS, 'utf8');
  currentDts = readFileSync(OUT_DTS, 'utf8');
  currentCoeffs = readFileSync(OUT_COEFFS, 'utf8');
} catch { /* handled below */ }

console.log('GENERATED CONSTANTS — check');
console.log('='.repeat(74));
console.log(`  ${countLeaves(result.included)} values · ${Object.keys(result.included).length} blocks · hash ${result.hash}`);
console.log(`  excluded (never injectable): ${Object.keys(result.excluded).join(', ')}`);
console.log(`  coefficients: ${Object.keys(coeffs.out).length} arrays · hash ${coeffs.hash}`);

if (current === null || currentCoeffs === null) {
  console.log('\nFAIL — a generated module is missing. Run with --write.');
  process.exit(1);
}
if (current !== js || currentDts !== dts || currentCoeffs !== coeffJs) {
  console.log('\nFAIL — a generated module is STALE relative to the JSON source of truth.');
  console.log('Run: node tools/constants/generate.mjs --write');
  process.exit(1);
}
console.log('\nPASS — generated modules match the JSON.');
