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
 *      data/deltaT-4flag-fit.json.
 *   6. Warn if collinearity is severe (Bond phase shift > 25°, any amp blow-up > 2×).
 *
 * The scaling is done because free-fit amplitudes for Hallstatt and Jose5 are
 * inflated by nearby-frequency collinearity with Bond. The shipped values use
 * SOLO-fit phases (least contaminated) with constrained amplitudes below the
 * free-fit values — see docs/102 § "Companion 8H lattice harmonics".
 *
 * Usage:
 *   node tools/fit/dt-corrections-fit.js                                # dry run
 *   node tools/fit/dt-corrections-fit.js --write                        # write JSON artifact
 *   node tools/fit/dt-corrections-fit.js --write --sync-code            # also sync to code files
 *   DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --sweep-usno
 *     → joint-optimum sweep over CONFIG.usno_anchor.usno_target_lod_s;
 *       for each anchor value in the sweep range, finds the deltaTStart that
 *       minimises RMS vs Espenak & Meeus at ~20 historical reference years.
 *       Diagnostic only — does NOT write or sync (nothing persisted).
 *
 * The --write flag requires DT_CORRECTIONS_DISABLED=1 be set: this ensures
 * the residual samples reflect the raw framework model, not framework +
 * previously-shipped corrections (which would produce a delta, not an absolute fit).
 *
 * The --sync-code flag also updates the three code sites that hold the shipped
 * coefficients: src/script.js, tools/lib/deep-time.js, and the website
 * calculator's src/lib/orbital/deepTime.ts. Only run this after inspecting
 * the fit output.
 *
 * KNOWN LIMITATION (H/5 baseline): The fit's inner `fitCycles()` subtracts a
 * polynomial trend (1 + t + t²) before fitting the harmonic components, so
 * the harmonic amplitudes represent the OSCILLATORY residual only. When we
 * ship, only the harmonic coefficients are emitted — the polynomial part
 * is discarded (per the framework's "no polynomial motion-model corrections"
 * rule, see memory feedback_no_polynomial_corrections).
 *
 * With the framework's H/5 correction now inside the integrand of
 * meanDeltaTSecondsAtAge (LOD_real = LOD_mean + LOD_mean/((H/5)·mSY),
 * ~3.527 ms at J2000; was H/3 ≈ 2.117 ms before 2026-07-17), the residual
 * acquires a linear-in-year secular shift. That shift lives entirely in the
 * polynomial part of the fit and is DROPPED at ship time. The
 * shipped-stack Stephenson-residual RMS therefore inherits a deep-past
 * mismatch that is a known limitation of the harmonic-only ship.
 *
 * USNO ANCHOR (Stage D, from 2026-07-18): the final Stage D fit adds a soft
 * constraint `Σ cycleLodCorrection_i(2000) = TARGET_LOD_OFFSET` where
 *   TARGET_LOD_OFFSET = 86400.0016 (USNO) − o.lodKinematic − h5Correction(2000)
 *                    ≈ −1.937 ms
 * so that at J2000 the sum of the four DT-cycle δLOD contributions lands
 * exactly on the USNO Earth Orientation Center's LOD value. Implemented as
 * an extra weighted row in the design matrix (weight ≈ 1e6 relative to a
 * per-year sample). See `usno_anchor` in CONFIG for enable/disable + target.
 */

const fs = require('fs');
const path = require('path');

// ─── Guard: DT_CORRECTIONS_DISABLED must be set for --write ───
const WRITE = process.argv.includes('--write');
const SYNC_CODE = process.argv.includes('--sync-code');
const FIXED_ANCHORS = process.argv.includes('--fixed-anchors');
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
    { name: 'jose4',    lattice_n: 3749,
      structural: '4×Jose 179 yr = 715.5 yr; gcd(3749, H) = 23. Cross-archive coherent in Steinhilber solar Φ + EPICA CO2 (see scripts/lattice_harmonic_scan.py --preset jose-family). Also degenerate with Bond/2 at ~733 yr; 4×Jose is the tighter anchor (0.083% vs 2.5%).',
      fit_stage:  'with_bond_hallstatt_jose5',
      target_amp_s: 50 },
    { name: 'h253',     lattice_n: 2024,
      structural: 'H/253 = H/(11·23) = 1,325.4 yr; gcd(2024, H) = 23; 184th harmonic of 8H/11 (Earth ecliptic-perihelion family). Identified 2026-07-22 by L-5b §14 post-4-flag residual scan (flat ΔR²=0.031 peak n=2015-2024, gcd-compliant flank chosen) — see scripts/lod_residual_h253_fifth_cycle.py (GO verdict: medieval 990-bump window 98→17 s, no ancient regression). EPICA CO2 significant (amp 5.9 ppm vs p95 2.9, lattice_harmonic_scan); Steinhilber marginal (~95% threshold); cap-only ship keeps the amplitude below the free fit.',
      fit_stage:  'frozen_residual_after_D',
      target_amp_s: 75 },
    // Eddy (8H/2684 = 999.45 yr) TESTED AND ROLLED BACK 2026-07-12: the 5-cycle
    // joint fit showed Bond amp inflating 375 s → 646 s (collinearity) and L-5b
    // metrics regressed by +12 s RMS. Eddy modestly improved 1200-1300 CE
    // (~-70 s) but regressed ancient BCE (-800 to -300) by ~70-86 s per century,
    // net worse. At the year 990 MWP peak Eddy contributed only 0.79 s (phase
    // near null there). Cross-archive coherence in Steinhilber Φ + EPICA CO2 is
    // real — the 999-yr Eddy solar cycle is empirically present — but it
    // cannot be fit against ΔT residual without hurting the ancient window.
    // See docs/102 § "Companion 8H lattice harmonics" (§ Eddy rollback).
    // Emp862 (8H/3111 = 862 yr) TESTED AND ROLLED BACK 2026-07-12: the 6-cycle
    // fit was rank-deficient — Bond amp blew up to 9,898 s (from 375 s
    // baseline) with Bond phase shifted -90°, and Emp862's own free-fit
    // reached 29,961 s. Root cause: the beat period between Eddy (999 yr) and
    // Emp862 (862 yr) is ~6,255 yr, unresolvable by the 2.7-kyr Stephenson
    // window. 3-archive evidence for 862 yr remains valid but the cycle
    // cannot be fit against ΔT residual here.
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

  // Per-sample weighting knob: bias the fit toward the modern era (well-observed).
  // Samples with year ≥ modern_start_year get `modern_weight`; older samples get 1×.
  // Set modern_weight = 1 (default) to disable and use uniform weighting.
  //
  // EMPIRICAL FINDING (2026-07-18): 4× weight on ≥1600 samples slightly improved
  // the 1870-1910 dip (~+17 s error at 1900 vs +28 s uniform) but destroyed the
  // 1650-1800 fit (from +30-40 s off to −40-55 s off). The 4-cycle H-lattice
  // stack simply cannot fit both eras simultaneously — Bond (1466 yr period)
  // dominates monotonically across the fit window, so any weighting just moves
  // the residual from one era to another. Left at 1 (disabled) as the honest
  // default. Non-1 values are for diagnostic exploration only.
  modern_era_weight: {
    modern_start_year: 1600,
    modern_weight: 1,   // DISABLED. See empirical note above.
  },

  // USNO LOD anchor (applied at Stage D only). Enforces `Σ cycleLodCorrection_i(2000)
  // = target_lod_offset_s` via a high-weight extra row in the design matrix.
  //   target_lod_offset_s = usno_target_lod_s − lodKinematic(J2000) − h5Correction(2000)
  //                       [derived at runtime — see computeUsnoTargetOffset() below]
  // Change `usno_target_lod_s` to explore other anchor targets (e.g. IERS ≈ 86400.001,
  // or exactly 86400 to zero out any J2000 kinematic offset). The offset value is
  // recomputed each run against the current fitted sidereal-year anchor + H/5 constant,
  // so upstream shifts (sidereal Fourier refit, H change, mSY change) are handled
  // automatically without needing to hand-edit a derived value.
  usno_anchor: {
    enabled: true,
    // usno_target_lod_s: DEFAULT/FALLBACK only. The main pipeline auto-selects
    // the joint-optimum USNO + deltaTStart pair against the Espenak reference
    // (see findJointOptimum + ESPENAK_REFERENCE). This CONFIG value is used only
    // when --fixed-anchors is passed (auto-optimum skipped) or when
    // DT_CORRECTIONS_DISABLED=1 is not set (unsafe to sweep).
    //
    // The 86400.0018 value is the historical joint-optimum from the 2026-07-18
    // Espenak reference set (RMS 11.5 s paired with deltaTStart = 57.53).
    usno_target_lod_s: 86400.0018,
    weight: 1e6,                     // multiplier on the anchor row before least-squares
    apply_at_stage: 'D',             // only the final 4-cycle fit is anchored
  },
};

// Runtime constant needed for the cycleLodCorrection weight formula.
// Matches script.js: `const MEAN_TROPICAL_YEAR_J2000_S = meansolaryearlengthinDays * meanlengthofday;`
// Approximation using 86400 s (vs runtime's 86399.99968 s) introduces ~1e-11 relative
// error in the weights — well below the μs-scale anchor residual.
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400;

