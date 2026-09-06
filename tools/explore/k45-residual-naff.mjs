#!/usr/bin/env node
// P5/K4.5 — the giants' medium-period terms, DERIVED from our own engine
// (the DST-1/DLT-1 pattern: extracted, attributed, nothing observation-fitted,
// nothing imported from Meeus/VSOP).
//
// Method: WH (1PN) over ±5 kyr around J2000 — 11 Great-Inequality cycles,
// 2.4 Uranus–Neptune long-inequality cycles — sampled at 2-yr cadence; per
// planet, the residual δλ(t) = engine heliocentric ecliptic longitude minus
// the artifact-driven Kepler skeleton's; NAFF the residual (Hann projection,
// Gram–Schmidt, golden refinement); ATTRIBUTE each extracted frequency to a
// small-integer combination of the engine's own window mean motions (the
// governed artifact's windowElementRates). The banked terms are then a
// runtime series δλ_p(t) = Σ A·cos(ω t + φ) — harmonic, engine-attributed.
//
// RESULT (measured, iterative — the extraction converged on the classical
// perturbation structure, derived from OUR engine):
//   ITER 1 (raw λ residual, ±5 kyr): poisoned by the era-rate mismatch ramp
//     (10.6-kyr window pseudo-lines at 148–373% attribution error) — the
//     1800–2100-typed rates seen outside their window. LESSON: detrend; the
//     drift is an era-typing diagnostic, not a term.
//   ITER 2 (slope detrend, λ only, giants): real lines emerge — Jupiter GI
//     935.7 yr (−2J+5S), J−2S 60.9 yr (0.25%), U−2N 4276 yr (0.02%),
//     U−N synodic cluster — but Saturn shows a 29.5-yr once-per-orbit
//     sideband FOREST (δe(t)·sinM in longitude form) and Jupiter's 11.9-yr
//     equivalent sat below the scan floor. LESSON: go element-space.
//   ITER 3 (element space δλ̄/δe/δϖ, quadratic detrend, scan 8 yr–span):
//     attribution snaps across the board (−2J+5S · −1J+2S · −2J+3S ·
//     −1J+1U 0.01% · −1J+1N 0.01% · −1S+1N · −1U+2N · −1S+3U …); mean-lon
//     channels capture 77–86% var with 10 terms. REMAINING LESSON:
//     Neptune's δϖ blows up (74k″) — the 1/e singularity of near-circular
//     orbits; the channels must be the nonsingular z-vector (h, k) =
//     e·(sin ϖ, cos ϖ) with complex NAFF (the campaign's standard
//     variables). That refinement + the runtime term layer + the
//     acceptance rerun are the next session (K4.5b).
//   ITER 4 (K4.5b/c — z+ζ channels, runtime layer, window affine, spans
//     ±5 kyr and ±10 kyr): acceptance per planet vs JPL, best-of:
//     JUPITER ACCEPTED — 40″ in-window (0.24× shipped), 54″ at 1600–1800
//     (0.06×). Saturn best at the ±5-kyr set (269″, 1.28× in-window,
//     0.30× out-of-window); the ±10-kyr set REGRESSED Saturn/Neptune —
//     the longer span's global detrend re-admits span-scale pseudo-lines
//     (7.1/10.1-kyr at 65–137% attribution) and rebalances amplitudes
//     away from the typed window. FINAL METHOD LESSON (K4.5d): NAFF owns
//     the FREQUENCIES (attributed, span-long); the AMPLITUDES/PHASES are
//     then solved by least squares on that fixed frequency set over the
//     era-centered sub-window — engine-only data, optimizing exactly what
//     the era-typing promises. U/N additionally carry the shipped chains'
//     extraordinary in-window tuning (57″/12.5″) as the bar; their
//     out-of-window ratios already narrow to 1.7×/24×.
//
//   node tools/explore/k45-residual-naff.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, GM_SUN, NAMES, gmOf } from './j2000-state.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');

