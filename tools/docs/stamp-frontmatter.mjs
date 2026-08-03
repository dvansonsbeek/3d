#!/usr/bin/env node
/**
 * Doc frontmatter stamper — IP-unified-architecture §10 / Phase 3.
 *
 *   node tools/docs/stamp-frontmatter.mjs             dry run (report)
 *   node tools/docs/stamp-frontmatter.mjs --write     stamp 3d docs/*.md
 *   node tools/docs/stamp-frontmatter.mjs --holistic  also stamp the website
 *                                                     src/content mdx trees
 *   node tools/docs/stamp-frontmatter.mjs --check     exit 1 on missing/stale
 *                                                     frontmatter (CI mode —
 *                                                     wired in at Phase 11)
 *
 * THIS TOOL IS THE AUTHORITATIVE WRITER of the four §10 fields — the
 * `coefficients` hash moves on every refit, so hand-stamping 71+ files per
 * refit is not a workflow. Re-run with --write after any fit lands.
 *
 * Fields (IP-unified-architecture §10):
 *   docVersion    — per-doc, preserved if present, initialized to 1.0
 *   modelVersion  — from public/input/model-version.json (MAJOR structural /
 *                   MINOR refit; NOT the v9/v10 licence-boundary git tags)
 *   coefficients  — sha256:<COEFFICIENTS_HASH> read from the generated module
 *                   (packages/physics/src/constants/coefficients.js) — the
 *                   same identity the counterfactual gate certifies; never
 *                   recomputed here
 *   status        — current | superseded | historical (map below)
 *
 * Status discipline (§10a, measured lessons):
 *   - current: must track HEAD; the Phase-11 freshness check bites on these.
 *   - historical: genuinely frozen research records, EXEMPT from freshness.
 *     Default ambiguous docs to CURRENT — a doc wrongly historical is
 *     silently exempted and its stale numbers never caught; wrongly current
 *     costs only a dismissable CI complaint.
 *   - NEVER classify by substring: "exploration" in the title put doc 39 —
 *     the fitter's live law-of-cosines source — in the exempt bucket once.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOLISTIC_ROOT = process.env.HOLISTIC_ROOT
  || join(ROOT, '..', 'Holistic', 'holisticuniverse');

const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');
const HOLISTIC = process.argv.includes('--holistic');

// ── The four HISTORICAL docs — explicit, justified, nothing by pattern ──────
// (Phase 3 survey + read-based classification; everything else is current.)
const HISTORICAL = new Set([
  '61-optimization-execution-plan.md', // execution log of a finished campaign
  '69-optimization-baseline.md',       // explicitly a frozen before-snapshot
  '94-insolation-null-test.md',        // a completed null-test record
  '97-paleo-ecs-decomposition.md',     // frozen first-pass analysis
]);
// No doc is superseded today (§10a survey: zero point forward to a successor).
const SUPERSEDED = new Set([]);

// ── Sources — read, never recompute ─────────────────────────────────────────
const modelVersion = JSON.parse(readFileSync(
  join(ROOT, 'public', 'input', 'model-version.json'), 'utf8')).modelVersion;
const coeffSrc = readFileSync(
  join(ROOT, 'packages', 'physics', 'src', 'constants', 'coefficients.js'), 'utf8');
const m = coeffSrc.match(/COEFFICIENTS_HASH = "([0-9a-f]{16})"/);
if (!m) { console.error('COEFFICIENTS_HASH not found — run tools/constants/generate.mjs --write'); process.exit(1); }
const coefficients = `sha256:${m[1]}`;

const FIELDS = ['docVersion', 'modelVersion', 'coefficients', 'status'];

function statusOf(name) {
  if (HISTORICAL.has(name)) return 'historical';
  if (SUPERSEDED.has(name)) return 'superseded';
  return 'current';
}

/** Stamp one file's frontmatter. Returns {changed, missing, stale} for reporting. */
function stamp(path, name, { mdx }) {
  const src = readFileSync(path, 'utf8');
  const status = statusOf(name);
  const want = {
    docVersion: null,              // preserved; initialized below
    modelVersion,
    coefficients,
    status,
  };

  let head = null, body = src;
  if (src.startsWith('---\n')) {
    const end = src.indexOf('\n---', 4);
    if (end !== -1) {
      head = src.slice(4, end);
      body = src.slice(src.indexOf('\n', end + 1) + 1);
    }
  }

  const lines = head === null ? [] : head.split('\n');
  const kept = [];
  const existing = {};
  for (const line of lines) {
    const km = line.match(/^(\w+):\s*(.*)$/);
    if (km && FIELDS.includes(km[1])) existing[km[1]] = km[2];
    else kept.push(line);
  }
  want.docVersion = existing.docVersion || '1.0';

  const stale = status === 'current' && head !== null && (
    existing.modelVersion !== modelVersion || existing.coefficients !== coefficients);
  const missing = head === null || FIELDS.some(f => !(f in existing));

  // mdx files keep their own keys (title, description, …) first; md files get
  // ours first. Either way the four §10 fields are appended/refreshed.
  const ours = FIELDS.map(f => `${f}: ${want[f]}`);
  const block = mdx || kept.length
    ? [...kept, ...ours]
    : ours;
  const out = `---\n${block.join('\n')}\n---\n${head === null ? '\n' + body : body}`;

  const changed = out !== src;
  if (WRITE && changed) writeFileSync(path, out);
  return { changed, missing, stale, status };
}

// ── Walk the trees ──────────────────────────────────────────────────────────
const results = [];

for (const name of readdirSync(join(ROOT, 'docs')).filter(f => f.endsWith('.md')).sort()) {
  results.push({ name, tree: '3d/docs', ...stamp(join(ROOT, 'docs', name), name, { mdx: false }) });
}

if (HOLISTIC) {
  // EN ONLY, deliberately: the NL tree lags the EN content and is synced by
  // Dennis in translation batches — stamping it independently would version
  // pages whose content is behind. NL joins when its content sync does.
  const contentRoot = join(HOLISTIC_ROOT, 'src', 'content', 'en');
  if (!existsSync(contentRoot)) {
    console.error(`website content not found at ${contentRoot} (set HOLISTIC_ROOT)`);
  } else {
    const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(join(dir, e.name))
        : e.name.endsWith('.mdx') ? [join(dir, e.name)] : []);
    for (const path of walk(contentRoot).sort()) {
      const name = path.slice(contentRoot.length + 1);
      // website pages are the live site — all current by nature
      results.push({ name, tree: 'website', ...stamp(path, name, { mdx: true }) });
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const byStatus = { current: 0, historical: 0, superseded: 0 };
let changed = 0, missing = 0, stale = 0;
for (const r of results) {
  byStatus[r.status]++;
  if (r.changed) changed++;
  if (r.missing) missing++;
  if (r.stale) { stale++; if (CHECK) console.log(`  STALE   ${r.tree}/${r.name}`); }
  if (r.missing && CHECK) console.log(`  MISSING ${r.tree}/${r.name}`);
}
console.log(`${results.length} docs — current ${byStatus.current} · historical ${byStatus.historical} · superseded ${byStatus.superseded}`);
console.log(`modelVersion ${modelVersion} · coefficients ${coefficients}`);
if (CHECK) {
  if (missing || stale) {
    console.log(`FAIL — ${missing} missing frontmatter, ${stale} stale current docs. Run --write after the refit.`);
    process.exit(1);
  }
  console.log('PASS — every doc classified; all current docs track HEAD.');
} else if (WRITE) {
  console.log(`✓ ${changed} files stamped`);
} else {
  console.log(`${changed} files would change (dry run — add --write)`);
}
