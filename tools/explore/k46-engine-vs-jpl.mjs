#!/usr/bin/env node
// P5/K4.6 — THE PHYSICS FLOOR: our engine's trajectory measured DIRECTLY
// against the JPL Horizons cache (geocentric RA/Dec, J2000 frame both sides).
// This is the best any chain rendering can ever do; the gap between a chain
// and this floor is rendering, the gap between this floor and zero is
// physics (missing bodies: the Moon as separate mass, asteroids, EIH terms —
// the engine's own header lists them).
//
// Conventions: cache = J2000/ICRF degrees (the established pipeline
// convention); engine geocentric = r_planet − r_EMB (heliocentric ecliptic),
// rotated ecliptic→equatorial by the model's iauObliquityAtGrid. CAVEAT: the
// engine's "earth" is the EM BARYCENTRE — the Earth-vs-EMB offset (≤4,700 km)
// adds a monthly parallax wobble ≲13″ for the inner planets, ≲1.3″ for the
// giants; the floor conclusion is read on the giants.
//
// Exact-epoch readout: whole WH steps to within one dt of the target, then a
// per-planet two-body Kepler propagation of the remainder (≤2 d; the
// neglected planet-planet term over 2 days is sub-arcsecond).
//
// RESULT (measured, 1800–2100):
//   WITHOUT light-time the giants' "floor" decoded EXACTLY as motion ×
//   light-time (9.9/7.0/5.0/3.8″ vs 10.4/6.5/4.8/3.8″ predicted) — the
//   cache is ASTROMETRIC; light-time is proper physics the raw path must
//   carry (the shipped chains absorb it inside their fitted 1/d terms).
//   WITH light-time (dt = 2 d): mercury 107.3 · venus 52.3 · mars 14.7 ·
//     jupiter 3.7 · saturn 2.0 · uranus 1.1 · neptune 0.6 ″ RMS.
//   THE GIANTS' FLOOR IS 0.6–3.7″ — the engine matches JPL at the
//   arcsecond level over three centuries; the ENTIRE giant-planet gap in
//   the K4 verdict is rendering (term layer + light-time), and every giant
//   can beat its shipped chain (Neptune's bar of 12.5″ sits 20× above the
//   0.6″ floor).
//   INNER PLANETS are integration-step dominated: Mercury 107″ @ dt=2 d →
//   37″ @ dt=0.5 d (Venus 52→32; the readout-path convergence class), with
//   the EMB-vs-Earth wobble (≲6″ RMS) inside the remainder — the K4.6b
//   follow-up: dt-convergence + the Earth-vs-EMB offset from the model's
//   own Moon before calling any residual "physics".
//   CONSEQUENCE for K4: the Keplerian flag path gains the light-time step
//   (c from the model's single home) — 4–10″ of the giants' verdict gap
//   was this one physical term.
//
//   node tools/explore/k46-engine-vs-jpl.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH, keplerStep } from './nbody-wh.mjs';
import { HZ, GM_SUN, NAMES, gmOf } from './j2000-state.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const fs = require('node:fs');

const cache = JSON.parse(fs.readFileSync(ROOT + 'data/jpl-cache.json', 'utf8'));
const TARGETS = { 199: 'mercury', 299: 'venus', 499: 'mars', 599: 'jupiter', 699: 'saturn', 799: 'uranus', 899: 'neptune' };
const D2R = Math.PI / 180, J2000_JD = 2451545.0, DAY = 86400;
const EPS = TL.iauObliquityAtGrid * D2R;
const gms = Object.fromEntries(NAMES.map((k) => [k, gmOf(k)]));
const EARTH_I = NAMES.indexOf('earth') + 1;

// epochs: per planet, 1800–2100, strided to ≤700; merged chronologically
const wanted = [];
for (const [naif, planet] of Object.entries(TARGETS)) {
  const jds = Object.keys(cache).filter((k) => k.startsWith(naif + '_')).map((k) => parseFloat(k.slice(naif.length + 1)))
    .filter((jd) => jd >= J2000_JD - 200 * 365.25 && jd <= J2000_JD + 100 * 365.25).sort((a, b) => a - b);
  const stride = Math.max(1, Math.ceil(jds.length / 700));
  jds.filter((_, i) => i % stride === 0).forEach((jd) => wanted.push({ jd, naif, planet }));
}

