#!/usr/bin/env node
// THE MODEL'S GEOMETRIC SUN AGAINST DE441 IN THE FIXED J2000 FRAME — the model's certified
// (completed, geometric) longitude of date carried into the J2000 ecliptic with the model's own
// frame of date, against the Horizons DE441 geometric vectors (fetch-sun-inertial-de441.mjs).
// No precession theory on the reference side: this tests the Sun's SIDEREAL motion — the
// sidereal-year law integrated plus the mean-longitude bookkeeping — on its own.
//
//   node tools/explore/sun-inertial-vs-de441.cjs [stride=3] [binYears=500]
//
// Columns: the model as shipped, and the same Sun with the PROJECTED equinox-rate booking
// the tropical-year law used before 2026-09 (the difference δ = projected − broken-angle
// equinox longitude, zero at J2000) — the control that shows what the restatement removed.
// The "sid-year error" column is the residual's local slope in each bin expressed as a
// sidereal-year error (a residual growing at s ″/yr = the model's sidereal year short by
// T·s/1296000); at the ±3–5″ scatter of the long-period inequalities it resolves ~0.1 s.
//
// Measured 2026-09 (this instrument): before the restatement rms 18.9″ over ±9000 yr, with
// +18…28″ over 4000–6500 (the λ̇ channel's node noise integrated) and a +5.6″ ramp over
// −2500…0 (the projected booking); after, rms 5.4″, every 500-yr bin within −3…+12″, and
// no slope over −1000…+3000 at the 1″ level. Theory against theory: DE441 is an ephemeris,
// not an observation; its mean motion over a few kyr is the referee for a channel banked
// from the model's own N-body run.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rq = require('module').createRequire(path.join(ROOT, 'package.json'));
const { createModel } = rq('@essrt/physics');
const FR = require(path.join(ROOT, 'packages/physics/src/earth/frame-of-date.cjs'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const REF_FILE = path.join(__dirname, 'sun-inertial-de441.local.json');
if (!fs.existsSync(REF_FILE)) { console.error(`missing ${path.relative(ROOT, REF_FILE)} — run tools/explore/fetch-sun-inertial-de441.mjs first`); process.exit(2); }
const M = DOH.createOneSourceMovement();
const model = createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nbody-secular-series.json'), 'utf8')) });
const REF = JSON.parse(fs.readFileSync(REF_FILE, 'utf8'));
const STRIDE = Number(process.argv[2] || 3), BIN = Number(process.argv[3] || 500);
const J2000 = 2451545.0, R2D = 180 / Math.PI, D2R = Math.PI / 180;
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const dTs = (jd) => model.eclipse.deltaTSecondsAtJD(jd);
const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const by = new Map();
for (let i = 0; i < REF.rows.length; i += STRIDE) {
  const [jd, x, y] = REF.rows[i];
  const year = 2000 + (jd - J2000) / 365.25;
  const smp = M.sampleAt(year);
  const F = FR.computeEarthFrameOfDate(smp);
  const q = cross(F.n, F.g);
  const lam = model.eclipse.sunLonCompletedDegAtJD(utForTT(jd)) * D2R;
  const delta = w180(smp.equinoxLonJ2000Deg - smp.generalPrecessionLonDeg);   // projected − broken angle, deg (zero at J2000)
  const lonOf = (l) => { const d = [0, 1, 2].map((k) => Math.cos(l) * F.g[k] + Math.sin(l) * q[k]); return Math.atan2(d[1], d[0]) * R2D; };
  const lonH = Math.atan2(y, x) * R2D;
  const a = w180(lonOf(lam) - lonH) * 3600, b = w180(lonOf(lam - delta * D2R) - lonH) * 3600;
  const c = Math.floor(year / BIN) * BIN;
  if (!by.has(c)) by.set(c, { t: [], a: [], b: [], d: [] });
  const o = by.get(c); o.t.push(year); o.a.push(a); o.b.push(b); o.d.push(delta * 3600);
}
const st = (v) => { const m = v.reduce((s, x) => s + x, 0) / v.length; return [m, Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length)]; };
const slope = (t, v) => { const mt = st(t)[0], mv = st(v)[0]; let p = 0, q = 0; for (let i = 0; i < t.length; i++) { p += (t[i] - mt) * (v[i] - mv); q += (t[i] - mt) ** 2; } return p / q; };
const T = 31558149.76;
console.log(`model geometric Sun − DE441, J2000 ecliptic longitude, arcsec, per ${BIN} yr (every ${STRIDE * 30} d)`);
console.log('span                as shipped: mean ± sd   sid-year error ms     projected booking (pre-2026-09): mean ± sd      δ ″');
const all = { a: [], b: [] };
for (const [c, o] of [...by.entries()].sort((p, q) => p[0] - q[0])) {
  const f = (v) => { const [m, s] = st(v); return `${m >= 0 ? '+' : ''}${m.toFixed(2)} ± ${s.toFixed(2)}`.padStart(18); };
  const ms = (v) => (-T * slope(o.t, v) / 1296000 * 1000).toFixed(0).padStart(10);
  console.log(`${String(c).padStart(6)}…${String(c + BIN).padEnd(6)}` + f(o.a) + ms(o.a) + '          ' + f(o.b) + ' '.repeat(18) + st(o.d)[0].toFixed(2).padStart(8));
  all.a.push(...o.a); all.b.push(...o.b);
}
const rms = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
console.log(`\nall: as shipped mean ${st(all.a)[0].toFixed(2)} sd ${st(all.a)[1].toFixed(2)} rms ${rms(all.a).toFixed(2)}  |  projected booking mean ${st(all.b)[0].toFixed(2)} sd ${st(all.b)[1].toFixed(2)} rms ${rms(all.b).toFixed(2)}`);
