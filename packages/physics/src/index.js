/**
 * @essrt/physics — the pure physics core.
 *
 * PHASE 2 SKELETON. No physics has moved yet; `script.js` remains the
 * implementation. This file exists so the architecture rules have something to
 * enforce before code arrives — that ordering is the whole point of Phase 2.
 *
 * Three rules this package must never break (IP-unified-architecture.md §2b, §2h):
 *
 *   1. It imports NOTHING external. Not `three`, not `fs`, not `next`, not
 *      `document`, not `process`. Language built-ins only.
 *   2. Constants are INJECTED, never imported. A `import { H } from './constants'`
 *      inside a layer is a design defect, not a shortcut — it makes
 *      counterfactuals impossible, which is the one capability DE440 and Laskar
 *      cannot offer.
 *   3. No scene-graph scaffold. `containerObj`, `pivotObj`, `planetObj`,
 *      `orbitCentera/b/c`, `orbitTilta/b`, `startPos` are Tychosium-derived (GPL)
 *      and belong to `simulator`. Nothing GPL-derived may be reachable from here,
 *      because this package is the one that can be licensed commercially.
 *
 * All three are enforced: `npm run lint` and `npm run check:boundaries`.
 */

import { DEFAULT_CONSTANTS as GENERATED, CONSTANTS_HASH, MODEL_VERSION, PREPRINT_DOI, REFERENCE_DATA } from './constants/index.js';
import { FITTED_COEFFICIENTS as FITTED, COEFFICIENTS_HASH as COEFF_HASH } from './constants/index.js';
import { assembleModel } from './model.js';

/**
 * Keys `createModel` refuses. Derived from REFERENCE_DATA rather than listed by
 * hand, so classifying a new block in the generator automatically protects it —
 * a hand-written list would drift the moment someone added a bound.
 * @type {string[]}
 */
const NEVER_INJECTABLE = Object.keys(REFERENCE_DATA);

/**
 * @typedef {Record<string, unknown> & { hash?: string }} Constants
 */

/**
 * @typedef {ReturnType<typeof assembleModel>} ModelSurfaces
 */

/**
 * @typedef {Object} ModelIdentity
 * @property {string} modelVersion
 * @property {string} constantsHash    THIS context's hash — distinct for a counterfactual
 * @property {string} coefficientsHash
 * @property {boolean} counterfactual
 * @property {string} preprintDoi
 */

/**
 * @typedef {{
 *   constants: Constants,
 *   hash: string,
 *   computeLatticePeriodsYears: () => {axialPrecessionPeriodYears: number, inclinationPrecessionPeriodYears: number, perihelionPrecessionPeriodYears: number},
 *   eccentricity: (year: number) => number,
 *   identity: ModelIdentity,
 * } & ModelSurfaces} Model
 */

/**
 * Generated at build time from `public/input/{model-parameters,astro-reference}.json`
 * (§2g) by `tools/constants/generate.mjs`. 324 values across 15 blocks.
 *
 * Free parameters and measured anchors only. Validation targets are excluded by
 * the generator's CLASSIFICATION map, so a counterfactual cannot move the
 * goalposts it is judged by (§2d).
 * @type {Constants}
 */
export { GENERATED as DEFAULT_CONSTANTS, CONSTANTS_HASH, MODEL_VERSION, PREPRINT_DOI };

/**
 * Validation targets and presentation data. Single-sourced so nothing keeps a
 * duplicate copy, but NOT part of the model context — `createModel` refuses
 * these keys (§2d).
 */
export { REFERENCE_DATA };

/**
 * Fitting-pipeline output at full precision, with its own hash (§2j).
 * Not part of the injectable context: a counterfactual perturbs the parameters
 * we chose, not the 2,400-term output of a fit.
 */
export { FITTED_COEFFICIENTS, COEFFICIENTS_HASH } from './constants/index.js';

/**
 * Phase 6 surface — the epoch layer. `createEpochPrimitives` + `deriveEpochParams`
 * are what `src/script.js` and `tools/lib/deep-time.js` converge on: one
 * derivation of the parameter bundle, one implementation of the chain. The
 * browser imports these; the Node engine is held bit-identical by the layer0
 * identity gate until Phase C rewrites it as an adapter.
 */
