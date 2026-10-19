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
import { createRequire } from 'node:module';

const { SECULAR_COMPLETION_TAPER_YEARS } = createRequire(import.meta.url)('../../packages/physics/src/moon/arguments.cjs');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IN = join(ROOT, 'public/input');
const OUT_JS = join(ROOT, 'packages/physics/src/constants/generated.js');
const OUT_DTS = join(ROOT, 'packages/physics/src/constants/generated.d.ts');
const OUT_COEFFS = join(ROOT, 'packages/physics/src/constants/coefficients.js');
const OUT_COEFFS_DTS = join(ROOT, 'packages/physics/src/constants/coefficients.d.ts');

/**
 * Fitted coefficients emitted VERBATIM from the shipped fit artifacts under
 * data/ (§2j; EXTRA_COEFFICIENT_SOURCES below — public/input/fitted-
 * coefficients.json, the comb families' former home, was deleted at plan 11
 * step 1 after plan 09 had emptied it).
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
 * Any rename or reshape script.js wants (divisor n -> period H/n) happens
 * THERE, visibly, not in a formatter here.
 */
// (plan 09 deleted every comb family fitted-coefficients.json carried — the
//  year-length, perihelion, obliquity, Sun-longitude and RA-day-offset combs
//  on divisors of the retired unit, the Moon RA/Dec patches (plan 06 R3), the
//  planet predict device (plan 06 R8) and last, at step 7a, the frozen
//  cardinal record with its package evaluator; git history carries them, doc
//  110 §5.2/§5.5 the frozen render. Plan 11 step 1 deleted the emptied file.)

/**
 * The coefficient blocks, each from its OWN fit artifact. Same treatment —
 * verbatim, no formatter.
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

  // Plan 06 layer B — the eclipse Sun's DERIVED mean-element offset over the
  // secular series (the 1890–2110 mean of osculating − secular e and ϖ of the
  // EMB from the Horizons-seeded nine-body run; tools/verify/earth-osculating-
  // offset.js). Consumed by model.js for the Sun laws only (finders, besselian,
  // the cardinal braid); the published Earth surface stays the secular series.
  { dir: 'data', file: 'earth-osculating-mean-offset.json', as: 'EARTH_OSCULATING_MEAN_OFFSET', pick: (j) => ({ dPomArcsec: j.dPomArcsec, dE: j.dE }) },

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
 * Every top-level block of the input JSON, classified. A block missing from this
 * map is an ERROR, not a default — silently including or excluding a new block
 * is exactly the failure this map exists to prevent.
 *
 * (plan 11 step 6: `model-parameters.json` — the model theory parameters — is
 * DELETED. Its blocks left one by one: `deepTime` is ASSEMBLED below from its
 * three homes (step 1); `additionalBodies` (step 2) and `perihelionPassageRef`
 * (step 3) went with the scaffold readers they fed; `earth` — the K-device
 * scaffold's recorded J2000 pose — went at step 4 (the world frame is the
 * J2000 ecliptic, earth/frame-of-date); `foundational`'s scene epoch moved to
 * astro-reference `timeReference` at step 5; `moon` emptied across steps 2–3;
 * and `planets`' last leaf, the display names, is code —
 * planets/display-names.cjs — because a name is presentation, not a model
 * parameter. The literals gate fails if the file returns.)
 */
const CLASSIFICATION = {
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
    // The planets' spin-channel INPUTS (plan 06 Phase 7): J₂, C/MR², the IAU
    // pole and rotation rate, the regular satellites. Measured reality the
    // precession constant is DERIVED from (planets/spin-channel.cjs), so a
    // counterfactual over them is legitimate ("what if Saturn's moment of
    // inertia were the Ward–Hamilton band") — anchor, like planetOrbitalElements.
    planetSpinPhysical: 'anchor',
    // Cox & Chao dJ2/dt + Peltier factor — ANCHOR since plan 11 step 1: the
    // GIA channel's two J2000 rates (deepTime.j2RateJ2000PerYr and
    // .alphaGiaRateJ2000PerYr) are DERIVED from them (assembleDeepTime), so
    // "what if dJ2/dt were otherwise" is a legitimate counterfactual. They
    // were a registry-only citation block while model-parameters deepTime
    // carried copies of the derived values.
    giaCoxChaoPeltier: 'anchor',
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
const readData = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));

