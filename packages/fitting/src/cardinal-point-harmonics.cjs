#!/usr/bin/env node
/**
 * Fit cardinal point JD harmonics from simulation data.
 *
 * Reads all 4 cardinal point types from data/02-solar-measurements.csv,
 * fits 12 Fourier harmonics per type to the JD residuals (after removing
 * the linear trend), and outputs copy-paste coefficients.
 *
 * The harmonics are self-corrected to return the exact anchor value at the
 * nearest grid year to J2000. When steps don't land on year 2000 exactly,
 * the anchors are shifted using IAU rates.
 *
 * Usage: node tools/fit/cardinal-point-harmonics.js
 */

const fs = require('fs');
const path = require('path');
// 9-3d: moved from tools/fit (shim remains); tools/lib via the runtime bridge.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const TOOLS_LIB = path.join(ROOT, 'tools', 'lib');
const C = require(path.join(TOOLS_LIB, 'constants.js'));
const OE = require(path.join(TOOLS_LIB, 'orbital-engine.js'));   // §10: law-of-cosines e(t)

const CSV_PATH = path.join(ROOT, 'data', '02-solar-measurements.csv');

// ─── Grid year and shifted anchors (from constants.js) ───────────────────
const GRID_YEAR = C.gridYear;
const DELTA_FROM_J2000 = C.gridYearDeltaFromJ2000;
const GRID_ANCHORS = C.cardinalPointAnchorsAtGrid;

// ─── Edge trim (fit protocol) ────────────────────────────────────────────
// The export window is EXACTLY the balanced bracket (cycle 0 → 1 of H), so
// both window ends sit at the same H/16 lattice phase and the least-squares
// objective was dominated by truncated-basis EDGE DIVERGENCE: the outer 5% of
// rows carried 38.9 min RMS against a 3.5 min interior — a leverage that
// distorted the shipped coefficients EVERYWHERE (year-decile RMS profile
// 10.3 | 3.2–4.1 flat | 10.3 min; the same divisor set refits the interior at
// 1.4–1.8 min once the edges are excluded). Trimming is a fit-protocol
// choice, not a model change: divisor set, runtime form and anchors are
// untouched. The trimmed outer regions become extrapolation (fit-unconstrained)
// — J2000 sits at 0.91 of the window, INSIDE the kept region with ~3,850 yr
// of margin. NOTE: the edge error masqueraded as a physical feature at the
// e(t) minimum (both edges share lattice phase ≈ 0°) until the edge/interior
// split was measured — see the plan's 6c residual-map section (pre-rename
// numbering: there "6c" = this cardinal-point fit).
const FIT_EDGE_TRIM_FRACTION = 0.08;

// ─── Read CSV data by type ───────────────────────────────────────────────
function readData() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.trim().split('\n');
  console.log(`CSV: ${lines.length - 1} rows`);

  // Collect all rows by type
  const allByType = { SS: [], WS: [], VE: [], AE: [] };
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const type = parts[0];
    if (!allByType[type]) continue;
    const year = parseFloat(parts[1]);
    const jd = parseFloat(parts[2]);
    const obliq = parseFloat(parts[4]);
    if (!isNaN(year) && !isNaN(jd)) {
      allByType[type].push({ year, jd, obliq });
    }
  }

  // Downsample by stepYears, J2000-anchored (filter (year - 2000) % step === 0
  // so year 2000 lands on the sampling line — matching year-length-harmonics.js).
  const step = C.stepYears || 20;
  const byType = { SS: [], WS: [], VE: [], AE: [] };
  for (const type of ['SS', 'WS', 'VE', 'AE']) {
    byType[type] = allByType[type].filter(r => ((r.year - 2000) % step + step) % step === 0);
  }
  console.log(`Downsampled (J2000-anchored): ${allByType.SS.length} → ${byType.SS.length} per type (step=${step})`);
  for (const type of ['SS', 'WS', 'VE', 'AE']) {
    const ys = byType[type].map(r => r.year);
    const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo;
    byType[type] = byType[type].filter(r =>
      r.year >= lo + FIT_EDGE_TRIM_FRACTION * span &&
      r.year <= hi - FIT_EDGE_TRIM_FRACTION * span);
  }
  console.log(`Edge-trimmed ${FIT_EDGE_TRIM_FRACTION * 100}% per side → ${byType.SS.length} rows per type`);
  return { byType, allByType };
}

// ─── Deep-time drift term + integrated phase ──────────────────────────────
// EXACT mirror of src/script.js `computeSolsticeJD`:
//   jd = anchor + MSY_J2000·(Y − 2000)          <- linear
//      + (Y − 2000)·[mSY(t_Ma) − MSY_J2000]     <- Option-B drift (deep time)
//      + Σ harmonics(phase) − harmonics(phase0)
//
// The drift term MUST be subtracted from the fit target. It was not, so the
// harmonics were absorbing the deep-time secular drift while the runtime added
// it a SECOND time — a double count worth up to 7.04 days at the far edge of
// the Step 6a window. It was invisible while the CSV was snapshot-mode, where
// drift ≡ 0; the deep-time default flip exposed it.
//
// It also made the fit unfittable in principle: `jd − linear` contains a
// SECULAR RAMP, which a Fourier basis on H-divisors cannot represent. With the
// drift removed the target is a bounded ±3 d oscillation — which is exactly
// what a harmonic basis can fit.
//
// ── The drift is a SUM, not a RECTANGLE (plan §5c-ii-b) ──────────────────────
// The earlier form was
//     (year − 2000) · [mSY(t) − MSY_J2000]
// i.e. elapsed span × the deviation AT THE ENDPOINT. The accumulated drift in a
// cardinal-point JD is Σ(T(y) − mean) over the intervening years — an integral,
// not a product. At −302,635 the rectangle overstates it by +3.314 d.
//
// That error was CANCELLING the §5d pos↔JD bug, which displaced the same epoch
// by −3.318 d: two rectangle-vs-integral errors of the same quantity, equal and
// opposite. Fixing §5d alone therefore made this fit WORSE, and this is the
// other half. (It is also the real content of the "7.04 day double count" noted
// above: 7.04 d is the rectangle, 3.73 d is the true sum.)
//
// Amplitude is FIXED AT 1 — no fitted parameter. §5d-t measured the mass-loss
// amplitude at 1.00, so the physics curve enters at unit scale.
const DT = require(path.join(TOOLS_LIB, 'deep-time.js'));
const J2000_CALENDAR_YEAR = C.startmodelYear;   // 2000.5, mirrors the runtime

