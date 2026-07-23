#!/usr/bin/env node
/**
 * Sync 3-flag ΔT correction coefficients from data/deltaT-3flag-fit.json to
 * the three code sites that hold the shipped values:
 *   • src/script.js                     (browser)
 *   • tools/lib/deep-time.js            (Node port)
 *   • ../Holistic/holisticuniverse/src/lib/orbital/deepTime.ts (website calc)
 *
 * Three entry points:
 *   1. Standalone CLI (all three targets, disk I/O):
 *        node tools/fit/export-dt-corrections.js --write
 *
 *   2. Programmatic in-memory (used by export-to-script.js and export-to-holistic.js):
 *        const dt = require('./export-dt-corrections');
 *        const fit = dt.loadFitJson();
 *        if (fit) {
 *          const { source, changes } = dt.applyToSource(src, fit);
 *          // caller writes source back to disk when ready
 *        }
 *
 *   3. Programmatic bulk (called by dt-corrections-fit.js --sync-code):
 *        require('./export-dt-corrections').syncAllTargets(fitOutput);
 *
 * Only numeric assignments are edited — comment blocks are preserved verbatim.
 * The three source-of-truth values per cycle are:
 *   BOND_LATTICE_N, BOND_COS_COEFF_S, BOND_SIN_COEFF_S
 *   HALLSTATT_LATTICE_N, HALLSTATT_COS_COEFF_S, HALLSTATT_SIN_COEFF_S
 *   JOSE5_LATTICE_N, JOSE5_COS_COEFF_S, JOSE5_SIN_COEFF_S
 * The runtime derives BOND_DT_RAW_AT_J2000 etc. from cos/sin, so those are NOT synced.
 */

const fs = require('fs');
const path = require('path');

// Prefer the 4-flag artifact if present; fall back to the 3-flag artifact
// for consumers that haven't re-run the fit tool yet. Both share the same
// shape for the shared cycles (bond / hallstatt / jose5); the 4-flag file
// adds a jose4 section.
const FIT_JSON_PATHS = [
  path.join(__dirname, '..', '..', 'data', 'deltaT-4flag-fit.json'),
  path.join(__dirname, '..', '..', 'data', 'deltaT-3flag-fit.json'),
];
const FIT_JSON_PATH = FIT_JSON_PATHS[0];  // preferred write target

const TARGETS = {
  script: {
    label: 'src/script.js',
    path:  path.join(__dirname, '..', '..', 'src', 'script.js'),
  },
  nodeDeepTime: {
    label: 'tools/lib/deep-time.js',
    path:  path.join(__dirname, '..', '..', 'tools', 'lib', 'deep-time.js'),
  },
  websiteDeepTime: {
    label: 'website src/lib/orbital/deepTime.ts',
    path:  path.join(__dirname, '..', '..', '..', 'Holistic', 'holisticuniverse', 'src', 'lib', 'orbital', 'deepTime.ts'),
  },
};

const ASTRO_REFERENCE_PATH = path.join(__dirname, '..', '..', 'public', 'input', 'astro-reference.json');

// ─── Load fit JSON (returns null if none present; prefers 4-flag) ───
function loadFitJson() {
  for (const p of FIT_JSON_PATHS) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return null;
}

// Core-mantle swing (Resonator driver) Stage-1 artifact — proposed shipped
// block for the 2-kick episode. Absent file → resonator sync skipped.
const RESONATOR_JSON_PATH = path.join(__dirname, '..', '..', 'data',
                                      'core-mantle-resonator-stage1.json');
function loadResonatorJson() {
  if (!fs.existsSync(RESONATOR_JSON_PATH)) return null;
  const j = JSON.parse(fs.readFileSync(RESONATOR_JSON_PATH, 'utf8'));
  return (j.proposed_shipped_coefficients || {}).resonator || null;
}

