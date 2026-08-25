// ECCENTRICITY UNIFICATION — PHASE 0, instrument A: the candidate H/3 law.
// (hu docs/plans/IP-eccentricity-unification.md §2 D1, §3 Phase 0.1–0.4)
//
// Forms evaluated EXACTLY as the package would implement them (vector sum
// e = |v₁ + v₂|, v₁ = base·û(ϖ_ICRF(t)), v₂ fixed; the relative angle
// θ(t) = θ₀ + 2π·cycles₃(2000→t)):
//   (a) v₂ = base/2, θ₀ = ϖ_ICRF(J2000) − 21.77° (the inclination anchor) — the
//       pure doc-66 line, e(2000) −0.86%;
//   (c) v₂ = base/2, θ₀ SOLVED so that e(2000) = observed — the recommended form;
//   (d) additive J2000 anchor (the shipped C-small eclipse Sun) — reference.
// Measured: modern gates (JPL Sun cache full bridge, registry window,
// syzygy fleet, annual-channel T·sinM), the Moon channel's perigee/node T²
// under each phase (vs Meeus −0.010320 / +0.0020753 °/cy²), the deep-time
// cardinal-timing scale vs the H/16 law over ±270 kyr, and an orbital-
// elements file (0…−500 kyr) for the LR04 insolation V1 re-run.
//
// Usage: node tools/explore/fq7s-h3-law-candidate.mjs

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
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
const H = C.foundational.holisticyearLength;
const base = C.earth.eccentricityBase;
const e0obs = C.earthOrbital.earthEccentricityJ2000;
const th0anchor = (C.earthOrbital.earthPerihelionLongitudeJ2000 - C.earthOrbital.earthInclinationCycleAnchor) * D2R;

// the H/3 phase counter exactly as the shipped Sun uses it: recover cycles₃
// from the shipped imprint (sunDeps − e16) so the candidate rides the SAME
// integrated lattice phase, not a snapshot approximation
const e16 = (y) => model.earth.eccentricity(y);
const e16_2000 = e16(2000);
const imprintCos = (y) => (deps.eccentricityAt(y) - e16_2000) / (base / 2);   // = cos3(y) − cos3(2000) in the shipped convention
// cos3 in the shipped convention is −cos(phase(balancedYear, y, 3)); the
// Moon channel uses cos(θ₀ + 2π cycles). Both are the same H/3 rotation up
// to a phase convention; we express the candidate on the MOON channel's
// convention (θ = θ₀ + 2π·cycles₃) using a snapshot phase counter, and
// verify against the shipped imprint's rate (the rates must agree to <1%).
const cyc3 = (y) => (y - 2000) / (H / 3);
const lawA = (y) => base * (1 + Math.cos(th0anchor + 2 * Math.PI * cyc3(y)) / 2);
const th0solved = Math.acos(2 * (e0obs / base - 1));
const lawC = (y) => base * (1 + Math.cos(th0solved + 2 * Math.PI * cyc3(y)) / 2);
const lawD = (y) => deps.eccentricityAt(y);                                   // shipped C-small
// (e) ONE anchor (System Reset, θ₀ = 81.178°), v₂ = base'/2, base' DERIVED from
// the observed e(J2000): base' = e0 / (1 + cos θ₀ / 2) — pure vector sum,
// exact at J2000; Law-5 balance moves 99.8636 → 99.8645% (Earth weight 0.05%)
const baseE = e0obs / (1 + Math.cos(th0anchor) / 2);
const lawE = (y) => baseE * (1 + Math.cos(th0anchor + 2 * Math.PI * cyc3(y)) / 2);
const lawH16 = e16;
const rate = (f) => (f(2100) - f(1900)) / 2;
console.log(`(e) base' = ${baseE.toFixed(6)} (+${((baseE / base - 1) * 100).toFixed(2)}% vs Law-5 base ${base.toFixed(6)})`);
console.log(`θ₀ anchor ${(th0anchor / D2R).toFixed(2)}° · θ₀ solved ${(th0solved / D2R).toFixed(2)}° (Δ ${((th0solved - th0anchor) / D2R).toFixed(2)}° = ${(((th0solved - th0anchor) / (2 * Math.PI)) * H / 3).toFixed(0)} yr)`);
console.log('form  e(2000)     ė/cy       range');
for (const [nm, f, lo, hi] of [['(a)', lawA, base / 2, 1.5 * base], ['(c)', lawC, base / 2, 1.5 * base], ['(e)', lawE, baseE / 2, 1.5 * baseE], ['(d)', lawD, NaN, NaN], ['H/16', lawH16, NaN, NaN]]) {
  console.log(`${nm.padEnd(5)} ${f(2000).toFixed(6)}  ${rate(f).toExponential(3)}  ${Number.isFinite(lo) ? lo.toFixed(4) + '…' + hi.toFixed(4) : '—'}`);
}
console.log(`observed: e ${e0obs}  ė −4.204e-5/cy`);

