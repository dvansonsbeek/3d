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
 * Validation targets are deliberately ABSENT — `laplaceLagrangeBounds`,
 * `knownValues`, `ascendingNodesSouamiSouchay`, `jplEclipticInclinationTrends`,
 * `eigenmodePhasesLaplaceLagrange`. A counterfactual must not be able to move
 * the goalposts it is judged by. See CLASSIFICATION in the generator.
 */
export { DEFAULT_CONSTANTS, CONSTANTS_HASH } from './generated.js';