const YR = 365.25 * 86400, D2R = Math.PI / 180;
const SPAN_YR = 10000, CAD_YR = 2;   // K4.5c: ±10 kyr resolves the 4.3-kyr U−N multiplet
const gms = Object.fromEntries(NAMES.map((k) => [k, gmOf(k)]));
const chains = KC.buildPlanetChainsFromArtifact({ skeletonOnly: true });   // extraction measures AGAINST the skeleton, never its own terms

function seedBary() {
  const gmsArr = [GM_SUN, ...NAMES.map((k) => gms[k])];
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((p) => ({ r: HZ[p].slice(0, 3), v: HZ[p].slice(3, 6) }))];
  const M = gmsArr.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gmsArr[i] * b.r[c], 0) / M);
  const vB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gmsArr[i] * b.v[c], 0) / M);
  const N = NAMES.length, Y0 = new Float64Array(6 * (N + 1));
  for (let i = 0; i <= N; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * (N + 1) + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gmsArr, Y0 };
}

// ── integrate both directions, collect residual δλ per planet ─────────────
const { gmsArr, Y0 } = seedBary();
const recs = [];
for (const dir of [-1, +1]) {
  const sim = makeWH({ gms: gmsArr, Y0: Float64Array.from(Y0), dt: dir * 2 * 86400, gr: true, order: 2 });
  const stepsPer = Math.round(CAD_YR * YR / (2 * 86400));
  for (let s = 0; s <= SPAN_YR / CAD_YR; s++) {
    if (s > 0) sim.step(stepsPer);
    const year = KC.ANCHOR_EPOCH_YEAR + sim.t / YR;     // the integrator's own clock
    const rec = { year, dlon: {}, dh: {}, dk: {}, dp: {}, dq: {}, dmlon: {} };
    NAMES.forEach((p, i) => {
      const { r, v } = sim.helio(i + 1);
      const lonEng = Math.atan2(r[1], r[0]) / D2R;
      const elEng = KC.computeOsculatingElements(r, v, GM_SUN + gms[p]);
      const el = KC.computePlanetElementsAtYear(year, chains[p]);
      const pos = KC.computeHeliocentricEclipticFromElements(el);
      const lonSkel = Math.atan2(pos.yAU, pos.xAU) / D2R;
      const wdiff = (a2, b2) => { let d2 = a2 - b2; while (d2 > 180) d2 -= 360; while (d2 < -180) d2 += 360; return d2; };
      rec.dlon[p] = wdiff(lonEng, lonSkel) * 3600;                                   // true-position λ, ″
      // NONSINGULAR z-vector residuals: z ≡ k + i·h = e·e^{iϖ} (the campaign's
      // standard variables — no 1/e blowup for near-circular Neptune)
      rec.dh[p] = elEng.e * Math.sin(elEng.lonPeriEclipticDeg * D2R) - el.e * Math.sin(el.lonPeriEclipticDeg * D2R);
      rec.dk[p] = elEng.e * Math.cos(elEng.lonPeriEclipticDeg * D2R) - el.e * Math.cos(el.lonPeriEclipticDeg * D2R);
      rec.dmlon[p] = wdiff(elEng.meanLonEclipticDeg, el.meanLonEclipticDeg) * 3600;  // mean-longitude residual, ″
      // out-of-plane ζ-vector residuals: ζ ≡ q + i·p = sin(i/2)·e^{iΩ}
      const si2E = Math.sin(elEng.inclEclipticDeg / 2 * D2R), si2S = Math.sin(el.inclEclipticDeg / 2 * D2R);
      rec.dp[p] = si2E * Math.sin(elEng.ascNodeEclipticDeg * D2R) - si2S * Math.sin(el.ascNodeEclipticDeg * D2R);
      rec.dq[p] = si2E * Math.cos(elEng.ascNodeEclipticDeg * D2R) - si2S * Math.cos(el.ascNodeEclipticDeg * D2R);
    });
    recs.push(rec);
  }
}
recs.sort((a, b) => a.year - b.year);
const t = recs.map((r) => r.year - KC.ANCHOR_EPOCH_YEAR);

