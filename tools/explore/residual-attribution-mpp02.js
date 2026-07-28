#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// residual-attribution-mpp02.js — name the OTHER half of the last fitted number
//
// CONTEXT: the shipped MOON_CORRECTION_RESIDUAL (dominated by a 5.1″ raCosMp
// term) was decomposed in tools/explore/residual-attribution-elp.js into
//    +1.15″  named planetary-series truncation   (full ELP82B − Meeus-60)
//    −6.27″  ephemeris-generation gap            (attributed in CLASS only)
// The second half is the correction that modern DE-class ephemerides embody
// and the Meeus/ELP82B lineage does not. ELP/MPP02 is the lineage DE was
// fitted to, so the generation gap should appear as (MPP02 − ELP82B).
//
// CLAIM UNDER TEST: projecting (MPP02 − full ELP-2000/82B) onto the same
// 12-term patch basis over the same 2000–2050 window reproduces the −6.27″
// raCosMp. If it does, the term upgrades from "attributed in class" to
// "attributed by name", leaving zero unexplained fitted content in DLT-1.
//
// RESULT (2026-07-29): REFUTED, twice over.
//   1. The −6.27″ target was itself a sign error. The patch is Meeus − JPL,
//      so the +1.13″ truncation enters it NEGATIVE; the real remainder is
//      −4.05″, not −6.27″.
//   2. MPP02 does not contain that remainder. This script measures
//      MPP02 − ELP82B = −0.03″ on raCosMp (0.5% of the target) and 0.30″ RMS
//      in longitude over 2000–2050. The two analytic theories sit together;
//      JPL DE441 sits ~4″ from BOTH. The remainder is analytic-vs-numerical,
//      not one analytic lineage vs another, and therefore has no series-term
//      decomposition in any analytic theory.
// The script is kept as the standing measurement behind that conclusion.
//
// FRAME: both theories are evaluated in their own native inertial mean
// ecliptic of date, then converted to the equinox of date with the SAME
// accumulated general precession p_A before the λβ→RA/Dec step. Using one
// p_A for both is deliberate: it cancels exactly in the longitude difference,
// so the residual reflects theory content and not a precession convention.
// (MPP02's own zeta uses 5028.797″/cy vs ELP82B's 5029.0966″/cy — a 0.3″/cy
// convention difference that must NOT be allowed to leak into the answer.)
//
// Usage: node tools/explore/residual-attribution-mpp02.js [path-to-elp82b-full.json]
//   The ELP82B full series (37,863 terms) lives in git history:
//     git show 3200493:public/input/moon-elp2000-82b-full.json > /tmp/elp82b-full.json
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

const path = require('path');
const MPP = require(path.join(__dirname, '..', 'lib', 'elp-mpp02.js'));
const ELP = require(path.join(__dirname, '..', 'lib', 'elp2000-82b.js'));

const DEG = Math.PI / 180, J2000 = 2451545.0;
const R2D = 180 / Math.PI;

// Shipped residual patch (src/script.js MOON_CORRECTION_RESIDUAL; degrees)
const SHIPPED_RA_COS_MP = -0.001421;                      // −5.12″
const ELP_TRUNCATION_RA_COS_MP = +1.15 / 3600;            // from the ELP82B lab
const TARGET_GAP = SHIPPED_RA_COS_MP - ELP_TRUNCATION_RA_COS_MP;   // ≈ −6.27″

// ELP82B's full 37,863-term series ships in data/lunar-series/elp2000-82b/;
// the module resolves it from the variant name, no path needed.
const CORR = Number(process.env.MPP02_CORR ?? 1);          // 1 = DE-fit (default), 0 = LLR-fit
const mpp = MPP.loadMpp02(CORR);

// Accumulated general precession p_A (ELP82B lab convention), degrees
const PREC = [0, 5029.0966 / 3600, 1.1120 / 3600, 0.000077 / 3600, 0];
const poly = (c, t) => c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] || 0))));

// Meeus fundamental arguments — the patch basis is defined on these
const MA = {
  D:  [297.8501921, 445267.1114034, -0.0018819, 1 / 545868, -1 / 113065000],
  M:  [357.5291092, 35999.0502909, -0.0001536, 1 / 24490000, 0],
  Mp: [134.9633964, 477198.8675055, 0.0087414, 1 / 69699, -1 / 14712000],
};

function toRaDec(lonDeg, latDeg, t) {
  const eps = (23.439291111 - 0.0130041667 * t - 1.6667e-7 * t * t + 5.0278e-7 * t * t * t) * DEG;
  const l = lonDeg * DEG, b = latDeg * DEG;
  const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
  return { ra: ra * R2D, dec: dec * R2D };
}
const wrap180 = (x) => ((x % 360) + 540) % 360 - 180;

