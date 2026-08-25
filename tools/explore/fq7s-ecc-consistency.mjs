// FQ-7-SUN — the Sun/Moon eccentricity-law consistency test (owner: "look
// at the Moon and the Sun together").
//
// FINDING (structure): the chain carries THREE e(t) laws —
//   H/16 law           earth.eccentricity      ė(J2000) −0.84e-5/cy   (cardinal points)
//   H/3 line           moon/ecc-channel.cjs    ė ≈ −4.27e-5/cy         (the MOON's E-factor;
//                                              the doc-66 "+1.7% prediction" vs −4.204e-5 observed)
//   H/16 + H/3 imprint sunEccentricityAt       ė −5.11e-5/cy           (the SUN's EoC)
// Algebra: sunEcc(y) = H16(y) + [H3line(y) − H3line(2000)], so the Sun's
// slope = the Moon's line + the H/16 law's own slope. The annual-channel
// δė (−0.89e-5) IS that H/16 slope. JPL sides with the Moon's line.
//
// VARIANT measured here: a Sun on the MOON'S line — eccentricity =
// H16(2000) + [sunEcc(y) − H16(y)] (the H/16 term held at its J2000 value;
// every other Sun input identical). Gates: (1) JPL Sun cache 1900–2100
// (full nutation bridge); (2) the annual-channel T·sinM coefficient;
// (3) syzygy fleet elongation; (4) deep time — the H/16 term's EoC
// contribution at the 26 corpus events under the ΔT-degenerate detrend.
// Nothing shipped: the H/16 e-law is load-bearing for the cardinal-point
// fit (Step 6d) — a law decision belongs to the owner.
//
// Usage: node tools/explore/fq7s-ecc-consistency.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const SG = require('./tools/lib/scene-graph.js');
const DT = require('./tools/lib/deep-time.js');
const TL = require('./tools/lib/constants.js');
const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');
const { createSunPlanetaryCompletion } = require('@essrt/physics/eclipse/sun-planetary-completion');
const { moonSeriesExtensionDeg } = require('@essrt/physics/moon/series-extension');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const model = createModel();
const deps = model.eclipse.frameworkSunDeps;
const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0, R2AS = 206264.806;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const NU = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

// the variant law — default: the Moon's H/3 line; --derived: the C-large
// vector e = |z| from the LL + N-body mode table (fq7s-ll-modes.local.json)
const e16_2000 = model.earth.eccentricity(2000);
const eccMoonLineBase = (y) => e16_2000 + (deps.eccentricityAt(y) - model.earth.eccentricity(y));
let eccMoonLine = eccMoonLineBase;
if (process.argv.includes('--h16')) {
  // owner question: "what if both Sun and Moon rode the H/16 law?" — the Sun on
  // the pure H/16 beat law (the cardinal-point path's eccentricityAt)
  eccMoonLine = (y) => model.earth.eccentricity(y);
  console.log(`VARIANT = the pure H/16 law (cardinal path); ė over 1900–2100 ${((eccMoonLine(2100) - eccMoonLine(1900)) / 2).toExponential(3)}/cy vs observed −4.20e-5`);
}
if (process.argv.includes('--derived')) {
  const MT = JSON.parse(readFileSync(HERE + 'fq7s-ll-modes.local.json', 'utf8'));
  const R2AS_ = 206264.806;
  eccMoonLine = (y) => { const t = y - 2000; let re = 0, im = 0; for (const m of MT.modes) { const ph = m.gArcsecPerYr / R2AS_ * t; re += m.re * Math.cos(ph) - m.im * Math.sin(ph); im += m.re * Math.sin(ph) + m.im * Math.cos(ph); } return Math.hypot(re, im); };
  console.log(`VARIANT = the DERIVED vector e = |z| (mode table, g5 ${MT.g5}); e(2000) = ${eccMoonLine(2000).toFixed(7)}`);
}
console.log('ė over 1900–2100 (per cy):');
console.log(`  Sun (shipped)      ${((deps.eccentricityAt(2100) - deps.eccentricityAt(1900)) / 2).toExponential(3)}`);
console.log(`  Moon line (variant)${((eccMoonLine(2100) - eccMoonLine(1900)) / 2).toExponential(3)}`);
console.log(`  H/16 law alone     ${((model.earth.eccentricity(2100) - model.earth.eccentricity(1900)) / 2).toExponential(3)}`);
console.log('  observed (Simon)   -4.204e-5');

