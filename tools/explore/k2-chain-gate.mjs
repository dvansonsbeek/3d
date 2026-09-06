#!/usr/bin/env node
// P5/K2 — the evaluator's two gates + the measured v1 gap (plan 02 §P5).
//
// GATE A (solver correctness, hard): with elements FROZEN at the J2000
//   anchor and the osculating mean motion, the evaluator must reproduce the
//   universal-variable two-body propagator (keplerStep) from the same state —
//   metres-class. This gates the geometry, independent of any physics choice.
// MEASUREMENT B (the v1 gap, reported not gated): the evaluator's skeleton
//   (anchor elements + engine-D window ϖ-rate + engine-D-measured window mean
//   motion) vs the FULL engine-D trajectory (WH, 1PN, 1600–2100). The gap is
//   the medium-/short-period content v1 deliberately omits — the budget for
//   any later terms DERIVED from our own runs. Also reported: the window mean
//   motion vs the snapshot osculating n (why the artifact must carry the
//   window value: snapshot-a errors integrate to degrees over centuries).
//
// RESULT (measured, this instrument, WH gr dt=2 order=2, 1600–2100):
//   GATE A PASS — evaluator vs keplerStep, frozen elements, all planets
//     ≤ 10.6 m over 50 yr (Earth worst; the rest sub-metre).
//   B1 — window mean motion vs snapshot osculating n (why the artifact must
//     carry n_window): Mercury −12.7 ″/yr · Venus −23.7 · Earth −7.1 ·
//     Mars −8.4 · Jupiter +43.6 · Saturn **+303.0** · Uranus +55.9 ·
//     Neptune +18.3 — snapshot-a's GI-class oscillation makes the giants'
//     osculating n unusable (Saturn would drift 33.7° over the window).
//   B2 — the v1 periodic-term budget (skeleton vs full engine trajectory,
//     RMS heliocentric longitude): Mercury 14.5″ · Venus 36.2 · Earth 30.1
//     · Mars 55.0 · Jupiter 527.7 · Saturn 1251.0 · Uranus 770.1 ·
//     Neptune 1003.2 — the textbook great inequalities, measured from OUR
//     engine (Saturn ≈ the classic ±48′ GI; Jupiter ≈ ±21′). Any terms
//     added ride the DST-1/DLT-1 pattern: derived from our own runs.
//   TRAP RECORDED: sample time labels MUST come from the integrator's own
//     clock — nSteps·dt = 182 d ≠ 0.5 yr; labeling by the intended grid
//     drifted 0.34 % and forged a −5°/yr Mercury mean-motion error before
//     the fix (the rate-vs-point-value family, time-label form).
//   K2.1 ACCEPTANCE (artifact-driven chain, all inputs from the governed
//     artifact): B0 — artifact windowElementRates vs this instrument's
//     independent fit: inner planets ≤ 0.04 ″/yr (the machinery agrees);
//     giants Jupiter −3.8 / Saturn +9.4 ″/yr = the WINDOW-DEPENDENCE of the
//     mean motion itself (artifact types 1800–2100, this fit spans
//     1600–2100; the GI makes the giants' window mean era-local — the
//     era-typing doctrine measured). B2 on the pure shipped path
//     (t=0 anchor + 1800–2100-typed rates, evaluated 1600–2100, partly
//     OUTSIDE the typed window): inner 14.5–66 ″ ≈ unchanged; giants grow
//     to 842/2064/1080/1565 ″ — exact where typed, degrading beyond, like
//     every window-epoch descriptor. Earth n cross-gate in the artifact:
//     −0.279 ″/yr vs the model's sidereal anchor (tol 2).
//
//   node tools/explore/k2-chain-gate.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH, keplerStep } from './nbody-wh.mjs';
import { HZ, GM_SUN, NAMES, gmOf } from './j2000-state.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const TL = require(ROOT + 'tools/lib/constants.js');

const AU_KM = TL.currentAUDistance;   // the model's own AU — never the IAU literal
const YR = 365.25 * 86400;
const D2R = Math.PI / 180;
const gms = Object.fromEntries(NAMES.map((k) => [k, gmOf(k)]));

