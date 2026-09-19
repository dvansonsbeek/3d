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
const OUT_COEFFS_DTS = join(ROOT, 'packages/physics/src/constants/coefficients.d.ts');

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

  // Moon RA/Dec patches. MOON_CORRECTION_RESIDUAL carries a `_comment` the
  // embedded copy does not — stripped like every other documentation key.
  'MOON_CORRECTION',
  'MOON_CORRECTION_RESIDUAL',

  // script.js's CARDINAL_POINT_ANCHORS is the ADJUSTED set, not the base one.
  // Both are emitted under their JSON names; the consumer picks.
  'CARDINAL_POINT_ANCHORS',
  'CARDINAL_POINT_ANCHORS_ADJUSTED',

  // Also 6-decimal rounded on the way into script.js, and the largest such error
  // found: RSS 0.0149, worst case 0.1360 in coefficient units across 96 terms.
  // Missed by the first audit because it is an object-of-arrays rather than a
  // plain array.
  'CARDINAL_POINT_HARMONICS',
  // §10 (Phase D) — the equation-of-centre braiding terms ({order, sin, cos},
  // deliberately NOT the [div, sin, cos] shape) and the fit-calibrated
  // lincoef + H(c) model the runtime must reuse VERBATIM, never recompute.
  'CARDINAL_POINT_ECC_TERMS',
  'CARDINAL_POINT_JOINT_TERMS',
  'CARDINAL_POINT_DERIVED',

  // 16,919 values. fmtSci kept 12 significant digits, so 16,909 of them differ
  // from the JSON — but only at ~5e-13 relative, far below anything physical.
  // Emitted verbatim anyway: there is no reason to ship a lossy copy.
  'PREDICT_COEFFS_PHYSICAL',

  // The mean/offset SCALARS that pair with the harmonic arrays above — each
  // series is `mean + sum(harmonics)`, so shipping one from the JSON and the
  // other as a literal would split a single fitted quantity across two sources.
  //   PERI_OFFSET                    <-> PERI_HARMONICS
  //   SOLSTICE_OBLIQUITY_MEAN_FITTED <-> SOLSTICE_OBLIQUITY_HARMONICS
  //   SUN_LONGITUDE_MEAN             <-> SUN_LONGITUDE_HARMONICS
  // They went through replaceConst, which never formatted, so all three were
  // already full precision — an incomplete migration rather than a defect.
  'PERI_OFFSET',
  'SOLSTICE_OBLIQUITY_MEAN_FITTED',
  'SUN_LONGITUDE_MEAN',
];

/**
 * Coefficient blocks that come from OTHER files under public/input/. Same
 * treatment — verbatim, no formatter — they simply do not live in
 * fitted-coefficients.json.
 */
