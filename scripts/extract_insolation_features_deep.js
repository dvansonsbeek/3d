#!/usr/bin/env node
/**
 * Extract DEEP-SOURCE insolation-relevant orbital features at LR04 sample
 * times — Stage C-2 (plan 02 §8): the coherent deep-source feature set,
 * published BESIDE the H/3-law record (data/insolation-features.csv and its
 * l1N24/insolStab verdicts stay untouched — they test the LAW by design).
 *
 * ONE source family, via tools/lib/deep-orbital-history.js (the shared
 * evaluator):
 *   - ε(t): the Stage-C obliquity hybrid (deep ζ-modes + the H/13-anchored
 *     precession constant; doc 109 §18)
 *   - e(t), ϖ: the deep z-modes (the ±10-Myr table, doc 109 §17)
 *   - climatic precession e·sin ϖ̃: the PHYSICAL of-date angle from the
 *     hybrid's moving equinox γ = unit(ŝ×n̂) to the perihelion direction —
 *     no linear-precession approximation at any epoch
 *   - inclination: the deep ζ-modes (ecliptic-J2000 frame)
 *
 * Outputs CSV: data/insolation-features-deep.csv (same column layout as the
 * law CSV; incl_anom is centred on THIS series' own mean, printed below).
 *
 * MEASURED CAVEAT (banked in the plan's Stage-C record): the deep z-table's
 * LOCAL apsidal rate at J2000 reads ~7.8 ″/yr vs the true 11.6 (the same
 * era-tier local-distortion class as e's slope), so the of-date rate runs
 * ~58.1 vs 61.9 ″/yr near the present and the climatic-precession pair is
 * law-class in the recent window (1.2e-3 rms vs La2004 over 0–13 kyr;
 * 3.45e-3 over 0–50 kyr) and phase-rough beyond — while the e and ε columns
 * carry the real deep-band content the law cannot (405-kyr class e; the
 * hybrid's flat ~0.1° ε). The instruments measure what they measure;
 * nothing is tuned.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createDeepOrbitalHistory } = require('../tools/lib/deep-orbital-history.js');

const LR04_PATH = path.join(__dirname, '..', 'data', 'lr04-stack.txt');
const OUT_PATH = path.join(__dirname, '..', 'data', 'insolation-features-deep.csv');

function loadLr04Ages() {
  const txt = fs.readFileSync(LR04_PATH, 'utf8');
  const ages = [];
  for (const line of txt.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const a = parseFloat(parts[0]);
    if (!Number.isFinite(a)) continue;
    ages.push(a);
  }
  return ages;
}

const T0_CE = 1950.0;   // LR04 age convention (t=0 at 1950 CE)

function main() {
  const ages = loadLr04Ages();
  console.log(`Loaded ${ages.length} LR04 sample ages (${ages[0]}..${ages[ages.length - 1]} kyr BP)`);

  const H = createDeepOrbitalHistory();
  const maxAge = ages[ages.length - 1];
  console.log(`integrating the hybrid once over 0..−${maxAge} kyr …`);
  // D1 stepping contract: deep builds need 250-aligned grids (the factory
  // integrates at 250-yr steps beyond ±50 kyr and throws on misaligned
  // grids). 250 yr still oversamples the CSV's kyr-scale consumers.
  const S = H.build(0, -(maxAge * 1000 + 2000), 250);

  // first pass: collect for the inclination mean (incl_anom centres on the
  // deep series' own mean — the law CSV centres on the law's 1.48128)
  const samples = ages.map((age) => {
    const yr = T0_CE - age * 1000.0;
    return { age, yr, s: S.at(yr - 2000) };
  });
  const inclMean = samples.reduce((a, r) => a + r.s.inclEclDeg, 0) / samples.length;

  const rows = ['year_ce,age_kyr_BP,obliquity_deg,eccentricity,perihelion_deg,e_sin_peri,e_cos_peri,eps_anom,e_squared,inclination_deg,incl_anom'];
  for (const { age, yr, s } of samples) {
    rows.push([
      yr.toFixed(4), age, s.epsDeg, s.e, s.periOfDateDeg,
      s.eSinPeri, s.eCosPeri, s.epsDeg - 23.45, s.e * s.e,
      s.inclEclDeg, s.inclEclDeg - inclMean,
    ].map((v) => (typeof v === 'number' ? v.toString() : v)).join(','));
  }
  fs.writeFileSync(OUT_PATH, rows.join('\n') + '\n');
  console.log(`Wrote ${rows.length - 1} rows to ${OUT_PATH}`);
  console.log(`incl_anom centred on the deep series mean ${inclMean.toFixed(5)}°`);

  // sanity: ranges over the span
  const es = samples.map((r) => r.s.e), eps = samples.map((r) => r.s.epsDeg);
  console.log(`e range [${Math.min(...es).toFixed(5)}, ${Math.max(...es).toFixed(5)}] · eps range [${Math.min(...eps).toFixed(3)}, ${Math.max(...eps).toFixed(3)}]°`);
}

main();