/**
 * The deep-time block of DEFAULT_CONSTANTS — ASSEMBLED, not read (plan 11
 * step 1). Until then model-parameters.json carried it as a block of nine
 * leaves, three of which duplicated or derived from values with another
 * home. The leaves now come from where each belongs, and this is the ONE
 * assembly every runtime reads (the browser and the package through the
 * generated module, the Node twin tools/lib/constants.js through the same
 * module; `test:constants` pins the embed to these sources):
 *
 *   alpha1PerMa              astro-reference moonReference.moonRecessionAlpha1PerMa
 *                            (the LLR-anchored INPUT — an observation, anchor class)
 *   j2RateJ2000PerYr         ≡ astro-reference giaCoxChaoPeltier.dJ2DtPerYr
 *                            (the OBSERVED dJ2/dt; the J2(t)/J2_0 scale of the
 *                            precession of date)
 *   alphaGiaRateJ2000PerYr   = dJ2DtPerYr / j2ToAlphaFactor (exact in binary —
 *                            the factor is 2; the channel's coupling k is derived
 *                            from this rate at runtime)
 *   alphaGiaRelaxationKyr    data/deep-time-fitted.json — the one banked
 *                            GIA relaxation constant (plan 12 option A deleted
 *                            the quartic α₃/α₄ and the regime block: the Moon
 *                            distance history is the cited AstroGeo22 input,
 *                            moon-distance-artifact.cjs)
 *   dtStackTaper*HalfwidthYr data/deltaT-4flag-fit.json shipped_taper — the
 *                            ΔT stack's application window rides the stack's
 *                            own artifact (its fitter writes it)
 *
 * Key order is the former block's, so the emitted shape is unchanged.
 * @param {Record<string, any>} astro @returns {Record<string, unknown>}
 */
function assembleDeepTime(astro) {
  const fitted = readData('deep-time-fitted.json');
  const dtFit = readData('deltaT-4flag-fit.json');
  const gia = astro.giaCoxChaoPeltier;
  const need = (ok, what) => { if (!ok) throw new Error(`assembleDeepTime: ${what}`); };
  need(typeof astro.moonReference?.moonRecessionAlpha1PerMa === 'number', 'astro-reference moonReference.moonRecessionAlpha1PerMa is missing');
  need(typeof gia?.dJ2DtPerYr === 'number' && typeof gia?.j2ToAlphaFactor === 'number', 'astro-reference giaCoxChaoPeltier is incomplete');
  need(typeof fitted.alphaGiaRelaxationKyr === 'number', 'data/deep-time-fitted.json alphaGiaRelaxationKyr is missing');
  need(dtFit.shipped_taper && typeof dtFit.shipped_taper.full_halfwidth_yr === 'number' && typeof dtFit.shipped_taper.total_halfwidth_yr === 'number',
    'data/deltaT-4flag-fit.json carries no shipped_taper — re-run the Step-7c fitter (DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --joint --write)');
  return {
    alpha1PerMa: astro.moonReference.moonRecessionAlpha1PerMa,
    alphaGiaRateJ2000PerYr: gia.dJ2DtPerYr / gia.j2ToAlphaFactor,
    alphaGiaRelaxationKyr: fitted.alphaGiaRelaxationKyr,
    j2RateJ2000PerYr: gia.dJ2DtPerYr,
    dtStackTaperFullHalfwidthYr: dtFit.shipped_taper.full_halfwidth_yr,
    dtStackTaperTotalHalfwidthYr: dtFit.shipped_taper.total_halfwidth_yr,
  };
}

