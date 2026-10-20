#!/usr/bin/env node
/**
 * T1 step 0 — the ENGINE'S OWN frequencies for the L1-comb-vs-beat-model
 * test (holisticuniverse plan 06 §4 T1): the of-date precession rate p at
 * J2000 from createModel, and Earth's z (eccentricity) and ζ (inclination)
 * secular modes from the deep mode table — the same artifact the deep
 * eccentricity channel and the hybrid obliquity read. Written to
 * data/t1-engine-frequencies.json for scripts/t1_beat_model_vs_comb.py.
 *
 *   node tools/explore/t1-export-engine-frequencies.mjs           print
 *   node tools/explore/t1-export-engine-frequencies.mjs --write   write the artifact (inputs-stamped)
 *
 * No Laskar value enters: p is the model's, the modes are the model's.
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { buildInputsBlock } = require(join(ROOT, 'tools/lib/artifact-inputs.js'));
const { createModel } = await import('@essrt/physics');

const MODES_REL = 'data/nbody-deep-secular-modes.json';
const OUT_REL = 'data/t1-engine-frequencies.json';
const SELF_REL = 'tools/explore/t1-export-engine-frequencies.mjs';

const R2A = (180 / Math.PI) * 3600;
// THE SHIPPED CONFIGURATION: the model with the banked secular series (the series-driven hybrid
// the registry, the API and the browser run). A bare createModel() falls back to the 18-term
// mode table, whose ecliptic motion anchors the spin axis 0.18 ″/yr above the general precession
// where the series anchors it 0.097 (≡ IAU's planetary precession ψ_A − p_A) — the g₂-gap trap.
const SERIES_REL = 'data/nbody-secular-series.json';
const m = createModel(undefined, { secularSeriesArtifact: require(join(ROOT, SERIES_REL)) });
const earth = require(join(ROOT, MODES_REL)).modes.earth;
// THE LASKAR IDENTITY OF A MODE (TODO 2026-10-17): the deep table's modes are amplitude-sorted,
// so its own indices are not Laskar's (its "g3−g4" was the 110-kyr line Laskar writes g₃−g₁).
// Every consumer that names a line — the L1 physical-lines export, doc 92, the climate page —
// reads the Laskar identity from here: the nearest Laskar 2004 reference frequency (the ONE
// table, carried by the chain artifact as `laskarReference`) within LASKAR_TOL ″/yr; null when
// no reference mode is that close (the small combination modes), and the consumer then labels
// the mode by its own index with a non-Laskar prefix.
const CHAIN_REL = 'data/nbody-secular-frequencies.json';
const LASKAR = require(join(ROOT, CHAIN_REL)).laskarReference;
if (!LASKAR || !LASKAR.g || !LASKAR.s) throw new Error(`${CHAIN_REL} carries no laskarReference — regenerate it (node tools/verify/nbody-secular.js --write)`);
// ″/yr — the engine's eight leading modes sit within 0.01 of Laskar's (g1…g6, s1…s4, s6, s7); the
// combination modes beside them sit 0.09–0.29 away (measured: at 0.3 three of them took Laskar
// names — 17.09 and 17.64 as "g3", 18.02 as "g4" — and the 96.9/98.8/101.0-kyr lines all read
// "g3−g5"), so the gate is tight: a mode is Laskar's only when it is Laskar's.
const LASKAR_TOL = 0.05;
/** @param {number} f ″/yr @param {Record<string, number>} table @returns {string|null} */
const laskarOf = (f, table) => {
  let best = null, bestD = Infinity;
  for (const [name, ref] of Object.entries(table)) { const d = Math.abs(f - ref); if (d < bestD) { bestD = d; best = name; } }
  return bestD <= LASKAR_TOL ? best : null;
};
/** @param {{omegaRadPerYr: number, re: number, im: number}} x @param {Record<string, number>} table */
const line = (x, table) => {
  const f = x.omegaRadPerYr * R2A;
  return { arcsecPerYr: f, amp: Math.hypot(x.re, x.im), laskar: laskarOf(f, table) };
};
const z = earth.z.map((x) => line(x, LASKAR.g));
// the zero-frequency ζ mode is the constant offset to the invariable plane — no obliquity line
const zeta = earth.zeta.map((x) => line(x, LASKAR.s)).filter((x) => Math.abs(x.arcsecPerYr) > 1e-6);
const Tp = m.epoch.axialPrecessionYearsAtYear(2000);
const TpInertial = m.lunisolar.spinAxisInertialPeriodYearsJ2000;
// THE RECORD WINDOW the obliquity lines are derived over: the LR04 stack's span (its last age row),
// the ONE home of the window — a line is derived over the window its rows are used in (CLAUDE.md).
// The realized pole rate over that window (the inertial rate of date with its three of-date factors,
// createModel().lunisolar.spinAxisInertialRateMeanArcsecPerYr) is what the record's obliquity lines
// carry: measured 2026-10 on the model's own ε(t) and on La2004 (40,938 / 40,917 yr over 5 Myr against
// the J2000 beat's 41,098) and on the records themselves (the clock test's +0.12…+0.20 ″/yr).
const LR04_REL = 'data/lr04-stack.txt';
const lr04LastAgeKyr = readFileSync(join(ROOT, LR04_REL), 'utf8').trim().split('\n')
  .map((l) => Number(l.trim().split(/\s+/)[0])).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
