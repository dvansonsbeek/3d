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
 * CSV is retired (it was the C-4b-era campaign record, stale against the
 * later movement arcs); 6a2 is the LIVING check artifact, cheap to re-base
 * whenever the movement changes deliberately (pass --start/--end for a
 * smaller run).
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
 * SCOPE NOTE. The 6a instrument is computeSunPositionFast. It rides the SAME
 * engine Earth frame as the full scene (sun plane, apsidal
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
 * SKIPs (exit 0) with a clear notice. Run:
 *   npm run fit:6a2               # (re)generate the 6a2 window artifact
 *   npm run check:csv-smoke       # the FULL range, ~25 min
 *   npm run check:csv-smoke:short # two short windows, ~15 s — IN `npm run check`
 *
 * SHORT WINDOW (plan 32 follow-up, TODO A12 — the local CSV had gone 6.3 s
 * stale at −3997 unseen, because the full compare was local-only and never
 * in the chain): `--windows a:b[,c:d]` regenerates each window and compares
 * it bit-exactly, so the chain fails BY NAME when the engine parts from the
 * CSV. The exporter seeds at J2000 and chains outward, writing every year on
 * the way, so a window must CONTAIN 2000 to be cheap (1980..2020: ~10 s); a
 * window away from 2000 costs the walk from 2000. One modern window is enough
 * for a freshness row: the compare is bit-exact at 86 µs of JD, and any change
 * in the Sun, the frame or the clock chain leaks into the era rows at that
 * level (the Sun's wobble correction of 2026-11-10 read 15 s at 1993). The
 * full run (`check:csv-smoke`) stays the re-base check for the deep rows.
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
const WARMUP_YEARS = 3;
// --windows a:b,c:d → short windows; absent → the full 6a2 range (fit:6a2)
const wArg = process.argv.indexOf('--windows');
const WINDOWS = wArg >= 0
  ? process.argv[wArg + 1].split(',').map((w) => w.split(':').map(Number))
  : [[-4000, 4000]];
if (WINDOWS.some((w) => w.length !== 2 || !Number.isInteger(w[0]) || !Number.isInteger(w[1]) || w[1] - w[0] <= WARMUP_YEARS)) {
  console.error('--windows must be "a:b,c:d" with integer years and b − a > ' + WARMUP_YEARS);
  process.exit(2);
}
const MIN_ROWS = wArg >= 0 ? 50 : 1000;

if (!existsSync(TRACKED)) {
  console.log('CSV-WINDOW-SMOKE: SKIP — data/02-solar-measurements-window.csv absent (gitignored; generate it with `npm run fit:6a2`).');
  process.exit(0);
}

// index the tracked CSV rows by (Type, Model Year)
const keyOf = (line) => {
  const c = line.split(',');
  return c[0] + '|' + c[1];
};
const tracked = new Map();
for (const line of readFileSync(TRACKED, 'utf8').split('\n')) {
  if (!line || line.startsWith('Type,')) continue;
  const yr = parseFloat(line.split(',')[1]);
  if (Number.isFinite(yr)) tracked.set(keyOf(line), line);
}

const dir = mkdtempSync(join(tmpdir(), 'csv-smoke-'));
let allOk = true;
try {
  for (const [START, END] of WINDOWS) {
    const scratch = join(dir, `window-${START}-${END}.csv`);
    console.log(`regenerating window ${START}..${END} with the real Step-6a exporter…`);
    const r = spawnSync(process.execPath, [
      join(ROOT, 'tools', 'fit', 'export-solar-measurements.js'),
      '--start', String(START), '--end', String(END), '--output', scratch,
    ], { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 3600000 });   // R4: the exporter evaluates the certified Sun per probe — measured 36 s per 200 yr, ~25 min for the full window
    if (r.status !== 0) {
      console.log('FAIL — exporter exited ' + r.status + '\n' + String(r.stderr).slice(0, 800));
      process.exit(1);
    }
    const winLines = readFileSync(scratch, 'utf8').trim().split('\n');
    let compared = 0, mismatched = 0, missing = 0, firstBad = '';
    for (const line of winLines.slice(1)) {
      const yr = parseFloat(line.split(',')[1]);
      if (!Number.isFinite(yr) || yr < START + WARMUP_YEARS || yr > END) continue;   // the warm-up, and the years the chain walks past the window
      let expected = tracked.get(keyOf(line));
      if (expected === undefined) { missing++; if (!firstBad) firstBad = 'no tracked row for ' + keyOf(line); continue; }
      if (process.env.ESSRT_CSV_SMOKE_PLANT === '1' && compared === 10) expected += '0';
      if (line !== expected) { mismatched++; if (!firstBad) firstBad = keyOf(line) + '\n    got      ' + line + '\n    expected ' + expected; }
      compared++;
    }
    const ok = mismatched === 0 && missing === 0 && compared >= MIN_ROWS;
    allOk = allOk && ok;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${compared} rows compared bit-exactly over ${START + WARMUP_YEARS}..${END} — ${mismatched} mismatched, ${missing} missing from the tracked CSV`);
    if (!ok && firstBad) console.log('  first: ' + firstBad);
  }
  console.log(allOk ? 'CSV-WINDOW-SMOKE: ALL PASS' : 'CSV-WINDOW-SMOKE: FAILURES — the engine no longer reproduces the 6a2 window artifact; if the movement change is INTENDED, re-base with `npm run fit:6a2` and say so in the commit.');
  process.exit(allOk ? 0 : 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
