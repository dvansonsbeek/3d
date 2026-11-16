#!/usr/bin/env node
/**
 * lunar-canon-recall.js — the lunar finder's COMPLETENESS over the whole NASA
 * Five Millennium Canon (−1999 … +3000, 12,064 events). Owns
 * `data/lunar-canon-recall.json`.
 *
 * The question (the historical-exactness leg of the falsification criterion,
 * CLAUDE.md leg 2): does `createModel().eclipse.findLunarInRange` find EVERY
 * canon eclipse and no phantom, with the right type, over five millennia —
 * and how does its UT clock drift against NASA's per century? Lunar-alignment
 * records the finder's GEOMETRY on the TT axis for 1600–2200 and era TT means
 * to −750; this generator records the recall everywhere the canon reaches.
 *
 * Method (the browser's former L-4 console button, verbatim): the finder runs
 * century by century over the span; each model event is matched to its
 * nearest unused canon event on the UT AXIS (model UT jd vs the canon's UT
 * jd) within ±180 min — the 3-h gate absorbs the pure-tidal vs Espenak/Meeus
 * ΔT divergence at deep time, so "the model missed the opposition" is
 * separated from "the two ΔT clocks disagree" — and counted as matched when
 * the type agrees, as a type mismatch when it does not; the rest are
 * model-only, and every unmatched canon event is NASA-only (a MISS). The
 * tight ≤15-min match rate is the ΔT-agreement sub-statistic; the per-500-yr
 * signed median of (NASA UT − model UT) is the ΔT divergence by era.
 *
 * Measured at the first recording (2026-10-25): recall 100.00 % (0 misses),
 * type accuracy 99.49 %, tight recall 81.8 %, 83 model-only (penumbral
 * grazers at the limit), runtime ~4.6 min — the reason it is its own
 * generator and not a section of lunar-alignment.
 *
 * Convention (same as eclipse-audit and lunar-alignment): a plain run
 * RECOMPUTES and compares against the recorded summary, exit 1 on divergence;
 * `--write` refuses on divergence; `--write --rebaseline` is the conscious
 * re-measurement path.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildInputsBlock, modelSourceFiles } = require('../lib/artifact-inputs');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'lunar-canon-recall.json');
const WRITE = process.argv.includes('--write');
const REBASELINE = process.argv.includes('--rebaseline');

const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

// What the finder RUNS ON (CLAUDE.md trap §1.16) — the same set lunar-alignment
// hashes for its canon section: the finders, the lunar theory, the model
// assembly, the Sun of date, the ΔT stack (the UT axis) and the canon itself.
const INPUT_FILES = [
  'tools/verify/lunar-canon-recall.js',
  'public/input/lunar-eclipses-nasa.json',
  'packages/physics/src/eclipse/finders.cjs',
  'packages/physics/src/eclipse/formula.cjs',   // the shadow geometry and the type rules the finders classify with (plan 33, ONE home)
  'packages/physics/src/moon/series.cjs',
  'packages/physics/src/moon/plane-of-date.cjs',
  'packages/physics/src/moon/apparent.cjs',
  ...modelSourceFiles(),
  'packages/physics/src/earth/deep-orbital-history.cjs',
  'packages/physics/src/earth/year-lengths.cjs',
  'packages/physics/src/earth/sidereal-channel-artifact.cjs',
  'packages/physics/src/moon/deep-ecc-channel.cjs',
  'packages/physics/src/moon/arguments.cjs',
  'packages/physics/src/moon/month-chain.cjs',
  'packages/physics/src/moon/series-extension.cjs',
  'packages/physics/src/deltat/cycles.cjs',
  // the clock every instant here crosses (plan 27 §8 J; doc 111 §1.16): the raw ΔT integrand and the UT↔TT bridge
  'packages/physics/src/deltat/deep-time.cjs',
  'packages/physics/src/earth/laplace-plane.cjs',
  'packages/physics/src/phase/deep-calendar.cjs',
  // the lunar arguments' cumulative month counts (plan 30 item J; doc 111 §1.39): the integrator's
  // age axis moved the matched-tight count and two era medians, unseen by check:artifacts
  'packages/physics/src/chain-cycles/index.cjs',
  'data/deep-time-fitted.json',
  'data/deltaT-4flag-fit.json',
  'data/core-mantle-resonator-stage1.json',
  'data/nbody-secular-series.json',
  'public/input/astro-reference.json',
  'public/input/climate-formula-coefficients.json',
];

// The canon's span: ONE home, the formula's CANON_WINDOW_YEARS (the regime tag's certified window).
const { CANON_WINDOW_YEARS } = require('../../packages/physics/src/eclipse/formula.cjs');
const START_YEAR = CANON_WINDOW_YEARS.min, END_YEAR = CANON_WINDOW_YEARS.max;
const MATCH_MIN = 180, TIGHT_MIN = 15;
const ERA_BIN_YEARS = 500;

/** Flatten leaf primitives to dotted keys for the exact-reproduction compare. */
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_description' || k === 'inputs') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

