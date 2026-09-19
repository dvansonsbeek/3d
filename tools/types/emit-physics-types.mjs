#!/usr/bin/env node
/**
 * @essrt/physics type declarations — GENERATED from the package's own JSDoc.
 *
 *   node tools/types/emit-physics-types.mjs           freshness check (default)
 *   node tools/types/emit-physics-types.mjs --write   regenerate packages/physics/types/
 *
 * The package stays JavaScript (Phase 0 decision 2: JSDoc + checkJs, no build
 * step). TypeScript consumers — the website adapter, anyone on npm — need
 * declaration files, and hand-written ambient shims drift the moment a
 * signature moves (the website carried two such shims through 4.3.0 → 4.8.0).
 * So the declarations are EMITTED by tsc from the annotated sources, one
 * `.d.ts`/`.d.cts` per export-map entry point plus everything they reach,
 * into `packages/physics/types/` (mirrors `src/`; the manifest's `types`
 * field and the per-subpath `types` conditions point there). The entry
 * points are read from package.json `exports` so a new subpath export is
 * typed automatically — a hand-kept list would miss it.
 *
 * Default mode emits into a temp dir and diffs against the committed tree,
 * failing with the regeneration command on any drift — the same
 * generator-owned + freshness-gate discipline as the constants and the
 * model-values package. Wired into `npm run typecheck`.
 */

import { readFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG_DIR = join(ROOT, 'packages', 'physics');
const SRC_DIR = join(PKG_DIR, 'src');
const OUT_DIR = join(PKG_DIR, 'types');
const WRITE = process.argv.includes('--write');

const pkg = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
/** Entry points = every export-map target (string or {default}). */
const entryFiles = Object.values(pkg.exports).map((v) => {
  const target = typeof v === 'string' ? v : v.default;
  return join(PKG_DIR, target);
});

/** @param {string} dir @returns {string[]} relative paths of every declaration file */
function walk(dir, base = dir) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, base));
    else if (/\.d\.c?ts$/.test(e)) out.push(relative(base, p));
  }
  return out.sort();
}

/** @param {string} outDir */
function emit(outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const args = [
    join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--declaration', '--emitDeclarationOnly',
    '--allowJs', '--checkJs', 'false',
    '--module', 'nodenext', '--moduleResolution', 'nodenext',
    '--target', 'es2022', '--skipLibCheck',
    '--rootDir', SRC_DIR, '--outDir', outDir,
    ...entryFiles,
  ];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write(r.stdout + r.stderr);
    throw new Error(`tsc declaration emit failed (exit ${r.status})`);
  }
  // The constants and coefficients declarations are generated separately
  // (tools/constants/generate.mjs writes generated.d.ts + coefficients.d.ts
  // beside their .js); tsc does not re-emit an existing .d.ts, so the
  // emitted constants/index.d.ts would dangle without sibling copies.
  for (const f of readdirSync(join(SRC_DIR, 'constants'))) {
    if (/\.d\.ts$/.test(f)) copyFileSync(join(SRC_DIR, 'constants', f), join(outDir, 'constants', f));
  }
}

if (WRITE) {
  emit(OUT_DIR);
  const files = walk(OUT_DIR);
  console.log(`emit-physics-types: wrote ${files.length} declaration file(s) → packages/physics/types/ (${entryFiles.length} entry points)`);
  process.exit(0);
}

const tmp = join(tmpdir(), `essrt-physics-types-${process.pid}`);
try {
  emit(tmp);
  const fresh = walk(tmp);
  const committed = walk(OUT_DIR);
  /** @type {string[]} */
  const drift = [];
  for (const f of new Set([...fresh, ...committed])) {
    const a = existsSync(join(tmp, f)) ? readFileSync(join(tmp, f), 'utf8') : null;
    const b = existsSync(join(OUT_DIR, f)) ? readFileSync(join(OUT_DIR, f), 'utf8') : null;
    if (a !== b) drift.push(f + (a === null ? ' (stale — no longer emitted)' : b === null ? ' (missing)' : ' (changed)'));
  }
  if (drift.length) {
    console.error(`FAIL emit-physics-types: packages/physics/types/ is stale (${drift.length} file(s)):`);
    for (const d of drift.slice(0, 20)) console.error('  ' + d);
    console.error('  regenerate: node tools/types/emit-physics-types.mjs --write');
    process.exit(1);
  }
  console.log(`PASS emit-physics-types: packages/physics/types/ ≡ JSDoc emit (${fresh.length} files, ${entryFiles.length} entry points)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
