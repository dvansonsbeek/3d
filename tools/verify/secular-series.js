#!/usr/bin/env node
/**
 * EARTH ζ-SERIES ARTIFACT — the C-2 one-source evaluator's data home
 * (plan 02, the Stage-C "one source for the movement" arc).
 *
 * WRITES data/nbody-secular-series.json (tracked; --write only): the
 * ζ = sin(i/2)·e^{iΩ} AND z = e·e^{iϖ} series of ALL EIGHT PLANETS,
 * resampled from the model's own ±10-Myr N-body run (the same 20-Myr GR
 * dump behind data/nbody-deep-secular-modes.json) — the engine's
 * orbit-plane and eccentricity-vector histories banked VERBATIM (linear
 * resample after a 1-kyr anti-alias boxcar), no mode extraction, no
 * tiers. Earth at 500-yr cadence (it DRIVES the obliquity-hybrid
 * integration — the C-2 cadence sweep); the seven planets at 1000-yr
 * (display-class consumers: deep-time elements for rings/positions —
 * the D5 fix for the owner-found era-chain extrapolation blowup,
 * Mercury e 0.62 / i 31° at +1.35 Myr). History: C-2 banked Earth ζ,
 * C-4a added Earth z, D5 added the planets and the chain-handover
 * boundary measurement.
 *
 * WHY A SERIES AND NOT A MODE TABLE (the C-1 verdict, plan 02): no flat ζ
 * mode table serves both scales — the era tier's in-era quality is the
 * local absorption of real s1/s2/s3 multiplet power into 8 carriers
 * (deepening measured 16→24→32 terms: in-era stuck 5″→3.3″→2.0″ vs the
 * 0.3″ certification, deep DEGRADING 0.0999°→0.1136°; the era8+residual
 * cascade inherits the deep-class local error at 4.8″). The hybrid driven
 * by the series itself beats BOTH tiers on their home turf; the banked
 * verdict block below carries the measured numbers.
 *
 * CADENCE (measured sweep, C-2): 500 yr keeps the in-era integration at
 * 0.16″/0.18″ rms vs IAU-2006 (raw 54.8-yr cadence: 0.13″/0.10″); 1000 yr
 * degrades 1600–2400 to 0.64″ (past the era tier), 2000 yr to 1.8″.
 *
 * ASSERTIONS UNDER --write (refuse-gates):
 *   - dump meta matches the registered run (wh / dt 2 / 1PN / ±10 Myr) and
 *     conservation |ΔE/E| ≤ 1e-7;
 *   - resample fidelity: max |series − raw ζ| on the raw grid ≤ 2e-5;
 *   - the hybrid ON THIS SERIES (deep-16 tail beyond the span) meets the
 *     C-1 class: ε vs IAU-2006 rms ≤ 0.25″ (1900–2100) and ≤ 0.30″
 *     (1600–2400); dε/dt(J2000) within 1% of the IAU reference (read from
 *     the shared astro reference — never retyped); ε vs La2004 rms ≤ 0.05°
 *     over −200..0 kyr (La2004 is a THEORY label, never an input).
 *
 * Run: node tools/verify/secular-series.js          (prints the bank)
 *      node tools/verify/secular-series.js --write  (regenerate + gate)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const C = require('../lib/constants.js');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'data', 'nbody-secular-series.json');
const PLANET_STEP_YR = 1000;
const PLANETS7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const DUMP = path.join(ROOT, 'tools', 'explore', 'lattice-long-window-ecliptic-20000000-gr.local.json');
const DEEP_MODES = path.join(ROOT, 'data', 'nbody-deep-secular-modes.json');
const LA2004 = path.join(ROOT, 'data', 'la2004-earth-51myr-back.asc');
const STEP_YR = 500;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

if (!WRITE) {
  if (!fs.existsSync(OUT)) { console.log('no artifact yet — run with --write'); process.exit(0); }
  const art = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  console.log('data/nbody-secular-series.json — current artifact');
  const eb = art.bodies.earth;
  console.log(`  earth ${eb.zetaQ.length} samples @ ${eb.stepYr} yr + ${Object.keys(art.bodies).length - 1} planets @ ${art.bodies.mercury.stepYr} yr, span ${art.t0Yr} .. ${art.t0Yr + (eb.zetaQ.length - 1) * eb.stepYr} yr (ζ + z)`);
  console.log(`  verdict: era rms ${art.verdict.eraRms19002100Arcsec.toFixed(3)}″ / ${art.verdict.eraRms16002400Arcsec.toFixed(3)}″ · deps/dt ${art.verdict.rateJ2000ArcsecPerCy.toFixed(2)} ″/cy · La2004 −200 kyr ${art.verdict.deep200KyrRmsDeg.toFixed(4)}°`);
  console.log('  (generator class — a plain run only prints; --write regenerates from the dump)');
  process.exit(0);
}

if (!fs.existsSync(DUMP)) {
  console.error(`REFUSING: dump missing (${path.relative(ROOT, DUMP)}). Reproduce it first:`);
  console.error('  node tools/explore/lattice-long-window-test.mjs years=20000000 integrator=wh dt=2 order=2 gr=1 frame=both sample=20000');
  process.exit(1);
}

console.log('reading the 20-Myr GR dump …');
const rawBuf = fs.readFileSync(DUMP);
const dumpSha256 = crypto.createHash('sha256').update(rawBuf).digest('hex');
const D = JSON.parse(rawBuf.toString('utf8'));
if (D.integrator !== 'wh' || D.dt !== 2 || D.gr !== true) {
  console.error(`REFUSING: dump is not the registered run (integrator ${D.integrator}, dt ${D.dt}, gr ${D.gr})`);
  process.exit(1);
}
const span = D.t[D.t.length - 1] - D.t[0];
if (Math.abs(span - 20000000) > 40000) { console.error(`REFUSING: dump span ${span} yr is not the registered ±10 Myr`); process.exit(1); }
if (D.conservation && Math.abs(D.conservation.maxDE ?? D.conservation) > 1e-7) {
  console.error('REFUSING: conservation exceeds the symplectic bound 1e-7'); process.exit(1);
}

// raw ζ and z series
const tR = D.t, E = D.elements.earth, NR = tR.length;
const qR = new Float64Array(NR), pR = new Float64Array(NR);
const zqR = new Float64Array(NR), zpR = new Float64Array(NR);
for (let i = 0; i < NR; i++) {
  const s2 = Math.sin(E.inc[i] * D2R / 2);
  qR[i] = s2 * Math.cos(E.Om[i] * D2R);
  pR[i] = s2 * Math.sin(E.Om[i] * D2R);
  zqR[i] = E.e[i] * Math.cos(E.w[i] * D2R);
  zpR[i] = E.e[i] * Math.sin(E.w[i] * D2R);
}
const rT0 = tR[0], rDt = tR[1] - tR[0];

// Anti-alias filter (C-4a): a centered boxcar over SMOOTH_YR applied to BOTH
// raw series before resampling. The banked series is the SECULAR history;
// the raw osculating elements carry short-period/aliased content (measured:
// unfiltered z resample departure 1.1e-4 ≈ 0.7% of e — EoC-relevant noise;
// ζ is quiet at 6e-6 but gets the SAME recipe, one construction). Standard
// decimation practice, zero fitted constants; the window is a convention
// pinned in meta. Attenuation of the fastest secular mode (~49 kyr):
// sinc(π·1/49) = 0.9993 — a 0.07% amplitude bias, far below every gate.
const SMOOTH_YR = 1000;
// D5: the PLANET blocks smooth over 4 kyr — the Jupiter–Saturn Great
// Inequality (~883-yr quasi-period) is genuine physics but SHORT-PERIOD
// for a secular bank; the 1-kyr boxcar leaves a sign-flipped ~11% remnant
// (measured: Jupiter fidelity 1.65e-4 even at 500-yr cadence). 4 kyr
// suppresses it to sidelobe level while biting only 1.1% off the fastest
// secular mode (sinc(π·4/49)) — display-class. The GI stays represented
// where it belongs: the era chain's periodic layer. Earth keeps 1 kyr
// (its block feeds the certified hybrid integration and its gates).
const SMOOTH_PLANET_YR = 4000;
const smooth = (/** @type {Float64Array} */ arr, widthYr = SMOOTH_YR) => {
  const NA = arr.length;
  const half = Math.max(1, Math.round(widthYr / 2 / rDt));
  const out = new Float64Array(NA);
  let acc = 0, lo = 0, hi = -1;
  for (let i = 0; i < NA; i++) {
    const nlo = Math.max(0, i - half), nhi = Math.min(NA - 1, i + half);
    while (hi < nhi) acc += arr[++hi];
    while (lo < nlo) acc -= arr[lo++];
    out[i] = acc / (hi - lo + 1);
  }
  return out;
};
const qS = smooth(qR), pS = smooth(pR), zqS = smooth(zqR), zpS = smooth(zpR);
const liRaw = (arr, tt) => {
  const x = (tt - rT0) / rDt, i = Math.max(0, Math.min(NR - 2, Math.floor(x))), f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
};

