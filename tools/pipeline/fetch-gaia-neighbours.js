#!/usr/bin/env node
/**
 * fetch-gaia-neighbours — the Gaia DR3 supersets the arriving stars are selected from (plan 28 §D and its
 * follow-up, doc 111 §1.48), fetched from ESA's Gaia archive into the gitignored cache
 * data/.cache/stars/ and read by tools/pipeline/import-gaia-neighbours.js. A repo script (the first fetch
 * lived in a session scratchpad — a number a doc cannot reproduce from an artifact gets written by the script).
 *
 * Two supersets, each a CSV with the same columns:
 *   bright  (gaia-neighbours.csv): every six-dimensional star within 1.5 kpc (parallax > 0.667 mas,
 *           parallax/error > 5, a radial velocity) brighter than M_G 2 — the stars a naked-eye sky is made of
 *           at any epoch; 1.15 million rows; the importer integrates every orbit over ±50 Myr.
 *   faint   (gaia-neighbours-faint.csv): the stars of M_G 2 to 5 within 1.5 kpc (1.3 / 4.5 / 5.1 million per
 *           magnitude — a day of the archive's streams) PRE-FILTERED SERVER-SIDE by the straight line's closest
 *           approach, computable in ADQL from the row: d = 1000/plx, v_t = 4.740470463·μ/plx, v² = v_t² + v_r²,
 *           d_min = d·v_t/v, t_ca = d·|v_r|/v² / (pc per km/s per year); kept where d_min ≤ 2·r(M) within
 *           |t_ca| ≤ 30 Myr, or d ≤ 2·r(M) already, with r(M) = 10 pc · 10^((9 − M_G)/5) the V-8 distance with a
 *           one-magnitude colour margin. The line is within ~15 % of the Galactic orbit at 20 Myr, so the faint
 *           background is COMPLETE to about ±20 Myr and thins beyond (said in the hover); the importer's
 *           integration still decides what is kept.
 *
 * The archive: the anonymous asynchronous job is capped at 60 s and the synchronous stream is CUT at ~60 s on a
 * row boundary (a multiple of 8,192 rows) which a last-line check cannot see — so each superset is fetched in
 * chunks keyed on random_index, a chunk whose row count IS a multiple of 8,192 verified against the archive's own
 * COUNT for its range (any other count with a complete last row is complete — the COUNT per range had doubled the
 * queries on a morning the archive took a minute per query whatever the size), and a chunk short of its count is
 * split in two and refetched; a 408 (the archive's own time budget) splits the range too. Up to PARALLEL chunks
 * are in flight at once (the anonymous queue allows 50 jobs; a 429 — the queue full — waits and retries).
 *
 * Usage: node tools/pipeline/fetch-gaia-neighbours.js --set bright|faint [--chunks N] [--parallel P] [--count-only]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CACHE_DIR = path.join(ROOT, 'data', '.cache', 'stars');
const TAP = 'https://gea.esac.esa.int/tap-server/tap/sync';
const RANDOM_INDEX_MAX = 1811709771;   // gaiadr3.gaia_source: random_index 0 … 1,811,709,770

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const SET = arg('--set', '');
const COUNT_ONLY = argv.includes('--count-only');
if (!['bright', 'faint'].includes(SET)) { console.error('Usage: node tools/pipeline/fetch-gaia-neighbours.js --set bright|faint [--chunks N] [--count-only]'); process.exit(1); }

const COLUMNS = 'g.source_id, g.ra, g.dec, g.parallax, g.parallax_error, g.pmra, g.pmdec, g.radial_velocity, g.radial_velocity_error, g.phot_g_mean_mag, g.bp_rp, x.original_ext_source_id AS hip';
const FROM = 'FROM gaiadr3.gaia_source AS g LEFT OUTER JOIN gaiadr3.hipparcos2_best_neighbour AS x ON x.source_id = g.source_id';
const BASE = 'g.parallax > 0.667 AND g.parallax_over_error > 5 AND g.radial_velocity IS NOT NULL AND g.pmra IS NOT NULL';
// No LOG10(parallax) anywhere: the archive's planner evaluates the expression on negative-parallax rows before the
// parallax cut applies ("cannot take logarithm of a negative number" on a random_index chunk), so M_G bounds are
// written as parallax bounds — M_G ≥ 2 ⟺ plx ≥ 10^((12 − G)/5) — and r(M) = 10 pc · 10^((9 − M_G)/5) as
// 10 · 10^((19 − G)/5) / plx.
const VT = '(4.740470463*SQRT(g.pmra*g.pmra + g.pmdec*g.pmdec)/g.parallax)';
const V2 = `(POWER(${VT}, 2) + g.radial_velocity*g.radial_velocity)`;
const R_OF_M = '(20*POWER(10, (19 - g.phot_g_mean_mag)/5)/g.parallax)';   // 2 × r(M): the margin on the V-8 distance (1 mag of colour, the orbit's curvature)
const PC_PER_KMS_YR = 1.0227121650e-6;
const SETS = {
  bright: { file: 'gaia-neighbours.csv', chunks: 64, where: `${BASE} AND g.parallax < POWER(10, (12 - g.phot_g_mean_mag)/5)` },
  faint: {
    file: 'gaia-neighbours-faint.csv', chunks: 48,
    where: `${BASE} AND g.parallax >= POWER(10, (12 - g.phot_g_mean_mag)/5) AND g.parallax < POWER(10, (15 - g.phot_g_mean_mag)/5) AND ( 1000/g.parallax <= ${R_OF_M} OR ( (1000/g.parallax) * ${VT} / SQRT(${V2}) <= ${R_OF_M} AND (1000/g.parallax) * ABS(g.radial_velocity) / ${V2} / ${PC_PER_KMS_YR} <= 3.0e7 ) )`,
  },
};
const S = SETS[SET];
const N_CHUNKS = Number(arg('--chunks', S.chunks));
const PARALLEL = Math.max(1, Number(arg('--parallel', 4)));
const CUT_GRAIN = 8192;   // the synchronous stream is cut at a multiple of this many rows
const OUT = path.join(CACHE_DIR, S.file);
const TMP = path.join(CACHE_DIR, `${SET}-chunks`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** One synchronous TAP query (CSV text); a 429 (the anonymous queue full) waits and retries. @param {string} query */
async function tap(query, maxrec) {
  for (let attempt = 1; attempt <= 60; attempt++) {
    const body = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query });
    if (maxrec) body.set('MAXREC', String(maxrec));
    const res = await fetch(TAP, { method: 'POST', body, signal: AbortSignal.timeout(900000) });
    const text = await res.text();
    if (res.status === 429 || /maximum number of jobs/.test(text)) { console.log(`  ${new Date().toTimeString().slice(0, 8)} the archive's anonymous queue is full (429) — waiting 2 min (attempt ${attempt})`); await sleep(120000); continue; }
    // a 408 ("Job timeout/aborted" — the archive's own budget on a slow query): once more after a minute, then the
    // caller SPLITS the range (a smaller scan fits the budget); a 5xx waits a minute and asks again
    if (res.status === 408) { if (attempt >= 2) { const e = new Error('TAP 408: the archive aborted the query (its time budget)'); e.code = 408; throw e; } console.log(`  ${new Date().toTimeString().slice(0, 8)} the archive answered 408 — once more in 1 min`); await sleep(60000); continue; }
    if (res.status >= 500) { console.log(`  ${new Date().toTimeString().slice(0, 8)} the archive answered ${res.status} — waiting 1 min (attempt ${attempt})`); await sleep(60000); continue; }
    if (!res.ok || /<html/i.test(text)) throw new Error(`TAP ${res.status}: ${text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600)}`);
    return text;
  }
  throw new Error('the archive stayed busy for two hours');
}
/** The archive's COUNT for a random_index range. */
async function countRange(lo, hi) {
  const t = await tap(`SELECT COUNT(*) AS n ${FROM} WHERE g.random_index BETWEEN ${lo} AND ${hi} AND ${S.where}`);
  const n = Number(t.trim().split('\n').pop());
  if (!Number.isFinite(n)) throw new Error(`COUNT answered: ${t.slice(0, 200)}`);
  return n;
}
/** Fetch one range complete: a well-formed stream whose row count is not a multiple of the cut grain is complete; a
 *  count that is one is verified against the archive's COUNT; a short or cut range is split in two. @returns {Promise<string[]>} the data lines */
