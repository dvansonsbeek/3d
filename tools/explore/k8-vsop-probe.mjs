#!/usr/bin/env node
// K8 — VSOP87 INGEST VALIDATION: the truncated VSOP87A evaluator
// (packages/physics/src/reference/vsop87.cjs) measured against the JPL
// Horizons cache (data/jpl-cache.json, astrometric J2000 RA/Dec) across
// the cache's full 1600–2400 span. This MEASURES the delivered accuracy
// of the standard-model overlay's reference side (theory-vs-DE difference
// + truncation + rounding together) — the number the overlay's Δ readout
// stands on. Light-time is applied here exactly as the scene applies it
// (one re-evaluation at jd − τ).
//
// GATE (exit 1 on failure): per-planet RMS ≤ 5″ and max ≤ 25″; Sun RMS
// ≤ 5″; Moon (ELP/MPP02 truncated) RMS ≤ 1″ and max ≤ 3″. The theories
// vs DE are sub-arcsec-to-arcsec class in this window, so a violation
// means an ingest/frame/truncation defect, not physics.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const { vsop87AstrometricGeoEclipticAU } = require(ROOT + 'packages/reference/src/vsop87.cjs');
const { mpp02AstrometricGeoEclipticJ2000Km } = require(ROOT + 'packages/reference/src/elp-mpp02.cjs');
const { stephensonDeltaT } = require(ROOT + 'packages/reference/src/published-curves.cjs');
const dtPoly = JSON.parse(require('node:fs').readFileSync(ROOT + 'public/input/stephenson-2016-deltaT-polynomial.json', 'utf8'));
const C = require(ROOT + 'tools/lib/constants.js');
const { TARGET_CODES } = require(ROOT + 'tools/lib/horizons-client.js');
const fs = require('node:fs');

const cache = JSON.parse(fs.readFileSync(ROOT + 'data/jpl-cache.json', 'utf8'));

// One-home rule: NAIF codes from the horizons client (inverted), AU/c/ε
// from the model's constants homes — nothing hardcoded here.
const NAIF = Object.fromEntries(
  Object.entries(TARGET_CODES).map(([n, code]) => [code, n]));
const AU_KM = C.currentAUDistance;
const C_KM_S = C.speedOfLight;
const J2000_JD = 2451545.0;
const EPS_J2000 = C.ASTRO_REFERENCE.obliquityJ2000_deg * Math.PI / 180;   // ecliptic → equatorial J2000 (IAU 2006 anchor)

function raDecJ2000(vecEcl) {
  const [x, y, z] = vecEcl;
  const ce = Math.cos(EPS_J2000), se = Math.sin(EPS_J2000);
  const xe = x, ye = y * ce - z * se, ze = y * se + z * ce;
  const ra = ((Math.atan2(ye, xe) * 180 / Math.PI) % 360 + 360) % 360;
  const dec = Math.atan2(ze, Math.hypot(xe, ye)) * 180 / Math.PI;
  return [ra, dec];
}

const acc = {};
for (const name of Object.values(NAIF)) acc[name] = { n: 0, sum2: 0, max: 0 };

let processed = 0;
for (const key of Object.keys(cache)) {
  const [code, jdStr] = key.split('_');
  const body = NAIF[Number(code)];
  if (!body) continue;
  const jd = parseFloat(jdStr);
  const e = cache[key];
  if (!e || typeof e.ra !== 'number') continue;

  // astrometric: body at t − τ, Earth at reception time t (quantity-1).
  // Moon: TT via the STANDARD ΔT (Stephenson 2016 spline) + the
  // BCRS light-time construction (geo(t−τ) − v⊕·τ). Gated on the
  // observed-ΔT era only (≤2015.5): at the spline's 2016 data/projection
  // boundary and beyond, the cache's Horizons ΔT and the Stephenson
  // model diverge (boundary spike ~40″, then ~100″/cy Moon-equivalent —
  // both measured), which is a ΔT-model difference, not an ingest
  // defect.
  let v;
  if (body === 'moon') {
    const yr = 2000 + (jd - J2000_JD) / 365.25;
    if (yr > 2015.5) continue;
    const jdTT = jd + stephensonDeltaT(yr, dtPoly) / 86400;
    const g = mpp02AstrometricGeoEclipticJ2000Km(jdTT, AU_KM / C_KM_S / 86400, AU_KM);
    v = [g[0] / AU_KM, g[1] / AU_KM, g[2] / AU_KM];
  } else {
    v = vsop87AstrometricGeoEclipticAU(body, jd, AU_KM / C_KM_S / 86400);
  }

  const [ra, dec] = raDecJ2000(v);
  let dRA = ra - e.ra;
  if (dRA > 180) dRA -= 360;
  if (dRA < -180) dRA += 360;
  dRA *= Math.cos(e.dec * Math.PI / 180);
  const dDec = dec - e.dec;
  const sep = Math.hypot(dRA, dDec) * 3600;
  const a = acc[body];
  a.n++; a.sum2 += sep * sep; if (sep > a.max) a.max = sep;
  processed++;
}

console.log(`K8 VSOP87 probe — ${processed} cache samples (1600–2400, astrometric J2000)`);
console.log('body     │      n │  RMS ″ │  max ″');
let fail = false;
for (const [name, a] of Object.entries(acc)) {
  if (a.n === 0) continue;
  const rms = Math.sqrt(a.sum2 / a.n);
  const bad = name === 'moon'
    ? (rms > 1 || a.max > 3)   // sub-arcsec measured over the observed-ΔT era (≤2015.5)
    : (rms > 5 || (name !== 'sun' && a.max > 25));
  if (bad) fail = true;
  console.log(`${name.padEnd(8)} │ ${String(a.n).padStart(6)} │ ${rms.toFixed(2).padStart(6)} │ ${a.max.toFixed(2).padStart(6)}${bad ? '  ✗' : ''}`);
}
console.log(fail ? '\nFAIL — ingest/frame/truncation defect (VSOP87-vs-DE is arcsec-class here)' : '\nPASS — the truncated standard-model reference is JPL-cache-verified');
process.exit(fail ? 1 : 0);
