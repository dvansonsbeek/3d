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
const m = createModel();
const earth = require(join(ROOT, MODES_REL)).modes.earth;
/** @param {{omegaRadPerYr: number, re: number, im: number}} x */
const line = (x) => ({ arcsecPerYr: x.omegaRadPerYr * R2A, amp: Math.hypot(x.re, x.im) });
const z = earth.z.map(line);
// the zero-frequency ζ mode is the constant offset to the invariable plane — no obliquity line
const zeta = earth.zeta.map(line).filter((x) => Math.abs(x.arcsecPerYr) > 1e-6);
const Tp = m.epoch.axialPrecessionYearsAtYear(2000);

const out = {
  _description: 'T1 inputs — the engine’s own p (of-date precession beat at J2000, createModel().epoch.axialPrecessionYearsAtYear) and Earth’s z / ζ secular modes (deep mode table). Consumed by scripts/t1_beat_model_vs_comb.py, which builds the Berger/Laskar-style beat lines |g_i − g_j|, p + s_i, p + g_i from them.',
  pArcsecPerYr: 1296000 / Tp,
  precessionPeriodYr: Tp,
  z,
  zeta,
  inputs: buildInputsBlock(`node ${SELF_REL} --write`, [MODES_REL, 'public/input/model-parameters.json', SELF_REL]),
};

console.log(`p = ${out.pArcsecPerYr.toFixed(4)} ″/yr (T_p = ${Tp.toFixed(2)} yr) · ${z.length} z modes · ${zeta.length} ζ modes`);
if (process.argv.includes('--write')) {
  writeFileSync(join(ROOT, OUT_REL), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`wrote ${OUT_REL}`);
}
