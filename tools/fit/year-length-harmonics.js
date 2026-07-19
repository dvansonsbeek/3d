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

// ─── Read and compute year lengths from raw solar measurements CSV ────────
// The CSV has 1-year step events: SS, WS, VE, AE, PERI, APH with JD and World Angle.
// We compute:
//   - Sidereal year: days × 360° / Δ(world-angle) at cardinal points
//   - Anomalistic year: mean of perihelion + aphelion intervals
// Tropical year is derived from cardinal point harmonics (step 6c), not fitted here.
function loadData() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.trim().split('\n');
  console.log(`CSV: ${lines.length - 1} rows`);

  // Parse raw events by type
  const byType = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const type = parts[0];
    const year = parseFloat(parts[1]);
    const jd = parseFloat(parts[2]);
    const wa = parseFloat(parts[5]);  // World Angle (deg)
    if (!byType[type]) byType[type] = [];
    byType[type].push({ year, jd, wa });
  }

  // Downsample by stepYears, J2000-anchored (filter (year - 2000) % step === 0
  // so year 2000 lands on the sampling line regardless of CSV coverage).
  // step must divide H evenly for phase closure — see pickStepYears in constants.js.
  const step = C.stepYears || 20;
  const sampled = {};
  for (const type of Object.keys(byType)) {
    sampled[type] = byType[type].filter(row => ((row.year - 2000) % step + step) % step === 0);
  }
  console.log(`Downsampled by ${step} (J2000-anchored): ${sampled.SS.length} points per type`);

  // Compute year lengths from consecutive events
  const cardinals = ['SS', 'WS', 'VE', 'AE'];
  const rows = [];

  for (let i = 1; i < sampled.SS.length; i++) {
    const year = sampled.SS[i].year;

    // Sidereal year: mean of 4 cardinal point world-angle advancements
    let sidValues = [];
    for (const type of cardinals) {
      const curr = sampled[type][i];
      const prev = sampled[type][i - 1];
      if (!curr || !prev) continue;
      const djd = curr.jd - prev.jd;
      let dwa = curr.wa - prev.wa;
      while (dwa < 0) dwa += 360;
      // Sun moves clockwise: in step tropical years, sidereal motion < step×360°
      sidValues.push(djd * 360 / (step * 360 - dwa));
    }
    const sidereal = sidValues.length === 4 ? sidValues.reduce((a, b) => a + b) / 4 : NaN;

    // Anomalistic year: mean of perihelion + aphelion intervals
    const periCurr = sampled.PERI[i];
    const periPrev = sampled.PERI[i - 1];
    const aphCurr = sampled.APH[i];
    const aphPrev = sampled.APH[i - 1];
    const periInt = (periCurr && periPrev) ? periCurr.jd - periPrev.jd : NaN;
    const aphInt = (aphCurr && aphPrev) ? aphCurr.jd - aphPrev.jd : NaN;
    const anomalistic = (!isNaN(periInt) && !isNaN(aphInt)) ? (periInt + aphInt) / (2 * step) : NaN;

    // Tropical year: mean of 4 cardinal point JD intervals
    let tropValues = [];
    for (const type of cardinals) {
      const curr = sampled[type][i];
      const prev = sampled[type][i - 1];
      if (curr && prev) tropValues.push((curr.jd - prev.jd) / step);
    }
    const tropical = tropValues.length === 4 ? tropValues.reduce((a, b) => a + b) / 4 : NaN;

    if (!isNaN(sidereal) && !isNaN(anomalistic) && !isNaN(tropical)) {
      rows.push({ year, tropical, sidereal, anomalistic });
    }
  }

  // Also compute the 1-year interval at year 2000 from the RAW (undownsampled)
  // event stream — used for the `YEAR_LENGTH_J2000_ANCHOR` display constant.
  // The step-N-averaged values in `rows[]` are appropriate for the harmonic FIT
  // (matched sample rate → matched Fourier basis) but centered ~year 1988.5 for
  // step=23, so they differ from the year-2000 instantaneous measurement by
  // ~0.05 s (tropical) / 0.006 s (sidereal) / 0.03 s (anomalistic). Users
  // comparing the `YEAR_LENGTH_J2000_ANCHOR` to IAU J2000 constants or to the
  // XLSX report's row-2000 measurement want the 1-year value, not the step-N
  // average. Runtime `computeLengthof*Year(2000)` then reproduces this
  // measurement exactly (self-corrected Fourier form).
  const oneYearAnchor = compute1YearAnchor(byType, 2000);

  return { rows, oneYearAnchor };
}