// ── NAFF on the (real) residual: extract cos/sin pairs ────────────────────
function naffReal(series, nTerms) {
  const N = series.length;
  const win = new Float64Array(N); let wsum = 0;
  for (let i = 0; i < N; i++) { win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); wsum += win[i]; }
  const resid = Float64Array.from(series);
  const proj = (om) => {   // windowed complex projection of a REAL series
    let re = 0, im = 0;
    for (let i = 0; i < N; i++) { re += win[i] * resid[i] * Math.cos(om * t[i]); im += win[i] * resid[i] * Math.sin(om * t[i]); }
    return [2 * re / wsum, 2 * im / wsum];   // ×2: real series splits power ±ω
  };
  const power = (om) => { const [a, b] = proj(om); return a * a + b * b; };
  const terms = [];
  for (let k = 0; k < nTerms; k++) {
    // coarse scan: periods 8 yr … the span (periods beyond the window are
    // unresolvable and manufacture ~2–4×span pseudo-lines — measured)
    let best = 0, bestP = -1;
    for (let om = 2 * Math.PI / SPAN_YR; om <= 2 * Math.PI / 8; om *= 1.01) {
      const p = power(om); if (p > bestP) { bestP = p; best = om; }
    }
    let lo = best / 1.012, hi = best * 1.012;
    const GR = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - GR * (hi - lo), x2 = lo + GR * (hi - lo), p1 = power(x1), p2 = power(x2);
    for (let it = 0; it < 70; it++) {
      if (p1 > p2) { hi = x2; x2 = x1; p2 = p1; x1 = hi - GR * (hi - lo); p1 = power(x1); }
      else { lo = x1; x1 = x2; p1 = p2; x2 = lo + GR * (hi - lo); p2 = power(x2); }
    }
    const om = (lo + hi) / 2;
    const [a, b] = proj(om);                 // δλ ≈ a·cos(ωt) + b·sin(ωt)
    for (let i = 0; i < N; i++) resid[i] -= a * Math.cos(om * t[i]) + b * Math.sin(om * t[i]);
    terms.push({ omegaRadPerYr: om, cosAmpArcsec: a, sinAmpArcsec: b, ampArcsec: Math.hypot(a, b) });
  }
  return { terms, resid };
}

// ── attribute ω to integer combos of the engine's own mean motions ────────
const nDeg = Object.fromEntries(NAMES.map((p) => [p, chains[p].meanMotionDegPerYr]));
function attribute(omRadPerYr) {
  const fCpy = omRadPerYr / (2 * Math.PI);            // cycles/yr
  const nCpy = NAMES.map((p) => nDeg[p] / 360);
  let best = null;
  const K = 5;
  // search sparse combos over the giant pairs first, then all pairs/triples
  const idx = [0, 1, 2, 3, 4, 5, 6, 7];
  for (const i of idx) for (const j of idx) {
    if (j <= i) continue;
    for (let ki = -K; ki <= K; ki++) for (let kj = -K; kj <= K; kj++) {
      if (!ki && !kj) continue;
      const f = Math.abs(ki * nCpy[i] + kj * nCpy[j]);
      const rel = Math.abs(f - fCpy) / fCpy;
      if (best === null || rel < best.rel) best = { rel, label: `${ki}·${NAMES[i][0].toUpperCase()}${NAMES[i][1]} ${kj >= 0 ? '+' : '−'}${Math.abs(kj)}·${NAMES[j][0].toUpperCase()}${NAMES[j][1]}` };
    }
  }
  return best;
}

// ── report per GIANT (the K4.5 targets; the 2-yr cadence aliases the inner
// planets' orbital-frequency content, and they need no terms anyway).
// DETREND mean + slope first: the slope is the era-rate mismatch of the
// 1800–2100-typed rates seen over ±5 kyr — an era-typing diagnostic, NOT a
// periodic term (recording it as one was measured to poison the NAFF with
// window-length pseudo-lines at ~2×span).
const GIANTS = ['jupiter', 'saturn', 'uranus', 'neptune'];