const EXTRA_COEFFICIENT_SOURCES = [
  { file: 'meeus-lunar-tables.json', as: 'MEEUS_LONGITUDE_TERMS', pick: (j) => j.longitudeTerms.terms },
  { file: 'meeus-lunar-tables.json', as: 'MEEUS_LATITUDE_TERMS', pick: (j) => j.latitudeTerms.terms },
  { file: 'meeus-lunar-tables.json', as: 'MEEUS_DISTANCE_TERMS', pick: (j) => ({ meanKm: j.distanceTerms.meanKm, terms: j.distanceTerms.terms }) },
  { file: 'climate-formula-coefficients.json', as: 'CLIMATE_FORMULA_COEFFS', pick: (j) => j },

  // From data/, not public/input/.
  //
  // THE SUBSET MATTERS (§2j). balance-presets.json is 262 KB and serves two
  // consumers: the website document needs the whole 767 -> 96 -> 51 reduction
  // narrative, while script.js's modal needs only the 15 curated preset rows —
  // ~2 KB. Emitting `presets` alone keeps the browser from carrying 260 KB it
  // never reads, and leaves one source of truth rather than a third copy.
  //
  // Its producer, balance-search.js (Step 7b), is a GENERATOR: it rewrites this
  // tracked file, and a plain inventory run of tools/verify/ once regenerated it
  // with real numeric drift. tools/verify/run-suite.mjs excludes it by name.
  { dir: 'data', file: 'balance-presets.json', as: 'BALANCE_PRESETS', pick: (j) => j.presets },

  // The ΔT correction stack. FOUR channels — Bond, Hallstatt, Jose5, Jose4 —
  // and Jose5/Jose4 are a COUPLED PAIR, so a 3-channel source cannot describe
  // the shipped stack. The superseded deltaT-3flag-fit.json was deleted for
  // exactly that reason: it carried bond.cos_coeff_s = 165.927 against the
  // 145.595 actually shipped.
  { dir: 'data', file: 'deltaT-4flag-fit.json', as: 'DT_STACK', pick: (j) => j.shipped_coefficients },

  // The fourth ΔT driver, fitted separately (core-mantle swing, 2-kick damped
  // oscillation). Its own file, its own fitter — hence its own entry.
  {
    dir: 'data',
    file: 'core-mantle-resonator-stage1.json',
    as: 'DT_RESONATOR',
    pick: (j) => j.proposed_shipped_coefficients.resonator,
  },
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
    // Calendar/epoch definitions (J2000 JD, Julian century, Gregorian start).
    // Anchor, not presentation: j2000JD and julianCenturyDays parameterize the
    // Meeus T argument throughout the browser formulas.
    timeReference: 'anchor',

    // ── never injectable ────────────────────────────────────────────────────
    // Self-described: "Validation reference values for comparison".
    knownValues: 'target',
    // Re-anchors a published external curve (Espenak/Meeus ΔT) onto the model's
    // axis so the two can be plotted together. A comparison aid, never an input.
    externalCurveAnchors: 'target',
    // Consumed only by tools/verify/{inclination-optimization,inclination-verification}.
    laplaceLagrangeBounds: 'target',
    // Chapront et al. (2002) obliquity citation values — Model-vs-literature
    // comparison tables only (registry obliqChapront* keys), never an input.
    obliquityChapront2002: 'target',
    // Observed planetary spin-precession constants + obliquities (C-4 spin/
    // Cassini landscape citations, doc 109 §19) — comparison targets only.
    planetSpinObserved: 'target',
    // Cox & Chao dJ2/dt + Peltier factor — citation inputs of the shipped
    // alphaClimateScale calibration; consumed only by the registry.
    giaCoxChaoPeltier: 'target',
    // GRAIL/LLR lunar gravity citations (Williams 2014) — Cassini lab inputs
    // and registry keys; never model inputs.
    moonGrailWilliams2014: 'target',
    // Consumed only by tools/verify/ascending-node-*.
    ascendingNodesSouamiSouchay: 'target',
    // Feeds only trendError / directionMatch in script.js — compared against the
    // model's own computed trend, never an input to it.
    jplEclipticInclinationTrends: 'target',
    // Farside Table 10.1 reference phases. Consumed by the EIGENMODE_PHASES
    // dropdown in script.js (display options, never a model input) since 8.1.
    eigenmodePhasesLaplaceLagrange: 'target',
    // JPL SPICE 1900-2100 perihelion precession trends — comparison table only;
    // zero computational consumers (script.js keeps it on ASTRO_REFERENCE for
    // reference display).
    perihelionPrecessionRatesJPL: 'target',
    // Astropixels/Meeus June solstice JDs — feeds only the solstice validation
    // report, compared against the model's own solstice detection.
    juneSolsticeReference: 'target',

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
  const version = read('model-version.json');
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

/** Model version label — single source: public/input/model-version.json (§10 two-axis scheme). */
export const MODEL_VERSION = ${JSON.stringify(version.modelVersion)};

/** Canonical preprint DOI — single source: public/input/model-version.json. */
export const PREPRINT_DOI = ${JSON.stringify(version.preprintDoi)};

/** @type {Readonly<Record<string, unknown>>} */
export const DEFAULT_CONSTANTS = Object.freeze({
  hash: ${JSON.stringify(hash)},
${blocks.map((b) => `  ${b}: ${JSON.stringify(included[b], null, 2).split('\n').join('\n  ')},`).join('\n')}
});
${refSection}`;
}

/**
 * The TypeScript type of a JSON value, rendered structurally (object shapes
 * recurse; homogeneous arrays by element type; a nested/object array takes
 * its first element's shape — the JSON here is homogeneous by construction).
 * Shared by the constants and the coefficients declarations so both
 * boundaries carry the same precision.
 * @param {unknown} v @param {string} [ind] @returns {string}
 */
function tsTypeOf(v, ind = '  ') {
  if (Array.isArray(v)) {
    if (!v.length) return 'unknown[]';
    const prims = v.every((x) => x === null || typeof x !== 'object');
    if (prims) {
      const kinds = [...new Set(v.map((x) => (x === null ? 'null' : typeof x)))].sort();
      // a short numeric array is a TUPLE in this codebase's conventions
      // ([div, sin, cos] harmonics rows, [lo, hi] pairs) — the factories'
      // JSDoc types them so; a tuple is assignable to number[] regardless
      if (kinds.length === 1 && kinds[0] === 'number' && v.length >= 2 && v.length <= 4) {
        return `[${v.map(() => 'number').join(', ')}]`;
      }
      return kinds.length === 1 ? `${kinds[0]}[]` : `Array<${kinds.join(' | ')}>`;
    }
    return `Array<${tsTypeOf(v[0], ind)}>`;
  }
  if (v === null) return 'null';
  if (typeof v === 'object') {
    const inner = Object.entries(v)
      .map(([k, x]) => `${ind}  ${JSON.stringify(k)}: ${tsTypeOf(x, `${ind}  `)};`)
      .join('\n');
    return `{\n${inner}\n${ind}}`;
  }
  return typeof v;
}

function emitDts({ included, reference, hash }) {
  const t = tsTypeOf;
  const body = Object.keys(included).sort()
    .map((b) => `  readonly ${b}: ${t(included[b])};`)
    .join('\n');

  return `// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// Gives the TypeScript website full type safety at the boundary (§2g) while
// packages/physics stays JavaScript.

export declare const CONSTANTS_HASH: ${JSON.stringify(hash)};

export declare const MODEL_VERSION: string;

export declare const PREPRINT_DOI: string;

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
    // `strip` drops `_`-prefixed documentation keys, which the embedded copies
    // never carried (MOON_CORRECTION_RESIDUAL has a `_comment`).
    out[k] = strip(fc[k]);
  }
  for (const { dir, file, as, pick } of EXTRA_COEFFICIENT_SOURCES) {
    const json = dir
      ? JSON.parse(readFileSync(join(ROOT, dir, file), 'utf8'))
      : read(file);
    out[as] = strip(pick(json));
  }
  const hash = createHash('sha256')
    .update(JSON.stringify(canonical(out)))
    .digest('hex')
    .slice(0, 16);
  return { out, hash, missing };
}

