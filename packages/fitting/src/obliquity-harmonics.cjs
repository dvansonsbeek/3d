#!/usr/bin/env node
/**
 * Fit obliquity harmonics from cardinal point CSV data.
 *
 * Reads SS observations from data/02-solar-measurements.csv,
 * computes the Pythagorean obliquity mean from current parameters,
 * and fits 12 Fourier harmonics to the residuals via least squares.
 *
 * Usage: node tools/fit-obliquity-harmonics.js
 */

const fs = require('fs');
const path = require('path');
// 9-3d: moved from tools/fit (shim remains); tools/lib via the runtime bridge.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const TOOLS_LIB = path.join(ROOT, 'tools', 'lib');
const C = require(path.join(TOOLS_LIB, 'constants.js'));

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
  const csvPath = path.join(ROOT, 'data', '02-solar-measurements.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.trim().split('\n');
  const header = lines[0];
  console.log(`CSV header: ${header}`);

  // Phase is built HERE from each row's JD, on the SI-YEAR axis
  // (`_jdToSIyear`, JD / 365.24189). That is the axis the scene's precession
  // rotations run on at moveModel, and the obliquity in this CSV is a
  // measurement OF that geometry — so it is the axis the signal is actually
  // periodic on.
  //
  // Measured, same data, same 16 divisors:
  //     SI-year axis        RMSE 0.006″   divisors 2,3,5,6,8,9,11,13,14,16,17,19,22,24,27,32
  //     calendar-year axis  RMSE 0.377″   greedy needs H/4, H/7, H/10
  // The calendar axis (Julian 365.25) differs from SI by ~6.7 yr per H, and
  // forcing the fit onto it makes the basis spend harmonics absorbing a
  // calendar artifact rather than describing the physics. 63× worse.
  //
  // The runtime was migrated to match (computeObliquityEarth now takes an SI
  // year). Both axes agree at J2000, so anchor checks pass either way — the
  // error only appears at deep time. Do not "fix" this to the consumer's old
  // calendar axis; that direction was tried and measured.
  const cols = header.split(',');
  const iJD = cols.indexOf('JD');
  if (iJD < 0) throw new Error('CSV has no `JD` column — re-run Step 6a.');

  // Collect all SS rows, then downsample by stepYears for fitting efficiency
  const allSS = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts[0] !== 'SS') continue;
    const year = parseFloat(parts[1]);
    const obliq = parseFloat(parts[4]);
    const jd = parseFloat(parts[iJD]);
    if (!isNaN(year) && !isNaN(obliq) && obliq > 0 && !isNaN(jd)) {
      const cycle = cycleAtJD(jd);
      if (cycle !== null) allSS.push({ year, obliq, cycle });
    }
  }

  // Downsample: J2000-anchored (filter (year - 2000) % step === 0 so year 2000
  // lands on the sampling line — matches year-length + cardinal-point fits).
  // This stays on `Model Year`: it is a row SELECTOR, not a phase. Phase
  // closure is supplied by each row's own integrated cycle, not by step
  // dividing H.
  const step = C.stepYears || 20;
  const data = allSS.filter(r => ((r.year - 2000) % step + step) % step === 0);
  console.log(`Downsampled (J2000-anchored): ${allSS.length} → ${data.length} points (step=${step})`);
  console.log(`Cycle range: ${data[0].cycle.toFixed(9)} → ${data[data.length - 1].cycle.toFixed(9)}`);
  return data;
}

// H-cycles from balancedYear to an instant given as a JD, on the SI-year axis.
// This is the exact expression the runtime now evaluates inside
// phaseAdvanceRadians: cyclesBetweenYears(BAL, _jdToSIyear(jd), div).
const DT = require(path.join(TOOLS_LIB, 'deep-time.js'));
const cycleAtJD = (jd) => DT.cyclesBetweenYears(C.balancedYear, DT._jdToSIyear(jd), 1);

