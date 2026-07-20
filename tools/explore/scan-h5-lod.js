// ═══════════════════════════════════════════════════════════════════════════
// H/5 LOD CORRECTION SCANNER — offline test of "does H/5 tuning have room"
//
// For each candidate H/5 correction value, this scanner:
//   1. Recomputes the pure-H/5-baseline ΔT curve with that value substituted
//   2. Re-fits the Bond/Hallstatt/Jose5/Jose4 4-flag stack (with USNO anchor)
//      so the modern LOD still closes on USNO 86400.0018 at J2000
//   3. Computes total ΔT (baseline + refitted flags) at each L-5b Stephenson
//      observation year
//   4. Reports mean |residual|, per-century breakdown, and residual at key years
//
// The point: separate "does H/5 have room" from "does the flag fit compensate?".
// If the optimum h5 leaves L-5b residual roughly unchanged from production,
// H/5 tuning alone is not the lever we need — path forward is Path C
// (framework-native Moon) or refit-the-α(t)-tidal-model.
//
// Runs entirely offline (Node). No browser, no console. Standalone — does
// NOT modify dt-corrections-fit.js or deep-time.js. Duplicates the fit
// least-squares logic inline (~50 lines) for isolation.
//
// Usage:  node tools/fit/scan-h5-lod.js
// Output: table on stdout + optional --json for machine-readable summary
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const DT = require('../lib/deep-time');
const C  = require('../lib/constants');

const H       = C.H;
const EIGHT_H = 8 * H;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400;

// ─── Stephenson polynomial evaluator ─────────────────────────────────────────
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