function seedBary() {
  const gmsArr = [GM_SUN, ...NAMES.map((k) => gms[k])];
  const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...NAMES.map((p) => ({ r: HZ[p].slice(0, 3), v: HZ[p].slice(3, 6) }))];
  const M = gmsArr.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gmsArr[i] * b.r[c], 0) / M);
  const vB = [0, 1, 2].map((c) => st.reduce((s, b, i) => s + gmsArr[i] * b.v[c], 0) / M);
  const N = NAMES.length, Y0 = new Float64Array(6 * (N + 1));
  for (let i = 0; i <= N; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * (N + 1) + 3 * i + c] = st[i].v[c] - vB[c]; }
  return { gmsArr, Y0 };
}

function raDecJ2000(geoEcl) {
  const [x, y, z] = geoEcl;
  const yq = y * Math.cos(EPS) - z * Math.sin(EPS);
  const zq = y * Math.sin(EPS) + z * Math.cos(EPS);
  return { ra: ((Math.atan2(yq, x) / D2R) + 360) % 360, dec: Math.asin(zq / Math.hypot(x, yq, zq)) / D2R };
}
const sep = (a, b) => {
  const v = (ra, dec) => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
  const p = v(a.ra, a.dec), q = v(b.ra, b.dec);
  return Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) / D2R * 3600;
};

const stats = Object.fromEntries(Object.values(TARGETS).map((p) => [p, { s2: 0, n: 0, mx: 0 }]));
const DT = parseFloat(process.env.K46_DT || '2') * DAY;
for (const dir of [-1, +1]) {
  const { gmsArr, Y0 } = seedBary();
  const sim = makeWH({ gms: gmsArr, Y0, dt: dir * DT, gr: true, order: 2 });
  const list = wanted.filter((w) => (dir < 0 ? w.jd < J2000_JD : w.jd >= J2000_JD))
    .sort((a, b) => dir * (a.jd - b.jd));
  for (const w of list) {
    const tTarget = (w.jd - J2000_JD) * DAY;
    while (dir * (tTarget - sim.t) > DT) sim.step(1);
    const dtRem = tTarget - sim.t;
    // partial-step readout: two-body propagate planet and EMB by dtRem
    const iP = NAMES.indexOf(w.planet) + 1;
    const hp = sim.helio(iP), he = sim.helio(EARTH_I);
    const pp = keplerStep(GM_SUN + gms[w.planet], hp.r, hp.v, dtRem);
    const pe = keplerStep(GM_SUN + gms.earth, he.r, he.v, dtRem);
    let geo = [pp.r[0] - pe.r[0], pp.r[1] - pe.r[1], pp.r[2] - pe.r[2]];
    // LIGHT-TIME (astrometric position — the cache's convention): re-evaluate
    // the planet at t − τ, τ = |geo|/c (one iteration suffices; c from the
    // model's single home). Proper physics, not a correction fit — the giants'
    // uncorrected floor decoded EXACTLY as motion × light-time (9.9/7.0/5.0/
    // 3.8″ measured vs 10.4/6.5/4.8/3.8″ predicted).
    const tau = Math.hypot(...geo) / TL.speedOfLight;
    const ppLT = keplerStep(GM_SUN + gms[w.planet], pp.r, pp.v, -tau);
    geo = [ppLT.r[0] - pe.r[0], ppLT.r[1] - pe.r[1], ppLT.r[2] - pe.r[2]];
    const m = raDecJ2000(geo);
    const ref = cache[`${w.naif}_${w.jd}`];
    const d = sep(m, ref);
    const st = stats[w.planet];
    st.s2 += d * d; st.n++; st.mx = Math.max(st.mx, d);
  }
}

console.log('THE PHYSICS FLOOR — engine trajectory vs JPL cache, geocentric J2000, 1800–2100:');
console.log('planet    RMS ″     max ″    [floor; chain-vs-floor gap = rendering, floor-vs-0 = physics]');
for (const p of Object.values(TARGETS)) {
  const st = stats[p];
  console.log(`  ${p.padEnd(8)} ${Math.sqrt(st.s2 / st.n).toFixed(1).padStart(7)} ${st.mx.toFixed(1).padStart(9)}   (n=${st.n})`);
}