// quadratic detrend: the era-typed rates drift quadratically outside their
// window (slope-only detrending left ~2–4×span pseudo-lines — measured)
function detrend2(series) {
  const n = series.length;
  let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = t[i], x2 = x * x, y = series[i];
    s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2; b0 += y; b1 += x * y; b2 += x2 * y;
  }
  // solve 3x3 normal equations (Cramer)
  const det = (m) => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const M = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]], D = det(M);
  const rep = (col) => { const m = M.map((r2) => r2.slice()); m[0][col] = b0; m[1][col] = b1; m[2][col] = b2; return det(m) / D; };
  const c = [rep(0), rep(1), rep(2)];
  return { out: series.map((y, i) => y - c[0] - c[1] * t[i] - c[2] * t[i] * t[i]), slope: c[1] };
}

function report(label, series, unitScale, unitName, nTerms) {
  const { out, slope } = detrend2(series);
  const rms0 = Math.sqrt(out.reduce((s, x) => s + x * x, 0) / out.length);
  const { terms, resid } = naffReal(out, nTerms);
  const rms1 = Math.sqrt(resid.reduce((s, x) => s + x * x, 0) / resid.length);
  console.log(`  ${label.padEnd(6)} drift ${(slope * unitScale).toFixed(2)} ${unitName}/yr · periodic RMS ${(rms0 * unitScale).toFixed(1)} → ${(rms1 * unitScale).toFixed(1)} ${unitName} (${(100 * (1 - rms1 * rms1 / (rms0 * rms0))).toFixed(1)}% var, ${nTerms} terms)`);
  terms.slice(0, 5).forEach((tm, i2) => {
    const P = 2 * Math.PI / tm.omegaRadPerYr;
    const att = attribute(tm.omegaRadPerYr);
    console.log(`     #${i2 + 1}  P ${P.toFixed(1).padStart(7)} yr  amp ${(tm.ampArcsec * unitScale).toFixed(1).padStart(8)} ${unitName}   ${att ? att.label + ` (${(att.rel * 100).toFixed(2)}%)` : ''}`);
  });
  return { terms, rms0, rms1 };
}

// complex NAFF on δz = δk + i·δh (prograde AND retrograde lines, ω of either sign)
function naffComplex(kr, hi2, nTerms) {
  const N = kr.length;
  const win = new Float64Array(N); let wsum = 0;
  for (let i = 0; i < N; i++) { win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); wsum += win[i]; }
  const zr = Float64Array.from(kr), zi = Float64Array.from(hi2);
  const proj = (om) => {
    let re = 0, im = 0;
    for (let i = 0; i < N; i++) { const c = Math.cos(om * t[i]), s = Math.sin(om * t[i]); re += win[i] * (zr[i] * c + zi[i] * s); im += win[i] * (zi[i] * c - zr[i] * s); }
    return [re / wsum, im / wsum];
  };
  const power = (om) => { const [a, b] = proj(om); return a * a + b * b; };
  const terms = [];
  for (let kk = 0; kk < nTerms; kk++) {
    let best = 0, bestP = -1;
    for (const sgn of [1, -1]) for (let om = 2 * Math.PI / SPAN_YR; om <= 2 * Math.PI / 8; om *= 1.01) {
      const p = power(sgn * om); if (p > bestP) { bestP = p; best = sgn * om; }
    }
    let lo = best - Math.abs(best) * 0.012, hi = best + Math.abs(best) * 0.012;
    const GR = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - GR * (hi - lo), x2 = lo + GR * (hi - lo), p1 = power(x1), p2 = power(x2);
    for (let it = 0; it < 70; it++) {
      if (p1 > p2) { hi = x2; x2 = x1; p2 = p1; x1 = hi - GR * (hi - lo); p1 = power(x1); }
      else { lo = x1; x1 = x2; p1 = p2; x2 = lo + GR * (hi - lo); p2 = power(x2); }
    }
    const om = (lo + hi) / 2, [re, im] = proj(om);
    for (let i = 0; i < N; i++) { const c = Math.cos(om * t[i]), s = Math.sin(om * t[i]); zr[i] -= re * c - im * s; zi[i] -= re * s + im * c; }
    terms.push({ omegaRadPerYr: om, re, im, amp: Math.hypot(re, im) });
  }
  const rms = Math.sqrt(zr.reduce((s2, x, i) => s2 + x * x + zi[i] * zi[i], 0) / N);
  return { terms, rms };
}

