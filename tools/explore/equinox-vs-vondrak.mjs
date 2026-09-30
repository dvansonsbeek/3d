#!/usr/bin/env node
// THE MODEL'S EQUINOX OF DATE AGAINST THE LONG-TERM PRECESSION OF VONDRÁK (2011) —
// the research companion of the governed generator tools/verify/equinox-vs-vondrak.js
// (which banks the record, data/equinox-vs-vondrak.json). This instrument adds what
// the record does not carry: the ALTERNATIVE ellipticity route (the IAU-adopted
// constant J2 rate) and the Sun's residual against Horizons beside the equinox.
//
//   node tools/explore/equinox-vs-vondrak.mjs
//
// Read-only: prints, writes nothing. The variants are the package factory with a
// subset of its two precession-of-date deps.
//
// WHAT IS COMPARED. The one-source movement's Earth frame of date — ecliptic pole n̂,
// equator pole ŝ, equinox ĝ = ŝ × n̂ (earth/frame-of-date.cjs, J2000 ecliptic frame,
// Julian epoch TT) — against the same vectors from Vondrák, Capitaine & Wallace
// (2011), A&A 534, A22 (@essrt/reference vondrakFrameOfDate2011). THEORY AGAINST
// THEORY: Vondrák's series IS IAU 2006 inside ±1 kyr of J2000 and a fit to numerical
// integrations beyond (Laskar et al. 1993, which carries no J2 rate); Horizons'
// of-date frame is a third theory (IAU76/80, Owen's long-term model beyond ±200 yr
// from 2000). No observation resolves 20″ at −2500.
//
// MEASURED (Δequinox against Vondrák, arcsec, + = east; the Sun's of-date longitude
// moves by −Δequinox):
//   epoch   THE MODEL   secular only   +e(t)   +J2(t)   IAU J2 rate + e(t)
//   −3000     −6.6        −27.2        −23.3   −10.5        −6.0
//   −2500     −3.9        −20.7        −17.5    −7.1        −3.5
//   −1500     −1.0        −11.2         −9.3    −3.0        −0.8
//    −500     −0.3         −5.5         −4.5    −1.3        −0.1
//     500     −0.1         −2.0         −1.6    −0.5        −0.0
//    1500     +0.1         −0.1         −0.1    +0.0        +0.1
//    2500     −0.2         −0.4         −0.3    −0.2        −0.2
// READING. (1) On the secular law alone the equinox lagged Vondrák quadratically
// (0.0088 ″/cy² near J2000) — the whole of the Sun's former ancient residual against
// Horizons (+20″ at −2500). (2) The two factors of date close it: the solar torque's
// (1 − e²)^(−3/2) at the eccentricity of date, and ψ̇ ∝ J2(t) from the GIA channel,
// whose dJ2/dt at J2000 is the observed Cox–Chao −2.7·10⁻¹¹ /yr by construction and
// −2.35·10⁻¹¹ at −3000. (3) The alternative — the IAU-adopted CONSTANT −3.0·10⁻¹¹ —
// lands within 0.6″ of the model's route: the referee cannot separate them, and a
// constant rate is a point value used across a span. (4) The obliquity differs
// separately: +5.1″ at −3000, −0.5″ near 0 AD; neither factor moves it.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const R2AS = 648000 / Math.PI;
const { vondrakFrameOfDate2011 } = require('@essrt/reference/published-curves');
const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
const { createDeepOrbitalHistory } = require('../../packages/physics/src/earth/deep-orbital-history.cjs');
const { computeEarthFrameOfDate } = require('../../packages/physics/src/earth/frame-of-date.cjs');
const DT = require('../lib/deep-time.js');
const C = require('../lib/constants.js');

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// signed angle from a to b about n, arcsec; + = eastward (increasing longitude)
const signed = (a, b, n) => Math.atan2(dot(n, cross(a, b)), dot(a, b)) * R2AS;

// ── the package factory, wired as tools/lib/deep-orbital-history.js wires it ──
const seriesArt = JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8'));
const ART = JSON.parse(readFileSync(ROOT + 'data/nbody-deep-secular-modes.json', 'utf8'));
const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth, eb = seriesArt.bodies.earth;
const sid = DT.computeSiderealYearDaysDirect(2000), sol = DT.computeSolarYearDaysDirect(2000);
const axial0 = sid / (sid - sol), H0 = DT.meanHAtAge(0);
const fS = DT.PRECESSION_SOLAR_SHARE_J2000;
// The alternative ellipticity route, for the record: the IAU 2006 (P03) adopted
// CONSTANT rate — external reference values, a rate valid at a point.
const J2_IAU = 1.0826359e-3, J2_RATE_IAU_PER_CY = -3.001e-9;
const j2RatioIauConstant = (yr) => 1 + (J2_RATE_IAU_PER_CY / J2_IAU) * (yr - 2000) / 100;
const VARIANTS = {
  'secular only': {},
  '+e(t)': { solarTorqueShareJ2000: fS },
  '+J2(t)': { dynamicalEllipticityRatioAtYearFn: DT.j2RatioAtYear },
  'IAU J2 rate+e(t)': { solarTorqueShareJ2000: fS, dynamicalEllipticityRatioAtYearFn: j2RatioIauConstant },
};
const build = (deps) => createDeepOrbitalHistory({
  zModes: ART.modes.earth.z, zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0, obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0,
  ...deps,
}).build(50000, -50000, 100);

const names = Object.keys(VARIANTS);
const samplers = Object.fromEntries(names.map((k) => [k, build(VARIANTS[k])]));
// THE MODEL — the shipped one-source movement itself (the Node twin)
const movement = require('../lib/deep-orbital-history.js').createOneSourceMovement();
const hz = new Map(JSON.parse(readFileSync(ROOT + 'data/sun-vs-horizons-summary.json', 'utf8')).sun.perCentury.map((c) => [c.century + 50, c.mean]));

console.log(`solar torque share f_S = ${fS.toFixed(4)} · model dJ2/dt(J2000) = ${((DT.j2RatioAtYear(2050) - DT.j2RatioAtYear(1950)) * C.earthJ2).toExponential(3)} per cy (IAU constant ${J2_RATE_IAU_PER_CY.toExponential(3)})`);
console.log('\nΔequinox against Vondrák 2011 (arcsec, + = east; the Sun\'s of-date longitude moves by −Δequinox)');
console.log('  epoch ' + 'THE MODEL'.padStart(12) + names.map((n) => n.padStart(18)).join('') + '  | Sun model−Horizons (century mean)');
for (let y = -3000; y <= 3000; y += 250) {
  const v = vondrakFrameOfDate2011(y);
  const F = computeEarthFrameOfDate(movement.sampleAt(y));
  const cols = names.map((k) => signed(v.g, computeEarthFrameOfDate(samplers[k].at(y - 2000)).g, v.n));
  const h = hz.get(y + 50) ?? hz.get(y - 50);
  console.log(String(y).padStart(7) + ' ' + signed(v.g, F.g, v.n).toFixed(2).padStart(12) + cols.map((c) => c.toFixed(2).padStart(18)).join('')
    + '  |' + (h === undefined ? '' : h.toFixed(2)).padStart(11));
}