// ─── L-5b Stephenson primary lunar observations ──────────────────────────────
function loadL5bObservations() {
  const p = path.join(__dirname, '..', '..', 'public', 'input', 'lunar-eclipses-stephenson-2016.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entries = raw.entries.filter(e => e.dt_observed_sec != null && e.year != null);
  return entries;
}

// ─── Pure-H/5 ΔT integrator (mirrors deep-time.js formula, h5 parametrized) ──
function pureH5DeltaT(t_Ma, h5Override) {
  if (t_Ma === 0) return 0;
  const absSpan = Math.abs(t_Ma);
  let n = Math.max(32, Math.ceil(absSpan * 10));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = t_Ma / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const tau = i * h;
    const lodMean = DT.meanLodSecondsAtAge(tau);
    if (lodMean === null) return NaN;
    const yearS   = DT.meanTropicalYearSecondsAtAge(tau);
    const H_local  = DT.meanHAtAge(tau);
    const mSY_days = DT.meanTropicalYearDaysAtAge(tau);
    const h5 = (h5Override !== null && h5Override !== undefined)
             ? h5Override
             : lodMean / ((H_local / 5) * mSY_days);
    const lodReal = lodMean + h5;
    const integrand = (86400 - lodReal) * yearS * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  return (sum * h) / 3;
}

// ─── 4-cycle least-squares fit with USNO anchor + poly detrend ───────────────
// Reproduces the essential logic of tools/fit/dt-corrections-fit.js#fitCycles.
// Returns { cycles: [{n, cos, sin, amplitude, phase_deg}, ...], rms_post, anchorLhs }
function fit4CyclesWithAnchor(years, residual, h5At2000, usnoTargetLodS) {
  const divisors = [1830, 1104, 2989, 3749]; // Bond, Hallstatt, Jose5, Jose4
  const n = years.length;
  const y0 = years.reduce((a, b) => a + b, 0) / n;
  const t  = years.map(y => (y - y0) / 1000);
  const nCol = 3 + 2 * divisors.length;
  const bar = residual.reduce((a, b) => a + b, 0) / n;

  // Fitted-coefficients kinematic anchor (matches dt-corrections-fit.js path).
  // sidDays2000 from fitted-coefficients.json → lodKinematic
  let sidDays2000 = C.meanSiderealYearDays;
  try {
    const fc = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json'), 'utf8'));
    if (fc.YEAR_LENGTH_J2000_ANCHOR) sidDays2000 = fc.YEAR_LENGTH_J2000_ANCHOR.sidereal;
  } catch (e) { /* fallback */ }
  const iauSiderealSec = C.meanSiderealYearDays * 86400;
  const lodKinematic = iauSiderealSec / sidDays2000;
  const targetLodOffset = usnoTargetLodS - lodKinematic - h5At2000;

  // Design matrix rows
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
  // Anchor row (soft equality with weight W)
  const W = 1e6;
  const anchorRow = new Array(nCol).fill(0);
  for (let k = 0; k < divisors.length; k++) {
    const omega = 2 * Math.PI * divisors[k] / EIGHT_H;
    anchorRow[3 + 2*k]     = -86400 * omega * Math.sin(omega * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
    anchorRow[3 + 2*k + 1] = +86400 * omega * Math.cos(omega * 2000) / MEAN_TROPICAL_YEAR_J2000_S;
  }
  X.push(anchorRow.map(v => v * W));
  b.push(targetLodOffset * W);

  // XᵀX β = Xᵀb via Cholesky
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

  // Compute rms_post (unweighted, first n rows only)
  let ss_res = 0;
  for (let i = 0; i < n; i++) {
    let yhat = beta[0] + beta[1]*t[i] + beta[2]*t[i]*t[i];
    for (let k = 0; k < divisors.length; k++) {
      const omega = 2 * Math.PI * divisors[k] / EIGHT_H;
      yhat += beta[3 + 2*k]     * Math.cos(omega * years[i])
            + beta[3 + 2*k + 1] * Math.sin(omega * years[i]);
    }
    yhat += bar;
    ss_res += (residual[i] - yhat) ** 2;
  }
  const rms_post = Math.sqrt(ss_res / n);

  const cycles = [];
  for (let k = 0; k < divisors.length; k++) {
    const cos_c = beta[3 + 2*k];
    const sin_c = beta[3 + 2*k + 1];
    cycles.push({
      n: divisors[k],
      cos: cos_c,
      sin: sin_c,
      amplitude: Math.hypot(cos_c, sin_c),
      phase_deg: Math.atan2(sin_c, cos_c) * 180 / Math.PI,
    });
  }
  // Verify anchor achievement
  let anchorLhs = 0;
  for (let j = 0; j < nCol; j++) anchorLhs += anchorRow[j] * beta[j];

  return { cycles, rms_post, anchorLhs, anchorTarget: targetLodOffset, lodKinematic };
}

function choleskySolve(A, b, n) {
  const L = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) {
        const d = A[i][i] - s;
        if (d <= 0) throw new Error(`Non-PD matrix (pivot ${d} at i=${i})`);
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

// Evaluate a fitted 4-flag stack at a given year (raw − raw@J2000 → 0 at J2000)
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

// Total framework ΔT: pure H/5 baseline + fitted flags. Matches
// meanDeltaTSecondsAtAge exactly for a given (h5, flag amps) pair.
function totalDeltaT(year, h5Override, cycles) {
  const t_Ma = (2000 - year) / 1e6;
  return pureH5DeltaT(t_Ma, h5Override) + flagContribution(year, cycles);
}

// ─── Scanner main ────────────────────────────────────────────────────────────
const H5_PROD = 86400 / ((C.H / 5) * C.meanSolarYearDays);
console.log(`Production H/5 correction at J2000: ${(H5_PROD * 1000).toFixed(6)} ms  (from H=${C.H}, mSY=${C.meanSolarYearDays})`);
console.log('');

// Scan set — fine sweep around the identified minimum at h5 ≈ -1.0 ms
const H5_VALUES = [
  { label: '-2.0 ms',  value: -0.0020  },
  { label: '-1.6 ms',  value: -0.0016  },
  { label: '-1.4 ms',  value: -0.0014  },
  { label: '-1.2 ms',  value: -0.0012  },
  { label: '-1.1 ms',  value: -0.0011  },
  { label: '-1.0 ms',  value: -0.0010  },
  { label: '-0.9 ms',  value: -0.0009  },
  { label: '-0.8 ms',  value: -0.0008  },
  { label: '-0.6 ms',  value: -0.0006  },
  { label: '-0.4 ms',  value: -0.0004  },
  { label: '-0.2 ms',  value: -0.0002  },
  { label: 'off',      value:  0.0000  },
  { label: '+0.5 ms',  value:  0.0005  },
  { label: '+1.0 ms',  value:  0.0010  },
  { label: 'prod',     value: H5_PROD  },
];

const stephSegs = loadStephensonSegments();
const l5bObs    = loadL5bObservations();
console.log(`Loaded Stephenson polynomial (${stephSegs.length} cubic segments) + ${l5bObs.length} L-5b primary observations`);
console.log('');

// Build fit-window samples (same as dt-corrections-fit.js: -720..2017 step 10)
const fitYears = [];
const stephDT = [];
for (let y = -720; y <= 2017; y += 10) {
  fitYears.push(y);
  stephDT.push(stephenson(y, stephSegs));
}

const USNO_TARGET = 86400.0018;

// Key years for the per-year residual column
const KEY_YEARS = [-720, -430, -135, 0, 500, 1000, 1600, 2000];

const results = [];
console.log('Scanning H/5 values...');
console.log('');
const t0 = Date.now();
for (const { label, value: h5 } of H5_VALUES) {
  // 1. Pure-H/5 baseline at fit years
  const modelPure = fitYears.map(y => pureH5DeltaT((2000 - y) / 1e6, h5));
  // 2. Residual = Stephenson - pure baseline
  const residual = stephDT.map((s, i) => s - modelPure[i]);
  // 3. Fit 4 cycles with USNO anchor
  const fit = fit4CyclesWithAnchor(fitYears, residual, h5, USNO_TARGET);
  // 4. L-5b: compute total ΔT at each observation year + residual vs obs
  let sumAbs = 0, n = 0;
  const perCent = new Map();
  for (const obs of l5bObs) {
    const model_dt = totalDeltaT(obs.year, h5, fit.cycles);
    const res = obs.dt_observed_sec - model_dt;
    const abs = Math.abs(res);
    sumAbs += abs; n++;
    const cent = Math.floor(obs.year / 100) * 100;
    if (!perCent.has(cent)) perCent.set(cent, { sum: 0, n: 0 });
    const b = perCent.get(cent); b.sum += abs; b.n++;
  }
  const l5bMean = sumAbs / n;
  // 5. Residual at key years
  const keyRes = {};
  for (const y of KEY_YEARS) {
    const model_dt = totalDeltaT(y, h5, fit.cycles);
    keyRes[y] = stephenson(y, stephSegs) - model_dt;
  }
  results.push({
    label, h5_ms: h5 * 1000, h5,
    cycles: fit.cycles.map(c => ({ n: c.n, amp: c.amplitude, phase: c.phase_deg })),
    rms_post_fit: fit.rms_post,
    l5b_mean_abs: l5bMean,
    l5b_n: n,
    key_years_residual: keyRes,
    anchor_lhs: fit.anchorLhs,
    anchor_target: fit.anchorTarget,
    lod_j2000: fit.lodKinematic + h5 + fit.anchorLhs,  // reconstructed lodReal at J2000
  });
}
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`Scanned ${H5_VALUES.length} values in ${elapsedS}s`);
console.log('');

// ─── Report ────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  H/5 SCAN — refits 4-flag stack per H/5 value, reports L-5b Section 1 residual + Stephenson gap at key years');
console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
const hdr = ['h5_lbl', 'h5(ms)', 'Bond', 'Hallst', 'Jose5', 'Jose4', 'fitRMS', 'L-5b|R|', ...KEY_YEARS.map(y => `res@${y}`), 'LOD_J2K'];
console.log('  ' + hdr.map(h => h.padStart(10)).join('  '));
console.log('  ' + '-'.repeat(hdr.length * 12));
for (const r of results) {
  const cols = [
    r.label.padStart(10),
    r.h5_ms.toFixed(4).padStart(10),
    r.cycles[0].amp.toFixed(0).padStart(10),
    r.cycles[1].amp.toFixed(0).padStart(10),
    r.cycles[2].amp.toFixed(0).padStart(10),
    r.cycles[3].amp.toFixed(0).padStart(10),
    r.rms_post_fit.toFixed(1).padStart(10),
    r.l5b_mean_abs.toFixed(0).padStart(10),
    ...KEY_YEARS.map(y => r.key_years_residual[y].toFixed(0).padStart(10)),
    r.lod_j2000.toFixed(6).padStart(10),
  ];
  console.log('  ' + cols.join('  '));
}
console.log('');

// Find optimum by L-5b mean|res|
const opt = results.reduce((a, b) => a.l5b_mean_abs < b.l5b_mean_abs ? a : b);
console.log(`OPTIMUM (by L-5b mean|res|):  ${opt.label}  h5=${opt.h5_ms.toFixed(4)} ms  L-5b|R|=${opt.l5b_mean_abs.toFixed(0)} s  fitRMS=${opt.rms_post_fit.toFixed(1)} s`);
const prod = results.find(r => r.label === 'prod');
if (prod) {
  const delta = opt.l5b_mean_abs - prod.l5b_mean_abs;
  const pct = (delta / prod.l5b_mean_abs * 100).toFixed(1);
  console.log(`Production baseline:  L-5b|R|=${prod.l5b_mean_abs.toFixed(0)} s   Δ_optimum_vs_prod = ${delta.toFixed(0)} s (${pct}%)`);
}
console.log('');

console.log('Interpretation:');
console.log('  * fitRMS  = post-fit residual over the 1650-2050 Stephenson window (LOWER is better)');
console.log('  * L-5b|R| = mean |obs_dt_observed - framework_dt| across 267 primary lunar observations');
console.log('  * res@Y   = Stephenson(Y) − total framework ΔT(Y)  (POSITIVE = framework too low at Y)');
console.log('  * LOD_J2K = reconstructed lodReal at J2000 (should stay ~86400.0018 = USNO target)');
console.log('');
console.log('  If L-5b|R| minimum is deep (< 2000 s) → H/5 tuning IS the lever; ship the optimum.');
console.log('  If minimum is ~production (2500-3000 s) → H/5 alone cannot close the gap; escalate to Path C.');

if (process.argv.includes('--json')) {
  const outPath = path.join(__dirname, '..', '..', 'data', 'h5-scan-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ config: { H, H5_PROD, USNO_TARGET }, results }, null, 2));
  console.log(`\nJSON summary written to ${outPath}`);
}
