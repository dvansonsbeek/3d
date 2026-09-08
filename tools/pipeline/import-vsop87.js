#!/usr/bin/env node
/**
 * import-vsop87.js — K8: ingest the VSOP87A planetary theory for the
 * STANDARD-MODEL REFERENCE OVERLAY (ghost bodies + live Δ readout).
 *
 * Source: Bretagnon & Francou (1988), A&A 202, 309 — VSOP87 version A
 * (heliocentric rectangular XYZ, dynamical ecliptic and equinox J2000),
 * distributed by CDS as catalogue VI/81 (freely redistributable with
 * attribution). This tool parses the eight body files, TRUNCATES each
 * Poisson series under an explicit, recorded error budget, and writes
 * the artifact's SINGLE home:
 *
 *   data/vsop87a-truncated.json — tracked, self-describing,
 *   PROVENANCE-covered; the @essrt/reference evaluator requires it
 *   directly (no embedded copy).
 *
 * TRUNCATION (recorded in meta): terms are dropped smallest-amplitude
 * first while sqrt(Σ dropped A²) · t_max^n stays under
 * PER_SERIES_BUDGET_AU per (body, coordinate, t-power) series, with
 * t_max = 4 (±4,000 yr — the theory's own precision span class). This is
 * an RMS-CLASS budget (incoherent-phase addition), not a worst-case
 * bound — the delivered accuracy is MEASURED, not asserted, by
 * tools/explore/k8-vsop-probe.mjs against the JPL Horizons cache, and
 * that measured number is the one to quote. Stored coefficients are
 * rounded (A 9 sig · B 9 sig · C 13 sig — phase/frequency rounding
 * ≤0.02″-class through ±4 kyr). Beyond ±4 kyr the t^n reweighting grows
 * the truncation and the overlay is a stated extrapolation of the
 * standard theory.
 *
 * K2/K8 BOUNDARY: this data serves the reference overlay ONLY — nothing
 * in the model chain may consume it. Comparison is the product.
 *
 * Usage:
 *   node tools/pipeline/import-vsop87.js --write [--src <dir>]
 *     --src: directory holding vsop87a.{mer,ven,ear,mar,jup,sat,ura,nep}
 *            (downloaded from https://cdsarc.cds.unistra.fr/ftp/VI/81/;
 *            the tool refuses to fetch itself — provenance is explicit)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildInputsBlock } = require('../lib/artifact-inputs.js');

const ROOT = path.resolve(__dirname, '..', '..');
const BODIES = [
  ['mer', 'mercury'], ['ven', 'venus'], ['ear', 'earth'], ['mar', 'mars'],
  ['jup', 'jupiter'], ['sat', 'saturn'], ['ura', 'uranus'], ['nep', 'neptune'],
];
const COORDS = ['x', 'y', 'z'];
const T_MAX = 4;                       // millennia from J2000 the budget is evaluated at
const PER_SERIES_BUDGET_AU = 6e-7;     // RMS-class dropped-quadrature budget per (coord, power) series

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const srcIdx = args.indexOf('--src');
const SRC = srcIdx >= 0 ? args[srcIdx + 1] : null;
if (!SRC || !WRITE) {
  console.error('Usage: node tools/pipeline/import-vsop87.js --write --src <dir with vsop87a.mer …>');
  process.exit(1);
}

/** Parse one VSOP87A body file into { coord: { power: [[A,B,C],…] } }. */
function parseBody(text) {
  const series = { x: {}, y: {}, z: {} };
  let coord = null, power = null;
  for (const line of text.split('\n')) {
    const header = line.match(/VSOP87 VERSION A1\s+\S+\s+VARIABLE (\d) \(XYZ\)\s+\*T\*\*(\d)/);
    if (header) {
      coord = COORDS[Number(header[1]) - 1];
      power = Number(header[2]);
      series[coord][power] = [];
      continue;
    }
    if (coord === null || line.trim() === '') continue;
    // Term line: the LAST THREE floats are A (amplitude, AU), B (phase, rad),
    // C (frequency, rad per thousand Julian years).
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const A = Number(parts[parts.length - 3]);
    const B = Number(parts[parts.length - 2]);
    const C = Number(parts[parts.length - 1]);
    if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C)) continue;
    series[coord][power].push([A, B, C]);
  }
  return series;
}

