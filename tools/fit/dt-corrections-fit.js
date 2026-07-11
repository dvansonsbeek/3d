#!/usr/bin/env node
/**
 * Fit the 3-flag sub-Milankovitch ΔT correction stack (Bond + Hallstatt + Jose5).
 *
 * Design (mirrors sun-longitude-harmonics.js pattern):
 *   1. Set DT_CORRECTIONS_DISABLED=1 in env so framework model ΔT is pure-tidal.
 *   2. Load Stephenson 2016 ΔT polynomial from JSON.
 *   3. Sample residual R(y) = Stephenson(y) − framework_model(y) on a year grid.
 *   4. Cascade fit:
 *        Bond solo   → free amp/phase (unconstrained; Bond is the primary anchor)
 *        Bond+Hallstatt joint → scale Hallstatt to target amp (constrained prior)
 *        Bond+Hallstatt+Jose5 joint → scale Jose5 to target amp (constrained prior)
 *   5. Emit per-cycle {cos, sin, raw@J2000, amplitude, phase} to
 *      data/deltaT-3flag-fit.json.
 *   6. Warn if collinearity is severe (Bond phase shift > 25°, any amp blow-up > 2×).
 *
 * The scaling is done because free-fit amplitudes for Hallstatt and Jose5 are
 * inflated by nearby-frequency collinearity with Bond. The shipped values use
 * SOLO-fit phases (least contaminated) with constrained amplitudes below the
 * free-fit values — see docs/102 § "Companion 8H lattice harmonics".
 *
 * Usage:
 *   node tools/fit/dt-corrections-fit.js                    # dry run
 *   node tools/fit/dt-corrections-fit.js --write            # write JSON artifact
 *   node tools/fit/dt-corrections-fit.js --write --sync-code # also sync to code files
 *
 * The --write flag requires DT_CORRECTIONS_DISABLED=1 be set: this ensures
 * the residual samples reflect the raw framework model, not framework +
 * previously-shipped corrections (which would produce a delta, not an absolute fit).
 *
 * The --sync-code flag also updates the three code sites that hold the shipped
 * coefficients: src/script.js, tools/lib/deep-time.js, and the website
 * calculator's src/lib/orbital/deepTime.ts. Only run this after inspecting
 * the fit output.
 */

const fs = require('fs');
const path = require('path');

// ─── Guard: DT_CORRECTIONS_DISABLED must be set for --write ───
const WRITE = process.argv.includes('--write');
const SYNC_CODE = process.argv.includes('--sync-code');
if (WRITE && process.env.DT_CORRECTIONS_DISABLED !== '1') {
  console.log('✗ REFUSING TO WRITE: DT_CORRECTIONS_DISABLED=1 is not set.');
  console.log('  Without it, the framework model ΔT already includes the currently-shipped');
  console.log('  Bond+Hallstatt+Jose5 corrections. The residual sampled here would then be a');
  console.log('  DELTA on top of shipped, not the absolute fit target — writing that would');
  console.log('  break the runtime. Re-run with:');
  console.log('    DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --write');
  process.exit(1);
}

const DT = require('../lib/deep-time');
const C = require('../lib/constants');

// ─── Config: divisors, target amplitudes, taper, fit window ───
const CONFIG = {
  cycles: [
    { name: 'bond',      lattice_n: 1830,
      structural: '74 × J-S synodic; gcd(1830, H) = 61',
      fit_stage:  'solo',
      target_amp_s: null /* unconstrained */ },
    { name: 'hallstatt', lattice_n: 1104,
      structural: 'H/138 = H/(6·23); gcd(1104, H) = 23',
      fit_stage:  'with_bond',
      target_amp_s: 80 },
    { name: 'jose5',     lattice_n: 2989,
      structural: '5×Jose 179 yr; gcd(2989, H) = 61',
      fit_stage:  'with_bond_hallstatt',
      target_amp_s: 50 },
  ],
  holocene_taper: {
    full_halfwidth_yr:  4500,
    total_halfwidth_yr: 6000,
  },
  fit_window: {
    year_start: -720,
    year_end:   2017,
    step_yr:    10,
  },
  stephenson_source: 'public/input/stephenson-2016-deltaT-polynomial.json',
};

const H = C.H;
const EIGHT_H = 8 * H;

