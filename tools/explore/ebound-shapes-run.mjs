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
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const YEARS = parseFloat(KV.years || '160000'), TAU = parseFloat(KV.tau || '2'), DT = parseFloat(KV.dt || '2'), SAMPLE = parseFloat(KV.sample || '100');
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
