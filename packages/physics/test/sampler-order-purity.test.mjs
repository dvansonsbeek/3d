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
import { readFileSync } from 'node:fs';
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

// ── Twin 3 (plan 24): the checkpoint BANK is a seat, not a value ──────────
// data/spin-axis-checkpoints.json holds the spin-axis walk's state every
// 250 kyr; a deep read seats its walk on the nearest checkpoint and walks at
// most one spacing. The walk is pure in (ŝ, t) — a node computed from a banked
// state must be the node the continuous walk from J2000 computes, bit-exact,
// in either visit order and on both twins. Three deep epochs: inside the
// 1000-yr tier, inside the 5000-yr tier near a checkpoint, and deep in the
// Phanerozoic where the full walk is ~10 M steps (the bank's whole point).
{
  const lib = require(join(ROOT, 'tools', 'lib', 'deep-orbital-history.js'));
  const withBank = lib.createOneSourceTier();
  const noBank = lib.createOneSourceTier({ bank: false });
  if (!withBank || !noBank) {
    failures.push('createOneSourceTier returned null — series artifact missing');
  } else if (!withBank.bankLoaded) {
    failures.push('createOneSourceTier(): data/spin-axis-checkpoints.json not loaded — node tools/verify/spin-axis-bank.js --write');
  } else {
    const BANK_EPOCHS = [-3000000, -37000000, -137000000];   // decimal-year offsets from 2000 (t); the unseated walk to −137 Myr is the gate's cost (~27 s)
    /** @param {any} h @param {number} t */
    const sample = (h, t) => {
      const s = h.build(t, 0, 5000).at(t);
      return [s.epsDeg, s.e, s.periOfDateDeg];
    };
    // order 1: deepest first on the banked instance, shallowest first on the continuous one
    const a = Object.fromEntries([...BANK_EPOCHS].reverse().map((t) => [t, sample(withBank, t)]));
    const b = Object.fromEntries(BANK_EPOCHS.map((t) => [t, sample(noBank, t)]));
    for (const t of BANK_EPOCHS) {
      for (let i = 0; i < 3; i++) {
        check(`bank-seated vs continuous walk [${['epsDeg', 'e', 'periOfDateDeg'][i]}]`, 2000 + t, b[t][i], a[t][i]);
      }
    }
    // the package twin, seated on the same bank, reads the same nodes
    const bankArt = JSON.parse(readFileSync(join(ROOT, 'data', 'spin-axis-checkpoints.json'), 'utf8'));
    const seriesArt = JSON.parse(readFileSync(join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
    const m = createModel(undefined, { secularSeriesArtifact: seriesArt, spinCheckpointsArtifact: bankArt });
    const m0 = createModel(undefined, { secularSeriesArtifact: seriesArt });
    for (const t of BANK_EPOCHS) {
      check('model earth.obliquityDeg bank vs full walk', 2000 + t,
        m0.earth.obliquityDeg(2000 + t), m.earth.obliquityDeg(2000 + t));
    }
    // ── Twin 4 (plan 25): the LUNAR cumulative bank is a seat, not a value ──
    // data/lunar-cumulative-checkpoints.json holds the lunar tables' coarse
    // segment prefixes; a seated model sums one segment at most. The tables'
    // association is the same with and without it, so the deep lunar longitude
    // (the chain counts and the carriers behind L′, ϖ, Ω) must be bit-identical
    // in either visit order — deepest first on the seated model, shallowest
    // first on the unseated one (whose walk to −37 Myr is this block's cost).
    const lunarArt = JSON.parse(readFileSync(join(ROOT, 'data', 'lunar-cumulative-checkpoints.json'), 'utf8'));
    const ml = createModel(undefined, { secularSeriesArtifact: seriesArt, spinCheckpointsArtifact: bankArt, lunarCheckpointsArtifact: lunarArt });
    const ml0 = createModel(undefined, { secularSeriesArtifact: seriesArt, spinCheckpointsArtifact: bankArt });
    const LUNAR_JDS = [-3000000, -37000000].map((t) => 2451545 + t * 365.25 + 12345.678);
    const seatedLon = Object.fromEntries([...LUNAR_JDS].reverse().map((jd) => [jd, ml.moon.lonDegAtJD(jd)]));
    for (const jd of LUNAR_JDS) {
      check('model moon.lonDegAtJD lunar bank vs unseeded tables', 2000 + (jd - 2451545) / 365.25, ml0.moon.lonDegAtJD(jd), seatedLon[jd]);
    }
  }
}

if (failures.length) {
  console.error(`sampler-order-purity: ${failures.length} FAILURE(S)`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log('sampler-order-purity: OK — year-length/ε/e values identical fresh vs after deep-time probes (both Node twins, bit-exact)');
