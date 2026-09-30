#!/usr/bin/env node
// THE SUN'S MEAN LONGITUDE OF DATE AND THE ACCUMULATED PRECESSION AGAINST SIMON ET AL. 1994
// (A&A 282, 663 — the VSOP mean elements referred to the mean equinox of date; t in thousands
// of Julian years from J2000 TT):
//   L_date  = 100.46645683° + 1296027711.03429″t + 109.15809″t² + 0.07207″t³ − 0.23530″t⁴ − 0.00180″t⁵ + 0.00020″t⁶ (+180° for the Sun)
//   fixed   = 1295977422.83429″t − 2.04411″t² − 0.00523″t³   (mean longitude, fixed J2000 equinox)
//   p_A     = 50288.200″t + 111.2022″t² + 0.0773″t³ − 0.2353″t⁴ − 0.0018″t⁵ + 0.0002″t⁶
// Columns: the model's mean longitude of date minus Simon's; the model's accumulated general
// precession (projected reading, and the broken-angle reading the law uses since 2026-09)
// minus Simon's p_A; and the model's implied FIXED-frame mean longitude (L_date minus the
// accumulated retrograde precession) minus Simon's fixed polynomial — the sidereal-year law
// integrated.
//
//   node tools/explore/mean-longitude-vs-simon.cjs
//
// Theory against theory, and a polynomial of limited reach (the p_A series is not usable
// beyond a few kyr — Vondrák 2011 is the long-term referee, tools/verify/equinox-vs-vondrak.js);
// the fixed-frame column is the one worth reading, ±4 kyr.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rq = require('module').createRequire(path.join(ROOT, 'package.json'));
const { createModel } = rq('@essrt/physics');
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const M = DOH.createOneSourceMovement();
const model = createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nbody-secular-series.json'), 'utf8')) });
const Lm = model.eclipse.frameworkSunDeps.meanLongitudeDegAt;
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const s0 = M.sampleAt(2000);
const simonL = (t) => 280.46645683 + (1296027711.03429 * t + 109.15809 * t ** 2 + 0.07207 * t ** 3 - 0.23530 * t ** 4 - 0.00180 * t ** 5 + 0.00020 * t ** 6) / 3600;
const simonPA = (t) => 50288.200 * t + 111.2022 * t ** 2 + 0.0773 * t ** 3 - 0.2353 * t ** 4 - 0.0018 * t ** 5 + 0.0002 * t ** 6;
const simonFixed = (t) => 1295977422.83429 * t - 2.04411 * t ** 2 - 0.00523 * t ** 3;
console.log('year   L_model − L_Simon ″  | accumulated precession − Simon p_A ″: projected   broken-angle | implied fixed-frame mean longitude − Simon fixed ″ (the law integrated)');
for (let y = -4000; y <= 4000; y += 500) {
  const t = (y - 2000) / 1000;
  const s = M.sampleAt(y);
  const accProj = -w180(s.equinoxLonJ2000Deg - s0.equinoxLonJ2000Deg) * 3600, accBrok = -w180(s.generalPrecessionLonDeg - s0.generalPrecessionLonDeg) * 3600;
  const dL = w180(Lm(y) - simonL(t)) * 3600;
  const LmArc = (Lm(y) - Lm(2000)) * 3600;
  console.log(String(y).padStart(6) + dL.toFixed(2).padStart(14) + '   |' + (accProj - simonPA(t)).toFixed(2).padStart(28) + (accBrok - simonPA(t)).toFixed(2).padStart(14) + '   |' + (LmArc - accBrok - simonFixed(t)).toFixed(2).padStart(40));
}
