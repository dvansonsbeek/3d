#!/usr/bin/env node
/**
 * EARTH SURFACE TIER GATE (plan 27 step E)
 * ========================================
 *
 * The scene's Earth day map is chosen by age from public/textures/earth/manifest.json — the
 * ONE home written by tools/pipeline/build-earth-tiers.js. This gate checks that table against
 * the repository:
 *
 *   1. FILES: every file a tier names is listed in `files`, exists, and has the recorded
 *      sha256 and size — a re-encoded or edited map without a manifest rewrite fails.
 *   2. TABLE: the tiers are sorted by age, contiguous (each toMa is the next fromMa), start
 *      beyond the future edge and end beyond the navigable past edge (time/navigable-domain),
 *      and every tier names its `kind` (cited | illustration) and `source`.
 *   3. NO ORPHANS: every git-tracked file under public/textures/earth/ (the manifest aside) is
 *      named by a tier — an unreferenced raster is either unprovenanced or dead weight.
 *
 * Fail-proven: ESSRT_EARTH_TIERS_PLANT=1 plants a one-byte hash mismatch on the first file.
 * Runs as `npm run check:earth-tiers`, inside `npm run check`, and in the tools/verify suite.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, 'public', 'textures', 'earth', 'manifest.json');
const TEXTURE_DIR = 'public/textures/earth/';
const { NAVIGABLE_PAST_YEARS } = require('../../packages/physics/src/time/navigable-domain.cjs');
const PLANT = process.env.ESSRT_EARTH_TIERS_PLANT === '1';

/** @type {string[]} */
const failures = [];
const fail = (/** @type {string} */ msg) => failures.push(msg);

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const tiers = /** @type {Array<{id: string, label: string, fromMa: number, toMa: number, fadeMyr: number, file: string, source: string, kind: string}>} */ (manifest.tiers);
const files = /** @type {Record<string, {sha256: string, bytes: number}>} */ (manifest.files);

// 1. files
let planted = false;
for (const [f, rec] of Object.entries(files)) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { fail(`missing file ${f}`); continue; }
  const buf = fs.readFileSync(abs);
  let h = crypto.createHash('sha256').update(buf).digest('hex');
  if (PLANT && !planted) { h = h.replace(/^./, (c) => (c === '0' ? '1' : '0')); planted = true; }
  if (h !== rec.sha256) fail(`${f}: sha256 ${h.slice(0, 12)}… ≠ recorded ${rec.sha256.slice(0, 12)}… — rebuild the manifest (npm run import:paleoatlas)`);
  if (buf.length !== rec.bytes) fail(`${f}: ${buf.length} bytes ≠ recorded ${rec.bytes}`);
}

// 2. table
if (!Array.isArray(tiers) || tiers.length < 3) fail('the tier table is missing or too short');
else {
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!(t.fromMa < t.toMa)) fail(`${t.id}: fromMa ${t.fromMa} is not below toMa ${t.toMa}`);
    if (i + 1 < tiers.length && tiers[i + 1].fromMa !== t.toMa) fail(`gap or overlap between ${t.id} (toMa ${t.toMa}) and ${tiers[i + 1].id} (fromMa ${tiers[i + 1].fromMa})`);
    if (!['cited', 'illustration'].includes(t.kind)) fail(`${t.id}: kind "${t.kind}" is neither cited nor illustration`);
    if (!t.source || !manifest.sources || !manifest.sources[t.source]) fail(`${t.id}: source "${t.source}" is not described in manifest.sources`);
    if (!files[t.file]) fail(`${t.id}: its file ${t.file} is not in the manifest's file list`);
    if (!(t.fadeMyr >= 0) || t.fadeMyr > t.toMa - t.fromMa) fail(`${t.id}: fadeMyr ${t.fadeMyr} is negative or wider than the tier`);
  }
  if (tiers[0].fromMa > -1e9) fail(`the youngest tier starts at ${tiers[0].fromMa} Ma — the future edge (−1,000 Myr) is uncovered`);
  const pastEdgeMa = NAVIGABLE_PAST_YEARS / 1e6;
  if (tiers[tiers.length - 1].toMa < pastEdgeMa) fail(`the oldest tier ends at ${tiers[tiers.length - 1].toMa} Ma — the navigable edge ${pastEdgeMa} Ma is uncovered`);
}

// 3. no orphans
const tracked = execFileSync('git', ['ls-files', TEXTURE_DIR], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const named = new Set(tiers.map((t) => t.file));
for (const f of tracked) {
  if (f === path.relative(ROOT, MANIFEST).split(path.sep).join('/')) continue;
  if (!named.has(f)) fail(`orphan: ${f} is tracked but no tier names it`);
}

if (failures.length) {
  console.error(`FAIL earth-tiers: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`PASS earth-tiers: ${tiers.length} tiers, ${Object.keys(files).length} files hashed, contiguous from ${tiers[0].fromMa} to ${tiers[tiers.length - 1].toMa} Ma`);
