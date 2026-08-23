// STAGE D2 — A2 COMPLETION: JPL out-of-sample validation of the derived
// planetary-Moon terms (from d2-planetary-moon-epoch.mjs).
//  1. all-phase Moon λ/β vs JPL Horizons at the 960 LCG epochs (seed
//     20260820, the 20.3h convention) — acceptance (b): λ improves
//     3.12″ → ≤3.05″ on top of the SHIPPED chain (which already carries
//     the Delaunay extension); sign-flipped control must degrade.
//  2. the 179-syzygy elongation fleet — acceptance (c): RMS ≤ 3.99″.
// Ship-time argument mapping: the extraction fits on run-own args where
// VE_run = lV − lE − π (heliocentric planet vs geocentric sun), so terms
// with an ODD planetary-argument multiple flip sign when re-expressed on
// the real (lV−lE)-style polynomials; even multiples don't. D/Mp/M carry
// no offset.
// Usage: node tools/explore/d2-planetary-moon-check.mjs
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);

const model = createModel(DEFAULT_CONSTANTS);
const C = DEFAULT_CONSTANTS;
const D2R = Math.PI / 180;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((d + 540) % 360) - 180;

const EXT = JSON.parse(readFileSync(HERE + 'd2-extension-terms.local.json', 'utf8'));
const PT = JSON.parse(readFileSync(HERE + 'd2-planetary-moon-terms.local.json', 'utf8'));

// ── real arguments ───────────────────────────────────────────────────────
const argOf = (jd) => {
  const T = (jd - 2451545.0) / 36525; const a = {};
  a.lV = (181.979801 + 58517.815676 * T) * D2R;
  a.lE = (100.466457 + 36000.769780 * T) * D2R;
  a.lM = (355.433000 + 19141.696300 * T) * D2R;
  a.lJ = (34.351519 + 3036.302389 * T) * D2R;
  a.lS = (50.077444 + 1223.511013 * T) * D2R;
  a.D = (297.8501921 + (445267.1114034 - 0.0018819 * T) * T) * D2R;
  a.M = (357.5291092 + (35999.0502909 - 0.0001536 * T) * T) * D2R;
  a.Mp = (134.9633964 + (477198.8675055 + 0.0087414 * T) * T) * D2R;
  a.F = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
  return a;
};
const extAs = (terms, a) => { let v = 0; for (const { k, arcsec } of terms) v += arcsec * Math.sin(k[0] * a.D + k[1] * a.M + k[2] * a.Mp + k[3] * a.F); return v; };

// planetary term name → real-arg fn + π-flip parity
const PMAP = {
  'V-E': { fn: (a) => a.lV - a.lE, k: 1 }, '2(V-E)': { fn: (a) => 2 * (a.lV - a.lE), k: 2 }, '3(V-E)': { fn: (a) => 3 * (a.lV - a.lE), k: 3 },
  'E-J': { fn: (a) => a.lE - a.lJ, k: 1 }, '2(E-J)': { fn: (a) => 2 * (a.lE - a.lJ), k: 2 },
  'E-Ma': { fn: (a) => a.lE - a.lM, k: 1 }, '2(E-Ma)': { fn: (a) => 2 * (a.lE - a.lM), k: 2 }, 'E-Sa': { fn: (a) => a.lE - a.lS, k: 1 },
  'V-E+2D': { fn: (a) => a.lV - a.lE + 2 * a.D, k: 1 }, 'V-E-2D': { fn: (a) => a.lV - a.lE - 2 * a.D, k: 1 },
  'E-J+2D': { fn: (a) => a.lE - a.lJ + 2 * a.D, k: 1 }, 'E-J-2D': { fn: (a) => a.lE - a.lJ - 2 * a.D, k: 1 },
  'V-E+Mp': { fn: (a) => a.lV - a.lE + a.Mp, k: 1 }, 'V-E-Mp': { fn: (a) => a.lV - a.lE - a.Mp, k: 1 },
  'E-J+Mp': { fn: (a) => a.lE - a.lJ + a.Mp, k: 1 }, 'E-J-Mp': { fn: (a) => a.lE - a.lJ - a.Mp, k: 1 },
  'E-Ma+Mp': { fn: (a) => a.lE - a.lM + a.Mp, k: 1 }, 'E-Ma-Mp': { fn: (a) => a.lE - a.lM - a.Mp, k: 1 },
  'V-E+F': { fn: (a) => a.lV - a.lE + a.F, k: 1 }, 'V-E-F': { fn: (a) => a.lV - a.lE - a.F, k: 1 },
  'E-J+F': { fn: (a) => a.lE - a.lJ + a.F, k: 1 }, 'E-J-F': { fn: (a) => a.lE - a.lJ - a.F, k: 1 },
};
const planAs = (terms, a, sign = 1) => {
  let v = 0;
  for (const t of terms) {
    const m = PMAP[t.name];
    if (!m) throw new Error('unmapped ' + t.name);
    const th = m.fn(a);
    const flip = (m.k % 2 === 1) ? -1 : 1;      // odd π-offset count → negate
    v += sign * flip * (t.cos * Math.cos(th) + t.sin * Math.sin(th));
  }
  return v;
};

