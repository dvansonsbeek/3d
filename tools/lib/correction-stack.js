/**
 * Correction Stack — single source of truth for planet position correction layers.
 *
 * Defines the order, type, and constants keys for each correction layer.
 * Provides prepareForFitting() to safely disable layers during fitting,
 * and planet name conversion helpers (lowercase ↔ capitalized).
 */

const CORRECTION_LAYERS = [
  { id: 'parallax',      keys: ['ASTRO_REFERENCE.decCorrection', 'ASTRO_REFERENCE.raCorrection'], type: 'fittable', emptyVal: {} },
  { id: 'gravitation',   keys: ['GRAVITATION_CORRECTION'],           type: 'fittable', emptyVal: null },
  { id: 'elongation',    keys: ['ELONGATION_CORRECTION'],            type: 'fittable', emptyVal: null },
  { id: 'moon-meeus',    keys: ['MOON_CORRECTION'],                  type: 'independent', emptyVal: null },
];

// ─── Deep property access helpers ────────────────────────────────────────

function deepGet(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function deepSet(obj, path, val) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

// ─── Core fitting function ───────────────────────────────────────────────

/**
 * Prepare the constants module for fitting a specific layer.
 * Disables the target layer(s) and all post-hoc layers, leaves everything else active.
 *
 * @param {object} C  - The constants module (require('../lib/constants'))
 * @param {object} sg - The scene-graph module (require('../lib/scene-graph'))
 * @param {string|string[]} layerIds - Layer ID(s) to disable for fitting
 * @returns {function} restore() - Call to re-enable all disabled layers
 */
function prepareForFitting(C, sg, layerIds) {
  if (typeof layerIds === 'string') layerIds = [layerIds];

  // Collect layers to disable: requested layers + all post-hoc layers
  const toDisable = new Set(layerIds);
  for (const layer of CORRECTION_LAYERS) {
    if (layer.type === 'post-hoc') toDisable.add(layer.id);
  }

  // Save current values, then nullify
  const saved = {};
  for (const id of toDisable) {
    const layer = CORRECTION_LAYERS.find(l => l.id === id);
    if (!layer) throw new Error(`Unknown correction layer: ${id}`);
    for (const key of layer.keys) {
      saved[key] = deepGet(C, key);
      deepSet(C, key, layer.emptyVal);
    }
  }

  sg._invalidateGraph();

  const disabledList = [...toDisable].join(', ');
  console.log(`  [correction-stack] Disabled: ${disabledList}`);

  return function restore() {
    for (const [key, val] of Object.entries(saved)) {
      deepSet(C, key, val);
    }
    sg._invalidateGraph();
  };
}

// ─── Planet name conversion ──────────────────────────────────────────────

/** Lowercase → Capitalized: 'mercury' → 'Mercury' */
function toDisplayName(name) {
  return name[0].toUpperCase() + name.slice(1);
}

/** Capitalized → lowercase: 'Mercury' → 'mercury' */
function toLowerName(name) {
  return name.toLowerCase();
}

// ─── Validation ──────────────────────────────────────────────────────────

/**
 * Validate that all expected corrections are loaded (not accidentally null).
 * Call at the start of verify-pipeline.js to catch misconfigured state.
 *
 * @param {object} C - The constants module
 * @returns {{ ok: boolean, warnings: string[] }}
 */
function validateCorrectionState(C) {
  const warnings = [];
  for (const layer of CORRECTION_LAYERS) {
    if (layer.type === 'independent') continue; // optional
    for (const key of layer.keys) {
      const val = deepGet(C, key);
      if (val == null || (typeof val === 'object' && Object.keys(val).length === 0)) {
        warnings.push(`${layer.id}: ${key} is empty or null`);
      }
    }
  }
  return { ok: warnings.length === 0, warnings };
}

module.exports = {
  CORRECTION_LAYERS,
  prepareForFitting,
  toDisplayName,
  toLowerName,
  validateCorrectionState,
};