// resample to the artifact cadence, 9-decimal rounding
const n = Math.floor((tR[NR - 1] - rT0) / STEP_YR) + 1;
const t0Yr = rT0;
const q = Array.from({ length: n }, (_, i) => Number(liRaw(qS, t0Yr + i * STEP_YR).toFixed(9)));
const p = Array.from({ length: n }, (_, i) => Number(liRaw(pS, t0Yr + i * STEP_YR).toFixed(9)));
const zq = Array.from({ length: n }, (_, i) => Number(liRaw(zqS, t0Yr + i * STEP_YR).toFixed(9)));
const zp = Array.from({ length: n }, (_, i) => Number(liRaw(zpS, t0Yr + i * STEP_YR).toFixed(9)));
// the content the filter removed (banked as meta — the short-period budget)
let maxRemoved = 0, maxRemovedZ = 0;
for (let i = 0; i < NR; i++) {
  maxRemoved = Math.max(maxRemoved, Math.abs(qS[i] - qR[i]), Math.abs(pS[i] - pR[i]));
  maxRemovedZ = Math.max(maxRemovedZ, Math.abs(zqS[i] - zqR[i]), Math.abs(zpS[i] - zpR[i]));
}

// resample fidelity on the RAW grid (series interp back vs raw samples)
const liS = (arr, tt) => {
  const x = (tt - t0Yr) / STEP_YR, i = Math.max(0, Math.min(n - 2, Math.floor(x))), f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
};
let maxResample = 0, maxResampleZ = 0;
for (let i = 0; i < NR; i++) {
  maxResample = Math.max(maxResample,
    Math.abs(liS(q, tR[i]) - qS[i]), Math.abs(liS(p, tR[i]) - pS[i]));
  maxResampleZ = Math.max(maxResampleZ,
    Math.abs(liS(zq, tR[i]) - zqS[i]), Math.abs(liS(zp, tR[i]) - zpS[i]));
}
console.log(`earth: resampled ${n} samples @ ${STEP_YR} yr (boxcar ${SMOOTH_YR} yr) · resample fidelity ζ ${maxResample.toExponential(2)} · z ${maxResampleZ.toExponential(2)} · removed short-period content ζ ${maxRemoved.toExponential(2)} · z ${maxRemovedZ.toExponential(2)}`);
if (maxResample > 2e-5) { console.error('REFUSING: ζ resample fidelity exceeds 2e-5 — cadence too coarse for this series'); process.exit(1); }
if (maxResampleZ > 2e-5) { console.error('REFUSING: z resample fidelity exceeds 2e-5 — cadence too coarse for the z series'); process.exit(1); }

