#!/usr/bin/env node
/**
 * THE REGENERATION CASCADE — one ordered list of what to run after an input moved.
 *
 *   npm run regen:cascade            print the stale set in regeneration order (dry run)
 *   npm run regen:cascade -- --run   run it, stopping at the first failure
 *
 * Every governed artifact in data/ records its inputs (tools/lib/artifact-inputs.js);
 * the freshness gate (tools/verify/artifact-freshness.js) fails naming the ONE artifact
 * whose inputs moved. After an edit to public/input/astro-reference.json seven
 * artifacts go stale, and the downstream ones only surface one 17-minute check at a
 * time (plan 13 §1c) — because an artifact that is an INPUT of another will move it
 * when regenerated. This script reads the same inputs blocks, adds the generated
 * constants module as a node (tools/constants/generate.mjs embeds several artifacts
 * and emits files that other generators hash), propagates staleness along the
 * edges and prints the topological order. It computes nothing itself.
 *
 * Nodes:
 *   - every data/*.json and public/input/*.json with an `inputs.files` block (stale when a
 *     recorded hash moved; public/input/ holds the browser's climate coefficients, a FIT)
 *   - `constants:generate` (stale when `node tools/constants/generate.mjs` — the check
 *     mode — exits non-zero; its inputs are the data/ and public/input/ files the
 *     generator reads, parsed from the generator's own source so the list has one home)
 * Edges: B → A when a file B produces is among A's recorded inputs.
 *
 * Generators that need an external download (`--src <…>`) are listed, never run.
 * The fixtures, the doc values, the frontmatter stamp and the package values are
 * printed as the tail: they are re-recorded by a person who can say the change was
 * intended (packages/fixtures/README.md), never by this script.
 */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { hashFile } = require(join(ROOT, 'tools/lib/artifact-inputs.js'));

const args = process.argv.slice(2);
const RUN = args.includes('--run');

