#!/usr/bin/env node
/**
 * Automated fitting pipeline runner.
 *
 * Usage:
 *   node tools/fit/run-pipeline.js --phase1        # Step 1 only (~2 min)
 *   node tools/fit/run-pipeline.js --phase2        # Steps 6a2-9 (~45 min)
 *   node tools/fit/run-pipeline.js --all           # Step 1, then 6a2-9
 *   node tools/fit/run-pipeline.js --from 7c       # Resume from Step 7c onwards
 *
 * Logs all output to tools/results/pipeline.log (overwritten each run).
 * Stops on any step failure. Step 8 (verify) must pass before Step 9 (sync).
 *
 * Steps 0, 3, 4a–4d, 5a–5c, 6a, 6b–6d, 6f, 7a–7b, 7g and 10 are retired with
 * the constructions they fitted (doc 109 §23); the ids are never reused
 * (README numbering is shared vocabulary).
 *
 * The deep regeneration cascade (the N-body pair, the secular series, the
 * verdicts and records, the T1/climate chain) is not a fitter step; its order
 * is the artifact-freshness gate's (`npm run check:artifacts` names each
 * generator) — see tools/fit/README.md.
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
// rewritten the scene Sun's start angle, earthtiltMean, the eccentricity base
// and four planets' start angles before it was noticed and killed (the Step-1
// optimizer that did it is deleted).
//
// So: an unknown flag is now an ERROR, not a full run, and `--all` must be asked
// for by name. Every other tool here makes --write opt-in; the orchestrator that
// calls all of them should not be the exception.
const KNOWN_FLAGS = ['--all', '--phase1', '--phase2', '--from', '--list', '--dry-run', '--help'];

const flag = args[0];
if (!flag) {
  console.error('run-pipeline.js writes to public/input/*.json and data/*.json and takes ~45 minutes.');
  console.error('It will not run without an explicit flag.\n');
  console.error('  --list        show the steps and exit (writes nothing)');
  console.error('  --phase1      (no step left — the Step-1 Sun optimizer is deleted, plan 11 step 2)');
  console.error('  --phase2      Steps 6a2-9 (~45 min)');
  console.error('  --all         Steps 6a2-9');
  console.error('  --from <step> resume from a step');
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

if (flag === '--from') {
  fromStep = args[1];
  if (!fromStep) {
    console.error('Usage: --from <step>  (e.g., --from 6a2, --from 7c)');
    process.exit(1);
  }
}

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS = [

  // Phase 5: Solar measurements
  // 6a2: the exporter over −4000…+4000 — the window CSV the bit-exact smoke
  // gate (npm run check:csv-smoke) compares against; ~25 min. The command is
  // `npm run fit:6a2` spelled out.
  { id: '6a2', phase: 2, name: 'Export solar measurements — the window CSV (~25 min)',
    cmd: 'node tools/fit/export-solar-measurements.js --start -4000 --end 4000 --output data/02-solar-measurements-window.csv', timeout: 60 * 60 * 1000 },

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

const steps = filterSteps();

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
  console.log('\n  To actually run: --phase1 | --phase2 | --all | --from <step>');
  process.exit(0);
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

// ─── Summary ────────────────────────────────────────────────────────────────

const totalTime = ((Date.now() - startTime.getTime()) / 1000 / 60).toFixed(1);
log('');
log('═══════════════════════════════════════════════════════════════');
log(`  Pipeline COMPLETE: ${passed} steps passed in ${totalTime} min`);
log('═══════════════════════════════════════════════════════════════');

fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n');