async function fetchRange(lo, hi, depth) {
  const split = async () => { const mid = Math.floor((lo + hi) / 2); return [...await fetchRange(lo, mid, depth + 1), ...await fetchRange(mid + 1, hi, depth + 1)]; };
  let text, expected = null;
  try {
    text = await tap(`SELECT ${COLUMNS} ${FROM} WHERE g.random_index BETWEEN ${lo} AND ${hi} AND ${S.where}`, 500000);
    const n = text.split('\n').filter((l) => l.length).length - 1;
    // a stream shorter than the cut grain cannot have been cut; any longer one is verified against the COUNT (a cut
    // stream ends with 8,192·k + 1 rows — 8,193 and 16,385 in the logs; a first rule tested k·8,192 and accepted every
    // cut chunk of a run: 562,783 rows for the archive's 809,928)
    if (n >= CUT_GRAIN) expected = await countRange(lo, hi);
  } catch (e) {
    // the archive's time budget (408): a smaller range scans faster — split, up to 1/256 of a chunk
    if (e && e.code === 408 && depth < 8) { console.log(`  [${lo}..${hi}]: the archive's budget — splitting`); return split(); }
    throw e;
  }
  const lines = text.split('\n').filter((l) => l.length);
  const header = lines.shift();
  const wellFormed = header && header.startsWith('source_id') && text.endsWith('\n') && (lines.length === 0 || lines[lines.length - 1].split(',').length === 12);
  const complete = wellFormed && (expected === null ? true : lines.length === expected);
  if (complete) { console.log(`  ${new Date().toTimeString().slice(0, 8)} [${lo}..${hi}]: ${lines.length} rows${expected === null ? '' : ' ≡ the archive\'s count'}`); return lines; }
  if (depth >= 8) throw new Error(`[${lo}..${hi}]: ${lines.length} rows${expected === null ? ', malformed' : ` for the archive's ${expected}`} after eight splits`);
  console.log(`  [${lo}..${hi}]: ${lines.length} rows${expected === null ? ', malformed' : ` for the archive's ${expected}`} — the stream was cut; splitting`);
  return split();
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  if (COUNT_ONLY) { const n = await countRange(0, RANDOM_INDEX_MAX - 1); console.log(`${SET}: ${n} rows match`); return; }
  const step = Math.ceil(RANDOM_INDEX_MAX / N_CHUNKS);
  const header = 'source_id,ra,dec,parallax,parallax_error,pmra,pmdec,radial_velocity,radial_velocity_error,phot_g_mean_mag,bp_rp,hip';
  /** @type {string[][]} */ const perChunk = new Array(N_CHUNKS);
  const todo = [];
  for (let i = 0; i < N_CHUNKS; i++) {
    const f = path.join(TMP, `chunk-${i}.csv`);
    if (fs.existsSync(f)) { const t = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.length); t.shift(); perChunk[i] = t; console.log(`  chunk ${i}: ${t.length} rows (cached)`); } else todo.push(i);
  }
  let done = N_CHUNKS - todo.length;
  // PARALLEL chunks in flight: each worker takes the next chunk index; a chunk is written to the cache as soon as it lands
  const worker = async () => {
    for (;;) {
      const i = todo.shift(); if (i === undefined) return;
      const lo = i * step, hi = Math.min(RANDOM_INDEX_MAX - 1, (i + 1) * step - 1);
      const lines = await fetchRange(lo, hi, 0);
      fs.writeFileSync(path.join(TMP, `chunk-${i}.csv`), [header, ...lines].join('\n') + '\n');
      perChunk[i] = lines; done++;
      console.log(`${new Date().toTimeString().slice(0, 8)} chunk ${i} of ${N_CHUNKS}: ${lines.length} rows (${done} chunks done)`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
  const all = perChunk.flat();
  // the whole set against the archive's own total — a chunk accepted short would show here
  const total = await countRange(0, RANDOM_INDEX_MAX - 1);
  if (all.length !== total) throw new Error(`${all.length} rows fetched for the archive's ${total} — a chunk is short; delete the cached chunks of this run (${TMP}) and refetch`);
  fs.writeFileSync(OUT, [header, ...all].join('\n') + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${all.length} rows ≡ the archive's total — now: node tools/pipeline/import-gaia-neighbours.js --write [--pin]`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