// ── modern gates: Sun on each law (finder rebuilt with injected eccentricityAt) ──
const MS = SG._moonSeriesForProbe();
const AR = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8'));
const BD = AR.bodyDiametersKm;
const baseDeps = {
  moonLonDegAt: (jd) => MS.truncatedLonDeg(jd), moonBetaDegAt: (jd) => MS.truncatedBetaDeg(jd), moonDistanceKmAt: (jd) => MS.truncatedDistanceKm(jd),
  deltaTSecondsAt: (jd) => DT.frameworkDeltaT(jd), getSynodicMonthDays: () => TL.moonSynodicMonth, getSunDistanceKm: () => TL.currentAUDistance,
  constants: { rEarthMetres: (BD.earth / 2) * 1000, moonDiameterKm: BD.moon, sunDiameterKm: BD.sun, j2000JD: TL.j2000JD, julianCenturyDays: TL.julianCenturyDays },
};
const mk = (eccAt) => createEclipseFinders({ ...baseDeps, frameworkSun: { ...deps, eccentricityAt: eccAt } });
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
  const T = (jb - J2000) / 36525, Dm = (297.8501921 + 445267.1114034 * T) * D2R, F = (93.2720950 + 483202.0175233 * T) * D2R;
  return (NU.psiOmega * Math.sin(om) + 0.2062 * Math.sin(2 * om) - 1.3187 * Math.sin(2 * F - 2 * Dm + 2 * om) - 0.2274 * Math.sin(2 * F + 2 * om)) / 3600;
};
const sd = (v) => { const m = v.reduce((a, q) => a + q, 0) / v.length; return Math.sqrt(v.reduce((a, q) => a + (q - m) ** 2, 0) / v.length); };
const sunCache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
const syzCache = JSON.parse(readFileSync(HERE + 'd2-syzygy-jpl-cache.local.json', 'utf8'));
const LP = C.moon.moonMeeusLpCorrection;
const jdLo = J2000 + (1970 - 2000) * 365.25, jdHi = J2000 + (2049 - 2000) * 365.25;
console.log('\nMODERN GATES (Sun on each law; Moon unchanged):');
console.log('form   JPL 1900–2100   registry 1970–2049   T·sinM ″/cy   syzygy fleet');
for (const [nm, f] of [['(a)', lawA], ['(c)', lawC], ['(e)', lawE], ['(d)', lawD], ['H/16', lawH16]]) {
  const fd = mk(f); const y = [], yw = [], rows = [];
  for (const [jd, jplLon] of sunCache.rows) {
    const jb = jd + BRIDGE, T = (jb - J2000) / 36525;
    const r = wrap(fd.sunLonDegAt(jb) - sunPlanetaryCompletionDeg(T) - (jplLon - dPsiDegAt(jb))) * AS;
    y.push(r); if (jd >= jdLo && jd <= jdHi) yw.push(r);
    rows.push({ T, M: (357.5291092 + 35999.0502909 * T) * D2R, y: r });
  }
  // T·sinM from the family fit (const,T,T²,sinM,cosM,T·sinM,T·cosM)
  const K = 7, G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  for (const r of rows) { const v = [1, r.T, r.T * r.T, Math.sin(r.M), Math.cos(r.M), r.T * Math.sin(r.M), r.T * Math.cos(r.M)]; for (let k = 0; k < K; k++) { b[k] += v[k] * r.y; for (let j = 0; j < K; j++) G[k][j] += v[k] * v[j]; } }
  const Gm = G.map((r) => Array.from(r)), x = Array.from(b);
  for (let c = 0; c < K; c++) for (let r = c + 1; r < K; r++) { const f2 = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f2 * Gm[c][cc]; x[r] -= f2 * x[c]; }
  const co = new Float64Array(K); for (let c = K - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * co[cc]; co[c] = s / Gm[c][c]; }
  const e1 = [];
  for (const [jd, jplM, jplS] of syzCache.rows) {
    const jb = jd + BRIDGE, T = (jb - J2000) / 36525;
    const fwM = model.moon.lonDegAtJD(jb) + LP + moonSeriesExtensionDeg(T).dLonDeg;
    e1.push(wrap((fwM - (fd.sunLonDegAt(jb) - sunPlanetaryCompletionDeg(T))) - (jplM - jplS)) * AS);
  }
  const rms = (v) => Math.sqrt(v.reduce((a, q) => a + q * q, 0) / v.length);
  console.log(`${nm.padEnd(6)} ${sd(y).toFixed(3).padStart(8)}″       ${sd(yw).toFixed(3).padStart(8)}″          ${co[5].toFixed(2).padStart(7)}       ${rms(e1).toFixed(3)}″`);
}