// Derive the required `Σ cycleLodCorrection(2000) = target` from the USNO knob.
// Mirrors the runtime formula:
//   predictions.lodReal = o.lodKinematic + h5Correction(2000) + dtCycleLodCorrectionSum(2000)
// Setting lodReal = USNO gives:
//   dtCycleLodCorrectionSum(2000) = USNO − o.lodKinematic − h5Correction(2000)
// which is exactly the anchor target for this fit.
function computeUsnoTargetOffset(usnoTargetLodS) {
  // Load the current fitted sidereal-year anchor from fitted-coefficients.json —
  // this is what o.siderealYearDays evaluates to at year 2000 in the runtime.
  const fc = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json'), 'utf8'));
  const sidDays2000 = fc.YEAR_LENGTH_J2000_ANCHOR
    ? fc.YEAR_LENGTH_J2000_ANCHOR.sidereal
    : C.meanSiderealYearDays;  // fallback for pre-anchor world
  const iauSiderealSec = C.meanSiderealYearDays * 86400;
  const lodKinematic = iauSiderealSec / sidDays2000;

  // h5Correction(year) = LOD_mean / ((H/5) × mSY_days) — LOD_mean approximated as
  // 86400 s (runtime value ≈ 86399.99968; diff ~4 ns in h5, negligible for the fit).
  const LOD_MEAN_APPROX = 86400;
  const h5At2000 = LOD_MEAN_APPROX / ((C.H / 5) * C.meanSolarYearDays);

  const targetOffset = usnoTargetLodS - lodKinematic - h5At2000;
  return { targetOffset, lodKinematic, h5At2000, sidDays2000 };
}

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

