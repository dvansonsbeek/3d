/**
 * SAMPLER VISIT-ORDER PURITY GATE (the anomalistic-contamination fix).
 *
 * The one-source movement caches its integrator output on per-tier grids
 * (100-yr inside ±50 kyr, 1000-yr to ±2 Myr, 5000-yr beyond). The former
 * single grown sampler REPLACED the fine grid with a coarse one after any
 * deep-time probe, and the year-length rates (±0.5-yr central differences
 * through the grid) then returned grid-segment averages instead of local
 * rates: the anomalistic year of date read +2.63 s (1000-yr grid) / +19 s
 * (5000-yr grid) at 2026, depending on which epochs had been visited
 * first. This gate pins the invariant on BOTH Node twins (the package
 * createModel and tools/lib createOneSourceMovement): every year-length
 * value is a pure function of `year` — bit-exact regardless of any prior
 * deep-time queries on the same instance.
 *
 *   node packages/physics/test/sampler-order-purity.test.mjs   (exit 1 on fail)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createModel } from '../src/index.js';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

const MODERN_YEARS = [1900, 2000, 2026];
const failures = [];
/** @param {string} label @param {number} year @param {number} fresh @param {number} dirty */
const check = (label, year, fresh, dirty) => {
  if (!Number.isFinite(fresh) || fresh !== dirty) {
    failures.push(`${label} @ ${year}: fresh ${fresh} vs after-deep-probe ${dirty} (Δ ${dirty - fresh})`);
  }
};

// ── Twin 1: the package model (packages/physics/src/model.js sampler) ──────
{
  const freshModel = createModel();
  const dirtyModel = createModel();
  // Grow the dirty instance's sampler through both coarse tiers FIRST.
  dirtyModel.yearLengths.anomalisticYearSecondsAtYear(-300000);   // 1000-yr grid tier
  dirtyModel.yearLengths.anomalisticYearSecondsAtYear(-3000000);  // 5000-yr grid tier
  for (const y of MODERN_YEARS) {
    check('model anomalisticYearSecondsAtYear', y,
      freshModel.yearLengths.anomalisticYearSecondsAtYear(y),
      dirtyModel.yearLengths.anomalisticYearSecondsAtYear(y));
    check('model tropicalYearSecondsAtYear', y,
      freshModel.yearLengths.tropicalYearSecondsAtYear(y),
      dirtyModel.yearLengths.tropicalYearSecondsAtYear(y));
  }
  // Deep-tier reads must be order-pure too (fresh deep ≡ the dirty walk's).
  check('model anomalisticYearSecondsAtYear', -300000,
    createModel().yearLengths.anomalisticYearSecondsAtYear(-300000),
    dirtyModel.yearLengths.anomalisticYearSecondsAtYear(-300000));
}

// ── Twin 2: the Node engine binding (tools/lib/deep-orbital-history.js) ────
{
  const lib = require(join(ROOT, 'tools', 'lib', 'deep-orbital-history.js'));
  const fresh = lib.createOneSourceMovement();
  const dirty = lib.createOneSourceMovement();
  if (!fresh || !dirty) {
    failures.push('createOneSourceMovement returned null — series artifact missing');
  } else {
    dirty.epsDeg(-300000);    // 1000-yr grid tier
    dirty.epsDeg(-3000000);   // 5000-yr grid tier
    for (const y of MODERN_YEARS) {
      check('engine cardinal.anomalisticYearSeconds', y,
        fresh.cardinal.anomalisticYearSeconds(y), dirty.cardinal.anomalisticYearSeconds(y));
      check('engine epsDeg', y, fresh.epsDeg(y), dirty.epsDeg(y));
      check('engine e', y, fresh.e(y), dirty.e(y));
    }
  }
}

if (failures.length) {
  console.error(`sampler-order-purity: ${failures.length} FAILURE(S)`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log('sampler-order-purity: OK — year-length/ε/e values identical fresh vs after deep-time probes (both Node twins, bit-exact)');
