#!/usr/bin/env node
// P5/K4.5e — the era-centered AMPLITUDE SOLVE: element-complete periodic
// layer (λ̄, a, z, ζ) measured from the model's own N-body trajectory by
// iterative residual-spectrum prewhitening — locate a peak on a log grid,
// GOLDEN-REFINE its frequency against the Hann-windowed DFT amplitude
// (a 13-yr line spans ~385 cycles over ±2.5 kyr: a 0.6% grid frequency is
// 2+ cycles dephased and its column decorrelates — the same reason NAFF
// refines), solve all amplitudes + the era affine jointly by least squares.
// ENGINE DATA ONLY (the DLT-1 precedent); k45d's analytic first-order
// derivation is the independent structural check. Nothing touches
// observations.
//
// K4.7b findings that shaped this form (all measured):
//   · the residual plateau was the SHORT-PERIOD SYNODIC layer (Saturn λ̄ 523″
//     @ 20 yr, Uranus 408″ @ 14 yr) — the NAFF term budget went to the big
//     low-frequency lines; the prewhitening augmentation recovers it;
//   · heliocentric osculating elements slosh together at those periods
//     (largely the Sun's giant-planet reflex): δa/a 3000–3800 ppm for U/N —
//     the aPpm channel joins λ̄/z/ζ, else the element set is inconsistent
//     and the reconstructed position inherits the slosh;
//   · Poisson-argument columns are RETIRED as measured-negative: multiplet
//     members sharing a λ-combo are LSQ-degenerate over the era window
//     (amplitudes hit 1e8″ in cancelling pairs — the ill-conditioned-
//     regressor trap) and a single member underfits the engine's split
//     resonant lines; no configuration beat fixed extracted lines in any
//     verdict. The runtime machinery (computePoissonArgRad) stands as the
//     record; no terms are exported.
//   · Mars joins (its Jupiter-forced lines resolve at the 0.5-yr cadence);
//     Mercury/Venus stay out — their synodic lines are sub-Nyquist and both
//     already sit at the k46 integration floor.
//
// RESULT (measured; extraction seeds + 2 refined augmentation passes):
//   mars    δλ̄ 161.7→17.3″ (3f)  · δa 36ppm (flat) · δz 63µ  · δζ 9µ
//   jupiter δλ̄ 9043→11.2″ (20f)  · δa 347→37ppm    · δz 23µ  · δζ 2µ
//   saturn  δλ̄ 22272→25.9″ (30f) · δa 3782→80ppm   · δz 348µ · δζ 4µ
//   uranus  δλ̄ 3370→11.3″ (30f)  · δa 3114→55ppm   · δz 39µ  · δζ 1µ
//   neptune δλ̄ 3899→9.9″ (18f)   · δa 3599→51ppm   · δz 36µ  · δζ 2µ
//   · the seeds are load-bearing: self-seeded, Jupiter λ̄ stalls at 57″ —
//     the GI multiplet is 0.47 Rayleigh apart in the era window;
//   · golden refinement is load-bearing: on the coarse grid Neptune's δa
//     stuck at 3504 ppm and its λ̄ at 643″ (a 13-yr line = 385 cycles);
//   · Saturn's δz 348µ (the split z multiplet) is the remaining open item.
//   Verdict (k4-observational-verdict): 1600–1800 the chain beats the
//   shipped path for all seven planets; 1800–2100 all but Neptune.
//   K4.6b RESULT (measured): — filled after the inner-planet run —
//
//   node tools/explore/k45e-amplitude-solve.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, GM_SUN, NAMES, gmOf } from './j2000-state.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const fs = require('node:fs');

const YR = 365.25 * 86400, D2R = Math.PI / 180;
// K4.6b — the inner-planet refinement: Mercury/Venus join. Their key gain
// is the era-typed window AFFINE (the truncated 5-mode secular skeleton's
// local ϖ̇ read 533.6″/cy vs the engine's 572.0 window rate — the constant
// remainder pins the value but carries no rate; the affine k/h slopes
// restore it). Cadence 0.1 yr resolves their synodic element wobbles
// (0.24–1.6 yr) instead of aliasing them; the solve integrates at dt 0.5 d
// because Mercury's dt = 2 d trajectory carries ~100″-class integration
// error over the window (k46 measured 107″ → 37″) that terms must not bake
// in. Seeds: extraction covers the giants; Mercury/Venus self-seed through
// the golden-refined augmentation (the Mars precedent).
const SPAN_YR = 2500, CAD_YR = 0.1;
const SOLVE_DT_DAYS = 0.5;
const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const gms = Object.fromEntries(NAMES.map((k) => [k, gmOf(k)]));
const chains = KC.buildPlanetChainsFromArtifact({ skeletonOnly: true });   // the raw skeleton — a terms-bearing chain here would solve against its own output
// NAFF-extraction seed lines (k45-residual-naff runs first in the pipeline):
// the resonant multiplets (GI 907/982 yr) are 0.47 Rayleigh apart in the era
// window — only the ±10-kyr extraction separates them; the era scan cannot.
const PRIOR = (() => { try { return JSON.parse(fs.readFileSync(ROOT + 'tools/explore/k45-terms.local.json', 'utf8')).giants || {}; } catch { return {}; } })();

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

