#!/usr/bin/env node
// THE BOUNDED-ECCENTRICITY EXPERIMENT (owner's proposal, 2026-08-31): hold Earth's
// eccentricity on the model's H/3 line inside the full N-body, with the work-free
// feedback component (nbody-forces.mjs `ebound`), and MEASURE what the claim costs:
//   1. does e follow the H/3 line through the +26-kyr origin-pass (where the free
//      dynamics goes to e ≈ 0.0026 and the line stays ≥ base′/2 = 0.0078)?
//   2. the acceleration the component needs (mean / max, m/s²) — compare with the
//      ranging bounds on anomalous planetary accelerations (~1e-13 m/s² class);
//   3. the semi-major-axis leak of Earth (the force is work-free; the leak should be ~0);
//   4. the TOTAL angular momentum change of the system — the reservoir the bound
//      requires (the model's own candidate reservoir is the Law-5 balance);
//   5. the side effects on the other planets' eccentricities vs a control run.
//
//   node tools/explore/ebound-experiment.mjs [years=60000] [tau=2] [dt=2]
//        [mode=single|pair|law5]
//
// RESULTS (60-kyr runs; the full price lists live in the nbody-forces.mjs
// headers): 1. YES — e 0.0075 at the pass vs free 0.0026, tracking the line to
// ~1e-4 elsewhere; 2. mean 2.6e-10 / max 6.5e-10 m/s² (≈ 0 in the present
// epoch — the 1800–2100 audit is bit-identical with the force on); 3. Δa_Earth
// ≤ 240 m; 4. |ΔL|/L 8.4e-8 uncoupled → 7.1e-10 mode=pair (Saturn absorbs,
// Δe_S ≤ 1.1e-5) → 1.5e-10 mode=law5 (distributed by √m·a^1.5/√d: giants carry
// 99.9 %, each Δe ≤ 3e-5); 5. Venus Δe 3.2e-3, Mars 2.1e-3 within 50 kyr
// (1.7e-2 / 8.3e-3 at 160 kyr — ebound-shapes-run.mjs). Doc 109 §12.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { FORCES, setEboundTarget, setEboundPairMasses, setEboundLaw5, eboundDiag } from './nbody-forces.mjs';
import { HZ, NAMES, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const YEARS = parseFloat(KV.years || '60000'), TAU = parseFloat(KV.tau || '2'), DT = parseFloat(KV.dt || '2');
const DAY = 86400, GM_S = TL.GM_SUN;
const names = NAMES;
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
setEboundTarget((year) => OE.computeEccentricityEarth(year));

function run(withForce) {
  const { gms, Y0 } = build();
  eboundDiag.maxAccel = 0; eboundDiag.sumAccel = 0; eboundDiag.samples = 0;
  setEboundPairMasses(gmOf('earth'), gmOf('saturn'));
  // Law-5 shares: w_j = √m_j · a_j^(3/2) / √d_j over the seven non-Earth planets
  const dVal = { mercury: 21, venus: 34, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
  const wRaw = names.map((k) => (k === 'earth' ? 0 : Math.sqrt(TL.massFraction[k]) * Math.pow(TL.derived[k].orbitDistance, 1.5) / Math.sqrt(dVal[k])));
  const wSum = wRaw.reduce((s, x) => s + x, 0);
  setEboundLaw5(names.map(gmOf), wRaw.map((x) => x / wSum));
  const force = withForce === 'law5' ? [FORCES.eboundlaw5(TAU)] : withForce === 'pair' ? [FORCES.eboundpair(TAU)] : withForce ? [FORCES.ebound(TAU)] : [];
  const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces: force });
  const L0 = sim.angularMomentum(), Ln0 = Math.hypot(...L0);
  const rows = [];
  const steps = Math.round(YEARS * 365.25 / DT), every = Math.round(1000 * 365.25 / DT);
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) {
      const t = s * DT / 365.25, row = { t };
      for (const [i, k] of [[3, 'earth'], [2, 'venus'], [4, 'mars'], [5, 'jupiter'], [6, 'saturn'], [7, 'uranus'], [8, 'neptune']]) { const h = sim.helio(i); row[k] = oscul(h.r, h.v, GM_S + gms[i]); }
      rows.push(row);
    }
    sim.step();
  }
  const L1 = sim.angularMomentum();
  return { rows, dL: Math.hypot(L1[0] - L0[0], L1[1] - L0[1], L1[2] - L0[2]) / Ln0, diag: { ...eboundDiag } };
}
const MODE = KV.mode || 'single';   // single | pair (Earth↔Saturn) | law5 (distributed by the balance weights)
const MODENAME = { single: 'ebound', pair: 'eboundpair — Earth↔Saturn', law5: 'eboundlaw5 — distributed by the Law-5 weights' };
console.log(`control run (free dynamics, 1PN on), then the bounded run (${MODENAME[MODE]} τ = ${TAU} kyr), ${YEARS / 1000} kyr forward…`);
const ctl = run(false), exp = run(MODE === 'single' ? true : MODE);
console.log('\n  kyr   e target(H/3)   e free    e bounded    Δa_Earth(bounded) m   Venus Δe    Mars Δe   Jupiter Δe   Saturn Δe   Uranus Δe  Neptune Δe');
for (const [i, r] of exp.rows.entries()) {
  if (r.t % 5000 !== 0) continue;
  const c = ctl.rows[i], tgt = OE.computeEccentricityEarth(2000 + r.t);
  const de = (k) => (r[k].e - c[k].e).toExponential(1).padStart(10);
  console.log(`${String(r.t / 1000).padStart(5)}      ${tgt.toFixed(4)}      ${c.earth.e.toFixed(4)}    ${r.earth.e.toFixed(4)}    ${((r.earth.a - c.earth.a)).toExponential(2).padStart(12)}  ${de('venus')} ${de('mars')} ${de('jupiter')} ${de('saturn')} ${de('uranus')} ${de('neptune')}`);
}
console.log(`\nforce used on Earth: mean |a| ${(exp.diag.sumAccel / Math.max(1, exp.diag.samples) * 1e3).toExponential(2)} m/s², max ${(exp.diag.maxAccel * 1e3).toExponential(2)} m/s²   (ranging bounds on anomalous planetary accelerations: ~1e-13 m/s² class)`);
console.log(`total angular momentum: control |ΔL|/L ${ctl.dL.toExponential(1)}; bounded ${exp.dL.toExponential(1)}${MODE !== 'single' ? ' — the coupling should pull this back toward the control (z-torque cancelled; x,y residual remains)' : ' — the reservoir the bound requires'}`);
