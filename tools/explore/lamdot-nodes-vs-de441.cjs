#!/usr/bin/env node
// THE BANKED λ̇ CHANNEL AT ITS 2-KYR NODES AGAINST WHAT DE441'S SUN IMPLIES — the sidereal-year
// law's planetary ratio (earth/sidereal-channel-artifact.cjs) beside the value DE441 would give
// at each node, and beside the secular line of Simon et al. 1994 (λ̇ = n₀ − 4.08822″t − 0.01569″t²
// per millennium). The DE441-implied value at a node = the banked value minus the slope of the
// (model − DE441) inertial longitude over the ±1000-yr cell around it (sun-inertial-vs-de441.cjs's
// residual; needs tools/explore/sun-inertial-de441.local.json).
//
//   node tools/explore/lamdot-nodes-vs-de441.cjs
//
// Measured 2026-09: the 2-kyr boxcar of per-step rates read banked − implied of −146, −155, −68,
// −39, +6, −59, −266, −12, +258 ms at −8000 … +8000 (the boxcar telescopes to the difference of
// the OSCULATING longitude at the window's ends); the least-squares quadratic slope over ±5 kyr
// reads 43 ms rms against the same implied sequence.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rq = require('module').createRequire(path.join(ROOT, 'package.json'));
const { createModel } = rq('@essrt/physics');
const FR = require(path.join(ROOT, 'packages/physics/src/earth/frame-of-date.cjs'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const { SIDEREAL_CHANNEL_ARTIFACT: ART } = require(path.join(ROOT, 'packages/physics/src/earth/sidereal-channel-artifact.cjs'));
const REF_FILE = path.join(__dirname, 'sun-inertial-de441.local.json');
if (!fs.existsSync(REF_FILE)) { console.error(`missing ${path.relative(ROOT, REF_FILE)} — run tools/explore/fetch-sun-inertial-de441.mjs first`); process.exit(2); }
const M = DOH.createOneSourceMovement();
const YL = M.yearLengths;
const model = createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nbody-secular-series.json'), 'utf8')) });
const REF = JSON.parse(fs.readFileSync(REF_FILE, 'utf8'));
const J2000 = 2451545.0, R2D = 180 / Math.PI, D2R = Math.PI / 180;
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const dTs = (jd) => model.eclipse.deltaTSecondsAtJD(jd);
const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
console.log(`banked channel: t0 ${ART.t0Yr} yr, step ${ART.stepYr} yr, ${ART.lamDotRel.length} nodes, window ${ART.windowYr} yr`);
const T = [], R = [];
for (let i = 0; i < REF.rows.length; i += 3) {
  const [jd, x, y] = REF.rows[i];
  const year = 2000 + (jd - J2000) / 365.25;
  const F = FR.computeEarthFrameOfDate(M.sampleAt(year)), q = cross(F.n, F.g);
  const l = model.eclipse.sunLonCompletedDegAtJD(utForTT(jd)) * D2R;
  const d = [0, 1].map((k) => Math.cos(l) * F.g[k] + Math.sin(l) * q[k]);
  T.push(year); R.push(w180(Math.atan2(d[1], d[0]) * R2D - Math.atan2(y, x) * R2D) * 3600);
}
const slopeIn = (y0, y1) => { let n = 0, st = 0, sr = 0; for (let i = 0; i < T.length; i++) if (T[i] >= y0 && T[i] < y1) { n++; st += T[i]; sr += R[i]; } const mt = st / n, mr = sr / n; let p = 0, q = 0; for (let i = 0; i < T.length; i++) if (T[i] >= y0 && T[i] < y1) { p += (T[i] - mt) * (R[i] - mr); q += (T[i] - mt) ** 2; } return p / q; };
const TS = 31558149.76;
console.log('\nnode year   banked rel−1 (1e-9)   DE441-implied (1e-9)   Simon secular (1e-9)   banked − DE441: 1e-9 → sidereal year, ms');
let s2 = 0, n = 0;
for (let y = -8000; y <= 8000; y += 2000) {
  const t = (y - 2000) / 1000;
  const banked = (YL.planetaryRelAtYear(y) - 1) * 1e9;
  const s = slopeIn(y - 1000, y + 1000);
  const de = banked - s / 1296000 * 1e9;
  const simon = (-4.08822 * t - 0.01569 * t * t) / 1295977422.83429 * 1e9;
  const ms = -(banked - de) * 1e-9 * TS * 1000; s2 += ms * ms; n++;
  console.log(String(y).padStart(8) + banked.toFixed(2).padStart(16) + de.toFixed(2).padStart(22) + simon.toFixed(2).padStart(22) + (banked - de).toFixed(2).padStart(22) + ms.toFixed(0).padStart(12));
}
console.log(`\nrms over the nine nodes: ${Math.sqrt(s2 / n).toFixed(0)} ms (the DE441-implied values carry the long-period inequality residual, ~30 ms)`);
