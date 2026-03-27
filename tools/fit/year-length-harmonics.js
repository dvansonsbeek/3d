#!/usr/bin/env node
/**
 * Fit year-length harmonics from simulation data.
 *
 * Reads tropical, sidereal, and anomalistic year lengths from
 * data/02-solar-measurements.csv (stepYears-year steps over full H)
 * and fits Fourier harmonics to the residuals around the derived means.
 *
 * Produced constants:
 *   TROPICAL_YEAR_HARMONICS   — 3 harmonics (H/8, H/3, H/16)
 *   SIDEREAL_YEAR_HARMONICS   — 2 harmonics (H/8, H/3)
 *   ANOMALISTIC_YEAR_HARMONICS — 4 harmonics (H/8, H/3, H/16, H/24)
 *
 * Usage: node tools/fit/year-length-harmonics.js
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const CSV_PATH = path.join(__dirname, '..', '..', 'data', '02-solar-measurements.csv');

// ─── Read data from CSV ─────────────────────────────────────────────────
function loadData() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.trim().split('\n');
  const header = lines[0].split(',');
  const yearIdx = header.indexOf('Year');
  const tropIdx = header.indexOf('Mean Tropical Year');
  const sidIdx = header.indexOf('Mean Sidereal');
  const anomIdx = header.indexOf('Mean Anomalistic');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const year = parseFloat(parts[yearIdx]);
    const tropical = parseFloat(parts[tropIdx]);
    const sidereal = parseFloat(parts[sidIdx]);
    const anomalistic = parseFloat(parts[anomIdx]);
    if (!isNaN(year) && !isNaN(tropical) && !isNaN(sidereal) && !isNaN(anomalistic)) {
      rows.push({ year, tropical, sidereal, anomalistic });
    }
  }
  return rows;
}

// ─── Least squares harmonic fit ──────────────────────────────────────────
function fitHarmonics(data, meanField, meanValue, divisors) {
  const n = data.length;
  const m = divisors.length * 2;

  const A = new Array(n);
  const b = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const t = data[i].year - C.balancedYear;
    b[i] = data[i][meanField] - meanValue;
    A[i] = new Float64Array(m);
    for (let k = 0; k < divisors.length; k++) {
      const phase = 2 * Math.PI * t / (C.H / divisors[k]);
      A[i][2 * k] = Math.sin(phase);
      A[i][2 * k + 1] = Math.cos(phase);
    }
  }

  // Normal equations
  const ATA = new Array(m);
  const ATb = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    ATA[j] = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += A[i][j] * A[i][k];
      ATA[j][k] = s;
    }
    let s = 0;
    for (let i = 0; i < n; i++) s += A[i][j] * b[i];
    ATb[j] = s;
  }

  const x = solveCholesky(ATA, ATb, m);

  const harmonics = [];
  for (let k = 0; k < divisors.length; k++) {
    harmonics.push([divisors[k], x[2 * k], x[2 * k + 1]]);
  }

  // RMSE in seconds
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const t = data[i].year - C.balancedYear;
    let pred = meanValue;
    for (const [div, sinC, cosC] of harmonics) {
      const phase = 2 * Math.PI * t / (C.H / div);
      pred += sinC * Math.sin(phase) + cosC * Math.cos(phase);
    }
    const err = (data[i][meanField] - pred) * 86400; // seconds
    sse += err * err;
  }
  const rmse = Math.sqrt(sse / n);

  return { harmonics, rmse };
}

function solveCholesky(A, b, n) {
  const L = new Array(n);
  for (let i = 0; i < n; i++) L[i] = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(A[i][i] - s);
      else L[i][j] = (A[i][j] - s) / L[j][j];
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < i; k++) s += L[i][k] * y[k];
    y[i] = (b[i] - s) / L[i][i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = 0;
    for (let k = i + 1; k < n; k++) s += L[k][i] * x[k];
    x[i] = (y[i] - s) / L[i][i];
  }
  return x;
}

// ─── Greedy selection ────────────────────────────────────────────────────
function greedySelect(data, meanField, meanValue, baseDivisors, maxHarmonics) {
  let current = [...baseDivisors];
  let best = fitHarmonics(data, meanField, meanValue, current);
  console.log(`    Base (${current.length}): RMSE = ${best.rmse.toFixed(4)}s`);

  while (current.length < maxHarmonics) {
    let bestDiv = null;
    let bestRmse = best.rmse;

    for (let d = 2; d <= 55; d++) {
      if (current.includes(d)) continue;
      const test = fitHarmonics(data, meanField, meanValue, [...current, d]);
      if (test.rmse < bestRmse - 0.0001) { // require meaningful improvement
        bestRmse = test.rmse;
        bestDiv = d;
      }
    }

    if (bestDiv === null) break;
    current.push(bestDiv);
    current.sort((a, b) => a - b);
    best = fitHarmonics(data, meanField, meanValue, current);
    console.log(`    + H/${bestDiv}: RMSE = ${best.rmse.toFixed(4)}s [${current.join(',')}]`);
  }

  return { divisors: current, ...best };
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  YEAR-LENGTH HARMONIC FIT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nUsing constants.js: H=${C.H}, balancedYear=${C.balancedYear}`);
  console.log(`Means: tropical=${C.meanSolarYearDays}, sidereal=${C.meanSiderealYearDays}, anomalistic=${C.meanAnomalisticYearDays}`);

  console.log('\nLoading CSV data...');
  const data = loadData();
  console.log(`${data.length} data points, years ${data[0].year} to ${data[data.length-1].year}`);

  // ─── Tropical year ─────────────────────────────────────────────────
  console.log('\n── TROPICAL YEAR ──');
  const tropicalDivisors = [3, 8, 16]; // current set
  const tropical = fitHarmonics(data, 'tropical', C.meanSolarYearDays, tropicalDivisors);
  console.log(`  Current [${tropicalDivisors.join(',')}]: RMSE = ${tropical.rmse.toFixed(4)}s`);
  console.log('  Greedy:');
  const tropicalGreedy = greedySelect(data, 'tropical', C.meanSolarYearDays, [3, 8], 6);

  // ─── Sidereal year ─────────────────────────────────────────────────
  console.log('\n── SIDEREAL YEAR ──');
  const siderealDivisors = [3, 8]; // current set
  const sidereal = fitHarmonics(data, 'sidereal', C.meanSiderealYearDays, siderealDivisors);
  console.log(`  Current [${siderealDivisors.join(',')}]: RMSE = ${sidereal.rmse.toFixed(4)}s`);
  console.log('  Greedy:');
  const siderealGreedy = greedySelect(data, 'sidereal', C.meanSiderealYearDays, [3, 8], 6);

  // ─── Anomalistic year ──────────────────────────────────────────────
  console.log('\n── ANOMALISTIC YEAR ──');
  const anomDivisors = [3, 8, 16, 24]; // current set
  const anom = fitHarmonics(data, 'anomalistic', C.meanAnomalisticYearDays, anomDivisors);
  console.log(`  Current [${anomDivisors.join(',')}]: RMSE = ${anom.rmse.toFixed(4)}s`);
  console.log('  Greedy:');
  const anomGreedy = greedySelect(data, 'anomalistic', C.meanAnomalisticYearDays, [3, 8], 8);

  // ─── Output ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  COPY-PASTE OUTPUT');
  console.log('═══════════════════════════════════════════════════════════════');

  function printHarmonics(name, result) {
    console.log(`\nconst ${name} = [  // RMS = ${result.rmse.toFixed(3)} s`);
    for (const [div, sinC, cosC] of result.harmonics) {
      const amp = Math.sqrt(sinC * sinC + cosC * cosC) * 86400;
      console.log(`  [${String(div).padStart(2)},  ${sinC >= 0 ? '+' : ''}${sinC.toExponential(12)},  ${cosC >= 0 ? '+' : ''}${cosC.toExponential(12)}],  // H/${div}: ${amp.toFixed(3)}s amp`);
    }
    console.log('];');
  }

  printHarmonics('TROPICAL_YEAR_HARMONICS', tropicalGreedy);
  printHarmonics('SIDEREAL_YEAR_HARMONICS', siderealGreedy);
  printHarmonics('ANOMALISTIC_YEAR_HARMONICS', anomGreedy);

  // ─── Compare with current ──────────────────────────────────────────
  console.log('\n── Summary ──');
  console.log('Type         | Current RMSE | New RMSE | Harmonics');
  console.log(`Tropical     | ${tropical.rmse.toFixed(4)}s     | ${tropicalGreedy.rmse.toFixed(4)}s  | [${tropicalGreedy.divisors.join(',')}]`);
  console.log(`Sidereal     | ${sidereal.rmse.toFixed(4)}s     | ${siderealGreedy.rmse.toFixed(4)}s  | [${siderealGreedy.divisors.join(',')}]`);
  console.log(`Anomalistic  | ${anom.rmse.toFixed(4)}s     | ${anomGreedy.rmse.toFixed(4)}s  | [${anomGreedy.divisors.join(',')}]`);

  // ─── Write to fitted-coefficients.json if --write flag ──────────────
  if (process.argv.includes('--write')) {
    const jsonPath = path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
    const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    fc.TROPICAL_YEAR_HARMONICS = tropicalGreedy.harmonics.map(([div, s, c]) => [div, s, c]);
    fc.SIDEREAL_YEAR_HARMONICS = siderealGreedy.harmonics.map(([div, s, c]) => [div, s, c]);
    fc.ANOMALISTIC_YEAR_HARMONICS = anomGreedy.harmonics.map(([div, s, c]) => [div, s, c]);
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log('\n✓ Written TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS to fitted-coefficients.json');
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