// Year-length deviation from the linear term's reference year.
// NOTE f(2000) = −0.118 s/yr, NOT zero: C.meanSolarYearDays is not the year the
// scene actually produces (§5c-vi). Both endpoints are therefore required below.
function driftIntegrand(year) {
  const mSY = DT.meanTropicalYearDaysAtAge((J2000_CALENDAR_YEAR - year) / 1e6);
  return (mSY === null) ? 0 : (mSY - C.meanSolarYearDays);
}

// Σ(T(y) − mean) from 2000 to `year`, as Simpson quadrature plus the
// Euler–Maclaurin endpoint term that converts the integral into the discrete
// sum. Accurate to ≤0.019 s against exact year-by-year summation across the
// Step 6a window, versus 286,306 s for the rectangle.
//
// Node SPACING is what matters, not node count. `f` carries ~100-kyr structure
// (the α/L1 content), so nodes must stay well inside that regardless of how far
// `year` is from 2000 — `f` itself is smooth (second differences ~1e-5 s at
// 1000-yr spacing), it is the sampling that fails.
//
// A FIXED count silently degrades with distance and would have shipped a
// deep-time bug: at n=64, error is 0.0 s at the Step 6a window edge but +137.7 s
// at −4 Myr, +571 s at −10 Myr and −33,758 s (9.4 h) at −380 Ma, where the year
// is ~400 days. Fixed 2000-yr spacing matches exact year-by-year summation to
// 0.001 s at −1 Myr.
const DRIFT_NODE_SPACING_YEARS = 2000;
const DRIFT_SIMPSON_N_MIN = 64;

function driftTerm(year) {
  const span = year - 2000;
  if (span === 0) return 0;
  let n = Math.ceil(Math.abs(span) / DRIFT_NODE_SPACING_YEARS);
  if (n % 2) n++;                        // Simpson needs an even interval count
  if (n < DRIFT_SIMPSON_N_MIN) n = DRIFT_SIMPSON_N_MIN;
  const h = span / n;
  const f0 = driftIntegrand(2000);
  const fN = driftIntegrand(year);
  let s = f0 + fN;
  for (let i = 1; i < n; i++) {
    s += driftIntegrand(2000 + i * h) * ((i % 2) ? 4 : 2);
  }
  return s * h / 3 - (fN - f0) / 2;
}

// Integrated phase, replacing the snapshot form 2π·div·(year − BAL)/H_J2000.
// `year` stays the Model Year here — unlike computeObliquityEarth, whose
// argument is an INSTANT, computeSolsticeJD's argument is an ordinal LABEL
// ("which year's solstice"), and the runtime consumes it the same way for the
// linear, drift and phase terms. Keeping one convention across all three is
// what makes the fit reproduce the runtime.
const phaseOf = (year, div) => {
  const c = DT.cyclesBetweenYears(C.balancedYear, year, div);
  return (c === null ? 0 : c) * 2 * Math.PI;
};

// ═══ §10 — cardinal points DERIVED from the Step 6c year-length model ═══════
//
//   JD_X(Y) = anchor_X + LINCOEF·(Y−2000) + driftTerm(Y) + Ih(Y) + δ_X(Y)
//
// The four cardinal points decompose exactly, because T_trop IS DEFINED as the
// mean of their four intervals:
//   T_X(Y) = T_trop(Y) + δ_X(Y),  Σ_X δ_X ≡ 0
// so the COMMON mode (all the secular content) comes from 6c, and this step
// fits only the DIFFERENTIAL mode — the braiding.
//
// Measured: spiral coherence 17× tighter than the old independent fit
// (quadrature −0.79° → −0.03°, amplitude spread 2.18% → 0.13%). Accuracy is
// unchanged; this buys structural correctness, not precision (§10e-bis).
//
// REQUIRES the year-length fit (Step 6c — renamed from 6d when this fit
// became 6d) to have run --write first. That is the reordering:
// year-length precedes cardinal-point, and the year-length model — not the
// cardinal-point fit — is the authoritative source of secular year-length
// behaviour.
const _fcPath = path.join(ROOT, 'public', 'input', 'fitted-coefficients.json');
const _fc = JSON.parse(fs.readFileSync(_fcPath, 'utf8'));
const TROP_HARMONICS = _fc.TROPICAL_YEAR_HARMONICS;
const TROP_ANCHOR = _fc.YEAR_LENGTH_J2000_ANCHOR;
if (!TROP_HARMONICS || !TROP_ANCHOR) {
  throw new Error('The cardinal-point fit (6d) derives from the year-length fit (6c) — run `node tools/fit/year-length-harmonics.js --write` first.');
}
// Stale-input guard: 6c's keys EXISTING is not enough — they must be fitted
// from THIS CSV. Measured failure: a cardinal-point run consumed year-length
// keys fitted from the previous CSV; the existence-only check let it
// through silently.
if (TROP_ANCHOR.sourceCsvMtimeMs !== fs.statSync(CSV_PATH).mtimeMs) {
  throw new Error(
    'Step 6c (year-length) was fitted from a DIFFERENT CSV than the one on disk '
    + `(stamp ${TROP_ANCHOR.sourceCsvMtimeMs}, disk ${fs.statSync(CSV_PATH).mtimeMs}). `
    + 'Re-run `node tools/fit/year-length-harmonics.js --write` against the current CSV first.');
}