// ── The Earth–Moon distance history — a CITED PHYSICAL INPUT (plan 12, option A) ──
// Source: data/astrogeo22-earth-moon.json — Farhat, Auclair-Desrotour, Boué &
// Laskar 2022 (A&A 665, L1), the AstroGeo22 ephemeris, imported VERBATIM by
// tools/pipeline/import-astrogeo22.js (governed: inputs block + PROVENANCE).
// Embedded here so the package, the browser and the Node twin read ONE table
// (deltat/moon-distance-history reads the distance column as the ratio
// a(t)/a(0) on the model's own J2000 anchor). Same two-gate guard as the chain
// artifact: check:artifacts pins artifact ↔ source, this module's staleness
// check pins embed ↔ artifact. Only the distance columns are embedded; the
// solution's LOD/obliquity/precession columns stay in the data file as the
// cross-check they are.
const MOON_DISTANCE_PATH = join(ROOT, 'data/astrogeo22-earth-moon.json');
const OUT_MOON_DISTANCE = join(ROOT, 'packages/physics/src/deltat/moon-distance-artifact.cjs');

function buildMoonDistanceArtifact() {
  const raw = readFileSync(MOON_DISTANCE_PATH, 'utf8');
  const art = JSON.parse(raw);
  const c = art.columns;
  const payload = {
    source: { citation: art.source.citation, doi: art.source.doi, distributor: art.source.distributor, fileSha256: art.source.fileSha256 },
    earthRadiusKm: art.earthRadiusKm,
    ageStepMa: art.ageStepMa,
    spanMa: art.spanMa,
    ageMa: c.ageMa,
    aEarthRadii: c.aEarthRadii,
    aMinEarthRadii: c.aMinEarthRadii,
    aMaxEarthRadii: c.aMaxEarthRadii,
  };
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return { hash, payload };
}

