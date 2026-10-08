#!/usr/bin/env node
/**
 * PYTHON IMPORT SMOKE GATE (plan 07 §9k item 7).
 *
 * THE FINDING. `tools/lib/python/constants_scripts.py` — the one bridge every
 * Python analysis reads the model through — had been UNIMPORTABLE for months
 * (a KeyError on a key that v14.0 retired), and nothing reported it: the only
 * Python gate (check-python-physics) ledgers hardcoded constants by reading
 * the files as text, so it never imports anything. Every analysis in
 * scripts/ was unrunnable and no gate went red (plan 07 §9f).
 *
 * THREE STAGES, cheapest first, each on its own evidence:
 *   A  SYNTAX — `ast.parse` every .py under scripts/, tools/lib/python and
 *      tools/fit/python. Stdlib only, so it always runs (CI included).
 *   B  THE BRIDGE — import constants_scripts, planet_beats and
 *      predictive_formula in a subprocess. Stdlib only (the constants are
 *      loaded through load_constants' JSON read); always runs. THIS is the
 *      stage that would have caught the months-long rot.
 *   C  THE SCRIPTS — import every scripts/*.py as a module (main guards keep
 *      them from running) in one interpreter, ~8 s with the analysis
 *      environment installed. When numpy/scipy are absent (CI's runner) the
 *      stage reports SKIP, not PASS, and says so. A missing THIRD-PARTY module
 *      skips that script; a missing repo-local module, a KeyError, a
 *      SystemExit or any other import-time error FAILS.
 *
 * FAIL-PROOF: ESSRT_PY_SMOKE_PLANT=1 plants one fake stage-C failure.
 *
 * Usage:  node tools/check-python-smoke.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const line = '='.repeat(74);
console.log(line);
console.log('  PYTHON IMPORT SMOKE  (the analysis scripts still import against the model)');
console.log(line);

const PY = process.env.PYTHON || 'python3';
const DIRS = ['scripts', 'tools/lib/python', 'tools/fit/python'];
const files = [];
for (const d of DIRS) {
  const abs = join(ROOT, d);
  for (const f of readdirSync(abs)) {
    const p = join(abs, f);
    if (f.endsWith('.py') && statSync(p).isFile()) files.push(p);
  }
}
const failures = [];

// ── A: syntax ─────────────────────────────────────────────────────────────
const parse = spawnSync(PY, ['-c', 'import ast,sys\nbad=0\nfor f in sys.argv[1:]:\n  try: ast.parse(open(f,encoding="utf-8").read(), f)\n  except SyntaxError as e: bad+=1; print(f"{f}: {e}")\nsys.exit(1 if bad else 0)', ...files], { encoding: 'utf-8' });
if (parse.status !== 0) {
  failures.push(`A syntax: ${parse.stdout.trim() || parse.stderr.trim()}`);
  console.log(`  A  syntax     FAIL\n${parse.stdout}`);
} else {
  console.log(`  A  syntax     ${files.length} files parse`);
}

// ── B: the bridge ──────────────────────────────────────────────────────────
const bridge = spawnSync(PY, ['-c', `import sys\nsys.path[:0]=[${JSON.stringify(join(ROOT, 'tools/lib/python'))}, ${JSON.stringify(join(ROOT, 'tools/fit/python'))}]\nimport constants_scripts, planet_beats, predictive_formula\nprint(len([k for k in dir(constants_scripts) if k.isupper()]))`], { encoding: 'utf-8', cwd: ROOT });
if (bridge.status !== 0) {
  failures.push(`B bridge: ${bridge.stderr.trim().split('\n').slice(-1)[0]}`);
  console.log(`  B  bridge     FAIL — constants_scripts / planet_beats / predictive_formula do not import:\n${bridge.stderr}`);
} else {
  console.log(`  B  bridge     constants_scripts + planet_beats + predictive_formula import (${bridge.stdout.trim()} constants)`);
}

// ── C: the scripts ─────────────────────────────────────────────────────────
let c;
try {
  const out = execFileSync(PY, [join(ROOT, 'tools/check-python-smoke.py'), ROOT], { encoding: 'utf-8', cwd: ROOT, env: process.env, maxBuffer: 1 << 24 });
  c = JSON.parse(out.trim().split('\n').pop());
} catch (e) {
  failures.push(`C runner crashed: ${String(e.message).slice(0, 200)}`);
}
if (c) {
  if (c.ok.length + c.fail.length + c.skip.length === 0) {
    console.log(`  C  scripts    SKIP — ${c.env}`);
  } else {
    console.log(`  C  scripts    ${c.ok.length} import · ${c.skip.length} skipped (third-party module absent) · ${c.fail.length} fail · ${c.seconds}s`);
    for (const [n, why] of c.skip) console.log(`       skip ${n}: ${why}`);
    for (const [n, why] of c.fail) { console.log(`       FAIL ${n}: ${why}`); failures.push(`C ${n}: ${why}`); }
  }
}

console.log(line);
if (failures.length) {
  console.log(`FAIL — ${failures.length} finding(s):`);
  for (const f of failures) console.log(`  ${f}`);
  console.log(line);
  process.exit(1);
}
console.log(`PASS — every Python file parses, the bridge imports, and the analysis scripts import${c && c.ok.length ? '' : ' (stage C skipped here)'}.`);
console.log(line);