// ─── Stephenson polynomial evaluator (cubic spline over 54 segments) ───
function loadStephenson() {
  const p = path.join(__dirname, '..', '..', CONFIG.stephenson_source);
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return raw.segments;
}

function stephensonDeltaT(year, segments) {
  for (const s of segments) {
    if (year >= s.y0 && year <= s.y1) {
      const t = (year - s.y0) / (s.y1 - s.y0);
      const a = s.a;
      return a[0] + a[1] * t + a[2] * t * t + a[3] * t * t * t;
    }
  }
  return NaN; // outside range
}

// ─── Framework model ΔT (pure-tidal via DT_CORRECTIONS_DISABLED) ───
function frameworkModelDeltaT(year) {
  const t_Ma = (2000 - year) / 1e6;
  return DT.meanDeltaTSecondsAtAge(t_Ma);
}

// ─── Sample residual R(y) = Stephenson(y) − model(y) on year grid ───
function sampleResidual(segments) {
  const { year_start, year_end, step_yr } = CONFIG.fit_window;
  const years = [], stephenson = [], model = [], residual = [];
  for (let y = year_start; y <= year_end; y += step_yr) {
    const dt_s = stephensonDeltaT(y, segments);
    const dt_m = frameworkModelDeltaT(y);
    if (!Number.isFinite(dt_s) || !Number.isFinite(dt_m)) continue;
    years.push(y);
    stephenson.push(dt_s);
    model.push(dt_m);
    residual.push(dt_s - dt_m);
  }
  return { years, stephenson, model, residual };
}

// ─── Least-squares fit: R(y) ≈ Σ_i (cos_i·cos(ω_i·y) + sin_i·sin(ω_i·y))
//                              + polynomial detrend (intercept + linear + quadratic)
// Returns per-cycle {cos, sin} plus fit statistics.
function fitCycles(years, residual, cycleDivisors) {
  const n = years.length;
  const y0 = years.reduce((a, b) => a + b, 0) / n;
  const t = years.map(y => (y - y0) / 1000); // in kyr for polynomial stability
  const nCol = 3 + 2 * cycleDivisors.length;  // [1, t, t², cos+sin per cycle]

  // Build design matrix
  const X = [];
  const b_vec = residual.slice();
  const bar = b_vec.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) {
    const row = new Array(nCol);
    row[0] = 1;
    row[1] = t[i];
    row[2] = t[i] * t[i];
    for (let k = 0; k < cycleDivisors.length; k++) {
      const omega = 2 * Math.PI * cycleDivisors[k] / EIGHT_H;
      row[3 + 2 * k]     = Math.cos(omega * years[i]);
      row[3 + 2 * k + 1] = Math.sin(omega * years[i]);
    }
    X.push(row);
  }
  const b = b_vec.map(v => v - bar);

  // Solve XᵀXβ = Xᵀb via Cholesky
  const ATA = new Array(nCol);
  const ATb = new Array(nCol).fill(0);
  for (let j = 0; j < nCol; j++) {
    ATA[j] = new Array(nCol).fill(0);
    for (let k = 0; k < nCol; k++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += X[i][j] * X[i][k];
      ATA[j][k] = s;
    }
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j] * b[i];
    ATb[j] = s;
  }
  const beta = solveCholesky(ATA, ATb, nCol);

  // Predictions + R²
  const y_hat = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < nCol; j++) s += X[i][j] * beta[j];
    y_hat[i] = s + bar; // undo the mean subtraction
  }
  let ss_res = 0, ss_tot = 0;
  const resBar = residual.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) {
    ss_res += (residual[i] - y_hat[i]) ** 2;
    ss_tot += (residual[i] - resBar) ** 2;
  }
  const r2 = 1 - ss_res / Math.max(ss_tot, 1e-12);
  const rms_post = Math.sqrt(ss_res / n);

  // Extract per-cycle coefficients
  const cycles = [];
  for (let k = 0; k < cycleDivisors.length; k++) {
    const cos_c = beta[3 + 2 * k];
    const sin_c = beta[3 + 2 * k + 1];
    const amplitude = Math.hypot(cos_c, sin_c);
    const phase_deg = Math.atan2(sin_c, cos_c) * 180 / Math.PI;
    cycles.push({ n: cycleDivisors[k], cos: cos_c, sin: sin_c, amplitude, phase_deg });
  }
  return { r2, rms_post, cycles };
}

