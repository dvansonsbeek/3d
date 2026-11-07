/**
 * THE SURFACE GOLDEN (plan 30 §3 (1), doc 111 §1.38): every Planet Info row of every body and the
 * Predictions panel's live fields at seven epochs — today, −3000, −400 Myr, −2.46 Ga, −4.4 Ga, the
 * genesis edge, +990 Myr — pinned as the visitor reads them (the rendered value and unit strings),
 * plus each row's CLASS: whether its value moves with the epoch, whether it is ever "—", whether
 * its hover still carries the parenthesised "at J2000" qualifier. A row that changes class fails by name; a value that moves
 * fails with the epoch and both strings.
 *
 *   node test/browser/surface-rows.test.mjs            compare against the fixture
 *   node test/browser/surface-rows.test.mjs --write    re-record (say why in the commit)
 *
 * WHY: the model's deep-time values are gated; the SURFACE was not. Plan 30's dump found the
 * measured year family shown beyond its window (384.6 SI days at the genesis for the law's 328.2),
 * mixed day units in one table, pane rows one landing behind, a finder a year long, and 42 hovers
 * qualifying a moving value as "at J2000" — none of it visible to a gate that reads the model. This
 * fixture is the instrument kept: the same dump, compared every run.
 *
 * Fail-proven: ESSRT_SURFACE_PLANT=1 flips one row's class in the measured set.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { openSimulator } from './harness.mjs';

const OUT = resolve('packages/fixtures/regression/surface-rows.json');
const write = process.argv.includes('--write');
const PLANT = process.env.ESSRT_SURFACE_PLANT;

/** The seven epochs, as the Date field takes them (UT civil inside the seam, the TT civil date beyond). */
const EPOCHS = [
  { key: 'today', date: '2026-11-07' },
  { key: 'm3000', date: '-3000-06-21' },
  { key: 'm400Myr', date: '-399998000-06-21' },
  { key: 'm2460Myr', date: '-2459998000-06-21' },
  { key: 'm4400Myr', date: '-4399998000-06-21' },
  { key: 'genesis', date: '-4428983000-01-01' },
  { key: 'p990Myr', date: '990002000-06-21' },
];
/** The Predictions panel's live numeric fields (the cardinal rows arrive on a timer after a
 *  landing and are gated by epoch-consistency; the fields here are the landing frame's). */
const PRED_KEYS = [
  'lodReal', 'siderealDayReal', 'stellarDayReal',
  'solarYearSeconds', 'solarYearDays', 'solarYearLodDays',
  'siderealYearSeconds', 'siderealYearDays', 'siderealYearLodDays',
  'anomalisticYearSeconds', 'anomalisticYearDays', 'anomalisticYearLodDays',
  'axialPrecession', 'perihelionPrecession', 'inclinationPrecession', 'eclipticPrecession',
  'lunisolarMeanPeriod', 'lunisolarApsidalPeriod',
  'deltaTCorrectionSeconds', 'lengthofAU', 'longitudePerihelion', 'earthInvPlaneInclinationDynamic',
];

const s = await openSimulator();
await s.page.waitForFunction(() => window.__test__ && window.__test__.lunarBankLoaded && window.__test__.lunarBankLoaded(), null, { timeout: 120000 });
const bodies = await s.page.evaluate(() => window.__test__.planetInfoBodies());
/** @type {Record<string, { info: Record<string, any[]>, pred: Record<string, number> }>} */
const perEpoch = {};
for (const e of EPOCHS) {
  await s.page.evaluate((d) => window.__test__.enterDateTime(d, '00:00:00'), e.date);
  await s.page.waitForTimeout(1500);
  perEpoch[e.key] = await s.page.evaluate(({ bodies, PRED_KEYS }) => {
    const T = window.__test__;
    const info = {}; for (const b of bodies) info[b] = T.planetInfoRowsDump(b);
    return { date: T.clockFields().date, info, pred: T.predictionsProbe(PRED_KEYS) };
  }, { bodies, PRED_KEYS });
  if (perEpoch[e.key].date !== e.date && e.key !== 'genesis') console.log(`  note: ${e.key} landed on ${perEpoch[e.key].date}`);
}
const pageErrors = s.errors.length;
await s.dispose();
if (pageErrors) console.log(`  note: ${pageErrors} page error(s) during load`);

