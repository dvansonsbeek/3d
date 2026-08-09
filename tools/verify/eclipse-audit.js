#!/usr/bin/env node
/**
 * ECLIPSE-AUDIT GENERATOR (§12h follow-up item 2 — partial adoption)
 * ==================================================================
 *
 * Owns the `lunar` and `solar` sections of `data/eclipse-audit-summary.json`:
 * Node port of the browser L-5b (lunar, 270-event button) and L-7 (solar,
 * 89-event button) SECTION 1 primary-source comparisons, verified to
 * reproduce the recorded campaign numbers before taking ownership.
 *
 * Method (script.js L-5b/L-7 Section 1 verbatim):
 *   1. Stephenson 2016 primary observations from the tracked
 *      `public/input/lunar-eclipses-stephenson-2016.json` (270 entries, 267
 *      with dt_observed_sec — the 3 S04 bounds-only rows are skipped) and
 *      `solar-eclipses-stephenson-2016.json` (89 entries).
 *   2. NASA ΔT(year) = per-calendar-year average of `delta_T_sec` over the
 *      Five Millennium Lunar Canon (`lunar-eclipses-nasa.json`, 12,064
 *      entries) — the Espenak/Meeus polynomial sampled at its own events.
 *   3. Framework ΔT = meanDeltaTSecondsAtAge((2000 − year)/1e6) from
 *      tools/lib/deep-time.js — the joint world (pure-tidal Simpson
 *      integral + 4-flag H-lattice stack + Core-mantle swing), the same
 *      chain the browser buttons call.
 *   4. Mean |residual| vs observation per model + events where the
 *      framework lands closer than NASA.
 *
 * The `audit26` and `babylon135` sections need the scene-umbra geography
 * chain (browser `umbraFromSceneAtJd` — analytic sphere-piercing on scene
 * world positions + Earth's world quaternion, which the finders package
 * deliberately excludes, §2h). Until that chain has a proven Node twin,
 * this generator PRESERVES those sections verbatim as the hand-recorded
 * snapshots they are (marked so in their `_description`s).
 *
 *   node tools/verify/eclipse-audit.js            # compute + compare
 *   node tools/verify/eclipse-audit.js --write    # + write artifact
 */

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const DT = require('../lib/deep-time');

const OUT = path.join(ROOT, 'data', 'eclipse-audit-summary.json');
const WRITE = process.argv.includes('--write');

const INPUT_FILES = [
  'tools/verify/eclipse-audit.js',
  'public/input/lunar-eclipses-stephenson-2016.json',
  'public/input/solar-eclipses-stephenson-2016.json',
  'public/input/lunar-eclipses-nasa.json',
  'data/deltaT-4flag-fit.json',
  'data/core-mantle-resonator-stage1.json',
  'packages/physics/src/deltat/cycles.cjs',
];

