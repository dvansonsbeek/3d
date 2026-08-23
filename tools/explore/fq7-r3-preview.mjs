// FQ-7 R3 SHIPPING PREVIEW — the J2 node family against the gates.
//
// Candidate correction (ADD to the shipped Moon; instrument args; the
// run→instrument frame mapping calibrated by the two documented controls
// — λ Ω ≈ Meeus +1962e-6 sin(Lp−F) at 1.028, β sin(Lp) ≈ −2235e-6 at
// 0.971, i.e. the amplitude scale certified at ±3%):
//   λ: −0.544 sin(Mp−Ω) + 0.546 sin(Mp+Ω) + 0.371 sin(2F+Ω) + 0.103 sin(2D+Ω)
//   β: −0.375 sin(F−Ω)
// Gates previewed: (1) dense 2-day JPL λ/β (the non-aliasing arbiter);
// (2) the official 960-epoch all-phase caches; (3) the 179-syzygy fleet.
// Centerlines run with the real module at the landing (audit compare).
//
// Usage: node tools/explore/fq7-r3-preview.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const { moonSeriesExtensionDeg } = require('@essrt/physics/moon/series-extension');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const N = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

const args5 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
  Om: (125.0445479 - 1934.1362891 * T + 0.0020754 * T * T) * D2R,
});
const candLonAs = (T) => {
  const a = args5(T);
  return -0.544 * Math.sin(a.Mp - a.Om) + 0.546 * Math.sin(a.Mp + a.Om)
    + 0.371 * Math.sin(2 * a.F + a.Om) + 0.103 * Math.sin(2 * a.D + a.Om);
};
const candLatAs = (T) => {
  const a = args5(T);
  return -0.375 * Math.sin(a.F - a.Om);
};

const st = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length) }; };

// ── 1. dense 2-day JPL (the arbiter) ────────────────────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'fq7-jpl-dense.local.json', 'utf8'));
  const y0L = [], y1L = [], y0B = [], y1B = [];
  for (const [jd, jplLon, jplLat] of cache.rows) {
    if (!Number.isFinite(jd) || !Number.isFinite(jplLon)) continue;
    const jb = jd + BRIDGE;
    const T = (jb - J2000) / 36525;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
    const ext = moonSeriesExtensionDeg(T);
    const ag = args5(T);
    const LpA = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
    const A1a = (119.75 + 131.849 * T) * D2R;
    const A3a = (313.45 + 481266.484 * T) * D2R;
    const bFam = (-2235 * Math.sin(LpA) + 382 * Math.sin(A3a) + 175 * Math.sin(A1a - ag.F)
      + 175 * Math.sin(A1a + ag.F) + 127 * Math.sin(LpA - ag.Mp) - 115 * Math.sin(LpA + ag.Mp)) * 1e-6;
    const shipL = model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg;
    const shipB = model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg;
    y0L.push(wrap(shipL - (jplLon - dPsiDeg)) * AS);
    y1L.push(wrap(shipL + candLonAs(T) / 3600 - (jplLon - dPsiDeg)) * AS);
    y0B.push((shipB - jplLat) * AS);
    y1B.push((shipB + candLatAs(T) / 3600 - jplLat) * AS);
  }
  const a = st(y0L), b = st(y1L), c = st(y0B), d = st(y1B);
  console.log(`1. DENSE JPL (n ${y0L.length}, 2-day 1985–2025):`);
  console.log(`   λ: sd ${a.sd.toFixed(3)}″ → ${b.sd.toFixed(3)}″`);
  console.log(`   β: sd ${c.sd.toFixed(3)}″ → ${d.sd.toFixed(3)}″`);
}

// ── 2. the official 960-epoch all-phase caches ───────────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-moonval-jpl-cache.local.json', 'utf8'));
  const y0L = [], y1L = [], y0B = [], y1B = [];
  for (const [jd, jplLon, jplLat] of cache.rows) {
    const jb = jd + BRIDGE;
    const T = (jb - J2000) / 36525;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
    const ext = moonSeriesExtensionDeg(T);
    const ag = args5(T);
    const LpA = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
    const A1a = (119.75 + 131.849 * T) * D2R;
    const A3a = (313.45 + 481266.484 * T) * D2R;
    const bFam = (-2235 * Math.sin(LpA) + 382 * Math.sin(A3a) + 175 * Math.sin(A1a - ag.F)
      + 175 * Math.sin(A1a + ag.F) + 127 * Math.sin(LpA - ag.Mp) - 115 * Math.sin(LpA + ag.Mp)) * 1e-6;
    const shipL = model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg;
    const shipB = model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg;
    y0L.push(wrap(shipL - (jplLon - dPsiDeg)) * AS);
    y1L.push(wrap(shipL + candLonAs(T) / 3600 - (jplLon - dPsiDeg)) * AS);
    y0B.push((shipB - jplLat) * AS);
    y1B.push((shipB + candLatAs(T) / 3600 - jplLat) * AS);
  }
  const a = st(y0L), b = st(y1L), c = st(y0B), d = st(y1B);
  console.log(`\n2. OFFICIAL all-phase (n ${y0L.length}, 960 LCG epochs 1970–2049):`);
  console.log(`   λ: sd ${a.sd.toFixed(3)}″ → ${b.sd.toFixed(3)}″   [gate: must not degrade]`);
  console.log(`   β: sd ${c.sd.toFixed(3)}″ → ${d.sd.toFixed(3)}″`);
}

// ── 3. syzygy fleet ─────────────────────────────────────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-syzygy-jpl-cache.local.json', 'utf8'));
  const e0 = [], e1 = [];
  for (const [jd, jplM, jplS] of cache.rows) {
    const jb = jd + BRIDGE;
    const T = (jb - J2000) / 36525;
    const fwM = model.moon.lonDegAtJD(jb) + LP + moonSeriesExtensionDeg(T).dLonDeg;
    const fwS = model.eclipse.sunLonDegAtJD(jb);
    e0.push(wrap((fwM - fwS) - (jplM - jplS)) * AS);
    e1.push(wrap((fwM + candLonAs(T) / 3600 - fwS) - (jplM - jplS)) * AS);
  }
  const rms = (v) => Math.sqrt(v.reduce((a, b) => a + b * b, 0) / v.length);
  console.log(`\n3. SYZYGY fleet (n ${e0.length}; completion NOT subtracted here — Δ is the metric):`);
  console.log(`   elongation RMS ${rms(e0).toFixed(3)}″ → ${rms(e1).toFixed(3)}″   [gate: must not degrade]`);
}
