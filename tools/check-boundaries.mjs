#!/usr/bin/env node
/**
 * check-boundaries — the §2h licensing invariant, as a check.
 *
 * WHY THIS EXISTS
 *   Three GPL components live in this repo (NOTICE): The TYCHOSIUM's
 *   scene-graph scaffold, ytliu0/ElpMpp02, and REBOUND. All are fine here — the
 *   repository is AGPL-3.0 and GPLv3 §13 permits the combination.
 *
 *   They are NOT fine inside packages/physics. That package is the one that can
 *   be licensed commercially (§14.6), and commercial terms cannot be granted
 *   over code we do not own. Everything downstream of physics inherits whatever
 *   physics contains.
 *
 *   ESLint cannot express this: the scene-graph rule is about identifiers rather
 *   than imports, and the GPL rule is about provenance rather than module graph.
 *
 * WHAT IT CATCHES
 *   1. Tychosium scene-graph schema names appearing anywhere in packages/physics
 *   2. Any import from packages/physics reaching a GPL-derived module
 *
 * The plan's Phase 8.2 originally listed elp-mpp02 among the Moon code to
 * extract into physics. It is a reference evaluator used only by tools/explore,
 * and it is GPL-derived. This check is what makes that mistake impossible rather
 * than merely documented.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PHYSICS = join(ROOT, 'packages/physics');

/** Tychosium settings-object schema — the inherited scaffold (§2h). */
const SCHEMA_NAMES = [
  'containerObj', 'pivotObj', 'planetObj',
  'orbitCentera', 'orbitCenterb', 'orbitCenterc',
  'orbitTilta', 'orbitTiltb',
  'startPos',
];

/** Modules whose provenance is GPL. Never reachable from physics. */
const GPL_DERIVED = [
  { match: /elp-mpp02/i,  what: 'ytliu0/ElpMpp02 (GPL-3.0) — reference evaluator, belongs in research' },
  { match: /elp2000-82b/i, what: 'ELP-2000/82B evaluator — reference material, not framework physics' },
  { match: /\brebound\b/i, what: 'REBOUND (GPL) — N-body integrator, analysis only' },
];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs|cjs)$/.test(p)) out.push(p);
  }
  return out;
}

const files = walk(PHYSICS);
/** @type {string[]} */
const failures = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');

  // Strip comments so the invariant can be *described* in a header without
  // tripping its own check — this file and physics/src/index.js both name the
  // schema in prose.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  for (const name of SCHEMA_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(code)) {
      failures.push(
        `${rel}\n    Tychosium scene-graph schema "${name}" in packages/physics.\n` +
        '    That scaffold is GPL-derived and belongs to packages/simulator (§2h).',
      );
    }
  }

  for (const m of code.matchAll(/(?:from|require\()\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    for (const { match, what } of GPL_DERIVED) {
      if (match.test(spec)) {
        failures.push(
          `${rel}\n    imports "${spec}" — ${what}.\n` +
          '    Nothing GPL-derived may be reachable from physics (§2h, §14.6).',
        );
      }
    }
  }
}

const label = 'check-boundaries (§2h licensing invariant)';
if (failures.length) {
  console.error(`\n✗ ${label} — ${failures.length} violation(s)\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}
console.log(`✓ ${label}: ${files.length} file(s) in packages/physics, no violations`);
