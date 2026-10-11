#!/usr/bin/env node
// STAGE C LAB — the obliquity/spin HYBRID (engine-switch record, plan 02 §8;
// K8b-3/D5 opening result; the verdict generator tools/verify/
// obliquity-hybrid.js runs this lab under --json).
//
// The MATHEMATICS lives ONCE in @essrt/physics/earth/deep-orbital-history
// (the C-3 one-home factory): ds/dt = α (ŝ·n̂)(ŝ×n̂) with n̂(t) from an
// anchored ζ mode-sum and ONE engine-K anchor α = (H/13 rate)/cos ε₀ —
// zero fitted constants. This lab instantiates BOTH ζ tiers (the era tier
// = its OWN 8-term extraction earthZetaEra — never a slice of the deep
// table; the Gram–Schmidt reshaping lesson) and compares against La2004
// (THEORY reference) and the shipped 16-harmonic fitted law.
//
// MEASURED (the discovery record; the banked verdict reproduces it):
//   dε/dt(J2000) = −46.96 ″/cy vs IAU −46.84 (0.25%) — the scene A-solve's
//     TARGET, derived (an era-tier quantity: the deep table's local slope
//     reads −38.5, the remainder-shift class);
//   era tier 0–13 kyr: 51″ rms corr 0.999 (fitted law: 711″); deep tier:
//     flat ~0.1° corr ≥ 0.985 across the full megayear;
//   the H/8 identity natively: dominant beat |ψ̇| − |s₃| = 41.2 kyr.
// CONVENTION CATCH: the J2000 celestial pole sits at ecliptic longitude
//   +90°; the −90° choice gives corr −0.998 — the instant tell.
import { readFileSync } from 'node:fs';
import * as phys from '@essrt/physics';

const model = phys.createModel();
const R2D = 180 / Math.PI;

const MT = JSON.parse(readFileSync(new URL('../../data/nbody-deep-secular-modes.json', import.meta.url), 'utf8'));
const AE = /** @type {any} */ (phys.CHAIN_ARTIFACT).j2000AnchorElements.earth;
const axialYears = model.epoch.axialPrecessionYearsAtYear(2000);
const eps0Deg = model.constants.earthOrbital.obliquityJ2000_deg;

const mkTier = (zetaModes) => phys.createDeepOrbitalHistory({
  zModes: MT.modes.earth.z,
  zetaModes,
  anchorE: AE.e,
  anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg,
  anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axialYears,
  obliquityJ2000Deg: eps0Deg,
});
const tierFull = mkTier(MT.modes.earth.zeta);
const tierEra = mkTier(MT.earthZetaEra ?? MT.modes.earth.zeta.slice(0, 8));

console.log(`alpha = ${tierFull.alphaArcsecPerYr.toFixed(3)}"/yr  (H/13-anchored; literature precession constant ~54.9)`);

const la = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8')
  .trim().split('\n').map((l) => l.trim().split(/\s+/).map((x) => Number(x.replace('D', 'E'))));
const laEps = new Map(la.map((r) => [Math.round(-r[0]), r[2] * R2D]));
const epsK = (y) => model.earth.obliquityDeg(y);
const corr = (a, b) => { const m = (x) => x.reduce((p, c) => p + c) / x.length; const ma = m(a), mb = m(b); let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return ab / Math.sqrt(aa * bb); };

function runVariant(tier) {
  const S = tier.build(200, -1_000_000, 1000);
  // ±100-yr central difference on a FINE grid (at(±100) must be exact grid
  // nodes — a 1000-yr grid lerps in millennium-scale curvature; the verdict
  // generator's refuse-gate caught exactly that during the C-3 refactor).
  const R = tier.build(-150, 150, 50);
  const rate = ((R.at(100).epsDeg - R.at(-100).epsDeg) / 200) * 3600 * 100;   // ″/cy
  const windows = {};
  for (const kyrMax of [13, 50, 130, 270, 600, 1000]) {
    let sh = 0, sk = 0, n = 0; const vh = [], vk = [], vl = [];
    for (let k = 0; k <= kyrMax; k++) {
      const l = laEps.get(k);
      if (l === undefined) continue;
      const h = S.at(-k * 1000).epsDeg;
      const kk = epsK(2000 - k * 1000);
      sh += (h - l) ** 2; sk += (kk - l) ** 2; n++;
      vh.push(h); vk.push(kk); vl.push(l);
    }
    windows[kyrMax] = {
      hybridRmsArcsec: Math.sqrt(sh / n) * 3600, hybridCorr: corr(vh, vl),
      fittedLawRmsArcsec: Math.sqrt(sk / n) * 3600, fittedLawCorr: corr(vk, vl),
    };
  }
  return { rateArcsecPerCy: rate, windows };
}

