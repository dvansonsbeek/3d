#!/usr/bin/env node
/**
 * EARTH OSCULATING MEAN OFFSET — the derived mean-element offset of Earth's
 * orbit for the eclipse Sun (plan 06 layer B: the eclipse Sun onto the series).
 *
 *   node tools/verify/earth-osculating-offset.js            reproduce + compare
 *                                                            against the recorded artifact
 *   node tools/verify/earth-osculating-offset.js --write    (re)write
 *                                                            data/earth-osculating-mean-offset.json
 *
 * WHAT IT DERIVES. The one-source series is the SECULAR Earth orbit (its
 * J2000 element ≡ La2004's). The Sun's equation of centre needs the MEAN
 * elements of the era — secular plus the window average of the planetary
 * perturbation of e and ϖ (the long-period part; the fast osculating wobble
 * is carried by the direct terms of the planetary completion). Until this
 * artifact the eclipse Sun got that average only through the K law's
 * Standish anchor (an external 1800–2050 osculating fit: +105″, +7.8e-6).
 *
 * METHOD (fully derived, no ephemeris comparison enters): the Horizons J2000
 * heliocentric state (tools/explore/j2000-state.mjs — the SAME seed the
 * planet chains and the secular series come from) integrated as a nine-body
 * system (Sun + eight planetary-system barycenters, EMB as 'earth') with the
 * lab's RK4 derivative, ±110 yr around J2000, sampled daily; the EMB's
 * osculating e and ϖ (μ = GM☉ + GM_EM, ecliptic-J2000) minus the chain's
 * secular elements of the same epoch (J2000 frame); the artifact is the
 * 1890–2110 mean of that difference.
 *
 * MEASURED (2026-09-21, the instrument tools/explore/d2-earth-osculating-
 * channel.mjs + its low-pass validation): against the 1,600-epoch JPL Sun
 * sample the series Sun + shipped completion reads sd 3.23″; adding the
 * FULL time-dependent channel 9.50″ (the fast wobble is double-counted with
 * the completion); the 12-yr low-pass 1.83″; the window MEAN 1.59″ — equal
 * to the K Sun (1.58″) and to the Standish constant (1.57″). The mean is
 * the physics; the artifact carries it.
 *
 * Reproduction check: plain run recomputes and compares (1e-6″ / 1e-12).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const OUT = path.join(ROOT, 'data', 'earth-osculating-mean-offset.json');
const WRITE = process.argv.includes('--write');
const INPUT_FILES = [
  'tools/explore/j2000-state.mjs',
  'tools/explore/derive-planetary-lunar-terms.js',
  'tools/lib/keplerian-chain.js',
  'packages/physics/src/planets/chain-artifact.js',
  'tools/verify/earth-osculating-offset.js',
];
const WINDOW = { startYear: 1890, endYear: 2110, spanYears: 110, dtDays: 0.1, sampleDays: 1 };

async function derive() {
  const { pathToFileURL } = require('node:url');
  const seed = await import(pathToFileURL(path.join(ROOT, 'tools', 'explore', 'j2000-state.mjs')).href);
  const { HZ, NAMES, gmOf, GM_SUN, GM_EM } = seed;
  const P = require(path.join(ROOT, 'tools', 'explore', 'derive-planetary-lunar-terms.js'));
  const KC = require(path.join(ROOT, 'tools', 'lib', 'keplerian-chain.js'));
  const { CHAIN_ARTIFACT } = require(path.join(ROOT, 'packages', 'physics', 'src', 'planets', 'chain-artifact.js'));
  const chains = KC.buildPlanetChainsFromArtifact ? KC.buildPlanetChainsFromArtifact(CHAIN_ARTIFACT) : KC.buildPlanetChains(CHAIN_ARTIFACT);
  const DAY = 86400, R2D = 180 / Math.PI, AS = 3600, J2000 = 2451545.0;
  const bodies = ['sun', ...NAMES];
  const gms = bodies.map((b) => (b === 'sun' ? GM_SUN : gmOf(b)));
  const n = bodies.length;
  const iE = bodies.indexOf('earth');
  const seedState = () => {
    const st = bodies.map((b) => (b === 'sun' ? [0, 0, 0, 0, 0, 0] : HZ[b].slice()));
    const M = gms.reduce((s, g) => s + g, 0);
    const cm = [0, 1, 2, 3, 4, 5].map((k) => st.reduce((s, x, i) => s + gms[i] * x[k], 0) / M);
    const Y = new Float64Array(6 * n);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
      Y[3 * i + k] = st[i][k] - cm[k];
      Y[3 * n + 3 * i + k] = st[i][3 + k] - cm[3 + k];
    }
    return Y;
  };
  const osculEMB = (Y) => {
    const r = [0, 1, 2].map((k) => Y[3 * iE + k] - Y[k]);
    const v = [0, 1, 2].map((k) => Y[3 * n + 3 * iE + k] - Y[3 * n + k]);
    const mu = GM_SUN + GM_EM, rn = Math.hypot(...r);
    const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
    const ex = (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn;
    const ey = (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn;
    const ez = (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn;
    return { e: Math.hypot(ex, ey, ez), pomDeg: Math.atan2(ey, ex) * R2D };
  };
  const integrate = (sign) => {
    const Y = seedState();
    const deriv = P.makeDeriv(gms, n, false);
    const h = sign * WINDOW.dtDays * DAY;
    const steps = Math.round(WINDOW.spanYears * 365.25 / WINDOW.dtDays);
    const sampleEvery = Math.max(1, Math.round(WINDOW.sampleDays / WINDOW.dtDays));
    const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
    const out = [];
    for (let s = 0; s <= steps; s++) {
      if (s % sampleEvery === 0) out.push({ days: sign * s * WINDOW.dtDays, ...osculEMB(Y) });
      deriv(Y, k1);
      for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
      deriv(tmp, k2);
      for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
      deriv(tmp, k3);
      for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
      deriv(tmp, k4);
      for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    return out;
  };
  const wrap = (d) => ((d + 540) % 360) - 180;
  const samples = [...integrate(-1).reverse().slice(0, -1), ...integrate(+1)];
  let sPom = 0, sE = 0, cnt = 0, at0 = null;
  for (const s of samples) {
    const y = 2000 + s.days / 365.25;
    if (y < WINDOW.startYear || y > WINDOW.endYear) continue;
    const sec = KC.computePlanetElementsAtYear(y, chains.earth, chains);
    const dPom = wrap(s.pomDeg - sec.lonPeriEclipticDeg) * AS;
    const dE = s.e - sec.e;
    if (s.days === 0) at0 = { dPomArcsec: dPom, dE };
    sPom += dPom; sE += dE; cnt++;
  }
  return {
    dPomArcsec: sPom / cnt, dE: sE / cnt, samples: cnt,
    anchorCheck: at0,   // the chain anchor IS the osculating J2000 element: expect 0, 0
    _J2000: J2000,
  };
}

async function main() {
  const t0 = Date.now();
  const d = await derive();
  console.log(`derived: ⟨Δϖ⟩ ${d.dPomArcsec.toFixed(4)}″  ⟨Δe⟩ ${d.dE.toExponential(6)}  over ${d.samples} daily samples ${WINDOW.startYear}–${WINDOW.endYear}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  console.log(`anchor check at J2000: Δϖ ${d.anchorCheck.dPomArcsec.toExponential(2)}″  Δe ${d.anchorCheck.dE.toExponential(2)}  (expect 0 — the chain anchor is the osculating J2000 element)`);
  const doc = {
    _description: 'Earth osculating MEAN offset for the eclipse Sun — GENERATED by tools/verify/earth-osculating-offset.js --write. The 1890–2110 mean of (osculating − secular) e and ϖ of the EMB, from the Horizons J2000 seed integrated as a nine-body system (the lab RK4); the secular reference is the planet chain (J2000 frame). The eclipse Sun’s equation of centre rides the one-source series PLUS this offset (mean elements of the era); the published Earth surface stays the secular series. Fully derived; the JPL Sun sample is a validation only (record in the header of the generator): series + this offset reads 1.59″ all-phase sd, the former K Sun 1.58″.',
    window: WINDOW,
    dPomArcsec: d.dPomArcsec,
    dE: d.dE,
    samples: d.samples,
    anchorCheckAtJ2000: d.anchorCheck,
    inputs: buildInputsBlock('node tools/verify/earth-osculating-offset.js --write', INPUT_FILES),
  };
  if (WRITE) {
    fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
    console.log(`✓ wrote ${path.relative(ROOT, OUT)}`);
    return;
  }
  if (!fs.existsSync(OUT)) { console.error(`FAIL — no recorded artifact. First run: node tools/verify/earth-osculating-offset.js --write`); process.exit(1); }
  const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const ok = Math.abs(prev.dPomArcsec - d.dPomArcsec) < 1e-6 && Math.abs(prev.dE - d.dE) < 1e-12;
  console.log(`${ok ? 'REPRODUCED' : 'DIVERGED'}  recorded ⟨Δϖ⟩ ${prev.dPomArcsec.toFixed(6)}″ ⟨Δe⟩ ${prev.dE.toExponential(6)} vs computed ${d.dPomArcsec.toFixed(6)}″ ${d.dE.toExponential(6)}`);
  if (!ok) { console.error('Investigate; if this is a conscious re-derivation, run with --write.'); process.exit(1); }
  console.log('PASS');
}
main().catch((e) => { console.error(e); process.exit(1); });