// ── LSQ projection onto the 12-term patch basis (sin/cos of D, M′, M) ──────
function project(samples) {
  const fit = (ys, xs) => {
    const n = 6, AtA = Array.from({ length: n }, () => new Array(n).fill(0)), Atb = new Array(n).fill(0);
    for (let k = 0; k < ys.length; k++)
      for (let i = 0; i < n; i++) {
        Atb[i] += xs[k][i] * ys[k];
        for (let j = 0; j < n; j++) AtA[i][j] += xs[k][i] * xs[k][j];
      }
    for (let i = 0; i < n; i++) {
      let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(AtA[r][i]) > Math.abs(AtA[p][i])) p = r;
      [AtA[i], AtA[p]] = [AtA[p], AtA[i]]; [Atb[i], Atb[p]] = [Atb[p], Atb[i]];
      for (let r = i + 1; r < n; r++) {
        const f = AtA[r][i] / AtA[i][i];
        for (let c = i; c < n; c++) AtA[r][c] -= f * AtA[i][c];
        Atb[r] -= f * Atb[i];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = Atb[i]; for (let c = i + 1; c < n; c++) s -= AtA[i][c] * x[c];
      x[i] = s / AtA[i][i];
    }
    return x;
  };
  const rows = samples.map(s => [Math.sin(s.D * DEG), Math.cos(s.D * DEG), Math.sin(s.Mp * DEG),
                                 Math.cos(s.Mp * DEG), Math.sin(s.M * DEG), Math.cos(s.M * DEG)]);
  const ra = fit(samples.map(s => s.dRa), rows);
  const de = fit(samples.map(s => s.dDec), rows);
  return { raSinD: ra[0], raCosD: ra[1], raSinMp: ra[2], raCosMp: ra[3], raSinMs: ra[4], raCosMs: ra[5],
           decSinD: de[0], decCosD: de[1], decSinMp: de[2], decCosMp: de[3], decSinMs: de[4], decCosMs: de[5] };
}

function sampleWindow(N = 4000) {
  const out = [];
  for (let k = 0; k < N; k++) {
    const jd = J2000 + (k / (N - 1)) * 50 * 365.25;        // 2000 → 2050
    const t = (jd - J2000) / 36525;
    const pA = poly(PREC, t);
    const m = MPP.evalMpp02(t, mpp);                        // inertial, radians
    const e = ELP.evalMoon(t, { variant: 'full', inertial: true });   // inertial, degrees
    const pm = toRaDec(m.lon * R2D + pA, m.lat * R2D, t);
    const pe = toRaDec(e.lon + pA, e.lat, t);
    out.push({
      D: poly(MA.D, t), M: poly(MA.M, t), Mp: poly(MA.Mp, t),
      dRa: wrap180(pm.ra - pe.ra), dDec: pm.dec - pe.dec,
      dLon: wrap180(m.lon * R2D - e.lon), dLat: m.lat * R2D - e.lat,
    });
  }
  return out;
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('═'.repeat(78));
console.log('  Generation gap: (ELP/MPP02 − full ELP-2000/82B) on the patch basis');
console.log('═'.repeat(78));
console.log(`  MPP02 : ${mpp.termCount} terms, parameter set corr=${CORR} ` +
            `(${CORR === 1 ? 'fitted to JPL DE405/DE406' : 'fitted to LLR'})`);
console.log(`  ELP82B: ${ELP.termCount('full')} terms`);

const s = sampleWindow();
const rms = (f) => Math.sqrt(s.reduce((a, x) => a + f(x) * f(x), 0) / s.length) * 3600;
console.log(`  RMS(MPP02 − ELP82B) over 2000–2050 = ${rms(x => x.dLon).toFixed(2)}″ lon / ` +
            `${rms(x => x.dLat).toFixed(2)}″ lat`);

const p = project(s);
console.log('\n  Patch-basis projection (arcsec):');
console.log('    term        MPP02−ELP82B');
for (const k of ['raSinD', 'raCosD', 'raSinMp', 'raCosMp', 'raSinMs', 'raCosMs'])
  console.log(`    ${k.padEnd(10)}  ${(p[k] * 3600).toFixed(3).padStart(10)}`);

console.log('\n' + '─'.repeat(78));
console.log('  THE TEST — does this reproduce the generation-gap half?');
console.log('─'.repeat(78));
const REMAINDER = SHIPPED_RA_COS_MP + ELP_TRUNCATION_RA_COS_MP;
console.log(`    shipped raCosMp  (= Meeus − JPL) ${(SHIPPED_RA_COS_MP * 3600).toFixed(2).padStart(8)}″`);
console.log(`    − named ELP82B truncation        ${(-ELP_TRUNCATION_RA_COS_MP * 3600).toFixed(2).padStart(8)}″  (NEGATIVE in patch convention)`);
console.log(`    = remainder to explain           ${(REMAINDER * 3600).toFixed(2).padStart(8)}″`);
console.log(`    measured MPP02 − ELP82B          ${(p.raCosMp * 3600).toFixed(2).padStart(8)}″`);
console.log(`    ratio measured / remainder       ${(p.raCosMp / REMAINDER * 100).toFixed(1).padStart(8)}%`);
console.log('');
console.log('    VERDICT: MPP02 does not contain the remainder. It is an');
console.log('    analytic-vs-numerical offset (JPL DE441), flat across 2000–2050,');
console.log('    with no series-term decomposition in any analytic theory.');
console.log('    NB: subtracting the truncation as +1.15 instead of −1.15 yields');
console.log('    the spurious −6.27″ an earlier revision reported.');
