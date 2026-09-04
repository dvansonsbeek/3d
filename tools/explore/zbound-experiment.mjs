#!/usr/bin/env node
// THE STABLE UNIVERSE EXPERIMENT (owner's directive 2026-08-31): every planet's
// eccentricity vector held on a LATTICE-COMB shape — z_t(t) = Σ A_k e^{i ω_k t}
// with A_k from the NAFF fit of the model's own free 1-Myr run
// (naff-modes-ecliptic-1000000-gr.local.json) and every ω_k snapped to the
// nearest comb line 2πN/(8H) (spacing 0.48312 ″/yr). This keeps each planet's
// phase moving on its own multi-mode sum — the configuration that avoids the
// Mars resonance killer of the rate bound (pibound: dead at 462 kyr).
//
// PRE-REGISTERED before the first run:
//   S1 stability: no planet's e leaves its free envelope by more than the snap
//      detuning predicts; Mars stays bounded; no NaN at any span we run.
//   S2 price: forces ≤ the detuning authority (~1e-10 m/s² class), zero before
//      the gate; ΔL/L reported.
//   S3 the analytic verdict stands in the numbers: Earth's e-spectrum metronome
//      line appears at 8H/6 = 447 kyr (comb arithmetic), NOT at the free 405 —
//      the measured Mesozoic 405-kyr record referees the comb claim itself.
//
//   node tools/explore/zbound-experiment.mjs [years=60000] [tau=2] [dt=2]
//        [gate=300] [ampMin=3e-4] [maxModes=6] [filter=50]
//
// RESULTS (2026-08-31/09-01): 60 kyr — STABLE, Mars on its free envelope
// (the pibound rate bound had died at 462 kyr), all planets within ~1e-2 of
// free, deviations ranked by snap detuning (Mercury worst at 4 %); in-window
// force exactly 0 (gate); ΔL/L 6.1e-4/60 kyr (θ-channel rectification; Tf
// A/B non-monotonic 8.1e-6 / 3.5e-5 / 6.6e-6 at 50/200/800 yr over 6 kyr —
// needs a real torque compensator, open). 800 kyr (strata variant,
// pibound-strata-run.mjs bound=z) — STABLE full span; spectra ≡ free to ~5 %
// in every line (dominant snaps sub-percent: Earth's g5-forced line IS 8H/9
// at 0.0 %). The 383/405/447 metronome discriminator is NOT resolvable in
// 800 kyr (Δf 2.3e-4/kyr vs resolution 1.25e-3/kyr) — needs ≥ 4.3 Myr;
// bounded runtime scales to ~8 h (86 min per 800 kyr; numeric gradients).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { FORCES, setZboundTargets, setZboundCompensation, eboundDiag } from './nbody-forces.mjs';
import { HZ, NAMES, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const YEARS = parseFloat(KV.years || '60000'), TAU = parseFloat(KV.tau || '2'), DT = parseFloat(KV.dt || '2');
const GATE = parseFloat(KV.gate || '300'), AMP_MIN = parseFloat(KV.ampMin || '3e-4'), MAX_MODES = parseInt(KV.maxModes || '6', 10);
const FILTER_YR = parseFloat(KV.filter || '50');
// comp=1 enables the Law-5-distributed torque compensator — MEASURED HARMFUL
// (8.1e-6 → 1.3e-3 kick-rate, 3.4e-5 low-passed): every planet is itself
// steered, so injected torque is fought by the controllers. Default OFF.
// The ΔL is not a defect: the comb targets' own L_z breathes 3.4e-4 pk-pk over
// the 8H cycle (periodic, bounded) and the measured ΔL follows it.
const COMP = KV.comp === '1';
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
const REF_A = { mercury: 0.387, venus: 0.723, earth: 1.0, mars: 1.524, jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07 };
// Build the snapped-comb targets from the NAFF mode table — or, with lclosed=1,
// from the L-closure-projected table (zbound-l-projection.mjs), whose amplitudes
// are adjusted so the slow beats of Σ Λ e² cancel (the generalized Law 5)
const NAFF = require(ROOT + (KV.lclosed === '1' ? 'tools/explore/zbound-modes-lclosed.local.json' : 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json'));
const COMB_RAD = 2 * Math.PI / (8 * TL.H);   // rad/yr per comb line N
// earth=h3 — THE HYBRID UNIVERSE (owner's test, 2026-09-01): Earth's target is
// the model's own e-law, which is EXACTLY three comb lines:
//   z = base′·e^{iθ} + (base′/4)·e^{i(θ+ψ)} + (base′/4)·e^{i(θ−ψ)},  θ, ψ on H/3
// = N24 (amp base′) + N48 + N0 (amp base′/4 each); winding 24, e ∈ [base′/2, 3base′/2].
// Phases anchored at J2000: θ0 = osculating ϖ, ψ0 from e(2000) = base′(1+cosψ0/2)
// with sinψ0 > 0 (e declining). The other seven stay on their free-fitted comb shapes.
const EARTH_H3 = KV.earth === 'h3';
// targets=model — X2, THE MODEL UNIVERSE (owner-approved 2026-09-02): every
// planet held on the model's OWN doc-55 ecliptic divisor line (single mode:
// amplitude = J2000 osculating e, phase = J2000 ϖ, rate = ±N·comb), Earth on
// the three-line H/3 law. freeEarth=1 releases Earth entirely (no target) —
// the decisive X2 question: does free Earth, inside the model-configured
// system, move at H/3 by gravity alone? PRE-REGISTERED RISK: Jupiter's line
// 8H/39 = 18.84 ″/yr sits ~1 ″/yr from Earth's g3/g4 response frequencies —
// the E15 resonant-pumping neighbourhood, with Earth as the free victim.
const TARGETS_MODE = KV.targets || 'naff';   // naff | model
const FREE_EARTH = KV.freeEarth === '1';
// hold=earth[,venus,…] — C2, THE MINIMAL-(ii) UNIVERSE (X3 assessment): steer
// ONLY the listed planets; everyone else runs free. The zbound force maps
// bodies to targets by osculating a (±12 %), so a filtered target list leaves
// the others untouched. hold=earth earth=h3 = Earth held on the H/3 law inside
// the otherwise-FREE system — reading (ii)'s minimal form. Pre-registered:
// Earth's controller now fights the full free g₅/g₂ forcing (E18's comb
// neighbours only forced comb lines), so the force cost should exceed E18's
// 2.2e-9 m/s²; the strata question runs in pibound-strata-run.mjs hold=earth.
// RESULT (60 kyr): tracking WORKS — ϖ̇ 1159.8 vs line 1159.5, e on the law
// with the familiar ~1e-3 origin-pass undershoot; force mean 6.4e-10 m/s²
// (LOWER than E18's 2.2e-9 — that cost was the seven other controllers), gate
// exact 0 in-window, ΔL 2.1e-7. Free Venus rearranges +8.7e-3 in 60 kyr — the
// leading edge of the 800-kyr Venus pumping (see pibound-strata-run RESULT).
const HOLD = KV.hold ? KV.hold.split(',') : null;
const MODEL_N = { mercury: 11, venus: -6, mars: 36, jupiter: 39, saturn: -65, uranus: 24, neptune: 4 };
// mlines=jupiter:50,saturn:-80,… — override individual model lines (the
// second-sparse-universe certification: the proper line must reappear at the
// same frequency under a DIFFERENT far-line configuration)
if (KV.mlines) for (const kv of KV.mlines.split(',')) { const [p, n] = kv.split(':'); MODEL_N[p] = parseInt(n, 10); }
function earthH3Modes() {
  const OE = require(ROOT + 'tools/lib/orbital-engine.js');
  const base = TL.eccentricityBase;
  const th0 = osculThetaOf('earth');
  const cosPsi = Math.max(-1, Math.min(1, 2 * (OE.computeEccentricityEarth(2000) / base - 1)));
  const psi0 = Math.acos(cosPsi);   // +80.1°: e declining at J2000 ⇒ sinψ0 > 0
  const mk = (N, amp, ang) => ({ w: N * COMB_RAD, N, re: amp * Math.cos(ang), im: amp * Math.sin(ang), wFree: N * COMB_RAD });
  return [mk(24, base, th0), mk(48, base / 4, th0 + psi0), mk(0, base / 4, th0 - psi0)];
}
function osculThetaOf(p) {
  const r = HZ[p].slice(0, 3), v = HZ[p].slice(3, 6), mu = GM_S + gmOf(p), rn = Math.hypot(...r);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  return Math.atan2((v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn, (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn);
}
function osculEOf(p) {
  const r = HZ[p].slice(0, 3), v = HZ[p].slice(3, 6), mu = GM_S + gmOf(p), rn = Math.hypot(...r);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  return Math.hypot((v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn, (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn, (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn);
}
function modelSingleMode(p) {
  const th0 = osculThetaOf(p), e0 = osculEOf(p), N = MODEL_N[p];
  return [{ w: N * COMB_RAD, N, re: e0 * Math.cos(th0), im: e0 * Math.sin(th0), wFree: N * COMB_RAD }];
}
const TARGETS = names
  .filter((p) => !(p === 'earth' && FREE_EARTH) && (!HOLD || HOLD.includes(p)))
  .map((p) => {
    const modes = TARGETS_MODE === 'model'
      ? (p === 'earth' ? earthH3Modes() : modelSingleMode(p))
      : p === 'earth' && EARTH_H3 ? earthH3Modes() : (NAFF.modes[p].z || [])
        .filter((md) => Math.hypot(md.re, md.im) >= AMP_MIN)
        .slice(0, MAX_MODES)
        .map((md) => { const N = Math.round(md.omegaRadPerYr / COMB_RAD); return { w: N * COMB_RAD, N, re: md.re, im: md.im, wFree: md.omegaRadPerYr }; });
    return { aRefAU: REF_A[p], gm: gmOf(p), modes, gateYr: GATE, filterYr: FILTER_YR };
  });
if (TARGETS_MODE === 'model') console.log(`THE MODEL UNIVERSE: doc-55 divisor lines ${names.filter((p) => p !== 'earth').map((p) => `${p} 8H/${MODEL_N[p]}`).join(' ')}; Earth ${FREE_EARTH ? 'FREE (released — the X2 question)' : 'on the three-line H/3 law'}`);
else if (EARTH_H3) console.log('EARTH ON THE H/3 LAW: three-line target N0+N24+N48, base', TL.eccentricityBase.toFixed(6));
const TARGET_NAMES = names.filter((p) => !(p === 'earth' && FREE_EARTH) && (!HOLD || HOLD.includes(p)));
if (HOLD) console.log(`HOLD LIST: only [${HOLD.join(', ')}] steered — all others FREE (the minimal-(ii) universe)`);
console.log('snapped comb targets (N = 8H/N line; detune % vs NAFF):');
for (const [i, p] of TARGET_NAMES.entries()) {
  console.log(' ', p.padEnd(8), TARGETS[i].modes.map((m) => `N${m.N}${m.N !== 0 && m.w !== m.wFree ? ` (${((m.w - m.wFree) / Math.abs(m.wFree) * 100).toFixed(1)}%)` : ''}`).join(' '));
}

function run(withForce) {
  const { gms, Y0 } = build();
  // dump=<name>: write the bounded run's Earth elements (200-yr cadence) as a
  // NAFF-compatible .local.json for mode diagnosis (naff-frequencies.mjs file=…)
  const dumpArr = withForce && KV.dump ? { t: [], e: [], w: [], inc: [], Om: [] } : null;
  eboundDiag.maxAccel = 0; eboundDiag.sumAccel = 0; eboundDiag.samples = 0;
  setZboundTargets(TARGETS);
  if (COMP) {
    const dVal = { mercury: 21, venus: 34, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
    const wRaw = names.map((k) => (k === 'earth' ? 0 : Math.sqrt(TL.massFraction[k]) * Math.pow(TL.derived[k].orbitDistance, 1.5) / Math.sqrt(dVal[k])));
    const wSum = wRaw.reduce((s, x) => s + x, 0);
    setZboundCompensation(wRaw.map((x) => x / wSum));
  } else setZboundCompensation(null);
  const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces: withForce ? [FORCES.zbound(TAU)] : [] });
  const L0 = sim.angularMomentum(), Ln0 = Math.hypot(...L0);
  const rows = [];
  const steps = Math.round(YEARS * 365.25 / DT), every = Math.round(1000 * 365.25 / DT), everyTh = Math.round(200 * 365.25 / DT);
  let win300 = null;
  const thE = { t: [], v: [] }; let thPrev = null, thAcc = 0;
  for (let s = 0; s <= steps; s++) {
    const tYr = s * DT / 365.25;
    if (s % every === 0) {
      const row = { t: tYr };
      for (const [i, k] of names.entries()) { const h = sim.helio(i + 1); row[k] = oscul(h.r, h.v, GM_S + gms[i + 1]); }
      rows.push(row);
    }
    if (s % everyTh === 0) {   // Earth apsidal-angle tracking (unwrapped) + optional NAFF dump
      const h = sim.helio(3), rn = Math.hypot(...h.r), mu = GM_S + gms[3];
      const hv = [h.r[1] * h.v[2] - h.r[2] * h.v[1], h.r[2] * h.v[0] - h.r[0] * h.v[2], h.r[0] * h.v[1] - h.r[1] * h.v[0]];
      const ex = (h.v[1] * hv[2] - h.v[2] * hv[1]) / mu - h.r[0] / rn, ey = (h.v[2] * hv[0] - h.v[0] * hv[2]) / mu - h.r[1] / rn;
      let th = Math.atan2(ey, ex);
      if (thPrev !== null) { let d = th - thPrev; if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI; thAcc += d; }
      thPrev = th; thE.t.push(tYr); thE.v.push(thAcc);
      if (dumpArr) {
        const hn = Math.hypot(...hv), R2D = 180 / Math.PI;
        dumpArr.t.push(+tYr.toFixed(1));
        dumpArr.e.push(+Math.hypot(ex, ey, (h.v[0] * hv[1] - h.v[1] * hv[0]) / mu - h.r[2] / rn).toFixed(7));
        dumpArr.w.push(+(th * R2D).toFixed(4));
        dumpArr.inc.push(+(Math.acos(hv[2] / hn) * R2D).toFixed(5));
        dumpArr.Om.push(+(Math.atan2(hv[0], -hv[1]) * R2D).toFixed(4));
      }
    }
    sim.step();
    if (win300 === null && tYr >= 300) win300 = { mean: eboundDiag.sumAccel / Math.max(1, eboundDiag.samples), max: eboundDiag.maxAccel };
  }
  const L1 = sim.angularMomentum();
  const n = thE.t.length, mt = thE.t.reduce((a, b) => a + b, 0) / n, mv = thE.v.reduce((a, b) => a + b, 0) / n;
  let nu = 0, de2 = 0; for (let i = 0; i < n; i++) { nu += (thE.t[i] - mt) * (thE.v[i] - mv); de2 += (thE.t[i] - mt) ** 2; }
  const earthPomDotCy = nu / de2 * 206264.806 * 100;
  if (dumpArr) {
    const { writeFileSync } = require('node:fs');
    const out = { integrator: `wh-zbound targets=${TARGETS_MODE}${FREE_EARTH ? ' freeEarth' : ''}`, dt: DT, frame: 'ecliptic', gr: true, t: dumpArr.t, elements: { earth: { e: dumpArr.e, w: dumpArr.w, inc: dumpArr.inc, Om: dumpArr.Om } } };
    writeFileSync(new URL(`./${KV.dump}.local.json`, import.meta.url), JSON.stringify(out));
    console.log(`dumped Earth elements → tools/explore/${KV.dump}.local.json (${dumpArr.t.length} samples)`);
  }
  return {
    rows, win300, dL: Math.hypot(L1[0] - L0[0], L1[1] - L0[1], L1[2] - L0[2]) / Ln0,
    dLz: Math.abs(L1[2] - L0[2]) / Ln0, dLxy: Math.hypot(L1[0] - L0[0], L1[1] - L0[1]) / Ln0,
    earthPomDotCy, diag: { ...eboundDiag },
  };
}
console.log(`\ncontrol run (free dynamics, 1PN on), then zbound (τ = ${TAU} kyr, gate ${GATE} yr, torque compensation ${COMP ? 'ON' : 'OFF'}), ${YEARS / 1000} kyr forward…`);
const ctl = run(false), exp = run(true);
console.log('\n  kyr   e_E free  e_E bnd   e_Ma free  e_Ma bnd  | Δe Me      Δe V       Δe J       Δe S       Δe U       Δe N');
for (const [i, r] of exp.rows.entries()) {
  if (r.t % 10000 !== 0) continue;
  const c = ctl.rows[i];
  const de = (k) => (r[k].e - c[k].e).toExponential(1).padStart(9);
  console.log(`${String(r.t / 1000).padStart(5)}   ${c.earth.e.toFixed(4)}   ${r.earth.e.toFixed(4)}    ${c.mars.e.toFixed(4)}    ${r.mars.e.toFixed(4)}   |${de('mercury')} ${de('venus')} ${de('jupiter')} ${de('saturn')} ${de('uranus')} ${de('neptune')}`);
}
console.log(`\nforce: FIRST 300 YR mean |a| ${(exp.win300.mean * 1e3).toExponential(2)} m/s², max ${(exp.win300.max * 1e3).toExponential(2)} m/s²  (in-window footprint; gate keeps it 0)`);
console.log(`       full span mean |a| ${(exp.diag.sumAccel / Math.max(1, exp.diag.samples) * 1e3).toExponential(2)} m/s², max ${(exp.diag.maxAccel * 1e3).toExponential(2)} m/s²`);
console.log(`total angular momentum: control |ΔL|/L ${ctl.dL.toExponential(1)}; bounded ${exp.dL.toExponential(1)} (z ${exp.dLz.toExponential(1)}, xy ${exp.dLxy.toExponential(1)})`);
if (TARGETS_MODE === 'model' || FREE_EARTH || HOLD) {
  const eE = exp.rows.map((r) => r.earth.e);
  console.log(`Earth in the ${TARGETS_MODE} universe${FREE_EARTH ? ' (FREE)' : ''}: mean ϖ̇ ${exp.earthPomDotCy.toFixed(1)} ″/cy (H/3 line: 1159.5; free-universe mean: ${ctl.earthPomDotCy.toFixed(1)}) | e range ${Math.min(...eE).toFixed(4)}–${Math.max(...eE).toFixed(4)} (H/3 law: 0.0077–0.0231)`);
}
