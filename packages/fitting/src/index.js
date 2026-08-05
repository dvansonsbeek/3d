/**
 * @hum/fitting — the production fitting pipeline (fit + verify + pipeline).
 * Node only; consumes @hum/physics (and, during the migration, the
 * pre-migration tools/lib engine through runtime-assembled requires that
 * keep the type checker out of unmigrated code — the layer0 bridge
 * pattern).
 *
 * Phase 9-3: modules move in one by one from tools/fit and tools/lib,
 * each leaving a one-line shim at its old path for the CLI muscle-memory
 * documented across docs/ and the fit README. Every move lands with the
 * full gate chain green.
 */

// 9-3a — the correction-layer registry (dependency-free infrastructure).
export * as correctionStack from './correction-stack.cjs';
