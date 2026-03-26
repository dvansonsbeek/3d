#!/usr/bin/env node
/**
 * Fit obliquity harmonics from cardinal point CSV data.
 *
 * Reads SS observations from data/02-cardinal-points.csv,
 * computes the Pythagorean obliquity mean from current parameters,
 * and fits 12 Fourier harmonics to the residuals via least squares.
 *
 * Usage: node tools/fit-obliquity-harmonics.js
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

// ─── Compute Pythagorean obliquity mean ──────────────────────────────────
// (Recompute here to verify it matches C.SOLSTICE_OBLIQUITY_MEAN)
function computePythagoreanMean() {
  const N = 100000;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p3 = 2 * Math.PI * t * 3, p5 = 2 * Math.PI * t * 5;
    const p8 = 2 * Math.PI * t * 8, p16 = 2 * Math.PI * t * 16;
    const e = C.earthtiltMean
      - C.earthInvPlaneInclinationAmplitude * Math.cos(p3)
      + C.earthInvPlaneInclinationAmplitude * Math.cos(p8);
    const pa = C.earthRAAngle * Math.cos(p16);
    const pb = C.earthInvPlaneInclinationMean * Math.sin(p5);
    sum += Math.sqrt(e * e + pa * pa + pb * pb);
  }
  return sum / N;
}

// ─── Read CSV data ───────────────────────────────────────────────────────
function readSSData() {
  const csvPath = path.join(__dirname, '..', '..', 'data', '02-cardinal-points.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.trim().split('\n');
  const header = lines[0];
  console.log(`CSV header: ${header}`);

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts[0] !== 'SS') continue;
    const year = parseFloat(parts[1]);
    const obliq = parseFloat(parts[4]);
    if (!isNaN(year) && !isNaN(obliq) && obliq > 0) {
      data.push({ year, obliq });
    }
  }
  return data;
}

// ─── Least squares harmonic fit ──────────────────────────────────────────
// Solves: residual[i] = Σ_k (sinC_k * sin(phase_k) + cosC_k * cos(phase_k))
// via normal equations: (A^T A) x = A^T b
function fitHarmonics(data, mean, divisors) {
  const n = data.length;
  const m = divisors.length * 2; // sin + cos per harmonic

  // Build design matrix A and target vector b
  const A = new Array(n);
  const b = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const t = data[i].year - C.balancedYear;
    const residual = data[i].obliq - mean;
    b[i] = residual;
    A[i] = new Float64Array(m);
    for (let k = 0; k < divisors.length; k++) {
      const phase = 2 * Math.PI * t / (C.H / divisors[k]);
      A[i][2 * k] = Math.sin(phase);
      A[i][2 * k + 1] = Math.cos(phase);
    }
  }

  // Compute A^T A (m×m) and A^T b (m×1)
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

  // Solve via Cholesky decomposition
  const x = solveCholesky(ATA, ATb, m);

  // Pack results
  const harmonics = [];
  for (let k = 0; k < divisors.length; k++) {
    harmonics.push([divisors[k], x[2 * k], x[2 * k + 1]]);
  }

  // Compute RMSE
  let sse = 0;
  for (let i = 0; i < n; i++) {
    let pred = mean;
    for (const [div, sinC, cosC] of harmonics) {
      const phase = 2 * Math.PI * (data[i].year - C.balancedYear) / (C.H / div);
      pred += sinC * Math.sin(phase) + cosC * Math.cos(phase);
    }
    const err = data[i].obliq - pred;
    sse += err * err;
  }
  const rmse = Math.sqrt(sse / n);

  return { harmonics, rmse };
}

// Cholesky solver for symmetric positive-definite A x = b
function solveCholesky(A, b, n) {
  // L L^T = A
  const L = new Array(n);
  for (let i = 0; i < n; i++) L[i] = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(A[i][i] - s);
      } else {
        L[i][j] = (A[i][j] - s) / L[j][j];
      }
    }
  }

  // Forward: L y = b
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < i; k++) s += L[i][k] * y[k];
    y[i] = (b[i] - s) / L[i][i];
  }

  // Backward: L^T x = y
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = 0;
    for (let k = i + 1; k < n; k++) s += L[k][i] * x[k];
    x[i] = (y[i] - s) / L[i][i];
  }

  return x;
}

// ─── Greedy harmonic selection ───────────────────────────────────────────
// Start with 5 Fibonacci fundamentals, then greedily add harmonics
function greedySelect(data, mean, baseDivisors, maxHarmonics, candidateRange) {
  let currentDivisors = [...baseDivisors];
  let best = fitHarmonics(data, mean, currentDivisors);

  console.log(`\n  Base (${currentDivisors.length} harmonics): RMSE = ${(best.rmse * 3600).toFixed(3)}"`);

  while (currentDivisors.length < maxHarmonics) {
    let bestDiv = null;
    let bestRmse = best.rmse;

    for (let d = 2; d <= candidateRange; d++) {
      if (currentDivisors.includes(d)) continue;
      const test = fitHarmonics(data, mean, [...currentDivisors, d]);
      if (test.rmse < bestRmse) {
        bestRmse = test.rmse;
        bestDiv = d;
      }
    }

    if (bestDiv === null) break;
    currentDivisors.push(bestDiv);
    currentDivisors.sort((a, b) => a - b);
    best = fitHarmonics(data, mean, currentDivisors);

    const amp = Math.sqrt(
      best.harmonics.find(h => h[0] === bestDiv)[1] ** 2 +
      best.harmonics.find(h => h[0] === bestDiv)[2] ** 2
    ) * 3600;
    console.log(`  + H/${bestDiv} (amp=${amp.toFixed(1)}"): RMSE = ${(best.rmse * 3600).toFixed(3)}" [${currentDivisors.join(',')}]`);
  }

  return { divisors: currentDivisors, ...best };
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OBLIQUITY HARMONIC FIT');
  console.log('═══════════════════════════════════════════════════════════════');

  console.log('\nModel parameters (from constants.js):');
  console.log(`  earthtiltMean                    = ${C.earthtiltMean}°`);
  console.log(`  earthInvPlaneInclinationAmplitude = ${C.earthInvPlaneInclinationAmplitude}°`);
  console.log(`  earthInvPlaneInclinationMean     = ${C.earthInvPlaneInclinationMean}°`);
  console.log(`  earthRAAngle (derived)           = ${C.earthRAAngle.toFixed(6)}°`);
  console.log(`  H                                = ${C.H}`);
  console.log(`  balancedYear                     = ${C.balancedYear}`);

  const pythagoreanMean = computePythagoreanMean();
  console.log(`\nPythagorean obliquity mean (time-average): ${pythagoreanMean.toFixed(8)}°`);

  const data = readSSData();
  console.log(`SS data points: ${data.length}`);
  console.log(`Year range: ${data[0].year} to ${data[data.length - 1].year}`);
  console.log(`Obliquity range: ${Math.min(...data.map(d => d.obliq)).toFixed(6)}° to ${Math.max(...data.map(d => d.obliq)).toFixed(6)}°`);

  // Compute mean obliquity from data (more accurate than Pythagorean for solstice fitting)
  let obliqSum = 0;
  for (const d of data) obliqSum += d.obliq;
  const obliqMean = obliqSum / data.length;
  console.log(`\nData-derived solstice mean:               ${obliqMean.toFixed(8)}°`);
  console.log(`Pythagorean mean:                          ${pythagoreanMean.toFixed(8)}°`);
  console.log(`Difference (Pythagorean − data):           ${((pythagoreanMean - obliqMean) * 3600).toFixed(3)}"`);
  console.log(`SOLSTICE_OBLIQUITY_MEAN (constants.js):     ${C.SOLSTICE_OBLIQUITY_MEAN.toFixed(8)}°`);

  // Compute raw residual stats
  let rawSSE = 0;
  for (const d of data) { rawSSE += (d.obliq - obliqMean) ** 2; }
  console.log(`Raw RMSE (mean only): ${(Math.sqrt(rawSSE / data.length) * 3600).toFixed(1)}"`);

  // ─── Fit with current 12 divisors ──────────────────────────────────
  const currentDivisors = C.SOLSTICE_OBLIQUITY_HARMONICS.map(h => h[0]);
  console.log(`\n── Fit with current ${currentDivisors.length} harmonics [${currentDivisors.join(',')}] ──`);
  const current = fitHarmonics(data, obliqMean, currentDivisors);
  console.log(`RMSE: ${(current.rmse * 3600).toFixed(3)}"`);
  console.log('\nCoefficients:');
  for (const [div, sinC, cosC] of current.harmonics) {
    const amp = Math.sqrt(sinC * sinC + cosC * cosC) * 3600;
    console.log(`  [${String(div).padStart(2)},  ${sinC >= 0 ? '+' : ''}${sinC.toFixed(8)},  ${cosC >= 0 ? '+' : ''}${cosC.toFixed(8)}],  // H/${div}  amp=${amp.toFixed(1)}"`);
  }

  // Compare old vs new coefficients
  console.log('\nCoefficient changes vs constants.js:');
  for (let k = 0; k < current.harmonics.length; k++) {
    const [div, sinC, cosC] = current.harmonics[k];
    const [, oldSin, oldCos] = C.SOLSTICE_OBLIQUITY_HARMONICS[k];
    const dSin = (sinC - oldSin) * 3600;
    const dCos = (cosC - oldCos) * 3600;
    if (Math.abs(dSin) > 0.01 || Math.abs(dCos) > 0.01) {
      console.log(`  H/${div}: Δsin=${dSin >= 0 ? '+' : ''}${dSin.toFixed(2)}", Δcos=${dCos >= 0 ? '+' : ''}${dCos.toFixed(2)}"`);
    }
  }

  // Check J2000 value
  const IAU_obliquity = C.ASTRO_REFERENCE.obliquityJ2000_deg;
  let obliq2000 = obliqMean;
  for (const [div, sinC, cosC] of current.harmonics) {
    const phase = 2 * Math.PI * (2000 - C.balancedYear) / (C.H / div);
    obliq2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  console.log(`\nObliquity at J2000: ${obliq2000.toFixed(6)}° (IAU 2006: ${IAU_obliquity}°)`);
  console.log(`J2000 error: ${((obliq2000 - IAU_obliquity) * 3600).toFixed(2)}"`);

  // ─── Greedy search for better harmonics ────────────────────────────
  console.log('\n── Greedy harmonic selection (start from 5 Fibonacci) ──');
  const fibDivisors = [3, 5, 8, 13, 16];
  const greedy = greedySelect(data, obliqMean, fibDivisors, 16, 120);

  console.log(`\nFinal (${greedy.divisors.length} harmonics): RMSE = ${(greedy.rmse * 3600).toFixed(3)}"`);
  console.log('\nCoefficients:');
  for (const [div, sinC, cosC] of greedy.harmonics) {
    const amp = Math.sqrt(sinC * sinC + cosC * cosC) * 3600;
    console.log(`  [${String(div).padStart(2)},  ${sinC >= 0 ? '+' : ''}${sinC.toFixed(8)},  ${cosC >= 0 ? '+' : ''}${cosC.toFixed(8)}],  // H/${div}  amp=${amp.toFixed(1)}"`);
  }

  // Check J2000 with greedy harmonics
  let obliq2000g = obliqMean;
  for (const [div, sinC, cosC] of greedy.harmonics) {
    const phase = 2 * Math.PI * (2000 - C.balancedYear) / (C.H / div);
    obliq2000g += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  console.log(`\nObliquity at J2000: ${obliq2000g.toFixed(6)}° (IAU 2006: ${IAU_obliquity}°)`);
  console.log(`J2000 error: ${((obliq2000g - IAU_obliquity) * 3600).toFixed(2)}"`);

  // ─── Output for copy-paste ─────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  COPY-PASTE OUTPUT (best fit)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n// Pythagorean obliquity mean: ${obliqMean.toFixed(6)}°`);
  console.log('const OBLIQUITY_HARMONICS = [');
  const lines = [];
  for (const [div, sinC, cosC] of greedy.harmonics) {
    const amp = Math.sqrt(sinC * sinC + cosC * cosC) * 3600;
    const label = [3,5,8,13,16].includes(div) ? ' [Fib]' :
      (div === 6 ? ' 2×(H/3)' : div === 11 ? ' H/3+H/8' :
       div === 19 ? ' H/3+H/16' : div === 24 ? ' H/8+H/16' :
       div === 32 ? ' 2×(H/16)' : '');
    const line = `  [${String(div).padStart(2)},  ${sinC >= 0 ? ' ' : ''}${sinC.toFixed(8)},  ${cosC >= 0 ? ' ' : ''}${cosC.toFixed(8)}],  // H/${div}  amp=${amp.toFixed(1)}"${label}`;
    console.log(line);
    lines.push(line);
  }
  console.log('];');

  // ─── Smart anchor: adjust mean so formula gives exact IAU obliquity at J2000 ──
  const IAU_J2000 = C.ASTRO_REFERENCE.obliquityJ2000_deg;

  // Evaluate harmonics at J2000
  let harmonicsAt2000 = 0;
  const t2000 = 2000 - C.balancedYear;
  for (const [div, sinC, cosC] of greedy.harmonics) {
    const phase = 2 * Math.PI * t2000 / (C.H / div);
    harmonicsAt2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }

  // Adjusted mean: MEAN = IAU_J2000 - harmonics(2000)
  // This guarantees: MEAN + harmonics(2000) = IAU_J2000 exactly
  const adjustedMean = IAU_J2000 - harmonicsAt2000;
  console.log(`\n── Smart anchor (J2000) ──`);
  console.log(`  IAU obliquity at J2000: ${IAU_J2000.toFixed(6)}°`);
  console.log(`  Harmonics at J2000:     ${(harmonicsAt2000 * 3600).toFixed(2)}"`);
  console.log(`  Data-derived mean:      ${obliqMean.toFixed(6)}°`);
  console.log(`  Adjusted mean:          ${adjustedMean.toFixed(6)}°`);
  console.log(`  Shift:                  ${((adjustedMean - obliqMean) * 3600).toFixed(2)}"`);

  // Verify: formula at J2000 should give exact IAU value
  const verifyJ2000 = adjustedMean + harmonicsAt2000;
  console.log(`  Verify at J2000:        ${verifyJ2000.toFixed(6)}° (IAU: ${IAU_J2000.toFixed(6)}°, diff: ${((verifyJ2000 - IAU_J2000) * 3600).toFixed(4)}")`);

  // Also check at grid year
  const gridYear = C.gridYear;
  const iauAtGrid = C.iauObliquityAtGrid;
  let harmonicsAtGrid = 0;
  const tGrid = gridYear - C.balancedYear;
  for (const [div, sinC, cosC] of greedy.harmonics) {
    const phase = 2 * Math.PI * tGrid / (C.H / div);
    harmonicsAtGrid += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  const verifyGrid = adjustedMean + harmonicsAtGrid;
  console.log(`  Verify at grid ${gridYear}: ${verifyGrid.toFixed(6)}° (IAU: ${iauAtGrid.toFixed(6)}°, diff: ${((verifyGrid - iauAtGrid) * 3600).toFixed(4)}")`);

  // ─── Write to fitted-coefficients.json if --write flag is present ────
  if (process.argv.includes('--write')) {
    const jsonPath = path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
    const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    fc.SOLSTICE_OBLIQUITY_MEAN_FITTED = adjustedMean;  // Smart anchor: IAU_J2000 - harmonics(2000)
    fc.SOLSTICE_OBLIQUITY_HARMONICS = greedy.harmonics;
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log(`\n  ✓ Written SOLSTICE_OBLIQUITY_MEAN_FITTED = ${adjustedMean.toFixed(8)}° to fitted-coefficients.json`);
    console.log('  ✓ Written SOLSTICE_OBLIQUITY_HARMONICS to fitted-coefficients.json');
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
