#!/usr/bin/env node
// THE EQUINOX'S YEARLY MOTION OF DATE IN FOUR READINGS, from the model's own frame of date
// (n̂ ecliptic pole, ĝ equinox, J2000-ecliptic coordinates) — the instrument behind the
// 2026-09 tropical-year restatement (earth/deep-orbital-history.cjs generalPrecessionLonDeg):
//   proj   — the rate of the equinox's PROJECTED longitude on the J2000 ecliptic (what the
//            tropical-year law read before the restatement: equinoxLonJ2000Deg year over year)
//   brokJ  — the broken angle through the node of the ecliptic of date on the J2000 ecliptic
//            (the general precession p_A of the literature — what the law reads now)
//   brokW  — the broken angle through the node on the scene's WORLD plane (what the mean of
//            the four cardinal world angles measures)
//   nro    — the equinox's motion ALONG the ecliptic of date (ĝ̇ · (n̂×ĝ)), reference-plane free
// and the sidereal-year difference each implies against the projected reading.
//
//   node tools/explore/precession-conventions.cjs
//
// Read-only. Measured 2026-09: the scene − law sidereal differences at 16 epochs matched
// the brokW column to ≤ 30 ms once the 26-ms precession-unit slip was added.
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SG = require(path.join(ROOT, 'tools/lib/scene-graph.js'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const FR = require(path.join(ROOT, 'packages/physics/src/earth/frame-of-date.cjs'));
SG.computeSunPositionFast(2451545.0);
const R = SG._kcDebugR();
const M = DOH.createOneSourceMovement();
const toW = (v) => [0, 1, 2].map((r) => R[r][0] * v[0] + R[r][1] * v[1] + R[r][2] * v[2]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const s = Math.hypot(...v); return v.map((x) => x / s); };
const w180 = (d) => ((d + 540) % 360 + 360) % 360 - 180;
const R2D = 180 / Math.PI;
const poleW = toW([0, 0, 1]);
console.log(`J2000 ecliptic pole in world coordinates: [${poleW.map((x) => x.toFixed(6)).join(', ')}] → the J2000 ecliptic is tilted ${(Math.acos(Math.abs(poleW[1])) * R2D).toFixed(4)}° to the world XZ plane`);
const broken = (n, g, z, x0) => {
  const N = cross(z, n); const s = Math.hypot(...N);
  if (s < 1e-9) return Math.atan2(dot(g, cross(z, x0)), dot(g, x0)) * R2D;
  const Nu = N.map((x) => x / s);
  const Om = Math.atan2(dot(Nu, cross(z, x0)), dot(Nu, x0));
  const u = Math.atan2(dot(n, cross(Nu, g)), dot(Nu, g));
  return (Om + u) * R2D;
};
const readings = (year) => {
  const smp = M.sampleAt(year);
  const F = FR.computeEarthFrameOfDate(smp);
  const zWj = [R[1][0], R[1][1], R[1][2]];      // the world Y axis in J2000-ecliptic coordinates (R orthonormal)
  const xWj = [R[2][0], R[2][1], R[2][2]];
  return { proj: Math.atan2(F.g[1], F.g[0]) * R2D, brokJ: broken(F.n, F.g, [0, 0, 1], [1, 0, 0]), brokW: broken(F.n, F.g, zWj, unit(cross(cross(zWj, xWj), zWj))), law: smp.generalPrecessionLonDeg, F };
};
const T = 31558149.76, H = 0.5;
console.log('\nyear        incl. to J2000 ecl   p_proj      p_brokJ    p_brokW    p_nro    p_law   (″/yr, retrograde +)   Δsid vs projected, s:  brokJ    brokW     nro');
for (const y of [-1000000, -300000, -100000, -25000, -10000, -4000, -2000, 0, 1000, 2000, 3000, 6000, 10000, 25000, 100000, 1000000]) {
  const a = readings(y - H), b = readings(y + H), c = readings(y);
  const rate = (k) => -w180(b[k] - a[k]) / (2 * H) * 3600;
  const gdot = [0, 1, 2].map((i) => (b.F.g[i] - a.F.g[i]) / (2 * H));
  const nro = -dot(gdot, cross(c.F.n, c.F.g)) * R2D * 3600;
  const pP = rate('proj'), pJ = rate('brokJ'), pW = rate('brokW'), pL = rate('law');
  const d = (p) => (T * (p - pP) / 1296000);
  const incl = Math.acos(Math.min(1, c.F.n[2])) * R2D;
  console.log(String(y).padStart(9) + incl.toFixed(4).padStart(14) + '°' + pP.toFixed(5).padStart(14) + pJ.toFixed(5).padStart(11) + pW.toFixed(5).padStart(11) + nro.toFixed(5).padStart(10) + pL.toFixed(5).padStart(10)
    + ' '.repeat(30) + d(pJ).toFixed(3).padStart(8) + d(pW).toFixed(3).padStart(9) + d(nro).toFixed(3).padStart(8));
}
console.log('\np_law is the sampler\'s own generalPrecessionLonDeg rate — it must equal p_brokJ.');