// ── assemble the measured set ──
/** @type {Record<string, any>} */
const rows = {};
for (const b of bodies) {
  const n = perEpoch.today.info[b].length;
  for (let i = 0; i < n; i++) {
    const t = perEpoch.today.info[b][i];
    if (t.hidden) continue;
    const key = `${b}#${String(i).padStart(3, '0')} ${t.label || '(sub-row)'}`;
    /** @type {Record<string, string>} */ const values = {};
    let moves = false, blank = false, hoverAtJ2000 = false;
    for (const e of EPOCHS) {
      const r = perEpoch[e.key].info[b][i];
      values[e.key] = `${r.value} | ${r.unit}`;
      if (values[e.key] !== values.today) moves = true;
      if (r.value === '—' || r.unit === '—') blank = true;
      if (/\(at J2000\)/.test(r.hover)) hoverAtJ2000 = true;
    }
    rows[key] = { header: t.header, static: t.static, class: { moves, blank, hoverAtJ2000 }, values };
  }
}
/** @type {Record<string, Record<string, number|null>>} */
const pred = {};
for (const k of PRED_KEYS) { pred[k] = {}; for (const e of EPOCHS) { const v = perEpoch[e.key].pred[k]; pred[k][e.key] = typeof v === 'number' && Number.isNaN(v) ? null : v; } }
if (PLANT === '1') { const k = Object.keys(rows)[0]; rows[k].class.moves = !rows[k].class.moves; console.log(`  (ESSRT_SURFACE_PLANT=1: ${k} class.moves flipped)`); }

const summary = {
  rows: Object.keys(rows).length,
  moving: Object.values(rows).filter((r) => r.class.moves).length,
  blankSomewhere: Object.values(rows).filter((r) => r.class.blank).length,
  hoverAtJ2000OnMoving: Object.values(rows).filter((r) => r.class.moves && r.class.hoverAtJ2000).length,
};
const measured = { epochs: EPOCHS, summary, rows, predictions: pred };

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'SURFACE golden (plan 30 §3 (1)) — every Planet Info row of every body and the Predictions panel\'s live fields at seven epochs, as the visitor reads them: `value | unit` per epoch and the row\'s class (moves / blank / hoverAtJ2000). Re-record with --write only for a change the commit explains; a class that changes fails by name.',
    _source: 'src/script.js via dist/, headless Chromium — test/browser/surface-rows.test.mjs',
    values: measured,
  }, null, 1)}\n`);
  console.log(`recorded ${summary.rows} rows × ${EPOCHS.length} epochs (${summary.moving} moving, ${summary.blankSomewhere} blank somewhere, ${summary.hoverAtJ2000OnMoving} "at J2000" qualifiers on a moving row) + ${PRED_KEYS.length} Predictions fields -> packages/fixtures/regression/surface-rows.json`);
  process.exit(0);
}

let expected;
try { expected = JSON.parse(readFileSync(OUT, 'utf8')).values; } catch {
  console.error(`No fixture at ${OUT}. Record it first:\n  npm run build && node test/browser/surface-rows.test.mjs --write`);
  process.exit(1);
}
console.log('SURFACE ROWS — the Planet Info and Predictions panels at seven epochs vs the fixture');
console.log('===================================================================================');
let fail = 0;
const report = (/** @type {string} */ m) => { fail++; if (fail <= 60) console.log(`FAIL  ${m}`); };
for (const k of Object.keys(expected.rows)) if (!(k in rows)) report(`row missing: ${k}`);
for (const k of Object.keys(rows)) {
  const r = rows[k], x = expected.rows[k];
  if (!x) { report(`row new (not in the fixture): ${k}`); continue; }
  for (const c of /** @type {const} */ (['moves', 'blank', 'hoverAtJ2000'])) if (r.class[c] !== x.class[c]) report(`class changed: ${k}  ${c} ${x.class[c]} → ${r.class[c]}`);
  if (r.static !== x.static) report(`static flag changed: ${k}  ${x.static} → ${r.static}`);
  for (const e of EPOCHS) if (r.values[e.key] !== x.values[e.key]) report(`value: ${k} @ ${e.key}  "${x.values[e.key]}" → "${r.values[e.key]}"`);
}
for (const kk of PRED_KEYS) {
  for (const e of EPOCHS) {
    const a = pred[kk][e.key], b = expected.predictions[kk] ? expected.predictions[kk][e.key] : undefined;
    if (!Object.is(a, b)) report(`predictions.${kk} @ ${e.key}  ${b} → ${a}`);
  }
}
const sx = expected.summary;
console.log(`  rows ${summary.rows} (fixture ${sx.rows}) · moving ${summary.moving} (${sx.moving}) · blank somewhere ${summary.blankSomewhere} (${sx.blankSomewhere}) · "at J2000" qualifiers on a moving row ${summary.hoverAtJ2000OnMoving} (${sx.hoverAtJ2000OnMoving})`);
if (fail) {
  console.log(`\nFAIL — ${fail} difference(s) against the surface golden${fail > 60 ? ' (first 60 shown)' : ''}. A deliberate change re-records with --write and says why in the commit.`);
  process.exit(1);
}
console.log(`\nPASS — ${summary.rows} rows × ${EPOCHS.length} epochs and ${PRED_KEYS.length} Predictions fields as recorded.`);
