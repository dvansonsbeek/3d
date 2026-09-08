#!/usr/bin/env node
// ⚠ HISTORICAL INSTRUMENT (pre-K5-excision): this script toggled the
// legacy/chain flag in BOTH engines (window._setKeplerChains /
// SG._setKeplerChains), REMOVED with the K5 legacy-chain excision — the
// chain is the only planet path. The parity finding recorded below is the
// permanent record; the script no longer runs as written. (The chain-side
// injection hook SG._injectKeplerChains still exists for live instruments.)
//
// P5/K4b — BROWSER↔NODE PARITY OF THE KEPLERIAN FLAG PATH: the same chain
// (one evaluator home in @essrt/physics, the same embedded/on-disk governed
// artifact, the same runtime frame-bridge derivation) evaluated through the
// two scenes — src/script.js in headless Chromium (dist bundle, the golden-
// master harness) vs the tools/lib/scene-graph.js mirror — compared
// epoch-for-epoch as angular separation of the of-date readout. This closes
// the last mirror-equivalence question BEFORE any default flip: a browser
// user with ?keplerChains=1 sees the same numbers the K4 verdict measured.
//
// Prerequisite: npm run build (the harness serves dist/).
//
// RESULT (measured, 26 epochs 1600–2100):
//   KEPLERIAN flag path: 0.06–0.07″ RMS, 0.07–0.09″ max, ALL SEVEN planets —
//   sub-arcsecond, three orders below the chain's own 18–21″ vs JPL: the two
//   scenes render ONE chain.
//   CONTROL (shipped paths, flag OFF): 45–250″ RMS — a PROBE-MODE artifact,
//   not production error: forceSceneUpdate('light') skips the updaters that
//   feed the fitted corrections' dynamic inputs (asc-node keys etc.), and the
//   shipped path is stateful where the raw path is a pure function of jd.
//   THE BUG THIS CAUGHT (first run read 5,600–25,600″): the browser R
//   derivation probed the scene via bare moveModel(posFromJD(jd)) while
//   o.julianDay pointed at the flag-enable epoch — a MIXED state (moveModel
//   reads JD-driven globals) that twisted R by 5.84° azimuth. Diagnosis
//   chain: flag-off control clean → R-compare (browser R vs Node R = exactly
//   the 68.22° world-convention azimuth, so per-scene Rs were fine when
//   derived cleanly) → real-vs-probe hats (0.0000° when o.julianDay matches)
//   → the mixed state isolated. Fix: derive R through jumpToJulianDay +
//   forceSceneUpdate('minimal') (the moonSceneState save/restore pattern;
//   'minimal' cannot recurse into updatePositions).
//
//   node tools/explore/k4b-browser-parity.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { openSimulator } from '../../test/browser/harness.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const SG = require(ROOT + 'tools/lib/scene-graph.js');

const D2R = Math.PI / 180, J2000_JD = 2451545.0;
const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const JDS = [];
for (let y = 1600; y <= 2100; y += 20) JDS.push(J2000_JD + (y - 2000) * 365.25);

const sep = (ra1, dec1, ra2, dec2) => {   // degrees in → arcsec out
  const v = (ra, dec) => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
  const a = v(ra1, dec1), b = v(ra2, dec2);
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D2R * 3600;
};

console.log('launching headless simulator (dist bundle)…');
const s = await openSimulator();
if (s.errors.length) { console.error('page errors:', s.errors); process.exit(1); }

// browser side, BOTH passes (flag restored OFF — the page is the goldens')
const browserOut = await s.page.evaluate(({ jds }) => {
  const run = () => { const out = {}; for (const jd of jds) out[jd] = window.__test__.planetsSceneStateAt(jd); return out; };
  const off = run();                       // control: the shipped paths
  window._setKeplerChains(true);
  const on = run();                        // the flag path
  window._setKeplerChains(false);
  return { on, off };
}, { jds: JDS });
await s.dispose();

function compare(label, flagOn, browserSide) {
  SG._setKeplerChains(flagOn);
  const stats = Object.fromEntries(PLANETS.map((p) => [p, { s2: 0, n: 0, mx: 0, mxJd: 0 }]));
  for (const jd of JDS) {
    for (const p of PLANETS) {
      const m = SG.computePlanetPosition(p.toLowerCase(), jd);
      const b = browserSide[jd][p];
      const d = sep(SG.thetaToRaDeg(m.ra), SG.phiToDecDeg(m.dec), SG.thetaToRaDeg(b.ra), SG.phiToDecDeg(b.dec));
      const st = stats[p];
      st.s2 += d * d; st.n++;
      if (d > st.mx) { st.mx = d; st.mxJd = jd; }
    }
  }
  SG._setKeplerChains(false);
  console.log(`\n${label} — BROWSER ↔ NODE, 1600–2100 (${JDS.length} epochs):`);
  console.log('planet      RMS ″     max ″     @year');
  let worst = 0;
  for (const p of PLANETS) {
    const st = stats[p];
    const rms = Math.sqrt(st.s2 / st.n);
    worst = Math.max(worst, st.mx);
    console.log(`  ${p.padEnd(9)} ${rms.toFixed(3).padStart(8)} ${st.mx.toFixed(3).padStart(9)}   ${(2000 + (st.mxJd - J2000_JD) / 365.25).toFixed(0)}`);
  }
  return worst;
}

const worstOff = compare('SHIPPED paths (flag OFF — the conventions/mirror control)', false, browserOut.off);
const worstOn = compare('KEPLERIAN flag path', true, browserOut.on);
console.log(worstOn < 1 ? '\nPARITY: sub-arcsecond — the two scenes render ONE chain.' :
  `\nPARITY GAP ${worstOn.toFixed(2)}″ (control ${worstOff.toFixed(2)}″) — ` +
  (worstOff > 1 ? 'the CONTROL fails too: comparison conventions / mirror state, not the chain.' :
    'control clean: the gap is flag-specific (R derivation context / JD→year / light-time).'));