// Compute the LOD-anchor row coefficients for a set of cycle divisors.
// Mirrors runtime `_cycleLodCorrection(2000, cos, sin, ω, raw@J2000)` at year=2000
// with taper=1, taper_prime=0 (well inside the 300-kyr Holocene taper window):
//   cycle_LOD(2000) = 86400 × ω × (sin·cos(ω·2000) − cos·sin(ω·2000)) / T_yr
// where T_yr = MEAN_TROPICAL_YEAR_J2000_S. Returns weights indexed to match the
// harmonic block (cols 3..) in the design matrix — polynomial cols get 0.
function computeAnchorRow(cycleDivisors, targetLodOffsetS) {
  const nCol = 3 + 2 * cycleDivisors.length;
  const row = new Array(nCol).fill(0);   // cols 0..2 (poly detrend) = 0
  for (let k = 0; k < cycleDivisors.length; k++) {
    const omega = 2 * Math.PI * cycleDivisors[k] / EIGHT_H;
    const sinW = -86400 * omega * Math.sin(omega * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
    const cosW = +86400 * omega * Math.cos(omega * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
    row[3 + 2 * k]     = sinW;   // weight on beta_cos_k
    row[3 + 2 * k + 1] = cosW;   // weight on beta_sin_k
  }
  return { coefficients: row, target: targetLodOffsetS };
}

// ─── Least-squares fit: R(y) ≈ Σ_i (cos_i·cos(ω_i·y) + sin_i·sin(ω_i·y))
//                              + polynomial detrend (intercept + linear + quadratic)
// Optional soft equality constraint via `anchor = {coefficients, target, weight}` —
// appended as one extra weighted row to the normal equations (∑ w_i β_i = target × W,
// with row scaled by W ~ 1e6). Weight so large the anchor is effectively hard.
// Optional per-sample `sampleWeights` array (same length as `years`) — each row of
// the design matrix and residual is scaled by sqrt(w_i) for standard WLS. Useful for
// biasing the fit toward the well-observed modern era.
// Returns per-cycle {cos, sin} plus fit statistics.
function fitCycles(years, residual, cycleDivisors, anchor = null, sampleWeights = null) {
  const n = years.length;
  const y0 = years.reduce((a, b) => a + b, 0) / n;
  const t = years.map(y => (y - y0) / 1000); // in kyr for polynomial stability
  const nCol = 3 + 2 * cycleDivisors.length;  // [1, t, t², cos+sin per cycle]

  // Weighted-mean subtraction — matches the weighted-LS objective. Falls back
  // to plain mean when weights are unit.
  const weights = sampleWeights || new Array(n).fill(1);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const bar = residual.reduce((s, r, i) => s + r * weights[i], 0) / wSum;

  // Build design matrix. WLS: scale each row by sqrt(w_i) → normal equations
  // (∑ w_i X_i^T X_i) β = ∑ w_i X_i^T b_i are the correct weighted normal equations.
  const X = [];
  const b = [];
  for (let i = 0; i < n; i++) {
    const sw = Math.sqrt(weights[i]);
    const row = new Array(nCol);
    row[0] = sw * 1;
    row[1] = sw * t[i];
    row[2] = sw * t[i] * t[i];
    for (let k = 0; k < cycleDivisors.length; k++) {
      const omega = 2 * Math.PI * cycleDivisors[k] / EIGHT_H;
      row[3 + 2 * k]     = sw * Math.cos(omega * years[i]);
      row[3 + 2 * k + 1] = sw * Math.sin(omega * years[i]);
    }
    X.push(row);
    b.push(sw * (residual[i] - bar));
  }

  // Append anchor row (soft constraint) — high weight ⇒ near-exact equality.
  if (anchor) {
    const W = anchor.weight;
    const scaledRow = anchor.coefficients.map(v => v * W);
    X.push(scaledRow);
    b.push(anchor.target * W);   // note: no `bar` subtraction — anchor target is absolute
  }

  const nRows = X.length;

  // Solve XᵀXβ = Xᵀb via Cholesky
  const ATA = new Array(nCol);
  const ATb = new Array(nCol).fill(0);
  for (let j = 0; j < nCol; j++) {
    ATA[j] = new Array(nCol).fill(0);
    for (let k = 0; k < nCol; k++) {
      let s = 0;
      for (let i = 0; i < nRows; i++) s += X[i][j] * X[i][k];
      ATA[j][k] = s;
    }
    let s = 0;
    for (let i = 0; i < nRows; i++) s += X[i][j] * b[i];
    ATb[j] = s;
  }
  const beta = solveCholesky(ATA, ATb, nCol);

  // Predictions + R² (statistics computed UNWEIGHTED over the ORIGINAL n data
  // rows, so the reported RMS is directly comparable across weighted / unweighted
  // fits and reflects fit-to-observed-data quality. The anchor row is excluded.
  // Rebuild y_hat from UNWEIGHTED design columns; the WLS X had every row scaled
  // by sqrt(w_i), so we can't use it directly.
  const y_hat = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = beta[0] + beta[1] * t[i] + beta[2] * t[i] * t[i];
    for (let k = 0; k < cycleDivisors.length; k++) {
      const omega = 2 * Math.PI * cycleDivisors[k] / EIGHT_H;
      s += beta[3 + 2 * k]     * Math.cos(omega * years[i])
         + beta[3 + 2 * k + 1] * Math.sin(omega * years[i]);
    }
    y_hat[i] = s + bar;
  }
  let ss_res = 0, ss_tot = 0;
  const resBar = residual.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) {
    ss_res += (residual[i] - y_hat[i]) ** 2;
    ss_tot += (residual[i] - resBar) ** 2;
  }
  const r2 = 1 - ss_res / Math.max(ss_tot, 1e-12);
  const rms_post = Math.sqrt(ss_res / n);
  // Sub-window RMS: modern era (year >= 1600) for diagnostic — where the fit
  // is expected to be tightest under per-sample weighting.
  let ss_modern = 0, n_modern = 0;
  for (let i = 0; i < n; i++) {
    if (years[i] >= 1600) {
      ss_modern += (residual[i] - y_hat[i]) ** 2;
      n_modern++;
    }
  }
  const rms_post_modern = n_modern > 0 ? Math.sqrt(ss_modern / n_modern) : null;

  // Extract per-cycle coefficients
  const cycles = [];
  for (let k = 0; k < cycleDivisors.length; k++) {
    const cos_c = beta[3 + 2 * k];
    const sin_c = beta[3 + 2 * k + 1];
    const amplitude = Math.hypot(cos_c, sin_c);
    const phase_deg = Math.atan2(sin_c, cos_c) * 180 / Math.PI;
    cycles.push({ n: cycleDivisors[k], cos: cos_c, sin: sin_c, amplitude, phase_deg });
  }

  // Anchor achievement (only meaningful if anchor was applied).
  let anchorAchieved = null;
  if (anchor) {
    let lhs = 0;
    for (let j = 0; j < nCol; j++) lhs += anchor.coefficients[j] * beta[j];
    anchorAchieved = { target: anchor.target, achieved: lhs, residual_s: lhs - anchor.target };
  }
  return { r2, rms_post, rms_post_modern, cycles, anchorAchieved };
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

// ─── Espenak / Meeus reference ΔT values (NASA Canon polynomial evaluations) ───
// Used only by the --sweep-usno joint-optimum sweep to score fit quality against
// observed history. Values are the piecewise-polynomial fit ΔT (TT − UT1) in
// seconds. Source: https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html.
const ESPENAK_REFERENCE = {
  1650: 50,   1700: 8.6,   1750: 13.4,  1780: 15.9,  1790: 17.0,  1800: 13.7,
  1820: 12,   1850: 7.14,  1860: 7.75,  1870: 1.04,  1880: -5.11, 1890: -6.02,
  1900: -2.79, 1910: 10.38, 1920: 21.16, 1950: 29.15, 1980: 50.54,
  2000: 63.83, 2010: 66.06, 2017: 68.97,
};

// ─── Closure-design experiments (2026-07-22) — implementations removed ────
// Two alternative anchor closures were implemented and tested this day:
//   1. distributeAnchorClosure — min-norm over ALL uncapped cycles' coeffs
//      (Espenak RMS 23.57 s: dumps distortion into Jose4, damages modern window)
//   2. anchoredCapRefit — active-set refit with the USNO anchor as an in-fit
//      constraint (Espenak RMS 23.16 s: converges to the SAME ~74 s Bond haircut)
// vs the retained Bond-only min-norm closure (21.66 s). Conclusion: the ~74 s
// Bond amplitude cost is the USNO anchor's SHADOW PRICE — the constrained
// optimum pays it in every formulation — and its deficit is what the
// post-closure phantom check quantifies as the apparent ~1,326-yr line.
// Implementations preserved in git history (commit with this note); evidence:
// scripts/lod_residual_h253_fifth_cycle.py + data/deltaT-h253-fifth-cycle-scan.json.

// ─── Quiet fit: run all 4 stages + shipping + Bond adjustment for a given
// USNO anchor value. Returns the shipped coefficients + fit metrics WITHOUT
// any console output or JSON writes. Used by the --sweep-usno sweep to explore
// the (usno, deltaTStart) joint-optimum surface without perturbing state.
function runFitQuiet(usnoTargetLodS, years, residual) {
  const bondCycle = CONFIG.cycles.find(c => c.name === 'bond');
  const hallCycle = CONFIG.cycles.find(c => c.name === 'hallstatt');
  const joseCycle = CONFIG.cycles.find(c => c.name === 'jose5');
  const jose4Cycle = CONFIG.cycles.find(c => c.name === 'jose4');

  // Per-sample weights (from CONFIG); disabled ⇒ all 1.
  const mw = CONFIG.modern_era_weight;
  const sampleWeights = years.map(y => y >= mw.modern_start_year ? mw.modern_weight : 1);

  // Cap helper — same as main().
  function ship(cycle, free) {
    const target = cycle.target_amp_s;
    const useAsIs = target === null || free.amplitude <= target;
    const scale = useAsIs ? 1 : target / free.amplitude;
    return {
      n: cycle.lattice_n, cos: free.cos * scale, sin: free.sin * scale,
      amplitude: useAsIs ? free.amplitude : target, phase_deg: free.phase_deg,
      constrained: !useAsIs,
    };
  }

  // Cycle LOD contribution at year 2000 with taper=1.
  function cycleLodAtJ2000(c) {
    const omega = 2 * Math.PI * c.n / EIGHT_H;
    return 86400 * omega * (c.sin * Math.cos(omega * 2000) - c.cos * Math.sin(omega * 2000)) / MEAN_TROPICAL_YEAR_J2000_S;
  }

  // Stage A/B/C — no anchor.
  const fitA = fitCycles(years, residual, [bondCycle.lattice_n], null, sampleWeights);
  const bondSolo = fitA.cycles[0];
  const fitB = fitCycles(years, residual, [bondCycle.lattice_n, hallCycle.lattice_n], null, sampleWeights);
  const fitC = fitCycles(years, residual, [bondCycle.lattice_n, hallCycle.lattice_n, joseCycle.lattice_n], null, sampleWeights);

  // Stage D with USNO anchor
  const stageDDivisors = [bondCycle.lattice_n, hallCycle.lattice_n, joseCycle.lattice_n, jose4Cycle.lattice_n];
  const derivation = computeUsnoTargetOffset(usnoTargetLodS);
  const anchorRow = computeAnchorRow(stageDDivisors, derivation.targetOffset);
  const anchorArg = { ...anchorRow, weight: CONFIG.usno_anchor.weight };
  const fitD = fitCycles(years, residual, stageDDivisors, anchorArg, sampleWeights);
  const bondD = fitD.cycles[0], hallD = fitD.cycles[1], joseD = fitD.cycles[2], jose4Free = fitD.cycles[3];

  // Shipping (all four from Stage D) + caps
  const bondForShipRaw = bondD;
  const hallForShip = ship(hallCycle, hallD);
  const joseForShip = ship(joseCycle, joseD);
  const jose4ForShip = ship(jose4Cycle, jose4Free);

  // Stage E (mirrors main): h253 frozen-residual fit after the four Stage-D
  // shipped cycles, then included in the anchor re-close sum.
  const h253Cycle = CONFIG.cycles.find(c => c.name === 'h253');
  const frozenFour = [bondForShipRaw, hallForShip, joseForShip, jose4ForShip];
  const residualE = years.map((y, i) => {
    let s = residual[i];
    for (const c of frozenFour) {
      const om = 2 * Math.PI * c.n / EIGHT_H;
      s -= c.cos * Math.cos(om * y) + c.sin * Math.sin(om * y);
    }
    return s;
  });
  const fitE = fitCycles(years, residualE, [h253Cycle.lattice_n], null, sampleWeights);
  const h253Fit = ship(h253Cycle, fitE.cycles[0]);

  // Bond-only min-norm closure (retained — see main() closure notes), with
  // h253 included in the pre-adjust sum.
  const preSum = cycleLodAtJ2000(bondForShipRaw) + cycleLodAtJ2000(hallForShip)
               + cycleLodAtJ2000(joseForShip) + cycleLodAtJ2000(jose4ForShip)
               + cycleLodAtJ2000(h253Fit);
  const deltaLod = derivation.targetOffset - preSum;
  const omB = 2 * Math.PI * bondCycle.lattice_n / EIGHT_H;
  const wCos = -86400 * omB * Math.sin(omB * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
  const wSin = +86400 * omB * Math.cos(omB * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
  const denom = wCos * wCos + wSin * wSin;
  const bondForShip = {
    n: bondCycle.lattice_n,
    cos: bondForShipRaw.cos + wCos * deltaLod / denom,
    sin: bondForShipRaw.sin + wSin * deltaLod / denom,
  };

  return { bond: bondForShip, hall: hallForShip, jose5: joseForShip,
           jose4: jose4ForShip, h253: h253Fit,
           stage_d_rms: fitD.rms_post, stage_d_rms_modern: fitD.rms_post_modern };
}

// ─── Core joint-optimum solver: for each USNO anchor value in the sweep range,
// runs the quiet fit + computes best deltaTStart + RMS vs Espenak. Returns the
// full result table plus the winning row. Silent (no console output) — the
// caller decides whether to print, apply, or both.
//
// Requires DT_CORRECTIONS_DISABLED=1 so DT.meanDeltaTSecondsAtAge returns pure-
// physics (no cycles) — the "physics baseline" the sweep adds cycles on top of.
function findJointOptimum(years, residual, { sweepMin = 86400.0014, sweepMax = 86400.0030, sweepStep = 0.0001 } = {}) {
  const espenakYears = Object.keys(ESPENAK_REFERENCE).map(Number).sort((a,b) => a-b);
  const physicsByYear = new Map();
  for (const y of espenakYears) {
    physicsByYear.set(y, DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6));
  }

  const sweep = [];
  for (let u = sweepMin; u <= sweepMax + 1e-9; u += sweepStep) sweep.push(Math.round(u * 1e7) / 1e7);

  const rows = [];
  let best = null;
  for (const usno of sweep) {
    const shipped = runFitQuiet(usno, years, residual);
    const div = { bond: 1830, hall: 1104, jose5: 2989, jose4: 3749, h253: 2024 };
    function cyclesAt(year) {
      let s = 0;
      for (const [name, d] of Object.entries(div)) {
        const c = shipped[name];
        const om = 2 * Math.PI * d / EIGHT_H;
        const raw    = c.cos * Math.cos(om * year) + c.sin * Math.sin(om * year);
        const rawJ2K = c.cos * Math.cos(om * 2000) + c.sin * Math.sin(om * 2000);
        s += raw - rawJ2K;
      }
      return s;
    }
    const modelNoAnchor = espenakYears.map(y => physicsByYear.get(y) + cyclesAt(y));
    const diffs = espenakYears.map((y, i) => ESPENAK_REFERENCE[y] - modelNoAnchor[i]);
    const bestDeltaTStart = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const residuals = diffs.map(d => d - bestDeltaTStart);
    const rms = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length);
    const modelJ2000 = bestDeltaTStart + physicsByYear.get(2000) + cyclesAt(2000);
    const bondAmp = Math.hypot(shipped.bond.cos, shipped.bond.sin);
    const row = { usno, bestDeltaTStart, rms, modelJ2000, bondAmp, stageDRms: shipped.stage_d_rms };
    rows.push(row);
    if (!best || rms < best.rms) best = row;
  }
  return { best, rows, espenakYears };
}

// ─── Diagnostic sweep — prints the full table. Does not write or sync. ──────
// ─── 2D EPOCH SWEEP (2026-07-22): Layer-2 LOD trajectory offset δ × USNO ───
// Tests the "one-century epoch offset" hypothesis: the ~730 μs/day linear
// drift in the Stephenson residual (L-5b §15) numerically equals the
// framework's observable dLOD/dt (0.764 ms/cy) × ~0.96 century, suggesting
// the H/13-structural LOD anchor (86399.9997 ≈ the ~1870–1900 mean solar
// day, the SI second's calibration epoch) is pinned one century late at
// J2000. A constant trajectory offset δ (s/day) enters the ΔT integral
// analytically: ΔT_δ(y) = ΔT₀(y) − δ·365.2422·(2000−y).
//
// Metrics per (δ, USNO) grid point, after the full quiet 5-stage fit:
//   driftSlope  — linear slope of the final shipped-stack residual (target 0)
//   phantomAmp  — 8H/2024 line in the final residual (anchor shadow price)
//   espenakRMS  — modern shape fit (deltaTStart free = trend-offset allowed;
//                 ΔT(2000)_trend reported as a SOFT indicator vs observed
//                 63.8 s — today may legitimately sit above/below trend)
function deltaTWithLodOffset(baseDeltaT, year, deltaLodS) {
  return baseDeltaT - deltaLodS * 365.2422 * (2000 - year);
}

function runSweepEpoch() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  2D EPOCH SWEEP — Layer-2 LOD trajectory offset δ × USNO anchor');
  console.log('  Hypothesis: drift ⇔ ~1-century epoch offset of the LOD anchor');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  if (process.env.DT_CORRECTIONS_DISABLED !== '1') {
    console.log('  ✗ REFUSING: DT_CORRECTIONS_DISABLED=1 not set.');
    return;
  }
  const segments = loadStephenson();
  const { year_start, year_end, step_yr } = CONFIG.fit_window;
  const years = [], baseModel = [], steph = [];
  for (let y = year_start; y <= year_end; y += step_yr) {
    const s = stephensonDeltaT(y, segments);
    const m = frameworkModelDeltaT(y);
    if (!Number.isFinite(s) || !Number.isFinite(m)) continue;
    years.push(y); steph.push(s); baseModel.push(m);
  }
  const espenakYears = Object.keys(ESPENAK_REFERENCE).map(Number).sort((a, b) => a - b);
  const basePhysEsp = espenakYears.map(y => DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6));

  const DELTAS = [];   // seconds/day
  for (let d = -1500e-6; d <= 1500e-6 + 1e-12; d += 250e-6) DELTAS.push(Math.round(d * 1e6) / 1e6);
  const USNOS = [];
  for (let u = 86400.0016; u <= 86400.0030 + 1e-9; u += 0.0002) USNOS.push(Math.round(u * 1e7) / 1e7);

  function linSlope(ys2, vals) {
    const n2 = ys2.length;
    const mx = ys2.reduce((a, b) => a + b, 0) / n2;
    const my = vals.reduce((a, b) => a + b, 0) / n2;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n2; i++) { sxy += (ys2[i] - mx) * (vals[i] - my); sxx += (ys2[i] - mx) ** 2; }
    return sxy / sxx;
  }

  console.log('  δ(μs/day)  bestUSNO      drift(s/yr)  phantom(s)  EspRMS(s)  ΔT2000trend(s)  Bond(s)');
  console.log('  ' + '─'.repeat(90));
  const results = [];
  for (const delta of DELTAS) {
    const residual = years.map((y, i) => steph[i] - deltaTWithLodOffset(baseModel[i], y, delta));
    let best = null;
    for (const usno of USNOS) {
      const shipped = runFitQuiet(usno, years, residual);
      const five = [shipped.bond, shipped.hall, shipped.jose5, shipped.jose4, shipped.h253];
      const residFinal = years.map((y, i) => {
        let s = residual[i];
        for (const c of five) {
          const om = 2 * Math.PI * c.n / EIGHT_H;
          s -= c.cos * Math.cos(om * y) + c.sin * Math.sin(om * y);
        }
        return s;
      });
      const drift = linSlope(years, residFinal);
      const phantom = fitCycles(years, residFinal, [2024], null, null).cycles[0].amplitude;
      // Espenak shape scoring with free deltaTStart (trend offset allowed)
      function cyclesAt(y2) {
        let s = 0;
        for (const c of five) {
          const om = 2 * Math.PI * c.n / EIGHT_H;
          s += c.cos * Math.cos(om * y2) + c.sin * Math.sin(om * y2)
             - (c.cos * Math.cos(om * 2000) + c.sin * Math.sin(om * 2000));
        }
        return s;
      }
      const modelEsp = espenakYears.map((y2, i) =>
        deltaTWithLodOffset(basePhysEsp[i], y2, delta) + cyclesAt(y2));
      const diffs = espenakYears.map((y2, i) => ESPENAK_REFERENCE[y2] - modelEsp[i]);
      const dts = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const rms = Math.sqrt(diffs.reduce((s2, d2) => s2 + (d2 - dts) ** 2, 0) / diffs.length);
      const row = { delta, usno, drift, phantom, rms, deltaTStart: dts,
                    bondAmp: Math.hypot(shipped.bond.cos, shipped.bond.sin) };
      if (!best || Math.abs(row.drift) < Math.abs(best.drift)) best = row;
      results.push(row);
    }
    console.log(`  ${(delta * 1e6).toFixed(0).padStart(7)}   ${best.usno.toFixed(4)}   ${best.drift.toFixed(4).padStart(10)}   ${best.phantom.toFixed(1).padStart(8)}   ${best.rms.toFixed(2).padStart(8)}   ${best.deltaTStart.toFixed(1).padStart(10)}     ${best.bondAmp.toFixed(0).padStart(5)}`);
  }

  // Global verdict: candidates with |drift| < 0.02 s/yr, ranked by Espenak RMS
  const flat = results.filter(r => Math.abs(r.drift) < 0.02).sort((a, b) => a.rms - b.rms);
  console.log('\n  ── Drift-flat candidates (|slope| < 0.02 s/yr), best 8 by Espenak RMS ──');
  console.log('  δ(μs/day)   USNO        drift(s/yr)  phantom(s)  EspRMS(s)  ΔT2000trend(s)');
  for (const r of flat.slice(0, 8)) {
    console.log(`  ${(r.delta * 1e6).toFixed(0).padStart(7)}   ${r.usno.toFixed(4)}   ${r.drift.toFixed(4).padStart(10)}   ${r.phantom.toFixed(1).padStart(8)}   ${r.rms.toFixed(2).padStart(8)}   ${r.deltaTStart.toFixed(1).padStart(10)}`);
  }
  if (flat.length === 0) console.log('  (none — no grid point flattens the drift)');
  console.log('\n  Reading: hypothesis CONFIRMED if drift-flat candidates cluster near');
  console.log('  δ ≈ ±700–800 μs/day with Espenak RMS ≲ 25 s and |ΔT2000trend − 63.8| ≲ 10 s.');
  console.log('  δ ≈ 0 flat candidates would mean the drift is already stack-absorbable.');
  console.log('  Diagnostic only — nothing written.');
}