// finders: shipped-equivalent vs variant (same baseDeps, only eccentricityAt differs)
const MS = SG._moonSeriesForProbe();
const AR = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8'));
const BD = AR.bodyDiametersKm;
const baseDeps = {
  moonLonDegAt: (jd) => MS.truncatedLonDeg(jd),
  moonBetaDegAt: (jd) => MS.truncatedBetaDeg(jd),
  moonDistanceKmAt: (jd) => MS.truncatedDistanceKm(jd),
  deltaTSecondsAt: (jd) => DT.frameworkDeltaT(jd),
  getSynodicMonthDays: () => TL.moonSynodicMonth,
  getSunDistanceKm: () => TL.currentAUDistance,
  constants: { rEarthMetres: (BD.earth / 2) * 1000, moonDiameterKm: BD.moon, sunDiameterKm: BD.sun, j2000JD: TL.j2000JD, julianCenturyDays: TL.julianCenturyDays },
};
const mk = (eccAt) => createEclipseFinders({ ...baseDeps, frameworkSun: { ...deps, eccentricityAt: eccAt } });
const fShip = mk(deps.eccentricityAt);
const fVar = mk(eccMoonLine);

// completion (model.js wiring)
const H = C.foundational.holisticyearLength;
const meanSolarYearDays = Math.round(C.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
const embWobbleArcsec = (C.moonReference.moonDistance / (C.physicalConstants.MASS_RATIO_EARTH_MOON + 1) / C.physicalConstants.currentAUDistance) * (648000 / Math.PI);
const degPerCy = (cpd) => 360 * 36525 * cpd;
const carrierRatesDegPerCy = {
  planets: ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'].map((k) => k ? degPerCy(1 / C.planetOrbitalElements[k].solarYearInput) : degPerCy(1 / meanSolarYearDays)),
  moonElongation: degPerCy(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
};
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy });
const dPsiDegAt = (jb) => {
  const om = (NU.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const T = (jb - J2000) / 36525;
  const Dm = (297.8501921 + 445267.1114034 * T) * D2R, F = (93.2720950 + 483202.0175233 * T) * D2R;
  return (NU.psiOmega * Math.sin(om) + 0.2062 * Math.sin(2 * om) - 1.3187 * Math.sin(2 * F - 2 * Dm + 2 * om) - 0.2274 * Math.sin(2 * F + 2 * om)) / 3600;
};
const sd = (v) => { const m = v.reduce((a, q) => a + q, 0) / v.length; return Math.sqrt(v.reduce((a, q) => a + (q - m) ** 2, 0) / v.length); };

// (1)+(2): JPL Sun cache + the T·sinM coefficient
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
  const r0 = [], r1 = [], rows0 = [], rows1 = [];
  for (const [jd, jplLon] of cache.rows) {
    const jb = jd + BRIDGE, T = (jb - J2000) / 36525;
    const truth = jplLon - dPsiDegAt(jb);
    const comp = sunPlanetaryCompletionDeg(T);
    const M = (357.5291092 + 35999.0502909 * T) * D2R;
    const y0 = wrap(fShip.sunLonDegAt(jb) - comp - truth) * AS, y1 = wrap(fVar.sunLonDegAt(jb) - comp - truth) * AS;
    r0.push(y0); r1.push(y1); rows0.push({ T, M, y: y0 }); rows1.push({ T, M, y: y1 });
  }
  // sanity: the shipped-equivalent finder must reproduce the certified chain
  const chk = [];
  for (const [jd] of cache.rows.slice(0, 50)) { const jb = jd + BRIDGE; chk.push(Math.abs(wrap(fShip.sunLonDegAt(jb) - model.eclipse.sunLonDegAtJD(jb))) * AS); }
  console.log(`\nfinder rebuild control: |rebuilt − certified| max ${Math.max(...chk).toExponential(1)}″`);
  console.log(`1. JPL Sun cache (n ${r0.length}, 1900–2100, full bridge): sd ${sd(r0).toFixed(3)}″ → ${sd(r1).toFixed(3)}″`);
  const inWin = (rows) => rows.filter((r) => r.T >= -0.3 && r.T <= 0.49).map((r) => r.y);
  console.log(`   registry window 1970–2049 (n ${inWin(rows0).length}): sd ${sd(inWin(rows0)).toFixed(3)}″ → ${sd(inWin(rows1)).toFixed(3)}″   [frameworkSunVsJplRmsArcsec]`);
  const tsin = (rows) => {   // family fit: const, T, T², T³, sinM, cosM, T·sinM, T·cosM, T²·sinM, T²·cosM
    const K = 10, G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
    for (const r of rows) { const s = Math.sin(r.M), c = Math.cos(r.M), T = r.T; const v = [1, T, T * T, T ** 3, s, c, T * s, T * c, T * T * s, T * T * c]; for (let k = 0; k < K; k++) { b[k] += v[k] * r.y; for (let j = 0; j < K; j++) G[k][j] += v[k] * v[j]; } }
    const Gm = G.map((r) => Array.from(r)), x = Array.from(b);
    for (let c = 0; c < K; c++) for (let r = c + 1; r < K; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
    const co = new Float64Array(K); for (let c = K - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * co[cc]; co[c] = s / Gm[c][c]; }
    const res = rows.map((r) => { const s = Math.sin(r.M), c = Math.cos(r.M), T = r.T; const v = [1, T, T * T, T ** 3, s, c, T * s, T * c, T * T * s, T * T * c]; return r.y - v.reduce((q, vv, k) => q + vv * co[k], 0); });
    return { tSin: co[6], tCos: co[7], t2Sin: co[8], t2Cos: co[9], post: sd(res) };
  };
  const a0 = tsin(rows0), a1 = tsin(rows1);
  console.log(`2. annual channel T·sinM: ${a0.tSin.toFixed(3)}″/cy → ${a1.tSin.toFixed(3)}″/cy  (δė ${(a0.tSin / 2 / R2AS).toExponential(2)} → ${(a1.tSin / 2 / R2AS).toExponential(2)});  T·cosM ${a0.tCos.toFixed(3)} → ${a1.tCos.toFixed(3)}`);
  console.log(`   CURVATURE CHECK T²·sinM: ${a0.t2Sin.toFixed(3)}″/cy² → ${a1.t2Sin.toFixed(3)}″/cy²  (δë ${(a0.t2Sin / 2 / R2AS).toExponential(2)} → ${(a1.t2Sin / 2 / R2AS).toExponential(2)});  T²·cosM ${a0.t2Cos.toFixed(3)} → ${a1.t2Cos.toFixed(3)};  post-family residual ${a0.post.toFixed(3)}″ → ${a1.post.toFixed(3)}″`);
}

// (3): syzygy fleet
{
  const LP = C.moon.moonMeeusLpCorrection;
  const cache2 = JSON.parse(readFileSync(HERE + 'd2-syzygy-jpl-cache.local.json', 'utf8'));
  const e0 = [], e1 = [];
  for (const [jd, jplM, jplS] of cache2.rows) {
    const jb = jd + BRIDGE, T = (jb - J2000) / 36525;
    const fwM = model.moon.lonDegAtJD(jb) + LP + moonSeriesExtensionDeg(T).dLonDeg;
    const comp = sunPlanetaryCompletionDeg(T);
    e0.push(wrap((fwM - (fShip.sunLonDegAt(jb) - comp)) - (jplM - jplS)) * AS);
    e1.push(wrap((fwM - (fVar.sunLonDegAt(jb) - comp)) - (jplM - jplS)) * AS);
  }
  const rms = (v) => Math.sqrt(v.reduce((a, q) => a + q * q, 0) / v.length);
  console.log(`3. SYZYGY fleet (n ${e0.length}): RMS ${rms(e0).toFixed(3)}″ → ${rms(e1).toFixed(3)}″`);
}

// (4): deep time — the H/16 term's EoC contribution at the corpus events
{
  const auditSrc = readFileSync(new URL('../../tools/verify/eclipse-audit.js', import.meta.url), 'utf8');
  const jds = [...auditSrc.matchAll(/^\s*\[(\d+\.\d+), \{ name: '([^']+)'/gm)].map((m) => parseFloat(m[1]));
  const rows = jds.map((jd) => { const y = 2000 + (jd - J2000) / 365.25, T = (y - 2000) / 100; const de = deps.eccentricityAt(y) - eccMoonLine(y); const amp = 2 * Math.abs(de) * R2AS; return { y, T, de, amp, min: amp / 3600 * 118 }; }).sort((a, b) => a.y - b.y);
  console.log('\n4. deep time — Sun(shipped) − Sun(Moon line) = the H/16 term, at the corpus events:');
  for (const r of rows.filter((q) => q.y < 1800)) console.log(`   ${r.y.toFixed(0).padStart(5)}  δe ${r.de.toExponential(2).padStart(9)}  EoC-amp ${r.amp.toFixed(1).padStart(6)}″  ${r.min.toFixed(2)} min`);
  const K = 3, G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  for (const r of rows) { const v = [1, r.T, r.T * r.T]; for (let k = 0; k < K; k++) { b[k] += v[k] * r.min; for (let j = 0; j < K; j++) G[k][j] += v[k] * v[j]; } }
  const Gm = G.map((r) => Array.from(r)), x = Array.from(b);
  for (let c = 0; c < K; c++) for (let r = c + 1; r < K; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
  const co = new Float64Array(K); for (let c = K - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * co[cc]; co[c] = s / Gm[c][c]; }
  const res = rows.map((r) => r.min - (co[0] + co[1] * r.T + co[2] * r.T * r.T));
  console.log(`   timing RMS ${Math.sqrt(rows.reduce((s, r) => s + r.min * r.min, 0) / rows.length).toFixed(2)} min raw → ${Math.sqrt(res.reduce((s, q) => s + q * q, 0) / res.length).toFixed(3)} min after the ΔT-degenerate detrend (threshold ~0.2)`);
}
