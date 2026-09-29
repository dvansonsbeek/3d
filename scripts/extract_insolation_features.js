#!/usr/bin/env node
/**
 * Extract insolation-relevant orbital features at LR04 sample times.
 *
 * The features are the model's PUBLISHED Earth orbit — the @essrt/physics
 * createModel() surface, built on the banked N-body series artifact (the same
 * construction the simulator, the API and the registry use):
 *   - earth.obliquityDeg(year)             → ε(t): the obliquity hybrid (one precession
 *                                            equation on the engine's own orbit plane)
 *   - earth.eccentricity(year)             → e(t): the N-body series (the planets'
 *                                            secular modes, anchored at J2000)
 *   - earth.perihelionLongitudeDeg(year)   → ϖ(t) of date (mean equinox of date)
 *   - earth.inclinationDeg(year)           → i(t): the chain's inclination to the
 *                                            invariable plane
 * (Until 2026-09-28 this file read tools/lib/orbital-engine.js — the retired era
 * device: the two-cosine obliquity comb, the single-line eccentricity law and the
 * device perihelion progression. The insolation null test of doc 94 was measured on
 * that device; this extractor now serves the shipped model, and the test's results
 * are re-measured from it.)
 *
 * Outputs CSV: data/insolation-features.csv
 *   columns: year_ce, age_kyr_BP, obliquity_deg, eccentricity, perihelion_deg,
 *            e_sin_peri, e_cos_peri, eps_anom (ε - 23.45), e_squared,
 *            inclination_deg, incl_anom (i − the J2000 value)
 *
 * t=0 in the LR04 stack corresponds to ~1950 CE; year_ce = 1950 - age_kyr*1000.
 */

const fs = require('fs');
const path = require('path');

const LR04_PATH = path.join(__dirname, '..', 'data', 'lr04-stack.txt');
const OUT_PATH  = path.join(__dirname, '..', 'data', 'insolation-features.csv');
const SERIES_PATH = path.join(__dirname, '..', 'data', 'nbody-secular-series.json');

// Load LR04 ages (kyr BP) to use as the sample grid
function loadLr04Ages() {
  const txt = fs.readFileSync(LR04_PATH, 'utf8');
  const ages = [];
  for (const line of txt.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const a = parseFloat(parts[0]);
    if (!Number.isFinite(a)) continue;
    ages.push(a);
  }
  return ages;
}

// Reference year convention: LR04 ages_kyr BP use t=0 at 1950 CE (radiocarbon convention).
// We model with the simulator's decimal-year clock — year 1950 - age*1000.
const T0_CE = 1950.0;

async function main() {
  const { createModel } = await import('@essrt/physics');
  const model = createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(SERIES_PATH, 'utf8')) });
  const E = model.earth;
  const ages = loadLr04Ages();
  console.log(`Loaded ${ages.length} LR04 sample ages (${ages[0]}..${ages[ages.length-1]} kyr BP)`);

  const D2R = Math.PI / 180.0;
  const incl0 = E.inclinationDeg(2000);
  const rows = ['year_ce,age_kyr_BP,obliquity_deg,eccentricity,perihelion_deg,e_sin_peri,e_cos_peri,eps_anom,e_squared,inclination_deg,incl_anom'];

  let t0 = Date.now();
  for (const age of ages) {
    const yr = T0_CE - age * 1000.0;
    const eps = E.obliquityDeg(yr);
    const ecc = E.eccentricity(yr);
    const peri = ((E.perihelionLongitudeDeg(yr) % 360) + 360) % 360;
    const incl = E.inclinationDeg(yr);
    const periRad = peri * D2R;
    const eSin = ecc * Math.sin(periRad);
    const eCos = ecc * Math.cos(periRad);
    const epsAnom = eps - 23.45;
    const inclAnom = incl - incl0;                          // zero-centred about the J2000 value
    const eSq = ecc * ecc;
    rows.push([yr.toFixed(4), age, eps, ecc, peri, eSin, eCos, epsAnom, eSq, incl, inclAnom]
      .map(v => typeof v === 'number' ? v.toString() : v)
      .join(','));
  }
  fs.writeFileSync(OUT_PATH, rows.join('\n') + '\n');
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Wrote ${rows.length - 1} rows to ${OUT_PATH} in ${dt}s`);

  // Quick sanity summary
  const peek = (label, fn) => {
    const vals = ages.map(age => fn(T0_CE - age * 1000.0));
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    console.log(`  ${label}: min=${mn.toFixed(6)}, max=${mx.toFixed(6)}, mean=${mean.toFixed(6)}`);
  };
  peek('ε(t) deg', y => E.obliquityDeg(y));
  peek('e(t)    ', y => E.eccentricity(y));
  peek('ϖ(t) deg', y => ((E.perihelionLongitudeDeg(y) % 360) + 360) % 360);
  peek('i(t) deg', y => E.inclinationDeg(y));
}

main().catch((e) => { console.error(e); process.exit(1); });
