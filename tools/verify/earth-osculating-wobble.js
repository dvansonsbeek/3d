#!/usr/bin/env node
/**
 * EARTH'S OSCULATING ORBIT AGAINST ITS MEAN — the exhibit artifact (plan 22 step 2).
 *
 *   node tools/verify/earth-osculating-wobble.js            reproduce + compare against the record
 *   node tools/verify/earth-osculating-wobble.js --write    (re)write data/earth-osculating-wobble.json
 *
 * WHAT IT SHOWS. The model publishes Earth's MEAN orbit of date (the one-source
 * series: the ±10-Myr run with the planets' fast wobble averaged out). The
 * OSCULATING orbit — the ellipse the Earth–Moon barycentre would follow if every
 * other planet vanished this instant — swings about that mean with the planets'
 * synodic periods, Jupiter's 11.9-year term the largest (a few hundred arcseconds
 * in the perihelion, 2e-5 in the eccentricity). Nothing in the model produces the
 * osculating orbit — the wobble reaches the Sun's longitude through the planetary
 * completion's direct terms, never through an element — so the Framework
 * Verification panel needs this table to draw it beside the mean.
 *
 * HOW. The Horizons J2000 heliocentric state (tools/explore/j2000-state.mjs — the
 * SAME seed the series and the planet chains come from) integrated as a nine-body
 * system (Sun + eight planetary-system barycentres, EMB as 'earth') with a fixed-step
 * RK4 at 0.1 d over 1000–2500, with the two force terms the series' Wisdom–Holman
 * run carries and a point-mass Newtonian lab lacks — the 1PN (Schwarzschild) term
 * of the Sun's field on each planet (+3.84 ″/cy on Earth's perihelion) and the
 * calibrated lunar quadrupole on the Sun–EMB force (+6.5 ″/cy; the form and the
 * effective factor of the ±10-Myr run's integrator script). Without them the
 * osculating line would tilt 10 ″/cy against the mean — not a wobble. The EMB's
 * osculating e and ϖ (ecliptic J2000) every 20 days, and the series' mean at the
 * same instants; the osculating ϖ is carried to the equinox of date by the series'
 * own frame rotation (mean of date − mean J2000), so the panel compares like with
 * like. Rounded to 1e-9 (e) and 1e-6° (ϖ) — the artifact is a drawing, not a seed.
 *
 * GATES under --write: the 1000–2500 mean of (osculating − mean) within 3″ in ϖ
 * and 5e-7 in e (the series IS the mean element; a larger offset means the lab's
 * physics parted from the run's), and Mercury's semi-major axis drift below 1e-5 AU
 * (the integrator's energy). Plain run: reproduces the record (1e-9 / 1e-6°).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const OUT = path.join(ROOT, 'data', 'earth-osculating-wobble.json');
const WRITE = process.argv.includes('--write');
const INPUT_FILES = [
  'tools/verify/earth-osculating-wobble.js',
  'tools/explore/j2000-state.mjs',
  'tools/lib/deep-orbital-history.js',
  'packages/physics/src/earth/deep-orbital-history.cjs',
  'packages/physics/src/earth/frame-of-date.cjs',
  'packages/physics/src/moon/deep-modes-artifact.cjs',
  'data/nbody-secular-series.json',
  'public/input/astro-reference.json',
];
// 1000–2500 — the panel's widest exhibit window (owner: the curve must fill it);
// 20-day samples keep the file near 1.5 MB with 217 samples per Jupiter cycle.
const SPAN = { startYear: 1000, endYear: 2500, dtDays: 0.1, sampleDays: 20 };

async function derive() {
  const { pathToFileURL } = require('node:url');
  const seed = await import(pathToFileURL(path.join(ROOT, 'tools', 'explore', 'j2000-state.mjs')).href);
  const { HZ, NAMES, gmOf, GM_SUN, GM_EM, LUNAR_QUAD_EFFECTIVE_FACTOR } = seed;
  const C = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));
  const DOH = require(path.join(ROOT, 'tools', 'lib', 'deep-orbital-history.js'));
  const { computeEarthFrameOfDate } = require(path.join(ROOT, 'packages', 'physics', 'src', 'earth', 'frame-of-date.cjs'));
  const movement = DOH.createOneSourceMovement();
  if (!movement) throw new Error('data/nbody-secular-series.json is absent — the mean has no source');
  const DAY = 86400, R2D = 180 / Math.PI, D2R = Math.PI / 180, AU = C.currentAUDistance;
  const bodies = ['sun', ...NAMES];
  const gms = bodies.map((b) => (b === 'sun' ? GM_SUN : gmOf(b)));
  const n = bodies.length, iE = bodies.indexOf('earth'), iM = bodies.indexOf('mercury');
  // the two force terms — the series' run's forms (tools/explore/nbody-wh.mjs kick(); the ±10-Myr run script's lunarQuadForce)
  const C2 = C.speedOfLight * C.speedOfLight;
  const qTilde = C.MASS_RATIO_EARTH_MOON / ((C.MASS_RATIO_EARTH_MOON + 1) ** 2);
  const QUAD_K = (3 / 4) * qTilde * C.moonDistance * C.moonDistance * LUNAR_QUAD_EFFECTIVE_FACTOR;
  // barycentric state: positions [3i..], velocities [3n+3i..]
  const seedState = () => {
    const st = bodies.map((b) => (b === 'sun' ? [0, 0, 0, 0, 0, 0] : HZ[b].slice()));
    const M = gms.reduce((s, g) => s + g, 0);
    const cm = [0, 1, 2, 3, 4, 5].map((k) => st.reduce((s, x, i) => s + gms[i] * x[k], 0) / M);
    const Y = new Float64Array(6 * n);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { Y[3 * i + k] = st[i][k] - cm[k]; Y[3 * n + 3 * i + k] = st[i][3 + k] - cm[3 + k]; }
    return Y;
  };
  const deriv = (Y, dY) => {
    for (let i = 0; i < 3 * n; i++) { dY[i] = Y[3 * n + i]; dY[3 * n + i] = 0; }
    for (let A = 0; A < n; A++) for (let B = A + 1; B < n; B++) {
      const ia = 3 * A, ib = 3 * B;
      const dx = Y[ib] - Y[ia], dy = Y[ib + 1] - Y[ia + 1], dz = Y[ib + 2] - Y[ia + 2];
      const r2 = dx * dx + dy * dy + dz * dz, ir3 = 1 / (r2 * Math.sqrt(r2));
      dY[3 * n + ia] += gms[B] * dx * ir3; dY[3 * n + ia + 1] += gms[B] * dy * ir3; dY[3 * n + ia + 2] += gms[B] * dz * ir3;
      dY[3 * n + ib] -= gms[A] * dx * ir3; dY[3 * n + ib + 1] -= gms[A] * dy * ir3; dY[3 * n + ib + 2] -= gms[A] * dz * ir3;
    }
    // 1PN term of the Sun's field on each planet (heliocentric r, v); the lunar quadrupole on the EMB
    for (let i = 1; i < n; i++) {
      const rx = Y[3 * i] - Y[0], ry = Y[3 * i + 1] - Y[1], rz = Y[3 * i + 2] - Y[2];
      const vx = Y[3 * n + 3 * i] - Y[3 * n], vy = Y[3 * n + 3 * i + 1] - Y[3 * n + 1], vz = Y[3 * n + 3 * i + 2] - Y[3 * n + 2];
      const r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2), v2 = vx * vx + vy * vy + vz * vz, rvv = rx * vx + ry * vy + rz * vz;
      const k = GM_SUN / (C2 * r2 * r), fr = 4 * GM_SUN / r - v2, fv = 4 * rvv;
      let ax = k * (fr * rx + fv * vx), ay = k * (fr * ry + fv * vy), az = k * (fr * rz + fv * vz);
      if (i === iE) { const kq = -GM_SUN * QUAD_K / (r2 * r2 * r); ax += kq * rx; ay += kq * ry; az += kq * rz; }
      dY[3 * n + 3 * i] += ax; dY[3 * n + 3 * i + 1] += ay; dY[3 * n + 3 * i + 2] += az;
    }
  };
  const oscul = (Y, i, mu) => {
    const r = [0, 1, 2].map((k) => Y[3 * i + k] - Y[k]), v = [0, 1, 2].map((k) => Y[3 * n + 3 * i + k] - Y[3 * n + k]);
    const rn = Math.hypot(...r), v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
    const ex = (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn, ey = (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn, ez = (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn;
    return { e: Math.hypot(ex, ey, ez), pomDeg: Math.atan2(ey, ex) * R2D, a: 1 / (2 / rn - v2 / mu) };
  };
  const integrate = (sign) => {
    const Y = seedState(), h = sign * SPAN.dtDays * DAY;
    const spanYr = sign > 0 ? SPAN.endYear - 2000 : 2000 - SPAN.startYear;
    const steps = Math.round(spanYr * 365.25 / SPAN.dtDays), every = Math.round(SPAN.sampleDays / SPAN.dtDays);
    const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
    const out = [];
    for (let s = 0; s <= steps; s++) {
      if (s % every === 0) { const E = oscul(Y, iE, GM_SUN + GM_EM), M = oscul(Y, iM, GM_SUN + gmOf('mercury')); out.push({ days: sign * s * SPAN.dtDays, e: E.e, pomDeg: E.pomDeg, aMercuryAU: M.a / AU }); }
      deriv(Y, k1); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
      deriv(tmp, k2); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
      deriv(tmp, k3); for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
      deriv(tmp, k4); for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    return out;
  };
  const samples = [...integrate(-1).reverse().slice(0, -1), ...integrate(+1)];
  // the series' mean at the same instants, and its frame rotation (of date − J2000) for the osculating ϖ
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const wrap = (d) => ((d + 540) % 360) - 180;
  const t = [], oscE = [], oscPomOfDateDeg = [], meanE = [], meanPomOfDateDeg = [];
  let sPom = 0, sE = 0, cnt = 0, aMin = Infinity, aMax = -Infinity;
  for (const s of samples) {
    const y = 2000 + s.days / 365.25, smp = movement.sampleAt(y), F = computeEarthFrameOfDate(smp), u = cross(F.n, F.g);
    const ev = [0, 1].map((k) => smp.e * (Math.cos(smp.periOfDateDeg * D2R) * F.g[k] + Math.sin(smp.periOfDateDeg * D2R) * u[k]));
    const meanPomJ2000 = Math.atan2(ev[1], ev[0]) * R2D;
    const rot = smp.periOfDateDeg - meanPomJ2000;                 // the equinox's own motion, the same for both ellipses
    const oscOfDate = ((s.pomDeg + rot) % 360 + 360) % 360;
    t.push(Number(y.toFixed(4))); oscE.push(Number(s.e.toFixed(9))); oscPomOfDateDeg.push(Number(oscOfDate.toFixed(6)));
    meanE.push(Number(smp.e.toFixed(9))); meanPomOfDateDeg.push(Number(((smp.periOfDateDeg % 360 + 360) % 360).toFixed(6)));
    sPom += wrap(s.pomDeg - meanPomJ2000) * 3600; sE += s.e - smp.e; cnt++;
    aMin = Math.min(aMin, s.aMercuryAU); aMax = Math.max(aMax, s.aMercuryAU);
  }
  return {
    t, oscE, oscPomOfDateDeg, meanE, meanPomOfDateDeg,
    verdict: { samples: cnt, meanOffsetPomArcsec: Number((sPom / cnt).toFixed(3)), meanOffsetE: Number((sE / cnt).toExponential(3)), mercuryADriftAU: Number((aMax - aMin).toExponential(2)) },
  };
}

async function main() {
  const t0 = Date.now();
  const d = await derive();
  const art = {
    _description: 'Earth\'s OSCULATING orbit against its MEAN — GENERATED by tools/verify/earth-osculating-wobble.js --write. The Earth–Moon barycentre\'s osculating e and ϖ (the ellipse of the instant) from the Horizons J2000 seed integrated as a nine-body system with the 1PN term and the calibrated lunar quadrupole (the series\' run\'s two force terms), every 20 days over 1000–2500, beside the one-source series\' mean element at the same instants; ϖ for both on the equinox of date (the osculating ϖ carried by the series\' own frame rotation). A drawing for the Framework Verification panel ("Perihelion — osculating vs mean"), not a model input: nothing reads it but the panel. verdict: the window mean of (osculating − mean) — the series IS the mean element, so this is a consistency check of the lab\'s physics against the run\'s — and Mercury\'s semi-major-axis drift (the integrator\'s energy).',
    span: SPAN,
    unit: { t: 'decimal year (TT)', oscE: 'eccentricity', oscPomOfDateDeg: 'degrees, ecliptic and equinox of date', meanE: 'eccentricity', meanPomOfDateDeg: 'degrees, ecliptic and equinox of date' },
    verdict: d.verdict,
    t: d.t, oscE: d.oscE, oscPomOfDateDeg: d.oscPomOfDateDeg, meanE: d.meanE, meanPomOfDateDeg: d.meanPomOfDateDeg,
    inputs: buildInputsBlock('node tools/verify/earth-osculating-wobble.js --write', INPUT_FILES),
  };
  console.log(`earth osculating wobble: ${d.verdict.samples} samples ${SPAN.startYear}–${SPAN.endYear} · (osculating − mean) window mean ${d.verdict.meanOffsetPomArcsec}″ / ${d.verdict.meanOffsetE} · Mercury a drift ${d.verdict.mercuryADriftAU} AU · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const gate = (ok, msg) => { if (!ok) { console.error('REFUSING: ' + msg); process.exit(1); } };
  if (WRITE) {
    gate(Math.abs(d.verdict.meanOffsetPomArcsec) <= 3, `the osculating − mean window mean is ${d.verdict.meanOffsetPomArcsec}″ — the lab's physics parted from the series' run (3″ bound)`);
    gate(Math.abs(d.verdict.meanOffsetE) <= 5e-7, `the osculating − mean window mean in e is ${d.verdict.meanOffsetE} (5e-7 bound)`);
    gate(d.verdict.mercuryADriftAU <= 1e-5, `Mercury's a drifts ${d.verdict.mercuryADriftAU} AU — the integrator's energy is not held`);
    fs.writeFileSync(OUT, JSON.stringify(art));
    console.log(`✓ wrote data/earth-osculating-wobble.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} kB)`);
  } else {
    if (!fs.existsSync(OUT)) { console.error('FAIL — no recorded artifact. First run: node tools/verify/earth-osculating-wobble.js --write'); process.exit(1); }
    const rec = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    let bad = 0;
    const cmp = (a, b, tol, name) => { if (a.length !== b.length) { bad++; console.error(`  DIVERGED ${name}: ${b.length} recorded rows, ${a.length} computed`); return; } for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > tol) { if (bad < 10) console.error(`  DIVERGED ${name}[${i}] (t ${a === d.t ? a[i] : d.t[i]}): recorded ${b[i]}, computed ${a[i]}`); bad++; } };
    cmp(d.t, rec.t, 1e-4, 't'); cmp(d.oscE, rec.oscE, 1e-9, 'oscE'); cmp(d.oscPomOfDateDeg, rec.oscPomOfDateDeg, 1e-6, 'oscPomOfDateDeg'); cmp(d.meanE, rec.meanE, 1e-9, 'meanE'); cmp(d.meanPomOfDateDeg, rec.meanPomOfDateDeg, 1e-6, 'meanPomOfDateDeg');
    if (bad) { console.error(`FAIL — ${bad} value(s) diverged from the recording. Investigate; if this is a conscious re-measurement, run with --write.`); process.exit(1); }
    console.log('PASS — the recorded artifact is reproduced.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