// ─── In-memory transformation: takes source string, returns {source, changes} ───
function applyToSource(src, fit) {
  const c = fit.shipped_coefficients;
  const replacements = [
    ['BOND_LATTICE_N',        c.bond.lattice_n],
    ['BOND_COS_COEFF_S',      c.bond.cos_coeff_s],
    ['BOND_SIN_COEFF_S',      c.bond.sin_coeff_s],
    ['HALLSTATT_LATTICE_N',   c.hallstatt.lattice_n],
    ['HALLSTATT_COS_COEFF_S', c.hallstatt.cos_coeff_s],
    ['HALLSTATT_SIN_COEFF_S', c.hallstatt.sin_coeff_s],
    ['JOSE5_LATTICE_N',       c.jose5.lattice_n],
    ['JOSE5_COS_COEFF_S',     c.jose5.cos_coeff_s],
    ['JOSE5_SIN_COEFF_S',     c.jose5.sin_coeff_s],
  ];
  // Jose4 appears from the 4-flag artifact onward; skip silently if absent from JSON.
  if (c.jose4) {
    replacements.push(
      ['JOSE4_LATTICE_N',    c.jose4.lattice_n],
      ['JOSE4_COS_COEFF_S',  c.jose4.cos_coeff_s],
      ['JOSE4_SIN_COEFF_S',  c.jose4.sin_coeff_s],
    );
  }
  // NOTE: deltaTStart (auto-selected joint optimum) is NOT synced here — it's
  // written to public/input/astro-reference.json by syncAstroReference() below,
  // and Step 9 of the pipeline (export-to-script.js) propagates it from JSON to
  // src/script.js in the normal sync sweep. Keeping a single source of truth in
  // astro-reference.json avoids two places writing the same const value.

  // ── Core-mantle swing (Resonator driver) — 2-kick episode constants ──
  // Source of truth: data/core-mantle-resonator-stage1.json (fitted by
  // scripts/core_mantle_resonator_stage1.py, variant V5, physical-consistency
  // rule). Skipped silently if the JSON or the RES_* constants are absent
  // from the target (e.g. website deepTime.ts until its display integration).
  const res = loadResonatorJson();
  if (res) {
    const k = res.kick_epochs_year, kc = res.kick_coefficients_s, t1 = res.drive_tones[0];
    replacements.push(
      ['RES_T0_LATTICE_N', res.T0_lattice_n],   // T₀ = 8H/n (lattice-labeled eigenperiod)
      ['RES_Q',            res.Q],
      ['RES_KICK1_T_YR',   k[0]],
      ['RES_KICK1_COS_S',  kc[0].cos],
      ['RES_KICK1_SIN_S',  kc[0].sin],
      ['RES_KICK2_T_YR',   k[1]],
      ['RES_KICK2_COS_S',  kc[1].cos],
      ['RES_KICK2_SIN_S',  kc[1].sin],
      ['RES_TONE1_DN',     t1.dn],
      ['RES_TONE1_PHI_RAD', t1.phi_locked_rad],
      ['RES_TONE1_AMP_S',  t1.amp_s],
    );
  }
  let changes = 0;
  for (const [name, val] of replacements) {
    const re = new RegExp(
      `(const\\s+${name}\\s*=\\s*)(-?[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)(\\s*;?)`,
      'm'
    );
    const m = src.match(re);
    if (!m) continue;         // constant not present in this file (skip silently)
    const oldVal = parseFloat(m[2]);
    if (Math.abs(oldVal - val) < 1e-14) continue;   // already in sync
    console.log(`    ${name}: ${oldVal} → ${val}`);
    src = src.replace(re, `$1${val}$3`);
    changes++;
  }
  return { source: src, changes };
}

// ─── Backup helper (standalone CLI only) ───
// Backup helper — retained as no-op. Git tracks the changes; .bak files just
// clutter the working tree. Historical calls left in place; behaviour disabled.
function backup(p) { /* no-op — git is the backup */ }

// ─── Sync one file end-to-end (read → transform → write) ───
function syncTargetToDisk(targetKey, fit, { dryRun }) {
  const target = TARGETS[targetKey];
  if (!target) throw new Error(`Unknown target: ${targetKey}`);
  if (!fs.existsSync(target.path)) {
    console.log(`  → ${target.label}  (not found, skipping)`);
    return 0;
  }
  console.log(`  → ${target.label}`);
  const before = fs.readFileSync(target.path, 'utf8');
  const { source: after, changes } = applyToSource(before, fit);
  if (changes === 0) {
    console.log(`    (no changes needed)`);
    return 0;
  }
  if (dryRun) {
    console.log(`    ${changes} changes pending (dry run)`);
    return changes;
  }
  backup(target.path);
  fs.writeFileSync(target.path, after);
  console.log(`    ✓ ${changes} constants updated`);
  return changes;
}

