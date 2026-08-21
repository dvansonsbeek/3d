// STAGE D2 — the JOINT PREVIEW harness (LANDED — its v4+ext composition
// is the shipped besselian chain; kept as the re-derivation instrument).
// Applies the DERIVED Sun table (d2-sun-table.local.json, from
// d2-sun-table-extraction.mjs) and the DERIVED Moon extension
// (d2-extension-terms.local.json, from d2-extension-extraction.mjs) to:
//   1. the all-phase JPL Sun residual (1,600 epochs 1900–2100, cache
//      shared with d2-derived-sun.mjs),
//   2. the 179-eclipse-syzygy elongation fleet vs JPL (cached),
//   3. the 15-point NASA centerline shadow-plane scoreboard
//      (besselian clone, parity-checked vs the shipped tier).
// Table evaluation = analytic (the shippable form), not interpolation.
// Usage: node tools/explore/d2-joint-preview.mjs
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const { createSunPlanetaryCompletion } = await import(new URL('../../packages/physics/src/eclipse/sun-planetary-completion.cjs', import.meta.url).href).then((m) => m.default ?? m);

const model = createModel(DEFAULT_CONSTANTS);
const C = DEFAULT_CONSTANTS;
// live shipped completion — the derived EMB wobble exactly as model.js wires it
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({
  embWobbleArcsec: (C.moonReference.moonDistance / (1 + C.physicalConstants.MASS_RATIO_EARTH_MOON)
    / C.physicalConstants.currentAUDistance) * (648000 / Math.PI),
});
const D2R = Math.PI / 180;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const Nnut = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((d + 540) % 360) - 180;
const st = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const r = Math.sqrt(v.reduce((a, b) => a + b * b, 0) / v.length); return { m, rms: r }; };

// ── the derived Sun TABLE (analytic evaluator) ───────────────────────────
const TAB = JSON.parse(readFileSync(HERE + 'd2-sun-table.local.json', 'utf8')).terms;
const RATES = { lMe: 149472.674, lV: 58517.815676, lE: 36000.769780, lM: 19141.696300, lJ: 3036.302389, lS: 1223.511013 };
const ZEROS = { lMe: 252.250906, lV: 181.979801, lE: 100.466457, lM: 355.433000, lJ: 34.351519, lS: 50.077444 };
const PERI = { Me: 77.456, V: 131.564, E: 102.937, M: 336.060, J: 14.331, S: 93.057 };
const argOf = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const a = {};
  for (const k of Object.keys(RATES)) a[k] = (ZEROS[k] + RATES[k] * T) * D2R;
  a.MV = a.lV - PERI.V * D2R; a.ME = a.lE - PERI.E * D2R; a.MMa = a.lM - PERI.M * D2R;
  a.MJ = a.lJ - PERI.J * D2R; a.MS = a.lS - PERI.S * D2R; a.MMe = a.lMe - PERI.Me * D2R;
  a.D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
  a.M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * D2R;
  a.Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
  a.F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) * D2R;
  return a;
};
// name → argument value (mirrors the extraction catalog naming)
const MAINFN = {
  'V-E': (a) => a.lV - a.lE, '2(V-E)': (a) => 2 * (a.lV - a.lE), '3(V-E)': (a) => 3 * (a.lV - a.lE),
  '2V-3E': (a) => 2 * a.lV - 3 * a.lE, '3V-4E': (a) => 3 * a.lV - 4 * a.lE,
  'E-J': (a) => a.lE - a.lJ, '2(E-J)': (a) => 2 * (a.lE - a.lJ), 'E-2J': (a) => a.lE - 2 * a.lJ,
  '2E-3J': (a) => 2 * a.lE - 3 * a.lJ,
  'E-M': (a) => a.lE - a.lM, '2(E-M)': (a) => 2 * (a.lE - a.lM), '2E-3M': (a) => 2 * a.lE - 3 * a.lM,
  '2M-E': (a) => 2 * a.lM - a.lE, '2(2M-E)': (a) => 2 * (2 * a.lM - a.lE),
  'E-S': (a) => a.lE - a.lS, '2(E-S)': (a) => 2 * (a.lE - a.lS),
  'E-Me': (a) => a.lE - a.lMe, '2(E-Me)': (a) => 2 * (a.lE - a.lMe),
  'V-2E+M': (a) => a.lV - 2 * a.lE + a.lM,
};
const termFn = (name) => {
  const m = name.match(/^(.+?)([+-])(MV|ME|MMa|MJ|MS|MMe)$/);
  if (!m) return MAINFN[name];
  const base = MAINFN[m[1]], sign = m[2] === '+' ? 1 : -1, mod = m[3];
  return (a) => base(a) + sign * a[mod];
};
const TABF = TAB.map((t) => ({ fn: termFn(t.name), cos: t.cos, sin: t.sin }));
for (const [i, t] of TAB.entries()) if (!TABF[i].fn) throw new Error(`unmapped term ${t.name}`);
// the shippable v4 completion (arcsec): derived table + D-term + 2lE (v1 values)
const compV4As = (jd) => {
  const a = argOf(jd);
  let v = 0;
  for (const t of TABF) { const th = t.fn(a); v += t.cos * Math.cos(th) + t.sin * Math.sin(th); }
  // sign: the table models the MISSING content (full − base3 projected);
  // the completion models (framework − truth) = −missing
  return -v + (-6.64) * Math.sin(a.D) + 1.42 * Math.sin(2 * a.lE);
};

