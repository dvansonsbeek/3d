/**
 * Replace a large embedded literal in `src/script.js` with an import from the
 * generated coefficients module — but ONLY when the two are bit-identical.
 *
 *   node tools/constants/migrate-script-blocks.mjs           dry run, all blocks
 *   node tools/constants/migrate-script-blocks.mjs --write    apply
 *   node tools/constants/migrate-script-blocks.mjs PREDICT_COEFFS --write
 *
 * WHY A TOOL AND NOT HAND EDITS. `PREDICT_COEFFS` is 416 KB of embedded numbers;
 * `CLIMATE_FORMULA_COEFFS` is another 51 KB. A hand edit means reproducing that
 * verbatim, which is both unreviewable and the easiest possible way to introduce
 * a silent one-digit change in a coefficient nobody will ever read. Reviewing
 * this file once is a better use of attention than reviewing a 400 KB diff.
 *
 * THE SAFETY PROPERTY. Every block is compared value-by-value against the
 * generated module BEFORE anything is written, using Object.is. If a single
 * number differs the tool REFUSES that block and prints the mismatch. It can
 * therefore never silently adopt a different value — which matters, because the
 * predecessor (export-to-script.js) did exactly that: its formatters rounded
 * three fitted arrays to 6 decimals and zeroed two coefficients outright.
 *
 * Deliberate value CHANGES are not this tool's job. Those three arrays were
 * migrated by hand, with the measured cost recorded at the call site.
 *
 * Phase 8 dissolves script.js and will need this same verified-excision step
 * repeatedly, so the tool outlives Phase 5.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = join(ROOT, 'src/script.js');

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** JSON stores planet keys lowercase; script.js capitalises them. */
const capKeys = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [cap(k), v]));

/**
 * Each entry: the script.js identifier, where the value comes from in the
 * generated module, and any reshape needed to make the two comparable.
 *
 * `expr` is what replaces the literal. It must evaluate to something
 * value-identical to `expected` — the tool proves that before writing.
 */
const BLOCKS = [
  {
    name: 'PARALLAX_DEC_CORRECTION',
    expected: (fit) => capKeys(fit.PARALLAX_DEC_CORRECTION),
    expr: 'capitalisePlanetKeys(FIT.PARALLAX_DEC_CORRECTION)',
    note: 'JSON keys are lowercase; script.js uses Mercury/Venus/...',
  },
  {
    name: 'PARALLAX_RA_CORRECTION',
    expected: (fit) => capKeys(fit.PARALLAX_RA_CORRECTION),
    expr: 'capitalisePlanetKeys(FIT.PARALLAX_RA_CORRECTION)',
  },
  {
    name: 'GRAVITATION_CORRECTION',
    expected: (fit) => capKeys(fit.GRAVITATION_CORRECTION),
    expr: 'capitalisePlanetKeys(FIT.GRAVITATION_CORRECTION)',
  },
  {
    name: 'ELONGATION_CORRECTION',
    expected: (fit) => capKeys(fit.ELONGATION_CORRECTION),
    expr: 'capitalisePlanetKeys(FIT.ELONGATION_CORRECTION)',
  },
];

// ── locate a top-level `const NAME = {…};` / `[…];` block by brace depth ──────
function findBlock(src, name) {
  const re = new RegExp(`^const ${name} = ([{[])`, 'm');
  const m = src.match(re);
  if (!m) return null;
  const start = m.index;
  const open = m[1];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = null;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (inStr) { if (c === inStr && src[i - 1] !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) {
        const semi = src.indexOf(';', i);
        return { start, end: semi + 1, literal: src.slice(src.indexOf(open, start), i + 1) };
      }
    }
  }
  return null;
}

/** Deep Object.is comparison; returns the first differing path, or null. */
function firstDifference(a, b, path = '') {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return `${path}: array vs non-array`;
    if (a.length !== b.length) return `${path}: length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i += 1) {
      const d = firstDifference(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) {
      const only = ka.filter((k) => !kb.includes(k)).concat(kb.filter((k) => !ka.includes(k)));
      return `${path}: key mismatch (${only.slice(0, 4).join(', ')})`;
    }
    for (const k of ka) {
      const d = firstDifference(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return Object.is(a, b) ? null : `${path}: ${a} vs ${b}`;
}

// ── run ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const write = argv.includes('--write');
const only = argv.find((a) => !a.startsWith('--'));

const fit = (await import(join(ROOT, 'packages/physics/src/constants/coefficients.js')))
  .FITTED_COEFFICIENTS;

let src = readFileSync(SCRIPT, 'utf8');
const targets = only ? BLOCKS.filter((b) => b.name === only) : BLOCKS;
if (only && !targets.length) {
  console.error(`Unknown block "${only}". Known: ${BLOCKS.map((b) => b.name).join(', ')}`);
  process.exit(1);
}

console.log('MIGRATE EMBEDDED BLOCKS -> generated imports');
console.log('='.repeat(78));

let applied = 0;
let refused = 0;
let absent = 0;

for (const block of targets) {
  const found = findBlock(src, block.name);
  if (!found) {
    console.log(`  ${block.name.padEnd(26)} not a top-level literal (already migrated?)`);
    absent += 1;
    continue;
  }

  let embedded;
  try {
    // eslint-disable-next-line no-new-func
    embedded = new Function(`return ${found.literal}`)();
  } catch (e) {
    console.log(`  ${block.name.padEnd(26)} REFUSED — literal references identifiers (${e.message})`);
    refused += 1;
    continue;
  }

  const expected = block.expected(fit);
  const diff = firstDifference(embedded, expected);
  if (diff) {
    console.log(`  ${block.name.padEnd(26)} REFUSED — embedded value differs from the generated module`);
    console.log(`      ${diff}`);
    console.log('      Migrating would CHANGE behaviour. Decide deliberately and edit by hand.');
    refused += 1;
    continue;
  }

  const kb = (found.end - found.start) / 1024;
  console.log(`  ${block.name.padEnd(26)} bit-identical (${kb.toFixed(1)} KB) -> ${block.expr}`);
  if (block.note) console.log(`      ${block.note}`);

  if (write) {
    src = src.slice(0, found.start)
      + `const ${block.name} = ${block.expr};`
      + src.slice(found.end);
    applied += 1;
  }
}

if (write && applied) {
  writeFileSync(SCRIPT, src);
  console.log(`\nWROTE ${applied} block(s) to src/script.js.`);
  console.log('Rebuild and run the golden masters — the values are proven identical,');
  console.log('but the import wiring is not proven until the page runs.');
} else if (!write) {
  console.log('\n(dry run — add --write to apply)');
}

console.log(`\n${targets.length} target(s): ${applied || (write ? 0 : targets.length - refused - absent)} migratable · ${refused} refused · ${absent} absent`);
if (refused) process.exit(1);
