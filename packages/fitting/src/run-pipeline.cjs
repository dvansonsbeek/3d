#!/usr/bin/env node
/**
 * Automated fitting pipeline runner.
 *
 * Usage:
 *   node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~2 min)
 *   node tools/fit/run-pipeline.js --phase2        # Steps 4a-10 (~2.5 hrs, requires Step 3 data)
 *   node tools/fit/run-pipeline.js --all           # Steps 1-2, then 4a-9
 *   node tools/fit/run-pipeline.js --from 5a       # Resume from Step 5a onwards
 *   node tools/fit/run-pipeline.js --iterate 20    # Repeat Steps 5a-5b 20 times (iterative convergence)
 *   node tools/fit/run-pipeline.js --converge      # Repeat Steps 5a-5b until improvement < 0.001°
 *
 * Logs all output to tools/results/pipeline.log (overwritten each run).
 * Stops on any step failure. Step 8 (verify) must pass before Step 9 (sync).
 *
 * Step 3 (browser export) is always manual — the runner checks that
 * data/01-holistic-year-objects-data.xlsx exists before starting Phase 2.
 *
 * IMPORTANT — Step 3 deep-time toggle protocol:
 *   The browser export is the ONLY pipeline step that requires
 *   DEEP_TIME_MODE_ENABLED = false. Before clicking Analysis →
 *   Export Objects Report, run in the browser console:
 *       disableDeepTimeMode()
 *   After the export completes, restore production state:
 *       enableDeepTimeMode()
 *   All steps THIS runner executes (Phase 1 Steps 1-2, Phase 3-6
 *   Steps 4a-10) run in Node/Python which have no deep-time chain
 *   and are J2000-locked by construction — no toggle needed.
 *   See tools/fit/README.md Step 3 for the full pre-export protocol
 *   (range field values, sanity check, etc.).
 *
 * NOT INCLUDED in the standard runner:
 *  - Step 0 (sun-longitude-harmonics.js) — structural prerequisite, run
 *    once manually before the first pipeline pass; coefficients are
 *    stable across normal refits. See tools/fit/README.md Phase 0.
 *    MATCHED-PAIR DOWNSTREAM: a Step-0 refit stales the location tier's
 *    Sun planetary completion (packages/physics/src/eclipse/
 *    sun-planetary-completion.cjs) — re-derive it afterwards with
 *      node tools/fit/sun-planetary-completion-fit.mjs
 *    and update its table + PAIRED_SUN_HARMONICS_SHA256. Enforced: the
 *    test:model parity gate fingerprints the pair and fails `npm run
 *    check` if Step 0 was refit without the re-derivation.
 *  - Step 5c (moon-eclipse-optimizer.js) — separate eclipse-anchored fit.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 9-3g: moved from tools/fit (shim remains); ROOT is now three levels up.
// The step cmds keep their documented tools/fit/*.js paths — those are the
// one-line shims into this package, so docs, README and muscle memory stay
// valid; the spawns run with cwd = ROOT as before.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const LOG_PATH = path.join(ROOT, 'tools', 'results', 'pipeline.log');
const DATA_01 = path.join(ROOT, 'data', '01-holistic-year-objects-data.xlsx');

// ─── Parse arguments ────────────────────────────────────────────────────────

const args = process.argv.slice(2);

// ─── GUARD ───────────────────────────────────────────────────────────────────
// This runner invokes fitters with --write. They rewrite public/input/*.json —
// the model's source of truth — and a full run takes ~2.5 hours.
//
// It used to default to `--all` for ANY input: `const flag = args[0] || '--all'`,
// and an unrecognised flag fell straight through the --from/--iterate/--converge
// chain into a complete run. That is not hypothetical. `--list`, typed in the
// belief that it printed the step table, silently began refitting and had
// rewritten correctionSun, earthtiltMean, eccentricityBase and four planets'
// startpos/angleCorrection before it was noticed and killed.
//
// So: an unknown flag is now an ERROR, not a full run, and `--all` must be asked
// for by name. Every other tool here makes --write opt-in; the orchestrator that
// calls all of them should not be the exception.
const KNOWN_FLAGS = ['--all', '--phase1', '--phase2', '--from', '--iterate', '--converge', '--list', '--dry-run', '--help'];

const flag = args[0];
if (!flag) {
  console.error('run-pipeline.js writes to public/input/*.json and takes ~2.5 hours.');
  console.error('It will not run without an explicit flag.\n');
  console.error('  --list        show the steps and exit (writes nothing)');
  console.error('  --phase1      Steps 1-2 only (~2 min)');
  console.error('  --phase2      Steps 4a-10 (~2.5 hrs, needs Step 3 data)');
  console.error('  --all         Steps 1-2, then 4a-9');
  console.error('  --from <step> resume from a step');
  console.error('  --iterate <n> / --converge   repeat Steps 5a-5b');
  process.exit(1);
}
if (!KNOWN_FLAGS.includes(flag)) {
  console.error(`Unknown flag "${flag}".`);
  console.error('Refusing to run — this used to fall through to a full --all run,');
  console.error(`which rewrites public/input/*.json.\n  Known flags: ${KNOWN_FLAGS.join(' ')}`);
  process.exit(1);
}

const listOnly = flag === '--list' || flag === '--dry-run' || flag === '--help';
let fromStep = null;
let iterateCount = 0;
let convergeMode = false;

if (flag === '--from') {
  fromStep = args[1];
  if (!fromStep) {
    console.error('Usage: --from <step>  (e.g., --from 5a, --from 6a)');
    process.exit(1);
  }
} else if (flag === '--iterate') {
  iterateCount = parseInt(args[1] || '10', 10);
} else if (flag === '--converge') {
  convergeMode = true;
  iterateCount = 50; // max iterations
}

// ─── Step definitions ───────────────────────────────────────────────────────

const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const STEPS = [
  // Phase 1: Sun optimizer & planet alignment
  { id: '1',  phase: 1, name: 'Sun optimizer',
    cmd: 'node tools/optimize.js optimize sun correctionSun --write' },
  ...planets.map(p => ({
    id: '2',  phase: 1, name: `Planet startpos: ${p}`,
    cmd: `node tools/optimize.js optimize ${p} startpos --write`,
  })),

  // Phase 2: Steps 4a-4d (Earth perihelion & ML training)
  { id: '4a', phase: 2, name: 'Perihelion harmonics',
    cmd: 'python3 tools/fit/python/fit_perihelion_harmonics.py --write' },
  { id: '4b', phase: 2, name: 'Verify perihelion ERD',
    cmd: 'python3 tools/fit/python/verify_perihelion_erd.py' },
  { id: '4c', phase: 2, name: 'Train precession (physical-beat)',
    cmd: 'python3 tools/fit/python/train_precession_physical.py --write' },
  { id: '4d', phase: 2, name: 'Train observed',
    cmd: 'python3 tools/fit/python/train_observed.py --write' },

  // Phase 4: Planet positions & corrections
  { id: '5a', phase: 2, name: 'Parallax corrections',
    cmd: 'node tools/fit/parallax-correction.js --write' },
  { id: '5b', phase: 2, name: 'Gravitation correction',
    cmd: 'node tools/fit/gravitation-correction.js --write' },
  { id: '5c', phase: 2, name: 'Moon eclipse optimizer',
    cmd: 'node tools/fit/moon-eclipse-optimizer.js --write' },

  // Phase 5: Solar measurements & harmonic fits
  // 6a observed: ~2h 3min at H=335,317 (14,579 samples × 6 event types × cardinal-point
  // bisection with ±2-day narrow window). 3h timeout gives generous margin.
  { id: '6a', phase: 2, name: 'Export solar measurements (~2 hr)',
    cmd: 'node tools/fit/export-solar-measurements.js', timeout: 3 * 60 * 60 * 1000 },
  { id: '6b', phase: 2, name: 'Obliquity harmonics',
    cmd: 'node tools/fit/obliquity-harmonics.js --write' },
  // ORDER + RENAME: year-length is 6c and runs BEFORE the
  // cardinal-point fit, which is now 6d. The §10e-bis reordering made the
  // year-length model the authoritative source of secular year-length
  // behaviour; the cardinal-point fit derives its linear terms from
  // TROPICAL_YEAR_HARMONICS + YEAR_LENGTH_J2000_ANCHOR and hard-fails
  // without them. One bare --write fits ALL THREE year types (the old
  // --type sidereal/anomalistic split no longer exists). In docs written
  // before this rename, "6c" = cardinal-point and "6d"/"6e" = year-length.
  { id: '6c', phase: 2, name: 'Year-length harmonics (tropical+sidereal+anomalistic)',
    cmd: 'node tools/fit/year-length-harmonics.js --write' },
  // 6d observed: SS+WS+VE+AE greedy fit, ~10 min per CP × 4 = ~40 min total.
  // Default 10-min per-step timeout would abort mid-VE. Use 60 min.
  { id: '6d', phase: 2, name: 'Cardinal point harmonics (~40 min)',
    cmd: 'node tools/fit/cardinal-point-harmonics.js --write', timeout: 60 * 60 * 1000 },
  // Step 6f (sun-longitude-harmonics) intentionally OMITTED — see header
  // comment. It runs once as Phase 0 prerequisite, not as part of the
  // routine cascade.

  // Phase 5b: Eccentricity amplitudes & balance law verification
  { id: '7a', phase: 2, name: 'Derive eccentricity amplitudes',
    cmd: 'node tools/fit/derive-eccentricity-amplitudes.js --write' },
  { id: '7b', phase: 2, name: 'Balance search (presets)',
    cmd: 'node tools/verify/balance-search.js' },

  // Phase 6: ΔT correction stack (Bond + Hallstatt + Jose5 + Jose4)
  // Fits the 4-flag sub-Milankovitch cascade against Stephenson 2016 ΔT
  // residual. Requires DT_CORRECTIONS_DISABLED=1 env so the residual reflects
  // pure-tidal framework, not framework + previously-shipped corrections.
  // See tools/fit/dt-corrections-fit.js docstring + docs/102.
  { id: '7c', phase: 2, name: 'ΔT correction stack (Bond+Hallstatt+Jose5+Jose4)',
    cmd: 'DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --joint --write' },

  // Phase 6b: Campaign artifacts (§12h follow-up work — runs by default so a
  // pipeline pass leaves no generated artifact stale; the artifact-freshness
  // gate in `npm run check` then verifies the recorded input hashes on every
  // check without re-running these).
  // Campaign-artifact generators (§12h follow-ups). IDs start at 7f: the fit
  // README's canonical numbering already assigns 7d (verify-laws) and 7e
  // (fibonacci_significance) to manual steps the runner does not execute.
  { id: '7f', phase: 2, name: 'Cassini moontilt results (runs both labs)',
    cmd: 'node tools/verify/cassini-results.js --write', timeout: 20 * 60 * 1000 },
  { id: '7g', phase: 2, name: 'Prediction fit stats (evaluation, ~7 min)',
    cmd: 'python3 tools/fit/python/eval_precession_physical.py --write', timeout: 30 * 60 * 1000 },
  { id: '7h', phase: 2, name: 'LOD-climate correlation summary',
    cmd: 'node tools/verify/lod-climate-correlation.js --write' },
  { id: '7i', phase: 2, name: 'Eclipse audit summary (L-5b/L-7 + audit-26, ~2-4 min)',
    cmd: 'node tools/verify/eclipse-audit.js --write', timeout: 15 * 60 * 1000 },

  // Phase 7: Verify & sync
  { id: '8',  phase: 2, name: 'Verify pipeline',
    cmd: 'node tools/fit/verify-pipeline.js --write' },
  // No publish gate here: src/script.js IMPORTS the generated module, so this
  // step publishes nothing — it regenerates deterministically from the JSON and
  // cannot corrupt a source file the way a regex patcher can. Runs every time.
  { id: '9',  phase: 2, name: 'Regenerate constants module',
    cmd: 'node tools/constants/generate.mjs --write' },

  // Phase 8: Dashboard data
  { id: '10', phase: 2, name: 'Export dashboard data',
    cmd: 'node tools/export-dashboard-data.js' },
];

// ─── Filter steps ───────────────────────────────────────────────────────────

function filterSteps() {
  if (fromStep) {
    const idx = STEPS.findIndex(s => s.id === fromStep);
    if (idx === -1) {
      console.error(`Unknown step: ${fromStep}. Valid: ${[...new Set(STEPS.map(s => s.id))].join(', ')}`);
      process.exit(1);
    }
    return STEPS.slice(idx);
  }
  if (flag === '--phase1') return STEPS.filter(s => s.phase === 1);
  if (flag === '--phase2') return STEPS.filter(s => s.phase === 2);
  return STEPS; // --all
}

// ─── Run ────────────────────────────────────────────────────────────────────

const steps = (iterateCount > 0 || convergeMode) ? [] : filterSteps();

// --list / --dry-run: print the plan and exit BEFORE anything can execute.
if (listOnly) {
  console.log('run-pipeline.js — DRY RUN, nothing will be written\n');
  let phase = null;
  for (const s of STEPS) {
    if (s.phase !== phase) { phase = s.phase; console.log(`  ── Phase ${phase} ──`); }
    const writes = / --write\b/.test(s.cmd) ? 'WRITES' : '      ';
    console.log(`    ${String(s.id).padEnd(4)} ${writes}  ${s.name}`);
    console.log(`           ${s.cmd}`);
  }
  const w = STEPS.filter((s) => / --write\b/.test(s.cmd)).length;
  console.log(`\n  ${STEPS.length} steps · ${w} write to disk`);
  console.log('  Step 3 (browser GUI export) is manual and has no command here.');
  console.log('\n  To actually run: --phase1 | --phase2 | --all | --from <step>');
  process.exit(0);
}

const needsPhase2 = steps.some(s => s.phase === 2);

// Check Step 3 data exists before Phase 2
if (needsPhase2 && !fs.existsSync(DATA_01)) {
  console.error(`\nStep 3 data not found: ${DATA_01}`);
  console.error('Export from browser first: Analysis → Export Objects Report\n');
  process.exit(1);
}

// Init log
const startTime = new Date();
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line);
  logLines.push(line);
}

log(`Pipeline started: ${startTime.toISOString()}`);
log(`Steps: ${[...new Set(steps.map(s => s.id))].join(', ')}`);
log(`Log: ${LOG_PATH}`);
log('');

let passed = 0;
let failed = 0;

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const label = `Step ${step.id}: ${step.name}`;
  log(`── ${label} ──`);
  const stepStart = Date.now();

  try {
    // Stream output to terminal in real-time (visible progress for long steps)
    // and capture it for the log file
    const result = execSync(step.cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: step.timeout || 10 * 60 * 1000, // per-step or 10 min default
      maxBuffer: 100 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);

    // Save full output to log
    const lines = result.trim().split('\n');
    for (const l of lines) logLines.push('   ' + l);

    // Show last few lines + timing on terminal
    const tail = lines.slice(-3);
    for (const l of tail) console.log('   ' + l);
    log(`   ✓ ${label} (${elapsed}s)`);

    passed++;
  } catch (err) {
    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
    log(`   ✗ ${label} FAILED (${elapsed}s)`);

    // Log error output
    const errOutput = (err.stdout || '') + (err.stderr || '');
    const lines = errOutput.trim().split('\n');
    // Show last 10 lines on terminal
    for (const l of lines.slice(-10)) console.log('   ' + l);
    // Save all to log
    for (const l of lines) logLines.push('   ' + l);

    failed++;
    log('');
    log(`Pipeline ABORTED at ${label}`);
    log(`${passed} passed, ${failed} failed`);

    fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n');
    process.exit(1);
  }
}

// ─── Iterative correction refinement ─────────────────────────────────────
// Repeats Steps 5a-5b (parallax + gravitation/elongation) to allow
// corrections to iteratively improve by each seeing the other's residuals.
// Moon step (5c) runs once after iteration completes.

if (iterateCount > 0 || convergeMode) {
  const iterSteps = STEPS.filter(s => s.id === '5a' || s.id === '5b');
  const CONVERGE_THRESHOLD = 0.001; // degrees

  log('');
  log('═══ Iterative correction refinement (Steps 5a-5b) ═══');
  log(convergeMode ? `  Mode: converge (threshold ${CONVERGE_THRESHOLD}°, max ${iterateCount} passes)` : `  Mode: ${iterateCount} passes`);
  log('');

  let prevRMS = null;
  for (let iter = 1; iter <= iterateCount; iter++) {
    const iterStart = Date.now();

    for (const step of iterSteps) {
      try {
        execSync(step.cmd, {
          cwd: ROOT, encoding: 'utf8',
          timeout: step.timeout || 10 * 60 * 1000,
          maxBuffer: 100 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        passed++;
      } catch {
        log(`   ✗ Iteration ${iter}, ${step.name} FAILED`);
        failed++;
        fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n');
        process.exit(1);
      }
    }

    // Measure Venus RMS (the main target for iterative improvement)
    try {
      const rmsOutput = execSync(
        'node -e "const {baseline}=require(\'./tools/lib/optimizer\');console.log(baseline(\'venus\').rmsTotal);"',
        { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
      ).trim();
      const venusRMS = parseFloat(rmsOutput);
      const elapsed = ((Date.now() - iterStart) / 1000).toFixed(0);
      const delta = prevRMS ? (venusRMS - prevRMS) : 0;
      const deltaStr = prevRMS ? ` (Δ=${delta >= 0 ? '+' : ''}${delta.toFixed(4)}°)` : '';

      log(`  Pass ${String(iter).padStart(2)}: Venus=${venusRMS.toFixed(4)}°${deltaStr} (${elapsed}s)`);

      // Check convergence
      if (convergeMode && prevRMS && Math.abs(delta) < CONVERGE_THRESHOLD) {
        log(`  Converged at pass ${iter} (Δ < ${CONVERGE_THRESHOLD}°)`);
        break;
      }
      prevRMS = venusRMS;
    } catch {
      log(`  Pass ${iter}: (RMS measurement failed)`);
    }
  }
  log('');
}

// ─── Summary ────────────────────────────────────────────────────────────────

const totalTime = ((Date.now() - startTime.getTime()) / 1000 / 60).toFixed(1);
log('');
log('═══════════════════════════════════════════════════════════════');
log(`  Pipeline COMPLETE: ${passed} steps passed in ${totalTime} min`);
log('═══════════════════════════════════════════════════════════════');

fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n');