async function main() {
  const { createModel } = await import('@essrt/physics');
  // The SHIPPED configuration (as lunar-alignment): the governed secular series.
  const model = createModel(undefined, { secularSeriesArtifact: rd('data/nbody-secular-series.json') });
  const canon = rd('public/input/lunar-eclipses-nasa.json');

  const t0 = Date.now();
  /** @type {Array<{jd: number, type: string}>} */
  const modelEvents = [];
  for (let yr = START_YEAR; yr < END_YEAR; yr += 100) {
    const a = model.time.jdFromYear(yr), b = model.time.jdFromYear(Math.min(yr + 100, END_YEAR + 1));
    modelEvents.push(...model.eclipse.findLunarInRange(a, b));
  }
  modelEvents.sort((x, y) => x.jd - y.jd);
  const scanSeconds = (Date.now() - t0) / 1000;

  const jdStart = model.time.jdFromYear(START_YEAR), jdEnd = model.time.jdFromYear(END_YEAR + 1);
  const nasa = canon.entries.filter((e) => e.jd >= jdStart && e.jd <= jdEnd);
  const used = new Uint8Array(nasa.length);
  const bsearch = (/** @type {number} */ jd) => {
    let lo = 0, hi = nasa.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (nasa[mid].jd < jd) lo = mid + 1; else hi = mid; }
    return lo;
  };
  let matched = 0, tight = 0, typeMismatch = 0, modelOnly = 0;
  /** @type {Map<number, number[]>} era bin start → signed offsets (NASA UT − model UT, minutes) */
  const eraOffsets = new Map();
  for (const m of modelEvents) {
    const i = bsearch(m.jd);
    let best = -1, bestD = Infinity;
    for (let k = -1; k <= 1; k++) {
      const j = i + k;
      if (j < 0 || j >= nasa.length || used[j]) continue;
      const d = Math.abs(nasa[j].jd - m.jd);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0 && bestD * 1440 <= MATCH_MIN) {
      used[best] = 1;
      const n = nasa[best];
      const dMin = (n.jd - m.jd) * 1440;
      if (m.type === n.type) { matched += 1; if (Math.abs(dMin) <= TIGHT_MIN) tight += 1; } else typeMismatch += 1;
      const year = Math.floor(model.time.yearFromJD ? model.time.yearFromJD(m.jd) : (m.jd - 1721425.5) / 365.25);
      const bin = Math.floor(year / ERA_BIN_YEARS) * ERA_BIN_YEARS;
      if (!eraOffsets.has(bin)) eraOffsets.set(bin, []);
      eraOffsets.get(bin).push(dMin);
    } else {
      modelOnly += 1;
    }
  }
  const nasaOnly = nasa.length - matched - typeMismatch;
  const median = (/** @type {number[]} */ a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  // PLAN 33 §4 (1) — the FORMULA's own run on the canon: the eclipse formula of date (the finders'
  // condition in closed form, ONE home eclipse/formula.cjs) over the same span on the UT axis,
  // matched to the canon by the same rule, and matched to the finder event for event (the two
  // share the shadow geometry, so they agree to the instant's solve — the gate eclipse-formula.js
  // reads 25 one-year windows against the finders; this is the full canon span, recorded).
  const t1 = Date.now();
  const F = model.eclipse.formula;
  const formulaEvents = F.eclipsesInRange(jdStart, jdEnd, 'lunar').map((e) => ({ jd: e.jdUT, type: e.type }));
  const formulaSeconds = (Date.now() - t1) / 1000;
  /** Match a time-ordered event list to the canon (the finder's rule above): one canon event per model event, nearest neighbour, within MATCH_MIN. */
  const matchToCanon = (/** @type {Array<{jd: number, type: string}>} */ events) => {
    const taken = new Uint8Array(nasa.length);
    let ok = 0, ok15 = 0, typeOff = 0, extra = 0;
    for (const m of events) {
      const i = bsearch(m.jd);
      let best = -1, bestD = Infinity;
      for (let k = -1; k <= 1; k++) {
        const j = i + k;
        if (j < 0 || j >= nasa.length || taken[j]) continue;
        const d = Math.abs(nasa[j].jd - m.jd);
        if (d < bestD) { bestD = d; best = j; }
      }
      if (best >= 0 && bestD * 1440 <= MATCH_MIN) {
        taken[best] = 1;
        if (m.type === nasa[best].type) { ok += 1; if (bestD * 1440 <= TIGHT_MIN) ok15 += 1; } else typeOff += 1;
      } else extra += 1;
    }
    return { matched: ok, matchedTight: ok15, typeMismatch: typeOff, modelOnly: extra, nasaOnly: nasa.length - ok - typeOff };
  };
  const fc = matchToCanon(formulaEvents);
  // formula vs finder, event for event: nearest finder event within MATCH_MIN
  let fvMatched = 0, fvTypeAgree = 0, fvMaxSec = 0;
  /** @type {number[]} */
  const fvAbsSec = [];
  {
    const taken = new Uint8Array(modelEvents.length);
    const bs = (/** @type {number} */ jd) => { let lo = 0, hi = modelEvents.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (modelEvents[mid].jd < jd) lo = mid + 1; else hi = mid; } return lo; };
    for (const f of formulaEvents) {
      const i = bs(f.jd);
      let best = -1, bestD = Infinity;
      for (let k = -1; k <= 1; k++) { const j = i + k; if (j < 0 || j >= modelEvents.length || taken[j]) continue; const d = Math.abs(modelEvents[j].jd - f.jd); if (d < bestD) { bestD = d; best = j; } }
      if (best >= 0 && bestD * 1440 <= MATCH_MIN) {
        taken[best] = 1; fvMatched += 1;
        if (modelEvents[best].type === f.type) fvTypeAgree += 1;
        const sec = bestD * 86400; fvAbsSec.push(sec); if (sec > fvMaxSec) fvMaxSec = sec;
      }
    }
  }
  const round = (/** @type {number} */ x, /** @type {number} */ d) => Math.round(x * 10 ** d) / 10 ** d;
  /** @type {Record<string, {n: number, signedMedianMinutes: number}>} */
  const byEra = {};
  for (const bin of [...eraOffsets.keys()].sort((a, b) => a - b)) {
    const v = eraOffsets.get(bin);
    byEra[`${bin}..${bin + ERA_BIN_YEARS - 1}`] = { n: v.length, signedMedianMinutes: Math.round(median(v) * 100) / 100 };
  }
  const pct = (/** @type {number} */ x) => Math.round(x * 10000) / 100;

  const computed = {
    _description: 'Lunar-finder completeness over the NASA Five Millennium Canon — GENERATED by tools/verify/lunar-canon-recall.js --write. createModel().eclipse.findLunarInRange over −1999…+3000 matched to the canon on the UT axis within ±180 min (same type = matched; the tight ≤15-min rate is the ΔT-agreement sub-statistic); every unmatched canon event is a MISS. byEra: the signed median (NASA UT − model UT) per 500-yr bin = the ΔT divergence by era. A plain run recomputes and FAILS on divergence from this file; --write refuses on divergence; --write --rebaseline is the conscious re-measurement path. formula: the eclipse FORMULA of date (eclipse/formula.cjs eclipsesInRange on the UT axis, plan 33 §4 (1)) over the same span — its own canon recall by the same rule, and its agreement with the finder event for event (vsFinder: the nearest finder event within the match window, the |UT difference| in seconds).',
    windowYears: [START_YEAR, END_YEAR],
    matchWindowMinutes: MATCH_MIN,
    tightWindowMinutes: TIGHT_MIN,
    canonEvents: nasa.length,
    modelEvents: modelEvents.length,
    matched,
    matchedTight: tight,
    typeMismatch,
    modelOnly,
    nasaOnly,
    recallPercent: pct((matched + typeMismatch) / nasa.length),
    tightRecallPercent: pct(tight / nasa.length),
    typeAccuracyPercent: pct(matched / (matched + typeMismatch)),
    byEra,
    // PLAN 33 §4 (1): the eclipse formula of date on the same canon span — its own recall, and its
    // agreement with the finder event for event (plan 33 §4 (1) in its own wording; the formula's
    // instant is the greatest eclipse from the series' rates, the finder's a bracketed minimum).
    formula: {
      events: formulaEvents.length,
      ...fc,
      recallPercent: pct((fc.matched + fc.typeMismatch) / nasa.length),
      tightRecallPercent: pct(fc.matchedTight / nasa.length),
      typeAccuracyPercent: pct(fc.matched / (fc.matched + fc.typeMismatch)),
      vsFinder: {
        matched: fvMatched,
        formulaOnly: formulaEvents.length - fvMatched,
        finderOnly: modelEvents.length - fvMatched,
        typeAgreementPercent: pct(fvMatched ? fvTypeAgree / fvMatched : 0),
        medianAbsSeconds: round(fvAbsSec.length ? median(fvAbsSec) : 0, 3),
        maxAbsSeconds: round(fvMaxSec, 3),
      },
    },
    inputs: buildInputsBlock('node tools/verify/lunar-canon-recall.js --write', INPUT_FILES),
  };

  console.log('  scan %s s · model %d · canon %d', scanSeconds.toFixed(1), modelEvents.length, nasa.length);
  console.log('  matched %d (tight %d) · type mismatch %d · model-only %d · NASA-only (MISSED) %d',
    matched, tight, typeMismatch, modelOnly, nasaOnly);
  console.log('  recall %s %% · tight recall %s %% · type accuracy %s %%',
    computed.recallPercent, computed.tightRecallPercent, computed.typeAccuracyPercent);
  for (const [era, v] of Object.entries(byEra)) console.log('  %s: n %d · signed median Δ %s min', era.padStart(12), v.n, v.signedMedianMinutes);
  console.log('  formula: %d events in %s s · canon recall %s %% (tight %s %%, type %s %%) · vs finder: %d matched, %d formula-only, %d finder-only, type agreement %s %%, |Δt| median %s s max %s s',
    formulaEvents.length, formulaSeconds.toFixed(1), computed.formula.recallPercent, computed.formula.tightRecallPercent, computed.formula.typeAccuracyPercent,
    fvMatched, computed.formula.vsFinder.formulaOnly, computed.formula.vsFinder.finderOnly, computed.formula.vsFinder.typeAgreementPercent, computed.formula.vsFinder.medianAbsSeconds, computed.formula.vsFinder.maxAbsSeconds);

  // ── Recording convention ──────────────────────────────────────────────────
  if (!fs.existsSync(OUT)) {
    if (!WRITE) { console.error('FAIL — no recorded summary. First run: node tools/verify/lunar-canon-recall.js --write'); process.exit(1); }
    fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n');
    console.log('  ✓ wrote %s (first recording)', path.relative(ROOT, OUT));
    return;
  }
  const recorded = rd('data/lunar-canon-recall.json');
  const rec = flatten(recorded, '', new Map());
  const now = flatten(computed, '', new Map());
  let diverged = 0;
  for (const [k, was] of rec) {
    const v = now.has(k) ? now.get(k) : '(missing)';
    const same = Object.is(was, v) || (was === 0 && v === 0);
    if (!same) { diverged += 1; console.log('  DIVERGED   %s: recorded %s, computed %s', k, was, v); }
  }
  for (const k of now.keys()) if (!rec.has(k)) { diverged += 1; console.log('  NEW KEY    %s (not in recording)', k); }
  if (diverged === 0) {
    if (WRITE) { fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n'); console.log('  ✓ wrote %s (values identical; inputs re-stamped)', path.relative(ROOT, OUT)); }
    else console.log('PASS — all recorded lunar-canon-recall values reproduced (%d keys).', rec.size);
    return;
  }
  if (WRITE && REBASELINE) {
    fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n');
    console.log('  → REBASELINED: %d divergent value(s) adopted; wrote %s', diverged, path.relative(ROOT, OUT));
    return;
  }
  if (WRITE) {
    console.error('REFUSING to write: %d value(s) diverge from the recorded snapshot. Investigate; if this is a conscious re-measurement, pass --rebaseline.', diverged);
    process.exit(1);
  }
  console.error('FAIL — %d lunar-canon-recall value(s) diverged from the recording.', diverged);
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