const full = runVariant(tierFull);
const era = runVariant(tierEra);

// dominant obliquity beat: the equinox and the node BOTH regress, so the
// relative rate is the DIFFERENCE |psi-dot| − |s₃|. v22.0: the pole precesses
// at the spin axis's INERTIAL rate (the self-anchored rate the hybrid
// integrates on, 50.385 ″/yr at J2000 in the shipped series-driven model), not
// the general precession — the beat is read from the shipped model's one home.
const psiDotRadPerYr = (2 * Math.PI) / axialYears;   // the general-precession period (reported, psiDotH13ArcsecPerYr)
const SERIES = JSON.parse(readFileSync(new URL('../../data/nbody-secular-series.json', import.meta.url), 'utf8'));
const modelSeries = phys.createModel(undefined, { secularSeriesArtifact: SERIES });   // THE SHIPPED CONFIGURATION
const beatKyr = modelSeries.lunisolar.obliquityBeatYearsAtYear(2000) / 1000;

// v23.0 — THE REALIZED OBLIQUITY PERIOD. A record spanning a window sees the
// pole's MEAN rate over it, not the J2000 instant: the model's own ε(t) over
// the LR04 window (the stack's span, read from the dataset) fitted with the
// full obliquity line set p + sᵢ (the six largest ζ modes) and ONE free p,
// against the one-home prediction createModel().lunisolar
// .obliquityPeriodRealizedYears (the window mean of the inertial rate of date
// × solar torque at e(t) × J₂(t)/J₂₀ × cos ε(t)/cos ε₀, minus |s₃|). La2004's
// series on the same fit is the THEORY reference label. Measured 2026-10:
// 40,938 (fit) vs 40,936 (predicted) vs 40,917 (La2004) over 0–5.32 Ma,
// against the J2000 beat's 41,098 and the general-rate beat's 41,224.
const LR04_LAST_KYR = readFileSync(new URL('../../data/lr04-stack.txt', import.meta.url), 'utf8').trim().split('\n')
  .map((l) => Number(l.trim().split(/\s+/)[0])).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
const REALIZED_WINDOW = [2000 - LR04_LAST_KYR * 1000, 2000];
const sModes = MT.modes.earth.zeta.filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
  .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im)).slice(0, 6)
  .map((m) => m.omegaRadPerYr * R2D * 3600);
const A2R = Math.PI / 180 / 3600;
/** Solve A x = b for a symmetric positive-definite normal matrix (Gaussian elimination, partial pivoting). */
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}
/** Residual rms of eps(t) fitted with a quadratic trend + the lines (p + s_i), p given. */
function rmsAtP(t, eps, p) {
  const n = t.length, ncol = 3 + 2 * sModes.length;
  const cols = new Array(ncol);
  const tm = t.map((x) => x / 1e6);
  cols[0] = t.map(() => 1); cols[1] = tm; cols[2] = tm.map((x) => x * x);
  sModes.forEach((s, k) => { const w = (p + s) * A2R; cols[3 + 2 * k] = t.map((x) => Math.cos(w * x)); cols[4 + 2 * k] = t.map((x) => Math.sin(w * x)); });
  const N = Array.from({ length: ncol }, () => new Array(ncol).fill(0)), bv = new Array(ncol).fill(0);
  for (let i = 0; i < ncol; i++) {
    for (let j = i; j < ncol; j++) { let s = 0; for (let r = 0; r < n; r++) s += cols[i][r] * cols[j][r]; N[i][j] = s; N[j][i] = s; }
    let s = 0; for (let r = 0; r < n; r++) s += cols[i][r] * eps[r]; bv[i] = s;
  }
  const x = solve(N, bv);
  let ss = 0;
  for (let r = 0; r < n; r++) { let m = 0; for (let i = 0; i < ncol; i++) m += x[i] * cols[i][r]; ss += (eps[r] - m) ** 2; }
  return Math.sqrt(ss / n);
}
function fitObliquityP(years, epsDeg) {
  const t0 = years.reduce((a, b) => a + b) / years.length;
  const t = years.map((y) => y - t0), eps = epsDeg.map((e) => e * 3600);
  let best = { p: NaN, rms: Infinity };
  for (let p = 50.2; p <= 50.8001; p += 0.005) { const r = rmsAtP(t, eps, p); if (r < best.rms) best = { p, rms: r }; }
  for (let p = best.p - 0.005; p <= best.p + 0.0050001; p += 0.0005) { const r = rmsAtP(t, eps, p); if (r < best.rms) best = { p, rms: r }; }
  return { pArcsecPerYr: best.p, periodYr: 1296000 / (best.p + sModes[0]), rmsArcsec: best.rms };
}
const sampleYears = []; for (let y = REALIZED_WINDOW[0]; y <= REALIZED_WINDOW[1]; y += 200) sampleYears.push(y);
const modelFit = fitObliquityP(sampleYears, sampleYears.map((y) => modelSeries.earth.obliquityDeg(y)));
const laYears = [], laE = [];
for (let k = 0; k <= LR04_LAST_KYR; k++) { const e = laEps.get(k); if (e !== undefined) { laYears.push(2000 - k * 1000); laE.push(e); } }
const la2004Fit = fitObliquityP(laYears, laE);
const pMean = modelSeries.lunisolar.spinAxisInertialRateMeanArcsecPerYr(REALIZED_WINDOW[0], REALIZED_WINDOW[1]);
const realized = {
  windowYears: REALIZED_WINDOW,
  sModesArcsecPerYr: sModes,
  modelFit,
  modelPredicted: { pMeanArcsecPerYr: pMean, periodYr: modelSeries.lunisolar.obliquityPeriodRealizedYears(REALIZED_WINDOW[0], REALIZED_WINDOW[1]) },
  la2004Fit,
  j2000BeatYr: beatKyr * 1000,
  j2000InertialRateArcsecPerYr: modelSeries.lunisolar.spinAxisInertialRateArcsecPerYrJ2000,
};