// (The analyticTropDays reference evaluator was deleted at 9-3e — dead
// since the table-interpolation path shipped; the analytic form lives in
// @hum/physics/deltat/deep-time tropicalYearDaysAtAge, and git history
// preserves the old local copy.)

const _cycleOf = (year) => {
  const c = DT.cyclesBetweenYears(C.balancedYear, year, 1);
  return c === null ? 0 : c;
};
const CYCLE_ANCHOR = _cycleOf(2000);

// 6c's self-corrected harmonic series, evaluated as a year-length deviation.
function tropHarmonicsAt(year) {
  const c = _cycleOf(year);
  let s = 0;
  for (const [div, sinC, cosC] of TROP_HARMONICS) {
    const th = 2 * Math.PI * div * c, th0 = 2 * Math.PI * div * CYCLE_ANCHOR;
    s += sinC * (Math.sin(th) - Math.sin(th0)) + cosC * (Math.cos(th) - Math.cos(th0));
  }
  return s;
}

// H(c) as a LINEAR model over the fit window. H must stay INSIDE the integral
// below: treating it as constant costs up to 5.2 s (§10c). This is the same
// error class as §5d and §5c-ii-b — a rate held constant across a span where it
// is not — for the third time in this campaign.
let _Hc0 = null, _Hc1 = 0;
function calibrateHModel(years) {
  let sc = 0, sh = 0, scc = 0, sch = 0, n = 0;
  for (const y of years) {
    const H = DT.meanHAtAge((J2000_CALENDAR_YEAR - y) / 1e6);
    if (H === null) continue;
    const c = _cycleOf(y);
    sc += c; sh += H; scc += c * c; sch += c * H; n++;
  }
  _Hc1 = (n * sch - sc * sh) / (n * scc - sc * sc);
  _Hc0 = (sh - _Hc1 * sc) / n;
}

// Ih(Y) = Σ_{2000→Y} tropHarmonicsAt(y), in closed form.
// dθ/dy = 2πn/H(y) ⇒ dy = H dc, so ∫ a·sin(2πnc)·H(c) dc with H linear in c has
// an exact antiderivative. The trailing term is Euler–Maclaurin (integral →
// discrete sum); without it the error is 6–13 s.
function integratedTropHarmonics(year) {
  if (_Hc0 === null) throw new Error('calibrateHModel() must run before integratedTropHarmonics()');
  const cY = _cycleOf(year), c0 = CYCLE_ANCHOR;
  let tot = 0, k0 = 0;
  for (const [div, sinC, cosC] of TROP_HARMONICS) {
    const k = 2 * Math.PI * div;
    const F = (c) => {
      const s = Math.sin(k * c), co = Math.cos(k * c), Hc = _Hc0 + _Hc1 * c;
      return [-Hc * co / k + _Hc1 * s / (k * k), Hc * s / k + _Hc1 * co / (k * k)];
    };
    const a = F(c0), b = F(cY);
    tot += sinC * (b[0] - a[0]) + cosC * (b[1] - a[1]);
    const th0 = k * c0;
    k0 += sinC * Math.sin(th0) + cosC * Math.cos(th0);
  }
  return tot - k0 * (year - 2000)
       - (tropHarmonicsAt(year) - tropHarmonicsAt(2000)) / 2;
}

// Linear coefficient of the DERIVED model. 6c's model is
//   T_trop(Y) = av + [A(Y) − A(2000)] + h(Y)
// so Σ T_trop = [av − A(2000) + meanSolarYearDays]·(Y−2000) + driftTerm + Ih,
// because driftTerm already carries Σ[A(y) − meanSolarYearDays].
//
// ── DO NOT use YEAR_LENGTH_J2000_ANCHOR.tropical here ──────────────────────
// That constant is the INSTANTANEOUS 1-year interval at 2000. This term is a
// rate to be INTEGRATED over 335,317 years, and the two differ by 0.03661 s/yr
// (the 1-year value vs the step-N mean — an anchor-convention difference 6c
// documents and tolerates, because for a year LENGTH it is a local offset).
// Integrated, that offset becomes a −0.142 d = −12,276 s RAMP. It does not show
// up as a 118 min RMSE because the δ_X harmonics ABSORB most of it — which is
// exactly the §5c-ii failure this design exists to remove. Measured cost when
// this was wrong: SS 5.66 → 6.02 min.
//
// Instead derive it from TOTAL ELAPSED TIME, so ΣT_trop reproduces the measured
// accumulation by construction. One data-derived scalar, the integral's
// counterpart to the per-point JD anchor — not a fitted parameter.
let LINCOEF = null;
function calibrateLincoef(byType) {
  let acc = 0, n = 0;
  for (const type of ['SS', 'WS', 'VE', 'AE']) {
    const rows = byType[type];
    if (!rows || rows.length < 2) continue;
    const a = rows[0], b = rows[rows.length - 1];
    const span = b.year - a.year;
    if (!span) continue;
    // elapsed JD, minus everything ΣT_trop already accounts for
    const rest = (driftTerm(b.year) - driftTerm(a.year))
               + (integratedTropHarmonics(b.year) - integratedTropHarmonics(a.year));
    acc += ((b.jd - a.jd) - rest) / span;
    n++;
  }
  LINCOEF = acc / n;
  return LINCOEF;
}