function rd(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

// NASA ΔT(year) lookup: per-calendar-year average over the Lunar Canon
// (browser L-5b/L-7 verbatim, including the leading-integer date parse).
function buildNasaDtByYear(canon) {
  const acc = new Map();
  for (const e of canon.entries) {
    const m = /^(-?\d+)/.exec(e.date);
    if (!m) continue;
    const y = parseInt(m[1], 10);
    const a = acc.get(y) || { sum: 0, n: 0 };
    a.sum += e.delta_T_sec; a.n += 1;
    acc.set(y, a);
  }
  const out = new Map();
  for (const [y, a] of acc) out.set(y, a.sum / a.n);
  return out;
}

/** Browser Section-1 comparison for one Stephenson dataset. */
function compare(steph, nasaDtByYear) {
  const records = [];
  for (const obs of steph.entries) {
    if (obs.dt_observed_sec == null) continue;   // S04 bounds-only rows
    const nasa_dt = nasaDtByYear.get(obs.year);
    if (nasa_dt == null) continue;
    const model_dt = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
    records.push({
      res_model: obs.dt_observed_sec - model_dt,
      res_nasa: obs.dt_observed_sec - nasa_dt,
    });
  }
  const meanAbsModel = records.reduce((s, r) => s + Math.abs(r.res_model), 0) / records.length;
  const meanAbsNasa = records.reduce((s, r) => s + Math.abs(r.res_nasa), 0) / records.length;
  const closer = records.filter((r) => Math.abs(r.res_model) < Math.abs(r.res_nasa)).length;
  return {
    frameworkMeanAbsResidualSeconds: Math.round(meanAbsModel),
    frameworkMeanAbsResidualSecondsFull: meanAbsModel,
    nasaMeanAbsResidualSeconds: Math.round(meanAbsNasa),
    nasaMeanAbsResidualSecondsFull: meanAbsNasa,
    eventsBeatingNasa: closer,
    eventsTotal: records.length,
    eventsRawTotal: steph.entries.length,
  };
}

const canon = rd('public/input/lunar-eclipses-nasa.json');
const nasaDtByYear = buildNasaDtByYear(canon);
const lunar = compare(rd('public/input/lunar-eclipses-stephenson-2016.json'), nasaDtByYear);
const solar = compare(rd('public/input/solar-eclipses-stephenson-2016.json'), nasaDtByYear);
delete solar.eventsRawTotal;   // the recorded solar section has no raw-total key (89 = 89)

console.log('  L-5b lunar: framework %d s | NASA %d s | beating NASA %d/%d (raw %d)',
  lunar.frameworkMeanAbsResidualSeconds, lunar.nasaMeanAbsResidualSeconds,
  lunar.eventsBeatingNasa, lunar.eventsTotal, lunar.eventsRawTotal);
console.log('  L-7  solar: framework %d s | NASA %d s | beating NASA %d/%d',
  solar.frameworkMeanAbsResidualSeconds, solar.nasaMeanAbsResidualSeconds,
  solar.eventsBeatingNasa, solar.eventsTotal);

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
if (!prev) throw new Error('data/eclipse-audit-summary.json missing — nothing to compare against');
let diverged = 0;
for (const [section, computed] of [['lunar', lunar], ['solar', solar]]) {
  for (const [k, was] of Object.entries(prev[section])) {
    if (typeof was !== 'number') continue;
    const now = computed[k];
    const same = now === was;
    if (!same) diverged++;
    console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} ${section}.${k}: recorded ${was}, computed ${now}`);
  }
}

const artifact = {
  _description:
    'Historical eclipse audit summary. The `lunar` and `solar` sections are ' +
    'GENERATED by tools/verify/eclipse-audit.js --write (Node port of the ' +
    'browser L-5b/L-7 Section-1 primary-source comparisons, verified to ' +
    'reproduce the recorded campaign numbers before taking ownership): mean ' +
    '|residual| in seconds of framework vs NASA Espenak/Meeus deltaT against ' +
    'the Stephenson 2016 primary observations (lunar: Babylonian/Greek/' +
    'Chinese/Arab, -720 to 1280 CE; solar: 89 events), under the joint world ' +
    '(4-flag stack + Core-mantle swing). NASA deltaT is fit to essentially ' +
    'this dataset, so per-event NASA residuals index fit quality against a ' +
    'smoothed representation, not physical validity; authoritative writeup ' +
    'docs/102-gia-alpha-lunar-validation.md. Consumed by the model-values ' +
    'registry (eclipse-audit keys); the framework-vs-NASA gap keys are ' +
    'DERIVED from these so a re-run flows through automatically. The audit26 ' +
    'and babylon135 sections remain hand-recorded snapshots (marked in their ' +
    'own _descriptions) until the scene-umbra geography chain has a proven ' +
    'Node twin — see the §12h follow-up items in the plan. The inputs block ' +
    'is verified by the artifact-freshness gate on every npm run check.',
  lunar,
  solar,
  audit26: prev.audit26,
  babylon135: prev.babylon135,
  inputs: buildInputsBlock('node tools/verify/eclipse-audit.js --write', INPUT_FILES),
};

if (WRITE) {
  if (diverged) {
    console.log('\nREFUSING to write: computed values diverge from the recorded snapshot.');
    console.log('Investigate before letting the generator take ownership (exact-reproduction rule).');
    process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`\n  ✓ wrote ${path.relative(ROOT, OUT)} (audit26/babylon135 preserved verbatim)`);
} else {
  console.log('\n  dry run — pass --write to update the artifact');
}
