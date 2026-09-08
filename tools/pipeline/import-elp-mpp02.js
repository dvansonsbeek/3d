#!/usr/bin/env node
/**
 * import-elp-mpp02.js — K8 slice 2: truncate the ELP/MPP02 lunar theory
 * for the STANDARD-MODEL reference overlay's Moon ghost.
 *
 * Source: the in-repo series data/lunar-series/elp-mpp02/ (Chapront &
 * Francou 2003; ytliu0/ElpMpp02 driver lineage — see the port header)
 * loaded through the ONE implementation home tools/lib/elp-mpp02.js
 * (corr = 1, the DE-fit parameter set — the repo's banked MPP02
 * convention). This tool:
 *
 *   1. TRUNCATES each of the 13 series by an amplitude threshold whose
 *      scale is chosen by MEASUREMENT, not budget arithmetic: the
 *      truncated context is evaluated by the PORT'S OWN evalMpp02
 *      against the full theory over ±4,000 yr and the threshold is
 *      backed off until max |Δlon|,|Δlat| ≤ 0.25″ and |Δdist| ≤ 0.5 km.
 *      The measured residuals are recorded in meta.
 *   2. BAKES the theory's argument polynomials (W1/W2/W3/Ea/pomp with
 *      the Δ-set and derived Cw2_1/Cw3_1 already summed, the ζ rate,
 *      the eight planetary arguments) plus the frame-reduction
 *      polynomials (p_A — the ELP82B-lab convention; ε(t); IAU 1976
 *      ζ_A/z_A/θ_A from tools/lib/precession.js; the ra0 factor) into
 *      meta, so the @essrt/reference evaluator is a generic Poisson
 *      machine over recorded NUMBERS — no theory code is duplicated.
 *
 * Output (the SINGLE home; the evaluator requires it directly):
 *   data/elp-mpp02-truncated.json
 *
 * K2/K8 BOUNDARY: reference data — comparison surfaces only.
 *
 * Usage: node tools/pipeline/import-elp-mpp02.js --write
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildInputsBlock } = require('../lib/artifact-inputs.js');
const MPP = require('../lib/elp-mpp02.js');

const ROOT = path.resolve(__dirname, '..', '..');
const CORR = 1;                     // DE-fit — the repo's banked MPP02 convention
// ±1,000 yr: the JPL-comparison era, and MPP02's meaningful precision span.
// Beyond it the ghost is a stated extrapolation of the standard theory —
// there the model-vs-standard phase drift dwarfs arcsecond truncation, so
// weighting the cut at ±4 kyr would keep ~17k T¹–T³ perturbation rows
// (measured) for no visible gain.
const T_MAX_CY = 10;
const TARGET_LONLAT_ARCSEC = 0.25;  // measured truncation targets over ±T_MAX_CY
const TARGET_DIST_KM = 0.5;
const SAMPLES = 481;

if (!process.argv.includes('--write')) {
  console.error('Usage: node tools/pipeline/import-elp-mpp02.js --write');
  process.exit(1);
}

const full = MPP.loadMpp02(CORR);

/** Filter one series by |amp| ≥ thr·scale_k (pert order k reweights by T_max^k). */
function filterSeries(s, thr) {
  const mult = [], amp = [], ph = s.ph ? [] : undefined;
  for (let i = 0; i < s.n; i++) {
    if (Math.abs(s.amp[i]) < thr) continue;
    mult.push(s.mult[i]);
    // 9 significant digits (size trim, recorded here) — ~1e-9 relative,
    // far below the measured truncation residual.
    amp.push(Number(s.amp[i].toPrecision(9)));
    if (ph) ph.push(Number(s.ph[i].toPrecision(9)));
  }
  return ph ? { n: amp.length, mult, amp, ph } : { n: amp.length, mult, amp };
}

/** Build a truncated context — SEPARATE thresholds per quantity's unit:
 *  lon/lat series are in radians, dist series in km (measured: the single
 *  mixed threshold kept every centimetre-class distance row). */
function truncatedCtx(scaleAng, scaleDist) {
  const c = { corr: CORR, paras: full.paras, main: {}, pert: {} };
  for (const q of ['long', 'lat', 'dist']) {
    const s0 = q === 'dist' ? scaleDist : scaleAng;
    c.main[q] = filterSeries(full.main[q], s0);
    c.pert[q] = full.pert[q].map((s, k) => filterSeries(s, s0 / Math.pow(T_MAX_CY, k)));
  }
  return c;
}