// Compute year-length values at `anchorYear` using the 1-year interval
// (anchorYear-1 → anchorYear) from the raw event stream `byType`. Mirrors the
// per-row math above but with step=1 and drawing from `byType` directly rather
// than the step-N-downsampled `sampled[]`.
function compute1YearAnchor(byType, anchorYear) {
  const cardinals = ['SS', 'WS', 'VE', 'AE'];
  const findRow = (type, year) => byType[type].find(r => r.year === year);

  const trop = [], sid = [];
  for (const type of cardinals) {
    const curr = findRow(type, anchorYear);
    const prev = findRow(type, anchorYear - 1);
    if (!curr || !prev) return null;
    const djd = curr.jd - prev.jd;
    trop.push(djd);
    let dwa = curr.wa - prev.wa;
    while (dwa < 0) dwa += 360;
    sid.push(djd * 360 / (360 - dwa));  // step=1 form
  }
  const tropical = trop.reduce((a, b) => a + b) / 4;
  const sidereal = sid.reduce((a, b) => a + b) / 4;

  const periCurr = findRow('PERI', anchorYear);
  const periPrev = findRow('PERI', anchorYear - 1);
  const aphCurr  = findRow('APH',  anchorYear);
  const aphPrev  = findRow('APH',  anchorYear - 1);
  if (!periCurr || !periPrev || !aphCurr || !aphPrev) return null;
  const anomalistic = ((periCurr.jd - periPrev.jd) + (aphCurr.jd - aphPrev.jd)) / 2;

  return { anchorYear, tropical, sidereal, anomalistic };
}

