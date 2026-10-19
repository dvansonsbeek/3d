#!/usr/bin/env node
/**
 * import-astrogeo22.js — plan 12 (option A): the Earth–Moon distance history
 * is a CITED PHYSICAL INPUT, not a fit.
 *
 * Source: AstroGeo22, "a 4.429 Ga Lunar ephemeris" — the published solution
 * of Farhat, M., Auclair-Desrotour, P., Boué, G., Laskar, J. (2022), "The
 * resonant tidal evolution of the Earth-Moon distance", A&A 665, L1
 * (https://doi.org/10.1051/0004-6361/202243445), distributed by the AstroGeo
 * project (https://astrogeo.eu/?page_id=553):
 *   http://www.astrogeo.eu/wp-content/uploads/2022/11/AstroGeo22.txt
 *   http://www.astrogeo.eu/wp-content/uploads/2022/11/AstroGeo22_README.txt
 * Age 0 (J2000) → 4.429 Ga at 1 Myr steps; per row the Earth–Moon semi-major
 * axis in Earth radii (R⊕ = 6378.1366 km, INPOP21 — the README's note 1) with
 * its uncertainty interval, and the solution's length of the solar day,
 * obliquity and luni-solar precession with their intervals. Farhat's model is
 * an ocean-tide dissipation history (hemispherical and global ocean models,
 * resonance crossings) fitted to two constraints only: the present LLR
 * recession rate and the lunar age. No licence is stated on the page; the
 * data are published research results, redistributed here with citation
 * (data/PROVENANCE.md).
 *
 * WHAT THE MODEL READS: the distance column as the RATIO a(t)/a(0) — the model
 * keeps its own J2000 anchor (the observed mean distance; Farhat's a is the
 * Keplerian semi-major axis, 383,598 km at J2000) and takes the SHAPE of the
 * history (packages/physics/src/deltat/moon-distance-history.cjs). The LOD,
 * obliquity and precession columns are carried as the cross-check they are:
 * the model derives its own from the distance by angular-momentum
 * conservation and the composed precession law; the gate rows compare.
 *
 * Output (the governed artifact; the constants generator embeds the distance
 * table into @essrt/physics as moon-distance-artifact.cjs):
 *   data/astrogeo22-earth-moon.json
 *
 * Usage: node tools/pipeline/import-astrogeo22.js --write [--src DIR]
 *   --src DIR   directory holding AstroGeo22.txt + AstroGeo22_README.txt
 *               (default data/.cache/astrogeo22 — gitignored; fetched by hand
 *               or by this script with --fetch)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildInputsBlock } = require('../lib/artifact-inputs.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SRC = path.join(ROOT, 'data', '.cache', 'astrogeo22');
const OUT = path.join(ROOT, 'data', 'astrogeo22-earth-moon.json');
const URLS = {
  data: 'http://www.astrogeo.eu/wp-content/uploads/2022/11/AstroGeo22.txt',
  readme: 'http://www.astrogeo.eu/wp-content/uploads/2022/11/AstroGeo22_README.txt',
};
const EARTH_RADIUS_KM = 6378.1366;   // the README's note (1): INPOP21

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const srcIdx = argv.indexOf('--src');
const SRC = srcIdx >= 0 ? path.resolve(argv[srcIdx + 1]) : DEFAULT_SRC;
if (!WRITE) {
  console.error('Usage: node tools/pipeline/import-astrogeo22.js --write [--src DIR] [--fetch]');
  process.exit(1);
}

async function main() {
  fs.mkdirSync(SRC, { recursive: true });
  const dataPath = path.join(SRC, 'AstroGeo22.txt');
  const readmePath = path.join(SRC, 'AstroGeo22_README.txt');
  if (argv.includes('--fetch') || !fs.existsSync(dataPath) || !fs.existsSync(readmePath)) {
    for (const [k, url] of Object.entries(URLS)) {
      const res = await fetch(url, { headers: { 'User-Agent': 'essrt-import/1.0' } });
      if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
      fs.writeFileSync(k === 'data' ? dataPath : readmePath, await res.text());
    }
  }
  const raw = fs.readFileSync(dataPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const lines = raw.trim().split('\n');
  const header = lines[0].trim().split(/\s+/);
  const expectHeader = ['T(Ga)', 'a', '(RE)', 'amin', 'amax', 'lod', 'lodmin', 'lodmax', 'obli', 'oblimin', 'oblimax', 'pre', 'premin', 'premax'];
  if (header.join(' ') !== expectHeader.join(' ')) throw new Error(`unexpected header: ${lines[0]}`);
  const cols = { ageMa: [], aEarthRadii: [], aMinEarthRadii: [], aMaxEarthRadii: [], lodHours: [], lodMinHours: [], lodMaxHours: [],
    obliquityDeg: [], obliquityMinDeg: [], obliquityMaxDeg: [], precessionArcsecPerYr: [], precessionMinArcsecPerYr: [], precessionMaxArcsecPerYr: [] };
  const keys = Object.keys(cols);
  for (const line of lines.slice(1)) {
    const v = line.trim().split(/\s+/).map(Number);
    if (v.length !== 13 || v.some((x) => !Number.isFinite(x))) throw new Error(`bad row: ${line}`);
    cols.ageMa.push(Math.round(v[0] * 1000));
    for (let i = 1; i < 13; i++) cols[keys[i]].push(v[i]);
  }
  // Monotone age grid at 1 Myr, 0 → 4429; the distance monotone into the past.
  for (let i = 1; i < cols.ageMa.length; i++) {
    if (cols.ageMa[i] !== cols.ageMa[i - 1] + 1) throw new Error(`age grid breaks at row ${i}`);
    if (cols.aEarthRadii[i] > cols.aEarthRadii[i - 1]) throw new Error(`distance not monotone at ${cols.ageMa[i]} Ma`);
  }
  const sha = (/** @type {string} */ s) => 'sha256:' + crypto.createHash('sha256').update(s).digest('hex');
  const n = cols.ageMa.length;
  const artifact = {
    _description: 'The Earth–Moon distance history the model reads as a CITED PHYSICAL INPUT (plan 12, option A): the AstroGeo22 lunar ephemeris — Farhat, Auclair-Desrotour, Boué & Laskar 2022, A&A 665, L1, doi:10.1051/0004-6361/202243445 — age 0 (J2000) → 4,429 Ma at 1 Myr, the semi-major axis in Earth radii (R⊕ = 6378.1366 km) with its uncertainty interval, plus the solution\'s own length of day, obliquity and luni-solar precession columns (cross-checks: the model derives its own from the distance). The model reads the distance as the RATIO a(t)/a(0) on its own J2000 anchor (the observed mean distance), with the J2000 slope the LLR observation — packages/physics/src/deltat/moon-distance-history.cjs. Values VERBATIM from the source file (F12.6).',
    source: {
      citation: 'Farhat, M., Auclair-Desrotour, P., Boué, G., Laskar, J. (2022). The resonant tidal evolution of the Earth-Moon distance. Astronomy & Astrophysics, 665, L1.',
      doi: '10.1051/0004-6361/202243445',
      distributor: 'AstroGeo project, https://astrogeo.eu/?page_id=553 ("AstroGeo22 : a 4.429 Ga Lunar ephemeris")',
      urls: URLS,
      licence: 'not stated on the distributor\'s page; published research data redistributed with citation (data/PROVENANCE.md)',
      fileSha256: { data: sha(raw), readme: sha(readme) },
      readmeVerbatim: readme,
    },
    earthRadiusKm: EARTH_RADIUS_KM,
    ageStepMa: 1,
    rows: n,
    spanMa: cols.ageMa[n - 1],
    aEarthRadiiAtJ2000: cols.aEarthRadii[0],
    columns: cols,
    inputs: buildInputsBlock('node tools/pipeline/import-astrogeo22.js --write', [
      'tools/pipeline/import-astrogeo22.js',
      path.relative(ROOT, dataPath).split(path.sep).join('/'),
      path.relative(ROOT, readmePath).split(path.sep).join('/'),
    ]),
  };
  fs.writeFileSync(OUT, `${JSON.stringify(artifact)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${n} rows, 0–${artifact.spanMa} Ma, a(0) = ${cols.aEarthRadii[0]} R⊕ = ${(cols.aEarthRadii[0] * EARTH_RADIUS_KM).toFixed(1)} km, a(end) = ${cols.aEarthRadii[n - 1]} R⊕`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