const count = (c) => ['long', 'lat', 'dist'].reduce((t, q) =>
  t + c.main[q].n + c.pert[q].reduce((a, b) => a + b.n, 0), 0);

/** Max |Δ| of truncated vs full over ±T_MAX_CY (lon/lat arcsec, dist km). */
function measure(c) {
  let dLon = 0, dLat = 0, dDist = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const T = -T_MAX_CY + (2 * T_MAX_CY * i) / (SAMPLES - 1);
    const f = MPP.evalMpp02(T, full);
    const t = MPP.evalMpp02(T, c);
    const dl = Math.abs(MPP.mod2pi(t.lon - f.lon)) * 648000 / Math.PI;
    const db = Math.abs(t.lat - f.lat) * 648000 / Math.PI;
    const dd = Math.abs(t.dist - f.dist);
    if (dl > dLon) dLon = dl;
    if (db > dLat) dLat = db;
    if (dd > dDist) dDist = dd;
  }
  return { dLon, dLat, dDist };
}

// Back off each threshold from coarse to fine until its measured target
// holds: first the distance ladder (dist error is independent of the
// angular cut), then the angular ladder with the chosen distance cut.
const LADDER = [3e-4, 1e-4, 3e-5, 1e-5, 3e-6, 1e-6, 3e-7, 1e-7, 3e-8, 1e-8];
let distScale = null;
for (const s of [1, 0.3, 0.1, 0.03, 0.01, 3e-3, 1e-3, 3e-4, 1e-4]) {
  const m = measure(truncatedCtx(LADDER[0], s));
  console.log(`  dist thr=${s} km  maxΔ dist=${m.dDist.toFixed(4)} km`);
  if (m.dDist <= TARGET_DIST_KM) { distScale = s; break; }
}
if (distScale === null) { console.error('no distance threshold met the target'); process.exit(1); }
let chosen = null;
for (const scale of LADDER) {
  const c = truncatedCtx(scale, distScale);
  const m = measure(c);
  console.log(`  ang thr=${scale} rad  terms=${count(c)}  maxΔ lon=${m.dLon.toFixed(3)}″ lat=${m.dLat.toFixed(3)}″ dist=${m.dDist.toFixed(3)} km`);
  if (m.dLon <= TARGET_LONLAT_ARCSEC && m.dLat <= TARGET_LONLAT_ARCSEC && m.dDist <= TARGET_DIST_KM) {
    chosen = { scale, distScale, ctx: c, measured: m };
    break;
  }
}
if (!chosen) { console.error('no threshold met the targets'); process.exit(1); }
console.log(`  chosen ang=${chosen.scale} rad, dist=${chosen.distScale} km: ${count(chosen.ctx)} of ${full.termCount} terms`);

// ── Bake the argument + reduction polynomials (numbers only) ────────────────
const p = full.paras;
const DEG = Math.PI / 180;
const dms = (d, m, s) => (d + m / 60 + s / 3600) * DEG;
// Each arg: { c0: rad, c: [c1..c4] arcsec } evaluated with the port's exact
// per-term mod2pi shape: c0 + Σ mod2pi(c_n · T^n · SEC).
const argPolys = {
  W1: { c0: dms(-142, 18, 59.95571 + p.Dw1_0), c: [1732559343.73604 + p.Dw1_1, -6.8084 + p.Dw1_2, 0.006604 + p.Dw1_3, -3.169e-5 + p.Dw1_4] },
  W2: { c0: dms(83, 21, 11.67475 + p.Dw2_0), c: [14643420.3171 + p.Dw2_1 + p.Cw2_1, -38.2631 + p.Dw2_2, -0.045047 + p.Dw2_3, 0.00021301] },
  W3: { c0: dms(125, 2, 40.39816 + p.Dw3_0), c: [-6967919.5383 + p.Dw3_1 + p.Cw3_1, 6.359 + p.Dw3_2, 0.007625 + p.Dw3_3, -3.586e-5] },
  Ea: { c0: dms(100, 27, 59.13885 + p.Deart_0), c: [129597742.293 + p.Deart_1, -0.0202, 9e-6, 1.5e-7] },
  pomp: { c0: dms(102, 56, 14.45766 + p.Dperi), c: [1161.24342, 0.529265, -1.1814e-4, 1.1379e-5] },
  zetaRateRadPerCy: 0.02438029560881907,
  planets: {
    Me: { c0: dms(-108, 15, 3.216919), c1: 538101628.66888 },
    Ve: { c0: dms(-179, 58, 44.758419), c1: 210664136.45777 },
    EM: { c0: dms(100, 27, 59.13885), c1: 129597742.293 },
    Ma: { c0: dms(-5, 26, 3.642778), c1: 68905077.65936 },
    Ju: { c0: dms(34, 21, 5.379392), c1: 10925660.57335 },
    Sa: { c0: dms(50, 4, 38.902495), c1: 4399609.33632 },
    Ur: { c0: dms(-46, 3, 4.354234), c1: 1542482.57845 },
    Ne: { c0: dms(-56, 20, 56.808371), c1: 786547.897 },
  },
};
const reduction = {
  // accumulated general precession p_A, arcsec/cy^n (the ELP82B-lab convention)
  pAArcsec: [0, 5029.0966, 1.1120, 0.000077],
  // mean obliquity of date, degrees/cy^n (the lab's Meeus polynomial)
  epsDeg: [23.439291111, -0.0130041667, -1.6667e-7, 5.0278e-7],
  // IAU 1976 equatorial precession angles, arcsec (tools/lib/precession.js)
  zetaAArcsec: [2306.2181, 0.30188, 0.017998],
  zAArcsec: [2306.2181, 1.09468, 0.018203],
  thetaAArcsec: [2004.3109, -0.42665, -0.041833],
  ra0: 384747.961370173 / 384747.980674318,
};