// ── D6: the Earth mean-motion channel (λ̇ drift → sidereal year of date) ──
// The sidereal year is 360°/λ̇, and λ̇'s small secular drift (the epoch
// drift of the mean longitude under planetary perturbations + GR) is its
// OWN dynamical channel — measured: it is NOT derivable from the banked
// ζ/z subsystem (the naive 360/(n + ϖ̇) with the movement's apsidal rate
// errs ±50 s where the true drift is ~1 s per 12 kyr), and the engine's
// λ̇ reproduces the Chapront polynomial slope to ~0.2 s over ±12 kyr
// with CONSTANT GM — pure planetary dynamics, cleanly separable from the
// mass-loss tier (which the run does not contain). Banked as a RATIO to
// the J2000 value so consumers multiply their own mass-loss law by it.
// Per-step rate from the dump's L, unwrapped: the integer revolutions per
// ~54.76-yr raw step are unambiguous (the fractional drift is ~1e-7).
const LAMDOT_WINDOW_YR = 2000;
// Banked at its own 2-kyr cadence: the boxcar already removed sub-2-kyr
// content, so the 500-yr series cadence oversamples it 4× for nothing —
// and the coarser grid is what the physics package embeds (~200 KB).
const LAMDOT_STEP_YR = 2000;
const lamDotRaw = new Float64Array(NR - 1);
{
  const expRev = rDt * 365.25 / 365.2563630;   // ≈ revolutions per raw step
  for (let i = 1; i < NR; i++) {
    let f = (E.L[i] - E.L[i - 1]) / 360;
    f -= Math.floor(f);                         // fractional revolutions [0,1)
    const k = Math.round(expRev - f);           // integer revolutions
    lamDotRaw[i - 1] = ((k + f) * 360) / rDt;   // deg per Julian year, at the step midpoint
  }
}
const lamDotS = smooth(lamDotRaw, LAMDOT_WINDOW_YR);
const liMid = (/** @type {Float64Array} */ arr, /** @type {number} */ tt) => {
  // midpoint grid: value j sits at rT0 + (j + 0.5)·rDt
  const x = (tt - rT0) / rDt - 0.5, i = Math.max(0, Math.min(NR - 3, Math.floor(x))), f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
};
const lamDot0 = liMid(lamDotS, 0);
const nLam = Math.floor((tR[NR - 1] - rT0) / LAMDOT_STEP_YR) + 1;
const lamDotRel = Array.from({ length: nLam }, (_, i) =>
  Number((liMid(lamDotS, t0Yr + i * LAMDOT_STEP_YR) / lamDot0).toFixed(12)));
console.log(`earth λ̇ channel: ${nLam} samples @ ${LAMDOT_STEP_YR} yr (boxcar ${LAMDOT_WINDOW_YR} yr) · λ̇(J2000) ${lamDot0.toFixed(6)} °/yr · rel range [${Math.min(...lamDotRel).toFixed(9)}, ${Math.max(...lamDotRel).toFixed(9)}]`);

// ── D5: the seven planets' blocks (same recipe; 1000-yr display cadence) ──
// Consumers are the deep-time ELEMENT readouts (rings/positions beyond the
// chain-handover boundary), not an integration — the coarser cadence is
// display-class and keeps the artifact small; fidelity is gated per body
// against the smoothed raw series exactly like Earth's.
const planetBodies = {};
for (const pl of PLANETS7) {
  const EP = D.elements[pl];
  const pq = new Float64Array(NR), pp = new Float64Array(NR);
  const pzq = new Float64Array(NR), pzp = new Float64Array(NR);
  for (let i = 0; i < NR; i++) {
    const s2 = Math.sin(EP.inc[i] * D2R / 2);
    pq[i] = s2 * Math.cos(EP.Om[i] * D2R);
    pp[i] = s2 * Math.sin(EP.Om[i] * D2R);
    pzq[i] = EP.e[i] * Math.cos(EP.w[i] * D2R);
    pzp[i] = EP.e[i] * Math.sin(EP.w[i] * D2R);
  }
  const pqS = smooth(pq, SMOOTH_PLANET_YR), ppS = smooth(pp, SMOOTH_PLANET_YR),
        pzqS = smooth(pzq, SMOOTH_PLANET_YR), pzpS = smooth(pzp, SMOOTH_PLANET_YR);
  const round7 = (/** @type {number} */ v) => Number(v.toFixed(7));
  // Per-body MEASURED cadence: try the display cadence, fall back to the
  // fine one when the fidelity gate demands it (Mercury's post-boxcar
  // ζ/z carry the fastest mixed-beat structure — measured 5.4e-4 at
  // 1000 yr, over the 1e-4 bound).
  let chosen = null;
  for (const stepTry of [PLANET_STEP_YR, STEP_YR]) {
    const nP = Math.floor((tR[NR - 1] - rT0) / stepTry) + 1;
    const bq = Array.from({ length: nP }, (_, i) => round7(liRaw(pqS, t0Yr + i * stepTry)));
    const bp = Array.from({ length: nP }, (_, i) => round7(liRaw(ppS, t0Yr + i * stepTry)));
    const bzq = Array.from({ length: nP }, (_, i) => round7(liRaw(pzqS, t0Yr + i * stepTry)));
    const bzp = Array.from({ length: nP }, (_, i) => round7(liRaw(pzpS, t0Yr + i * stepTry)));
    const liP = (/** @type {number[]} */ arr, /** @type {number} */ tt) => {
      const x = (tt - t0Yr) / stepTry, i = Math.max(0, Math.min(nP - 2, Math.floor(x))), f = x - i;
      return arr[i] * (1 - f) + arr[i + 1] * f;
    };
    let fid = 0;
    for (let i = 0; i < NR; i += 4) {
      fid = Math.max(fid,
        Math.abs(liP(bq, tR[i]) - pqS[i]), Math.abs(liP(bp, tR[i]) - ppS[i]),
        Math.abs(liP(bzq, tR[i]) - pzqS[i]), Math.abs(liP(bzp, tR[i]) - pzpS[i]));
    }
    // Display-class bound: 5e-4 in ζ/z units = Δe ≤ 5e-4, Δi ≤ 0.06° —
    // three orders below the era-chain blowup this bank fixes (Mercury
    // Δe 0.4+). The bound is set by the Great-Inequality remnant after
    // the 4-kyr boxcar (measured: Saturn 3.1e-4, Jupiter 1.3e-4 — the
    // GI moves Saturn most); the GI itself stays represented in the era
    // chain's periodic layer, where it belongs.
    console.log(`${pl}: ${nP} samples @ ${stepTry} yr · fidelity ${fid.toExponential(2)}${fid > 5e-4 ? ' — over 5e-4, refining' : ''}`);
    if (fid <= 5e-4) { chosen = { stepYr: stepTry, zetaQ: bq, zetaP: bp, zQ: bzq, zP: bzp, resampleFidelity: Number(fid.toExponential(2)) }; break; }
  }
  if (!chosen) { console.error(`REFUSING: ${pl} resample fidelity exceeds 5e-4 even at ${STEP_YR} yr`); process.exit(1); }
  planetBodies[pl] = chosen;
}

