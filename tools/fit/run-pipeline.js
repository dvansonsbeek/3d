#!/usr/bin/env node
/**
 * Automated fitting pipeline runner.
 *
 * Usage:
 *   node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~2 min)
 *   node tools/fit/run-pipeline.js --phase2        # Steps 4a-9 (~2.5 hrs, requires Step 3 data)
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
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_PATH = path.join(ROOT, 'tools', 'results', 'pipeline.log');
const DATA_01 = path.join(ROOT, 'data', '01-holistic-year-objects-data.xlsx');

// ─── Parse arguments ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = args[0] || '--all';
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
  { id: '4c', phase: 2, name: 'Train precession (unified)',
    cmd: 'python3 tools/fit/python/train_precession.py --write' },
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
  { id: '6a', phase: 2, name: 'Export solar measurements (~50 min)',
    cmd: 'node tools/fit/export-solar-measurements.js', timeout: 2 * 60 * 60 * 1000 },
  { id: '6b', phase: 2, name: 'Obliquity harmonics',
    cmd: 'node tools/fit/obliquity-harmonics.js --write' },
  { id: '6c', phase: 2, name: 'Cardinal point harmonics',
    cmd: 'node tools/fit/cardinal-point-harmonics.js --write' },
  { id: '6d', phase: 2, name: 'Sidereal year harmonics',
    cmd: 'node tools/fit/year-length-harmonics.js --write --type sidereal' },
  { id: '6e', phase: 2, name: 'Anomalistic year harmonics',
    cmd: 'node tools/fit/year-length-harmonics.js --write --type anomalistic' },

  // Phase 5b: Eccentricity amplitudes & balance law verification
  { id: '7a', phase: 2, name: 'Derive eccentricity amplitudes',
    cmd: 'node tools/fit/derive-eccentricity-amplitudes.js --write' },

  // Phase 6: Verify & sync
  { id: '8',  phase: 2, name: 'Verify pipeline',
    cmd: 'node tools/fit/verify-pipeline.js --write' },
  { id: '9',  phase: 2, name: 'Export to script.js',
    cmd: 'node tools/fit/export-to-script.js --write' },

  // Phase 7: Dashboard data
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
      } catch (err) {
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
    } catch (e) {
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
