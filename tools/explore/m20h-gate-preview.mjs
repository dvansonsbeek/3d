// 20.3h PHASE 2b-A — the pre-registered 4-gate OUT-OF-SAMPLE preview.
// Candidate: the round-2 derived Delaunay λ tail (m20h-extraction-r2:
// five terms, dt-halving-converged, content 0.48″; the alias-breaker's
// [6,0,−2,0] target extracted at 0.572″ vs the MPP02-implied 0.57″).
// Acceptance (the D2 protocol, ALL FOUR jointly, JPL/NASA never fit):
//   1. all-phase λ vs JPL (960)   — must improve
//   2. all-phase β vs JPL         — must not degrade (addon is λ-only)
//   3. 179-syzygy elongation fleet — must improve
//   4. NASA centerline scoreboard — must not degrade
// Mechanism: moonSeriesExtensionDeg is wrapped BEFORE the package loads
// (require-cache patch) behind a toggle, so ONE tier instance serves the
// shipped and +addon modes bit-faithfully — including the umbra chain.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);

const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
// the round-2 addon: [D, M, Mp, F, sineAmp″] (converged at dt 0.01 ≡ 0.005)
const ADDON = [
  [6, 0, -2, 0, 0.572],
  [6, 0, -3, 0, 0.294],
  [4, 0, -2, 2, -0.169],
  [4, -2, -2, 0, 0.161],
  [0, 0, 5, 0, 0.112],
];
const addonDeg = (T) => {
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
  const M = (357.5291092 + 35999.0502909 * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
  const F = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
  let s = 0;
  for (const [d, m, mp, f, amp] of ADDON) s += amp * Math.sin(d * D + m * M + mp * Mp + f * F);
  return s / 3600;
};

// ── the require-cache patch, BEFORE the package loads ───────────────────
const extMod = require('./packages/physics/src/moon/series-extension.cjs');
const origExt = extMod.moonSeriesExtensionDeg;
let ADDON_ON = false;
extMod.moonSeriesExtensionDeg = (T) => {
  const b = origExt(T);
  return ADDON_ON ? { dLonDeg: b.dLonDeg + addonDeg(T), dLatDeg: b.dLatDeg } : b;
};
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const sc = (v) => { const m = v.reduce((a, x) => a + x, 0) / v.length; return { m, s: Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length) }; };

const AR2 = (T) => ({
  Lp: (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R,
  A1: (119.75 + 131.849 * T) * D2R, A3: (313.45 + 481266.484 * T) * D2R,
});
const argOf = (jb) => {
  const T = (jb - J2000) / 36525;
  return {
    D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
    M: (357.5291092 + 35999.0502909 * T) * D2R,
    Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
    F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
  };
};
// shipped Moon λ/β on the D2 validation axis, extension via the (patched)
// module so the toggle applies uniformly
function shipMoon(jb) {
  const T = (jb - J2000) / 36525;
  const a = argOf(jb), a2 = AR2(T);
  const bFam = (-2235 * Math.sin(a2.Lp) + 382 * Math.sin(a2.A3) + 175 * Math.sin(a2.A1 - a.F)
    + 175 * Math.sin(a2.A1 + a.F) + 127 * Math.sin(a2.Lp - a.Mp) - 115 * Math.sin(a2.Lp + a.Mp)) * 1e-6;
  const ext = extMod.moonSeriesExtensionDeg(T);
  return { lon: model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg, lat: model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg };
}

// note: the shipped A2 planetary λ rows ride inside the tier besselian,
// not this axis — consistent with the D2-check convention the banked
// numbers use (extension only); the comparison is like-for-like across
// the toggle either way.
const cache = require('./tools/explore/d2-moonval-jpl-cache.local.json');
const SZ = require('./tools/explore/d2-syzygy-jpl-cache.local.json');

function allPhase() {
  const eL = [], eB = [];
  for (const [jd, jplLon, jplLat] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsi = (N.psiOmega * Math.sin(om)) / 3600;
    const s = shipMoon(jb);
    eL.push(wrap(s.lon - (jplLon - dPsi)) * AS);
    eB.push((s.lat - jplLat) * AS);
  }
  return { L: sc(eL), B: sc(eB) };
}
function fleet() {
  const e = [];
  for (const [jd, jplM, jplS] of SZ.rows) {
    const jb = jd + BRIDGE;
    const s = shipMoon(jb);
    const sun = model.eclipse.sunLonDegAtJD(jb);
    e.push(wrap((s.lon - sun) - (jplM - jplS)) * AS);
  }
  const st = sc(e);
  return { m: st.m, rms: Math.sqrt(st.m * st.m + st.s * st.s) };
}
function centerlines() {
  const CL = JSON.parse(require('fs').readFileSync(new URL('../../public/input/solar-eclipse-centerlines-nasa.json', import.meta.url), 'utf8'));
  const K = C.physicalConstants;
  const R_E = C.bodyDiametersKm.earth / 2;
  const gmst = (jd) => { const T = (jd - J2000) / 36525; return ((K.gmstMeanSiderealT0Deg + K.gmstMeanSiderealRateDegPerDay * (jd - J2000) + K.gmstMeanSiderealT2Deg * T * T) % 360 + 360) % 360; };
  const efUnit = (la, lo) => [-Math.cos(la * D2R) * Math.cos(lo * D2R), Math.sin(la * D2R), Math.cos(la * D2R) * Math.sin(lo * D2R)];
  const all = [], perEvent = [];
  for (const ev of CL.events) {
    const per = [];
    for (const p of ev.points) {
      const u = model.eclipse.umbraGroundAtJD(p.jd);
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
    perEvent.push(`${ev.label}: ${(per.reduce((x, v) => x + v, 0) / per.length).toFixed(1)}″`);
  }
  return { mean: all.reduce((x, v) => x + v, 0) / all.length, max: Math.max(...all), perEvent };
}

for (const mode of [false, true]) {
  ADDON_ON = mode;
  const ap = allPhase(), fl = fleet(), clr = centerlines();
  console.log(`\n${mode ? '+ ROUND-2 ADDON' : 'SHIPPED'}:`);
  console.log(`  all-phase λ scatter ${ap.L.s.toFixed(2)}″ · β scatter ${ap.B.s.toFixed(2)}″`);
  console.log(`  fleet mean ${fl.m.toFixed(2)}″ RMS ${fl.rms.toFixed(2)}″`);
  console.log(`  centerlines mean ${clr.mean.toFixed(2)}″ max ${clr.max.toFixed(1)}″`);
  if (mode) console.log('  per-event: ' + clr.perEvent.join(' · '));
}
