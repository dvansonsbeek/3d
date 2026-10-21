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
 *   eccentricity: (year: number) => number,
 *   identity: ModelIdentity,
 * } & ModelSurfaces} Model
 */

/**
 * Generated at build time from `public/input/astro-reference.json` (plus the
 * deep-time block the generator assembles; model-parameters.json is deleted, plan 11)
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
// (Plan 09 step 7a: the Phase 7 integrated-phase machinery `createPhaseMachinery`
// — the ∫dt/H_era table and the cycle counters every comb read — and the
// frozen cardinal record evaluator `createCardinalModel` (the §10 derived
// form on the deleted CARDINAL_POINT_* coefficients) are DELETED; the
// cardinal instants are createModel().cardinal, the one Sun's crossings.)
// The deep-time calendar (year ↔ JD under the drifting year length) — ONE
// implementation for both engines since the year/day collapse (formerly the
// PHASE-B-DUPLICATE family). CJS on purpose: tools/lib requires the same
// file via the exports-map subpath; re-exported here so bundled ESM
// consumers need only the package root.
export { createDeepCalendar } from './phase/deep-calendar.cjs';
// Plan 13 B1: the civil calendar ↔ JD (Meeus ch. 7 with the 1582-10-15
// reform) and the angle constants/wraps — ONE home; the browser's eighteen
// calendar copies and 27 local D2R constants import these.
export { GREGORIAN_START, GREGORIAN_START_JD, calendarToJD, jdToCalendar, jdToDecimalYear, dayFractionToHMS, julianCalendarToJD, jdToJulianCalendar } from './time/calendar.cjs';
export { DEG2RAD, RAD2DEG, ARCSEC_PER_TURN, ARCSEC_PER_RAD, wrap360, wrap180, wrap180Closed, wrap2pi, wrapPi } from './math/angles.cjs';
// Plan 13 B2: THE deep-time chain assembly — the GIA α channel, the Layer-0
// bundle, the cited Moon-distance history, the ΔT cycle stack, |s₃|, the
// LOD/ΔT core, the lunar month chain and the mean*AtAge family, assembled
// ONCE from the generated constants; the Node twin and the browser destructure it.
export { createDeepTimeChain, MOON_ECC_SENSITIVITY_PERIGEE, MOON_ECC_SENSITIVITY_NODE } from './deltat/deep-time-chain.js';
// Plan 13 B3: the J2000 mass chain and the Moon's J2000 periods (one home for
// three copies each) and the unit constants.
export { computeMassChainJ2000, computeMoonPeriodsJ2000 } from './earth/mass-chain.cjs';
export { SECONDS_PER_DAY, DAYS_PER_JULIAN_YEAR, JULIAN_CENTURY_DAYS, SECONDS_PER_JULIAN_YEAR } from './constants/units.cjs';
// D4b: the one-source cardinal structure — the EoC layer (year lengths,
// crossing offsets, the e(t)-proportional spread) on the movement's own
// e(t)/ϖ(t). Absolute dates deliberately excluded (per-renderer mean chain).
export { createCardinalStructure } from './cardinal/one-source-structure.cjs';
// Phase 8.2 — the lunar machinery, extracted layer by layer (survey order:
// eccentricity channel → month chain → cycle tables → arguments → series →
// apparent). Same CJS + root re-export convention.
// (plan 09 step 6: createMoonEccChannel — the H/3 eccentricity law — is deleted; Earth's e of date is the N-body series on every path)
export { createMoonMonthChain } from './moon/month-chain.cjs';
export { createChainCycleIntegrator } from './chain-cycles/index.cjs';
export { createMoonArguments } from './moon/arguments.cjs';
export { createMoonSeries } from './moon/series.cjs';
export { createMoonApparent } from './moon/apparent.cjs';
// R4 — the Earth frame of date (sun plane, equinox, spin axis from the one-source
// sample) and the offset-circle wheel-angle solver: the scene twins' one placement.
export { computeEarthFrameOfDate, solveWheelAngleForLongitude, computeSceneWorldFrameJ2000, SCENE_EQUINOX_VIEW_AZIMUTH_DEG } from './earth/frame-of-date.cjs';
// Phase 8.3 — the planet machinery, extracted by LAW over body records
// (survey order: geometry → channels → chains). The ψ/K amplitude laws
// (planets/fibonacci-laws), the record-based orientation forms
// (planets/orientation) and the ascending-node integrator
// (planets/asc-node-integrator) are DELETED at plan 07 R5/R6: the planets'
// elements of date have one home, the N-body chain.
export { derivePlanetGeometry, scaffoldOrbitInputs } from './planets/geometry.cjs';
// (plan 09 step 6: eccentricityFromCycles / computeEccentricityIntegrated — the H/16 law-of-cosines eccentricity — are deleted; no runtime read them)
export * as planetOrbitChain from './planets/orbit-chain.cjs';
// P5/K4.6c — the engine-D Keplerian chain (pure evaluator + the embedded
// governed artifact; the browser flag path consumes exactly these).
export { computeSecularShape } from './planets/secular-shape.cjs';
// `computeApsidalTangentDegPerYr` is the chain's ±150-yr central tangent of the perihelion
// longitude (the panels' "Prec." cell — osculating, NOT the ±1-kyr secular stencil of the
// "Secular" cell); `computeApsidalSecularDegPerYr` is its former name, kept as a deprecated
// alias on the API axis (plan 14 follow-up).
export { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear, computeHeliocentricEclipticFromElements, computePoissonArgRad, computeOsculatingElements, solveKeplerRad, computeApsidalSecularDegPerYr, computeApsidalSecularDegPerYr as computeApsidalTangentDegPerYr, ANCHOR_EPOCH_YEAR, ANCHOR_EPOCH_JD } from './planets/keplerian-chain.cjs';
export { computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } from './planets/inv-plane-frame.cjs';
export { createSecularSeriesOverride } from './planets/secular-series.cjs';
// Plan 06 Phase 7 — the planets' spin channel (the precession constant from
// each planet's own torques, the spin integrated on its own ζ plane history).
export { computePlanetPrecessionConstant, createPlanetSpinChannel, createPlanetSpinChannelFromArtifacts, computeObliquityJ2000Deg } from './planets/spin-channel.cjs';
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
export { createYearLengths, computeMeanTropicalYearJ2000Days, ONE_FAMILY_WINDOW_YEARS } from './earth/year-lengths.cjs';
// Plan 06 D6: THE ONE home of the composed lunisolar precession rate ψ̇(t)
// (spin ω(t) × [solar torque + lunar torque on the recession history]) —
// leg-1's physical rate; the structural H(t)/13 clock is its named diagnostic.
export { computeSolarTorqueShare, createComposedPrecession } from './earth/precession-composed.cjs';
// Plan 12 §8 option (a): the cited mean obliquity of date — the second column read from the
// Earth–Moon history; the precession RATE of date carries its cos ε̄(t)/cos ε̄(0) on the constant.
export { createMeanObliquityHistory } from './earth/mean-obliquity-history.cjs';
// (planets/predict.cjs — the planet predictive-precession feature basis — was
// retired at plan 06 R8 with PREDICT_COEFFS_PHYSICAL.)
// L10 — the composition front door: one law set, N body records. Thin by
// design; engines keep their direct call sites (see planets/model.cjs).
export { createPlanetModel } from './planets/model.cjs';
// plan 11 step 6 — the planets' presentation names, the last leaf of the
// deleted model-parameters.json (code, not an input: not injectable, not hashed).
export { PLANET_DISPLAY_NAMES } from './planets/display-names.cjs';
// Phase 8.4 — the climate/ΔT machinery, extracted layer by layer.
export { createDeltaTCycles } from './deltat/cycles.cjs';
export { createDeepTimeLod } from './deltat/deep-time.cjs';
// plan 12 (option A): the Earth–Moon distance history is a CITED PHYSICAL
// INPUT (Farhat et al. 2022, the AstroGeo22 ephemeris) read as a shape on the
// model's J2000 anchor; the fitted quartic, the rock-fitted regime spline and
// the solar-channel budget are deleted.
export { createMoonDistanceHistory } from './deltat/moon-distance-history.cjs';
export { MOON_DISTANCE_ARTIFACT, MOON_DISTANCE_ARTIFACT_HASH } from './deltat/moon-distance-artifact.cjs';
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
// (plan 09 step 5a: createSunLongitudeCorrection — the Step-0 Sun comb's evaluator,
//  retired from the Sun node at plan 06 R4 — is deleted with the comb and its fitter.)

/**
 * Build a model bound to a set of constants.
 *
 * Dependency injection rather than import is the key decision (§2d): it is what
 * makes `createModel({ ...DEFAULT_CONSTANTS, neptuneMassRatio: x })` express a
 * counterfactual. Retrofitting it later is prohibitive, so the shape lands now
 * even though the body is empty.
 *
 * @param {Constants} [constants]
 * @param {{ laws?: { eccentricityAt?: (year: number) => number, eccentricityRateAt?: (year: number) => number, perihelionLongitudeDegAt?: (year: number) => number }, secularSeriesArtifact?: any, giaEllipticityOfDate?: boolean }} [opts]
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
  // opts.giaEllipticityOfDate — false builds the one-source history on the
  // orbital forcing alone (no ice-driven J₂(t) factor): the T1 line derivation
  // (see assembleModel). Default true = the shipped physics. Never part of the hash.
  const surfaces = assembleModel(ctx, FITTED, opts.laws ?? {}, opts.secularSeriesArtifact ?? null,
    { giaEllipticityOfDate: opts.giaEllipticityOfDate !== false });

  return {
    constants: ctx,
    hash,

    // Plan 09: the fit-era lattice identities H/13, H/3, H/16
    // (`computeLatticePeriodsYears`, DEVICE tier) left this surface — the
    // published periods are `epoch.axialPrecessionYearsAtYear` and the
    // lunisolar surface's apsidal and perihelion-of-date periods; the
    // counterfactual gate now reads the obliquity anchor through the assembly.

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
      // Which evaluator serves Earth's orbit elements away from J2000: the banked
      // N-body series (every published surface passes it) or the embedded 18-term
      // mode table (the bare package — exact at J2000, e RMS 3.6e-3 vs La2010a
      // over 500 kyr where the series reads 2.5e-5). A stored result names it.
      earthElements: opts.secularSeriesArtifact ? 'secular-series' : 'mode-table',
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
