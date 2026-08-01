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
    cardinalPointAnchors: 'anchor',
    moonReference: 'anchor',
    moonMeeus: 'anchor',
    planetOrbitalElements: 'anchor',
    additionalBodiesReference: 'anchor',
    yearLengthRef: 'anchor',

    // ── never injectable ────────────────────────────────────────────────────
    // Self-described: "Validation reference values for comparison".
    knownValues: 'target',
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
  const excluded = {};
  const problems = [];

  for (const [file, classes] of Object.entries(CLASSIFICATION)) {
    const json = read(file);
    const blocks = Object.keys(json).filter((k) => !k.startsWith('_'));

    for (const b of blocks) {
      const cls = classes[b];
      if (!cls) { problems.push(`${file}: block "${b}" is UNCLASSIFIED — add it to CLASSIFICATION`); continue; }
      if (cls === 'parameter' || cls === 'anchor') included[b] = strip(json[b]);
      else excluded[b] = cls;
    }
    for (const b of Object.keys(classes)) {
      if (!blocks.includes(b)) problems.push(`${file}: classified block "${b}" no longer exists — remove it`);
    }
  }

  const hash = createHash('sha256')
    .update(JSON.stringify(canonical(included)))
    .digest('hex')
    .slice(0, 16);

  return { included, excluded, problems, hash };
}

const countLeaves = (o) =>
  Object.values(o).reduce((n, v) => n + (v && typeof v === 'object' ? countLeaves(v) : 1), 0);

function emitJs({ included, excluded, hash }) {
  const blocks = Object.keys(included).sort();
  const exNote = Object.entries(excluded)
    .map(([b, c]) => ` *   ${b.padEnd(32)} ${c}`)
    .join('\n');

  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source of truth: public/input/{model-parameters,astro-reference}.json
 * Classification and rationale: tools/constants/generate.mjs
 *
 * Deliberately EXCLUDED (§2d) — validation targets must never be injectable, or
 * a counterfactual could move the goalposts it is judged by:
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
`;
}

function emitDts({ included, hash }) {
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
`;
}

// ── run ──────────────────────────────────────────────────────────────────────
const result = build();

if (result.problems.length) {
  console.error('CLASSIFICATION out of step with the JSON:');
  for (const p of result.problems) console.error(`  ${p}`);
  process.exit(1);
}

const js = emitJs(result);
const dts = emitDts(result);
const write = process.argv.includes('--write');

if (write) {
  mkdirSync(dirname(OUT_JS), { recursive: true });
  writeFileSync(OUT_JS, js);
  writeFileSync(OUT_DTS, dts);
  console.log(`generated ${countLeaves(result.included)} values in ${Object.keys(result.included).length} blocks`);
  console.log(`  hash ${result.hash}`);
  console.log(`  excluded: ${Object.entries(result.excluded).map(([b, c]) => `${b} (${c})`).join(', ')}`);
  console.log('  -> packages/physics/src/constants/generated.{js,d.ts}');
  process.exit(0);
}

let current = null;
let currentDts = null;
try {
  current = readFileSync(OUT_JS, 'utf8');
  currentDts = readFileSync(OUT_DTS, 'utf8');
} catch { /* handled below */ }

console.log('GENERATED CONSTANTS — check');
console.log('='.repeat(74));
console.log(`  ${countLeaves(result.included)} values · ${Object.keys(result.included).length} blocks · hash ${result.hash}`);
console.log(`  excluded (never injectable): ${Object.keys(result.excluded).join(', ')}`);

if (current === null) {
  console.log('\nFAIL — generated module missing. Run with --write.');
  process.exit(1);
}
if (current !== js || currentDts !== dts) {
  console.log('\nFAIL — generated module is STALE relative to the JSON source of truth.');
  console.log('Run: node tools/constants/generate.mjs --write');
  process.exit(1);
}
console.log('\nPASS — generated module matches the JSON.');
