#!/usr/bin/env node
// K6 — THE MASS-COUNTERFACTUAL DEMONSTRATION (plan 02, owner 2026-09-07).
//
// The holistic property, measured end to end: the planets the simulator
// renders hang off the governed artifact, the artifact hangs off the
// N-body engine, and the engine hangs off the CONSTANTS — so changing one
// planet's mass must propagate to every other planet's element drifts.
// DE440 is a fit and La2010 is someone else's integration; neither can
// answer "what if Jupiter were 1% heavier". This model can, and this probe
// measures the answer.
//
// WHAT IT DOES (no hashed pipeline file is touched — the probe imports the
// one-home integrator and seed directly and re-derives its own readout):
//   1. BASELINE: the 1800–2100 window run exactly as the artifact pipeline
//      does it (WH order 2, dt 2 d, 1PN on, HZ J2000 seed, DE440 masses) —
//      window dϖ/dt per planet must CLOSE on the artifact's banked
//      windowRatesArcsecCy.gr (tolerance max(1.5, 2.5e-4·|rate|) ″/cy:
//      same integrator, an INDEPENDENT readout implementation — the
//      relative floor covers the near-stationary-apse hypersensitivity,
//      Neptune's 9,100 ″/cy window rate moves ~1.8 under sampling-grid
//      differences alone, 0.02% relative).
//   2. COUNTERFACTUAL: the same run with GM_Jupiter × (1 + 1%); every
//      planet's window rate response Δϖ̇ is measured.
//   3. VERDICT: Mercury's response is checked against the standard
//      secular-theory expectation (EXTERNAL REFERENCE LABEL, never an
//      input): Jupiter contributes ≈ 153.6 ″/cy of Mercury's Newtonian
//      precession (first-order Laplace–Lagrange share, doc 13), so +1%
//      Jupiter ⇒ ≈ +1.5 ″/cy — band ±50% (window rate vs secular share,
//      short-window periodic leakage).
//
// Run: node tools/explore/k6-mass-counterfactual.mjs   (read-only; ~2–6 min)

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, gmOf, GM_SUN, AU_KM } from './j2000-state.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { computeOsculatingElements } = require(path.join(ROOT, 'packages', 'physics', 'src', 'planets', 'keplerian-chain.cjs'));
const art = require(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'));

const DT_DAYS = 2, SAMPLE_DAYS = 10, HALF_YEARS = 300;   // the pipeline's window-run configuration
const WINDOW = [-200, 100];                               // the banked 1800–2100 window, years from J2000
const CF_PLANET = 'jupiter', CF_SCALE = 1.01;

function runWindow(massScale) {
  const gms = [GM_SUN, ...NAMES.map((k) => gmOf(k) * (k === CF_PLANET ? massScale : 1))];
  const n = gms.length, Mtot = gms.reduce((s, x) => s + x, 0);
  // barycentric Y0 from the SAME heliocentric seed (the physical input),
  // reduced with THIS scenario's masses — the barycenter is derived, never seeded
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((k) => ({ r: HZ[k].slice(0, 3), v: HZ[k].slice(3, 6) }))];
  const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mtot);
  const vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mtot);
  const mkY0 = () => {
    const Y = new Float64Array(6 * n);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y[3 * i + c] = st[i].r[c] - rB[c]; Y[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
    return Y;
  };
  const DAY_S = 86400, YR_D = 365.25;
  const series = Object.fromEntries(NAMES.map((k) => [k, { t: [], w: [] }]));
  const sampleEvery = Math.round(SAMPLE_DAYS / DT_DAYS);
  for (const dir of [1, -1]) {
    const sim = makeWH({ gms, Y0: mkY0(), dt: dir * DT_DAYS * DAY_S, gr: true, order: 2 });
    const steps = Math.round((HALF_YEARS * YR_D) / DT_DAYS);
    for (let s = 0; s < steps; s += sampleEvery) {
      sim.step(sampleEvery);
      const tYr = sim.t / DAY_S / YR_D;
      for (let i = 1; i < n; i++) {
        const { r, v } = sim.helio(i);
        const el = computeOsculatingElements(r, v, GM_SUN + gms[i], AU_KM);
        series[NAMES[i - 1]].t.push(tYr);
        series[NAMES[i - 1]].w.push(el.lonPeriEclipticDeg);
      }
    }
  }
  // window OLS on the unwrapped ϖ series (both directions merged, sorted)
  const rates = {};
  for (const k of NAMES) {
    const idx = series[k].t.map((t, i) => [t, i]).filter(([t]) => t >= WINDOW[0] && t <= WINDOW[1])
      .sort((a, b) => a[0] - b[0]).map(([, i]) => i);
    const x = idx.map((i) => series[k].t[i]);
    const raw = idx.map((i) => series[k].w[i]);
    const y = [raw[0]];
    for (let i = 1; i < raw.length; i++) y.push(y[i - 1] + (((raw[i] - y[i - 1]) % 360) + 540) % 360 - 180);
    const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
    rates[k] = (sxy / sxx) * 3600 * 100;   // deg/yr → ″/cy
  }
  return rates;
}