// ── C1: the seven planets' λ̇ channels (plan 02 §11, owner-approved
// mirror of D6, 2026-09-15) — the SAME recipe per planet: per-step
// wrap-counted λ̇ from the dump's L (wrap prior = the chain's own
// era-window mean motion, giving two independent routes to the J2000
// rate — banked as a cross-gate), the 2-kyr boxcar, banked as a ratio
// to the J2000 node at the 2-kyr cadence. The Driver-2 mass-loss tier
// is deliberately NOT here (the run's GM is constant): consumers
// compose P_p(y) = P_win · massLossLaw(y) / lamDotRel_p(y), exactly
// like Earth's shipped sidereal-year channel.
const CHAIN_FREQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'), 'utf8'));
const planetLamDotRows = [];
for (const pl of PLANETS7) {
  const winN = CHAIN_FREQ.windowElementRates[pl].meanMotionDegPerYr;   // deg per Julian year
  const EP = D.elements[pl];
  const raw = new Float64Array(NR - 1);
  const expRev = rDt * winN / 360;   // ≈ revolutions per raw step (wrap prior; Mercury ~227, margin ~50×)
  for (let i = 1; i < NR; i++) {
    let f = (EP.L[i] - EP.L[i - 1]) / 360;
    f -= Math.floor(f);                         // fractional revolutions [0,1)
    const k = Math.round(expRev - f);           // integer revolutions
    raw[i - 1] = ((k + f) * 360) / rDt;         // deg per Julian year, step midpoint
  }
  const rawS = smooth(raw, LAMDOT_WINDOW_YR);
  const l0 = liMid(rawS, 0);
  const rel = Array.from({ length: nLam }, (_, i) =>
    Number((liMid(rawS, t0Yr + i * LAMDOT_STEP_YR) / l0).toFixed(12)));
  const relMin = Math.min(...rel), relMax = Math.max(...rel);
  let eraMin = Infinity, eraMax = -Infinity;
  for (let i = 0; i < nLam; i++) {
    const t = t0Yr + i * LAMDOT_STEP_YR;
    if (t < -12000 || t > 12000) continue;
    if (rel[i] < eraMin) eraMin = rel[i];
    if (rel[i] > eraMax) eraMax = rel[i];
  }
  // Cross-gate, LIKE FOR LIKE: the chain's winN is the 1800–2100 window
  // mean, and Jupiter/Saturn's λ̇ genuinely oscillates with the ~900-yr
  // great inequality — so the comparison must use the SAME window (the
  // first cut compared the 2-kyr boxcar at J2000 and read 52 ppm of pure
  // GI phase, not disagreement; a displayed rate must name its window).
  // Exact windowed mean from unwrapped end-to-end longitude — no
  // sampling noise: cumulative revolutions from the same wrap counts.
  const cumDeg = new Float64Array(NR);
  for (let i = 1; i < NR; i++) cumDeg[i] = cumDeg[i - 1] + raw[i - 1] * rDt;
  const cumAt = (/** @type {number} */ tt) => {
    const x = (tt - tR[0]) / rDt, i = Math.max(0, Math.min(NR - 2, Math.floor(x))), f = x - i;
    return cumDeg[i] * (1 - f) + cumDeg[i + 1] * f;
  };
  const eraWinMean = (cumAt(100) - cumAt(-200)) / 300;   // 1800–2100, the chain's window
  const crossRel = eraWinMean / winN - 1;
  console.log(`${pl} λ̇ channel: λ̇(J2000, 2-kyr boxcar) ${l0.toFixed(6)} °/yr · era-window mean vs chain winN ${(crossRel * 1e6).toFixed(2)} ppm · rel range ±10 Myr [${relMin.toFixed(9)}, ${relMax.toFixed(9)}] · ±12 kyr [${eraMin.toFixed(9)}, ${eraMax.toFixed(9)}]`);
  if (Math.abs(rel[Math.round((0 - t0Yr) / LAMDOT_STEP_YR)] - 1) > 1e-12) { console.error(`${pl}: REFUSING — λ̇ channel is not 1 at the J2000 node — anchor construction broken`); process.exit(1); }
  // The crossRel is a banked MEASUREMENT, not a refuse-gate: the two
  // routes decompose one λ(t) differently — a 300-yr window fit can
  // absorb the local phase slope of a long inequality into its mean-
  // motion term (measured: Me/Ve/Ma ≤0.2 ppm · Ju 2.8 · Sa 37 (GI,
  // ~1/3 cycle in window) · Ne −497 (U–N near-2:1, 7% of a cycle in
  // window — the dump's era mean matches the JPL 164.79-yr period;
  // the chain's fitted winN carries the slope)). Breakage is guarded
  // by the wrap-sanity gate below: one missed wrap reads O(1) relative.
  let maxRawDev = 0;
  for (let i = 0; i < NR - 1; i++) maxRawDev = Math.max(maxRawDev, Math.abs(raw[i] / l0 - 1));
  if (maxRawDev > 5e-2) { console.error(`${pl}: REFUSING — raw λ̇ deviates ${(maxRawDev * 100).toFixed(2)}% from the J2000 rate — wrap-count breakage class`); process.exit(1); }
  Object.assign(planetBodies[pl], { lamDotRel: rel, lamDotStepYr: LAMDOT_STEP_YR, lamDotWindowYr: LAMDOT_WINDOW_YR });
  planetLamDotRows.push({ body: pl, lamDotJ2000DegPerYr: Number(l0.toFixed(9)), eraWindowMeanDegPerYr: Number(eraWinMean.toFixed(9)), vsChainWinNPpm: Number((crossRel * 1e6).toFixed(3)), relRange10Myr: [Number(relMin.toFixed(12)), Number(relMax.toFixed(12))], relRange12Kyr: [Number(eraMin.toFixed(12)), Number(eraMax.toFixed(12))] });
}
// The two celebrated near-commensurabilities as BEAT PREDICTIONS from the
// banked J2000 rates (doc-reproducible headline numbers; the C2 instrument
// measures the oscillations themselves in the raw λ̇).
const lam0ByBody = Object.fromEntries(planetLamDotRows.map((r) => [r.body, r.lamDotJ2000DegPerYr]));
const greatInequalityYr = 360 / Math.abs(5 * lam0ByBody.saturn - 2 * lam0ByBody.jupiter);
const uranusNeptuneBeatYr = 360 / Math.abs(lam0ByBody.uranus - 2 * lam0ByBody.neptune);
console.log(`beat predictions from λ̇(J2000): Jupiter–Saturn great inequality ${greatInequalityYr.toFixed(1)} yr · Uranus–Neptune near-2:1 ${uranusNeptuneBeatYr.toFixed(1)} yr`);

// ── quality gate: the hybrid ON THIS SERIES through the one-home factory ──
// The anchors come from the MODEL exactly as the Stage-C lab injects them
// (the measured year-length identity via model.epoch, ε₀ via model
// constants) — one convention, never retyped. createModel lives in the ESM
// barrel, so the gate runs inside an async main (dynamic import from CJS).
runQualityGateAndWrite().catch((e) => { console.error(e); process.exit(1); });