function solveCholesky(A, b, n) {
  const L = new Array(n);
  for (let i = 0; i < n; i++) L[i] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(A[i][i] - s, 1e-30));
      else         L[i][j] = (A[i][j] - s) / L[j][j];
    }
  }
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < i; k++) s += L[i][k] * y[k];
    y[i] = (b[i] - s) / L[i][i];
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = 0;
    for (let k = i + 1; k < n; k++) s += L[k][i] * x[k];
    x[i] = (y[i] - s) / L[i][i];
  }
  return x;
}

// ─── Main pipeline ───
function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  3-FLAG ΔT CORRECTION FIT — Bond + Hallstatt + Jose5');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (process.env.DT_CORRECTIONS_DISABLED !== '1') {
    console.log('  ⚠ DT_CORRECTIONS_DISABLED=1 not set — this is a diagnostic dry-run.');
    console.log('    Framework model ΔT INCLUDES currently-shipped corrections; residual');
    console.log('    is a DELTA on top of shipped, not absolute. Add the env var for a');
    console.log('    proper structural refit.\n');
  } else {
    console.log('  ✓ DT_CORRECTIONS_DISABLED=1 — pure-tidal framework model.\n');
  }

  console.log('  Config:');
  for (const c of CONFIG.cycles) {
    const period = EIGHT_H / c.lattice_n;
    console.log(`    ${c.name.padEnd(9)} 8H/${c.lattice_n}  period=${period.toFixed(2)} yr  ` +
                `target_amp=${c.target_amp_s === null ? 'free' : c.target_amp_s + ' s'}  ` +
                `structural: ${c.structural}`);
  }
  console.log('');

  // Sample residual
  const segments = loadStephenson();
  const { years, residual } = sampleResidual(segments);
  const rmsResidual = Math.sqrt(residual.reduce((a, r) => a + r * r, 0) / residual.length);
  console.log(`  Residual sampled: n=${residual.length} pts over years ${years[0]}..${years[years.length-1]} AD`);
  console.log(`  Raw residual RMS: ${rmsResidual.toFixed(1)} s\n`);

  // ─── Stage A: Bond solo ─────────────────────────────────────
  const bondCycle = CONFIG.cycles.find(c => c.name === 'bond');
  const fitA = fitCycles(years, residual, [bondCycle.lattice_n]);
  const bondSolo = fitA.cycles[0];
  console.log('── Stage A: Bond solo (unconstrained; the primary anchor) ──');
  console.log(`  R² = ${fitA.r2.toFixed(4)}, RMS post = ${fitA.rms_post.toFixed(1)} s`);
  console.log(`  Bond  amp = ${bondSolo.amplitude.toFixed(2)} s  phase = ${bondSolo.phase_deg.toFixed(2)}°`);
  console.log(`  Bond  cos = ${bondSolo.cos.toFixed(6)}  sin = ${bondSolo.sin.toFixed(6)}\n`);

  // ─── Stage B: Bond + Hallstatt joint; scale Hallstatt to target ─────
  const hallCycle = CONFIG.cycles.find(c => c.name === 'hallstatt');
  const fitB = fitCycles(years, residual, [bondCycle.lattice_n, hallCycle.lattice_n]);
  const bondB = fitB.cycles[0], hallFree = fitB.cycles[1];
  const hallScale = hallCycle.target_amp_s / hallFree.amplitude;
  const hallShipped = {
    n:         hallCycle.lattice_n,
    cos:       hallFree.cos * hallScale,
    sin:       hallFree.sin * hallScale,
    amplitude: hallCycle.target_amp_s,
    phase_deg: hallFree.phase_deg,
  };
  const bondPhaseShiftB = bondB.phase_deg - bondSolo.phase_deg;
  const bondAmpDeltaB   = bondB.amplitude - bondSolo.amplitude;
  console.log('── Stage B: Bond + Hallstatt joint (Hallstatt scaled to target) ──');
  console.log(`  R² = ${fitB.r2.toFixed(4)}, RMS post = ${fitB.rms_post.toFixed(1)} s`);
  console.log(`  Bond      amp = ${bondB.amplitude.toFixed(2)} s (Δ vs solo = ${bondAmpDeltaB.toFixed(2)})  phase = ${bondB.phase_deg.toFixed(2)}° (Δ = ${bondPhaseShiftB >= 0 ? '+' : ''}${bondPhaseShiftB.toFixed(2)}°)`);
  console.log(`  Hallstatt free amp = ${hallFree.amplitude.toFixed(2)} s  phase = ${hallFree.phase_deg.toFixed(2)}°`);
  console.log(`  Hallstatt scaled to ${hallCycle.target_amp_s} s: cos = ${hallShipped.cos.toFixed(6)}  sin = ${hallShipped.sin.toFixed(6)}\n`);

  // ─── Stage C: Bond + Hallstatt + Jose5 joint; scale Jose5 to target ─────
  const joseCycle = CONFIG.cycles.find(c => c.name === 'jose5');
  const fitC = fitCycles(years, residual, [bondCycle.lattice_n, hallCycle.lattice_n, joseCycle.lattice_n]);
  const bondC = fitC.cycles[0], hallC = fitC.cycles[1], joseFree = fitC.cycles[2];
  const joseScale = joseCycle.target_amp_s / joseFree.amplitude;
  const joseShipped = {
    n:         joseCycle.lattice_n,
    cos:       joseFree.cos * joseScale,
    sin:       joseFree.sin * joseScale,
    amplitude: joseCycle.target_amp_s,
    phase_deg: joseFree.phase_deg,
  };
  const bondPhaseShiftC = bondC.phase_deg - bondSolo.phase_deg;
  console.log('── Stage C: Bond + Hallstatt + Jose5 joint (Jose5 scaled to target) ──');
  console.log(`  R² = ${fitC.r2.toFixed(4)}, RMS post = ${fitC.rms_post.toFixed(1)} s`);
  console.log(`  Bond amp = ${bondC.amplitude.toFixed(2)} s (Δ vs solo = ${(bondC.amplitude - bondSolo.amplitude).toFixed(2)})  phase Δ vs solo = ${bondPhaseShiftC.toFixed(2)}°`);
  console.log(`  Hallstatt free amp = ${hallC.amplitude.toFixed(2)} s (Δ vs pair = ${(hallC.amplitude - hallFree.amplitude).toFixed(2)})`);
  console.log(`  Jose5 free amp = ${joseFree.amplitude.toFixed(2)} s  phase = ${joseFree.phase_deg.toFixed(2)}°`);
  console.log(`  Jose5 scaled to ${joseCycle.target_amp_s} s: cos = ${joseShipped.cos.toFixed(6)}  sin = ${joseShipped.sin.toFixed(6)}\n`);

  // ─── Collinearity warnings ─────────────────────────────────
  console.log('── Collinearity check ──');
  const warnings = [];
  if (Math.abs(bondPhaseShiftB) > 25) warnings.push(`Bond phase shifted ${bondPhaseShiftB.toFixed(1)}° when Hallstatt added (>25° threshold)`);
  if (Math.abs(bondPhaseShiftC) > 25) warnings.push(`Bond phase shifted ${bondPhaseShiftC.toFixed(1)}° when Jose5 added (>25° threshold)`);
  if (hallFree.amplitude > 400)      warnings.push(`Hallstatt free-fit amp ${hallFree.amplitude.toFixed(0)} s exceeds 400 s guardrail`);
  if (joseFree.amplitude > 200)      warnings.push(`Jose5 free-fit amp ${joseFree.amplitude.toFixed(0)} s exceeds 200 s guardrail`);
  if (warnings.length === 0) {
    console.log('  ✓ No collinearity concerns detected.');
  } else {
    for (const w of warnings) console.log('  ⚠', w);
  }
  console.log('');

  // ─── Compute raw@J2000 anchor values ───
  function rawAtJ2000(c) {
    const omega = 2 * Math.PI * c.n / EIGHT_H;
    return c.cos * Math.cos(omega * 2000) + c.sin * Math.sin(omega * 2000);
  }
  const bondJ2000 = rawAtJ2000(bondSolo);
  const hallJ2000 = rawAtJ2000(hallShipped);
  const joseJ2000 = rawAtJ2000(joseShipped);

  // ─── Print shipped coefficients ───
  console.log('── Shipped coefficients (bond=solo phase; hallstatt/jose5=constrained-amp) ──');
  console.log(`  BOND      cos = ${bondSolo.cos}`);
  console.log(`  BOND      sin = ${bondSolo.sin}`);
  console.log(`  BOND      raw@J2000 = ${bondJ2000.toFixed(6)}`);
  console.log(`  HALLSTATT cos = ${hallShipped.cos}`);
  console.log(`  HALLSTATT sin = ${hallShipped.sin}`);
  console.log(`  HALLSTATT raw@J2000 = ${hallJ2000.toFixed(6)}`);
  console.log(`  JOSE5     cos = ${joseShipped.cos}`);
  console.log(`  JOSE5     sin = ${joseShipped.sin}`);
  console.log(`  JOSE5     raw@J2000 = ${joseJ2000.toFixed(6)}\n`);

  // ─── Write JSON artifact ───
  const output = {
    _meta: {
      description: 'Sub-Milankovitch H-lattice ΔT correction stack fit against Stephenson 2016 residual. Bond uses solo-fit phase (unconstrained amplitude, physical anchor). Hallstatt and Jose5 use scaled amplitudes below their free-fit values to mitigate inter-cycle collinearity. See docs/102-gia-alpha-lunar-validation.md §"Companion 8H lattice harmonics".',
      generator: 'tools/fit/dt-corrections-fit.js',
      dt_corrections_disabled: process.env.DT_CORRECTIONS_DISABLED === '1',
      H_yr: H,
      eight_H_yr: EIGHT_H,
    },
    config: CONFIG,
    fit_metrics: {
      stage_a_bond_solo:              { r2: fitA.r2, rms_post: fitA.rms_post },
      stage_b_bond_hallstatt_joint:   { r2: fitB.r2, rms_post: fitB.rms_post, bond_phase_shift_deg: bondPhaseShiftB, hallstatt_free_amp_s: hallFree.amplitude },
      stage_c_bond_hallstatt_jose5:   { r2: fitC.r2, rms_post: fitC.rms_post, bond_phase_shift_deg: bondPhaseShiftC, jose5_free_amp_s: joseFree.amplitude },
    },
    collinearity_warnings: warnings,
    shipped_coefficients: {
      bond: {
        lattice_n: bondCycle.lattice_n,
        period_yr: EIGHT_H / bondCycle.lattice_n,
        cos_coeff_s: bondSolo.cos,
        sin_coeff_s: bondSolo.sin,
        raw_at_j2000_s: bondJ2000,
        amplitude_s: bondSolo.amplitude,
        phase_deg: bondSolo.phase_deg,
      },
      hallstatt: {
        lattice_n: hallCycle.lattice_n,
        period_yr: EIGHT_H / hallCycle.lattice_n,
        cos_coeff_s: hallShipped.cos,
        sin_coeff_s: hallShipped.sin,
        raw_at_j2000_s: hallJ2000,
        amplitude_s: hallShipped.amplitude,
        phase_deg: hallShipped.phase_deg,
        target_amp_source: `constrained from pair-fit free amp ${hallFree.amplitude.toFixed(2)} → ${hallCycle.target_amp_s} s`,
      },
      jose5: {
        lattice_n: joseCycle.lattice_n,
        period_yr: EIGHT_H / joseCycle.lattice_n,
        cos_coeff_s: joseShipped.cos,
        sin_coeff_s: joseShipped.sin,
        raw_at_j2000_s: joseJ2000,
        amplitude_s: joseShipped.amplitude,
        phase_deg: joseShipped.phase_deg,
        target_amp_source: `constrained from triple-fit free amp ${joseFree.amplitude.toFixed(2)} → ${joseCycle.target_amp_s} s`,
      },
    },
  };

  if (WRITE) {
    const outPath = path.join(__dirname, '..', '..', 'data', 'deltaT-3flag-fit.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`  ✓ Written to ${outPath}`);
    if (SYNC_CODE) {
      console.log('  → Syncing to code files via export-dt-corrections.js...');
      const { syncAllTargets } = require('./export-dt-corrections');
      syncAllTargets(output, { dryRun: false });
    } else {
      console.log('  (JSON only. Add --sync-code to also update src/script.js and Node/website ports.)');
    }
  } else {
    console.log('  (dry run — add --write to persist to data/deltaT-3flag-fit.json)');
  }
}

main();
