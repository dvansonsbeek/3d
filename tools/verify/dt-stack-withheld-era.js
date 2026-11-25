#!/usr/bin/env node
/**
 * THE ΔT STACK'S WITHHELD-ERA LADDER — generator (plan 38 §7.1)
 * ==============================================================
 *
 * Owns `data/dt-stack-withheld-era.json`: the out-of-sample test of the
 * millennial ΔT stack, recorded from the fitter itself instead of typed.
 *
 * The question the record answers: trained on the post-CE part of the
 * Stephenson 2016 residual alone (0..2017, the fitter's own grid), how well does
 * each configuration of the stack predict the withheld BCE era (−720..−10, the
 * 72 samples the fit never saw)? The fitter already carries the instrument —
 * its DT_FIT_WINDOW cross-validation hook scores a sub-window solution on the
 * complement of its training window and prints the held-out RMS of the fitted
 * stack beside two baselines: the intercept alone (the trend anchor and nothing
 * else — "the baseline that matters") and no correction at all. DT_FLAGS and
 * DT_RESONATOR_COMPONENTS restrict the design matrix to a subset. This script
 * runs that instrument over a LADDER of configurations and records what it
 * prints; nothing is computed here that the fitter does not compute.
 *
 * Why a record: the website quoted a withheld-era result (85 s against 94–307 s
 * for every reduced set, 223 s with no correction) that no artifact, script or
 * document in either repository produced, and that the current model does not
 * reproduce. A number on a page is not a source; this artifact is.
 *
 * The ladder (one fitter run each, ~1 s):
 *   swing columns  : the shipped two kicks (kick1, kick2) · none (the four
 *                    harmonics alone)
 *   flag sets      : all four · the four leave-one-out triples · the nested
 *                    cascade (bond · bond+hallstatt · bond+hallstatt+jose5)
 *
 * The fitter is NOT edited (it is a token-hashed input of the governed ΔT fit;
 * an edit there is a by-hand re-close). Its stdout is the interface: the BEST
 * line, the amplitudes block and the HELD-OUT block, parsed by fixed labels.
 *
 *   node tools/verify/dt-stack-withheld-era.js            # compute + compare with the record (exit 1 on divergence)
 *   node tools/verify/dt-stack-withheld-era.js --write    # + write the artifact
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const OUT = path.join(ROOT, 'data', 'dt-stack-withheld-era.json');
const WRITE = process.argv.includes('--write');
const FITTER = 'packages/fitting/src/dt-corrections-fit.cjs';

// The training window: the post-CE record. The fitter's full grid is −720..2017
// step 10, so the held-out complement is −720..−10 (72 samples).
const TRAIN = { year_start: 0, year_end: 2017, step_yr: 10 };

// Inputs: this script, the fitter whose instrument this is, the record it fits, and the
// pure-tidal chain the residual is taken against — the same physics the governed fit
// declares (data/deltaT-4flag-fit.json `inputs`), so this artifact goes stale exactly
// when that fit does and the cascade regenerates it in a minute.
const INPUT_FILES = [
  'tools/verify/dt-stack-withheld-era.js',
  FITTER,
  'public/input/stephenson-2016-deltaT-polynomial.json',
  'data/core-mantle-resonator-stage1.json',
  'data/astrogeo22-earth-moon.json',
  'data/deep-time-fitted.json',
  'packages/physics/src/climate/l1-orbital.cjs',
  'packages/physics/src/constants/units.cjs',
  'packages/physics/src/deltat/cycles.cjs',
  'packages/physics/src/deltat/deep-time-chain.js',
  'packages/physics/src/deltat/deep-time.cjs',
  'packages/physics/src/deltat/moon-distance-history.cjs',
  'packages/physics/src/earth/laplace-plane.cjs',
  'packages/physics/src/earth/mean-obliquity-history.cjs',
  'packages/physics/src/earth/precession-composed.cjs',
  'packages/physics/src/time/calendar.cjs',
  'public/input/astro-reference.json',
  'public/input/climate-formula-coefficients.json',
  'tools/lib/constants.js',
  'tools/lib/deep-time.js',
];

const FLAG_SETS = [
  { id: 'all_four', flags: ['bond', 'hallstatt', 'jose5', 'jose4'], kind: 'full' },
  { id: 'without_bond', flags: ['hallstatt', 'jose5', 'jose4'], kind: 'leave_one_out' },
  { id: 'without_hallstatt', flags: ['bond', 'jose5', 'jose4'], kind: 'leave_one_out' },
  { id: 'without_jose5', flags: ['bond', 'hallstatt', 'jose4'], kind: 'leave_one_out' },
  { id: 'without_jose4', flags: ['bond', 'hallstatt', 'jose5'], kind: 'leave_one_out' },
  { id: 'bond_only', flags: ['bond'], kind: 'nested' },
  { id: 'bond_hallstatt', flags: ['bond', 'hallstatt'], kind: 'nested' },
  { id: 'bond_hallstatt_jose5', flags: ['bond', 'hallstatt', 'jose5'], kind: 'nested' },
];
const SWINGS = [
  { id: 'shipped_kicks', components: ['kick1', 'kick2'] },
  { id: 'no_swing', components: [] },
];

const num = (s) => Number(String(s).replace('−', '-'));

/** One fitter run; the printed BEST / amplitudes blocks parsed, and the HELD-OUT block where a training
 *  window is given (`train` null = the fitter's own full window −720..2017, in-sample only). */
