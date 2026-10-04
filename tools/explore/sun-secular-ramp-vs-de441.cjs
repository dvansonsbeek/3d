#!/usr/bin/env node
// THE SECULAR SHAPE OF THE SUN RESIDUAL AGAINST DE441 — the model's geometric Sun carried into the
// fixed J2000 frame minus DE441 (sun-inertial-vs-de441.cjs's residual) in yearly means over
// ±9000 yr, fitted with [1, t, t², t³] (t in kyr): the linear term read as a sidereal-year
// offset at J2000, the quadratic as a mean-motion acceleration mismatch; plus the local
// sidereal-year offset per 2-kyr window. Needs tools/explore/sun-inertial-de441.local.json.
//
//   node tools/explore/sun-secular-ramp-vs-de441.cjs
//
// MEASURED 2026-10 (after the long-inequality campaign removed the periodic content): the sidereal
// year at J2000 agrees with DE441 to 5 ms; the residual is a pure acceleration term, λ̈ = 0.11″/kyr²
// — the model's year 26 ms SHORT at −8000, 5 ms long at +4000 (2.7 ms per kyr of drift). The
// model's solar-mass-loss law lengthens the year by 5.9 ms per kyr (dGM/GM = −9.3·10⁻¹⁴/yr), a term
// DE440/441 do not carry (they hold GM_sun fixed; INPOP models a secular rate): the ramp has the
// sign of the mass loss and about half its size, so the planetary λ̇ channel's drift and DE441's
// differ by ≤ 3 % of the drift (3 ms per kyr) — not attributable further from DE441 alone, and
// no change was made. Theory against theory.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rq = require('module').createRequire(path.join(ROOT, 'package.json'));
const P = rq('@essrt/physics');
const FR = require(path.join(ROOT, 'packages/physics/src/earth/frame-of-date.cjs'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const REF_FILE = path.join(__dirname, 'sun-inertial-de441.local.json');
if (!fs.existsSync(REF_FILE)) { console.error('missing sun-inertial-de441.local.json — run tools/explore/fetch-sun-inertial-de441.mjs first'); process.exit(2); }
const M = DOH.createOneSourceMovement();
const model = P.createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nbody-secular-series.json'), 'utf8')) });
const REF = JSON.parse(fs.readFileSync(REF_FILE, 'utf8'));
const J2000 = 2451545.0, R2D = 180 / Math.PI, D2R = Math.PI / 180;
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const dTs = (jd) => model.eclipse.deltaTSecondsAtJD(jd);
const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const acc = new Map();
for (const [jd, x, y] of REF.rows) {
  const year = 2000 + (jd - J2000) / 365.25;
  const F = FR.computeEarthFrameOfDate(M.sampleAt(year)), q = cross(F.n, F.g);
  const l = model.eclipse.sunLonCompletedDegAtJD(utForTT(jd)) * D2R;
  const d = [0, 1].map((k) => Math.cos(l) * F.g[k] + Math.sin(l) * q[k]);
  const r = w180(Math.atan2(d[1], d[0]) * R2D - Math.atan2(y, x) * R2D) * 3600;
  const yb = Math.floor(year); const o = acc.get(yb) || { s: 0, n: 0 }; o.s += r; o.n++; acc.set(yb, o);
}
const T = [], R = [];
for (const [yb, o] of [...acc.entries()].sort((a, b) => a[0] - b[0])) if (o.n >= 10) { T.push((yb + 0.5 - 2000) / 1000); R.push(o.s / o.n); }
const n = T.length;
function lsq(cols, y) { const p = cols.length; const A = Array.from({ length: p }, () => new Float64Array(p + 1)); for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { for (let b = 0; b < p; b++) A[a][b] += cols[a][i] * cols[b][i]; A[a][p] += cols[a][i] * y[i]; } for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) { const f = A[j][i] / A[i][i]; for (let k = i; k <= p; k++) A[j][k] -= f * A[i][k]; } const beta = new Float64Array(p); for (let i = p - 1; i >= 0; i--) { let s = A[i][p]; for (let k = i + 1; k < p; k++) s -= A[i][k] * beta[k]; beta[i] = s / A[i][i]; } const res = y.map((v, i) => v - cols.reduce((s, c, a) => s + c[i] * beta[a], 0)); return { beta, sd: Math.sqrt(res.reduce((s, v) => s + v * v, 0) / n) }; }
const TS = DT.meanSiderealYearSecondsAtAge(0);
for (const deg of [1, 2, 3]) {
  const f = lsq(Array.from({ length: deg + 1 }, (_, k) => T.map((t) => t ** k)), R);
  const terms = Array.from(f.beta).map((b, k) => `${b >= 0 ? '+' : ''}${b.toFixed(3)}·t^${k}`).join(' ');
  console.log(`degree ${deg}: ${terms} (″, t in kyr) · residual sd ${f.sd.toFixed(2)}″ · linear ⇒ sidereal year ${(-f.beta[1] / 1000 / 1296000 * TS * 1000).toFixed(1)} ms ${f.beta[1] > 0 ? 'SHORT' : 'LONG'} at J2000` + (deg >= 2 ? ` · quadratic ⇒ λ̈ mismatch ${(2 * f.beta[2]).toFixed(3)}″/kyr²` : ''));
}
let line = 'local sidereal-year offset (model − DE441) from the residual slope per 2-kyr window (positive = the model year is SHORT):';
for (let c = -8; c <= 6; c += 2) {
  const idx = T.map((t, i) => i).filter((i) => Math.abs(T[i] - c) <= 1);
  const mt = idx.reduce((s, i) => s + T[i], 0) / idx.length, mr = idx.reduce((s, i) => s + R[i], 0) / idx.length;
  let p = 0, q = 0; for (const i of idx) { p += (T[i] - mt) * (R[i] - mr); q += (T[i] - mt) ** 2; }
  line += `\n  ${c * 1000}: ${(-(p / q) / 1000 / 1296000 * TS * 1000).toFixed(0)} ms`;
}
console.log(line);
const dM = (DT.meanSiderealYearSecondsAtAge(-0.001) - DT.meanSiderealYearSecondsAtAge(0.001)) / 2000 / TS;
console.log(`\nthe model's mass-loss law: dT/T = ${dM.toExponential(3)} per yr = ${(dM * TS * 1000 * 1000).toFixed(1)} ms per kyr (dGM/GM = ${(-dM / 2).toExponential(3)} per yr, T ∝ GM⁻²) — a term DE441 does not carry`);