// ── sample the residual channels over ±SPAN_YR ────────────────────────────
const { gmsArr, Y0 } = seedBary();
const recs = [];
for (const dir of [-1, +1]) {
  const sim = makeWH({ gms: gmsArr, Y0: Float64Array.from(Y0), dt: dir * SOLVE_DT_DAYS * 86400, gr: true, order: 2 });
  const stepsPer = Math.round(CAD_YR * YR / (SOLVE_DT_DAYS * 86400));
  for (let s = 0; s <= Math.round(SPAN_YR / CAD_YR); s++) {
    if (s > 0) sim.step(stepsPer);
    const year = KC.ANCHOR_EPOCH_YEAR + sim.t / YR;   // the integrator's OWN clock (time-label trap)
    const rec = { year, dmlon: {}, dh: {}, dk: {}, dp: {}, dq: {}, daPpm: {} };
    PLANETS.forEach((p) => {
      const i = NAMES.indexOf(p) + 1;
      const { r, v } = sim.helio(i);
      const elEng = KC.computeOsculatingElements(r, v, GM_SUN + gms[p]);
      const el = KC.computePlanetElementsAtYear(year, chains[p]);
      const wdiff = (a2, b2) => { let d2 = a2 - b2; while (d2 > 180) d2 -= 360; while (d2 < -180) d2 += 360; return d2; };
      rec.dmlon[p] = wdiff(elEng.meanLonEclipticDeg, el.meanLonEclipticDeg) * 3600;
      rec.dh[p] = elEng.e * Math.sin(elEng.lonPeriEclipticDeg * D2R) - el.e * Math.sin(el.lonPeriEclipticDeg * D2R);
      rec.dk[p] = elEng.e * Math.cos(elEng.lonPeriEclipticDeg * D2R) - el.e * Math.cos(el.lonPeriEclipticDeg * D2R);
      const s2E = Math.sin(elEng.inclEclipticDeg / 2 * D2R), s2S = Math.sin(el.inclEclipticDeg / 2 * D2R);
      rec.dp[p] = s2E * Math.sin(elEng.ascNodeEclipticDeg * D2R) - s2S * Math.sin(el.ascNodeEclipticDeg * D2R);
      rec.dq[p] = s2E * Math.cos(elEng.ascNodeEclipticDeg * D2R) - s2S * Math.cos(el.ascNodeEclipticDeg * D2R);
      rec.daPpm[p] = (elEng.aAU - el.aAU) / el.aAU * 1e6;
    });
    recs.push(rec);
  }
}
recs.sort((a, b) => a.year - b.year);
const t = recs.map((r) => r.year - KC.ANCHOR_EPOCH_YEAR);

// dense LSQ via normal equations
function solveLSQ(rows, y) {
  const m = rows[0].length;
  const A = Array.from({ length: m }, () => new Float64Array(m)), b = new Float64Array(m);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let i = 0; i < m; i++) { b[i] += row[i] * y[r]; for (let j = i; j < m; j++) A[i][j] += row[i] * row[j]; }
  }
  for (let i = 0; i < m; i++) for (let j = 0; j < i; j++) A[i][j] = A[j][i];
  // gaussian elimination with pivoting
  const M2 = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < m; c++) {
    let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[piv][c])) piv = r;
    [M2[c], M2[piv]] = [M2[piv], M2[c]];
    for (let r = c + 1; r < m; r++) { const f = M2[r][c] / M2[c][c]; for (let j = c; j <= m; j++) M2[r][j] -= f * M2[c][j]; }
  }
  const x = new Float64Array(m);
  for (let i = m - 1; i >= 0; i--) { let s = M2[i][m]; for (let j = i + 1; j < m; j++) s -= M2[i][j] * x[j]; x[i] = s / M2[i][i]; }
  return x;
}

