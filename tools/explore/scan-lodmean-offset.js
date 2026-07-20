// ═══════════════════════════════════════════════════════════════════════════
// lodMean OFFSET SCANNER — companion diagnostic to scan-h5-lod.js
//
// The h5 scan (scan-h5-lod.js) found an empirical optimum at h5 ≈ −1 ms —
// but h5 by formula is strictly positive (~3.527 ms at J2000). A negative
// empirical optimum for h5 is equivalent to lodMean being too high by
// ~4.5 ms (since lodReal = lodMean + h5, and both scans shift lodReal
// identically at J2000).
//
// This scanner tests the alternative framing: fix h5 at production formula
// value, sweep an additive OFFSET on meanLodSecondsAtAge(τ). If we find a
// clean minimum at offset ≈ −4.5 ms with the same L-5b|R| ≈ 1405 s, the
// h5 optimum is confirmed as a lodMean-bias fingerprint (not a real H/5
// physics problem).
//
// Interpretation of a negative lodMean offset:
//   Δ_lodMean = −4.5 ms → the framework's angular-momentum-conservation
//   LOD formula is returning a value 4.5 ms TOO HIGH at J2000. True LOD_mean
//   at J2000 would be ~86399.99518 s, not the current 86399.99968 s.
//
// The angular-momentum LOD depends on: iEarthAtAge (moment of inertia),
// L_TOTAL_EM_KGM2_S (system angular momentum), M_MOON_ALONE, GM_EM_M3S2,
// meanMoonDistanceMetresAtAge (Earth-Moon distance), E_FACTOR_MOON.
// A bias in any of these could produce the observed offset.
//
// Usage:  DT_CORRECTIONS_DISABLED=1 node tools/fit/scan-lodmean-offset.js [--json]
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const DT = require('../lib/deep-time');
const C  = require('../lib/constants');

const H       = C.H;
const EIGHT_H = 8 * H;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400;

// ─── Stephenson polynomial ─────────────────────────────────────
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

// ─── L-5b observations ─────────────────────────────────────────
function loadL5bObservations() {
  const p = path.join(__dirname, '..', '..', 'public', 'input', 'lunar-eclipses-stephenson-2016.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return raw.entries.filter(e => e.dt_observed_sec != null && e.year != null);
}

// ─── ΔT integrator with lodMean offset applied ─────────────────
// lodReal(τ) = (meanLodSecondsAtAge(τ) + Δ_lodMean) + h5_formula(τ)
// The h5 formula uses the SHIFTED lodMean, but the resulting change in h5
// is Δ / ((H/5) × mSY_days) ≈ 4e-11 × Δ — utterly negligible.
function pureH5DeltaTWithLodMeanOffset(t_Ma, lodMeanOffset) {
  if (t_Ma === 0) return 0;
  const absSpan = Math.abs(t_Ma);
  let n = Math.max(32, Math.ceil(absSpan * 10));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = t_Ma / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const tau = i * h;
    let lodMean = DT.meanLodSecondsAtAge(tau);
    if (lodMean === null) return NaN;
    lodMean += lodMeanOffset;
    const yearS   = DT.meanTropicalYearSecondsAtAge(tau);
    const H_local  = DT.meanHAtAge(tau);
    const mSY_days = DT.meanTropicalYearDaysAtAge(tau);
    const h5 = lodMean / ((H_local / 5) * mSY_days);   // formula uses shifted lodMean
    const lodReal = lodMean + h5;
    const integrand = (86400 - lodReal) * yearS * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  return (sum * h) / 3;
}

// Effective h5 at J2000 given lodMean offset (for the anchor calc + display)
function h5AtJ2000(lodMeanOffset) {
  const lodMean0 = DT.meanLodSecondsAtAge(0) + lodMeanOffset;
  const H_local  = DT.meanHAtAge(0);
  const mSY_days = DT.meanTropicalYearDaysAtAge(0);
  return lodMean0 / ((H_local / 5) * mSY_days);
}

// ─── 4-cycle least-squares fit with USNO anchor ────────────────
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
  } catch (e) { /* fallback */ }
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

function totalDeltaT(year, lodMeanOffset, cycles) {
  const t_Ma = (2000 - year) / 1e6;
  return pureH5DeltaTWithLodMeanOffset(t_Ma, lodMeanOffset) + flagContribution(year, cycles);
}

// ─── Scanner main ────────────────────────────────────────────────
const LOD_MEAN_PROD = DT.meanLodSecondsAtAge(0);
console.log(`Production lodMean at J2000: ${LOD_MEAN_PROD.toFixed(8)} s  (${((LOD_MEAN_PROD - 86400) * 1000).toFixed(4)} ms vs 86400)`);
console.log(`Production H/5 at J2000:     ${(h5AtJ2000(0) * 1000).toFixed(6)} ms`);
console.log('');

