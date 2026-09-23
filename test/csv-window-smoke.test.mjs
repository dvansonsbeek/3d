/**
 * Step-6a2 window smoke (owner-shaped, 2026-09-16): "do not generate
 * 335,318 calculations — only ~50,000, or 10,000. Create a 6a2."
 *
 * THE 6a2 ARTIFACT. `npm run fit:6a2` generates
 * data/02-solar-measurements-window.csv — the SAME Step-6a exporter
 * (the one-source movement — the only Node scene since plan 06 item 3) over −4000..+4000
 * (8,001 years × 6 events = 48,006 rows, ~25 min since R4 — the exporter
 * evaluates the certified Sun per probe, measured 36 s per 200 yr) instead of the full-H
 * run (335,318 years × 6 events = 2,011,908 rows, 2 h 24 m). The full 6a
 * CSV stays as the C-4b-era campaign record; 6a2 is the LIVING check
 * artifact, cheap to re-base whenever the movement changes deliberately
 * (pass --start/--end for a smaller run).
 *
 * THIS SMOKE. Regenerates the FULL 6a2 range into a scratch file with
 * the real exporter and compares EVERY row against the 6a2 file
 * BIT-EXACTLY (string equality per line; owner catch 2026-09-16 — an
 * earlier −1000..+2500 sub-window left the outer years uncompared).
 * Compare-only — the 6a2 file is never touched (the generator-as-test
 * trap). A mismatch means the engine no
 * longer reproduces its own measurement: either an unintended movement
 * change (a bug) or an intended one → re-base with `npm run fit:6a2` and
 * say so in the commit. Proven live at introduction: the first
 * full-CSV compare caught the tracked 6a CSV stale against the
 * post-C-4b movement arcs (D4c/D4d-rev; SS@−997 off by 2.9 h).
 *
 * SCOPE NOTE. The 6a instrument is computeSunPositionFast. Since plan 06 R4
 * it rides the SAME engine Earth frame as the full scene (sun plane, apsidal
 * wheel, the Sun at the certified longitude, the axis —
 * _applyEngineEarthFrame), so it IS the scene Sun: before R4 it was the bare
 * K wheel Sun, 8–18″ from the scene Sun in 2000 (measured), and no δ block
 * ever ran here. The R4 re-base of the 6a2 window is that change.
 *
 * WINDOW + WARM-UP. The exporter chains each year's event search off the
 * previous year's JD; a windowed run starts cold, so the first
 * WARMUP_YEARS of rows are excluded from the compare.
 *
 * LOCAL-ONLY. The 6a2 file is gitignored — in CI or a worktree this test
 * SKIPs (exit 0) with a clear notice. Not part of `npm run check`; run:
 *   npm run fit:6a2        # (re)generate the 6a2 window artifact
 *   npm run check:csv-smoke
 *
 * FAIL-PROVEN: ESSRT_CSV_SMOKE_PLANT=1 perturbs one expected row — the
 * compare must go red on the same build that passes clean.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TRACKED = join(ROOT, 'data', '02-solar-measurements-window.csv');
const START = -4000, END = 4000, WARMUP_YEARS = 3;   // the full 6a2 range (fit:6a2)

if (!existsSync(TRACKED)) {
  console.log('CSV-WINDOW-SMOKE: SKIP — data/02-solar-measurements-window.csv absent (gitignored; generate it with `npm run fit:6a2`).');
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'csv-smoke-'));
const scratch = join(dir, 'window.csv');
try {
  console.log(`regenerating window ${START}..${END} with the real Step-6a exporter…`);
  const r = spawnSync(process.execPath, [
    join(ROOT, 'tools', 'fit', 'export-solar-measurements.js'),
    '--start', String(START), '--end', String(END), '--output', scratch,
  ], { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 3600000 });   // R4: the exporter evaluates the certified Sun per probe — measured 36 s per 200 yr, ~25 min for the window
  if (r.status !== 0) {
    console.log('FAIL — exporter exited ' + r.status + '\n' + String(r.stderr).slice(0, 800));
    process.exit(1);
  }

  // index the tracked CSV rows by (Type, Model Year) for the window
  const keyOf = (line) => {
    const c = line.split(',');
    return c[0] + '|' + c[1];
  };
  const winLines = readFileSync(scratch, 'utf8').trim().split('\n');
  const header = winLines[0];
  const tracked = new Map();
  for (const line of readFileSync(TRACKED, 'utf8').split('\n')) {
    if (!line || line.startsWith(header.split(',')[0] + ',') === false && tracked.size === 0 && line.includes('Type')) continue;
    const c = line.split(',');
    const yr = parseFloat(c[1]);
    if (Number.isFinite(yr) && yr >= START && yr <= END) tracked.set(keyOf(line), line);
  }

  let compared = 0, mismatched = 0, missing = 0, firstBad = '';
  for (const line of winLines.slice(1)) {
    const yr = parseFloat(line.split(',')[1]);
    if (!Number.isFinite(yr) || yr < START + WARMUP_YEARS) continue;   // cold-start warm-up
    let expected = tracked.get(keyOf(line));
    if (expected === undefined) { missing++; if (!firstBad) firstBad = 'no tracked row for ' + keyOf(line); continue; }
    if (process.env.ESSRT_CSV_SMOKE_PLANT === '1' && compared === 10) expected += '0';
    if (line !== expected) { mismatched++; if (!firstBad) firstBad = keyOf(line) + '\n    got      ' + line + '\n    expected ' + expected; }
    compared++;
  }

  const ok = mismatched === 0 && missing === 0 && compared > 1000;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${compared} rows compared bit-exactly over ${START + WARMUP_YEARS}..${END} — ${mismatched} mismatched, ${missing} missing from the tracked CSV`);
  if (!ok && firstBad) console.log('  first: ' + firstBad);
  console.log(ok ? 'CSV-WINDOW-SMOKE: ALL PASS' : 'CSV-WINDOW-SMOKE: FAILURES — the engine no longer reproduces the 6a2 window artifact; if the movement change is INTENDED, re-base with `npm run fit:6a2` and say so in the commit.');
  process.exit(ok ? 0 : 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
