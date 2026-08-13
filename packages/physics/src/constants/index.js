/**
 * The constants context (§2d) — stable import point.
 *
 * `generated.js` is written by `tools/constants/generate.mjs` from the JSON
 * source of truth and is never hand-edited. Consumers import from here so they
 * do not depend on the generator's output path.
 *
 * Injected via `createModel`, never imported by a layer: importing constants
 * inside a layer is what makes counterfactuals impossible, and that capability
 * is the one thing DE440 and Laskar cannot offer.
 *
 * Validation targets are deliberately absent from DEFAULT_CONSTANTS —
 * `laplaceLagrangeBounds`, `knownValues`, `ascendingNodesSouamiSouchay`,
 * `jplEclipticInclinationTrends`, `eigenmodePhasesLaplaceLagrange` — plus
 * `galaxyMotion`, which is presentation rather than physics.
 *
 * They ship as REFERENCE_DATA instead: single-sourced, so nothing duplicates
 * them as literals, but never injectable. `createModel` refuses these keys
 * outright, because a counterfactual must not be able to move the goalposts it
 * is judged by. See CLASSIFICATION in the generator.
 */
export { DEFAULT_CONSTANTS, CONSTANTS_HASH, MODEL_VERSION, PREPRINT_DOI, REFERENCE_DATA } from './generated.js';

/**
 * Fitting-pipeline output, at full double precision (§2j). Kept apart from
 * DEFAULT_CONSTANTS because the lifecycle differs: these regenerate wholesale
 * when a fit step runs, and are never hand-edited. COEFFICIENTS_HASH identifies
 * the fit, CONSTANTS_HASH the parameters — a result is reproducible from both.
 */
export { FITTED_COEFFICIENTS, COEFFICIENTS_HASH } from './coefficients.js';