async function runQualityGateAndWrite() {
const { pathToFileURL } = require('url');
const phys = await import(pathToFileURL(path.join(ROOT, 'packages', 'physics', 'src', 'index.js')).href);
const model = phys.createModel();
const axialPrecessionYearsJ2000 = model.epoch.axialPrecessionYearsAtYear(2000);
const obliquityJ2000Deg = model.constants.earthOrbital.obliquityJ2000_deg;
const { createDeepOrbitalHistory } = require(path.join(ROOT, 'packages', 'physics', 'src', 'earth', 'deep-orbital-history.cjs'));
const MT = JSON.parse(fs.readFileSync(DEEP_MODES, 'utf8'));
const CHAIN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'), 'utf8'));
const AE = CHAIN.j2000AnchorElements.earth;
const mkTier = (withAxialFn) => createDeepOrbitalHistory({
  zModes: MT.modes.earth.z,
  zetaModes: MT.modes.earth.zeta,             // the TAIL beyond the span
  zetaSeries: { t0Yr, stepYr: STEP_YR, q, p },
  zSeries: { t0Yr, stepYr: STEP_YR, q: zq, p: zp },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000,
  obliquityJ2000Deg,
  // D1-revised: α(t) = ψ̇(t)/cos ε₀ with the SECULAR H(t) scaling only —
  // period(t) = period₀ · H(t)/H₀ (leg 1: the axial period scales with the
  // recession history), anchored at the measured J2000 period. NOT the
  // instantaneous year-length beat (model.epoch.axialPrecessionYearsAtYear):
  // that beat carries the fitted cardinal harmonics' equinox wobble — the
  // oscillating part of ψ̇ the hybrid's n̂(t) geometry already generates —
  // and feeding it into α double-counts it (measured: −200-kyr ε rms vs
  // La2004 3.5×-ed to 0.14° and ±1 Myr diverged 1.05°; the refuse-gate
  // caught it). The withAxialFn=false twin is the α₀ regression control.
  axialPrecessionYearsAtYearFn: withAxialFn
    ? ((H0) => (yr) => axialPrecessionYearsJ2000 * model.epoch.hAtYear(yr) / H0)(model.epoch.hAtYear(2000))
    : undefined,
});
const tier = mkTier(true);
// IAU 2006 mean obliquity (Hilton et al. 2006), arcsec; T = Julian centuries from J2000
const epsIau = (yr) => {
  const T = (yr - 2000) / 100;
  return (84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T ** 3
    - 5.76e-7 * T ** 4 - 4.34e-8 * T ** 5) / 3600;
};
const stats = (ds) => ({ rms: Math.sqrt(ds.reduce((s, d) => s + d * d, 0) / ds.length), max: Math.max(...ds.map(Math.abs)) });
const era = tier.build(-500, 500, 5);
const eraDs = { a: [], b: [] };
for (let y = 1900; y <= 2100; y += 5) eraDs.a.push((era.at(y - 2000).epsDeg - epsIau(y)) * 3600);
for (let y = 1600; y <= 2400; y += 10) eraDs.b.push((era.at(y - 2000).epsDeg - epsIau(y)) * 3600);
const eraA = stats(eraDs.a), eraB = stats(eraDs.b);
const rateJ2000 = (era.at(50).epsDeg - era.at(-50).epsDeg) * 3600;   // ″/cy
const iauRate = C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury;
const la = fs.readFileSync(LA2004, 'utf8').trim().split('\n')
  .map((l) => l.trim().split(/\s+/).map((x) => Number(x.replace('D', 'E'))));
const laEps = new Map(la.map((r) => [Math.round(r[0] * 1000), r[2] * R2D]));
const deepB = tier.build(-1000000, 0, 1000);
const dDs = { a: [], b: [] };
for (let k = -200; k <= 0; k += 2) { const ref = laEps.get(k * 1000); if (ref !== undefined) dDs.a.push(deepB.at(k * 1000).epsDeg - ref); }
for (let k = -1000; k <= 0; k += 2) { const ref = laEps.get(k * 1000); if (ref !== undefined) dDs.b.push(deepB.at(k * 1000).epsDeg - ref); }
const d200 = stats(dDs.a), d1000 = stats(dDs.b);
// the span-edge seam: series vs the tail mode-sum at the last in-span node
const tEdge = t0Yr + (n - 1) * STEP_YR;
const seamDeg = (() => {
  const tierModes = createDeepOrbitalHistory({
    zModes: MT.modes.earth.z, zetaModes: MT.modes.earth.zeta,
    anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
    anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
    axialPrecessionYearsJ2000, obliquityJ2000Deg,
  });
  // ζ-space distance at the edge (the n̂ discontinuity a crossing sees)
  const a = tier, b = tierModes; // both expose only build(); compare via a fine local build
  const s1 = a.build(tEdge - 1000, tEdge, 500).at(tEdge - 500);
  const s2 = b.build(tEdge - 1000, tEdge, 500).at(tEdge - 500);
  return Math.abs(s1.inclEclDeg - s2.inclEclDeg);
})();

// ── the z side (C-4a): e(t) vs La2004 at depth; e/ϖ vs the ERA-CERTIFIED
// chain evaluator in 1600–2400 (the chain is the era element authority,
// validated against JPL — the era agreement bound is the certification
// hand-off the one-source must meet before the scene's e can ride it).
const laE = new Map(la.map((r) => [Math.round(r[0] * 1000), r[1]]));
const zDs = { a: [], b: [] };
for (let k = -200; k <= 0; k += 2) { const ref = laE.get(k * 1000); if (ref !== undefined) zDs.a.push(deepB.at(k * 1000).e - ref); }
for (let k = -1000; k <= 0; k += 2) { const ref = laE.get(k * 1000); if (ref !== undefined) zDs.b.push(deepB.at(k * 1000).e - ref); }
const e200 = stats(zDs.a), e1000 = stats(zDs.b);
const chains = phys.buildPlanetChainsFromArtifactData(CHAIN);
const eraE = [], eraPeri = [];
{
  const liZ = (arr, tt) => { const x = (tt - t0Yr) / STEP_YR, i = Math.max(0, Math.min(n - 2, Math.floor(x))), f = x - i; return arr[i] * (1 - f) + arr[i + 1] * f; };
  const Rz = [AE.e * Math.cos(AE.lonPeriEclipticDeg * D2R) - liZ(zq, 0),
              AE.e * Math.sin(AE.lonPeriEclipticDeg * D2R) - liZ(zp, 0)];
  for (let y = 1600; y <= 2400; y += 10) {
    const t = y - 2000;
    const sx = liZ(zq, t) + Rz[0], sy = liZ(zp, t) + Rz[1];
    const el = phys.computePlanetElementsAtYear(y, chains.earth, chains);
    eraE.push(Math.hypot(sx, sy) - el.e);
    let dp = (Math.atan2(sy, sx) * R2D - el.lonPeriEclipticDeg) % 360;
    if (dp > 180) dp -= 360; if (dp < -180) dp += 360;
    eraPeri.push(dp);
  }
}
const eraES = stats(eraE), eraPS = stats(eraPeri);

console.log(`era vs IAU-2006: 1900–2100 rms ${eraA.rms.toFixed(3)}″ (max ${eraA.max.toFixed(3)}″) · 1600–2400 rms ${eraB.rms.toFixed(3)}″`);
console.log(`deps/dt(J2000) ${rateJ2000.toFixed(2)} ″/cy (IAU ${iauRate})`);
console.log(`vs La2004: −200..0 kyr rms ${d200.rms.toFixed(4)}° · −1000..0 kyr rms ${d1000.rms.toFixed(4)}° (max ${d1000.max.toFixed(3)}°)`);
console.log(`z side — e vs La2004: −200..0 kyr rms ${e200.rms.toExponential(2)} · −1000..0 kyr rms ${e1000.rms.toExponential(2)} (max ${e1000.max.toExponential(2)})`);
console.log(`z side — vs the era chain 1600–2400: e rms ${eraES.rms.toExponential(2)} (max ${eraES.max.toExponential(2)}) · ϖ rms ${eraPS.rms.toFixed(4)}° (max ${eraPS.max.toFixed(4)}°)`);
console.log(`span-edge seam (incl, series vs tail modes near +10 Myr): ${seamDeg.toFixed(4)}°`);

// ── D1-revised gates: the α(H(t)) coupling ──────────────────────────────
// (a) ERA REGRESSION: α(t) reduces to α₀ in-era — the α(t) tier's era ε
//     must match the α₀ twin to ≤0.01″ (a numerical-identity check, not a
//     tolerance for physics drift).
const tierA0 = mkTier(false);
const eraA0 = tierA0.build(-500, 500, 5);
let maxEraAlphaDiff = 0;
for (let y = 1600; y <= 2400; y += 10) {
  maxEraAlphaDiff = Math.max(maxEraAlphaDiff, Math.abs(era.at(y - 2000).epsDeg - eraA0.at(y - 2000).epsDeg) * 3600);
}
// (b) COARSE-STEP REGRESSION at ±1 Myr: the 250-yr adaptive step vs the
//     α₀ constant behavior is covered by the banked deep windows above;
//     here pin the α(t)-vs-α₀ divergence at ±1 Myr (expected small — H
//     changes little inside ±10 Myr) as a banked measurement.
const deepA0 = tierA0.build(-1000000, 0, 1000);
let maxMyrAlphaDiff = 0;
for (let k = -1000; k <= 0; k += 10) {
  maxMyrAlphaDiff = Math.max(maxMyrAlphaDiff, Math.abs(deepB.at(k * 1000).epsDeg - deepA0.at(k * 1000).epsDeg));
}
// (c) DEEP-DEEP SANITY + THE RENDERED LEG-1 FORK: integrate on the mode
//     tail out to ±500 Myr (the sim's range); ε must stay in a physical
//     band, and the hybrid-vs-K-device fork rows are banked — the
//     falsification leg 1 as the artifact's own record.
const deepDeep = tier.build(-500000000, 500000000, 500000);
let ddMin = Infinity, ddMax = -Infinity;
for (let tMa = -500; tMa <= 500; tMa += 1) {
  const e2 = deepDeep.at(tMa * 1e6).epsDeg;
  if (e2 < ddMin) ddMin = e2;
  if (e2 > ddMax) ddMax = e2;
}
const forkRows = [-500, -100, -50, -10, -1, 1, 10, 50, 100, 500].map((tMa) => ({
  tMa,
  epsHybridDeg: deepDeep.at(tMa * 1e6).epsDeg,
  epsKDeviceDeg: model.earth.obliquityDeg(2000 + tMa * 1e6),
}));
// ── D5: the chain-handover boundary, MEASURED per planet ────────────────
// The era chain (SKELETON tier — the periodic layer is era-local osculating
// structure, not divergence) vs the banked series, stepping outward until
// the divergence exceeds the display-invisible class (|Δe| > 0.005 or
// |Δi| > 0.25°). Beyond its boundary a planet's secular elements read the
// series; inside it the certified chain stays the evaluator.
const skeleton = phys.buildPlanetChainsFromArtifactData(CHAIN, { skeletonOnly: true });
const planetHandover = {};
let handoverMinKyr = Infinity;
for (const pl of PLANETS7) {
  const B = planetBodies[pl];
  const nP = B.zetaQ.length;
  const liP = (/** @type {number[]} */ arr, /** @type {number} */ tt) => {
    const x = (tt - t0Yr) / B.stepYr, i = Math.max(0, Math.min(nP - 2, Math.floor(x))), f = x - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  };
  const A2 = CHAIN.j2000AnchorElements[pl];
  const s2h2 = Math.sin(A2.inclEclipticDeg / 2 * D2R);
  const Rz2 = [A2.e * Math.cos(A2.lonPeriEclipticDeg * D2R) - liP(B.zQ, 0),
               A2.e * Math.sin(A2.lonPeriEclipticDeg * D2R) - liP(B.zP, 0)];
  const Rq2 = [s2h2 * Math.cos(A2.ascNodeEclipticDeg * D2R) - liP(B.zetaQ, 0),
               s2h2 * Math.sin(A2.ascNodeEclipticDeg * D2R) - liP(B.zetaP, 0)];
  const bound = (/** @type {number} */ dir) => {
    for (let k = 2; k <= 9000; k += 2) {
      const t = dir * k * 1000;
      const el = phys.computePlanetElementsAtYear(2000 + t, skeleton[pl], skeleton);
      const eS = Math.hypot(liP(B.zQ, t) + Rz2[0], liP(B.zP, t) + Rz2[1]);
      const iS = 2 * Math.asin(Math.min(1, Math.hypot(liP(B.zetaQ, t) + Rq2[0], liP(B.zetaP, t) + Rq2[1]))) * R2D;
      if (Math.abs(el.e - eS) > 0.005 || Math.abs(el.inclEclipticDeg - iS) > 0.25) return k;
    }
    return 9000;
  };
  const past = bound(-1), future = bound(+1);
  planetHandover[pl] = { pastKyr: past, futureKyr: future };
  handoverMinKyr = Math.min(handoverMinKyr, past, future);
  console.log(`${pl}: chain-vs-series stays display-class to −${past} / +${future} kyr`);
}
console.log(`chain-handover boundary (global min): ±${handoverMinKyr} kyr`);
if (handoverMinKyr < 10) { console.error('REFUSING: a planet chain departs the series inside ±10 kyr — era certification conflict'); process.exit(1); }

console.log(`α(t) era regression: max |Δε| 1600–2400 = ${maxEraAlphaDiff.toFixed(4)}″ · α(t)-vs-α₀ at ±1 Myr max ${maxMyrAlphaDiff.toExponential(2)}°`);
console.log(`deep-deep ±500 Myr ε band: [${ddMin.toFixed(2)}°, ${ddMax.toFixed(2)}°] · fork @−100 Ma: hybrid ${forkRows[1].epsHybridDeg.toFixed(2)}° vs K ${forkRows[1].epsKDeviceDeg.toFixed(2)}°`);
if (maxEraAlphaDiff > 0.01) { console.error('REFUSING: α(t) departs α₀ in-era beyond 0.01″ — the coupling must be a no-op in-era'); process.exit(1); }
if (ddMin < 10 || ddMax > 40) { console.error('REFUSING: deep-deep ε leaves the physical band [10°, 40°]'); process.exit(1); }

// D6: the λ̇ channel vs Chapront — the ONE cross-validation home for the
// sidereal-year drift. Chapront/Capitaine sidereal-year polynomial (days;
// via Capitaine et al. 2003, A&A 412, 567 lineage — same source as the
// chart reference): the channel-implied planetary drift must track its
// slope. Bound 0.5 s at ±12 kyr = 2× the measured agreement class
// (0.03–0.25 s); the channel carries NO mass loss (the dump's GM is
// constant), matching the polynomial's fit-era physics.
// t below is YEARS FROM J2000 (the series axis; calendar = 2000 + t)
const chapDriftS = (/** @type {number} */ t) => {
  const T = t / 100;
  const d = (1.139e-7 * T - 7.6e-11 * T * T - 1.69e-12 * T ** 3);
  return d * 86400;                              // drift vs J2000, seconds
};
const lamRelAtNode = (/** @type {number} */ t) => lamDotRel[Math.round((t - t0Yr) / LAMDOT_STEP_YR)];
const chanDriftS = (/** @type {number} */ t) =>
  31558149.7635 * (1 / lamRelAtNode(t) - 1);     // T ∝ 1/λ̇, IAU-anchored scale
const sidChk = [-12000, -8000, -4000, 4000, 8000, 12000].map((t) =>
  ({ t, chanS: chanDriftS(t), chapS: chapDriftS(t), diffS: chanDriftS(t) - chapDriftS(t) }));
const sidMaxDiff = Math.max(...sidChk.map((r) => Math.abs(r.diffS)));
console.log(`λ̇ channel vs Chapront (drift, s): −12k ${chanDriftS(-12000).toFixed(2)}/${chapDriftS(-12000).toFixed(2)} · +12k ${chanDriftS(12000).toFixed(2)}/${chapDriftS(12000).toFixed(2)} · max |Δ| ${sidMaxDiff.toFixed(3)} s`);
if (Math.abs(lamRelAtNode(0) - 1) > 1e-12) { console.error('REFUSING: λ̇ channel is not 1 at the J2000 node — anchor construction broken'); process.exit(1); }
if (sidMaxDiff > 0.5) { console.error('REFUSING: λ̇-channel sidereal-year drift departs the Chapront polynomial by >0.5 s inside ±12 kyr'); process.exit(1); }

// z-side refuse-gates (bounds = 2× the C-4a measured values: e-vs-chain
// 9.9e-6 rms / ϖ 0.0071° in 1600–2400; e-vs-La2004 2.85e-4 at −200 kyr)
if (eraES.rms > 5e-5) { console.error('REFUSING: series e departs the era-certified chain by >5e-5 rms in 1600–2400'); process.exit(1); }
if (eraPS.rms > 0.02) { console.error('REFUSING: series ϖ departs the era-certified chain by >0.02° rms in 1600–2400'); process.exit(1); }
if (e200.rms > 1e-3) { console.error('REFUSING: series e departs La2004 by >1e-3 rms over −200..0 kyr'); process.exit(1); }
if (eraA.rms > 0.25) { console.error('REFUSING: 1900–2100 ε rms exceeds 0.25″ — the series does not meet the C-1 era class'); process.exit(1); }
if (eraB.rms > 0.30) { console.error('REFUSING: 1600–2400 ε rms exceeds 0.30″'); process.exit(1); }
if (Math.abs(rateJ2000 - iauRate) > Math.abs(iauRate) * 0.01) { console.error(`REFUSING: dε/dt ${rateJ2000.toFixed(2)} departs the IAU reference by >1%`); process.exit(1); }
if (d200.rms > 0.05) { console.error('REFUSING: −200..0 kyr ε rms vs La2004 exceeds 0.05°'); process.exit(1); }

const artifact = {
  _description: 'Earth ζ = sin(i/2)·e^{iΩ} (zetaQ/zetaP) AND z = e·e^{iϖ} (zQ/zP) series (ecliptic-J2000), resampled at 500-yr cadence from the model\'s own ±10-Myr Wisdom–Holman run (1PN, DE440 masses, Horizons J2000 seed) — the ONE-SOURCE orbit-plane and eccentricity-vector histories for the Stage-C movement (deep-orbital-history.cjs zetaSeries/zSeries options; C-2 banked ζ, C-4a added z). D6 adds earth.lamDotRel — the mean-longitude-rate ratio to J2000 (planetary-only λ̇ drift; the run\'s GM is constant), the sidereal-year-of-date channel: T_sid(y) = massLossLaw(y)/lamDotRel(y). C1 mirrors the same recipe onto the seven planets (bodies.<planet>.lamDotRel, 2-kyr cadence): the ORBIT-tab period tier P_p(y) = P_win · massLossLaw(y)/lamDotRel_p(y), with the dump-vs-chain J2000 cross-gate banked in verdict.planetLamDot. No mode extraction: the C-1 verdict (plan 02) measured that no flat mode table serves both the certified era and deep time; the series itself does. The deep mode tables (nbody-deep-secular-modes.json) remain the TAIL beyond the ±10-Myr span. Verdict block = the banked quality gate. Times are years from J2000: t_i = t0Yr + i·stepYr.',
  meta: {
    dumpFile: path.relative(ROOT, DUMP),
    dumpSha256,
    integrator: D.integrator, dtDays: D.dt, gr: D.gr, spanYears: span,
    rawSampleDays: D.sampleDays,
    cadenceYr: STEP_YR, samples: n, roundedDecimals: 9,
    antiAliasBoxcarYr: SMOOTH_YR,
    resampleMaxDeparture: Number(maxResample.toExponential(2)),
    resampleMaxDepartureZ: Number(maxResampleZ.toExponential(2)),
    removedShortPeriodMax: Number(maxRemoved.toExponential(2)),
    removedShortPeriodMaxZ: Number(maxRemovedZ.toExponential(2)),
    cadenceSweepNote: '500 yr keeps the hybrid at 0.16″/0.18″ rms vs IAU-2006 (raw: 0.13″/0.10″); 1000 yr degrades 1600–2400 to 0.64″ — the measured C-2 sweep',
  },
  t0Yr,
  bodies: {
    earth: { stepYr: STEP_YR, zetaQ: q, zetaP: p, zQ: zq, zP: zp, lamDotRel, lamDotStepYr: LAMDOT_STEP_YR, lamDotWindowYr: LAMDOT_WINDOW_YR },
    ...planetBodies,
  },
  verdict: {
    eraRms19002100Arcsec: eraA.rms, eraMax19002100Arcsec: eraA.max,
    eraRms16002400Arcsec: eraB.rms,
    rateJ2000ArcsecPerCy: rateJ2000, iauRateArcsecPerCy: iauRate,
    deep200KyrRmsDeg: d200.rms, deep1000KyrRmsDeg: d1000.rms, deep1000KyrMaxDeg: d1000.max,
    spanEdgeSeamInclDeg: seamDeg,
    alphaHt: {
      eraMaxAbsDiffArcsec: maxEraAlphaDiff,
      myrMaxAbsDiffDeg: maxMyrAlphaDiff,
      deepDeepBandDeg: [ddMin, ddMax],
      forkRows,
      note: 'D1-revised: α(t) = ψ̇(t)/cos ε₀ (the model\'s own H(t) machinery). In-era it is a numerical no-op (gate ≤0.01″); the forkRows are the RENDERED falsification leg 1 — the hybrid beat vs the K device\'s H-scaled curve at deep time',
    },
    z: {
      eVsLa2004Rms200Kyr: e200.rms, eVsLa2004Rms1000Kyr: e1000.rms, eVsLa2004Max1000Kyr: e1000.max,
      eVsEraChainRms16002400: eraES.rms, eVsEraChainMax16002400: eraES.max,
      periVsEraChainRmsDeg16002400: eraPS.rms, periVsEraChainMaxDeg16002400: eraPS.max,
      note: 'the C-4a z-side hand-off: the series vs the era-certified chain evaluator in 1600–2400 (the chain is the era element authority, JPL-validated), and vs La2004 (theory label) at depth',
    },
    siderealYear: {
      lamDotJ2000DegPerYr: lamDot0,
      rows: sidChk.map((r) => ({ tYr: r.t, channelDriftS: Number(r.chanS.toFixed(4)), chaprontDriftS: Number(r.chapS.toFixed(4)) })),
      maxAbsDiffS: Number(sidMaxDiff.toFixed(4)),
      note: 'D6: the banked λ̇ channel (lamDotRel) vs the Chapront/Capitaine sidereal-year polynomial — planetary-only drift (the dump\'s GM is constant); consumers multiply their own mass-loss law by 1/lamDotRel. THE one cross-validation home for the sidereal-year drift.',
    },
    planetLamDot: {
      rows: planetLamDotRows,
      greatInequalityYr: Number(greatInequalityYr.toFixed(2)),
      uranusNeptuneBeatYr: Number(uranusNeptuneBeatYr.toFixed(2)),
      note: 'C1 (plan 02 §11): per-planet λ̇ channels — the D6 recipe mirrored (2-kyr boxcar, ratio ≡ 1 at the J2000 node; the dump\'s GM is constant, so the Driver-2 mass-loss tier lives with the consumer: P_p(y) = P_win · massLossLaw(y)/lamDotRel_p(y)). vsChainWinNPpm is a banked MEASUREMENT of the two routes\' decomposition split in the SAME 1800–2100 window (dump unwrapped-longitude mean vs the chain\'s fitted winN): a short-window fit absorbs the local phase slope of a long inequality into its mean-motion term — Ju 2.8 / Sa 37 ppm (GI, ~1/3 cycle in window), Ne −497 ppm (U–N near-2:1, 7% of a cycle; the dump\'s mean matches the JPL 164.79-yr period, so lamDotJ2000DegPerYr is the period-row anchor). Breakage is guarded by the wrap-sanity gate, not by this split. The beat entries are predictions from the J2000 rates; the C2 instrument measures the oscillations themselves.',
    },
    planetHandover: {
      rows: planetHandover,
      globalMinKyr: handoverMinKyr,
      thresholds: { eAbs: 0.005, inclAbsDeg: 0.25 },
      note: 'D5: per-planet |t| where the SKELETON era chain departs the banked series beyond the display-invisible class — beyond it, deep-time element readers switch to the series (the owner-found ring blowup: chain Mercury e 0.62 / i 31° at +1.35 Myr vs series-sane values)',
    },
    baselines: {
      eraTier8: { eraRms19002100Arcsec: 0.311, deep200KyrRmsDeg: 0.1505 },
      deepTier16: { eraRms19002100Arcsec: 4.948, deep200KyrRmsDeg: 0.0694 },
      note: 'the C-1 measured baselines the series beats on both home turfs (plan 02 C-1 verdict)',
    },
  },
  inputs: buildInputsBlock('node tools/verify/secular-series.js --write', [
    'tools/explore/lattice-long-window-test.mjs',
    'tools/verify/secular-series.js',
    'packages/physics/src/earth/deep-orbital-history.cjs',
    'data/nbody-deep-secular-modes.json',
  ]),
};
fs.writeFileSync(OUT, JSON.stringify(artifact));
console.log(`✓ wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
}
