#!/usr/bin/env node
// P5/K3 — old-vs-new parity: the geometric two-vector chains (shipped) vs the
// engine-D-driven Keplerian flag path, as geocentric RA/Dec through the SAME
// readout (computePlanetPosition), toggled in-process.
//
// This is the documented DELTA of the swap, not a pass/fail gate: the two
// paths are different models of the planets (fitted geometry + observation-
// fitted corrections vs the raw engine rendering), and where they differ is
// published model content (plan 02 §P5 K2 doctrine). The K1 baseline table
// is the observational before-picture; this instrument is the before/after
// bridge between the two paths.
//
// RESULT (measured, 1800–2100, 5-yr grid, geocentric RA/Dec):
//   planet    RMS ″   max ″   at-J2000 ″
//   mercury   128.7   445.0    33.8
//   venus      90.7   278.0    59.0
//   mars      108.2   282.6   141.8
//   jupiter   120.7   250.1   100.7
//   saturn    394.5   833.1   111.9
//   uranus    484.9   970.8    19.4
//   neptune   605.0  1076.8    19.9
//   Reading: inner planets ~1.5–2′ RMS (the Kepler skeleton's periodic
//   budget, geocentrically amplified, plus the old chains' fitted
//   corrections that the flag path excludes by doctrine); giants 6–10′
//   (the B2 great-inequality budget). The swap's delta is now a published
//   number; the observational verdict (which path sits closer to JPL and
//   the corpus) is the K1-baseline comparison, reported at K4.
//   Flag-off inertness PROVEN: eclipse-audit REPRODUCED every recorded
//   value on regeneration (hash-only artifact diff); check:engine PASS
//   (794 fixture values, no drift).
//
//   node tools/explore/k3-chain-parity.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const SG = require(ROOT + 'tools/lib/scene-graph.js');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');

const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const J2000_JD = KC.ANCHOR_EPOCH_JD;

// angular separation between two RA/Dec pairs (scene spherical convention)
function sep(a, b) {
  const v = (s) => {
    const dec = Math.PI / 2 - s.dec, ra = s.ra;   // phi is polar in the scene convention
    return [Math.sin(dec) * Math.cos(ra), Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  };
  const x = v(a), y = v(b);
  const dot = Math.max(-1, Math.min(1, x[0] * y[0] + x[1] * y[1] + x[2] * y[2]));
  return Math.acos(dot) * 180 / Math.PI * 3600;
}

const jds = [];
for (let y = -200; y <= 100; y += 5) jds.push(J2000_JD + y * 365.25);

console.log('K3 parity — geometric chains (shipped) vs Keplerian flag path, geocentric, 1800–2100:');
console.log('planet    RMS ″      max ″      at-J2000 ″');
for (const p of PLANETS) {
  let s2 = 0, mx = 0, atJ2000 = 0;
  for (const jd of jds) {
    SG._setKeplerChains(false);
    const oldPos = SG.computePlanetPosition(p, jd);
    SG._setKeplerChains(true);
    const newPos = SG.computePlanetPosition(p, jd);
    const d = sep(oldPos, newPos);
    s2 += d * d; mx = Math.max(mx, d);
    if (Math.abs(jd - J2000_JD) < 1) atJ2000 = d;
  }
  console.log(`  ${p.padEnd(8)} ${Math.sqrt(s2 / jds.length).toFixed(1).padStart(8)} ${mx.toFixed(1).padStart(10)} ${atJ2000.toFixed(1).padStart(12)}`);
}
SG._setKeplerChains(false);
console.log('\n(Differences are published model content: fitted-geometry+corrections vs the raw engine rendering.)');