// ── 1. all-phase JPL check (960 LCG epochs; cached) ──────────────────────
const J0 = model.time.jdFromYear(1970), J1 = model.time.jdFromYear(2050);
let seed = 20260820;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const apJds = Array.from({ length: 960 }, () => Math.round((J0 + rnd() * (J1 - J0)) * 1e6) / 1e6).sort((a, b) => a - b);

const CACHE = HERE + 'd2-moonval-jpl-cache.local.json';
let cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : null;
if (!cache || cache.n !== apJds.length) {
  const fetchQ = async (cmd) => {
    const out = [];
    for (let i = 0; i < apJds.length; i += 40) {
      const batch = apJds.slice(i, i + 40);
      const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
        + `&COMMAND='${cmd}'&CENTER='500@399'&EPHEM_TYPE=OBSERVER&QUANTITIES='31'&CSV_FORMAT=YES&TLIST='${batch.join(' ')}'`;
      const txt = await (await fetch(url)).text();
      const rows = txt.split('$$SOE')[1]?.split('$$EOE')[0]?.trim().split('\n') ?? [];
      if (rows.length !== batch.length) throw new Error(`batch ${i}: ${rows.length}/${batch.length}`);
      for (const r of rows) { const f = r.split(',').map((x) => x.trim()); out.push([parseFloat(f[3]), parseFloat(f[4])]); }
      process.stderr.write(`  ${cmd}: ${Math.min(i + 40, apJds.length)}/${apJds.length}\r`);
    }
    return out;
  };
  console.log('fetching JPL (960 epochs × Moon + Sun)...');
  const m = await fetchQ('301'), s = await fetchQ('10');
  cache = { n: apJds.length, rows: apJds.map((jd, i) => [jd, m[i][0], m[i][1], s[i][0]]) };
  writeFileSync(CACHE, JSON.stringify(cache));
}

const AR2 = (T) => ({
  Lp: (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R,
  A1: (119.75 + 131.849 * T) * D2R, A3: (313.45 + 481266.484 * T) * D2R,
});
const stats = (v) => ({ m: v.reduce((a, x) => a + x, 0) / v.length, rms: Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length) });