export { createEpochPrimitives } from './layer0/index.js';
export { deriveEpochParams } from './layer0/derive-params.js';
export { createDerivedViews } from './layer1/index.js';
// Phase 7 — the shared integrated-phase and cardinal-point machinery (CJS on
// purpose: tools/lib requires the same files via the exports-map subpaths;
// re-exported here so bundled ESM consumers need only the package root).
export { createPhaseMachinery } from './phase/index.cjs';
export { createCardinalModel } from './cardinal/index.cjs';
// D4b: the one-source cardinal structure — the EoC layer (year lengths,
// crossing offsets, the e(t)-proportional spread) on the movement's own
// e(t)/ϖ(t). Absolute dates deliberately excluded (per-renderer mean chain);
// the frozen createCardinalModel stays the certified era device.
export { createCardinalStructure } from './cardinal/one-source-structure.cjs';
// Phase 8.2 — the lunar machinery, extracted layer by layer (survey order:
// eccentricity channel → month chain → cycle tables → arguments → series →
// apparent). Same CJS + root re-export convention.
export { createMoonEccChannel } from './moon/ecc-channel.cjs';
export { createMoonMonthChain } from './moon/month-chain.cjs';
export { createChainCycleIntegrator } from './chain-cycles/index.cjs';
export { createMoonArguments } from './moon/arguments.cjs';
export { createMoonSeries } from './moon/series.cjs';
export { createMoonApparent } from './moon/apparent.cjs';
// R4 — the Earth frame of date (sun plane, equinox, spin axis from the one-source
// sample) and the offset-circle wheel-angle solver: the scene twins' one placement.
export { computeEarthFrameOfDate, solveWheelAngleForLongitude } from './earth/frame-of-date.cjs';
// Phase 8.3 — the planet machinery, extracted by LAW over body records
// (survey order: geometry → Fibonacci laws → channels → chains).
export { derivePlanetGeometry } from './planets/geometry.cjs';
export * as planetFibonacciLaws from './planets/fibonacci-laws.cjs';
export { eccentricityFromCycles, computeEccentricityIntegrated } from './planets/ecc-channel.cjs';
export * as planetOrientation from './planets/orientation.cjs';
export { integrateAscendingNode } from './planets/asc-node-integrator.cjs';
export * as planetOrbitChain from './planets/orbit-chain.cjs';
// P5/K4.6c — the engine-D Keplerian chain (pure evaluator + the embedded
// governed artifact; the browser flag path consumes exactly these).
export { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear, computeHeliocentricEclipticFromElements, computePoissonArgRad, computeOsculatingElements, solveKeplerRad, computeApsidalSecularDegPerYr, ANCHOR_EPOCH_YEAR, ANCHOR_EPOCH_JD } from './planets/keplerian-chain.cjs';
export { computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } from './planets/inv-plane-frame.cjs';
export { createSecularSeriesOverride } from './planets/secular-series.cjs';
// Plan 06 Phase 7 — the planets' spin channel (the precession constant from
// each planet's own torques, the spin integrated on its own ζ plane history).
export { computePlanetPrecessionConstant, createPlanetSpinChannel } from './planets/spin-channel.cjs';
export { CHAIN_ARTIFACT, CHAIN_ARTIFACT_HASH } from './planets/chain-artifact.js';
// Engine-switch Stage B, T5d-(d): the deep-time Earth-z channel (the deep
// lunar-chain modulation rides it; era consumers stay on the H/3 channel).
export { createDeepEccChannel } from './moon/deep-ecc-channel.cjs';
export { DEEP_MODES_ARTIFACT, DEEP_MODES_ARTIFACT_HASH } from './moon/deep-modes-artifact.cjs';
// Stage C-3: the ONE home of the obliquity-hybrid / deep-orbital-history
// mathematics (published-ε surfaces + the deep insolation features).
export { createDeepOrbitalHistory } from './earth/deep-orbital-history.cjs';
// D6: the sidereal-year-of-date channel (banked λ̇ ratio × the caller's mass-loss law)
export { createSiderealYearChannel } from './earth/sidereal-year-channel.cjs';
// S2: THE ONE of-date year-length family (years + precession beats, SI seconds)
export { createYearLengths, ONE_FAMILY_WINDOW_YEARS } from './earth/year-lengths.cjs';
// Plan 06 D6: THE ONE home of the composed lunisolar precession rate ψ̇(t)
// (spin ω(t) × [solar torque + lunar torque on the recession history]) —
// leg-1's physical rate; the structural H(t)/13 clock is its named diagnostic.
export { computeSolarTorqueShare, createComposedPrecession } from './earth/precession-composed.cjs';
// (planets/predict.cjs — the planet predictive-precession feature basis — was
// retired at plan 06 R8 with PREDICT_COEFFS_PHYSICAL; docs/retired-record.md.)
// L10 — the composition front door: one law set, N body records. Thin by
// design; engines keep their direct call sites (see planets/model.cjs).
export { createPlanetModel } from './planets/model.cjs';
// Phase 8.4 — the climate/ΔT machinery, extracted layer by layer.
export { createDeltaTCycles } from './deltat/cycles.cjs';
export { createDeepTimeLod } from './deltat/deep-time.cjs';
export { createMoonRecessionHistory, createSolarChannelBudget } from './deltat/recession-history.cjs';
export { deltaTEspenakMeeusCanonSeconds } from './deltat/historical.cjs';
export { evalClimateL1OrbitalPermil, laggedL1Terms, createAlphaGiaChannel } from './climate/l1-orbital.cjs';
// Phase 8.5 — eclipse geometry (single-copy: the browser had no Node twin).
export { createEclipseFinders } from './eclipse/finders.cjs';
// Phase 8.6 — the published reference curves (external comparison formulas
// and datasets, exactly as published; comparison references, never inputs).
// (reference/published-curves MIGRATED to @essrt/reference at the 4.0.0
// major — the published model package carries no comparison references;
// the K2 one-way wall is package-structural.)
// Phase 9 — S-P8: the fitted sun-longitude harmonic stack (three copies → one).
export { createSunLongitudeCorrection } from './sun/longitude-correction.cjs';

