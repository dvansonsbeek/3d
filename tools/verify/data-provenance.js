#!/usr/bin/env node
/**
 * DATA PROVENANCE GATE (Phase 12)
 * ================================
 *
 * Enforces PROVENANCE.md's own maintenance rule — "adding a dataset to
 * `data/` means adding a row here first" — which until this gate was
 * unenforced prose (the same class the artifact-freshness gate closed for
 * campaign artifacts). Three rules, each fail-proven on a planted violation:
 *
 *   1. COVERAGE: every git-TRACKED file under data/ must be covered by a
 *      manifest entry, a manifest directory, or — for generated *.json
 *      artifacts — be SELF-DESCRIBING (meta/_meta/inputs/_description/
 *      generated_by field) or listed in the @essrt/data generated ledger.
 *   2. NO DANGLING ROWS: every file-level manifest entry must exist on disk
 *      or be gitignored-by-design (the documented not-tracked datasets), or
 *      appear in the ALLOWED_ABSENT list below.
 *   3. LEDGER HONESTY: every ledger attribution must name a script that
 *      still exists.
 *
 * Runs as `npm run check:data`, inside `npm run check`, in CI, and as a
 * gate in the tools/verify suite.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

// Documented-absent manifest entries: rows whose file is legitimately not on
// disk AND not gitignored, each justified in PROVENANCE.md itself.
const ALLOWED_ABSENT = new Set([
  'nbody_cache_50myr_backward.npz',   // "not committed and not present" — regenerate before use
  'rahmstorf-2015-amoc-index.txt',    // "Removed as unused" section
]);

const SELF_DESCRIBING = ['meta', '_meta', 'inputs', '_description', 'generated_by', 'generator', '_generator', 'source_script'];

function isGitIgnored(rel) {
  try { execFileSync('git', ['check-ignore', '-q', rel], { cwd: ROOT }); return true; }
  catch { return false; }
}

async function main() {
  const { parseProvenanceManifest, generatedLedger } = await import(
    path.join(ROOT, 'packages', 'data', 'src', 'index.js'));
  const manifest = parseProvenanceManifest();
  const ledger = generatedLedger();
  const entries = new Set(manifest.entries);
  const hasJsonCatchAll = entries.has('*.json');

  const tracked = execFileSync('git', ['ls-files', 'data/'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').map((f) => f.replace(/^data\//, ''));

  const failures = [];
  let covered = 0;

  // Rule 1 — coverage of every tracked file.
  for (const rel of tracked) {
    if (rel === 'PROVENANCE.md') continue;
    if (entries.has(rel)) { covered++; continue; }
    if (manifest.dirPrefixes.some((d) => rel.startsWith(d))) { covered++; continue; }
    if (rel.endsWith('.json') && hasJsonCatchAll) {
      let doc = null;
      try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', rel), 'utf8')); } catch { /* unreadable → fall through */ }
      const selfDescribing = doc && typeof doc === 'object' && !Array.isArray(doc)
        && SELF_DESCRIBING.some((k) => k in doc);
      if (selfDescribing || rel in ledger) { covered++; continue; }
      failures.push(`data/${rel}: generated JSON with NO readable meta/inputs block and NO ledger entry — make it self-describing or add it to packages/data/src/generated-ledger.json (note: Python-written files with bare NaN/Infinity do not parse as strict JSON and must be ledgered)`);
      continue;
    }
    failures.push(`data/${rel}: tracked file with NO manifest entry — add a PROVENANCE.md row first (its own maintenance rule)`);
  }

  // Rule 2 — no dangling manifest rows.
  for (const rel of manifest.entries) {
    if (rel === '*.json') continue;
    const abs = path.join(ROOT, 'data', rel);
    if (fs.existsSync(abs)) continue;
    if (isGitIgnored(`data/${rel}`)) continue;   // documented not-tracked dataset, absent here
    if (ALLOWED_ABSENT.has(rel)) continue;
    failures.push(`PROVENANCE.md names data/${rel} but it does not exist, is not gitignored, and is not in ALLOWED_ABSENT`);
  }

  // Rule 3 — ledger attributions point at real scripts.
  for (const [file, script] of Object.entries(ledger)) {
    if (!fs.existsSync(path.join(ROOT, script))) {
      failures.push(`generated-ledger: ${file} attributed to ${script}, which does not exist`);
    }
  }

  console.log(`data provenance — ${tracked.length} tracked files · ${covered} covered · ${manifest.entries.length} manifest entries · ${Object.keys(ledger).length} ledgered artifacts`);
  if (failures.length) {
    for (const f of failures) console.error(`  FAIL ${f}`);
    console.error(`FAIL — ${failures.length} provenance violation(s).`);
    process.exit(1);
  }
  console.log('PASS — every tracked dataset is manifest-covered; no dangling rows; ledger honest.');
}

main().catch((e) => { console.error(e); process.exit(1); });
