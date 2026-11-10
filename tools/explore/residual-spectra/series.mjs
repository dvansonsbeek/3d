// Plan 32 — the residual series, each the model against an EXTERNAL record (none is new data).
// Every series is {t: years, y: residual (external − model), w: weights, meta}. The model is the
// shipped @essrt/physics createModel(); the residual sign is record − model throughout.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createModel } = require('@essrt/physics');
const { deltaTEspenakMeeusCanonSeconds } = require('@essrt/physics/deltat/historical');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let _model = null;
/** The shipped model WITH its banked artifacts (the ζ series, the spin and lunar checkpoint
 *  banks) — the published surfaces' model; a bare createModel() has no series (its hybrid
 *  domain is null) and its deep elements are the mode tail's, not the published ones. */
export function model() {
  if (_model === null) {
    _model = createModel(undefined, {
      secularSeriesArtifact: require(join(ROOT, 'data', 'nbody-secular-series.json')),
      spinCheckpointsArtifact: require(join(ROOT, 'data', 'spin-axis-checkpoints.json')),
      lunarCheckpointsArtifact: require(join(ROOT, 'data', 'lunar-cumulative-checkpoints.json')),
    });
  }
  return _model;
}

/** Series 1 — ΔT: Espenak & Meeus 2006 (the NASA canon, the telescopic era) − the model, yearly. */
export function seriesDeltaTEspenak({ yearStart = 1650, yearEnd = 2010 } = {}) {
  const m = model();
  const t = [], y = [];
  for (let yr = yearStart; yr <= yearEnd; yr++) { t.push(yr); y.push(deltaTEspenakMeeusCanonSeconds(yr) - m.epoch.deltaTSecondsAtYear(yr)); }
  return { id: 'deltaT-espenak', t, y, w: t.map(() => 1), meta: { record: 'Espenak & Meeus 2006 ΔT canon (eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html)', model: 'epoch.deltaTSecondsAtYear (the anchor + the mean law + the stack + the swing)', unit: 's', cadence: '1 yr', span: [yearStart, yearEnd] } };
}

/** The timed observations of Stephenson, Morrison & Hohenkerk 2016 (the supplement's tables
 *  S01–S09: Babylonian, Chinese, Greek and Arab timed eclipses), weight > 0 only. */
export function loadStephensonTimedObservations() {
  const dir = join(ROOT, 'data', 'rspa20160404supp2');
  const rows = [];
  for (const n of ['01', '02', '03', '04', '05', '06', '07', '08', '09']) {
    const text = readFileSync(join(dir, `Table-S${n}.txt`), 'utf8');
    const title = text.split('\n')[1].trim();
    for (const line of text.split('\n').slice(4)) {
      const tok = line.trim().split(/\s+/);
      if (tok.length < 4 || !/^\d+$/.test(tok[0])) continue;
      const year = Number(tok[1]), dt = Number(tok[2]), weight = Number(tok[tok.length - 1]);
      // tables with lower/upper bounds (S04) carry no single DT: skip rows whose DT is bracketed
      if (!Number.isFinite(year) || !Number.isFinite(dt) || !Number.isFinite(weight) || /\[/.test(line)) continue;
      if (weight <= 0) continue;
      rows.push({ table: `S${n}`, title, year, dt, weight });
    }
  }
  return rows;
}

/** Series 2 — ΔT: the SMH2016 timed observations − the model, irregular, weighted. */
export function seriesDeltaTStephensonTimed() {
  const m = model();
  const rows = loadStephensonTimedObservations().sort((a, b) => a.year - b.year);
  return {
    id: 'deltaT-stephenson-timed',
    t: rows.map((r) => r.year), y: rows.map((r) => r.dt - m.epoch.deltaTSecondsAtYear(r.year)), w: rows.map((r) => r.weight),
    meta: { record: 'Stephenson, Morrison & Hohenkerk 2016, tables S01–S09 (timed eclipses, weight > 0)', model: 'epoch.deltaTSecondsAtYear', unit: 's', cadence: 'irregular', n: rows.length, tables: [...new Set(rows.map((r) => r.table))], span: [rows[0].year, rows[rows.length - 1].year] },
  };
}

/** The shipped stack's Jose pair (716 / 897 yr) evaluated as the model does (anchored to 0 at
 *  2000; the taper is 1 inside ±300 kyr), from the fit artifact's shipped coefficients. Adding
 *  it to a residual gives the residual against the model WITHOUT the pair — the Bond, Hallstatt
 *  and swing coefficients kept as jointly fitted (a first look; the proper test re-fits them
 *  without the pair, plan 32 §2). */
export function joseContributionSeconds(year) {
  const fit = JSON.parse(readFileSync(join(ROOT, 'data', 'deltaT-4flag-fit.json'), 'utf8'));
  let sum = 0;
  for (const key of ['jose5', 'jose4']) {
    const c = fit.shipped_coefficients[key];
    const omega = 2 * Math.PI / c.period_yr;
    const raw = c.cos_coeff_s * Math.cos(omega * year) + c.sin_coeff_s * Math.sin(omega * year);
    const raw0 = c.cos_coeff_s * Math.cos(omega * 2000) + c.sin_coeff_s * Math.sin(omega * 2000);
    sum += raw - raw0;
  }
  return sum;
}

/** A series against the model WITHOUT the Jose pair: residual + the pair's contribution. */
export function withoutJose(series) {
  return { ...series, id: `${series.id}-nojose`, y: series.y.map((v, i) => v + joseContributionSeconds(series.t[i])), meta: { ...series.meta, model: `${series.meta.model} MINUS the shipped Jose pair (716 / 897 yr)` } };
}

/** One shipped cycle's contribution as the model evaluates it (anchored to 0 at 2000). */
function shippedCycleSeconds(fit, key, year) {
  const c = fit.shipped_coefficients[key], omega = 2 * Math.PI / c.period_yr;
  return c.cos_coeff_s * (Math.cos(omega * year) - Math.cos(omega * 2000)) + c.sin_coeff_s * (Math.sin(omega * year) - Math.sin(omega * 2000));
}

/** Solve the normal equations A x = b (symmetric positive definite, small) by Gaussian elimination. */
function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = i + 1; r < n; r++) { const k = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= k * M[i][c]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let c = i + 1; c < n; c++) s -= M[i][c] * x[c]; x[i] = s / M[i][i]; }
  return x;
}

