#!/usr/bin/env node
/**
 * CAMPAIGN-ARTIFACT FRESHNESS GATE (§12h follow-up work, Phase 1)
 * ================================================================
 *
 * THE PROBLEM. The model-values registry derives doc/website numbers from
 * generated campaign artifacts in data/. Their generators range from
 * seconds (Cassini labs) to many minutes (eclipse sweeps, the 319 MB
 * prediction evaluation), so they cannot run on every `npm run check` —
 * which historically meant an input could move (a refit, a constants
 * change, an edited generator) while the artifact silently kept the old
 * numbers. Eleven website defects found during the §12h parity port were
 * exactly this staleness class.
 *
 * THE MECHANISM. Every governed artifact records an `inputs` block —
 * sha256 of each input file INCLUDING the generator script itself (see
 * tools/lib/artifact-inputs.js). This gate re-hashes those paths (~ms) and
 * FAILS naming the exact regeneration command when anything moved. The
 * expensive computation never runs here; only the fingerprint comparison.
 *
 * GOVERNED SET. Every data/*.json with a top-level `inputs` block is
 * checked automatically. Artifacts listed in REQUIRED must carry the block
 * — so a governed artifact cannot silently drop out of governance by
 * deleting its stamp. Adoption grows by adding to REQUIRED as generators
 * gain `--write` stamping.
 *
 * Exit 1 on: missing required block, missing input file, hash mismatch.
 * This gate has been fail-proven on a planted hash mismatch.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, hashFile } = require('../lib/artifact-inputs');

// A recorded input that is MISSING is only a failure when git tracks it.
// Gitignored datasets (the 319 MB xlsx, the 166 MB CSV class) are absent in
// a clean checkout / CI by design — there the hash is UNVERIFIABLE, not
// stale: we skip with a note, and any machine that has the file still gets
// full drift detection.
function isGitIgnored(relPath) {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], { cwd: ROOT });
    return true;   // exit 0 → ignored
  } catch {
    return false;  // exit 1 → not ignored (or not a repo — treat as tracked)
  }
}

// Artifacts that MUST carry an inputs block (grows with generator adoption —
// see the plan's §12h follow-up list for the queue: LOD-climate correlation,
// the eclipse-audit campaigns, the AMD α-scan once its method is recovered).
const REQUIRED = [
  // stamped in Phase 1:
  'data/cassini-moontilt-results.json',
  // stamped in Phase 2:
  'data/lod-climate-correlation-summary.json',
  // stamped in Phase 3 (lunar/solar sections; audit26/babylon135 still hand-recorded):
  'data/eclipse-audit-summary.json',
  // stamped at Batch D of the restatement (engine-D secular frequencies):
  'data/nbody-secular-frequencies.json',
  // plan 06 layer B — the eclipse Sun's derived mean-element offset:
  'data/earth-osculating-mean-offset.json',
  // plan 06 I1 — the Sun and the cardinal instants against the ±3000-yr Horizons TT cache:
  'data/sun-vs-horizons-summary.json',
];

// Artifacts STALE BY CONSTRUCTION (plan 06 R3 item 1 cleanup, owner-checked):
// their inputs block is kept as the record, but a freshness re-stamp would
// certify a claim the model no longer makes, so the gate reports them as
// NOTES and does not ask for regeneration. Each entry names the reason; the
// way out is a re-derivation on current inputs or a retirement (R4), never a
// re-stamp.
const STALE_BY_CONSTRUCTION = {
  // (data/planet-prediction-fit-stats.json sat here from plan 06 R3 — it scored
  // the PREDICT_COEFFS_PHYSICAL arrays against a Step-3 export of the RETIRED
  // geometric planet path — until R8 retired the device and deleted the artifact.)
};

const DATA = path.join(ROOT, 'data');
let checked = 0;
let notes = [];
let failures = [];
let skipped = [];

const artifacts = fs.readdirSync(DATA).filter((f) => f.endsWith('.json'));
const governed = new Set(REQUIRED);
for (const f of artifacts) {
  const rel = `data/${f}`;
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  } catch {
    continue;   // non-object or unreadable — other gates own JSON validity
  }
  // Only OUR schema governs: inputs = { generator: string, files: {path: hash} }.
  // (Other artifacts legitimately use an `inputs` key for their own purposes,
  // e.g. data/moon-precession-derivation.json's derivation-inputs listing.)
  const inp = doc && typeof doc === 'object' ? doc.inputs : null;
  if (inp && typeof inp.generator === 'string' && inp.files && typeof inp.files === 'object') {
    governed.add(rel);
  }
}

for (const rel of [...governed].sort()) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: governed artifact is MISSING`);
    continue;
  }
  if (STALE_BY_CONSTRUCTION[rel]) {
    notes.push(`${rel}: STALE BY CONSTRUCTION — ${STALE_BY_CONSTRUCTION[rel]}`);
    continue;
  }
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const inputs = doc.inputs;
  if (!inputs || !inputs.files) {
    failures.push(`${rel}: REQUIRED artifact has no inputs block — its generator must stamp it (tools/lib/artifact-inputs.js)`);
    continue;
  }
  for (const [inputRel, recorded] of Object.entries(inputs.files)) {
    checked++;
    let current;
    try {
      current = hashFile(inputRel);
    } catch {
      if (isGitIgnored(inputRel)) {
        skipped.push(`${rel}: input ${inputRel} is a gitignored dataset absent here — hash unverifiable, skipped`);
        continue;
      }
      failures.push(`${rel}: input ${inputRel} no longer exists — regenerate: ${inputs.generator}`);
      continue;
    }
    if (current !== recorded) {
      failures.push(`${rel}: input ${inputRel} CHANGED since generation — regenerate: ${inputs.generator}`);
    }
  }
}

const line = '='.repeat(74);
console.log(line);
console.log('  ARTIFACT FRESHNESS  (campaign artifacts vs their recorded inputs)');
console.log(line);
console.log(`  ${governed.size} governed artifact(s) · ${checked} input hash(es) verified`);
for (const s of skipped) console.log(`  SKIP   ${s}`);
for (const n of notes) console.log(`  NOTE   ${n}`);
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  STALE  ${f}`);
  console.log(`\nFAIL — ${failures.length} staleness issue(s). Run the named generator(s), then re-check.`);
  console.log(line);
  process.exit(1);
}
console.log('PASS — every governed artifact matches its recorded inputs.');
console.log(line);
