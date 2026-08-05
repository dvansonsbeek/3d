/**
 * @hum/physics — the pure physics core.
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

import { DEFAULT_CONSTANTS as GENERATED, CONSTANTS_HASH, REFERENCE_DATA } from './constants/index.js';

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
 * @typedef {Object} Model
 * @property {Constants} constants   the resolved context, frozen
 * @property {string} hash           identifies this context; differs for a counterfactual
 * @property {() => {axialPrecessionPeriodYears: number, inclinationPrecessionPeriodYears: number, perihelionPrecessionPeriodYears: number}} computeLatticePeriodsYears
 * @property {(year: number) => number} eccentricity
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
export { GENERATED as DEFAULT_CONSTANTS, CONSTANTS_HASH };

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
// Phase 8.2 — the lunar machinery, extracted layer by layer (survey order:
// eccentricity channel → month chain → cycle tables → arguments → series →
// apparent). Same CJS + root re-export convention.
export { createMoonEccChannel } from './moon/ecc-channel.cjs';
export { createMoonMonthChain } from './moon/month-chain.cjs';
export { createChainCycleIntegrator } from './chain-cycles/index.cjs';
export { createMoonArguments } from './moon/arguments.cjs';
export { createMoonSeries } from './moon/series.cjs';
export { createMoonApparent } from './moon/apparent.cjs';
// Phase 8.3 — the planet machinery, extracted by LAW over body records
// (survey order: geometry → Fibonacci laws → channels → chains → corrections).
export { derivePlanetGeometry } from './planets/geometry.cjs';
export * as planetFibonacciLaws from './planets/fibonacci-laws.cjs';
export { eccentricityFromCycles, computeEccentricityIntegrated } from './planets/ecc-channel.cjs';
export * as planetOrientation from './planets/orientation.cjs';
export { integrateAscendingNode } from './planets/asc-node-integrator.cjs';
export * as planetOrbitChain from './planets/orbit-chain.cjs';
export { evaluateParallaxBasis } from './planets/corrections.cjs';

/**
 * Build a model bound to a set of constants.
 *
 * Dependency injection rather than import is the key decision (§2d): it is what
 * makes `createModel({ ...DEFAULT_CONSTANTS, neptuneMassRatio: x })` express a
 * counterfactual. Retrofitting it later is prohibitive, so the shape lands now
 * even though the body is empty.
 *
 * @param {Constants} [constants]
 * @returns {Model}
 */
export const createModel = (constants = GENERATED) => {
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

  return {
    constants: ctx,
    hash,

    /**
     * H-lattice periods — the structural identities, in years.
     *
     * PURE ALGEBRA OVER THE CONTEXT. No epoch, no formula, no fit. These are
     * the divisor relationships H/13, H/3, H/16 that define the lattice, and
     * they exist here in Phase 5 for one reason: a hash-only counterfactual
     * test would still pass if `createModel` ignored its argument entirely.
     * Something has to READ the context and return a number for injection to be
     * demonstrated end to end.
     *
     * The motion model is Phase 6. This is not it.
     *
     * `divisor` and `period` are never interchangeable (CLAUDE.md): 13 is the
     * divisor, H/13 years is the period. The names say which.
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
     * @param {number} year
     * @returns {number}
     */
    eccentricity: (year) => {
      void year; void ctx;
      throw new Error('physics: not implemented until Phase 6 — see IP-technical-design.md §6');
    },
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
