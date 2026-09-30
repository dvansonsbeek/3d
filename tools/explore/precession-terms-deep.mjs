#!/usr/bin/env node
// THE TWO PRECESSION-RATE TERMS AT DEPTH — the deep-time twin of
// equinox-vs-vondrak.mjs: what the solar torque's eccentricity dependence and the
// dynamical ellipticity of date do to the obliquity and to the accumulated
// equinox over the last million years, against La2004.
//
//   node tools/explore/precession-terms-deep.mjs          (~2 min)
//
// Read-only: prints, writes nothing, touches nothing shipped. The variants call
// the package factory with a modified axialPrecessionYearsAtYearFn.
//
//   +e(t)    solar torque × [(1 − e(t)²)/(1 − e₀²)]^(−3/2) on the solar share f_S —
//            the model's own solar-share formula, evaluated of date
//   +J2(t)   ψ̇ ∝ J2(t), J2(t) − J2₀ = j2ToAlphaFactor·[α(t) − α₀]: the GIA
//            channel read back through its own calibration, so dJ2/dt(J2000)
//            is the observed Cox–Chao rate by construction
//
// Reference: data/la2004-earth-51myr-back.asc (kyr, e, obliquity rad, ϖ̃ rad).
// THEORY AGAINST THEORY: La2004 integrates the precession equations with the
// eccentricity-dependent solar torque and tidal dissipation, and with NO
// ice-age change of the dynamical ellipticity — so +e(t) is tested by it, and
// +J2(t) is the model's own statement beside it.
//
// MEASURED (obliquity, model − La2004, arcsec rms):
//   window (kyr)     shipped    +e(t)    +J2(t)    +both
//     −23 … 0          0.9       0.7       0.8      1.0
//    −100 … 0          2.4       1.3       2.8      1.2
//    −250 … −100      46.0       3.4      48.3      4.0
//    −500 … −250      72.5       7.3      75.8      8.1
//   −1000 … −500      96.8      16.5     101.2     18.3
//   −1000 … 0         79.5      12.3      83.1     13.7
// and the accumulated equinox, variant − shipped: +e(t) +1.46° at −250 kyr,
// +4.48° at −1 Myr; +J2(t) −0.05° and −0.23°. Means over the last Myr:
// the e(t) factor +3.2·10⁻⁴ (the mean e² sits above today's), the J2(t) factor
// −2.6·10⁻⁵ (bounded ±5·10⁻⁴).
// READING. The eccentricity term is physics the spin integration lacks: the
// J2000-frozen solar torque runs the precession 0.03 % slow on the million-year
// mean, and the obliquity drifts out of phase with La2004 by ~100″ rms; with
// the term it holds 12″. The ellipticity term is small at depth (no secular
// part) — its work is the millennial equinox (equinox-vs-vondrak.mjs).

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createModel } from '@essrt/physics';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const seriesArt = JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8'));
const ART = JSON.parse(readFileSync(ROOT + 'data/nbody-deep-secular-modes.json', 'utf8'));
const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
const { createDeepOrbitalHistory } = require('../../packages/physics/src/earth/deep-orbital-history.cjs');
const { computeSolarTorqueShare } = require('../../packages/physics/src/earth/precession-composed.cjs');
const DT = require('../lib/deep-time.js');
const C = require('../lib/constants.js');

