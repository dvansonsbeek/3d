#!/usr/bin/env node
// W5 (plan 04) — DYNAMICAL verification of the M-scaling law with time-varying
// GM☉ in the WH engine itself, not in the L-L matrix.
//
// THE CLAIM UNDER TEST (doc 99 / the paper's ancient-Sun section): under
// adiabatic solar mass loss every Newtonian secular frequency scales exactly
// with the solar mass (g, s ∝ M☉), the semi-major axes as a ∝ 1/M☉, and the
// eccentricities are adiabatically invariant. Until W5 this was verified
// statically (two constant-mass systems compared mode by mode); this
// instrument verifies it IN FLIGHT: one integration whose Sun loses mass
// mid-run, with the secular spectrum measured on each side of the ramp.
//
// DESIGN — step profile, not a continuous ramp, so each analysis window has a
// CONSTANT mass and clean NAFF lines:
//   t ∈ [0, 4.0] Myr        M = M₀                (window W0)
//   t ∈ [4.0, 4.5] Myr      smootherstep M₀ → 0.99·M₀   (the in-flight ramp)
//   t ∈ [4.5, 8.5] Myr      M = 0.99·M₀           (window W1)
// WINDOW LENGTH IS LOAD-BEARING: 1-Myr windows were measured to give
// window-phase-dependent sidelobe bias of 10³–10⁵ ppm on blended lines
// (Uranus's g5/g7 mix worst at −7.9e4 ppm; isolated Saturn g6 already at
// +487 ppm) — NAFF line bias falls as T⁻³, and 4-Myr windows (the W4
// standard, clone-σ ~1e-8 ″/yr) put it below ppm against the 1e4-ppm signal.
// Newton only (the law is Newtonian; the 1PN share M^{1+3f} is a separate,
// static result), WH order 2, dt 2 d, 9 bodies. Seed: the Horizons J2000
// state (j2000-state.mjs, the one home) shifted to the BARYCENTRE exactly as
// lattice-long-window-test.mjs does — V is barycentric in the WH layout.
// Elements sampled every 200 yr in ecliptic J2000 with μ(t) = GM☉(t) + GM_p;
// the two windows are written as dumps in the lattice-long-window schema and
// analysed by the campaign's own NAFF (naff-frequencies.mjs, Gram–Schmidt
// projection — never a re-implementation). Prediction: every well-resolved
// mode frequency obeys f(W1)/f(W0) = 0.990000; mode AMPLITUDES (the
// eccentricity-vector content) unchanged to O(δ); windowed-mean a·M
// invariant across the ramp.
//
// RESULT (measured, this instrument; 8.5-Myr ramp run + constant-mass twin,
// δ = 1%, controlled R = (f1/f0)_ramp ÷ (f1/f0)_twin vs prediction 0.990000):
//   ADIABAT — exact in flight: windowed-mean a·M ratio across the ramp
//     1 + 1e-9…3e-8 (inner planets), 1e-6…1e-5 (giants, GI-oscillation
//     residual of the window mean); two-body smoke 3.4e-8, Δe 1.1e-7.
//   FIRST-ORDER LAW VERIFIED on the planets' OWN modes (controlled dev):
//     g1 +125 ppm · g2 +38 ppm · g4 +91 ppm · g8 +545 ppm — g ∝ M at the
//     1e-4 level, with the twin removing 1e3-ppm-class natural wander
//     (Mars: −1990 ppm raw → +91 controlled).
//   THE GIANT MODES UNDER-SCALE — a real second-order effect, not noise:
//     g5 read independently through Earth/Jupiter/Uranus: +1160/+1181/+1196
//     ppm; g6 +1016 ppm. O((m/M)²) secular contributions scale as M⁰
//     (n·(m/M)² → λ²·λ⁻² per mode; GI-enhanced for the giant pair), so a
//     mode with second-order share s responds as M^(1−s): measured
//     s(g5) ≈ 11.8%, s(g6) ≈ 10.2% — matching the known Brouwer–van Woerkom
//     second-order magnitude for g5 (~13%). The L-L matrix scaling (the
//     earlier static check) is exact BY CONSTRUCTION first-order and cannot
//     see this; the dynamical run was the point of W5.
//   CONSEQUENCE FOR THE 405-kyr RULER: the g2−g5 beat's controlled ratio is
//     0.98847 for λ = 0.99 → beat ∝ M^1.154 (g2 scales fully, g5 partially;
//     the arithmetic closes: 0.99·g2 − 0.9912·g5 reproduces the measured
//     beat deviation exactly). P_405 ∝ M^−1.154, i.e. the ruler is ~15%
//     MORE mass-sensitive than the first-order 1/M statement — same central
//     μ, tighter bound (±0.07 → ~±0.061) IF adopted; owner decision for the
//     paper. Exponent measured at the J2000 configuration.
//   LINEARITY CONFIRMED (δ = 0.5% rerun, same twin control, -d50 dumps):
//     per-mode non-scaling shares identical across step sizes — s(g5)
//     11.70% vs 11.69% (Jupiter), 11.79/11.83 (Uranus), 11.42/11.49
//     (Earth); s(g6) 10.07% vs 10.06%; s(g8) 5.44% vs 5.39%; own modes
//     g2/g4 at 21/43 ppm. Beat exponent 1.152 (δ=0.5%) vs 1.154 (δ=1%) →
//     P_405 ∝ M^−(1.153 ± 0.002) at the J2000 configuration.
//
// Usage:
//   node tools/explore/w5-gm-ramp.mjs --run        # integrate + window dumps (~2 h)
//   node tools/explore/w5-gm-ramp.mjs --run-ref    # constant-mass TWIN, same span (~2 h)
//   node tools/explore/w5-gm-ramp.mjs --analyze    # NAFF all windows + (controlled) verdict
//   node tools/explore/w5-gm-ramp.mjs --smoke      # 2-body adiabat self-test (seconds)
// Dumps: tools/explore/w5-gm-ramp-w{0,1}.local.json + naff mode tables (gitignored)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, GM_SUN, NAMES, gmOf } from './j2000-state.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const YR = 365.25 * 86400;
const DT = 2 * 86400;
const DELTA = parseFloat(process.env.W5_DELTA || '0.01');   // fractional mass loss (W5_DELTA overrides for the linearity check)
const SUF = DELTA === 0.01 ? '' : `-d${Math.round(DELTA * 1e4)}`;   // dump suffix for non-default δ (the -ref twin is δ-independent)
const T_RAMP0 = 4.0e6 * YR, T_RAMP1 = 4.5e6 * YR, T_END = 8.5e6 * YR;
const CADENCE_YR = 200;
const D2R = Math.PI / 180;
const LASKAR_G = { g1: 5.5965, g2: 7.4555, g3: 17.3711, g4: 17.9159, g5: 4.2575, g6: 28.2455, g7: 3.0876, g8: 0.6730 };