// ── GATE A — evaluator vs universal-variable two-body, frozen elements ────
console.log('GATE A — solver correctness (frozen elements vs keplerStep, 50 yr):');
let worstA = 0;
for (const key of NAMES) {
  const mu = GM_SUN + gms[key];
  const anchor = KC.computeOsculatingElements(HZ[key].slice(0, 3), HZ[key].slice(3, 6), mu);
  const chain = { anchor, periRateArcsecCy: 0, meanMotionDegPerYr: null };
  let worst = 0;
  for (const dtYr of [0.7, 5.3, 17.9, 50.1]) {
    const ref = keplerStep(mu, HZ[key].slice(0, 3), HZ[key].slice(3, 6), dtYr * YR);
    const el = KC.computePlanetElementsAtYear(KC.ANCHOR_EPOCH_YEAR + dtYr, chain);
    const p = KC.computeHeliocentricEclipticFromElements(el);
    const err = Math.hypot(p.xAU * AU_KM - ref.r[0], p.yAU * AU_KM - ref.r[1], p.zAU * AU_KM - ref.r[2]);
    worst = Math.max(worst, err);
  }
  worstA = Math.max(worstA, worst);
  console.log(`  ${key.padEnd(8)} max ${(worst * 1000).toFixed(1)} m`);
}
console.log(worstA * 1000 < 2000 ? '  GATE A PASS (metres-class)' : `  GATE A FAIL (${worstA.toFixed(3)} km)`);

// ── MEASUREMENT B — v1 skeleton vs the full engine trajectory ─────────────
// WH 1600→2100 (start the state at 1600 by running backward first).
const N = NAMES.length;
function seedBary() {
  const gmsArr = [GM_SUN, ...NAMES.map((k) => gms[k])];
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((p) => ({ r: HZ[p].slice(0, 3), v: HZ[p].slice(3, 6) }))];
  const M = gmsArr.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gmsArr[i] * b.r[c], 0) / M);
  const vB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gmsArr[i] * b.v[c], 0) / M);
  const Y0 = new Float64Array(6 * (N + 1));
  for (let i = 0; i <= N; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * (N + 1) + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gmsArr, Y0 };
}
const DT = 2 * 86400;
const { gmsArr, Y0 } = seedBary();
const SAMPLE_YR = 0.5;
const samples = [];   // {year, pos: {planet: [x,y,z] km}, el: {planet: elements}}
for (const dir of [-1, +1]) {
  const sim = makeWH({ gms: gmsArr, Y0: Float64Array.from(Y0), dt: dir * DT, gr: true, order: 2 });
  const nSteps = Math.round(SAMPLE_YR * YR / DT);
  const span = dir < 0 ? 400 : 100;          // 1600–2000 backward, 2000–2100 forward
  for (let s = 0; s <= span / SAMPLE_YR; s++) {
    if (s > 0) sim.step(nSteps);
    // TIME LABELS COME FROM THE INTEGRATOR'S OWN CLOCK. nSteps·dt is 182 d,
    // not 0.5 yr — labeling by the intended grid drifts 0.34 % and forges a
    // −5°/yr Mercury mean-motion error (measured; the rate-vs-point trap in
    // time-label form).
    const year = KC.ANCHOR_EPOCH_YEAR + sim.t / YR;
    const rec = { year, pos: {}, el: {} };
    NAMES.forEach((p, i) => {
      const { r, v } = sim.helio(i + 1);
      rec.pos[p] = r;
      rec.el[p] = KC.computeOsculatingElements(r, v, GM_SUN + gms[p]);
    });
    samples.push(rec);
  }
}
samples.sort((a, b) => a.year - b.year);

// window mean motion per planet: ALIAS-SAFE linear fit — detrend the mean
// longitude by the snapshot osculating n first (the residual moves ≪ 180°
// per sample for every planet), unwrap the residual, fit, re-add the trend.
function fitMeanMotion(key) {
  const nOsc = samples.find((s) => s.year === KC.ANCHOR_EPOCH_YEAR).el[key].meanMotionDegPerYr;
  let prev = null, unwrapped = [], t = [];
  for (const s of samples) {
    const ty = s.year - KC.ANCHOR_EPOCH_YEAR;
    let L = s.el[key].meanLonEclipticDeg - ((nOsc * ty) % 360);
    L = ((L % 360) + 360) % 360;
    if (prev !== null) { while (L < prev - 180) L += 360; while (L > prev + 180) L -= 360; }
    prev = L; unwrapped.push(L + nOsc * ty); t.push(ty);
  }
  const n = t.length, st2 = t.reduce((a, x) => a + x * x, 0), st1 = t.reduce((a, x) => a + x, 0);
  const sy = unwrapped.reduce((a, x) => a + x, 0), sty = unwrapped.reduce((a, x, i) => a + x * t[i], 0);
  const slope = (n * sty - st1 * sy) / (n * st2 - st1 * st1);
  const icept = (sy - slope * st1) / n;
  return { slope, icept };
}

