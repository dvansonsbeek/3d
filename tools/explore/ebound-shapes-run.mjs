#!/usr/bin/env node
// THE SHAPES UNDER THE BOUND (owner's request, 2026-08-31): how do the planets'
// eccentricity shapes (z = e·e^{iϖ}, ecliptic) look when Earth's e is held on
// the model's H/3 line with the Law-5-distributed coupling (nbody-forces.mjs
// `eboundlaw5`)? Runs the free control and the bounded run over the same span
// and dumps both trajectories per planet → ebound-shapes.local.json (gitignored)
// for the eccentricity-shapes plate. Expectation to test: Earth's shape turns
// from an epicycle passing near the origin (+26 kyr, e→0.0026) into a ring on
// the bounded annulus [base′/2, 3·base′/2]; the giants' shapes are unchanged at
// drawing resolution (their Law-5 price is Δe ~ 1e-5); Venus/Mars pick up the
// 1e-3-class rearrangement measured in ebound-experiment.mjs.
//
//   node tools/explore/ebound-shapes-run.mjs [years=160000] [tau=2] [dt=2] [sample=100]

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { FORCES, setEboundTarget, setEboundLaw5 } from './nbody-forces.mjs';
import { HZ, NAMES, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const YEARS = parseFloat(KV.years || '160000'), TAU = parseFloat(KV.tau || '2'), DT = parseFloat(KV.dt || '2'), SAMPLE = parseFloat(KV.sample || '100');
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
// z = eccentricity vector projected on the xy plane. The HZ seed states are
// ALREADY ecliptic (Earth's r_z ≈ −170 km, v_z ≈ 4e-5 — in-plane), so no
// obliquity rotation: applying one tilts Earth by ε and reads |z| low by cos ε
// (measured 0.0154 vs 0.0167 before this fix).
function zVec(re, ve, mu) {
  const rn = Math.hypot(...re);
  const h = [re[1] * ve[2] - re[2] * ve[1], re[2] * ve[0] - re[0] * ve[2], re[0] * ve[1] - re[1] * ve[0]];
  return { k: (ve[1] * h[2] - ve[2] * h[1]) / mu - re[0] / rn, h: (ve[2] * h[0] - ve[0] * h[2]) / mu - re[1] / rn };
}
setEboundTarget((year) => OE.computeEccentricityEarth(year));
const dVal = { mercury: 21, venus: 34, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 };
const wRaw = names.map((k) => (k === 'earth' ? 0 : Math.sqrt(TL.massFraction[k]) * Math.pow(TL.derived[k].orbitDistance, 1.5) / Math.sqrt(dVal[k])));
const wSum = wRaw.reduce((s, x) => s + x, 0);

function run(bounded) {
  const { gms, Y0 } = build();
  setEboundLaw5(names.map(gmOf), wRaw.map((x) => x / wSum));
  const sim = makeWH({ gms, Y0, dt: DT * DAY, gr: true, order: 2, extraForces: bounded ? [FORCES.eboundlaw5(TAU)] : [] });
  const out = Object.fromEntries(names.map((k) => [k, []])); const tArr = [];
  const steps = Math.round(YEARS * 365.25 / DT), every = Math.round(SAMPLE * 365.25 / DT);
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) {
      tArr.push(Math.round(s * DT / 365.25));
      for (const [i, k] of names.entries()) { const hh = sim.helio(i + 1); const z = zVec(hh.r, hh.v, GM_S + gms[i + 1]); out[k].push([+z.k.toFixed(7), +z.h.toFixed(7)]); }
    }
    sim.step();
  }
  return { t: tArr, z: out };
}
console.log(`shapes run: control + Law-5-bounded (τ = ${TAU} kyr), ${YEARS / 1000} kyr, sampled every ${SAMPLE} yr…`);
const free = run(false); console.log('control done');
const bnd = run(true); console.log('bounded done');
const target = free.t.map((t) => +OE.computeEccentricityEarth(2000 + t).toFixed(7));
writeFileSync(new URL('./ebound-shapes.local.json', import.meta.url), JSON.stringify({ years: YEARS, tauKyr: TAU, dtDays: DT, sampleYears: SAMPLE, t: free.t, targetEarthE: target, free: free.z, bounded: bnd.z }));
console.log('wrote tools/explore/ebound-shapes.local.json');
