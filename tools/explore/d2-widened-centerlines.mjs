// STAGE D2 — the WIDENED centerline scoreboard (LANDED — the widened
// set now ships in public/input/solar-eclipse-centerlines-nasa.json,
// minus the exploratory Antarctica event).
// The 5-event/15-point reference set carries ~2″ of sampling
// structure (measured: the Moon extension improves every fleet metric
// yet degrades that sample); this instrument widens it to 13 events /
// 39 points before letting it arbitrate.
//
// NEW REFERENCE POINTS: NASA GSFC SEpath tables (SEpath2001/*.html),
// fetched 2026-08-21, CENTER-LINE column only (the limit-column trap),
// three mid-table rows per event, coordinates converted from the
// tables' "DD MM.mS/N DDD MM.mE/W" format.
// Scores: shipped v1 · derived v4 Sun table · joint v4 + Moon ext
// (tables from d2-sun-table.local.json + d2-extension-terms.local.json).
// Usage: node tools/explore/d2-widened-centerlines.mjs
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const { createSunPlanetaryCompletion } = await import(new URL('../../packages/physics/src/eclipse/sun-planetary-completion.cjs', import.meta.url).href).then((m) => m.default ?? m);

const model = createModel(DEFAULT_CONSTANTS);
const C = DEFAULT_CONSTANTS;
// live shipped completion — the derived EMB wobble exactly as model.js wires it.
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
const D2R = Math.PI / 180;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;

const dateToJD = (y, mo, d, hh, mm) => {
  let yy = y, m2 = mo;
  if (m2 <= 2) { yy -= 1; m2 += 12; }
  const A = Math.floor(yy / 100), B2 = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (m2 + 1)) + d + B2 - 1524.5 + (hh + mm / 60) / 24;
};
// widened events (NASA SEpath center rows; lat/lon converted to decimal)
const NEW_EVENTS = [
  // 11:56 re-verified: the first fetch returned the NORTHERN LIMIT
  // (10°49.7′S 0°17.9′E) — the limit-column trap's third bite; the true
  // central line is 11°43.0′S 000°26.0′E (verified with all three columns).
  { label: '2001 Jun 21 Total (Atlantic-Africa)', pts: [[2001, 6, 21, 11, 56, -11.7167, 0.4333], [2001, 6, 21, 12, 6, -11.1517, 3.4417], [2001, 6, 21, 12, 16, -10.8433, 6.48]] },
  { label: '2002 Dec 04 Total (Africa-Indian O.)', pts: [[2002, 12, 4, 6, 30, -25.8917, 35.2683], [2002, 12, 4, 7, 0, -33.6717, 47.1317], [2002, 12, 4, 7, 30, -39.2767, 59.055]] },
  { label: '2006 Mar 29 Total (Africa-Turkey)', pts: [[2006, 3, 29, 9, 30, 11.2333, 5.7433], [2006, 3, 29, 9, 40, 14.1183, 8.605], [2006, 3, 29, 9, 50, 16.995, 11.2717]] },
  { label: '2008 Aug 01 Total (Arctic-Siberia)', pts: [[2008, 8, 1, 10, 12, 69.7417, 67.2867], [2008, 8, 1, 10, 20, 66.1467, 71.755], [2008, 8, 1, 10, 28, 62.6033, 75.49]] },
  { label: '2009 Jul 22 Total (China-Pacific)', pts: [[2009, 7, 22, 1, 30, 30.8183, 116.275], [2009, 7, 22, 2, 0, 29.1617, 131.1033], [2009, 7, 22, 2, 30, 25.1233, 142.3433]] },
  { label: '2012 Nov 13 Total (Pacific)', pts: [[2012, 11, 13, 21, 0, -25.845, 165.0133], [2012, 11, 13, 21, 30, -33.3967, -179.8133], [2012, 11, 13, 22, 0, -38.4883, -166.655]] },
  { label: '2019 Jul 02 Total (S Pacific-Chile)', pts: [[2019, 7, 2, 19, 16, -17.525, -111.2117], [2019, 7, 2, 19, 22, -17.4, -109.3083], [2019, 7, 2, 19, 28, -17.375, -107.4083]] },
  { label: '2020 Dec 14 Total (Pacific-Chile)', pts: [[2020, 12, 14, 15, 30, -33.56, -86.6283], [2020, 12, 14, 15, 42, -35.93, -81.56], [2020, 12, 14, 15, 54, -37.9117, -76.4867]] },
  { label: '2021 Dec 04 Total (Antarctica)', pts: [[2021, 12, 4, 7, 28, -73.885, -41.02], [2021, 12, 4, 7, 32, -76.0317, -44.435], [2021, 12, 4, 7, 36, -78.0167, -49.9017]] },
];