const eL0 = [], eL1 = [], eL1f = [], eB0 = [], eB1 = [];
for (const [jd, jplLon, jplLat] of cache.rows) {
  const jb = jd + BRIDGE;
  const T = (jb - 2451545.0) / 36525;
  const a = argOf(jb);
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  const a2 = AR2(T);
  const bFam = (-2235 * Math.sin(a2.Lp) + 382 * Math.sin(a2.A3) + 175 * Math.sin(a2.A1 - a.F)
    + 175 * Math.sin(a2.A1 + a.F) + 127 * Math.sin(a2.Lp - a.Mp) - 115 * Math.sin(a2.Lp + a.Mp)) * 1e-6;
  const shipLon = model.moon.lonDegAtJD(jb) + LP + extAs(EXT.lon, a) / 3600;
  const shipLat = model.moon.betaDegAtJD(jb) + bFam + extAs(EXT.lat, a) / 3600;
  eL0.push(wrap(shipLon - (jplLon - dPsiDeg)) * 3600);
  eL1.push(wrap(shipLon + planAs(PT.lon, a) / 3600 - (jplLon - dPsiDeg)) * 3600);
  eL1f.push(wrap(shipLon - planAs(PT.lon, a) / 3600 - (jplLon - dPsiDeg)) * 3600);   // sign-flipped control
  eB0.push((shipLat - jplLat) * 3600);
  eB1.push((shipLat + planAs(PT.lat, a) / 3600 - jplLat) * 3600);
}
// λ carries a CONSTANT offset vs JPL (~30.6″: the finder Moon's fitted
// anchors absorb it — elongation-class chains cancel it; the Phase-A record
// numbers are the mean-free SCATTER). Report mean and scatter separately.
const sc = (v) => { const m = v.reduce((a, x) => a + x, 0) / v.length; return { m, s: Math.sqrt(v.reduce((a, x) => a + (x - m) * (x - m), 0) / v.length) }; };
const sL0 = sc(eL0), sL1 = sc(eL1), sL1f = sc(eL1f), sB0 = sc(eB0), sB1 = sc(eB1);
console.log(`\n1. ALL-PHASE Moon vs JPL (n ${cache.rows.length}, 1970–2049; λ scatter about the constant anchor offset):`);
console.log(`   λ shipped (ext):        offset ${sL0.m.toFixed(2)}″ scatter ${sL0.s.toFixed(2)}″`);
console.log(`   λ + planetary:          offset ${sL1.m.toFixed(2)}″ scatter ${sL1.s.toFixed(2)}″   [accept ≤3.05]`);
console.log(`   λ sign-flip control:    scatter ${sL1f.s.toFixed(2)}″   [must degrade]`);
console.log(`   β shipped (ext):        scatter ${sB0.s.toFixed(2)}″ (mean ${sB0.m.toFixed(2)})`);
console.log(`   β + planetary:          scatter ${sB1.s.toFixed(2)}″ (mean ${sB1.m.toFixed(2)})`);

// ── 2. syzygy elongation fleet (shared cache from d2-joint-preview) ──────
const SZ = JSON.parse(readFileSync(HERE + 'd2-syzygy-jpl-cache.local.json', 'utf8'));
const { createSunPlanetaryCompletion } = await import(new URL('../../packages/physics/src/eclipse/sun-planetary-completion.cjs', import.meta.url).href).then((m) => m.default ?? m);
// POST-N3: the module is v3 (framework carriers, injected rates).
const _n3H = C.foundational.holisticyearLength;
const _n3mSY = Math.round(C.foundational.inputmeanlengthsolaryearindays * (_n3H / 8)) / (_n3H / 8);
const _n3dpc = (/** @type {number} */ f) => 360 * 36525 * f;
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({
  embWobbleArcsec: (C.moonReference.moonDistance / (1 + C.physicalConstants.MASS_RATIO_EARTH_MOON)
    / C.physicalConstants.currentAUDistance) * (648000 / Math.PI),
  carrierRatesDegPerCy: {
    planets: ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'].map((k) => (k ? _n3dpc(1 / C.planetOrbitalElements[k].solarYearInput) : _n3dpc(1 / _n3mSY))),
    moonElongation: _n3dpc(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
  },
});
const e2s = [], e3s = [];
for (const [jd, jplM, jplS] of SZ.rows) {
  const jb = jd + BRIDGE;
  const T = (jb - 2451545.0) / 36525;
  const a = argOf(jb);
  const fwS = model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T);
  const fwM = model.moon.lonDegAtJD(jb) + LP + extAs(EXT.lon, a) / 3600;
  e2s.push(wrap((fwM - fwS) - (jplM - jplS)) * 3600);
  e3s.push(wrap((fwM + planAs(PT.lon, a) / 3600 - fwS) - (jplM - jplS)) * 3600);
}
const s2 = stats(e2s), s3 = stats(e3s);
console.log(`\n2. SYZYGY fleet (n ${e2s.length}):`);
console.log(`   shipped (joint):        mean ${s2.m.toFixed(2)}″ RMS ${s2.rms.toFixed(2)}″`);
console.log(`   + planetary:            mean ${s3.m.toFixed(2)}″ RMS ${s3.rms.toFixed(2)}″   [accept: no degradation]`);