const TOL_W = 2 * Math.PI / (8 * SPAN_YR);
const dedupe = (freqs) => {
  const out = [];
  for (const w of freqs.sort((a, b) => Math.abs(a) - Math.abs(b))) {
    if (!out.some((v) => Math.abs(v - w) < TOL_W)) out.push(w);
  }
  return out;
};

// ── residual-spectrum peak finder (Hann DFT, log grid + golden refinement) ──
const hann = t.map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (t.length - 1)));
const hSum = hann.reduce((s, x) => s + x, 0);
function dftAmp(resid, w) {
  let re = 0, im = 0;
  for (let i = 0; i < resid.length; i++) { re += resid[i] * hann[i] * Math.cos(w * t[i]); im += resid[i] * hann[i] * Math.sin(w * t[i]); }
  return 2 * Math.hypot(re, im) / hSum;
}
function scanPeaks(resid, floor, maxAdd, pminYr) {
  // Periods capped at 2× the half-span (beyond manufactures lines). The
  // LOWER bound is PER-PLANET (K4.6b lesson, measured): the sub-year scan
  // (0.25 yr) exists FOR the inner planets' synodic lines; opened to the
  // giants it admitted noise-class short lines that overfit in-sample and
  // DOUBLED their JPL-facing verdict (Uranus δz 39→102µ, Neptune 36→129µ)
  // — the giants keep their proven 3-yr band.
  const Pmin = pminYr, Pmax = 2 * SPAN_YR, NP = 2000;
  const grid = [];
  for (let k = 0; k <= NP; k++) grid.push(2 * Math.PI / (Pmin * Math.pow(Pmax / Pmin, k / NP)));
  const amps = grid.map((w) => dftAmp(resid, w));
  const found = [];
  for (let k = 1; k < NP; k++) {
    if (amps[k] > amps[k - 1] && amps[k] > amps[k + 1] && amps[k] > floor) {
      // golden-section refine within the bracketing grid interval
      let a2 = Math.min(grid[k - 1], grid[k + 1]), b2 = Math.max(grid[k - 1], grid[k + 1]);
      const G = (Math.sqrt(5) - 1) / 2;
      let c2 = b2 - G * (b2 - a2), d2 = a2 + G * (b2 - a2);
      let fc = dftAmp(resid, c2), fd = dftAmp(resid, d2);
      for (let it = 0; it < 40; it++) {
        if (fc > fd) { b2 = d2; d2 = c2; fd = fc; c2 = b2 - G * (b2 - a2); fc = dftAmp(resid, c2); }
        else { a2 = c2; c2 = d2; fc = fd; d2 = a2 + G * (b2 - a2); fd = dftAmp(resid, d2); }
      }
      const w = (a2 + b2) / 2;
      found.push([w, dftAmp(resid, w)]);
    }
  }
  found.sort((x2, y2) => y2[1] - x2[1]);
  const out = [];
  for (const [w] of found) {
    if (!out.some((w2) => Math.abs(Math.log(w / w2)) < 0.05)) out.push(w);
    if (out.length >= maxAdd) break;
  }
  return out;
}