console.log(`d eps/dt at J2000 (era tier): ${era.rateArcsecPerCy.toFixed(2)} "/cy   (IAU −46.84 — the shipped A-solve's TARGET, here derived; full-table local slope ${full.rateArcsecPerCy.toFixed(2)} — the remainder-shift class)`);
console.log(`dominant obliquity beat at J2000, ψ̇ᵢₙ − |s₃|: ${beatKyr.toFixed(2)} kyr (the shipped model's one home)`);
console.log(`realized obliquity period over ${(REALIZED_WINDOW[1] - REALIZED_WINDOW[0]) / 1e6} Myr: model ε(t) fit ${modelFit.periodYr.toFixed(0)} yr (p ${modelFit.pArcsecPerYr.toFixed(4)}, rms ${modelFit.rmsArcsec.toFixed(0)}″) · predicted from the window-mean pole rate ${realized.modelPredicted.periodYr.toFixed(0)} yr (⟨ψ̇ᵢₙ⟩ ${pMean.toFixed(4)}) · La2004 fit ${la2004Fit.periodYr.toFixed(0)} yr (p ${la2004Fit.pArcsecPerYr.toFixed(4)})`);
for (const [label, v] of [['full ζ table', full], [`era ζ tier (${(MT.earthZetaEra ?? []).length || 8} terms)`, era]]) {
  console.log(`\n== eps(t) vs La2004 — ${label} — vs the shipped fitted law ==`);
  for (const kyrMax of [13, 50, 130, 270, 600, 1000]) {
    const w = v.windows[kyrMax];
    console.log(`  0-${String(kyrMax).padEnd(4)} kyr:  hybrid rms ${w.hybridRmsArcsec.toFixed(1).padStart(7)}"  corr ${w.hybridCorr.toFixed(3)}   |  fitted law rms ${w.fittedLawRmsArcsec.toFixed(1).padStart(7)}"  corr ${w.fittedLawCorr.toFixed(3)}`);
  }
}

if (process.argv.includes('--json')) {
  console.log('@@OBLIQUITY_HYBRID_JSON@@ ' + JSON.stringify({
    alphaArcsecPerYr: tierFull.alphaArcsecPerYr,
    psiDotH13ArcsecPerYr: (psiDotRadPerYr * R2D) * 3600,
    rateFullArcsecPerCy: full.rateArcsecPerCy,
    rateEraArcsecPerCy: era.rateArcsecPerCy,
    beatKyr,
    realized,
    zetaTermsFull: MT.modes.earth.zeta.length,
    zetaTermsEra: (MT.earthZetaEra ?? MT.modes.earth.zeta.slice(0, 8)).length,
    windowsFull: full.windows, windowsEra: era.windows,
  }));
}
