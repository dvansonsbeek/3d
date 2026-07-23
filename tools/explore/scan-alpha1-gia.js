// ═══════════════════════════════════════════════════════════════════════════
// ALPHA_1 × GIA SCANNER — physically-motivated parameter scan
//
// HISTORICAL exploration tool: this is the study that motivated the 2026-07
// LLR-α₁ refit. At the time it was written, production used the Wells 1989
// anchor (α₁ = -8.87e-5 /Ma → 3.41 cm/yr) and this scan's finding — optimum
// near α₁-scale ≈ 1.12, i.e. the LLR value — drove the shipped change.
// Production NOW uses the LLR direct anchor (α₁ = -9.9376e-5 /Ma →
// 3.82 cm/yr, Dickey 1994 / Chapront 2002), so scale 1.0 in a fresh run of
// this scanner corresponds to the LLR anchor, and the comments below
// describe the PRE-REFIT world.
//
// Traces the α(t) tidal-slowdown source to two specific literature constants:
//   ALPHA_1 = -8.87e-5 /Ma       (Farhat 2022; Wells 1989 anchor — pre-refit)
//   ALPHA_CLIMATE_SCALE = -5.24e-7 (Cox & Chao 2002: dα/dt = -1.8e-11/yr)
//
// The pre-refit framework was 23% too shallow in dLOD/dt at J2000 (1.42 vs
// observed 1.75 ms/century). The h5/lodMean/α scans all pointed at this same
// under-slope but only via empirical multipliers. THIS scan tested the
// specific physical parameters that could be off:
//
//   ALPHA_1_SCALE:      1.0 → pre-refit Wells 1989 anchor (3.41 cm/yr)
//                       ~1.12 → matches modern lunar laser ranging (3.82 cm/yr) — SHIPPED
//                       ~1.20 → some recent satellite LR estimates (4.09 cm/yr)
//
//   ALPHA_CLIMATE_SCALE: 1.0 → prod Cox & Chao (-0.47 ms/century GIA drag)
//                        0.5 → weaker GIA (-0.24 ms/century)
//                        0   → no GIA (pure-tidal)
//                        1.5 → stronger GIA (-0.70 ms/century)
//
// For each (α₁-scale, GIA-scale) pair:
//   1. Recompute lodMean(τ) with parametrized Moon distance + MOI trajectory
//   2. Refit 4-flag stack with USNO anchor
//   3. Compute L-5b|R| across 267 Stephenson lunar observations
//   4. Report dLOD/dt at J2000 for physical sanity check
//
// Usage: DT_CORRECTIONS_DISABLED=1 node tools/fit/scan-alpha1-gia.js [--json]
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const DT = require('../lib/deep-time');
const C  = require('../lib/constants');

const H       = C.H;
const EIGHT_H = 8 * H;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * 86400;

// ─── Physical constants (duplicated from deep-time.js for parametrized use) ─
const EARTH_DIAMETER_KM = 12756.27;
const R_EARTH_M = (EARTH_DIAMETER_KM / 2) * 1000;
const EARTH_MOI_FACTOR = 0.3306947;

// Production Farhat coefficients
const ALPHA_1_PROD = -8.8658188951e-05;
const ALPHA_3      = -6.4186463489e-12;
const ALPHA_4      = +1.3619800519e-16;

// Production climate-driven α scale
const ALPHA_CLIMATE_SCALE_PROD = -5.24e-7;
const ALPHA_CLIMATE_REGIME_KEY = 'lr04-post-mpt';
const _CLIMATE_JSON_PATH = path.join(__dirname, '..', '..', 'public', 'input', 'climate-formula-coefficients.json');
const CLIMATE_FORMULA_COEFFS = JSON.parse(fs.readFileSync(_CLIMATE_JSON_PATH, 'utf8'));

const M_EARTH_ALONE = C.GM_EARTH_ALONE / C.G_CONSTANT;
const M_MOON_ALONE  = C.GM_MOON_ALONE  / C.G_CONSTANT;
const A_MOON_NOW_M  = C.moonDistance * 1000;
const E_FACTOR_MOON = Math.sqrt(1 - C.moonOrbitalEccentricity * C.moonOrbitalEccentricity);
const GM_EM_M3S2    = C.GM_EARTH_MOON_SYSTEM * 1e9;
const LOD_NOW_H13_S = C.meanSiderealYearSeconds / C.meanSiderealYearDaysKinematic;
const I_EARTH_J2000 = EARTH_MOI_FACTOR * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M;
const L_TOTAL_EM_KGM2_S = (I_EARTH_J2000 * 2 * Math.PI / LOD_NOW_H13_S)
                        + (M_MOON_ALONE * Math.sqrt(GM_EM_M3S2 * A_MOON_NOW_M) * E_FACTOR_MOON);

