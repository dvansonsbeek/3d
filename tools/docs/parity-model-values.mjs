#!/usr/bin/env node
/**
 * MODEL-VALUES PARITY HARNESS — the progress meter for §12h.
 *
 * The website ships 853 formatted keys from `src/data/model-values.generated.json`,
 * computed by a 1,690-line `model-values.compute.ts` that imports six
 * WEBSITE-AUTHORED reimplementations of this repo's physics (only
 * `coefficients.ts` is synced from here). Collapsing that duplication is
 * Phase 21's gate; §12h approaches it from this end by re-expressing each key
 * against the ORIGINAL engine in `tools/docs/model-values.mjs`.
 *
 * This harness exists BEFORE the porting, deliberately — the same discipline
 * that made Phases 6-9 safe. It turns a 1,690-line rewrite from "hope it
 * matches" into a measured migration:
 *
 *   MATCH     our string is byte-identical to the website's
 *   DIFFER    both compute the key, the strings disagree  <- the interesting set
 *   MISSING   the website has it, we do not yet           <- the work queue
 *   EXTRA     we have it, the website does not
 *
 * A DIFFER is never to be "fixed" by copying the website's string. It is
 * evidence: either a formatting difference, or a REAL divergence between this
 * engine and the website's parallel port. Finding those is the reason the
 * duplication is worth removing — forcing a match would hide exactly what the
 * exercise is for.
 *
 * NOT A CI GATE. The website is a private repo; this repo's CI cannot read it.
 * This is a local development meter and exits 0 when the website is absent.
 *
 *   node tools/docs/parity-model-values.mjs            summary
 *   node tools/docs/parity-model-values.mjs --differ   list the DIFFER set
 *   node tools/docs/parity-model-values.mjs --missing   list the work queue
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAll } from './model-values.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOLISTIC = process.env.HOLISTIC_ROOT
  || join(ROOT, '..', 'Holistic', 'holisticuniverse');
const REF = join(HOLISTIC, 'src', 'data', 'model-values.generated.json');

const line = '='.repeat(74);
console.log(line);
console.log('  MODEL-VALUES PARITY  (§12h — registry vs the website\'s generated keys)');
console.log(line);

if (!existsSync(REF)) {
  console.log(`  website reference not found at ${REF}`);
  console.log('  (set HOLISTIC_ROOT). Skipping — this is a local meter, not a CI gate.');
  process.exit(0);
}

const theirs = JSON.parse(readFileSync(REF, 'utf8'));
const ours = resolveAll();

const match = [], differ = [], missing = [], extra = [];
for (const [key, theirVal] of Object.entries(theirs)) {
  if (!ours.has(key)) { missing.push(key); continue; }
  const ourVal = ours.get(key);
  (String(ourVal) === String(theirVal) ? match : differ).push({ key, ours: ourVal, theirs: theirVal });
}
for (const key of ours.keys()) if (!(key in theirs)) extra.push(key);

const total = Object.keys(theirs).length;
const pct = ((match.length / total) * 100).toFixed(1);

console.log(`  reference: ${total} keys · registry defines ${ours.size}`);
console.log('');
console.log(`  MATCH    ${String(match.length).padStart(4)}   ${pct}% of the finish line`);
console.log(`  DIFFER   ${String(differ.length).padStart(4)}   both compute it, strings disagree — INVESTIGATE, never force`);
console.log(`  MISSING  ${String(missing.length).padStart(4)}   the work queue`);
console.log(`  EXTRA    ${String(extra.length).padStart(4)}   ours only (fine — docs may need keys the site does not)`);

if (differ.length) {
  console.log(`\n  ── DIFFER (every one is evidence about the two implementations) ──`);
  for (const d of (process.argv.includes('--differ') ? differ : differ.slice(0, 12))) {
    console.log(`    ${d.key}`);
    console.log(`       engine  ${d.ours}`);
    console.log(`       website ${d.theirs}`);
  }
  if (!process.argv.includes('--differ') && differ.length > 12) {
    console.log(`    … ${differ.length - 12} more (--differ for all)`);
  }
}

if (process.argv.includes('--missing')) {
  console.log(`\n  ── MISSING (${missing.length}) ──`);
  for (const k of missing) console.log(`    ${k}  = ${JSON.stringify(theirs[k]).slice(0, 60)}`);
} else if (missing.length) {
  console.log(`\n  next batch candidates: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
  console.log('  (--missing for the full queue)');
}

if (extra.length) console.log(`\n  ours only: ${extra.join(', ')}`);

console.log(`\n${line}`);
console.log(`${match.length}/${total} at parity. Finish line: ${total}/${total}, at which the website`);
console.log('imports this registry and deletes its six ported modules (Phase 21).');
console.log(line);
