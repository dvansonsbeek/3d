#!/usr/bin/env node
// P5/K4 — THE OBSERVATIONAL VERDICT: both renderings of the planets — the
// shipped geometric chains (fitted geometry + observation-fitted corrections)
// and the engine-D Keplerian flag path (raw dynamics, zero fitted terms) —
// measured against the SAME external reference (the JPL Horizons cache),
// using the SAME conventions as tools/verify/measure-rms-by-epoch.js
// (cache = J2000/ICRF degrees → j2000ToOfDate → the scene's of-date frame).
//
// Published either way it falls (plan 02 §P5 K2 doctrine): agreement and
// divergence are both model content. The verdict informs — never tunes —
// the flag path.
//
// RESULT (measured; RMS ″ vs JPL, shipped → keplerian, ratio):
//   1800–2100: mercury 202→132 (0.65) · venus 116→96 (0.83) · mars 221→124
//     (0.56) · jupiter 167→318 (1.9) · saturn 210→966 (4.6) · uranus
//     57→1137 (20) · neptune 12.5→1503 (120)
//   1600–1800: the inner-planet advantage GROWS outside the fitters' window
//     (mercury 0.66 · venus 0.73 · mars 0.53); giants 1.4–38×.
//   READING: the RAW engine rendering — zero fitted terms — BEATS the
//   shipped fitted chains for Mercury/Venus/Mars, and the gap widens where
//   the fits extrapolate. The giants lose by exactly the B2 periodic budget
//   (GI + U–N long inequality). CONSEQUENCE: K4.5 — the giants' medium-
//   period terms DERIVED from our own engine runs (the DST-1/DLT-1
//   pattern) are REQUIRED before any default flip; the inner planets are
//   ship-ready as-is.
// K4.5b ACCEPTANCE (completed skeleton + derived terms + window affine;
//   shipped → keplerian+derived, ratio best/old):
//   1800–2100: mercury 202→128 (0.63) · venus 116→82 (0.71) · mars 221→112
//     (0.51) · jupiter 167→68 (0.41 ✓ from 319 raw) · saturn 210→269
//     (1.28 — from 972; nearly) · uranus 57→838 (14.7 ✗) · neptune
//     12.5→649 (51.9 ✗)
//   1600–1800: jupiter 0.07 · saturn 0.30 — the derived path CRUSHES the
//     shipped fits where they extrapolate; mars 0.36 · venus 0.57.
//   REMAINING (K4.5c): Uranus/Neptune need (a) the out-of-plane channel —
//   δζ = sin(i/2)·e^{iΩ} terms, never yet extracted; (b) a ±10-kyr
//   extraction span to resolve the 4.3-kyr U−N multiplet; (c) more z terms.
//   Their shipped in-window fits (57″/12.5″) are heavily tuned — the
//   out-of-window ratios already narrow to 1.8×/15×.
// K4.7b ACCEPTANCE (multi-mode secular skeleton + element-COMPLETE periodic
//   layer: λ̄/a/z/ζ, extraction-seeded era solve with golden-refined
//   augmentation — see k45e header; shipped → keplerian+derived, ratio):
//   1800–2100: mercury 202→115 (0.57) · venus 116→82 (0.71) · mars 221→90
//     (0.41) · jupiter 167→63 (0.38) · saturn 210→111 (0.53) · uranus
//     57→52.5 (0.92) · neptune 12.5→31.7 (2.5 — the one cell above shipped;
//     the shipped 12.5″ is itself an ephemeris-era fit)
//   1600–1800: the chain beats the shipped path for ALL SEVEN planets —
//     jupiter 0.07 · saturn 0.11 · uranus 0.11 · mars 0.27 · venus 0.52 ·
//     mercury 0.60 · neptune 0.69.
//   REMAINING vs the k46 physics floors (J 3.7/S 2.0/U 1.1/N 0.6″): the
//   ~50–110″ gap decomposes into Saturn's unresolved z multiplet (348µ) and
//   a window-flat systematic class (Uranus 52.5″ both windows) — frame/
//   light-time/skeleton-vs-JPL content, NOT era misfit; the skeleton part is
//   published model difference (K2 doctrine), never tuned away.
// K4.6b ACCEPTANCE (the error ladder k46b + scene-share probe k46c found
//   TWO observation-fitted correction blocks riding the raw path unguarded
//   — GRAVITATION_CORRECTION and ELONGATION_CORRECTION double-counting the
//   chain's own derived layer; guarded, flag-off proven inert by the
//   eclipse-audit bit-reproduction):
//   1800–2100: mercury 202→114 (0.56) · venus 116→81 (0.70) · mars 221→35.5
//     (0.16) · jupiter 167→18.5 (0.11) · saturn 210→20.4 (0.10) · uranus
//     57→21.1 (0.37) · neptune 12.5→18.9 (1.51 — the one cell above shipped)
//   1600–1800: mars 0.13 · jupiter 0.02 · saturn 0.03 · uranus 0.04 ·
//     neptune 0.38 · venus 0.52 · mercury 0.60.
//   The giants sit AT rung B of the ladder (chain|JPL through a clean
//   pipeline, 12–18″): remaining budget = element misfit (D 12–18″) ⊕ the
//   ~13″ scene-readout-vs-j2000ToOfDate convention class ⊕ the floor
//   (0.7–3.7″). Mercury/Venus read at the k46 dt=2 d readout floor — the
//   open K4.6b tail is dt-convergence of the floor instrument, not chain
//   content.
//
//   node tools/explore/k4-observational-verdict.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const SG = require(ROOT + 'tools/lib/scene-graph.js');
const { j2000ToOfDate } = require(ROOT + 'tools/lib/precession.js');
const fs = require('node:fs');

