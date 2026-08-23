// FQ-7 DUST ROUND, PHASE 3 — the 4-gate shipping preview.
//
// Candidate: the lab-accepted dust terms (fq7-dust-terms.local.json) —
// 43 λ + 33 β pure-Delaunay sine rows, lab amplitudes, ADD to the
// shipped Moon on the instrument arguments (sign convention certified
// by the row-for-row lab↔MPP02 sign agreement).
// Gates previewed here: (1) dense 2-day JPL; (2) official 960-epoch
// all-phase caches; (3) 179-syzygy fleet. Centerlines run with the real
// module at the landing (audit compare).
//
// Usage: node tools/explore/fq7-dust-preview.mjs [--flip]
//   --flip: sign-flip control — every row negated; all gates must DEGRADE.

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

const dust = JSON.parse(readFileSync(HERE + 'fq7-dust-terms.local.json', 'utf8'));
const FLIP = process.argv.includes('--flip') ? -1 : 1;
if (FLIP === -1) for (const r of [...dust.lon, ...dust.lat]) r.amp = -r.amp;
console.log(`dust candidate: λ ${dust.lon.length} rows · β ${dust.lat.length} rows${FLIP === -1 ? '  [SIGN-FLIP CONTROL — must degrade]' : ''}`);

const args4 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});
const candLonAs = (T) => {
  const a = args4(T);
  let s = 0;
  for (const r of dust.lon) s += r.amp * Math.sin(r.a[0] * a.D + r.a[1] * a.M + r.a[2] * a.Mp + r.a[3] * a.F);
  return s;
};
const candLatAs = (T) => {
  const a = args4(T);
  let s = 0;
  for (const r of dust.lat) s += r.amp * Math.sin(r.a[0] * a.D + r.a[1] * a.M + r.a[2] * a.Mp + r.a[3] * a.F);
  return s;
};

const st = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length) }; };

function evalCache(file, label, note) {
  const cache = JSON.parse(readFileSync(HERE + file, 'utf8'));
  const y0L = [], y1L = [], y0B = [], y1B = [];
  for (const [jd, jplLon, jplLat] of cache.rows) {
    if (!Number.isFinite(jd) || !Number.isFinite(jplLon)) continue;
    const jb = jd + BRIDGE;
    const T = (jb - J2000) / 36525;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
    const ext = moonSeriesExtensionDeg(T);
    const ag = args4(T);
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
  console.log(`\n${label} (n ${y0L.length}${note}):`);
  console.log(`   λ: sd ${a.sd.toFixed(3)}″ → ${b.sd.toFixed(3)}″`);
  console.log(`   β: sd ${c.sd.toFixed(3)}″ → ${d.sd.toFixed(3)}″`);
}

evalCache('fq7-jpl-dense.local.json', '1. DENSE JPL', ', 2-day 1985–2025');
evalCache('d2-moonval-jpl-cache.local.json', '2. OFFICIAL all-phase', ', 960 LCG epochs 1970–2049  [gate: must not degrade]');

// ── syzygy fleet ────────────────────────────────────────────────────────
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
