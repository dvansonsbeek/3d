#!/usr/bin/env node
/**
 * Mercury's perihelion advance in the two coordinates — the complete bookkeeping.
 *
 *   (a) ECLIPTIC LONGITUDE OF DATE  — what Le Verrier / Newcomb / Clemence measured
 *       (positions reduced to apparent geocentric longitude; the rate relative to
 *       the moving equinox):        λ̇ = ϖ̇_sidereal + p_A
 *   (b) RIGHT ASCENSION OF DATE     — what the scene's export measures for its
 *       perihelion marker, and what no observer has published:
 *                                    α̇ = λ̇ · dα/dλ(λ, ε) + ∂α/∂ε(λ, ε) · ε̇
 *
 * The two are the SAME motion in two coordinates. This script converts every
 * quantity both ways and shows the round trip closes: the "missing advance"
 * (observed − model) is the same physical gap in both frames — it is scaled by
 * the slope in (b), it does not disappear. Read-only research one-off (doc 13
 * §1.8, plan IP-mercury-anomaly-projection).
 *
 *   node tools/explore/mercury-perihelion-frames.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const C = require(join(ROOT, 'tools', 'lib', 'constants.js'));
const OE = require(join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
const astro = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'astro-reference.json'), 'utf8'));

const D2R = Math.PI / 180;
const slopeOf = (lamDeg, epsDeg) => { const l = lamDeg * D2R, e = epsDeg * D2R; return Math.cos(e) / (Math.cos(l) ** 2 + Math.sin(l) ** 2 * Math.cos(e) ** 2); };
const dAlphaDepsOf = (lamDeg, epsDeg) => { const l = lamDeg * D2R, e = epsDeg * D2R; return -Math.sin(l) * Math.cos(l) * Math.sin(e) / (Math.cos(l) ** 2 + Math.sin(l) ** 2 * Math.cos(e) ** 2); };

// ── inputs ───────────────────────────────────────────────────────────────────
const lamIAU = C.planets.mercury.longitudePerihelion;                       // 77.457° (IAU J2000)
const lamMarker = lamIAU + C.planets.mercury.angleCorrection;              // 78.43° (the scene marker)
const eps = astro.earthOrbital.obliquityJ2000_deg;                         // IAU 2006
const epsRate = (OE.computeObliquityEarth(2050) - OE.computeObliquityEarth(1950)) * 3600;   // ″/cy, shipped law
const lattice = 1296000 / C.planets.mercury.perihelionEclipticYears * 100;   // 531.44 ″/cy (8H/11)
const pModern = astro.knownValues.generalPrecessionArcsecCy;               // 5,028.8 (IAU 2006 p_A)
const pNewcomb = 5025.645;   // Newcomb's general precession used by Le Verrier→Clemence (Clemence 1947)
const newtonianClassical = 5557.18 - pNewcomb;                             // Clemence's Newtonian subtotal → 531.54
const newtonianModern = astro.knownValues.mercuryPark2017RateArcsecCy - 42.98;   // 575.31 − GR → 532.33 (Park 2017 chain)
const obsClassicalLon = 5599.74;     // Clemence 1947, 1765–1937 longitudes vs the equinox of date (± 0.41)
const obsModernICRF = astro.knownValues.mercuryPark2017RateArcsecCy;       // 575.31 ± 0.0015 (Park 2017)
const leVerrierMeridian = 43.1;      // arXiv:1104.0548 187 meridian equations re-solved here (tools/explore, this session): 43.1 ″/cy from longitudes alone

const f = (v, d = 2) => v.toFixed(d).padStart(10);
console.log('Mercury perihelion advance — the two coordinates (″/cy)');
console.log(`  inputs: lattice ϖ̇ ${lattice.toFixed(2)} (8H/11) · λ_IAU ${lamIAU.toFixed(3)}° · λ_marker ${lamMarker.toFixed(3)}° · ε ${eps.toFixed(5)}° · ε̇ ${epsRate.toFixed(1)} ″/cy · p_A modern ${pModern} / Newcomb ${pNewcomb}`);

function frames(label, sidereal, pA, lamDeg) {
  const lon = sidereal + pA;                                   // (a) longitude of date
  const s = slopeOf(lamDeg, eps), t = dAlphaDepsOf(lamDeg, eps) * epsRate;
  const ra = lon * s + t;                                      // (b) RA of date
  const back = (ra - t) / s;                                   // round trip → must equal lon
  return { label, sidereal, pA, lon, s, t, ra, back };
}
const rows = [
  frames('model lattice, classical p_A', lattice, pNewcomb, lamIAU),
  frames('Newtonian (Clemence masses), classical p_A', newtonianClassical, pNewcomb, lamIAU),
  frames('OBSERVED Clemence 1947 (longitude of date)', obsClassicalLon - pNewcomb, pNewcomb, lamIAU),
  frames('model lattice, modern p_A', lattice, pModern, lamIAU),
  frames('Newtonian (DE-class), modern p_A', newtonianModern, pModern, lamIAU),
  frames('OBSERVED Park 2017 ICRF + modern p_A', obsModernICRF, pModern, lamIAU),
];
console.log('\n  ' + 'quantity'.padEnd(44) + ' sidereal      p_A   (a) λ̇ of date   slope   obliq-term   (b) α̇ of date   round-trip');
for (const r of rows) {
  console.log('  ' + r.label.padEnd(44) + f(r.sidereal) + f(r.pA, 3) + f(r.lon) + f(r.s, 5) + f(r.t) + f(r.ra) + f(r.back));
}
const gapA = rows[2].lon - rows[0].lon, gapB = rows[2].ra - rows[0].ra;
const gapA2 = rows[5].lon - rows[3].lon, gapB2 = rows[5].ra - rows[3].ra;
console.log(`\n  missing advance, classical system:  (a) ${gapA.toFixed(2)} ″/cy   (b) ${gapB.toFixed(2)} ″/cy  = (a) × slope ${(gapA * rows[0].s).toFixed(2)} ✓`);
console.log(`  missing advance, modern system:     (a) ${gapA2.toFixed(2)} ″/cy   (b) ${gapB2.toFixed(2)} ″/cy  = (a) × slope ${(gapA2 * rows[3].s).toFixed(2)} ✓`);
console.log(`  of the modern gap, baseline (Newtonian − lattice) ${(newtonianModern - lattice).toFixed(2)} and relativistic 42.98`);
console.log(`\n  The scene's export measures the RA rate in an equator that co-moves with its stars (no p_A):`);
const sceneS = slopeOf(lamMarker, eps), sceneT = dAlphaDepsOf(lamMarker, eps) * epsRate;
console.log(`    ${lattice.toFixed(2)} × ${sceneS.toFixed(5)} + ${sceneT.toFixed(2)} = ${(lattice * sceneS + sceneT).toFixed(2)} ″/cy (+κ) — the 579.8 of the export; the "+48" above 531.44 is ${(lattice * (sceneS - 1)).toFixed(2)} projection + ${sceneT.toFixed(2)} obliquity rate.`);
console.log(`    Converted back to longitude it is ${lattice.toFixed(2)} again: the projection adds nothing to the longitude rate, in which the anomaly is defined.`);
console.log(`\n  Le Verrier's Paris meridian series 1801–1842, re-solved in longitude alone (187 equations, arXiv:1104.0548): δπ′ = ${leVerrierMeridian} ″/cy.`);