const windowN = {};
console.log('\nMEASUREMENT B1 — window mean motion (engine-D fit 1600–2100) vs snapshot osculating n:');
console.log('planet    n_window °/yr      n_osc °/yr        Δ ″/yr    → drift over 400 yr');
for (const key of NAMES) {
  const f = fitMeanMotion(key);
  windowN[key] = f;
  const nOsc = samples.find((s) => s.year === KC.ANCHOR_EPOCH_YEAR).el[key].meanMotionDegPerYr;
  const dAs = (f.slope - nOsc) * 3600;
  console.log(`  ${key.padEnd(8)} ${f.slope.toFixed(9).padStart(15)} ${nOsc.toFixed(9).padStart(16)} ${dAs.toFixed(2).padStart(9)}   ${(dAs * 400 / 3600).toFixed(3)}°`);
}

// B0 — the governed artifact's banked rates vs this instrument's independent
// fit (two routes to the same window quantities; K2.1 acceptance).
let chainsArt = null;
try { chainsArt = KC.buildPlanetChainsFromArtifact({ skeletonOnly: true }); } catch { /* pre-K2.1 artifact */ }   // skeleton gates — the periodic layer is K4.5's, gated by the verdict
if (chainsArt) {
  console.log('\nMEASUREMENT B0 — artifact windowElementRates vs instrument fit (Δ n, ″/yr):');
  for (const key of NAMES) {
    const d = (chainsArt[key].meanMotionDegPerYr - windowN[key].slope) * 3600;
    console.log(`  ${key.padEnd(8)} ${d.toFixed(3).padStart(9)}`);
  }
} else console.log('\n(B0 skipped — artifact predates K2.1; regenerate with --write)');

// B2 — the SHIPPED path: pure artifact-driven chain (anchors + rates all from
// the governed artifact, zero instrument-fitted inputs) vs engine positions.
const chains = chainsArt ?? KC.buildPlanetChains(HZ, gms, Object.fromEntries(NAMES.map((k) => [k, windowN[k].slope])));
console.log(`\nMEASUREMENT B2 — ${chainsArt ? 'artifact-driven chain' : 'v1 skeleton (fitted fallback)'} vs full engine-D trajectory (1600–2100), heliocentric:`);
console.log('planet    RMS km        max km        RMS ″(helio-lon)   [the v1 periodic-term budget]');
for (const key of NAMES) {
  const chain = { ...chains[key] };
  if (!chainsArt) chain.anchor = { ...chain.anchor, meanLonEclipticDeg: ((windowN[key].icept % 360) + 360) % 360 };
  let s2 = 0, mx = 0, sl2 = 0, cnt = 0;
  for (const s of samples) {
    const el = KC.computePlanetElementsAtYear(s.year, chain);
    const p = KC.computeHeliocentricEclipticFromElements(el);
    const r = s.pos[key];
    const err = Math.hypot(p.xAU * AU_KM - r[0], p.yAU * AU_KM - r[1], p.zAU * AU_KM - r[2]);
    const lonEval = Math.atan2(p.yAU, p.xAU), lonRef = Math.atan2(r[1], r[0]);
    let dl = (lonEval - lonRef) / D2R; while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
    s2 += err * err; mx = Math.max(mx, err); sl2 += dl * dl * 3600 * 3600; cnt++;
  }
  console.log(`  ${key.padEnd(8)} ${Math.sqrt(s2 / cnt).toFixed(0).padStart(9)} ${mx.toFixed(0).padStart(12)} ${Math.sqrt(sl2 / cnt).toFixed(1).padStart(14)}`);
}
console.log('\n(B2 is the measured v1 gap — the budget for terms derived from our own runs; not a pass/fail gate.)');
