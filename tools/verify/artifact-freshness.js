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
const { ROOT, hashFile } = require('../lib/artifact-inputs');

// Artifacts that MUST carry an inputs block (grows with generator adoption —
// see the plan's §12h follow-up list for the queue: LOD-climate correlation,
// the eclipse-audit campaigns, the AMD α-scan once its method is recovered).
const REQUIRED = [
  // stamped in Phase 1:
  'data/planet-prediction-fit-stats.json',
  'data/cassini-moontilt-results.json',
  // stamped in Phase 2:
  'data/lod-climate-correlation-summary.json',
  // stamped in Phase 3 (lunar/solar sections; audit26/babylon135 still hand-recorded):
  'data/eclipse-audit-summary.json',
];

const DATA = path.join(ROOT, 'data');
let checked = 0;
let failures = [];

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
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  STALE  ${f}`);
  console.log(`\nFAIL — ${failures.length} staleness issue(s). Run the named generator(s), then re-check.`);
  console.log(line);
  process.exit(1);
}
console.log('PASS — every governed artifact matches its recorded inputs.');
console.log(line);
