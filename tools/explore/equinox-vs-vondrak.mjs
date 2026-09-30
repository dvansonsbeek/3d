#!/usr/bin/env node
// THE MODEL'S EQUINOX OF DATE AGAINST THE LONG-TERM PRECESSION OF VONDRÁK (2011) —
// the instrument behind the Sun-vs-Horizons secular residual (plan 06 I1; the
// +20″ at −2500 of data/sun-vs-horizons-summary.json).
//
//   node tools/explore/equinox-vs-vondrak.mjs
//
// Read-only: prints, writes nothing, touches nothing shipped. The variants call
// the package factory with a modified axialPrecessionYearsAtYearFn.
//
// WHAT IS COMPARED. The one-source movement's Earth frame of date — ecliptic
// pole n̂, equator pole ŝ, equinox ĝ = ŝ × n̂ (earth/frame-of-date.cjs, J2000
// ecliptic frame, Julian epoch TT) — against the same three vectors from
// Vondrák, Capitaine & Wallace (2011), A&A 534, A22 ("New precession expressions,
// valid for long time intervals"; the P_A/Q_A and X_A/Y_A series as coded in
// ERFA's ltpecl/ltpequ). THEORY AGAINST THEORY: Vondrák's series is a fit to the
// IAU 2006 precession near J2000 and to numerical integrations beyond; it is the
// referee of choice for a multi-millennium equinox, not an observation. Horizons'
// of-date frame is a third theory (IAU76/80, Owen's long-term model beyond
// ±200 yr from 2000).
//
// MEASURED (Δequinox = model − Vondrák, arcsec, + = east; the Sun's of-date
// longitude moves by −Δequinox):
//   epoch   shipped  +J2 rate  +e(t)   +both  +J2(t) native  +native+e(t) | Sun model − Horizons
//   −2950   −26.5     −9.5    −22.7    −5.8     −10.1          −6.3      |  +19.5
//   −2450   −20.1     −6.4    −17.0    −3.3      −6.8          −3.7      |  +20.1
//   −1450   −10.9     −2.6     −9.0    −0.7      −2.9          −1.0      |  +14.5
//    −450    −5.3     −1.1     −4.3    −0.1      −1.3          −0.3      |  +10.7
//     550    −1.8     −0.4     −1.5    −0.0      −0.5          −0.1      |   +6.1
//    1550    −0.1     +0.0     −0.1    +0.1      +0.0          +0.1      |   +0.8
//    2550    −0.4     −0.2     −0.4    −0.2      −0.2          −0.2      |   +2.5
// ("+J2 rate" is the IAU-adopted constant −3.0·10⁻⁹ per century; "native" is the
// model's own GIA channel read back through its calibration — the observed
// Cox–Chao −2.7·10⁻⁹ at J2000, the lagged-response history away from it: −2.35
// at −3000. The referee cannot separate the two: Vondrák's series IS IAU 2006
// inside ±1 kyr and La93, which carries no J2 rate, beyond.)
// READING. (1) The Sun's ancient residual against Horizons IS the model's equinox:
// −Δequinox reproduces it (20.1 of 20.1 at −2450), and the two outside theories
// agree with each other to ≤ 7″ where they part from the model by 20″. (2) The lag
// is quadratic (0.0088 ″/cy² near J2000): the model's precession RATE changes too
// fast. (3) Two terms the composed rate ψ̇(t) does not carry close 80–97 % of it,
// with no fitted number: the secular rate of the dynamical ellipticity
// (ψ̇ ∝ J2; J̇2/J2 = −2.77·10⁻⁶ per century, the IAU 2006 adopted value — the
// post-glacial-rebound signal the model's own α(t) channel carries on the
// length-of-day side), 17″ of the 26.5″ at −2950; and the solar torque's
// (1 − e²)^(−3/2) at the eccentricity of date (the model's own solar-share formula,
// frozen at J2000 today), 3.8″. (4) The obliquity differs separately: +4.9″ at
// −2950, −0.5″ near 0 AD — neither term moves it.
// NOT DECIDED HERE: whether the precession of date takes these terms is an
// owner decision. A constant J̇2 is a rate valid at a point, not across a span;
// the model-native route reads the α(t) history instead. The deep-time twin
// (precession-terms-deep.mjs) measures the e(t) term against La2004's obliquity.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createModel } from '@essrt/physics';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const AS2R = Math.PI / 648000, R2AS = 648000 / Math.PI, D2PI = 2 * Math.PI;
const EPS0 = 84381.406 * AS2R;   // J2000 obliquity (IAU 2006)