const EXPORT = {};
console.log(`era-centered amplitude solve (±${SPAN_YR} yr, cad ${CAD_YR} yr; extraction seeds + golden-refined augmentation):`);
for (const p of PLANETS) {
  const PR = PRIOR[p] || {};
  const seed = (list) => dedupe((list || []).map((x2) => x2.omegaRadPerYr));
  // ── scalar channels (λ̄ arcsec, a ppm): era affine + lines
  const fitScalar = (y, ws0, floor, maxAdd, pminYr) => {
    let ws = ws0.slice(), x, resid;
    for (let pass = 0; pass < 3; pass++) {
      const rows = t.map((ty) => {
        const row = [1, ty];
        for (const w of ws) row.push(Math.cos(w * ty), Math.sin(w * ty));
        return row;
      });
      x = solveLSQ(rows, y);
      resid = y.map((v, i) => v - rows[i].reduce((s, c, j) => s + c * x[j], 0));
      if (pass < 2) ws = dedupe(ws.concat(scanPeaks(resid, floor, maxAdd, pminYr)));
    }
    const rms = (a2) => Math.sqrt(a2.reduce((s, v) => s + v * v, 0) / a2.length);
    return { ws, x, rms0: rms(y), rms1: rms(resid) };
  };
  // ── complex channels (z = k+ih, ζ = q+ip): joint two-row form; a scalar
  //    scan cannot sign the circulation sense, so ±ω both enter and LSQ splits
  const fitComplex = (yk, yh, ws0, floor, maxAdd, pminYr) => {
    let ws = ws0.slice(), x, residK, residH;
    for (let pass = 0; pass < 3; pass++) {
      const rows = [], y = [];
      for (let i = 0; i < t.length; i++) {
        const ty = t[i];
        const rk = [1, 0, ty, 0], rh = [0, 1, 0, ty];
        for (const w of ws) { const c = Math.cos(w * ty), s = Math.sin(w * ty); rk.push(c, -s); rh.push(s, c); }
        rows.push(rk); y.push(yk[i]);
        rows.push(rh); y.push(yh[i]);
      }
      x = solveLSQ(rows, y);
      const resid = y.map((v, i) => v - rows[i].reduce((s, c, j) => s + c * x[j], 0));
      residK = resid.filter((_, i) => i % 2 === 0); residH = resid.filter((_, i) => i % 2 === 1);
      if (pass < 2) {
        const found = scanPeaks(residK, floor, maxAdd, pminYr).concat(scanPeaks(residH, floor, maxAdd, pminYr));
        ws = dedupe(ws.concat(found.flatMap((w) => [w, -w])));
      }
    }
    const rms1 = Math.sqrt((residK.reduce((s, v) => s + v * v, 0) + residH.reduce((s, v) => s + v * v, 0)) / (2 * t.length));
    const rms = (a2) => Math.sqrt(a2.reduce((s, v) => s + v * v, 0) / a2.length);
    return { ws, x, rms0: rms(yk.concat(yh)), rms1 };
  };

  // Per-planet scan band: the sub-year window belongs to the inner planets
  // (their synodic element lines live at 0.24–2.3 yr); the giants keep the
  // proven 3-yr band (the K4.6b overfit lesson in the scanPeaks header).
  const PMIN_YR = (p === 'mercury' || p === 'venus' || p === 'mars') ? 0.25 : 3;
  const M = fitScalar(recs.map((r) => r.dmlon[p]), seed(PR.mlonArcsec), 3, 14, PMIN_YR);
  const A = fitScalar(recs.map((r) => r.daPpm[p]), seed(PR.aPpm), 20, 12, PMIN_YR);
  const Z = fitComplex(recs.map((r) => r.dk[p]), recs.map((r) => r.dh[p]), seed(PR.z), 12e-6, 12, PMIN_YR);
  const E = fitComplex(recs.map((r) => r.dq[p]), recs.map((r) => r.dp[p]), seed(PR.zeta), 4e-6, 6, PMIN_YR);

  console.log(`  ${p.padEnd(8)} δλ̄ ${M.rms0.toFixed(1)} → ${M.rms1.toFixed(1)}″ (${M.ws.length}f)` +
    ` · δa ${A.rms0.toFixed(0)} → ${A.rms1.toFixed(0)}ppm (${A.ws.length}f)` +
    ` · δz ${(Z.rms1 * 1e6).toFixed(0)}µ (${Z.ws.length}f) · δζ ${(E.rms1 * 1e6).toFixed(0)}µ (${E.ws.length}f)`);
  EXPORT[p] = {
    mlonArcsec: M.ws.map((w, k) => ({ omegaRadPerYr: w, cos: M.x[2 + 2 * k], sin: M.x[3 + 2 * k] })),
    aPpm: A.ws.map((w, k) => ({ omegaRadPerYr: w, cos: A.x[2 + 2 * k], sin: A.x[3 + 2 * k] })),
    z: Z.ws.map((w, k) => ({ omegaRadPerYr: w, re: Z.x[4 + 2 * k], im: Z.x[5 + 2 * k] })),
    zeta: E.ws.map((w, k) => ({ omegaRadPerYr: w, re: E.x[4 + 2 * k], im: E.x[5 + 2 * k] })),
    windowAffine: {
      mlon: { off: M.x[0], slope: M.x[1] },
      a: { off: A.x[0], slope: A.x[1] },
      k: { off: Z.x[0], slope: Z.x[2] }, h: { off: Z.x[1], slope: Z.x[3] },
      q: { off: E.x[0], slope: E.x[2] }, p: { off: E.x[1], slope: E.x[3] },
    },
  };
}
fs.writeFileSync(ROOT + 'tools/explore/k45-terms.local.json', JSON.stringify({ spanYr: SPAN_YR, cadenceYr: CAD_YR, method: 'k45e era-centered LSQ (self-seeded prewhitening, golden-refined frequencies; K4.7b)', giants: EXPORT }, null, 1));
console.log('terms → tools/explore/k45-terms.local.json (k45e solve)');
