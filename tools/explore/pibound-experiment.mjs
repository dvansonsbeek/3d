#!/usr/bin/env node
// THE APSIDAL-RATE EXPERIMENT (owner's J/S question, 2026-08-31): hold Jupiter's
// perihelion on +1746.5 ″/cy and Saturn's on −3421.9 ″/cy — the model's lattice
// lines (8H/39 and −8H/65 with the equatorial projection, docs/Jupiter1800.png,
// docs/saturn-3400.png) — PERMANENTLY, inside the full N-body, with the work-free
// pibound steering force (nbody-forces.mjs). Measures:
//   1. the achieved mean dϖ/dt over the span (OLS on the unwrapped angle) vs target;
//   2. the force needed — overall AND in the 1800–2100-class first 300 yr
//      (in-window the free dynamics already rides the line, so it should start ≈ 0);
//   3. e_J / e_S evolution vs control (steering ϖ leaves e free — the J/S
//      eccentricity exchange now runs at the imposed Δϖ̇ ≈ 5,168 ″/cy);
//   4. the rest of the system vs control (every planet's z carries g5/g6 forced
//      terms — re-timing Jupiter and Saturn's apses rewires the secular web);
//   5. ΔL_total — a pure apse rotation at fixed a, e, i is L-neutral, so unlike
//      ebound NO reservoir should be needed (verified, not assumed).
//
//   node tools/explore/pibound-experiment.mjs [years=60000] [tau=2] [dt=2]
//        [rateJ=1746.5] [rateS=-3421.9]   (″/cy, ecliptic ϖ̇ targets)
//        [mode=js|all] [gate=0]
//   mode=all — ROUTE B, the gated all-planet bound: every planet steered to its
//   model line (periFrames.<p>.projectedRa@2000 from the regression fixture —
//   lattice + equatorial projection; Earth: the H/3 lattice line
//   1296000·100/(H/3) = 1159.5 ″/cy, no projection defined for Earth's chain),
//   force exactly ZERO before `gate` years (default 300 in mode=all): the bound
//   rides the free path through the observed era and latches on beyond it.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { FORCES, setPiboundTargets, setEboundTarget, setEboundLaw5, osculTheta, eboundDiag } from './nbody-forces.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const YEARS = parseFloat(KV.years || '60000'), TAU = parseFloat(KV.tau || '2'), DT = parseFloat(KV.dt || '2');
const RATE_J = parseFloat(KV.rateJ || '1746.5'), RATE_S = parseFloat(KV.rateS || '-3421.9');   // ″/cy
const MODE = KV.mode || 'js', GATE = parseFloat(KV.gate || (MODE === 'all' ? '300' : '0'));
// ebound=1 — also hold Earth's e on the H/3 law (Law-5-distributed): MEASURED
// NECESSARY for Earth's apse line: without it Earth's free e dives to ~0.004 at
// +26 kyr and a near-circular orbit has no controllable perihelion (bounded mean
// read −4403 vs target +1160). The model's e-law and ϖ-law need each other.
const EBOUND = KV.ebound === '1';
const ASPC = Math.PI / 180 / 3600 / 100;   // ″/cy → rad/yr divisor base: ″→rad, /cy→/yr
const DAY = 86400, GM_S = TL.GM_SUN, GM_EM = 403504.747706457;
const names = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const gmOf = (k) => (k === 'earth' ? GM_EM : GM_S / TL.massRatioDE440[k]);
const HZ = {
  mercury: [-1.946172635585e+7, -6.691327526352e+7, -3.679854343750e+6, 3.699499185728e+1, -1.116441592562e+1, -4.307628118658e+0],
  venus:   [-1.074564940522e+8, -4.885014975873e+6, 6.135634299718e+6, 1.381906029263e+0, -3.514029517645e+1, -5.600423382821e-1],
  earth:   [-2.650257688971e+7, 1.446939556280e+8, -1.704331902042e+2, -2.978644078798e+1, -5.478176822344e+0, 4.197340759138e-5],
  mars:    [2.080481406418e+8, -2.007052628224e+6, -5.156288959273e+6, 1.162672436605e+0, 2.629606453968e+1, 5.222970066951e-1],
  jupiter: [5.985675835979e+8, 4.396047284920e+8, -1.522686065302e+7, -7.909837688567e+0, 1.115613309734e+1, 1.308626770728e-1],
  saturn:  [9.583851242197e+8, 9.828564572112e+8, -5.521304749180e+7, -7.432021997941e+0, 6.735913712660e+0, 1.782497576763e-1],
  uranus:  [2.158975019759e+9, -2.054625247237e+9, -3.562548941967e+7, 4.637024235952e+0, 4.627657581334e+0, -4.289175880417e-2],
  neptune: [2.515046428529e+9, -3.738714513276e+9, 1.903227194039e+7, 4.465902049825e+0, 3.076627073142e+0, -1.660633585828e-1],
};
function build() {
  const gms = [GM_S, ...names.map(gmOf)], n = gms.length;
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => ({ r: HZ[k].slice(0, 3), v: HZ[k].slice(3, 6) }))];
  const Mt = gms.reduce((s, x) => s + x, 0), rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mt), vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mt);
  const Y0 = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gms, Y0 };
}
const oscul = (r, v, mu) => {
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]], rn = Math.hypot(...r);
  const e = Math.hypot((v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn, (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn, (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn);
  const a = 1 / (2 / rn - (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) / mu);
  return { e, a };
};
// θ0 targets from the J2000 osculating states themselves
const th0 = {};
for (const k of names) th0[k] = osculTheta(HZ[k].slice(0, 3), HZ[k].slice(3, 6), GM_S + gmOf(k));
const REF_A = { mercury: 0.387, venus: 0.723, earth: 1.0, mars: 1.524, jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07 };
// model lines (″/cy, ecliptic): periFrames.<p>.projectedRa@2000 from the fixture; Earth = H/3 lattice
const RATES = {};
if (MODE === 'all') {
  const fixRaw = require(ROOT + 'packages/fixtures/regression/script-js.json');
  const flat = {}; (function walk(o) { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v); else flat[k] = v; } })(fixRaw);
  for (const p of names) RATES[p] = p === 'earth' ? 1296000 * 100 / (TL.H / 3) : flat['periFrames.' + p + '.projectedRa@2000'];
  console.log('targets (″/cy):', names.map((p) => `${p} ${RATES[p].toFixed(1)}`).join('  '));
} else { RATES.jupiter = RATE_J; RATES.saturn = RATE_S; }
const BOUND_SET = MODE === 'all' ? names : ['jupiter', 'saturn'];