function runSweepUsno() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  JOINT SWEEP — USNO anchor × best deltaTStart, scored vs Espenak');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (process.env.DT_CORRECTIONS_DISABLED !== '1') {
    console.log('  ✗ REFUSING: DT_CORRECTIONS_DISABLED=1 not set.');
    console.log('    Without it, DT.meanDeltaTSecondsAtAge returns physics + currently-shipped cycles,');
    console.log('    which double-counts when the sweep adds its own trial cycles on top.');
    console.log('    Re-run with:  DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --sweep-usno');
    process.exit(1);
  }

  const segments = loadStephenson();
  const { years, residual } = sampleResidual(segments);
  const { best, rows, espenakYears } = findJointOptimum(years, residual);

  console.log('  USNO anchor sweep: [' + rows[0].usno.toFixed(4) + ' … ' + rows[rows.length - 1].usno.toFixed(4) + '] in 0.1 ms steps');
  console.log('  Scoring against Espenak at ' + espenakYears.length + ' years spanning ' + espenakYears[0] + '..' + espenakYears[espenakYears.length - 1] + '\n');
  console.log('  USNO      | Best dTStart | RMS vs Esp  | J2000 model | Bond amp  | Stage-D RMS');
  console.log('  ----------|--------------|-------------|-------------|-----------|-------------');
  for (const r of rows) {
    console.log(
      '  ' + r.usno.toFixed(4) + '  | ' +
      r.bestDeltaTStart.toFixed(3).padStart(12) + ' | ' +
      r.rms.toFixed(3).padStart(11) + ' | ' +
      r.modelJ2000.toFixed(3).padStart(11) + ' | ' +
      r.bondAmp.toFixed(2).padStart(9) + ' | ' +
      r.stageDRms.toFixed(2).padStart(11)
    );
  }

  console.log('\n  ─── OPTIMUM ───');
  console.log('  Best USNO anchor : ' + best.usno.toFixed(4) + ' s');
  console.log('  Best deltaTStart : ' + best.bestDeltaTStart.toFixed(3) + ' s');
  console.log('  Espenak-vs-model RMS : ' + best.rms.toFixed(3) + ' s (across ' + espenakYears.length + ' reference years)');
  console.log('  Model ΔT at J2000 : ' + best.modelJ2000.toFixed(2) + ' s (Espenak: 63.83 s)');
  console.log('  Bond amp (post-adj)  : ' + best.bondAmp.toFixed(2) + ' s');
  console.log('\n  → The main fit (without --fixed-anchors) already selects this pair automatically.');
  console.log('    Sweep is diagnostic only — nothing is written or synced by --sweep-usno.\n');
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
  console.log(`  Raw residual RMS: ${rmsResidual.toFixed(1)} s`);

  // Per-sample weights: bias toward the modern well-observed era.
  const mw = CONFIG.modern_era_weight;
  const sampleWeights = years.map(y => y >= mw.modern_start_year ? mw.modern_weight : 1);
  const nModern = sampleWeights.filter(w => w > 1).length;
  if (mw.modern_weight !== 1) {
    console.log(`  Modern-era weight: ${mw.modern_weight}× on ${nModern} samples (year ≥ ${mw.modern_start_year}); 1× on ${years.length - nModern} older samples\n`);
  } else {
    console.log(`  Modern-era weight: DISABLED (uniform)\n`);
  }

  // ─── Joint-optimum auto-selection ─────────────────────────────────
  // Default: sweep USNO anchor × best deltaTStart against Espenak reference,
  // pick the (usno, deltaTStart) pair with lowest RMS, use those for the
  // Stage-D fit + JSON output + sync. Override with --fixed-anchors to keep
  // CONFIG.usno_target_lod_s as-is (skip auto-selection).
  let effectiveUsnoTarget = CONFIG.usno_anchor.usno_target_lod_s;
  let effectiveDeltaTStart = null;   // null → not auto-selected; caller uses existing src/script.js value
  let optimumRow = null;
  if (!FIXED_ANCHORS) {
    if (process.env.DT_CORRECTIONS_DISABLED !== '1') {
      console.log('  ⚠ Skipping auto-optimum sweep — DT_CORRECTIONS_DISABLED=1 not set.');
      console.log('    Using CONFIG.usno_target_lod_s = ' + effectiveUsnoTarget + ' and existing src/script.js deltaTStart.\n');
    } else {
      console.log('── Joint optimum sweep (USNO × deltaTStart vs Espenak) ──');
      const { best, rows } = findJointOptimum(years, residual);
      effectiveUsnoTarget = best.usno;
      effectiveDeltaTStart = best.bestDeltaTStart;
      optimumRow = best;
      console.log(`  Swept ${rows.length} USNO values → optimum:`);
      console.log(`    USNO         = ${best.usno.toFixed(4)}   (CONFIG default: ${CONFIG.usno_anchor.usno_target_lod_s})`);
      console.log(`    deltaTStart  = ${best.bestDeltaTStart.toFixed(3)} s   (will sync to src/script.js)`);
      console.log(`    Espenak RMS  = ${best.rms.toFixed(3)} s`);
      console.log(`    Bond amp     = ${best.bondAmp.toFixed(2)} s`);
      console.log(`  (Use --fixed-anchors to skip auto-optimum and force CONFIG values.)\n`);
    }
  } else {
    console.log('  --fixed-anchors: skipping auto-optimum sweep. Using CONFIG.usno_target_lod_s = ' + effectiveUsnoTarget + '.\n');
  }

  // Shipped-cycle helper: cap free-fit amplitude at target_amp_s (scale down + preserve
  // phase) when free > target; otherwise use free-fit as-is. Ensures a constrained
  // "physical prior" only DEFLATES an inflated free-fit, never inflates a modest one.
  function shipCycle(cycle, free) {
    const target = cycle.target_amp_s;
    const useFreeAsIs = target === null || free.amplitude <= target;
    const scale = useFreeAsIs ? 1 : target / free.amplitude;
    return {
      n:         cycle.lattice_n,
      cos:       free.cos * scale,
      sin:       free.sin * scale,
      amplitude: useFreeAsIs ? free.amplitude : target,
      phase_deg: free.phase_deg,
      constrained: !useFreeAsIs,
    };
  }

  // ─── Stage A: Bond solo ─────────────────────────────────────
  const bondCycle = CONFIG.cycles.find(c => c.name === 'bond');
  const fitA = fitCycles(years, residual, [bondCycle.lattice_n], null, sampleWeights);
  const bondSolo = fitA.cycles[0];
  console.log('── Stage A: Bond solo (unconstrained; the primary anchor) ──');
  console.log(`  R² = ${fitA.r2.toFixed(4)}, RMS post = ${fitA.rms_post.toFixed(1)} s (all)  ${fitA.rms_post_modern ? fitA.rms_post_modern.toFixed(1) + ' s (≥1600)' : ''}`);
  console.log(`  Bond  amp = ${bondSolo.amplitude.toFixed(2)} s  phase = ${bondSolo.phase_deg.toFixed(2)}°`);
  console.log(`  Bond  cos = ${bondSolo.cos.toFixed(6)}  sin = ${bondSolo.sin.toFixed(6)}\n`);

  // ─── Stage B: Bond + Hallstatt joint; scale Hallstatt to target ─────
  const hallCycle = CONFIG.cycles.find(c => c.name === 'hallstatt');
  const fitB = fitCycles(years, residual, [bondCycle.lattice_n, hallCycle.lattice_n], null, sampleWeights);
  const bondB = fitB.cycles[0], hallFree = fitB.cycles[1];
  const hallShipped = shipCycle(hallCycle, hallFree);
  const bondPhaseShiftB = bondB.phase_deg - bondSolo.phase_deg;
  const bondAmpDeltaB   = bondB.amplitude - bondSolo.amplitude;
  console.log('── Stage B: Bond + Hallstatt joint (Hallstatt scaled to target) ──');
  console.log(`  R² = ${fitB.r2.toFixed(4)}, RMS post = ${fitB.rms_post.toFixed(1)} s (all)  ${fitB.rms_post_modern ? fitB.rms_post_modern.toFixed(1) + ' s (≥1600)' : ''}`);
  console.log(`  Bond      amp = ${bondB.amplitude.toFixed(2)} s (Δ vs solo = ${bondAmpDeltaB.toFixed(2)})  phase = ${bondB.phase_deg.toFixed(2)}° (Δ = ${bondPhaseShiftB >= 0 ? '+' : ''}${bondPhaseShiftB.toFixed(2)}°)`);
  console.log(`  Hallstatt free amp = ${hallFree.amplitude.toFixed(2)} s  phase = ${hallFree.phase_deg.toFixed(2)}°`);
  console.log(`  Hallstatt ${hallShipped.constrained ? 'CAPPED at ' + hallCycle.target_amp_s : 'kept at free-fit ' + hallShipped.amplitude.toFixed(2)} s: cos = ${hallShipped.cos.toFixed(6)}  sin = ${hallShipped.sin.toFixed(6)}\n`);

  // ─── Stage C: Bond + Hallstatt + Jose5 joint; scale Jose5 to target ─────
  const joseCycle = CONFIG.cycles.find(c => c.name === 'jose5');
  const fitC = fitCycles(years, residual, [bondCycle.lattice_n, hallCycle.lattice_n, joseCycle.lattice_n], null, sampleWeights);
  const bondC = fitC.cycles[0], hallC = fitC.cycles[1], joseFree = fitC.cycles[2];
  const joseShipped = shipCycle(joseCycle, joseFree);
  const bondPhaseShiftC = bondC.phase_deg - bondSolo.phase_deg;
  console.log('── Stage C: Bond + Hallstatt + Jose5 joint (Jose5 scaled to target) ──');
  console.log(`  R² = ${fitC.r2.toFixed(4)}, RMS post = ${fitC.rms_post.toFixed(1)} s (all)  ${fitC.rms_post_modern ? fitC.rms_post_modern.toFixed(1) + ' s (≥1600)' : ''}`);
  console.log(`  Bond amp = ${bondC.amplitude.toFixed(2)} s (Δ vs solo = ${(bondC.amplitude - bondSolo.amplitude).toFixed(2)})  phase Δ vs solo = ${bondPhaseShiftC.toFixed(2)}°`);
  console.log(`  Hallstatt free amp = ${hallC.amplitude.toFixed(2)} s (Δ vs pair = ${(hallC.amplitude - hallFree.amplitude).toFixed(2)})`);
  console.log(`  Jose5 free amp = ${joseFree.amplitude.toFixed(2)} s  phase = ${joseFree.phase_deg.toFixed(2)}°`);
  console.log(`  Jose5 ${joseShipped.constrained ? 'CAPPED at ' + joseCycle.target_amp_s : 'kept at free-fit ' + joseShipped.amplitude.toFixed(2)} s: cos = ${joseShipped.cos.toFixed(6)}  sin = ${joseShipped.sin.toFixed(6)}\n`);

  // ─── Stage D: Bond + Hallstatt + Jose5 + Jose4 joint (with USNO LOD anchor) ─────
  const jose4Cycle = CONFIG.cycles.find(c => c.name === 'jose4');
  const stageDDivisors = [bondCycle.lattice_n, hallCycle.lattice_n, joseCycle.lattice_n, jose4Cycle.lattice_n];
  // Apply USNO LOD anchor at Stage D only (if enabled). Forces
  // Σ cycleLodCorrection_i(2000) = usnoTargetOffset (derived from usno_target_lod_s).
  let anchorArg = null;
  let usnoDerivation = null;
  if (CONFIG.usno_anchor.enabled && CONFIG.usno_anchor.apply_at_stage === 'D') {
    usnoDerivation = computeUsnoTargetOffset(effectiveUsnoTarget);
    const anchorRow = computeAnchorRow(stageDDivisors, usnoDerivation.targetOffset);
    anchorArg = { ...anchorRow, weight: CONFIG.usno_anchor.weight };
    console.log('── USNO LOD anchor active for Stage D ──');
    console.log(`  USNO target (${FIXED_ANCHORS ? 'CONFIG override' : 'auto-optimum'}): lodReal(2000) = ${effectiveUsnoTarget} s`);
    console.log(`  o.lodKinematic(2000)  = ${usnoDerivation.lodKinematic.toFixed(9)} s   (IAU_sid_sec / fitted sid_days@2000 = ${usnoDerivation.sidDays2000})`);
    console.log(`  h5Correction(2000)    = ${(usnoDerivation.h5At2000 * 1000).toFixed(6)} ms   (86400 / ((H/5)·mSY))`);
    console.log(`  → derived target: Σ cycleLodCorrection(2000) = ${(usnoDerivation.targetOffset * 1000).toFixed(4)} ms`);
    console.log(`  Soft-constraint weight: ${CONFIG.usno_anchor.weight.toExponential(0)}\n`);
  }
  const fitD = fitCycles(years, residual, stageDDivisors, anchorArg, sampleWeights);
  const bondD = fitD.cycles[0], hallD = fitD.cycles[1], joseD = fitD.cycles[2], jose4Free = fitD.cycles[3];
  const jose4Shipped = shipCycle(jose4Cycle, jose4Free);
  const bondPhaseShiftD = bondD.phase_deg - bondSolo.phase_deg;
  console.log('── Stage D: Bond + Hallstatt + Jose5 + Jose4 joint (Jose4 scaled to target) ──');
  console.log(`  R² = ${fitD.r2.toFixed(4)}, RMS post = ${fitD.rms_post.toFixed(1)} s (all)  ${fitD.rms_post_modern ? fitD.rms_post_modern.toFixed(1) + ' s (≥1600)' : ''}`);
  console.log(`  Bond amp = ${bondD.amplitude.toFixed(2)} s (Δ vs solo = ${(bondD.amplitude - bondSolo.amplitude).toFixed(2)})  phase Δ vs solo = ${bondPhaseShiftD.toFixed(2)}°`);
  console.log(`  Hallstatt free amp = ${hallD.amplitude.toFixed(2)} s`);
  console.log(`  Jose5    free amp = ${joseD.amplitude.toFixed(2)} s`);
  console.log(`  Jose4   free amp = ${jose4Free.amplitude.toFixed(2)} s  phase = ${jose4Free.phase_deg.toFixed(2)}°`);
  console.log(`  Jose4 ${jose4Shipped.constrained ? 'CAPPED at ' + jose4Cycle.target_amp_s : 'kept at free-fit ' + jose4Shipped.amplitude.toFixed(2)} s: cos = ${jose4Shipped.cos.toFixed(6)}  sin = ${jose4Shipped.sin.toFixed(6)}`);
  if (fitD.anchorAchieved) {
    const a = fitD.anchorAchieved;
    console.log(`  USNO anchor: target=${(a.target*1000).toFixed(4)} ms  achieved=${(a.achieved*1000).toFixed(4)} ms  residual=${(a.residual_s*1e6).toFixed(3)} μs`);
  }
  console.log('');

  // ─── Collinearity warnings ─────────────────────────────────
  console.log('── Collinearity check ──');
  const warnings = [];
  if (Math.abs(bondPhaseShiftB) > 25) warnings.push(`Bond phase shifted ${bondPhaseShiftB.toFixed(1)}° when Hallstatt added (>25° threshold)`);
  if (Math.abs(bondPhaseShiftC) > 25) warnings.push(`Bond phase shifted ${bondPhaseShiftC.toFixed(1)}° when Jose5 added (>25° threshold)`);
  if (Math.abs(bondPhaseShiftD) > 25) warnings.push(`Bond phase shifted ${bondPhaseShiftD.toFixed(1)}° when Jose4 added (>25° threshold)`);
  if (hallFree.amplitude > 400)      warnings.push(`Hallstatt free-fit amp ${hallFree.amplitude.toFixed(0)} s exceeds 400 s guardrail`);
  if (joseFree.amplitude > 200)      warnings.push(`Jose5 free-fit amp ${joseFree.amplitude.toFixed(0)} s exceeds 200 s guardrail`);
  if (jose4Free.amplitude > 200)      warnings.push(`Jose4 free-fit amp ${jose4Free.amplitude.toFixed(0)} s exceeds 200 s guardrail (Bond/2 degeneracy may inflate)`);
  // (h253 guardrail is checked inside Stage E below — it runs after this block.)
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

  // ─── Ship-selection strategy ───────────────────────────────────
  // If the USNO anchor is active (Stage D), ALL FOUR cycles ship from Stage D so
  // the anchor's effect on the coefficients is preserved. Bond loses the
  // "solo-phase" advantage but gains USNO alignment (design shift 2026-07-18).
  // Amplitude caps for Hallstatt/Jose5/Jose4 are still applied from Stage D
  // free-fit values (scale down if free > target, preserve phase).
  //
  // BUT: capping Hallstatt/Jose5/Jose4 (which the fit relied on to hit the
  // anchor) drifts ΣcycleLOD(2000) away from the target. So after caps we
  // apply a minimum-norm shift to Bond's (cos, sin) to recover the anchor
  // exactly — 2 unknowns, 1 constraint, minimum-norm solution:
  //   delta_cos = w_cos × Δ / (w_cos² + w_sin²)
  //   delta_sin = w_sin × Δ / (w_cos² + w_sin²)
  // Bond ends up close to Stage D's anchored value but adjusted to close the
  // cap-induced drift. This is small (~0.6 ms LOD / ~5 s in Bond amplitude).
  //
  // Without the anchor (usno_anchor.enabled = false), reverts to the original
  // cascade shipping: Bond=solo, Hallstatt=Stage B, Jose5=Stage C, Jose4=Stage D.
  const anchorActive = CONFIG.usno_anchor.enabled && fitD.anchorAchieved !== null;
  const bondForShipRaw = anchorActive ? bondD : bondSolo;
  let hallForShip = anchorActive ? shipCycle(hallCycle, hallD) : hallShipped;
  let joseForShip = anchorActive ? shipCycle(joseCycle, joseD) : joseShipped;
  let jose4ForShip = jose4Shipped;   // always from Stage D (unchanged)

  // ─── Stage E: h253 frozen-residual fit (2026-07-22) ────────────────────
  // The four Stage-D cycles are FROZEN (post-cap shipped values) and their
  // contribution subtracted from the residual; h253 fits alone on what's
  // left. This is structurally immune to the Bond-collinearity blowup that
  // rolled back Eddy-999 (1,326 yr vs Bond 1,466 yr beat ≈ 14 kyr — a joint
  // fit would be near-degenerate over the 2.7-kyr window; the frozen fit
  // sidesteps it). GO evidence: scripts/lod_residual_h253_fifth_cycle.py.
  const h253Cycle = CONFIG.cycles.find(c => c.name === 'h253');
  const frozenFour = [bondForShipRaw, hallForShip, joseForShip, jose4ForShip];
  const residualE = years.map((y, i) => {
    let s = residual[i];
    for (const c of frozenFour) {
      const om = 2 * Math.PI * c.n / EIGHT_H;
      s -= c.cos * Math.cos(om * y) + c.sin * Math.sin(om * y);
    }
    return s;
  });
  const fitE = fitCycles(years, residualE, [h253Cycle.lattice_n], null, sampleWeights);
  const h253Free = fitE.cycles[0];
  let h253ForShip = shipCycle(h253Cycle, h253Free);
  console.log('── Stage E: h253 (frozen-residual fit after the four Stage-D cycles) ──');
  console.log(`  R² = ${fitE.r2.toFixed(4)}, RMS post = ${fitE.rms_post.toFixed(1)} s (all)  ${fitE.rms_post_modern ? fitE.rms_post_modern.toFixed(1) + ' s (≥1600)' : ''}`);
  console.log(`  h253 free amp = ${h253Free.amplitude.toFixed(2)} s  phase = ${h253Free.phase_deg.toFixed(2)}°`);
  console.log(`  h253 ${h253ForShip.constrained ? 'CAPPED at ' + h253Cycle.target_amp_s : 'kept at free-fit ' + h253ForShip.amplitude.toFixed(2)} s: cos = ${h253ForShip.cos.toFixed(6)}  sin = ${h253ForShip.sin.toFixed(6)}`);
  if (h253Free.amplitude > 200) {
    warnings.push(`h253 free-fit amp ${h253Free.amplitude.toFixed(0)} s exceeds 200 s guardrail`);
    console.log(`  ⚠ h253 free-fit amp ${h253Free.amplitude.toFixed(0)} s exceeds 200 s guardrail`);
  }
  console.log('');

  // cycleLOD-at-J2000 helper (identity with runtime _cycleLodCorrection at
  // year=2000 with taper=1, taper_prime=0).
  function cycleLodAtJ2000(c) {
    const omega = 2 * Math.PI * c.n / EIGHT_H;
    return 86400 * omega * (c.sin * Math.cos(omega * 2000) - c.cos * Math.sin(omega * 2000)) / MEAN_TROPICAL_YEAR_J2000_S;
  }

  // Post-cap anchor closure. h253's J2000 LOD contribution is included in
  // the pre-adjust sum so the full stack closes onto the USNO anchor exactly.
  let bondForShip = bondForShipRaw;
  let bondAdjustment = null;
  const anchorTarget = usnoDerivation ? usnoDerivation.targetOffset : null;
  if (anchorActive) {
    // Bond-only min-norm closure — RETAINED after the 2026-07-22 closure-design
    // experiments. Alternatives tested the same day and rejected on Espenak
    // scoring: distributed min-norm over uncapped cycles (23.57 s — dumps the
    // distortion into Jose4 and damages the modern window) and an anchored
    // cap-refit with the in-fit USNO constraint (23.16 s — converges to the
    // SAME ~74 s Bond haircut). Bond-only scores 21.66 s. Conclusion: the
    // ~74 s Bond amplitude cost is the SHADOW PRICE of the USNO anchor itself
    // (the constrained optimum pays it in every formulation), and its deficit
    // is what the post-closure phantom check below quantifies as the apparent
    // ~1,326-yr residual line. See scripts/lod_residual_h253_fifth_cycle.py;
    // rejected closure implementations preserved in git history (see the
    // closure-design experiment note above the quiet-fit section).
    const preAdjSum = cycleLodAtJ2000(bondForShipRaw)
                    + cycleLodAtJ2000(hallForShip)
                    + cycleLodAtJ2000(joseForShip)
                    + cycleLodAtJ2000(jose4ForShip)
                    + cycleLodAtJ2000(h253ForShip);
    const deltaLod = anchorTarget - preAdjSum;

    const omB = 2 * Math.PI * bondCycle.lattice_n / EIGHT_H;
    const wCos = -86400 * omB * Math.sin(omB * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
    const wSin = +86400 * omB * Math.cos(omB * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
    const denom = wCos * wCos + wSin * wSin;
    const dCos = wCos * deltaLod / denom;
    const dSin = wSin * deltaLod / denom;
    const cosAdj = bondForShipRaw.cos + dCos;
    const sinAdj = bondForShipRaw.sin + dSin;
    bondForShip = {
      n: bondForShipRaw.n,
      cos: cosAdj,
      sin: sinAdj,
      amplitude: Math.hypot(cosAdj, sinAdj),
      phase_deg: Math.atan2(sinAdj, cosAdj) * 180 / Math.PI,
    };
    bondAdjustment = {
      closure_mode: 'bond-only min-norm (retained; see 2026-07-22 closure-design experiment notes above)',
      pre_adj_sum_lod_s: preAdjSum,
      delta_lod_s: deltaLod,
      cos_shift_s: dCos,
      sin_shift_s: dSin,
      amp_shift_s: bondForShip.amplitude - bondForShipRaw.amplitude,
      phase_shift_deg: bondForShip.phase_deg - bondForShipRaw.phase_deg,
    };
  }

  // ─── Post-closure phantom check ────────────────────────────────────────
  // Re-fit the 8H/2024 line against the FINAL shipped-stack residual. Under
  // the old Bond-only closure this phantom measured ~73–85 s (the Bond
  // haircut leaking into the ~1,326-yr band); target after the distributed
  // closure is ≲ the Stage-E irreducible level (~12 s).
  {
    const finalFive = [bondForShip, hallForShip, joseForShip, jose4ForShip, h253ForShip];
    const residualFinal = years.map((y, i) => {
      let s = residual[i];
      for (const c of finalFive) {
        const om = 2 * Math.PI * c.n / EIGHT_H;
        s -= c.cos * Math.cos(om * y) + c.sin * Math.sin(om * y);
      }
      return s;
    });
    const fitPhantom = fitCycles(years, residualFinal, [2024], null, sampleWeights);
    const ph = fitPhantom.cycles[0];
    const polyOnly = fitCycles(years, residualFinal, [], null, sampleWeights);
    console.log('── Post-closure phantom check (8H/2024 line vs final shipped residual) ──');
    console.log(`  phantom amp = ${ph.amplitude.toFixed(2)} s  (Bond-only closure historically ~73–85 s; target ≲ 12 s)`);
    console.log(`  final shipped-stack residual RMS (poly-detrended) = ${polyOnly.rms_post.toFixed(1)} s (all)  ${polyOnly.rms_post_modern ? polyOnly.rms_post_modern.toFixed(1) + ' s (≥1600)' : ''}`);
    console.log('');
  }

  const bondJ2000 = rawAtJ2000(bondForShip);
  const hallJ2000 = rawAtJ2000(hallForShip);
  const joseJ2000 = rawAtJ2000(joseForShip);
  const jose4J2000 = rawAtJ2000(jose4ForShip);
  const h253J2000 = rawAtJ2000(h253ForShip);

  const sumLodAtJ2000 =
      cycleLodAtJ2000(bondForShip)
    + cycleLodAtJ2000(hallForShip)
    + cycleLodAtJ2000(joseForShip)
    + cycleLodAtJ2000(jose4ForShip)
    + cycleLodAtJ2000(h253ForShip);

  // ─── Print shipped coefficients ───
  console.log('── Shipped coefficients ' +
    (anchorActive ? '(all 4 from anchored Stage D; caps applied post-fit)'
                  : '(bond=solo phase; others=cap-only)') + ' ──');
  console.log(`  BOND      cos = ${bondForShip.cos}`);
  console.log(`  BOND      sin = ${bondForShip.sin}`);
  console.log(`  BOND      raw@J2000 = ${bondJ2000.toFixed(6)}`);
  console.log(`  HALLSTATT cos = ${hallForShip.cos}`);
  console.log(`  HALLSTATT sin = ${hallForShip.sin}`);
  console.log(`  HALLSTATT raw@J2000 = ${hallJ2000.toFixed(6)}`);
  console.log(`  JOSE5     cos = ${joseForShip.cos}`);
  console.log(`  JOSE5     sin = ${joseForShip.sin}`);
  console.log(`  JOSE5     raw@J2000 = ${joseJ2000.toFixed(6)}`);
  console.log(`  JOSE4    cos = ${jose4ForShip.cos}`);
  console.log(`  JOSE4    sin = ${jose4ForShip.sin}`);
  console.log(`  JOSE4    raw@J2000 = ${jose4J2000.toFixed(6)}`);
  console.log(`  H253     cos = ${h253ForShip.cos}`);
  console.log(`  H253     sin = ${h253ForShip.sin}`);
  console.log(`  H253     raw@J2000 = ${h253J2000.toFixed(6)}`);
  if (anchorActive) {
    const driftMs = (sumLodAtJ2000 - anchorTarget) * 1000;
    console.log(`  ── USNO LOD anchor achievement (post-cap + Bond adjustment) ──`);
    if (bondAdjustment) {
      console.log(`  pre-Bond-adjust Σ cycleLOD(2000) = ${(bondAdjustment.pre_adj_sum_lod_s * 1000).toFixed(4)} ms`);
      console.log(`  Bond shift to close anchor: Δcos=${bondAdjustment.cos_shift_s.toFixed(3)}s  Δsin=${bondAdjustment.sin_shift_s.toFixed(3)}s`);
      console.log(`    → Bond amp shift ${bondAdjustment.amp_shift_s >= 0 ? '+' : ''}${bondAdjustment.amp_shift_s.toFixed(2)}s  phase shift ${bondAdjustment.phase_shift_deg >= 0 ? '+' : ''}${bondAdjustment.phase_shift_deg.toFixed(3)}°`);
    }
    console.log(`  target       Σ cycleLOD(2000) = ${(anchorTarget * 1000).toFixed(4)} ms`);
    console.log(`  shipped      Σ cycleLOD(2000) = ${(sumLodAtJ2000 * 1000).toFixed(4)} ms`);
    console.log(`  drift from anchor            = ${driftMs.toFixed(6)} ms  ${Math.abs(driftMs) < 0.001 ? '✓ (< 1 μs)' : Math.abs(driftMs) < 0.010 ? '✓ (< 10 μs)' : '⚠'}`);
  }
  console.log('');

  // ─── Write JSON artifact ───
  const output = {
    _meta: {
      description: 'Sub-Milankovitch H-lattice ΔT correction stack fit against Stephenson 2016 residual. Four cascaded stages (Bond solo → +Hallstatt → +Jose5 → +Jose4). Bond uses solo-fit phase (unconstrained amplitude, physical anchor). All other cycles use cap-only shipping (free-fit if below prior amplitude; scaled down to prior only if free > prior). Jose4 identified by cross-archive scans (Steinhilber+EPICA). Eddy (8H/2684 = 999 yr) and Emp862 (8H/3111 = 862 yr) were tested as 5th/6th flags but both rolled back — see rollback notes in CONFIG.cycles. See docs/102 § "Companion 8H lattice harmonics" and scripts/lattice_harmonic_scan.py.',
      generator: 'tools/fit/dt-corrections-fit.js',
      dt_corrections_disabled: process.env.DT_CORRECTIONS_DISABLED === '1',
      H_yr: H,
      eight_H_yr: EIGHT_H,
    },
    config: CONFIG,
    fit_metrics: {
      stage_a_bond_solo:                     { r2: fitA.r2, rms_post: fitA.rms_post, rms_post_modern: fitA.rms_post_modern },
      stage_b_bond_hallstatt_joint:          { r2: fitB.r2, rms_post: fitB.rms_post, rms_post_modern: fitB.rms_post_modern, bond_phase_shift_deg: bondPhaseShiftB, hallstatt_free_amp_s: hallFree.amplitude },
      stage_c_bond_hallstatt_jose5:          { r2: fitC.r2, rms_post: fitC.rms_post, rms_post_modern: fitC.rms_post_modern, bond_phase_shift_deg: bondPhaseShiftC, jose5_free_amp_s: joseFree.amplitude },
      stage_d_bond_hallstatt_jose5_jose4:   { r2: fitD.r2, rms_post: fitD.rms_post, rms_post_modern: fitD.rms_post_modern, bond_phase_shift_deg: bondPhaseShiftD, jose4_free_amp_s: jose4Free.amplitude },
      stage_e_h253_frozen_residual:          { r2: fitE.r2, rms_post: fitE.rms_post, rms_post_modern: fitE.rms_post_modern, h253_free_amp_s: h253Free.amplitude, h253_free_phase_deg: h253Free.phase_deg },
    },
    collinearity_warnings: warnings,
    optimum: (effectiveDeltaTStart !== null) ? {
      // Joint-optimum values selected by findJointOptimum() against the
      // ESPENAK_REFERENCE year list. Both propagate through export-dt-corrections.js
      // when --sync-code is set: usno_target_lod_s stays inside the fit config
      // (JSON) and deltaTStart is written to src/script.js.
      usno_target_lod_s: effectiveUsnoTarget,
      deltaTStart:       effectiveDeltaTStart,
      espenak_rms_s:     optimumRow ? optimumRow.rms : null,
      selected_by:       'auto (--sweep default; disable with --fixed-anchors)',
    } : {
      usno_target_lod_s: effectiveUsnoTarget,
      deltaTStart:       null,   // not auto-selected; keep whatever is in src/script.js
      selected_by:       FIXED_ANCHORS ? 'manual (--fixed-anchors)' : 'CONFIG default (auto-optimum skipped: DT_CORRECTIONS_DISABLED not set)',
    },
    usno_anchor: anchorActive ? {
      enabled: true,
      usno_target_lod_s: effectiveUsnoTarget,
      derived_target_offset_s: anchorTarget,
      derivation: {
        lod_kinematic_at_j2000_s: usnoDerivation.lodKinematic,
        fitted_sidereal_days_at_2000: usnoDerivation.sidDays2000,
        h5_correction_s: usnoDerivation.h5At2000,
      },
      shipped_sum_lod_at_j2000_s: sumLodAtJ2000,
      drift_from_target_s: sumLodAtJ2000 - anchorTarget,
      fit_stage: 'D',
      soft_constraint_weight: CONFIG.usno_anchor.weight,
      fit_residual_s: fitD.anchorAchieved ? fitD.anchorAchieved.residual_s : null,
      post_cap_bond_adjustment: bondAdjustment,
    } : { enabled: false },
    shipped_coefficients: {
      bond: {
        lattice_n: bondCycle.lattice_n,
        period_yr: EIGHT_H / bondCycle.lattice_n,
        cos_coeff_s: bondForShip.cos,
        sin_coeff_s: bondForShip.sin,
        raw_at_j2000_s: bondJ2000,
        amplitude_s: bondForShip.amplitude,
        phase_deg: bondForShip.phase_deg,
        source: anchorActive ? 'Stage D anchored fit (USNO LOD constraint active)' : 'Stage A solo fit',
      },
      hallstatt: {
        lattice_n: hallCycle.lattice_n,
        period_yr: EIGHT_H / hallCycle.lattice_n,
        cos_coeff_s: hallForShip.cos,
        sin_coeff_s: hallForShip.sin,
        raw_at_j2000_s: hallJ2000,
        amplitude_s: hallForShip.amplitude,
        phase_deg: hallForShip.phase_deg,
        target_amp_source: hallForShip.constrained
          ? `CAPPED from ${anchorActive ? 'anchored quad' : 'pair'}-fit free amp ${(anchorActive ? hallD.amplitude : hallFree.amplitude).toFixed(2)} s → ${hallCycle.target_amp_s} s prior`
          : `unconstrained: ${anchorActive ? 'anchored quad' : 'pair'}-fit free amp ${(anchorActive ? hallD.amplitude : hallFree.amplitude).toFixed(2)} s (below ${hallCycle.target_amp_s} s prior — no cap applied)`,
      },
      jose5: {
        lattice_n: joseCycle.lattice_n,
        period_yr: EIGHT_H / joseCycle.lattice_n,
        cos_coeff_s: joseForShip.cos,
        sin_coeff_s: joseForShip.sin,
        raw_at_j2000_s: joseJ2000,
        amplitude_s: joseForShip.amplitude,
        phase_deg: joseForShip.phase_deg,
        target_amp_source: joseForShip.constrained
          ? `CAPPED from ${anchorActive ? 'anchored quad' : 'triple'}-fit free amp ${(anchorActive ? joseD.amplitude : joseFree.amplitude).toFixed(2)} s → ${joseCycle.target_amp_s} s prior`
          : `unconstrained: ${anchorActive ? 'anchored quad' : 'triple'}-fit free amp ${(anchorActive ? joseD.amplitude : joseFree.amplitude).toFixed(2)} s (below ${joseCycle.target_amp_s} s prior — no cap applied)`,
      },
      jose4: {
        lattice_n: jose4Cycle.lattice_n,
        period_yr: EIGHT_H / jose4Cycle.lattice_n,
        cos_coeff_s: jose4ForShip.cos,
        sin_coeff_s: jose4ForShip.sin,
        raw_at_j2000_s: jose4J2000,
        amplitude_s: jose4ForShip.amplitude,
        phase_deg: jose4ForShip.phase_deg,
        target_amp_source: jose4ForShip.constrained
          ? `CAPPED from quad-fit free amp ${jose4Free.amplitude.toFixed(2)} s → ${jose4Cycle.target_amp_s} s prior`
          : `unconstrained: quad-fit free amp ${jose4Free.amplitude.toFixed(2)} s (below ${jose4Cycle.target_amp_s} s prior — no cap applied)`,
      },
      h253: {
        lattice_n: h253Cycle.lattice_n,
        period_yr: EIGHT_H / h253Cycle.lattice_n,
        cos_coeff_s: h253ForShip.cos,
        sin_coeff_s: h253ForShip.sin,
        raw_at_j2000_s: h253J2000,
        amplitude_s: h253ForShip.amplitude,
        phase_deg: h253ForShip.phase_deg,
        target_amp_source: h253ForShip.constrained
          ? `CAPPED from Stage-E frozen-residual free amp ${h253Free.amplitude.toFixed(2)} s → ${h253Cycle.target_amp_s} s prior`
          : `unconstrained: Stage-E frozen-residual free amp ${h253Free.amplitude.toFixed(2)} s (below ${h253Cycle.target_amp_s} s prior — no cap applied)`,
        source: 'Stage E frozen-residual fit (four Stage-D cycles subtracted; immune to Bond collinearity)',
      },
    },
  };

  if (WRITE) {
    const outPath = path.join(__dirname, '..', '..', 'data', 'deltaT-4flag-fit.json');
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
    console.log('  (dry run — add --write to persist to data/deltaT-4flag-fit.json)');
  }
}

// Dispatch: --sweep-usno runs the joint-optimum diagnostic sweep instead of the
// normal single-shot fit. The sweep does NOT write or sync — it prints a table
// of (usno, best deltaTStart, RMS vs Espenak) so the user can pick a value.
if (process.argv.includes('--sweep-usno')) {
  runSweepUsno();
} else if (process.argv.includes('--sweep-epoch')) {
  runSweepEpoch();
} else {
  main();
}