// Vondrák, Capitaine & Wallace (2011), A&A 534, A22 — the ecliptic pole (P_A, Q_A)
// and the equator pole (X_A, Y_A): polynomial rows (arcsec, powers of T in Julian
// centuries from J2000) and periodic rows [period (cy), C_P, C_Q, S_P, S_Q] /
// [period, C_X, C_Y, S_X, S_Y] (arcsec). Values as in ERFA ltpecl.c / ltpequ.c.
const PQ_POL = [
  [5851.607687, -0.1189000, -0.00028913, 0.000000101],
  [-1600.886300, 1.1689818, -0.00000020, -0.000000437],
];
const PQ_PER = [
  [708.15, -5486.751211, -684.661560, 667.666730, -5523.863691],
  [2309.00, -17.127623, 2446.283880, -2354.886252, -549.747450],
  [1620.00, -617.517403, 399.671049, -428.152441, -310.998056],
  [492.20, 413.442940, -356.652376, 376.202861, 421.535876],
  [1183.00, 78.614193, -186.387003, 184.778874, -36.776172],
  [622.00, -180.732815, -316.800070, 335.321713, -145.278396],
  [882.00, -87.676083, 198.296701, -185.138669, -34.744450],
  [547.00, 46.140315, 101.135679, -120.972830, 22.885731],
];
const XY_POL = [
  [5453.282155, 0.4252841, -0.00037173, -0.000000152],
  [-73750.930350, -0.7675452, -0.00018725, 0.000000231],
];
const XY_PER = [
  [256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853],
  [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
  [274.20, 2600.009459, 1251.136893, 1251.296102, -2219.534038],
  [241.45, 2755.175630, -1102.212834, -1257.950837, -2523.969396],
  [2309.00, -167.659835, -2660.664980, -2966.799730, 247.850422],
  [492.20, 871.855056, 699.291817, 639.744522, -846.485643],
  [396.10, 44.769698, 153.167220, 131.600209, -1393.124055],
  [288.90, -512.313065, -950.865637, -445.040117, 368.526116],
  [231.10, -819.415595, 499.754645, 584.522874, 749.045012],
  [1610.00, -538.071099, -145.188210, -89.756563, 444.704518],
  [620.00, -189.793622, 558.116553, 524.429630, 235.934465],
  [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
  [220.30, 179.516345, -165.405086, -210.157124, -171.330180],
  [1200.00, -9.814756, 9.344131, -44.919798, -22.899655],
];

const unit = (v) => { const r = Math.hypot(...v); return v.map((x) => x / r); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// signed angle from a to b about n, arcsec; + = eastward (increasing longitude)
const signed = (a, b, n) => Math.atan2(dot(n, cross(a, b)), dot(a, b)) * R2AS;

/** Vondrák 2011 frame of date at Julian epoch epj — unit vectors in the J2000 ECLIPTIC frame. */
function vondrak(epj) {
  const t = (epj - 2000) / 100, w = D2PI * t;
  let p = 0, q = 0, x = 0, y = 0;
  for (const r of PQ_PER) { const a = w / r[0], s = Math.sin(a), c = Math.cos(a); p += c * r[1] + s * r[3]; q += c * r[2] + s * r[4]; }
  for (const r of XY_PER) { const a = w / r[0], s = Math.sin(a), c = Math.cos(a); x += c * r[1] + s * r[3]; y += c * r[2] + s * r[4]; }
  let tt = 1;
  for (let i = 0; i < 4; i++) { p += PQ_POL[0][i] * tt; q += PQ_POL[1][i] * tt; x += XY_POL[0][i] * tt; y += XY_POL[1][i] * tt; tt *= t; }
  p *= AS2R; q *= AS2R; x *= AS2R; y *= AS2R;
  const n = [p, -q, Math.sqrt(Math.max(0, 1 - p * p - q * q))];          // ecliptic pole (J2000 ecliptic frame)
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y)), ce = Math.cos(EPS0), se = Math.sin(EPS0);
  const s = [x, y * ce + z * se, -y * se + z * ce];                       // equator pole, J2000 equator → ecliptic frame
  return { n, s, g: unit(cross(s, n)), epsDeg: Math.acos(dot(s, n)) * 180 / Math.PI };
}

// ── the model's factory, wired as tools/lib/deep-orbital-history.js wires it ──
const seriesArt = JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8'));
const ART = JSON.parse(readFileSync(ROOT + 'data/nbody-deep-secular-modes.json', 'utf8'));
const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
const { createDeepOrbitalHistory } = require('../../packages/physics/src/earth/deep-orbital-history.cjs');
const { computeEarthFrameOfDate } = require('../../packages/physics/src/earth/frame-of-date.cjs');
const { computeSolarTorqueShare } = require('../../packages/physics/src/earth/precession-composed.cjs');
const DT = require('../lib/deep-time.js');
const C = require('../lib/constants.js');

const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth;
const sid = DT.computeSiderealYearDaysDirect(2000), sol = DT.computeSolarYearDaysDirect(2000);
const axial0 = sid / (sid - sol), H0 = DT.meanHAtAge(0);
const eb = seriesArt.bodies.earth;
const fS = computeSolarTorqueShare({
  gmSunKm3S2: C.GM_SUN, auKm: C.currentAUDistance, earthEccentricity: C.ASTRO_REFERENCE.earthEccentricityJ2000,
  gmMoonKm3S2: C.GM_MOON_ALONE, moonDistanceKm: C.moonDistance, moonEccentricity: C.moonOrbitalEccentricity,
  moonInclinationDeg: C.moonEclipticInclinationJ2000,
});
// e of date from the banked series (linear on the 500-yr grid — ample at this level)
const eAt = (yr) => { const x = (yr - 2000 - seriesArt.t0Yr) / eb.stepYr, i = Math.floor(x), f = x - i; return Math.hypot(eb.zQ[i] + (eb.zQ[i + 1] - eb.zQ[i]) * f, eb.zP[i] + (eb.zP[i + 1] - eb.zP[i]) * f); };
const e0 = eAt(2000);
// IAU 2006 (P03) adopted J2 and its secular rate — external reference values.
const J2 = 1.0826359e-3, J2_RATE_PER_CY = -3.001e-9;
const shipped = (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0;
const fJ = (yr) => 1 + (J2_RATE_PER_CY / J2) * (yr - 2000) / 100;                              // ψ̇ ∝ dynamical ellipticity ∝ J2
const fE = (yr) => 1 + fS * (Math.pow((1 - eAt(yr) ** 2) / (1 - e0 ** 2), -1.5) - 1);          // solar torque ∝ (1 − e²)^(−3/2)
// The MODEL-NATIVE route for the ellipticity term: the GIA channel the model
// already carries on the length-of-day side, read in ITS OWN observable. The
// channel's one scale is calibrated so that dα/dt(J2000) = (Cox & Chao dJ2/dt)
// ÷ j2ToAlphaFactor; going back through the same factor returns J2(t) with
// dJ2/dt(J2000) = the observed Cox–Chao rate by construction — the factor
// cancels, only the observed rate and the lagged-response SHAPE enter.
const GIA_REF = JSON.parse(readFileSync(ROOT + 'public/input/astro-reference.json', 'utf8')).giaCoxChaoPeltier;
const alphaAt = createModel(undefined, { secularSeriesArtifact: seriesArt }).epoch.alphaAtYear;
const alpha0 = alphaAt(2000);
const fJnative = (yr) => 1 + GIA_REF.j2ToAlphaFactor * (alphaAt(yr) - alpha0) / J2;
const VARIANTS = {
  shipped,
  '+J2 rate': (yr) => shipped(yr) / fJ(yr),
  '+e(t) torque': (yr) => shipped(yr) / fE(yr),
  '+both': (yr) => shipped(yr) / (fJ(yr) * fE(yr)),
  '+J2(t) native': (yr) => shipped(yr) / fJnative(yr),
  '+native+e(t)': (yr) => shipped(yr) / (fJnative(yr) * fE(yr)),
};
const build = (periodFn) => createDeepOrbitalHistory({
  zModes: ART.modes.earth.z, zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0, obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: periodFn,
}).build(50000, -50000, 100);

const names = Object.keys(VARIANTS);
const samplers = Object.fromEntries(names.map((k) => [k, build(VARIANTS[k])]));
const hz = new Map(JSON.parse(readFileSync(ROOT + 'data/sun-vs-horizons-summary.json', 'utf8')).sun.perCentury.map((c) => [c.century + 50, c.mean]));

console.log(`solar torque share f_S = ${fS.toFixed(4)} · J2 rate / J2 = ${(J2_RATE_PER_CY / J2).toExponential(3)} per cy · e(2000) = ${e0.toFixed(6)}, e(−3000) = ${eAt(-3000).toFixed(6)}`);
{ const v = vondrak(2000), smp = samplers.shipped.at(0), F = computeEarthFrameOfDate(smp);
  console.log(`J2000: ε Vondrák ${(v.epsDeg * 3600).toFixed(3)}″ / model ${(smp.epsDeg * 3600).toFixed(3)}″ · Δequinox ${signed(v.g, F.g, v.n).toFixed(3)}″ · |Δn̂| ${(Math.hypot(F.n[0] - v.n[0], F.n[1] - v.n[1]) * R2AS).toFixed(3)}″`); }
console.log('\nΔequinox = model − Vondrák 2011 (arcsec, + = east; the Sun\'s of-date longitude moves by −Δequinox)');
console.log('  epoch ' + names.map((n) => n.padStart(14)).join('') + '  | Sun model−Hz   Δε shipped   |Δn̂| shipped');
for (let y = -2950; y <= 2950; y += 250) {
  const v = vondrak(y);
  const cols = names.map((k) => signed(v.g, computeEarthFrameOfDate(samplers[k].at(y - 2000)).g, v.n));
  const smp = samplers.shipped.at(y - 2000), F = computeEarthFrameOfDate(smp);
  const h = hz.get(y);
  console.log(String(y).padStart(7) + ' ' + cols.map((c) => c.toFixed(2).padStart(14)).join('')
    + '  |' + (h === undefined ? '' : h.toFixed(2)).padStart(11) + ((smp.epsDeg - v.epsDeg) * 3600).toFixed(2).padStart(13)
    + (Math.hypot(F.n[0] - v.n[0], F.n[1] - v.n[1]) * R2AS).toFixed(2).padStart(14));
}