// Climate L1 evaluator (mirror of deep-time.js)
let _alphaClimateL1_J2000 = null;
function _evalClimateL1Orbital(year) {
  const t_kyr_BP = (2000 - year) / 1000;
  const r        = CLIMATE_FORMULA_COEFFS.regimes[ALPHA_CLIMATE_REGIME_KEY];
  const EIGHT_H_KYR = CLIMATE_FORMULA_COEFFS.config.eight_H_kyr;
  let L1_sum = 0;
  for (const c of r.L1) {
    const omega = 2 * Math.PI * c.n / EIGHT_H_KYR;
    L1_sum += c.a * Math.cos(omega * t_kyr_BP) + c.b * Math.sin(omega * t_kyr_BP);
  }
  return L1_sum * r.denormalization.y_std;
}
_alphaClimateL1_J2000 = _evalClimateL1Orbital(2000);

function moiFactor(t_Ma, giaScale) {
  const year  = 2000 - t_Ma * 1e6;
  const L1_at = _evalClimateL1Orbital(year);
  const scaledClimateCoeff = ALPHA_CLIMATE_SCALE_PROD * giaScale;
  return EARTH_MOI_FACTOR - scaledClimateCoeff * (L1_at - _alphaClimateL1_J2000);
}
function iEarth(t_Ma, giaScale) {
  return moiFactor(t_Ma, giaScale) * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M;
}

function moonDist(t_Ma, alpha1Scale) {
  const t = t_Ma;
  const a1 = ALPHA_1_PROD * alpha1Scale;
  return A_MOON_NOW_M * (1 + a1*t + ALPHA_3*t*t*t + ALPHA_4*t*t*t*t);
}

function lodMean(t_Ma, alpha1Scale, giaScale) {
  const a = moonDist(t_Ma, alpha1Scale);
  const I = iEarth(t_Ma, giaScale);
  return (2 * Math.PI * I) / (L_TOTAL_EM_KGM2_S - M_MOON_ALONE * Math.sqrt(GM_EM_M3S2 * a) * E_FACTOR_MOON);
}

// ─── Stephenson polynomial + L-5b ──────────────────────────────
function loadStephensonSegments() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'input', 'stephenson-2016-deltaT-polynomial.json'), 'utf8')).segments;
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
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'input', 'lunar-eclipses-stephenson-2016.json'), 'utf8'));
  return raw.entries.filter(e => e.dt_observed_sec != null && e.year != null);
}

// ─── Pure H/5 ΔT with parametrized (α₁, GIA) ──────────────────
function pureH5DeltaTParam(t_Ma, alpha1Scale, giaScale) {
  if (t_Ma === 0) return 0;
  const absSpan = Math.abs(t_Ma);
  let n = Math.max(32, Math.ceil(absSpan * 10));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = t_Ma / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const tau = i * h;
    const lodM = lodMean(tau, alpha1Scale, giaScale);
    if (lodM === null || !Number.isFinite(lodM)) return NaN;
    // Use production H_local (small second-order dependency)
    const H_local  = DT.meanHAtAge(tau);
    const mSY_days = DT.meanTropicalYearDaysAtAge(tau);
    const yearS    = DT.meanTropicalYearSecondsAtAge(tau);
    const h5 = lodM / ((H_local / 5) * mSY_days);
    const lodReal = lodM + h5;
    const integrand = (86400 - lodReal) * yearS * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  return (sum * h) / 3;
}

function h5At2000(alpha1Scale, giaScale) {
  const lodM = lodMean(0, alpha1Scale, giaScale);
  const H_local  = DT.meanHAtAge(0);
  const mSY_days = DT.meanTropicalYearDaysAtAge(0);
  return lodM / ((H_local / 5) * mSY_days);
}

// ─── 4-cycle fit + L-5b evaluation ─────────────────────────────
function fit4CyclesWithAnchor(years, residual, h5A, usnoTargetLodS) {
  const divisors = [1830, 1104, 2989, 3749];
  const n = years.length;
  const y0 = years.reduce((a, b) => a + b, 0) / n;
  const t  = years.map(y => (y - y0) / 1000);
  const nCol = 3 + 2 * divisors.length;
  const bar = residual.reduce((a, b) => a + b, 0) / n;

  let sidDays2000 = C.meanSiderealYearDays;
  try {
    const fc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json'), 'utf8'));
    if (fc.YEAR_LENGTH_J2000_ANCHOR) sidDays2000 = fc.YEAR_LENGTH_J2000_ANCHOR.sidereal;
  } catch (e) {}
  const iauSiderealSec = C.meanSiderealYearDays * 86400;
  const lodKinematic = iauSiderealSec / sidDays2000;
  const targetLodOffset = usnoTargetLodS - lodKinematic - h5A;

  const X = [], b = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(nCol);
    row[0] = 1; row[1] = t[i]; row[2] = t[i] * t[i];
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
      } else L[i][j] = (A[i][j] - s) / L[j][j];
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