const artifact = {
  _description: 'Truncated ELP/MPP02 lunar series (corr=1, DE-fit) for the K8 standard-model reference overlay Moon ghost — with the theory argument polynomials and frame-reduction polynomials baked as numbers so the @essrt/reference evaluator duplicates no theory code. Truncation is MEASURED against the full port (targets and residuals in meta). Reference data, comparison surfaces only.',
  meta: {
    theory: 'ELP/MPP02 (Chapront & Francou 2003), corr=1 (DE405/DE406-fit) — geocentric lon/lat/dist in the inertial mean ecliptic of date',
    source: 'in-repo series data/lunar-series/elp-mpp02/ via tools/lib/elp-mpp02.js (the one implementation home)',
    truncation: {
      thresholdAngRad: chosen.scale,
      thresholdDistKm: chosen.distScale,
      tMaxJulianCenturies: T_MAX_CY,
      keptTerms: count(chosen.ctx),
      totalTerms: full.termCount,
      measuredMax: { lonArcsec: chosen.measured.dLon, latArcsec: chosen.measured.dLat, distKm: chosen.measured.dDist },
      targets: { lonLatArcsec: TARGET_LONLAT_ARCSEC, distKm: TARGET_DIST_KM },
    },
    argPolys,
    reduction,
    role: 'K8 standard-model reference overlay ONLY — one-way boundary, nothing in the model chain may consume this data',
  },
  main: chosen.ctx.main,
  pert: chosen.ctx.pert,
  inputs: buildInputsBlock('node tools/pipeline/import-elp-mpp02.js --write', [
    'tools/pipeline/import-elp-mpp02.js',
    'tools/lib/elp-mpp02.js',
    'data/lunar-series/elp-mpp02/elp_main.long',
    'data/lunar-series/elp-mpp02/elp_main.lat',
    'data/lunar-series/elp-mpp02/elp_main.dist',
    'data/lunar-series/elp-mpp02/elp_pert.longT0',
    'data/lunar-series/elp-mpp02/elp_pert.longT1',
    'data/lunar-series/elp-mpp02/elp_pert.longT2',
    'data/lunar-series/elp-mpp02/elp_pert.longT3',
    'data/lunar-series/elp-mpp02/elp_pert.latT0',
    'data/lunar-series/elp-mpp02/elp_pert.latT1',
    'data/lunar-series/elp-mpp02/elp_pert.latT2',
    'data/lunar-series/elp-mpp02/elp_pert.distT0',
    'data/lunar-series/elp-mpp02/elp_pert.distT1',
    'data/lunar-series/elp-mpp02/elp_pert.distT2',
    'data/lunar-series/elp-mpp02/elp_pert.distT3',
  ]),
};

const outPath = path.join(ROOT, 'data', 'elp-mpp02-truncated.json');
fs.writeFileSync(outPath, JSON.stringify(artifact) + '\n');
console.log(`✓ wrote data/elp-mpp02-truncated.json (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB) — the single home; @essrt/reference evaluates it directly`);