/** Accumulated tropical years from 2000 to `year`, in days. */
// Memoized: pure in `year` once calibrateHModel/calibrateLincoef have run
// (both execute exactly once, before any fit). The greedy re-evaluates the
// same rows ~119× per round through the candidate-invariant b[] — without
// the memo, each row re-runs the Simpson drift integral (~10¹⁰ deep-time
// calls across a full run; measured as hours of wall clock).
const _sigmaMemo = new Map();
function sigmaTropical(year) {
  if (LINCOEF === null) throw new Error('calibrateLincoef() must run before sigmaTropical()');
  let v = _sigmaMemo.get(year);
  if (v === undefined) {
    v = LINCOEF * (year - 2000) + driftTerm(year) + integratedTropHarmonics(year);
    _sigmaMemo.set(year, v);
  }
  return v;
}

// ─── Least squares harmonic fit ──────────────────────────────────────────
// Uses the actual JD at year 2000 from the data as anchor (exact by construction).
// Self-corrected harmonics: h(year) - h(2000), so at year 2000 the prediction
// equals the anchor exactly. No year offsets needed.
//
// Runtime formula (§10): JD = anchor + ΣT_trop(year) + δ(year) − δ(2000)
//
// The EQUATION-OF-CENTRE basis replaces two sinusoid pairs (§10e-quater). The
// cardinal-point offset goes as e(t)·sin(λ_X − ϖ), and the equation of centre is
//   2e·sin M + (5/4)e²·sin 2M + (13/12)e³·sin 3M + …
// so order n carries e(t)^n at angle nM. Crucially e(t) is the LAW OF COSINES
//   e(t) = √(base² + amp² − 2·base·amp·cos θ)      (doc 39)
// which collapses to base−amp at θ=0 — a cusp, not a sinusoid — so its Fourier
// expansion has content at every multiple of θ. Fitting plain H/16 and H/32
// sinusoids approximates a closed form we already have.
//
// REPLACE, never ADD: e(t) is dominated by its mean, so e(t)·sinθ and sinθ are
// nearly parallel. Supplying both makes the fit split H/16 arbitrarily between
// them — measured 179.58° quadrature error and 102% amplitude spread.
const ECC_ORDER_DIVISORS = [16, 32];   // H/16 → e·sin(M), H/32 → e²·sin(2M)

function eccentricityAt(year) {
  return OE.computeEccentricityEarth(year);
}