function totalDeltaT(year, alpha1Scale, giaScale, cycles) {
  const t_Ma = (2000 - year) / 1e6;
  return pureH5DeltaTParam(t_Ma, alpha1Scale, giaScale) + flagContribution(year, cycles);
}

// ─── Physical sanity: dLOD/dt at J2000 for given (α₁, GIA) ─────
function dLODdtAtJ2000(alpha1Scale, giaScale) {
  const dt = 1e-5;
  const lod_pos = lodMean(dt, alpha1Scale, giaScale);
  const lod_neg = lodMean(-dt, alpha1Scale, giaScale);
  return (lod_neg - lod_pos) / 20; // s / yr
}

function daDtAtJ2000(alpha1Scale) {
  const dt = 1e-5;
  const a_pos = moonDist(dt, alpha1Scale);
  const a_neg = moonDist(-dt, alpha1Scale);
  return (a_neg - a_pos) / 20; // m / yr
}

// ─── Scan main ─────────────────────────────────────────────────
const stephSegs = loadStephensonSegments();
const l5bObs    = loadL5bObservations();

const fitYears = [];
const stephDT = [];
for (let y = -720; y <= 2017; y += 10) {
  fitYears.push(y);
  stephDT.push(stephenson(y, stephSegs));
}
const USNO_TARGET = 86400.0018;

// Production sanity
const prodLODrate = dLODdtAtJ2000(1.0, 1.0);
const prodDaRate  = daDtAtJ2000(1.0);
console.log('PRODUCTION values at J2000:');
console.log(`  dLOD/dt = ${(prodLODrate * 1e5).toFixed(3)} ms/century  (observed IERS: ~1.75)`);
console.log(`  da/dt   = ${(prodDaRate * 100).toFixed(3)} cm/yr        (observed Wells/LR: 3.82)`);
console.log('');

// 2D grid over (α₁-scale, GIA-scale)
const ALPHA1_SCALES = [0.9, 1.0, 1.05, 1.10, 1.12, 1.15, 1.18, 1.20, 1.25, 1.30, 1.35, 1.40];
const GIA_SCALES    = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

console.log(`2D scan: ALPHA_1 scale ∈ [${ALPHA1_SCALES[0]} .. ${ALPHA1_SCALES[ALPHA1_SCALES.length-1]}]   (${ALPHA1_SCALES.length} pts)`);
console.log(`         GIA scale     ∈ [${GIA_SCALES[0]} .. ${GIA_SCALES[GIA_SCALES.length-1]}]   (${GIA_SCALES.length} pts)`);
console.log(`Total grid: ${ALPHA1_SCALES.length * GIA_SCALES.length} points`);
console.log('');

const t0 = Date.now();
const surface = [];
let bestL5b = Infinity, bestPt = null;
let prodL5b = null;
for (let ai = 0; ai < ALPHA1_SCALES.length; ai++) {
  const a1s = ALPHA1_SCALES[ai];
  const row = [];
  for (let gi = 0; gi < GIA_SCALES.length; gi++) {
    const gs = GIA_SCALES[gi];
    const modelPure = fitYears.map(y => pureH5DeltaTParam((2000 - y) / 1e6, a1s, gs));
    const residual = stephDT.map((s, i) => s - modelPure[i]);
    const h5A = h5At2000(a1s, gs);
    const fit = fit4CyclesWithAnchor(fitYears, residual, h5A, USNO_TARGET);
    let sumAbs = 0, n = 0;
    for (const obs of l5bObs) {
      sumAbs += Math.abs(obs.dt_observed_sec - totalDeltaT(obs.year, a1s, gs, fit.cycles));
      n++;
    }
    const l5b = sumAbs / n;
    const lodRate_ms_per_cen = dLODdtAtJ2000(a1s, gs) * 1e5;
    const daRate_cm_per_yr   = daDtAtJ2000(a1s) * 100;
    const res_neg720 = stephenson(-720, stephSegs) - totalDeltaT(-720, a1s, gs, fit.cycles);
    row.push({ a1s, gs, l5b, lodRate_ms_per_cen, daRate_cm_per_yr, res_neg720 });
    if (l5b < bestL5b) { bestL5b = l5b; bestPt = { a1s, gs, l5b, lodRate_ms_per_cen, daRate_cm_per_yr, res_neg720 }; }
    if (a1s === 1.0 && gs === 1.0) prodL5b = l5b;
  }
  surface.push(row);
}
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`Scanned ${ALPHA1_SCALES.length * GIA_SCALES.length} points in ${elapsedS}s`);
console.log('');