/** Truncate one series under the recorded RMS-class budget; returns [kept, total]. */
function truncateSeries(terms, power) {
  const total = terms.length;
  const sorted = [...terms].sort((a, b) => a[0] - b[0]);   // ascending amplitude
  let droppedSq = 0, cut = 0;
  const tPow = Math.pow(T_MAX, power);
  for (const t of sorted) {
    if (Math.sqrt(droppedSq + t[0] * t[0]) * tPow > PER_SERIES_BUDGET_AU) break;
    droppedSq += t[0] * t[0];
    cut++;
  }
  const keepSet = new Set(sorted.slice(cut));
  // Round stored coefficients (documented in meta; JSON size is the constraint).
  const kept = terms.filter((t) => keepSet.has(t))
    .map(([A, B, C]) => [Number(A.toPrecision(9)), Number(B.toPrecision(9)), Number(C.toPrecision(13))]);
  return [kept, total];
}

const bodies = {};
const sourceFiles = {};
let keptTotal = 0, termTotal = 0;
for (const [ext, name] of BODIES) {
  const file = path.join(SRC, `vsop87a.${ext}`);
  const text = fs.readFileSync(file, 'utf8');
  sourceFiles[`VSOP87A.${ext}`] = 'sha256:' + crypto.createHash('sha256').update(text).digest('hex');
  const parsed = parseBody(text);
  const out = { x: [], y: [], z: [] };
  for (const coord of COORDS) {
    for (let n = 0; n <= 5; n++) {
      const terms = parsed[coord][n] || [];
      const [kept, total] = truncateSeries(terms, n);
      out[coord].push(kept);
      keptTotal += kept.length;
      termTotal += total;
    }
  }
  bodies[name] = out;
  console.log(`  ${name.padEnd(8)} parsed`);
}
console.log(`  terms kept ${keptTotal} of ${termTotal} (t_max=${T_MAX} kyr·10³, budget ${PER_SERIES_BUDGET_AU} AU/series)`);

const meta = {
  theory: 'VSOP87 version A — heliocentric rectangular XYZ, dynamical ecliptic and equinox J2000',
  source: 'Bretagnon & Francou (1988), A&A 202, 309; CDS catalogue VI/81 (https://cdsarc.cds.unistra.fr/ftp/VI/81/)',
  evaluate: 'coord(t) = Σ_n t^n Σ_i A·cos(B + C·t), t = (JD − 2451545)/365250 (thousands of Julian years)',
  truncation: { tMaxThousandJulianYears: T_MAX, perSeriesBudgetAU: PER_SERIES_BUDGET_AU, keptTerms: keptTotal, totalTerms: termTotal },
  rawSourceSha256: sourceFiles,
  role: 'K8 standard-model reference overlay ONLY — one-way boundary, nothing in the model chain may consume this data',
};

const artifact = {
  _description: 'Truncated VSOP87A series (the standard analytic planetary theory) for the K8 standard-model reference overlay — ghost bodies + live model-vs-standard Δ readout. Reference data, not model content; the truncation budget and raw-source checksums are recorded in meta.',
  meta,
  bodies,
  inputs: buildInputsBlock('node tools/pipeline/import-vsop87.js --write --src <downloaded VI/81 files>', [
    'tools/pipeline/import-vsop87.js',
  ]),
};

const artPath = path.join(ROOT, 'data', 'vsop87a-truncated.json');
fs.writeFileSync(artPath, JSON.stringify(artifact) + '\n');
console.log(`✓ wrote data/vsop87a-truncated.json (${(fs.statSync(artPath).size / 1024).toFixed(0)} KB) — the single home; @essrt/reference evaluates it directly`);