console.log('K6 — mass counterfactual: GM_' + CF_PLANET + ' × ' + CF_SCALE + '  (WH o2, dt 2 d, 1PN, 1800–2100 window)\n');
const t0 = Date.now();
const base = runWindow(1);
console.log(`baseline run: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const t1 = Date.now();
const cf = runWindow(CF_SCALE);
console.log(`counterfactual run: ${((Date.now() - t1) / 1000).toFixed(0)} s\n`);

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };

console.log('planet    banked gr   baseline    Δ(closure)   counterfactual   RESPONSE Δϖ̇');
for (const k of NAMES) {
  const banked = art.windowRatesArcsecCy.gr[k];
  const resp = cf[k] - base[k];
  console.log(
    k.padEnd(9) + banked.toFixed(1).padStart(9) + base[k].toFixed(1).padStart(11) +
    (base[k] - banked).toFixed(2).padStart(12) + cf[k].toFixed(1).padStart(15) + (resp >= 0 ? '  +' : '  ') + resp.toFixed(3).padStart(8) + ' ″/cy');
}
console.log();

// 1) closure: the baseline reproduces the artifact (scene elements read the
//    artifact, the artifact reads the constants — the causal chain is closed)
let worst = '', worstRatio = 0;
for (const k of NAMES) {
  const banked = art.windowRatesArcsecCy.gr[k];
  const tol = Math.max(1.5, 2.5e-4 * Math.abs(banked));
  const ratio = Math.abs(base[k] - banked) / tol;
  if (ratio > worstRatio) { worstRatio = ratio; worst = `${k} |Δ| ${Math.abs(base[k] - banked).toFixed(3)} (tol ${tol.toFixed(2)})`; }
}
check('baseline closes on the banked artifact window rates', worstRatio < 1, `worst: ${worst} ″/cy`);

// 2) the counterfactual RESPONDS — every planet's apsidal drift moves
const respondents = NAMES.filter((k) => Math.abs(cf[k] - base[k]) > 0.05);
check('every planet responds to the mass change', respondents.length === NAMES.length, `${respondents.length}/8 above 0.05 ″/cy`);

// 3) Mercury's response sits on the secular-theory expectation (external
//    reference label: Jupiter's first-order share of Mercury's Newtonian
//    precession ≈ 153.6 ″/cy ⇒ +1% ≈ +1.54 ″/cy; band ±50%)
const dMerc = cf.mercury - base.mercury;
check('Mercury response ≈ +1% of Jupiter\'s L-L share', dMerc > 0.77 && dMerc < 2.31, `Δϖ̇ ${dMerc.toFixed(3)} ″/cy vs ≈ +1.54 expected`);

console.log(failed ? '\nFAIL — the counterfactual chain is broken.' : '\nPASS — mass → engine → window rates: the counterfactual chain is CLOSED.');
process.exit(failed ? 1 : 0);
