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
import { writeFileSync } from 'node:fs';
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
/** @param {{omegaRadPerYr: number, re: number, im: number}} x */
const line = (x) => ({ arcsecPerYr: x.omegaRadPerYr * R2A, amp: Math.hypot(x.re, x.im) });
const z = earth.z.map(line);
// the zero-frequency ζ mode is the constant offset to the invariable plane — no obliquity line
const zeta = earth.zeta.map(line).filter((x) => Math.abs(x.arcsecPerYr) > 1e-6);
const Tp = m.epoch.axialPrecessionYearsAtYear(2000);
const TpInertial = m.lunisolar.spinAxisInertialPeriodYearsJ2000;

const out = {
  _description: 'T1 inputs — the engine’s own two J2000 precession rates and Earth’s z / ζ secular modes (deep mode table). p = the general precession in longitude (the of-date precession beat at J2000, createModel().epoch.axialPrecessionYearsAtYear): the equinox along the ecliptic of date, the rate the climatic-precession lines p + g_i carry. pInertial = the spin axis’s inertial precession rate (createModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000, the self-anchored rate the hybrid obliquity integrates on: p plus the planetary mean): the rate the obliquity lines pInertial + s_i carry. Consumed by scripts/l1_physical_lines.py and scripts/t1_beat_model_vs_comb.py.',
  pArcsecPerYr: 1296000 / Tp,
  precessionPeriodYr: Tp,
  pInertialArcsecPerYr: 1296000 / TpInertial,
  inertialPrecessionPeriodYr: TpInertial,
  z,
  zeta,
  inputs: buildInputsBlock(`node ${SELF_REL} --write`, [MODES_REL, SERIES_REL, 'public/input/model-parameters.json', SELF_REL]),
};

console.log(`p = ${out.pArcsecPerYr.toFixed(4)} ″/yr (T_p = ${Tp.toFixed(2)} yr) · pInertial = ${out.pInertialArcsecPerYr.toFixed(4)} ″/yr (${TpInertial.toFixed(2)} yr) · ${z.length} z modes · ${zeta.length} ζ modes`);
if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, OUT_REL), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`wrote ${OUT_REL}`);
}