// ─── Sync auto-optimum deltaTStart to public/input/astro-reference.json ─────
// The JSON is the source of truth for that constant; Step 9 of the pipeline
// (export-to-script.js) then propagates it from astro-reference.json into
// src/script.js. This keeps a single writer per const across the pipeline.
// No-op when fit.optimum.deltaTStart is null (--fixed-anchors or DT flag
// unset — the sweep was skipped and the previous JSON value stays).
function syncAstroReference(fit, { dryRun = false } = {}) {
  if (!fit.optimum || typeof fit.optimum.deltaTStart !== 'number') {
    console.log('  → public/input/astro-reference.json  (auto-optimum not available, skipping)');
    return 0;
  }
  if (!fs.existsSync(ASTRO_REFERENCE_PATH)) {
    console.log('  → public/input/astro-reference.json  (not found, skipping)');
    return 0;
  }
  console.log('  → public/input/astro-reference.json');
  const raw = fs.readFileSync(ASTRO_REFERENCE_PATH, 'utf8');
  const json = JSON.parse(raw);
  const oldVal = json.earthOrbital && json.earthOrbital.deltaTStart;
  const newVal = fit.optimum.deltaTStart;
  if (typeof oldVal !== 'number') {
    console.log('    (earthOrbital.deltaTStart not present or non-numeric — skipping)');
    return 0;
  }
  if (Math.abs(oldVal - newVal) < 1e-9) {
    console.log('    (already in sync: ' + oldVal + ')');
    return 0;
  }
  console.log(`    deltaTStart: ${oldVal} → ${newVal}`);
  if (dryRun) {
    console.log(`    1 change pending (dry run)`);
    return 1;
  }
  // Regex-patch the specific line so surrounding formatting is preserved.
  const re = /("deltaTStart"\s*:\s*)(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/;
  const m = raw.match(re);
  if (!m) {
    console.log('    (deltaTStart line pattern not found — skipping)');
    return 0;
  }
  const patched = raw.replace(re, `$1${newVal}`);
  fs.writeFileSync(ASTRO_REFERENCE_PATH, patched);
  console.log('    ✓ deltaTStart updated (propagates to script.js at pipeline Step 9)');
  return 1;
}

// ─── Sync all targets (bulk mode, called by dt-corrections-fit.js) ─────────
// Order: coefficient consts in the 3 code files, then deltaTStart in
// astro-reference.json. The astro-reference.json update flows into script.js
// separately via export-to-script.js at pipeline Step 9.
function syncAllTargets(fit, { dryRun = false } = {}) {
  let total = 0;
  for (const key of Object.keys(TARGETS)) {
    total += syncTargetToDisk(key, fit, { dryRun });
  }
  total += syncAstroReference(fit, { dryRun });
  return total;
}

// ─── CLI ───
function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SYNC ΔT COEFFICIENTS TO CODE FILES');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  const WRITE = process.argv.includes('--write');
  const fit = loadFitJson();
  if (!fit) {
    console.log(`✗ ${FIT_JSON_PATH} not found. Run dt-corrections-fit.js --write first.`);
    process.exit(1);
  }
  const activePath = FIT_JSON_PATHS.find(p => fs.existsSync(p));
  console.log(`  Source: ${path.relative(path.join(__dirname, '..', '..'), activePath)}`);
  const c = fit.shipped_coefficients;
  console.log(`  Bond      n=${c.bond.lattice_n}`);
  console.log(`  Hallstatt n=${c.hallstatt.lattice_n}`);
  console.log(`  Jose5     n=${c.jose5.lattice_n}`);
  if (c.jose4) console.log(`  Jose4    n=${c.jose4.lattice_n}`);
  console.log('');
  console.log(WRITE ? '  Applying updates:' : '  Dry run (add --write to modify files):');
  const total = syncAllTargets(fit, { dryRun: !WRITE });
  console.log(`\n  ${WRITE ? '✓' : '·'} ${total} total constants ${WRITE ? 'updated' : 'would be updated'}.`);
  if (WRITE) console.log('  Next: verify with `git diff` and run L-5b to confirm no regression.');
}

module.exports = {
  loadFitJson,
  loadResonatorJson,
  applyToSource,
  syncTargetToDisk,
  syncAstroReference,
  syncAllTargets,
  TARGETS,
  ASTRO_REFERENCE_PATH,
  RESONATOR_JSON_PATH,
};

if (require.main === module) main();