// derived Sun table + Moon extension (same evaluators as d2-joint-preview)
const TAB = JSON.parse(readFileSync(HERE + 'd2-sun-table.local.json', 'utf8')).terms;
const EXT = JSON.parse(readFileSync(HERE + 'd2-extension-terms.local.json', 'utf8'));
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
const compV4As = (jd) => {
  const a = argOf(jd);
  let v = 0;
  for (const t of TABF) { const th = t.fn(a); v += t.cos * Math.cos(th) + t.sin * Math.sin(th); }
  return -v + (-6.64) * Math.sin(a.D) + 1.42 * Math.sin(2 * a.lE);
};
const extAs = (terms, a) => { let v = 0; for (const { k, arcsec } of terms) v += arcsec * Math.sin(k[0] * a.D + k[1] * a.M + k[2] * a.Mp + k[3] * a.F); return v; };

// besselian clone
const K2 = C.physicalConstants;
const R_E = C.bodyDiametersKm.earth / 2;
const FLAT = 1 / K2.earthFlatteningInverseWGS84;
let MODE = 0;
const AR2 = (T) => ({
  Lp: (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R,
  A1: (119.75 + 131.849 * T) * D2R, A3: (313.45 + 481266.484 * T) * D2R,
});
const gmst = (jd) => { const T = (jd - 2451545) / 36525; return ((K2.gmstMeanSiderealT0Deg + K2.gmstMeanSiderealRateDegPerDay * (jd - 2451545) + K2.gmstMeanSiderealT2Deg * T * T) % 360 + 360) % 360; };
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
  const S = eclToEq(sunLon, 0, K2.currentAUDistance * (1 - e * e) / (1 + e * Math.cos(v)), eps);
  const a = argOf(jb), a2 = AR2(T);
  const bFam = (-2235 * Math.sin(a2.Lp) + 382 * Math.sin(a2.A3) + 175 * Math.sin(a2.A1 - a.F)
    + 175 * Math.sin(a2.A1 + a.F) + 127 * Math.sin(a2.Lp - a.Mp) - 115 * Math.sin(a2.Lp + a.Mp)) * 1e-6;
  const extLon = MODE === 2 ? extAs(EXT.lon, a) / 3600 : 0;
  const extLat = MODE === 2 ? extAs(EXT.lat, a) / 3600 : 0;
  const M = eclToEq(model.moon.lonDegAtJD(jb) + LP + extLon,
    model.moon.betaDegAtJD(jb) + bFam + extLat, model.moon.distanceKmAtJD(jb), eps);
  const dv = [M[0] - S[0], M[1] - S[1], M[2] - S[2]];
  const dl = Math.hypot(...dv);
  const d = dv.map((x) => x / dl);
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

// assemble the widened set: tracked 15 + new 24
const CL = JSON.parse(readFileSync(new URL('../../public/input/solar-eclipse-centerlines-nasa.json', import.meta.url), 'utf8'));
const EVENTS = [
  ...CL.events.map((ev) => ({ label: ev.label, pts: ev.points.map((p) => ({ jd: p.jd, lat: p.latDeg, lon: p.lonDeg })) })),
  ...NEW_EVENTS.map((ev) => ({ label: ev.label, pts: ev.pts.map(([y, mo, d, hh, mm, lat, lon]) => ({ jd: dateToJD(y, mo, d, hh, mm), lat, lon })) })),
];
function score(label) {
  const all = [];
  for (const ev of EVENTS) {
    const per = [];
    for (const p of ev.pts) {
      const u = umbraAt(p.jd);
      if (!u) { per.push(NaN); continue; }
      const jb = p.jd + BRIDGE;
      const year = model.time.yearFromJD(jb);
      const eps = model.earth.obliquityDeg(year) * D2R;
      const lam = model.eclipse.sunLonDegAtJD(jb) * D2R;
      const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) / D2R;
      const ss = { la: Math.asin(Math.sin(lam) * Math.sin(eps)) / D2R, lo: ((ra - gmst(p.jd) + 540) % 360) - 180 };
      const av = efUnit(p.lat, p.lon), bv = efUnit(u.latDeg, u.lonDeg), sv = efUnit(ss.la, ss.lo);
      const gv = [(bv[0] - av[0]) * R_E, (bv[1] - av[1]) * R_E, (bv[2] - av[2]) * R_E];
      const dot = gv[0] * sv[0] + gv[1] * sv[1] + gv[2] * sv[2];
      per.push(Math.hypot(gv[0] - dot * sv[0], gv[1] - dot * sv[1], gv[2] - dot * sv[2]) / 1.86);
    }
    all.push(...per.filter((v) => !Number.isNaN(v)));
    console.log(`   ${ev.label.padEnd(38)} ${per.map((v) => Number.isNaN(v) ? 'miss' : v.toFixed(1) + '″').join('  ')}`);
  }
  console.log(`   ${label}: mean ${(all.reduce((x, v) => x + v, 0) / all.length).toFixed(2)}″ | max ${Math.max(...all).toFixed(1)}″ | n ${all.length}\n`);
}
console.log(`WIDENED SET: ${EVENTS.length} events / ${EVENTS.reduce((s, e) => s + e.pts.length, 0)} points\n`);
console.log('shipped v1:'); score('shipped');
MODE = 1; console.log('derived v4 Sun table:'); score('v4');
MODE = 2; console.log('JOINT v4 + Moon ext:'); score('joint');
