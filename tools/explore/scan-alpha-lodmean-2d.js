// ═══════════════════════════════════════════════════════════════════════════
// 2D α × lodMean OFFSET SCAN — orthogonality test for the joint optimum
//
// Both α-rate scaling AND lodMean offset improve L-5b vs production. But are
// they independent levers (orthogonal — joint gain > single-parameter gain)
// or coupled (redundant — joint gain ≈ best single)?
//
// This scanner grids over both simultaneously:
//   α ∈ [1.0 .. 1.5]    step 0.05   (11 points, from prod to steep-past)
//   Δ ∈ [-5.0 .. +2.0] ms step 0.5  (15 points, from -4.5 opt to positive)
//
// For each (α, Δ) pair:
//   lodMean_scaled(τ) = LOD_MEAN_J2000 + α × (lodMean_prod(τ) − LOD_MEAN_J2000) + Δ
//   h5 = lodMean_scaled / ((H/5) × mSY_days)     [formula, positive]
//   Refit 4-flag stack against Stephenson (USNO anchor uses current h5 value)
//   Compute L-5b|R|
//
// Prints a heatmap-style 2D table + reports joint minimum.
//
// Usage: DT_CORRECTIONS_DISABLED=1 node tools/fit/scan-alpha-lodmean-2d.js [--json]
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const DT = require('../lib/deep-time');
const C  = require('../lib/constants');

const H       = C.H;
const EIGHT_H = 8 * H;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400;

const LOD_MEAN_J2000 = DT.meanLodSecondsAtAge(0);