const smoother = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
const gmSunOfT = (tSec) => GM_SUN * (1 - DELTA * smoother((tSec - T_RAMP0) / (T_RAMP1 - T_RAMP0)));

// Barycentric seed, exactly as lattice-long-window-test.mjs builds it:
// bodies = [sun@origin, planets at HZ]; shift all by the barycentre.
function seed() {
  const gms = [GM_SUN, ...NAMES.map(gmOf)], n = gms.length;
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((p) => ({ r: HZ[p].slice(0, 3), v: HZ[p].slice(3, 6) }))];
  const M = gms.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gms[i] * b.r[c], 0) / M);
  const vB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gms[i] * b.v[c], 0) / M);
  const Y0 = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gms, Y0 };
}

// Osculating {w, Om, e, inc (deg), a (km)} from heliocentric r, v with μ = GM☉(t) + GM_p
// — the oscul() of lattice-long-window-test.mjs, ecliptic readout (identity rotation).
function oscul(r, v, mu) {
  const hv = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const rn = Math.hypot(...r);
  const ev = [0, 1, 2].map((c) => (v[(c + 1) % 3] * hv[(c + 2) % 3] - v[(c + 2) % 3] * hv[(c + 1) % 3]) / mu - r[c] / rn);
  const hn = Math.hypot(...hv), inc = Math.acos(hv[2] / hn);
  const Om = Math.atan2(hv[0], -hv[1]);
  const en = Math.hypot(...ev);
  let om = Math.acos(Math.max(-1, Math.min(1, (Math.cos(Om) * ev[0] + Math.sin(Om) * ev[1]) / en)));
  if (ev[2] < 0) om = 2 * Math.PI - om;
  if (inc < 1e-6) om = Math.atan2(ev[1], ev[0]) - Om;
  const a = 1 / (2 / rn - (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) / mu);
  return { w: (Om + om) / D2R, Om: Om / D2R, e: en, inc: inc / D2R, a };
}

const mkStore = () => ({ t: [], gm: [], elements: Object.fromEntries(NAMES.map((k) => [k, { w: [], Om: [], e: [], inc: [], a: [] }])) });