function runFitter(flags, components, train = TRAIN) {
  const env = {
    ...process.env,
    DT_CORRECTIONS_DISABLED: '1',
    DT_FLAGS: flags.join(','),
    DT_RESONATOR_COMPONENTS: components.join(','),
  };
  if (train) env.DT_FIT_WINDOW = `${train.year_start}:${train.year_end}:${train.step_yr}`;
  else delete env.DT_FIT_WINDOW;
  const r = spawnSync(process.execPath, [path.join(ROOT, FITTER), '--joint'], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`fitter exited ${r.status} for flags=${flags} swing=${components}:\n${r.stderr || r.stdout}`);
  const out = r.stdout;
  const grab = (re, what) => {
    const m = out.match(re);
    if (!m) throw new Error(`fitter output lacks ${what} (flags=${flags}, swing=${components})`);
    return m;
  };
  const best = grab(/BEST: USNO ([\d.]+)\s+deltaTStart ([-−\d.]+) s\s+Espenak RMS ([\d.]+) s\s+full ([\d.]+) s/, 'the BEST line');
  let heldOut = null;
  if (train) {
    const held = grab(/test years ([-−\d]+)\.\.([-−\d]+)\s+\(n = (\d+)/, 'the held-out window');
    const fitted = grab(/fitted stack\s+RMS\s+([\d.]+) s\s+R²\s+([-−+\d.]+)/, 'the fitted-stack held-out RMS');
    const intercept = grab(/intercept only\s+RMS\s+([\d.]+) s/, 'the intercept-only held-out RMS');
    const none = grab(/no correction\s+RMS\s+([\d.]+) s/, 'the no-correction held-out RMS');
    heldOut = {
      year_start: num(held[1]), year_end: num(held[2]), n: num(held[3]),
      rms_fitted_stack_s: num(fitted[1]), r2_fitted_stack: num(fitted[2]),
      rms_intercept_only_s: num(intercept[1]), rms_no_correction_s: num(none[1]),
    };
  }
  const amplitudes = {};
  for (const m of out.matchAll(/^\s{4}(bond|hallstatt|jose5|jose4|res_kick1|res_kick2|res_tone)\s+([\d.]+) s\s+\((free|cap [\d.]+(?: — AT CAP)?)\)/gm)) {
    amplitudes[m[1]] = { amplitude_s: num(m[2]), at_cap: / AT CAP/.test(m[3]), free: m[3] === 'free' };
  }
  const inter = grab(/intercept\s+([-−\d.]+) s\s+\(folds/, 'the intercept');
  return {
    train: { usno_target_lod_s: num(best[1]), deltaTStart_s: num(best[2]), espenak_rms_s: num(best[3]), full_window_rms_s: num(best[4]) },
    amplitudes_s: Object.fromEntries(Object.entries(amplitudes).map(([k, v]) => [k, v.amplitude_s])),
    at_cap: Object.entries(amplitudes).filter(([, v]) => v.at_cap).map(([k]) => k),
    intercept_s: num(inter[1]),
    held_out: heldOut,
  };
}

// The in-sample twin: the same ladder on the fitter's own full window (−720..2017), no held-out
// block — what each configuration's closure costs on the record it is fitted to (the Espenak
// 1650–2017 RMS and the full-window RMS the fitter prints), beside the shipped set's.
const fullWindow = [];
for (const fsOpt of FLAG_SETS) {
  const r = runFitter(fsOpt.flags, SWINGS[0].components, null);
  fullWindow.push({ id: `shipped_kicks:${fsOpt.id}`, swing: SWINGS[0].id, flag_set: fsOpt.id, flags: fsOpt.flags, kind: fsOpt.kind,
    train: r.train, amplitudes_s: r.amplitudes_s, at_cap: r.at_cap, intercept_s: r.intercept_s });
  console.log(`  full window    ${fsOpt.id.padEnd(22)} Espenak RMS ${r.train.espenak_rms_s.toFixed(2).padStart(6)} s · full-window RMS ${r.train.full_window_rms_s.toFixed(2).padStart(6)} s`);
}

const rows = [];
for (const sw of SWINGS) {
  for (const fsOpt of FLAG_SETS) {
    const r = runFitter(fsOpt.flags, sw.components);
    const h = r.held_out;
    rows.push({
      id: `${sw.id}:${fsOpt.id}`, swing: sw.id, swing_components: sw.components, flag_set: fsOpt.id, flags: fsOpt.flags, kind: fsOpt.kind,
      ...r,
      verdict: {
        beats_intercept_only: h.rms_fitted_stack_s < h.rms_intercept_only_s,
        beats_no_correction: h.rms_fitted_stack_s < h.rms_no_correction_s,
      },
    });
    console.log(`  ${sw.id.padEnd(14)} ${fsOpt.id.padEnd(22)} held-out RMS ${h.rms_fitted_stack_s.toFixed(1).padStart(6)} s`
      + `  (intercept only ${h.rms_intercept_only_s.toFixed(1)}, no correction ${h.rms_no_correction_s.toFixed(1)})`
      + `  train Espenak ${r.train.espenak_rms_s.toFixed(2)} / full ${r.train.full_window_rms_s.toFixed(2)}`);
  }
}

function summary(swingId) {
  const set = rows.filter((r) => r.swing === swingId);
  const full = set.find((r) => r.kind === 'full');
  const reduced = set.filter((r) => r.kind !== 'full');
  const rmsRed = reduced.map((r) => r.held_out.rms_fitted_stack_s);
  return {
    swing: swingId,
    full_set_rms_s: full.held_out.rms_fitted_stack_s,
    reduced_sets_rms_min_s: Math.min(...rmsRed),
    reduced_sets_rms_max_s: Math.max(...rmsRed),
    reduced_sets_better_than_full: reduced.filter((r) => r.held_out.rms_fitted_stack_s < full.held_out.rms_fitted_stack_s).map((r) => r.flag_set),
    intercept_only_rms_s: full.held_out.rms_intercept_only_s,
    no_correction_rms_s: full.held_out.rms_no_correction_s,
    full_set_beats_every_reduced_set: rmsRed.every((v) => full.held_out.rms_fitted_stack_s < v),
    full_set_beats_intercept_only: full.verdict.beats_intercept_only,
    full_set_beats_no_correction: full.verdict.beats_no_correction,
  };
}
const summaries = Object.fromEntries(SWINGS.map((s) => [s.id, summary(s.id)]));
const win = rows[0].held_out;
for (const s of Object.values(summaries)) {
  console.log(`\n  [${s.swing}] full set ${s.full_set_rms_s} s · reduced ${s.reduced_sets_rms_min_s}–${s.reduced_sets_rms_max_s} s`
    + ` · intercept only ${s.intercept_only_rms_s} s · no correction ${s.no_correction_rms_s} s`
    + ` → beats every reduced set: ${s.full_set_beats_every_reduced_set}; beats the intercept-only baseline: ${s.full_set_beats_intercept_only};`
    + ` beats no correction: ${s.full_set_beats_no_correction}`);
}

// Reproduction check against the record (the fitter prints RMS to 0.1 s; equality at that grain).
let diverged = 0;
if (fs.existsSync(OUT)) {
  const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const prevRows = new Map((prev.ladder || []).map((r) => [r.id, r]));
  for (const r of rows) {
    const p = prevRows.get(r.id);
    const now = r.held_out.rms_fitted_stack_s, was = p && p.held_out.rms_fitted_stack_s;
    const same = p && Math.abs(now - was) < 0.05 && Math.abs(r.held_out.rms_intercept_only_s - p.held_out.rms_intercept_only_s) < 0.05
      && Math.abs(r.held_out.rms_no_correction_s - p.held_out.rms_no_correction_s) < 0.05;
    if (!same) diverged++;
    console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} ${r.id}: recorded ${was === undefined ? '—' : was}, computed ${now}`);
  }
} else {
  console.log('\n  (no record yet — nothing to compare)');
}

const artifact = {
  _description:
    'The ΔT stack\'s withheld-era ladder — GENERATED by tools/verify/dt-stack-withheld-era.js --write: '
    + 'the joint fitter (packages/fitting/src/dt-corrections-fit.cjs --joint, its DT_FIT_WINDOW cross-validation '
    + 'hook) trained on the post-CE Stephenson 2016 residual alone (0..2017, step 10) and scored on the withheld BCE '
    + 'era (-720..-10, 72 samples the fit never saw), for the full four-harmonic set, the four leave-one-out triples '
    + 'and the nested cascade, each with the shipped two swing kicks and with no swing columns; the held-out RMS of '
    + 'the fitted stack beside the intercept-only and no-correction baselines, as the fitter prints them (0.1 s). '
    + 'Nothing is fitted or computed outside the fitter; the shipped stack (data/deltaT-4flag-fit.json) is '
    + 'untouched. The inputs block is verified by the artifact-freshness gate on every npm run check.',
  training_window: TRAIN,
  held_out_window: { year_start: win.year_start, year_end: win.year_end, step_yr: TRAIN.step_yr, n: win.n },
  summary: summaries,
  ladder: rows,
  full_window_in_sample: {
    _note: 'the same configurations fitted on the fitter\'s own full window (−720..2017): in-sample closure only, no held-out block; the shipped set is all_four',
    rows: fullWindow,
  },
  inputs: buildInputsBlock('node tools/verify/dt-stack-withheld-era.js --write', INPUT_FILES),
};

if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`\n  ✓ wrote ${path.relative(ROOT, OUT)}`);
} else if (diverged) {
  console.log(`\n  ✗ ${diverged} ladder row(s) diverge from the record — re-run with --write after a model change`);
  process.exit(1);
} else {
  console.log('\n  dry run — pass --write to update the artifact');
}
