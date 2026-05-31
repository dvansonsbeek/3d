#!/usr/bin/env node
/**
 * Extract insolation-relevant orbital features at LR04 sample times.
 *
 * Uses the canonical model functions from tools/lib/orbital-engine.js:
 *   - computeObliquityEarth(year)        → ε(t) in degrees
 *   - computeEccentricityEarth(year)     → e(t)
 *   - calcEarthPerihelionPredictive(year) → ϖ(t) in degrees
 *
 * Outputs CSV: data/insolation-features.csv
 *   columns: year_ce, age_kyr_BP, obliquity_deg, eccentricity, perihelion_deg,
 *            e_sin_peri, e_cos_peri, eps_anom (ε - 23.45), e_squared
 *
 * t=0 in the LR04 stack corresponds to ~1950 CE; year_ce = 1950 - age_kyr*1000.
 */

const fs = require('fs');
const path = require('path');
const OE = require('../tools/lib/orbital-engine');

const LR04_PATH = path.join(__dirname, '..', 'data', 'lr04-stack.txt');
const OUT_PATH  = path.join(__dirname, '..', 'data', 'insolation-features.csv');

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

function main() {
  const ages = loadLr04Ages();
  console.log(`Loaded ${ages.length} LR04 sample ages (${ages[0]}..${ages[ages.length-1]} kyr BP)`);

  const D2R = Math.PI / 180.0;
  const rows = ['year_ce,age_kyr_BP,obliquity_deg,eccentricity,perihelion_deg,e_sin_peri,e_cos_peri,eps_anom,e_squared,inclination_deg,incl_anom'];

  let t0 = Date.now();
  for (const age of ages) {
    const yr = T0_CE - age * 1000.0;
    const eps = OE.computeObliquityEarth(yr);
    const ecc = OE.computeEccentricityEarth(yr);
    const peri = OE.calcEarthPerihelionPredictive(yr);
    const incl = OE.computeInclinationEarth(yr);          // H/3 inclination cycle
    const periRad = peri * D2R;
    const eSin = ecc * Math.sin(periRad);
    const eCos = ecc * Math.cos(periRad);
    const epsAnom = eps - 23.45;
    const inclAnom = incl - 1.48128;                       // zero-centred about mean
    const eSq = ecc * ecc;
    rows.push([yr.toFixed(4), age, eps, ecc, peri, eSin, eCos, epsAnom, eSq, incl, inclAnom]
      .map(v => typeof v === 'number' ? v.toString() : v)
      .join(','));
  }
  fs.writeFileSync(OUT_PATH, rows.join('\n') + '\n');
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Wrote ${rows.length - 1} rows to ${OUT_PATH} in ${dt}s`);

  // Quick sanity summary
  const ages2 = ages;
  const peek = (label, fn) => {
    const vals = ages2.map(age => fn(T0_CE - age * 1000.0));
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    console.log(`  ${label}: min=${mn.toFixed(6)}, max=${mx.toFixed(6)}, mean=${mean.toFixed(6)}`);
  };
  peek('ε(t) deg', y => OE.computeObliquityEarth(y));
  peek('e(t)    ', y => OE.computeEccentricityEarth(y));
  peek('ϖ(t) deg', y => OE.calcEarthPerihelionPredictive(y));
  peek('i(t) deg', y => OE.computeInclinationEarth(y));
}

main();