console.log(`Z-VECTOR residual NAFF over ±${SPAN_YR} yr, ${recs.length} samples:`);
const EXPORT = {};
for (const p of GIANTS) {
  console.log(`\n${p.toUpperCase()}:`);
  // δλ̄ — real channel, quadratic detrend, 12 terms
  const dm = recs.map((r) => r.dmlon[p]);
  const { out: dmD } = detrend2(dm);
  const rms0 = Math.sqrt(dmD.reduce((s, x) => s + x * x, 0) / dmD.length);
  const { terms: mlonTerms, resid } = naffReal(dmD, 20);
  const rms1 = Math.sqrt(resid.reduce((s, x) => s + x * x, 0) / resid.length);
  console.log(`  δλ̄  RMS ${rms0.toFixed(1)}″ → ${rms1.toFixed(1)}″ (${(100 * (1 - rms1 * rms1 / (rms0 * rms0))).toFixed(1)}% var, 12 terms)`);
  mlonTerms.slice(0, 4).forEach((tm, i2) => {
    const att = attribute(Math.abs(tm.omegaRadPerYr));
    console.log(`     #${i2 + 1}  P ${(2 * Math.PI / tm.omegaRadPerYr).toFixed(1).padStart(7)} yr  amp ${tm.ampArcsec.toFixed(1).padStart(7)}″  ${att ? att.label + ` (${(att.rel * 100).toFixed(2)}%)` : ''}`);
  });
  // δz — complex channel, quadratic detrend per component, 10 terms
  const dk = detrend2(recs.map((r) => r.dk[p])).out;
  const dh = detrend2(recs.map((r) => r.dh[p])).out;
  const rz0 = Math.sqrt(dk.reduce((s, x, i) => s + x * x + dh[i] * dh[i], 0) / dk.length);
  const { terms: zTerms, rms: rz1 } = naffComplex(dk, dh, 20);
  console.log(`  δz  RMS ${(rz0 * 1e6).toFixed(0)}µ → ${(rz1 * 1e6).toFixed(0)}µ (${(100 * (1 - rz1 * rz1 / (rz0 * rz0))).toFixed(1)}% var, 10 terms)`);
  zTerms.slice(0, 4).forEach((tm, i2) => {
    const att = attribute(Math.abs(tm.omegaRadPerYr));
    console.log(`     #${i2 + 1}  P ${(2 * Math.PI / tm.omegaRadPerYr).toFixed(1).padStart(8)} yr  amp ${(tm.amp * 1e6).toFixed(0).padStart(6)}µ  ${att ? att.label + ` (${(att.rel * 100).toFixed(2)}%)` : ''}`);
  });
  // δζ — out-of-plane complex channel (K4.5c)
  const dq2 = detrend2(recs.map((r) => r.dq[p])).out;
  const dp2 = detrend2(recs.map((r) => r.dp[p])).out;
  const rzeta0 = Math.sqrt(dq2.reduce((s, x, i) => s + x * x + dp2[i] * dp2[i], 0) / dq2.length);
  const { terms: zetaTerms, rms: rzeta1 } = naffComplex(dq2, dp2, 14);
  console.log(`  δζ  RMS ${(rzeta0 * 1e6).toFixed(0)}µ → ${(rzeta1 * 1e6).toFixed(0)}µ (${(100 * (1 - rzeta1 * rzeta1 / (rzeta0 * rzeta0))).toFixed(1)}% var, 10 terms)`);
  EXPORT[p] = {
    mlonArcsec: mlonTerms.map((tm) => ({ omegaRadPerYr: tm.omegaRadPerYr, cos: tm.cosAmpArcsec, sin: tm.sinAmpArcsec })),
    z: zTerms.map((tm) => ({ omegaRadPerYr: tm.omegaRadPerYr, re: tm.re, im: tm.im })),
    zeta: zetaTerms.map((tm) => ({ omegaRadPerYr: tm.omegaRadPerYr, re: tm.re, im: tm.im })),
  };
}