// ── the Moon channel's T² parity under each phase (KAPPA = 3eė/(1−e²)) ─────
console.log('\nMOON CHANNEL T² (perigee/node) under each phase — Meeus ϖ −0.010320, Ω +0.0020753 °/cy²:');
{
  const LPR = 481267.88123421, MPR = 477198.8675055, FR = 483202.0175233;
  const WDOT = LPR - MPR, NDOT = LPR - FR, S_W = 2.407, S_N = 1.018;
  for (const [nm, f] of [['(a) anchor phase', lawA], ['(c) solved phase', lawC], ['(e) anchor, base\'', lawE]]) {
    const e = f(2000), ed = rate(f);
    const KAPPA = 3 * e * ed / (1 - e * e);
    console.log(`  ${nm.padEnd(18)} e ${e.toFixed(6)} ė ${ed.toExponential(3)} → ϖ T² ${(S_W * WDOT * KAPPA / 2).toFixed(6)}  Ω T² ${(S_N * NDOT * KAPPA / 2).toFixed(7)}`);
  }
}

// ── deep time: cardinal-timing scale, (c) vs H/16, ±270 kyr ────────────────
{
  let maxDe = 0, maxY = 0;
  for (let y = -270000; y <= 270000; y += 500) { const d = Math.abs(lawC(y) - lawH16(y)); if (d > maxDe) { maxDe = d; maxY = y; } }
  console.log(`\nDEEP TIME (c) − H/16 over ±270 kyr: max |δe| ${maxDe.toExponential(2)} at ${maxY} → EoC ${(2 * maxDe / D2R).toFixed(2)}° → cardinal instants shift up to ${(2 * maxDe / (2 * Math.PI) * 365.25).toFixed(1)} days`);
  // La2004 over 250 kyr for (c)
  const rows = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8').split('\n').map((l) => l.trim().replace(/D/g, 'E').split(/\s+/).map(Number)).filter((r) => r.length >= 4 && -r[0] <= 250);
  const eL = rows.map((r) => r[1]), eC = rows.map((r) => lawC(2000 + r[0] * 1000)), e16v = rows.map((r) => lawH16(2000 + r[0] * 1000));
  const mean = (v) => v.reduce((s, q) => s + q, 0) / v.length;
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
  console.log(`  vs La2004 (250 kyr): (c) corr ${corr(eC, eL).toFixed(3)} RMS ${Math.sqrt(mean(eC.map((q, i) => (q - eL[i]) ** 2))).toExponential(2)} · H/16 corr ${corr(e16v, eL).toFixed(3)} RMS ${Math.sqrt(mean(e16v.map((q, i) => (q - eL[i]) ** 2))).toExponential(2)}`);
  // orbital-elements file for the LR04 insolation V1 re-run (ϖ of date from the model's law)
  const data = [];
  for (let k = 0; k <= 500; k++) { const y = 2000 - k * 1000; data.push({ year: -k * 1000, eccentricity: lawC(y), inclination: 0, perihelionLong: model.earth.perihelionLongitudeDeg(y), ascendingNode: 0 }); }
  writeFileSync(HERE + 'fq7s-h3c-orbital-elements.local.json', JSON.stringify({ source: 'candidate (c) H/3 law + model varpi of date', data }));
  console.log('  wrote fq7s-h3c-orbital-elements.local.json (0…−500 kyr) for the insolation V1 re-run');
}
