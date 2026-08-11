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
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'physics', 'package.json'), 'utf8'));
const mv = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'input', 'model-version.json'), 'utf8'));

const failures = [];
if (!pkg.essrt || pkg.essrt.modelVersion !== mv.modelVersion) {
  failures.push(`pairing broken: package essrt.modelVersion=${pkg.essrt && pkg.essrt.modelVersion} vs model-version.json=${mv.modelVersion} — a refit/structural change must update BOTH (and bump the package version)`);
}
if (!/^[1-9]\d*\.\d+\.\d+$/.test(pkg.version)) {
  failures.push(`package version "${pkg.version}" is not MAJOR.MINOR.PATCH semver ≥ 1.0.0`);
}
if (pkg.private) {
  failures.push('packages/physics is marked private — it is the published artefact');
}

console.log(`version pinning — @essrt/physics ${pkg.version} ships model ${mv.modelVersion}`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('PASS — package/model version pairing holds.');
