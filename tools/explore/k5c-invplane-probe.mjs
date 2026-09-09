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
// CONVENTION NOTE (the gap, now DERIVED closed): the chain's Ω_inv is
// measured from the s-frame x-axis = ecliptic-X projected into the plane
// (the NAFF extraction convention); S&S quote nodes from the invariable
// plane's ASCENDING NODE ON THE ICRF EQUATOR. The K5c node-origin
// derivation (packages/physics/src/planets/inv-plane-frame.cjs) converts
// exactly — banked plane + J2000 mean obliquity, zero fitted constants.
// This probe gates BOTH convention-free columns: i_inv, and the converted
// nodes vs S&S with the pole-class tolerance |ΔΩ|·sin(i_inv) ≤ 0.1° (the
// same representation band — a node offset is a pole offset divided by
// sin i_inv). It also gates the derivation itself: the derived origin must
// reproduce S&S's published equator-node RA 3°51′9.4″ = 3.8526°.
//
// RESULT (first run, artifact with banked plane; values recorded on landing):
//   engine plane 1.57851° / 107.5824° vs S&S 1.5787° / 107.58° (≤ 0.2′)
//   i_inv @J2000 vs S&S: mercury −0.003°, venus +0.041°, earth +0.007°,
//   mars +0.048°, jupiter +0.005°, saturn +0.005°, uranus +0.033°,
//   neptune −0.010° — elements-of-date (osculating + periodic layer) vs
//   S&S mean elements; the ≤0.05° class is the expected representation gap.
//
// RESULT (node round — the origin derivation landed): derived origin
//   s-frame 3.5465°, equator-node RA 3.8522° vs S&S published 3.8526°
//   (0.4 mdeg). Converted nodes vs S&S: max |ΔΩ|·sin(i_inv) = 0.0382° —
//   inside the same ≤0.05° pole-class band as i_inv (raw ΔΩ runs 0.15°
//   Mars … 6.69° Jupiter, exactly the 1/sin(i_inv) amplification of the
//   element-class pole gap). Both gates FAIL-PROVEN: a silent frame swap
//   (unconverted s-frame node) trips the pole-class gate; a zeq sign bug
//   trips the RA identification gate (RA 177.46°).
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
const { computeSFrameBasis, computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } =
  require(path.join(ROOT, 'packages', 'physics', 'src', 'planets', 'inv-plane-frame.cjs'));

const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'), 'utf8'));
if (!art.invariablePlane) {
  console.error('artifact carries no invariablePlane — regenerate: node tools/verify/nbody-secular.js --write');
  process.exit(1);
}
const astro = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'input', 'astro-reference.json'), 'utf8'));

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

// ── The node-origin derivation gate ─────────────────────────────────────
// Derived origin: the inv plane's ascending node on the ICRF equator, from
// the banked plane + J2000 mean obliquity. Its RA must reproduce S&S's
// published 3°51′9.4″ — the identification check of the derivation itself.
const epsDeg = astro.earthOrbital.obliquityJ2000_deg;
const originDeg = computeEquatorNodeOriginSFrameDeg(IP, epsDeg);
const SS_EQUATOR_NODE_RA_DEG = 3 + 51 / 60 + 9.4 / 3600;   // S&S 2012, published
{
  const D2R = Math.PI / 180;
  const { zf } = computeSFrameBasis(IP);
  const eps = epsDeg * D2R;
  const zeq = [0, Math.sin(eps), Math.cos(eps)];
  const n = [zeq[1] * zf[2] - zeq[2] * zf[1], zeq[2] * zf[0] - zeq[0] * zf[2], zeq[0] * zf[1] - zeq[1] * zf[0]];
  const neq = [n[0], n[1] * Math.cos(eps) - n[2] * Math.sin(eps), n[1] * Math.sin(eps) + n[2] * Math.cos(eps)];
  const raDeg = ((Math.atan2(neq[1], neq[0]) / D2R) + 360) % 360;
  console.log(`derived S&S longitude origin: s-frame ${originDeg.toFixed(4)}°, equator-node RA ${raDeg.toFixed(4)}° (S&S publish ${SS_EQUATOR_NODE_RA_DEG.toFixed(4)}°)`);
  if (Math.abs(raDeg - SS_EQUATOR_NODE_RA_DEG) > 0.01) {
    console.error('\nFAIL — the derived equator-node RA does not reproduce S&S\'s published origin; derivation or plane broken.');
    process.exit(1);
  }
}
const SS_NODE_DEG = astro.ascendingNodesSouamiSouchay;

console.log('\nplanet    i_inv@J2000  S&S ref   Δ (°)     Ω_inv(s-frame)  Ω_inv(S&S conv)  S&S ref   ΔΩ (°)  ΔΩ·sin(i)');
let maxAbsD = 0;
let maxPoleClass = 0;
for (const p of Object.keys(SS_INCL_DEG)) {
  const el0 = computePlanetElementsAtYear(2000.0, chains[p], chains);
  const d = el0.inclInvPlaneDeg - SS_INCL_DEG[p];
  maxAbsD = Math.max(maxAbsD, Math.abs(d));
  const nodeSS = convertNodeSFrameToEquatorOriginDeg(el0.ascNodeInvPlaneDeg, originDeg);
  const dN = ((nodeSS - SS_NODE_DEG[p] + 540) % 360) - 180;
  const poleClass = Math.abs(dN) * Math.sin(el0.inclInvPlaneDeg * Math.PI / 180);
  maxPoleClass = Math.max(maxPoleClass, poleClass);
  console.log(
    p.padEnd(9) +
    el0.inclInvPlaneDeg.toFixed(4).padStart(10) +
    SS_INCL_DEG[p].toFixed(4).padStart(9) +
    (d >= 0 ? '  +' : '  ') + d.toFixed(4).padStart(6) +
    el0.ascNodeInvPlaneDeg.toFixed(3).padStart(15) +
    nodeSS.toFixed(3).padStart(16) +
    SS_NODE_DEG[p].toFixed(2).padStart(9) +
    (dN >= 0 ? '  +' : '  ') + dN.toFixed(3).padStart(6) +
    poleClass.toFixed(4).padStart(10)
  );
}
console.log(`\nmax |Δ i_inv| vs S&S: ${maxAbsD.toFixed(4)}° (elements-of-date vs S&S mean elements — the representation gap)`);
console.log(`max |ΔΩ|·sin(i_inv) vs S&S: ${maxPoleClass.toFixed(4)}° (the SAME pole-class band — a node offset is a pole offset / sin i_inv)`);
if (maxAbsD > 0.1) {
  console.error('\nFAIL — i_inv departs the S&S references beyond the 0.1° representation band; basis or rotation broken.');
  process.exit(1);
}
if (maxPoleClass > 0.1) {
  console.error('\nFAIL — converted nodes depart the S&S references beyond the 0.1° pole-class band; origin derivation or rotation broken.');
  process.exit(1);
}
console.log('\nPASS — the chain speaks the invariable-plane frame within the expected representation band, in BOTH conventions.');
