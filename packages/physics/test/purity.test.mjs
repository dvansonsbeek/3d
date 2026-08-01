#!/usr/bin/env node
/**
 * Purity test — import every physics module with the platform removed.
 *
 * §8 calls purity a non-functional requirement, not a style preference: it is
 * what makes horizontal scale, offline bundling and determinism free. A single
 * accidental `document` or `process` reference at module scope breaks all three,
 * and no unit test would notice — the module still works in the environment the
 * test happens to run in.
 *
 * So: delete the globals, then import. If a module reads one while evaluating,
 * it throws here rather than at 3am in a Node process that has no DOM.
 *
 * ESLint's no-restricted-globals catches the ones written literally. This
 * catches the ones reached dynamically — globalThis['doc' + 'ument'], a
 * transitive import, a bundler shim — which the linter cannot see.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const PHYSICS = new URL('../src/', import.meta.url).pathname;
const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');

/** Globals that must not exist for a physics module to evaluate. */
const FORBIDDEN = ['document', 'window', 'localStorage', 'sessionStorage', 'navigator', 'fetch', 'XMLHttpRequest'];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.m?js$/.test(p)) out.push(p);
  }
  return out;
}

// Strip the platform. `process` cannot be deleted without breaking the module
// loader itself, so it is left in place — ESLint covers the literal case.
/** @type {Record<string, unknown>} */
const saved = {};
for (const g of FORBIDDEN) {
  saved[g] = /** @type {any} */ (globalThis)[g];
  delete (/** @type {any} */ (globalThis))[g];
}

const files = walk(PHYSICS);
/** @type {string[]} */
const failures = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  try {
    await import(pathToFileURL(file).href);
  } catch (err) {
    failures.push(`${rel}\n    ${err instanceof Error ? err.message : String(err)}`);
  }
}

for (const g of FORBIDDEN) {
  if (saved[g] !== undefined) (/** @type {any} */ (globalThis))[g] = saved[g];
}

const label = 'purity (physics evaluates with no platform)';
if (failures.length) {
  console.error(`\n✗ ${label} — ${failures.length} module(s) failed\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}
console.log(`✓ ${label}: ${files.length} module(s) imported with ${FORBIDDEN.length} globals removed`);