/** Hypothesis 1's proper form — the stack RE-FITTED on the SMH2016 spline with a chosen cycle set.
 *  The target is the spline minus the model's non-cycle part (the anchor, the raw tidal integral and
 *  the core–mantle swing, as shipped): spline − model + the four shipped cycles. On it the chosen
 *  cycles are fitted by least squares on the fitter's grid, each as the model carries it (a cos/sin
 *  pair at its period, anchored to 0 at 2000). With all four the residual must come back to the
 *  shipped one (the check); with Bond and Hallstatt only, the residual is the record FREE of the
 *  Jose pair's fit. Not the joint fitter (no USNO anchor, no caps, no re-optimised swing) — a
 *  spectral instrument, not a shipping fit. */
export function seriesDeltaTSplineRefit({ cycles = ['bond', 'hallstatt'], yearStart = -720, yearEnd = 2017, step = 10 } = {}) {
  const fit = JSON.parse(readFileSync(join(ROOT, 'data', 'deltaT-4flag-fit.json'), 'utf8'));
  const base = seriesDeltaTStephensonSpline({ yearStart, yearEnd, step });
  const ALL = ['bond', 'hallstatt', 'jose5', 'jose4'];
  const target = base.y.map((v, i) => v + ALL.reduce((s, k) => s + shippedCycleSeconds(fit, k, base.t[i]), 0));
  const basis = [];
  for (const key of cycles) {
    const omega = 2 * Math.PI / fit.shipped_coefficients[key].period_yr;
    basis.push((y) => Math.cos(omega * y) - Math.cos(omega * 2000), (y) => Math.sin(omega * y) - Math.sin(omega * 2000));
  }
  const X = base.t.map((y) => basis.map((f) => f(y)));
  const A = basis.map((_, i) => basis.map((__, j) => X.reduce((s, row) => s + row[i] * row[j], 0)));
  const b = basis.map((_, i) => X.reduce((s, row, r) => s + row[i] * target[r], 0));
  const coef = solve(A, b);
  const resid = target.map((v, r) => v - X[r].reduce((s, xv, i) => s + xv * coef[i], 0));
  const fitted = Object.fromEntries(cycles.map((k, i) => [k, { cos_s: coef[2 * i], sin_s: coef[2 * i + 1], amplitude_s: Math.hypot(coef[2 * i], coef[2 * i + 1]), shipped_amplitude_s: Math.hypot(fit.shipped_coefficients[k].cos_coeff_s, fit.shipped_coefficients[k].sin_coeff_s) }]));
  return { id: `deltaT-spline-refit-${cycles.join('+')}`, t: base.t, y: resid, w: base.w, meta: { ...base.meta, model: `the model's non-cycle part (anchor + raw + swing, as shipped) plus a least-squares re-fit of [${cycles.join(', ')}] on this record`, refit: fitted } };
}

/** Series 2b — ΔT: the SMH2016 spline (the fitter's own record) − the model, the fitter's grid. */
export function seriesDeltaTStephensonSpline({ yearStart = -720, yearEnd = 2017, step = 10 } = {}) {
  const m = model();
  const segments = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'stephenson-2016-deltaT-polynomial.json'), 'utf8')).segments;
  const spline = (year) => { for (const s of segments) if (year >= s.y0 && year <= s.y1) { const u = (year - s.y0) / (s.y1 - s.y0); const a = s.a; return a[0] + a[1] * u + a[2] * u * u + a[3] * u * u * u; } return NaN; };
  const t = [], y = [];
  for (let yr = yearStart; yr <= yearEnd; yr += step) { const s = spline(yr); if (Number.isFinite(s)) { t.push(yr); y.push(s - m.epoch.deltaTSecondsAtYear(yr)); } }
  return { id: 'deltaT-stephenson-spline', t, y, w: t.map(() => 1), meta: { record: 'SMH2016 ΔT spline (public/input/stephenson-2016-deltaT-polynomial.json) — the stack was FITTED on this residual', model: 'epoch.deltaTSecondsAtYear', unit: 's', cadence: `${step} yr`, span: [yearStart, yearEnd] } };
}
