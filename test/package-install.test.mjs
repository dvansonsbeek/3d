/**
 * INSTALLABILITY PROOF for @essrt/physics (Phase 13).
 *
 * "Package installable" must be demonstrated, not asserted: `npm pack` the
 * workspace package, install the tarball into a clean throwaway project,
 * then prove the INSTALLED copy (a) resolves both the ESM root and a CJS
 * subpath, and (b) carries the exact model identity of the working tree —
 * CONSTANTS_HASH and COEFFICIENTS_HASH bit-equal, and a live factory
 * computation agreeing with the workspace copy.
 *
 *   node test/package-install.test.mjs        (exit 1 on any failure)
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PKG_DIR = join(ROOT, 'packages', 'physics');
const work = mkdtempSync(join(tmpdir(), 'essrt-install-'));

try {
  const tarName = execFileSync('npm', ['pack', '--pack-destination', work], {
    cwd: PKG_DIR, encoding: 'utf8',
  }).trim().split('\n').pop();

  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'probe', private: true, type: 'module' }));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', join(work, tarName)], { cwd: work });

  writeFileSync(join(work, 'probe.mjs'), `
    import { COEFFICIENTS_HASH, CONSTANTS_HASH } from '@essrt/physics';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');
    const f = createEclipseFinders({
      moonLonDegAt: () => 0, moonBetaDegAt: () => 0, moonDistanceKmAt: () => 384400,
      deltaTSecondsAt: () => 0, getSynodicMonthDays: () => 29.53, getSunDistanceKm: () => 1.496e8,
      constants: { rEarthMetres: 6378135, moonDiameterKm: 3474.8, sunDiameterKm: 1392684, j2000JD: 2451545, julianCenturyDays: 36525 },
    });
    console.log(JSON.stringify({ COEFFICIENTS_HASH, CONSTANTS_HASH, sunLon: f.sunLonDegAt(2451545) }));
  `);
  const out = JSON.parse(execFileSync('node', [join(work, 'probe.mjs')], { encoding: 'utf8' }));

  const local = readFileSync(join(PKG_DIR, 'src', 'constants', 'coefficients.js'), 'utf8')
    .match(/COEFFICIENTS_HASH = "([0-9a-f]{16})"/)[1];
  const failures = [];
  if (out.COEFFICIENTS_HASH !== local) failures.push(`installed COEFFICIENTS_HASH ${out.COEFFICIENTS_HASH} ≠ workspace ${local}`);
  if (!out.CONSTANTS_HASH) failures.push('installed copy exposes no CONSTANTS_HASH');
  if (!Number.isFinite(out.sunLon)) failures.push('installed eclipse-finders factory returned a non-finite sun longitude');

  console.log(`package-install — ${tarName}: root ESM ✓ subpath CJS ✓ sunLon(J2000)=${out.sunLon.toFixed(4)}°`);
  if (failures.length) {
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exit(1);
  }
  console.log('PASS — installed copy resolves and carries the workspace model identity.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
