#!/usr/bin/env node
/**
 * Fit cardinal point JD harmonics from simulation data.
 *
 * Reads all 4 cardinal point types from data/02-cardinal-points.csv,
 * fits 12 Fourier harmonics per type to the JD residuals (after removing
 * the linear trend), and outputs copy-paste coefficients.
 *
 * The harmonics are self-corrected to return the exact anchor value at the
 * nearest grid year to J2000. When steps don't land on year 2000 exactly,
 * the anchors are shifted using IAU rates.
 *
 * Usage: node tools/fit/cardinal-point-harmonics.js
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const CSV_PATH = path.join(__dirname, '..', '..', 'data', '02-cardinal-points.csv');

// ─── Grid year and shifted anchors (from constants.js) ───────────────────
const GRID_YEAR = C.gridYear;
const DELTA_FROM_J2000 = C.gridYearDeltaFromJ2000;
const GRID_ANCHORS = C.cardinalPointAnchorsAtGrid;

// ─── Read CSV data by type ───────────────────────────────────────────────
function readData() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.trim().split('\n');
  console.log(`CSV: ${lines.length - 1} rows`);

  const byType = { SS: [], WS: [], VE: [], AE: [] };
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const type = parts[0];
    if (!byType[type]) continue;
    const year = parseFloat(parts[1]);
    const jd = parseFloat(parts[2]);
    const obliq = parseFloat(parts[4]);
    if (!isNaN(year) && !isNaN(jd)) {
      byType[type].push({ year, jd, obliq });
    }
  }
  return byType;
}

// ─── Least squares harmonic fit ──────────────────────────────────────────
// Uses IAU J2000 anchors directly. Self-corrected harmonics matching runtime.
// CSV data uses model years (integer + 0.5); we convert to calendar years
// to match the runtime's computeSolsticeJD(year) which takes calendar years.
// SS/WS/AE: calYear = modelYear - 0.5 (event in same calendar year)
// VE: calYear = modelYear + 0.5 (March wraps to next calendar year)
//
// Runtime formula: JD = anchor + mean × (year - 2000) + h(year) - h(2000)
function fitHarmonics(data, divisors, yearOffset) {
  const n = data.length;
  const m = divisors.length * 2;
  const anchor = data[0].anchor; // IAU J2000 anchor
  const t2000 = 2000 - C.balancedYear;

  const A = new Array(n);
  const b = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const calYear = data[i].year + yearOffset; // model year → calendar year
    b[i] = data[i].jd - (anchor + C.meanSolarYearDays * (calYear - 2000));
    A[i] = new Float64Array(m);
    const t = calYear - C.balancedYear;
    for (let k = 0; k < divisors.length; k++) {
      const phase = 2 * Math.PI * t / (C.H / divisors[k]);
      const phase0 = 2 * Math.PI * t2000 / (C.H / divisors[k]);
      A[i][2 * k] = Math.sin(phase) - Math.sin(phase0);
      A[i][2 * k + 1] = Math.cos(phase) - Math.cos(phase0);
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

  // Compute RMSE using the runtime formula with calendar years:
  //   JD = anchor + mean × (calYear - 2000) + h(calYear) - h(2000)
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const calYear = data[i].year + yearOffset;
    const t = calYear - C.balancedYear;
    let pred = anchor + C.meanSolarYearDays * (calYear - 2000);
    for (const [div, sinC, cosC] of harmonics) {
      const phase = 2 * Math.PI * t / (C.H / div);
      const phase0 = 2 * Math.PI * t2000 / (C.H / div);
      pred += sinC * (Math.sin(phase) - Math.sin(phase0))
            + cosC * (Math.cos(phase) - Math.cos(phase0));
    }
    const err = (data[i].jd - pred) * 24 * 60; // minutes
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

// ─── Greedy harmonic selection ───────────────────────────────────────────
function greedySelect(data, baseDivisors, maxHarmonics, candidateRange, yearOffset) {
  let currentDivisors = [...baseDivisors];
  let best = fitHarmonics(data, currentDivisors, yearOffset);

  console.log(`    Base (${currentDivisors.length}): RMSE = ${best.rmse.toFixed(2)} min`);

  while (currentDivisors.length < maxHarmonics) {
    let bestDiv = null;
    let bestRmse = best.rmse;

    for (let d = 2; d <= candidateRange; d++) {
      if (currentDivisors.includes(d)) continue;
      const test = fitHarmonics(data, [...currentDivisors, d], yearOffset);
      if (test.rmse < bestRmse) {
        bestRmse = test.rmse;
        bestDiv = d;
      }
    }

    if (bestDiv === null) break;
    currentDivisors.push(bestDiv);
    currentDivisors.sort((a, b) => a - b);
    best = fitHarmonics(data, currentDivisors, yearOffset);

    const h = best.harmonics.find(h => h[0] === bestDiv);
    const amp = Math.sqrt(h[1] ** 2 + h[2] ** 2);
    console.log(`    + H/${bestDiv} (amp=${amp.toFixed(3)}d): RMSE = ${best.rmse.toFixed(2)} min [${currentDivisors.join(',')}]`);
  }

  return { divisors: currentDivisors, ...best };
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CARDINAL POINT JD HARMONIC FIT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nUsing constants.js: H=${C.H}, balancedYear=${C.balancedYear}`);
  console.log(`meanSolarYearDays=${C.meanSolarYearDays}`);
  console.log(`Grid year (nearest to J2000): ${GRID_YEAR} (delta=${DELTA_FROM_J2000}yr)`);
  for (const [type, jd] of Object.entries(GRID_ANCHORS)) {
    console.log(`  ${type} anchor: J2000=${C.CARDINAL_POINT_ANCHORS[type].toFixed(3)} → grid=${jd.toFixed(3)}`);
  }

  const byType = readData();
  const types = ['SS', 'WS', 'VE', 'AE'];
  const fibDivisors = [3, 5, 8, 13, 16];
  const results = {};

  for (const type of types) {
    const anchor = C.ASTRO_REFERENCE.cardinalPointAnchors[type];
    // Model year → calendar year: VE wraps to next year (+0.5), others stay (-0.5)
    const yearOffset = type === 'VE' ? 0.5 : -0.5;
    const data = byType[type].map(d => ({ ...d, anchor }));
    console.log(`\n── ${type} (${data.length} points, J2000 anchor=${anchor.toFixed(3)}, yearOffset=${yearOffset}) ──`);

    // Fit with current divisors from constants.js
    const currentDivisors = C.CARDINAL_POINT_HARMONICS[type].map(h => h[0]);
    const current = fitHarmonics(data, currentDivisors, yearOffset);
    console.log(`  Current ${currentDivisors.length} harmonics [${currentDivisors.join(',')}]: RMSE = ${current.rmse.toFixed(2)} min`);

    // Greedy selection
    console.log('  Greedy selection:');
    const greedy = greedySelect(data, fibDivisors, 24, 120, yearOffset);
    console.log(`  Final: RMSE = ${greedy.rmse.toFixed(2)} min [${greedy.divisors.join(',')}]`);

    results[type] = { current, greedy, anchor, yearOffset };
  }

  // ─── Output ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  COPY-PASTE OUTPUT');
  console.log('═══════════════════════════════════════════════════════════════');

  const jsLines = [];
  jsLines.push('const CARDINAL_POINT_HARMONICS = {');
  console.log('\nconst CARDINAL_POINT_HARMONICS = {');
  for (const type of types) {
    const { greedy } = results[type];
    const hdr = `  ${type}: [  // RMSE = ${greedy.rmse.toFixed(1)} min over full H`;
    console.log(hdr);
    jsLines.push(hdr);
    for (const [div, sinC, cosC] of greedy.harmonics) {
      const amp = Math.sqrt(sinC * sinC + cosC * cosC);
      const label = [3,5,8,13,16].includes(div) ? ' [Fib]' :
        (div === 6 ? ' 2×(H/3)' : div === 11 ? ' H/3+H/8' :
         div === 19 ? ' H/3+H/16' : div === 24 ? ' H/8+H/16' :
         div === 32 ? ' 2×(H/16)' : '');
      const line = `    [${String(div).padStart(2)},  ${sinC >= 0 ? ' ' : ''}${sinC.toFixed(6)},  ${cosC >= 0 ? ' ' : ''}${cosC.toFixed(6)}],  // H/${div}  amp=${amp.toFixed(3)}d${label}`;
      console.log(line);
      jsLines.push(line);
    }
    console.log('  ],');
    jsLines.push('  ],');
  }
  console.log('};');
  jsLines.push('};');

  // Summary table
  console.log('\n── Summary ──');
  console.log('Type | Current RMSE | New RMSE | Divisors');
  for (const type of types) {
    const { current, greedy } = results[type];
    console.log(`  ${type} | ${current.rmse.toFixed(2)} min     | ${greedy.rmse.toFixed(2)} min  | [${greedy.divisors.join(',')}]`);
  }

  // ─── Adjusted J2000 anchors ─────────────────────────────────────────────
  // The fitted constant (anchorShift) absorbs the offset between IAU anchor
  // ─── J2000 anchors (IAU values, exact by construction) ──────────────────
  // At year 2000: h(2000) - h(2000) = 0, so JD = anchor. No adjustment needed.
  console.log(`\n── J2000 anchors (IAU, exact at year 2000) ──`);
  for (const type of types) {
    const anchor = C.ASTRO_REFERENCE.cardinalPointAnchors[type];
    const yearOffset = results[type].yearOffset;
    const calGrid = GRID_YEAR + yearOffset; // model year → calendar year
    const harmonics = results[type].greedy.harmonics;
    const gridRow = byType[type].find(d => d.year === GRID_YEAR);
    if (gridRow) {
      const t = calGrid - C.balancedYear;
      const t2000 = 2000 - C.balancedYear;
      let pred = anchor + C.meanSolarYearDays * (calGrid - 2000);
      for (const [div, sinC, cosC] of harmonics) {
        pred += sinC * (Math.sin(2 * Math.PI * t / (C.H / div)) - Math.sin(2 * Math.PI * t2000 / (C.H / div)))
              + cosC * (Math.cos(2 * Math.PI * t / (C.H / div)) - Math.cos(2 * Math.PI * t2000 / (C.H / div)));
      }
      const gridErr = (pred - gridRow.jd) * 24 * 60;
      console.log(`  ${type}: anchor=${anchor.toFixed(6)}, grid ${GRID_YEAR} err: ${gridErr.toFixed(2)} min`);
    }
  }

  // ─── Write to fitted-coefficients.json if --write flag is present ────
  if (process.argv.includes('--write')) {
    const jsonPath = path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
    const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const harmonicsObj = {};
    for (const type of types) {
      harmonicsObj[type] = results[type].greedy.harmonics;
    }
    fc.CARDINAL_POINT_HARMONICS = harmonicsObj;
    delete fc.CARDINAL_POINT_ANCHORS_ADJUSTED; // No longer needed — use IAU values directly
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log('\n  ✓ Written CARDINAL_POINT_HARMONICS to fitted-coefficients.json');
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
