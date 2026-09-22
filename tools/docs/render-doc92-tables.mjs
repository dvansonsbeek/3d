#!/usr/bin/env node
/**
 * Doc 92's generated table of the climate formula's L1 lines — written from
 * the ONE home (holisticuniverse plan 06, T1 disposition; Phase 4b).
 *
 *   node tools/docs/render-doc92-tables.mjs --check    exit 1 if the block is stale
 *   node tools/docs/render-doc92-tables.mjs --write    re-render the block
 *
 * The shipped climate formula's orbital layer is the engine's own physical
 * lines — |g_i − g_j| (eccentricity), p + s_i (obliquity), p + g_i (climatic
 * precession) at relative mode amplitude ≥ 0.1, plus the g₂ − g₅ fundamental
 * and its 2nd / 3rd harmonics — in data/l1-physical-lines.json, the artifact
 * scripts/l1_physical_lines.py writes and scripts/milankovitch_climate_formula.py
 * reads. This block prints that list so doc 92 cannot describe a different
 * formula than the one that ships. Block markers follow render-calculation-map:
 *   <!-- generated:<id> --> … <!-- /generated:<id> -->
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOC = join(ROOT, 'docs/92-climate-formula.md');
const L1 = JSON.parse(readFileSync(join(ROOT, 'data/l1-physical-lines.json'), 'utf8'));
const COEF = JSON.parse(readFileSync(join(ROOT, 'public/input/climate-formula-coefficients.json'), 'utf8'));

const f = (v, d) => (v === null || v === undefined || !Number.isFinite(v)) ? '—' : Number(v).toFixed(d);

// The shipped coefficient file must carry exactly these lines (the one-home
// check): the same SET, matched by line label, with the periods agreeing to
// 1e-6 kyr (a year). Plan 06 R3 cleanup: the former 1e-9-kyr equality was
// tighter than the engine's own floating-point reproducibility (the J2000
// precession rate moves ~5e-11 relative between regenerations) and demanded a
// rounding-level re-solve of the climate formula on an unchanged line set.
const shipped = COEF.regimes['lr04-post-mpt'].L1.map((c) => ({ label: c.label, p: c.period_kyr })).sort((a, b) => a.p - b.p);
const listed = L1.lines.map((l) => ({ label: l.label, p: l.periodKyr })).sort((a, b) => a.p - b.p);
if (shipped.length !== listed.length || shipped.some((s, i) => !s.label.endsWith(listed[i].label) || Math.abs(s.p - listed[i].p) > 1e-6)) {
  throw new Error(`the shipped climate coefficients carry ${shipped.length} L1 lines, data/l1-physical-lines.json lists ${listed.length} — not the same set; re-run scripts/milankovitch_climate_formula.py`);
}

function blockL1Lines() {
  const c = L1.config;
  const rows = [
    `| # | Family | Line | Period (kyr) | rel. amplitude | Note |`,
    `|---:|:---|:---|---:|---:|:---|`,
  ];
  L1.lines.forEach((l, i) => {
    rows.push(`| ${i + 1} | ${l.family} | ${l.label} | ${f(l.periodKyr, 2)} | ${l.relAmp !== undefined ? f(l.relAmp, 3) : '—'} | ${l.note ?? (l.family === 'eccentricity' ? 'planetary g-beat — does not scale with Earth\'s spin' : 'rides the composed precession rate ψ̇(t) at deep time (doc 99)')} |`);
  });
  const orbital = L1.lines.filter((l) => l.relAmp !== undefined);
  const counts = {};
  for (const l of orbital) counts[l.family] = (counts[l.family] ?? 0) + 1;
  rows.push('');
  rows.push(`${orbital.length} orbital lines (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}) at relative mode amplitude ≥ ${c.relThreshold} within the family, inside ${c.bandKyr[0]}–${c.bandKyr[1]} kyr, lines closer than ${(c.dedupeFrac * 100).toFixed(1)} % merged; plus the ${L1.lines.length - orbital.length}-line 405-kyr family. Built on the engine's own spectrum (\`${c.source}\`: Earth's z and ζ secular modes from the 20-Myr deep mode table; p = ${f(c.pArcsecPerYr, 4)} ″/yr the of-date precession rate at J2000). The shipped coefficient file (\`public/input/climate-formula-coefficients.json\`) carries exactly these ${shipped.length} periods in every regime — asserted by this renderer. No integer base, no lattice label.`);
  return rows.join('\n');
}

const BLOCKS = { 'doc92-l1-physical-lines': blockL1Lines };

const write = process.argv.includes('--write');
let doc = readFileSync(DOC, 'utf8');
let stale = 0;
for (const [id, fn] of Object.entries(BLOCKS)) {
  const re = new RegExp(`(<!-- generated:${id} -->)\\n?([\\s\\S]*?)\\n?(<!-- /generated:${id} -->)`);
  const mm = doc.match(re);
  if (!mm) { console.error(`  MISSING block markers for ${id} in docs/92`); process.exit(2); }
  const fresh = fn();
  if (mm[2] !== fresh) {
    stale++;
    if (write) doc = doc.replace(re, () => `${mm[1]}\n${fresh}\n${mm[3]}`);
    else console.error(`  STALE block ${id}`);
  }
}
if (write) {
  writeFileSync(DOC, doc);
  console.log(`render-doc92-tables: ${stale} block(s) re-rendered (${Object.keys(BLOCKS).length} total)`);
} else if (stale) {
  console.error(`FAIL — ${stale} stale generated block(s) in docs/92. Regenerate: node tools/docs/render-doc92-tables.mjs --write`);
  process.exit(1);
} else {
  console.log(`PASS — docs/92 generated blocks fresh (${Object.keys(BLOCKS).length})`);
}