/** @param {string} rel */
function isGitIgnored(rel) {
  try { execFileSync('git', ['check-ignore', '-q', rel], { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; }
}

// ── nodes ────────────────────────────────────────────────────────────────────
/** @typedef {{ id: string, cmd: string, produces: string[], inputs: string[], stale: string[], manual: boolean }} Node */
/** @type {Map<string, Node>} */
const nodes = new Map();

for (const dir of ['data', 'public/input']) for (const f of readdirSync(join(ROOT, dir)).filter((x) => x.endsWith('.json')).sort()) {
  const rel = `${dir}/${f}`;
  let j;
  try { j = JSON.parse(readFileSync(join(ROOT, rel), 'utf8')); } catch { continue; }
  if (!j || !j.inputs || !j.inputs.files) continue;
  const files = /** @type {Record<string, string>} */ (j.inputs.files);
  const stale = [];
  for (const [p, h] of Object.entries(files)) {
    if (!existsSync(join(ROOT, p))) { if (!isGitIgnored(p)) stale.push(`${p} (missing)`); continue; }
    if (hashFile(p) !== h) stale.push(p);
  }
  nodes.set(rel, { id: rel, cmd: String(j.inputs.generator), produces: [rel], inputs: Object.keys(files), stale, manual: /<[^>]+>/.test(String(j.inputs.generator)) });
}

// The generated constants module, as TWO nodes of one command (it is a two-stage
// dependency, measured: the embedded N-body artifacts — chain-artifact.js,
// deep-modes-artifact.cjs, the sidereal and Sun-completion artifacts — are inputs of
// earth-osculating-offset.js, whose output the constants module embeds in turn, so
// after an N-body regeneration the generator runs once before the offset and once
// after). Inputs are parsed from the generator's own source so the list has one
// home; outputs from its OUT_* paths. Both nodes are stale when the check mode fails.
{
  const genRel = 'tools/constants/generate.mjs';
  const src = readFileSync(join(ROOT, genRel), 'utf8');
  const dataInputs = new Set();
  for (const m of src.matchAll(/dir: 'data', file: '([^']+\.json)'/g)) dataInputs.add(`data/${m[1]}`);
  for (const m of src.matchAll(/'data\/([\w.-]+\.json)'/g)) dataInputs.add(`data/${m[1]}`);
  for (const m of src.matchAll(/readData\('([\w.-]+\.json)'\)/g)) dataInputs.add(`data/${m[1]}`);
  const inputInputs = readdirSync(join(ROOT, 'public/input')).filter((x) => x.endsWith('.json')).map((f) => `public/input/${f}`);
  const outs = [...src.matchAll(/const OUT_(\w+) = join\(ROOT, '(packages\/physics\/src\/[^']+)'\)/g)].map((m) => ({ name: m[1], path: m[2] }));
  const isArtifactOut = (/** @type {string} */ n) => /CHAIN|DEEP_MODES|SIDEREAL|SUN_COMPLETION/.test(n);
  const nbody = [...dataInputs].filter((p) => /nbody-/.test(p));
  const check = spawnSync('node', [genRel], { cwd: ROOT, encoding: 'utf8' });
  const stale = check.status === 0 ? [] : [`generated module ≠ its sources (node ${genRel} exits ${check.status})`];
  nodes.set('constants:generate (artifacts)', {
    id: 'constants:generate (artifacts)', cmd: 'npm run constants:generate', manual: false, stale,
    produces: outs.filter((o) => isArtifactOut(o.name)).map((o) => o.path), inputs: [genRel, ...nbody],
  });
  nodes.set('constants:generate (constants)', {
    id: 'constants:generate (constants)', cmd: 'npm run constants:generate', manual: false, stale,
    produces: outs.filter((o) => !isArtifactOut(o.name)).map((o) => o.path),
    inputs: [genRel, ...dataInputs, ...inputInputs, ...outs.filter((o) => isArtifactOut(o.name)).map((o) => o.path)],
  });
}

// ── edges: producer → consumer ───────────────────────────────────────────────
const producerOf = new Map();
for (const n of nodes.values()) for (const p of n.produces) producerOf.set(p, n.id);
/** @type {Map<string, Set<string>>} */
const downstream = new Map([...nodes.keys()].map((k) => [k, new Set()]));
for (const n of nodes.values()) for (const p of n.inputs) { const src = producerOf.get(p); if (src && src !== n.id) downstream.get(src).add(n.id); }

// ── propagate: a stale node moves everything downstream when it regenerates ──
/** @type {Map<string, string[]>} */
const reason = new Map();
for (const n of nodes.values()) if (n.stale.length) reason.set(n.id, n.stale);
const queue = [...reason.keys()];
while (queue.length) {
  const id = /** @type {string} */ (queue.shift());
  for (const d of downstream.get(id)) if (!reason.has(d)) { reason.set(d, [`${id} regenerates (an input)`]); queue.push(d); }
}

// ── order: Kahn over the induced subgraph ────────────────────────────────────
const inSet = new Set(reason.keys());
const indeg = new Map([...inSet].map((k) => [k, 0]));
for (const id of inSet) for (const d of downstream.get(id)) if (inSet.has(d)) indeg.set(d, (indeg.get(d) ?? 0) + 1);
const ready = [...inSet].filter((k) => indeg.get(k) === 0).sort();
const order = [];
while (ready.length) {
  const id = /** @type {string} */ (ready.shift());
  order.push(id);
  for (const d of [...downstream.get(id)].sort()) if (inSet.has(d)) { indeg.set(d, indeg.get(d) - 1); if (indeg.get(d) === 0) { ready.push(d); ready.sort(); } }
}
if (order.length !== inSet.size) {
  console.error('regen-cascade: the artifact graph has a cycle — fix the inputs blocks. Nodes still waiting on a producer:');
  for (const id of inSet) if ((indeg.get(id) ?? 0) > 0) {
    const n = /** @type {Node} */ (nodes.get(id));
    const from = n.inputs.map((p) => producerOf.get(p)).filter((s) => s && s !== id && inSet.has(s));
    console.error(`  ${id}  ←  ${[...new Set(from)].join(', ')}`);
  }
  process.exit(2);
}

// ── report ───────────────────────────────────────────────────────────────────
console.log(`regen-cascade — ${nodes.size} governed nodes, ${order.length} to regenerate${RUN ? ' (running)' : ' (dry run; add --run)'}`);
if (!order.length) { console.log('  nothing is stale.'); process.exit(0); }
order.forEach((id, i) => {
  const n = /** @type {Node} */ (nodes.get(id));
  console.log(`\n${String(i + 1).padStart(2)}. ${n.cmd}${n.manual ? '   [MANUAL — run by hand: a downloaded source, or a FIT whose re-close is a decision]' : ''}`);
  for (const r of /** @type {string[]} */ (reason.get(id)).slice(0, 6)) console.log(`      ← ${r}`);
  const more = /** @type {string[]} */ (reason.get(id)).length - 6;
  if (more > 0) console.log(`      ← … ${more} more`);
});
console.log(`\nthen (by hand — each is a judgement, not a regeneration):
  npm run test:fixtures          re-record ONLY if the change was intended, and say so in the commit
  npm run docs:values:write && npm run docs:tables:write && npm run docs:calcmap:write && npm run docs:doc99:write && npm run docs:doc92:write && node tools/docs/stamp-frontmatter.mjs --write
                                 (docs:tables:write is the Python doc 92 table writer; docs 110/99 and doc 92's Node blocks have their own — the docs:tables CHECK covers all of them)
  npm run values:package:write   then the version note and the package publish (owner)
  npm run fit:6a2 && npm run check:csv-smoke   if the engine's frame of date moved`);

if (!RUN) process.exit(0);
let prevCmd = '';
for (const id of order) {
  const n = /** @type {Node} */ (nodes.get(id));
  if (n.manual) { console.log(`\n▶ SKIP (manual): ${n.cmd}`); continue; }
  if (n.cmd === prevCmd) continue;   // the two constants nodes adjacent: one run suffices
  prevCmd = n.cmd;
  console.log(`\n▶ ${n.cmd}`);
  const t0 = Date.now();
  const r = spawnSync(n.cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
  console.log(`  ${r.status === 0 ? 'done' : 'FAILED'} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (r.status !== 0) { console.error(`regen-cascade: stopped at "${n.cmd}" (exit ${r.status}).`); process.exit(1); }
}
console.log('\nregen-cascade: every stale node regenerated. Run `npm run check:artifacts`, then the hand steps above.');