// ── the engine-D chain artifact (P5/K4.6c) ──────────────────────────────────
// Source of truth: data/nbody-secular-frequencies.json — GENERATOR-OWNED by
// tools/verify/nbody-secular.js and guarded artifact↔engine by check:artifacts.
// THIS embed guards the second leg, embed↔artifact: the browser scene renders
// the Keplerian flag path from this module (script.js cannot fs-read, and a
// runtime fetch would break offline === hosted). Emitted VERBATIM (the
// coefficients rounding lesson); lifecycle = pipeline output, like §2j.
const CHAIN_ARTIFACT_PATH = join(ROOT, 'data/nbody-secular-frequencies.json');
const OUT_CHAIN = join(ROOT, 'packages/physics/src/planets/chain-artifact.js');

function buildChainArtifact() {
  const raw = readFileSync(CHAIN_ARTIFACT_PATH, 'utf8');
  const art = JSON.parse(raw);
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return { art, hash };
}

function emitChainArtifact({ art, hash }) {
  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source: data/nbody-secular-frequencies.json (the governed engine-D
 * artifact), emitted VERBATIM. Two gates guard the two legs of the causal
 * chain: check:artifacts pins artifact ↔ engine (input hashes name the
 * regeneration command), this module's staleness check pins embed ↔ artifact.
 * A changed planet mass therefore propagates engine → artifact → here → the
 * browser scene, or a gate goes red.
 */

/** @type {string} */
export const CHAIN_ARTIFACT_HASH = ${JSON.stringify(hash)};

/** @type {Readonly<Record<string, unknown>>} */
export const CHAIN_ARTIFACT = Object.freeze(${JSON.stringify(art)});
`;
}

// ── the deep-time Earth-z mode table (engine-switch Stage B, T5d-(d)) ──────
// Source: data/nbody-deep-secular-modes.json — GENERATOR-OWNED by
// tools/verify/deep-secular-modes.js and guarded artifact↔engine by
// check:artifacts. THIS embed guards embed↔artifact exactly like the chain
// artifact above. The J2000 anchor pair (e, ϖ) is JOINED at emission time
// from the chain artifact's j2000AnchorElements — the anchor's ONE home —
// so the anchored evaluator form needs no retyped value. Emitted as CJS:
// the lunar-chain consumers (moon/*.cjs) are CommonJS modules.
const DEEP_MODES_PATH = join(ROOT, 'data/nbody-deep-secular-modes.json');
const OUT_DEEP_MODES = join(ROOT, 'packages/physics/src/moon/deep-modes-artifact.cjs');

// D6: the Earth λ̇ channel (sidereal year of date) — the ONLY slice of the
// 8 MB secular-series artifact the package embeds (~200 KB at its own
// 2-kyr cadence). Same two-gate guard as the deep-modes embed:
// check:artifacts pins artifact ↔ engine, generate.mjs check pins
// embed ↔ artifact.
const SECULAR_SERIES_PATH = join(ROOT, 'data/nbody-secular-series.json');
const OUT_SIDEREAL = join(ROOT, 'packages/physics/src/earth/sidereal-channel-artifact.cjs');

function buildSiderealChannel() {
  const art = JSON.parse(readFileSync(SECULAR_SERIES_PATH, 'utf8'));
  const eb = art.bodies.earth;
  if (!Array.isArray(eb.lamDotRel) || !eb.lamDotStepYr) {
    throw new Error('secular-series artifact carries no λ̇ channel — regenerate it first (node tools/verify/secular-series.js --write)');
  }
  const payload = {
    t0Yr: art.t0Yr,
    stepYr: eb.lamDotStepYr,
    windowYr: eb.lamDotWindowYr,
    lamDotRel: eb.lamDotRel,
    meta: {
      dumpSha256: art.meta.dumpSha256,
      source: 'data/nbody-secular-series.json bodies.earth.lamDotRel (verbatim)',
      chaprontGate: art.verdict.siderealYear ? art.verdict.siderealYear.maxAbsDiffS : null,
    },
  };
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
  return { hash, payload };
}

function emitSiderealChannel({ hash, payload }) {
  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source: data/nbody-secular-series.json bodies.earth.lamDotRel — the
 * D6 mean-longitude-rate ratio to J2000 (planetary epoch drift, from the
 * model's own constant-GM ±10 Myr run; 2-kyr boxcar, own 2-kyr cadence,
 * ratio ≡ 1 at the J2000 node). The sidereal-year-of-date data source
 * for createSiderealYearChannel: T_sid(y) = massLossLaw(y)/lamDotRel(y).
 * Cross-validated against the Chapront polynomial by the generator's
 * banked refuse-gate (verdict.siderealYear). Two gates guard the chain:
 * check:artifacts pins artifact ↔ engine; generate.mjs check mode pins
 * this embed ↔ artifact. CJS for the .cjs channel consumer.
 */
'use strict';

const SIDEREAL_CHANNEL_ARTIFACT_HASH = ${JSON.stringify(hash)};

const SIDEREAL_CHANNEL_ARTIFACT = Object.freeze(${JSON.stringify(payload)});

module.exports = { SIDEREAL_CHANNEL_ARTIFACT, SIDEREAL_CHANNEL_ARTIFACT_HASH };
`;
}

