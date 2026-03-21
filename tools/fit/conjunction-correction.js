#!/usr/bin/env node
/**
 * Two-stage conjunction correction — fits sin/cos terms at planet-specific
 * synodic periods to the residuals AFTER the main parallax correction.
 *
 * This bypasses the parallax tier system (which bundles conjunction terms
 * with unneeded parameters) by fitting only 2-4 coefficients per planet
 * directly to the remaining residuals.
 *
 * Usage:
 *   node tools/fit/conjunction-correction.js           # dry run
 *   node tools/fit/conjunction-correction.js --write   # update fitted-coefficients.json
 */

const fs = require('fs');
const path = require('path');
const { baseline } = require('../lib/optimizer');
const C = require('../lib/constants');

const d2r = Math.PI / 180;

// ─── Per-planet conjunction periods ─────────────────────────────────────
// Each entry: array of synodic periods (in years) to fit.
// Derived from dominant signals in residual Fourier analysis.

function computeSynodic(target1, target2) {
  const c1 = Math.round(C.totalDaysInH / C.planets[target1].solarYearInput);
  const c2 = Math.round(C.totalDaysInH / C.planets[target2].solarYearInput);
  const n1 = 360 / (C.H / c1);
  const n2 = 360 / (C.H / c2);
  return Math.abs(360 / (n1 - n2));
}

const conjConfig = {
  mars:    [computeSynodic('mars', 'jupiter'), 3 * computeSynodic('mars', 'venus')],
  jupiter: [computeSynodic('jupiter', 'neptune')],
  saturn:  [computeSynodic('saturn', 'jupiter'), 3 * computeSynodic('saturn', 'uranus')],
  uranus:  [computeSynodic('uranus', 'neptune')],
  neptune: [computeSynodic('neptune', 'jupiter'), computeSynodic('neptune', 'saturn')],
};

// Minimum amplitude to include a term (degrees)
const MIN_AMPLITUDE = 0.0005;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CONJUNCTION CORRECTION (two-stage, post-parallax)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Per-planet conjunction periods:');
for (const [planet, periods] of Object.entries(conjConfig)) {
  console.log(`  ${planet.padEnd(10)} ${periods.map(p => p.toFixed(4) + 'yr').join(', ')}`);
}
console.log('');

// ─── Fit conjunction correction per planet ───────────────────────────────

const corrections = {};

for (const [planet, periods] of Object.entries(conjConfig)) {
  const result = baseline(planet);
  const entries = result.entries;
  const n = entries.length;

  // Build design matrix: sin/cos for each period
  const m = periods.length * 2;
  const ATA = Array.from({ length: m }, () => new Float64Array(m));
  const ATbRA = new Float64Array(m);
  const ATbDec = new Float64Array(m);

  for (const e of entries) {
    const row = [];
    for (const T of periods) {
      const phase = 2 * Math.PI * (e.year - 2000) / T;
      row.push(Math.sin(phase), Math.cos(phase));
    }
    for (let j = 0; j < m; j++) {
      ATbRA[j] += row[j] * e.dRA;
      ATbDec[j] += row[j] * e.dDec;
      for (let k = j; k < m; k++) ATA[j][k] += row[j] * row[k];
    }
  }
  for (let j = 0; j < m; j++) for (let k = 0; k < j; k++) ATA[j][k] = ATA[k][j];

  // Cholesky solve
  const L = Array.from({ length: m }, () => new Float64Array(m));
  for (let i = 0; i < m; i++) for (let j = 0; j <= i; j++) {
    let s = ATA[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-20)) : s / L[j][j];
  }
  function solve(ATb) {
    const y = new Float64Array(m);
    for (let i = 0; i < m; i++) { let s = ATb[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    const x = new Float64Array(m);
    for (let i = m - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < m; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  }
  const xRA = solve(ATbRA);
  const xDec = solve(ATbDec);

  // Compute new RMS
  let ssRA = 0, ssDec = 0;
  for (const e of entries) {
    let cRA = 0, cDec = 0;
    for (let k = 0; k < periods.length; k++) {
      const phase = 2 * Math.PI * (e.year - 2000) / periods[k];
      cRA += xRA[2 * k] * Math.sin(phase) + xRA[2 * k + 1] * Math.cos(phase);
      cDec += xDec[2 * k] * Math.sin(phase) + xDec[2 * k + 1] * Math.cos(phase);
    }
    ssRA += (e.dRA - cRA) ** 2;
    ssDec += (e.dDec - cDec) ** 2;
  }
  const newRMS = Math.sqrt((ssRA + ssDec) / n);
  const improvement = result.rmsTotal - newRMS;

  // Build correction terms (only include significant amplitudes)
  const terms = [];
  let anySignificant = false;
  for (let k = 0; k < periods.length; k++) {
    const raAmp = Math.sqrt(xRA[2 * k] ** 2 + xRA[2 * k + 1] ** 2);
    const decAmp = Math.sqrt(xDec[2 * k] ** 2 + xDec[2 * k + 1] ** 2);
    const totalAmp = Math.sqrt(raAmp ** 2 + decAmp ** 2);
    const significant = totalAmp > MIN_AMPLITUDE;
    if (significant) anySignificant = true;
    terms.push({
      period: periods[k],
      raSin: xRA[2 * k], raCos: xRA[2 * k + 1],
      decSin: xDec[2 * k], decCos: xDec[2 * k + 1],
      raAmp, decAmp, totalAmp, significant,
    });
  }

  console.log(`${planet.toUpperCase()} (n=${n}):  RMS ${result.rmsTotal.toFixed(4)}° → ${newRMS.toFixed(4)}° (${improvement > 0.0005 ? '-' + (improvement / result.rmsTotal * 100).toFixed(0) + '%' : 'no change'})`);
  for (const t of terms) {
    console.log(`  T=${t.period.toFixed(2).padStart(7)}yr  RA: sin=${t.raSin.toFixed(6)} cos=${t.raCos.toFixed(6)} (amp=${t.raAmp.toFixed(4)}°)  Dec: sin=${t.decSin.toFixed(6)} cos=${t.decCos.toFixed(6)} (amp=${t.decAmp.toFixed(4)}°)${t.significant ? '' : '  [below threshold]'}`);
  }

  if (anySignificant) {
    const round6 = v => Math.round(v * 1000000) / 1000000;
    corrections[planet] = terms.filter(t => t.significant).map(t => ({
      period: round6(t.period),
      raSin: round6(t.raSin), raCos: round6(t.raCos),
      decSin: round6(t.decSin), decCos: round6(t.decCos),
    }));
  }
  console.log('');
}

// ─── Summary ────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

const planetCount = Object.keys(corrections).length;
const termCount = Object.values(corrections).reduce((s, v) => s + v.length, 0);
console.log(`${planetCount} planets with conjunction corrections, ${termCount} total terms\n`);

for (const [planet, terms] of Object.entries(corrections)) {
  console.log(`  ${planet}: ${terms.length} term(s) at ${terms.map(t => t.period.toFixed(2) + 'yr').join(', ')}`);
}

// ─── Write ──────────────────────────────────────────────────────────────

if (process.argv.includes('--write')) {
  const jsonPath = path.resolve(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
  const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  fc.CONJUNCTION_CORRECTION = corrections;
  fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
  console.log('\n✓ Written CONJUNCTION_CORRECTION to fitted-coefficients.json');
} else {
  console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
}