// ── the era-typed IN-WINDOW affine (engine-derived): after the periodic
// terms, fit mean+slope of the remaining residual over 1800–2100 only — the
// anchor-snapshot-vs-window offset that the ±5-kyr detrend cannot see.
console.log('\nin-window affine (1800–2100, after periodic terms):');
for (const p of GIANTS) {
  const T = EXPORT[p];
  const evalTerms = (i) => {
    let dm = 0; for (const tm of T.mlonArcsec) dm += tm.cos * Math.cos(tm.omegaRadPerYr * t[i]) + tm.sin * Math.sin(tm.omegaRadPerYr * t[i]);
    let dk2 = 0, dh2 = 0;
    for (const tm of T.z) { const c = Math.cos(tm.omegaRadPerYr * t[i]), s = Math.sin(tm.omegaRadPerYr * t[i]); dk2 += tm.re * c - tm.im * s; dh2 += tm.re * s + tm.im * c; }
    return { dm, dk2, dh2 };
  };
  const fitWin = (get) => {
    let n = 0, s1 = 0, s2 = 0, sy = 0, sty = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] < -200 || t[i] > 100) continue;
      const y = get(i); n++; s1 += t[i]; s2 += t[i] * t[i]; sy += y; sty += t[i] * y;
    }
    const slope = (n * sty - s1 * sy) / (n * s2 - s1 * s1);
    return { mean: (sy - slope * s1) / n + slope * ((-200 + 100) / 2) * 0, off: (sy - slope * s1) / n, slope };
  };
  const aM = fitWin((i) => recs[i].dmlon[p] - evalTerms(i).dm);
  const aK = fitWin((i) => recs[i].dk[p] - evalTerms(i).dk2);
  const aH = fitWin((i) => recs[i].dh[p] - evalTerms(i).dh2);
  const evalZeta = (i) => { let q3 = 0, p3 = 0; for (const tm of EXPORT[p].zeta) { const c = Math.cos(tm.omegaRadPerYr * t[i]), s = Math.sin(tm.omegaRadPerYr * t[i]); q3 += tm.re * c - tm.im * s; p3 += tm.re * s + tm.im * c; } return { q3, p3 }; };
  const aQ = fitWin((i) => recs[i].dq[p] - evalZeta(i).q3);
  const aP = fitWin((i) => recs[i].dp[p] - evalZeta(i).p3);
  EXPORT[p].windowAffine = { mlon: { off: aM.off, slope: aM.slope }, k: { off: aK.off, slope: aK.slope }, h: { off: aH.off, slope: aH.slope }, q: { off: aQ.off, slope: aQ.slope }, p: { off: aP.off, slope: aP.slope } };
  console.log(`  ${p.padEnd(8)} δλ̄ ${aM.off.toFixed(1)}″ ${aM.slope >= 0 ? '+' : ''}${aM.slope.toFixed(3)}″/yr · δk ${(aK.off * 1e6).toFixed(0)}µ · δh ${(aH.off * 1e6).toFixed(0)}µ`);
}

const outPath = ROOT + 'tools/explore/k45-terms.local.json';
(await import('node:fs')).writeFileSync(outPath, JSON.stringify({ spanYr: SPAN_YR, cadenceYr: CAD_YR, giants: EXPORT }, null, 1));
console.log(`\nterms → ${outPath}`);
