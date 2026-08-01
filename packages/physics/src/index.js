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

/**
 * @typedef {Object} Constants
 * @property {number} [holisticH]   Earth Fundamental Cycle at J2000, years
 * @property {string} [hash]        content hash of the generating coefficient set
 */

/**
 * @typedef {Object} Model
 * @property {(year: number) => number} eccentricity
 */

/**
 * Generated at build time from fitted-coefficients.json (§2g).
 * Empty until Phase 5 — the generator does not exist yet, and a hand-written
 * placeholder would be a second source of truth.
 * @type {Constants}
 */
export const DEFAULT_CONSTANTS = Object.freeze({});

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
export const createModel = (constants = DEFAULT_CONSTANTS) => {
  const ctx = Object.freeze({ ...constants });
  return {
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