/**
 * Build a model bound to a set of constants.
 *
 * Dependency injection rather than import is the key decision (§2d): it is what
 * makes `createModel({ ...DEFAULT_CONSTANTS, neptuneMassRatio: x })` express a
 * counterfactual. Retrofitting it later is prohibitive, so the shape lands now
 * even though the body is empty.
 *
 * @param {Constants} [constants]
 * @param {{ laws?: { eccentricityAt?: (year: number) => number, eccentricityRateAt?: (year: number) => number, perihelionLongitudeDegAt?: (year: number) => number }, secularSeriesArtifact?: any }} [opts]
 *   `laws` — research overrides for Earth's orbit laws (doc 109 §7); absent = the shipped laws, bit-identical. Not part of the hash.
 * @returns {Model}
 */
export const createModel = (constants = GENERATED, opts = {}) => {
  // Validation targets are not merely absent from DEFAULT_CONSTANTS — they are
  // REFUSED here. Absence alone only stops the spread form
  // `{...DEFAULT_CONSTANTS, x}`; nothing stopped a caller passing a bound
  // explicitly. Saturn fails its Laplace-Lagrange bound in verify-laws (44/45),
  // and a counterfactual that could widen that bound would be measuring itself.
  for (const key of NEVER_INJECTABLE) {
    if (constants && Object.prototype.hasOwnProperty.call(constants, key)) {
      throw new Error(
        `physics: "${key}" is a validation target and cannot be injected (§2d). `
        + 'It is exported as REFERENCE_DATA, which createModel does not accept — '
        + 'a counterfactual must not be able to move the goalposts it is judged by.',
      );
    }
  }

  // Test the ARGUMENT, not the copy. `ctx` below is a fresh frozen object, so
  // `ctx === GENERATED` is never true and the fast path never fired — every
  // call fell through to isDefault(), which serialises the whole context twice.
  // Harmless at 10 KB (~0.4 ms); ruinous once the fitted coefficients arrive,
  // which are ~400 KB.
  const isGeneratedDefault = constants === GENERATED;

  const ctx = Object.freeze({ ...constants });

  // The hash identifies THIS context, not the default one. A counterfactual
  // that reported the default hash would be unreproducible — you could not tell
  // from a stored result which constants produced it, which is the whole point
  // of carrying a hash (§2d). Recomputed rather than copied for that reason.
  //
  // isDefault() still runs for a caller who passes a value-identical COPY
  // (`{...DEFAULT_CONSTANTS}`); only the identity case is short-circuited.
  const hash = isGeneratedDefault || isDefault(ctx) ? CONSTANTS_HASH : hashOf(ctx);

  // The §7a assembly: every factory wired from THIS context, so counterfactual
  // constants flow through the entire motion model.
  // opts.laws — research overrides for Earth's orbit laws (see assembleModel);
  // absent = the shipped laws, bit-identical. Never part of the hash.
  // opts.secularSeriesArtifact — S3 tier unification: the governed
  // secular-series artifact (data/nbody-secular-series.json, parsed).
  // When present the of-date year-length family runs the SERIES tier
  // exactly like the browser; absent (the bare npm package) the mode
  // tail serves every epoch. Never part of the hash: it is the governed
  // artifact, not a parameter.
  const surfaces = assembleModel(ctx, FITTED, opts.laws ?? {}, opts.secularSeriesArtifact ?? null);

  return {
    constants: ctx,
    hash,

    /**
     * The fit-era lattice identities H/13, H/3, H/16, in years — DEVICE tier.
     *
     * PURE ALGEBRA OVER THE CONTEXT. No epoch, no formula, no fit. They exist
     * here for one reason: a hash-only counterfactual test would still pass if
     * `createModel` ignored its argument entirely. Something has to READ the
     * context and return a number for injection to be demonstrated end to end.
     *
     * These are NOT the published periods (plan 06 S5): the axial precession
     * period is `epoch.axialPrecessionYearsAtYear` (25,771.4 yr at J2000, the
     * of-date year laws' beat); H/13 = 25,793.6 is the fit anchor's reading,
     * 0.086 % slow — H₀ was fitted on the perihelion-of-date beat. Likewise
     * H/3 and H/16 against the chain's apsidal and perihelion-of-date periods.
     * The property names keep their historical form (plan 06 P4).
     *
     * `divisor` and `period` are never interchangeable (CLAUDE.md): 13 is the
     * divisor, H/13 years is the identity's value. The names say which.
     *
     * @returns {{axialPrecessionPeriodYears: number, inclinationPrecessionPeriodYears: number, perihelionPrecessionPeriodYears: number}}
     */
    computeLatticePeriodsYears: () => {
      const H = /** @type {{holisticyearLength: number}} */ (
        /** @type {Record<string, unknown>} */ (ctx).foundational
      ).holisticyearLength;
      return {
        axialPrecessionPeriodYears: H / 13,
        inclinationPrecessionPeriodYears: H / 3,
        perihelionPrecessionPeriodYears: H / 16,
      };
    },

    /**
     * Earth eccentricity at a year — the Phase-6 promise, fulfilled by the
     * §7a assembly (law-of-cosines on the integrated H/16 phase).
     * @param {number} year
     * @returns {number}
     */
    eccentricity: (year) => surfaces.earth.eccentricity(year),

    /**
     * Model identity (§10 two-axis): the hash is THIS context's hash, so a
     * counterfactual assembly is self-identifying.
     */
    identity: Object.freeze({
      modelVersion: MODEL_VERSION,
      constantsHash: hash,
      coefficientsHash: COEFF_HASH,
      counterfactual: hash !== CONSTANTS_HASH,
      preprintDoi: PREPRINT_DOI,
    }),

    // The assembled surfaces (§7a step 1): epoch, earth, lengths, cardinal, moon.
    ...surfaces,
  };
};

/**
 * Key-sorted canonical form, so the digest depends on values and not on
 * property insertion order — `{...DEFAULT, x}` and `{x, ...DEFAULT}` describe
 * the same counterfactual and must hash alike.
 *
 * @param {unknown} v
 * @returns {unknown}
 */
const canonical = (v) => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    const o = /** @type {Record<string, unknown>} */ (v);
    return Object.fromEntries(Object.keys(o).sort().filter((k) => k !== 'hash').map((k) => [k, canonical(o[k])]));
  }
  return v;
};

/**
 * @param {Constants} ctx
 * @returns {boolean} true when ctx is value-identical to the generated set
 */
const isDefault = (ctx) =>
  JSON.stringify(canonical(ctx)) === JSON.stringify(canonical(GENERATED));

/**
 * FNV-1a over the canonical form. Not cryptographic and does not need to be —
 * it distinguishes constant sets, it does not authenticate them. `node:crypto`
 * is unavailable here by design: physics imports no Node builtins (§2b),
 * because it runs in a browser too.
 *
 * @param {Constants} ctx
 * @returns {string} 16 hex chars, prefixed to mark it as a derived context
 */
const hashOf = (ctx) => {
  const s = JSON.stringify(canonical(ctx));
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `cf-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
};