function run(withForce) {
  const { gms, Y0 } = build();
  setPiboundTargets(BOUND_SET.map((p) => ({   // fresh objects each run — filter/latch state lives on them
    aRefAU: REF_A[p], theta0: th0[p], rateRadPerYr: RATES[p] * ASPC, gateYr: GATE || undefined,
  })));
  const extraForces = [];
  if (EBOUND) {
    setEboundTarget((year) => OE.computeEccentricityEarth(year));
    const dVal = { mercury: 21, venus: 34, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
    const wRaw = names.map((k) => (k === 'earth' ? 0 : Math.sqrt(TL.massFraction[k]) * Math.pow(TL.derived[k].orbitDistance, 1.5) / Math.sqrt(dVal[k])));
    const wSum = wRaw.reduce((s, x) => s + x, 0);
    setEboundLaw5(names.map(gmOf), wRaw.map((x) => x / wSum));
  }
  if (withForce && EBOUND) extraForces.push(FORCES.eboundlaw5(TAU));
  eboundDiag.maxAccel = 0; eboundDiag.sumAccel = 0; eboundDiag.samples = 0;
  if (withForce) extraForces.push(FORCES.pibound(TAU));
  const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces });
  const L0 = sim.angularMomentum(), Ln0 = Math.hypot(...L0);
  const trackIdx = BOUND_SET.map((p) => [names.indexOf(p) + 1, p]);
  const rows = [], thetaSeries = { tYr: [] };
  const prev = {}, wraps = {};
  for (const p of BOUND_SET) { thetaSeries[p] = []; prev[p] = th0[p]; wraps[p] = 0; }
  const steps = Math.round(YEARS * 365.25 / DT), everyTh = Math.round(200 * 365.25 / DT), every = Math.round(1000 * 365.25 / DT);
  let win300 = null;
  for (let s = 0; s <= steps; s++) {
    const tYr = s * DT / 365.25;
    if (s % everyTh === 0) {
      for (const [i, k] of trackIdx) {
        const h = sim.helio(i);
        let th = osculTheta(h.r, h.v, GM_S + gms[i]);
        while (th - prev[k] > Math.PI) th -= 2 * Math.PI;
        while (th - prev[k] < -Math.PI) th += 2 * Math.PI;
        wraps[k] += th - prev[k]; prev[k] = th < -Math.PI ? th + 2 * Math.PI : th > Math.PI ? th - 2 * Math.PI : th;
        thetaSeries[k].push(wraps[k]);
      }
      thetaSeries.tYr.push(tYr);
    }
    if (s % every === 0) {
      const row = { t: tYr };
      for (const [i, k] of names.entries()) { const h = sim.helio(i + 1); row[k] = oscul(h.r, h.v, GM_S + gms[i + 1]); }
      rows.push(row);
    }
    sim.step();
    if (win300 === null && tYr >= 300) win300 = { mean: eboundDiag.sumAccel / Math.max(1, eboundDiag.samples), max: eboundDiag.maxAccel };
  }
  const L1 = sim.angularMomentum();
  return { rows, thetaSeries, win300, dL: Math.hypot(L1[0] - L0[0], L1[1] - L0[1], L1[2] - L0[2]) / Ln0, diag: { ...eboundDiag } };
}
const ols = (t, y) => {   // slope in rad/yr → ″/cy
  const n = t.length, mt = t.reduce((s, x) => s + x, 0) / n, my = y.reduce((s, x) => s + x, 0) / n;
  let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (t[i] - mt) * (y[i] - my); den += (t[i] - mt) ** 2; }
  return num / den / ASPC;
};
console.log(`control run (free dynamics, 1PN on), then pibound mode=${MODE} gate=${GATE} yr (τ = ${TAU} kyr), ${YEARS / 1000} kyr forward…`);
const ctl = run(false), exp = run(true);
for (const k of BOUND_SET) {
  console.log(`${k.padEnd(8)}: target ϖ̇ ${String(RATES[k].toFixed(1)).padStart(8)} ″/cy | free mean ${String(ols(ctl.thetaSeries.tYr, ctl.thetaSeries[k]).toFixed(1)).padStart(9)} | bounded mean ${String(ols(exp.thetaSeries.tYr, exp.thetaSeries[k]).toFixed(1)).padStart(9)}`);
}
console.log('\n  kyr   e_Ma free  e_Ma bnd   e_S free  e_S bnd   | Δe Me      Δe V       Δe E       Δe J       Δe U       Δe N');
for (const [i, r] of exp.rows.entries()) {
  if (r.t % 10000 !== 0) continue;
  const c = ctl.rows[i];
  const de = (k) => (r[k].e - c[k].e).toExponential(1).padStart(9);
  console.log(`${String(r.t / 1000).padStart(5)}    ${c.mars.e.toFixed(4)}    ${r.mars.e.toFixed(4)}    ${c.saturn.e.toFixed(4)}   ${r.saturn.e.toFixed(4)}   |${de('mercury')} ${de('venus')} ${de('earth')} ${de('jupiter')} ${de('uranus')} ${de('neptune')}`);
}
console.log(`\nforce: FIRST 300 YR mean |a| ${(exp.win300.mean * 1e3).toExponential(2)} m/s², max ${(exp.win300.max * 1e3).toExponential(2)} m/s²  (the in-window footprint)`);
console.log(`       full span mean |a| ${(exp.diag.sumAccel / Math.max(1, exp.diag.samples) * 1e3).toExponential(2)} m/s², max ${(exp.diag.maxAccel * 1e3).toExponential(2)} m/s²`);
console.log(`total angular momentum: control |ΔL|/L ${ctl.dL.toExponential(1)}; bounded ${exp.dL.toExponential(1)} — apse rotation should be L-neutral`);