const OFFSETS_MS = [
  { label: '-8.0 ms', value: -0.0080 },
  { label: '-6.0 ms', value: -0.0060 },
  { label: '-5.0 ms', value: -0.0050 },
  { label: '-4.8 ms', value: -0.0048 },
  { label: '-4.6 ms', value: -0.0046 },
  { label: '-4.5 ms', value: -0.0045 },
  { label: '-4.4 ms', value: -0.0044 },
  { label: '-4.2 ms', value: -0.0042 },
  { label: '-4.0 ms', value: -0.0040 },
  { label: '-3.5 ms', value: -0.0035 },
  { label: '-3.0 ms', value: -0.0030 },
  { label: '-2.0 ms', value: -0.0020 },
  { label: '-1.0 ms', value: -0.0010 },
  { label: 'prod',    value:  0.0000 },
  { label: '+1.0 ms', value:  0.0010 },
];

const stephSegs = loadStephensonSegments();
const l5bObs    = loadL5bObservations();
console.log(`Loaded Stephenson polynomial (${stephSegs.length} cubic segments) + ${l5bObs.length} L-5b observations`);
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
console.log('Scanning lodMean offsets...');
console.log('');
const t0 = Date.now();
for (const { label, value: offset } of OFFSETS_MS) {
  const modelPure = fitYears.map(y => pureH5DeltaTWithLodMeanOffset((2000 - y) / 1e6, offset));
  const residual = stephDT.map((s, i) => s - modelPure[i]);
  const h5Now = h5AtJ2000(offset);
  const fit = fit4CyclesWithAnchor(fitYears, residual, h5Now, USNO_TARGET);
  let sumAbs = 0, n = 0;
  for (const obs of l5bObs) {
    const model_dt = totalDeltaT(obs.year, offset, fit.cycles);
    sumAbs += Math.abs(obs.dt_observed_sec - model_dt); n++;
  }
  const l5bMean = sumAbs / n;
  const keyRes = {};
  for (const y of KEY_YEARS) {
    keyRes[y] = stephenson(y, stephSegs) - totalDeltaT(y, offset, fit.cycles);
  }
  const lodMeanEff_ms = (LOD_MEAN_PROD + offset - 86400) * 1000;
  results.push({
    label, offset_ms: offset * 1000, offset,
    lodMean_at_J2000: LOD_MEAN_PROD + offset,
    lodMean_delta_from_86400_ms: lodMeanEff_ms,
    h5_ms: h5Now * 1000,
    lodReal_baseline_ms: (LOD_MEAN_PROD + offset + h5Now - 86400) * 1000,
    cycles: fit.cycles.map(c => ({ n: c.n, amp: c.amplitude, phase: c.phase_deg })),
    rms_post_fit: fit.rms_post,
    l5b_mean_abs: l5bMean,
    l5b_n: n,
    key_years_residual: keyRes,
    anchor_lhs: fit.anchorLhs,
  });
}
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`Scanned ${OFFSETS_MS.length} values in ${elapsedS}s`);
console.log('');

console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  lodMean OFFSET SCAN — h5 uses production formula (positive); lodMean gets constant additive offset');
console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
const hdr = ['label', 'off(ms)', 'lodM-86400', 'h5(ms)', 'lodR-86400', 'Bond', 'Hallst', 'Jose5', 'Jose4', 'fitRMS', 'L-5b|R|', ...KEY_YEARS.map(y => `@${y}`)];
console.log('  ' + hdr.map(h => h.padStart(10)).join(' '));
console.log('  ' + '-'.repeat(hdr.length * 11));
for (const r of results) {
  const cols = [
    r.label.padStart(10),
    r.offset_ms.toFixed(3).padStart(10),
    r.lodMean_delta_from_86400_ms.toFixed(3).padStart(10),
    r.h5_ms.toFixed(4).padStart(10),
    r.lodReal_baseline_ms.toFixed(3).padStart(10),
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
console.log(`OPTIMUM (by L-5b mean|res|):  ${opt.label}  offset=${opt.offset_ms.toFixed(3)} ms  → lodMean at J2000 = ${opt.lodMean_at_J2000.toFixed(6)} s  L-5b|R|=${opt.l5b_mean_abs.toFixed(0)} s`);
const prod = results.find(r => r.label === 'prod');
if (prod) {
  const delta = opt.l5b_mean_abs - prod.l5b_mean_abs;
  const pct = (delta / prod.l5b_mean_abs * 100).toFixed(1);
  console.log(`Production baseline:  L-5b|R|=${prod.l5b_mean_abs.toFixed(0)} s   Δ_optimum_vs_prod = ${delta.toFixed(0)} s (${pct}%)`);
}
console.log('');
console.log('Cross-check: expected optimum near offset = -4.5 ms if h5 = -1 ms optimum from scan-h5-lod.js maps here.');
console.log('If confirmed: framework meanLodSecondsAtAge at J2000 = 86399.99968 is ~4.5 ms too HIGH.');
console.log('True LOD_mean at J2000 would be ~86399.99518 s (physical interpretation: Earth rotates slightly faster than model predicts).');

if (process.argv.includes('--json')) {
  const outPath = path.join(__dirname, '..', '..', 'data', 'lodmean-scan-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ config: { H, LOD_MEAN_PROD, USNO_TARGET }, results }, null, 2));
  console.log(`\nJSON summary written to ${outPath}`);
}