function buildDeepModes(chainArt) {
  const raw = readFileSync(DEEP_MODES_PATH, 'utf8');
  const art = JSON.parse(raw);
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  const anchor = chainArt.art.j2000AnchorElements.earth;
  return {
    hash,
    payload: {
      meta: art.meta,
      verdict: art.verdict,
      earthZ: art.modes.earth.z,
      // C-3: the deep ζ table + the plane anchors join the embed so the
      // browser's published-ε surfaces (VFP chart, panel row) can build the
      // obliquity hybrid from the same one-home factory.
      earthZeta: art.modes.earth.zeta,
      // the era ζ tier (its OWN 8-term extraction): the of-date panel
      // readout's tier — measured 0.3″ rms vs IAU-2006 over 1900–2100
      earthZetaEra: art.earthZetaEra,
      // C-4 "labels' spin lines return" (plan 02 design; doc 109 §19):
      // the leading proper ζ mode per planet in ″/yr — the engine's own
      // s-lines the zoom labels quote beside the cited observed spin
      // rates. SAME recipe as the deepNode*ArcsecPerYr registry keys:
      // strongest non-constant mode by amplitude.
      planetLeadingZetaArcsecPerYr: Object.fromEntries(
        Object.keys(art.modes).map((p) => {
          const m = art.modes[p].zeta
            .filter((x) => Math.abs(x.omegaRadPerYr) > 1e-9)
            .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
          return [p, (m.omegaRadPerYr * 180 / Math.PI) * 3600];
        })),
      // D5 (the deep-time planet elements): the seven planets' FULL z and ζ
      // mode tables, verbatim — the beyond-±10-Myr TAIL for the series-
      // driven element override (the same role earthZ/earthZeta play for
      // the obliquity hybrid). Few KB; sane where the era chain's
      // extrapolation blows up (the owner-found ring failure).
      planetZ: Object.fromEntries(
        Object.keys(art.modes).filter((p) => p !== 'earth')
          .map((p) => [p, art.modes[p].z])),
      planetZeta: Object.fromEntries(
        Object.keys(art.modes).filter((p) => p !== 'earth')
          .map((p) => [p, art.modes[p].zeta])),
      anchorE: anchor.e,
      anchorPeriEclipticDeg: anchor.lonPeriEclipticDeg,
      anchorInclEclipticDeg: anchor.inclEclipticDeg,
      anchorAscNodeEclipticDeg: anchor.ascNodeEclipticDeg,
    },
  };
}