// ─── J2000-anchored least-squares harmonic fit ──────────────────────────
//
// The fit produces harmonics such that at year = anchorYear the fit's value
// EXACTLY equals `anchorValue` (the measured J2000 value from CSV). Away from
// J2000, harmonics capture the year-to-year variation.
//
// Formula: fit(year) = anchorValue
//                    + Σ [A_n × (sin(phase(year)) − sin(phase(anchorYear)))
//                       + B_n × (cos(phase(year)) − cos(phase(anchorYear)))]
//
// At year = anchorYear both sin/cos differences are zero → fit = anchorValue.
// This mirrors cardinal-point-harmonics.js's J2000-anchored basis.
function fitHarmonicsJ2000Anchored(data, meanField, anchorValue, anchorYear, divisors) {
  const n = data.length;
  const m = divisors.length * 2;

  const A = new Array(n);
  const b = new Float64Array(n);
  const tRef = anchorYear - C.balancedYear;

  for (let i = 0; i < n; i++) {
    const t = data[i].year - C.balancedYear;
    b[i] = data[i][meanField] - anchorValue;
    A[i] = new Float64Array(m);
    for (let k = 0; k < divisors.length; k++) {
      const omega = 2 * Math.PI * divisors[k] / C.H;
      const phase = omega * t;
      const phase0 = omega * tRef;
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

  // RMSE in seconds (relative to anchor form)
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const t = data[i].year - C.balancedYear;
    let pred = anchorValue;
    for (const [div, sinC, cosC] of harmonics) {
      const omega = 2 * Math.PI * div / C.H;
      const phase = omega * t;
      const phase0 = omega * tRef;
      pred += sinC * (Math.sin(phase) - Math.sin(phase0))
            + cosC * (Math.cos(phase) - Math.cos(phase0));
    }
    const err = (data[i][meanField] - pred) * 86400; // seconds
    sse += err * err;
  }
  const rmse = Math.sqrt(sse / n);

  return { harmonics, rmse, anchorValue, anchorYear };
}

// Backwards-compat wrapper: fits with base = meanValue (unchanged old behavior).
// Kept so any other callers/scripts that import this file still work.
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

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const t = data[i].year - C.balancedYear;
    let pred = meanValue;
    for (const [div, sinC, cosC] of harmonics) {
      const phase = 2 * Math.PI * t / (C.H / div);
      pred += sinC * Math.sin(phase) + cosC * Math.cos(phase);
    }
    const err = (data[i][meanField] - pred) * 86400;
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

// ─── Greedy selection (J2000-anchored) ───────────────────────────────────
function greedySelect(data, meanField, anchorValue, anchorYear, baseDivisors, maxHarmonics) {
  let current = [...baseDivisors];
  let best = fitHarmonicsJ2000Anchored(data, meanField, anchorValue, anchorYear, current);
  console.log(`    Base (${current.length}): RMSE = ${best.rmse.toFixed(4)}s`);

  while (current.length < maxHarmonics) {
    let bestDiv = null;
    let bestRmse = best.rmse;

    for (let d = 2; d <= 55; d++) {
      if (current.includes(d)) continue;
      const test = fitHarmonicsJ2000Anchored(data, meanField, anchorValue, anchorYear, [...current, d]);
      if (test.rmse < bestRmse - 0.0001) { // require meaningful improvement
        bestRmse = test.rmse;
        bestDiv = d;
      }
    }

    if (bestDiv === null) break;
    current.push(bestDiv);
    current.sort((a, b) => a - b);
    best = fitHarmonicsJ2000Anchored(data, meanField, anchorValue, anchorYear, current);
    console.log(`    + H/${bestDiv}: RMSE = ${best.rmse.toFixed(4)}s [${current.join(',')}]`);
  }

  return { divisors: current, ...best };
}

// ─── J2000 anchor = CSV year-2000 direct value ────────────────────────
// The anchor is the DIRECT MEASUREMENT at year 2000 from the CSV (mean of
// 4 cardinal points, step=stepYears window). Under the J2000-anchored
// Fourier basis, fit(year=2000) = anchor exactly — so the tweakpane display
// at year 2000 reproduces the CSV measurement (not the CSV mean over full H).
//
// Previous behavior: anchor = mean over full H cycle. Residual at year 2000
// was ~1.4e-6 days (Fourier ripple offset of specific year vs mean-over-cycle),
// which propagated to a ~0.3 ms LOD discrepancy in the tweakpane display.
// Users comparing tweakpane values to CSV measurements would see this gap.
//
// New behavior: anchor = year-2000 CSV value. fit(year=2000) reproduces the
// measurement exactly (to Fourier residual precision). Away from J2000, fit
// values still approximate the CSV time series via the harmonic coefficients.
//
// The H/13 identity is preserved conceptually — the framework's structural
// claim T_sid = T_trop × H/(H-13) still holds as an over-cycle-mean identity,
// just no longer as the fit's local baseline.
function extractJ2000Anchors(data, oneYearAnchor) {
  if (!oneYearAnchor) {
    throw new Error(`No 1-year interval anchor available (need year-1999 + year-2000 rows in CSV).`);
  }
  const { anchorYear, tropical: tropicalJ2000, sidereal: siderealJ2000, anomalistic: anomalisticJ2000 } = oneYearAnchor;

  // Reference: step-N mean row at year 2000 (informational, for comparison)
  const stepRow = data.find(r => r.year === anchorYear);
  const n = data.length;
  const meanTrop = data.reduce((s, r) => s + r.tropical, 0) / n;
  const meanSid  = data.reduce((s, r) => s + r.sidereal, 0) / n;
  const meanAnom = data.reduce((s, r) => s + r.anomalistic, 0) / n;

  console.log(`  Anchor = 1-year interval (year ${anchorYear-1} → ${anchorYear}), mean of 4 CPs`);
  console.log(`    tropical:    ${tropicalJ2000.toFixed(9)}   (step-${C.stepYears} avg at year ${anchorYear}: ${stepRow ? stepRow.tropical.toFixed(9) : 'n/a'}, mean over full H: ${meanTrop.toFixed(9)})`);
  console.log(`    sidereal:    ${siderealJ2000.toFixed(9)}   (step-${C.stepYears} avg at year ${anchorYear}: ${stepRow ? stepRow.sidereal.toFixed(9) : 'n/a'}, mean over full H: ${meanSid.toFixed(9)})`);
  console.log(`    anomalistic: ${anomalisticJ2000.toFixed(9)}   (step-${C.stepYears} avg at year ${anchorYear}: ${stepRow ? stepRow.anomalistic.toFixed(9) : 'n/a'}, mean over full H: ${meanAnom.toFixed(9)})`);
  console.log(`  H/13 identity check: sid × (H-13)/H = ${(siderealJ2000 * (C.H - 13) / C.H).toFixed(9)}  vs tropical: ${tropicalJ2000.toFixed(9)}`);

  return { anchorYear, tropicalJ2000, siderealJ2000, anomalisticJ2000 };
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  YEAR-LENGTH HARMONIC FIT (J2000-anchored)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nUsing constants.js: H=${C.H}, balancedYear=${C.balancedYear}`);

  console.log('\nLoading CSV data...');
  const { rows: data, oneYearAnchor } = loadData();
  console.log(`${data.length} data points, years ${data[0].year} to ${data[data.length-1].year}`);

  // Auto-extract J2000 anchor values from the CSV — no manual intervention needed.
  // The fits below produce harmonics that reproduce these measured J2000 values
  // EXACTLY at year = anchorYear, with year-to-year variation captured by Fourier.
  console.log('\n── J2000 anchor extraction from step 6a CSV ──');
  const anchors = extractJ2000Anchors(data, oneYearAnchor);

  // ─── Tropical year (J2000-anchored) ───────────────────────────────
  console.log('\n── TROPICAL YEAR ──');
  const tropicalDivisors = [3, 8, 16]; // current set
  const tropical = fitHarmonicsJ2000Anchored(data, 'tropical', anchors.tropicalJ2000, anchors.anchorYear, tropicalDivisors);
  console.log(`  Current [${tropicalDivisors.join(',')}]: RMSE = ${tropical.rmse.toFixed(4)}s`);
  console.log('  Greedy:');
  const tropicalGreedy = greedySelect(data, 'tropical', anchors.tropicalJ2000, anchors.anchorYear, [3, 8], 12);

  // ─── Sidereal year (J2000-anchored) ───────────────────────────────
  console.log('\n── SIDEREAL YEAR ──');
  const siderealDivisors = [3, 8]; // current set
  const sidereal = fitHarmonicsJ2000Anchored(data, 'sidereal', anchors.siderealJ2000, anchors.anchorYear, siderealDivisors);
  console.log(`  Current [${siderealDivisors.join(',')}]: RMSE = ${sidereal.rmse.toFixed(4)}s`);
  console.log('  Greedy:');
  const siderealGreedy = greedySelect(data, 'sidereal', anchors.siderealJ2000, anchors.anchorYear, [3, 8], 6);

  // ─── Anomalistic year (J2000-anchored) ────────────────────────────
  console.log('\n── ANOMALISTIC YEAR ──');
  const anomDivisors = [3, 8, 16, 24]; // current set
  const anom = fitHarmonicsJ2000Anchored(data, 'anomalistic', anchors.anomalisticJ2000, anchors.anchorYear, anomDivisors);
  console.log(`  Current [${anomDivisors.join(',')}]: RMSE = ${anom.rmse.toFixed(4)}s`);
  console.log('  Greedy:');
  const anomGreedy = greedySelect(data, 'anomalistic', anchors.anomalisticJ2000, anchors.anchorYear, [3, 8], 8);

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
    // J2000 anchor values (from CSV, used as Fourier baseline in runtime).
    // These make `computeLengthof*Year(2000)` reproduce step-6a's measurement exactly.
    fc.YEAR_LENGTH_J2000_ANCHOR = {
      anchorYear: anchors.anchorYear,
      tropical: anchors.tropicalJ2000,
      sidereal: anchors.siderealJ2000,
      anomalistic: anchors.anomalisticJ2000,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log('\n✓ Written TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS to fitted-coefficients.json');
    console.log('✓ Written YEAR_LENGTH_J2000_ANCHOR (anchorYear + tropical/sidereal/anomalistic J2000 values)');
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