function emitMoonDistanceArtifact({ hash, payload }) {
  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source: data/astrogeo22-earth-moon.json — the AstroGeo22 lunar ephemeris
 * (Farhat, Auclair-Desrotour, Boué & Laskar 2022, A&A 665, L1), the model's
 * CITED Earth–Moon distance history (plan 12 option A): age 0 → ${payload.spanMa} Ma at
 * ${payload.ageStepMa} Myr, the semi-major axis in Earth radii (R⊕ = ${payload.earthRadiusKm} km)
 * with its uncertainty interval, VERBATIM. deltat/moon-distance-history reads
 * it as the ratio a(t)/a(0) on the model's own J2000 anchor. Two gates guard
 * the chain: check:artifacts pins artifact ↔ source file, generate.mjs check
 * mode pins this embed ↔ artifact. CJS for the .cjs deep-time consumers.
 */
'use strict';

const MOON_DISTANCE_ARTIFACT_HASH = ${JSON.stringify(hash)};

const MOON_DISTANCE_ARTIFACT = Object.freeze(${JSON.stringify(payload)});

module.exports = { MOON_DISTANCE_ARTIFACT, MOON_DISTANCE_ARTIFACT_HASH };
`;
}

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
  // the assembled block (plan 11 step 1) — injectable, hashed with the rest
  if ('deepTime' in included) problems.push('astro-reference.json: block "deepTime" returned — it is ASSEMBLED here (assembleDeepTime); its leaves have their own homes');
  else included.deepTime = assembleDeepTime(read('astro-reference.json'));

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
 * Source of truth: public/input/astro-reference.json (model-parameters.json is
 * DELETED, plan 11 step 6 — its leaves have their homes); the deepTime block
 * is ASSEMBLED from astro-reference.json (moonReference.moonRecessionAlpha1PerMa,
 * giaCoxChaoPeltier), data/deep-time-fitted.json and data/deltaT-4flag-fit.json
 * shipped_taper (plan 11 step 1).
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
  const out = {};
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
  return { out, hash };
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
 * model's own constant-GM ±10 Myr run; the least-squares quadratic slope
 * of the unwrapped L over the window named in windowYr, own 2-kyr cadence,
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

// The Sun planetary completion's embedded data (plan 06 I3): the planets'
// J2000 sidereal mean motions — the completion's CARRIERS — and the
// e-vectors of date of Venus, Earth, Mars and Jupiter on a 1-kyr grid over
// ±50 kyr — the D'Alembert long-period rows' amplitude/phase inputs. Both
// from the ONE governed series artifact (verdict.planetLamDot and the
// bodies' zQ/zP, ecliptic J2000), so an artifact-less createModel() and the
// browser before its async series load compute the IDENTICAL Sun (the plan
// 06 R1 trap class). Same two-gate guard as the sidereal embed.
const OUT_SUN_COMPLETION = join(ROOT, 'packages/physics/src/eclipse/sun-completion-artifact.cjs');
const SUN_COMPLETION_ECC_BODIES = ['venus', 'earth', 'mars', 'jupiter'];
const SUN_COMPLETION_ECC_HALF_YR = 50000;
const SUN_COMPLETION_ECC_STEP_YR = 1000;

function buildSunCompletionArtifact() {
  const art = JSON.parse(readFileSync(SECULAR_SERIES_PATH, 'utf8'));
  const rows = art.verdict && art.verdict.planetLamDot && art.verdict.planetLamDot.rows;
  if (!Array.isArray(rows)) throw new Error('secular-series artifact carries no planet λ̇ rows — regenerate it first (node tools/verify/secular-series.js --write)');
  /** @type {Record<string, number>} */
  const planetLamDotJ2000DegPerYr = {};
  for (const r of rows) planetLamDotJ2000DegPerYr[r.body] = r.lamDotJ2000DegPerYr;
  /** @type {Record<string, {zQ: number[], zP: number[]}>} */
  const eccVectors = {};
  for (const body of SUN_COMPLETION_ECC_BODIES) {
    const b = art.bodies[body];
    const zQ = [], zP = [];
    for (let t = -SUN_COMPLETION_ECC_HALF_YR; t <= SUN_COMPLETION_ECC_HALF_YR; t += SUN_COMPLETION_ECC_STEP_YR) {
      const x = (t - art.t0Yr) / b.stepYr, i = Math.round(x);
      if (Math.abs(x - i) > 1e-9 || i < 0 || i >= b.zQ.length) throw new Error(`secular-series artifact: no ${body} node at t = ${t} yr for the Sun-completion embed`);
      zQ.push(b.zQ[i]); zP.push(b.zP[i]);
    }
    eccVectors[body] = { zQ, zP };
  }
  const payload = {
    planetLamDotJ2000DegPerYr,
    eccVectors: { t0Yr: -SUN_COMPLETION_ECC_HALF_YR, stepYr: SUN_COMPLETION_ECC_STEP_YR, bodies: eccVectors },
    meta: {
      dumpSha256: art.meta.dumpSha256,
      source: 'data/nbody-secular-series.json verdict.planetLamDot (J2000 sidereal mean motions) + bodies.<X>.zQ/zP at the 1-kyr nodes (ecliptic J2000, verbatim)',
    },
  };
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
  return { hash, payload };
}

function emitSunCompletionArtifact({ hash, payload }) {
  return `/**
 * GENERATED — do not edit. Regenerate:
 *   node tools/constants/generate.mjs --write
 *
 * Source: data/nbody-secular-series.json — the Sun planetary completion's
 * embedded data (plan 06 I3): planetLamDotJ2000DegPerYr, the planets' J2000
 * sidereal mean motions from the model's own ±10-Myr run (the completion's
 * CARRIERS; the former carriers were the planet records' rounded of-date
 * periods minus p₀ — Venus 4.1″/yr, Jupiter 1.7″/yr off the run's own
 * motion); and eccVectors, the e·e^{iϖ} of Venus, Earth, Mars and Jupiter on
 * a 1-kyr grid over ±50 kyr (ecliptic J2000) — the D'Alembert long-period
 * rows' amplitude and phase of date. Earth's carrier stays the framework
 * sidereal year (the D6 ratio-only doctrine for the run's absolute Earth
 * rate). Two gates guard the chain: check:artifacts pins artifact ↔ engine;
 * generate.mjs check mode pins this embed ↔ artifact. CJS for the .cjs
 * completion consumer.
 */
'use strict';

const SUN_COMPLETION_ARTIFACT_HASH = ${JSON.stringify(hash)};

const SUN_COMPLETION_ARTIFACT = Object.freeze(${JSON.stringify(payload)});

module.exports = { SUN_COMPLETION_ARTIFACT, SUN_COMPLETION_ARTIFACT_HASH };
`;
}

function buildDeepModes(chainArt) {
  const raw = readFileSync(DEEP_MODES_PATH, 'utf8');
  const art = JSON.parse(raw);
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  const anchor = chainArt.art.j2000AnchorElements.earth;
  // The SLOPE anchor (deep-ecc-channel.cjs): the run's own J2000 z-rate,
  // read from the banked ±10-Myr series the mode table compresses — the
  // series' one home, a ±1-cadence-step central difference at the J2000
  // node (measured: the table's own ė was 19 % steep, the series' is the
  // run's) — and the taper the arguments' rate anchors ride (H/12), so the
  // three engines build the identical channel from the embed alone.
  const series = JSON.parse(readFileSync(SECULAR_SERIES_PATH, 'utf8'));
  const eb = series.bodies.earth;
  const i0 = Math.round((0 - series.t0Yr) / eb.stepYr);
  if (!(i0 > 0 && i0 + 1 < eb.zQ.length && series.t0Yr + i0 * eb.stepYr === 0)) {
    throw new Error('secular-series artifact: no J2000 node for the z-rate anchor — regenerate it first (node tools/verify/secular-series.js --write)');
  }
  const anchorZDotPerYr = [
    (eb.zQ[i0 + 1] - eb.zQ[i0 - 1]) / (2 * eb.stepYr),
    (eb.zP[i0 + 1] - eb.zP[i0 - 1]) / (2 * eb.stepYr),
  ];
  // (plan 09 step 7c: the slope anchor's taper is the lunar arguments' recorded
  // completion taper — ONE home, @essrt/physics moon/arguments.cjs; it was
  // written as the retired era unit's twelfth, bit-identical)
  const slopeTaperYears = SECULAR_COMPLETION_TAPER_YEARS;
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
      // the slope anchor pair (see above): [d(e·cos ϖ)/dt, d(e·sin ϖ)/dt] per year
      anchorZDotPerYr,
      slopeTaperYears,
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
 * the C-4 s-lines for the zoom labels — doc 109 §19), plus the J2000
 * z-rate pair from data/nbody-secular-series.json (the slope anchor of
 * the deep eccentricity channel) and its H/12 taper. Two gates guard
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
 * Source: the shipped fit artifacts under data/ (EXTRA_COEFFICIENT_SOURCES in
 * the generator), each emitted VERBATIM.
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
// in coefficients.js, emitted VERBATIM from the fit artifacts under data/.

export declare const COEFFICIENTS_HASH: ${JSON.stringify(hash)};

export declare const FITTED_COEFFICIENTS: {
${keys.map((k) => `  readonly ${k}: ${tsTypeOf(out[k])};`).join('\n')}
};
`;
}

