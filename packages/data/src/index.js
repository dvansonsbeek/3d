/**
 * @essrt/data — the provenance manifest, machine-readable (Phase 12).
 *
 * `data/PROVENANCE.md` is the single human-authored manifest of every
 * third-party dataset (source, licence, redistribution right). This module
 * projects it into structured form for the data-provenance gate
 * (tools/verify/data-provenance.js) and future consumers (Phase 13 api).
 * It PARSES the markdown — there is deliberately no second copy of the
 * facts to drift.
 *
 * The generated-ledger.json beside this file is the closed legacy inventory
 * of tracked data/*.json artifacts that predate self-describing meta blocks,
 * each attributed to its generating script.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Parse PROVENANCE.md into the set of manifest-covered paths.
 * @returns {{ entries: string[], dirPrefixes: string[] }} paths relative to
 *   data/ that the manifest names (files) or covers wholesale (directory
 *   prefixes ending in '/').
 */
export function parseProvenanceManifest() {
  const md = readFileSync(join(ROOT, 'data', 'PROVENANCE.md'), 'utf8');
  /** @type {Set<string>} */
  const entries = new Set();
  /** @type {Set<string>} */
  const dirPrefixes = new Set();
  // ONLY the first cell of each table row names a dataset — description
  // cells and prose also carry backticks (script references, format names)
  // and must not be read as manifest entries.
  // The generated-artifacts catch-all row ("`*.json` results under `data/`")
  // carries prose in its first cell, so it is matched as a whole line.
  if (/^\| `\*\.json` results under `data\/`/m.test(md)) entries.add('*.json');
  for (const m of md.matchAll(/^\| `([^`\n]+)`(?: \(([^)]*)\))? \|/gm)) {
    let p = m[1].trim();
    if (p.startsWith('data/')) p = p.slice(5);
    if (p.includes('..')) continue;              // ranges like ELP1..ELP36 — the
    //                                              lunar-series/ prefix covers them
    if (p.endsWith('/')) dirPrefixes.add(p);
    else if (/^[\w./ -]+\.\w+$/.test(p)) entries.add(p);
  }
  // Indented download-target lines (the not-tracked datasets).
  for (const m of md.matchAll(/^ {4}data\/(.+)$/gm)) {
    const p = m[1].trim();
    if (p.endsWith('/')) dirPrefixes.add(p);
    else entries.add(p);
  }
  // The lunar-series section covers its whole directory; its per-file
  // provenance lives in data/lunar-series/README.md.
  if (md.includes('data/lunar-series/')) dirPrefixes.add('lunar-series/');
  return { entries: [...entries], dirPrefixes: [...dirPrefixes] };
}

/**
 * The legacy generated-artifact ledger: data/*.json basename → generating
 * script (repo-relative).
 * @returns {Record<string, string>}
 */
export function generatedLedger() {
  const p = join(dirname(fileURLToPath(import.meta.url)), 'generated-ledger.json');
  return JSON.parse(readFileSync(p, 'utf8')).files;
}

/** Absolute path of a dataset under data/. @param {string} rel @returns {string} */
export function datasetPath(rel) {
  return join(ROOT, 'data', rel);
}