function loadStephensonSegments() {
  const p = path.join(__dirname, '..', '..', 'public', 'input', 'stephenson-2016-deltaT-polynomial.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')).segments;
}
function stephenson(year, segs) {
  for (const s of segs) {
    if (year >= s.y0 && year <= s.y1) {
      const t = (year - s.y0) / (s.y1 - s.y0);
      return s.a[0] + s.a[1]*t + s.a[2]*t*t + s.a[3]*t*t*t;
    }
  }
  return NaN;
}
function loadL5bObservations() {
  const p = path.join(__dirname, '..', '..', 'public', 'input', 'lunar-eclipses-stephenson-2016.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return raw.entries.filter(e => e.dt_observed_sec != null && e.year != null);
}

function pureH5DeltaT2D(t_Ma, alphaScale, lodMeanOffset) {
  if (t_Ma === 0) return 0;
  const absSpan = Math.abs(t_Ma);
  let n = Math.max(32, Math.ceil(absSpan * 10));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = t_Ma / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const tau = i * h;
    const lodMeanProd = DT.meanLodSecondsAtAge(tau);
    if (lodMeanProd === null) return NaN;
    const dev = lodMeanProd - LOD_MEAN_J2000;
    let lodMean = LOD_MEAN_J2000 + alphaScale * dev + lodMeanOffset;
    const yearS   = DT.meanTropicalYearSecondsAtAge(tau);
    const H_local  = DT.meanHAtAge(tau);
    const mSY_days = DT.meanTropicalYearDaysAtAge(tau);
    const h5 = lodMean / ((H_local / 5) * mSY_days);
    const lodReal = lodMean + h5;
    const integrand = (86400 - lodReal) * yearS * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  return (sum * h) / 3;
}

function h5AtJ2000(lodMeanOffset) {
  const lodMean0 = LOD_MEAN_J2000 + lodMeanOffset;
  const H_local  = DT.meanHAtAge(0);
  const mSY_days = DT.meanTropicalYearDaysAtAge(0);
  return lodMean0 / ((H_local / 5) * mSY_days);
}

function fit4CyclesWithAnchor(years, residual, h5At2000, usnoTargetLodS) {
  const divisors = [1830, 1104, 2989, 3749];
  const n = years.length;
  const y0 = years.reduce((a, b) => a + b, 0) / n;
  const t  = years.map(y => (y - y0) / 1000);
  const nCol = 3 + 2 * divisors.length;
  const bar = residual.reduce((a, b) => a + b, 0) / n;

  let sidDays2000 = C.meanSiderealYearDays;
  try {
    const fc = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json'), 'utf8'));
    if (fc.YEAR_LENGTH_J2000_ANCHOR) sidDays2000 = fc.YEAR_LENGTH_J2000_ANCHOR.sidereal;
  } catch (e) {}
  const iauSiderealSec = C.meanSiderealYearDays * 86400;
  const lodKinematic = iauSiderealSec / sidDays2000;
  const targetLodOffset = usnoTargetLodS - lodKinematic - h5At2000;

  const X = [], b = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(nCol);
    row[0] = 1;
    row[1] = t[i];
    row[2] = t[i] * t[i];
    for (let k = 0; k < divisors.length; k++) {
      const omega = 2 * Math.PI * divisors[k] / EIGHT_H;
      row[3 + 2*k]     = Math.cos(omega * years[i]);
      row[3 + 2*k + 1] = Math.sin(omega * years[i]);
    }
    X.push(row);
    b.push(residual[i] - bar);
  }
  const W = 1e6;
  const anchorRow = new Array(nCol).fill(0);
  for (let k = 0; k < divisors.length; k++) {
    const omega = 2 * Math.PI * divisors[k] / EIGHT_H;
    anchorRow[3 + 2*k]     = -86400 * omega * Math.sin(omega * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
    anchorRow[3 + 2*k + 1] = +86400 * omega * Math.cos(omega * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
  }
  X.push(anchorRow.map(v => v * W));
  b.push(targetLodOffset * W);

  const nRows = X.length;
  const ATA = Array.from({length: nCol}, () => new Array(nCol).fill(0));
  const ATb = new Array(nCol).fill(0);
  for (let j = 0; j < nCol; j++) {
    for (let k = 0; k < nCol; k++) {
      let s = 0;
      for (let i = 0; i < nRows; i++) s += X[i][j] * X[i][k];
      ATA[j][k] = s;
    }
    let s = 0;
    for (let i = 0; i < nRows; i++) s += X[i][j] * b[i];
    ATb[j] = s;
  }
  const beta = choleskySolve(ATA, ATb, nCol);
  const cycles = [];
  for (let k = 0; k < divisors.length; k++) {
    const cos_c = beta[3 + 2*k];
    const sin_c = beta[3 + 2*k + 1];
    cycles.push({ n: divisors[k], cos: cos_c, sin: sin_c, amplitude: Math.hypot(cos_c, sin_c), phase_deg: Math.atan2(sin_c, cos_c) * 180 / Math.PI });
  }
  return { cycles };
}

function choleskySolve(A, b, n) {
  const L = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) {
        const d = A[i][i] - s;
        if (d <= 0) throw new Error(`Non-PD (pivot ${d} at i=${i})`);
        L[i][j] = Math.sqrt(d);
      } else {
        L[i][j] = (A[i][j] - s) / L[j][j];
      }
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

function flagContribution(year, cycles) {
  let sum = 0;
  for (const c of cycles) {
    const omega = 2 * Math.PI * c.n / EIGHT_H;
    const raw       = c.cos * Math.cos(omega * year) + c.sin * Math.sin(omega * year);
    const rawAt2000 = c.cos * Math.cos(omega * 2000) + c.sin * Math.sin(omega * 2000);
    sum += raw - rawAt2000;
  }
  return sum;
}

function totalDeltaT(year, alphaScale, lodMeanOffset, cycles) {
  const t_Ma = (2000 - year) / 1e6;
  return pureH5DeltaT2D(t_Ma, alphaScale, lodMeanOffset) + flagContribution(year, cycles);
}

// ─── 2D scan main ───────────────────────────────────────────────
const stephSegs = loadStephensonSegments();
const l5bObs    = loadL5bObservations();

const fitYears = [];
const stephDT = [];
for (let y = -720; y <= 2017; y += 10) {
  fitYears.push(y);
  stephDT.push(stephenson(y, stephSegs));
}

const USNO_TARGET = 86400.0018;

// Refined grid — focused on the valley found in the first pass
const ALPHA_VALUES = [];
for (let a = 1.20; a <= 1.65; a += 0.025) ALPHA_VALUES.push(Math.round(a * 1000) / 1000);

const OFFSET_VALUES = [];  // in ms
for (let d = 0.0; d <= 4.01; d += 0.25) OFFSET_VALUES.push(Math.round(d * 100) / 100);

console.log(`2D scan: α ∈ [${ALPHA_VALUES[0]} .. ${ALPHA_VALUES[ALPHA_VALUES.length-1]}] step 0.05  (${ALPHA_VALUES.length} pts)`);
console.log(`         Δ ∈ [${OFFSET_VALUES[0]} .. ${OFFSET_VALUES[OFFSET_VALUES.length-1]}] ms step 0.5  (${OFFSET_VALUES.length} pts)`);
console.log(`Total grid: ${ALPHA_VALUES.length * OFFSET_VALUES.length} points`);
console.log('');

const t0 = Date.now();
const surface = [];  // rows[alpha_idx][offset_idx] = { l5bMean, res_neg720 }
let bestL5b = Infinity, bestPoint = null;
let prodL5b = null;
for (let ai = 0; ai < ALPHA_VALUES.length; ai++) {
  const alpha = ALPHA_VALUES[ai];
  const row = [];
  for (let oi = 0; oi < OFFSET_VALUES.length; oi++) {
    const offsetMs = OFFSET_VALUES[oi];
    const offset = offsetMs / 1000;
    // Fit
    const modelPure = fitYears.map(y => pureH5DeltaT2D((2000 - y) / 1e6, alpha, offset));
    const residual = stephDT.map((s, i) => s - modelPure[i]);
    const h5Now = h5AtJ2000(offset);
    const fit = fit4CyclesWithAnchor(fitYears, residual, h5Now, USNO_TARGET);
    // L-5b metric
    let sumAbs = 0, n = 0;
    for (const obs of l5bObs) {
      sumAbs += Math.abs(obs.dt_observed_sec - totalDeltaT(obs.year, alpha, offset, fit.cycles));
      n++;
    }
    const l5b = sumAbs / n;
    // res@-720
    const res_neg720 = stephenson(-720, stephSegs) - totalDeltaT(-720, alpha, offset, fit.cycles);
    row.push({ alpha, offsetMs, l5b, res_neg720 });
    if (l5b < bestL5b) { bestL5b = l5b; bestPoint = { alpha, offsetMs, l5b, res_neg720 }; }
    if (alpha === 1.00 && offsetMs === 0.0) prodL5b = l5b;
  }
  surface.push(row);
}
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`Scanned ${ALPHA_VALUES.length * OFFSET_VALUES.length} points in ${elapsedS}s`);
console.log('');

// Print L-5b|R| heatmap
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  2D SCAN — L-5b|R| (s) — rows: α, columns: lodMean offset (ms)');
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
const offHdr = ['α \\ Δms'].concat(OFFSET_VALUES.map(o => o.toFixed(1).padStart(6)));
console.log('  ' + offHdr.join(' '));
console.log('  ' + '-'.repeat(offHdr.length * 7));
for (let ai = 0; ai < ALPHA_VALUES.length; ai++) {
  const alpha = ALPHA_VALUES[ai];
  const cells = surface[ai].map(c => c.l5b.toFixed(0).padStart(6));
  console.log('  ' + alpha.toFixed(2).padStart(7) + ' ' + cells.join(' '));
}
console.log('');

// Also print res@-720 to see near-zero contour
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  2D SCAN — residual at year -720 (s) — Stephenson − framework  (positive = framework too low)');
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  ' + offHdr.join(' '));
console.log('  ' + '-'.repeat(offHdr.length * 7));
for (let ai = 0; ai < ALPHA_VALUES.length; ai++) {
  const alpha = ALPHA_VALUES[ai];
  const cells = surface[ai].map(c => c.res_neg720.toFixed(0).padStart(6));
  console.log('  ' + alpha.toFixed(2).padStart(7) + ' ' + cells.join(' '));
}
console.log('');

console.log(`JOINT OPTIMUM:  α = ${bestPoint.alpha.toFixed(2)}   Δ = ${bestPoint.offsetMs.toFixed(1)} ms   L-5b|R| = ${bestPoint.l5b.toFixed(0)} s   res@-720 = ${bestPoint.res_neg720.toFixed(0)} s`);
if (prodL5b !== null) {
  console.log(`Production (α=1.0, Δ=0):  L-5b|R| = ${prodL5b.toFixed(0)} s`);
  console.log(`Joint improvement:  ${(bestPoint.l5b - prodL5b).toFixed(0)} s  (${((bestPoint.l5b - prodL5b) / prodL5b * 100).toFixed(1)}%)`);
}
console.log('');
console.log('Comparison with 1D single-parameter scans:');
console.log(`  α-only optimum (α=1.31, Δ=0):    L-5b|R| = 1247 s`);
console.log(`  lodMean-only optimum (α=1.0, Δ=-4.4): L-5b|R| = 1522 s`);
console.log('');
console.log('Interpretation:');
console.log('  * If joint L-5b|R| << 1247 s → parameters are independent (orthogonal). Multiple bugs.');
console.log('  * If joint L-5b|R| ≈ 1247 s → parameters are coupled. Single root cause; α is the primary lever.');
console.log('  * If joint optimum lies on α ≈ 1.31 line → offset is redundant given α.');

if (process.argv.includes('--json')) {
  const outPath = path.join(__dirname, '..', '..', 'data', 'alpha-lodmean-2d-results.json');
  const flat = surface.flat();
  fs.writeFileSync(outPath, JSON.stringify({
    config: { H, LOD_MEAN_J2000, USNO_TARGET, ALPHA_VALUES, OFFSET_VALUES },
    joint_optimum: bestPoint,
    prod_l5b: prodL5b,
    surface: flat,
  }, null, 2));
  console.log(`\nJSON summary written to ${outPath}`);
}
