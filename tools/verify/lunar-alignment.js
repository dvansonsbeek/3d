#!/usr/bin/env node
/**
 * lunar-alignment.js — lunar-eclipse ALIGNMENT gate/generator (Phase A of the
 * primary-source eclipse programme).
 *
 * Owns `data/lunar-alignment-summary.json`. Four sections:
 *
 *   canonGeometry — the model's lunar finder vs the NASA 5-Millennium Canon
 *       over 1600–2200, compared on the TT AXIS (model jd + model ΔT vs the
 *       canon's jd_TD). The axis choice is the point: TT isolates the LUNAR
 *       GEOMETRY from the ΔT model. The ΔT model is tested separately, on
 *       the UT axis, by eclipse-audit's L-5b section.
 *   visibility — the curated historical set's documented visibility regions
 *       vs the shipped api observer tier (geometric horizon at MAXIMUM
 *       eclipse; the documented maps cover any-phase visibility, so a
 *       deep-inside-region city is checked, not region edges).
 *   babylon746 — the −746 Feb 6 Babylonian partial eclipse (the oldest entry
 *       of NASA's historical-interest list): found, typed, umbral magnitude
 *       vs the canon 0.9199, visible from Babylon. The lunar sibling of
 *       eclipse-audit's babylon135 solar case.
 *   dtBands — the 267 Stephenson-2016 raw-timing reductions (dt_observed_sec)
 *       binned by source table: residuals against the framework ΔT curve and
 *       against the published Stephenson-2016 spline, side by side. NOTE the
 *       points are the STEPHENSON TEAM's reductions of the primary timings —
 *       a framework-side re-reduction (own geometry + moonrise) is the banked
 *       follow-up; it needs contact-time machinery.
 *
 * Convention (same as eclipse-audit): a plain run RECOMPUTES and compares
 * against the recorded summary, exit 1 on divergence — a refit cannot move
 * these numbers silently. `--write` refuses on divergence; `--write
 * --rebaseline` is the conscious re-measurement path.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildInputsBlock } = require('../lib/artifact-inputs');
const { stephensonDeltaT } = require('@essrt/physics/reference/published-curves');
const DT = require('../lib/deep-time.js');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'lunar-alignment-summary.json');
const WRITE = process.argv.includes('--write');
const REBASELINE = process.argv.includes('--rebaseline');

const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const INPUT_FILES = [
  'tools/verify/lunar-alignment.js',
  'public/input/lunar-eclipses-nasa.json',
  'public/input/lunar-eclipses-stephenson-2016.json',
  'public/input/lunar-eclipses-historical.json',
  'public/input/lunar-eclipses-documented.json',
  'public/input/stephenson-2016-deltaT-polynomial.json',
  'packages/physics/src/eclipse/finders.cjs',
  'packages/physics/src/moon/series.cjs',
  'packages/physics/src/moon/apparent.cjs',
  'packages/api/src/app.js',
  'public/input/model-parameters.json',
  'public/input/fitted-coefficients.json',
];

// Deep-inside-region observer cities for the visibility section. Chosen well
// away from region edges so the max-eclipse geometric check is meaningful.
// Keys must EQUAL a comma-separated token of the NASA visibility string —
// qualified tokens ("Western Europe", "Eastern Asia") deliberately do NOT
// match: the qualifier means the region only partially saw the eclipse, so
// its representative city proves nothing either way.
const REGION_CITIES = [
  { key: 'europe', city: 'Berlin', lat: 52.52, lon: 13.4 },
  { key: 'africa', city: 'Nairobi', lat: -1.29, lon: 36.82 },
  { key: 'asia', city: 'Delhi', lat: 28.61, lon: 77.21 },
  { key: 'australia', city: 'Sydney', lat: -33.87, lon: 151.21 },
  { key: 'americas', city: 'Kansas City', lat: 39.1, lon: -94.58 },
];
const BABYLON = { lat: 32.5364, lon: 44.4209 };

const NASA_TYPE = { N: 'Penumbral', P: 'Partial', T: 'Total' };

/** Flatten leaf primitives to dotted keys for exact reproduction compare. */
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
  const { createApi } = await import(pathToFileURL(path.join(ROOT, 'packages/api/src/app.js')).href);
  const model = createModel();
  const { handle } = createApi();
  /** @param {Record<string,string>} query */
  const apiLunar = (query) => JSON.parse(handle({ method: 'GET', path: '/v1/eclipses/lunar', query }).body);

  const canon = rd('public/input/lunar-eclipses-nasa.json');
  const steph = rd('public/input/lunar-eclipses-stephenson-2016.json');
  const curated = rd('public/input/lunar-eclipses-historical.json');
  const stephPoly = rd('public/input/stephenson-2016-deltaT-polynomial.json');

  // ── Section 1: canonGeometry (TT axis, 1600–2200) ─────────────────────────
  const jdA = model.time.jdFromYear(1600), jdB = model.time.jdFromYear(2200);
  const events = model.eclipse.findLunarInRange(jdA, jdB);
  const canonRows = canon.entries.filter((e) => e.jd_TD >= jdA && e.jd_TD <= jdB);
  const usedCanon = new Set();
  let matched = 0, typeAgree = 0, sumAbsMin = 0, sumSqMin = 0, maxAbsMin = 0;
  for (const ev of events) {
    const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
    let best = null, bestD = 1;                       // 1-day matching window
    for (const c of canonRows) {
      const d = Math.abs(c.jd_TD - evTT);
      if (d < bestD && !usedCanon.has(c.catalog_num)) { best = c; bestD = d; }
    }
    if (!best) continue;
    usedCanon.add(best.catalog_num);
    matched += 1;
    const resMin = (evTT - best.jd_TD) * 1440;
    sumAbsMin += Math.abs(resMin); sumSqMin += resMin * resMin;
    if (Math.abs(resMin) > maxAbsMin) maxAbsMin = Math.abs(resMin);
    if (NASA_TYPE[best.type_nasa[0]] === ev.type) typeAgree += 1;
  }
  const canonGeometry = {
    windowYears: [1600, 2200],
    canonEvents: canonRows.length,
    modelEvents: events.length,
    matched,
    unmatchedModel: events.length - matched,
    unmatchedCanon: canonRows.length - matched,
    typeAgree,
    meanAbsResidualMinutes: Math.round((sumAbsMin / matched) * 1000) / 1000,
    meanAbsResidualMinutesFull: sumAbsMin / matched,
    rmsResidualMinutes: Math.round(Math.sqrt(sumSqMin / matched) * 1000) / 1000,
    rmsResidualMinutesFull: Math.sqrt(sumSqMin / matched),
    maxAbsResidualMinutes: Math.round(maxAbsMin * 1000) / 1000,
  };

  // ── Section 2: visibility (documented regions vs the api observer tier) ──
  const visEntries = [];
  let insideAgree = 0, outsideAgree = 0, outsideChecked = 0;
  for (const e of curated.entries) {
    const vis = String(e.visibility ?? '').toLowerCase();
    if (!vis) continue;
    const tokens = vis.split(',').map((t) => t.trim());
    // Inside: UNQUALIFIED region tokens only. The claim tested is "at least
    // one documented-region city sees the Moon at maximum eclipse" — robust
    // against NASA's any-phase region maps (a moonrise/moonset region may
    // legitimately miss the max), while a hemisphere-class error fails every
    // documented region at once. Outside: a region not mentioned AT ALL
    // (qualified or not) must never see the max.
    const insideCities = REGION_CITIES.filter((r) => tokens.includes(r.key));
    const outside = REGION_CITIES.find((r) => !vis.includes(r.key));
    if (insideCities.length === 0) continue;
    /** @param {{lat:number, lon:number}} obs */
    const at = (obs) => {
      const res = apiLunar({ startJd: String(e.jd - 3), stopJd: String(e.jd + 3), lat: String(obs.lat), lon: String(obs.lon) });
      const rows = res.data?.events ?? [];
      let bestRow = null, bestD = Infinity;
      for (const r of rows) { const d = Math.abs(r.jd - e.jd); if (d < bestD) { bestRow = r; bestD = d; } }
      return bestRow;
    };
    let bestCity = null, bestAlt = -Infinity;
    for (const c of insideCities) {
      const row = at(c);
      if (row && row.moonAltitudeDeg > bestAlt) { bestAlt = row.moonAltitudeDeg; bestCity = c.city; }
    }
    if (bestCity === null) continue;
    const outRow = outside ? at(outside) : null;
    const row = {
      label: e.label,
      bestInsideCity: bestCity,
      bestInsideAltitudeDeg: Math.round(bestAlt * 100) / 100,
      insideVisible: bestAlt > 0,
      outsideCity: outside ? outside.city : null,
      outsideVisible: outRow ? outRow.visible : null,
    };
    if (row.insideVisible) insideAgree += 1;
    if (outRow) { outsideChecked += 1; if (!outRow.visible) outsideAgree += 1; }
    visEntries.push(row);
  }
  const visibility = {
    entriesChecked: visEntries.length,
    insideAgree,
    outsideChecked,
    outsideAgree,
    entries: visEntries,
  };

  // ── Section 3: babylon746 (−746 Feb 6, canon catalog 3009) ────────────────
  const b746canon = canon.entries.find((e) => e.date === '-0746-02-06');
  const b746events = model.eclipse.findLunarInRange(b746canon.jd_TD - 5, b746canon.jd_TD + 5);
  const b746 = b746events.length ? b746events[0] : null;
  const b746TT = b746 ? b746.jd + model.eclipse.deltaTSecondsAtJD(b746.jd) / 86400 : null;
  const b746api = b746 ? apiLunar({ startJd: String(b746.jd - 2), stopJd: String(b746.jd + 2), lat: String(BABYLON.lat), lon: String(BABYLON.lon) }) : null;
  const b746row = b746api && b746api.data.events.length ? b746api.data.events[0] : null;
  const babylon746 = {
    found: b746 !== null,
    type: b746 ? b746.type : null,
    canonType: NASA_TYPE[b746canon.type_nasa[0]],
    magnitudeUmbral: b746 ? Math.round(b746.magnitudeUmbral * 10000) / 10000 : null,
    canonMagnitudeUmbral: b746canon.magnitude_umbral,
    ttResidualMinutes: b746TT !== null ? Math.round((b746TT - b746canon.jd_TD) * 1440 * 100) / 100 : null,
    visibleFromBabylon: b746row ? b746row.visible : null,
    babylonMoonAltitudeDeg: b746row ? Math.round(b746row.moonAltitudeDeg * 100) / 100 : null,
  };

  // ── Section 4: dtBands (Stephenson-2016 reductions vs the two curves) ────
  /** @type {Record<string, {n:number, sumF:number, sqF:number, sumS:number, sqS:number}>} */
  const bins = {};
  for (const obs of steph.entries) {
    if (obs.dt_observed_sec == null) continue;      // S04 bounds-only rows
    const fw = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
    const sp = stephensonDeltaT(obs.year, stephPoly);
    const rF = obs.dt_observed_sec - fw, rS = obs.dt_observed_sec - sp;
    for (const key of [obs.source_table, 'overall']) {
      const b = bins[key] ?? (bins[key] = { n: 0, sumF: 0, sqF: 0, sumS: 0, sqS: 0 });
      b.n += 1; b.sumF += Math.abs(rF); b.sqF += rF * rF; b.sumS += Math.abs(rS); b.sqS += rS * rS;
    }
  }
  /** @type {Record<string, Record<string, number>>} */
  const dtBands = {};
  for (const [key, b] of Object.entries(bins).sort(([a], [c]) => a.localeCompare(c))) {
    dtBands[key] = {
      n: b.n,
      frameworkMeanAbsSeconds: Math.round(b.sumF / b.n),
      frameworkRmsSeconds: Math.round(Math.sqrt(b.sqF / b.n)),
      stephensonSplineMeanAbsSeconds: Math.round(b.sumS / b.n),
      stephensonSplineRmsSeconds: Math.round(Math.sqrt(b.sqS / b.n)),
    };
  }

  const computed = {
    _description: 'Lunar-eclipse alignment summary — GENERATED by tools/verify/lunar-alignment.js --write. canonGeometry: model lunar finder vs the NASA 5-Millennium Canon 1600-2200 on the TT AXIS (isolates lunar geometry from the deltaT model, which eclipse-audit L-5b tests on the UT axis). visibility: documented visibility regions vs the shipped api observer tier (geometric horizon at maximum eclipse; deep-inside-region cities). babylon746: the -746 Feb 6 Babylonian partial eclipse anchor. dtBands: the Stephenson-2016 raw-timing reductions (their reduction of the primary timings, weights not applied) vs the framework deltaT curve and the published Stephenson spline, per source table. A plain run recomputes and FAILS on divergence from this file; --write refuses on divergence; --write --rebaseline is the conscious re-measurement path.',
    canonGeometry,
    visibility,
    babylon746,
    dtBands,
    inputs: buildInputsBlock('node tools/verify/lunar-alignment.js --write', INPUT_FILES),
  };

  console.log('  canonGeometry: %d/%d matched (types %d) | TT residual mean %s min, rms %s min, max %s min',
    matched, canonRows.length, typeAgree, canonGeometry.meanAbsResidualMinutes, canonGeometry.rmsResidualMinutes, canonGeometry.maxAbsResidualMinutes);
  console.log('  visibility: inside %d/%d | outside %d/%d', insideAgree, visEntries.length, outsideAgree, outsideChecked);
  console.log('  babylon746: %s mag %s (canon %s) | ttRes %s min | Babylon visible=%s alt=%s°',
    babylon746.type, babylon746.magnitudeUmbral, babylon746.canonMagnitudeUmbral, babylon746.ttResidualMinutes, babylon746.visibleFromBabylon, babylon746.babylonMoonAltitudeDeg);
  console.log('  dtBands overall (n=%d): framework meanAbs %d s | stephenson spline meanAbs %d s',
    dtBands.overall.n, dtBands.overall.frameworkMeanAbsSeconds, dtBands.overall.stephensonSplineMeanAbsSeconds);

  // ── Recording convention ──────────────────────────────────────────────────
  if (!fs.existsSync(OUT)) {
    if (!WRITE) {
      console.error('FAIL — no recorded summary. First run: node tools/verify/lunar-alignment.js --write');
      process.exit(1);
    }
    fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n');
    console.log('  ✓ wrote %s (first recording)', path.relative(ROOT, OUT));
    return;
  }
  const recorded = rd('data/lunar-alignment-summary.json');
  const rec = flatten(recorded, '', new Map());
  const now = flatten(computed, '', new Map());
  let diverged = 0;
  for (const [k, was] of rec) {
    const v = now.has(k) ? now.get(k) : '(missing)';
    const same = Object.is(was, v);
    if (!same) { diverged += 1; console.log('  DIVERGED   %s: recorded %s, computed %s', k, was, v); }
  }
  for (const k of now.keys()) if (!rec.has(k)) { diverged += 1; console.log('  NEW KEY    %s (not in recording)', k); }

  if (diverged === 0) {
    if (WRITE) { fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n'); console.log('  ✓ wrote %s (values identical; inputs re-stamped)', path.relative(ROOT, OUT)); }
    else console.log('PASS — all recorded lunar-alignment values reproduced (%d keys).', rec.size);
    return;
  }
  if (WRITE && REBASELINE) {
    fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n');
    console.log('  → REBASELINED: %d divergent value(s) adopted; wrote %s', diverged, path.relative(ROOT, OUT));
    return;
  }
  if (WRITE) {
    console.error('REFUSING to write: %d value(s) diverge from the recorded snapshot.', diverged);
    console.error('Investigate; if this is a conscious re-measurement, pass --rebaseline.');
    process.exit(1);
  }
  console.error('FAIL — %d lunar-alignment value(s) diverged from the recording.', diverged);
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
