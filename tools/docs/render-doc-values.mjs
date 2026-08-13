#!/usr/bin/env node
/**
 * MARKDOWN VALUE RENDERER — `<V k="…"/>` semantics for static .md.
 *
 * THE PROBLEM. The website resolves model numbers at build time through MDX
 * and a React `<V>` component. `3d/docs/*.md` has no renderer: GitHub serves
 * the file as-is, and strips unknown tags — a `<V k="H"/>` there would show
 * the reader NOTHING. So the digits must physically be in the file, which is
 * exactly how they go stale (the IAU 2006 refit left 17 sites quoting
 * superseded anchors in four `status: current` docs).
 *
 * THE MECHANISM. GitHub renders HTML comments as invisible. So a comment pair
 * can delimit a machine-owned span while the value sits between them as
 * ordinary text:
 *
 *     The anchor is <!--v:usnoLodJ2000-->86400.0017<!--/v--> s.
 *
 * A reader sees "The anchor is 86400.0017 s." — markers invisible, number
 * present. This tool owns what sits between them.
 *
 *   --write   rewrite every marked span from the registry
 *   --check   fail if rewriting would change anything (the CI mode)
 *
 * Values come from tools/docs/model-values.mjs — the registry the website
 * will share once it imports the published package (§2i, Phases 20/21).
 * Everything the renderer knows about a number comes from there; this file
 * knows only how to find and replace spans.
 *
 * WHY NOT JUST CHECK. A checker reports staleness and leaves a human to fix
 * each site by hand — and hand-fixing derived numbers is how errors get in.
 * --write fixes every site correctly in one pass; --check makes recurrence
 * impossible. Same CI guarantee, plus the correction.
 *
 * ONE PLACEMENT RULE. A marker may NOT sit inside a backtick code span:
 * markdown renders code spans literally, so the comment would appear to the
 * reader as `<!--v:key-->`. Put the value outside the span —
 *     `usno_target_lod_s` = <!--v:usnoLodJ2000-->86400.0017<!--/v-->
 * not
 *     `usno_target_lod_s = <!--v:usnoLodJ2000-->86400.0017<!--/v-->`
 * The same applies inside fenced code blocks and ASCII-art diagrams; those
 * need the block form (regenerate the whole fence) or stay manual.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAll, VALUES } from './model-values.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'docs');
const WRITE = process.argv.includes('--write');

// <!--v:KEY-->  anything  <!--/v-->
const SPAN = /<!--v:([A-Za-z0-9_]+)-->([\s\S]*?)<!--\/v-->/g;

const values = resolveAll();

const changed = [];      // spans whose text does not match the registry
const unknown = [];      // spans naming a key the registry does not define
let spansSeen = 0;
let filesTouched = 0;

const targets = [
  // The repo README quotes the same refit-mobile numbers as the doc tree and
  // is the most public page of all — it is marker-managed like docs/.
  join(ROOT, 'README.md'),
  ...readdirSync(DOCS).filter(f => f.endsWith('.md')).sort().map(f => join(DOCS, f)),
];
for (const path of targets) {
  const rel = relative(ROOT, path);
  const src = readFileSync(path, 'utf8');
  let dirty = false;

  const next = src.replace(SPAN, (whole, key, current) => {
    spansSeen++;
    if (!values.has(key)) {
      unknown.push({ file: rel, key });
      return whole;                       // never blank an unknown key
    }
    const want = values.get(key);
    if (current === want) return whole;
    changed.push({ file: rel, key, from: current, to: want });
    dirty = true;
    return `<!--v:${key}-->${want}<!--/v-->`;
  });

  if (dirty && WRITE) { writeFileSync(path, next); filesTouched++; }
}

const line = '='.repeat(74);
console.log(line);
console.log('  DOC VALUE RENDERER  (markdown spans owned by the model)');
console.log(line);
console.log(`  ${spansSeen} marked span(s) across docs/ · ${values.size} keys in the registry`);

if (unknown.length) {
  console.log(`\n  ${unknown.length} span(s) naming an UNKNOWN key:`);
  for (const u of unknown) console.log(`    ${u.file}: v:${u.key}`);
  console.log('    -> add it to tools/docs/model-values.mjs with a get() that DERIVES it,');
  console.log('       or fix the typo. A key that cannot be derived outside the browser');
  console.log('       must not be marked — see NOT_DERIVABLE in the registry.');
}

if (WRITE) {
  console.log(`\n  ✓ ${changed.length} span(s) rewritten across ${filesTouched} file(s)`);
  for (const c of changed.slice(0, 20)) {
    console.log(`    ${c.file}  v:${c.key}  ${c.from} -> ${c.to}`);
  }
  if (unknown.length) process.exit(1);
  console.log(`\n${line}`);
  process.exit(0);
}

// ── DOI consistency (single source: model-version.json → preprintDoi key) ──
// Markdown link URLs cannot carry markers (an HTML comment inside the URL
// breaks the link), so every doi.org mention in the outward-facing files is
// CHECKED against the canonical DOI instead. Change the DOI in ONE place —
// model-version.json — and this gate lists every file still carrying the old.
const canonicalDoi = values.get('preprintDoi');
// Only police OUR preprint's DOI (any /vN vintage of it) — citation DOIs of
// other papers are supposed to differ and pass untouched.
const doiRoot = canonicalDoi.replace(/\/v\d+$/, '');
const doiMismatches = [];
const DOI_FILES = [
  'README.md', 'CITATION.cff', 'CLAUDE.md', 'src/script.js',
  'packages/physics/README.md', 'packages/model-values/README.md',
  ...targets.map((p) => relative(ROOT, p)),
];
for (const rel of [...new Set(DOI_FILES)]) {
  let src;
  try { src = readFileSync(join(ROOT, rel), 'utf8'); } catch { continue; }
  for (const m of src.matchAll(/doi\.org\/([^\s)\]'"<>,;]+)/g)) {
    const found = m[1].replace(/[.,]$/, '');
    if (found.startsWith(doiRoot) && found !== canonicalDoi) doiMismatches.push({ file: rel, found });
  }
}
if (doiMismatches.length) {
  console.log(`\n  ${doiMismatches.length} DOI mismatch(es) vs model-version.json (${canonicalDoi}):`);
  for (const d of doiMismatches) console.log(`    ${d.file}: doi.org/${d.found}`);
}

if (changed.length) {
  console.log(`\n  ${changed.length} STALE span(s) — the doc disagrees with the model:`);
  for (const c of changed.slice(0, 25)) {
    console.log(`    ${c.file}  v:${c.key}`);
    console.log(`       doc says ${c.from}   model says ${c.to}`);
  }
  console.log('\n    -> node tools/docs/render-doc-values.mjs --write');
}

console.log(`\n${line}`);
if (changed.length || unknown.length || doiMismatches.length) {
  console.log(`FAIL — ${changed.length} stale, ${unknown.length} unknown key(s), ${doiMismatches.length} DOI mismatch(es).`);
  console.log(line);
  process.exit(1);
}
console.log('PASS — every marked value matches the model.');
console.log(line);