function emitDeepModes({ hash, payload }) {
  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source: data/nbody-deep-secular-modes.json (the governed deep-time
 * Earth-z mode table, engine-switch Stage B), earth z-modes + verdict
 * emitted VERBATIM, plus the J2000 anchor pair (e, ϖ) joined from
 * data/nbody-secular-frequencies.json j2000AnchorElements.earth — the
 * anchor's ONE home, plus the per-planet leading proper ζ modes (″/yr,
 * the C-4 s-lines for the zoom labels — doc 109 §19). Two gates guard
 * the chain: check:artifacts pins artifact ↔ engine; generate.mjs
 * check mode pins this embed ↔ artifact.
 * CJS because the lunar-chain consumers are CommonJS modules.
 */
'use strict';

const DEEP_MODES_ARTIFACT_HASH = ${JSON.stringify(hash)};

const DEEP_MODES_ARTIFACT = Object.freeze(${JSON.stringify(payload)});

module.exports = { DEEP_MODES_ARTIFACT, DEEP_MODES_ARTIFACT_HASH };
`;
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

/**
 * The coefficients' declaration file — the same structural precision the
 * constants get in generated.d.ts (a `Record<string, unknown>` at this
 * boundary forced every TypeScript consumer to re-declare the shapes by
 * hand; the website carried such a shim through four minor versions).
 * Sits beside coefficients.js, so TypeScript reads it for every importer.
 */
function emitCoefficientsDts({ out, hash }) {
  const keys = Object.keys(out).sort();
  return `// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// The fitted coefficients' shapes for TypeScript consumers (§2g); values live
// in coefficients.js, emitted VERBATIM from fitted-coefficients.json.

export declare const COEFFICIENTS_HASH: ${JSON.stringify(hash)};