// Integrated phase in radians for harmonic H/div at a given cycle.
// At J2000 this agrees with the snapshot form, so J2000 anchors are preserved.
const phaseOf = (cycle, div) => 2 * Math.PI * cycle * div;

// ─── Truncation depth ────────────────────────────────────────────────────
// How many harmonics to keep. This is a TRUNCATION choice, not a statistical
// one, and it cannot be read off the data: the target is
// √(e² + pa² + pb²) — a deterministic smooth function of the four generators
// {H/3, H/5, H/8, H/16}, whose Fourier expansion has infinitely many
// intermodulation terms. There is no noise floor to reach, so BIC keeps
// improving indefinitely (measured: monotonic past 23 terms). Every added
// term is real; the question is only how much of the series you want.
//
// Measured RMSE against depth (SI-axis cycle form, 14,580 SS points):
//   15 terms 0.006239″ · 16 0.005776″ · 17 0.005274″ · 23 0.004847″
//
// Kept at 16. (The 6-decimal write rounding that once made depth moot is gone —
// the generated constants module emits values verbatim since Phase 5g — but
// going 16 → 23 would still only buy 0.0009″ against the 0.006″ residual, and
// changing the shipped divisor-set structure is a deliberate decision with
// downstream sync cost, not a refit side effect.)
const MAX_HARMONICS = 16;

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
    const residual = data[i].obliq - mean;
    b[i] = residual;
    A[i] = new Float64Array(m);
    for (let k = 0; k < divisors.length; k++) {
      const phase = phaseOf(data[i].cycle, divisors[k]);
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
      const phase = phaseOf(data[i].cycle, div);
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
  const currentDivisors = [...baseDivisors];
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
  // Anchor on the year-2000 SS ROW, not on JD 2451545.0 (J2000.0 proper).
  //
  // Tempting to "correct" this: the IAU value is defined at J2000.0 = Jan 1.5,
  // while the year-2000 SS row is the JUNE solstice, half a year later, and
  // obliquity moves ~47″/century. But the scene is CALIBRATED so that the
  // year-2000 solstice obliquity IS the IAU J2000 number:
  //     CSV SS year 2000 = 23.439279      (column precision 1e-6°)
  //     ASTRO_REFERENCE  = 23.439279444   (IAU 2006; ≤0.002″ apart)
  // The fit's job is to reproduce the scene, so the anchor must sit where the
  // scene puts it. Anchoring at JD 2451545.0 instead was measured: it leaves a
  // CONSTANT +0.2247″ bias on all 335,318 rows while the scatter stays at the
  // 0.0057″ fit residual — and the script's own "Verify at J2000" still reports
  // 0.0000″, because it verifies at the anchor rather than against the data.
  const rowAt = (y) => {
    const r = data.find(d => d.year === y);
    if (!r) throw new Error(`no SS row at year ${y} — cannot anchor`);
    return r.cycle;
  };
  console.log(`SS data points: ${data.length}`);
  console.log(`Year range: ${data[0].year} to ${data[data.length - 1].year}`);
  let obliqMin = Infinity, obliqMax = -Infinity;
  for (const d of data) { if (d.obliq < obliqMin) obliqMin = d.obliq; if (d.obliq > obliqMax) obliqMax = d.obliq; }
  console.log(`Obliquity range: ${obliqMin.toFixed(6)}° to ${obliqMax.toFixed(6)}°`);

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
  const cycle2000 = rowAt(2000);
  for (const [div, sinC, cosC] of current.harmonics) {
    obliq2000 += sinC * Math.sin(phaseOf(cycle2000, div)) + cosC * Math.cos(phaseOf(cycle2000, div));
  }
  console.log(`\nObliquity at J2000: ${obliq2000.toFixed(6)}° (IAU 2006: ${IAU_obliquity}°)`);
  console.log(`J2000 error: ${((obliq2000 - IAU_obliquity) * 3600).toFixed(2)}"`);

  // ─── Greedy search for better harmonics ────────────────────────────
  console.log('\n── Greedy harmonic selection (start from 5 Fibonacci) ──');
  const fibDivisors = [3, 5, 8, 13, 16];
  const greedy = greedySelect(data, obliqMean, fibDivisors, MAX_HARMONICS, 120);

  console.log(`\nFinal (${greedy.divisors.length} harmonics): RMSE = ${(greedy.rmse * 3600).toFixed(3)}"`);
  console.log('\nCoefficients:');
  for (const [div, sinC, cosC] of greedy.harmonics) {
    const amp = Math.sqrt(sinC * sinC + cosC * cosC) * 3600;
    console.log(`  [${String(div).padStart(2)},  ${sinC >= 0 ? '+' : ''}${sinC.toFixed(8)},  ${cosC >= 0 ? '+' : ''}${cosC.toFixed(8)}],  // H/${div}  amp=${amp.toFixed(1)}"`);
  }

  // Check J2000 with greedy harmonics
  let obliq2000g = obliqMean;
  for (const [div, sinC, cosC] of greedy.harmonics) {
    obliq2000g += sinC * Math.sin(phaseOf(cycle2000, div)) + cosC * Math.cos(phaseOf(cycle2000, div));
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

  // What gets ANCHORED and WRITTEN is the shipped divisor set (`current`), not
  // the greedy search output. The greedy run stays above as a diagnostic: it is
  // a path-dependent heuristic, and at this depth its last pick is decided by a
  // ~1e-6 arcsec margin — it swaps H/32 (= 2×H/16, a second harmonic of an
  // existing generator) for H/12 on that basis. Measured: the two sets differ by
  // 0.024% RMSE, and their curves by at most 0.0066″ anywhere. Adopting the
  // greedy set would churn the divisor list through fitted-coefficients.json →
  // the generated constants module → constants.ts for nothing. Change WRITE_SET
  // deliberately, not by default.
  const WRITE_SET = current.harmonics;

  // Evaluate harmonics at J2000
  let harmonicsAt2000 = 0;
  for (const [div, sinC, cosC] of WRITE_SET) {
    harmonicsAt2000 += sinC * Math.sin(phaseOf(cycle2000, div)) + cosC * Math.cos(phaseOf(cycle2000, div));
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
  // Same row-anchored convention as J2000 above. With gridYear === 2000 this is
  // the same row, and iauObliquityAtGrid === obliquityJ2000_deg, so the two
  // anchors coincide as they should.
  const cycleGrid = rowAt(gridYear);
  for (const [div, sinC, cosC] of WRITE_SET) {
    harmonicsAtGrid += sinC * Math.sin(phaseOf(cycleGrid, div)) + cosC * Math.cos(phaseOf(cycleGrid, div));
  }
  const verifyGrid = adjustedMean + harmonicsAtGrid;
  console.log(`  Verify at grid ${gridYear}: ${verifyGrid.toFixed(6)}° (IAU: ${iauAtGrid.toFixed(6)}°, diff: ${((verifyGrid - iauAtGrid) * 3600).toFixed(4)}")`);

  // ─── Write to fitted-coefficients.json if --write flag is present ────
  if (process.argv.includes('--write')) {
    const jsonPath = path.join(ROOT, 'public', 'input', 'fitted-coefficients.json');
    const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    fc.SOLSTICE_OBLIQUITY_MEAN_FITTED = adjustedMean;  // Smart anchor: IAU_J2000 - harmonics(2000)
    fc.SOLSTICE_OBLIQUITY_HARMONICS = WRITE_SET;
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log(`\n  ✓ Written SOLSTICE_OBLIQUITY_MEAN_FITTED = ${adjustedMean.toFixed(8)}° to fitted-coefficients.json`);
    console.log('  ✓ Written SOLSTICE_OBLIQUITY_HARMONICS to fitted-coefficients.json');
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