// ─── Report ────────────────────────────────────────────────────
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  L-5b|R| (s) — rows: ALPHA_1 scale (Moon distance rate multiplier), cols: GIA scale (climate α multiplier)');
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
const hdr = ['α₁\\GIA'].concat(GIA_SCALES.map(g => g.toFixed(2).padStart(8)));
console.log('  ' + hdr.join(' '));
console.log('  ' + '-'.repeat(hdr.length * 9));
for (let ai = 0; ai < ALPHA1_SCALES.length; ai++) {
  const a1s = ALPHA1_SCALES[ai];
  const cells = surface[ai].map(c => c.l5b.toFixed(0).padStart(8));
  console.log('  ' + a1s.toFixed(2).padStart(7) + ' ' + cells.join(' '));
}
console.log('');

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  dLOD/dt at J2000 (ms/century) — physical sanity check');
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  ' + hdr.join(' '));
console.log('  ' + '-'.repeat(hdr.length * 9));
for (let ai = 0; ai < ALPHA1_SCALES.length; ai++) {
  const a1s = ALPHA1_SCALES[ai];
  const cells = surface[ai].map(c => c.lodRate_ms_per_cen.toFixed(2).padStart(8));
  console.log('  ' + a1s.toFixed(2).padStart(7) + ' ' + cells.join(' '));
}
console.log('');

console.log('════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('  residual @ year -720 (s) — Stephenson − framework (positive = framework too LOW)');
console.log('════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('  ' + hdr.join(' '));
console.log('  ' + '-'.repeat(hdr.length * 9));
for (let ai = 0; ai < ALPHA1_SCALES.length; ai++) {
  const a1s = ALPHA1_SCALES[ai];
  const cells = surface[ai].map(c => c.res_neg720.toFixed(0).padStart(8));
  console.log('  ' + a1s.toFixed(2).padStart(7) + ' ' + cells.join(' '));
}
console.log('');

console.log(`JOINT OPTIMUM:  α₁-scale = ${bestPt.a1s.toFixed(2)}   GIA-scale = ${bestPt.gs.toFixed(2)}`);
console.log(`  L-5b|R| = ${bestPt.l5b.toFixed(0)} s   res@-720 = ${bestPt.res_neg720.toFixed(0)} s`);
console.log(`  Corresponding physical rates:`);
console.log(`     dLOD/dt = ${bestPt.lodRate_ms_per_cen.toFixed(3)} ms/century  (observed IERS: 1.75)`);
console.log(`     da/dt   = ${bestPt.daRate_cm_per_yr.toFixed(3)} cm/yr        (observed Wells/LR: 3.82)`);
if (prodL5b !== null) {
  console.log(`Production (α₁=1.0, GIA=1.0):  L-5b|R| = ${prodL5b.toFixed(0)} s`);
  console.log(`Joint improvement:  ${(bestPt.l5b - prodL5b).toFixed(0)} s  (${((bestPt.l5b - prodL5b) / prodL5b * 100).toFixed(1)}%)`);
}
console.log('');
console.log('Interpretation:');
console.log('  * α₁-scale = 1.12 → matches LLR 3.82 cm/yr (from the pre-refit Wells 3.41 cm/yr; this is the SHIPPED anchor since the 2026-07 LLR-α₁ refit)');
console.log('  * α₁-scale = 1.30 → gives ~4.4 cm/yr (extreme end)');
console.log('  * GIA-scale = 0 → removes Cox & Chao contribution entirely (pure tidal)');
console.log('  * GIA-scale = 0.5 → weaker GIA drag (~-0.24 ms/century)');
console.log('  * If optimum lies at (1.10-1.20, 0.3-0.7) → parameters need modest physical adjustment');
console.log('  * If optimum lies at (>1.30, 0-0.2) → framework needs major revisions');

if (process.argv.includes('--json')) {
  const outPath = path.join(__dirname, '..', '..', 'data', 'alpha1-gia-scan-results.json');
  fs.writeFileSync(outPath, JSON.stringify({
    config: { H, LOD_NOW_H13_S, USNO_TARGET, ALPHA1_SCALES, GIA_SCALES, ALPHA_1_PROD, ALPHA_CLIMATE_SCALE_PROD },
    prod: { dLODdt_ms_century: prodLODrate * 1e5, dadt_cm_yr: prodDaRate * 100, l5b: prodL5b },
    joint_optimum: bestPt,
    surface: surface.flat(),
  }, null, 2));
  console.log(`\nJSON summary written to ${outPath}`);
}