// ── Moon extension ───────────────────────────────────────────────────────
const EXT = JSON.parse(readFileSync(HERE + 'd2-extension-terms.local.json', 'utf8'));
const extAs = (terms, a) => { let v = 0; for (const { k, arcsec } of terms) v += arcsec * Math.sin(k[0] * a.D + k[1] * a.M + k[2] * a.Mp + k[3] * a.F); return v; };

// A2 planetary-Moon terms (d2-planetary-moon-epoch.mjs) — optional MODE 3.
// Run-arg names map to real args with a π-flip for odd planetary-arg
// multiples (heliocentric planet vs geocentric sun; see the check header).
const PT = existsSync(HERE + 'd2-planetary-moon-terms.local.json')
  ? JSON.parse(readFileSync(HERE + 'd2-planetary-moon-terms.local.json', 'utf8')) : null;
const PMAP2 = {
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
const planAs = (terms, a) => {
  let v = 0;
  for (const t of terms) {
    const m = PMAP2[t.name];
    const th = m.fn(a);
    v += ((m.k % 2 === 1) ? -1 : 1) * (t.cos * Math.cos(th) + t.sin * Math.sin(th));
  }
  return v;
};

// ── 1. all-phase JPL Sun check (shared cache) ────────────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
  const r0 = [], r1 = [];
  for (const [jd, jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (Nnut.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (Nnut.psiOmega * Math.sin(om)) / 3600;
    const raw = wrap(model.eclipse.sunLonDegAtJD(jb) - (jplSun - dPsiDeg)) * 3600;
    const T = (jb - 2451545.0) / 36525;
    r0.push(raw - sunPlanetaryCompletionDeg(T) * 3600);   // shipped v1
    r1.push(raw - compV4As(jd));                          // derived v4 table
  }
  const s0 = st(r0), s1 = st(r1);
  const sd = (s) => Math.sqrt(Math.max(0, s.rms ** 2 - s.m ** 2));
  console.log(`1. ALL-PHASE Sun vs JPL (1900–2100, n ${r0.length}):`);
  console.log(`   shipped v1 completion: sd ${sd(s0).toFixed(2)}″`);
  console.log(`   derived v4 TABLE:      sd ${sd(s1).toFixed(2)}″`);
}

// ── 2. syzygy fleet ──────────────────────────────────────────────────────
{
  const CACHE = HERE + 'd2-syzygy-jpl-cache.local.json';
  const J0 = model.time.jdFromYear(1970), J1 = model.time.jdFromYear(2050);
  const jds = [];
  for (let s = J0; s < J1; s += 3650) jds.push(...model.eclipse.findSolarInRange(s, Math.min(s + 3650, J1)).map((e) => Math.round(e.jd * 1e6) / 1e6));
  let cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : null;
  if (!cache || cache.n !== jds.length) {
    const fetchQ = async (cmd, list) => {
      const out = new Map();
      for (let i = 0; i < list.length; i += 40) {
        const batch = list.slice(i, i + 40);
        const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
          + `&COMMAND='${cmd}'&CENTER='500@399'&EPHEM_TYPE=OBSERVER&QUANTITIES='31'&CSV_FORMAT=YES&TLIST='${batch.join(' ')}'`;
        const txt = await (await fetch(url)).text();
        const rows = txt.split('$$SOE')[1]?.split('$$EOE')[0]?.trim().split('\n') ?? [];
        if (rows.length !== batch.length) throw new Error(`batch ${i}`);
        rows.forEach((r, k) => out.set(batch[k], parseFloat(r.split(',').map((x) => x.trim())[3])));
      }
      return out;
    };
    const m = await fetchQ('301', jds), s = await fetchQ('10', jds);
    cache = { n: jds.length, rows: jds.map((jd) => [jd, m.get(jd), s.get(jd)]) };
    writeFileSync(CACHE, JSON.stringify(cache));
  }
  const e0 = [], e1 = [], e2 = [];
  for (const [jd, jplM, jplS] of cache.rows) {
    const jb = jd + BRIDGE;
    const T = (jb - 2451545) / 36525;
    const a = argOf(jb);
    const fwM = model.moon.lonDegAtJD(jb) + LP;
    const fwS1 = model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T);
    const fwS4 = model.eclipse.sunLonDegAtJD(jb) - compV4As(jd) / 3600;
    e0.push(wrap((fwM - fwS1) - (jplM - jplS)) * 3600);
    e1.push(wrap((fwM - fwS4) - (jplM - jplS)) * 3600);
    e2.push(wrap((fwM + extAs(EXT.lon, a) / 3600 - fwS4) - (jplM - jplS)) * 3600);
  }
  const s0 = st(e0), s1 = st(e1), s2 = st(e2);
  console.log(`\n2. SYZYGY fleet (n ${e0.length}):`);
  console.log(`   shipped v1:            mean ${s0.m.toFixed(2)}″ RMS ${s0.rms.toFixed(2)}″`);
  console.log(`   derived v4 table:      mean ${s1.m.toFixed(2)}″ RMS ${s1.rms.toFixed(2)}″`);
  console.log(`   JOINT v4 + Moon ext:   mean ${s2.m.toFixed(2)}″ RMS ${s2.rms.toFixed(2)}″`);
}

// ── 3. centerlines (besselian clone) ─────────────────────────────────────
{
  const K = C.physicalConstants;
  const R_E = C.bodyDiametersKm.earth / 2;
  const FLAT = 1 / K.earthFlatteningInverseWGS84;
  let MODE = 0;   // 0 shipped · 1 v4 · 2 v4+moon-ext
  const AR2 = (T) => ({
    Lp: (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R,
    A1: (119.75 + 131.849 * T) * D2R, A3: (313.45 + 481266.484 * T) * D2R,
  });
  const gmst = (jd) => { const T = (jd - 2451545) / 36525; return ((K.gmstMeanSiderealT0Deg + K.gmstMeanSiderealRateDegPerDay * (jd - 2451545) + K.gmstMeanSiderealT2Deg * T * T) % 360 + 360) % 360; };
  const eclToEq = (lon, bet, dist, eps) => {
    const l = lon * D2R, b = bet * D2R;
    return [dist * Math.cos(b) * Math.cos(l),
      dist * (Math.cos(b) * Math.sin(l) * Math.cos(eps) - Math.sin(b) * Math.sin(eps)),
      dist * (Math.cos(b) * Math.sin(l) * Math.sin(eps) + Math.sin(b) * Math.cos(eps))];
  };
  function umbraAt(jdUT) {
    const jb = jdUT + BRIDGE;
    const year = model.time.yearFromJD(jb);
    const eps = model.earth.obliquityDeg(year) * D2R;
    const T = (jb + model.eclipse.deltaTSecondsAtJD(jb) / 86400 - 2451545) / 36525;
    const comp = MODE === 0 ? sunPlanetaryCompletionDeg(T) : compV4As(jdUT) / 3600;
    const sunLon = model.eclipse.sunLonDegAtJD(jb) - comp;
    const e = model.earth.eccentricity(year);
    const v = (sunLon - (model.earth.perihelionLongitudeDeg(year) + 180)) * D2R;
    const S = eclToEq(sunLon, 0, K.currentAUDistance * (1 - e * e) / (1 + e * Math.cos(v)), eps);
    const a = argOf(jb), a2 = AR2(T);
    const bFam = (-2235 * Math.sin(a2.Lp) + 382 * Math.sin(a2.A3) + 175 * Math.sin(a2.A1 - a.F)
      + 175 * Math.sin(a2.A1 + a.F) + 127 * Math.sin(a2.Lp - a.Mp) - 115 * Math.sin(a2.Lp + a.Mp)) * 1e-6;
    const extLon = MODE >= 2 ? extAs(EXT.lon, a) / 3600 : 0;
    const extLat = MODE >= 2 ? extAs(EXT.lat, a) / 3600 : 0;
    const plLon = (MODE === 3 && PT) ? planAs(PT.lon, a) / 3600 : 0;
    // β rows measured non-shippable (0.074″ content, degrade the all-phase β) — λ only
    const plLat = 0;
    const M = eclToEq(model.moon.lonDegAtJD(jb) + LP + extLon + plLon,
      model.moon.betaDegAtJD(jb) + bFam + extLat + plLat, model.moon.distanceKmAtJD(jb), eps);
    const dv = [M[0] - S[0], M[1] - S[1], M[2] - S[2]];
    const dlv = Math.hypot(...dv);
    const d = dv.map((x) => x / dlv);
    // exact axis ∩ ellipsoid (z scaled by 1/(1−f)) — mirrors shipped besselian
    const w = 1 / (1 - FLAT);
    const Ms = [M[0], M[1], M[2] * w], ds = [d[0], d[1], d[2] * w];
    const A = ds[0] * ds[0] + ds[1] * ds[1] + ds[2] * ds[2];
    const B = Ms[0] * ds[0] + Ms[1] * ds[1] + Ms[2] * ds[2];
    const Cq = Ms[0] * Ms[0] + Ms[1] * Ms[1] + Ms[2] * Ms[2] - R_E * R_E;
    const disc = B * B - A * Cq;
    if (disc < 0) return null;
    const s = (-B - Math.sqrt(disc)) / A;
    const hit = [M[0] + s * d[0], M[1] + s * d[1], M[2] + s * d[2]];
    const rho = Math.hypot(hit[0], hit[1]);
    return {
      latDeg: Math.atan2(hit[2], (1 - FLAT) * (1 - FLAT) * rho) / D2R,
      lonDeg: ((Math.atan2(hit[1], hit[0]) / D2R - gmst(jdUT) + 540) % 360) - 180,
    };
  }
  const efUnit = (la, lo) => [-Math.cos(la * D2R) * Math.cos(lo * D2R), Math.sin(la * D2R), Math.cos(la * D2R) * Math.sin(lo * D2R)];
  const CL = JSON.parse(readFileSync(new URL('../../public/input/solar-eclipse-centerlines-nasa.json', import.meta.url), 'utf8'));
  function score(label) {
    const all = [];
    for (const ev of CL.events) {
      const per = [];
      for (const p of ev.points) {
        const u = umbraAt(p.jd);
        const jb = p.jd + BRIDGE;
        const year = model.time.yearFromJD(jb);
        const eps = model.earth.obliquityDeg(year) * D2R;
        const lam = model.eclipse.sunLonDegAtJD(jb) * D2R;
        const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) / D2R;
        const ss = { la: Math.asin(Math.sin(lam) * Math.sin(eps)) / D2R, lo: ((ra - gmst(p.jd) + 540) % 360) - 180 };
        const av = efUnit(p.latDeg, p.lonDeg), bv = efUnit(u.latDeg, u.lonDeg), sv = efUnit(ss.la, ss.lo);
        const gv = [(bv[0] - av[0]) * R_E, (bv[1] - av[1]) * R_E, (bv[2] - av[2]) * R_E];
        const dot = gv[0] * sv[0] + gv[1] * sv[1] + gv[2] * sv[2];
        per.push(Math.hypot(gv[0] - dot * sv[0], gv[1] - dot * sv[1], gv[2] - dot * sv[2]) / 1.86);
      }
      all.push(...per);
      console.log(`   ${ev.label.padEnd(36)} ${per.map((v) => v.toFixed(1) + '″').join('  ')}`);
    }
    console.log(`   ${label}: mean ${(all.reduce((x, v) => x + v, 0) / all.length).toFixed(2)}″ | max ${Math.max(...all).toFixed(1)}″`);
  }
  // parity vs the shipped tier at MODE 3 — the shipped composition since the
  // A2 landing (v4 table + Moon extension + A2 planetary λ + ellipsoid mapping)
  MODE = 3;
  let worst = 0;
  for (const ev of CL.events) for (const p of ev.points) {
    const u1 = umbraAt(p.jd), u2 = model.eclipse.umbraGroundAtJD(p.jd);
    worst = Math.max(worst, Math.hypot((u1.latDeg - u2.latDeg) * 111, (u1.lonDeg - u2.lonDeg) * 111 * Math.cos(u1.latDeg * D2R)));
  }
  console.log(`\n3. CENTERLINES (clone parity vs shipped at MODE 3: worst ${worst.toFixed(2)} km)`);
  MODE = 0; console.log('sun-only (pre-D2 composition):'); score('sun-only');
  MODE = 1; console.log('derived v4 table (sun-only):'); score('v4');
  MODE = 2; console.log('v4 + Moon ext (pre-A2):'); score('joint');
  if (PT) { MODE = 3; console.log('+ A2 planetary Moon terms (= shipped):'); score('a2'); }
}