const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth;
const sid = DT.computeSiderealYearDaysDirect(2000), sol = DT.computeSolarYearDaysDirect(2000);
const axial0 = sid / (sid - sol), H0 = DT.meanHAtAge(0), eb = seriesArt.bodies.earth;
const fS = computeSolarTorqueShare({
  gmSunKm3S2: C.GM_SUN, auKm: C.currentAUDistance, earthEccentricity: C.ASTRO_REFERENCE.earthEccentricityJ2000,
  gmMoonKm3S2: C.GM_MOON_ALONE, moonDistanceKm: C.moonDistance, moonEccentricity: C.moonOrbitalEccentricity,
  moonInclinationDeg: C.moonEclipticInclinationJ2000,
});
const eAt = (yr) => { const x = (yr - 2000 - seriesArt.t0Yr) / eb.stepYr, i = Math.floor(x), f = x - i; return Math.hypot(eb.zQ[i] + (eb.zQ[i + 1] - eb.zQ[i]) * f, eb.zP[i] + (eb.zP[i + 1] - eb.zP[i]) * f); };
const e0 = eAt(2000);
const J2 = 1.0826359e-3;   // IAU 2006 (P03) adopted J2 — external reference value
const GIA = JSON.parse(readFileSync(ROOT + 'public/input/astro-reference.json', 'utf8')).giaCoxChaoPeltier;
const alphaAt = createModel(undefined, { secularSeriesArtifact: seriesArt }).epoch.alphaAtYear, alpha0 = alphaAt(2000);
const shipped = (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0;
const fE = (yr) => 1 + fS * (Math.pow((1 - eAt(yr) ** 2) / (1 - e0 ** 2), -1.5) - 1);
const fJ = (yr) => 1 + GIA.j2ToAlphaFactor * (alphaAt(yr) - alpha0) / J2;
const VARIANTS = { shipped, '+e(t)': (y) => shipped(y) / fE(y), '+J2(t)': (y) => shipped(y) / fJ(y), '+both': (y) => shipped(y) / (fE(y) * fJ(y)) };

const SPAN = 1100000;
const build = (periodFn) => createDeepOrbitalHistory({
  zModes: ART.modes.earth.z, zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0, obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: periodFn,
}).build(SPAN, -SPAN, 1000);
const names = Object.keys(VARIANTS);
const S = Object.fromEntries(names.map((k) => [k, build(VARIANTS[k])]));

const la = readFileSync(ROOT + 'data/la2004-earth-51myr-back.asc', 'utf8').trim().split('\n').slice(0, 1001)
  .map((l) => l.trim().split(/\s+/).map((s) => Number(s.replace('D', 'E'))));
const mean = (f) => la.reduce((s, r) => s + f(2000 + r[0] * 1000), 0) / la.length - 1;
console.log(`f_S = ${fS.toFixed(4)} · j2ToAlphaFactor = ${GIA.j2ToAlphaFactor} · mean over the last Myr: e(t) factor ${mean(fE).toExponential(3)}, J2(t) factor ${mean(fJ).toExponential(3)}`);
console.log('\nobliquity, model − La2004 (arcsec rms) by window (kyr)');
console.log('  window        ' + names.map((n) => n.padStart(10)).join(''));
for (const [a, b] of [[-23, 0], [-100, 0], [-250, -100], [-500, -250], [-1000, -500], [-1000, 0]]) {
  const row = names.map((k) => { let s = 0, n = 0; for (const r of la) { if (r[0] < a || r[0] > b) continue; const d = (S[k].at(r[0] * 1000).epsDeg - r[2] * 180 / Math.PI) * 3600; s += d * d; n++; } return Math.sqrt(s / n); });
  console.log(`  ${String(a).padStart(6)} … ${String(b).padStart(5)}` + row.map((v) => v.toFixed(1).padStart(10)).join(''));
}
console.log('\nvariant − shipped: equinox longitude in the J2000 ecliptic (degrees) and obliquity (arcsec)');
console.log('   t (kyr) ' + names.slice(1).map((n) => ('Δequinox ' + n).padStart(16)).join('') + names.slice(1).map((n) => ('Δε ' + n).padStart(12)).join(''));
for (const t of [-10, -23, -50, -100, -250, -500, -750, -1000]) {
  const b = S.shipped.at(t * 1000);
  const dg = names.slice(1).map((k) => (((S[k].at(t * 1000).equinoxLonJ2000Deg - b.equinoxLonJ2000Deg) + 540) % 360) - 180);
  const de = names.slice(1).map((k) => (S[k].at(t * 1000).epsDeg - b.epsDeg) * 3600);
  console.log(String(t).padStart(9) + '  ' + dg.map((v) => v.toFixed(3).padStart(16)).join('') + de.map((v) => v.toFixed(1).padStart(12)).join(''));
}
