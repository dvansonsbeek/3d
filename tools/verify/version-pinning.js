#!/usr/bin/env node
/**
 * VERSION-PINNING GATE (Phase 13 — publish @essrt/physics)
 * =========================================================
 *
 * The package versions on the API axis (semver); the MODEL identity rides
 * inside each published version (§10). This gate enforces the pairing:
 *
 *   1. packages/physics/package.json → essrt.modelVersion must equal
 *      public/input/model-version.json → modelVersion (the pairing the
 *      README promises consumers).
 *   2. The package version must be valid MAJOR.MINOR.PATCH semver ≥ 1.0.0
 *      and the package must not be marked private (it is the published
 *      reproducibility artefact).
 *
 * Fail-proven on a planted modelVersion mismatch.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const mv = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'input', 'model-version.json'), 'utf8'));

const failures = [];
const versions = [];
for (const name of ['physics', 'model-values']) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', name, 'package.json'), 'utf8'));
  versions.push(`@essrt/${name} ${pkg.version}`);
  if (!pkg.essrt || pkg.essrt.modelVersion !== mv.modelVersion) {
    failures.push(`${name}: pairing broken — essrt.modelVersion=${pkg.essrt && pkg.essrt.modelVersion} vs model-version.json=${mv.modelVersion}; a refit/structural change must update BOTH (and bump the package version)`);
  }
  if (!/^[1-9]\d*\.\d+\.\d+$/.test(pkg.version)) {
    failures.push(`${name}: version "${pkg.version}" is not MAJOR.MINOR.PATCH semver ≥ 1.0.0`);
  }
  if (pkg.private) {
    failures.push(`packages/${name} is marked private — it is a published artefact`);
  }
}
// The packaged values must also carry the CURRENT model identity.
const gen = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'model-values', 'src', 'model-values.generated.json'), 'utf8'));
if (gen._meta.modelVersion !== mv.modelVersion) {
  failures.push(`model-values.generated.json ships ${gen._meta.modelVersion} vs model-version.json ${mv.modelVersion} — regenerate: npm run values:package:write`);
}

console.log(`version pinning — ${versions.join(' · ')} ship model ${mv.modelVersion}`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('PASS — package/model version pairing holds.');
