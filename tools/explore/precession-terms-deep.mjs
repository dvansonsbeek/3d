#!/usr/bin/env node
// THE TWO PRECESSION-OF-DATE FACTORS AT DEPTH — the research companion of the
// governed generator tools/verify/equinox-vs-vondrak.js (which banks the
// last-Myr obliquity windows in data/equinox-vs-vondrak.json). This instrument
// adds the per-factor decomposition at every window and the accumulated equinox
// by epoch.
//
//   node tools/explore/precession-terms-deep.mjs          (~2 min)
//
// Read-only: prints, writes nothing. The variants are the package factory with a
// subset of its two precession-of-date deps; "both" is what ships.
//
//   +e(t)    solarTorqueShareJ2000 — the solar torque × [(1 − e(t)²)/(1 − e₀²)]^(−3/2)
//            on the solar share f_S, the model's own solar-share formula of date
//   +J2(t)   dynamicalEllipticityRatioAtYearFn — ψ̇ ∝ J₂(t), the GIA channel's
//            second observable, scaled on the observed dJ₂/dt (Cox & Chao 2002)
//
// Reference: data/la2004-earth-51myr-back.asc (kyr, e, obliquity rad, ϖ̃ rad).
// THEORY AGAINST THEORY: La2004 integrates the precession equations with the
// eccentricity-dependent solar torque and tidal dissipation, and with NO
// ice-age change of the dynamical ellipticity — so +e(t) is tested by it, and
// +J2(t) is the model's own statement beside it.
//
// MEASURED (obliquity, model − La2004, arcsec rms):
//   window (kyr)     secular only    +e(t)    +J2(t)    both (the model)
//     −23 … 0            0.9          0.7       0.8        1.0
//    −100 … 0            2.4          1.3       2.8        1.2
//    −250 … −100        46.0          3.4      48.3        4.0
//    −500 … −250        72.5          7.3      75.8        8.1
//   −1000 … −500        96.8         16.5     101.2       18.3
//   −1000 … 0           79.5         12.3      83.1       13.7
// and the accumulated equinox against the secular law alone: +e(t) +1.46° at
// −250 kyr, +4.48° at −1 Myr; +J2(t) −0.05° and −0.23°. Means over the last Myr:
// the e(t) factor +3.2·10⁻⁴ (the mean e² sits above today's), the J2(t) factor
// −2.6·10⁻⁵ (bounded ±5·10⁻⁴).
// READING. On the secular law alone the J2000-frozen solar torque runs the
// precession 0.03 % slow on the million-year mean, and the obliquity drifts out
// of phase with La2004 by ~100″ rms; with the eccentricity factor it holds 12″.
// The ellipticity factor is small at depth (no secular part) — its work is the
// millennial equinox (equinox-vs-vondrak.mjs).

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const seriesArt = JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8'));
const ART = JSON.parse(readFileSync(ROOT + 'data/nbody-deep-secular-modes.json', 'utf8'));
const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
const { createDeepOrbitalHistory } = require('../../packages/physics/src/earth/deep-orbital-history.cjs');
const DT = require('../lib/deep-time.js');
const C = require('../lib/constants.js');

const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth, eb = seriesArt.bodies.earth;
const sid = DT.computeSiderealYearDaysDirect(2000), sol = DT.computeSolarYearDaysDirect(2000);
const axial0 = sid / (sid - sol), H0 = DT.meanHAtAge(0);
const SOLAR = { solarTorqueShareJ2000: DT.PRECESSION_SOLAR_SHARE_J2000 };
const ELLIP = { dynamicalEllipticityRatioAtYearFn: DT.j2RatioAtYear };
const VARIANTS = { 'secular only': {}, '+e(t)': SOLAR, '+J2(t)': ELLIP, 'both (model)': { ...SOLAR, ...ELLIP } };

const SPAN = 1100000;
const factory = (deps) => createDeepOrbitalHistory({
  zModes: ART.modes.earth.z, zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0, obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0,
  ...deps,
});
const names = Object.keys(VARIANTS);
const S = Object.fromEntries(names.map((k) => [k, factory(VARIANTS[k]).build(SPAN, -SPAN, 1000)]));

const la = readFileSync(ROOT + 'data/la2004-earth-51myr-back.asc', 'utf8').trim().split('\n').slice(0, 1001)
  .map((l) => l.trim().split(/\s+/).map((s) => Number(s.replace('D', 'E'))));
const fAll = factory({ ...SOLAR, ...ELLIP });
const mean = (k) => la.reduce((s, r) => s + fAll.precessionOfDateFactorsAt(r[0] * 1000)[k], 0) / la.length - 1;
console.log(`f_S = ${DT.PRECESSION_SOLAR_SHARE_J2000.toFixed(4)} · mean over the last Myr: e(t) factor ${mean('solarTorque').toExponential(3)}, J2(t) factor ${mean('ellipticity').toExponential(3)}`);
console.log('\nobliquity, model − La2004 (arcsec rms) by window (kyr)');
console.log('  window        ' + names.map((n) => n.padStart(14)).join(''));
for (const [a, b] of [[-23, 0], [-100, 0], [-250, -100], [-500, -250], [-1000, -500], [-1000, 0]]) {
  const row = names.map((k) => { let s = 0, n = 0; for (const r of la) { if (r[0] < a || r[0] > b) continue; const d = (S[k].at(r[0] * 1000).epsDeg - r[2] * 180 / Math.PI) * 3600; s += d * d; n++; } return Math.sqrt(s / n); });
  console.log(`  ${String(a).padStart(6)} … ${String(b).padStart(5)}` + row.map((v) => v.toFixed(1).padStart(14)).join(''));
}
console.log('\nvariant − secular only: equinox longitude in the J2000 ecliptic (degrees) and obliquity (arcsec)');
console.log('   t (kyr) ' + names.slice(1).map((n) => ('Δequinox ' + n).padStart(22)).join('') + names.slice(1).map((n) => ('Δε ' + n).padStart(18)).join(''));
for (const t of [-10, -23, -50, -100, -250, -500, -750, -1000]) {
  const b = S['secular only'].at(t * 1000);
  const dg = names.slice(1).map((k) => (((S[k].at(t * 1000).equinoxLonJ2000Deg - b.equinoxLonJ2000Deg) + 540) % 360) - 180);
  const de = names.slice(1).map((k) => (S[k].at(t * 1000).epsDeg - b.epsDeg) * 3600);
  console.log(String(t).padStart(9) + '  ' + dg.map((v) => v.toFixed(3).padStart(22)).join('') + de.map((v) => v.toFixed(1).padStart(18)).join(''));
}
