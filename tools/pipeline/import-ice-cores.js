#!/usr/bin/env node
/**
 * import-ice-cores.js — plan 17 step 1: the Antarctic ice-core records the
 * Framework images panel's ice-core figure draws (data only — the model
 * predicts LR04 δ¹⁸O, not °C or ppm, and its curve sits on its own strip).
 *
 * Sources (NOAA NCEI / World Data Center for Paleoclimatology — US federal
 * open data, redistributable with citation; data/PROVENANCE.md):
 *   data/epica-domec-temperature-jouzel2007.txt
 *     Jouzel, J., et al. (2007), Orbital and millennial Antarctic climate
 *     variability over the past 800,000 years, Science 317, 793–796 —
 *     EPICA Dome C deuterium and the temperature anomaly from the last
 *     millennium mean (EDC3 age scale), 5,800 bags to 801,662 yr BP.
 *     https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007.txt
 *   data/vostok-deuterium-temperature-petit1999.txt
 *     Petit, J.R., et al. (1999), Climate and atmospheric history of the past
 *     420,000 years from the Vostok ice core, Nature 399, 429–436 — deuterium
 *     and the temperature anomaly ΔTs from present (GT4 ice age).
 *     https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/vostok/deutnat.txt
 *   data/vostok-co2-petit1999.txt
 *     Petit et al. (1999) — CO₂ on the GT4 gas age.
 *     https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/vostok/co2nat.txt
 * (The EPICA CO₂ composite, Bereiter et al. 2015, is the existing
 * public/input/epica-co2-data.json.)
 *
 * Output (governed: an `inputs` block, checked by check:artifacts):
 *   public/input/ice-core-data.json — ages in kyr BP (1950); the two
 *   temperature series binned to 0.5 kyr by linear interpolation (display
 *   resolution: the figure spans 400–800 kyr), the Vostok CO₂ at its native
 *   samples (283).
 *
 * Usage: node tools/pipeline/import-ice-cores.js --write
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildInputsBlock } = require('../lib/artifact-inputs.js');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = {
  edc: 'data/epica-domec-temperature-jouzel2007.txt',
  vostokT: 'data/vostok-deuterium-temperature-petit1999.txt',
  vostokCO2: 'data/vostok-co2-petit1999.txt',
};
const OUT = 'public/input/ice-core-data.json';
const SELF = 'tools/pipeline/import-ice-cores.js';
const BIN_KYR = 0.5;

/** Data rows after the header line that starts with `headerStart`; returns arrays of numbers per row. */
function readRows(rel, headerStart) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'latin1').split(/\r?\n/);
  const h = lines.findIndex((l) => l.trim().startsWith(headerStart));
  if (h < 0) throw new Error(`${rel}: header "${headerStart}" not found`);
  const rows = [];
  for (const l of lines.slice(h + 1)) {
    const t = l.trim();
    if (!t) continue;
    const cells = t.split(/\s+/).map(Number);
    if (cells.some((v) => !Number.isFinite(v))) continue;
    rows.push(cells);
  }
  return rows;
}

/** Linear interpolation of (x, y) onto a uniform grid over the data's span; x ascending. */
function bin(x, y, step) {
  const lo = Math.ceil(x[0] / step) * step, hi = Math.floor(x[x.length - 1] / step) * step;
  const gx = [], gy = [];
  let j = 0;
  for (let g = lo; g <= hi + 1e-9; g += step) {
    while (j < x.length - 2 && x[j + 1] < g) j++;
    const f = (g - x[j]) / (x[j + 1] - x[j]);
    gx.push(+g.toFixed(3));
    gy.push(+(y[j] + f * (y[j + 1] - y[j])).toFixed(3));
  }
  return { gx, gy };
}

function main() {
  // EPICA Dome C: Bag, ztop, Age (yr BP), Deuterium, Temperature — the first bags carry no temperature
  const edc = readRows(SRC.edc, 'Bag').filter((r) => r.length >= 5);
  const edcX = edc.map((r) => r[2] / 1000), edcY = edc.map((r) => r[4]);
  // Vostok: depth, ice age (GT4, yr BP), deut, deltaTS
  const vt = readRows(SRC.vostokT, 'Depth corrected').filter((r) => r.length >= 4);
  const vtX = vt.map((r) => r[1] / 1000), vtY = vt.map((r) => r[3]);
  // Vostok CO2: gas age (yr BP), CO2 (ppmv)
  const vc = readRows(SRC.vostokCO2, 'Gas age').filter((r) => r.length >= 2);

  const ascending = (x) => x.every((v, i) => i === 0 || v > x[i - 1]);
  if (!ascending(edcX) || !ascending(vtX)) throw new Error('ages are not strictly ascending — the binning assumes it');
  const edcB = bin(edcX, edcY, BIN_KYR), vtB = bin(vtX, vtY, BIN_KYR);

  const out = {
    _description: 'Antarctic ice-core records for the Framework images panel (plan 17): EPICA Dome C temperature (Jouzel et al. 2007), Vostok temperature and CO₂ (Petit et al. 1999), NOAA NCEI. Ages in kyr BP (1950). Temperatures are anomalies: EDC from the last-millennium mean, Vostok ΔTs from present. Data only — the model does not predict °C or ppm.',
    epicaDomeCTemperature: {
      source: 'Jouzel, J., et al. (2007), Science 317, 793–796 — EPICA Dome C, EDC3 age scale',
      doi: '10.1126/science.1141038',
      binningKyr: BIN_KYR, nSamples: edcB.gx.length,
      ageKyrBP: edcB.gx, temperatureAnomalyC: edcB.gy,
    },
    vostokTemperature: {
      source: 'Petit, J.R., et al. (1999), Nature 399, 429–436 — Vostok, GT4 ice age',
      doi: '10.1038/20859',
      binningKyr: BIN_KYR, nSamples: vtB.gx.length,
      ageKyrBP: vtB.gx, temperatureAnomalyC: vtB.gy,
    },
    vostokCO2: {
      source: 'Petit, J.R., et al. (1999), Nature 399, 429–436 — Vostok, GT4 gas age',
      doi: '10.1038/20859',
      nSamples: vc.length,
      ageKyrBP: vc.map((r) => +(r[0] / 1000).toFixed(3)), co2Ppm: vc.map((r) => r[1]),
    },
    inputs: buildInputsBlock(`node ${SELF} --write`, [SELF, SRC.edc, SRC.vostokT, SRC.vostokCO2]),
  };
  const summary = `EDC ${edc.length} → ${edcB.gx.length} bins to ${edcB.gx.at(-1)} kyr · Vostok T ${vt.length} → ${vtB.gx.length} bins to ${vtB.gx.at(-1)} kyr · Vostok CO₂ ${vc.length} samples to ${out.vostokCO2.ageKyrBP.at(-1)} kyr`;
  if (!process.argv.includes('--write')) { console.log(`${summary}\n(dry run — pass --write to write ${OUT})`); return; }
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(out) + '\n');
  console.log(`${summary}\nwrote ${OUT} (${(fs.statSync(path.join(ROOT, OUT)).size / 1024).toFixed(1)} KB)`);
}

main();
