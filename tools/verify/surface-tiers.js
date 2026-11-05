#!/usr/bin/env node
/**
 * SURFACE TIER GATE (plan 27 steps E and F)
 * =========================================
 *
 * A body's map (and Saturn's rings) is chosen by age from ONE tier table per body,
 * public/textures/<body>/manifest.json — the Earth's written by tools/pipeline/build-earth-tiers.js,
 * the Moon's, Mercury's and Saturn's by tools/pipeline/build-body-tiers.js. This gate checks
 * every manifest under public/textures/ against the repository:
 *
 *   1. FILES: every file a tier names is listed in `files`, exists, and has the recorded
 *      sha256 and size — a re-encoded or edited map without a manifest rewrite fails.
 *   2. TABLE: the tiers are sorted by age, contiguous (each toMa is the next fromMa), start
 *      beyond the future edge and end beyond the navigable past edge (time/navigable-domain),
 *      every tier names its `kind` (cited | illustration) and `source`, and `rings`, where
 *      present, is a boolean.
 *   3. NO ORPHANS: every git-tracked file under a body's directory (the manifest aside) is
 *      named by a tier or by `files` — an unreferenced raster is either unprovenanced or dead
 *      weight.
 *
 * Fail-proven: ESSRT_SURFACE_TIERS_PLANT=1 plants a one-byte hash mismatch on the first file.
 * Runs as `npm run check:surface-tiers`, inside `npm run check`, and in the tools/verify suite.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TEXTURES = path.join(ROOT, 'public', 'textures');
const { NAVIGABLE_PAST_YEARS } = require('../../packages/physics/src/time/navigable-domain.cjs');
const PLANT = process.env.ESSRT_SURFACE_TIERS_PLANT === '1';

/** @type {string[]} */
const failures = [];
const fail = (/** @type {string} */ msg) => failures.push(msg);
const rel = (/** @type {string} */ p) => path.relative(ROOT, p).split(path.sep).join('/');
let planted = false;
const summary = [];

const bodies = fs.readdirSync(TEXTURES).filter((d) => fs.existsSync(path.join(TEXTURES, d, 'manifest.json'))).sort();
if (bodies.length === 0) fail('no manifest under public/textures/');

for (const body of bodies) {
  const manifestPath = path.join(TEXTURES, body, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const tiers = /** @type {Array<{id: string, label: string, fromMa: number, toMa: number, fadeMyr: number, file: string, source: string, kind: string, rings?: unknown}>} */ (manifest.tiers);
  const files = /** @type {Record<string, {sha256: string, bytes: number}>} */ (manifest.files);
  const tag = (/** @type {string} */ m) => `${body}: ${m}`;

  // 1. files
  for (const [f, rec] of Object.entries(files || {})) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) { fail(tag(`missing file ${f}`)); continue; }
    const buf = fs.readFileSync(abs);
    let h = crypto.createHash('sha256').update(buf).digest('hex');
    if (PLANT && !planted) { h = h.replace(/^./, (c) => (c === '0' ? '1' : '0')); planted = true; }
    if (h !== rec.sha256) fail(tag(`${f}: sha256 ${h.slice(0, 12)}… ≠ recorded ${rec.sha256.slice(0, 12)}… — rebuild the manifest (${manifest.generated_by || 'its generator'})`));
    if (buf.length !== rec.bytes) fail(tag(`${f}: ${buf.length} bytes ≠ recorded ${rec.bytes}`));
  }

  // 2. table
  if (!Array.isArray(tiers) || tiers.length < 2) { fail(tag('the tier table is missing or too short')); continue; }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!(t.fromMa < t.toMa)) fail(tag(`${t.id}: fromMa ${t.fromMa} is not below toMa ${t.toMa}`));
    if (i + 1 < tiers.length && tiers[i + 1].fromMa !== t.toMa) fail(tag(`gap or overlap between ${t.id} (toMa ${t.toMa}) and ${tiers[i + 1].id} (fromMa ${tiers[i + 1].fromMa})`));
    if (!['cited', 'illustration'].includes(t.kind)) fail(tag(`${t.id}: kind "${t.kind}" is neither cited nor illustration`));
    if (!t.source || !manifest.sources || !manifest.sources[t.source]) fail(tag(`${t.id}: source "${t.source}" is not described in manifest.sources`));
    if (!files || !files[t.file]) fail(tag(`${t.id}: its file ${t.file} is not in the manifest's file list`));
    if (!(t.fadeMyr >= 0) || t.fadeMyr > t.toMa - t.fromMa) fail(tag(`${t.id}: fadeMyr ${t.fadeMyr} is negative or wider than the tier`));
    if ('rings' in t && typeof t.rings !== 'boolean') fail(tag(`${t.id}: rings "${t.rings}" is not a boolean`));
    for (const k of ['clouds', 'atmosphere']) if (k in t && !(typeof t[k] === 'number' && t[k] >= 0 && t[k] <= 1)) fail(tag(`${t.id}: ${k} "${t[k]}" is not a number in [0, 1]`));
    if ('skyTint' in t && !(Array.isArray(t.skyTint) && t.skyTint.length === 3 && t.skyTint.every((c) => typeof c === 'number' && c >= 0 && c <= 1))) fail(tag(`${t.id}: skyTint "${JSON.stringify(t.skyTint)}" is not three numbers in [0, 1]`));
    if ('present' in t && t.present !== true) fail(tag(`${t.id}: present "${t.present}" is not true (omit it on every other tier)`));
  }
  if (tiers[0].fromMa > -1e9) fail(tag(`the youngest tier starts at ${tiers[0].fromMa} Ma — the future edge (−1,000 Myr) is uncovered`));
  // plan 27 step H: exactly ONE present-day tier per body (the rows read it as "today's map"; a future tier may sit before it)
  const present = tiers.filter((t) => t.present === true);
  if (present.length !== 1) fail(tag(`${present.length} tiers carry present: true — exactly one must (the present-day map)`));
  else if (!(present[0].fromMa <= 0 && present[0].toMa > 0)) fail(tag(`the present tier ${present[0].id} (${present[0].fromMa}–${present[0].toMa} Ma) does not contain today`));
  const pastEdgeMa = NAVIGABLE_PAST_YEARS / 1e6;
  if (tiers[tiers.length - 1].toMa < pastEdgeMa) fail(tag(`the oldest tier ends at ${tiers[tiers.length - 1].toMa} Ma — the navigable edge ${pastEdgeMa} Ma is uncovered`));

  // 3. no orphans
  const dir = rel(path.join(TEXTURES, body)) + '/';
  const tracked = execFileSync('git', ['ls-files', dir], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const named = new Set([...tiers.map((t) => t.file), ...Object.keys(files || {})]);
  for (const f of tracked) {
    if (f === rel(manifestPath)) continue;
    if (!named.has(f)) fail(tag(`orphan: ${f} is tracked but no tier names it`));
  }
  summary.push(`${body} ${tiers.length} tiers / ${Object.keys(files || {}).length} files, ${tiers[0].fromMa} → ${tiers[tiers.length - 1].toMa} Ma`);
}

if (failures.length) {
  console.error(`FAIL surface-tiers: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`PASS surface-tiers: ${summary.join('; ')}`);
