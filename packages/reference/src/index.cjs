/**
 * @essrt/reference — standard-model REFERENCE evaluators for comparison
 * overlays (K8). ONE-WAY BOUNDARY (the K2 doctrine): this package exists
 * so the simulator can display bodies AS THE CURRENT SCIENTIFIC MODEL
 * predicts them next to the model's own, with a live Δ readout. Nothing
 * in the model chain may depend on it — comparison surfaces and tests
 * only — and `private: true` keeps it off npm by construction.
 *
 * Contents: the VSOP87A evaluator (K8) and the published comparison
 * curves (Laskar 2004 · Berger 1978 · Vondrák 2011 · Capitaine 2009 ·
 * Stephenson 2016 — migrated here from @essrt/physics at its 4.0.0
 * major; per-curve provenance lives in published-curves.cjs itself).
 */

'use strict';

module.exports = {
  ...require('./vsop87.cjs'),
  // K8 slice 2 — the Moon ghost's evaluator. This spread was MISSING from
  // the day the module landed: the browser's named import came through as
  // undefined, the Moon ghost threw a TypeError every frame inside
  // updatePositions, and the whole scene froze the moment the overlay was
  // toggled (owner-found; reproduced headlessly). No gate toggles the
  // overlay — the snapshot probe added with this fix closes that hole.
  ...require('./elp-mpp02.cjs'),
  publishedCurves: require('./published-curves.cjs'),
};
