#!/usr/bin/env node
// P5/K4.6b — THE ERROR LADDER: where does the verdict gap live? Three rungs,
// identical conventions (k46's pipeline: engine WH + partial-step Kepler
// readout, light-time, ecliptic→equatorial by the model's obliquity,
// geocentric J2000 RA/Dec):
//   A  engine trajectory vs JPL cache        = the physics floor (k46)
//   B  chain elements  vs JPL cache          = floor + element misfit
//   D  chain elements  vs engine trajectory  = pure rendering misfit
// The K4 verdict C (chain through the SCENE flag path vs JPL) then splits as
//   C² ≈ B² + (scene-pipeline share)² — frame bridge R, scene Earth vs
// engine EMB, of-date conversion. B and D are measured here; C comes from
// k4-observational-verdict. Both verdict windows, to test window-flatness
// (a window-flat rung = a constant systematic, not era misfit).
//
// RESULT (measured, 1800–2100; A floor · B chain|JPL · D chain|engine, RMS ″):
//   mercury 110.0 · 108.0 · 6.4    venus  53.4 · 57.3 · 17.1
//   mars     14.7 ·  29.2 · 25.1   jupiter 3.7 · 12.2 · 11.5
//   saturn    2.0 ·  16.6 · 16.8   uranus  1.1 · 18.0 · 18.0
//   neptune   0.7 ·  13.7 · 13.6
//   READING: the element misfit on the sky is 12–18″ for every giant (D),
//   yet the K4 verdict then read 32–111″ — the difference was the SCENE
//   flag path, and k46c-scene-share.mjs root-caused it: the fitted
//   GRAVITATION_CORRECTION and ELONGATION_CORRECTION blocks lacked the
//   KEPLER_CHAINS guard and rode the raw path, double-counting the chain's
//   own derived perturbation layer. With the guards the verdict sits AT
//   rung B (giants 18.5–21.1″ in-window). Mercury/Venus read at rung A —
//   their B≈A≈the k46 dt=2 d readout floor; the chain itself is 6–17″
//   from the engine (D). Ladder closure: C² ≈ B² + scene-share² held
//   before and after the fix.
//
//   node tools/explore/k46b-error-decomposition.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH, keplerStep } from './nbody-wh.mjs';
import { HZ, GM_SUN, NAMES, gmOf } from './j2000-state.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const fs = require('node:fs');

const cache = JSON.parse(fs.readFileSync(ROOT + 'data/jpl-cache.json', 'utf8'));
const TARGETS = { 199: 'mercury', 299: 'venus', 499: 'mars', 599: 'jupiter', 699: 'saturn', 899: 'neptune', 799: 'uranus' };
const D2R = Math.PI / 180, J2000_JD = 2451545.0, DAY = 86400, YRD = 365.25;
const EPS = TL.iauObliquityAtGrid * D2R;
const AU_KM = TL.currentAUDistance;
const gms = Object.fromEntries(NAMES.map((k) => [k, gmOf(k)]));
const EARTH_I = NAMES.indexOf('earth') + 1;

const chains = KC.buildPlanetChainsFromArtifact();   // periodic terms ride from the governed artifact (K4.6b banking)

const WINDOWS = { '1800-2100': [J2000_JD - 200 * YRD, J2000_JD + 100 * YRD], '1600-1800': [J2000_JD - 400 * YRD, J2000_JD - 200 * YRD] };

// epochs: per planet per window, strided to ≤350; merged chronologically
const wanted = [];
for (const [naif, planet] of Object.entries(TARGETS)) {
  for (const [win, [lo, hi]] of Object.entries(WINDOWS)) {
    const jds = Object.keys(cache).filter((k) => k.startsWith(naif + '_')).map((k) => parseFloat(k.slice(naif.length + 1)))
      .filter((jd) => jd >= lo && jd < hi).sort((a, b) => a - b);
    const stride = Math.max(1, Math.ceil(jds.length / 350));
    jds.filter((_, i) => i % stride === 0).forEach((jd) => wanted.push({ jd, naif, planet, win }));
  }
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

// chain heliocentric ecliptic position (km) at a decimal year
function chainHelioKm(planet, year) {
  const el = KC.computePlanetElementsAtYear(year, chains[planet], chains);
  const h = KC.computeHeliocentricEclipticFromElements(el);
  return [h.xAU * AU_KM, h.yAU * AU_KM, h.zAU * AU_KM];
}

const mk = () => ({ s2: 0, n: 0, mx: 0 });
const stats = {};
for (const p of Object.values(TARGETS)) for (const w of Object.keys(WINDOWS)) {
  stats[`${p}|${w}`] = { A: mk(), B: mk(), D: mk() };
}

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
    const iP = NAMES.indexOf(w.planet) + 1;
    const hp = sim.helio(iP), he = sim.helio(EARTH_I);
    const pp = keplerStep(GM_SUN + gms[w.planet], hp.r, hp.v, dtRem);
    const pe = keplerStep(GM_SUN + gms.earth, he.r, he.v, dtRem);
    // A: engine, astrometric (light-time via backward Kepler step)
    let geoA = [pp.r[0] - pe.r[0], pp.r[1] - pe.r[1], pp.r[2] - pe.r[2]];
    const tauA = Math.hypot(...geoA) / TL.speedOfLight;
    const ppLT = keplerStep(GM_SUN + gms[w.planet], pp.r, pp.v, -tauA);
    geoA = [ppLT.r[0] - pe.r[0], ppLT.r[1] - pe.r[1], ppLT.r[2] - pe.r[2]];
    const mA = raDecJ2000(geoA);
    // B: chain planet, SAME Earth + light-time convention
    const year = KC.ANCHOR_EPOCH_YEAR + (w.jd - J2000_JD) / YRD;
    const hc = chainHelioKm(w.planet, year);
    let geoB = [hc[0] - pe.r[0], hc[1] - pe.r[1], hc[2] - pe.r[2]];
    const tauB = Math.hypot(...geoB) / TL.speedOfLight;
    const hcLT = chainHelioKm(w.planet, year - tauB / (YRD * DAY));
    geoB = [hcLT[0] - pe.r[0], hcLT[1] - pe.r[1], hcLT[2] - pe.r[2]];
    const mB = raDecJ2000(geoB);
    const ref = cache[`${w.naif}_${w.jd}`];
    const st = stats[`${w.planet}|${w.win}`];
    for (const [key, d] of [['A', sep(mA, ref)], ['B', sep(mB, ref)], ['D', sep(mB, mA)]]) {
      st[key].s2 += d * d; st[key].n++; st[key].mx = Math.max(st[key].mx, d);
    }
  }
}

console.log('THE ERROR LADDER — A engine|JPL (floor) · B chain|JPL · D chain|engine (rendering); RMS ″');
console.log('C (chain through the SCENE vs JPL) from k4-observational-verdict; scene share ≈ √(C²−B²)');
for (const win of Object.keys(WINDOWS)) {
  console.log(`\n=== ${win} ===`);
  console.log('planet         A floor     B chain|JPL   D chain|engine   (n)');
  for (const p of Object.values(TARGETS)) {
    const st = stats[`${p}|${win}`];
    const r = (k) => Math.sqrt(st[k].s2 / st[k].n).toFixed(1).padStart(9);
    console.log(`  ${p.padEnd(9)} ${r('A')}   ${r('B')}      ${r('D')}       (n=${st.A.n})`);
  }
}