// ── run ──────────────────────────────────────────────────────────────────────
const result = build();
const coeffs = buildCoefficients();

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
const sunCompletion = buildSunCompletionArtifact();
const sunCompletionJs = emitSunCompletionArtifact(sunCompletion);
const moonDistance = buildMoonDistanceArtifact();
const moonDistanceJs = emitMoonDistanceArtifact(moonDistance);

if (write) {
  mkdirSync(dirname(OUT_JS), { recursive: true });
  writeFileSync(OUT_JS, js);
  writeFileSync(OUT_DTS, dts);
  writeFileSync(OUT_COEFFS, coeffJs);
  writeFileSync(OUT_COEFFS_DTS, coeffDts);
  writeFileSync(OUT_CHAIN, chainJs);
  writeFileSync(OUT_DEEP_MODES, deepJs);
  writeFileSync(OUT_SIDEREAL, siderealJs);
  writeFileSync(OUT_SUN_COMPLETION, sunCompletionJs);
  writeFileSync(OUT_MOON_DISTANCE, moonDistanceJs);
  console.log(`  moon-distance     ${moonDistance.hash}  (AstroGeo22 cited history, ${moonDistance.payload.ageMa.length} samples @ ${moonDistance.payload.ageStepMa} Myr)`);
  console.log(`generated ${countLeaves(result.included)} values in ${Object.keys(result.included).length} blocks`);
  console.log(`  constants hash    ${result.hash}`);
  console.log(`  coefficients hash ${coeffs.hash}  (${Object.keys(coeffs.out).length} arrays, full precision)`);
  console.log(`  chain artifact    ${chainArt.hash}  (engine-D governed artifact, verbatim)`);
  console.log(`  deep-modes embed  ${deepModes.hash}  (deep-time Earth-z table, verbatim + joined anchor)`);
  console.log(`  sidereal embed    ${siderealChan.hash}  (D6 λ̇ channel, ${siderealChan.payload.lamDotRel.length} samples @ ${siderealChan.payload.stepYr} yr)`);
  console.log(`  sun-completion    ${sunCompletion.hash}  (planet λ̇ carriers + ${SUN_COMPLETION_ECC_BODIES.length} e-vector series @ ${SUN_COMPLETION_ECC_STEP_YR} yr over ±${SUN_COMPLETION_ECC_HALF_YR} yr)`);
  console.log(`  excluded: ${Object.entries(result.excluded).map(([b, c]) => `${b} (${c})`).join(', ')}`);
  console.log('  -> packages/physics/src/constants/{generated.js,generated.d.ts,coefficients.js,coefficients.d.ts} + planets/chain-artifact.js + moon/deep-modes-artifact.cjs + earth/sidereal-channel-artifact.cjs + eclipse/sun-completion-artifact.cjs');
  process.exit(0);
}