const cache = JSON.parse(fs.readFileSync(ROOT + 'data/jpl-cache.json', 'utf8'));
const TARGETS = { 199: 'mercury', 299: 'venus', 499: 'mars', 599: 'jupiter', 699: 'saturn', 799: 'uranus', 899: 'neptune' };
const D2R = Math.PI / 180;

// epochs per planet, windowed + strided for runtime
function epochsFor(naif, jdLo, jdHi, maxN) {
  const jds = Object.keys(cache).filter((k) => k.startsWith(naif + '_')).map((k) => parseFloat(k.slice(String(naif).length + 1)))
    .filter((jd) => jd >= jdLo && jd <= jdHi).sort((a, b) => a - b);
  const stride = Math.max(1, Math.ceil(jds.length / maxN));
  return jds.filter((_, i) => i % stride === 0);
}

function sepArcsec(ra1, dec1, ra2, dec2) {   // degrees in
  const v = (ra, dec) => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
  const a = v(ra1, dec1), b = v(ra2, dec2);
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D2R * 3600;
}

function measure(flagOn, windows) {
  SG._setKeplerChains(flagOn);
  const out = {};
  for (const [naif, planet] of Object.entries(TARGETS)) {
    out[planet] = {};
    for (const [label, [lo, hi]] of Object.entries(windows)) {
      const jds = epochsFor(naif, lo, hi, 700);
      let s2 = 0, n = 0;
      for (const jd of jds) {
        const ref = cache[`${naif}_${jd}`];
        const od = j2000ToOfDate(ref.ra, ref.dec, jd);          // JPL → of-date (the established convention)
        const m = SG.computePlanetPosition(planet, jd);
        const d = sepArcsec(SG.thetaToRaDeg(m.ra), SG.phiToDecDeg(m.dec), od.ra, od.dec);
        s2 += d * d; n++;
      }
      out[planet][label] = { rms: Math.sqrt(s2 / n), n };
    }
  }
  SG._setKeplerChains(false);
  return out;
}

const JD0 = 2451545.0;
const windows = {
  '1800-2100': [JD0 - 200 * 365.25, JD0 + 100 * 365.25],
  '1600-1800': [JD0 - 400 * 365.25, JD0 - 200 * 365.25],
};

console.log('measuring shipped path…');
const oldR = measure(false, windows);

// The skeleton column: the builder attaches the artifact's periodic terms by
// default (they are BANKED in the governed artifact since K4.6b), so the
// bare-skeleton measurement now injects skeletonOnly chains explicitly.
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
console.log('measuring Keplerian flag path (skeleton)…');
SG._injectKeplerChains(KC.buildPlanetChainsFromArtifact({ skeletonOnly: true }));
const newR = measure(true, windows);

// The +derived column IS the runtime path: no injection — the scene builds
// its chains from the governed artifact (terms included) itself.
SG._injectKeplerChains(null);
let termR = null;
if (KC.loadEngineDArtifact().periodicTerms) {
  console.log('measuring Keplerian + derived terms…');
  termR = measure(true, windows);
}

for (const label of Object.keys(windows)) {
  console.log(`\n=== ${label} — RMS ″ vs JPL (n per planet) ===`);
  console.log('planet    shipped      keplerian' + (termR ? '    +derived' : '') + '    ratio best/old');
  for (const p of Object.values(TARGETS)) {
    const o = oldR[p][label], k = newR[p][label], d = termR?.[p]?.[label];
    const best = d ? Math.min(k.rms, d.rms) : k.rms;
    console.log(`  ${p.padEnd(8)} ${o.rms.toFixed(1).padStart(8)} ${k.rms.toFixed(1).padStart(12)}${d ? ' ' + d.rms.toFixed(1).padStart(10) : ''} ${(best / o.rms).toFixed(2).padStart(10)}   (n=${o.n})`);
  }
}
console.log('\n(Verdict published either way — the flag path is never tuned to this table.)');
