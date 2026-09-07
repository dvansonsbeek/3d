#!/usr/bin/env node
// K5c — THE CHAIN SPEAKS THE INVARIABLE-PLANE FRAME (plan 02, owner 2026-09-07).
//
// Measures the chain's invariable-plane elements of date (inclInvPlaneDeg /
// ascNodeInvPlaneDeg — the K5c evaluator outputs, rotated EXACTLY from the
// ecliptic elements through the artifact-banked s-frame) against the external
// reference values, so every display swap of the legacy inv-plane family is a
// MEASURED replacement, never a silent frame swap (the marker-convention
// lesson).
//
// THE FRAME: the artifact banks the ENGINE'S OWN invariable plane — pole from
// the J2000 seed state's total angular momentum (DE440 masses, Horizons
// vectors; the model as source). Souami & Souchay (2012, A&A 543, A133) is an
// external reference label, never an input.
//
// CONVENTION NOTE (the honest gap): the chain's Ω_inv is measured from the
// s-frame x-axis = ecliptic-X projected into the plane (the NAFF extraction
// convention); S&S quote nodes in their own origin conventions. Inclination
// i_inv is convention-free (the angle between the orbit plane and the
// invariable plane) — that is the column this probe gates its verdict on.
//
// RESULT (first run, artifact with banked plane; values recorded on landing):
//   engine plane 1.57851° / 107.5824° vs S&S 1.5787° / 107.58° (≤ 0.2′)
//   i_inv @J2000 vs S&S: mercury −0.003°, venus +0.041°, earth +0.007°,
//   mars +0.048°, jupiter +0.005°, saturn +0.005°, uranus +0.033°,
//   neptune −0.010° — elements-of-date (osculating + periodic layer) vs
//   S&S mean elements; the ≤0.05° class is the expected representation gap.
//
// Run: node tools/explore/k5c-invplane-probe.mjs   (read-only; no writes)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear } =
  require(path.join(ROOT, 'packages', 'physics', 'src', 'planets', 'keplerian-chain.cjs'));

const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'), 'utf8'));
if (!art.invariablePlane) {
  console.error('artifact carries no invariablePlane — regenerate: node tools/verify/nbody-secular.js --write');
  process.exit(1);
}

// Souami & Souchay (2012), inclination of each orbit to the invariable plane
// at J2000 — EXTERNAL REFERENCE LABELS (another determination, not an
// observation and never an input).
const SS_INCL_DEG = {
  mercury: 6.3475, venus: 2.1545, earth: 1.5717, mars: 1.6311,
  jupiter: 0.3219, saturn: 0.9254, uranus: 0.9946, neptune: 0.7354,
};
const SS_PLANE = { inclEclipticDeg: 1.5787, ascNodeEclipticDeg: 107.58 };

const chains = buildPlanetChainsFromArtifactData(art);
const IP = art.invariablePlane;

console.log('K5c — chain invariable-plane elements vs external references\n');
console.log(`banked s-frame (engine's own plane, from the J2000 seed total L):`);
console.log(`  incl ${IP.inclEclipticDeg.toFixed(5)}°  node ${IP.ascNodeEclipticDeg.toFixed(4)}°`);
console.log(`  S&S 2012 reference plane: incl ${SS_PLANE.inclEclipticDeg}°  node ${SS_PLANE.ascNodeEclipticDeg}°`);
const dIncl = (IP.inclEclipticDeg - SS_PLANE.inclEclipticDeg) * 60;
const dNode = (IP.ascNodeEclipticDeg - SS_PLANE.ascNodeEclipticDeg) * 60;
console.log(`  Δ incl ${dIncl.toFixed(2)}′, Δ node ${dNode.toFixed(2)}′ (engine plane vs S&S — different mass sets/epoch handling; label, not a gate)\n`);

console.log('planet    i_inv@J2000  S&S ref   Δ (°)     Ω_inv@J2000  Ω_inv@1800  Ω_inv@2100');
let maxAbsD = 0;
for (const p of Object.keys(SS_INCL_DEG)) {
  const el0 = computePlanetElementsAtYear(2000.0, chains[p], chains);
  const elA = computePlanetElementsAtYear(1800.0, chains[p], chains);
  const elB = computePlanetElementsAtYear(2100.0, chains[p], chains);
  const d = el0.inclInvPlaneDeg - SS_INCL_DEG[p];
  maxAbsD = Math.max(maxAbsD, Math.abs(d));
  console.log(
    p.padEnd(9) +
    el0.inclInvPlaneDeg.toFixed(4).padStart(10) +
    SS_INCL_DEG[p].toFixed(4).padStart(9) +
    (d >= 0 ? '  +' : '  ') + d.toFixed(4).padStart(6) +
    el0.ascNodeInvPlaneDeg.toFixed(3).padStart(13) +
    elA.ascNodeInvPlaneDeg.toFixed(3).padStart(12) +
    elB.ascNodeInvPlaneDeg.toFixed(3).padStart(12)
  );
}
console.log(`\nmax |Δ i_inv| vs S&S: ${maxAbsD.toFixed(4)}° (elements-of-date vs S&S mean elements — the representation gap)`);
console.log('Ω_inv convention: measured from the s-frame x-axis (ecliptic-X projected into the plane);');
console.log('S&S node values use their own origin convention — inclination is the convention-free column.');
if (maxAbsD > 0.1) {
  console.error('\nFAIL — i_inv departs the S&S references beyond the 0.1° representation band; basis or rotation broken.');
  process.exit(1);
}
console.log('\nPASS — the chain speaks the invariable-plane frame within the expected representation band.');
