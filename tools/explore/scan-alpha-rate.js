// ═══════════════════════════════════════════════════════════════════════════
// α(t) TIDAL-EVOLUTION RATE SCANNER — third diagnostic (after h5 + lodMean)
//
// The h5 and lodMean scans both hit an α(t) floor: even at their optima,
// residual at year -720 is +1420 s (h5 opt) or +1587 s (lodMean opt). That
// remaining gap must come from the deep-time LOD trajectory itself —
// specifically the RATE at which lodMean evolves with τ.
//
// This scanner:
//   - Fixes lodMean at J2000 to production (86399.99968 s)
//   - Fixes h5 at production formula (~3.527 ms)
//   - MULTIPLIES the deep-time deviation (lodMean(τ) − lodMean(0)) by a scale
//   - Re-fits 4-flag stack against Stephenson at each scale
//   - Reports L-5b|R| + res@ancient years
//
// Physical meaning:
//   alphaScale = 1.0 → production tidal evolution rate
//   alphaScale > 1.0 → steeper deep-past LOD deficit (Earth rotated faster
//                      in the past than production model predicts)
//   alphaScale < 1.0 → shallower deep-past LOD deficit
//
// Current tidal slowdown rate at J2000: ~1.75 ms/century (well-measured).
// Deep-past estimates vary: 2×-5× current rate under different tidal models.
// Scale factors 0.5 to 3.0 cover the plausible physical range.
//
// Usage: DT_CORRECTIONS_DISABLED=1 node tools/fit/scan-alpha-rate.js [--json]
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const DT = require('../lib/deep-time');
const C  = require('../lib/constants');

const H       = C.H;
const EIGHT_H = 8 * H;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400;

// Cache J2000 lodMean once — we'll use it as the fixed base for all scales
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

// ─── ΔT integrator with α(t)-rate scale ────────────────────────
// lodMean_scaled(τ) = lodMean(0) + alphaScale × (lodMean(τ) − lodMean(0))
// h5 uses the SCALED lodMean via the production formula (positive).
function pureH5DeltaTWithAlphaScale(t_Ma, alphaScale) {
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
    const lodMean = LOD_MEAN_J2000 + alphaScale * dev;
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

// h5 at J2000 stays at production value regardless of alphaScale (deviation = 0 there)
function h5AtJ2000() {
  const H_local  = DT.meanHAtAge(0);
  const mSY_days = DT.meanTropicalYearDaysAtAge(0);
  return LOD_MEAN_J2000 / ((H_local / 5) * mSY_days);
}

// ─── 4-cycle fit with USNO anchor ──────────────────────────────
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
  return { cycles, rms_post };
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

function totalDeltaT(year, alphaScale, cycles) {
  const t_Ma = (2000 - year) / 1e6;
  return pureH5DeltaTWithAlphaScale(t_Ma, alphaScale) + flagContribution(year, cycles);
}

// ─── Scanner main ────────────────────────────────────────────────
console.log(`Production lodMean at J2000: ${LOD_MEAN_J2000.toFixed(8)} s`);
console.log(`Production H/5 at J2000:     ${(h5AtJ2000() * 1000).toFixed(6)} ms`);
console.log('');
// Report the production lodMean at year -720 for reference
const lodMean_neg720 = DT.meanLodSecondsAtAge(0.00272);
console.log(`Production lodMean at year -720 (t_Ma = 0.00272): ${lodMean_neg720.toFixed(8)} s`);
console.log(`  → deviation from J2000: ${((lodMean_neg720 - LOD_MEAN_J2000) * 1000).toFixed(4)} ms`);
console.log('');

const SCALES = [
  { label: 'α=1.20',   value: 1.20  },
  { label: 'α=1.24',   value: 1.24  },
  { label: 'α=1.26',   value: 1.26  },
  { label: 'α=1.28',   value: 1.28  },
  { label: 'α=1.29',   value: 1.29  },
  { label: 'α=1.30',   value: 1.30  },
  { label: 'α=1.31',   value: 1.31  },
  { label: 'α=1.32',   value: 1.32  },
  { label: 'α=1.33',   value: 1.33  },
  { label: 'α=1.34',   value: 1.34  },
  { label: 'α=1.35',   value: 1.35  },
  { label: 'α=1.37',   value: 1.37  },
  { label: 'α=1.40',   value: 1.40  },
  { label: 'α=1.0 (prod)', value: 1.0 },
];

const stephSegs = loadStephensonSegments();
const l5bObs    = loadL5bObservations();
console.log(`Loaded Stephenson polynomial (${stephSegs.length} segments) + ${l5bObs.length} L-5b observations`);
console.log('');

const fitYears = [];
const stephDT = [];
for (let y = -720; y <= 2017; y += 10) {
  fitYears.push(y);
  stephDT.push(stephenson(y, stephSegs));
}
const USNO_TARGET = 86400.0018;
const KEY_YEARS = [-720, -430, -135, 0, 500, 1000, 1600, 2000];

const results = [];
console.log('Scanning α(t) scales...');
console.log('');
const t0 = Date.now();
for (const { label, value: alphaScale } of SCALES) {
  const modelPure = fitYears.map(y => pureH5DeltaTWithAlphaScale((2000 - y) / 1e6, alphaScale));
  const residual = stephDT.map((s, i) => s - modelPure[i]);
  const h5Now = h5AtJ2000();
  const fit = fit4CyclesWithAnchor(fitYears, residual, h5Now, USNO_TARGET);
  let sumAbs = 0, n = 0;
  for (const obs of l5bObs) {
    const model_dt = totalDeltaT(obs.year, alphaScale, fit.cycles);
    sumAbs += Math.abs(obs.dt_observed_sec - model_dt); n++;
  }
  const l5bMean = sumAbs / n;
  const keyRes = {};
  for (const y of KEY_YEARS) {
    keyRes[y] = stephenson(y, stephSegs) - totalDeltaT(y, alphaScale, fit.cycles);
  }
  results.push({
    label, alphaScale,
    cycles: fit.cycles.map(c => ({ n: c.n, amp: c.amplitude, phase: c.phase_deg })),
    rms_post_fit: fit.rms_post,
    l5b_mean_abs: l5bMean,
    key_years_residual: keyRes,
  });
}
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`Scanned ${SCALES.length} scales in ${elapsedS}s`);
console.log('');