function run(ref = false) {
  // ref = the constant-mass TWIN over the same span and windows: it measures the
  // system's NATURAL window-to-window frequency wander (chaotic diffusion +
  // quasi-periodic modulation, ~1e3 ppm/5 Myr class — measured), which the
  // ratio-of-ratios in analyze() removes to first order.
  const { gms, Y0 } = seed();
  const sim = makeWH({ gms, Y0, dt: DT, gr: false, order: 2, gmSunOfT: ref ? null : gmSunOfT });
  const stepsPerSample = Math.round(CADENCE_YR * YR / DT);
  const nSamples = Math.floor(T_END / (CADENCE_YR * YR));
  const w0 = mkStore(), w1 = mkStore();
  const t0 = Date.now();
  for (let s = 0; s <= nSamples; s++) {
    if (s > 0) sim.step(stepsPerSample);
    const tYr = sim.t / YR;
    const store = tYr <= T_RAMP0 / YR ? w0 : tYr >= T_RAMP1 / YR ? w1 : null;
    if (store) {
      store.t.push(tYr); store.gm.push(sim.gm / GM_SUN);
      NAMES.forEach((p, i) => { const { r, v } = sim.helio(i + 1); const o = oscul(r, v, sim.gm + gms[i + 1]); const E = store.elements[p]; E.w.push(o.w); E.Om.push(o.Om); E.e.push(o.e); E.inc.push(o.inc); E.a.push(o.a); });
    }
    if (s % 500 === 0) process.stdout.write(`\r${(tYr / 1e6).toFixed(2)} Myr  (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
  }
  for (const [label0, S] of [['w0', w0], ['w1', w1]]) {
    const label = ref ? `${label0}-ref` : `${label0}${SUF}`;
    const tBase = S.t[0];
    const out = { years: Math.round(S.t[S.t.length - 1] - tBase), integrator: 'wh', dt: DT / 86400, gr: 0, frame: 'ecliptic', sampleDays: CADENCE_YR * 365.25, gmOverGm0: S.gm[0], t: S.t.map((y) => y - tBase), elements: {} };
    for (const k of NAMES) { const { a, ...rest } = S.elements[k]; out.elements[k] = rest; }
    writeFileSync(`${HERE}w5-gm-ramp-${label}.local.json`, JSON.stringify(out));
    const aM = Object.fromEntries(NAMES.map((k) => [k, S.elements[k].a.reduce((s2, a2, i2) => s2 + a2 * S.gm[i2], 0) / S.t.length]));
    writeFileSync(`${HERE}w5-gm-ramp-${label}-am.local.json`, JSON.stringify({ gmOverGm0: S.gm[0], meanAMkm: aM }));
    console.log(`\nwrote w5-gm-ramp-${label}.local.json (${S.t.length} samples, M/M0 = ${S.gm[0]})`);
  }
}

function analyze() {
  const { existsSync } = { existsSync: (f) => { try { readFileSync(f); return true; } catch { return false; } } };
  const labels = [`w0${SUF}`, `w1${SUF}`, ...(existsSync(`${HERE}w5-gm-ramp-w0-ref.local.json`) ? ['w0-ref', 'w1-ref'] : [])];
  for (const label of labels) {
    if (!existsSync(`${HERE}w5-gm-ramp-${label}-modes.local.json`))
      execFileSync('node', [`${HERE}naff-frequencies.mjs`, `file=${HERE}w5-gm-ramp-${label}.local.json`, 'terms=8', `out=${HERE}w5-gm-ramp-${label}-modes.local.json`], { stdio: 'ignore' });
  }
  const M0 = JSON.parse(readFileSync(`${HERE}w5-gm-ramp-w0${SUF}-modes.local.json`, 'utf8')).modes;
  const M1 = JSON.parse(readFileSync(`${HERE}w5-gm-ramp-w1${SUF}-modes.local.json`, 'utf8')).modes;
  const REF = labels.length === 4 ? {
    M0: JSON.parse(readFileSync(`${HERE}w5-gm-ramp-w0-ref-modes.local.json`, 'utf8')).modes,
    M1: JSON.parse(readFileSync(`${HERE}w5-gm-ramp-w1-ref-modes.local.json`, 'utf8')).modes,
  } : null;
  const A0 = JSON.parse(readFileSync(`${HERE}w5-gm-ramp-w0${SUF}-am.local.json`, 'utf8'));
  const A1 = JSON.parse(readFileSync(`${HERE}w5-gm-ramp-w1${SUF}-am.local.json`, 'utf8'));
  const asy = (m) => m.omegaRadPerYr / D2R * 3600, amp = (m) => Math.hypot(m.re, m.im);
  const nearestG = (f) => Object.entries(LASKAR_G).reduce((b, [k2, v2]) => (Math.abs(f - v2) < Math.abs(f - b[1]) ? [k2, v2] : b), ['?', 1e9])[0];
  const match = (table, f) => table.reduce((b, m) => (Math.abs(asy(m) - f) < Math.abs(asy(b) - f) ? m : b), table[0]);
  console.log(`prediction: every mode frequency ratio = ${(1 - DELTA).toFixed(6)}; amplitudes unchanged`);
  if (REF) console.log('controlled: R = (f1/f0)_ramp ÷ (f1/f0)_twin — the twin removes the natural window-to-window wander');
  console.log('\nplanet    leading mode   f(W0) ″/yr   f(W1) ″/yr    ratio       dev ppm   amp(W1)/amp(W0)' + (REF ? '   R (controlled)   dev ppm' : ''));
  const lead = {};
  for (const p of NAMES) {
    const m0 = M0[p].z[0];
    // match W1's mode to W0's leading one by frequency (the 1% shift is far
    // smaller than mode separations; amplitude rank can swap for blends)
    const m1 = match(M1[p].z, asy(m0) * (1 - DELTA));
    const ratio = asy(m1) / asy(m0), dev = (ratio / (1 - DELTA) - 1) * 1e6;
    lead[p] = { f0: asy(m0), f1: asy(m1) };
    let refCols = '';
    if (REF) {
      const r0 = match(REF.M0[p].z, asy(m0)), r1 = match(REF.M1[p].z, asy(m0));
      const R = ratio / (asy(r1) / asy(r0)), devR = (R / (1 - DELTA) - 1) * 1e6;
      lead[p].r0 = asy(r0); lead[p].r1 = asy(r1);
      refCols = ` ${R.toFixed(7).padStart(14)} ${devR.toFixed(1).padStart(9)}`;
    }
    console.log(`${p.padEnd(9)} ${nearestG(asy(m0)).padEnd(12)} ${asy(m0).toFixed(6).padStart(11)} ${asy(m1).toFixed(6).padStart(12)} ${ratio.toFixed(7).padStart(11)} ${dev.toFixed(1).padStart(9)}   ${(amp(m1) / amp(m0)).toFixed(5)}${refCols}`);
  }
  const b0 = lead.venus.f0 - lead.jupiter.f0, b1 = lead.venus.f1 - lead.jupiter.f1;
  console.log(`\ng2−g5 beat (405-kyr ruler): ${b0.toFixed(6)} → ${b1.toFixed(6)} ″/yr   ratio ${(b1 / b0).toFixed(7)}   dev ${((b1 / b0 / (1 - DELTA) - 1) * 1e6).toFixed(1)} ppm`);
  if (REF) {
    const c0 = lead.venus.r0 - lead.jupiter.r0, c1 = lead.venus.r1 - lead.jupiter.r1;
    const Rb = (b1 / b0) / (c1 / c0);
    console.log(`g2−g5 beat controlled R: ${Rb.toFixed(7)}   dev ${((Rb / (1 - DELTA) - 1) * 1e6).toFixed(1)} ppm   (twin wander ratio ${(c1 / c0).toFixed(7)})`);
  }
  console.log(`\nadiabatic invariant (windowed-mean a·M, W1/W0; prediction 1):`);
  for (const p of NAMES) console.log(`  ${p.padEnd(9)} ${(A1.meanAMkm[p] / A0.meanAMkm[p]).toFixed(9)}`);
}

const arg = process.argv[2] || '--analyze';
if (arg === '--run') run(false);
else if (arg === '--run-ref') run(true);
else if (arg === '--analyze') analyze();
else if (arg === '--smoke') {
  const gmE = gmOf('earth'); const Y0 = new Float64Array(12);
  for (let c = 0; c < 3; c++) { Y0[3 + c] = HZ.earth[c]; Y0[9 + c] = HZ.earth[3 + c]; }
  const T = 1e4 * YR, ramp = (t) => GM_SUN * (1 - DELTA * Math.min(Math.max(t / T, 0), 1));
  const sim = makeWH({ gms: [GM_SUN, gmE], Y0, dt: DT, gmSunOfT: ramp });
  const el = () => { const { r, v } = sim.helio(1); return oscul(r, v, sim.gm + gmE); };
  const b = el(); sim.step(Math.round(T / DT)); const a = el();
  console.log(`a·M ratio ${(a.a * sim.gm / (b.a * GM_SUN)).toFixed(9)} (→1) · Δe ${(a.e - b.e).toExponential(2)} (→0) · a ratio ${(a.a / b.a).toFixed(8)} (→${(1 / (1 - DELTA)).toFixed(8)})`);
} else console.log('usage: --run | --analyze | --smoke');