function fitHarmonics(data, divisors) {
  const n = data.length;
  // sinusoid divisors, minus the two the equation-of-centre basis takes over
  const sinDiv = divisors.filter(d => !ECC_ORDER_DIVISORS.includes(d));
  const nEcc = ECC_ORDER_DIVISORS.length * 2;
  const m = sinDiv.length * 2 + nEcc;
  const anchor = data[0].anchor;       // actual JD at anchor year
  const anchorYear = data[0].anchorYear; // year label of the anchor row

  const A = new Array(n);
  const b = new Float64Array(n);
  const e0 = eccentricityAt(anchorYear);

  for (let i = 0; i < n; i++) {
    const yr = data[i].year;
    b[i] = data[i].jd
         - (anchor + sigmaTropical(yr) - sigmaTropical(anchorYear));
    A[i] = new Float64Array(m);
    for (let k = 0; k < sinDiv.length; k++) {
      const phase = phaseOf(yr, sinDiv[k]);
      const phase0 = phaseOf(anchorYear, sinDiv[k]);
      A[i][2 * k] = Math.sin(phase) - Math.sin(phase0);
      A[i][2 * k + 1] = Math.cos(phase) - Math.cos(phase0);
    }
    // equation-of-centre orders, self-corrected like the sinusoids
    const e = eccentricityAt(yr);
    const th = phaseOf(yr, 16), th0 = phaseOf(anchorYear, 16);
    for (let ord = 1; ord <= ECC_ORDER_DIVISORS.length; ord++) {
      const base = sinDiv.length * 2 + (ord - 1) * 2;
      const eN = Math.pow(e, ord), eN0 = Math.pow(e0, ord);
      A[i][base]     = eN * Math.sin(ord * th) - eN0 * Math.sin(ord * th0);
      A[i][base + 1] = eN * Math.cos(ord * th) - eN0 * Math.cos(ord * th0);
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

  // Sinusoid terms keep the [div, sin, cos] shape. The equation-of-centre terms
  // are tagged with `eccOrder` so the runtime evaluates them as e(t)^n·sin(nM)
  // rather than as a plain sinusoid — an untagged consumer would silently read
  // them as H/16 and H/32 sinusoids and be wrong by the whole braid.
  const harmonics = [];
  for (let k = 0; k < sinDiv.length; k++) {
    harmonics.push([sinDiv[k], x[2 * k], x[2 * k + 1]]);
  }
  const eccTerms = [];
  for (let ord = 1; ord <= ECC_ORDER_DIVISORS.length; ord++) {
    const base = sinDiv.length * 2 + (ord - 1) * 2;
    eccTerms.push({ order: ord, sin: x[base], cos: x[base + 1] });
  }

  // RMSE using the RUNTIME formula (§10):
  //   JD = anchor + ΣT_trop(year) − ΣT_trop(anchor) + δ(year) − δ(anchor)
  let sse = 0;
  const resid = [];   // per-row residuals (days) — consumed by the §10g joint stage
  const sig0 = sigmaTropical(anchorYear);
  for (let i = 0; i < n; i++) {
    const yr = data[i].year;
    let pred = anchor + sigmaTropical(yr) - sig0;
    for (const [div, sinC, cosC] of harmonics) {
      const phase = phaseOf(yr, div);
      const phase0 = phaseOf(anchorYear, div);
      pred += sinC * (Math.sin(phase) - Math.sin(phase0))
            + cosC * (Math.cos(phase) - Math.cos(phase0));
    }
    const e = eccentricityAt(yr);
    const th = phaseOf(yr, 16), th0 = phaseOf(anchorYear, 16);
    for (const t of eccTerms) {
      const eN = Math.pow(e, t.order), eN0 = Math.pow(e0, t.order);
      pred += t.sin * (eN * Math.sin(t.order * th) - eN0 * Math.sin(t.order * th0))
            + t.cos * (eN * Math.cos(t.order * th) - eN0 * Math.cos(t.order * th0));
    }
    const err = (data[i].jd - pred) * 24 * 60; // minutes
    resid.push({ year: yr, days: data[i].jd - pred });
    sse += err * err;
  }
  const rmse = Math.sqrt(sse / n);

  return { harmonics, eccTerms, rmse, anchorYear, resid };
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

// ─── Greedy harmonic selection ───────────────────────────────────────────
function greedySelect(data, baseDivisors, maxHarmonics, candidateRange) {
  let currentDivisors = [...baseDivisors];
  let best = fitHarmonics(data, currentDivisors);

  console.log(`    Base (${currentDivisors.length}): RMSE = ${best.rmse.toFixed(2)} min`);

  while (currentDivisors.length < maxHarmonics) {
    let bestDiv = null;
    let bestRmse = best.rmse;

    for (let d = 2; d <= candidateRange; d++) {
      if (currentDivisors.includes(d)) continue;
      const test = fitHarmonics(data, [...currentDivisors, d]);
      if (test.rmse < bestRmse) {
        bestRmse = test.rmse;
        bestDiv = d;
      }
    }

    if (bestDiv === null) break;
    currentDivisors.push(bestDiv);
    currentDivisors.sort((a, b) => a - b);
    best = fitHarmonics(data, currentDivisors);

    const h = best.harmonics.find(h => h[0] === bestDiv);
    const amp = Math.sqrt(h[1] ** 2 + h[2] ** 2);
    console.log(`    + H/${bestDiv} (amp=${amp.toFixed(3)}d): RMSE = ${best.rmse.toFixed(2)} min [${currentDivisors.join(',')}]`);
  }

  return { divisors: currentDivisors, ...best };
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CARDINAL POINT JD HARMONIC FIT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nUsing constants.js: H=${C.H}, balancedYear=${C.balancedYear}`);
  console.log(`meanSolarYearDays=${C.meanSolarYearDays}`);
  console.log(`Grid year (nearest to J2000): ${GRID_YEAR} (delta=${DELTA_FROM_J2000}yr)`);
  for (const [type, jd] of Object.entries(GRID_ANCHORS)) {
    console.log(`  ${type} anchor: J2000=${C.CARDINAL_POINT_ANCHORS[type].toFixed(3)} → grid=${jd.toFixed(3)}`);
  }

  const { byType, allByType } = readData();
  const types = ['SS', 'WS', 'VE', 'AE'];
  const fibDivisors = [3, 5, 8, 13, 16];
  const results = {};

  // §10c — calibrate H(c) BEFORE any fit. H moves 27.59 yr (0.0082%) across the
  // window, and it multiplies the integrated harmonic amplitude; holding it
  // constant costs up to 5.2 s.
  calibrateHModel(byType.SS.map(d => d.year));
  calibrateLincoef(byType);          // must follow calibrateHModel — uses Ih()
  console.log(`\n§10: deriving cardinal points from the Step 6c year-length model`);
  console.log(`  TROPICAL_YEAR_HARMONICS: ${TROP_HARMONICS.length} terms [${TROP_HARMONICS.map(t => t[0]).join(',')}]`);
  console.log(`  J2000 tropical anchor:   ${TROP_ANCHOR.tropical}`);
  console.log(`  LINCOEF (elapsed-derived): ${LINCOEF}`);
  console.log(`    vs 1-year anchor:        ${TROP_ANCHOR.tropical}  (Δ ${((LINCOEF - TROP_ANCHOR.tropical) * 86400).toFixed(5)} s/yr — see §10c note)`);
  console.log(`  H(c) = ${_Hc0.toFixed(3)} + ${_Hc1.toFixed(3)}·c   (H is NOT fixed — §10c)`);
  console.log(`  equation-of-centre basis replaces H/${ECC_ORDER_DIVISORS.join(', H/')}`);

  for (const type of types) {
    // Find the data row closest to the IAU J2000 anchor JD.
    // Year labels may be off by 1 due to the export's seed year (2000.5).
    const iauAnchor = C.ASTRO_REFERENCE.cardinalPointAnchors[type];
    let bestRow = byType[type][0];
    let bestDiff = Infinity;
    for (const d of byType[type]) {
      const diff = Math.abs(d.jd - iauAnchor);
      if (diff < bestDiff) { bestDiff = diff; bestRow = d; }
    }
    const anchor = bestRow.jd;
    const anchorYear = bestRow.year;
    const data = byType[type].map(d => ({ ...d, anchor, anchorYear }));
    console.log(`\n── ${type} (${data.length} points, anchor=${anchor.toFixed(3)} at year ${anchorYear}) ──`);

    // The SHIPPED divisor set — one SYMMETRIC basket for all four points.
    // Historically each point carried its own greedy-frozen set (SS had
    // {22,23}, WS {22,48}, VE/AE {23,48}), and every point's residual excess
    // sat exactly at ITS missing divisors — WS carried a 72.7 s H/23 line,
    // 2× the other points' RMS, purely because it was the one point without
    // H/23. The braid law (δ_X = one rotating vector, doc 99) demands a
    // basis that treats the four points identically; the union set enforces
    // that. H/16 and H/32 stay excluded (equation-of-centre basis, §10e-quater).
    const currentDivisors = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      17, 18, 19, 22, 23, 24, 29, 40, 48];
    const current = fitHarmonics(data, currentDivisors);
    console.log(`  Current ${currentDivisors.length} harmonics [${currentDivisors.join(',')}]: RMSE = ${current.rmse.toFixed(2)} min`);

    // Greedy selection. SKIPPABLE: it dominates runtime (~10 min per type) and
    // is a DIAGNOSTIC only — the shipped divisor set is deliberately fixed, so
    // the search result is never written. Skip it while iterating on the model.
    let greedy;
    if (process.argv.includes('--no-greedy') || process.env.SKIP_GREEDY === '1') {
      console.log('  Greedy selection: SKIPPED (--no-greedy)');
      greedy = { ...current, divisors: currentDivisors };
    } else {
      console.log('  Greedy selection:');
      greedy = greedySelect(data, fibDivisors, 24, 120);
      console.log(`  Final: RMSE = ${greedy.rmse.toFixed(2)} min [${greedy.divisors.join(',')}]`);
    }

    // §10f gate — the four points are ONE rotating perihelion vector, so their
    // order-1 equation-of-centre terms must sit in exact 90° quadrature with
    // equal amplitudes. The fit does NOT enforce this, so a deviation is a real
    // signal. Unfakeable, unlike RMSE (which extra freedom can always improve).
    const e1 = current.eccTerms[0];
    console.log(`  e·sin(M) term: amp ${Math.hypot(e1.sin, e1.cos).toExponential(4)}  ` +
                `phase ${((Math.atan2(e1.sin, e1.cos) * 180 / Math.PI + 360) % 360).toFixed(2)}°`);

    results[type] = { current, greedy, anchor };
  }

  // §10f — quadrature summary across the four points
  {
    const ph = t => (Math.atan2(results[t].current.eccTerms[0].sin, results[t].current.eccTerms[0].cos) * 180 / Math.PI + 360) % 360;
    const am = t => Math.hypot(results[t].current.eccTerms[0].sin, results[t].current.eccTerms[0].cos);
    const base = ph('SS');
    let worst = 0;
    console.log('\n── §10f H/16 spiral coherence (equation-of-centre order 1) ──');
    ['SS', 'AE', 'WS', 'VE'].forEach((t, i) => {
      const d = (ph(t) - base + 360) % 360;
      const err = ((d - i * 90 + 540) % 360) - 180;
      if (Math.abs(err) > Math.abs(worst)) worst = err;
      console.log(`  ${t}  Δphase ${d.toFixed(2)}°  (ideal ${i * 90}°, err ${err.toFixed(2)}°)`);
    });
    const A = ['SS', 'WS', 'VE', 'AE'].map(am);
    const spread = (Math.max(...A) - Math.min(...A)) / (A.reduce((a, b) => a + b) / 4) * 100;
    console.log(`  worst quadrature error: ${worst.toFixed(2)}°   amplitude spread: ${spread.toFixed(2)}%`);
    console.log(`  (old independent fit: -0.79° / 2.18%)`);
  }

  // ═══ §10g — quadrature-locked JOINT sideband stage (stage 2) ═══════════════
  //
  // The braid is ONE rotating vector: δ_X = Im[e^{i·λ_X}·W(t)] with the §10f
  // quadrature angles λ = 0/90/180/270° (SS→AE→WS→VE). Its modulation
  // sidebands therefore share complex amplitudes across the four points —
  // 2 parameters per (order, divisor) TOTAL, so the quadrature cannot degrade
  // by construction (nothing free to leak, unlike the free per-point mid-band
  // fit, which reached 5–6 s only by breaking the gate at 7.7°/17.6%).
  //
  // THE SIGN IS LOAD-BEARING: the carrier is e^{i(λ_X − θ16)}, so sidebands
  // carry point-phase +n·λ_X against time-phase −θ_d — COUNTER-rotating. The
  // co-rotating sense (the naive reading of §10f) captures NOTHING (measured:
  // interior RMSE unchanged). Do not "fix" the minus sign.
  //
  // Orders: n=1 (e¹ carrier sidebands, quadrature offsets) and n=2 (e² carrier,
  // point-phase 2λ_X — pairs, SS/WS vs VE/AE). Fitted as a SECOND STAGE on the
  // stacked residuals of the four shipped per-point fits, so every existing
  // coefficient is untouched and the key is purely additive.
  //
  // Band and orders are SHIPPED structural choices (plan Phase D+ measured
  // table). The full 2–45 band only adds collinearity — adjacent shared
  // amplitudes balloon to 200+ s in mutual cancellation. No greedy here (R10).
  const JOINT_QUADRATURE_RAD = { SS: 0, AE: Math.PI / 2, WS: Math.PI, VE: 1.5 * Math.PI };
  const JOINT_BAND = [20, 21, 25, 26, 27, 28, 30, 31, 33, 34, 35, 36, 37];
  const JOINT_ORDERS = [1, 2];
  let jointTerms = [];
  {
    const specs = [];
    for (const order of JOINT_ORDERS) for (const div of JOINT_BAND) specs.push({ order, div });
    const mJ = 2 * specs.length;
    const jointCols = (type, year) => {
      const out = new Float64Array(mJ);
      for (let j = 0; j < specs.length; j++) {
        const th  = specs[j].order * JOINT_QUADRATURE_RAD[type] - phaseOf(year, specs[j].div);
        const th0 = specs[j].order * JOINT_QUADRATURE_RAD[type] - phaseOf(2000, specs[j].div);
        out[2 * j]     = Math.sin(th) - Math.sin(th0);
        out[2 * j + 1] = Math.cos(th) - Math.cos(th0);
      }
      return out;
    };
    const ATA = new Array(mJ);
    const ATb = new Float64Array(mJ);
    for (let j = 0; j < mJ; j++) ATA[j] = new Float64Array(mJ);
    let nRows = 0;
    for (const type of types) {
      for (const r of results[type].current.resid) {
        const a = jointCols(type, r.year);
        for (let j = 0; j < mJ; j++) {
          ATb[j] += a[j] * r.days;
          for (let k = j; k < mJ; k++) ATA[j][k] += a[j] * a[k];
        }
        nRows++;
      }
    }
    for (let j = 0; j < mJ; j++) for (let k = 0; k < j; k++) ATA[j][k] = ATA[k][j];
    const xJ = solveCholesky(ATA, ATb, mJ);
    jointTerms = specs.map((s, j) => ({ order: s.order, div: s.div, sin: xJ[2 * j], cos: xJ[2 * j + 1] }));

    console.log(`\n── §10g quadrature-locked joint sidebands (counter-rotating; ${mJ} SHARED params, ${nRows} stacked rows) ──`);
    console.log('  type | interior RMSE (min) | ±200yr RMS (s)');
    for (const type of types) {
      const before = [], after = [], wB = [], wA = [];
      for (const r of results[type].current.resid) {
        const a = jointCols(type, r.year);
        let corr = 0;
        for (let j = 0; j < mJ; j++) corr += a[j] * xJ[j];
        before.push(r.days * 1440);
        after.push((r.days - corr) * 1440);
        if (Math.abs(r.year - 2000) <= 200) { wB.push(r.days * 86400); wA.push((r.days - corr) * 86400); }
      }
      const rms = arr => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
      console.log(`  ${type} | ${rms(before).toFixed(2)} → ${rms(after).toFixed(3)} | ${rms(wB).toFixed(2)} → ${rms(wA).toFixed(2)}`);
    }
  }

  // ─── Output ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  COPY-PASTE OUTPUT');
  console.log('═══════════════════════════════════════════════════════════════');

  const jsLines = [];
  jsLines.push('const CARDINAL_POINT_HARMONICS = {');
  console.log('\nconst CARDINAL_POINT_HARMONICS = {');
  for (const type of types) {
    const { greedy } = results[type];
    const hdr = `  ${type}: [  // RMSE = ${greedy.rmse.toFixed(1)} min over full H`;
    console.log(hdr);
    jsLines.push(hdr);
    for (const [div, sinC, cosC] of greedy.harmonics) {
      const amp = Math.sqrt(sinC * sinC + cosC * cosC);
      const label = [3,5,8,13,16].includes(div) ? ' [Fib]' :
        (div === 6 ? ' 2×(H/3)' : div === 11 ? ' H/3+H/8' :
         div === 19 ? ' H/3+H/16' : div === 24 ? ' H/8+H/16' :
         div === 32 ? ' 2×(H/16)' : '');
      const line = `    [${String(div).padStart(2)},  ${sinC >= 0 ? ' ' : ''}${sinC.toFixed(6)},  ${cosC >= 0 ? ' ' : ''}${cosC.toFixed(6)}],  // H/${div}  amp=${amp.toFixed(3)}d${label}`;
      console.log(line);
      jsLines.push(line);
    }
    console.log('  ],');
    jsLines.push('  ],');
  }
  console.log('};');
  jsLines.push('};');

  // Summary table
  console.log('\n── Summary ──');
  console.log('Type | Current RMSE | New RMSE | Divisors');
  for (const type of types) {
    const { current, greedy } = results[type];
    console.log(`  ${type} | ${current.rmse.toFixed(2)} min     | ${greedy.rmse.toFixed(2)} min  | [${greedy.divisors.join(',')}]`);
  }

  // ─── Derive J2000 anchors ────────────────────────────────────────────────
  // The fitting used the data anchor at anchorYear (≈2003). The runtime uses a
  // J2000 reference year. Due to the export's seed at 2000.5, the year label
  // for the J2000 event differs per type: year 2001 for SS/WS/AE, year 2000 for VE.
  // We find the correct J2000 year from the data (closest JD to IAU anchor).
  console.log(`\n── J2000 anchors (derived from data anchors) ──`);
  const adjustedAnchors = {};
  for (const type of types) {
    const dataAnchor = results[type].anchor;
    const anchorYear = results[type].greedy.anchorYear;
    const harmonics = results[type].greedy.harmonics;

    // Find which year label corresponds to J2000 for this type (search full data)
    const iauAnchor = C.ASTRO_REFERENCE.cardinalPointAnchors[type];
    let j2000Year = 2000;
    let bestDiff = Infinity;
    for (const d of allByType[type]) {
      if (d.year >= 1999 && d.year <= 2002) {
        const diff = Math.abs(d.jd - iauAnchor);
        if (diff < bestDiff) { bestDiff = diff; j2000Year = d.year; }
      }
    }

    // Same integrated phase + drift convention as the fit above. Both years sit
    // within 1999-2002 so the drift difference is ~0 here, but leaving this on
    // the snapshot form would be a third convention in one file.
    let hAnchor = 0, h2000 = 0;
    for (const [div, sinC, cosC] of harmonics) {
      const pA = phaseOf(anchorYear, div);
      const p0 = phaseOf(j2000Year, div);
      hAnchor += sinC * Math.sin(pA) + cosC * Math.cos(pA);
      h2000   += sinC * Math.sin(p0) + cosC * Math.cos(p0);
    }

    const j2000Anchor = dataAnchor - C.meanSolarYearDays * (anchorYear - j2000Year)
                      - (driftTerm(anchorYear) - driftTerm(j2000Year)) - (hAnchor - h2000);
    adjustedAnchors[type] = j2000Anchor;

    // Verify: runtime at anchorYear should give dataAnchor
    const verify = j2000Anchor + C.meanSolarYearDays * (anchorYear - j2000Year)
                 + (driftTerm(anchorYear) - driftTerm(j2000Year)) + hAnchor - h2000;
    const verifyErr = (verify - dataAnchor) * 24 * 60;

    const iauDiff = (j2000Anchor - iauAnchor) * 24 * 60;
    console.log(`  ${type}: J2000=${j2000Anchor.toFixed(6)} (IAU=${iauAnchor.toFixed(3)}, diff=${iauDiff.toFixed(2)} min, j2000yr=${j2000Year}, verify err=${verifyErr.toFixed(4)} min)`);
  }

  // ─── Write to fitted-coefficients.json if --write flag is present ────
  if (process.argv.includes('--write')) {
    const jsonPath = path.join(ROOT, 'public', 'input', 'fitted-coefficients.json');
    const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    // WRITE THE SHIPPED DIVISOR SET (`current`), not the greedy search result.
    // The greedy pass is a DIAGNOSTIC — the divisor set is a structural claim,
    // not something to churn for a rounding-level gain. This wrote
    // `results[type].greedy.harmonics`, the same trap Steps 6b and 6c
    // (year-length) both had.
    const harmonicsObj = {};
    const eccObj = {};
    for (const type of types) {
      harmonicsObj[type] = results[type].current.harmonics;
      eccObj[type] = results[type].current.eccTerms;
    }
    fc.CARDINAL_POINT_HARMONICS = harmonicsObj;
    // §10e-quater — equation-of-centre terms. DELIBERATELY a separate key with a
    // different shape ({order, sin, cos}, not [div, sin, cos]): these are
    // e(t)^n·sin(nM) with e(t) the LAW OF COSINES, not sinusoids. A consumer
    // that mistook them for H/16 and H/32 harmonics would be wrong by the whole
    // braid (~1.78 d), so the shape difference is the guard.
    fc.CARDINAL_POINT_ECC_TERMS = eccObj;
    // §10 — constants the RUNTIME must reuse verbatim, never recompute.
    //   lincoef : derived from TOTAL ELAPSED TIME over the fit window
    //             (§10e-quinquies). Recomputing it from the 1-year anchor
    //             injects a −12,276 s ramp.
    //   h0/h1   : H(c) linear model. H moves 27.5 yr across the window and
    //             multiplies the integrated harmonic amplitude; holding it
    //             constant costs up to 5.2 s (§10c).
    // Both are calibrated against THIS CSV window. If Step 6a's window changes,
    // they change — which is exactly why they are written, not hardcoded.
    fc.CARDINAL_POINT_DERIVED = {
      lincoef: LINCOEF,
      h0: _Hc0,
      h1: _Hc1,
      eccOrderDivisors: ECC_ORDER_DIVISORS,
      note: 'Runtime must use these verbatim — see plan §10c / §10e-quinquies',
    };
    fc.CARDINAL_POINT_ANCHORS_ADJUSTED = adjustedAnchors;
    // §10g — quadrature-locked joint sidebands. SHARED across the four points
    // (not per-type!): phase = order·λ_X − 2π·div·c, COUNTER-rotating, with
    // the structural quadrature angles recorded alongside. A consumer that
    // evaluated these per-point or with the co-rotating sign would be wrong by
    // the whole stage (~1 min class).
    fc.CARDINAL_POINT_JOINT_TERMS = {
      quadratureDeg: { SS: 0, AE: 90, WS: 180, VE: 270 },
      terms: jointTerms,
      note: 'phase = order*lambda_X - 2*pi*div*cycles, self-corrected at 2000; counter-rotating — see plan §10g',
    };
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log('\n  ✓ Written CARDINAL_POINT_HARMONICS (shipped divisor set)');
    console.log('  ✓ Written CARDINAL_POINT_ECC_TERMS (equation-of-centre orders)');
    console.log('  ✓ Written CARDINAL_POINT_DERIVED (lincoef + H(c) model)');
    console.log('  ✓ Written CARDINAL_POINT_ANCHORS_ADJUSTED');
    console.log('  ✓ Written CARDINAL_POINT_JOINT_TERMS (§10g shared sidebands)');
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