console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  α(t) SCAN — scales deep-time lodMean deviation by factor α (lodMean(0) fixed at production, h5 = formula)');
console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
const hdr = ['label', 'α', 'Bond', 'Hallst', 'Jose5', 'Jose4', 'fitRMS', 'L-5b|R|', ...KEY_YEARS.map(y => `@${y}`)];
console.log('  ' + hdr.map(h => h.padStart(10)).join(' '));
console.log('  ' + '-'.repeat(hdr.length * 11));
for (const r of results) {
  const cols = [
    r.label.padStart(10),
    r.alphaScale.toFixed(2).padStart(10),
    r.cycles[0].amp.toFixed(0).padStart(10),
    r.cycles[1].amp.toFixed(0).padStart(10),
    r.cycles[2].amp.toFixed(0).padStart(10),
    r.cycles[3].amp.toFixed(0).padStart(10),
    r.rms_post_fit.toFixed(1).padStart(10),
    r.l5b_mean_abs.toFixed(0).padStart(10),
    ...KEY_YEARS.map(y => r.key_years_residual[y].toFixed(0).padStart(10)),
  ];
  console.log('  ' + cols.join(' '));
}
console.log('');

const opt = results.reduce((a, b) => a.l5b_mean_abs < b.l5b_mean_abs ? a : b);
console.log(`OPTIMUM (by L-5b mean|res|):  ${opt.label}  L-5b|R|=${opt.l5b_mean_abs.toFixed(0)} s  res@-720=${opt.key_years_residual[-720].toFixed(0)} s`);
const prod = results.find(r => r.label === 'α=1.0 (prod)');
if (prod) {
  const delta = opt.l5b_mean_abs - prod.l5b_mean_abs;
  const pct = (delta / prod.l5b_mean_abs * 100).toFixed(1);
  console.log(`Production baseline (α=1.0):  L-5b|R|=${prod.l5b_mean_abs.toFixed(0)} s   Δ_optimum_vs_prod = ${delta.toFixed(0)} s (${pct}%)`);
}
console.log('');
console.log('Interpretation:');
console.log('  * α > 1  = deep-past LOD deficit multiplied (Earth rotated FASTER in past than production tidal model says)');
console.log('  * α < 1  = production model over-estimates past deficit');
console.log('  * If optimum α >> 1 (say, α ≈ 5 or 10): current α(t) tidal-evolution model is severely under-sloping past LOD');
console.log('  * If optimum α ≈ 1: α(t) is fine; the deep-time floor is NOT the α(t) rate — it\'s something else (Moon polynomial? Sun position?)');

if (process.argv.includes('--json')) {
  const outPath = path.join(__dirname, '..', '..', 'data', 'alpha-scan-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ config: { H, LOD_MEAN_J2000, USNO_TARGET }, results }, null, 2));
  console.log(`\nJSON summary written to ${outPath}`);
}