export declare const FITTED_COEFFICIENTS: {
${keys.map((k) => `  readonly ${k}: ${tsTypeOf(out[k])};`).join('\n')}
};
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
const coeffDts = emitCoefficientsDts(coeffs);
const chainArt = buildChainArtifact();
const chainJs = emitChainArtifact(chainArt);
const deepModes = buildDeepModes(chainArt);
const deepJs = emitDeepModes(deepModes);
const siderealChan = buildSiderealChannel();
const siderealJs = emitSiderealChannel(siderealChan);

if (write) {
  mkdirSync(dirname(OUT_JS), { recursive: true });
  writeFileSync(OUT_JS, js);
  writeFileSync(OUT_DTS, dts);
  writeFileSync(OUT_COEFFS, coeffJs);
  writeFileSync(OUT_COEFFS_DTS, coeffDts);
  writeFileSync(OUT_CHAIN, chainJs);
  writeFileSync(OUT_DEEP_MODES, deepJs);
  writeFileSync(OUT_SIDEREAL, siderealJs);
  console.log(`generated ${countLeaves(result.included)} values in ${Object.keys(result.included).length} blocks`);
  console.log(`  constants hash    ${result.hash}`);
  console.log(`  coefficients hash ${coeffs.hash}  (${Object.keys(coeffs.out).length} arrays, full precision)`);
  console.log(`  chain artifact    ${chainArt.hash}  (engine-D governed artifact, verbatim)`);
  console.log(`  deep-modes embed  ${deepModes.hash}  (deep-time Earth-z table, verbatim + joined anchor)`);
  console.log(`  sidereal embed    ${siderealChan.hash}  (D6 λ̇ channel, ${siderealChan.payload.lamDotRel.length} samples @ ${siderealChan.payload.stepYr} yr)`);
  console.log(`  excluded: ${Object.entries(result.excluded).map(([b, c]) => `${b} (${c})`).join(', ')}`);
  console.log('  -> packages/physics/src/constants/{generated.js,generated.d.ts,coefficients.js,coefficients.d.ts} + planets/chain-artifact.js + moon/deep-modes-artifact.cjs + earth/sidereal-channel-artifact.cjs');
  process.exit(0);
}

let current = null;
let currentDts = null;
let currentCoeffs = null;
let currentCoeffsDts = null;
let currentChain = null;
let currentDeep = null;
let currentSidereal = null;
try {
  current = readFileSync(OUT_JS, 'utf8');
  currentDts = readFileSync(OUT_DTS, 'utf8');
  currentCoeffs = readFileSync(OUT_COEFFS, 'utf8');
  currentCoeffsDts = readFileSync(OUT_COEFFS_DTS, 'utf8');
  currentChain = readFileSync(OUT_CHAIN, 'utf8');
  currentDeep = readFileSync(OUT_DEEP_MODES, 'utf8');
  currentSidereal = readFileSync(OUT_SIDEREAL, 'utf8');
} catch { /* handled below */ }

console.log('GENERATED CONSTANTS — check');
console.log('='.repeat(74));
console.log(`  ${countLeaves(result.included)} values · ${Object.keys(result.included).length} blocks · hash ${result.hash}`);
console.log(`  excluded (never injectable): ${Object.keys(result.excluded).join(', ')}`);
console.log(`  coefficients: ${Object.keys(coeffs.out).length} arrays · hash ${coeffs.hash}`);

if (current === null || currentCoeffs === null || currentCoeffsDts === null || currentChain === null || currentDeep === null || currentSidereal === null) {
  console.log('\nFAIL — a generated module is missing. Run with --write.');
  process.exit(1);
}
if (current !== js || currentDts !== dts || currentCoeffs !== coeffJs || currentCoeffsDts !== coeffDts || currentChain !== chainJs || currentDeep !== deepJs || currentSidereal !== siderealJs) {
  console.log('\nFAIL — a generated module is STALE relative to the JSON source of truth.');
  console.log('Run: node tools/constants/generate.mjs --write');
  process.exit(1);
}
console.log('\nPASS — generated modules match the JSON.');