let current = null;
let currentDts = null;
let currentCoeffs = null;
let currentCoeffsDts = null;
let currentChain = null;
let currentDeep = null;
let currentSidereal = null;
let currentSunCompletion = null;
let currentMoonDistance = null;
try {
  current = readFileSync(OUT_JS, 'utf8');
  currentDts = readFileSync(OUT_DTS, 'utf8');
  currentCoeffs = readFileSync(OUT_COEFFS, 'utf8');
  currentCoeffsDts = readFileSync(OUT_COEFFS_DTS, 'utf8');
  currentChain = readFileSync(OUT_CHAIN, 'utf8');
  currentDeep = readFileSync(OUT_DEEP_MODES, 'utf8');
  currentSidereal = readFileSync(OUT_SIDEREAL, 'utf8');
  currentSunCompletion = readFileSync(OUT_SUN_COMPLETION, 'utf8');
  currentMoonDistance = readFileSync(OUT_MOON_DISTANCE, 'utf8');
} catch { /* handled below */ }

console.log('GENERATED CONSTANTS — check');
console.log('='.repeat(74));
console.log(`  ${countLeaves(result.included)} values · ${Object.keys(result.included).length} blocks · hash ${result.hash}`);
console.log(`  excluded (never injectable): ${Object.keys(result.excluded).join(', ')}`);
console.log(`  coefficients: ${Object.keys(coeffs.out).length} arrays · hash ${coeffs.hash}`);

if (current === null || currentCoeffs === null || currentCoeffsDts === null || currentChain === null || currentDeep === null || currentSidereal === null || currentSunCompletion === null || currentMoonDistance === null) {
  console.log('\nFAIL — a generated module is missing. Run with --write.');
  process.exit(1);
}
if (current !== js || currentDts !== dts || currentCoeffs !== coeffJs || currentCoeffsDts !== coeffDts || currentChain !== chainJs || currentDeep !== deepJs || currentSidereal !== siderealJs || currentSunCompletion !== sunCompletionJs || currentMoonDistance !== moonDistanceJs) {
  console.log('\nFAIL — a generated module is STALE relative to the JSON source of truth.');
  console.log('Run: node tools/constants/generate.mjs --write');
  process.exit(1);
}
console.log('\nPASS — generated modules match the JSON.');