const lr04WindowYears = [2000 - lr04LastAgeKyr * 1000, 2000];
// On the ORBITAL FORCING ALONE: a second model built without the J₂(t)/J₂₀ factor of date (the
// ice-driven GIA channel, which rides the climate formula's own post-MPT layer). With that factor in,
// the lines would depend on their own fit through both the rate and the integrated ε(t) — a loop the
// freshness gate cannot close (measured across one refit: 1.4e-3 ″/yr in the factor's mean, 1.8e-3 in
// ⟨cos ε⟩). The forcing lines must not contain the climate response; the published realized period
// (the registry, the hybrid verdict's gate) keeps the full physics, 2–3 yr of period apart.
const mForcing = createModel(undefined, { secularSeriesArtifact: require(join(ROOT, SERIES_REL)), giaEllipticityOfDate: false });
const pInertialMeanLr04 = mForcing.lunisolar.spinAxisInertialRateMeanArcsecPerYr(lr04WindowYears[0], lr04WindowYears[1]);

const out = {
  _description: 'T1 inputs — the engine’s own precession rates and Earth’s z / ζ secular modes (deep mode table). p = the general precession in longitude (the of-date precession beat at J2000, createModel().epoch.axialPrecessionYearsAtYear): the equinox along the ecliptic of date, the rate the climatic-precession lines p + g_i carry. pInertial = the spin axis’s inertial precession rate at J2000 (createModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000, the self-anchored rate the hybrid obliquity integrates on: p plus the planetary mean). pInertialMeanLr04 = the REALIZED pole rate over the LR04 record window (createModel().lunisolar.spinAxisInertialRateMeanArcsecPerYr over lr04WindowKyr with ellipticity:false — the inertial rate of date × solar torque at e(t) × cos ε(t)/cos ε₀, averaged; the ice-driven J₂(t)/J₂₀ factor is left out because it rides the climate formula’s own fit, 3e-5 of the rate): the rate the obliquity lines pInertialMeanLr04 + s_i carry — a record sees the window mean, not the J2000 instant. Consumed by scripts/l1_physical_lines.py and scripts/t1_beat_model_vs_comb.py.',
  pArcsecPerYr: 1296000 / Tp,
  precessionPeriodYr: Tp,
  pInertialArcsecPerYr: 1296000 / TpInertial,
  inertialPrecessionPeriodYr: TpInertial,
  pInertialMeanLr04ArcsecPerYr: pInertialMeanLr04,
  inertialPrecessionPeriodMeanLr04Yr: 1296000 / pInertialMeanLr04,
  lr04WindowKyr: [0, lr04LastAgeKyr],
  z,
  zeta,
  inputs: buildInputsBlock(`node ${SELF_REL} --write`, [MODES_REL, SERIES_REL, LR04_REL, CHAIN_REL, SELF_REL]),   // (plan 11 step 6: model-parameters.json is deleted)
};

console.log(`p = ${out.pArcsecPerYr.toFixed(4)} ″/yr (T_p = ${Tp.toFixed(2)} yr) · pInertial = ${out.pInertialArcsecPerYr.toFixed(4)} ″/yr (${TpInertial.toFixed(2)} yr) · pInertialMeanLr04 = ${pInertialMeanLr04.toFixed(4)} ″/yr over 0–${lr04LastAgeKyr} kyr · ${z.length} z modes · ${zeta.length} ζ modes`);
if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, OUT_REL), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`wrote ${OUT_REL}`);
}
