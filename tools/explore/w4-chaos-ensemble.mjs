#!/usr/bin/env node
// W4 — THE CHAOS CONFOUND, STAGE 1: the clone ensemble (plan 04 §4).
//
// The rock-based solar-mass measurement uses the 405-kyr g₂−g₅ beat as its
// ruler (period ∝ 1/μ exactly). The ruler's one known wobble is chaos: the
// g-frequencies diffuse over Gyr without any solar-mass change. W4
// quantifies that wobble so the μ bound can be stated MARGINAL over it.
//
// Stage 1 (this script): integrate a reference + K perturbed clones of the
// 9-body system (WH, 1PN on) over SPAN years each, dumping per-clone
// element series in the lattice-long-window format so the unchanged NAFF
// script (naff-frequencies.mjs file=… out=…) extracts each clone's g-set.
// The initial perturbations are ~1e-8 relative on Mercury's position
// (~0.6 km) — far below observational knowledge, so the clone spread is
// pure chaotic divergence, not modelling freedom.
//
// Stage 2 (w4-chaos-analyze.mjs) reads the per-clone NAFF mode tables and
// measures the spread of the beats (g₂−g₅, g₁−g₅, g₂−g₁, g₄−g₃), compares
// the growth between the half-span and full-span windows, extrapolates to
// 2.5 Gyr diffusively, and conditions on the ROCK's own chaos diagnostics
// (Lantink 2022 Table-1 internal ratios: g₁ drifted ~6 %, g₁−g₅ 0.4 %,
// g₄−g₃ broken — μ-independent, pure chaos measurements at 2.46 Ga).
//
//   node tools/explore/w4-chaos-ensemble.mjs [clones=6] [years=4000000] [dt=4] [order=4] [sample=2000]
//   → tools/explore/w4-clone-<k>.local.json  (k = 0 is the unperturbed reference)

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, GM_SUN, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
createRequire(ROOT + 'package.json'); // anchor the require root (consistency with siblings)

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const CLONES = parseInt(KV.clones || '6', 10);
const SPAN = parseFloat(KV.years || '4000000');
const DT = parseFloat(KV.dt || '4');
const ORDER = parseInt(KV.order || '4', 10);
const SAMPLE_DAYS = parseFloat(KV.sample || '2000');
const DAY = 86400, D2R = Math.PI / 180;

const gms = [GM_SUN, ...NAMES.map(gmOf)];
const n = gms.length;

function baryState(perturb) {
  // heliocentric km/km·s⁻¹ → barycentric layout [pos…, vel…]
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((k) => ({ r: HZ[k].slice(0, 3), v: HZ[k].slice(3, 6) }))];
  if (perturb) st[1].r = st[1].r.map((x, c) => x + perturb[c]);   // Mercury is index 1
  const M = gms.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / M);
  const vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / M);
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y[3 * i + c] = st[i].r[c] - rB[c]; Y[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }
  return Y;
}

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
  return { w: (Om + om) / D2R, Om: Om / D2R, e: en, inc: inc / D2R };
}

// ~1e-8-relative kicks on Mercury's position, one direction per clone (km).
const KICKS = [null,
  [0.6, 0, 0], [0, 0.6, 0], [0, 0, 0.6],
  [-0.6, 0, 0], [0.42, 0.42, 0], [0, -0.42, 0.42],
  [0.35, -0.35, 0.35], [-0.42, 0, -0.42]];

for (let k = 0; k <= CLONES; k++) {
  const t0 = Date.now();
  const sim = makeWH({ gms, Y0: baryState(KICKS[k]), dt: DT * DAY, gr: true, order: ORDER });
  const steps = Math.round(SPAN * 365.25 / DT), every = Math.max(1, Math.round(SAMPLE_DAYS / DT));
  const t = [], elements = Object.fromEntries(NAMES.map((p) => [p, { w: [], Om: [], e: [], inc: [] }]));
  const E0 = sim.energy();
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) {
      t.push(s * DT / 365.25);
      for (let i = 1; i < n; i++) {
        const h = sim.helio(i), o = oscul(h.r, h.v, GM_SUN + gms[i]);
        const el = elements[NAMES[i - 1]];
        el.w.push(o.w); el.Om.push(o.Om); el.e.push(o.e); el.inc.push(o.inc);
      }
    }
    sim.step();
  }
  const dE = Math.abs((sim.energy() - E0) / E0);
  if (dE > 1e-6) throw new Error(`clone ${k}: |ΔE/E| ${dE.toExponential(1)} — numerics broke`);
  const out = { years: SPAN, integrator: 'wh', dt: DT, order: ORDER, gr: true, frame: 'ecliptic', sampleDays: SAMPLE_DAYS, clone: k, kickKm: KICKS[k], dE, t, elements };
  const file = ROOT + `tools/explore/w4-clone-${k}.local.json`;
  writeFileSync(file, JSON.stringify(out));
  console.log(`clone ${k} (${KICKS[k] ? 'kick ' + KICKS[k].join(',') + ' km' : 'reference'}): ${((Date.now() - t0) / 60000).toFixed(1)} min, ${t.length} samples, |ΔE/E| ${dE.toExponential(1)} → ${file.replace(ROOT, '')}`);
}
console.log('\nStage 2: NAFF each clone (naff-frequencies.mjs file=tools/explore/w4-clone-<k>.local.json terms=8 out=…), then w4-chaos-analyze.mjs');
