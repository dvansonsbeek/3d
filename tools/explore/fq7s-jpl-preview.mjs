// FQ-7-SUN S2 — JPL out-of-sample preview of a candidate completion table.
//
// Candidate table: vector rows {kl[6], kM[6], cos, sin} from
// fq7s-deep-extraction (extraction-native sign). The candidate
// completion is assembled in the EXACT shipped evaluator form
// (sun-planetary-completion.cjs): −table − wobble·sin(D) + 1.42·sin(2lE)
// on the same framework carriers — only the TERMS table differs.
// Gates: (1) the 1,600-epoch JPL Sun cache (fuller-nutation subtraction
// on BOTH sides — comparison slack removed); (2) the 179-syzygy fleet
// elongation, completion applied in the shipped SUBTRACT convention.
//
// Usage: node tools/explore/fq7s-jpl-preview.mjs [table=fq7s-v4-table.local.json]

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

const TABLE_FILE = process.argv[2] || 'fq7s-v4-table.local.json';
const CAND = JSON.parse(readFileSync(HERE + TABLE_FILE, 'utf8'));
console.log(`candidate: ${TABLE_FILE} (${CAND.terms.length} terms, fidelity ${CAND.pass2Rms.toFixed(3)}″)`);

const { createModel, DEFAULT_CONSTANTS: C } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const { createSunPlanetaryCompletion } = require('../../packages/physics/src/eclipse/sun-planetary-completion.cjs');
const { moonSeriesExtensionDeg } = require('../../packages/physics/src/moon/series-extension.cjs');
const TL = require('../lib/constants.js');
const model = createModel();
const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const NU = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

// shipped completion, wired exactly as model.js does
const H = C.foundational.holisticyearLength;
const meanSolarYearDays = Math.round(C.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
const embWobbleArcsec = (C.moonReference.moonDistance / (C.physicalConstants.MASS_RATIO_EARTH_MOON + 1) / C.physicalConstants.currentAUDistance) * (648000 / Math.PI);
const degPerCy = (cpd) => 360 * 36525 * cpd;
const carrierRatesDegPerCy = {
  planets: [
    degPerCy(1 / C.planetOrbitalElements.mercury.solarYearInput),
    degPerCy(1 / C.planetOrbitalElements.venus.solarYearInput),
    degPerCy(1 / meanSolarYearDays),
    degPerCy(1 / C.planetOrbitalElements.mars.solarYearInput),
    degPerCy(1 / C.planetOrbitalElements.jupiter.solarYearInput),
    degPerCy(1 / C.planetOrbitalElements.saturn.solarYearInput),
  ],
  moonElongation: degPerCy(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
};
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy });

// candidate completion — same form, candidate TERMS
const ARG_L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const PERI = [77.456, 131.564, 102.937, 336.060, 14.331, 93.057];
const ARG_D0 = 297.8501921;
const L1 = carrierRatesDegPerCy.planets, D1 = carrierRatesDegPerCy.moonElongation;
const candCompletionDeg = (T) => {
  const l = new Float64Array(6), M = new Float64Array(6);
  for (let i = 0; i < 6; i++) {
    l[i] = (ARG_L0[i] + L1[i] * T) * D2R;
    M[i] = l[i] - PERI[i] * D2R;
  }
  let table = 0;
  for (const t of CAND.terms) {
    let th = 0;
    for (let i = 0; i < 6; i++) th += t.kl[i] * l[i] + t.kM[i] * M[i];
    table += t.cos * Math.cos(th) + t.sin * Math.sin(th);
  }
  const D = (ARG_D0 + D1 * T) * D2R;
  return (-table - embWobbleArcsec * Math.sin(D) + 1.42 * Math.sin(2 * l[2])) / 3600;
};

// fuller nutation subtraction (both variants see the same JPL side)
const dPsiDegAt = (jb) => {
  const om = (NU.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const T = (jb - J2000) / 36525;
  const Dm = (297.8501921 + 445267.1114034 * T) * D2R;
  const F = (93.2720950 + 483202.0175233 * T) * D2R;
  return (NU.psiOmega * Math.sin(om) + 0.2062 * Math.sin(2 * om)
    - 1.3187 * Math.sin(2 * F - 2 * Dm + 2 * om)
    - 0.2274 * Math.sin(2 * F + 2 * om)) / 3600;
};

// ── gate 1: the 1,600-epoch JPL Sun cache ───────────────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
  const y0 = [], y1 = [];
  for (const [jd, jplLon] of cache.rows) {
    const jb = jd + BRIDGE;
    const T = (jb - J2000) / 36525;
    const dPsiDeg = dPsiDegAt(jb);
    const s0 = model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T);
    const s1 = model.eclipse.sunLonDegAtJD(jb) - candCompletionDeg(T);
    y0.push(wrap(s0 - (jplLon - dPsiDeg)) * AS);
    y1.push(wrap(s1 - (jplLon - dPsiDeg)) * AS);
  }
  const st = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length); };
  console.log(`1. JPL Sun cache (n ${y0.length}, 1900–2100, fuller nutation): sd ${st(y0).toFixed(3)}″ → ${st(y1).toFixed(3)}″`);
}

// ── gate 2: syzygy fleet elongation ─────────────────────────────────────
{
  const LP = C.moon.moonMeeusLpCorrection;
  const cache2 = JSON.parse(readFileSync(HERE + 'd2-syzygy-jpl-cache.local.json', 'utf8'));
  const e0 = [], e1 = [];
  for (const [jd, jplM, jplS] of cache2.rows) {
    const jb = jd + BRIDGE;
    const T = (jb - J2000) / 36525;
    const fwM = model.moon.lonDegAtJD(jb) + LP + moonSeriesExtensionDeg(T).dLonDeg;
    const s0 = model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T);
    const s1 = model.eclipse.sunLonDegAtJD(jb) - candCompletionDeg(T);
    e0.push(wrap((fwM - s0) - (jplM - jplS)) * AS);
    e1.push(wrap((fwM - s1) - (jplM - jplS)) * AS);
  }
  const rms = (v) => Math.sqrt(v.reduce((a, b) => a + b * b, 0) / v.length);
  console.log(`2. SYZYGY fleet (n ${e0.length}, completion applied): RMS ${rms(e0).toFixed(3)}″ → ${rms(e1).toFixed(3)}″`);
}
